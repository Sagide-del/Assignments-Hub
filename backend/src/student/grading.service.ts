import { Injectable } from "@nestjs/common";
import { MathEngineService } from "../math-engine/math-engine.service";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class GradingService {
  constructor(
    private readonly db: PrismaService,
    private readonly engine: MathEngineService,
  ) {}
  async verifiedQuestions(assignment: any) {
    const id = assignment.rawJson?.cms_module_id;
    if (typeof id !== "string") return new Map<number, any>();
    const module = await this.db.masterModule.findUnique({
      where: { id },
      select: { content_json: true },
    });
    const source = (module?.content_json as any)?.questions;
    if (!Array.isArray(source)) return new Map<number, any>();
    const map = new Map<number, any>();
    for (const q of assignment.questions) {
      const original = source[q.order];
      if (
        original?.math_verification?.status === "VERIFIED" &&
        original.math_verification.version === 1 &&
        typeof original.verified_answer === "string" &&
        original.question_text === q.questionText &&
        original.correct_answer === q.correctAnswer
      )
        map.set(q.id, original);
    }
    return map;
  }
  async grade(source: any, student: string, points: number) {
    const r = await this.engine.equivalent(
      source.math_verification.question_type,
      student,
      source.verified_answer,
    );
    return {
      isCorrect: r.correct,
      pointsAwarded: r.correct ? points : 0,
      feedback: r.correct
        ? "Correct."
        : "Check your working and try again during review.",
    };
  }
}
