import { PracticeController } from "../question-bank/practice.controller";
import { PracticeService } from "../question-bank/practice.service";
import "reflect-metadata";
import {
  Global,
  Module,
  ValidationPipe,
  INestApplication,
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
import { TeacherScopeGuard } from "../teacher-scope/teacher-scope.guard";
import { StudentModule } from "../student/student.module";
import { StudentScopeService } from "../student/student-scope.service";
import {
  StudentCurriculumGuard,
  scopeRoute,
} from "../student/student-curriculum.guard";
import { StudentCurriculumInterceptor } from "../student/student-curriculum.interceptor";
import {
  StudentScope,
  contentMatches,
  labContent,
  skillContent,
} from "../student/student-scope.policy";
import { AssignmentsController } from "../assignments/assignments.controller";
import { AssignmentsService } from "../assignments/assignments.service";
import { SubmissionsService } from "../submissions/submissions.service";
import { LabsController } from "../labs/labs.controller";
import { LabsService } from "../labs/labs.service";
import { SkillsController } from "../skills/skills.controller";
import { SkillsService } from "../skills/skills.service";
import { SmsService } from "../sms/sms.service";
import { AiProviderRouterService } from "../ai/ai-provider-router.service";
import { CmsController } from "../cms/cms.controller";
import { CmsService } from "../cms/cms.service";
import { KjseaController } from "../kjsea/kjsea.controller";
import { KjseaService } from "../kjsea/kjsea.service";
const scope: StudentScope = {
  student_id: 1,
  school_id: 1,
  grade: 10,
  pathway: "STEM",
  track: "Technical and Engineering",
  stream: "1B",
  className: null,
  subjects: [
    "Mathematics",
    "Physics",
    "Aviation Technology",
    "Electrical Technology",
    "Building Construction",
  ],
};
describe("Student curriculum policy", () => {
  it("requires the exact grade, permits null/shared metadata and rejects other tracks/pathways", () => {
    expect(
      contentMatches(scope, {
        grade: 10,
        subject: "Aviation Technology",
        pathway: "STEM",
        track: "Technical and Engineering",
      }),
    ).toBe(true);
    expect(
      contentMatches(scope, {
        grade: "Grade 10",
        subject: "Math",
        pathway: null,
        track: null,
      }),
    ).toBe(true);
    for (const c of [
      { grade: 12, subject: "Mathematics" },
      { grade: 10, subject: "Physics", pathway: "Social Sciences" },
      { grade: 10, subject: "Physics", track: "Pure Sciences" },
      { grade: 10, subject: "Hair Dressing" },
      { grade: 10, subject: "History and Citizenship" },
    ])
      expect(contentMatches(scope, c)).toBe(false);
  });
  it("adapts legacy lab track labels and explicitly mapped foundation courses", () => {
    expect(
      contentMatches(
        scope,
        labContent({
          grade: "Grade 10",
          subject: "Electrical Technology",
          pathway: "Technical Studies",
        }),
      ),
    ).toBe(true);
    expect(
      contentMatches(
        scope,
        labContent({
          grade: "Grade 10",
          subject: "Physics",
          pathway: "Pure Sciences",
        }),
      ),
    ).toBe(false);
    expect(
      contentMatches(
        scope,
        skillContent(
          {
            title: "Solar Energy Systems Foundations",
            provider: {
              name: "Assignment Hub Learning Studio",
              verified: true,
            },
          },
          scope,
        ),
      ),
    ).toBe(true);
    expect(
      contentMatches(
        scope,
        skillContent(
          {
            title: "Solar Energy Systems Foundations",
            provider: { name: "Another provider", verified: true },
          },
          scope,
        ),
      ),
    ).toBe(false);
    expect(
      contentMatches(
        scope,
        skillContent({ title: "Unclassified course" }, scope),
      ),
    ).toBe(false);
    expect(
      contentMatches(
        scope,
        skillContent(
          {
            title: "Physics but actually hair dressing",
            courseStructure: {
              curriculum: {
                grade: 10,
                subject: "Hair Dressing",
                pathway: "STEM",
                track: "CTS",
              },
            },
          },
          scope,
        ),
      ),
    ).toBe(false);
  });
  it("maps legacy Arts/Sports tracks and keeps a Business specialization within Business subjects", async () => {
    const business = await new StudentScopeService({
      user: {
        findFirst: async () => ({
          id: 1,
          schoolId: 1,
          grade: "Grade 10",
          studentProfile: { pathway: "Social Sciences" },
          pathwaySelections: [
            {
              track: {
                name: "Business Studies",
                pathway: { name: "Social Sciences" },
              },
            },
          ],
        }),
      },
      curriculumTaxonomy: {
        findMany: async () => [
          {
            subject: "History and Citizenship",
            pathway: "Social Sciences",
            track: "Humanities",
          },
          {
            subject: "Business Studies",
            pathway: "Social Sciences",
            track: "Humanities",
          },
        ],
      },
    } as any).getStudentScope(1, 1);
    expect(business.subjects).toContain("Business Studies");
    expect(business.subjects).not.toContain("History and Citizenship");
    expect(
      contentMatches(business, {
        grade: 10,
        pathway: "Social Sciences",
        track: "Humanities",
        subject: "Business Studies",
      }),
    ).toBe(true);
    expect(
      contentMatches(
        {
          ...scope,
          pathway: "Arts & Sports",
          track: "Fine Arts",
          subjects: ["Fine Art"],
        },
        {
          grade: 10,
          pathway: "Arts and Sports Science",
          track: "Visual Arts",
          subject: "Fine Art",
        },
      ),
    ).toBe(true);
    expect(
      contentMatches(
        {
          ...scope,
          pathway: "Arts & Sports",
          track: "Sports",
          subjects: ["Human Physiology, Anatomy and Nutrition"],
        },
        {
          grade: 10,
          pathway: "Arts and Sports Science",
          track: "Sports Science",
          subject: "Human Physiology, Anatomy and Nutrition",
        },
      ),
    ).toBe(true);
  });
  it("does not apply a senior pathway to junior content; missing senior track never unlocks an elective", () => {
    const junior = {
      ...scope,
      grade: 8,
      pathway: null,
      track: null,
      subjects: ["Integrated Science", "Pre-Technical Studies"],
    };
    expect(
      contentMatches(junior, { grade: 8, subject: "Integrated Science" }),
    ).toBe(true);
    expect(
      contentMatches(junior, { grade: 12, subject: "Integrated Science" }),
    ).toBe(false);
    expect(
      contentMatches(
        { ...scope, pathway: null, track: null },
        {
          grade: 10,
          subject: "Aviation Technology",
          track: "Technical and Engineering",
        },
      ),
    ).toBe(false);
  });
  it("covers existing student write paths as well as catalogues without touching staff CMS routes", () => {
    expect(scopeRoute("CmsController", "startLearning")).toBe("module");
    expect(scopeRoute("CmsController", "publishModule")).toBeNull();
    expect(scopeRoute("SkillsController", "completeLesson")).toBe("skill");
    expect(scopeRoute("PracticeController", "start")).toBe("coachStart");
    expect(scopeRoute("SubmissionsController", "results")).toBe("submission");
  });
});
const integration = process.env.RBAC_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration(
  "Student filtering through real PostgreSQL, JWT and existing controllers",
  () => {
    let db: PrismaClient,
      app: INestApplication,
      base: string,
      school: any,
      other: any,
      tech: any,
      pure: any,
      junior: any,
      unset: any,
      admin: any,
      pathway: any;
    let category: any, provider: any, course: any, lab: any, wrongLab: any;
    let assignments: any[] = [];
    let ids: string[] = [];
    const jwt = new JwtService({ secret: "isolated-filtering-secret" });
    const mockCreate = jest.fn().mockResolvedValue({});
    const call = (path: string, user = tech, method = "GET", body?: unknown) =>
      fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${jwt.sign({ sub: user.id, schoolId: user.schoolId, role: user.role, grade: "Grade 12" })}`,
          "Content-Type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    const data = (path: string, user = tech) =>
      call(path, user).then((r) => {
        expect(r.status).toBe(200);
        return r.json() as Promise<any[]>;
      });
    async function clean() {
      const schools = await db.school.findMany({
        where: { code: { in: ["FILTERING_TEST_A", "FILTERING_TEST_B"] } },
      });
      const schoolIds = schools.map((s) => s.id);
      await db.masterModule.deleteMany({ where: { id: { in: ids } } });
      await db.school.deleteMany({ where: { id: { in: schoolIds } } });
      await db.lab.deleteMany({
        where: { key: { startsWith: "filtering-test-" } },
      });
      await db.skillCourse.deleteMany({
        where: { category: { name: "Filtering Test Skills" } },
      });
      await db.skillCategory.deleteMany({
        where: { name: "Filtering Test Skills" },
      });
      await db.skillProvider.deleteMany({
        where: { name: "Filtering Test Provider" },
      });
      await db.curriculumTaxonomy.deleteMany({
        where: { id: { startsWith: "filtering-test-" } },
      });
      await db.pathway.deleteMany({ where: { key: "filtering-test-stem" } });
    }
    beforeAll(async () => {
      const url = new URL(process.env.RBAC_TEST_DATABASE_URL!);
      if (url.hostname !== "127.0.0.1" || url.pathname !== "/rbac_test")
        throw Error("Use isolated localhost rbac_test only.");
      db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
      await clean();
      school = await db.school.create({
        data: {
          name: "Filtering Test Academy",
          code: "FILTERING_TEST_A",
          subscriptionStatus: "ACTIVE",
        },
      });
      other = await db.school.create({
        data: {
          name: "Other Filtering Academy",
          code: "FILTERING_TEST_B",
          subscriptionStatus: "ACTIVE",
        },
      });
      pathway = await db.pathway.create({
        data: {
          key: "filtering-test-stem",
          name: "STEM",
          description: "fixture",
          icon: "Atom",
        },
      });
      const tracks = [];
      for (const [key, name] of [
        ["technical", "Technical and Engineering"],
        ["pure", "Pure Sciences"],
        ["cts", "Career and Technology Studies (CTS)"],
      ])
        tracks.push(
          await db.track.create({
            data: {
              pathwayId: pathway.id,
              key,
              name,
              description: "fixture",
              icon: "Atom",
              requiredSubjects: [],
              careers: [],
              skills: [],
              universitiesKenya: [],
              universitiesIntl: [],
            },
          }),
        );
      tech = await db.user.create({
        data: {
          schoolId: school.id,
          name: "Technical Student",
          role: "STUDENT",
          grade: "Grade 10",
          studentProfile: { create: { stream: "1B", pathway: "STEM" } },
        },
      });
      pure = await db.user.create({
        data: {
          schoolId: school.id,
          name: "Pure Sciences Student",
          role: "STUDENT",
          grade: "Grade 10",
        },
      });
      junior = await db.user.create({
        data: {
          schoolId: school.id,
          name: "Junior Student",
          role: "STUDENT",
          grade: "Grade 8",
        },
      });
      unset = await db.user.create({
        data: {
          schoolId: school.id,
          name: "Unset Track Student",
          role: "STUDENT",
          grade: "Grade 10",
        },
      });
      admin = await db.user.create({
        data: { schoolId: school.id, name: "Principal", role: "SCHOOL_ADMIN" },
      });
      for (const [student, track] of [
        [tech, tracks[0]],
        [pure, tracks[1]],
        [junior, tracks[0]],
      ])
        await db.studentPathwaySelection.create({
          data: {
            schoolId: school.id,
            studentId: student.id,
            trackId: track.id,
          },
        });
      const entries = [
        ["Aviation Technology", "Technical and Engineering", 10],
        ["Electrical Technology", "Technical and Engineering", 10],
        ["Mathematics", "Pure Sciences", 10],
        ["Physics", "Pure Sciences", 10],
        ["Chemistry", "Pure Sciences", 10],
        ["Biology", "Pure Sciences", 10],
        ["Hair Dressing", "Career and Technology Studies (CTS)", 10],
        ["Integrated Science", null, 8],
        ["Pre-Technical Studies", null, 8],
      ] as const;
      for (const [i, [subject, track, grade]] of entries.entries()) {
        await db.curriculumTaxonomy.create({
          data: {
            id: `filtering-test-${i}`,
            level: grade < 10 ? "Junior School" : "Senior School",
            grade,
            pathway: grade < 10 ? null : "STEM",
            track,
            subject,
            topics: ["Test topic"],
          },
        });
        assignments.push(
          await db.assignment.create({
            data: {
              schoolId: school.id,
              title: `${subject} test`,
              grade: `Grade ${grade}`,
              subject,
            },
          }),
        );
      }
      lab = await db.lab.create({
        data: {
          key: "filtering-test-aviation",
          title: "Flight Lab",
          subject: "Aviation Technology",
          grade: "Grade 10",
          pathway: "Technical and Engineering",
        },
      });
      wrongLab = await db.lab.create({
        data: {
          key: "filtering-test-biology",
          title: "Cells Lab",
          subject: "Biology",
          grade: "Grade 10",
          pathway: "Pure Sciences",
        },
      });
      category = await db.skillCategory.create({
        data: { name: "Filtering Test Skills", status: "PUBLISHED" },
      });
      provider = await db.skillProvider.create({
        data: { name: "Filtering Test Provider", status: "PUBLISHED" },
      });
      course = await db.skillCourse.create({
        data: {
          title: "Flight Skills",
          categoryId: category.id,
          providerId: provider.id,
          shortDescription: "Test",
          fullDescription: "Test",
          durationWeeks: 2,
          level: "BEGINNER",
          costKES: 0,
          status: "PUBLISHED",
          courseStructure: {
            curriculum: {
              grade: 10,
              pathway: "STEM",
              track: "Technical and Engineering",
              subject: "Aviation Technology",
            },
          },
        },
      });
      for (const [n, subject, track, grade, tenant] of [
        [1, "Aviation Technology", "Technical and Engineering", 10, school.id],
        [2, "Biology", "Pure Sciences", 10, school.id],
        [3, "Aviation Technology", "Technical and Engineering", 12, school.id],
        [4, "Aviation Technology", "Technical and Engineering", 10, other.id],
      ] as any[]) {
        const id = `ae420311-7266-4a1f-9091-00000000010${n}`;
        ids.push(id);
        await db.masterModule.create({
          data: {
            id,
            level: "Senior School",
            grade,
            pathway: "STEM",
            track,
            subject,
            topic: "Test topic",
            status: "PUBLISHED_SCHOOL",
            tenant_id: String(tenant),
            content_json: {
              content_type: "ASSIGNMENT",
              questions: [],
              theory_text: "Private theory",
            },
          },
        });
      }
      @Global()
      @Module({
        providers: [{ provide: PrismaService, useValue: db }],
        exports: [PrismaService],
      })
      class DbModule {}
      @Module({
        imports: [DbModule, PassportModule, StudentModule],
        controllers: [
          PracticeController,
          AssignmentsController,
          LabsController,
          SkillsController,
          CmsController,
          KjseaController,
        ],
        providers: [
          JwtStrategy,
          TeacherScopeGuard,
          LabsService,
          SkillsService,
          CmsService,
          {
            provide: ConfigService,
            useValue: new ConfigService({
              JWT_SECRET: "isolated-filtering-secret",
            }),
          },
          {
            provide: AiProviderRouterService,
            useValue: { generateAssignment: jest.fn() },
          },
          { provide: SmsService, useValue: {} },
          {
            provide: AssignmentsService,
            useValue: {
              findAll: () =>
                db.assignment.findMany({ where: { schoolId: school.id } }),
              findOne: (id: number) =>
                db.assignment.findUnique({ where: { id } }),
              findQuestions: (id: number) => ({ id }),
            },
          },
          { provide: SubmissionsService, useValue: {} },
          {
            provide: PracticeService,
            useValue: {
              subjects: () => ({
                grade: "Grade 10",
                subjects: entries.map(([subject]) => ({ subject })),
                active: entries.map(([subject, , grade]) => ({
                  subject,
                  coverage: { grade: `Grade ${grade}` },
                })),
                completed: [],
              }),
              start: jest.fn(),
            },
          },
          {
            provide: KjseaService,
            useValue: {
              subjects: () =>
                entries.map(([subject]) => ({ id: subject, subject })),
              create: mockCreate,
              list: () => [],
            },
          },
        ],
      })
      class Fixture {}
      app = await NestFactory.create(Fixture, { logger: false });
      const reflector = app.get(Reflector),
        scopes = app.get(StudentScopeService);
      app.useGlobalGuards(
        new JwtAuthGuard(reflector),
        new RolesGuard(reflector),
        new TenantGuard(),
        new StudentCurriculumGuard(scopes),
      );
      app.useGlobalInterceptors(new StudentCurriculumInterceptor(scopes));
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
    it("Technical students receive Aviation, Electrical, Math and Physics, never CTS or Pure Sciences electives", async () => {
      expect((await data("/assignments")).map((x) => x.subject).sort()).toEqual(
        [
          "Aviation Technology",
          "Electrical Technology",
          "Mathematics",
          "Physics",
        ].sort(),
      );
      expect(
        (await data("/kjsea/subjects")).map((x) => x.subject).sort(),
      ).toEqual(
        [
          "Aviation Technology",
          "Electrical Technology",
          "Mathematics",
          "Physics",
        ].sort(),
      );
    });
    it("filters nested assignment practice catalogues and rejects out-of-scope practice starts", async () => {
      const r = await call("/practice");
      expect(r.status).toBe(200);
      const body: any = await r.json();
      expect(body.subjects.map((x: any) => x.subject).sort()).toEqual(
        [
          "Aviation Technology",
          "Electrical Technology",
          "Mathematics",
          "Physics",
        ].sort(),
      );
      expect(body.active.map((x: any) => x.subject).sort()).toEqual(
        [
          "Aviation Technology",
          "Electrical Technology",
          "Mathematics",
          "Physics",
        ].sort(),
      );
      expect(
        (await call("/practice", tech, "POST", { subject: "Hair Dressing" }))
          .status,
      ).toBe(403);
    });
    it("Pure Sciences students receive Math, Physics, Chemistry and Biology only", async () => {
      expect(
        (await data("/assignments", pure)).map((x) => x.subject).sort(),
      ).toEqual(["Mathematics", "Physics", "Chemistry", "Biology"].sort());
    });
    it("Grade 8 ignores a stale senior selection and never receives senior content", async () => {
      expect(
        (await data("/assignments", junior)).map((x) => x.subject).sort(),
      ).toEqual(["Integrated Science", "Pre-Technical Studies"].sort());
      const s: any = await (
        await call("/student/content-scope", junior)
      ).json();
      expect(s.grade).toBe(8);
      expect(s.pathway).toBeNull();
      expect(s.track).toBeNull();
      expect(s.availability.csl).toBe(false);
    });
    it("blocks direct assignment, lab, CMS start and forged mock grade/subject requests with 403", async () => {
      const biology = assignments.find((x) => x.subject === "Biology");
      for (const path of [
        `/assignments/${biology.id}`,
        `/assignments/${biology.id}/questions`,
        `/labs/${wrongLab.id}`,
      ])
        expect((await call(path)).status).toBe(403);
      expect(
        (await call(`/cms/learning/${ids[1]}/start`, tech, "POST", {})).status,
      ).toBe(403);
      expect((await call("/kjsea/subjects?grade=Grade%2012")).status).toBe(403);
      expect(
        (
          await call("/kjsea/attempts", tech, "POST", {
            grade: "Grade 10",
            subject: "Hair Dressing",
          })
        ).status,
      ).toBe(403);
      expect(mockCreate).not.toHaveBeenCalled();
    });
    it("applies the same scope to existing and new module catalogues without exposing theory or answers", async () => {
      for (const path of [
        "/cms/learning",
        "/student/assignments",
        "/library",
      ]) {
        const rows = await data(path);
        expect(rows.map((x) => x.id)).toEqual([ids[0]]);
        expect(JSON.stringify(rows)).not.toContain("Private theory");
      }
      expect(await data("/student/skills")).toEqual([]);
    });
    it("provides real scoped availability counts and denies direct course/progress enrolment bypasses", async () => {
      const s: any = await (await call("/student/content-scope")).json();
      expect(s.availability).toEqual({ labs: 1, skills: 1, csl: true });
      expect((await data("/labs")).map((x) => x.id)).toEqual([lab.id]);
      expect((await data("/skills/courses")).map((x) => x.id)).toEqual([
        course.id,
      ]);
      for (const path of [
        `/skills/courses/${course.id}`,
        `/skills/courses/${course.id}/progress`,
      ])
        expect((await call(path, pure)).status).toBe(403);
      expect(
        (
          await call("/skills/enrollments", pure, "POST", {
            courseId: course.id,
          })
        ).status,
      ).toBe(403);
    });
    it("missing senior selection keeps shared core content visible and asks for setup", async () => {
      const s: any = await (await call("/student/content-scope", unset)).json();
      expect(s.setup_required).toBe(true);
      expect(s.track).toBeNull();
      expect((await data("/assignments", unset)).map((x) => x.subject)).toEqual(
        ["Mathematics"],
      );
    });
    it("never filters school admin responses and immediately honours a changed grade", async () => {
      expect((await data("/assignments", admin)).length).toBe(
        assignments.length,
      );
      await db.user.update({
        where: { id: tech.id },
        data: { grade: "Grade 8" },
      });
      expect((await data("/assignments")).map((x) => x.subject).sort()).toEqual(
        ["Integrated Science", "Pre-Technical Studies"].sort(),
      );
      await db.user.update({
        where: { id: tech.id },
        data: { grade: "Grade 10" },
      });
    });
  },
);
