import { BadRequestException, Injectable } from "@nestjs/common";
import { AssignmentType, QuestionType } from "@prisma/client";
import { CreateAssignmentDto } from "../assignments/dto/create-assignment.dto";
import { AiAssignmentArtifactContent } from "./interfaces/ai-content.types";
import { isRecord } from "./ai-content.utils";

@Injectable()
export class AiArtifactMapperService {
  readAssignmentContent(value: unknown): AiAssignmentArtifactContent {
    if (
      !isRecord(value) ||
      typeof value.title !== "string" ||
      typeof value.subject !== "string" ||
      typeof value.grade !== "string" ||
      typeof value.topicName !== "string" ||
      typeof value.difficulty !== "string" ||
      !Array.isArray(value.questions)
    ) {
      throw new BadRequestException(
        "AI assignment artifact content is malformed",
      );
    }
    return value as unknown as AiAssignmentArtifactContent;
  }

  toValidationPayload(content: AiAssignmentArtifactContent) {
    return {
      title: content.title,
      description: content.description,
      subject: content.subject,
      grade: content.grade,
      type: AssignmentType.TEACHER_MARKED,
      totalMarks: content.questions.reduce(
        (sum, question) => sum + question.points,
        0,
      ),
      sections: [
        {
          name: content.topicName,
          questions: content.questions.map((question) => ({
            questionText: question.questionText,
            type: question.questionType,
            points: question.points,
            options: question.options,
            correctAnswer: question.correctAnswer,
            hint: question.hint,
            config: this.questionConfig(question),
          })),
        },
      ],
    };
  }

  toCreateAssignmentDto(
    content: AiAssignmentArtifactContent,
  ): CreateAssignmentDto {
    return {
      title: content.title,
      description: content.description,
      subject: content.subject,
      grade: content.grade,
      type: AssignmentType.TEACHER_MARKED,
      maxPoints: content.questions.reduce(
        (sum, question) => sum + question.points,
        0,
      ),
      isPublished: false,
      questions: content.questions.map((question, index) => ({
        questionText: question.questionText,
        contentHtml: question.contentHtml,
        questionType: question.questionType as QuestionType,
        options: question.options,
        correctAnswer: question.correctAnswer,
        config: this.questionConfig(question),
        points: question.points,
        order: index,
        hint: question.hint,
      })),
    };
  }

  private questionConfig(
    question: AiAssignmentArtifactContent["questions"][number],
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {
      aiExplanation: question.explanation,
      difficulty: question.difficulty,
    };

    if (question.questionType === QuestionType.NUMERIC) {
      const numeric = this.parseNumericAnswer(question.correctAnswer);
      if (!numeric) {
        throw new BadRequestException(
          `Numeric question "${question.questionText.slice(0, 80)}" has an invalid correct answer`,
        );
      }
      config.numeric = {
        acceptedValue: numeric.value,
        ...(numeric.unit ? { unit: numeric.unit } : {}),
      };
    }

    if (question.questionType === QuestionType.SHORT_ANSWER) {
      config.shortAnswer = {
        keywords: [question.correctAnswer.trim()],
        passThreshold: 1,
      };
    }

    return config;
  }

  private parseNumericAnswer(
    value: string,
  ): { value: number; unit?: string } | null {
    const match = value
      .trim()
      .match(
        /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?:\s*\/\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)))?\s*(.*)$/,
      );
    if (!match) return null;
    const numerator = Number(match[1]);
    const denominator = match[2] === undefined ? null : Number(match[2]);
    if (
      !Number.isFinite(numerator) ||
      (denominator !== null &&
        (!Number.isFinite(denominator) || denominator === 0))
    ) {
      return null;
    }
    const unit = match[3].trim();
    return {
      value: denominator === null ? numerator : numerator / denominator,
      ...(unit ? { unit } : {}),
    };
  }
}
