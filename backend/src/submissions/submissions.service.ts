import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
  QuestionType.NUMERIC,
  QuestionType.SHORT_ANSWER,
  QuestionType.MATCHING,
  QuestionType.ORDERING,
]);

interface AutoGradeResult {
  pointsAwarded: number;
  feedback: string;
  isCorrect: boolean;
}

interface NumericAnswer {
  value: number;
  numericText: string;
  unitText: string;
}

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
      return this.sanitizeStudentSubmission(submission);
    }

    const answerByQuestionId = new Map((dto.answers ?? []).map((a) => [a.questionId, a.answer]));

    let allAutoGraded = true;
    let totalScore = 0;

    const answerRows = assignment.questions.map((q) => {
      const studentAnswer = answerByQuestionId.get(q.id) ?? '';
      let isCorrect: boolean | null = null;
      let pointsAwarded: number | null = null;
      let feedback: string | null = null;

      // Only actually grade on the final submit — a draft just records
      // whatever's typed so far, ungraded, so re-opening it later shows the
      // student's own in-progress answers rather than premature scores.
      if (isFinal && this.canAutoGradeQuestion(q)) {
        const result = this.gradeAutoQuestion(q, studentAnswer);
        isCorrect = result.isCorrect;
        pointsAwarded = result.pointsAwarded;
        feedback = result.feedback;
        totalScore += pointsAwarded;
      } else if (isFinal) {
        allAutoGraded = false;
      }

      return { questionId: q.id, studentAnswer, isCorrect, pointsAwarded, feedback };
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
    return this.sanitizeStudentSubmission(submission);
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
      const submissions = await this.prisma.submission.findMany({
        where: { studentId: actor.id, assignmentId: filters.assignmentId },
        // gradedBy included so a student can see WHO graded their work
        // (ExamPlayer's already-submitted view) — never anything beyond
        // id/name, same minimal shape used for `student` below.
        include: { assignment: true, answers: true, gradedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return submissions.map((submission) => this.sanitizeStudentSubmission(submission));
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
        gradedBy: { select: { id: true, name: true } },
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
        student: { select: { id: true, name: true } },
        gradedBy: { select: { id: true, name: true } },
        answers: { include: { question: true }, orderBy: { questionId: 'asc' } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    if (actor.role === Role.STUDENT) {
      if (submission.studentId !== actor.id) {
        throw new ForbiddenException('You can only view your own submissions');
      }
      return this.sanitizeStudentSubmission(submission);
    } else if (actor.role !== Role.PLATFORM_ADMIN && submission.assignment.schoolId !== actor.schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }

    return submission;
  }

  async getReleasedResults(id: number, actor: AuthenticatedUser) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: true,
        gradedBy: { select: { id: true, name: true } },
        answers: { include: { question: true }, orderBy: { questionId: 'asc' } },
      },
    });
    if (!submission || submission.studentId !== actor.id) {
      throw new NotFoundException('Submission not found');
    }
    if (!submission.resultsReleasedAt) {
      throw new ForbiddenException('Results have not been released');
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
      include: {
        student: { select: { id: true, name: true } },
        gradedBy: { select: { id: true, name: true } },
        answers: { include: { question: true } },
      },
    });
  }

  async releaseResults(id: number, actor: AuthenticatedUser) {
    const submission = await this.findOne(id, actor);
    if (submission.status !== SubmissionStatus.GRADED) {
      throw new BadRequestException('Grade this submission before releasing its results');
    }

    return this.prisma.submission.update({
      where: { id: submission.id },
      data: { resultsReleasedAt: submission.resultsReleasedAt ?? new Date() },
      include: {
        student: { select: { id: true, name: true } },
        gradedBy: { select: { id: true, name: true } },
        answers: { include: { question: true } },
      },
    });
  }

  /**
   * Student-facing submission payloads never expose grading outcomes until
   * review is explicitly released. Question answer keys/config stay private
   * on this general endpoint even after release; /:id/results is the only
   * student endpoint that can return them.
   */
  private sanitizeStudentSubmission<T>(submission: T): T {
    const source = submission as any;
    const released = Boolean(source.resultsReleasedAt);
    return {
      ...source,
      ...(released
        ? {}
        : {
            score: null,
            feedback: null,
            gradedById: null,
            gradedBy: null,
            gradedAt: null,
          }),
      answers: Array.isArray(source.answers)
        ? source.answers.map((answer: any) => {
            // explanation is as sensitive as correctAnswer/config (it
            // directly explains the answer) — stripped here on every
            // general endpoint the same way, regardless of release status.
            // getReleasedResults (/submissions/:id/results) is still the
            // only student endpoint that returns it, exactly like
            // correctAnswer/config.
            const safeQuestion = answer.question
              ? (({ correctAnswer, config, explanation, ...question }: any) => question)(
                  answer.question,
                )
              : undefined;
            return {
              ...answer,
              ...(released
                ? {}
                : {
                    isCorrect: null,
                    pointsAwarded: null,
                    feedback: null,
                  }),
              ...(answer.question ? { question: safeQuestion } : {}),
            };
          })
        : source.answers,
    } as T;
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

  private canAutoGradeQuestion(question: {
    questionType: QuestionType;
    correctAnswer: string | null;
    config: unknown;
  }): boolean {
    if (!AUTO_GRADABLE_TYPES.has(question.questionType)) return false;
    if (question.questionType === QuestionType.NUMERIC) {
      const numeric = this.numericConfig(question.config);
      return (
        (typeof numeric?.acceptedValue === 'number' && Number.isFinite(numeric.acceptedValue)) ||
        this.parseNumericAnswer(question.correctAnswer ?? '') !== null
      );
    }
    if (question.questionType === QuestionType.SHORT_ANSWER) {
      const keywords = this.shortAnswerConfig(question.config)?.keywords;
      return (
        (Array.isArray(keywords) && keywords.some((keyword) => typeof keyword === 'string' && !!keyword.trim())) ||
        Boolean(question.correctAnswer?.trim())
      );
    }
    return Boolean(question.correctAnswer?.trim());
  }

  private gradeAutoQuestion(
    question: {
      questionType: QuestionType;
      correctAnswer: string | null;
      config: unknown;
      points: number;
    },
    studentAnswer: string,
  ): AutoGradeResult {
    if (question.questionType === QuestionType.NUMERIC) {
      return this.gradeNumeric(question, studentAnswer);
    }
    if (question.questionType === QuestionType.SHORT_ANSWER) {
      return this.gradeShortAnswer(question, studentAnswer);
    }

    const isCorrect = this.isAnswerCorrect(
      question.questionType,
      studentAnswer,
      question.correctAnswer ?? '',
    );
    return {
      pointsAwarded: isCorrect ? question.points : 0,
      feedback: isCorrect ? 'Correct.' : 'The answer does not match the expected response.',
      isCorrect,
    };
  }

  private gradeNumeric(
    question: { config: unknown; correctAnswer: string | null; points: number },
    studentAnswer: string,
  ): AutoGradeResult {
    if (!studentAnswer.trim()) {
      return { pointsAwarded: 0, feedback: 'No answer was provided.', isCorrect: false };
    }

    const parsed = this.parseNumericAnswer(studentAnswer);
    if (!parsed) {
      return {
        pointsAwarded: 0,
        feedback: 'Enter a valid number, decimal, scientific value, or fraction.',
        isCorrect: false,
      };
    }

    const config = this.numericConfig(question.config);
    const fallback = this.parseNumericAnswer(question.correctAnswer ?? '');
    const acceptedValue =
      typeof config?.acceptedValue === 'number' && Number.isFinite(config.acceptedValue)
        ? config.acceptedValue
        : fallback?.value;
    if (acceptedValue === undefined) {
      return { pointsAwarded: 0, feedback: 'This answer requires teacher review.', isCorrect: false };
    }

    const tolerance =
      typeof config?.tolerance === 'number' && Number.isFinite(config.tolerance)
        ? Math.max(0, config.tolerance)
        : 0;
    const expectedUnitText = typeof config?.unit === 'string' && config.unit.trim() ? ` ${config.unit.trim()}` : '';
    // Only shown once a submission is graded AND its results are released
    // (SubmissionsService.sanitizeStudentSubmission / getReleasedResults
    // are the gate — this string is just the feedback text stored on
    // Answer.feedback, private until then like everything else there).
    const expectedText =
      tolerance > 0
        ? `Expected: ${acceptedValue}${expectedUnitText} (±${tolerance}).`
        : `Expected: ${acceptedValue}${expectedUnitText}.`;
    const difference = Math.abs(parsed.value - acceptedValue);
    if (difference > tolerance) {
      const isClose = tolerance > 0 && difference <= tolerance * 10;
      return {
        pointsAwarded: isClose ? Math.round(question.points * 0.5) : 0,
        feedback: isClose
          ? `The answer is close. Check the calculation and rounding. ${expectedText}`
          : `The numeric answer is outside the accepted range. ${expectedText}`,
        isCorrect: false,
      };
    }

    let pointsAwarded = question.points;
    const feedback: string[] = ['The numeric value is correct.'];
    const significantFigures = config?.significantFigures;
    if (
      typeof significantFigures === 'number' &&
      Number.isInteger(significantFigures) &&
      significantFigures > 0 &&
      this.countSignificantFigures(parsed.numericText) !== significantFigures
    ) {
      pointsAwarded = this.applyIntegerPenalty(pointsAwarded, 0.9);
      feedback.push(`Use ${significantFigures} significant figures.`);
    }

    const expectedUnit = typeof config?.unit === 'string' ? config.unit.trim() : '';
    if (expectedUnit && this.normalizedUnit(parsed.unitText) !== this.normalizedUnit(expectedUnit)) {
      pointsAwarded = this.applyIntegerPenalty(pointsAwarded, 0.8);
      feedback.push(`Include the required unit (${expectedUnit}).`);
    }

    return { pointsAwarded, feedback: feedback.join(' '), isCorrect: true };
  }

  private gradeShortAnswer(
    question: { config: unknown; correctAnswer: string | null; points: number },
    studentAnswer: string,
  ): AutoGradeResult {
    const normalizedAnswer = this.normalizeText(studentAnswer);
    if (!normalizedAnswer) {
      return { pointsAwarded: 0, feedback: 'No answer was provided.', isCorrect: false };
    }

    const config = this.shortAnswerConfig(question.config);
    // Keep the original (pre-normalization) keyword text alongside the
    // normalized form used for matching, so feedback can show the student
    // something readable rather than the lowercased/trimmed match key.
    const keywordPairs = Array.isArray(config?.keywords)
      ? config.keywords
          .filter((keyword): keyword is string => typeof keyword === 'string' && !!keyword.trim())
          .map((keyword) => ({ original: keyword.trim(), normalized: this.normalizeText(keyword) }))
          .filter((pair) => pair.normalized)
      : [];

    if (!keywordPairs.length) {
      const expected = this.normalizeText(question.correctAnswer ?? '');
      const isCorrect = Boolean(expected) && normalizedAnswer === expected;
      return {
        pointsAwarded: isCorrect ? question.points : 0,
        feedback: isCorrect
          ? 'Correct.'
          : question.correctAnswer?.trim()
            ? `The response needs teacher review. Suggested answer: ${question.correctAnswer.trim()}.`
            : 'The response needs teacher review.',
        isCorrect,
      };
    }

    const matchedPairs = keywordPairs.filter((pair) => normalizedAnswer.includes(pair.normalized));
    const missingPairs = keywordPairs.filter((pair) => !normalizedAnswer.includes(pair.normalized));
    const ratio = matchedPairs.length / keywordPairs.length;
    const configuredThreshold = config?.passThreshold;
    const passThreshold =
      typeof configuredThreshold === 'number' && configuredThreshold > 0 && configuredThreshold <= 1
        ? configuredThreshold
        : 0.7;
    const pointsAwarded = Math.round(ratio * question.points);
    const isCorrect = ratio >= passThreshold;

    // Only shown once results are released, same as the numeric-question
    // "Expected:" text above — Answer.feedback is private until then.
    const keywordDetail = missingPairs.length
      ? ` Missing: ${missingPairs.map((pair) => pair.original).join(', ')}.`
      : matchedPairs.length
        ? ` Covered: ${matchedPairs.map((pair) => pair.original).join(', ')}.`
        : '';

    return {
      pointsAwarded,
      feedback: isCorrect
        ? `The response covers the required key points.${keywordDetail}`
        : ratio > 0
          ? `The response includes some key points but needs more detail.${keywordDetail}`
          : `The response does not yet cover the required key points.${keywordDetail}`,
      isCorrect,
    };
  }

  private parseNumericAnswer(answer: string): NumericAnswer | null {
    const normalized = answer.trim().replace(/,/g, '');
    const numberPattern = '[+-]?(?:(?:\\d+(?:\\.\\d*)?)|(?:\\.\\d+))(?:e[+-]?\\d+)?';
    const match = normalized.match(
      new RegExp(`^(${numberPattern})(?:\\s*\\/\\s*(${numberPattern}))?\\s*(.*)$`, 'i'),
    );
    if (!match) return null;

    const numerator = Number(match[1]);
    const denominator = match[2] === undefined ? null : Number(match[2]);
    if (
      !Number.isFinite(numerator) ||
      (denominator !== null && (!Number.isFinite(denominator) || denominator === 0))
    ) {
      return null;
    }

    const unitText = match[3]?.trim() ?? '';
    if (unitText && !/[a-zA-Zµμ°%²³]/.test(unitText)) return null;

    return {
      value: denominator === null ? numerator : numerator / denominator,
      numericText: denominator === null ? match[1] : `${match[1]}/${match[2]}`,
      unitText,
    };
  }

  private countSignificantFigures(value: string): number {
    const numerator = value.split('/')[0].trim().replace(/^[+-]/, '').toLowerCase().split('e')[0];
    const withoutLeadingZeros = numerator.replace('.', '').replace(/^0+/, '');
    if (!withoutLeadingZeros) return 0;
    return numerator.includes('.')
      ? withoutLeadingZeros.length
      : withoutLeadingZeros.replace(/0+$/, '').length;
  }

  private normalizeText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private normalizedUnit(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/\^2/g, '²')
      .replace(/\^3/g, '³')
      .replace(/[.,;:]$/, '');
  }

  private applyIntegerPenalty(points: number, ratio: number): number {
    if (points <= 1) return 0;
    return Math.max(1, Math.floor(points * ratio));
  }

  private numericConfig(config: unknown): {
    acceptedValue?: unknown;
    tolerance?: unknown;
    unit?: unknown;
    significantFigures?: unknown;
  } | null {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
    const numeric = (config as Record<string, unknown>).numeric;
    return numeric && typeof numeric === 'object' && !Array.isArray(numeric)
      ? (numeric as Record<string, unknown>)
      : null;
  }

  private shortAnswerConfig(config: unknown): {
    keywords?: unknown;
    passThreshold?: unknown;
  } | null {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
    const shortAnswer = (config as Record<string, unknown>).shortAnswer;
    return shortAnswer && typeof shortAnswer === 'object' && !Array.isArray(shortAnswer)
      ? (shortAnswer as Record<string, unknown>)
      : null;
  }
}