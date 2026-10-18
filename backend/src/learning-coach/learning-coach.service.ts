import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionBankStatus, QuestionType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { StartLearningSessionDto } from './dto/start-learning-session.dto';
import { SubmitLearningAnswerDto } from './dto/submit-learning-answer.dto';

const PRACTICE_TYPES = [
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.FILL_BLANK,
  QuestionType.NUMERIC,
  QuestionType.SHORT_ANSWER,
];

type QuestionConfig = {
  numeric?: { acceptedValue?: number; tolerance?: number };
  shortAnswer?: { keywords?: string[]; passThreshold?: number };
};

@Injectable()
export class LearningCoachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async catalog(actor: AuthenticatedUser) {
    this.assertStudent(actor);
    if (!actor.grade) return [];
    const rows = await this.prisma.questionBank.groupBy({
      by: ['subject', 'topic'],
      where: {
        isGlobal: true,
        status: QuestionBankStatus.APPROVED,
        grade: actor.grade,
        questionType: { in: PRACTICE_TYPES },
        correctAnswer: { not: null },
      },
      _count: { id: true },
      orderBy: [{ subject: 'asc' }, { topic: 'asc' }],
    });
    return rows.map((row) => ({ subject: row.subject, topic: row.topic, questionCount: row._count.id }));
  }

  async plans(actor: AuthenticatedUser) {
    this.assertStudent(actor);
    return this.prisma.learningCoachPlan.findMany({
      where: { schoolId: actor.schoolId, studentId: actor.id },
      orderBy: [{ nextReviewAt: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async start(dto: StartLearningSessionDto, actor: AuthenticatedUser) {
    this.assertStudent(actor);
    const grade = actor.grade?.trim();
    if (!grade) throw new BadRequestException('Set the learner grade before starting Learning Coach');

    const subject = dto.subject.trim();
    const topic = dto.topic.trim();
    const mode = dto.mode ?? 'DIAGNOSTIC';
    const candidates = await this.prisma.questionBank.findMany({
      where: {
        isGlobal: true,
        status: QuestionBankStatus.APPROVED,
        grade,
        subject: { equals: subject, mode: 'insensitive' },
        topic: { equals: topic, mode: 'insensitive' },
        questionType: { in: PRACTICE_TYPES },
        correctAnswer: { not: null },
      },
      include: {
        sourceDocument: { select: { title: true } },
        learningCoachResponses: {
          where: { studentId: actor.id },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (candidates.length < 3) {
      throw new BadRequestException('This topic needs at least three approved practice questions before Learning Coach can start.');
    }

    // Use unseen questions first; then rotate from least-recently practised
    // items so learners build recall rather than memorising a fixed test.
    const selected = candidates
      .sort((left, right) => {
        const countDifference = left.learningCoachResponses.length - right.learningCoachResponses.length;
        if (countDifference) return countDifference;
        const leftLast = left.learningCoachResponses[0]?.createdAt.getTime() ?? 0;
        const rightLast = right.learningCoachResponses[0]?.createdAt.getTime() ?? 0;
        return leftLast - rightLast || left.id - right.id;
      })
      .slice(0, Math.min(mode === 'DIAGNOSTIC' ? 6 : 8, candidates.length));

    const plan = await this.prisma.learningCoachPlan.upsert({
      where: { studentId_subject_grade_topic: { studentId: actor.id, subject, grade, topic } },
      create: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        subject,
        grade,
        topic,
        recommendedTechnique: 'Start with a short diagnosis, then use worked examples and explain each step in your own words.',
        focusAreas: [topic],
        plan: this.buildPlan(subject, topic, 0),
      },
      update: {},
    });
    const session = await this.prisma.learningCoachSession.create({
      data: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        planId: plan.id,
        mode,
        questionIds: selected.map((question) => question.id),
        total: selected.length,
      },
    });

    void this.audit.record({
      action: 'learning_coach.session_started', schoolId: actor.schoolId, userId: actor.id,
      resource: `LearningCoachSession:${session.id}`, metadata: { subject, grade, topic, mode },
    });
    return {
      session: { id: session.id, mode, total: session.total },
      plan,
      // The lesson is derived only from an approved bank item and its
      // reviewed explanation. This gives learners a worked example before
      // independent retrieval without asking an AI model to improvise facts.
      lesson: this.lessonForStudent(selected[0]),
      questions: selected.map((question) => this.forStudent(question)),
    };
  }

  async answer(sessionId: number, dto: SubmitLearningAnswerDto, actor: AuthenticatedUser) {
    this.assertStudent(actor);
    const session = await this.prisma.learningCoachSession.findFirst({
      where: { id: sessionId, schoolId: actor.schoolId, studentId: actor.id },
      include: { plan: true },
    });
    if (!session) throw new NotFoundException('Learning session not found');
    if (session.completedAt) throw new BadRequestException('This practice session is already complete');
    if (!session.questionIds.includes(dto.questionId)) throw new ForbiddenException('This question is not part of the current session');

    const question = await this.prisma.questionBank.findFirst({
      where: { id: dto.questionId, isGlobal: true, status: QuestionBankStatus.APPROVED },
      select: { id: true, questionType: true, correctAnswer: true, config: true, explanation: true },
    });
    if (!question?.correctAnswer) throw new NotFoundException('Practice question not found');

    const isCorrect = this.isCorrect(question.questionType, dto.answer, question.correctAnswer, question.config);
    const feedback = isCorrect
      ? `Correct. ${question.explanation?.trim() || 'Explain why this answer works before moving on.'}`
      : `Not quite. Correct answer: ${question.correctAnswer}. ${question.explanation?.trim() || 'Review the key idea, then try a related question.'}`;

    await this.prisma.learningCoachResponse.upsert({
      where: { sessionId_questionBankId: { sessionId, questionBankId: question.id } },
      create: { schoolId: actor.schoolId, sessionId, studentId: actor.id, questionBankId: question.id, answer: dto.answer.trim(), isCorrect, feedback },
      update: { answer: dto.answer.trim(), isCorrect, feedback },
    });

    const responses = await this.prisma.learningCoachResponse.findMany({
      where: { sessionId }, select: { isCorrect: true, questionBankId: true },
    });
    const score = Math.round((responses.filter((response) => response.isCorrect).length / session.total) * 100);
    const completed = responses.length === session.total;
    if (completed) {
      await this.completeSession(session, score, responses.map((response) => response.questionBankId));
    }
    return {
      isCorrect,
      feedback,
      answered: responses.length,
      total: session.total,
      completed,
      score: completed ? score : undefined,
      plan: completed ? await this.prisma.learningCoachPlan.findUnique({ where: { id: session.planId } }) : undefined,
    };
  }

  private async completeSession(
    session: { id: number; planId: number; mode: string; schoolId: number; studentId: number; plan: { masteryScore: number; lowPerformanceStreak: number; subject: string; topic: string } },
    score: number,
    questionIds: number[],
  ) {
    const masteryScore = session.plan.masteryScore
      ? Math.round((session.plan.masteryScore * 0.65) + (score * 0.35))
      : score;
    const lowPerformanceStreak = score < 50 ? session.plan.lowPerformanceStreak + 1 : 0;
    const requiresHumanSupport = lowPerformanceStreak >= 3;
    const technique = this.techniqueFor(masteryScore);
    const nextReviewAt = this.nextReviewAt(score, session.mode);
    await this.prisma.$transaction([
      this.prisma.learningCoachSession.update({ where: { id: session.id }, data: { score, completedAt: new Date() } }),
      this.prisma.learningCoachPlan.update({
        where: { id: session.planId },
        data: {
          masteryScore,
          lastDiagnosticScore: session.mode === 'DIAGNOSTIC' ? score : undefined,
          lowPerformanceStreak,
          requiresHumanSupport,
          nextReviewAt,
          recommendedTechnique: technique,
          focusAreas: score < 50
            ? [session.plan.topic, 'Learn one step at a time', 'Explain each answer aloud', 'Retry after feedback']
            : score < 75
              ? [session.plan.topic, 'Recall without notes', 'Correct and retry', 'Return for a spaced review']
              : [session.plan.topic, 'Mixed exam-style practice', 'Explain why each answer works'],
          plan: this.buildPlan(session.plan.subject, session.plan.topic, masteryScore),
        },
      }),
    ]);
    void this.audit.record({
      action: 'learning_coach.session_completed', schoolId: session.schoolId, userId: session.studentId,
      resource: `LearningCoachSession:${session.id}`, metadata: { score, masteryScore, questionIds },
    });
  }

  private forStudent(question: { id: number; questionText: string; contentHtml: string | null; questionType: QuestionType; options: Prisma.JsonValue | null; hint: string | null; points: number; diagramUrl: string | null; diagramAlt: string | null; sourceDocument: { title: string } | null }) {
    return {
      id: question.id, questionText: question.questionText, contentHtml: question.contentHtml,
      questionType: question.questionType, options: question.options, hint: question.hint,
      points: question.points, diagramUrl: question.diagramUrl, diagramAlt: question.diagramAlt,
      sourceTitle: question.sourceDocument?.title ?? null,
    };
  }

  private lessonForStudent(question: {
    questionText: string;
    correctAnswer: string | null;
    explanation: string | null;
    hint: string | null;
    diagramUrl: string | null;
    diagramAlt: string | null;
    sourceDocument: { title: string } | null;
  }) {
    return {
      objective: 'Study one worked example, explain the key idea, then practise it without notes.',
      workedExample: question.questionText,
      modelAnswer: question.correctAnswer ?? '',
      explanation: question.explanation?.trim() || question.hint?.trim() || 'Use the worked example to identify the rule or process before you begin practice.',
      reflectionPrompt: 'Before you continue, explain in your own words why this answer works. You do not need to write it perfectly; the goal is to make the idea clear in your mind.',
      diagramUrl: question.diagramUrl,
      diagramAlt: question.diagramAlt,
      sourceTitle: question.sourceDocument?.title ?? null,
    };
  }

  private isCorrect(type: QuestionType, answer: string, correctAnswer: string, rawConfig: Prisma.JsonValue | null) {
    const normalized = answer.trim().toLowerCase();
    const expected = correctAnswer.trim().toLowerCase();
    if (type === QuestionType.NUMERIC) {
      const supplied = Number(answer.replace(/,/g, '').trim());
      const config = (rawConfig ?? {}) as QuestionConfig;
      const accepted = config.numeric?.acceptedValue ?? Number(correctAnswer);
      const tolerance = config.numeric?.tolerance ?? 0;
      return Number.isFinite(supplied) && Number.isFinite(accepted) && Math.abs(supplied - accepted) <= tolerance;
    }
    if (type === QuestionType.SHORT_ANSWER) {
      const keywords = ((rawConfig ?? {}) as QuestionConfig).shortAnswer?.keywords?.filter(Boolean) ?? [];
      if (!keywords.length) return normalized === expected;
      const covered = keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length / keywords.length;
      return covered >= (((rawConfig ?? {}) as QuestionConfig).shortAnswer?.passThreshold ?? 0.7);
    }
    return normalized === expected;
  }

  private techniqueFor(score: number) {
    if (score < 40) return 'Use worked examples, then teach the idea aloud in your own words before attempting another question.';
    if (score < 70) return 'Use retrieval practice: close the notes, answer from memory, then correct and retry after a short break.';
    return 'Use interleaved, timed practice: mix this topic with a related topic and explain each solution step.';
  }

  private buildPlan(subject: string, topic: string, masteryScore: number) {
    return [
      { order: 1, title: `Learn one idea: ${topic}`, minutes: 8, technique: masteryScore < 50 ? 'Use a worked example. Say why each step is needed.' : 'Recall the core idea before opening notes.' },
      { order: 2, title: 'Guided practice', minutes: 8, technique: 'Attempt one question, read the feedback, then correct it in your own words.' },
      { order: 3, title: `${subject} independent check`, minutes: 10, technique: 'Answer without notes. Focus on accuracy rather than speed.' },
      { order: 4, title: 'Spaced recall', minutes: 5, technique: 'Return on your review date and retrieve the idea from memory.' },
    ];
  }

  private nextReviewAt(score: number, mode: string) {
    const days = mode === 'DIAGNOSTIC' || score < 50 ? 1 : score < 75 ? 3 : 7;
    const review = new Date();
    review.setDate(review.getDate() + days);
    return review;
  }

  private assertStudent(actor: AuthenticatedUser) {
    if (actor.role !== Role.STUDENT) throw new ForbiddenException('Learning Coach is available to student accounts only');
  }
}
