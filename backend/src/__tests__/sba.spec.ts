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
import { TeacherScopeModule } from "../teacher-scope/teacher-scope.module";
import { SbaController } from "../sba/sba.controller";
import { SbaService } from "../sba/sba.service";
import {
  average,
  csvCell,
  mockPercentage,
  projectedScore,
  predictedGrade,
} from "../sba/calculations";
describe("SBA projection rules", () => {
  it("uses 15/15/70 and distinguishes missing from zero", () => {
    expect(projectedScore(60, 80, 90)).toBe(84);
    expect(projectedScore(0, 0, 0)).toBe(0);
    expect(projectedScore(null, 80, 90)).toBeNull();
    expect(average([])).toBeNull();
    expect(predictedGrade(null)).toBeNull();
    expect(predictedGrade(84)).toBe("A");
  });
  it("uses only scored Grade 12 timed mock evidence, normalized to percent", () => {
    const attempt = {
      coverage: { grade: "Grade 12", assessment: "TIMED_MOCK", totalMarks: 40 },
      score: 36,
      source: "BANK",
    };
    expect(mockPercentage(attempt)).toBe(90);
    expect(
      mockPercentage({
        ...attempt,
        coverage: { ...attempt.coverage, grade: "Grade 9" },
      }),
    ).toBeNull();
    expect(mockPercentage({ ...attempt, source: "PRACTICE" })).toBeNull();
    expect(mockPercentage({ ...attempt, score: 41 })).toBeNull();
    expect(
      mockPercentage({
        ...attempt,
        coverage: { ...attempt.coverage, contentKind: "STARTER" },
      }),
    ).toBeNull();
  });
  it("escapes CSV formulas, quotes and newlines", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("A, B\nC")).toBe('"A, B\nC"');
    expect(csvCell(null)).toBe('""');
  });
});
const integration = process.env.RBAC_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("SBA isolated PostgreSQL/JWT HTTP", () => {
  let p: PrismaClient,
    app: INestApplication,
    base: string,
    school: any,
    otherSchool: any,
    teacher: any,
    admin: any,
    otherAdmin: any,
    victor: any,
    alice: any,
    outsider: any,
    teachingClass: any;
  const jwt = new JwtService({ secret: "isolated-sba-secret" });
  const token = (u: any) =>
    jwt.sign({ sub: u.id, schoolId: u.schoolId, role: u.role });
  const req = (url: string, u: any, body?: unknown) =>
    fetch(base + url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token(u),
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const payload = (score: number, student_id: number) => ({
    student_id,
    subject: "Aviation Technology",
    grade_level: 11,
    term: "Term 1",
    score,
    academic_year: 2026,
  });
  beforeAll(async () => {
    const url = new URL(process.env.RBAC_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/rbac_test")
      throw Error("Use isolated localhost rbac_test only.");
    p = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    const existing = await p.school.findMany({
      where: { code: { in: ["SBA_TEST_A", "SBA_TEST_B"] } },
    });
    await p.sBA_Record.deleteMany({
      where: { school_id: { in: existing.map((s) => s.id) } },
    });
    await p.school.deleteMany({
      where: { code: { in: ["SBA_TEST_A", "SBA_TEST_B"] } },
    });
    school = await p.school.create({
      data: { code: "SBA_TEST_A", name: "SBA test A" },
    });
    otherSchool = await p.school.create({
      data: { code: "SBA_TEST_B", name: "SBA test B" },
    });
    teacher = await p.user.create({
      data: { schoolId: school.id, name: "Assigned teacher", role: "TEACHER" },
    });
    admin = await p.user.create({
      data: { schoolId: school.id, name: "School admin", role: "SCHOOL_ADMIN" },
    });
    otherAdmin = await p.user.create({
      data: {
        schoolId: otherSchool.id,
        name: "Other admin",
        role: "SCHOOL_ADMIN",
      },
    });
    for (const name of ["1A", "1B"])
      await p.stream.create({
        data: { school_id: school.id, grade: "Grade 12", name },
      });
    const stream = await p.stream.findFirstOrThrow({
      where: { school_id: school.id, name: "1B" },
    });
    teachingClass = await p.teacherAssignment.create({
      data: {
        teacher_id: teacher.id,
        school_id: school.id,
        subject: "Aviation Technology",
        stream_id: stream.id,
      },
    });
    const student = (
      schoolId: number,
      name: string,
      admissionNumber: string,
      stream: string,
    ) =>
      p.user.create({
        data: {
          schoolId,
          name,
          admissionNumber,
          role: "STUDENT",
          grade: "Grade 12",
          studentProfile: {
            create: { stream, pathway: "STEM", grade: "Grade 12" },
          },
        },
      });
    victor = await student(school.id, "Victor SBA fixture", "SV001", "1B");
    alice = await student(school.id, "Alice SBA fixture", "SA002", "1A");
    outsider = await student(
      otherSchool.id,
      "Other school fixture",
      "SO003",
      "1B",
    );
    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: p }],
      exports: [PrismaService],
    })
    class DbModule {}
    @Module({
      imports: [DbModule, PassportModule, TeacherScopeModule],
      controllers: [SbaController],
      providers: [
        SbaService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: "isolated-sba-secret" }),
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
    if (p) {
      await p.sBA_Record.deleteMany({
        where: {
          school_id: { in: [school?.id, otherSchool?.id].filter(Boolean) },
        },
      });
      await p.school.deleteMany({
        where: { code: { in: ["SBA_TEST_A", "SBA_TEST_B"] } },
      });
      await p.$disconnect();
    }
  });
  it("allows the assigned subject/stream only and rejects forged school/teacher data", async () => {
    expect(
      (await req("/sba/record", teacher, payload(80, victor.id))).status,
    ).toBe(201);
    expect(
      (await req("/sba/record", teacher, payload(80, alice.id))).status,
    ).toBe(403);
    expect(
      (await req("/sba/record", teacher, payload(80, outsider.id))).status,
    ).toBe(403);
    expect(
      (
        await req("/sba/record", teacher, {
          ...payload(80, victor.id),
          subject: "Mathematics",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await req("/sba/record", teacher, {
          ...payload(80, victor.id),
          school_id: otherSchool.id,
        })
      ).status,
    ).toBe(403);
    expect(
      (await req("/sba/record", admin, payload(80, victor.id))).status,
    ).toBe(403);
  });
  it("rejects invalid scores and overwrites one logical record with an audit trail", async () => {
    for (const score of [-1, 101])
      expect(
        (await req("/sba/record", teacher, payload(score, victor.id))).status,
      ).toBe(400);
    const first: any = await (
      await req("/sba/record", teacher, payload(81, victor.id))
    ).json();
    const second: any = await (
      await req("/sba/record", teacher, payload(80, victor.id))
    ).json();
    expect(second.id).toBe(first.id);
    expect(
      await p.sBA_Record.count({
        where: { student_id: victor.id, grade_level: 11 },
      }),
    ).toBe(1);
    expect(
      await p.auditLog.count({
        where: { schoolId: school.id, action: "sba.score.recorded" },
      }),
    ).toBeGreaterThanOrEqual(3);
  });
  it("returns missing projection until all evidence is present", async () => {
    const r: any = await (await req(`/sba/student/${victor.id}`, admin)).json();
    expect(r.rows[0].projected).toBeNull();
    expect(r.rows[0].grade10_sba).toBeNull();
    await req("/sba/record", teacher, {
      ...payload(60, victor.id),
      grade_level: 10,
      academic_year: 2025,
    });
    await p.kjseaMockAttempt.create({
      data: {
        schoolId: school.id,
        studentId: victor.id,
        subject: "Aviation Technology",
        seed: 1,
        status: "SUBMITTED",
        source: "BANK",
        score: 36,
        completedAt: new Date(),
        coverage: {
          grade: "Grade 12",
          assessment: "TIMED_MOCK",
          totalMarks: 40,
        },
        questions: [{ id: "1", marks: 40 }],
      },
    });
    const complete: any = await (
      await req(`/sba/student/${victor.id}`, admin)
    ).json();
    expect(complete.rows[0]).toMatchObject({
      grade10_sba: 60,
      grade11_sba: 80,
      kcbe_mock: 90,
      projected: 84,
      predicted_grade: "A",
    });
  });
  it("keeps school reports/CSV tenant-scoped and filters the exact stream", async () => {
    const all: any = await (
      await req(`/sba/school/${school.id}`, admin)
    ).json();
    expect(all.rows.map((r: any) => r.student_id).sort()).toEqual(
      [victor.id, alice.id].sort(),
    );
    expect(all.summary).toMatchObject({
      complete: 1,
      average_projected: 84,
      top_performers: 1,
    });
    expect((await req(`/sba/school/${school.id}`, otherAdmin)).status).toBe(
      403,
    );
    expect((await req(`/sba/school/${school.id}`, teacher)).status).toBe(403);
    const response = await req(
      `/sba/school/${school.id}/export?stream=1B`,
      admin,
    );
    expect(response.headers.get("content-type")).toContain("text/csv");
    const csv = await response.text();
    expect(csv).toContain("Victor SBA fixture");
    expect(csv).not.toContain("Alice SBA fixture");
    expect(csv).not.toContain("Other school fixture");
    expect(csv).toContain("84");
  });
  it("teacher scorebook is class-specific, forbids direct Alice access and revokes immediately", async () => {
    const r: any = await (
      await req(`/sba/teaching/${teachingClass.id}`, teacher)
    ).json();
    expect(r.rows.map((s: any) => s.student_id)).toEqual([victor.id]);
    expect((await req(`/sba/student/${alice.id}`, teacher)).status).toBe(403);
    await p.teacherAssignment.delete({ where: { id: teachingClass.id } });
    expect(
      (await req("/sba/record", teacher, payload(85, victor.id))).status,
    ).toBe(403);
  });
});
