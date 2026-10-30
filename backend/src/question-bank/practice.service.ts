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
import { approvedPractice, practicePaper } from "./practice-questions";
import {
  rankPractice,
  freshPractice,
  practiceSetSize,
  MIN_TOPIC_QUESTIONS,
} from "./content-tools";
@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}
  private async grade(actor: AuthenticatedUser) {
    const school = await this.prisma.school.findUnique({
      where: { id: actor.schoolId },
      select: { code: true },
    });
    if (school?.code !== "INDEPENDENT") {
      const [subscription, access] = await Promise.all([
        this.prisma.subscription.findFirst({
          where: { schoolId: actor.schoolId },
          orderBy: { startedAt: "desc" },
        }),
        this.prisma.schoolQuestionBankAccess.findUnique({
          where: { schoolId: actor.schoolId },
        }),
      ]);
      if (
        subscription?.status !== "ACTIVE" ||
        (subscription.expiresAt && subscription.expiresAt <= new Date()) ||
        !access?.active
      )
        throw new ForbiddenException(
          "School students use assignments selected by their teachers unless school Question Bank access is active.",
        );
    }
    const grade = normalizeGrade(actor.grade ?? "");
    if (!grade || !/^Grade (6|7|8|9|10|11|12)$/.test(grade))
      throw new BadRequestException(
        "Set your Grade 6–12 profile before starting practice.",
      );
    return grade;
  }
  private async history(
    db: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    grade: string,
    subject?: string,
  ) {
    const [attempts, submissions] = await Promise.all([
      db.kjseaMockAttempt.findMany({
        where: {
          studentId: actor.id,
          schoolId: actor.schoolId,
          source: { in: ["PRACTICE", "BANK"] },
          OR: [
            { coverage: { path: ["grade"], equals: grade } },
            { coverage: { path: ["grades"], array_contains: [grade] } },
          ],
          ...(subject
            ? { subject: { equals: subject, mode: "insensitive" as const } }
            : {}),
        },
        select: { questions: true, completedAt: true, subject: true },
      }),
      db.submission.findMany({
        where: {
          studentId: actor.id,
          assignment: {
            schoolId: actor.schoolId,
            grade: {
              in: [grade, grade.replace(" ", ""), grade.split(" ")[1]],
              mode: "insensitive" as const,
            },
            ...(subject
              ? { subject: { equals: subject, mode: "insensitive" as const } }
              : {}),
          },
        },
        select: {
          completedAt: true,
          assignment: {
            select: {
              subject: true,
              questions: { select: { id: true, questionText: true } },
              studentVariants: {
                where: { studentId: actor.id },
                select: { questionIds: true },
              },
            },
          },
        },
      }),
    ]);
    return [
      ...attempts,
      ...submissions.map((row) => {
        const variant = row.assignment.studentVariants[0];
        return {
          completedAt: row.completedAt,
          subject: row.assignment.subject,
          questions: row.assignment.questions
            .filter(
              (question) =>
                !variant || variant.questionIds.includes(question.id),
            )
            .map((question) => ({ prompt: question.questionText })),
        };
      }),
    ];
  }
  async subjects(actor: AuthenticatedUser) {
    const grade = await this.grade(actor);
    const rows = await this.prisma.questionBank.findMany({
      where: {
        isGlobal: true,
        status: "APPROVED",
        OR: [
          {
            publishedAssignment: {
              schoolId: actor.schoolId,
              isPublished: true,
              createdBy: { role: "PLATFORM_ADMIN" },
              targetClass: null,
              targetStream: null,
            },
          },
          {
            usages: {
              some: {
                schoolId: actor.schoolId,
                assignment: {
                  isPublished: true,
                  createdBy: { role: "PLATFORM_ADMIN" },
                  targetClass: null,
                  targetStream: null,
                },
              },
            },
          },
        ],
        grade: {
          in: [grade, grade.replace(" ", ""), grade.split(" ")[1]],
          mode: "insensitive",
        },
        questionType: {
          in: [
            "MULTIPLE_CHOICE",
            "TRUE_FALSE",
            "NUMERIC",
            "SHORT_ANSWER",
            "ESSAY",
          ],
        },
      },
    });
    const pool = approvedPractice(rows);
    const history = await this.history(this.prisma, actor, grade);
    // Keep curriculum gaps visible instead of treating the existing pool as
    // the complete subject list. Senior pathways and RE alternatives remain
    // available; this list does not claim every option is compulsory.
    const catalogue = await this.prisma.curriculumScope.findMany({
      where: { grade, verified: true },
      select: { subject: true },
    });
    const names = new Map<string, string>();
    for (const item of [...catalogue, ...pool]) {
      const name = item.subject.trim();
      if (name) names.set(name.toLowerCase(), name);
    }
    const subjects = [...names.values()]
      .sort((a, b) => a.localeCompare(b))
      .map((subject) => ({
        subject,
        count: pool.filter(
          (q) => q.subject.trim().toLowerCase() === subject.toLowerCase(),
        ).length,
        batchSize: 30,
        topics: [
          ...new Set(
            pool
              .filter(
                (q) => q.subject.trim().toLowerCase() === subject.toLowerCase(),
              )
              .map((q) => q.topic.trim() || "General practice"),
          ),
        ]
          .sort()
          .map((topic) => {
            const remainingCount = freshPractice(
              pool.filter(
                (q) =>
                  q.subject.trim().toLowerCase() === subject.toLowerCase() &&
                  (q.topic.trim() || "General practice") === topic,
              ),
              history,
            ).length;
            return {
              topic,
              count: pool.filter(
                (q) =>
                  q.subject.trim().toLowerCase() === subject.toLowerCase() &&
                  (q.topic.trim() || "General practice") === topic,
              ).length,
              remainingCount,
              nextSetSize: practiceSetSize(remainingCount),
              minimumQuestions: MIN_TOPIC_QUESTIONS,
            };
          }),
      }));
    const active = await this.prisma.kjseaMockAttempt.findMany({
      where: {
        studentId: actor.id,
        schoolId: actor.schoolId,
        source: "PRACTICE",
        status: "DRAFT",
        coverage: { path: ["grade"], equals: grade },
      },
      select: { id: true, subject: true, createdAt: true, coverage: true },
    });
    const completed = await this.prisma.kjseaMockAttempt.findMany({
      where: {
        studentId: actor.id,
        schoolId: actor.schoolId,
        source: "PRACTICE",
        status: "SUBMITTED",
        coverage: { path: ["grade"], equals: grade },
      },
      select: { id: true, subject: true, coverage: true, completedAt: true },
      orderBy: { createdAt: "desc" },
    });
    return { grade, subjects, active, completed };
  }
  async start(subject: string, actor: AuthenticatedUser, topic?: string) {
    const grade = await this.grade(actor),
      name = subject.trim();
    if (!name || name.length > 120)
      throw new BadRequestException("Choose a subject.");
    const selectedTopic = topic?.trim();
    if (topic !== undefined && (!selectedTopic || selectedTopic.length > 160))
      throw new BadRequestException("Choose a valid topic.");
    const seed = randomInt(1, 2147483647);
    return this.prisma.$transaction(
      async (tx) => {
        // One allocator for this grade/subject across all instances. Serialises students as well as duplicate clicks.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`practice:${grade}:${name.toLowerCase()}:${selectedTopic?.toLowerCase() ?? "*"}`}))`;
        const current = await tx.kjseaMockAttempt.findFirst({
          where: {
            studentId: actor.id,
            schoolId: actor.schoolId,
            source: "PRACTICE",
            status: "DRAFT",
            subject: { equals: name, mode: "insensitive" },
            ...(selectedTopic
              ? {
                  AND: [
                    { coverage: { path: ["topic"], equals: selectedTopic } },
                  ],
                }
              : {}),
            coverage: { path: ["grade"], equals: grade },
          },
        });
        if (current) return { id: current.id, resumed: true };
        const rows = await tx.questionBank.findMany({
            where: {
              isGlobal: true,
              status: "APPROVED",
              OR: [
                {
                  publishedAssignment: {
                    schoolId: actor.schoolId,
                    isPublished: true,
                    createdBy: { role: "PLATFORM_ADMIN" },
                    targetClass: null,
                    targetStream: null,
                  },
                },
                {
                  usages: {
                    some: {
                      schoolId: actor.schoolId,
                      assignment: {
                        isPublished: true,
                        createdBy: { role: "PLATFORM_ADMIN" },
                        targetClass: null,
                        targetStream: null,
                      },
                    },
                  },
                },
              ],
              grade: {
                in: [grade, grade.replace(" ", ""), grade.split(" ")[1]],
                mode: "insensitive",
              },
              subject: { equals: name, mode: "insensitive" },
              questionType: {
                in: [
                  "MULTIPLE_CHOICE",
                  "TRUE_FALSE",
                  "NUMERIC",
                  "SHORT_ANSWER",
                  "ESSAY",
                ],
              },
              ...(selectedTopic
                ? { topic: { equals: selectedTopic, mode: "insensitive" } }
                : {}),
            },
            orderBy: { id: "asc" },
          }),
          pool = approvedPractice(rows);
        if (freshPractice(pool, []).length < MIN_TOPIC_QUESTIONS)
          throw new BadRequestException(
            `At least ${MIN_TOPIC_QUESTIONS} distinct approved questions are required for a new set. More questions are being prepared for this ${selectedTopic ? "topic" : "subject"}.`,
          );
        const history = await this.history(tx, actor, grade, name);
        const fresh = freshPractice(pool, history);
        if (fresh.length < MIN_TOPIC_QUESTIONS)
          throw new BadRequestException(
            `You have ${fresh.length} unseen questions remaining. A new set needs at least ${MIN_TOPIC_QUESTIONS}. Your completed sets are saved; more approved questions must be published for this topic.`,
          );
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
        const chosen = rankPractice(fresh, history, active, seed).slice(
            0,
            practiceSetSize(fresh.length),
          ),
          questions = practicePaper(chosen, seed);
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
              ...(selectedTopic ? { topic: selectedTopic } : {}),
              grades: [grade],
              questionCount: questions.length,
              topicCount: new Set(questions.map((q) => q.topic)).size,
              visualCount: questions.filter(
                (q) => q.contentHtml || q.diagramUrl,
              ).length,
              repeatedCount: chosen.filter((q) => seen.has(q.id)).length,
              rotation:
                "Unseen questions only; reduce overlap with other active students.",
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
