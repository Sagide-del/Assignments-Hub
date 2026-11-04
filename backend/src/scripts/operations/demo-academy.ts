import { PrismaClient, Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";

const SCHOOL_CODE = "DEMO-001";
const SUBJECT = "Aviation Technology";
const GRADE = "Grade 11";

export async function verifyTeacherSchema(db: PrismaClient) {
  const indexes = await db.$queryRaw<
    Array<{ name: string; unique: boolean; columns: string[] }>
  >`
    SELECT c.relname AS name, i.indisunique AS unique,
      array_agg(a.attname::text ORDER BY k.ord) AS columns
    FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_class c ON c.oid=i.indexrelid
    CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
    WHERE n.nspname=current_schema() AND t.relname='TeacherAssignment'
    GROUP BY c.relname,i.indisunique`;
  for (const [columns, unique] of [
    [["id"], true],
    [["teacher_id", "subject", "stream_id"], true],
    [["school_id", "teacher_id"], false],
  ] as const) {
    if (
      !indexes.some(
        (i) =>
          i.columns.join(",") === columns.join(",") && (!unique || i.unique),
      )
    )
      throw Error(`TeacherAssignment index missing: ${columns.join(",")}`);
  }
  const keys = await db.$queryRaw<Array<{ conname: string }>>`
    SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname=current_schema() AND t.relname='TeacherAssignment' AND c.contype='f'`;
  for (const key of [
    "TeacherAssignment_teacher_id_school_id_fkey",
    "TeacherAssignment_stream_id_school_id_fkey",
  ])
    if (!keys.some((k) => k.conname === key))
      throw Error(`Tenant foreign key missing: ${key}`);
  return { indexes, foreignKeys: keys.map((k) => k.conname) };
}

export async function provisionDemoAcademy(db: PrismaClient, password: string) {
  if (
    Buffer.byteLength(password, "utf8") < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  )
    throw Error("DEMO_TEACHER_PASSWORD must be 8–72 UTF-8 bytes.");
  await verifyTeacherSchema(db);
  const passwordHash = await bcrypt.hash(password, 12);
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('assignmenthub-demo-academy-rbac'))::text`;
      let track = await tx.track.findFirst({
        where: {
          name: { equals: "Technical and Engineering", mode: "insensitive" },
          pathway: { name: { equals: "STEM", mode: "insensitive" } },
        },
      });
      if (!track) {
        const stem = await tx.pathway.findFirst({
          where: { name: { equals: "STEM", mode: "insensitive" } },
        });
        if (!stem)
          throw Error(
            "The STEM pathway must exist. No curriculum seed was applied.",
          );
        // An unpublished synthetic reference is restricted to demo selections;
        // never rename a real track or publish invented curriculum to learners.
        track = await tx.track.upsert({
          where: {
            pathwayId_key: {
              pathwayId: stem.id,
              key: "demo-academy-technical-engineering",
            },
          },
          create: {
            pathwayId: stem.id,
            key: "demo-academy-technical-engineering",
            name: "Technical and Engineering",
            description:
              "Synthetic reference for Demo Academy access verification only; not curriculum content.",
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
        if (track.name !== "Technical and Engineering" || track.isPublished)
          throw Error(
            "Demo track key conflicts with existing catalogue content.",
          );
      }
      let school = await tx.school.findUnique({ where: { code: SCHOOL_CODE } });
      if (school && school.name !== "Demo Academy")
        throw Error("DEMO-001 belongs to another school; no changes made.");
      if (!school)
        school = await tx.school.create({
          data: {
            name: "Demo Academy",
            code: SCHOOL_CODE,
            subscriptionStatus: "TRIAL",
          },
        });
      const existingAccounts = await tx.user.findMany({
        where: { schoolId: school.id },
        take: 4,
        select: {
          id: true,
          role: true,
          name: true,
          email: true,
          admissionNumber: true,
        },
      });
      if (
        existingAccounts.length > 3 ||
        existingAccounts.some(
          (u) =>
            !(
              (u.role === "TEACHER" &&
                u.email === "otieno@demo.co.ke" &&
                u.name === "Mr. Otieno") ||
              (u.role === "STUDENT" &&
                u.admissionNumber === "VH001" &&
                u.name === "Victor Halisi") ||
              (u.role === "STUDENT" &&
                u.admissionNumber === "AW002" &&
                u.name === "Alice Wanjiru")
            ),
        )
      )
        throw Error(
          "Demo Academy already contains unrelated accounts; refusing to modify it.",
        );
      const streams = await Promise.all(
        ["1A", "1B"].map((name) =>
          tx.stream.upsert({
            where: {
              school_id_grade_name: {
                school_id: school!.id,
                grade: GRADE,
                name,
              },
            },
            create: { school_id: school!.id, grade: GRADE, name },
            update: {},
          }),
        ),
      );
      let teacher = await tx.user.findUnique({
        where: {
          schoolId_email: { schoolId: school.id, email: "otieno@demo.co.ke" },
        },
      });
      if (
        teacher &&
        (teacher.role !== "TEACHER" ||
          teacher.name !== "Mr. Otieno" ||
          !teacher.isActive ||
          !teacher.passwordHash ||
          !(await bcrypt.compare(password, teacher.passwordHash)))
      )
        throw Error(
          "Existing demo teacher does not match the requested active account/password; use the account recovery process.",
        );
      if (!teacher)
        teacher = await tx.user.create({
          data: {
            schoolId: school.id,
            role: "TEACHER",
            name: "Mr. Otieno",
            email: "otieno@demo.co.ke",
            passwordHash,
          },
        });
      const assignments = await tx.teacherAssignment.findMany({
        where: { teacher_id: teacher.id },
      });
      if (
        assignments.some(
          (a) =>
            a.subject !== SUBJECT ||
            a.stream_id !== streams[1].id ||
            a.school_id !== school!.id,
        )
      )
        throw Error(
          "Demo teacher has unexpected assignments; refusing to revoke or broaden them.",
        );
      await tx.teacherAssignment.upsert({
        where: {
          teacher_id_subject_stream_id: {
            teacher_id: teacher.id,
            subject: SUBJECT,
            stream_id: streams[1].id,
          },
        },
        create: {
          teacher_id: teacher.id,
          school_id: school.id,
          subject: SUBJECT,
          stream_id: streams[1].id,
        },
        update: {},
      });
      const ids: Record<string, number> = {};
      for (const learner of [
        { name: "Victor Halisi", admission: "VH001", stream: "1B" },
        { name: "Alice Wanjiru", admission: "AW002", stream: "1A" },
      ]) {
        let student = await tx.user.findUnique({
          where: {
            schoolId_admissionNumber: {
              schoolId: school.id,
              admissionNumber: learner.admission,
            },
          },
          include: { studentProfile: true },
        });
        if (
          student &&
          (student.name !== learner.name ||
            student.role !== "STUDENT" ||
            student.grade !== GRADE ||
            !student.isActive ||
            student.studentProfile?.stream !== learner.stream ||
            student.studentProfile?.pathway !== "STEM")
        )
          throw Error(
            "An existing learner differs from the requested demo fixture; no historical data overwritten.",
          );
        if (!student)
          student = await tx.user.create({
            data: {
              schoolId: school.id,
              role: "STUDENT",
              name: learner.name,
              admissionNumber: learner.admission,
              grade: GRADE,
              studentProfile: {
                create: {
                  admissionNumber: learner.admission,
                  grade: GRADE,
                  stream: learner.stream,
                  pathway: "STEM",
                },
              },
            },
            include: { studentProfile: true },
          });
        const active = await tx.studentPathwaySelection.findMany({
          where: { studentId: student.id, isActive: true },
        });
        if (
          active.some(
            (s) => s.trackId !== track.id || s.schoolId !== school!.id,
          ) ||
          active.length > 1
        )
          throw Error(
            "Existing demo pathway selection differs; no history overwritten.",
          );
        if (!active.length)
          await tx.studentPathwaySelection.create({
            data: {
              schoolId: school.id,
              studentId: student.id,
              trackId: track.id,
              source: "MANUAL",
              notes: "Demo Academy RBAC verification fixture",
            },
          });
        ids[learner.admission] = student.id;
      }
      return {
        schoolCode: SCHOOL_CODE,
        schoolId: school.id,
        teacherId: teacher.id,
        teacherEmail: teacher.email,
        grade: GRADE,
        subject: SUBJECT,
        stream: "1B",
        students: ids,
        trackId: track.id,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000,
    },
  );
}

if (require.main === module) {
  const db = new PrismaClient();
  (async () => {
    if (!process.argv.includes("--apply")) {
      console.log(
        JSON.stringify(
          {
            mode: "DRY RUN — no writes",
            schema: await verifyTeacherSchema(db),
            schoolCode: SCHOOL_CODE,
            grade: GRADE,
            subject: SUBJECT,
            teacherEmail: "otieno@demo.co.ke",
            streams: ["1A", "1B"],
            instruction:
              "Set DEMO_TEACHER_PASSWORD securely and use --apply after prisma migrate deploy.",
          },
          null,
          2,
        ),
      );
      return;
    }
    if (!process.env.DEMO_TEACHER_PASSWORD)
      throw Error(
        "Set DEMO_TEACHER_PASSWORD securely; never place the password in source control.",
      );
    console.log(
      JSON.stringify(
        await provisionDemoAcademy(db, process.env.DEMO_TEACHER_PASSWORD),
        null,
        2,
      ),
    );
  })()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
