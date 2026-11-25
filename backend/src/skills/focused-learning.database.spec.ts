import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { SkillsService } from "./skills.service";
import {
  FocusedLearningService,
  skillProgram,
} from "./focused-learning.service";
import {
  skillWorkbookHtml,
  SkillWorkbookService,
} from "./skill-workbook.service";
import { ConfigService } from "@nestjs/config";
import { Role } from "../common/enums/role.enum";
const run = process.env.SKILLS_TEST_DATABASE_URL ? describe : describe.skip;
run(
  "Focused skills: isolated PostgreSQL, real enrollment locks and evidence",
  () => {
    let db: PrismaClient,
      skills: SkillsService,
      focused: FocusedLearningService,
      school: any,
      actor: any,
      other: any,
      courses: any[],
      extra: any;
    const taxonomyId = randomUUID();
    beforeAll(async () => {
      const url = new URL(process.env.SKILLS_TEST_DATABASE_URL!);
      if (
        url.hostname !== "127.0.0.1" ||
        url.pathname !== "/focused_skills_test"
      )
        throw Error("Disposable localhost focused_skills_test only");
      db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
      await db.$connect();
      skills = new SkillsService(
        db as any,
        { sendAndLog: jest.fn() } as any,
        {} as any,
      );
      focused = new FocusedLearningService(db as any);
      school = await db.school.create({
        data: {
          name: "Focused skills fixture",
          code: "FOCUSED-" + randomUUID(),
        },
      });
      courses = await db.skillCourse.findMany({
        where: {
          title: {
            in: ["Music Production Foundations", "Songwriting & Arrangement"],
          },
          provider: { name: "Assignment Hub Learning Studio" },
        },
        include: { provider: true, category: true },
        orderBy: { title: "asc" },
      });
      expect(courses).toHaveLength(2);
      const pathway = await db.pathway.create({
        data: {
          key: "focused-" + randomUUID(),
          name: "Arts and Sports Science",
          description: "fixture",
          icon: "Music",
        },
      });
      const track = await db.track.create({
        data: {
          pathwayId: pathway.id,
          key: "focused-music",
          name: "Music",
          description: "fixture",
          icon: "Music",
          requiredSubjects: [],
          careers: [],
          skills: [],
          universitiesKenya: [],
          universitiesIntl: [],
        },
      });
      await db.curriculumTaxonomy.create({
        data: {
          id: taxonomyId,
          level: "Senior School",
          grade: 10,
          pathway: "Arts and Sports Science",
          track: "Music",
          subject: "Music and Dance",
          topics: ["Focused skills fixture"],
        },
      });
      extra = await db.skillCourse.create({
        data: {
          categoryId: courses[0].categoryId,
          providerId: courses[0].providerId,
          title: courses[1].title,
          shortDescription: "Concurrency fixture",
          fullDescription: "Fixture",
          durationWeeks: 4,
          level: "BEGINNER",
          costKES: 0,
          status: "PUBLISHED",
        },
      });
      const make = async () => {
        const u = await db.user.create({
          data: {
            schoolId: school.id,
            name: "Skills fixture",
            role: "STUDENT",
            grade: "Grade 10",
            isActive: true,
            elective_subjects: ["Music and Dance"],
            studentProfile: { create: { pathway: "Arts and Sports Science" } },
          },
        });
        await db.studentPathwaySelection.create({
          data: { studentId: u.id, schoolId: school.id, trackId: track.id },
        });
        return {
          id: u.id,
          schoolId: school.id,
          role: Role.STUDENT,
          name: u.name,
        };
      };
      actor = await make();
      other = await make();
    });
    afterEach(async () => {
      await db.skillEnrollment.deleteMany({
        where: { studentId: { in: [actor.id, other.id] } },
      });
      await db.user.updateMany({
        where: { id: { in: [actor.id, other.id] } },
        data: { skillInterest: null },
      });
    });
    afterAll(async () => {
      if (db) {
        await db.school.delete({ where: { id: school.id } });
        await db.skillCourse.delete({ where: { id: extra.id } });
        await db.curriculumTaxonomy.deleteMany({ where: { id: taxonomyId } });
        await db.pathway.deleteMany({
          where: { key: { startsWith: "focused-" } },
        });
        await db.$disconnect();
      }
    });
    const evidence = (title: string, index = 0) => {
      const l = skillProgram(title)!.lessons[index];
      return {
        answer: l.check.answer,
        artifact:
          "I built an original four-bar pattern, compared two rhythms at the same tempo, and saved the revised project after listening carefully.",
        reflection:
          "I changed the off-beat response in a new version. The pulse stayed clear and I would leave more space for the melody next time.",
      };
    };
    it("matches music interests to music courses and does not mutate on a read", async () => {
      const p = await focused.path(actor);
      expect(p.focus).toBe("MUSIC");
      expect(p.courses.every((c) => c.program?.focus === "MUSIC")).toBe(true);
      expect(p.activeCount).toBe(0);
      await skills.getStudentCourseProgress(courses[0].id, actor);
      expect(
        await db.skillEnrollment.count({ where: { studentId: actor.id } }),
      ).toBe(0);
    });
    it("uses current curriculum and does not return senior music to Grade 8", async () => {
      await db.user.update({
        where: { id: other.id },
        data: { grade: "Grade 8" },
      });
      expect((await focused.path(other)).courses).toHaveLength(0);
      await db.user.update({
        where: { id: other.id },
        data: { grade: "Grade 10" },
      });
    });
    it("admits only two simultaneous starts, including direct API-style requests", async () => {
      const results = await Promise.allSettled(
        [...courses, extra].map((c) => skills.requestEnrollment(c.id, actor)),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
      expect(
        await db.skillEnrollment.count({
          where: { studentId: actor.id, status: "ACTIVE" },
        }),
      ).toBe(2);
    });
    it("keeps one enrollment for duplicate concurrent starts", async () => {
      await Promise.all([
        skills.requestEnrollment(courses[0].id, actor),
        skills.requestEnrollment(courses[0].id, actor),
      ]);
      expect(
        await db.skillEnrollment.count({ where: { studentId: actor.id } }),
      ).toBe(1);
    });
    it("rejects direct completion without evidence, wrong answers, invented keys and skipped lessons", async () => {
      const c = courses[0],
        p = skillProgram(c.title)!;
      await skills.requestEnrollment(c.id, actor);
      await expect(
        skills.completeStudentLesson(c.id, p.lessons[0].key, actor),
      ).rejects.toThrow("evidence");
      await expect(
        skills.completeStudentLesson(c.id, p.lessons[0].key, actor, {
          ...evidence(c.title),
          answer: 99,
        }),
      ).rejects.toThrow("evidence");
      await expect(
        skills.completeStudentLesson(
          c.id,
          "invented",
          actor,
          evidence(c.title),
        ),
      ).rejects.toThrow("Unknown");
      await expect(
        skills.completeStudentLesson(
          c.id,
          p.lessons[1].key,
          actor,
          evidence(c.title, 1),
        ),
      ).rejects.toThrow("earlier");
    });
    it("saves evidence, pauses without loss, enforces ownership and resumes the same progress", async () => {
      const c = courses[0],
        key = skillProgram(c.title)!.lessons[0].key;
      await skills.requestEnrollment(c.id, actor);
      const saved = await skills.completeStudentLesson(
        c.id,
        key,
        actor,
        evidence(c.title),
      );
      expect(saved.evidence).toMatchObject({
        artifact: evidence(c.title).artifact,
      });
      expect(saved.reviewAfter).toBeInstanceOf(Date);
      await expect(focused.pause(c.id, other)).rejects.toThrow("not found");
      await focused.pause(c.id, actor);
      expect(
        await db.skillLessonProgress.count({ where: { id: saved.id } }),
      ).toBe(1);
      await skills.requestEnrollment(c.id, actor);
      expect((await skills.getStudentCourseProgress(c.id, actor))[0].id).toBe(
        saved.id,
      );
    });
    it("completes a whole path and releases the active slot without deleting evidence", async () => {
      const c = courses[0];
      await skills.requestEnrollment(c.id, actor);
      for (const [i, l] of skillProgram(c.title)!.lessons.entries())
        await skills.completeStudentLesson(
          c.id,
          l.key,
          actor,
          evidence(c.title, i),
        );
      expect((await focused.path(actor)).activeCount).toBe(0);
      expect(
        (
          await db.skillEnrollment.findFirstOrThrow({
            where: { studentId: actor.id, courseId: c.id },
          })
        ).status,
      ).toBe("COMPLETED");
    });
    it("prevents admin activation of a third active skill", async () => {
      for (const c of courses) await skills.requestEnrollment(c.id, actor);
      const third = await db.skillEnrollment.create({
        data: { studentId: actor.id, courseId: extra.id, status: "CANCELLED" },
      });
      await expect(
        skills.updateEnrollment(third.id, { status: "ACTIVE" } as any),
      ).rejects.toThrow("two skills");
    });
    it("soft-pauses legacy excess enrollments without deleting progress or paid entitlements", async () => {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const rows = [];
      for (const c of [...courses, extra])
        rows.push(
          await db.skillEnrollment.create({
            data: {
              studentId: actor.id,
              courseId: c.id,
              status: "ACTIVE",
              paymentStatus: "CONFIRMED",
            },
          }),
        );
      await db.skillLessonProgress.create({
        data: {
          enrollmentId: rows[0].id,
          lessonKey: skillProgram(courses[0].title)!.lessons[0].key,
          completedAt: new Date(),
        },
      });
      const sql = readFileSync(
        join(
          __dirname,
          "../../prisma/migrations/20261125180000_focused_skills/migration.sql",
        ),
        "utf8",
      );
      await db.$executeRawUnsafe(sql.slice(sql.indexOf("WITH ranked AS")).replace(/\nCOMMIT;\s*$/, ""));
      expect(
        await db.skillEnrollment.count({
          where: { studentId: actor.id, status: "ACTIVE" },
        }),
      ).toBe(2);
      const paused = await db.skillEnrollment.findFirstOrThrow({
        where: { studentId: actor.id, status: "CANCELLED" },
      });
      expect(paused.paymentStatus).toBe("CONFIRMED");
      expect(paused.pauseReason).toContain("ACTIVE");
      expect(paused.pausedAt).toBeInstanceOf(Date);
      expect(
        await db.skillLessonProgress.count({
          where: { enrollmentId: rows[0].id },
        }),
      ).toBe(1);
    });
    it("resumes a previously paid skill without requesting a second payment", async () => {
      const c = courses[0];
      await db.skillCourse.update({
        where: { id: c.id },
        data: { costKES: 500 },
      });
      try {
        await db.skillEnrollment.create({
          data: {
            studentId: actor.id,
            courseId: c.id,
            status: "ACTIVE",
            paymentStatus: "CONFIRMED",
          },
        });
        await focused.pause(c.id, actor);
        const resumed = await skills.requestEnrollment(c.id, actor);
        expect(resumed.status).toBe("ACTIVE");
        expect(resumed.paymentStatus).toBe("CONFIRMED");
        expect(resumed.pausedAt).toBeNull();
        expect(
          await db.skillPayment.count({ where: { studentId: actor.id } }),
        ).toBe(0);
      } finally {
        await db.skillCourse.update({
          where: { id: c.id },
          data: { costKES: 0 },
        });
      }
    });
    it("renders a real branded PDF with exercises and a transfer rubric", async () => {
      const title = "Music Production Foundations";
      const html = skillWorkbookHtml(title, "data:image/png;base64,AA");
      expect(html).toContain("Project review");
      expect(html).toContain("Try it in a different situation");
      expect(html).toContain("assignmenthub.co.ke");
      const pdf = await new SkillWorkbookService(
        new ConfigService(
          process.env.SKILLS_TEST_CHROMIUM
            ? { SKILLS_CHROMIUM_EXECUTABLE: process.env.SKILLS_TEST_CHROMIUM }
            : {},
        ),
      ).render(title);
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(15000);
    }, 60000);
  },
);
