import { isDeepStrictEqual } from "util";
/** Adds drawings only. Never changes questions, teaching points, status or distributions. */
import "reflect-metadata";
import { ConfigModule } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Prisma, PrismaClient } from "@prisma/client";
import { AiModule } from "../ai/ai.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CheatsheetDiagramService } from "../cms/cheatsheet-diagram.service";
import { validateTheoryCheatsheet } from "../cms/theory-cheatsheet";
import { resolveCheatsheetVisual } from "../cms/cheatsheet-visuals";
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AiModule],
  providers: [CheatsheetDiagramService],
})
class DiagramBackfillModule {}
const arg = (key: string) =>
  process.argv.find((v) => v.startsWith(key + "="))?.slice(key.length + 1);
export async function backfillCheatsheetDiagrams() {
  const apply = process.argv.includes("--apply");
  const limit = Number(arg("--limit") || 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500)
    throw Error("--limit must be between 1 and 500");
  if (!process.env.DATABASE_URL)
    throw Error("DATABASE_URL is required. No database was contacted.");
  const db = new PrismaClient();
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;
  try {
    let actor: { id: number; schoolId: number | null } | undefined;
    let diagrams: CheatsheetDiagramService | undefined;
    if (apply) {
      const id = Number(arg("--actor-id"));
      if (!Number.isInteger(id) || id < 1)
        throw Error(
          "--apply requires --actor-id=<platform admin user ID> for AI usage accounting",
        );
      const user = await db.user.findUnique({
        where: { id },
        select: { id: true, schoolId: true, role: true },
      });
      if (!user || user.role !== "PLATFORM_ADMIN")
        throw Error("Backfill actor must be an existing platform admin");
      actor = user;
      app = await NestFactory.createApplicationContext(DiagramBackfillModule, {
        logger: ["error", "warn"],
      });
      diagrams = app.get(CheatsheetDiagramService);
    }
    let eligible = 0,
      updated = 0,
      skipped = 0,
      failed = 0,
      scanned = 0;
    let after = arg("--after"),
      hasMore = false;
    do {
      const rows = await db.masterModule.findMany({
        where: {
          theory_cheatsheet: { not: Prisma.DbNull },
          ...(after ? { id: { gt: after } } : {}),
        },
        orderBy: { id: "asc" },
        take: limit,
        select: {
          id: true,
          topic: true,
          subject: true,
          grade: true,
          updated_at: true,
          theory_cheatsheet: true,
          content_json: true,
          generation_cost_tokens: true,
        },
      });
      scanned += rows.length;
      for (const row of rows) {
        try {
          const original = row.content_json;
          if (
            !original ||
            typeof original !== "object" ||
            Array.isArray(original)
          ) {
            skipped++;
            continue;
          }
          const hasSheet = (v: unknown) =>
            !!v &&
            typeof v === "object" &&
            !Array.isArray(v) &&
            Object.prototype.hasOwnProperty.call(v, "key_concepts");
          const top = hasSheet(row.theory_cheatsheet)
            ? row.theory_cheatsheet
            : undefined;
          const embedded = hasSheet(original.theory_cheatsheet)
            ? original.theory_cheatsheet
            : undefined;
          if (!top && !embedded) {
            skipped++;
            continue;
          }
          if (top && embedded && !isDeepStrictEqual(top, embedded))
            throw Error(
              "Top-level and embedded sheets differ; no automatic overwrite",
            );
          const sheet = validateTheoryCheatsheet(top ?? embedded);
          if (
            top &&
            (sheet.visual_diagram || resolveCheatsheetVisual(row.topic))
          ) {
            skipped++;
            continue;
          }
          eligible++;
          if (!apply) {
            console.log(
              JSON.stringify({
                id: row.id,
                topic: row.topic,
                action:
                  "Would generate and persist an explanatory diagram; preserve all questions and text",
              }),
            );
            continue;
          }
          const visual = await diagrams!.ensure(
            sheet,
            row.topic,
            row.subject,
            row.grade,
            { userId: actor!.id, schoolId: actor!.schoolId },
          );
          if (row.generation_cost_tokens + visual.tokens > 2147483647)
            throw Error("Token counter overflow");
          const result = await db.masterModule.updateMany({
            where: {
              id: row.id,
              updated_at: row.updated_at,
              content_json: { equals: original },
            },
            data: {
              theory_cheatsheet:
                visual.sheet as unknown as Prisma.InputJsonValue,
              content_json: {
                ...original,
                theory_cheatsheet: visual.sheet,
              } as unknown as Prisma.InputJsonValue,
              generation_cost_tokens: { increment: visual.tokens },
            },
          });
          if (result.count !== 1)
            throw Error("Record changed concurrently; retry later");
          updated++;
        } catch (error) {
          failed++;
          console.error(
            JSON.stringify({
              id: row.id,
              error:
                error instanceof Error
                  ? error.message
                  : "Diagram backfill failed",
            }),
          );
        }
      }
      after = rows.at(-1)?.id ?? after;
      hasMore = rows.length === limit;
    } while (process.argv.includes("--all") && hasMore && !failed);
    console.log(
      JSON.stringify({
        mode: apply ? "APPLY" : "DRY RUN — no AI calls or writes",
        scanned,
        eligible,
        updated,
        skipped,
        failed,
        next_after: hasMore && !failed ? after : null,
      }),
    );
    if (failed) process.exitCode = 1;
  } finally {
    if (app) await app.close();
    await db.$disconnect();
  }
}
if (require.main === module)
  void backfillCheatsheetDiagrams().catch((error) => {
    console.error(error instanceof Error ? error.message : "Backfill failed");
    process.exitCode = 1;
  });
