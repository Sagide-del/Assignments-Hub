import { PublicRevisionService } from "./public-revision.service";
import {
  Injectable,
  INestApplication,
  Module,
  ServiceUnavailableException,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PassportModule, PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { randomUUID } from "crypto";
import { ContentStatus } from "@prisma/client";
import { AiProviderRouterService } from "../ai/ai-provider-router.service";
import { CmsController } from "./cms.controller";
import { TAXONOMY_SEED } from "../scripts/seed-taxonomy";
import { CmsService } from "./cms.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { IndependentTrialGuard } from "../common/guards/independent-trial.guard";

// The HTTP layer uses real JWT/role/tenant guards and validation. Only storage
// and AI are replaced; these tests neither charge a provider nor migrate a database.
const TEST_SECRET = "cms-api-test-only-secret";
const rows = new Map<string, any>();
let assignments: any[] = [];
let distributions: any[] = [];
let failAssignmentWrite = false;
let serial: Promise<unknown> = Promise.resolve();
const copy = <T>(value: T): T => structuredClone(value);
const project = (row: any, select?: Record<string, boolean>) =>
  select
    ? Object.fromEntries(
        Object.keys(select)
          .filter((key) => select[key])
          .map((key) => [key, row[key]]),
      )
    : copy(row);
const aiContent = {
  asset_url: null,
  theory_text: Array.from({ length: 300 }, () => "flight").join(" "),
  equations: ["L = \\frac{1}{2} \\rho v^2 S C_L"],
  illustration_prompt:
    "A labelled graph of lift against airspeed, with units on each axis.",
  questions: Array.from({ length: 30 }, (_, i) => ({
    question_text: `Identify the upward force in flight scenario ${i + 1}.`,
    options: ["Lift", "Weight", "Thrust", "Drag"],
    correct_answer: "Lift",
    explanation: "Lift is the upward aerodynamic force opposing weight.",
  })),
};
const ai = { generateAssignment: jest.fn() };
const aiResult = () => ({
  content: copy(aiContent),
  model: "deepseek-test",
  usage: { promptTokens: 400, completionTokens: 1440, totalTokens: 1840 },
});
const db: any = {
  $queryRaw: jest.fn().mockResolvedValue([]),
  curriculumTaxonomy: {
    findMany: jest.fn(async ({ where }) =>
      TAXONOMY_SEED.filter((row) => row.grade === where.grade).map(
        (row, i) => ({
          id: `tax-${i}`,
          source: "USER_PROVIDED",
          verified: false,
          ...row,
        }),
      ),
    ),
  },
  masterModule: {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(async ({ data }) => {
      const row = {
        id: randomUUID(),
        pathway: null,
        track: null,
        tenant_id: null,
        generation_cost_tokens: 0,
        created_at: new Date(),
        updated_at: new Date(),
        ...data,
      };
      rows.set(row.id, row);
      return copy(row);
    }),
    findUnique: jest.fn(async ({ where }) =>
      rows.has(where.id) ? copy(rows.get(where.id)) : null,
    ),
    findMany: jest.fn(async ({ where, select }) =>
      [...rows.values()]
        .filter((row) => {
          if (where.status?.in && !where.status.in.includes(row.status))
            return false;
          if (typeof where.status === "string" && row.status !== where.status)
            return false;
          if (
            where.distributions?.some?.audience &&
            !distributions.some(
              (d) =>
                d.module_id === row.id &&
                d.audience === where.distributions.some.audience,
            )
          )
            return false;
          return (
            where.tenant_id === undefined || row.tenant_id === where.tenant_id
          );
        })
        .map((row) => project(row, select)),
    ),
    updateMany: jest.fn(async ({ where, data }) => {
      const row = rows.get(where.id);
      if (
        !row ||
        JSON.stringify(row.content_json) !==
          JSON.stringify(where.content_json.equals)
      )
        return { count: 0 };
      rows.set(where.id, { ...row, ...data });
      return { count: 1 };
    }),
    update: jest.fn(async ({ where, data }) => {
      const row = { ...rows.get(where.id), ...data, updated_at: new Date() };
      rows.set(row.id, row);
      return copy(row);
    }),
  },
  studentProfile: {
    findMany: jest.fn(async () => [
      { stream: "1A", className: null },
      { stream: "1B", className: null },
      { stream: "1C", className: null },
    ]),
  },
  stream: { findMany: jest.fn(async () => []) },
  contentDistribution: {
    findFirst: jest.fn(
      async ({ where }) =>
        distributions.find((d) =>
          Object.entries(where).every(([k, v]) => d[k] === v),
        ) ?? null,
    ),
    create: jest.fn(async ({ data }) => {
      if (failAssignmentWrite) throw Error("Simulated distribution failure");
      const d = { id: randomUUID(), published_at: new Date(), ...data };
      distributions.push(d);
      return d;
    }),
  },
  school: {
    findUnique: jest.fn(async ({ where }) =>
      [1, 2].includes(where.id) ? { id: where.id } : null,
    ),
  },
  moduleAssignment: {
    findMany: jest.fn(async ({ where, select }) =>
      assignments
        .filter((row) => row.module_id === where.module_id)
        .map((row) => project(row, select)),
    ),
    deleteMany: jest.fn(async ({ where }) => {
      const before = assignments.length;
      assignments = assignments.filter(
        (row) =>
          row.module_id !== where.module_id ||
          where.stream_id.notIn.includes(row.stream_id),
      );
      return { count: before - assignments.length };
    }),
    createMany: jest.fn(async ({ data }) => {
      if (failAssignmentWrite)
        throw Error("Simulated assignment storage failure");
      assignments.push(
        ...data.map((item: any) => ({
          id: randomUUID(),
          published_at: new Date(),
          due_date: null,
          ...item,
        })),
      );
      return { count: data.length };
    }),
  },
};
db.masterModule.findUniqueOrThrow = jest.fn(async ({ where }) => {
  const row = rows.get(where.id);
  if (!row) throw Error("Missing");
  return {
    ...copy(row),
    distributions: copy(distributions.filter((d) => d.module_id === where.id)),
    assignments: [],
  };
});
db.$transaction = jest.fn((run: (tx: any) => Promise<unknown>) => {
  const task = serial.then(async () => {
    const savedRows = copy([...rows]),
      savedAssignments = copy(assignments),
      savedDistributions = copy(distributions);
    try {
      return await run(db);
    } catch (error) {
      rows.clear();
      for (const [id, row] of savedRows) rows.set(id, row);
      assignments = savedAssignments;
      distributions = savedDistributions;
      throw error;
    }
  });
  serial = task.catch(() => undefined);
  return task;
});

@Injectable()
class TestJwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: TEST_SECRET,
    });
  }
  validate(payload: unknown) {
    return payload;
  }
}
@Module({
  imports: [PassportModule],
  controllers: [CmsController],
  providers: [
    CmsService,
    PublicRevisionService,
    TestJwtStrategy,
    { provide: PrismaService, useValue: db },
    { provide: AiProviderRouterService, useValue: ai },
  ],
})
class CmsHttpTestModule {}

const draft = {
  level: "Senior School",
  grade: 11,
  pathway: "STEM",
  track: "Technical and Engineering",
  subject: "Aviation Technology",
  topic: "Aerodynamics",
};
const jwt = new JwtService({ secret: TEST_SECRET });
const token = (role: string) =>
  jwt.sign({
    id: 42,
    schoolId: 1,
    role,
    grade: "Grade 11",
    isIndependentTrial: false,
  });

describe("Master Content Library HTTP API", () => {
  let app: INestApplication, base: string;
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    role?: string,
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(role ? { Authorization: `Bearer ${token(role)}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: (await response.json()) as any };
  };
  const create = async () => {
    const result = await request("/drafts", "POST", draft, "PLATFORM_ADMIN");
    expect(result.status).toBe(201);
    return result.data;
  };
  const approved = async () => {
    const module = await create();
    expect(
      (
        await request(
          `/drafts/${module.id}/approve`,
          "PATCH",
          undefined,
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(200);
    return module;
  };
  beforeAll(async () => {
    app = await NestFactory.create(CmsHttpTestModule, { logger: false });
    const reflector = app.get(Reflector);
    app.useGlobalGuards(
      new JwtAuthGuard(reflector),
      new RolesGuard(reflector),
      new TenantGuard(),
      new IndependentTrialGuard(reflector),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    base = `${await app.getUrl()}/api/v1/cms`;
  });
  beforeEach(() => {
    rows.clear();
    assignments = [];
    distributions = [];
    failAssignmentWrite = false;
    jest.clearAllMocks();
    ai.generateAssignment
      .mockReset()
      .mockImplementation(async () => aiResult());
    db.masterModule.count.mockResolvedValue(0);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("requires authentication and PLATFORM_ADMIN for every management route", async () => {
    const id = randomUUID();
    for (const [path, method, body] of [
      ["/drafts", "GET", undefined],
      ["/taxonomy?grade=12", "GET", undefined],
      ["/publications/schools", "GET", undefined],
      [`/modules/${id}`, "GET", undefined],
      ["/drafts", "POST", draft],
      [`/drafts/${id}/approve`, "PATCH", undefined],
      [`/drafts/${id}/enrich`, "POST", undefined],
      ["/publish", "POST", { module_id: id, target_type: "STORE" }],
    ] as const) {
      expect((await request(path, method, body)).status).toBe(401);
      for (const role of ["TEACHER", "SCHOOL_ADMIN", "STUDENT"])
        expect((await request(path, method, body, role)).status).toBe(403);
    }
    expect((await request("/store")).status).toBe(200);
    expect(db.masterModule.create).not.toHaveBeenCalled();
  });
  it("restricts published learner content routes to authenticated students", async () => {
    for (const [path, method] of [
      ["/learning", "GET"],
      [`/learning/${randomUUID()}/start`, "POST"],
    ]) {
      expect((await request(path, method)).status).toBe(401);
      for (const role of ["TEACHER", "SCHOOL_ADMIN", "PLATFORM_ADMIN"])
        expect((await request(path, method, undefined, role)).status).toBe(403);
    }
  });
  it("returns exact grade-specific taxonomy and validates the grade query", async () => {
    const senior = await request(
      "/taxonomy?grade=12",
      "GET",
      undefined,
      "PLATFORM_ADMIN",
    );
    expect(senior.status).toBe(200);
    expect(senior.data).toHaveLength(20);
    expect(
      senior.data.every(
        (row: any) => row.grade === 12 && row.pathway && row.track,
      ),
    ).toBe(true);
    const junior = await request(
      "/taxonomy?grade=7",
      "GET",
      undefined,
      "PLATFORM_ADMIN",
    );
    expect(
      junior.data.every(
        (row: any) => row.pathway === null && row.track === null,
      ),
    ).toBe(true);
    expect(
      (await request("/taxonomy?grade=6", "GET", undefined, "PLATFORM_ADMIN"))
        .data,
    ).toHaveLength(9);
    for (const path of [
      "/taxonomy",
      "/taxonomy?grade=13",
      "/taxonomy?grade=7.5",
    ])
      expect(
        (await request(path, "GET", undefined, "PLATFORM_ADMIN")).status,
      ).toBe(400);
  });
  it("creates drafts, lists pending content and approves idempotently", async () => {
    const module = await create();
    expect(module.status).toBe("DRAFT");
    expect(module.generation_cost_tokens).toBe(1840);
    expect(module.tenant_id).toBeNull();
    expect(
      (await request("/drafts", "GET", undefined, "PLATFORM_ADMIN")).data,
    ).toHaveLength(1);
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request(
            `/drafts/${module.id}/approve`,
            "PATCH",
            undefined,
            "PLATFORM_ADMIN",
          )
        ).data.status,
      ).toBe("APPROVED");
    expect(
      (await request("/drafts", "GET", undefined, "PLATFORM_ADMIN")).data[0]
        .status,
    ).toBe("APPROVED");
  });
  it("validates drafts and prevents callers from injecting status or token totals", async () => {
    for (const body of [
      { ...draft, grade: 0 },
      { ...draft, grade: "11" },
      { ...draft, content_json: [] },
      { ...draft, content_json: {} },
      { ...draft, subject: " " },
      { ...draft, status: "PUBLISHED_STORE" },
      { ...draft, generation_cost_tokens: 999 },
    ])
      expect(
        (await request("/drafts", "POST", body, "PLATFORM_ADMIN")).status,
      ).toBe(400);
    expect(rows.size).toBe(0);
  });
  it("generates the requested Aviation module and derives level, strict payload and provider token usage", async () => {
    const result = await request(
      "/drafts",
      "POST",
      {
        grade: 11,
        subject: "Aviation Technology",
        topic: "Aerodynamics",
        pathway: "STEM",
      },
      "PLATFORM_ADMIN",
    );
    expect(result.status).toBe(201);
    expect(result.data).toMatchObject({
      level: "Senior School",
      grade: 11,
      subject: "Aviation Technology",
      topic: "Aerodynamics",
      status: "DRAFT",
      generation_cost_tokens: 1840,
    });
    expect(result.data.content_json.questions).toHaveLength(30);
    expect(result.data.content_json.theory_text.split(/\s+/)).toHaveLength(300);
    expect(rows.get(result.data.id).content_json).toMatchObject(aiContent);
    expect(ai.generateAssignment).toHaveBeenCalledTimes(1);
    const [prompt, actor] = ai.generateAssignment.mock.calls[0];
    expect(prompt).toContain(
      'Grade 11 module for Subject "Aviation Technology", Topic "Aerodynamics"',
    );
    expect(prompt).toContain("exactly 30 distinct");
    expect(actor).toEqual({ userId: 42, schoolId: 1 });
  });
  it("rejects malformed JSON and invalid generated schemas without storing or repairing them through another AI call", async () => {
    const invalid = [
      "not JSON",
      "```json\n{}\n```",
      { ...copy(aiContent), theory_text: "Too short" },
      { ...copy(aiContent), questions: aiContent.questions.slice(0, 29) },
      { ...copy(aiContent), equations: "not an array" },
      {
        ...copy(aiContent),
        questions: aiContent.questions.map((q, i) =>
          i ? q : { ...q, correct_answer: "A" },
        ),
      },
      {
        ...copy(aiContent),
        questions: aiContent.questions.map((q, i) =>
          i ? q : { ...q, options: ["Lift", "Lift", "Weight", "Drag"] },
        ),
      },
    ];
    for (const content of invalid) {
      ai.generateAssignment.mockResolvedValueOnce({ ...aiResult(), content });
      const result = await request("/drafts", "POST", draft, "PLATFORM_ADMIN");
      expect(result.status).toBe(400);
      expect(result.data.message).toBe("AI Generation failed, try again.");
    }
    expect(ai.generateAssignment).toHaveBeenCalledTimes(invalid.length);
    expect(db.masterModule.create).not.toHaveBeenCalled();
    expect(rows.size).toBe(0);
  });
  it("converts provider invalid-JSON errors to 400 while preserving configuration and balance errors", async () => {
    ai.generateAssignment.mockRejectedValueOnce(
      new ServiceUnavailableException(
        "AI generation failed (INVALID_RESPONSE). Invalid JSON.",
      ),
    );
    const invalid = await request("/drafts", "POST", draft, "PLATFORM_ADMIN");
    expect(invalid.status).toBe(400);
    expect(invalid.data.message).toBe("AI Generation failed, try again.");
    ai.generateAssignment.mockRejectedValueOnce(
      new ServiceUnavailableException(
        "AI generation failed (INSUFFICIENT_BALANCE). Top up DeepSeek.",
      ),
    );
    expect(
      (await request("/drafts", "POST", draft, "PLATFORM_ADMIN")).status,
    ).toBe(503);
    expect(rows.size).toBe(0);
  });
  it("does not spend provider credit when CMS storage is unavailable", async () => {
    db.masterModule.count.mockRejectedValueOnce(Error("Missing CMS table"));
    const result = await request("/drafts", "POST", draft, "PLATFORM_ADMIN");
    expect(result.status).toBe(503);
    expect(result.data.message).toContain("apply the CMS migration");
    expect(ai.generateAssignment).not.toHaveBeenCalled();
    expect(rows.size).toBe(0);
  });
  it("does not retry AI or misreport a storage failure as invalid generated content", async () => {
    db.masterModule.create.mockRejectedValueOnce(
      Error("Simulated CMS write failure"),
    );
    const result = await request("/drafts", "POST", draft, "PLATFORM_ADMIN");
    expect(result.status).toBe(500);
    expect(ai.generateAssignment).toHaveBeenCalledTimes(1);
    expect(rows.size).toBe(0);
  });
  it("publishes approved content to a public catalogue without exposing payloads or draft/school content", async () => {
    const module = await approved();
    await create();
    expect(
      (
        await request(
          "/publish",
          "POST",
          { module_id: module.id, target_type: "STORE" },
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(201);
    const publicStore = await request("/store");
    expect(publicStore.data).toHaveLength(1);
    expect(publicStore.data[0].id).toBe(module.id);
    for (const key of [
      "content_json",
      "generation_cost_tokens",
      "tenant_id",
      "assignments",
    ])
      expect(publicStore.data[0]).not.toHaveProperty(key);
    expect(
      (await request("/drafts", "GET", undefined, "PLATFORM_ADMIN")).data,
    ).toHaveLength(2);
    expect(assignments).toHaveLength(0);
  });
  it("delivers to a real school and adds streams without duplicate distribution records", async () => {
    const module = await approved(),
      body = {
        module_id: module.id,
        target_type: "SCHOOL",
        target_id: "1",
        stream_ids: ["1A", "1B"],
      };
    const results = await Promise.all([
      request("/publish", "POST", body, "PLATFORM_ADMIN"),
      request("/publish", "POST", body, "PLATFORM_ADMIN"),
    ]);
    expect(results.every((result) => result.status === 201)).toBe(true);
    expect(distributions).toHaveLength(2);
    expect(rows.get(module.id).status).toBe("APPROVED");
    const retained = distributions.find((row) => row.stream_id === "1B").id;
    expect(
      (
        await request(
          "/publish",
          "POST",
          { ...body, stream_ids: ["1B", "1C"] },
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(201);
    expect(distributions.map((row) => row.stream_id)).toEqual([
      "1A",
      "1B",
      "1C",
    ]);
    expect(distributions.find((row) => row.stream_id === "1B").id).toBe(
      retained,
    );
    expect((await request("/store")).data).toHaveLength(0);
  });
  it("lets only administrators retrieve school publications and full module details", async () => {
    const module = await approved();
    const detail = await request(
      `/modules/${module.id}`,
      "GET",
      undefined,
      "PLATFORM_ADMIN",
    );
    expect(detail.status).toBe(200);
    expect(detail.data.content_json.questions).toHaveLength(30);
    await request(
      "/publish",
      "POST",
      {
        module_id: module.id,
        target_type: "SCHOOL",
        target_id: "1",
        stream_ids: ["1A"],
      },
      "PLATFORM_ADMIN",
    );
    const list = await request(
      "/publications/schools",
      "GET",
      undefined,
      "PLATFORM_ADMIN",
    );
    expect(list.status).toBe(200);
    expect(list.data.map((row: any) => row.id)).toContain(module.id);
    expect(
      (
        await request(
          `/modules/${randomUUID()}`,
          "GET",
          undefined,
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(404);
  });
  it("supports school-wide publication without stream assignments", async () => {
    const module = await approved();
    const result = await request(
      "/publish",
      "POST",
      { module_id: module.id, target_type: "SCHOOL", target_id: "2" },
      "PLATFORM_ADMIN",
    );
    expect(result.data.status).toBe("APPROVED");
    expect(result.data.assignments).toEqual([]);
  });
  it("rejects invalid targets and allows approved content to reach multiple audiences", async () => {
    const module = await create(),
      body = { module_id: module.id, target_type: "SCHOOL", target_id: "1" };
    expect(
      (await request("/publish", "POST", body, "PLATFORM_ADMIN")).status,
    ).toBe(409);
    await request(
      `/drafts/${module.id}/approve`,
      "PATCH",
      undefined,
      "PLATFORM_ADMIN",
    );
    for (const target of [
      { module_id: module.id, target_type: "OTHER" },
      { module_id: module.id, target_type: "SCHOOL" },
      { ...body, target_id: "unknown" },
      { ...body, stream_ids: ["1A", " 1A "] },
      { ...body, stream_ids: [" "] },
      { ...body, target_type: "STORE" },
    ])
      expect(
        (await request("/publish", "POST", target, "PLATFORM_ADMIN")).status,
      ).toBe(400);
    expect(
      (
        await request(
          "/publish",
          "POST",
          { ...body, target_id: "999" },
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(404);
    await request("/publish", "POST", body, "PLATFORM_ADMIN");
    expect(
      (
        await request(
          "/publish",
          "POST",
          { module_id: module.id, audience: "PUBLIC_STORE" },
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await request(
          "/publish",
          "POST",
          { ...body, target_id: "2" },
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await request(
          `/drafts/${module.id}/approve`,
          "PATCH",
          undefined,
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(200);
    expect(distributions.map((d) => d.audience)).toEqual([
      "SCHOOL",
      "PUBLIC_STORE",
      "SCHOOL",
    ]);
    expect((await request("/store")).data).toHaveLength(1);
  });
  it("rolls back publication if stream delivery fails", async () => {
    const module = await approved();
    failAssignmentWrite = true;
    expect(
      (
        await request(
          "/publish",
          "POST",
          {
            module_id: module.id,
            target_type: "SCHOOL",
            target_id: "1",
            stream_ids: ["1A"],
          },
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(500);
    expect(rows.get(module.id).status).toBe(ContentStatus.APPROVED);
    expect(rows.get(module.id).tenant_id).toBeNull();
    expect(assignments).toHaveLength(0);
  });
  it("rejects malformed UUIDs and returns 404 for missing modules", async () => {
    expect(
      (
        await request(
          "/drafts/not-an-id/approve",
          "PATCH",
          undefined,
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          `/drafts/${randomUUID()}/approve`,
          "PATCH",
          undefined,
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(404);
  });
  it("public export exposes only explicitly reviewed samples and rejects non-platform publishers", async () => {
    const module = await approved();
    const sample = {
      question_indices: [0, 1, 2],
      introduction:
        "Understand the four forces of flight by comparing lift and weight, then thrust and drag. Use each scenario to identify a force and explain its direction.",
      guidance: [
        "Sketch force arrows before choosing your answer.",
        "Explain why the other options do not fit the scenario.",
      ],
      rights_confirmed: true,
    };
    const path = `/modules/${module.id}/public-samples`;
    expect((await request(path, "POST", sample)).status).toBe(401);
    for (const role of ["STUDENT", "TEACHER", "SCHOOL_ADMIN"])
      expect((await request(path, "POST", sample, role)).status).toBe(403);
    expect((await request("/public-revision")).data.topics).toEqual([]);
    expect(
      (
        await request(
          path,
          "POST",
          { ...sample, rights_confirmed: false },
          "PLATFORM_ADMIN",
        )
      ).status,
    ).toBe(400);
    expect((await request(path, "POST", sample, "PLATFORM_ADMIN")).status).toBe(
      201,
    );
    const feed = await request("/public-revision");
    expect(feed.status).toBe(200);
    expect(feed.data.topics).toHaveLength(1);
    expect(feed.data.topics[0].questions).toHaveLength(3);
    expect(feed.data.topics[0]).not.toHaveProperty("content_json");
    expect(JSON.stringify(feed.data)).not.toMatch(
      /generation_cost_tokens|reviewed_by|verified_answer|tenant_id/,
    );
    expect(rows.get(module.id).content_json.questions).toHaveLength(30);
    expect(
      (await request(path + "/withdraw", "PATCH", undefined, "PLATFORM_ADMIN"))
        .status,
    ).toBe(200);
    expect((await request("/public-revision")).data.topics).toEqual([]);
  });
});
