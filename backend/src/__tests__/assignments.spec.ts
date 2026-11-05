import { PublicRevisionService } from "../cms/public-revision.service";
import "reflect-metadata";
import {
  Global,
  Module,
  INestApplication,
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
import { StudentCurriculumGuard } from "../student/student-curriculum.guard";
import { StudentCurriculumInterceptor } from "../student/student-curriculum.interceptor";
import { SubjectEnrollmentService } from "../student/subject-enrollment.service";
import { StudentScopeService } from "../student/student-scope.service";
import { StudentAssignmentsService } from "../student/assignments.service";
import { validateElectives } from "../student/assignment-subjects";
import { CmsController } from "../cms/cms.controller";
import { CmsService } from "../cms/cms.service";
import { UsersService } from "../users/users.service";
import { UsersImportService } from "../users/users-import.service";
import { PracticeController } from "../question-bank/practice.controller";
import { PracticeService } from "../question-bank/practice.service";
describe("Elective validation", () => {
  it("requires three distinct noncore subjects and normalizes subject aliases", () => {
    const catalogue = ["Biology", "Chemistry", "Computer Science"];
    expect(
      validateElectives(
        10,
        ["biology", "Chemistry", "Computer Studies"],
        catalogue,
      ),
    ).toEqual(catalogue);
    for (const value of [
      [],
      ["Biology", "Chemistry"],
      ["Biology", "Computer Science", "Computer Studies"],
      ["English", "Chemistry", "Biology"],
      ["Missing", "Chemistry", "Biology"],
    ])
      expect(() => validateElectives(10, value, catalogue)).toThrow();
  });
});
const integration = process.env.CMS_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("Authenticated subject-enrolled assignments", () => {
  let db: PrismaClient,
    app: INestApplication,
    base: string,
    school: any,
    foreign: any,
    pure: any,
    cross: any,
    junior: any,
    unset: any,
    track: any,
    pathway: any;
  const modules: any[] = [];
  const jwt = new JwtService({ secret: "elective-assignment-fixture" });
  const call = (path: string, user = pure, method = "GET", body?: any) =>
    fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: user.id, schoolId: user.schoolId, role: user.role, grade: "Grade 12" })}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  async function cleanup() {
    await db.masterModule.deleteMany({
      where: { topic: { startsWith: "Electives fixture " } },
    });
    await db.school.deleteMany({
      where: { code: { in: ["ELECTIVES_TEST_A", "ELECTIVES_TEST_B"] } },
    });
    await db.curriculumTaxonomy.deleteMany({
      where: { id: { startsWith: "electives-fixture-" } },
    });
    await db.pathway.deleteMany({ where: { key: "electives-fixture-stem" } });
  }
  beforeAll(async () => {
    const url = new URL(process.env.CMS_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/cms_publish_test")
      throw Error("Use disposable cms_publish_test database.");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await cleanup();
    school = await db.school.create({
      data: {
        code: "ELECTIVES_TEST_A",
        name: "Electives Test",
        subscriptionStatus: "ACTIVE",
      },
    });
    foreign = await db.school.create({
      data: {
        code: "ELECTIVES_TEST_B",
        name: "Other Electives Test",
        subscriptionStatus: "ACTIVE",
      },
    });
    pathway = await db.pathway.create({
      data: {
        key: "electives-fixture-stem",
        name: "STEM",
        description: "Fixture",
        icon: "atom",
      },
    });
    track = await db.track.create({
      data: {
        pathwayId: pathway.id,
        key: "pure-sciences",
        name: "Pure Sciences",
        description: "Fixture",
        icon: "atom",
        requiredSubjects: [],
        careers: [],
        skills: [],
        universitiesKenya: [],
        universitiesIntl: [],
      },
    });
    async function student(
      name: string,
      electives: string[],
      grade = "Grade 10",
    ) {
      return db.user.create({
        data: {
          schoolId: school.id,
          name,
          role: "STUDENT",
          grade,
          elective_subjects: electives,
          studentProfile: { create: { grade, stream: "10A", pathway: "STEM" } },
          pathwaySelections: {
            create: {
              schoolId: school.id,
              trackId: track.id,
              source: "MANUAL",
            },
          },
        },
      });
    }
    pure = await student("Pure science learner", [
      "Biology",
      "Chemistry",
      "Physics",
    ]);
    cross = await student("Cross track learner", [
      "Biology",
      "Chemistry",
      "Computer Science",
    ]);
    junior = await student("Junior learner", [], "Grade 8");
    unset = await student("No chosen electives", []);
    const subjects = [
      "English",
      "Kiswahili",
      "Core Mathematics",
      "Community Service Learning",
      "Biology",
      "Chemistry",
      "Physics",
      "Computer Science",
      "Business Studies",
      "History",
    ];
    for (const [i, subject] of subjects.entries()) {
      const science =
        subject === "Computer Science" ? "Applied Sciences" : "Pure Sciences";
      const p = ["History", "Business Studies"].includes(subject)
        ? "Social Sciences"
        : "STEM";
      const t = p === "Social Sciences" ? "Humanities" : science;
      await db.curriculumTaxonomy.create({
        data: {
          id: `electives-fixture-${i}`,
          level: "Senior School",
          grade: 10,
          pathway: p,
          track: t,
          subject,
          topics: ["Fixture"],
        },
      });
      modules.push(
        await db.masterModule.create({
          data: {
            level: "Senior School",
            grade: 10,
            pathway: p,
            track: t,
            subject,
            topic: `Electives fixture ${subject}`,
            status: "APPROVED",
            distributions: {create:{audience:"SCHOOL",school_id:String(school.id)}},
            tenant_id: String(school.id),
            content_json: {
              content_type: "ASSIGNMENT",
              questions: [
                {
                  question_text: `Practice ${subject}`,
                  options: ["One", "Two", "Three", "Four"],
                  correct_answer: "One",
                  explanation: "PRIVATE SOLUTION",
                },
              ],
            },
          },
        }),
      );
    }
    for (const [i, subject] of [
      "Integrated Science",
      "Pre-Technical Studies",
    ].entries()) {
      await db.curriculumTaxonomy.create({
        data: {
          id: `electives-fixture-junior-${i}`,
          level: "Junior School",
          grade: 8,
          subject,
          topics: ["Fixture"],
        },
      });
      await db.masterModule.create({
        data: {
          level: "Junior School",
          grade: 8,
          subject,
          topic: `Electives fixture junior ${subject}`,
          status: "APPROVED",
          distributions: {create:{audience:"PUBLIC_STORE"}},
          content_json: { questions: [] },
        },
      });
    }
    for (const [suffix, grade, tenant, status] of [
      ["wronggrade", 11, school.id, "PUBLISHED_SCHOOL"],
      ["foreign", 10, foreign.id, "PUBLISHED_SCHOOL"],
      ["draft", 10, school.id, "DRAFT"],
    ] as const)
      await db.masterModule.create({
        data: {
          level: "Senior School",
          grade,
          subject: "Biology",
          topic: `Electives fixture ${suffix}`,
          status: status === "PUBLISHED_SCHOOL" ? "APPROVED" : status,
          ...(status === "PUBLISHED_SCHOOL" ? {distributions:{create:{audience:"SCHOOL",school_id:String(tenant)}}} : {}),
          tenant_id: String(tenant),
          content_json: { questions: [] },
        },
      });
    const cms = new CmsService(db as any, {} as any);
    const practice = {
      subjects: async () => ({
        subjects: subjects.map((subject) => ({ subject })),
        active: [],
        completed: [],
      }),
      start: async () => ({ id: "allowed" }),
    };
    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: db }],
      exports: [PrismaService],
    })
    class DbModule {}
    @Module({
      imports: [DbModule, PassportModule, StudentModule],
      controllers: [CmsController, PracticeController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: "elective-assignment-fixture",
          }),
        },
        { provide: CmsService, useValue: cms },
        { provide: PublicRevisionService, useValue: {} },
        { provide: PracticeService, useValue: practice },
      ],
    })
    class Fixture {}
    app = await NestFactory.create(Fixture, { logger: false });
    const r = app.get(Reflector);
    app.useGlobalGuards(
      new JwtAuthGuard(r),
      new RolesGuard(r),
      new TenantGuard(),
      new StudentCurriculumGuard(app.get(StudentScopeService)),
    );
    app.useGlobalInterceptors(
      new StudentCurriculumInterceptor(app.get(StudentScopeService)),
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
  it("returns exactly four cores and the three chosen sciences without private solutions", async () => {
    const r = await call("/student/assignments");
    expect(r.status).toBe(200);
    const rows: any = await r.json();
    expect(rows.map((m: any) => m.subject).sort()).toEqual(
      [
        "English",
        "Kiswahili",
        "Core Mathematics",
        "Community Service Learning",
        "Biology",
        "Chemistry",
        "Physics",
      ].sort(),
    );
    expect(JSON.stringify(rows)).not.toContain("PRIVATE SOLUTION");
    expect(rows.every((m: any) => m.grade === 10)).toBe(true);
    const helper = app.get(StudentAssignmentsService);
    expect(await helper.getStudentSubjects(pure.id, school.id)).toEqual([
      "English",
      "Kiswahili",
      "Core Mathematics",
      "Community Service Learning",
      "Biology",
      "Chemistry",
      "Physics",
    ]);
  });
  it("allows an explicit Applied Sciences elective and denies unselected Physics on direct module routes", async () => {
    const rows: any = await (await call("/student/assignments", cross)).json();
    expect(rows.map((m: any) => m.subject)).toContain("Computer Science");
    expect(rows.map((m: any) => m.subject)).not.toContain("Physics");
    expect(
      (await call(`/cms/learning/${modules[6].id}/start`, cross, "POST", {}))
        .status,
    ).toBe(403);
    const opened = await call(
      `/cms/learning/${modules[7].id}/start`,
      cross,
      "POST",
      {},
    );
    expect(opened.status).toBe(201);
    const catalogue: any = await (await call("/cms/learning", cross)).json();
    expect(catalogue.map((m: any) => m.subject)).toContain("Computer Science");
    expect(catalogue.map((m: any) => m.subject)).not.toContain("Physics");
    expect(
      (await call("/practice", cross, "POST", { subject: "Physics" })).status,
    ).toBe(403);
    expect(
      (await call("/practice", cross, "POST", { subject: "Computer Science" }))
        .status,
    ).toBe(201);
  });
  it("keeps Grade 8 grade-specific and does not infer electives for existing senior learners", async () => {
    const rows: any = await (await call("/student/assignments", junior)).json();
    expect(rows.map((m: any) => m.subject).sort()).toEqual([
      "Integrated Science",
      "Pre-Technical Studies",
    ]);
    const defaults: any = await (
      await call("/student/assignments", unset)
    ).json();
    expect(defaults).toEqual([]);
  });
  it("stores validated subject choices on the authenticated learner only and changes the next assignment response", async () => {
    expect(
      (
        await call("/student/subjects", pure, "POST", {
          elective_subjects: ["Biology", "Chemistry", "Computer Studies"],
          track_id: track.id,
          student_id: cross.id,
        })
      ).status,
    ).toBe(201);
    const saved = await db.user.findUniqueOrThrow({ where: { id: pure.id } });
    expect(saved.elective_subjects).toEqual([
      "Biology",
      "Chemistry",
      "Computer Science",
    ]);
    expect(
      (
        await call("/student/subjects", pure, "POST", {
          elective_subjects: ["English", "Chemistry", "Physics"],
          track_id: track.id,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call("/student/subjects", pure, "POST", {
          elective_subjects: ["Biology", "Chemistry", "History"],
          track_id: 99999999,
        })
      ).status,
    ).toBe(400);
  });
  it("reports the learner's own progress and due date without mixing another learner's submission",async()=>{
    const due=new Date("2030-02-01T10:00:00.000Z");
    const paper=await db.assignment.create({data:{schoolId:school.id,title:"Elective progress fixture",grade:"Grade 10",subject:"Biology",isPublished:true,targetStream:"10A",dueDate:due,rawJson:{cms_module_id:modules[4].id}}});
    const progress=await db.submission.create({data:{assignmentId:paper.id,studentId:pure.id,status:"DRAFT"}});
    const rows:any=await (await call("/student/assignments",pure)).json();const biology=rows.find((m:any)=>m.id===modules[4].id);expect(biology.state).toBe("IN_PROGRESS");expect(biology.due_date).toBe(due.toISOString());
    const other:any=await (await call("/student/assignments",cross)).json();expect(other.find((m:any)=>m.id===modules[4].id).state).toBe("TO_START");
    await db.submission.update({where:{id:progress.id},data:{status:"SUBMITTED",completedAt:new Date(),resultsReleasedAt:new Date()}});
    const final:any=await (await call("/student/assignments",pure)).json();expect(final.find((m:any)=>m.id===modules[4].id)).toMatchObject({state:"COMPLETED",results_released:true});
  });
  it("imports senior CSV choices and rejects missing or unknown electives in preview before creating accounts", async () => {
    const importer = new UsersImportService(
      new UsersService(db as any),
      db as any,
    );
    const actor = {
      id: pure.id,
      schoolId: school.id,
      role: "SCHOOL_ADMIN",
    } as any;
    const csv =
      "Name,Admission Number,Grade,Pathway,Track,Elective Subjects\nImported learner,000CSV10,Grade 10,STEM,Pure Sciences,Biology;Chemistry;Computer Science\n";
    const preview = await importer.previewStudentsFromExcel(
      Buffer.from(csv),
      actor,
    );
    expect(preview.preview.valid).toBe(1);
    const result = await importer.importStudentsFromExcel(
      Buffer.from(csv),
      actor,
    );
    expect(result.summary.created).toBe(1);
    const imported = await db.user.findUniqueOrThrow({
      where: {
        schoolId_admissionNumber: {
          schoolId: school.id,
          admissionNumber: "000CSV10",
        },
      },
    });
    expect(imported.elective_subjects).toEqual([
      "Biology",
      "Chemistry",
      "Computer Science",
    ]);
    const invalid = await importer.previewStudentsFromExcel(
      Buffer.from(
        csv
          .replace("000CSV10", "BADCSV10")
          .replace(
            "Biology;Chemistry;Computer Science",
            "Biology;Unknown;Physics",
          ),
      ),
      actor,
    );
    expect(invalid.preview.valid).toBe(0);
    expect(invalid.errors[0].message).toContain("not available");
  });
});
