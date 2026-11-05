import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import {
  MathEngineService,
  MathKind,
} from "../math-engine/math-engine.service";
export const MATH_PROMPT =
  'For Mathematics or Chemistry questions, add math_problem only when the entire task is an exact calculation: {"question_type":"algebra"|"matrix"|"chemical_equation","expression":"canonical expression"}. Algebra: 2*x+3=11; matrix: det([[1,2],[3,4]]) or inverse([[1,2],[3,4]]); chemistry: H2 + O2 -> H2O. The expression must appear verbatim in question_text. Do not use math_problem for word problems, diagrams, units, proofs, multiple unknowns, or conceptual questions. Never provide verified_answer or verification metadata yourself.';
export function extractMathProblems(value: unknown) {
  const raw =
    typeof value === "string" ? JSON.parse(value) : structuredClone(value);
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as any).questions))
    return { content: raw, problems: [] };
  const problems = (raw as any).questions.map((q: any) => {
    const p = q.math_problem;
    delete q.math_problem;
    return p;
  });
  return { content: raw, problems };
}
@Injectable()
export class MathValidatorService {
  constructor(private readonly engine: MathEngineService) {}
  async verify(questions: any[], problems: unknown[], subject: string) {
    const eligible = /math|chemistry/i.test(subject);
    const results = [];
    for (const [i, q] of questions.entries()) {
      const problem = problems[i] as any;
      if (!eligible || !problem) {
        results.push(q);
        continue;
      }
      const valid =
        problem &&
        typeof problem === "object" &&
        !Array.isArray(problem) &&
        Object.keys(problem).sort().join(",") === "expression,question_type" &&
        ["algebra", "matrix", "chemical_equation"].includes(
          problem.question_type,
        ) &&
        typeof problem.expression === "string" &&
        problem.expression.length <= 500 &&
        q.question_text.includes(problem.expression);
      if (!valid) {
        results.push({ ...q, math_verification: { status: "UNSUPPORTED" } });
        continue;
      }
      try {
        const solved = await this.engine.solve(
          problem.question_type,
          problem.expression,
        );
        const matches = await this.engine.equivalent(
          problem.question_type,
          q.correct_answer,
          solved.correct_answer,
        );
        results.push({
          ...q,
          verified_answer: solved.correct_answer,
          math_verification: {
            status: matches.correct ? "VERIFIED" : "MISMATCH",
            version: 1,
            question_type: problem.question_type as MathKind,
            expression: problem.expression,
            step_by_step_solution: solved.step_by_step_solution,
          },
        });
      } catch (e) {
        if (!(e instanceof UnprocessableEntityException)) throw e;
        results.push({ ...q, math_verification: { status: "UNSUPPORTED" } });
      }
    }
    return results;
  }
}
