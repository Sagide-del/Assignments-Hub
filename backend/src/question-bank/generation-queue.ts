import { Prisma } from "@prisma/client";

export const GENERATION_KINDS = [
  "OUTCOME_QUESTIONS",
  "OUTCOME_CARDS",
  "QUESTIONS",
  "CARDS",
];
export const QUESTION_KINDS = ["OUTCOME_QUESTIONS", "QUESTIONS"];

export function generationConcurrency() {
  const value = Number(process.env.CONTENT_GENERATION_CONCURRENCY ?? 3);
  return Number.isInteger(value) && value >= 1 && value <= 6 ? value : 3;
}

export function sameGeneration(a: any, b: any) {
  return (
    a.unitId === b.unitId &&
    a.sourceId === b.sourceId &&
    a.grade === b.grade &&
    a.subject === b.subject &&
    (a.unitId != null || a.topic === b.topic) &&
    (a.assessmentMode ?? "PRACTICE") === (b.assessmentMode ?? "PRACTICE")
  );
}

// Caller holds the content-generation-queue transaction lock. Reuse active
// work, and completed output only while its saved drafts still exist.
export async function reusableGeneration(
  tx: Prisma.TransactionClient,
  kind: string,
  input: any,
  excludeId?: string,
  includeQueued = true,
) {
  const identity = input.unitId != null ? "unitId" : "sourceId";
  const jobs = await tx.contentLibraryJob.findMany({
    where: {
      kind,
      status: {
        in: includeQueued
          ? ["QUEUED", "RUNNING", "COMPLETED"]
          : ["RUNNING", "COMPLETED"],
      },
      input: { path: [identity], equals: input[identity] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const requested = kind.endsWith("CARDS")
    ? Math.min(12, input.count)
    : input.count;
  for (const job of jobs) {
    const other = job.input as any;
    if (!sameGeneration(input, other)) continue;
    if (job.status !== "COMPLETED") {
      const capacity = kind.endsWith("CARDS")
        ? Math.min(12, other.count)
        : other.count;
      if (capacity >= requested) return job;
      continue;
    }
    const result = job.result as any;
    const ids = kind.endsWith("CARDS") ? result?.cardIds : result?.questionIds;
    if (!Array.isArray(ids) || ids.length < requested) continue;
    const count = kind.endsWith("CARDS")
      ? await tx.mnemonicCard.count({ where: { id: { in: ids } } })
      : await tx.questionBank.count({
          where: { id: { in: ids }, status: { not: "REJECTED" } },
        });
    if (count >= requested) return job;
  }
  return null;
}

export async function enqueueGeneration(
  tx: Prisma.TransactionClient,
  kind: string,
  input: any,
  createdById: number,
) {
  const existing = await reusableGeneration(tx, kind, input);
  if (existing) return null;
  return tx.contentLibraryJob.create({ data: { kind, input, createdById } });
}
