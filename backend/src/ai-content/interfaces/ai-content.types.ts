import { QuestionType } from "@prisma/client";

export type AiDifficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";

export interface AiExtractedSubtopic {
  id: string;
  name: string;
  keyConcepts: string[];
  sourceContent: string;
}

export interface AiExtractedTopic {
  id: string;
  name: string;
  summary: string;
  sourceContent: string;
  subtopics: AiExtractedSubtopic[];
}

export interface AiExtractedContentDocument {
  topics: AiExtractedTopic[];
}

export interface AiGeneratedQuestion {
  questionText: string;
  questionType:
    "MULTIPLE_CHOICE" | "TRUE_FALSE" | "NUMERIC" | "SHORT_ANSWER" | "ESSAY";
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: Exclude<AiDifficulty, "MIXED">;
  hint?: string;
  contentHtml?: string;
}

export interface AiAssignmentArtifactContent {
  title: string;
  description?: string;
  subject: string;
  grade: string;
  topicName: string;
  difficulty: AiDifficulty;
  questions: AiGeneratedQuestion[];
}

export const AI_GENERATABLE_QUESTION_TYPES = new Set<QuestionType>([
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.NUMERIC,
  QuestionType.SHORT_ANSWER,
  QuestionType.ESSAY,
]);
