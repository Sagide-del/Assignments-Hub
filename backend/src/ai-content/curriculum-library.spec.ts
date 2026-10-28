import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Role } from "../common/enums/role.enum";
import { CurriculumLibraryService } from "./curriculum-library.service";
import {
  PopulateCurriculumDto,
  PublishCurriculumDto,
} from "./dto/populate-curriculum.dto";
import { AiPublishService } from "./ai-publish.service";
import { AiArtifactMapperService } from "./ai-artifact-mapper.service";
import { curriculumUnits } from "./curriculum-plan";
const actor = {
  id: 1,
  schoolId: 7,
  role: Role.PLATFORM_ADMIN,
  name: "Admin",
  email: null,
  admissionNumber: null,
  grade: null,
  isIndependentTrial: false,
};
const topic = {
  id: "42:numbers",
  name: "Numbers",
  summary: "Numbers",
  sourceContent: "Place value and operations",
  subtopics: [
    {
      id: "42:numbers:place",
      name: "Place value",
      keyConcepts: ["ones", "tens"],
      learningOutcomes: ["Identify the value of a digit"],
      sourceContent: "Identify digit values.",
    },
  ],
};
function setup(jobs: any[] = []) {
  const document = {
    id: 42,
    schoolId: 7,
    grade: "Grade 4",
    subject: "Mathematics",
    status: "COMPLETED",
    content: { topics: [topic] },
  };
  const prisma = {
    aiGenerationJob: { findMany: jest.fn().mockResolvedValue(jobs) },
  };
  const extraction = { getContent: jest.fn().mockResolvedValue(document) };
  const generation = {
    createJob: jest.fn().mockResolvedValue({ id: 9, status: "QUEUED" }),
  };
  const queue = {
    enqueueGeneration: jest.fn().mockResolvedValue({ queued: true }),
  };
  const publishing = {
    publish: jest.fn().mockResolvedValue({ assignmentId: 30 }),
  };
  return {
    document,
    prisma,
    extraction,
    generation,
    queue,
    publishing,
    service: new CurriculumLibraryService(
      prisma as any,
      extraction as any,
      generation as any,
      queue as any,
      publishing as any,
    ),
  };
}
describe("Curriculum library", () => {
  it("maps strands and outcomes without inventing missing objectives", () => {
    const [unit] = curriculumUnits({ topics: [topic] });
    expect(unit.outcomes).toEqual(["Identify the value of a digit"]);
    expect(
      curriculumUnits({ topics: [{ ...topic, subtopics: [] }] })[0].outcomes,
    ).toEqual([]);
  });
  it("requires source review, valid grade and units from the selected document", async () => {
    const { service, document, generation } = setup();
    await expect(
      service.populate(
        42,
        { unitIds: ["fake"], questionCount: 10, structureReviewed: true },
        actor,
      ),
    ).rejects.toThrow("do not belong");
    await expect(
      service.populate(
        42,
        {
          unitIds: [topic.subtopics[0].id],
          questionCount: 10,
          structureReviewed: false,
        },
        actor,
      ),
    ).rejects.toThrow("Review");
    document.grade = "Unspecified";
    await expect(
      service.populate(
        42,
        {
          unitIds: [topic.subtopics[0].id],
          questionCount: 10,
          structureReviewed: true,
        },
        actor,
      ),
    ).rejects.toThrow("Grade 1");
    expect(generation.createJob).not.toHaveBeenCalled();
  });
  it("queues objective practice through the existing quota/idempotency service", async () => {
    const { service, generation, queue } = setup();
    const dto = {
      unitIds: [topic.subtopics[0].id],
      questionCount: 10,
      structureReviewed: true,
    };
    await service.populate(42, dto, actor);
    const key = generation.createJob.mock.calls[0][1];
    await service.populate(42, dto, actor);
    expect(generation.createJob.mock.calls[1][1]).toBe(key);
    expect(generation.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        questionTypes: ["MULTIPLE_CHOICE", "TRUE_FALSE"],
        difficulty: "MIXED",
        subtopicIds: [topic.subtopics[0].id],
      }),
      expect.any(String),
      actor,
    );
    expect(queue.enqueueGeneration).toHaveBeenCalledWith(9);
  });
  it("skips existing drafts and recovers queued requests without generating duplicates", async () => {
    const job = {
      id: 9,
      status: "SUCCEEDED",
      parameters: { topicId: topic.id, subtopicIds: [topic.subtopics[0].id] },
      artifacts: [{ id: 11, status: "APPROVED" }],
    };
    const { service, generation, prisma, queue } = setup([job]);
    const dto = {
      unitIds: [topic.subtopics[0].id],
      questionCount: 10,
      structureReviewed: true,
    };
    expect((await service.populate(42, dto, actor)).results[0].status).toBe(
      "EXISTS",
    );
    expect(generation.createJob).not.toHaveBeenCalled();
    prisma.aiGenerationJob.findMany.mockResolvedValue([
      { ...job, status: "QUEUED", artifacts: [] },
    ]);
    await service.populate(42, dto, actor);
    expect(queue.enqueueGeneration).toHaveBeenCalledWith(9);
    expect(generation.createJob).not.toHaveBeenCalled();
  });
  it("keeps per-unit quota failures visible and retries failed attempts with a distinct stable key", async () => {
    const { service, generation } = setup([
      {
        id: 8,
        status: "FAILED",
        parameters: { topicId: topic.id, subtopicIds: [topic.subtopics[0].id] },
        artifacts: [],
      },
    ]);
    generation.createJob.mockRejectedValue(new Error("Monthly quota reached"));
    const r = await service.populate(
      42,
      {
        unitIds: [topic.subtopics[0].id],
        questionCount: 10,
        structureReviewed: true,
      },
      actor,
    );
    expect(r.results[0]).toMatchObject({
      status: "ERROR",
      error: expect.stringContaining("quota"),
    });
    expect(generation.createJob.mock.calls[0][1]).toMatch(/-8$/);
  });
  it("blocks cross-tenant sources and unrelated artifact publication", async () => {
    const { service, document, publishing } = setup();
    await expect(
      service.publish(42, { artifactIds: [999], reviewed: true }, actor),
    ).rejects.toThrow("belong");
    document.schoolId = 99;
    await expect(service.coverage(42, actor)).rejects.toThrow("not found");
    expect(publishing.publish).not.toHaveBeenCalled();
  });
  it("publishes only linked reviewed artifacts using the independent destination", async () => {
    const { service, publishing } = setup([
      {
        id: 9,
        status: "SUCCEEDED",
        parameters: { topicId: topic.id, subtopicIds: [topic.subtopics[0].id] },
        artifacts: [{ id: 11, status: "APPROVED" }],
      },
    ]);
    await service.publish(42, { artifactIds: [11], reviewed: true }, actor);
    expect(publishing.publish).toHaveBeenCalledWith(
      11,
      true,
      actor,
      "INDEPENDENT",
    );
  });
  it("validates batch bounds and explicit review attestations", async () => {
    expect(
      await validate(
        plainToInstance(PopulateCurriculumDto, {
          unitIds: ["a"],
          questionCount: 10,
          structureReviewed: true,
        }),
      ),
    ).toEqual([]);
    expect(
      (
        await validate(
          plainToInstance(PopulateCurriculumDto, {
            unitIds: Array.from({ length: 21 }, (_, i) => String(i)),
            questionCount: 100,
            structureReviewed: false,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(PublishCurriculumDto, {
            artifactIds: [1, 1],
            reviewed: false,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
describe("Independent AI publication", () => {
  const content = {
    title: "Place value practice",
    grade: "Grade 4",
    subject: "Mathematics",
    topicName: "Place value",
    difficulty: "MIXED",
    questions: [
      {
        questionText: "What is the value of 3 in 34?",
        questionType: "MULTIPLE_CHOICE",
        options: ["3", "30", "300", "4"],
        correctAnswer: "30",
        explanation:
          "The digit 3 is in the tens place, so its value is thirty.",
        points: 1,
        difficulty: "EASY",
      },
    ],
  };
  function publisher(status = "APPROVED", schoolCode = "INDEPENDENT") {
    const artifact = {
      id: 11,
      status,
      schoolId: 7,
      version: 1,
      publishedAssignmentId: status === "PUBLISHED" ? 30 : null,
      content,
    };
    const artifacts = { findOne: jest.fn().mockResolvedValue(artifact) };
    const prisma = {
      aiContentArtifact: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest
          .fn()
          .mockResolvedValue({ ...artifact, status: "PUBLISHED" }),
      },
      aiReviewEvent: { create: jest.fn().mockResolvedValue({}) },
      assignment: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ school: { code: schoolCode } }),
      },
      $transaction: jest.fn().mockImplementation((a) => Promise.all(a)),
    };
    const assignments = {
      validateExamJsonRaw: jest.fn().mockResolvedValue({ valid: true }),
      createIndependent: jest.fn().mockResolvedValue({ id: 30 }),
      create: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ id: 30, isPublished: false }),
      update: jest.fn().mockResolvedValue({}),
    };
    const service = new AiPublishService(
      prisma as any,
      artifacts as any,
      new AiArtifactMapperService(),
      assignments as any,
      { assertEnabled: jest.fn() } as any,
      { record: jest.fn() } as any,
    );
    return { service, assignments };
  }
  it("creates an auto-marked independent draft, preserves explanations and explicitly publishes", async () => {
    const { service, assignments } = publisher();
    await service.publish(11, true, actor, "INDEPENDENT");
    expect(assignments.createIndependent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUTO_MARKED",
        isPublished: false,
        questions: [
          expect.objectContaining({
            explanation: content.questions[0].explanation,
          }),
        ],
      }),
      actor,
    );
    expect(assignments.create).not.toHaveBeenCalled();
    expect(assignments.update).toHaveBeenCalledWith(
      30,
      { isPublished: true },
      actor,
    );
  });
  it("rejects unapproved drafts, non-admins and mismatched existing destinations", async () => {
    await expect(
      publisher("GENERATED").service.publish(11, true, actor, "INDEPENDENT"),
    ).rejects.toThrow("Only approved");
    await expect(
      publisher().service.publish(
        11,
        true,
        { ...actor, role: Role.TEACHER },
        "INDEPENDENT",
      ),
    ).rejects.toThrow("Only platform");
    await expect(
      publisher("PUBLISHED", "OTHER").service.publish(
        11,
        true,
        actor,
        "INDEPENDENT",
      ),
    ).rejects.toThrow("school assignment");
  });
});

describe("Curriculum extraction and generated quality checks", () => {
  it("preserves explicit outcomes and rejects duplicate questions or ambiguous options", async () => {
    const { AiExtractionService } = await import("./ai-extraction.service");
    const { AiTopicAssignmentService } =
      await import("./ai-topic-assignment.service");
    const extraction = new AiExtractionService(
      ...(Array(6).fill({}) as [any, any, any, any, any, any]),
    );
    const normalized = (extraction as any).normalizeExtractedContent(
      { topics: [topic] },
      42,
    );
    expect(normalized.topics[0].subtopics[0].learningOutcomes).toEqual(
      topic.subtopics[0].learningOutcomes,
    );
    const generation = new AiTopicAssignmentService(
      ...(Array(6).fill({}) as [any, any, any, any, any, any]),
    );
    const q = {
      questionText: "What is two plus three?",
      questionType: "MULTIPLE_CHOICE",
      options: ["4", "5", "6", "7"],
      correctAnswer: "5",
      explanation: "Adding three to two gives five.",
      points: 1,
      difficulty: "EASY",
    };
    expect(() =>
      (generation as any).normalizeQuestions(
        { questions: [q, { ...q, questionText: "What is two  plus three?" }] },
        2,
        ["MULTIPLE_CHOICE"],
        "MIXED",
      ),
    ).toThrow("duplicates");
    expect(() =>
      (generation as any).normalizeQuestions(
        { questions: [{ ...q, options: ["5", "5", "6", "7"] }] },
        1,
        ["MULTIPLE_CHOICE"],
        "MIXED",
      ),
    ).toThrow("distinct options");
  });
});

describe("Bulk local queue admission", () => {
  it("bounds concurrent provider jobs and deduplicates queued requests", async () => {
    const { AiQueueService } = await import("./ai-queue.service");
    let active = 0,
      max = 0;
    const releases: (() => void)[] = [];
    const generations = {
      processGeneration: jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            active++;
            max = Math.max(max, active);
            releases.push(() => {
              active--;
              resolve();
            });
          }),
      ),
    };
    const queue = new AiQueueService(
      { get: () => "2" } as any,
      {} as any,
      {} as any,
      generations as any,
    );
    for (const id of [1, 2, 3, 4, 1]) await queue.enqueueGeneration(id);
    await new Promise((resolve) => setImmediate(resolve));
    expect(generations.processGeneration).toHaveBeenCalledTimes(2);
    releases.splice(0).forEach((r) => r());
    await new Promise((resolve) => setImmediate(resolve));
    expect(generations.processGeneration).toHaveBeenCalledTimes(4);
    expect(max).toBe(2);
    releases.splice(0).forEach((r) => r());
    await new Promise((resolve) => setImmediate(resolve));
    await queue.onModuleDestroy();
  });
});
