import { ContentLibraryService } from "./content-library.service";
import { QuestionBankService } from "./question-bank.service";
import { AssignmentsService } from "../assignments/assignments.service";
import { PublishContentDto } from "./dto/publish-content.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
const actor = { id: 42, schoolId: 99, role: "PLATFORM_ADMIN" } as any;
const q = (id: number, extra = {}) => ({
  id,
  subject: "Mathematics",
  grade: "Grade 7",
  topic: "Fractions",
  isGlobal: true,
  status: "APPROVED",
  questionType: "MULTIPLE_CHOICE",
  questionText: `Question ${id}`,
  options: ["A", "B", "C", "D"],
  correctAnswer: "B",
  explanation: "B is the correct option because of the calculation.",
  points: 1,
  config: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  diagramUrl: null,
  diagramAlt: null,
  contentHtml: null,
  ...extra,
});
function fixture(initial: any[]) {
  const questions = initial.map((row) => ({ ...row })),
    assignments: any[] = [],
    usages: any[] = [],
    deliveries: any[] = [],
    jobs: any[] = [];
  const schools = [
    { id: 1, code: "INDEPENDENT", name: "Individuals" },
    { id: 2, code: "SCHOOL2", name: "School Two" },
    { id: 3, code: "SCHOOL3", name: "School Three" },
    { id: 4, code: "EXPIRED", name: "Expired School" },
  ];
  const access = schools.slice(1).map((s) => ({
    active: true,
    school: {
      ...s,
      subscriptions: [
        {
          status: "ACTIVE",
          startedAt: new Date(),
          expiresAt: s.id === 4 ? new Date(0) : new Date(Date.now() + 86400000),
        },
      ],
    },
  }));
  const match = (row: any, w: any): boolean =>
    Object.entries(w ?? {}).every(([key, val]) => {
      if (val === undefined) return true;
      const v = val as any;
      if (key === "AND") return v.every((entry: any) => match(row, entry));
      if (key === "OR") return v.some((entry: any) => match(row, entry));
      if (key === "NOT") return !match(row, v);
      const value = row[key];
      if (v instanceof Date) return +new Date(value) === +v;
      if (v === null || typeof v !== "object") return value === v;
      if (value === null || value === undefined) return false;
      if (v.in && !v.in.includes(value)) return false;
      if (v.notIn?.includes(value)) return false;
      if (v.lte !== undefined && +new Date(value) > +v.lte) return false;
      if (
        v.equals !== undefined &&
        String(value).toLowerCase() !== String(v.equals).toLowerCase()
      )
        return false;
      if (
        v.contains !== undefined &&
        !String(value).toLowerCase().includes(v.contains.toLowerCase())
      )
        return false;
      if (v.startsWith !== undefined && !String(value).startsWith(v.startsWith))
        return false;
      if (
        ![
          "in",
          "notIn",
          "lte",
          "equals",
          "contains",
          "mode",
          "startsWith",
        ].some((k) => k in v)
      )
        return match(value, v);
      return true;
    });
  const tx: any = {
    $executeRaw: jest.fn(),
    school: {
      findUnique: jest.fn(async ({ where }) =>
        schools.find((s) => s.id === where.id),
      ),
      upsert: jest.fn(async () => schools[0]),
    },
    schoolQuestionBankAccess: {
      findMany: jest.fn(async ({ where }) =>
        access.filter(
          (a) =>
            a.active && (!where.schoolId || a.school.id === where.schoolId),
        ),
      ),
    },
    questionBank: {
      findMany: jest.fn(async ({ where }) =>
        questions.filter((row) => match(row, where)),
      ),
      count: jest.fn(
        async ({ where }) =>
          questions.filter((row) => match(row, where)).length,
      ),
    },
    assignment: {
      count: jest.fn(
        async ({ where }) =>
          assignments.filter((row) => match(row, where)).length,
      ),
      create: jest.fn(async ({ data }) => {
        const row = {
          id: assignments.length + 1,
          ...data,
          createdBy: { role: "PLATFORM_ADMIN" },
        };
        assignments.push(row);
        return row;
      }),
    },
    questionBankUsage: {
      findMany: jest.fn(async ({ where }) =>
        usages
          .map((u) => ({
            ...u,
            assignment: assignments.find((a) => a.id === u.assignmentId),
          }))
          .filter((u) => match(u, where)),
      ),
      createMany: jest.fn(async ({ data }) => {
        usages.push(...data);
        return { count: data.length };
      }),
    },
    assignmentDeliveryConfig: {
      create: jest.fn(async ({ data }) => {
        deliveries.push(data);
        return data;
      }),
    },
    contentLibraryJob: {
      create: jest.fn(async ({ data }) => {
        const job = { id: `job${jobs.length + 1}`, status: "QUEUED", ...data };
        jobs.push(job);
        return job;
      }),
      update: jest.fn(async () => ({})),
    },
  };
  const p: any = {
    ...tx,
    assignment: {
      ...tx.assignment,
      create: jest.fn(() => {
        throw Error("Assignment write escaped the transaction");
      }),
    },
  };
  let pending = Promise.resolve();
  p.$transaction = jest.fn((fn: any) => {
    const run = pending.then(async () => {
      const sizes = [assignments.length, usages.length, deliveries.length];
      try {
        return await fn(tx);
      } catch (e) {
        assignments.splice(sizes[0]);
        usages.splice(sizes[1]);
        deliveries.splice(sizes[2]);
        throw e;
      }
    });
    pending = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  });
  const sms = { getStudentRecipients: jest.fn() };
  const native = new AssignmentsService(p, sms as any, {} as any);
  const service = new QuestionBankService(
    p,
    {} as any,
    native,
    { record: jest.fn() } as any,
    {} as any,
    {} as any,
  );
  return {
    service,
    p,
    tx,
    assignments,
    usages,
    deliveries,
    jobs,
    questions,
    access,
    sms,
  };
}
describe("Explicit question-bank publication", () => {
  it("queues only approved work and captures eligible school audiences", async () => {
    const f = fixture([q(1), q(2, { status: "GENERATED" })]);
    expect(
      await f.service.queuePublication(
        { scope: "IDS", ids: [1], audience: "BOTH", schoolScope: "ALL" },
        actor,
      ),
    ).toMatchObject({ independent: true, schoolCount: 2, status: "QUEUED" });
    expect(f.jobs[0].input.schoolIds).toEqual([2, 3]);
    await expect(
      f.service.queuePublication(
        { scope: "IDS", ids: [2], audience: "INDEPENDENT" },
        actor,
      ),
    ).rejects.toThrow("approved");
    await expect(
      f.service.queuePublication(
        {
          scope: "IDS",
          ids: [1],
          audience: "SCHOOLS",
          schoolScope: "SELECTED",
          schoolIds: [4],
        },
        actor,
      ),
    ).rejects.toThrow("subscribed");
    expect(f.assignments).toHaveLength(0);
  });
  it("publishes real grade/subject/topic assignments to both audiences and skips repeat copies", async () => {
    const f = fixture([
      ...Array.from({ length: 35 }, (_, i) => q(i + 1)),
      q(36, { subject: "English", topic: "Reading", points: 2 }),
      q(37, { grade: "Grade 8", topic: "Angles" }),
      q(38, { status: "GENERATED" }),
    ]);
    await f.service.queuePublication(
      { scope: "IDS", ids: f.questions.map((q) => q.id), audience: "BOTH" },
      actor,
    );
    const dto = f.jobs[0].input;
    expect(await f.service.publishContent(dto, actor, "job1")).toMatchObject({
      assignmentsCreated: 9,
      questionCopies: 111,
      independentPublished: true,
      schoolCount: 2,
      failures: [],
    });
    for (const schoolId of [1, 2, 3]) {
      const rows = f.assignments.filter((a) => a.schoolId === schoolId);
      expect(rows).toHaveLength(3);
      expect(
        rows.every((a) => a.isPublished && a.description.startsWith("Topic:")),
      ).toBe(true);
      expect(rows.find((a) => a.subject === "English")).toMatchObject({
        grade: "Grade 7",
        description: "Topic: Reading\nPublished from Question Bank",
      });
      expect(rows.find((a) => a.grade === "Grade 8")).toMatchObject({
        subject: "Mathematics",
        description: "Topic: Angles\nPublished from Question Bank",
      });
    }
    expect(f.deliveries).toHaveLength(3);
    expect(
      f.deliveries.every((d) => d.questionCount === 30 && d.poolSize === 35),
    ).toBe(true);
    expect(await f.service.publishContent(dto, actor, "job1")).toMatchObject({
      assignmentsCreated: 0,
      alreadyPublished: 111,
    });
    expect(f.assignments).toHaveLength(9);
    expect(f.usages).toHaveLength(111);
    expect(f.sms.getStudentRecipients).not.toHaveBeenCalled();
  });
  it("does not deliver school-only content to independent learners or other schools", async () => {
    const f = fixture([q(1)]);
    await f.service.queuePublication(
      {
        scope: "IDS",
        ids: [1],
        audience: "SCHOOLS",
        schoolScope: "SELECTED",
        schoolIds: [2],
      },
      actor,
    );
    await f.service.publishContent(f.jobs[0].input, actor, "job1");
    expect(f.assignments).toHaveLength(1);
    expect(f.assignments[0].schoolId).toBe(2);
  });
  it("publishes two generations of the same topic into distinct numbered assignments", async () => {
    const f = fixture([q(1, { batchId: 1 }), q(2, { batchId: 2 })]);
    const result = await f.service.publishContent(
      { scope: "IDS", ids: [1, 2], audience: "INDEPENDENT" },
      actor,
      "pub",
    );
    expect(result.assignmentsCreated).toBe(2);
    expect(f.assignments.map((a) => a.title)).toEqual([
      "Mathematics · Fractions · Batch 1",
      "Mathematics · Fractions · Batch 2",
    ]);
    expect(f.assignments.map((a) => a.questions.create.length)).toEqual([1, 1]);
  });
  it("publishes only the selected saved batch when selecting across pages", async () => {
    const f = fixture([q(1, { batchId: 1 }), q(2, { batchId: 2 })]);
    await f.service.publishContent(
      {
        scope: "FILTER",
        before: new Date().toISOString(),
        filters: { batchId: 2 },
        audience: "INDEPENDENT",
      },
      actor,
      "pub",
    );
    expect(f.usages.map((u) => u.questionBankId)).toEqual([2]);
  });
  it("keeps images, grading configuration and essay marking semantics", async () => {
    const f = fixture([
      q(1, {
        diagramUrl: "https://example.test/cell.png",
        diagramAlt: 'A "cell"',
      }),
      q(2, { questionType: "ESSAY", points: 10, correctAnswer: "Model essay" }),
      q(3, { questionType: "NUMERIC", correctAnswer: "12", config: null }),
    ]);
    await f.service.publishContent(
      { scope: "IDS", ids: [1, 2, 3], audience: "INDEPENDENT" },
      actor,
      "job",
    );
    expect(f.assignments[0].type).toBe("TEACHER_MARKED");
    const copied = f.assignments[0].questions.create;
    expect(copied[0].contentHtml).toContain('alt="A &quot;cell&quot;"');
    expect(copied[2].config).toEqual({ numeric: { acceptedValue: 12 } });
  });
  it("rechecks subscriptions when the saved job executes", async () => {
    const f = fixture([q(1)]);
    await f.service.queuePublication(
      {
        scope: "IDS",
        ids: [1],
        audience: "SCHOOLS",
        schoolScope: "SELECTED",
        schoolIds: [2],
      },
      actor,
    );
    f.access[0].school.subscriptions[0].status = "PAST_DUE";
    await expect(
      f.service.publishContent(f.jobs[0].input, actor, "job1"),
    ).rejects.toThrow("no longer active");
    expect(f.assignments).toHaveLength(0);
  });
  it("rolls back assignment creation if provenance fails, then retries without duplicates", async () => {
    const f = fixture([q(1)]);
    f.tx.questionBankUsage.createMany.mockRejectedValueOnce(
      Error("Database interruption"),
    );
    const dto = {
      scope: "IDS",
      ids: [1],
      audience: "INDEPENDENT",
    } as PublishContentDto;
    await expect(f.service.publishContent(dto, actor, "job")).rejects.toThrow(
      "Database interruption",
    );
    expect(f.assignments).toHaveLength(0);
    expect(await f.service.publishContent(dto, actor, "job")).toMatchObject({
      assignmentsCreated: 1,
    });
    expect(f.assignments).toHaveLength(1);
  });
  it("enforces admin permissions and validates audience selections", async () => {
    const f = fixture([q(1)]);
    await expect(
      f.service.queuePublication(
        { scope: "IDS", ids: [1], audience: "INDEPENDENT" },
        { ...actor, role: "TEACHER" },
      ),
    ).rejects.toThrow("Platform Admin");
    for (const dto of [
      { scope: "IDS", ids: [1], audience: "UNKNOWN" },
      { scope: "IDS", ids: [1], audience: "SCHOOLS", schoolScope: "SELECTED" },
      { scope: "IDS", ids: [], audience: "INDEPENDENT" },
    ])
      expect(
        (await validate(plainToInstance(PublishContentDto, dto))).length,
      ).toBeGreaterThan(0);
  });
});

describe("Publication job lifecycle", () => {
  it("runs queued publication with the creating admin and persists completion", async () => {
    const job = {
      id: "pub",
      kind: "PUBLISH_CONTENT",
      createdById: actor.id,
      input: { audience: "INDEPENDENT", scope: "IDS", ids: [1] },
    };
    const p: any = {
      user: { findUnique: jest.fn().mockResolvedValue(actor) },
      contentLibraryJob: { update: jest.fn() },
    };
    const bank: any = {
      publishContent: jest
        .fn()
        .mockResolvedValue({ assignmentsCreated: 1, failures: [] }),
    };
    const worker = new ContentLibraryService(p, bank, {} as any, {} as any);
    await (worker as any).runJob(job);
    expect(bank.publishContent).toHaveBeenCalledWith(job.input, actor, "pub");
    expect(p.contentLibraryJob.update).toHaveBeenLastCalledWith({
      where: { id: "pub" },
      data: {
        status: "COMPLETED",
        result: { assignmentsCreated: 1, failures: [] },
      },
    });
  });
  it("allows retrying partial publication but refuses to rerun successful completed jobs", async () => {
    const p: any = {
      contentLibraryJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: "pub",
          kind: "PUBLISH_CONTENT",
          status: "COMPLETED",
          result: { failures: [{ schoolId: 2, error: "Unavailable" }] },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const worker = new ContentLibraryService(
      p,
      {} as any,
      {} as any,
      {} as any,
    );
    expect(await worker.retry("pub")).toEqual({ id: "pub", status: "QUEUED" });
    p.contentLibraryJob.findUnique.mockResolvedValue({
      id: "pub",
      kind: "PUBLISH_CONTENT",
      status: "COMPLETED",
      result: { failures: [] },
    });
    await expect(worker.retry("pub")).rejects.toThrow("Only failed");
    expect(p.contentLibraryJob.updateMany).toHaveBeenCalledTimes(1);
  });
});
