export interface CmsQuestionPreview {
  prompt: string;
  answer: string;
  options: string[];
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) =>
  typeof value === "string"
    ? value.trim()
    : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
function bodyText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.map(bodyText).filter(Boolean).join("\n\n");
  const item = record(value);
  return [
    text(item.heading ?? item.title),
    text(item.text ?? item.body ?? item.content ?? item.description),
  ]
    .filter(Boolean)
    .join("\n");
}
export function parseCmsContent(value: unknown) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return {
        valid: false,
        theory: "",
        assets: [] as string[],
        questions: [] as CmsQuestionPreview[],
      };
    }
  }
  const content = record(parsed);
  const rawAssets =
    content.assets ?? content.asset_urls ?? content.asset_url ?? [];
  const assets = [
    ...new Set(
      (Array.isArray(rawAssets) ? rawAssets : [rawAssets])
        .map((item) =>
          typeof item === "string"
            ? item.trim()
            : text(record(item).url ?? record(item).asset_url),
        )
        .filter(Boolean),
    ),
  ];
  const questions: CmsQuestionPreview[] = (
    Array.isArray(content.questions) ? content.questions : []
  ).map((value) => {
    const q = record(value);
    const options = Array.isArray(q.options)
      ? q.options
          .map((item) =>
            typeof item === "string"
              ? item
              : text(record(item).text ?? record(item).label),
          )
          .filter(Boolean)
      : [];
    const explicit = q.correctAnswer ?? q.correct_answer ?? q.answer;
    const answer =
      text(explicit) ||
      (typeof q.correctIndex === "number" && Number.isInteger(q.correctIndex)
        ? (options[q.correctIndex] ?? "")
        : "");
    return {
      prompt:
        text(
          q.question_text ?? q.question ?? q.questionText ?? q.prompt ?? q.text,
        ) || "No question text supplied",
      answer: answer || "No answer supplied",
      options,
    };
  });
  return {
    valid:
      parsed !== null && typeof parsed === "object" && !Array.isArray(parsed),
    theory: bodyText(content.theory_text ?? content.theory),
    assets,
    questions,
  };
}

/** Learner-safe view: never render migration placeholders or assume 30 questions. */
export function cmsLearningContent(value: unknown) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
  }
  const content = record(parsed);
  const theory = bodyText(content.theory_text ?? content.theory).trim();
  const questions = Array.isArray(content.questions) ? content.questions : [];
  const count =
    typeof content.question_count === "number"
      ? content.question_count
      : questions.length;
  const expectedCount = [5, 10, 30].includes(
    Number(content.expected_question_count),
  )
    ? Number(content.expected_question_count)
    : 30;
  const assessmentLabel =
    content.assessment_type === "FORMATIVE"
      ? "Formative Practice"
      : content.assessment_type === "CAT"
        ? "CAT Practice"
        : "Practice Set";
  return {
    theory: theory === "Legacy content migrated from old system." ? "" : theory,
    equations: Array.isArray(content.equations)
      ? content.equations.filter(
          (item): item is string => typeof item === "string" && !!item.trim(),
        )
      : [],
    expectedCount,
    offlineActivity: text(content.offline_activity),
    diagramDescription: text(content.diagram_description),
    partial: count > 0 && count < expectedCount,
    label:
      count > 0 && count < expectedCount
        ? "Practice Set (Partial)"
        : assessmentLabel,
  };
}
