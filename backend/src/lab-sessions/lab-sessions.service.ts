import {
  BadRequestException,
  NotFoundException,
  Injectable,
} from "@nestjs/common";
import { assessTitration, isTitrationKey } from "./titration-evidence";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLabSessionDto } from "./dto/create-lab-session.dto";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { QuestionType } from "@prisma/client";

// Question types the server can grade automatically by comparing the
// student's answer text to LabQuestion.correctAnswer — same rule as
// SubmissionsService for assignments.
const AUTO_GRADABLE_TYPES = new Set<QuestionType>([
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.FILL_BLANK,
]);

@Injectable()
export class LabSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Single-step completion: the frontend holds the student's progress
   * (watched the video, answered the quiz) locally and calls this once at
   * the end with the final answers — there's no separate "start session"
   * call. See CreateLabSessionDto.
   */
  async create(dto: CreateLabSessionDto, actor: AuthenticatedUser) {
    const lab = await this.prisma.lab.findUnique({
      where: { key: dto.labKey },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (
      lab &&
      actor.role === Role.STUDENT &&
      (!lab.isPublished ||
        lab.status !== "PUBLISHED" ||
        lab.grade !== actor.grade)
    )
      throw new NotFoundException("Lab not found");
    let completionSummary;
    if (isTitrationKey(dto.labKey)) {
      if (!lab) throw new NotFoundException("Lab not found");
      if (!dto.practical)
        throw new BadRequestException(
          "The titration practical requires its recorded evidence.",
        );
      try {
        completionSummary = assessTitration(dto.practical);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : "Invalid practical report",
        );
      }
      if (
        lab.questions.some(
          (q) =>
            !(dto.answers ?? []).some(
              (a) => a.questionId === q.id && a.answer.trim(),
            ),
        )
      )
        throw new BadRequestException(
          "Answer the lab questions before saving the report.",
        );
    } else if (dto.practical)
      throw new BadRequestException(
        "This lab does not accept titration evidence.",
      );

    // Labs predating the catalog (or an ad-hoc key not in it) are allowed
    // through with no quiz — same "log completion, no score" behaviour this
    // endpoint had before the quiz system existed.
    if (!lab || lab.questions.length === 0) {
      return this.prisma.labSession.create({
        data: {
          schoolId: actor.schoolId,
          studentId: actor.id,
          labKey: dto.labKey,
          competency: dto.competency ?? lab?.competency,
          completedAt: new Date(),
          completionSummary: completionSummary as any,
        },
      });
    }

    const answerByQuestionId = new Map(
      (dto.answers ?? []).map((a) => [a.questionId, a.answer]),
    );

    let maxScore = 0;
    let totalScore = 0;
    const gradedAnswers = lab.questions.map((q) => {
      maxScore += q.points;
      const studentAnswer = answerByQuestionId.get(q.id) ?? "";
      let isCorrect: boolean | null = null;
      let pointsAwarded = 0;

      if (
        AUTO_GRADABLE_TYPES.has(q.questionType) &&
        q.correctAnswer != null &&
        q.correctAnswer !== ""
      ) {
        isCorrect = this.answersMatch(studentAnswer, q.correctAnswer);
        pointsAwarded = isCorrect ? q.points : 0;
        totalScore += pointsAwarded;
      }

      return {
        questionId: q.id,
        answer: studentAnswer,
        isCorrect,
        pointsAwarded,
      };
    });

    const completedAt = new Date();

    return this.prisma.labSession.create({
      data: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        labKey: dto.labKey,
        competency: dto.competency ?? lab.competency,
        completedAt,
        score: totalScore,
        maxScore,
        answers: gradedAnswers as any,
        quizCompletedAt: completedAt,
        completionSummary: completionSummary as any,
      },
    });
  }

  findAll(
    actor: AuthenticatedUser,
    filters: { studentId?: number; schoolId?: number } = {},
  ) {
    if (actor.role === Role.STUDENT) {
      return this.prisma.labSession.findMany({
        where: { studentId: actor.id },
        orderBy: { completedAt: "desc" },
      });
    }

    const targetSchoolId =
      actor.role === Role.PLATFORM_ADMIN ? filters.schoolId : actor.schoolId;

    return this.prisma.labSession.findMany({
      where: {
        schoolId: targetSchoolId,
        studentId: filters.studentId,
      },
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { completedAt: "desc" },
    });
  }

  private answersMatch(given: string, correct: string): boolean {
    return given.trim().toLowerCase() === correct.trim().toLowerCase();
  }
}
