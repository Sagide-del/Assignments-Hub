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
import { AiProviderRouterService } from "../ai/ai-provider-router.service";
import { CmsService } from "../cms/cms.service";
import { CslPhotoService } from "../csl/csl-photo.service";
import { TimetableController } from "../study-hub/timetable.controller";
import { TimetableService } from "../study-hub/timetable.service";
import { TimetableContextService } from "../study-hub/timetable-context.service";
import { TimetablePdfService } from "../study-hub/timetable-pdf.service";
import {
  addDays,
  aiShape,
  buildTemplate,
  kenyaDate,
  monday,
  minutes,
  validateAiDays,
  validateSchedule,
  validateSchoolBlocks,
} from "../study-hub/timetable-engine";
import { FocusSubject, WeeklyPlan } from "../study-hub/timetable.types";
const moduleId = "ae420311-7266-4a1f-9091-000000000001";
const subjects: FocusSubject[] = [
  {
    subject: "Mathematics",
    percentage: 20,
    weak: true,
    sources: ["Report card"],
    topics: [
      {
        subject: "Mathematics",
        topic: "Fractions",
        weak: true,
        percentage: 20,
        module_id: moduleId,
      },
      { subject: "Mathematics", topic: "Algebra", weak: true, percentage: 20 },
    ],
  },
  {
    subject: "Physics",
    percentage: 85,
    weak: false,
    sources: ["Report card"],
    topics: [
      { subject: "Physics", topic: "Forces", weak: false, percentage: 85 },
    ],
  },
];
const baseInput = {
  planId: "ae420311-7266-4a1f-9091-000000000002",
  week: "2026-11-02",
  today: "2026-11-02",
  subjects,
  school: [],
  reportFiles: 0,
  warnings: [],
};
describe("Timetable scheduling and strict AI validation", () => {
  it("uses Kenyan Mondays even across the UTC week boundary", () => {
    expect(kenyaDate(new Date("2026-11-01T22:00:00Z"))).toBe("2026-11-02");
    expect(monday(new Date("2026-11-01T22:00:00Z"))).toBe("2026-11-02");
  });
  it("allocates extra sessions to measured weak Mathematics and includes recall", () => {
    const p = buildTemplate(baseInput),
      blocks = p.days.flatMap((d) => d.blocks);
    expect(
      blocks.filter(
        (b) => b.activity_type === "STUDY" && b.subject === "Mathematics",
      ).length,
    ).toBeGreaterThan(
      blocks.filter(
        (b) => b.activity_type === "STUDY" && b.subject === "Physics",
      ).length,
    );
    expect(
      blocks.some(
        (b) => b.activity_type === "RECALL" && b.subject === "Mathematics",
      ),
    ).toBe(true);
    expect(
      blocks
        .filter((b) => b.activity_type === "RECALL")
        .every(
          (b) => b.recall_prompts!.length >= 3 && b.recall_prompts!.length <= 5,
        ),
    ).toBe(true);
  });
  it("covers weekend 09:00–17:00 and weekday 16:00–21:00 with real rest/reward cycles", () => {
    const p = buildTemplate(baseInput);
    expect(() => validateSchedule(p)).not.toThrow();
    for (const [i, d] of p.days.entries()) {
      expect(d.blocks[0].start).toBe(i < 5 ? "16:00" : "09:00");
      expect(d.blocks.at(-1)!.end).toBe(i < 5 ? "21:00" : "17:00");
      const study = d.blocks.filter((b) => b.activity_type === "STUDY");
      expect(d.blocks.filter((b) => b.activity_type === "REWARD")).toHaveLength(
        Math.floor(study.length / 3),
      );
      for (const b of study) expect(minutes(b.end) - minutes(b.start)).toBe(20);
    }
  });
  it("plans 1/3/7-day reviews and carries the seven-day review into the next week", () => {
    const p = buildTemplate(baseInput);
    const root = p.review_schedule.find((r) => r.offset_days === 7)!;
    expect(root.due_date).toBe(addDays(root.learning_date, 7));
    expect(p.next_week_reviews).toContainEqual(root);
    for (const offset of [1, 3]) {
      const review = p.review_schedule.find(
        (r) =>
          r.subject === root.subject &&
          r.topic === root.topic &&
          r.offset_days === offset,
      )!;
      expect(review.due_date).toBe(addDays(root.learning_date, offset));
      expect(
        p.days
          .flatMap((d) => d.blocks)
          .some(
            (b) =>
              b.review?.due_date === review.due_date && b.topic === root.topic,
          ),
      ).toBe(true);
    }
    const next = buildTemplate({
      ...baseInput,
      week: "2026-11-09",
      today: "2026-11-09",
      previous: p,
    });
    expect(
      next.days[0].blocks.some(
        (b) => b.review?.offset_days === 7 && b.topic === root.topic,
      ),
    ).toBe(true);
  });
  it("never overlaps school commitments", () => {
    const school = validateSchoolBlocks([
      { day: "Monday", start: "16:00", end: "18:00", label: "School sports" },
      { day: "Saturday", start: "09:00", end: "12:00", label: "School event" },
    ]);
    const p = buildTemplate({ ...baseInput, school });
    expect(() => validateSchedule(p, school)).not.toThrow();
    expect(
      p.days[0].blocks.find((b) => b.activity_type === "STUDY")!.start,
    ).toBe("18:00");
    expect(
      p.days[5].blocks.find((b) => b.activity_type === "STUDY")!.start >=
        "12:00",
    ).toBe(true);
  });
  it("does not backdate a first plan, and preserves an existing earlier day", () => {
    const p = buildTemplate({ ...baseInput, today: "2026-11-04" });
    expect(
      p.days
        .slice(0, 2)
        .flatMap((d) => d.blocks)
        .every((b) => b.activity_type === "BREAK"),
    ).toBe(true);
    const old = buildTemplate(baseInput),
      updated = buildTemplate({
        ...baseInput,
        today: "2026-11-04",
        prior: old,
      });
    expect(updated.days[0]).toEqual(old.days[0]);
  });
  it("rejects invalid JSON, overlaps, invented subjects, external URLs and extra fields", () => {
    const p = buildTemplate(baseInput);
    expect(() => validateAiDays("not JSON", p)).toThrow();
    for (const mutate of [
      (v: any) => (v.days[0].blocks[0].start = "22:00"),
      (v: any) => (v.days[0].blocks[0].subject = "Invented subject"),
      (v: any) => (v.days[0].blocks[1].quiz_link = "https://example.com"),
      (v: any) => (v.student_id = 99),
    ]) {
      const raw = JSON.parse(JSON.stringify(aiShape(p)));
      mutate(raw);
      expect(() => validateAiDays(raw, p)).toThrow();
    }
    expect(validateAiDays(aiShape(p), p).source).toBe("AI");
  });
});
const integration = process.env.RBAC_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("Timetable isolated PostgreSQL/JWT and real branded PDF", () => {
  let db: PrismaClient,
    app: INestApplication,
    base: string,
    a: any,
    b: any,
    student: any,
    other: any,
    admin: any,
    teacher: any,
    service: TimetableService,
    row: any,
    clock = new Date("2026-11-02T10:00:00Z");
  const ai = {
    generateAssignment: jest
      .fn()
      .mockImplementation(async (prompt: string) => ({
        content: JSON.parse(prompt.split("no markdown: ")[1]),
        model: "fixture",
        usage: { totalTokens: 1 },
      })),
  };
  const jwt = new JwtService({ secret: "isolated-timetable-secret" });
  const headers = (u: any) => ({
    Authorization:
      "Bearer " + jwt.sign({ sub: u.id, schoolId: u.schoolId, role: u.role }),
    "Content-Type": "application/json",
  });
  const req = (path: string, u = student, method = "GET", body?: unknown) =>
    fetch(base + path, {
      method,
      headers: headers(u),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  async function clean() {
    const ids = (
      await db.school.findMany({
        where: { code: { in: ["TIMETABLE_TEST_A", "TIMETABLE_TEST_B"] } },
        select: { id: true },
      })
    ).map((x) => x.id);
    await db.study_Timetable.deleteMany({ where: { school_id: { in: ids } } });
    await db.study_School_Schedule.deleteMany({
      where: { school_id: { in: ids } },
    });
    await db.moduleAssignment.deleteMany({ where: { module_id: moduleId } });
    await db.masterModule.deleteMany({ where: { id: moduleId } });
    await db.school.deleteMany({ where: { id: { in: ids } } });
    await db.curriculumTaxonomy.deleteMany({
      where: { id: { in: ["tt-math", "tt-physics"] } },
    });
  }
  beforeAll(async () => {
    const url = new URL(process.env.RBAC_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/rbac_test")
      throw Error("Use isolated localhost rbac_test only.");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await clean();
    a = await db.school.create({
      data: {
        name: "Timetable Demo Academy",
        code: "TIMETABLE_TEST_A",
        subscriptionStatus: "ACTIVE",
      },
    });
    b = await db.school.create({
      data: {
        name: "Other school",
        code: "TIMETABLE_TEST_B",
        subscriptionStatus: "ACTIVE",
      },
    });
    admin = await db.user.create({
      data: { schoolId: a.id, name: "Principal", role: "SCHOOL_ADMIN" },
    });
    teacher = await db.user.create({
      data: { schoolId: a.id, name: "Teacher", role: "TEACHER" },
    });
    student = await db.user.create({
      data: {
        schoolId: a.id,
        name: "Victor Planner",
        admissionNumber: "TP001",
        grade: "Grade 11",
        role: "STUDENT",
        studentProfile: {
          create: { grade: "Grade 11", stream: "1B", pathway: "STEM" },
        },
      },
    });
    other = await db.user.create({
      data: {
        schoolId: b.id,
        name: "Other learner",
        grade: "Grade 11",
        role: "STUDENT",
      },
    });
    for (const [subject, topic, id] of [
      ["Mathematics", "Fractions", "tt-math"],
      ["Physics", "Forces", "tt-physics"],
    ])
      await db.curriculumTaxonomy.create({
        data: {
          id,
          level: "Senior School",
          grade: 11,
          pathway: "STEM",
          subject,
          topics: [topic],
        },
      });
    const batch = await db.academicResultBatch.create({
      data: {
        schoolId: a.id,
        uploadedById: admin.id,
        name: "Report results",
        academicYear: 2026,
        term: "Term 2",
        grade: "Grade 11",
        fileName: "report.csv",
        status: "COMPLETED",
      },
    });
    for (const [subject, score] of [
      ["Mathematics", 20],
      ["Physics", 85],
    ] as const)
      await db.studentAcademicResult.create({
        data: {
          schoolId: a.id,
          studentId: student.id,
          batchId: batch.id,
          subject,
          score,
          maxScore: 100,
          percentage: score,
        },
      });
    await db.masterModule.create({
      data: {
        id: moduleId,
        level: "Senior School",
        grade: 11,
        pathway: "STEM",
        subject: "Mathematics",
        topic: "Fractions",
        status: "PUBLISHED_SCHOOL",
        tenant_id: String(a.id),
        content_json: {
          theory_text: "Reviewed lesson.",
          questions: Array.from({ length: 5 }, (_, i) => ({
            question_text: `What is ${i}+${i}?`,
            options: [String(i * 2), "wrong-a", "wrong-b", "wrong-c"],
            correct_answer: String(i * 2),
            explanation: "Add equal amounts to get the total.",
          })),
        },
        assignments: { create: { stream_id: "1B" } },
      },
    });
    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: db }],
      exports: [PrismaService],
    })
    class DbModule {}
    @Module({
      imports: [DbModule, PassportModule],
      controllers: [TimetableController],
      providers: [
        TimetableService,
        TimetableContextService,
        TimetablePdfService,
        CmsService,
        JwtStrategy,
        { provide: AiProviderRouterService, useValue: ai },
        {
          provide: CslPhotoService,
          useValue: { schoolLogo: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: "isolated-timetable-secret",
          }),
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
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
    service = app.get(TimetableService);
    jest.spyOn(service, "now").mockImplementation(() => clock);
  }, 30000);
  afterAll(async () => {
    await app?.close();
    if (db) {
      await clean();
      await db.$disconnect();
    }
  });
  it("reads without spending AI credit, then saves a personalised validated AI plan", async () => {
    const initial: any = await (await req("/study-hub/timetable")).json();
    expect(initial.timetable).toBeNull();
    expect(ai.generateAssignment).not.toHaveBeenCalled();
    const r = await req("/study-hub/timetable/generate", student, "POST", {});
    expect(r.status).toBe(201);
    row = await r.json();
    expect(row.plan.source).toBe("AI");
    const math = row.plan.days
        .flatMap((d: any) => d.blocks)
        .filter(
          (b: any) =>
            b.activity_type === "STUDY" && b.subject === "Mathematics",
        ),
      physics = row.plan.days
        .flatMap((d: any) => d.blocks)
        .filter(
          (b: any) => b.activity_type === "STUDY" && b.subject === "Physics",
        );
    expect(math.length).toBeGreaterThan(physics.length);
    expect(
      row.plan.focus_subjects.find((s: any) => s.subject === "Mathematics"),
    ).toMatchObject({ weak: true, percentage: 20 });
    expect(ai.generateAssignment.mock.calls[0][2]).toEqual({
      maxOutputTokens: 10000,
      timeoutMs: 45000,
      maxRetries: 0,
    });
  });
  it("returns the cached weekly record without a second AI request", async () => {
    const same: any = await (
      await req("/study-hub/timetable/generate", student, "POST", {})
    ).json();
    expect(same.id).toBe(row.id);
    expect(ai.generateAssignment).toHaveBeenCalledTimes(1);
    expect(
      await db.study_Timetable.count({ where: { student_id: student.id } }),
    ).toBe(1);
  });
  it("keeps another learner and teachers out of the private plan", async () => {
    expect((await req(`/study-hub/timetable/${row.id}`, other)).status).toBe(
      404,
    );
    expect((await req(`/study-hub/timetable/${row.id}`, teacher)).status).toBe(
      403,
    );
    expect(
      (
        await req("/study-hub/timetable/generate", student, "POST", {
          student_id: other.id,
        })
      ).status,
    ).toBe(400);
  });
  it("persists study completion, rejects stale revisions and cannot complete rest blocks", async () => {
    const study = row.plan.days[0].blocks.find(
        (b: any) => b.activity_type === "STUDY",
      ),
      rest = row.plan.days[0].blocks.find(
        (b: any) => b.activity_type === "BREAK",
      );
    expect(
      (
        await req(`/study-hub/timetable/${row.id}/progress`, student, "PATCH", {
          block_id: study.id,
          completed: true,
          revision: row.plan.revision,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await req(`/study-hub/timetable/${row.id}/progress`, student, "PATCH", {
          block_id: study.id,
          completed: true,
          revision: "00000000-0000-0000-0000-000000000000",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await req(`/study-hub/timetable/${row.id}/progress`, student, "PATCH", {
          block_id: rest.id,
          completed: true,
          revision: row.plan.revision,
        })
      ).status,
    ).toBe(400);
  });
  it("links a real 3–5-question published quiz without exposing answers before submission", async () => {
    const block = row.plan.days
      .flatMap((d: any) => d.blocks)
      .find(
        (b: any) => b.activity_type === "RECALL" && b.module_id === moduleId,
      );
    expect(block).toBeDefined();
    const response = await req(
      `/study-hub/timetable/${row.id}/quiz/${block.id}`,
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain("correct_answer");
    expect(text).not.toContain("explanation");
    const quiz = JSON.parse(text);
    expect(quiz.questions.length).toBeGreaterThanOrEqual(3);
    const result: any = await (
      await req(
        `/study-hub/timetable/${row.id}/quiz/${block.id}`,
        student,
        "POST",
        {
          revision: quiz.revision,
          answers: quiz.questions.map((q: any) => ({
            question_index: q.question_index,
            answer: q.options[0],
          })),
        },
      )
    ).json();
    expect(result.score).toBe(result.total);
    expect(result.results[0].explanation).toContain("Add equal amounts");
    await db.masterModule.update({
      where: { id: moduleId },
      data: { status: "ARCHIVED" },
    });
    expect(
      (await req(`/study-hub/timetable/${row.id}/quiz/${block.id}`)).status,
    ).toBe(403);
    await db.masterModule.update({
      where: { id: moduleId },
      data: { status: "PUBLISHED_SCHOOL" },
    });
  });
  it("retries invalid AI JSON once, saves a valid fallback and preserves the same weekly row", async () => {
    clock = new Date("2026-11-02T10:06:00Z");
    ai.generateAssignment
      .mockResolvedValueOnce({ content: "invalid JSON" })
      .mockResolvedValueOnce({ content: { days: [] } });
    const result = await req("/study-hub/timetable/generate", student, "POST", {
      regenerate: true,
    });
    expect(result.status).toBe(201);
    const updated: any = await result.json();
    expect(updated.id).toBe(row.id);
    expect(updated.plan.source).toBe("TEMPLATE");
    expect(ai.generateAssignment).toHaveBeenCalledTimes(3);
    expect(updated.progress.completed).toBeGreaterThanOrEqual(1);
    expect(
      (
        await req("/study-hub/timetable/generate", student, "POST", {
          regenerate: true,
        })
      ).status,
    ).toBe(400);
    row = updated;
  });
  it("starts a fresh record next Monday, with prior seven-day reviews carried forward", async () => {
    clock = new Date("2026-11-09T09:00:00Z");
    const next: any = await (
      await req("/study-hub/timetable/generate", student, "POST", {})
    ).json();
    expect(next.id).not.toBe(row.id);
    expect(
      await db.study_Timetable.count({ where: { student_id: student.id } }),
    ).toBe(2);
    expect(
      next.plan.days[0].blocks.some((b: any) => b.review?.offset_days === 7),
    ).toBe(true);
  });
  it("allows own-school schedule constraints only for school admins", async () => {
    const data = {
      grade: "Grade 11",
      stream: "1B",
      blocks: [
        { day: "Monday", start: "16:00", end: "17:00", label: "School event" },
      ],
    };
    expect(
      (await req("/study-hub/school-schedule", student, "PUT", data)).status,
    ).toBe(403);
    expect(
      (await req("/study-hub/school-schedule", admin, "PUT", data)).status,
    ).toBe(200);
    expect(
      (
        await req("/study-hub/school-schedule", admin, "PUT", {
          ...data,
          schoolId: b.id,
        })
      ).status,
    ).toBe(403);
    expect(
      await db.study_School_Schedule.count({ where: { school_id: b.id } }),
    ).toBe(0);
  });
  it("generates a real branded PDF with seven days and student details", async () => {
    const response = await req(`/study-hub/timetable/${row.id}/pdf`);
    expect(response.status).toBe(200);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    const { execFileSync } = require("child_process");
    const text = execFileSync(
      process.execPath,
      [
        "-e",
        "const {PDFParse}=require('pdf-parse');(async()=>{const p=new PDFParse({data:require('fs').readFileSync(0)});console.log((await p.getText()).text);await p.destroy();})().catch(e=>{console.error(e);process.exit(1)});",
      ],
      {
        input: bytes,
        encoding: "utf8",
        timeout: 30000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    expect(text).toContain("Timetable Demo Academy");
    expect(text).toContain("Victor Planner");
    expect(text).toContain("TP001");
    expect(text).toContain("Weekly Study Plan");
    expect(text).toContain("Monday");
    expect(text).toContain("Sunday");
    expect(text).toContain("Powered by AI Study Coach");
  }, 60000);
});
