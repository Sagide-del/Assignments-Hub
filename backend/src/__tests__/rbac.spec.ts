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
import { UsersController } from "../users/users.controller";
import { UsersService } from "../users/users.service";
import { UsersImportService } from "../users/users-import.service";
import { SubmissionsController } from "../submissions/submissions.controller";
import { SubmissionsService } from "../submissions/submissions.service";
import { SbaEvidenceController } from "../sba-evidence/sba-evidence.controller";
import { SbaEvidenceService } from "../sba-evidence/sba-evidence.service";
import { assignmentStream } from "../teacher-scope/scope";
import { Role } from "../common/enums/role.enum";

const run = process.env.RBAC_TEST_DATABASE_URL ? describe : describe.skip;
run("Teacher stream RBAC (real PostgreSQL + JWT + HTTP)", () => {
  let p: PrismaClient, app: INestApplication, base: string;
  let a: any,
    b: any,
    a1: any,
    a2: any,
    b1: any,
    teacher: any,
    admin: any,
    platform: any,
    alice: any,
    bob: any,
    outsider: any,
    wrongGrade: any;
  let own: any, other: any, subIn: any, subOut: any;
  const secret = "isolated-rbac-test-signing-secret";
  const token = (u: any) =>
    new JwtService({ secret }).sign({
      sub: u.id,
      schoolId: u.schoolId,
      role: u.role,
    });
  const request = (path: string, u: any, method = "GET", body?: unknown) =>
    fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token(u)}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const student = (
    schoolId: number,
    name: string,
    stream: string,
    grade = "Grade 11",
  ) =>
    p.user.create({
      data: {
        schoolId,
        name,
        role: "STUDENT",
        grade,
        studentProfile: { create: { stream, grade } },
      },
    });
  beforeAll(async () => {
    const url = new URL(process.env.RBAC_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/rbac_test")
      throw Error("Use disposable localhost rbac_test only.");
    p = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await p.$connect();
    await p.school.deleteMany({
      where: { code: { in: ["RBAC_A", "RBAC_B"] } },
    });
    a = await p.school.create({
      data: { name: "RBAC School A", code: "RBAC_A" },
    });
    b = await p.school.create({
      data: { name: "RBAC School B", code: "RBAC_B" },
    });
    a1 = await p.stream.create({
      data: { school_id: a.id, grade: "Grade 11", name: "1A" },
    });
    a2 = await p.stream.create({
      data: { school_id: a.id, grade: "Grade 11", name: "1B" },
    });
    b1 = await p.stream.create({
      data: { school_id: b.id, grade: "Grade 11", name: "1A" },
    });
    teacher = await p.user.create({
      data: { schoolId: a.id, role: "TEACHER", name: "Aviation Teacher" },
    });
    admin = await p.user.create({
      data: { schoolId: a.id, role: "SCHOOL_ADMIN", name: "School A Admin" },
    });
    platform = await p.user.create({
      data: { schoolId: a.id, role: "PLATFORM_ADMIN", name: "Platform Admin" },
    });
    alice = await student(a.id, "Learner in 1A", "1A");
    bob = await student(a.id, "Learner in 1B", "1B");
    outsider = await student(b.id, "Other school 1A", "1A");
    wrongGrade = await student(
      a.id,
      "Grade 10 same stream name",
      "1B",
      "Grade 10",
    );
    own = await p.assignment.create({
      data: {
        schoolId: a.id,
        createdById: teacher.id,
        title: "Aviation test",
        subject: "Aviation Technology",
        grade: "Grade 11",
        targetStream: "1B",
      },
    });
    other = await p.assignment.create({
      data: {
        schoolId: a.id,
        createdById: admin.id,
        title: "Another teacher",
        subject: "Aviation Technology",
        grade: "Grade 11",
        targetStream: "1A",
      },
    });
    subIn = await p.submission.create({
      data: { assignmentId: own.id, studentId: bob.id, status: "SUBMITTED" },
    });
    subOut = await p.submission.create({
      data: { assignmentId: own.id, studentId: alice.id, status: "SUBMITTED" },
    });
    const batch = await p.academicResultBatch.create({
      data: {
        schoolId: a.id,
        uploadedById: admin.id,
        name: "Whole grade",
        academicYear: 2026,
        term: "3",
        grade: "Grade 11",
        fileName: "fixture.csv",
        errors: [{ name: "Learner in 1A" }],
      },
    });
    for (const learner of [alice, bob])
      for (const subject of ["Aviation Technology", "Mathematics"]) {
        await p.studentAcademicResult.create({
          data: {
            schoolId: a.id,
            batchId: batch.id,
            studentId: learner.id,
            subject,
            score: 70,
            maxScore: 100,
            percentage: 70,
          },
        });
        await p.studentSbaEvidence.create({
          data: {
            schoolId: a.id,
            studentId: learner.id,
            subject,
            title: "Practical work",
          },
        });
      }
    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: p }],
      exports: [PrismaService],
    })
    class TestDatabase {}
    @Module({
      imports: [TestDatabase, PassportModule, TeacherScopeModule],
      controllers: [
        UsersController,
        SubmissionsController,
        SbaEvidenceController,
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: secret }),
        },
        JwtStrategy,
        UsersService,
        { provide: UsersImportService, useValue: {} },
        {
          provide: SubmissionsService,
          useValue: new SubmissionsService(p as any, {} as any, {} as any),
        },
        {
          provide: SbaEvidenceService,
          useValue: new SbaEvidenceService(p as any, {} as any),
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
  beforeEach(async () => {
    await p.teacherAssignment.deleteMany({ where: { teacher_id: teacher.id } });
    await p.teacherAssignment.create({
      data: {
        teacher_id: teacher.id,
        school_id: a.id,
        subject: "Aviation Technology",
        stream_id: a2.id,
      },
    });
  });
  afterAll(async () => {
    await app?.close();
    if (p) {
      await p.school.deleteMany({
        where: { code: { in: ["RBAC_A", "RBAC_B"] } },
      });
      await p.$disconnect();
    }
  });
  it("returns ONLY assigned stream students in the same school and grade", async () => {
    const r = await request("/teacher/students", teacher);
    expect(r.status).toBe(200);
    expect((await r.json()).map((u: any) => u.id)).toEqual([bob.id]);
  });
  it("returns 403 with no assignments, including old user-list routes", async () => {
    await p.teacherAssignment.deleteMany({ where: { teacher_id: teacher.id } });
    expect((await request("/teacher/students", teacher)).status).toBe(403);
    expect((await request("/users", teacher)).status).toBe(403);
  });
  it("rejects forged stream/school query filters", async () => {
    for (const suffix of [
      "?stream=1A",
      `?stream_id=${b1.id}`,
      `?school_id=${b.id}`,
      `?schoolId=${b.id}`,
    ])
      expect(
        (await request("/teacher/students" + suffix, teacher)).status,
      ).toBe(403);
  });
  it("school admin sees all school A streams but never school B", async () => {
    const r = await request("/teacher/students", admin);
    expect(new Set((await r.json()).map((u: any) => u.id))).toEqual(
      new Set([alice.id, bob.id, wrongGrade.id]),
    );
    expect(
      (await request(`/teacher/students?schoolId=${b.id}`, admin)).status,
    ).toBe(403);
  });
  it("platform admin sees both schools and can filter explicitly", async () => {
    expect(
      (await (await request("/teacher/students", platform)).json()).map(
        (u: any) => u.id,
      ),
    ).toEqual(expect.arrayContaining([alice.id, bob.id, outsider.id]));
    expect(
      (
        await (
          await request(`/teacher/students?schoolId=${b.id}`, platform)
        ).json()
      ).map((u: any) => u.id),
    ).toEqual([outsider.id]);
  });
  it("scopes results and SBA by the exact subject-stream pair", async () => {
    for (const route of ["/teacher/results", "/teacher/sba", "/sba-evidence"]) {
      const r = await request(route, teacher);
      expect(r.status).toBe(200);
      const rows: any = await r.json();
      expect(rows.length).toBe(1);
      expect(rows[0]).toMatchObject({
        studentId: bob.id,
        subject: "Aviation Technology",
      });
    }
  });
  it("protects legacy list/detail and submission marking routes", async () => {
    const users: any = await (await request("/users", teacher)).json();
    expect(users.map((u: any) => u.id)).toEqual([bob.id]);
    expect((await request(`/users/${alice.id}`, teacher)).status).toBe(403);
    const rows: any = await (await request("/submissions", teacher)).json();
    expect(rows.map((s: any) => s.id)).toEqual([subIn.id]);
    expect((await request(`/submissions/${subOut.id}`, teacher)).status).toBe(
      403,
    );
  });
  it("returns only assignments authored by the teacher", async () => {
    const rows: any = await (
      await request("/teacher/assignments", teacher)
    ).json();
    expect(rows.map((a: any) => a.id)).toEqual([own.id]);
  });
  it("school admin can list, create, revoke and immediately lose teacher access", async () => {
    const listed: any = await (await request("/admin/teachers", admin)).json();
    expect(listed[0].teacherAssignments[0].stream.id).toBe(a2.id);
    const created = await request(
      `/admin/teachers/${teacher.id}/assignments`,
      admin,
      "POST",
      { subject: "Mathematics", stream_id: a1.id },
    );
    expect(created.status).toBe(201);
    expect(
      (
        await request(
          `/admin/teachers/${teacher.id}/assignments`,
          admin,
          "POST",
          { subject: "Physics", stream_id: b1.id },
        )
      ).status,
    ).toBe(404);
    const ids = await p.teacherAssignment.findMany({
      where: { teacher_id: teacher.id },
    });
    for (const row of ids)
      expect(
        (
          await request(
            `/admin/teachers/${teacher.id}/assignments/${row.id}`,
            admin,
            "DELETE",
          )
        ).status,
      ).toBe(200);
    expect((await request("/teacher/students", teacher)).status).toBe(403);
  });
  it("a teacher cannot manage access or bypass tenant FKs directly", async () => {
    expect(
      (
        await request(
          `/admin/teachers/${teacher.id}/assignments`,
          teacher,
          "POST",
          { subject: "Aviation Technology", stream_id: a1.id },
        )
      ).status,
    ).toBe(403);
    await expect(
      p.teacherAssignment.create({
        data: {
          teacher_id: teacher.id,
          school_id: a.id,
          stream_id: b1.id,
          subject: "Physics",
        },
      }),
    ).rejects.toThrow();
  });
  it("prevents cross-pair subject access and grade-wide publishing", async () => {
    await p.teacherAssignment.create({
      data: {
        teacher_id: teacher.id,
        school_id: a.id,
        subject: "Mathematics",
        stream_id: a1.id,
      },
    });
    const rows: any = await (await request("/teacher/results", teacher)).json();
    expect(rows).toHaveLength(2);
    expect(rows.map((r: any) => `${r.subject}:${r.studentId}`).sort()).toEqual(
      [`Aviation Technology:${bob.id}`, `Mathematics:${alice.id}`].sort(),
    );
    const actor = { id: teacher.id, schoolId: a.id, role: Role.TEACHER } as any;
    await expect(
      assignmentStream(p as any, actor, {
        grade: "Grade 11",
        subject: "Aviation Technology",
        targetStream: "1A",
      }),
    ).rejects.toThrow();
    expect(
      await assignmentStream(p as any, actor, {
        grade: "Grade 11",
        subject: "Aviation Technology",
      }),
    ).toBe("1B");
  });
  it("student routes retain their own profile/submission access", async () => {
    expect((await request(`/users/${bob.id}`, bob)).status).toBe(200);
    expect((await request(`/submissions/${subIn.id}`, bob)).status).toBe(200);
    expect((await request("/teacher/students", bob)).status).toBe(403);
  });
});
