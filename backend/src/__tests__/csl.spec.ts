import "reflect-metadata";
import { cslToday } from "../csl/csl.dto";
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
import sharp from "sharp";
import { PrismaService } from "../prisma/prisma.service";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { TeacherScopeModule } from "../teacher-scope/teacher-scope.module";
import { AiProviderRouterService } from "../ai/ai-provider-router.service";
import { CslController } from "../csl/csl.controller";
import { CslService } from "../csl/csl.service";
import { CslTaggingService, competencyTags } from "../csl/csl-tagging.service";
import { CslPhotoService } from "../csl/csl-photo.service";
import { CslPdfService, escapeHtml } from "../csl/csl-pdf.service";
import { SbaController } from "../sba/sba.controller";
import { SbaService } from "../sba/sba.service";
import { randomUUID } from "crypto";
describe("CSL competency and PDF safety", () => {
  it("uses the Kenyan activity date across the UTC day boundary", () => {
    expect(cslToday(new Date("2026-11-03T22:30:00Z"))).toBe("2026-11-04");
  });
  it("accepts only the allowed competencies and removes duplicates", () => {
    expect(
      competencyTags({
        competency_tags: ["Citizenship", "Self-efficacy", "Citizenship"],
      }),
    ).toEqual(["Citizenship", "Self-efficacy"]);
    expect(() =>
      competencyTags({ competency_tags: ["Exam eligibility"] }),
    ).toThrow();
    expect(() => competencyTags("Citizenship")).toThrow();
  });
  it("normalizes real evidence into private JPEG storage and rejects non-image files", async () => {
    const uploads = {
      uploadPrivate: jest.fn().mockResolvedValue({
        assetKey: "marketplace-private/csl/1/2/evidence.jpg",
      }),
    };
    const service = new CslPhotoService(
      new ConfigService({ AWS_S3_BUCKET: "fixture", AWS_REGION: "eu-west-2" }),
      uploads as any,
    );
    const png = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    expect(
      await service.store(
        { buffer: png, originalname: "test.png" } as any,
        1,
        2,
      ),
    ).toBe("s3://fixture/marketplace-private/csl/1/2/evidence.jpg");
    const converted = (uploads.uploadPrivate.mock.calls as any)[0][0];
    expect((await sharp(converted.buffer).metadata()).format).toBe("jpeg");
    await expect(
      service.store({ buffer: Buffer.from("<svg></svg>") } as any, 1, 2),
    ).rejects.toThrow("JPEG");
  });
  it("escapes reflections and branding before PDF rendering", () => {
    expect(escapeHtml("<script>\"bad\" & 'x'</script>")).toBe(
      "&lt;script&gt;&quot;bad&quot; &amp; &#39;x&#39;&lt;/script&gt;",
    );
  });
});
const integration = process.env.RBAC_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("CSL isolated PostgreSQL/JWT/photo/AI and real PDF", () => {
  let db: PrismaClient,
    app: INestApplication,
    base: string,
    school: any,
    other: any,
    teacher: any,
    admin: any,
    victor: any,
    alice: any,
    outsider: any,
    log: any,
    aliceLog: any,
    otherLog: any,
    picture: Buffer,
    tagger: CslTaggingService;
  const ai = {
    generateAssignment: jest.fn().mockResolvedValue({
      content: {
        competency_tags: ["Citizenship", "Communication and Collaboration"],
      },
    }),
  };
  const photos = {
    configured: jest.fn().mockReturnValue(true),
    verifyStorage: jest.fn().mockResolvedValue({
      photo_storage_verified: true,
      diagnostic_cleanup_verified: true,
    }),
    store: jest
      .fn()
      .mockImplementation(async (f: unknown) =>
        f ? "s3://fixture/marketplace-private/csl/photo.jpg" : null,
      ),
    signed: jest
      .fn()
      .mockResolvedValue("https://storage.invalid/signed-evidence.jpg"),
    image: jest.fn().mockImplementation(async () => picture),
    remove: jest.fn(),
  };
  const jwt = new JwtService({ secret: "isolated-csl-secret" });
  const headers = (u: any) => ({
    Authorization:
      "Bearer " + jwt.sign({ sub: u.id, schoolId: u.schoolId, role: u.role }),
  });
  const get = (path: string, u = victor) =>
    fetch(base + path, { headers: headers(u) });
  const patch = (path: string, u = teacher, body?: unknown) =>
    fetch(base + path, {
      method: "PATCH",
      headers: { ...headers(u), "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  async function submit(
    u = victor,
    overrides: Record<string, string> = {},
    photo = false,
  ) {
    const form = new FormData();
    const fields = {
      activity_name: "Community clean-up",
      description:
        "We worked with neighbours to collect litter and sort waste safely. I learned to coordinate roles and care for public spaces.",
      hours_logged: "2",
      submission_key: randomUUID(),
      ...overrides,
    };
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    if (photo)
      form.append(
        "photo",
        new Blob([picture as any], { type: "image/jpeg" }),
        "evidence.jpg",
      );
    return fetch(base + "/csl/log", {
      method: "POST",
      headers: headers(u),
      body: form,
    });
  }
  async function clean() {
    const ids = (
      await db.school.findMany({
        where: { code: { in: ["CSL_TEST_A", "CSL_TEST_B"] } },
        select: { id: true },
      })
    ).map((s) => s.id);
    await db.cSL_Logbook.deleteMany({ where: { school_id: { in: ids } } });
    await db.school.deleteMany({ where: { id: { in: ids } } });
  }
  beforeAll(async () => {
    const url = new URL(process.env.RBAC_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/rbac_test")
      throw Error("Use isolated localhost rbac_test only.");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await clean();
    school = await db.school.create({
      data: {
        code: "CSL_TEST_A",
        name: "CSL Demo Academy",
        address: "Eldoret, Kenya",
      },
    });
    other = await db.school.create({
      data: { code: "CSL_TEST_B", name: "Other school" },
    });
    teacher = await db.user.create({
      data: { schoolId: school.id, name: "CSL Teacher", role: "TEACHER" },
    });
    admin = await db.user.create({
      data: { schoolId: school.id, name: "Principal", role: "SCHOOL_ADMIN" },
    });
    for (const name of ["1A", "1B"])
      await db.stream.create({
        data: { school_id: school.id, grade: "Grade 12", name },
      });
    const stream = await db.stream.findFirstOrThrow({
      where: { school_id: school.id, name: "1B" },
    });
    await db.teacherAssignment.create({
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
      db.user.create({
        data: {
          schoolId,
          name,
          admissionNumber,
          role: "STUDENT",
          grade: "Grade 12",
          studentProfile: {
            create: { grade: "Grade 12", stream, pathway: "STEM" },
          },
        },
      });
    victor = await student(school.id, "Victor CSL", "CV001", "1B");
    alice = await student(school.id, "Alice CSL", "CA002", "1A");
    outsider = await student(other.id, "Other learner", "CO003", "1B");
    picture = await sharp({
      create: { width: 30, height: 20, channels: 3, background: "#BBD125" },
    })
      .jpeg()
      .toBuffer();
    @Global()
    @Module({
      providers: [{ provide: PrismaService, useValue: db }],
      exports: [PrismaService],
    })
    class DbModule {}
    @Module({
      imports: [DbModule, PassportModule, TeacherScopeModule],
      controllers: [CslController, SbaController],
      providers: [
        CslService,
        CslTaggingService,
        CslPdfService,
        SbaService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: "isolated-csl-secret" }),
        },
        { provide: AiProviderRouterService, useValue: ai },
        { provide: CslPhotoService, useValue: photos },
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
    tagger = app.get(CslTaggingService);
  }, 30000);
  afterAll(async () => {
    await app?.close();
    if (db) {
      await clean();
      await db.$disconnect();
    }
  });
  it("saves a photo reference only, queues tags, and makes retries idempotent", async () => {
    const key = randomUUID();
    const r = await submit(victor, { submission_key: key }, true);
    expect(r.status).toBe(201);
    log = await r.json();
    expect(log).toMatchObject({
      teacher_approved: false,
      ai_status: "PENDING",
      competency_tags: [],
      photo_url: "https://storage.invalid/signed-evidence.jpg",
    });
    const saved = await db.cSL_Logbook.findUniqueOrThrow({
      where: { id: log.id },
    });
    expect(saved.photo_url).toBe(
      "s3://fixture/marketplace-private/csl/photo.jpg",
    );
    const again: any = await (
      await submit(victor, { submission_key: key }, true)
    ).json();
    expect(again.id).toBe(log.id);
    expect(photos.store).toHaveBeenCalledTimes(1);
    expect(ai.generateAssignment).not.toHaveBeenCalled();
  });
  it("tags through the mocked AI and does not repeat completed generation", async () => {
    await tagger.tag(log.id);
    await tagger.tag(log.id);
    const saved = await db.cSL_Logbook.findUniqueOrThrow({
      where: { id: log.id },
    });
    expect(saved.competency_tags).toEqual([
      "Citizenship",
      "Communication and Collaboration",
    ]);
    expect(saved.ai_status).toBe("COMPLETE");
    expect(ai.generateAssignment).toHaveBeenCalledTimes(1);
  });
  it("teacher sees/approves only assigned streams and excludes other schools", async () => {
    aliceLog = await (await submit(alice)).json();
    otherLog = await (await submit(outsider)).json();
    const pending: any = await (await get("/csl/pending", teacher)).json();
    expect(pending.logs.map((r: any) => r.id)).toEqual([log.id]);
    expect((await patch(`/csl/${aliceLog.id}/approve`)).status).toBe(403);
    expect((await patch(`/csl/${otherLog.id}/approve`)).status).toBe(404);
    expect((await patch(`/csl/${log.id}/approve`, victor)).status).toBe(403);
    expect((await patch(`/csl/${log.id}/approve`)).status).toBe(200);
    expect((await patch(`/csl/${log.id}/approve`)).status).toBe(200);
    const hours: any = await (await get("/csl/my-hours")).json();
    expect(hours.approved_hours).toBe(2);
    expect(hours.complete).toBe(false);
    expect((await get(`/csl/${victor.id}/logbook-pdf`)).status).toBe(400);
  });
  it("rejects invalid hours/approval spoofing and requires a rejection comment", async () => {
    for (const value of ["0", "-1", "25", "NaN"])
      expect((await submit(victor, { hours_logged: value })).status).toBe(400);
    expect((await submit(victor, { teacher_approved: "true" })).status).toBe(
      400,
    );
    const pending: any = await (await submit()).json();
    expect(
      (await patch(`/csl/${pending.id}/reject`, teacher, { comment: "no" }))
        .status,
    ).toBe(400);
    expect(
      (
        await patch(`/csl/${pending.id}/reject`, teacher, {
          comment: "Please describe your own contribution.",
        })
      ).status,
    ).toBe(200);
    const hours: any = await (await get("/csl/my-hours")).json();
    expect(hours.approved_hours).toBe(2);
    expect(
      hours.logs.find((r: any) => r.id === pending.id).rejection_comment,
    ).toContain("contribution");
  });
  it("keeps a log saved when AI is unavailable", async () => {
    const pending: any = await (await submit()).json();
    ai.generateAssignment.mockRejectedValueOnce(Error("Unavailable"));
    await tagger.tag(pending.id);
    const saved = await db.cSL_Logbook.findUniqueOrThrow({
      where: { id: pending.id },
    });
    expect(saved.ai_status).toBe("FAILED");
    expect(saved.review_status).toBe("PENDING");
    expect(saved.competency_tags).toEqual([]);
  });
  it("counts approved hours only, renders a real branded 135-hour PDF, and exposes principal totals", async () => {
    for (let day = 1; day <= 6; day++) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - day);
      const saved: any = await (
        await submit(victor, {
          activity_name: `Service day ${day}`,
          activity_date: date.toISOString().slice(0, 10),
          hours_logged: String(day === 6 ? 13 : 24),
        })
      ).json();
      expect((await patch(`/csl/${saved.id}/approve`)).status).toBe(200);
    }
    const hours: any = await (await get("/csl/my-hours")).json();
    expect(hours).toMatchObject({
      approved_hours: 135,
      target_hours: 135,
      complete: true,
    });
    expect(hours.pending_hours).toBe(2);
    const response = await get(`/csl/${victor.id}/logbook-pdf`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    const { execFileSync } = require("node:child_process");
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
    expect(text).toContain("CSL Demo Academy");
    expect(text).toContain("Victor CSL");
    expect(text).toContain("135.00 / 135");
    expect(text).toContain("CSL Coordinator");
    expect(text).not.toContain("Alice CSL");
    expect(photos.image).toHaveBeenCalledTimes(1);
    const report: any = await (
      await get(`/sba/school/${school.id}`, admin)
    ).json();
    expect(
      report.rows.find((r: any) => r.student_id === victor.id).csl_hours,
    ).toBe(135);
    expect(report.summary.csl_completion_rate).toBe(50);
    const filtered: any = await (
      await get(`/sba/school/${school.id}?csl_below50=true`, admin)
    ).json();
    expect(filtered.rows.map((r: any) => r.name)).toEqual(["Alice CSL"]);
    expect((await get(`/csl/${alice.id}/logbook-pdf`)).status).toBe(403);
  }, 60000);
});
