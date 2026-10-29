import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { normalizeGrade } from "../common/utils/grade.util";
import { approvedChoices, bankPaper } from "../kjsea/question-pool";
import { rankPractice } from "./content-tools";
@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}
  private async grade(actor: AuthenticatedUser) {
    const school = await this.prisma.school.findUnique({
      where: { id: actor.schoolId },
      select: { code: true },
    });
    if (school?.code !== "INDEPENDENT")
      throw new ForbiddenException(
        "School students use assignments selected by their teachers.",
      );
    const grade = normalizeGrade(actor.grade ?? "");
    if (!grade || !/^Grade (6|7|8|9|10|11|12)$/.test(grade))
      throw new BadRequestException(
        "Set your Grade 6–12 profile before starting practice.",
      );
    return grade;
  }
  async subjects(actor: AuthenticatedUser) {
    const grade = await this.grade(actor);
    const rows = await this.prisma.questionBank.findMany({
      where: {
        isGlobal: true,
        status: "APPROVED",
        grade: {
          in: [grade, grade.replace(" ", ""), grade.split(" ")[1]],
          mode: "insensitive",
        },
        questionType: "MULTIPLE_CHOICE",
      },
    });
    const pool = approvedChoices(rows);
    const subjects = [...new Set(pool.map((q) => q.subject))]
      .sort()
      .map((subject) => ({
        subject,
        count: pool.filter((q) => q.subject === subject).length,
        batchSize: 30,
      }));
    const active = await this.prisma.kjseaMockAttempt.findMany({
      where: {
        studentId: actor.id,
        schoolId: actor.schoolId,
        source: "PRACTICE",
        status: "DRAFT",
        coverage: { path: ["grade"], equals: grade },
      },
      select: { id: true, subject: true, createdAt: true },
    });
    return { grade, subjects, active };
  }
  async start(subject: string, actor: AuthenticatedUser) {
    const grade = await this.grade(actor),
      name = subject.trim();
    if (!name || name.length > 120)
      throw new BadRequestException("Choose a subject.");
    const seed = randomInt(1, 2147483647);
    return this.prisma.$transaction(
      async (tx) => {
        // One allocator for this grade/subject across all instances. Serialises students as well as duplicate clicks.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`practice:${grade}:${name.toLowerCase()}`}))`;
        const current = await tx.kjseaMockAttempt.findFirst({
          where: {
            studentId: actor.id,
            schoolId: actor.schoolId,
            source: "PRACTICE",
            status: "DRAFT",
            subject: { equals: name, mode: "insensitive" },
            coverage: { path: ["grade"], equals: grade },
          },
        });
        if (current) return { id: current.id, resumed: true };
        const rows = await tx.questionBank.findMany({
            where: {
              isGlobal: true,
              status: "APPROVED",
              grade: {
                in: [grade, grade.replace(" ", ""), grade.split(" ")[1]],
                mode: "insensitive",
              },
              subject: { equals: name, mode: "insensitive" },
              questionType: "MULTIPLE_CHOICE",
            },
            orderBy: { id: "asc" },
          }),
          pool = approvedChoices(rows);
        if (pool.length < 30)
          throw new BadRequestException(
            `This subject has ${pool.length} approved practice questions. At least 30 are required.`,
          );
        const history = await tx.kjseaMockAttempt.findMany({
          where: {
            studentId: actor.id,
            source: { in: ["PRACTICE", "BANK"] },
            subject: { equals: name, mode: "insensitive" },
          },
          select: { questions: true, completedAt: true },
        });
        const active = await tx.kjseaMockAttempt.findMany({
          where: {
            studentId: { not: actor.id },
            source: "PRACTICE",
            status: "DRAFT",
            subject: { equals: name, mode: "insensitive" },
            coverage: { path: ["grade"], equals: grade },
            updatedAt: { gt: new Date(Date.now() - 24 * 3600000) },
          },
          select: { questions: true },
        });
        const chosen = rankPractice(pool, history, active, seed),
          questions = bankPaper(chosen, seed, new Set());
        const seen = new Set(
          history.flatMap((a) =>
            (a.questions as any[]).map((q) => q.sourceQuestionId),
          ),
        );
        const attempt = await tx.kjseaMockAttempt.create({
          data: {
            studentId: actor.id,
            schoolId: actor.schoolId,
            seed,
            source: "PRACTICE",
            version: "question-bank-practice-v1",
            subject: pool[0].subject,
            coverage: {
              grade,
              grades: [grade],
              questionCount: 30,
              topicCount: new Set(questions.map((q) => q.topic)).size,
              visualCount: questions.filter(
                (q) => q.contentHtml || q.diagramUrl,
              ).length,
              repeatedCount: chosen.filter((q) => seen.has(q.id)).length,
              rotation:
                "Unseen first; reduce active overlap; least used then oldest repeats.",
            },
            questions: questions as unknown as Prisma.InputJsonValue,
          },
        });
        return { id: attempt.id, resumed: false };
      },
      { timeout: 20000 },
    );
  }
}
