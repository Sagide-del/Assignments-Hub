import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { AssignmentType, QuestionType, SubmissionStatus } from '@prisma/client';
import { SmsService } from '../sms/sms.service';

// Question types the server can grade automatically by comparing the
// student's answer to Question.correctAnswer. MATCHING/ORDERING are
// included — their answers are JSON-encoded strings (see
// AssignmentsService.serializeCorrectAnswer) compared structurally by
// isAnswerCorrect below, not as raw text. Essay/file-upload always need a
// human to award points.
const AUTO_GRADABLE_TYPES = new Set<QuestionType>([
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.FILL_BLANK,
  QuestionType.MATCHING,
  QuestionType.ORDERING,
]);

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Single endpoint for the whole exam-taking lifecycle: the first call (no
   * prior submission) with isDraft:true starts a resumable DRAFT; repeated
   * calls with isDraft:true (autosave) overwrite its answers; a call with
   * isDraft:false/omitted finalizes — grades whatever's auto-gradable and
   * locks the submission in, exactly like a one-shot submit always did.
   * A second finalize attempt on an already-finalized submission is still
   * rejected (ConflictException), same as before this draft support existed.
   */
  async create(assignmentId: number, dto: CreateSubmissionDto, actor: AuthenticatedUser) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { questions: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    const existing = await this.prisma.submission.findFirst({
      where: { assignmentId, studentId: actor.id },
    });
    if (existing && existing.status !== SubmissionStatus.DRAFT) {
      throw new ConflictException('You have already submitted this assignment');
    }

    const isFinal = !dto.isDraft;
    const isLate = !!assignment.dueDate && new Date() > assignment.dueDate;
    const startedAt = existing?.startedAt ?? new Date();
    const timeSpentSeconds = dto.timeSpentSeconds ?? existing?.timeSpentSeconds ?? null;

    // Legacy path: assignments created before the question builder existed
    // have no question bank — fall back to the old client-trusted score for
    // AUTO_MARKED assignments. Drafts are a no-op of sorts here (there's
    // nothing to autosave without questions) but still tracked so the UI's
    // timer/resume logic has something consistent to read.
    if (assignment.questions.length === 0) {
      const isAutoMarked = assignment.type === AssignmentType.AUTO_MARKED;
      const hasScore = isFinal && isAutoMarked && dto.score != null;
      const completedAt = isFinal ? new Date() : null;
      const data = {
        score: hasScore ? dto.score! : (existing?.score ?? null),
        status: isFinal ? (hasScore ? SubmissionStatus.GRADED : SubmissionStatus.SUBMITTED) : SubmissionStatus.DRAFT,
        gradedAt: hasScore ? new Date() : (existing?.gradedAt ?? null),
        isLate,
        completedAt,
        startedAt,
        timeSpentSeconds,
      };
      const submission = existing
        ? await this.prisma.submission.update({ where: { id: existing.id }, data })
        : await this.prisma.submission.create({ data: { assignmentId, studentId: actor.id, ...data } });
      if (isFinal) this.notifyParent(actor, assignment.title, assignmentId, completedAt!);
      return submission;
    }

    const answerByQuestionId = new Map((dto.answers ?? []).map((a) => [a.questionId, a.answer]));

    let allAutoGraded = true;
    let totalScore = 0;

    const answerRows = assignment.questions.map((q) => {
      const studentAnswer = answerByQuestionId.get(q.id) ?? '';
      let isCorrect: boolean | null = null;
      let pointsAwarded: number | null = null;

      // Only actually grade on the final submit — a draft just records
      // whatever's typed so far, ungraded, so re-opening it later shows the
      // student's own in-progress answers rather than premature scores.
      if (isFinal && AUTO_GRADABLE_TYPES.has(q.questionType) && q.correctAnswer != null && q.correctAnswer !== '') {
        isCorrect = this.isAnswerCorrect(q.questionType, studentAnswer, q.correctAnswer);
        pointsAwarded = isCorrect ? q.points : 0;
        totalScore += pointsAwarded;
      } else if (isFinal) {
        allAutoGraded = false;
      }

      return { questionId: q.id, studentAnswer, isCorrect, pointsAwarded };
    });

    const fullyGraded = isFinal && allAutoGraded && answerRows.length > 0;
    const completedAt = isFinal ? new Date() : null;

    const submissionData = {
      status: isFinal ? (fullyGraded ? SubmissionStatus.GRADED : SubmissionStatus.SUBMITTED) : SubmissionStatus.DRAFT,
      // Only surface a score once every question has been graded (auto or
      // otherwise) — a partial sum while essay questions are still pending,
      // or while still a draft, would make this submission look "graded" in
      // reports aggregates that key off score != null.
      score: fullyGraded ? totalScore : null,
      gradedAt: fullyGraded ? new Date() : null,
      isLate,
      completedAt,
      startedAt,
      timeSpentSeconds,
    };

    let submission;
    if (existing) {
      // Resuming/overwriting a draft — replace its answer rows wholesale.
      // A draft was never graded, so there's no per-row grading history on
      // the old rows worth preserving; deleting and recreating is simpler
      // and just as correct as diffing.
      await this.prisma.answer.deleteMany({ where: { submissionId: existing.id } });
      submission = await this.prisma.submission.update({
        where: { id: existing.id },
        data: { ...submissionData, answers: { create: answerRows } },
        include: { answers: true },
      });
    } else {
      submission = await this.prisma.submission.create({
        data: { assignmentId, studentId: actor.id, ...submissionData, answers: { create: answerRows } },
        include: { answers: true },
      });
    }

    if (isFinal) this.notifyParent(actor, assignment.title, assignmentId, completedAt!);
    return submission;
  }

  // Fire-and-forget: looks up the student's parentPhone fresh (rather than
  // trusting a possibly-stale JWT claim) and sends the SMS in the
  // background. Errors are logged, never thrown — a flaky SMS gateway must
  // never fail or delay a student's submission.
  private notifyParent(actor: AuthenticatedUser, assignmentTitle: string, assignmentId: number, completedAt: Date) {
    this.prisma.user
      .findUnique({ where: { id: actor.id }, select: { parentPhone: true, name: true } })
      .then((student) => {
        if (!student?.parentPhone) return;
        return this.smsService.notifyAssignmentCompleted({
          schoolId: actor.schoolId,
          studentId: actor.id,
          studentName: student.name,
          parentPhone: student.parentPhone,
          assignmentTitle,
          assignmentId,
          completedAt,
        });
      })
      .catch((err) => this.logger.error('Failed to send assignment-completed SMS:', err?.message || err));
  }

  async findAll(
    actor: AuthenticatedUser,
    filters: { assignmentId?: number; schoolId?: number } = {},
  ) {
    if (actor.role === Role.STUDENT) {
      // Deliberately includes DRAFT rows — the exam-taking UI needs to find
      // its own in-progress draft to resume (see assignment-renderer.js).
      // Any view that lists a student's finished submissions (report card,
      // "My Submissions" history) must filter status !== 'DRAFT' itself.
      return this.prisma.submission.findMany({
        where: { studentId: actor.id, assignmentId: filters.assignmentId },
        include: { assignment: true, answers: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? filters.schoolId : actor.schoolId;

    return this.prisma.submission.findMany({
      where: {
        assignmentId: filters.assignmentId,
        assignment: targetSchoolId ? { schoolId: targetSchoolId } : undefined,
        // Never show a student's still-in-progress draft to a teacher/admin
        // as if it were something waiting to be graded.
        status: { not: SubmissionStatus.DRAFT },
      },
      include: {
        assignment: true,
        student: { select: { id: true, name: true } },
        answers: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: true,
        answers: { include: { question: true }, orderBy: { questionId: 'asc' } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    if (actor.role === Role.STUDENT) {
      if (submission.studentId !== actor.id) {
        throw new ForbiddenException('You can only view your own submissions');
      }
    } else if (actor.role !== Role.PLATFORM_ADMIN && submission.assignment.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    return submission;
  }

  async grade(id: number, dto: GradeSubmissionDto, actor: AuthenticatedUser) {
    const submission = await this.findOne(id, actor);

    if (actor.role === Role.STUDENT) {
      throw new ForbiddenException('You do not have permission to grade submissions');
    }

    if (dto.answers?.length) {
      await this.prisma.$transaction(
        dto.answers.map((a) =>
          this.prisma.answer.updateMany({
            where: { submissionId: submission.id, questionId: a.questionId },
            data: {
              ...(a.pointsAwarded !== undefined ? { pointsAwarded: a.pointsAwarded } : {}),
              ...(a.feedback !== undefined ? { feedback: a.feedback } : {}),
            },
          }),
        ),
      );
    }

    let score = dto.score;
    if (score === undefined) {
      const answers = await this.prisma.answer.findMany({ where: { submissionId: submission.id } });
      if (answers.length > 0) {
        score = answers.reduce((sum, a) => sum + (a.pointsAwarded ?? 0), 0);
      }
    }

    return this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        score: score ?? submission.score,
        feedback: dto.feedback ?? submission.feedback,
        status: SubmissionStatus.GRADED,
        gradedById: actor.id,
        gradedAt: new Date(),
      },
      include: { answers: { include: { question: true } } },
    });
  }

  // MULTIPLE_CHOICE/TRUE_FALSE/FILL_BLANK compare as plain text
  // (case/whitespace-insensitive). MATCHING/ORDERING answers are JSON
  // strings (an {index: index} map, or an ordered array — see
  // AssignmentsService.serializeCorrectAnswer) and are compared
  // structurally: JSON.stringify normalizes array order (which is exactly
  // what ORDERING needs to check) and, usefully, V8 always emits
  // integer-like object keys in ascending numeric order regardless of
  // insertion order, which normalizes MATCHING's left-index -> right-index
  // map for free.
  private isAnswerCorrect(type: QuestionType, given: string, correct: string): boolean {
    if (type === QuestionType.MATCHING || type === QuestionType.ORDERING) {
      try {
        return JSON.stringify(JSON.parse(given)) === JSON.stringify(JSON.parse(correct));
      } catch {
        return false;
      }
    }
    return given.trim().toLowerCase() === correct.trim().toLowerCase();
  }
}
