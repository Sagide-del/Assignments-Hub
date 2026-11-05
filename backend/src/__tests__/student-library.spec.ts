import "reflect-metadata";
import { Global, INestApplication, Module } from "@nestjs/common";
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
import { librarySheetHtml } from "../student/library-pdf.service";
const sheet = () => ({
  key_concepts: [
    "Balance each side.",
    "Apply equal operations.",
    "Check your solution.",
  ],
  key_formulas: ["x=\\frac{8}{2}"],
  common_mistakes: [
    "Preserve negative signs.",
    "Do not change only one side.",
    "Always verify the result.",
  ],
  concept_diagram: {
    type: "TIKZ_CODE",
    latex_code:
      "\\begin{tikzpicture}\\node (a) at (1,3) {Balance};\\node (b) at (5,3) {Solve};\\draw[->] (a) -- (b);\\end{tikzpicture}",
  },
});
describe("Library PDF content", () => {
  it("renders branded formulas and inert diagrams while escaping user text", () => {
    const html = librarySheetHtml(
      {
        topic: "<script>bad()</script>",
        subject: "Mathematics",
        grade: 11,
        batch_number: 2,
      },
      sheet(),
      "data:image/png;base64,AA",
      "",
    );
    expect(html).toContain("&lt;script&gt;bad()&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain('class="katex"');
    expect(html).toContain("Common mistakes");
    expect(html).toContain("assignmenthub.co.ke");
    expect(html).toContain("<svg");
  });
});
const integration = process.env.CMS_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("Authenticated student library and PDF delivery", () => {
  let db: PrismaClient,
    app: INestApplication,
    base: string,
    school: any,
    other: any,
    student: any,
    staff: any,
    visible: any,
    hidden: any;
  const jwt = new JwtService({ secret: "library-fixture-secret" });
  const call = (path: string, user = student) =>
    fetch(base + path, {
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: user.id, schoolId: user.schoolId, role: user.role })}`,
      },
    });
  async function cleanup() {
    await db.moduleAssignment.deleteMany({
      where: { module: { topic: { startsWith: "Library Fixture " } } },
    });
    await db.masterModule.deleteMany({
      where: { topic: { startsWith: "Library Fixture " } },
    });
    await db.school.deleteMany({
      where: { code: { in: ["LIBRARY_TEST_A", "LIBRARY_TEST_B"] } },
    });
  }
  beforeAll(async () => {
    const url = new URL(process.env.CMS_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/cms_publish_test")
      throw Error("Use disposable cms_publish_test database.");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await cleanup();
    school = await db.school.create({
      data: {
        name: "Library Academy",
        code: "LIBRARY_TEST_A",
        subscriptionStatus: "ACTIVE",
      },
    });
    other = await db.school.create({
      data: {
        name: "Other Academy",
        code: "LIBRARY_TEST_B",
        subscriptionStatus: "ACTIVE",
      },
    });
    student = await db.user.create({
      data: {
        schoolId: school.id,
        name: "Library Learner",
        grade: "Grade 11",
        elective_subjects:["Biology","Chemistry","Physics"],
        role: "STUDENT",
      },
    });
    staff = await db.user.create({
      data: { schoolId: school.id, name: "Admin", role: "SCHOOL_ADMIN" },
    });
    await db.studentProfile.create({
      data: { userId: student.id, stream: "1B" },
    });
    const make = (
      topic: string,
      grade = 11,
      tenant = school.id,
      status: any = "PUBLISHED_SCHOOL",
      subject = "Mathematics",
      pathway: string | null = null,
      track: string | null = null,
    ) =>
      db.masterModule.create({
        data: {
          level: "Senior School",
          grade,
          subject,
          topic,
          status: ["PUBLISHED_SCHOOL","PUBLISHED_STORE"].includes(status) ? "APPROVED" : status,
          ...(["PUBLISHED_SCHOOL","PUBLISHED_STORE"].includes(status) ? {distributions:{create:{audience:status === "PUBLISHED_STORE" ? "PUBLIC_STORE" : "SCHOOL",school_id:status === "PUBLISHED_STORE" ? null : String(tenant)}}} : {}),
          tenant_id: status === "PUBLISHED_STORE" ? null : String(tenant),
          pathway,
          track,
          theory_cheatsheet: sheet(),
          content_json: {
            questions: [
              {
                question_text: "Secret question",
                correct_answer: "PRIVATE_ANSWER",
                explanation: "Private explanation",
              },
            ],
          },
        },
      });
    visible = await make("Library Fixture Algebra");
    await make("Library Fixture Algebra");
    hidden = await make("Library Fixture Foreign", 11, other.id);
    await make("Library Fixture Grade12", 12);
    await make("Library Fixture Draft", 11, school.id, "DRAFT");
    await make(
      "Library Fixture History",
      11,
      school.id,
      "PUBLISHED_SCHOOL",
      "History",
      "Social Sciences",
      "Humanities",
    );
    const stream = await make("Library Fixture OtherStream");
    await db.contentDistribution.updateMany({where:{module_id:stream.id},data:{stream_id:"1A"}});
    await make("Library Fixture Public", 11, school.id, "PUBLISHED_STORE");
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
          useValue: new ConfigService({ JWT_SECRET: "library-fixture-secret" }),
        },
      ],
    })
    class Fixture {}
    app = await NestFactory.create(Fixture, { logger: false });
    const r = app.get(Reflector);
    app.useGlobalGuards(
      new JwtAuthGuard(r),
      new RolesGuard(r),
      new TenantGuard(),
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
  it("groups only eligible published modules by subject and topic and keeps batches separate", async () => {
    const response = await call("/library?grouped=true");
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.subjects).toHaveLength(1);
    expect(body.subjects[0].subject).toBe("Mathematics");
    expect(body.subjects[0].topics.map((t: any) => t.topic)).toEqual([
      "Library Fixture Algebra",
      "Library Fixture Public",
    ]);
    expect(
      body.subjects[0].topics[0].modules.map((m: any) => m.batch_number),
    ).toEqual([1, 2]);
    expect(body.subjects[0].topics[0].modules[0].has_cheatsheet).toBe(true);
    expect(JSON.stringify(body)).not.toContain("PRIVATE_ANSWER");
    expect(JSON.stringify(body)).not.toContain("Secret question");
  });
  it("previews cheat sheets without questions and denies foreign modules, staff and anonymous access", async () => {
    const r = await call(`/library/modules/${visible.id}`);
    expect(r.status).toBe(200);
    const body: any = await r.json();
    expect(body.theory_cheatsheet).toEqual(sheet());
    expect(body).not.toHaveProperty("content_json");
    expect(await (await call(`/library/modules/${hidden.id}`)).status).toBe(
      403,
    );
    expect((await call("/library?grouped=true", staff)).status).toBe(403);
    expect((await fetch(base + "/library?grouped=true")).status).toBe(401);
    expect(
      (await call(`/library/modules/${hidden.id}/cheatsheet.pdf`)).status,
    ).toBe(403);
  });
  it("downloads an actual private branded PDF and denies access after unpublishing", async () => {
    const r = await call(`/library/modules/${visible.id}/cheatsheet.pdf`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/pdf");
    expect(r.headers.get("cache-control")).toContain("no-store");
    const bytes = Buffer.from(await r.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(5000);
    await db.masterModule.update({
      where: { id: visible.id },
      data: { status: "ARCHIVED" },
    });
    expect((await call(`/library/modules/${visible.id}`)).status).toBe(403);
  }, 60000);
});
