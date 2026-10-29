import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomInt } from "crypto";
import type { KjseaMockAttempt, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import {
  generatePaper,
  generateGradePaper,
  gradeTopics,
  MOCK_BLUEPRINT,
  type MockQuestion,
} from "./mathematics";
import { seniorSubjects, seniorPaper } from "./senior-practice";
import { approvedChoices, bankPaper, type BankItem } from "./question-pool";
import { CreateMockDto, SaveMockDto } from "./kjsea.dto";

@Injectable()
export class KjseaService {
  constructor(private readonly prisma: PrismaService) {}
  async configuration() {
    try {
      await this.prisma.kjseaMockAttempt.findFirst({
        where: { id: "__kjsea_schema_probe__" },
        select: { id: true },
      });
    } catch {
      throw new ServiceUnavailableException(
        "The mock-test database is not ready yet. Please retry shortly.",
      );
    }
    return { ...MOCK_BLUEPRINT, gradeSelection: true, seniorMocks: true, assessmentWorkspaceVersion: 2 };
  }
  private grade(value?: string | null) {
    if (!value) return "Grade 9";
    const match = value.trim().match(/^(?:grade\s*)?(7|8|9|10|11|12)$/i);
    if (!match)
      throw new BadRequestException(
        "Mock tests support Grades 7–12. Choose a supported school grade.",
      );
    return `Grade ${match[1]}`;
  }
  private async approvedBank(grade: string) {
    const rows = await this.prisma.questionBank.findMany({
      where: {
        isGlobal: true,
        source: "PLATFORM",
        schoolId: null,
        status: "APPROVED",
        grade: {
          in: [grade, grade.replace(" ", ""), grade.split(" ")[1]],
          mode: "insensitive",
        },
        questionType: "MULTIPLE_CHOICE",
        correctAnswer: { not: null },
        explanation: { not: null },
      },
      select: {
        id: true,
        subject: true,
        grade: true,
        topic: true,
        questionType: true,
        questionText: true,
        contentHtml: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        diagramUrl: true,
        diagramAlt: true,
      },
      orderBy: { id: "asc" },
    });
    return approvedChoices(
      (rows as BankItem[]).filter(
        (row) =>
          !grade ||
          row.grade.replace(/\s/g, "").replace(/^grade/i, "") ===
            grade.split(" ")[1],
      ),
    );
  }
  async subjects(actor: AuthenticatedUser, requestedGrade?: string) {
    const grade = this.grade(requestedGrade ?? actor.grade);
    const rows = await this.approvedBank(grade);
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.subject.trim().toLowerCase();
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [
      ...(Number(grade.split(" ")[1]) <= 9
        ? [
            {
              id: "generated-mathematics",
              contentKind: "VARIED",
              subject: "Mathematics",
              source: "GENERATED",
              availableCount: null,
              questionCount: 40,
              topicCount: gradeTopics(grade).length,
              visualCount: grade === "Grade 9" ? 20 : null,
              areaCount: 5,
              grades: [grade],
            },
          ]
        : seniorSubjects(grade).map((profile) => ({
            id: `generated:${profile.subject.toLowerCase()}`,
            subject: profile.subject,
            source: "GENERATED",
            contentKind: profile.varied ? "VARIED" : "STARTER",
            availableCount: null,
            questionCount: profile.questionCount,
            topicCount: profile.topicCount,
            visualCount: null,
            grades: [grade],
          }))),
      ...[...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({
          id: `bank:${key}`,
          subject: items[0].subject.trim(),
          source: "BANK",
          contentKind: "BANK",
          availableCount: items.length,
          questionCount: Math.min(40, items.length),
          topicCount: new Set(items.map((i) => i.topic)).size,
          visualCount: items.filter(
            (i) =>
              i.diagramUrl || /<(?:img|svg|table)\b/i.test(i.contentHtml ?? ""),
          ).length,
          grades: [...new Set(items.map((i) => i.grade))].sort(),
        })),
    ];
  }
  async create(dto: CreateMockDto, actor: AuthenticatedUser) {
    const grade = this.grade(dto.grade ?? actor.grade);
    // Each paper uses a single grade; historical papers keep their original snapshot.
    const active = await this.prisma.kjseaMockAttempt.count({
      where: { schoolId: actor.schoolId, studentId: actor.id, status: "DRAFT" },
    });
    if (active >= 5)
      throw new BadRequestException(
        "You have five unfinished mocks. Resume or discard one before generating another.",
      );
    const seed = randomInt(1, 2147483647);
    const source = dto.source ?? "GENERATED";
    const subject =
      dto.subject?.trim() ||
      (source === "GENERATED" ? "Mathematics" : undefined);
    if (!subject)
      throw new BadRequestException("Choose a subject for your mock.");
    const junior = Number(grade.split(" ")[1]) <= 9;
    const senior = seniorSubjects(grade).find(
      (s) => s.subject.toLowerCase() === subject.toLowerCase(),
    );
    if (
      source === "GENERATED" &&
      !(junior && subject.toLowerCase() === "mathematics") &&
      !senior
    )
      throw new BadRequestException(
        `No built-in ${subject} practice is available for ${grade}. Choose a reviewed-bank subject.`,
      );
    let questions: MockQuestion[];
    if (source === "BANK") {
      const pool = (await this.approvedBank(grade)).filter(
        (i) => i.subject.trim().toLowerCase() === subject.toLowerCase(),
      );
      if (!pool.length)
        throw new BadRequestException(
          `No reviewed ${subject} questions are available for ${grade} yet.`,
        );
      const recent = await this.prisma.kjseaMockAttempt.findMany({
        where: {
          schoolId: actor.schoolId,
          studentId: actor.id,
          subject: { equals: subject, mode: "insensitive" },
          source: "BANK",
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { questions: true },
      });
      const used = new Set<number>(
        recent.flatMap((a) =>
          (a.questions as unknown as MockQuestion[]).flatMap((q) =>
            q.sourceQuestionId ? [q.sourceQuestionId] : [],
          ),
        ),
      );
      questions = bankPaper(pool, seed, used);
    } else if (!junior) questions = seniorPaper(subject, seed);
    else
      questions =
        grade === "Grade 9"
          ? generatePaper(seed)
          : generateGradePaper(seed, grade);
    const coverage = {
      grade,
      questionCount: questions.length,
      topicCount: new Set(questions.map((q) => q.topicId)).size,
      visualCount: questions.filter(
        (q) =>
          q.visual ||
          q.diagramUrl ||
          /<(?:img|svg|table)\b/i.test(q.contentHtml ?? ""),
      ).length,
      areaCount: new Set(questions.map((q) => q.area)).size,
      contentKind:
        source === "BANK"
          ? "BANK"
          : senior && !senior.varied
            ? "STARTER"
            : "VARIED",
      grades: [grade],
    };
    const attempt = await this.prisma.kjseaMockAttempt.create({
      data: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        seed,
        version:
          source === "GENERATED"
            ? junior
              ? MOCK_BLUEPRINT.version
              : "senior-practice-v1"
            : "kjsea-bank-v1",
        subject,
        source,
        coverage: JSON.parse(JSON.stringify(coverage)),
        questions: questions as unknown as Prisma.InputJsonValue,
        timeLimitMinutes: dto.timeLimitMinutes,
      },
    });
    return this.present(attempt);
  }
  async list(actor: AuthenticatedUser) {
    const attempts = await this.prisma.kjseaMockAttempt.findMany({
      where: { schoolId: actor.schoolId, studentId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        score: true,
        timeLimitMinutes: true,
        createdAt: true,
        completedAt: true,
        version: true,
        subject: true,
        source: true,
        coverage: true,
      },
    });
    return attempts.map((a) => ({
      ...a,
      questionCount: Number(
        (a.coverage as Record<string, unknown>)?.questionCount ??
          MOCK_BLUEPRINT.questionCount,
      ),
    }));
  }
  async get(id: string, actor: AuthenticatedUser) {
    return this.present(await this.owned(id, actor));
  }
  async save(id: string, dto: SaveMockDto, actor: AuthenticatedUser) {
    const attempt = await this.owned(id, actor);
    if (attempt.status !== "DRAFT") return this.present(attempt);
    if (this.expired(attempt))
      throw new BadRequestException(
        "Time has ended. Submit the paper to review your saved answers.",
      );
    const answers = this.mergeAnswers(attempt, dto);
    await this.prisma.kjseaMockAttempt.updateMany({
      where: {
        id,
        schoolId: actor.schoolId,
        studentId: actor.id,
        status: "DRAFT",
      },
      data: { answers },
    });
    return this.get(id, actor);
  }
  async submit(id: string, dto: SaveMockDto, actor: AuthenticatedUser) {
    const attempt = await this.owned(id, actor);
    if (attempt.status !== "DRAFT") return this.present(attempt);
    // After the server deadline, late changes are ignored; grade the last saved answers.
    const answers = this.expired(attempt)
      ? this.answers(attempt)
      : this.mergeAnswers(attempt, dto);
    const questions = attempt.questions as unknown as MockQuestion[];
    const score = questions.filter(
      (q) => answers[q.id] === q.correctIndex,
    ).length;
    await this.prisma.kjseaMockAttempt.updateMany({
      where: {
        id,
        schoolId: actor.schoolId,
        studentId: actor.id,
        status: "DRAFT",
      },
      data: { answers, score, status: "SUBMITTED", completedAt: new Date() },
    });
    return this.get(id, actor);
  }
  async discard(id: string, actor: AuthenticatedUser) {
    const attempt=await this.owned(id, actor);
    if(attempt.source==="PRACTICE")throw new BadRequestException("Complete your current practice batch before receiving another.");
    const result = await this.prisma.kjseaMockAttempt.deleteMany({
      where: {
        id,
        schoolId: actor.schoolId,
        studentId: actor.id,
        status: "DRAFT",
      },
    });
    if (!result.count)
      throw new BadRequestException("Completed mocks are retained for review.");
    return { deleted: true };
  }
  private async owned(id: string, actor: AuthenticatedUser) {
    const a = await this.prisma.kjseaMockAttempt.findFirst({
      where: { id, schoolId: actor.schoolId, studentId: actor.id },
    });
    if (!a) throw new NotFoundException("Mock attempt not found");
    return a;
  }
  private answers(attempt: KjseaMockAttempt) {
    return (attempt.answers ?? {}) as Record<string, number>;
  }
  private mergeAnswers(attempt: KjseaMockAttempt, dto: SaveMockDto) {
    const answers = { ...this.answers(attempt) };
    const ids = new Set(
      (attempt.questions as unknown as MockQuestion[]).map((q) => q.id),
    );
    for (const answer of dto.answers) {
      if (
        !ids.has(answer.questionId) ||
        !Number.isInteger(answer.option) ||
        answer.option < 0 ||
        answer.option > 3
      )
        throw new BadRequestException("Invalid question or answer option");
      answers[answer.questionId] = answer.option;
    }
    return answers;
  }
  private expired(a: KjseaMockAttempt) {
    return (
      !!a.timeLimitMinutes &&
      Date.now() >= a.createdAt.getTime() + a.timeLimitMinutes * 60000
    );
  }
  private present(attempt: KjseaMockAttempt) {
    const submitted = attempt.status === "SUBMITTED";
    return {
      id: attempt.id,
      version: attempt.version,
      subject: attempt.subject,
      source: attempt.source,
      coverage: attempt.coverage,
      status: attempt.status,
      score: submitted ? attempt.score : null,
      createdAt: attempt.createdAt,
      completedAt: attempt.completedAt,
      timeLimitMinutes: attempt.timeLimitMinutes,
      deadline: attempt.timeLimitMinutes
        ? new Date(
            attempt.createdAt.getTime() + attempt.timeLimitMinutes * 60000,
          )
        : null,
      serverNow: new Date(),
      answers: this.answers(attempt),
      questions: (attempt.questions as unknown as MockQuestion[]).map(
        ({ correctIndex, explanation, ...q }) =>
          submitted ? { ...q, correctIndex, explanation } : q,
      ),
    };
  }
}
