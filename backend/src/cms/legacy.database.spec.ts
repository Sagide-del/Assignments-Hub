import { PrismaClient } from "@prisma/client";
import { migrateQuestionBank } from "../scripts/migrate-question-bank";
import { CmsService } from "./cms.service";
import { Role } from "../common/enums/role.enum";
const integration = process.env.CMS_TEST_DATABASE_URL
  ? describe
  : describe.skip;
integration("Legacy migration on disposable PostgreSQL", () => {
  let prisma: PrismaClient;
  beforeAll(async () => {
    const url = new URL(process.env.CMS_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/cms_publish_test")
      throw Error("Disposable test database only");
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });
  it("dry-runs, preserves all 45 source questions, migrates idempotently and delivers through existing assessments", async () => {
    const school = await prisma.school.create({
      data: {
        name: "Legacy fixture school",
        code: `LEGACY${Date.now()}`,
        subscriptionStatus: "ACTIVE",
      },
    });
    const author = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Fixture admin",
        role: "PLATFORM_ADMIN",
      },
    });
    const learner = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "Fixture learner",
        role: "STUDENT",
        grade: "Grade 7",
      },
    });
    const topicPrefix = `Migration fixture ${Date.now()}`;
    const ids: string[] = [];
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      await prisma.questionBank.createMany({
        data: Array.from({ length: 45 }, (_, i) => ({
          createdById: author.id,
          schoolId: school.id,
          isGlobal: false,
          source: "SCHOOL",
          grade: "Grade 7",
          subject: "Integrated Science",
          topic: `${topicPrefix} ${i < 10 ? "Cells" : "Plants"}`,
          questionText: `Historic ${i}`,
          questionType: "ESSAY",
          points: 2,
          config: { rubric: "Preserved" },
          correctAnswer: null,
          status: "APPROVED",
        })),
      });
      const before = await prisma.masterModule.count();
      const dry = await migrateQuestionBank(prisma);
      expect(dry).toMatchObject({ modules: 2, questions: 45 });
      expect(await prisma.masterModule.count()).toBe(before);
      // Writes are fixtures inside this disposable database, never the source DB.
      expect(await migrateQuestionBank(prisma, true)).toMatchObject({
        modules: 2,
        questions: 45,
      });
      const modules = await prisma.masterModule.findMany({
        where: { topic: { startsWith: topicPrefix } },
      });
      ids.push(...modules.map((m) => m.id));
      expect(
        modules
          .map((m) => (m.content_json as any).questions.length)
          .sort((a, b) => a - b),
      ).toEqual([10, 35]);
      expect(await migrateQuestionBank(prisma, true)).toMatchObject({
        modules: 0,
        skipped: 2,
      });
      expect(
        await prisma.questionBank.count({ where: { createdById: author.id } }),
      ).toBe(45);
      const enrichTarget = modules.find(
        (m) => (m.content_json as any).questions.length === 35,
      )!;
      const originalQuestions = (enrichTarget.content_json as any).questions;
      const ai = {
        generateAssignment: jest.fn().mockResolvedValue({
          content: {
            theory_text: Array(300).fill("Plants").join(" "),
            equations: [],
            illustration_prompt: "Leaf cross section",
            questions: [],
          },
          usage: { totalTokens: 123 },
        }),
      };
      const enriched = await new CmsService(
        prisma as any,
        ai as any,
      ).enrichModule(enrichTarget.id);
      expect(enriched.status).toBe("DRAFT");
      expect(enriched.generation_cost_tokens).toBe(123);
      expect((enriched.content_json as any).questions).toEqual(
        originalQuestions,
      );
      expect((enriched.content_json as any).legacy_records).toEqual(
        (enrichTarget.content_json as any).legacy_records,
      );
      const module = modules.find(
        (m) => (m.content_json as any).questions.length === 10,
      )!;
      const service = new CmsService(prisma as any, {} as any);
      const actor = {
        id: learner.id,
        schoolId: school.id,
        role: Role.STUDENT,
        name: learner.name,
        email: null,
        admissionNumber: null,
        grade: "Grade 7",
        isIndependentTrial: false,
      };
      expect(await service.getLearningModules(actor)).toEqual([]); // Approved is not published.
      await service.publishModule({
        module_id: module.id,
        target_type: "SCHOOL" as any,
        target_id: String(school.id),
        stream_ids: [],
      });
      const list = await service.getLearningModules(actor);
      expect(list).toHaveLength(1);
      expect(list[0]).not.toHaveProperty("content_json");
      expect(
        await service.getLearningModules({ ...actor, grade: "Grade 8" }),
      ).toEqual([]);
      await prisma.contentDistribution.updateMany({
        where: { module_id: module.id },
        data: { stream_id: "7A" },
      });
      expect(await service.getLearningModules(actor)).toEqual([]);
      await expect(
        service.startLearningModule(module.id, actor),
      ).rejects.toThrow("not available");
      await prisma.studentProfile.create({
        data: { userId: learner.id, grade: "Grade 7", stream: "7A" },
      });
      expect(await service.getLearningModules(actor)).toHaveLength(1);
      const started = await service.startLearningModule(module.id, actor);
      const retry = await service.startLearningModule(module.id, actor);
      expect(retry.id).toBe(started.id);
      const delivery = await prisma.assignment.findUniqueOrThrow({
        where: { id: started.id },
        include: { questions: true },
      });
      expect(delivery.questions).toHaveLength(10);
      expect(delivery.questions[0].questionType).toBe("ESSAY");
      expect(delivery.questions[0].config).toEqual({ rubric: "Preserved" });
      expect((delivery.rawJson as any).cms_content.theory_text).toBe("");
      expect(delivery.rawJson).not.toHaveProperty("legacy_records");
      await service.publishModule({
        module_id: module.id,
        audience: "PUBLIC_STORE",
      });
      expect((await service.getModule(module.id)).distributions).toHaveLength(
        2,
      );
      expect(
        (await service.getPublicStore()).some((m) => m.id === module.id),
      ).toBe(true);
    } finally {
      log.mockRestore();
      await prisma.moduleAssignment.deleteMany({
        where: { module_id: { in: ids } },
      });
      await prisma.masterModule.deleteMany({
        where: { topic: { startsWith: topicPrefix } },
      });
      await prisma.questionBank.deleteMany({
        where: { createdById: author.id },
      });
      await prisma.assignment.deleteMany({ where: { schoolId: school.id } });
      await prisma.user.deleteMany({ where: { schoolId: school.id } });
      await prisma.school.delete({ where: { id: school.id } });
    }
  });
});
