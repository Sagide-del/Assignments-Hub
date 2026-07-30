import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";
import { AiExtractionStatus, AiJobStatus } from "@prisma/client";
import { ROLES_KEY } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { AiContentController } from "./ai-content.controller";

describe("AiContentController", () => {
  const actor = {
    id: 12,
    schoolId: 7,
    role: Role.TEACHER,
    name: "Teacher",
    email: "teacher@example.com",
    admissionNumber: null,
    grade: null,
  };

  const extractions = {
    createExtraction: jest.fn(),
    getContent: jest.fn(),
    listTopics: jest.fn(),
  };
  const generations = {
    createJob: jest.fn(),
    listJobs: jest.fn(),
  };
  const artifacts = {
    findOne: jest.fn(),
    updateContent: jest.fn(),
    validate: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };
  const publishing = { publish: jest.fn() };
  const featureConfig = {
    getAdminFeatures: jest.fn(),
    updateAdminFeature: jest.fn(),
  };
  const quota = { getQuota: jest.fn() };
  const queue = {
    enqueueExtraction: jest.fn(),
    enqueueGeneration: jest.fn(),
  };
  const monitoring = { dashboard: jest.fn() };

  const controller = new AiContentController(
    extractions as never,
    generations as never,
    artifacts as never,
    publishing as never,
    featureConfig as never,
    quota as never,
    queue as never,
    monitoring as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it("declares the complete required route contract", () => {
    const routes: [keyof AiContentController, string, RequestMethod][] = [
      ["uploadPdf", "pdf/upload", RequestMethod.POST],
      ["pdfContent", "pdf/:id/content", RequestMethod.GET],
      ["generate", "assignments/generate", RequestMethod.POST],
      ["assignment", "assignments/:id", RequestMethod.GET],
      ["edit", "assignments/:id/edit", RequestMethod.PATCH],
      ["approve", "assignments/:id/approve", RequestMethod.POST],
      ["publish", "assignments/:id/publish", RequestMethod.POST],
      ["reject", "assignments/:id/reject", RequestMethod.POST],
      ["listGenerations", "assignments/generations", RequestMethod.GET],
      ["quotas", "quotas", RequestMethod.GET],
      ["adminFeatures", "admin/features", RequestMethod.GET],
      ["updateAdminFeature", "admin/features/:id", RequestMethod.PATCH],
    ];

    expect(Reflect.getMetadata(PATH_METADATA, AiContentController)).toBe("ai");
    for (const [method, path, requestMethod] of routes) {
      const handler = AiContentController.prototype[method];
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(requestMethod);
    }
  });

  it("excludes students from the controller and restricts admin routes", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AiContentController)).toEqual([
      Role.TEACHER,
      Role.SCHOOL_ADMIN,
      Role.PLATFORM_ADMIN,
    ]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        AiContentController.prototype.adminFeatures,
      ),
    ).toEqual([Role.PLATFORM_ADMIN]);
  });

  it("queues a new PDF extraction without exposing storage fields", async () => {
    extractions.createExtraction.mockResolvedValue({
      id: 4,
      status: AiExtractionStatus.PROCESSING,
      startedAt: null,
      storageKey: "private/key.pdf",
      fileUrl: "s3://private/key.pdf",
      fileName: "biology.pdf",
      subject: "Biology",
      grade: "Grade 10",
      topicCount: 0,
      createdAt: new Date("2026-07-30T00:00:00Z"),
    });

    const result = await controller.uploadPdf(
      { originalname: "biology.pdf" } as Express.Multer.File,
      { subject: "Biology", grade: "Grade 10" },
      "upload-key",
      actor,
    );

    expect(queue.enqueueExtraction).toHaveBeenCalledWith(4);
    expect(result).not.toHaveProperty("storageKey");
    expect(result).not.toHaveProperty("fileUrl");
  });

  it("queues a reserved generation job", async () => {
    generations.createJob.mockResolvedValue({
      id: 9,
      status: AiJobStatus.QUEUED,
      createdAt: new Date(),
    });

    const result = await controller.generate(
      {
        topicId: "4:cells-1",
        questionCount: 5,
        difficulty: "MEDIUM",
        questionTypes: ["MULTIPLE_CHOICE"] as never,
      },
      "generation-key",
      actor,
    );

    expect(queue.enqueueGeneration).toHaveBeenCalledWith(9);
    expect(result.jobId).toBe(9);
  });

  it("validates before approving an artifact", async () => {
    artifacts.validate.mockResolvedValue({ valid: true });
    artifacts.approve.mockResolvedValue({ id: 18, status: "APPROVED" });

    await controller.approve(18, { notes: "Reviewed" }, actor);

    expect(artifacts.validate).toHaveBeenCalledWith(18, actor);
    expect(artifacts.approve).toHaveBeenCalledWith(18, "Reviewed", actor);
    expect(artifacts.validate.mock.invocationCallOrder[0]).toBeLessThan(
      artifacts.approve.mock.invocationCallOrder[0],
    );
  });

  it("delegates publishing with the explicit publication choice", async () => {
    publishing.publish.mockResolvedValue({ assignmentId: 30 });

    await controller.publish(18, { publishNow: true }, actor);

    expect(publishing.publish).toHaveBeenCalledWith(18, true, actor);
  });
});
