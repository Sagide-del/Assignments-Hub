import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AiProviderRouterService } from "../ai/ai-provider-router.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

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
  visualizationType: "PERIODIC_TABLE" | "PUNNETT_SQUARE" | "CHROMOSOME_3D" | "TRIG_GRAPH" | "CIRCUIT_BUILDER" | "NONE";
  visualizationData?: Record<string, unknown>;
};

const visualFor = (subject: string, topic: string): LessonScript["visualizationType"] => {
  const normalized = `${subject} ${topic}`.toLowerCase();
  if (normalized.includes("periodic") || normalized.includes("atomic") || normalized.includes("element")) return "PERIODIC_TABLE";
  if (normalized.includes("genetic") || normalized.includes("inherit") || normalized.includes("punnett")) return "PUNNETT_SQUARE";
  if (normalized.includes("chromosome") || normalized.includes("cell division")) return "CHROMOSOME_3D";
  if (normalized.includes("trig") || normalized.includes("sine") || normalized.includes("angle")) return "TRIG_GRAPH";
  if (normalized.includes("circuit") || normalized.includes("electric")) return "CIRCUIT_BUILDER";
  return "NONE";
};

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProviderRouterService,
    private readonly audit: AuditService,
  ) {}

  async topics(actor: AuthenticatedUser, subject?: string) {
    const grade = this.gradeLevel(actor.grade);
    const taxonomy = await this.prisma.curriculumTaxonomy.findMany({
      where: { grade, ...(subject ? { subject: { equals: subject, mode: "insensitive" } } : {}) },
      select: { subject: true, topics: true },
      orderBy: { subject: "asc" },
    });
    const weak = new Set((await this.prisma.user.findUnique({ where: { id: actor.id }, select: { weakSubjects: true } }))?.weakSubjects.map((item) => item.toLowerCase()) ?? []);
    return taxonomy.flatMap((row) => row.topics.filter(Boolean).map((topic) => ({
      subject: row.subject,
      topic,
      priority: weak.has(row.subject.toLowerCase()),
    })));
  }

  async open(subject: string, topic: string, actor: AuthenticatedUser) {
    const gradeLevel = this.gradeLevel(actor.grade);
    const cleanSubject = this.clean(subject);
    const cleanTopic = this.clean(topic);
    let lesson = await this.prisma.lessonContent.findUnique({
      where: { subject_topic_gradeLevel: { subject: cleanSubject, topic: cleanTopic, gradeLevel } },
    });
    if (!lesson) {
      const generated = await this.generate(cleanSubject, cleanTopic, gradeLevel, actor);
      lesson = await this.prisma.lessonContent.upsert({
        where: { subject_topic_gradeLevel: { subject: cleanSubject, topic: cleanTopic, gradeLevel } },
        create: {
          subject: cleanSubject,
          topic: cleanTopic,
          gradeLevel,
          scriptJson: generated.script as unknown as Prisma.InputJsonValue,
          visualizationType: generated.visualizationType,
          visualizationData: (generated.visualizationData ?? {}) as Prisma.InputJsonValue,
        },
        update: {},
      });
    }
    const progress = await this.prisma.studentLessonProgress.upsert({
      where: { studentId_lessonId: { studentId: actor.id, lessonId: lesson.id } },
      create: { studentId: actor.id, lessonId: lesson.id, status: "IN_PROGRESS" },
      update: {},
    });
    return { ...this.serialize(lesson), progress: this.serializeProgress(progress) };
  }

  async complete(id: string, score: number | undefined, actor: AuthenticatedUser) {
    const lesson = await this.prisma.lessonContent.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException("Lesson not found");
    const progress = await this.prisma.studentLessonProgress.upsert({
      where: { studentId_lessonId: { studentId: actor.id, lessonId: id } },
      create: { studentId: actor.id, lessonId: id, status: "COMPLETED", score, completedAt: new Date() },
      update: { status: "COMPLETED", score, completedAt: new Date() },
    });
    await this.audit.record({
      action: "learning_coach.lesson_completed",
      userId: actor.id,
      schoolId: actor.schoolId,
      resource: `LessonContent:${id}`,
      metadata: { subject: lesson.subject, topic: lesson.topic, score: score ?? null },
    });
    return { lesson: this.serialize(lesson), progress: this.serializeProgress(progress) };
  }

  private async generate(subject: string, topic: string, grade: number, actor: AuthenticatedUser): Promise<LessonScript> {
    const prompt = `Create a short Socratic lesson for a Kenyan CBC Grade ${grade} learner. Subject: ${subject}. Topic: ${topic}. Return JSON only with {script:[{step,type,text,voiceoverText,visualizationState?,questionOptions?,correctAnswer?}],visualizationType,visualizationData}. Include exactly one GREETING, one ILLUSTRATION or EXPLANATION, and one multiple-choice QUESTION with three options. Be factual, age-appropriate, self-contained, and do not include personal data.`;
    try {
      const result = await this.ai.generateAssignment(prompt, { schoolId: actor.schoolId, userId: actor.id }, { maxOutputTokens: 1400, timeoutMs: 25000, maxRetries: 0 });
      const parsed = this.parse(result.content);
      if (parsed) return parsed;
    } catch {
      // A lesson must remain available when the optional provider is offline.
    }
    return this.template(subject, topic, grade);
  }

  private parse(value: unknown): LessonScript | null {
    const source = typeof value === "string" ? this.tryJson(value) : value;
    if (!source || typeof source !== "object" || !Array.isArray((source as { script?: unknown }).script)) return null;
    const raw = source as { script: unknown[]; visualizationType?: unknown; visualizationData?: unknown };
    const script = raw.script.map((item, index) => {
      const row = item as Record<string, unknown>;
      const type = String(row.type ?? "EXPLANATION").toUpperCase();
      return {
        step: Number(row.step) || index + 1,
        type: ["GREETING", "EXPLANATION", "ILLUSTRATION", "QUESTION", "FEEDBACK"].includes(type) ? type as LessonStep["type"] : "EXPLANATION",
        text: String(row.text ?? ""),
        voiceoverText: String(row.voiceoverText ?? row.voiceover_text ?? row.text ?? ""),
        visualizationState: typeof row.visualizationState === "string" ? row.visualizationState : typeof row.visualization_state === "string" ? row.visualization_state : undefined,
        questionOptions: Array.isArray(row.questionOptions ?? row.question_options) ? (row.questionOptions ?? row.question_options) as string[] : undefined,
        correctAnswer: typeof row.correctAnswer === "string" ? row.correctAnswer : typeof row.correct_answer === "string" ? row.correct_answer : undefined,
      };
    }).filter((step) => step.text.length > 0);
    if (!script.some((step) => step.type === "QUESTION" && step.questionOptions?.length && step.correctAnswer)) return null;
    const visualizationType = String(raw.visualizationType ?? "NONE").toUpperCase() as LessonScript["visualizationType"];
    return { script, visualizationType: ["PERIODIC_TABLE", "PUNNETT_SQUARE", "CHROMOSOME_3D", "TRIG_GRAPH", "CIRCUIT_BUILDER", "NONE"].includes(visualizationType) ? visualizationType : "NONE", visualizationData: (raw.visualizationData ?? {}) as Record<string, unknown> };
  }

  private tryJson(value: string): unknown { try { return JSON.parse(value); } catch { return null; } }

  private template(subject: string, topic: string, grade: number): LessonScript {
    const visualizationType = visualFor(subject, topic);
    const answer = `${topic} is a key idea in ${subject}.`;
    return {
      visualizationType,
      visualizationData: { topic },
      script: [
        { step: 1, type: "GREETING", text: `Welcome. In this Grade ${grade} ${subject} lesson, we will make sense of ${topic} one step at a time.`, voiceoverText: `Welcome. Today we will learn ${topic} through a short guided conversation.` },
        { step: 2, type: "ILLUSTRATION", text: `Study the visual and identify one detail that helps explain ${topic}. Say the idea in your own words before moving on.`, voiceoverText: `Take a moment to inspect the visual. Notice how each part connects to the main idea.` },
        { step: 3, type: "QUESTION", text: `Which statement best shows understanding of ${topic}?`, voiceoverText: `Choose the answer that explains the idea, not just a word you recognise.`, questionOptions: [answer, `${topic} is only a definition to memorise.`, `${topic} has no connection to ${subject}.`], correctAnswer: answer },
        { step: 4, type: "EXPLANATION", text: `Good work. The important next step is to use ${topic} in a question, explain your reasoning, then correct any gap.`, voiceoverText: `You have completed the guided explanation. Next, practise the topic while the idea is fresh.` },
      ],
    };
  }

  private serialize(lesson: { id: string; subject: string; topic: string; gradeLevel: number; scriptJson: Prisma.JsonValue; visualizationType: string; visualizationData: Prisma.JsonValue | null }) {
    return { id: lesson.id, subject: lesson.subject, topic: lesson.topic, gradeLevel: lesson.gradeLevel, script: lesson.scriptJson as unknown as LessonStep[], visualizationType: lesson.visualizationType, visualizationData: lesson.visualizationData };
  }
  private serializeProgress(progress: { status: string; score: number | null; completedAt: Date | null }) { return { status: progress.status, score: progress.score, completedAt: progress.completedAt }; }
  private gradeLevel(grade?: string | null) { const match = grade?.match(/(\d{1,2})/); return match ? Number(match[1]) : 7; }
  private clean(value: string) { return value.trim().replace(/\s+/g, " ").slice(0, 120); }
}
