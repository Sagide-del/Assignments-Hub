import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { MathEngineService } from "../math-engine/math-engine.service";
import {
  MathValidatorService,
  extractMathProblems,
} from "../cms/math-validator.service";
import { GradingService } from "../student/grading.service";
import { CmsService } from "../cms/cms.service";
import { SubmissionsService } from "../submissions/submissions.service";
import { QuestionType } from "@prisma/client";
import { Role } from "../common/enums/role.enum";
const integration = process.env.MATH_ENGINE_TEST_PYTHON
  ? describe
  : describe.skip;
integration("Phase 3 real private Python engine and NestJS integration", () => {
  let engine: MathEngineService, validator: MathValidatorService;
  const source = () => ({
    question_text: "Solve 2*x+3=11",
    options: ["4", "5", "6", "7"],
    correct_answer: "4",
    explanation: "Subtract three and divide by two. Check by substitution.",
    illustration: null,
  });
  const problem = { question_type: "algebra", expression: "2*x+3=11" };
  beforeAll(() => {
    engine = new MathEngineService(
      new ConfigService({
        MATH_ENGINE_PYTHON: process.env.MATH_ENGINE_TEST_PYTHON,
        MATH_ENGINE_WORKDIR: join(process.cwd(), "../services/math-engine"),
      }),
    );
    validator = new MathValidatorService(engine);
  });
  afterAll(() => engine?.onModuleDestroy());
  it("solves algebra, matrices and chemical equations, checks equivalent responses and authenticates health", async () => {
    expect(await engine.health()).toEqual({ mathEngineVersion: 1 });
    expect((await engine.solve("algebra", "2x + 3 = 11")).correct_answer).toBe(
      "x = 4",
    );
    expect(await engine.equivalent("algebra", "4", "x = 4")).toEqual({
      correct: true,
    });
    expect(await engine.equivalent("algebra", "x=4", "x = 4")).toEqual({
      correct: true,
    });
    expect(await engine.equivalent("algebra", "8/2", "x = 4")).toEqual({
      correct: true,
    });
    expect(await engine.equivalent("algebra", "5", "x = 4")).toEqual({
      correct: false,
    });
    expect(
      (await engine.solve("matrix", "det([[1,2],[3,4]])")).correct_answer,
    ).toBe("-2");
    expect(
      (await engine.solve("chemical_equation", "H2 + O2 -> H2O"))
        .correct_answer,
    ).toBe("2H2 + O2 -> 2H2O");
  }, 30000);
  it("never trusts AI verification fields and marks mismatched and unsupported answers honestly", async () => {
    const input = extractMathProblems({
      questions: [{ ...source(), math_problem: problem }],
    });
    expect((input.content as any).questions[0]).not.toHaveProperty(
      "math_problem",
    );
    const [valid] = await validator.verify(
      (input.content as any).questions,
      input.problems,
      "Mathematics",
    );
    expect(valid.verified_answer).toBe("x = 4");
    expect(valid.math_verification.status).toBe("VERIFIED");
    const [wrong] = await validator.verify(
      [{ ...source(), correct_answer: "5" }],
      [problem],
      "Mathematics",
    );
    expect(wrong.math_verification.status).toBe("MISMATCH");
    const [unsupported] = await validator.verify(
      [source()],
      [{ ...problem, expression: "not embedded" }],
      "Mathematics",
    );
    expect(unsupported.math_verification.status).toBe("UNSUPPORTED");
    expect(unsupported).not.toHaveProperty("verified_answer");
    expect(await validator.verify([source()], [problem], "English")).toEqual([
      source(),
    ]);
  });
  it("saves verified answers in the generated draft without altering AI option text or spending extra AI requests", async () => {
    const sheet = {
      key_concepts: [
        "Balance each side.",
        "Apply equal operations.",
        "Check your solution.",
      ],
      key_formulas: ["x=4"],
      common_mistakes: [
        "Preserve signs.",
        "Change both sides.",
        "Check the result.",
      ],
      concept_diagram: {
        type: "TIKZ_CODE",
        latex_code:
          "\\begin{tikzpicture}\\node (a) at (1,3) {Balance};\\node (b) at (5,3) {Solve};\\draw[->] (a) -- (b);\\end{tikzpicture}",
      },
    };
    const payload = {
      theory_cheatsheet: sheet,
      equations: [],
      illustration_prompt: "Balance and solve",
      asset_url: null,
      questions: Array.from({ length: 30 }, (_, i) => ({
        ...source(),
        question_text: `Exercise ${i + 1}: Solve 2*x+3=11`,
        math_problem: problem,
      })),
    };
    const db = {
      masterModule: {
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: "module", ...data })),
      },
      curriculumTaxonomy: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: "tax",
              level: "Senior School",
              grade: 11,
              pathway: "STEM",
              track: "Pure Sciences",
              subject: "Mathematics",
              topics: ["Equations"],
            },
          ]),
      },
    };
    const ai = {
      generateAssignment: jest
        .fn()
        .mockResolvedValue({ content: payload, usage: { totalTokens: 100 } }),
    };
    const module = await new CmsService(
      db as any,
      ai as any,
      validator,
    ).generateAiContent({
      grade: 11,
      subject: "Mathematics",
      topic: "Equations",
    });
    expect((module.content_json as any).questions).toHaveLength(30);
    expect((module.content_json as any).questions[0].verified_answer).toBe(
      "x = 4",
    );
    expect((module.content_json as any).questions[0].correct_answer).toBe("4");
    expect(ai.generateAssignment).toHaveBeenCalledTimes(1);
  }, 60000);
  it("rejects publication of a solver mismatch", async () => {
    const module = {
      id: "m",
      tenant_id: null,
      status: "APPROVED",
      content_json: {
        questions: [{ math_verification: { status: "MISMATCH" } }],
      },
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      masterModule: { findUnique: jest.fn().mockResolvedValue(module) },
    };
    const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
    await expect(
      new CmsService(db as any, {} as any, validator).publishModule({
        module_id: "m",
        target_type: "STORE" as any,
      }),
    ).rejects.toThrow("mismatch");
  });
  it("grades a real final submission using the server-owned verified answer and preserves draft behaviour", async () => {
    const verified = (
      await validator.verify([source()], [problem], "Mathematics")
    )[0];
    const question = {
      id: 1,
      order: 0,
      questionText: source().question_text,
      correctAnswer: "4",
      questionType: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      config: null,
    };
    const assignment = {
      id: 1,
      schoolId: 7,
      title: "Equations",
      grade: "Grade 11",
      isPublished: true,
      questions: [question],
      rawJson: { cms_module_id: "module" },
    };
    const db: any = {
      assignment: { findUnique: jest.fn().mockResolvedValue(assignment) },
      studentProfile: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ stream: null, className: null }),
      },
      submission: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({
            id: 1,
            ...data,
            answers: data.answers?.create ?? [],
          })),
      },
      masterModule: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ content_json: { questions: [verified] } }),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const grading = new GradingService(db, engine);
    const delivery = {
      questionsForStudent: jest
        .fn()
        .mockReturnValue({ questions: [question], totalPoints: 1 }),
    };
    const svc = new SubmissionsService(db, {} as any, delivery as any, grading);
    const actor = {
      id: 2,
      schoolId: 7,
      role: Role.STUDENT,
      grade: "Grade 11",
    } as any;
    await svc.create(
      1,
      { answers: [{ questionId: 1, answer: "x=4" }], isDraft: false } as any,
      actor,
    );
    expect(db.submission.create.mock.calls[0][0].data.score).toBe(1);
    const map = await grading.verifiedQuestions(assignment);
    expect(map.has(1)).toBe(true);
    expect((await grading.grade(verified, "8/2", 1)).isCorrect).toBe(true);
    expect((await grading.grade(verified, "5", 1)).isCorrect).toBe(false);
    const changed = await grading.verifiedQuestions({
      ...assignment,
      questions: [{ ...question, questionText: "Different question" }],
    });
    expect(changed.size).toBe(0);
  });
});
describe("Math engine failure handling", () => {
  it("propagates an outage instead of stamping generated answers as verified", async () => {
    const validator = new MathValidatorService({
      solve: jest.fn().mockRejectedValue(Error("offline")),
    } as any);
    await expect(
      validator.verify(
        [{ question_text: "2*x=8", correct_answer: "4" }],
        [{ question_type: "algebra", expression: "2*x=8" }],
        "Mathematics",
      ),
    ).rejects.toThrow("offline");
  });
});
