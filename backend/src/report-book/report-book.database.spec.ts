import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { ReportBookService } from "./report-book.service";
import { ReportBookPdfService } from "./report-book.pdf";
import { ReportBookController } from "./report-book.controller";
import { PRESET_BANDS } from "./report-book.calculations";
import { TeacherScopeGuard } from "../teacher-scope/teacher-scope.guard";
import { PrismaService } from "../prisma/prisma.service";
import { Test } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RolesGuard } from "../common/guards/roles.guard";

const run = process.env.REPORT_BOOK_TEST_DATABASE_URL
  ? describe
  : describe.skip;
run("Report Book: PostgreSQL scopes, publication and frozen revisions", () => {
  let db: PrismaClient,
    service: ReportBookService,
    school: any,
    foreign: any,
    stream: any,
    otherStream: any,
    admin: any,
    math: any,
    science: any,
    outsider: any,
    pupils: any[],
    period: any,
    app: any,
    published: any,
    ai: any;
  const actor = (u: any) => ({
    id: u.id,
    schoolId: u.schoolId,
    role: u.role,
    grade: u.grade,
  });
  beforeAll(async () => {
    const url = new URL(process.env.REPORT_BOOK_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/report_book_test")
      throw Error("Disposable localhost report_book_test only");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await db.$connect();
    school = await db.school.create({
      data: {
        code: randomUUID(),
        name: "Report test A",
        subscriptionStatus: "ACTIVE",
      },
    });
    foreign = await db.school.create({
      data: {
        code: randomUUID(),
        name: "Report test B",
        subscriptionStatus: "ACTIVE",
      },
    });
    stream = await db.stream.create({
      data: { school_id: school.id, grade: "Grade 7", name: "7A" },
    });
    otherStream = await db.stream.create({
      data: { school_id: school.id, grade: "Grade 7", name: "7B" },
    });
    const make = async (role: any, name: string, schoolId = school.id) =>
      db.user.create({
        data: {
          schoolId,
          role,
          name,
          isActive: true,
          grade: role === "STUDENT" ? "Grade 7" : null,
          ...(role === "STUDENT"
            ? {
                studentProfile: {
                  create: { stream: stream.name, grade: stream.grade },
                },
              }
            : {}),
        },
      });
    admin = await make("SCHOOL_ADMIN", "Admin");
    math = await make("TEACHER", "Math teacher");
    science = await make("TEACHER", "Science teacher");
    outsider = await make("SCHOOL_ADMIN", "Other Admin", foreign.id);
    pupils = [await make("STUDENT", "Amani"), await make("STUDENT", "Baraka")];
    await db.teacherAssignment.createMany({
      data: [
        {
          teacher_id: math.id,
          school_id: school.id,
          stream_id: stream.id,
          subject: "Mathematics",
        },
        {
          teacher_id: science.id,
          school_id: school.id,
          stream_id: stream.id,
          subject: "Integrated Science",
        },
      ],
    });
    ai = {
      generateAssignment: jest.fn(async (prompt: string) => {
        const values = JSON.parse(prompt.split("Marks: ")[1]);
        return {
          content: {
            remarks: values.map((r: any) => ({
              id: r.id,
              remark: `Your score was ${r.percentage}%. Practise one worked example each day.`,
            })),
          },
        };
      }),
    };
    service = new ReportBookService(db as any, ai);
    await service.assignClass(
      { stream_id: stream.id, teacher_id: math.id },
      actor(admin) as any,
    );
    await service.savePolicy(
      { grade_level: 7, bands: PRESET_BANDS, confirmed: true },
      actor(admin) as any,
    );
    period = await service.createPeriod(
      {
        stream_id: stream.id,
        term: "Term 1",
        year: 2027,
        subjects: ["Mathematics", "Integrated Science"],
      },
      actor(admin) as any,
    );
    const module = await Test.createTestingModule({
      controllers: [ReportBookController],
      providers: [
        { provide: ReportBookService, useValue: service },
        { provide: PrismaService, useValue: db },
        {
          provide: ReportBookPdfService,
          useValue: new ReportBookPdfService({
            schoolLogo: async () => null,
          } as any),
        },
        TeacherScopeGuard,
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    const users: any = { math, science, admin, outsider, student: pupils[0] };
    app.use((req: any, _res: any, next: any) => {
      const u = users[req.headers["x-fixture"]];
      req.user = u ? actor(u) : undefined;
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
  });
  afterAll(async () => {
    if (app) await app.close();
    if (!db) return;
    for (const s of [school, foreign].filter(Boolean)) {
      await db.reportBookChange.deleteMany({ where: { school_id: s.id } });
      await db.report_Card.deleteMany({ where: { school_id: s.id } });
      await db.assessment_Record.deleteMany({ where: { school_id: s.id } });
      await db.reportBookAssessment.deleteMany({ where: { school_id: s.id } });
      await db.reportBookPeriod.deleteMany({ where: { school_id: s.id } });
      await db.academicResultBatch.deleteMany({ where: { schoolId: s.id } });
      await db.school.delete({ where: { id: s.id } });
    }
    await db.$disconnect();
  });
  const marks = (subject: string, score = 80) => ({
    period_id: period.id,
    subject,
    assessment_name: "End Term",
    max_score: 100,
    weight: 1,
    scores: pupils.map((s) => ({ student_id: s.id, score })),
  });
  async function http(
    method: string,
    path: string,
    who: string,
    status: number,
    body?: unknown,
  ) {
    const r = await fetch((await app.getUrl()) + path, {
      method,
      headers: { "x-fixture": who, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    expect(r.status).toBe(status);
    return r;
  }
  test("HTTP gradebook keeps subject, stream and school permissions paired", async () => {
    await http(
      "POST",
      "/report-book/gradebook/bulk-save",
      "math",
      201,
      marks("Mathematics"),
    );
    await http(
      "POST",
      "/report-book/gradebook/bulk-save",
      "math",
      403,
      marks("Integrated Science"),
    );
    await http(
      "GET",
      `/report-book/periods/${period.id}/gradebook?subject=Mathematics`,
      "outsider",
      404,
    );
    await http(
      "GET",
      `/report-book/periods/${period.id}/aggregated`,
      "science",
      403,
    );
    await http(
      "GET",
      `/report-book/periods/${period.id}/aggregated`,
      "math",
      200,
    );
  });
  test("missing scores block approval, zero remains a real score and invalid bulk rows roll back", async () => {
    await service.generate(period.id, false, actor(math) as any);
    await expect(
      service.transition(period.id, "review", undefined, actor(math) as any),
    ).rejects.toThrow("Complete marks");
    await expect(
      service.saveMarks(
        {
          ...marks("Mathematics"),
          scores: [
            { student_id: pupils[0].id, score: 70 },
            { student_id: 99999999, score: 80 },
          ],
        },
        actor(math) as any,
      ),
    ).rejects.toThrow();
    const a = await db.reportBookAssessment.findFirstOrThrow({
      where: { period_id: period.id, subject: "Mathematics" },
    });
    expect(
      (
        await db.assessment_Record.findUniqueOrThrow({
          where: {
            student_id_assessment_id: {
              student_id: pupils[0].id,
              assessment_id: a.id,
            },
          },
        })
      ).score,
    ).toBe(80);
    await service.saveMarks(
      marks("Integrated Science", 0),
      actor(science) as any,
    );
    const data = await service.aggregate(period.id, actor(math) as any);
    expect(data.rows[0].average).toBe(40);
  });
  test("stale staff edits are rejected without overwriting newer marks", async () => {
    const dto = marks("Mathematics");
    await expect(
      service.saveMarks(
        {
          ...dto,
          scores: [
            {
              student_id: pupils[0].id,
              score: 10,
              expected_updated_at: "2000-01-01T00:00:00.000Z",
            },
          ],
        },
        actor(math) as any,
      ),
    ).rejects.toThrow("changed while you were editing");
    const book = await service.gradebook(
      period.id,
      "Mathematics",
      actor(math) as any,
    );
    expect(
      book.assessments[0].records.find((r) => r.student_id === pupils[0].id)
        ?.score,
    ).toBe(80);
  });
  test("historical marks from a learner now in another stream stay outside the subject teacher gradebook and AI endpoint", async () => {
    const learner = await db.user.create({
      data: {
        schoolId: school.id,
        role: "STUDENT",
        name: "Moved learner",
        grade: "Grade 7",
        studentProfile: { create: { stream: otherStream.name } },
      },
    });
    const assessment = await db.reportBookAssessment.findFirstOrThrow({
      where: { period_id: period.id, subject: "Integrated Science" },
    });
    const record = await db.assessment_Record.create({
      data: {
        school_id: school.id,
        student_id: learner.id,
        assessment_id: assessment.id,
        score: 55,
        grade: "ME2",
        entered_by: science.id,
      },
    });
    const book = await service.gradebook(
      period.id,
      "Integrated Science",
      actor(science) as any,
    );
    expect(
      book.assessments
        .flatMap((a) => a.records)
        .some((r) => r.id === record.id),
    ).toBe(false);
    const calls = ai.generateAssignment.mock.calls.length;
    await expect(
      service.suggest(
        { assessment_id: assessment.id, record_ids: [record.id] },
        actor(science) as any,
      ),
    ).rejects.toThrow();
    expect(ai.generateAssignment.mock.calls.length).toBe(calls);
  });
  test("AI remarks are pseudonymous drafts, not approved remarks", async () => {
    const a = await db.reportBookAssessment.findFirstOrThrow({
      where: { period_id: period.id, subject: "Integrated Science" },
      include: { records: true },
    });
    await service.suggest(
      {
        assessment_id: a.id,
        record_ids: a.records
          .filter((r) => pupils.some((p) => p.id === r.student_id))
          .map((r) => r.id),
      },
      actor(science) as any,
    );
    const r = await db.assessment_Record.findUniqueOrThrow({
      where: { id: a.records.find((r) => r.student_id === pupils[0].id)!.id },
    });
    expect(r.remark_suggestion).toContain("0%");
    expect(r.remark).toBeNull();
    expect(ai.generateAssignment.mock.calls[0][0]).not.toContain("Amani");
  });
  test("policy changes require a fresh draft before school review", async () => {
    await service.generate(period.id, false, actor(math) as any);
    await service.savePolicy(
      { grade_level: 7, bands: PRESET_BANDS, confirmed: true },
      actor(admin) as any,
    );
    await expect(
      service.transition(period.id, "review", undefined, actor(math) as any),
    ).rejects.toThrow("regenerate");
  });
  test("drafts stay private; teacher cannot publish or sign the principal comment", async () => {
    await service.generate(period.id, false, actor(math) as any);
    const cards = await service.cards(period.id, actor(math) as any);
    published = cards[0];
    // School-generated remarks must not make a fresh draft appear stale.
    expect((published.subjects_json as any[]).every(s=>typeof s.remark==='string' && s.remark.length>0)).toBe(true);
    await http("GET", `/report-book/reports/${published.id}`, "student", 403);
    await expect(
      service.comments(
        published.id,
        { principal_comment: "Forbidden" },
        actor(math) as any,
      ),
    ).rejects.toThrow("Class Teachers");
    await expect(
      service.transition(period.id, "publish", undefined, actor(math) as any),
    ).rejects.toThrow("School Admin");
    await service.comments(
      published.id,
      { teacher_comment: "Keep practising." },
      actor(math) as any,
    );
    await service.transition(
      period.id,
      "review",
      undefined,
      actor(math) as any,
    );
    await service.comments(
      published.id,
      { principal_comment: "Approved for issue." },
      actor(admin) as any,
    );
    await service.transition(
      period.id,
      "publish",
      undefined,
      actor(admin) as any,
    );
  });
  test("published school report is owner-only, freezes marks and downloads a real PDF", async () => {
    const response = await http(
      "GET",
      `/report-book/reports/${published.id}/pdf`,
      "student",
      200,
    );
    expect(response.headers.get("content-type")).toMatch(/pdf/);
    expect(
      Buffer.from(await response.arrayBuffer())
        .subarray(0, 4)
        .toString(),
    ).toBe("%PDF");
    expect(
      await db.academicResultBatch.count({
        where: { schoolId: school.id, status: "COMPLETED" },
      }),
    ).toBe(1);
    expect(
      await db.studentAcademicResult.count({ where: { schoolId: school.id } }),
    ).toBe(4);
    const mine = await service.mine(actor(pupils[0]) as any);
    expect(mine).toHaveLength(1);
    await expect(
      service.card(published.id, actor(pupils[1]) as any),
    ).rejects.toThrow("Only your published");
    await expect(
      service.saveMarks(marks("Mathematics", 30), actor(math) as any),
    ).rejects.toThrow("locked");
    await expect(
      service.comments(
        published.id,
        { teacher_comment: "Overwrite" },
        actor(admin) as any,
      ),
    ).rejects.toThrow("cannot be edited");
  });
  test("corrections create a new revision and preserve published results/history", async () => {
    const before = await db.report_Card.findUniqueOrThrow({
      where: { id: published.id },
    });
    await service.transition(
      period.id,
      "reopen",
      "Correct the verified Mathematics score",
      actor(admin) as any,
    );
    await service.saveMarks(marks("Mathematics", 90), actor(math) as any);
    await service.generate(period.id, false, actor(math) as any);
    const latest = await service.cards(period.id, actor(math) as any);
    expect(latest[0].revision).toBeGreaterThan(before.revision);
    expect(
      (await service.cards(period.id, actor(admin) as any, before.revision))[0]
        .status,
    ).toBe("PUBLISHED");
    expect(
      (await db.report_Card.findUniqueOrThrow({ where: { id: published.id } }))
        .subjects_json,
    ).toEqual(before.subjects_json);
    expect(
      (await service.history(period.id, actor(admin) as any)).some(
        (h) => h.action === "REOPEN",
      ),
    ).toBe(true);
  });
  test("clearing a saved mark preserves its previous value in history and returns Pending", async () => {
    const dto = marks("Mathematics");
    await service.saveMarks(
      { ...dto, scores: [{ student_id: pupils[0].id, score: null }] },
      actor(math) as any,
    );
    expect(
      (await service.aggregate(period.id, actor(math) as any)).rows[0].complete,
    ).toBe(false);
    const history = await service.history(period.id, actor(admin) as any);
    expect(
      history.some(
        (h) =>
          (h.details as any)?.before?.score === 90 &&
          (h.details as any)?.after?.score === null,
      ),
    ).toBe(true);
  });
  test("grade 10 explicit electives determine subjects, not the teacher’s track", async () => {
    const senior = await db.stream.create({
      data: { school_id: school.id, grade: "Grade 10", name: "10S" },
    });
    await service.assignClass(
      { stream_id: senior.id, teacher_id: math.id },
      actor(admin) as any,
    );
    const p = await service.createPeriod(
      {
        stream_id: senior.id,
        term: "Term 1",
        year: 2027,
        subjects: [
          "English",
          "Kiswahili",
          "Core Mathematics",
          "Community Service Learning",
          "Biology",
          "Chemistry",
          "Computer Science",
        ],
      },
      actor(admin) as any,
    );
    await db.user.create({
      data: {
        name: "Senior",
        role: "STUDENT",
        schoolId: school.id,
        grade: "Grade 10",
        elective_subjects: ["Biology", "Chemistry", "Computer Science"],
        studentProfile: { create: { stream: senior.name } },
      },
    });
    const data = await service.aggregate(p.id, actor(math) as any);
    expect(data.rows[0].subjects.map((s: any) => s.subject)).toContain(
      "Computer Science",
    );
    expect(data.rows[0].subjects.map((s: any) => s.subject)).not.toContain(
      "Physics",
    );
  });
  test("the synthetic staff fixture is idempotent and does not reset accounts or edited marks", async () => {
    const {
      provisionReportBookDemo,
    } = require("../../scripts/deployment/ensure-report-book-demo.cjs");
    const first = await provisionReportBookDemo(db);
    expect(first.created).toBe(true);
    expect((await provisionReportBookDemo(db)).created).toBe(false);
    const teachers = await db.user.findMany({
      where: { schoolId: first.schoolId, role: "TEACHER" },
    });
    expect(teachers).toHaveLength(3);
    const marks = await db.assessment_Record.findMany({
      where: { school_id: first.schoolId },
    });
    await db.assessment_Record.update({
      where: { id: marks[0].id },
      data: { score: 59 },
    });
    await provisionReportBookDemo(db);
    expect(
      (
        await db.assessment_Record.findUniqueOrThrow({
          where: { id: marks[0].id },
        })
      ).score,
    ).toBe(59);
    await db.reportBookChange.deleteMany({
      where: { school_id: first.schoolId },
    });
    await db.assessment_Record.deleteMany({
      where: { school_id: first.schoolId },
    });
    await db.reportBookAssessment.deleteMany({
      where: { school_id: first.schoolId },
    });
    await db.reportBookPeriod.deleteMany({
      where: { school_id: first.schoolId },
    });
    await db.school.delete({ where: { id: first.schoolId } });
  });
});
