import type { AiGenerationUsage } from "../ai/interfaces/ai-provider.interface";

export interface CmsGeneratedContent {
  theory_text: string;
  equations: string[];
  illustration_prompt: string;
  questions: {
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  }[];
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Expected an object");
  return value as Record<string, unknown>;
};
const exactKeys = (value: Record<string, unknown>, keys: string[]) => {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    throw Error("Unexpected content fields");
};
const text = (value: unknown, max: number) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Error("Missing or oversized text");
  return value.trim();
};
const normalized = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

export function validateCmsGeneratedContent(
  value: unknown,
  expectedQuestions = 30,
): CmsGeneratedContent {
  const raw =
    typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  const content = object(raw);
  exactKeys(content, [
    "theory_text",
    "equations",
    "illustration_prompt",
    "questions",
  ]);
  const theory_text = text(content.theory_text, 30000);
  if (theory_text.split(/\s+/).length !== 300)
    throw Error("Theory must contain exactly 300 words");
  if (!Array.isArray(content.equations) || content.equations.length > 30)
    throw Error("Invalid equations");
  const equations = content.equations.map((value) => text(value, 1000));
  const illustration_prompt = text(content.illustration_prompt, 3000);
  if (
    !Array.isArray(content.questions) ||
    content.questions.length !== expectedQuestions
  )
    throw Error(`Exactly ${expectedQuestions} questions are required`);
  const seen = new Set<string>();
  const questions = content.questions.map((value) => {
    const question = object(value);
    exactKeys(question, [
      "question_text",
      "options",
      "correct_answer",
      "explanation",
    ]);
    const question_text = text(question.question_text, 3000);
    if (seen.has(normalized(question_text))) throw Error("Duplicate questions");
    seen.add(normalized(question_text));
    if (!Array.isArray(question.options) || question.options.length !== 4)
      throw Error("Exactly four options are required");
    const options = question.options.map((value) => text(value, 1000));
    if (new Set(options.map(normalized)).size !== 4)
      throw Error("Options must be distinct");
    const correct_answer = text(question.correct_answer, 1000);
    if (!options.includes(correct_answer))
      throw Error("The answer must match an option verbatim");
    return {
      question_text,
      options,
      correct_answer,
      explanation: text(question.explanation, 3000),
    };
  });
  return { theory_text, equations, illustration_prompt, questions };
}

export function cmsGenerationTokens(usage: AiGenerationUsage): number {
  const valid = (value: unknown): value is number =>
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 2147483647;
  if (valid(usage?.totalTokens)) return usage.totalTokens;
  if (valid(usage?.promptTokens) && valid(usage?.completionTokens)) {
    const total = usage.promptTokens + usage.completionTokens;
    if (valid(total)) return total;
  }
  throw Error("Provider token usage is missing or invalid");
}
