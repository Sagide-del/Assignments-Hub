import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DeliveryQuestion = {
  id: number;
  points: number;
  questionType: QuestionType;
  options: Prisma.JsonValue | null;
};

type DeliveryAssignment<TQuestion extends DeliveryQuestion> = {
  id: number;
  schoolId: number;
  questions: TQuestion[];
  deliveryConfig?: {
    enabled: boolean;
    questionCount: number;
    shuffleOptions: boolean;
  } | null;
};

@Injectable()
export class AssignmentDeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async questionsForStudent<TQuestion extends DeliveryQuestion>(
    assignment: DeliveryAssignment<TQuestion>,
    studentId: number,
  ): Promise<{ questions: TQuestion[]; totalPoints: number }> {
    const config = assignment.deliveryConfig;
    if (!config?.enabled || config.questionCount >= assignment.questions.length) {
      return {
        questions: assignment.questions,
        totalPoints: assignment.questions.reduce((sum, question) => sum + question.points, 0),
      };
    }

    let variant = await this.prisma.studentAssignmentVariant.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } },
    });

    if (!variant) {
      const existingVariants = await this.prisma.studentAssignmentVariant.findMany({
        where: { assignmentId: assignment.id },
        select: { questionIds: true },
      });
      const usage = new Map<number, number>();
      for (const existing of existingVariants) {
        for (const questionId of existing.questionIds) {
          usage.set(questionId, (usage.get(questionId) ?? 0) + 1);
        }
      }

      const selected = [...assignment.questions]
        .sort((left, right) => {
          const usageDifference = (usage.get(left.id) ?? 0) - (usage.get(right.id) ?? 0);
          if (usageDifference !== 0) return usageDifference;
          return this.rank(`${assignment.id}:${studentId}:${left.id}`)
            - this.rank(`${assignment.id}:${studentId}:${right.id}`);
        })
        .slice(0, config.questionCount)
        .sort(
          (left, right) =>
            this.rank(`order:${assignment.id}:${studentId}:${left.id}`)
            - this.rank(`order:${assignment.id}:${studentId}:${right.id}`),
        );

      const optionOrders = config.shuffleOptions
        ? Object.fromEntries(
            selected
              .filter(
                (question) =>
                  question.questionType === QuestionType.MULTIPLE_CHOICE
                  && Array.isArray(question.options),
              )
              .map((question) => [
                String(question.id),
                this.shuffle(
                  question.options as string[],
                  `${assignment.id}:${studentId}:${question.id}:options`,
                ),
              ]),
          )
        : undefined;
      const data = {
        schoolId: assignment.schoolId,
        assignmentId: assignment.id,
        studentId,
        questionIds: selected.map((question) => question.id),
        optionOrders,
        totalPoints: selected.reduce((sum, question) => sum + question.points, 0),
      };

      try {
        variant = await this.prisma.studentAssignmentVariant.create({ data });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error;
        }
        variant = await this.prisma.studentAssignmentVariant.findUniqueOrThrow({
          where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } },
        });
      }
    }

    const byId = new Map(assignment.questions.map((question) => [question.id, question]));
    const optionOrders = (variant.optionOrders ?? {}) as Record<string, string[]>;
    const questions = variant.questionIds
      .map((questionId) => byId.get(questionId))
      .filter((question): question is TQuestion => Boolean(question))
      .map((question) => ({
        ...question,
        ...(optionOrders[String(question.id)] ? { options: optionOrders[String(question.id)] } : {}),
      }));

    return { questions, totalPoints: variant.totalPoints };
  }

  private shuffle(values: string[], seed: string) {
    return [...values].sort(
      (left, right) => this.rank(`${seed}:${left}`) - this.rank(`${seed}:${right}`),
    );
  }

  private rank(value: string) {
    return Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16);
  }
}
