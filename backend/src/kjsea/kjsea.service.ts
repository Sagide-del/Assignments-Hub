import {
  reviewedMathReady,
  reviewedMathExam,
  reviewedLanguageReady,
  reviewedLanguageExam,
  WrittenBankItem,
} from "./reviewed-exams";
import {
  mathematicsExam,
  totalMarks,
  questionMarks,
  performanceLevel,
  MATH_ALLOCATION,
  ExamAnswer,
} from "./exam-paper";
import { languageExam } from "./language-paper";
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
import { gradeTopics, MOCK_BLUEPRINT, type MockQuestion } from "./mathematics";
import { seniorSubjects } from "./senior-practice";
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
    return {
      ...MOCK_BLUEPRINT,
      sourceNote:
        "Original Assignment Hub mock papers. The practice allocation is not an official KNEC specification; performance levels are revision estimates.",
      gradeSelection: true,
      seniorMocks: true,
      assessmentWorkspaceVersion: 3,
      fullExamVersion: 1,
      mathematicsAllocation: MATH_ALLOCATION,
    };
  }
  private grade(value?: string | null) {
    if (!value) return "Grade 9";
    const match = value.trim().match(/^(?:grade\s*)?(6|7|8|9|10|11|12)$/i);
    if (!match)
      throw new BadRequestException(
        "Mock tests support Grades 6–12. Choose a supported school grade.",
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
  private async approvedWritten(grade: string) {
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
        questionType: { in: ["NUMERIC", "SHORT_ANSWER"] },
        correctAnswer: { not: null },
        explanation: { not: null },
      },
      orderBy: { id: "asc" },
    });
    return (rows as WrittenBankItem[]).filter(
      (q) =>
        ["NUMERIC", "SHORT_ANSWER"].includes(q.questionType) &&
        q.correctAnswer?.trim() &&
        q.explanation?.trim() &&
        q.grade.replace(/\s/g, "").replace(/^grade/i, "") ===
          grade.split(" ")[1],
    );
  }
  async subjects(actor: AuthenticatedUser, requestedGrade?: string) {
    const grade = this.grade(requestedGrade ?? actor.grade);
    const [rows, written] = await Promise.all([
      this.approvedBank(grade),
      this.approvedWritten(grade),
    ]);
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
              fullPaperReady: true,
              totalMarks: 100,
              durationMinutes: 120,
              sections: [
                "Section A · 20 multiple-choice marks",
                "Section B · 80 structured marks",
              ],
              topicCount: gradeTopics(grade).length,
              visualCount: null,
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
            fullPaperReady: false,
            durationMinutes: 120,
            questionCount: profile.questionCount,
            topicCount: profile.topicCount,
            visualCount: null,
            grades: [grade],
          }))),
      ...(Number(grade.split(" ")[1]) <= 9
        ? ["English", "Kiswahili"].map((subject) => ({
            id: `exam:${subject.toLowerCase()}`,
            subject,
            source: "GENERATED",
            contentKind: "VARIED",
            availableCount: groups.get(subject.toLowerCase())?.length ?? 0,
            fullPaperReady: true,
            totalMarks: 40,
            durationMinutes: 80,
            questionCount: 40,
            topicCount: 6,
            visualCount: 0,
            grades: [grade],
            sections: [
              "Dialogue",
              "Cloze",
              "Reading comprehension",
              "Informational reading",
              "Poetry",
              "Language use",
            ],
          }))
        : []),
      ...[...groups.entries()]
        .filter(([key, items]) =>
          key === "mathematics"
            ? reviewedMathReady(
                items,
                written.filter((q) => q.subject.trim().toLowerCase() === key),
              )
            : ["english", "kiswahili"].includes(key)
              ? reviewedLanguageReady(items)
              : true,
        )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({
          id: `bank:${key}`,
          subject: items[0].subject.trim(),
          source: "BANK",
          contentKind: "BANK",
          availableCount:
            key === "mathematics"
              ? items.length +
                written.filter((q) => q.subject.trim().toLowerCase() === key)
                  .length
              : items.length,
          questionCount:
            key === "mathematics" ? 40 : Math.min(40, items.length),
          fullPaperReady:
            key === "mathematics"
              ? reviewedMathReady(
                  items,
                  written.filter((q) => q.subject.trim().toLowerCase() === key),
                )
              : ["english", "kiswahili"].includes(key)
                ? reviewedLanguageReady(items)
                : items.length >= 40 &&
                  new Set(items.map((q) => q.topic.trim().toLowerCase()))
                    .size >= 3,
          durationMinutes: ["english", "kiswahili"].includes(key) ? 80 : 120,
          totalMarks: key === "mathematics" ? 100 : Math.min(40, items.length),
          ...(key === "mathematics"
            ? {
                sections: [
                  "Section A · 20 multiple-choice marks",
                  "Section B · 80 structured marks",
                ],
              }
            : {}),
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
      where: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        status: "DRAFT",
        source: { not: "PRACTICE" },
      },
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
      !(
        junior &&
        ["mathematics", "english", "kiswahili"].includes(subject.toLowerCase())
      ) &&
      !senior
    )
      throw new BadRequestException(
        `No built-in ${subject} practice is available for ${grade}. Choose a reviewed-bank subject.`,
      );
    if (source === "GENERATED" && !junior)
      throw new BadRequestException(
        "This topic starter is not a full mock paper. Choose a reviewed-bank paper with at least 40 questions.",
      );
    let questions: MockQuestion[];
    if (source === "BANK") {
      const pool = (await this.approvedBank(grade)).filter(
        (i) => i.subject.trim().toLowerCase() === subject.toLowerCase(),
      );
      const math = subject.toLowerCase() === "mathematics",
        language = /^(english|kiswahili)$/i.test(subject);
      const written = math
        ? (await this.approvedWritten(grade)).filter(
            (q) => q.subject.trim().toLowerCase() === subject.toLowerCase(),
          )
        : [];
      if (
        math
          ? !reviewedMathReady(pool, written)
          : language
            ? !reviewedLanguageReady(pool)
            : pool.length < 40 ||
              new Set(pool.map((q) => q.topic.trim().toLowerCase())).size < 3
      )
        throw new BadRequestException(
          math
            ? "A full mathematics mock needs 20 reviewed multiple-choice and 20 reviewed numeric/short-answer questions across at least three topics."
            : language
              ? "A full language mock needs reviewed dialogue, cloze, comprehension, language use, poetry and informational-reading question groups with their passages."
              : `A full ${subject} mock needs 40 reviewed questions across at least three topics. Use Assignments for topic practice.`,
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
      questions = math
        ? reviewedMathExam(pool, written, seed, used)
        : language
          ? reviewedLanguageExam(pool, seed, used)
          : bankPaper(pool, seed, used);
    } else
      questions =
        subject.toLowerCase() === "mathematics"
          ? mathematicsExam(seed, grade)
          : languageExam(seed, grade, subject);
    const coverage = {
      grade,
      totalMarks: totalMarks(questions),
      sections: [
        ...new Set(questions.map((q) => q.section ?? "Multiple choice")),
      ],
      assessment: "TIMED_MOCK",
      allocationNote:
        "Assignment Hub practice blueprint; not an official KNEC specification.",
      ...(grade === "Grade 9" &&
      subject.toLowerCase() === "mathematics" &&
      source === "GENERATED"
        ? { gradeMarks: { "Grade 7": 18, "Grade 8": 32, "Grade 9": 50 } }
        : {}),
      questionCount: questions.length,
      topicCount: new Set(questions.map((q) => q.topic)).size,
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
              ? "full-exam-v1"
              : "senior-practice-v1"
            : "kjsea-bank-v1",
        subject,
        source,
        coverage: JSON.parse(JSON.stringify(coverage)),
        questions: questions as unknown as Prisma.InputJsonValue,
        timeLimitMinutes:
          dto.timeLimitMinutes ??
          (/^(english|kiswahili)$/i.test(subject) ? 80 : 120),
      },
    });
    return this.present(attempt);
  }
  async list(actor: AuthenticatedUser) {
    const attempts = await this.prisma.kjseaMockAttempt.findMany({
      where: {
        schoolId: actor.schoolId,
        studentId: actor.id,
        source: { not: "PRACTICE" },
      },
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
      data: { answers: answers as Prisma.InputJsonValue },
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
    const score = questions.reduce(
      (n, q) => n + questionMarks(q, answers[q.id]),
      0,
    );
    await this.prisma.kjseaMockAttempt.updateMany({
      where: {
        id,
        schoolId: actor.schoolId,
        studentId: actor.id,
        status: "DRAFT",
      },
      data: {
        answers: answers as Prisma.InputJsonValue,
        score,
        status: "SUBMITTED",
        completedAt: new Date(),
      },
    });
    return this.get(id, actor);
  }
  async discard(id: string, actor: AuthenticatedUser) {
    const attempt = await this.owned(id, actor);
    if (attempt.source === "PRACTICE")
      throw new BadRequestException(
        "Complete your current practice batch before receiving another.",
      );
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
    return (attempt.answers ?? {}) as Record<string, ExamAnswer>;
  }
  private mergeAnswers(attempt: KjseaMockAttempt, dto: SaveMockDto) {
    const answers = { ...this.answers(attempt) };
    const questions = attempt.questions as unknown as MockQuestion[];
    for (const answer of dto.answers) {
      const q = questions.find((q) => q.id === answer.questionId);
      if (!q) throw new BadRequestException("Invalid question.");
      if (q.responseType === "STRUCTURED") {
        if (
          answer.option !== undefined ||
          !answer.responses ||
          typeof answer.responses !== "object" ||
          Array.isArray(answer.responses)
        )
          throw new BadRequestException("Enter the structured responses.");
        const allowed = new Set(q.parts?.map((p) => p.id));
        for (const [key, value] of Object.entries(answer.responses))
          if (
            !allowed.has(key) ||
            typeof value !== "string" ||
            value.length >
              (q.manualSelfReview
                ? 5000
                : q.parts?.find((p) => p.id === key)?.answerType === "TEXT"
                  ? 2000
                  : 160)
          )
            throw new BadRequestException("Invalid structured answer.");
        if (
          answer.working !== undefined &&
          (typeof answer.working !== "string" || answer.working.length > 5000)
        )
          throw new BadRequestException("Working is too long.");
        answers[q.id] = {
          responses: answer.responses,
          working: answer.working ?? "",
        };
      } else {
        if (
          !Number.isInteger(answer.option) ||
          answer.option! < 0 ||
          answer.option! >= q.options.length ||
          answer.responses !== undefined ||
          answer.working !== undefined
        )
          throw new BadRequestException("Invalid question or answer option");
        answers[q.id] = answer.option!;
      }
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
      totalMarks: totalMarks(attempt.questions as unknown as MockQuestion[]),
      performance:
        submitted && attempt.source !== "PRACTICE"
          ? performanceLevel(
              attempt.score ?? 0,
              totalMarks(attempt.questions as unknown as MockQuestion[]),
            )
          : null,
      questions: (attempt.questions as unknown as MockQuestion[]).map(
        ({ correctIndex, explanation, parts, ...q }) => ({
          ...q,
          ...(parts
            ? {
                parts: parts.map(({ answer, match, ...part }) =>
                  submitted ? { ...part, answer } : part,
                ),
              }
            : {}),
          ...(submitted
            ? {
                correctIndex,
                explanation,
                awardedMarks: questionMarks(
                  { ...q, correctIndex, explanation, parts },
                  this.answers(attempt)[q.id],
                ),
              }
            : {}),
        }),
      ),
    };
  }
}
