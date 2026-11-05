/** Audit/repair companion to the automatic SQL migration. Dry run by default. */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const apply = process.argv.includes("--apply");
  const legacy = await db.$queryRaw<
    any[]
  >`SELECT id,status::text AS status,tenant_id,updated_at FROM "MasterModule" WHERE status::text IN ('PUBLISHED_STORE','PUBLISHED_SCHOOL')`;
  let destinations = 0;
  for (const m of legacy) {
    if (m.status === "PUBLISHED_SCHOOL" && !m.tenant_id)
      throw Error(`Module ${m.id} needs a school before conversion.`);
    const streams =
      m.status === "PUBLISHED_SCHOOL"
        ? await db.moduleAssignment.findMany({ where: { module_id: m.id } })
        : [];
    const targets = (
      streams.length
        ? streams
        : [{ stream_id: null, published_at: m.updated_at }]
    ).map((s) => ({
      module_id: m.id,
      audience: m.status === "PUBLISHED_STORE" ? "PUBLIC_STORE" : "SCHOOL",
      school_id: m.status === "PUBLISHED_STORE" ? null : m.tenant_id,
      stream_id: s.stream_id,
      published_at: s.published_at,
    }));
    destinations += targets.length;
    if (apply)
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "MasterModule" WHERE id=${m.id} FOR UPDATE`;
        for (const target of targets)
          if (
            !(await tx.contentDistribution.findFirst({
              where: {
                module_id: target.module_id,
                audience: target.audience,
                school_id: target.school_id,
                stream_id: target.stream_id,
              },
            }))
          )
            await tx.contentDistribution.create({ data: target });
        await tx.masterModule.update({
          where: { id: m.id },
          data: { status: "APPROVED" },
        });
      });
  }
  console.log(
    JSON.stringify({
      mode: apply ? "APPLY" : "DRY RUN",
      legacy_modules: legacy.length,
      destinations,
      existing_distributions: await db.contentDistribution.count(),
    }),
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
