/** Safe preview installer. Creates separate DRAFT labs; never retags/deletes old labs. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { JUNIOR_DESIGNS } from "../labs/junior-science";
async function main() {
  const apply = process.argv.includes("--apply");
  const plans = Object.entries(JUNIOR_DESIGNS).map(([key, d]) => ({
    key,
    title: d.title,
    grade: `Grade ${d.grade}`,
    subject: "Integrated Science",
    topicArea: d.topic,
    description: d.question,
    learningOutcomes: d.outcomes,
    competency: "Scientific inquiry",
    durationMinutes: 30,
    isPublished: false,
    status: "DRAFT" as const,
  }));
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "DRY RUN — no database writes",
          curriculumVerification:
            "Pending official KICD grade-design review; not a publication command",
          labs: plans,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required");
  const db = new PrismaClient();
  try {
    let created = 0;
    for (const data of plans) {
      const result = await db.lab.upsert({
        where: { key: data.key },
        create: data,
        update: {},
      });
      if (result.status !== "DRAFT")
        console.log(
          JSON.stringify({
            key: data.key,
            note: "Existing authored record retained without changes",
          }),
        );
      created++;
    }
    console.log(
      JSON.stringify({
        mode: "APPLY",
        recordsPrepared: created,
        status: "Draft only. Existing labs and notebooks unchanged.",
      }),
    );
  } finally {
    await db.$disconnect();
  }
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Preparation failed");
  process.exitCode = 1;
});
