/** Additive migration. Default: dry-run. Explicit --execute is required to write.
 * Run: npx ts-node src/scripts/migrate-question-bank.ts --dry-run
 * Uses DATABASE_URL; never changes legacy records or delivery/submission history.
 */
import { createHash } from "crypto";
import { isDeepStrictEqual } from "util";
import { Prisma, PrismaClient, QuestionBank } from "@prisma/client";

export const LEGACY_THEORY = "Legacy content migrated from old system.";
export function migrationGroups(rows: QuestionBank[]) {
  const groups = new Map<
    string,
    {
      id: string;
      grade: number;
      subject: string;
      topic: string;
      tenant: string | null;
      rows: QuestionBank[];
    }
  >();
  for (const row of rows) {
    const match = row.grade.trim().match(/^(?:grade\s*)?(6|7|8|9|10|11|12)$/i);
    if (!match || !row.subject.trim() || !row.topic.trim())
      throw new Error(
        `QuestionBank ${row.id}: invalid grade/subject/topic. No records written; correct classification before retrying.`,
      );
    // School content must never enter a global module, even if flags disagree.
    if ((!row.isGlobal || row.source === "SCHOOL") && row.schoolId === null)
      throw new Error(`QuestionBank ${row.id}: school scope has no school ID.`);
    const tenant = row.schoolId === null ? null : String(row.schoolId);
    const grade = Number(match[1]);
    const subject = row.subject.trim(),
      topic = row.topic.trim();
    const key = JSON.stringify([
      "question-bank-v1",
      tenant,
      grade,
      subject,
      topic,
    ]);
    const hex = createHash("sha256").update(key).digest("hex");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    const group = groups.get(key) ?? {
      id,
      grade,
      subject,
      topic,
      tenant,
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}
export function legacyPayload(rows: QuestionBank[]) {
  return {
    source: "LEGACY",
    migration_version: 1,
    theory_text: LEGACY_THEORY,
    equations: [],
    illustration_prompt: "",
    questions: rows.map((row) => ({
      question_text: row.questionText,
      options: Array.isArray(row.options) ? row.options : [],
      correct_answer: row.correctAnswer,
      explanation: row.explanation ?? "",
      legacy_question_id: row.id,
    })),
    // Lossless snapshots retain matching/config/rubric/HTML/assets/status/batches.
    // Answers and private grading metadata remain admin-only, like CMS content.
    legacy_records: JSON.parse(JSON.stringify(rows)) as Prisma.InputJsonValue,
  };
}
export async function migrateQuestionBank(
  prisma: PrismaClient,
  execute = false,
) {
  return prisma.$transaction(
    async (tx) => {
      if (!execute) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const rows: QuestionBank[] = [];
      let cursor: number | undefined;
      for (;;) {
        const page = await tx.questionBank.findMany({
          orderBy: { id: "asc" },
          take: 1000,
          ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
        });
        rows.push(...page);
        if (page.length < 1000) break;
        cursor = page[page.length - 1].id;
      }
      const groups = migrationGroups(rows);
      let created = 0,
        questions = 0,
        skipped = 0;
      for (const group of groups) {
        const existing = await tx.masterModule.findUnique({
          where: { id: group.id },
        });
        const payload = legacyPayload(group.rows);
        if (existing) {
          const saved = existing.content_json as Record<string, unknown>;
          // Never overwrite enriched content. New legacy rows require a deliberate follow-up.
          if (
            saved.source !== "LEGACY" ||
            !isDeepStrictEqual(saved.legacy_records, payload.legacy_records)
          )
            throw new Error(
              `Module ${group.id}: existing snapshot differs. Refusing to overwrite historical/enriched content.`,
            );
          skipped++;
          console.log(
            `SKIP existing module ${group.id} (${group.rows.length} questions)`,
          );
          continue;
        }
        console.log(
          `${execute ? "CREATE" : "WOULD CREATE"} Grade ${group.grade} | ${JSON.stringify(group.subject)} | ${JSON.stringify(group.topic)} | scope=${group.tenant ?? "GLOBAL"} | ${group.rows.length} questions | statuses=${[...new Set(group.rows.map((row) => row.status))].join(",")} | module=${group.id}`,
        );
        if (execute)
          await tx.masterModule.create({
            data: {
              id: group.id,
              grade: group.grade,
              subject: group.subject,
              topic: group.topic,
              level:
                group.grade >= 10
                  ? "Senior School"
                  : group.grade >= 7
                    ? "Junior School"
                    : "Primary School",
              tenant_id: group.tenant,
              status: "APPROVED",
              content_json: payload as Prisma.InputJsonObject,
            },
          });
        created++;
        questions += group.rows.length;
      }
      console.log(
        `${execute ? "COMPLETE" : "DRY RUN — no writes"}: ${created} modules ${execute ? "created" : "planned"}, ${questions} questions ${execute ? "migrated" : "planned"}; ${skipped} existing modules skipped; ${rows.length} source questions inspected.`,
      );
      return {
        modules: created,
        questions,
        skipped,
        sourceQuestions: rows.length,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 300000,
      maxWait: 10000,
    },
  );
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => !["--dry-run", "--execute"].includes(arg)) ||
    (args.includes("--execute") && args.includes("--dry-run"))
  ) {
    console.error("Use --dry-run (default) OR --execute.");
    process.exitCode = 1;
  } else {
    const prisma = new PrismaClient();
    migrateQuestionBank(prisma, args.includes("--execute"))
      .catch((error) => {
        console.error("Migration stopped:", error.message);
        process.exitCode = 1;
      })
      .finally(() => prisma.$disconnect());
  }
}
