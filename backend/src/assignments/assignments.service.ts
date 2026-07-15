import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentJsonDto, ExamQuestionDto } from './dto/assignment-json.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { AssignmentType, QuestionType } from '@prisma/client';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  async create(dto: CreateAssignmentDto, actor: AuthenticatedUser) {
    const rubricTotal = dto.rubric?.reduce((sum, c) => sum + (c.points || 0), 0) ?? 0;

    const assignment = await this.prisma.assignment.create({
      data: {
        schoolId: actor.schoolId,
        title: dto.title,
        description: dto.description,
        subject: dto.subject,
        grade: dto.grade,
        type: dto.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        maxPoints: dto.maxPoints ?? 100,
        isPublished: dto.isPublished ?? true,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : undefined,
        resources: dto.resources && dto.resources.length ? dto.resources : undefined,
        attachments: dto.attachments && dto.attachments.length ? (dto.attachments as any) : undefined,
        createdById: actor.id,
        // Nested create: Prisma writes the assignment + its questions +
        // rubric in a single transaction, so a validation failure on any
        // one of them rolls the whole thing back rather than leaving a
        // half-created assignment.
        questions: dto.questions?.length
          ? {
              create: dto.questions.map((q, index) => ({
                questionText: q.questionText,
                questionType: q.questionType ?? QuestionType.ESSAY,
                options: q.options && q.options.length ? (q.options as any) : undefined,
                correctAnswer: q.correctAnswer,
                points: q.points ?? 10,
                order: q.order ?? index,
                hint: q.hint,
              })),
            }
          : undefined,
        rubric: dto.rubric?.length
          ? { create: { criteria: dto.rubric as any, totalPoints: rubricTotal } }
          : undefined,
      },
      include: { questions: { orderBy: { order: 'asc' } }, rubric: true },
    });

    if (dto.notifyParents && assignment.isPublished) {
      this.notifyParentsOfNewAssignment(assignment, actor.id);
    }

    return assignment;
  }

  // Fire-and-forget: SMS every parent (with a phone on file) of a student in
  // this grade that a new assignment was posted. Errors are logged, never
  // thrown — a flaky SMS gateway must never fail or delay assignment
  // creation for the teacher.
  private notifyParentsOfNewAssignment(
    assignment: { id: number; schoolId: number; title: string; subject: string; grade: string; dueDate: Date | null },
    sentById: number,
  ) {
    this.smsService
      .getStudentRecipients(assignment.schoolId, assignment.grade)
      .then((recipients) =>
        this.smsService.notifyNewAssignment({
          schoolId: assignment.schoolId,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          subject: assignment.subject,
          grade: assignment.grade,
          dueDate: assignment.dueDate,
          recipients,
          sentById,
        }),
      )
      .catch((err) => this.logger.error('Failed to send new-assignment SMS:', err?.message || err));
  }

  findAll(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;
    const isStudent = actor.role === Role.STUDENT;

    return this.prisma.assignment.findMany({
      where: {
        schoolId: targetSchoolId,
        // Students only see assignments for their own grade. If a student
        // has no grade on file yet, fall back to showing everything for
        // their school rather than hiding all assignments.
        ...(isStudent && actor.grade ? { grade: actor.grade } : {}),
        // Staff (teacher/admin) see everything they own, including drafts
        // and not-yet-published assignments, so they can manage them.
        // Students only ever see published + already-released assignments.
        ...(isStudent
          ? {
              isPublished: true,
              OR: [{ publishDate: null }, { publishDate: { lte: new Date() } }],
            }
          : {}),
      },
      include: { _count: { select: { questions: true, submissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      // `sections` is metadata only (id/name/description/order) — NOT a
      // nested `questions` include, deliberately, so there is exactly one
      // place a question (and its correctAnswer) lives in the response:
      // the flat `questions` array below. The frontend groups those by
      // `sectionId` against this `sections` list itself. Two copies of the
      // same question would double the surface area stripAnswersForStudent
      // has to cover — trivial to get right today, easy to get wrong in six
      // months.
      include: {
        questions: { orderBy: { order: 'asc' } },
        sections: { orderBy: { order: 'asc' } },
        rubric: true,
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    this.assertSameTenant(assignment.schoolId, actor);

    return actor.role === Role.STUDENT ? this.stripAnswersForStudent(assignment) : assignment;
  }

  async findQuestions(id: number, actor: AuthenticatedUser) {
    const assignment = await this.findOne(id, actor);
    return assignment.questions;
  }

  // ==========================================================================
  // JSON exam upload (POST /assignments/from-json, POST /assignments/validate)
  // ==========================================================================
  // See dto/assignment-json.dto.ts for the full schema this validates against
  // and assignment_template.json / grade7_mathematics_exam.json for worked
  // examples.

  /**
   * Runs BOTH layers of validation on a raw (untyped, straight from
   * JSON.parse) upload in one pass, so the upload UI can show every problem
   * at once instead of a teacher fixing one typo, re-uploading, hitting the
   * next one, and so on:
   *   1. Basic well-formedness via class-validator (right types, required
   *      fields present, string lengths, enum values) — same rules
   *      @Body() would enforce automatically on a typed DTO, just collected
   *      instead of thrown on the first failure.
   *   2. Structural/semantic rules that depend on `type` (e.g. MULTIPLE_CHOICE
   *      needs options + a correctAnswer that matches one of them) — these
   *      can't be expressed as class-validator decorators because the shape
   *      of `options`/`correctAnswer` is different for every question type.
   * Used by both POST /assignments/validate (preview only) and
   * POST /assignments/from-json (validate-then-create), so the two can never
   * disagree about what's valid.
   */
  async validateExamJsonRaw(raw: unknown): Promise<{
    valid: boolean;
    errors: string[];
    computedTotalMarks: number;
    dto: AssignmentJsonDto;
  }> {
    const dto = plainToInstance(AssignmentJsonDto, raw ?? {});
    const classErrors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
    const errors = this.flattenValidationErrors(classErrors);

    let computedTotalMarks = 0;
    // Only attempt the structural walk if `sections` is at least an array —
    // otherwise a malformed top-level payload (e.g. sections: "oops") would
    // throw trying to iterate it, rather than surfacing as a clean error.
    if (Array.isArray(dto.sections)) {
      const structural = this.validateExamStructure(dto);
      errors.push(...structural.errors);
      computedTotalMarks = structural.computedTotalMarks;
    } else {
      errors.push('sections: must be an array of at least one section.');
    }

    return { valid: errors.length === 0, errors, computedTotalMarks, dto };
  }

  private flattenValidationErrors(errors: ValidationError[], pathPrefix = ''): string[] {
    const messages: string[] = [];
    for (const err of errors) {
      const path = pathPrefix ? `${pathPrefix}.${err.property}` : err.property;
      if (err.constraints) {
        messages.push(...Object.values(err.constraints).map((m) => `${path}: ${m}`));
      }
      if (err.children?.length) {
        messages.push(...this.flattenValidationErrors(err.children, path));
      }
    }
    return messages;
  }

  private validateExamStructure(dto: AssignmentJsonDto): { errors: string[]; computedTotalMarks: number } {
    const errors: string[] = [];
    let computedTotalMarks = 0;

    if (!dto.sections || dto.sections.length === 0) {
      errors.push('sections: at least one section is required.');
      return { errors, computedTotalMarks };
    }

    dto.sections.forEach((section, sIndex) => {
      const sLabel = `Section ${sIndex + 1} ("${section?.name ?? 'untitled'}")`;
      if (!section?.questions || section.questions.length === 0) {
        errors.push(`${sLabel}: must contain at least one question.`);
        return;
      }

      section.questions.forEach((q, qIndex) => {
        const qLabel = `${sLabel}, Question ${qIndex + 1}`;
        computedTotalMarks += q?.points || 0;

        if (!q?.questionText?.trim()) {
          errors.push(`${qLabel}: questionText is required.`);
        }
        if (!q?.points || q.points < 1) {
          errors.push(`${qLabel}: points must be at least 1.`);
        }

        switch (q?.type) {
          case QuestionType.MULTIPLE_CHOICE: {
            const options = Array.isArray(q.options) ? (q.options as string[]) : null;
            if (!options || options.length < 2) {
              errors.push(`${qLabel}: MULTIPLE_CHOICE needs an "options" array with at least 2 choices.`);
            } else if (options.length > 8) {
              errors.push(`${qLabel}: MULTIPLE_CHOICE supports at most 8 options.`);
            }
            if (typeof q.correctAnswer !== 'string' || !q.correctAnswer) {
              errors.push(`${qLabel}: needs a "correctAnswer" string.`);
            } else if (options && !options.includes(q.correctAnswer)) {
              errors.push(`${qLabel}: correctAnswer "${q.correctAnswer}" must exactly match one of the options.`);
            }
            break;
          }
          case QuestionType.TRUE_FALSE: {
            const ans = typeof q.correctAnswer === 'string' ? q.correctAnswer.toLowerCase() : '';
            if (ans !== 'true' && ans !== 'false') {
              errors.push(`${qLabel}: TRUE_FALSE needs correctAnswer to be "true" or "false".`);
            }
            break;
          }
          case QuestionType.FILL_BLANK: {
            if (typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) {
              errors.push(`${qLabel}: FILL_BLANK needs a non-empty "correctAnswer" string.`);
            }
            break;
          }
          case QuestionType.MATCHING: {
            const opts = q.options as { left?: string[]; right?: string[] } | undefined;
            const leftOk = opts && Array.isArray(opts.left) && opts.left.length > 0;
            const rightOk = opts && Array.isArray(opts.right) && opts.right.length === opts.left?.length;
            if (!leftOk || !rightOk) {
              errors.push(`${qLabel}: MATCHING needs options.left and options.right arrays of equal, non-zero length.`);
            }
            if (!q.correctAnswer || typeof q.correctAnswer !== 'object' || Array.isArray(q.correctAnswer)) {
              errors.push(`${qLabel}: MATCHING needs a correctAnswer object mapping each left index to a right index, e.g. {"0":"2"}.`);
            } else if (leftOk) {
              const map = q.correctAnswer as Record<string, string>;
              opts!.left!.forEach((_, i) => {
                if (!(String(i) in map)) errors.push(`${qLabel}: correctAnswer is missing a mapping for left item ${i}.`);
              });
            }
            break;
          }
          case QuestionType.ORDERING: {
            const opts = Array.isArray(q.options) ? (q.options as string[]) : null;
            const ans = Array.isArray(q.correctAnswer) ? (q.correctAnswer as string[]) : null;
            if (!opts || opts.length < 2) {
              errors.push(`${qLabel}: ORDERING needs an "options" array with at least 2 items.`);
            }
            if (!ans || ans.length === 0) {
              errors.push(`${qLabel}: ORDERING needs a "correctAnswer" array giving the correct order.`);
            } else if (opts && (ans.length !== opts.length || !opts.every((o) => ans.includes(o)))) {
              errors.push(`${qLabel}: correctAnswer must contain exactly the same items as "options", reordered.`);
            }
            break;
          }
          case QuestionType.ESSAY:
          case QuestionType.FILE_UPLOAD:
            // No structural requirements — always manually graded, never
            // auto-gradable, so there's no correctAnswer/options shape to check.
            break;
          default:
            errors.push(`${qLabel}: unknown or missing question "type".`);
        }
      });
    });

    if (dto.totalMarks != null && dto.totalMarks !== computedTotalMarks) {
      errors.push(
        `totalMarks (${dto.totalMarks}) does not match the sum of question points (${computedTotalMarks}). Fix one of them, or omit totalMarks to have it computed automatically.`,
      );
    }

    return { errors, computedTotalMarks };
  }

  // `options`/`correctAnswer` are typed loosely (string | string[] | object)
  // on ExamQuestionDto because their real shape depends on question type —
  // these two helpers are the single place that decides how each shape gets
  // serialized into the Question model's Json/String columns, so
  // SubmissionsService's grading logic (which deserializes them the same
  // way) always agrees with what actually got stored.
  private serializeOptions(q: ExamQuestionDto): unknown {
    if (q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.ORDERING) {
      return q.options ?? undefined;
    }
    if (q.type === QuestionType.MATCHING) {
      return q.options ?? undefined;
    }
    return undefined;
  }

  private serializeCorrectAnswer(q: ExamQuestionDto): string | undefined {
    if (q.correctAnswer == null) return undefined;
    if (typeof q.correctAnswer === 'string') return q.correctAnswer;
    // MATCHING (object) or ORDERING (array) — persisted as a JSON string in
    // the String correctAnswer column, compared structurally at grading
    // time (see SubmissionsService.isAnswerCorrect), not as raw text.
    return JSON.stringify(q.correctAnswer);
  }

  /**
   * Creates an assignment, its sections, and their questions from an
   * ALREADY-VALIDATED AssignmentJsonDto (see validateExamJsonRaw — the
   * controller is expected to call that first and refuse to reach this
   * method if it reports invalid).
   *
   * This runs as one interactive transaction rather than a single nested
   * Prisma `create` because Question has two independent foreign keys
   * (assignmentId, required; sectionId, optional) and Prisma's nested-write
   * syntax can only auto-populate the FK for the relation path the write
   * actually went through. Nesting questions under `section.create` would
   * set sectionId but leave the required assignmentId unset; nesting them
   * under `assignment.create` instead would set assignmentId but leave
   * sectionId unset (since the matching Section row doesn't exist yet at
   * that point in a single call). Creating the assignment, then each
   * section, then each of its questions — all inside one $transaction — sets
   * both FKs explicitly and still rolls back atomically if anything fails.
   */
  async createFromJson(dto: AssignmentJsonDto, computedTotalMarks: number, actor: AuthenticatedUser) {
    const assignmentId = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          schoolId: actor.schoolId,
          title: dto.title,
          description: dto.description,
          subject: dto.subject,
          grade: dto.grade,
          type: dto.type ?? AssignmentType.TEACHER_MARKED,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          maxPoints: dto.totalMarks ?? computedTotalMarks,
          timeAllowedMinutes: dto.timeAllowedMinutes,
          instructions: dto.instructions,
          rawJson: dto as any,
          isPublished: true,
          createdById: actor.id,
        },
      });

      for (let sIndex = 0; sIndex < dto.sections.length; sIndex++) {
        const sectionDto = dto.sections[sIndex];
        const section = await tx.section.create({
          data: {
            assignmentId: assignment.id,
            name: sectionDto.name,
            description: sectionDto.description,
            order: sIndex,
          },
        });

        for (let qIndex = 0; qIndex < sectionDto.questions.length; qIndex++) {
          const q = sectionDto.questions[qIndex];
          await tx.question.create({
            data: {
              assignmentId: assignment.id,
              sectionId: section.id,
              questionText: q.questionText,
              questionType: q.type,
              options: this.serializeOptions(q) as any,
              correctAnswer: this.serializeCorrectAnswer(q),
              points: q.points,
              order: qIndex,
              hint: q.hint,
            },
          });
        }
      }

      return assignment.id;
    });

    return this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        sections: { orderBy: { order: 'asc' } },
      },
    });
  }

  async update(id: number, dto: UpdateAssignmentDto, actor: AuthenticatedUser) {
    const assignment = await this.findOne(id, actor);
    this.assertCanModify(assignment, actor);

    // Deliberately flat/scalar-only: editing individual questions or rubric
    // rows after creation isn't supported in this build (would need diffing
    // add/remove/update per question). `attachments`/`resources`, if
    // provided, replace the array wholesale — the client is expected to
    // send the full desired list, not a delta.
    return this.prisma.assignment.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        subject: dto.subject,
        grade: dto.grade,
        type: dto.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        maxPoints: dto.maxPoints,
        isPublished: dto.isPublished,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : undefined,
        resources: dto.resources as any,
        attachments: dto.attachments as any,
      },
      include: { questions: { orderBy: { order: 'asc' } }, rubric: true },
    });
  }

  async remove(id: number, actor: AuthenticatedUser) {
    const assignment = await this.findOne(id, actor);
    this.assertCanModify(assignment, actor);

    await this.prisma.assignment.delete({ where: { id } });
    return { id };
  }

  // Removes correctAnswer from every question so students can't read it out
  // of the API response (the client-side auto-grading in the old build was
  // trust-the-client; the real answer key must never reach a student).
  private stripAnswersForStudent<T extends { questions: { correctAnswer: string | null }[] }>(
    assignment: T,
  ): T {
    return {
      ...assignment,
      questions: assignment.questions.map(({ correctAnswer, ...rest }) => rest) as any,
    };
  }

  private assertCanModify(
    assignment: { createdById: number | null },
    actor: AuthenticatedUser,
  ) {
    if (actor.role === Role.PLATFORM_ADMIN || actor.role === Role.SCHOOL_ADMIN) return;
    if (actor.role === Role.TEACHER && assignment.createdById === actor.id) return;
    throw new ForbiddenException('You can only modify assignments you created');
  }

  private assertSameTenant(schoolId: number, actor: AuthenticatedUser) {
    if (actor.role === Role.PLATFORM_ADMIN) return;
    if (actor.schoolId !== schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }
  }
}
