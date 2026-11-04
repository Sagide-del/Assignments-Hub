import { ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { Role } from "../common/enums/role.enum";
import { normalizeGrade } from "../common/utils/grade.util";

export async function teacherPairs(
  db: PrismaService,
  actor: AuthenticatedUser,
) {
  const pairs = await db.teacherAssignment.findMany({
    where: {
      teacher_id: actor.id,
      school_id: actor.schoolId,
      stream: { school_id: actor.schoolId },
      teacher: { role: Role.TEACHER, isActive: true, schoolId: actor.schoolId },
    },
    include: { stream: true },
    orderBy: [{ subject: "asc" }, { stream_id: "asc" }],
  });
  if (!pairs.length)
    throw new ForbiddenException(
      "You have no assigned classes. Contact your School Admin.",
    );
  return pairs;
}
export async function studentScope(
  db: PrismaService,
  actor: AuthenticatedUser,
): Promise<Prisma.UserWhereInput> {
  if (actor.role !== Role.TEACHER) return {};
  const pairs = await teacherPairs(db, actor);
  return {
    schoolId: actor.schoolId,
    role: Role.STUDENT,
    OR: pairs.map((p) => ({
      grade: p.stream.grade,
      studentProfile: { is: { stream: p.stream.name } },
    })),
  };
}
// Subject and stream remain paired; never independently combine their unions.
export async function resultScope(db: PrismaService, actor: AuthenticatedUser) {
  if (actor.role !== Role.TEACHER) return {};
  const pairs = await teacherPairs(db, actor);
  return {
    schoolId: actor.schoolId,
    OR: pairs.map((p) => ({
      subject: { equals: p.subject, mode: "insensitive" as const },
      student: {
        is: {
          schoolId: actor.schoolId,
          role: Role.STUDENT,
          grade: p.stream.grade,
          studentProfile: { is: { stream: p.stream.name } },
        },
      },
    })),
  };
}
export async function submissionScope(
  db: PrismaService,
  actor: AuthenticatedUser,
): Promise<Prisma.SubmissionWhereInput> {
  if (actor.role !== Role.TEACHER) return {};
  const pairs = await teacherPairs(db, actor);
  return {
    OR: pairs.map((p) => ({
      assignment: {
        schoolId: actor.schoolId,
        subject: { equals: p.subject, mode: "insensitive" as const },
      },
      student: {
        is: {
          schoolId: actor.schoolId,
          role: Role.STUDENT,
          grade: p.stream.grade,
          studentProfile: { is: { stream: p.stream.name } },
        },
      },
    })),
  };
}
export async function assertStudentScope(
  db: PrismaService,
  actor: AuthenticatedUser,
  id: number,
  subject?: string,
) {
  if (actor.role !== Role.TEACHER) return;
  const scope = await studentScope(db, actor);
  if (subject) {
    const pairs = (await teacherPairs(db, actor)).filter(
      (p) => p.subject.toLowerCase() === subject.toLowerCase(),
    );
    scope.OR = pairs.length
      ? pairs.map((p) => ({
          grade: p.stream.grade,
          studentProfile: { is: { stream: p.stream.name } },
        }))
      : [{ id: -1 }];
  }
  if (
    !(await db.user.findFirst({
      where: { AND: [{ id }, scope] },
      select: { id: true },
    }))
  )
    throw new ForbiddenException(
      "This learner is outside your assigned classes.",
    );
}
export async function assignmentStream(
  db: PrismaService,
  actor: AuthenticatedUser,
  input: { grade: string; subject: string; targetStream?: string | null },
) {
  if (actor.role !== Role.TEACHER) return input.targetStream;
  const matches = (await teacherPairs(db, actor)).filter(
    (p) =>
      p.stream.grade === normalizeGrade(input.grade) &&
      p.subject.toLowerCase() === input.subject.trim().toLowerCase() &&
      (!input.targetStream || p.stream.name === input.targetStream),
  );
  if (matches.length !== 1)
    throw new ForbiddenException(
      "Choose one of your assigned subject and stream pairs.",
    );
  return matches[0].stream.name;
}
