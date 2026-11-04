/** Explicitly provision a synthetic school only. Never run during app startup. */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import * as bcrypt from "bcrypt";

async function main() {
  if (!process.argv.includes("--apply"))
    throw Error("Use --apply to provision the isolated AHTEST school.");
  if (!process.env.DATABASE_URL)
    throw Error("Configure DATABASE_URL securely before running this script.");
  const db = new PrismaClient();
  const password =
    process.env.TEACHER_DEMO_PASSWORD || randomBytes(18).toString("base64url");
  if (password.length < 16 || password.length > 72)
    throw Error("Demo password must contain 16–72 characters.");
  try {
    const existing = await db.school.findUnique({ where: { code: "AHTEST" } });
    if (existing)
      throw Error(
        "AHTEST already exists. Use the normal account reset flow; this script never overwrites accounts.",
      );
    const school = await db.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: "Assignment Hub Test School",
          code: "AHTEST",
          subscriptionStatus: "TRIAL",
        },
      });
      const stream = await tx.stream.create({
        data: { school_id: school.id, grade: "Grade 11", name: "1B" },
      });
      const teacher = await tx.user.create({
        data: {
          schoolId: school.id,
          role: "TEACHER",
          name: "Demo Aviation Teacher",
          email: "teacher@assignmenthub.test",
          passwordHash: await bcrypt.hash(password, 12),
        },
      });
      await tx.teacherAssignment.create({
        data: {
          teacher_id: teacher.id,
          school_id: school.id,
          subject: "Aviation Technology",
          stream_id: stream.id,
        },
      });
      for (let i = 1; i <= 3; i++)
        await tx.user.create({
          data: {
            schoolId: school.id,
            role: "STUDENT",
            name: `Example Learner ${i}`,
            grade: "Grade 11",
            admissionNumber: `TEST${i}`,
            studentProfile: { create: { grade: "Grade 11", stream: "1B" } },
          },
        });
      await tx.assignment.create({
        data: {
          schoolId: school.id,
          createdById: teacher.id,
          title: "Four forces of flight",
          subject: "Aviation Technology",
          grade: "Grade 11",
          targetStream: "1B",
          isPublished: false,
        },
      });
      return school;
    });
    console.log(
      JSON.stringify(
        {
          schoolCode: school.code,
          email: "teacher@assignmenthub.test",
          password,
          class: "Grade 11 · Aviation Technology · 1B",
          note: "Credentials apply only to the database configured for this invocation.",
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
