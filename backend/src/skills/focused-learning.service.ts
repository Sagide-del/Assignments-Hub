import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { StudentScopeService } from "../student/student-scope.service";
import {
  contentMatches,
  skillContent,
  key,
} from "../student/student-scope.policy";
import programs from "./content/focused-programs.json";
export const focusLabels: Record<string, string> = {
  MUSIC: "Music & audio",
  DIGITAL: "Coding & digital",
  TECHNICAL: "Design & engineering",
  VISUAL: "Visual storytelling",
  AGRICULTURE: "Agriculture",
  RESEARCH: "Research & projects",
  CARE: "Health & care",
};
export const activeSkillStates = [
  "REQUESTED",
  "AWAITING_PAYMENT",
  "ACTIVE",
] as const;
export const skillProgram = (title: string) =>
  programs.find((p) => p.title === title);
export async function assertSkillCapacity(
  tx: any,
  studentId: number,
  courseId: number,
) {
  await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${studentId} FOR UPDATE`;
  const count = await tx.skillEnrollment.count({
    where: {
      studentId,
      courseId: { not: courseId },
      status: { in: [...activeSkillStates] },
    },
  });
  if (count >= 2)
    throw new ConflictException(
      "Keep at most two skills active. Complete or pause a skill first.",
    );
}
@Injectable()
export class FocusedLearningService {
  constructor(private readonly db: PrismaService) {}
  async capabilities() {
    await this.db.user.findFirst({ select: { skillInterest: true } });
    await this.db.skillLessonProgress.findFirst({
      select: { evidence: true, reviewAfter: true },
    });
    await this.db.skillEnrollment.findFirst({select:{pausedAt:true,pauseReason:true}});
    const musicCourses = await this.db.skillCourse.findMany({
      where: {
        title: {
          in: ["Music Production Foundations", "Songwriting & Arrangement"],
        },
        status: "PUBLISHED",
        provider: {
          name: "Assignment Hub Learning Studio",
          verified: true,
          status: "PUBLISHED",
        },
        category: { status: "PUBLISHED" },
      },
      select:{title:true},distinct:['title'],
    });
    return {
      focusedSkillsVersion: 1,
      activeLimit: 2,
      workbooksVersion: 1,
      curatedMusicCourses: musicCourses.length,
    };
  }
  async path(actor: AuthenticatedUser) {
    const scope = await new StudentScopeService(this.db).getStudentScope(
      actor.id,
      actor.schoolId,
    );
    const [user, courses, enrollments] = await Promise.all([
      this.db.user.findUniqueOrThrow({
        where: { id: actor.id },
        select: { skillInterest: true, elective_subjects: true },
      }),
      this.db.skillCourse.findMany({
        where: {
          status: "PUBLISHED",
          provider: { status: "PUBLISHED" },
          category: { status: "PUBLISHED" },
        },
        include: { provider: true, category: true },
      }),
      this.db.skillEnrollment.findMany({
        where: { studentId: actor.id },
        include: {
          course: { include: { provider: true, category: true } },
          lessonProgress: true,
        },
        orderBy: { requestedAt: "asc" },
      }),
    ]);
    const eligible = courses.filter(
      (c) =>
        c.provider.verified && c.provider.name==='Assignment Hub Learning Studio' &&
        skillProgram(c.title) &&
        scope.grade >= skillProgram(c.title)!.minGrade &&
        scope.grade <= skillProgram(c.title)!.maxGrade &&
        contentMatches(scope, skillContent(c, scope)),
    );
    eligible.sort(
      (a, b) =>
        skillProgram(a.title)!.order - skillProgram(b.title)!.order ||
        a.id - b.id,
    );
    const activeIds = new Set(
      enrollments
        .filter((e) => activeSkillStates.includes(e.status as any))
        .map((e) => e.courseId),
    );
    const completeIds = new Set(
      enrollments
        .filter((e) => e.status === "COMPLETED")
        .map((e) => e.courseId),
    );
    const choices = [
      ...new Set(eligible.map((c) => skillProgram(c.title)!.focus)),
    ].map((value) => ({ value, label: focusLabels[value] }));
    const music =
      key(scope.track).includes("music") ||
      user.elective_subjects.some((s) => key(s).includes("music"));
    const inferred = music
      ? "MUSIC"
      : key(scope.track).includes("technical")
        ? "TECHNICAL"
        : user.elective_subjects.some((s) => /computer/i.test(s))
          ? "DIGITAL"
          : null;
    const focus = choices.some((c) => c.value === user.skillInterest)
      ? user.skillInterest
      : choices.some((c) => c.value === inferred)
        ? inferred
        : null;
    return {
      version: 1,
      limit: 2,
      focus,
      focusLabel: focus ? focusLabels[focus] : null,
      reason:
        focus && user.skillInterest === focus
          ? "Your chosen focus"
          : focus
            ? "Matched to your curriculum"
            : "Choose a focus to see relevant skills",
      choices,
      activeCount: enrollments.filter((e) =>
        activeSkillStates.includes(e.status as any),
      ).length,
      courses: [
        ...eligible.filter(
          (c) => skillProgram(c.title)!.focus === focus && activeIds.has(c.id),
        ),
        ...eligible
          .filter(
            (c) =>
              skillProgram(c.title)!.focus === focus &&
              !activeIds.has(c.id) &&
              !completeIds.has(c.id),
          )
          .slice(0, Math.max(0, 2 - activeIds.size)),
      ].map((c) => ({
        ...c,
        program: skillProgram(c.title)!,
        enrollment: enrollments.find((e) => e.courseId === c.id) ?? null,
      })),
      enrollments: enrollments.map((e) => ({
        ...e,
        program: skillProgram(e.course.title) ?? null,
      })),
    };
  }
  async choose(actor: AuthenticatedUser, focus: string) {
    const path = await this.path(actor);
    if (!path.choices.some((c) => c.value === focus))
      throw new ForbiddenException(
        "This focus has no curated courses for your curriculum yet.",
      );
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${actor.id} FOR UPDATE`;
      const active = await tx.skillEnrollment.findMany({
        where: { studentId: actor.id, status: { in: [...activeSkillStates] } },
        include: { course: true },
      });
      if (active.some((e) => skillProgram(e.course.title)?.focus !== focus))
        throw new ConflictException(
          "Pause or complete your current skills before changing focus.",
        );
      await tx.user.update({
        where: { id: actor.id },
        data: { skillInterest: focus },
      });
    });
    return this.path(actor);
  }
  async assertRelevant(courseId: number, actor: AuthenticatedUser) {
    const path = await this.path(actor);
    if (!path.courses.some((c) => c.id === courseId))
      throw new ForbiddenException(
        "Choose a skill from your focused learning path.",
      );
  }
  async pause(courseId: number, actor: AuthenticatedUser) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${actor.id} FOR UPDATE`;
      const e = await tx.skillEnrollment.findUnique({
        where: { studentId_courseId: { studentId: actor.id, courseId } },
      });
      if (!e) throw new NotFoundException("Skill enrollment not found.");
      if (!activeSkillStates.includes(e.status as any))
        throw new ConflictException(
          "Only an active or requested skill can be paused.",
        );
      return tx.skillEnrollment.update({
        where: { id: e.id },
        data: { status: "CANCELLED", pausedAt:new Date(), pauseReason:"Learner paused this skill" },
      });
    });
  }
}
