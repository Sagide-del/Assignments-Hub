import { ContentLibraryService } from "./content-library.service";
import {
  enqueueGeneration,
  generationConcurrency,
  reusableGeneration,
} from "./generation-queue";

const actor = { id: 42, role: "PLATFORM_ADMIN" };
const input = (unitId: number) => ({
  unitId,
  count: 5,
  grade: "Grade 7",
  subject: "Mathematics",
  assessmentMode: "PRACTICE",
});
function fixture(initial: any[]) {
  const jobs = initial.map((j, i) => ({
    createdById: 42,
    createdAt: new Date(i),
    status: "QUEUED",
    ...j,
  }));
  const matches = (j: any, w: any) =>
    (!w.id || (typeof w.id === "string" ? j.id === w.id : j.id !== w.id.not)) &&
    (!w.status ||
      (typeof w.status === "string"
        ? j.status === w.status
        : w.status.in.includes(j.status))) &&
    (!w.kind ||
      (typeof w.kind === "string"
        ? j.kind === w.kind
        : w.kind.in.includes(j.kind))) &&
    (!w.input || j.input[w.input.path[0]] === w.input.equals);
  const p: any = {
    $executeRaw: jest.fn(),
    contentLibraryJob: {
      findFirst: jest.fn(
        async ({ where }) => jobs.find((j) => matches(j, where)) ?? null,
      ),
      findMany: jest.fn(async ({ where }) =>
        jobs.filter((j) => matches(j, where)),
      ),
      updateMany: jest.fn(async ({ where, data }) => {
        if (!where.id) return { count: 0 };
        const found = jobs.filter((j) => matches(j, where));
        found.forEach((j) => Object.assign(j, data));
        return { count: found.length };
      }),
      update: jest.fn(async ({ where, data }) => {
        const job = jobs.find((j) => j.id === where.id)!;
        Object.assign(job, data);
        return job;
      }),
      create: jest.fn(async ({ data }) => {
        const job = { id: `new-${jobs.length}`, status: "QUEUED", ...data };
        jobs.push(job);
        return job;
      }),
    },
    questionBank: { count: jest.fn().mockResolvedValue(5) },
    mnemonicCard: { count: jest.fn().mockResolvedValue(5) },
    user: { findUnique: jest.fn().mockResolvedValue(actor) },
  };
  // Model PostgreSQL's advisory transaction lock for concurrent lane claims.
  let pending = Promise.resolve();
  p.$transaction = jest.fn((fn) => {
    const result = pending.then(() => fn(p));
    pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  });
  return { p, jobs };
}

describe("Bounded content generation queue", () => {
  const prior = process.env.CONTENT_GENERATION_CONCURRENCY;
  beforeEach(() => {
    process.env.CONTENT_GENERATION_CONCURRENCY = "3";
  });
  afterAll(() => {
    if (prior === undefined) delete process.env.CONTENT_GENERATION_CONCURRENCY;
    else process.env.CONTENT_GENERATION_CONCURRENCY = prior;
  });

  it("drains the backlog with three lanes and starts questions before older cards", async () => {
    const { p, jobs } = fixture([
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `c${i}`,
        kind: "OUTCOME_CARDS",
        input: input(i),
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `q${i}`,
        kind: "OUTCOME_QUESTIONS",
        input: input(i),
      })),
    ]);
    let active = 0,
      maximum = 0;
    const order: string[] = [];
    const processJob = jest.fn(async (job) => {
      active++;
      maximum = Math.max(maximum, active);
      order.push(job.id);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return {
        count: 5,
        questionIds: [1, 2, 3, 4, 5],
        cardIds: [1, 2, 3, 4, 5],
      };
    });
    const s = new ContentLibraryService(
      p,
      {} as any,
      {} as any,
      {} as any,
      { process: processJob } as any,
    );
    await Promise.all([s.work(), s.work()]);
    expect(maximum).toBe(3);
    expect(order.slice(0, 7)).toEqual(
      Array.from({ length: 7 }, (_, i) => `q${i}`),
    );
    expect(jobs.every((j) => j.status === "COMPLETED")).toBe(true);
    expect(processJob).toHaveBeenCalledTimes(11);
  });

  it("skips old queued duplicates and reuses completed saved output", async () => {
    const { p, jobs } = fixture([
      {
        id: "existing",
        kind: "OUTCOME_QUESTIONS",
        status: "COMPLETED",
        input: input(1),
        result: { questionIds: [1, 2, 3, 4, 5] },
      },
      { id: "repeat", kind: "OUTCOME_QUESTIONS", input: input(1) },
      { id: "owner", kind: "OUTCOME_QUESTIONS", input: input(2) },
      { id: "duplicate", kind: "OUTCOME_QUESTIONS", input: input(2) },
    ]);
    const processJob = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { questionIds: [1, 2, 3, 4, 5] };
    });
    await new ContentLibraryService(
      p,
      {} as any,
      {} as any,
      {} as any,
      { process: processJob } as any,
    ).work();
    expect(processJob).toHaveBeenCalledTimes(1);
    expect(jobs.find((j) => j.id === "repeat")).toMatchObject({
      status: "SKIPPED",
      result: { reusedJobId: "existing" },
    });
    expect(jobs.find((j) => j.id === "duplicate")).toMatchObject({
      status: "SKIPPED",
      result: { reusedJobId: "owner" },
    });
  });

  it("does not stop other jobs when one generation fails", async () => {
    const { p, jobs } = fixture(
      [1, 2, 3, 4].map((i) => ({
        id: `q${i}`,
        kind: "OUTCOME_QUESTIONS",
        input: input(i),
      })),
    );
    const processJob = jest.fn(async (job) => {
      if (job.id === "q1") throw Error("DeepSeek unavailable");
      return {};
    });
    await new ContentLibraryService(
      p,
      {} as any,
      {} as any,
      {} as any,
      { process: processJob } as any,
    ).work();
    expect(jobs.filter((j) => j.status === "FAILED")).toHaveLength(1);
    expect(jobs.filter((j) => j.status === "COMPLETED")).toHaveLength(3);
  });

  it("reuses matching active work but isolates grade, subject and assessment mode", async () => {
    const { p } = fixture([
      {
        id: "active",
        kind: "OUTCOME_QUESTIONS",
        input: input(1),
        status: "RUNNING",
      },
    ]);
    expect(
      await enqueueGeneration(p, "OUTCOME_QUESTIONS", input(1), 42),
    ).toBeNull();
    for (const change of [
      { grade: "Grade 8" },
      { subject: "English" },
      { assessmentMode: "WRITTEN" },
    ]) {
      expect(
        await enqueueGeneration(
          p,
          "OUTCOME_QUESTIONS",
          { ...input(1), ...change },
          42,
        ),
      ).not.toBeNull();
    }
    expect(p.contentLibraryJob.create).toHaveBeenCalledTimes(3);
  });

  it("does not reuse missing or rejected completed drafts or undersized batches", async () => {
    const { p } = fixture([
      {
        id: "done",
        kind: "OUTCOME_QUESTIONS",
        input: input(1),
        status: "COMPLETED",
        result: { questionIds: [1, 2, 3, 4, 5] },
      },
    ]);
    p.questionBank.count.mockResolvedValue(4);
    expect(
      await reusableGeneration(p, "OUTCOME_QUESTIONS", input(1)),
    ).toBeNull();
    expect(p.questionBank.count).toHaveBeenCalledWith({
      where: { id: { in: [1, 2, 3, 4, 5] }, status: { not: "REJECTED" } },
    });
    p.questionBank.count.mockResolvedValue(5);
    expect(
      await reusableGeneration(p, "OUTCOME_QUESTIONS", {
        ...input(1),
        count: 10,
      }),
    ).toBeNull();
  });

  it("bounds concurrency configuration and supports a smaller worker", () => {
    for (const value of ["0", "100", "bad", "2.5"]) {
      process.env.CONTENT_GENERATION_CONCURRENCY = value;
      expect(generationConcurrency()).toBe(3);
    }
    process.env.CONTENT_GENERATION_CONCURRENCY = "1";
    expect(generationConcurrency()).toBe(1);
  });
});
