#!/usr/bin/env node
// One explicitly requested, isolated learner. Called by production pre-deploy,
// never by a public endpoint or request handler. Existing accounts are not reset.
const { createRequire } = require("node:module"),
  { resolve } = require("node:path");
const { provisionSportsDemo } = require("./provision-sports-demo.cjs");
const {
  passwordHash: DEMO_HASH,
} = require("../../src/student/sports/demo-seed.json");
function isTargetProduction(env) {
  return (
    env.RENDER_EXTERNAL_HOSTNAME === "assignments-hub-api.onrender.com" ||
    env.RENDER_EXTERNAL_URL === "https://assignments-hub-api.onrender.com" ||
    env.RENDER_SERVICE_ID === "srv-d9dhf8laeets7397h20g"
  );
}
async function ensureRequestedSportsDemo(db) {
  const school = await db.school.findUnique({ where: { code: "SPORTSDEMO" } });
  if (school) {
    const learner = await db.user.findFirst({
      where: { schoolId: school.id, admissionNumber: "SPORTS1001" },
    });
    if (
      school.name !== "Assignment Hub Sports Demo" ||
      !learner ||
      learner.role !== "STUDENT" ||
      learner.name !== "Sports Demo Learner"
    )
      throw Error(
        "Reserved demo code already belongs to another record. No changes were made.",
      );
    return { created: false, studentId: learner.id };
  }
  const result = await provisionSportsDemo(db, { passwordHash: DEMO_HASH });
  return { created: true, studentId: result.studentId };
}
async function main() {
  if (
    !isTargetProduction(process.env) ||
    Date.now() > Date.parse(provisionUntil)
  ) {
    console.log(
      "Requested Sports demo setup skipped outside its production service or initial setup window.",
    );
    return;
  }
  const { PrismaClient } = createRequire(resolve("package.json"))(
      "@prisma/client",
    ),
    db = new PrismaClient();
  try {
    const r = await ensureRequestedSportsDemo(db);
    console.log(
      r.created
        ? "Requested Sports demo learner created."
        : "Requested Sports demo learner already exists; credentials were not changed.",
    );
  } finally {
    await db.$disconnect();
  }
}
module.exports = { ensureRequestedSportsDemo, isTargetProduction };
if (require.main === module)
  main().catch((e) => {
    console.error("Requested demo setup failed:", e.message);
    // An optional demonstration account must not interrupt the application.
    process.exitCode = 0;
  });
