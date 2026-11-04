import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import suppliedTaxonomy from "./taxonomy-seed.json";

// Exact supplied rows, including the separately supplied Grade 12 appendix.
// Do not extrapolate missing grades or treat this as verified official coverage.
export interface TaxonomySeedRow {
  level: string;
  grade: number;
  pathway: string | null;
  track: string | null;
  subject: string;
  topics: string[];
}
export const TAXONOMY_SEED: TaxonomySeedRow[] = suppliedTaxonomy;
export function validateTaxonomySeed(rows = TAXONOMY_SEED) {
  const keys = new Set<string>();
  const tracks: Record<string, string[]> = {
    STEM: [
      "Pure Sciences",
      "Technical and Engineering",
      "Applied Sciences",
      "Career and Technology Studies (CTS)",
    ],
    "Social Sciences": ["Humanities", "Languages"],
    "Arts and Sports Science": [
      "Performing Arts",
      "Visual Arts",
      "Sports Science",
    ],
  };
  for (const row of rows) {
    if (
      !Number.isInteger(row.grade) ||
      row.grade < 1 ||
      row.grade > 12 ||
      !row.level?.trim() ||
      !row.subject?.trim() ||
      !Array.isArray(row.topics) ||
      !row.topics.length ||
      row.topics.some((topic) => typeof topic !== "string" || !topic.trim()) ||
      new Set(row.topics).size !== row.topics.length
    )
      throw Error("Invalid taxonomy row");
    if (row.grade <= 9 && (row.pathway !== null || row.track !== null))
      throw Error("Grades 1–9 require null pathway and track");
    if (
      row.grade >= 10 &&
      (!row.pathway || !row.track || !tracks[row.pathway]?.includes(row.track))
    )
      throw Error("Invalid supplied senior pathway/track pairing");
    const key = JSON.stringify([
      row.grade,
      row.pathway,
      row.track,
      row.subject,
    ]);
    if (keys.has(key)) throw Error("Duplicate taxonomy entry");
    keys.add(key);
  }
  return rows;
}
export async function seedTaxonomy(prisma: PrismaClient) {
  const rows = validateTaxonomySeed();
  let created = 0,
    skipped = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const row of rows) {
        const id = createHash("sha256")
          .update(
            JSON.stringify([
              "supplied-taxonomy-v1",
              row.grade,
              row.pathway,
              row.track,
              row.subject,
            ]),
          )
          .digest("hex");
        // Match by stable seed ID OR semantic identity so curated/imported
        // records with another ID are preserved instead of duplicated.
        const existing = await tx.curriculumTaxonomy.findFirst({
          where: {
            OR: [
              { id },
              {
                grade: row.grade,
                pathway: row.pathway,
                track: row.track,
                subject: row.subject,
              },
            ],
          },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await tx.curriculumTaxonomy.upsert({
          where: { id },
          create: { id, ...row, source: "USER_PROVIDED", verified: false },
          update: {}, // Insert-only, including a concurrent seed retry.
        });
        created++;
      }
    },
    { timeout: 60000 },
  );
  const grades = [...new Set(rows.map((row) => row.grade))].sort(
    (a, b) => a - b,
  );
  console.log(
    `Taxonomy seed complete: ${rows.length} subject entries, ${rows.reduce((sum, row) => sum + row.topics.length, 0)} topics. Grades: ${grades.join(", ")}. Supplied data; official verification pending.`,
  );
  console.log(`Created: ${created}; updated: 0; skipped: ${skipped}.`);
  console.log(
    `Unseeded grades: ${
      Array.from({ length: 12 }, (_, i) => i + 1)
        .filter((grade) => !grades.includes(grade))
        .join(", ") || "none"
    }. No existing curriculum, questions or modules deleted.`,
  );
  return { created, updated: 0, skipped };
}
if (require.main === module) {
  if (process.argv.slice(2).some((arg) => arg !== "--missing-only")) {
    console.error("Supported option: --missing-only.");
    process.exitCode = 1;
  } else {
    const prisma = new PrismaClient();
    // --missing-only remains a compatible alias; every seed is insert-only.
    seedTaxonomy(prisma)
      .catch((error) => {
        console.error("Taxonomy seed stopped:", error.message);
        process.exitCode = 1;
      })
      .finally(() => prisma.$disconnect());
  }
}
