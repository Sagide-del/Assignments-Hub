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
import ExcelJS from "exceljs";
import { PrismaService } from "../prisma/prisma.service";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { TeacherScopeModule } from "../teacher-scope/teacher-scope.module";
import { SbaModule } from "../sba/sba.module";
import { csvRows, HEADERS, parseFile } from "../sba/import/file-parser";
const file = (text: string, name = "results.csv") =>
  ({ originalname: name, buffer: Buffer.from(text) }) as Express.Multer.File;
describe("Mock import parsers", () => {
  it("parses quoted CSV names and preserves leading-zero admission IDs", async () => {
    const rows = await parseFile(
      file(
        HEADERS.join(",") +
          '\r\n001,"Student, One",Mathematics,12,Term 1,80\r\n',
      ),
    );
    expect(rows[0].values.slice(0, 2)).toEqual(["001", "Student, One"]);
    expect(csvRows('"one\ntwo",3\n')[0]).toEqual(["one\ntwo", "3"]);
  });
  it("rejects malformed files and overlarge batches", async () => {
    await expect(parseFile(file("wrong,headers"))).rejects.toThrow("Headers");
    expect(() => csvRows('"unclosed')).toThrow();
    expect(() => csvRows("a\n".repeat(2003))).toThrow("2,000");
    await expect(parseFile(file("fake", "results.xlsx"))).rejects.toThrow(
      "Invalid Excel",
    );
  });
  it("reads XLSX values and rejects formulas", async () => {
    const w = new ExcelJS.Workbook(),
      s = w.addWorksheet("Results");
    s.addRow(HEADERS);
    s.addRow(["001", "One", "Mathematics", 12, "Term 1", 80]);
    const f = {
      originalname: "results.xlsx",
      buffer: Buffer.from(await w.xlsx.writeBuffer()),
    } as Express.Multer.File;
    expect((await parseFile(f))[0].values[5]).toBe("80");
    s.getCell("F2").value = { formula: "40+40", result: 80 };
    f.buffer = Buffer.from(await w.xlsx.writeBuffer());
    await expect(parseFile(f)).rejects.toThrow("formulas");
  });
});
const integration = process.env.RBAC_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("External mocks isolated PostgreSQL/JWT HTTP", () => {
  let db: PrismaClient,
    app: INestApplication,
    base: string,
    a: any,
    b: any,
    admin: any,
    otherAdmin: any,
    teacher: any,
    students: any[] = [],
    otherStudent: any;
  const jwt = new JwtService({ secret: "isolated-import-secret" });
  const headers = (u: any) => ({
    Authorization:
      "Bearer " + jwt.sign({ sub: u.id, schoolId: u.schoolId, role: u.role }),
  });
  const req = (path: string, u = admin) =>
    fetch(base + path, { headers: headers(u) });
  const csv = (lines: string[]) => HEADERS.join(",") + "\n" + lines.join("\n");
  async function upload(
    text: string,
    u = admin,
    source = "School physical mock",
    name = "results.csv",
  ) {
    const form = new FormData();
    form.append("source", source);
    form.append("academic_year", "2026");
    form.append("file", new Blob([text]), name);
    return fetch(base + "/sba/import/upload", {
      method: "POST",
      headers: headers(u),
      body: form,
    });
  }
  async function clean() {
    const ids = (
      await db.school.findMany({
        where: { code: { in: ["IMPORT_TEST_A", "IMPORT_TEST_B"] } },
        select: { id: true },
      })
    ).map((s) => s.id);
    await db.sBA_Projection.deleteMany({ where: { school_id: { in: ids } } });
    await db.externalMock_Record.deleteMany({
      where: { school_id: { in: ids } },
    });
    await db.sBA_Record.deleteMany({ where: { school_id: { in: ids } } });
    await db.school.deleteMany({ where: { id: { in: ids } } });
    await db.curriculumTaxonomy.deleteMany({
      where: {
        id: { in: ["import-test-aviation", "import-test-aviation-11"] },
      },
    });
  }
  beforeAll(async () => {
    const url = new URL(process.env.RBAC_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/rbac_test")
      throw Error("Only isolated localhost rbac_test is allowed.");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await clean();
    a = await db.school.create({
      data: { code: "IMPORT_TEST_A", name: "Import A" },
    });
    b = await db.school.create({
      data: { code: "IMPORT_TEST_B", name: "Import B" },
    });
    const user = (schoolId: number, name: string, role: any) =>
      db.user.create({ data: { schoolId, name, role } });
    admin = await user(a.id, "Principal A", "SCHOOL_ADMIN");
    otherAdmin = await user(b.id, "Principal B", "SCHOOL_ADMIN");
    teacher = await user(a.id, "Teacher B", "TEACHER");
    for (const name of ["1A", "1B"])
      await db.stream.create({
        data: { school_id: a.id, grade: "Grade 12", name },
      });
    const stream = await db.stream.findFirstOrThrow({
      where: { school_id: a.id, name: "1B" },
    });
    await db.teacherAssignment.create({
      data: {
        teacher_id: teacher.id,
        school_id: a.id,
        subject: "Aviation Technology",
        stream_id: stream.id,
      },
    });
    for (let i = 0; i < 10; i++)
      students.push(
        await db.user.create({
          data: {
            schoolId: a.id,
            name: "Learner " + i,
            admissionNumber: "IM" + i,
            role: "STUDENT",
            grade: "Grade 12",
            studentProfile: {
              create: {
                grade: "Grade 12",
                pathway: "STEM",
                stream: i === 0 ? "1B" : "1A",
              },
            },
          },
        }),
      );
    otherStudent = await db.user.create({
      data: {
        schoolId: b.id,
        name: "Other learner",
        admissionNumber: "OTHER",
        role: "STUDENT",
        grade: "Grade 12",
      },
    });
    await db.curriculumTaxonomy.create({
      data: {
        id: "import-test-aviation",
        level: "Senior School",
        grade: 12,
        pathway: "STEM",
        subject: "Aviation Technology",
        topics: ["Flight"],
      },
    });
    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: db }],
      exports: [PrismaService],
    })
    class DbModule {}
    @Module({
      imports: [DbModule, PassportModule, TeacherScopeModule, SbaModule],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: "isolated-import-secret" }),
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
  }, 30000);
  afterAll(async () => {
    await app?.close();
    if (db) {
      await clean();
      await db.$disconnect();
    }
  });
  it("downloads only this school’s Grade 10–12 roster", async () => {
    const r = await req("/sba/import/template");
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).toContain("IM0");
    expect(text).not.toContain("OTHER");
    expect(text).toContain(HEADERS.join('","'));
  });
  it("imports 10 valid rows and repeat uploads do not duplicate", async () => {
    const text = csv(
      students.map(
        (s, i) =>
          `${s.admissionNumber},${s.name},Aviation Technology,12,Term 1,${60 + i}`,
      ),
    );
    const first = await upload(text);
    expect(first.status).toBe(201);
    const result: any = await first.json();
    expect(result).toMatchObject({
      total_rows: 10,
      imported: 10,
      failed: 0,
      inserted: 10,
    });
    const again: any = await (await upload(text)).json();
    expect(again).toMatchObject({ inserted: 0, unchanged: 10 });
    expect(
      await db.externalMock_Record.count({ where: { school_id: a.id } }),
    ).toBe(10);
    expect(await db.sBA_Projection.count({ where: { school_id: a.id } })).toBe(
      10,
    );
  });
  it("reports row numbers for wrong admissions, scores and pathway subjects; blanks are not zero", async () => {
    const r: any = await (
      await upload(
        csv([
          "OTHER,Other learner,Aviation Technology,12,Term 1,80",
          "IM0,Learner 0,Aviation Technology,12,Term 1,101",
          "IM0,Learner 0,Unsupported Fine Arts,12,Term 1,80",
          "IM0,Learner 0,,12,,",
        ]),
      )
    ).json();
    expect(r).toMatchObject({ imported: 0, failed: 3, skipped: 1 });
    expect(r.errors.map((e: any) => e.row)).toEqual([2, 3, 4]);
    expect(r.errors[0].message).toContain("your school");
  });
  it("uses max(external, internal), recomputes projection, audits corrections and persists merge", async () => {
    for (const [grade, score] of [
      [10, 60],
      [11, 80],
    ])
      await db.sBA_Record.create({
        data: {
          student_id: students[0].id,
          school_id: a.id,
          subject: "Aviation Technology",
          grade_level: grade,
          term: "Term 1",
          academic_year: 2026,
          score,
          entered_by: teacher.id,
        },
      });
    await db.kjseaMockAttempt.create({
      data: {
        schoolId: a.id,
        studentId: students[0].id,
        subject: "Aviation Technology",
        seed: 1,
        status: "SUBMITTED",
        source: "BANK",
        score: 32,
        completedAt: new Date(),
        questions: [],
        coverage: {
          grade: "Grade 12",
          assessment: "TIMED_MOCK",
          totalMarks: 40,
        },
      },
    });
    await upload(csv(["IM0,Learner 0,Aviation Technology,12,Term 1,65"]));
    let snapshot = await db.sBA_Projection.findUniqueOrThrow({
      where: { student_id: students[0].id },
    });
    expect(snapshot.kcbe_mock_final).toBe(80);
    expect(snapshot.projected).toBe(77);
    const correction: any = await (
      await upload(csv(["IM0,Learner 0,Aviation Technology,12,Term 1,90"]))
    ).json();
    expect(correction.updated).toBe(1);
    snapshot = await db.sBA_Projection.findUniqueOrThrow({
      where: { student_id: students[0].id },
    });
    expect(snapshot.external_mock).toBe(90);
    expect(snapshot.projected).toBe(84);
    const report: any = await (await req(`/sba/school/${a.id}`)).json();
    expect(
      report.rows.find((r: any) => r.student_id === students[0].id),
    ).toMatchObject({
      internal_mock: 80,
      external_mock: 90,
      kcbe_mock: 90,
      projected: 84,
    });
    expect(
      await db.auditLog.count({
        where: { schoolId: a.id, action: "sba.external_mock.imported" },
      }),
    ).toBeGreaterThan(10);
    expect(
      (
        await fetch(base + "/sba/import/merge", {
          method: "POST",
          headers: headers(admin),
        })
      ).status,
    ).toBe(201);
  });
  it("imports valid rows alongside row errors and preserves a zero score", async () => {
    const result: any = await (
      await upload(
        csv([
          "IM1,Learner 1,Aviation Technology,12,Term 2,0",
          "NOT-HERE,Unknown,Aviation Technology,12,Term 2,80",
        ]),
      )
    ).json();
    expect(result).toMatchObject({ imported: 1, failed: 1, inserted: 1 });
    const saved = await db.externalMock_Record.findFirstOrThrow({
      where: { student_id: students[1].id, term: "Term 2" },
    });
    expect(saved.score).toBe(0);
  });
  it("stores earlier-grade mocks without replacing SBA or the Grade 12 mock component", async () => {
    await db.curriculumTaxonomy.upsert({
      where: { id: "import-test-aviation-11" },
      create: {
        id: "import-test-aviation-11",
        level: "Senior School",
        grade: 11,
        pathway: "STEM",
        subject: "Aviation Technology",
        topics: [],
      },
      update: {},
    });
    const result: any = await (
      await upload(csv(["IM0,Learner 0,Aviation Technology,11,Term 2,100"]))
    ).json();
    expect(result.imported).toBe(1);
    const snapshot = await db.sBA_Projection.findUniqueOrThrow({
      where: { student_id: students[0].id },
    });
    expect(snapshot).toMatchObject({
      grade11_sba: 80,
      external_mock: 90,
      projected: 84,
    });
  });
  it("rejects teacher imports and blocks cross-stream / cross-school result reads", async () => {
    expect((await req("/sba/import/template", teacher)).status).toBe(403);
    expect(
      (
        await upload(
          csv(["IM0,Learner 0,Aviation Technology,12,Term 1,80"]),
          teacher,
        )
      ).status,
    ).toBe(403);
    expect((await req(`/sba/student/${students[1].id}`, teacher)).status).toBe(
      403,
    );
    const own: any = await (
      await req(`/sba/student/${students[0].id}`, teacher)
    ).json();
    expect(own.rows).toHaveLength(1);
    expect(own.rows[0].external_mock).toBe(90);
    expect((await req(`/sba/school/${a.id}`, otherAdmin)).status).toBe(403);
    const other: any = await (
      await req(`/sba/school/${b.id}`, otherAdmin)
    ).json();
    expect(other.rows[0].external_mock).toBeNull();
  });
});
