import { PrismaClient } from "@prisma/client";
import { provisionDemoAcademy, verifyTeacherSchema } from "./demo-academy";
import * as bcrypt from "bcrypt";
const run = process.env.RBAC_TEST_DATABASE_URL ? describe : describe.skip;
run("Demo Academy controlled provisioning", () => {
  let db: PrismaClient;
  const password = "local-only-fixture-password";
  beforeAll(async () => {
    const url = new URL(process.env.RBAC_TEST_DATABASE_URL!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/rbac_test")
      throw Error("Use disposable localhost rbac_test only.");
    db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    const pathway = await db.pathway.upsert({
      where: { key: "deployment-fixture-stem" },
      create: {
        key: "deployment-fixture-stem",
        name: "STEM",
        description: "Local test fixture only",
        icon: "flask",
      },
      update: {},
    });
    await db.track.upsert({
      where: {
        pathwayId_key: {
          pathwayId: pathway.id,
          key: "deployment-fixture-engineering",
        },
      },
      create: {
        pathwayId: pathway.id,
        key: "deployment-fixture-engineering",
        name: "Technical and Engineering",
        description: "Local test fixture only",
        icon: "gear",
        isPublished: false,
        requiredSubjects: [],
        careers: [],
        skills: [],
        universitiesKenya: [],
        universitiesIntl: [],
      },
      update: {},
    });
  });
  beforeEach(async () => {
    await db.school.deleteMany({ where: { code: "DEMO-001" } });
  });
  afterAll(async () => {
    if (db) {
      await db.school.deleteMany({ where: { code: "DEMO-001" } });
      await db.pathway.deleteMany({
        where: { key: "deployment-fixture-stem" },
      });
      await db.$disconnect();
    }
  });
  it("verifies real indexes and creates the exact paired fixture without taxonomy changes", async () => {
    const before = await db.curriculumTaxonomy.findMany({
      orderBy: { id: "asc" },
    });
    expect((await verifyTeacherSchema(db)).indexes).toHaveLength(3);
    const result = await provisionDemoAcademy(db, password);
    const teacher = await db.user.findUniqueOrThrow({
      where: { id: result.teacherId },
    });
    expect(teacher).toMatchObject({
      name: "Mr. Otieno",
      email: "otieno@demo.co.ke",
      role: "TEACHER",
    });
    expect(await bcrypt.compare(password, teacher.passwordHash!)).toBe(true);
    const assignments = await db.teacherAssignment.findMany({
      where: { teacher_id: teacher.id },
      include: { stream: true },
    });
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      subject: "Aviation Technology",
      stream: { grade: "Grade 11", name: "1B" },
    });
    for (const [admission, name, stream] of [
      ["VH001", "Victor Halisi", "1B"],
      ["AW002", "Alice Wanjiru", "1A"],
    ]) {
      const student = await db.user.findUniqueOrThrow({
        where: { id: result.students[admission] },
        include: {
          studentProfile: true,
          pathwaySelections: {
            include: { track: { include: { pathway: true } } },
          },
        },
      });
      expect(student).toMatchObject({
        name,
        admissionNumber: admission,
        grade: "Grade 11",
        studentProfile: { stream, pathway: "STEM" },
      });
      expect(student.pathwaySelections[0].track).toMatchObject({
        name: "Technical and Engineering",
        pathway: { name: "STEM" },
      });
    }
    expect(
      await db.curriculumTaxonomy.findMany({ orderBy: { id: "asc" } }),
    ).toEqual(before);
  });
  it("creates only an unpublished demo reference when the exact track is missing", async () => {
    const held = await db.track.findMany({
      where: {
        name: { equals: "Technical and Engineering", mode: "insensitive" },
        pathway: { name: { equals: "STEM", mode: "insensitive" } },
      },
    });
    await db.track.updateMany({
      where: { id: { in: held.map((t) => t.id) } },
      data: { name: "Temporarily held local fixture" },
    });
    try {
      const result = await provisionDemoAcademy(db, password);
      const track = await db.track.findUniqueOrThrow({
        where: { id: result.trackId },
      });
      expect(track).toMatchObject({
        name: "Technical and Engineering",
        key: "demo-academy-technical-engineering",
        isPublished: false,
      });
    } finally {
      for (const original of held)
        await db.track.update({
          where: { id: original.id },
          data: { name: original.name, updatedAt: original.updatedAt },
        });
      await db.school.deleteMany({ where: { code: "DEMO-001" } });
      await db.track.deleteMany({
        where: { key: "demo-academy-technical-engineering" },
      });
    }
  });
  it("is repeatable without duplicate accounts, streams, selections or permission rows", async () => {
    const first = await provisionDemoAcademy(db, password);
    const hash = (
      await db.user.findUniqueOrThrow({ where: { id: first.teacherId } })
    ).passwordHash;
    expect(await provisionDemoAcademy(db, password)).toEqual(first);
    expect(await db.user.count({ where: { schoolId: first.schoolId } })).toBe(
      3,
    );
    expect(
      await db.stream.count({ where: { school_id: first.schoolId } }),
    ).toBe(2);
    expect(
      await db.teacherAssignment.count({
        where: { school_id: first.schoolId },
      }),
    ).toBe(1);
    expect(
      await db.studentPathwaySelection.count({
        where: { schoolId: first.schoolId },
      }),
    ).toBe(2);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: first.teacherId } }))
        .passwordHash,
    ).toBe(hash);
  });
  it("refuses to replace credentials or alter unrelated accounts", async () => {
    const first = await provisionDemoAcademy(db, password);
    await expect(
      provisionDemoAcademy(db, "different-password"),
    ).rejects.toThrow("Existing demo teacher");
    await db.user.create({
      data: {
        schoolId: first.schoolId,
        role: "STUDENT",
        name: "Unrelated learner",
      },
    });
    await expect(provisionDemoAcademy(db, password)).rejects.toThrow(
      "unrelated accounts",
    );
    expect(await db.user.count({ where: { schoolId: first.schoolId } })).toBe(
      4,
    );
  });
});
