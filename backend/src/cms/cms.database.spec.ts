import { PrismaClient } from "@prisma/client";
import { CmsService } from "./cms.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AiProviderRouterService } from "../ai/ai-provider-router.service";
import { PublishTargetType } from "./dto/publish.dto";

// Opt-in integration test. Only the explicitly named disposable localhost DB
// is accepted; DATABASE_URL and any production connection are never used.
const integration = process.env.CMS_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("CMS PostgreSQL delivery records", () => {
  let prisma: PrismaClient, service: CmsService;
  const moduleIds: string[] = [],
    schoolIds: number[] = [];
  beforeAll(async () => {
    const url = new URL(process.env.CMS_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/cms_publish_test")
      throw Error(
        "CMS tests require the disposable localhost cms_publish_test database.",
      );
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await prisma.$connect();
    const ai = {
      generateAssignment: jest.fn().mockResolvedValue({
        content: {
          theory_text: Array.from({ length: 300 }, () => "flight").join(" "),
          equations: [],
          illustration_prompt: "Graph of lift against speed.",
          questions: Array.from({ length: 30 }, (_, i) => ({
            question_text: `Flight scenario ${i + 1}`,
            options: ["Lift", "Weight", "Thrust", "Drag"],
            correct_answer: "Lift",
            explanation: "Lift is the upward aerodynamic force.",
          })),
        },
        usage: { promptTokens: 400, completionTokens: 1440, totalTokens: 1840 },
        model: "test-only-no-provider-call",
      }),
    };
    service = new CmsService(
      prisma as unknown as PrismaService,
      ai as unknown as AiProviderRouterService,
    );
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.moduleAssignment.deleteMany({
        where: { module_id: { in: moduleIds } },
      });
      await prisma.masterModule.deleteMany({
        where: { id: { in: moduleIds } },
      });
      await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
      await prisma.$disconnect();
    }
  });
  it("saves a generated draft and atomically creates exactly two stream deliveries, even with concurrent retries", async () => {
    const school = await prisma.school.create({
      data: { name: "CMS integration school", code: `CMS${Date.now()}` },
    });
    schoolIds.push(school.id);
    const draft = await service.generateAiContent({
      grade: 11,
      subject: "Aviation",
      topic: "Four Forces of Flight",
    });
    moduleIds.push(draft.id);
    expect(
      (await prisma.masterModule.findUniqueOrThrow({ where: { id: draft.id } }))
        .generation_cost_tokens,
    ).toBe(1840);
    await service.approveModule(draft.id);
    const input = {
      module_id: draft.id,
      target_type: PublishTargetType.SCHOOL,
      target_id: String(school.id),
      stream_ids: ["1A", "1B"],
    };
    await Promise.all([
      service.publishModule(input),
      service.publishModule(input),
    ]);
    const records = await prisma.moduleAssignment.findMany({
      where: { module_id: draft.id },
      orderBy: { stream_id: "asc" },
    });
    expect(records.map((record) => record.stream_id)).toEqual(["1A", "1B"]);
    expect(
      records.every(
        (record) => !!record.id && record.published_at instanceof Date,
      ),
    ).toBe(true);
    expect(
      await prisma.masterModule.findUniqueOrThrow({ where: { id: draft.id } }),
    ).toMatchObject({
      status: "PUBLISHED_SCHOOL",
      tenant_id: String(school.id),
    });
    expect(
      (await service.getSchoolPublications()).some(
        (module) => module.id === draft.id,
      ),
    ).toBe(true);
    expect(
      (await service.getPublicStore()).some((module) => module.id === draft.id),
    ).toBe(false);
  });
  it("publishes store metadata without creating stream delivery rows or exposing answer payloads", async () => {
    const draft = await service.generateAiContent({
      grade: 11,
      subject: "Aviation",
      topic: "Airflow",
    });
    moduleIds.push(draft.id);
    await service.approveModule(draft.id);
    await service.publishModule({
      module_id: draft.id,
      target_type: PublishTargetType.STORE,
    });
    expect(
      await prisma.moduleAssignment.count({ where: { module_id: draft.id } }),
    ).toBe(0);
    const entry = (await service.getPublicStore()).find(
      (module) => module.id === draft.id,
    )!;
    expect(entry.status).toBe("PUBLISHED_STORE");
    expect(entry).not.toHaveProperty("content_json");
    expect((await service.getModule(draft.id)).content_json).toBeDefined();
  });
});
