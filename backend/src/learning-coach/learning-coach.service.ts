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
      orderBy: { updatedAt: 'desc' },
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
        recommendedTechnique: 'Start with retrieval practice: attempt first, then explain the answer in your own words.',
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
    return { session: { id: session.id, mode, total: session.total }, plan, questions: selected.map((question) => this.forStudent(question)) };
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
    session: { id: number; planId: number; mode: string; schoolId: number; studentId: number; plan: { masteryScore: number; subject: string; topic: string } },
    score: number,
    questionIds: number[],
  ) {
    const masteryScore = session.plan.masteryScore
      ? Math.round((session.plan.masteryScore * 0.65) + (score * 0.35))
      : score;
    const technique = this.techniqueFor(masteryScore);
    await this.prisma.$transaction([
      this.prisma.learningCoachSession.update({ where: { id: session.id }, data: { score, completedAt: new Date() } }),
      this.prisma.learningCoachPlan.update({
        where: { id: session.planId },
        data: {
          masteryScore,
          lastDiagnosticScore: session.mode === 'DIAGNOSTIC' ? score : undefined,
          recommendedTechnique: technique,
          focusAreas: score < 70 ? [session.plan.topic, 'Recall the key definitions', 'Practise one step at a time'] : [session.plan.topic, 'Timed mixed practice'],
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
      { order: 1, title: `Reconnect with ${topic}`, minutes: 12, technique: masteryScore < 40 ? 'Worked example and self-explanation' : 'Active recall' },
      { order: 2, title: 'Short recall break', minutes: 5, technique: 'Write three key facts without looking at notes' },
      { order: 3, title: `${subject} practice`, minutes: 15, technique: 'Answer a mixed set and read the feedback' },
      { order: 4, title: 'Next-day check-in', minutes: 8, technique: 'Retry a rotated practice set from memory' },
    ];
  }

  private assertStudent(actor: AuthenticatedUser) {
    if (actor.role !== Role.STUDENT) throw new ForbiddenException('Learning Coach is available to student accounts only');
  }
}
