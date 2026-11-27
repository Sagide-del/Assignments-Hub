import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AiProviderRouterService } from "../ai/ai-provider-router.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import { StudentScopeService } from "../student/student-scope.service";
import { allowedAssignmentSubject } from "../student/assignment-subjects";
import { subjectKey, key } from "../student/student-scope.policy";
import { RecoveryService } from "./recovery.service";
import { offlineLesson, offlineTopics } from "./lesson-fallbacks";

export type LessonStep = {
  step: number;
  type: "GREETING" | "EXPLANATION" | "ILLUSTRATION" | "QUESTION" | "FEEDBACK";
  text: string;
  voiceoverText: string;
  visualizationState?: string;
  questionOptions?: string[];
  correctAnswer?: string;
};

type LessonScript = {
  script: LessonStep[];
  visualizationType:
    | "PERIODIC_TABLE"
    | "PUNNETT_SQUARE"
    | "CHROMOSOME_3D"
    | "TRIG_GRAPH"
    | "CIRCUIT_BUILDER"
    | "NONE";
  visualizationData?: Record<string, unknown>;
};

const visualFor = (
  subject: string,
  topic: string,
): LessonScript["visualizationType"] => {
  const normalized = `${subject} ${topic}`.toLowerCase();
  if (
    normalized.includes("periodic") ||
    normalized.includes("atomic") ||
    normalized.includes("element")
  )
    return "PERIODIC_TABLE";
  if (
    normalized.includes("genetic") ||
    normalized.includes("inherit") ||
    normalized.includes("punnett")
  )
    return "PUNNETT_SQUARE";
  if (normalized.includes("chromosome") || normalized.includes("cell division"))
    return "CHROMOSOME_3D";
  if (
    normalized.includes("trig") ||
    normalized.includes("sine") ||
    normalized.includes("angle")
  )
    return "TRIG_GRAPH";
  if (normalized.includes("circuit") || normalized.includes("electric"))
    return "CIRCUIT_BUILDER";
  return "NONE";
};

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProviderRouterService,
    private readonly audit: AuditService,
    private readonly scopes: StudentScopeService,
    private readonly recovery: RecoveryService,
  ) {}

  async topics(actor: AuthenticatedUser, subject?: string) {
    const scope = await this.scopes.getStudentScope(actor.id, actor.schoolId);
    const [taxonomy, recovery, user] = await Promise.all([
      this.prisma.curriculumTaxonomy.findMany({
        where: { grade: scope.grade },
        select: { subject: true, topics: true },
        orderBy: { subject: "asc" },
      }),
      this.recovery.load(actor),
      this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { weakSubjects: true },
      }),
    ]);
    const weak = new Set((user?.weakSubjects ?? []).map(subjectKey));
    const priorities = new Map(
      recovery.queue.map((row) => [subjectKey(row.subject), row.priority]),
    );
    const rows = [
      ...recovery.queue.flatMap((row) =>
        row.topics.map((t) => ({ subject: row.subject, topic: t.topic })),
      ),
      ...taxonomy.flatMap((row) =>
        row.topics.map((topic) => ({ subject: row.subject, topic })),
      ),
      ...offlineTopics(scope.grade),
    ];
    const unique = new Map<
      string,
      { subject: string; topic: string; priority: boolean }
    >();
    for (const row of rows) {
      if (
        !row.topic?.trim() ||
        !allowedAssignmentSubject(scope, row.subject) ||
        (subject && subjectKey(subject) !== subjectKey(row.subject))
      )
        continue;
      const canonicalSubject = (
        scope.assignment_subjects ?? scope.subjects
      ).find((s) => subjectKey(s) === subjectKey(row.subject))!;
      const k = subjectKey(canonicalSubject) + ":" + key(row.topic);
      if (!unique.has(k))
        unique.set(k, {
          subject: canonicalSubject,
          topic: row.topic.trim(),
          priority: priorities.has(subjectKey(row.subject))
            ? priorities.get(subjectKey(row.subject))! > 0
            : weak.has(subjectKey(row.subject)),
        });
    }
    return [...unique.values()].sort(
      (a, b) =>
        Number(b.priority) - Number(a.priority) ||
        (priorities.get(subjectKey(b.subject)) ?? 0) -
          (priorities.get(subjectKey(a.subject)) ?? 0),
    );
  }

  private async permitted(
    subject: string,
    topic: string,
    actor: AuthenticatedUser,
  ) {
    const scope = await this.scopes.getStudentScope(actor.id, actor.schoolId);
    if (!allowedAssignmentSubject(scope, subject))
      throw new ForbiddenException(
        "This subject is outside your current enrolment.",
      );
    const available = await this.topics(actor, subject);
    const match = available.find((row) => key(row.topic) === key(topic));
    if (!match)
      throw new NotFoundException(
        "This topic is not available for your current grade.",
      );
    return { grade: scope.grade, subject: match.subject, topic: match.topic };
  }

  async open(subject: string, topic: string, actor: AuthenticatedUser) {
    const permitted = await this.permitted(
      this.clean(subject),
      this.clean(topic),
      actor,
    );
    const gradeLevel = permitted.grade,
      cleanSubject = permitted.subject,
      cleanTopic = permitted.topic;
    let lesson = await this.prisma.lessonContent.findUnique({
      where: {
        subject_topic_gradeLevel: {
          subject: cleanSubject,
          topic: cleanTopic,
          gradeLevel,
        },
      },
    });
    if (
      !lesson ||
      !this.parse({
        script: lesson.scriptJson,
        visualizationType: lesson.visualizationType,
        visualizationData: lesson.visualizationData,
      })
    ) {
      const generated = await this.generate(
        cleanSubject,
        cleanTopic,
        gradeLevel,
        actor,
      );
      lesson = await this.prisma.lessonContent.upsert({
        where: {
          subject_topic_gradeLevel: {
            subject: cleanSubject,
            topic: cleanTopic,
            gradeLevel,
          },
        },
        create: {
          subject: cleanSubject,
          topic: cleanTopic,
          gradeLevel,
          scriptJson: generated.script as unknown as Prisma.InputJsonValue,
          visualizationType: generated.visualizationType,
          visualizationData: (generated.visualizationData ??
            {}) as Prisma.InputJsonValue,
        },
        update: {
          scriptJson: generated.script as unknown as Prisma.InputJsonValue,
          visualizationType: generated.visualizationType,
          visualizationData: (generated.visualizationData ??
            {}) as Prisma.InputJsonValue,
        },
      });
    }
    const progress = await this.prisma.studentLessonProgress.upsert({
      where: {
        studentId_lessonId: { studentId: actor.id, lessonId: lesson.id },
      },
      create: {
        studentId: actor.id,
        lessonId: lesson.id,
        status: "IN_PROGRESS",
      },
      update: {},
    });
    return {
      ...this.serialize(lesson),
      progress: this.serializeProgress(progress),
    };
  }

  async complete(
    id: string,
    answers: string[] | undefined,
    actor: AuthenticatedUser,
  ) {
    const lesson = await this.prisma.lessonContent.findUnique({
      where: { id },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.permitted(lesson.subject, lesson.topic, actor);
    const scope = await this.scopes.getStudentScope(actor.id, actor.schoolId);
    if (scope.grade !== lesson.gradeLevel)
      throw new ForbiddenException("This lesson is for a different grade.");
    const parsed = this.parse({
      script: lesson.scriptJson,
      visualizationType: lesson.visualizationType,
      visualizationData: lesson.visualizationData,
    });
    if (!parsed)
      throw new BadRequestException(
        "Reopen this lesson to load the updated content.",
      );
    const questions = parsed.script.filter((s) => s.type === "QUESTION");
    if (
      answers &&
      (answers.length !== questions.length ||
        answers.some((v, i) => !questions[i].questionOptions!.includes(v)))
    )
      throw new BadRequestException(
        "Provide one valid first answer per lesson check.",
      );
    const score = answers
      ? Math.round(
          (100 *
            answers.filter((v, i) => v === questions[i].correctAnswer).length) /
            questions.length,
        )
      : null;
    const previous = await this.prisma.studentLessonProgress.findUnique({
      where: { studentId_lessonId: { studentId: actor.id, lessonId: id } },
    });
    if (!previous)
      throw new BadRequestException("Open this lesson before completing it.");
    const progress = await this.prisma.studentLessonProgress.updateMany({
      where: { studentId: actor.id, lessonId: id, status: "IN_PROGRESS" },
      data: { status: "COMPLETED", score, completedAt: new Date() },
    });
    if (progress.count)
      await this.audit.record({
        action: "learning_coach.lesson_completed",
        userId: actor.id,
        schoolId: actor.schoolId,
        resource: `LessonContent:${id}`,
        metadata: {
          subject: lesson.subject,
          topic: lesson.topic,
          score,
          formative: true,
        },
      });
    const saved = await this.prisma.studentLessonProgress.findUniqueOrThrow({
      where: { studentId_lessonId: { studentId: actor.id, lessonId: id } },
    });
    return {
      lesson: this.serialize(lesson),
      progress: this.serializeProgress(saved),
    };
  }

  private async generate(
    subject: string,
    topic: string,
    grade: number,
    actor: AuthenticatedUser,
  ): Promise<LessonScript> {
    const prompt = `Create a short Socratic lesson for a Kenyan CBC Grade ${grade} learner. Subject: ${subject}. Topic: ${topic}. Return JSON only with {script:[{step,type,text,voiceoverText,visualizationState?,questionOptions?,correctAnswer?}],visualizationType,visualizationData}. Include exactly one GREETING, one ILLUSTRATION or EXPLANATION, and one multiple-choice QUESTION with three options. Be factual, age-appropriate, self-contained, and do not include personal data.`;
    try {
      const result = await this.ai.generateAssignment(
        prompt,
        { schoolId: actor.schoolId, userId: actor.id },
        { maxOutputTokens: 1400, timeoutMs: 25000, maxRetries: 0 },
      );
      const parsed = this.parse(result.content);
      if (parsed) return parsed;
    } catch {
      // A lesson must remain available when the optional provider is offline.
    }
    const script = offlineLesson(subject, topic, grade, subjectKey);
    if (script)
      return {
        script,
        visualizationType: visualFor(subject, topic),
        visualizationData: { topic },
      };
    throw new ServiceUnavailableException(
      "This guided lesson is not ready yet. Try again shortly, or use the reviewed study resources in your recovery plan.",
    );
  }

  private parse(value: unknown): LessonScript | null {
    const source = typeof value === "string" ? this.tryJson(value) : value;
    if (
      !source ||
      typeof source !== "object" ||
      !Array.isArray((source as { script?: unknown }).script)
    )
      return null;
    const raw = source as {
      script: unknown[];
      visualizationType?: unknown;
      visualizationData?: unknown;
    };
    if (raw.script.length < 3 || raw.script.length > 12) return null;
    const script: LessonStep[] = [];
    for (const item of raw.script) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const type = String(row.type ?? "").toUpperCase() as LessonStep["type"];
      const text = row.text;
      if (
        ![
          "GREETING",
          "EXPLANATION",
          "ILLUSTRATION",
          "QUESTION",
          "FEEDBACK",
        ].includes(type) ||
        typeof text !== "string" ||
        !text.trim() ||
        text.length > 3000 ||
        /is a key idea in/.test(text)
      )
        return null;
      const voice = row.voiceoverText ?? row.voiceover_text ?? text;
      if (typeof voice !== "string" || voice.length > 3000) return null;
      const options = row.questionOptions ?? row.question_options,
        answer = row.correctAnswer ?? row.correct_answer;
      if (
        type === "QUESTION" &&
        (!Array.isArray(options) ||
          options.length < 2 ||
          options.length > 5 ||
          options.some(
            (v) => typeof v !== "string" || !v.trim() || v.length > 500,
          ) ||
          new Set(options.map((v) => String(v).trim())).size !==
            options.length ||
          typeof answer !== "string" ||
          !options.includes(answer))
      )
        return null;
      script.push({
        step: script.length + 1,
        type,
        text: text.trim(),
        voiceoverText: voice,
        visualizationState:
          typeof row.visualizationState === "string"
            ? row.visualizationState
            : undefined,
        ...(type === "QUESTION"
          ? {
              questionOptions: options as string[],
              correctAnswer: answer as string,
            }
          : {}),
      });
    }
    if (
      script[0].type !== "GREETING" ||
      !script.some(
        (s) => s.type === "EXPLANATION" || s.type === "ILLUSTRATION",
      ) ||
      !script.some((s) => s.type === "QUESTION")
    )
      return null;
    if (
      raw.visualizationData !== undefined &&
      raw.visualizationData !== null &&
      (typeof raw.visualizationData !== "object" ||
        Array.isArray(raw.visualizationData))
    )
      return null;
    const visualizationType = String(
      raw.visualizationType ?? "NONE",
    ).toUpperCase() as LessonScript["visualizationType"];
    return {
      script,
      visualizationType: [
        "PERIODIC_TABLE",
        "PUNNETT_SQUARE",
        "CHROMOSOME_3D",
        "TRIG_GRAPH",
        "CIRCUIT_BUILDER",
        "NONE",
      ].includes(visualizationType)
        ? visualizationType
        : "NONE",
      visualizationData: (raw.visualizationData ?? {}) as Record<
        string,
        unknown
      >,
    };
  }

  private tryJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private serialize(lesson: {
    id: string;
    subject: string;
    topic: string;
    gradeLevel: number;
    scriptJson: Prisma.JsonValue;
    visualizationType: string;
    visualizationData: Prisma.JsonValue | null;
  }) {
    return {
      id: lesson.id,
      subject: lesson.subject,
      topic: lesson.topic,
      gradeLevel: lesson.gradeLevel,
      script: lesson.scriptJson as unknown as LessonStep[],
      visualizationType: lesson.visualizationType,
      visualizationData: lesson.visualizationData,
    };
  }
  private serializeProgress(progress: {
    status: string;
    score: number | null;
    completedAt: Date | null;
  }) {
    return {
      status: progress.status,
      score: progress.score,
      completedAt: progress.completedAt,
    };
  }

  private clean(value: string) {
    return value.trim().replace(/\s+/g, " ").slice(0, 120);
  }
}
