import "reflect-metadata";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ImportCombinationsDto } from "../career/matcher.dto";
import { checkedCatalog } from "../career/matcher.engine";
async function main() {
  const args = process.argv.slice(2),
    file = args.find(
      (a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--source",
    ),
    source = args[args.indexOf("--source") + 1],
    apply = args.includes("--apply"),
    reviewed = args.includes("--reviewed");
  if (!file) {
    if (apply)
      throw Error("Provide a source catalogue JSON file before applying.");
    console.log(
      "DRY RUN: no catalogue file supplied; no official combinations invented or written. Supply a JSON array and --source https://<official-source>",
    );
    return;
  }
  const raw = JSON.parse(await readFile(file, "utf8"));
  const dto = plainToInstance(ImportCombinationsDto, {
    source_url: source,
    reviewed,
    dry_run: !apply,
    combinations: Array.isArray(raw) ? raw : raw.combinations,
  });
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) throw Error("Invalid catalogue structure or source URL.");
  const rows = checkedCatalog(dto);
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "DRY RUN — no writes",
          records: rows.length,
          source: dto.source_url,
          codes: rows.map((r) => r.code),
          reviewed,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!reviewed)
    throw Error(
      "Confirm you reviewed the official source with --reviewed before --apply.",
    );
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(
      rows.map((row) =>
        prisma.moE_Combination.upsert({
          where: { code: row.code },
          create: row,
          update: row,
        }),
      ),
    );
    console.log(
      `Imported ${rows.length} source-reviewed combinations. Existing choices and historical records were preserved.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
