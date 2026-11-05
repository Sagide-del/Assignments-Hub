import "reflect-metadata";
import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { StudentModule } from "../student/student.module";
import { CmsService } from "../cms/cms.service";
import {
  CHEATSHEET_PROMPT,
  parseConceptMap,
  validateTheoryCheatsheet,
} from "../cms/theory-cheatsheet";
import { validateCheatsheetGeneration } from "../cms/cheatsheet-generation";
export const phase1Sheet = () => ({
  key_concepts: [
    "An equation balances two expressions.",
    "Apply the same operation to both sides.",
    "Substitute your solution to check it.",
  ],
  key_formulas: ["ax+b=c"],
  common_mistakes: [
    "Change both sides, not just one.",
    "Keep negative signs when rearranging.",
    "Check by substitution, not by guessing.",
  ],
  concept_diagram: {
    type: "TIKZ_CODE" as const,
    latex_code:
      "\\begin{tikzpicture}\n\\node (a) at (1,3) {Equation};\n\\node (b) at (5,3) {Same operation};\n\\node (c) at (9,3) {Check solution};\n\\draw[->] (a) -- (b);\n\\draw[->] (b) -- (c);\n\\end{tikzpicture}",
  },
});
const generated = () => ({
  theory_cheatsheet: phase1Sheet(),
  equations: ["ax+b=c"],
  illustration_prompt: "A three-node concept map.",
  asset_url: null,
  questions: Array.from({ length: 30 }, (_, i) => ({
    question_text: `Equation exercise ${i + 1}`,
    options: ["x = 4", "x = 5", "x = 6", "x = 7"],
    correct_answer: "x = 4",
    explanation:
      "Apply the same operation to both sides, then substitute to check.",
    illustration: null,
  })),
});
describe("Phase 1 strict cheat-sheet generation", () => {
  it("validates the structured contract and keeps a readable legacy projection", () => {
    const result = validateCheatsheetGeneration(generated(), 30, {
      theoryWords: 300,
      extra: "asset_url",
      assetUrl: null,
    });
    expect((result as any).theory_cheatsheet).toEqual(phase1Sheet());
    expect(result.theory_text).toBe(phase1Sheet().key_concepts.join("\n\n"));
    expect(result.questions).toHaveLength(30);
    expect(
      parseConceptMap(phase1Sheet().concept_diagram.latex_code).nodes,
    ).toHaveLength(3);
    expect(CHEATSHEET_PROMPT).toContain("Do not output theory_text");
  });
  it("rejects extra fields, malformed lists, overlapping maps, arbitrary TeX and unsafe commands", () => {
    expect(() =>
      validateTheoryCheatsheet({ ...phase1Sheet(), unrequested: "x" }),
    ).toThrow();
    expect(() =>
      validateTheoryCheatsheet({ ...phase1Sheet(), common_mistakes: [] }),
    ).toThrow();
    expect(() =>
      validateCheatsheetGeneration(
        { ...generated(), theory_text: "mixed formats" },
        30,
        { theoryWords: 300, extra: "asset_url" },
      ),
    ).toThrow();
    for (const command of [
      "\\input{/etc/passwd}",
      "\\write18{curl example.com}",
      "\\usepackage{shellesc}",
      "\\node[draw] (evil) at (4,4) {x};",
    ])
      expect(() =>
        parseConceptMap(
          phase1Sheet().concept_diagram.latex_code.replace(
            "\\end{tikzpicture}",
            command + "\\end{tikzpicture}",
          ),
        ),
      ).toThrow();
    expect(() =>
      parseConceptMap(
        phase1Sheet().concept_diagram.latex_code.replace("(5,3)", "(1,3)"),
      ),
    ).toThrow();
  });
});
const integration = process.env.CMS_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("Phase 1 migrated PostgreSQL and authenticated rotation", () => {
  let db: PrismaClient,
    app: INestApplication,
    base: string,
    school: any,
    foreign: any,
    student: any,
    otherStudent: any,
    admin: any;
  let batch1: any, batch2: any, topic2: any, assignment1: any, assignment2: any;
  const jwt = new JwtService({ secret: "phase1-rotation-secret" });
  const ids: string[] = [];
  const request = (path: string, user = student) =>
    fetch(base + path, {
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: user.id, schoolId: user.schoolId, role: user.role })}`,
      },
    });
  const next = (user = student) =>
    request("/student/next-batch/Mathematics/Phase%201%20Equations", user);
  async function cleanup() {
    const schools = await db.school.findMany({
      where: { code: { in: ["PHASE1_TEST_A", "PHASE1_TEST_B"] } },
    });
    await db.moduleAssignment.deleteMany({
      where: { module: { topic: { startsWith: "Phase 1 " } } },
    });
    await db.masterModule.deleteMany({
      where: { topic: { startsWith: "Phase 1 " } },
    });
    await db.curriculumTaxonomy.deleteMany({
      where: { id: "phase1-generator-fixture" },
    });
    await db.school.deleteMany({
      where: { id: { in: schools.map((s) => s.id) } },
    });
  }
  beforeAll(async () => {
    const url = new URL(process.env.CMS_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/cms_publish_test")
      throw Error("Use the disposable localhost cms_publish_test database.");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await cleanup();
    school = await db.school.create({
      data: {
        name: "Phase 1 Test Academy",
        code: "PHASE1_TEST_A",
        subscriptionStatus: "ACTIVE",
      },
    });
    foreign = await db.school.create({
      data: {
        name: "Other Phase 1 Academy",
        code: "PHASE1_TEST_B",
        subscriptionStatus: "ACTIVE",
      },
    });
    student = await db.user.create({
      data: {
        schoolId: school.id,
        name: "First Learner",
        grade: "Grade 11",
        elective_subjects:["Biology","Chemistry","Physics"],
        role: "STUDENT",
      },
    });
    otherStudent = await db.user.create({
      data: {
        schoolId: school.id,
        name: "Second Learner",
        grade: "Grade 11",
        elective_subjects:["Biology","Chemistry","Physics"],
        role: "STUDENT",
      },
    });
    admin = await db.user.create({
      data: {
        schoolId: school.id,
        name: "Administrator",
        role: "SCHOOL_ADMIN",
      },
    });
    const create = (
      topic: string,
      status = "PUBLISHED_SCHOOL",
      tenant = school.id,
      grade = 11,
    ) =>
      db.masterModule.create({
        data: {
          level: "Senior School",
          grade,
          subject: "Mathematics",
          topic,
          status: ["PUBLISHED_SCHOOL","PUBLISHED_STORE"].includes(status) ? "APPROVED" : status as any,
          ...(["PUBLISHED_SCHOOL","PUBLISHED_STORE"].includes(status) ? {distributions:{create:{audience:status === "PUBLISHED_STORE" ? "PUBLIC_STORE" : "SCHOOL",school_id:status === "PUBLISHED_STORE" ? null : String(tenant)}}} : {}),
          tenant_id: String(tenant),
          theory_cheatsheet: phase1Sheet(),
          content_json: generated(),
        },
      });
    batch1 = await create("Phase 1 Equations");
    batch2 = await create("Phase 1 Equations");
    topic2 = await create("Phase 1 Geometry");
    await create("Phase 1 Equations", "PUBLISHED_SCHOOL", foreign.id);
    await create("Phase 1 Equations", "DRAFT");
    await create("Phase 1 Equations", "PUBLISHED_SCHOOL", school.id, 12);
    const makeAssignment = (m: any) =>
      db.assignment.create({
        data: {
          schoolId: school.id,
          title: m.topic,
          subject: m.subject,
          grade: "Grade 11",
          rawJson: { cms_module_id: m.id },
        },
      });
    assignment1 = await makeAssignment(batch1);
    assignment2 = await makeAssignment(batch2);
    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: db }],
      exports: [PrismaService],
    })
    class DbModule {}
    @Module({
      imports: [DbModule, PassportModule, StudentModule],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: "phase1-rotation-secret" }),
        },
      ],
    })
    class Fixture {}
    app = await NestFactory.create(Fixture, { logger: false });
    const reflector = app.get(Reflector);
    app.useGlobalGuards(
      new JwtAuthGuard(reflector),
      new RolesGuard(reflector),
      new TenantGuard(),
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  }, 30000);
  afterAll(async () => {
    await app?.close();
    if (db) {
      await cleanup();
      await db.$disconnect();
    }
  });
  it("assigns sequential defaults under concurrent inserts without overwriting prior modules", async () => {
    expect(batch1.batch_number).toBe(1);
    expect(batch2.batch_number).toBe(2);
    const rows = await Promise.all(
      Array.from({ length: 8 }, () =>
        db.masterModule.create({
          data: {
            level: "Senior School",
            grade: 11,
            subject: "Mathematics",
            topic: "Phase 1 Concurrent",
            content_json: { questions: [] },
          },
        }),
      ),
    );
    expect(rows.map((r) => r.batch_number).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(
      (await db.masterModule.findUniqueOrThrow({ where: { id: batch1.id } }))
        .content_json,
    ).toEqual(generated());
  });
  it("starts with the lowest eligible batch, without answers or private-school metadata", async () => {
    const r = await next();
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toContain("no-store");
    const body: any = await r.json();
    expect(body.module.id).toBe(batch1.id);
    expect(body.total_batches).toBe(2);
    expect(body.module.theory_cheatsheet).toEqual(phase1Sheet());
    expect(body.module).not.toHaveProperty("content_json");
    expect(JSON.stringify(body)).not.toContain("correct_answer");
  });
  it("ignores another learner’s completion and an unsubmitted draft", async () => {
    await db.submission.create({
      data: {
        assignmentId: assignment1.id,
        studentId: otherStudent.id,
        status: "GRADED",
        completedAt: new Date(),
      },
    });
    const draft = await db.submission.create({
      data: {
        assignmentId: assignment1.id,
        studentId: student.id,
        status: "DRAFT",
      },
    });
    expect(((await (await next()).json()) as any).module.id).toBe(batch1.id);
    await db.submission.update({
      where: { id: draft.id },
      data: { status: "SUBMITTED", completedAt: new Date() },
    });
  });
  it("returns Batch 2 after Batch 1 is submitted and does not mutate prior progress", async () => {
    const body: any = await (await next()).json();
    expect(body.module.id).toBe(batch2.id);
    expect(body.module.batch_number).toBe(2);
    expect(body.completed_batches).toBe(1);
    expect(
      await db.submission.count({
        where: { studentId: student.id, assignmentId: assignment1.id },
      }),
    ).toBe(1);
  });
  it("returns mastered only after all eligible batches, with an authorised next-topic suggestion", async () => {
    await db.submission.create({
      data: {
        assignmentId: assignment2.id,
        studentId: student.id,
        status: "GRADED",
        completedAt: new Date(),
      },
    });
    expect(await (await next()).json()).toMatchObject({
      mastered: true,
      completed_batches: 2,
      total_batches: 2,
      next_topic_suggestion: "Phase 1 Geometry",
    });
    const unavailable = await request(
      "/student/next-batch/Mathematics/Not%20Published",
    );
    expect(await unavailable.json()).toMatchObject({
      mastered: false,
      unavailable: true,
    });
  });
  it("denies wrong-scope subjects, staff and anonymous access", async () => {
    expect(
      (await request("/student/next-batch/History/Phase%201%20Equations"))
        .status,
    ).toBe(403);
    expect((await next(admin)).status).toBe(403);
    expect(
      (
        await fetch(
          base + "/student/next-batch/Mathematics/Phase%201%20Equations",
        )
      ).status,
    ).toBe(401);
  });
  it("generates and materialises a cheat sheet while preserving question privacy", async () => {
    const tax = await db.curriculumTaxonomy.create({
      data: {
        id: "phase1-generator-fixture",
        pathway: "STEM",
        track: "Pure Sciences",
        level: "Senior School",
        grade: 11,
        subject: "Mathematics",
        topics: ["Phase 1 Generated"],
      },
    });
    try {
      const ai = {
        generateAssignment: jest.fn().mockResolvedValue({
          content: generated(),
          usage: { totalTokens: 77 },
        }),
      };
      const cms = new CmsService(db as any, ai as any);
      const saved = await cms.generateAiContent({
        grade: 11,
        subject: "Mathematics",
        topic: "Phase 1 Generated",
      });
      expect(saved.theory_cheatsheet).toEqual(phase1Sheet());
      expect(saved.batch_number).toBe(1);
      expect(saved.generation_cost_tokens).toBe(77);
      await db.masterModule.update({
        where: { id: saved.id },
        data: { status: "APPROVED", distributions:{create:{audience:"SCHOOL",school_id:String(school.id)}}, tenant_id: String(school.id) },
      });
      const opened = await cms.startLearningModule(saved.id, {
        ...student,
        schoolId: school.id,
      } as any);
      const assignment = await db.assignment.findUniqueOrThrow({
        where: { id: opened.id },
      });
      const raw = assignment.rawJson as any;
      expect(raw.cms_content.theory_cheatsheet).toEqual(phase1Sheet());
      expect(raw.cms_content.batch_number).toBe(1);
      expect(raw.cms_content).not.toHaveProperty("questions");
      expect(JSON.stringify(raw)).not.toContain("correct_answer");
    } finally {
      await db.curriculumTaxonomy.delete({ where: { id: tax.id } });
    }
  });
  it("exposes migration-backed Phase 1 capabilities", async () => {
    const r = await fetch(base + "/student/rotation-capabilities");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      cheatsheetVersion: 1,
      rotationVersion: 1,
    });
  });
});
