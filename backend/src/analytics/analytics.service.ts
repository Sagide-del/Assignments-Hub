import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { SubmissionStatus } from '@prisma/client';

// Read-only aggregates over existing Submission/Answer/Question rows — this
// module writes nothing and never touches grading. Numbers below are
// intentionally computed only from what's already stored (no new tables),
// so there is nothing here that can drift out of sync with the real
// grading data in submissions.service.ts.
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async assignmentAnalytics(assignmentId: number, actor: AuthenticatedUser) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, title: true, schoolId: true, maxPoints: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (actor.role !== Role.PLATFORM_ADMIN && assignment.schoolId !== actor.schoolId) {
      throw new ForbiddenException("You cannot access another school's data");
    }

    const questions = await this.prisma.question.findMany({
      where: { assignmentId },
      orderBy: { order: 'asc' },
      select: { id: true, questionText: true, questionType: true, points: true, order: true },
    });

    // DRAFT submissions are still in progress — excluding them here matches
    // SubmissionsService.findAll's own rule for teacher/admin-facing views.
    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId, status: { not: SubmissionStatus.DRAFT } },
      include: {
        student: { select: { id: true, name: true } },
        answers: { select: { questionId: true, isCorrect: true, pointsAwarded: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const maxPoints = assignment.maxPoints || questions.reduce((sum, q) => sum + q.points, 0) || 0;
    const gradedSubmissions = submissions.filter((s) => s.score != null);
    const percentageOf = (score: number) => (maxPoints > 0 ? Math.round((score / maxPoints) * 1000) / 10 : 0);

    const averageScore = average(gradedSubmissions.map((s) => s.score as number));
    const averagePercentage = average(gradedSubmissions.map((s) => percentageOf(s.score as number)));
    // A submission "passes" at >=50% of maxPoints — a simple, fixed
    // threshold rather than a per-assignment configurable one, since
    // nothing in the schema currently stores a pass mark per assignment.
    const PASS_THRESHOLD_PERCENT = 50;
    const passRate = gradedSubmissions.length
      ? Math.round(
          (gradedSubmissions.filter((s) => percentageOf(s.score as number) >= PASS_THRESHOLD_PERCENT).length /
            gradedSubmissions.length) *
            1000,
        ) / 10
      : 0;
    const timeSpentSamples = submissions
      .map((s) => s.timeSpentSeconds)
      .filter((value): value is number => typeof value === 'number' && value > 0);
    const averageTimeSpentSeconds = Math.round(average(timeSpentSamples));

    const questionPerformance = questions.map((question) => {
      const answersForQuestion = submissions.flatMap((s) =>
        s.answers.filter((a) => a.questionId === question.id),
      );
      // Only auto/teacher-graded answers (isCorrect set) count toward %
      // correct — an ungraded essay shouldn't silently read as "wrong."
      const gradedAnswers = answersForQuestion.filter((a) => a.isCorrect !== null);
      const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;
      const percentCorrect = gradedAnswers.length
        ? Math.round((correctCount / gradedAnswers.length) * 1000) / 10
        : null;
      const averagePointsAwarded = average(
        answersForQuestion.map((a) => a.pointsAwarded).filter((v): v is number => v != null),
      );

      return {
        questionId: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        order: question.order,
        points: question.points,
        timesAnswered: answersForQuestion.length,
        timesGraded: gradedAnswers.length,
        percentCorrect,
        averagePointsAwarded: Math.round(averagePointsAwarded * 10) / 10,
        // Computed from actual student performance on THIS assignment, not
        // the AI-assigned difficulty label used at generation time (that
        // label lives on QuestionBank, not on the published Question row).
        observedDifficulty:
          percentCorrect === null
            ? null
            : percentCorrect < 40
              ? 'HARD'
              : percentCorrect < 70
                ? 'MEDIUM'
                : 'EASY',
        struggled: percentCorrect !== null && percentCorrect < 50,
      };
    });

    const studentPerformance = gradedSubmissions
      .map((s) => ({
        studentId: s.studentId,
        studentName: s.student?.name ?? `Student #${s.studentId}`,
        score: s.score as number,
        percentage: percentageOf(s.score as number),
        timeSpentSeconds: s.timeSpentSeconds,
        isLate: s.isLate,
      }))
      .sort((a, b) => b.percentage - a.percentage);
    const strugglingStudents = studentPerformance
      .filter((s) => s.percentage < PASS_THRESHOLD_PERCENT)
      .slice(0, 20);
    const topPerformers = studentPerformance.slice(0, 5);

    return {
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      maxPoints,
      overview: {
        totalSubmissions: submissions.length,
        gradedCount: gradedSubmissions.length,
        pendingReviewCount: submissions.length - gradedSubmissions.length,
        averageScore: Math.round(averageScore * 10) / 10,
        averagePercentage: Math.round(averagePercentage * 10) / 10,
        passRate,
        averageTimeSpentSeconds,
      },
      questionPerformance,
      studentPerformance,
      strugglingStudents,
      topPerformers,
    };
  }
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
