import type {
  MockAnswer,
  MockAttempt,
  MockQuestion,
  MockVisual,
} from "../../../api/kjsea.api";
export function validAnswers(
  value: unknown,
  questions: MockQuestion[],
): Record<string, MockAnswer> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, MockAnswer> = {};
  for (const [id, answer] of Object.entries(value)) {
    const q = questions.find((q) => q.id === id);
    if (!q) continue;
    if (q.responseType === "STRUCTURED") {
      if (!answer || typeof answer !== "object" || Array.isArray(answer))
        continue;
      const item = answer as { responses?: unknown; working?: unknown };
      if (
        !item.responses ||
        typeof item.responses !== "object" ||
        Array.isArray(item.responses)
      )
        continue;
      const allowed = new Set(q.parts?.map((p) => p.id));
      const responses = Object.fromEntries(
        Object.entries(item.responses).filter(
          ([k, v]) =>
            allowed.has(k) && typeof v === "string" && v.length <= 5000,
        ),
      );
      const working =
        typeof item.working === "string" ? item.working.slice(0, 5000) : "";
      if (
        Object.values(responses).some((v) => String(v).trim()) ||
        working.trim()
      )
        result[id] = {
          responses: responses as Record<string, string>,
          working,
        };
    } else if (
      typeof answer === "number" &&
      Number.isInteger(answer) &&
      answer >= 0 &&
      answer < q.options.length
    )
      result[id] = answer;
  }
  return result;
}
export function mockDraftKey(userId: number, id: string) {
  return `kjsea-answer-backup-v1:${userId}:${id}`;
}
export function resultAreas(paper: MockAttempt) {
  const map = new Map<
    string,
    { area: string; correct: number; total: number }
  >();
  for (const q of paper.questions) {
    if (q.manualSelfReview) continue;
    const area = map.get(q.area) ?? { area: q.area, correct: 0, total: 0 };
    area.total += q.marks ?? 1;
    area.correct +=
      q.awardedMarks ??
      (q.correctIndex !== undefined && paper.answers[q.id] === q.correctIndex
        ? (q.marks ?? 1)
        : 0);
    map.set(q.area, area);
  }
  return [...map.values()];
}
export function visualText(v: MockVisual | undefined): string {
  if (!v) return "";
  if (v.kind === "table")
    return [
      v.caption,
      v.headings.join(" | "),
      ...v.rows.map((row) => row.join(" | ")),
    ].join("\n");
  if (v.kind === "rectangle")
    return `Rectangle: width ${v.width} cm, height ${v.height} cm.`;
  if (v.kind === "triangle")
    return `Triangle: base ${v.base} cm, perpendicular height ${v.height} cm.`;
  if (v.kind === "circle") return `Circle: radius ${v.radius} cm.`;
  if (v.kind === "angles")
    return `Adjacent angles on a straight line: ${v.known}° and x.`;
  if (v.kind === "point") return `Cartesian point P: (${v.x}, ${v.y}).`;
  return v.labels.map((label, i) => `${label}: ${v.values[i]}`).join("; ");
}
export function resultText(paper: MockAttempt) {
  return [
    `${paper.coverage?.grades?.join(", ") || "School"} ${paper.subject ?? "Mathematics"} PRACTICE REVIEW`,
    "Original Assignment Hub practice; not an official KNEC paper.",
    `Completed: ${paper.completedAt ?? ""}`,
    paper.questions.some((q) => q.manualSelfReview)
      ? `Written responses are for self-review. Automatic marks: ${paper.score ?? 0}.`
      : `Score: ${paper.score ?? 0}/${paper.totalMarks ?? paper.questions.length}`,
    ...(paper.performance
      ? [
          `Practice performance level: ${paper.performance.code} (${paper.performance.label})`,
        ]
      : []),
    "",
    ...paper.questions.flatMap((q, i) => [
      `${i + 1}. ${q.topic}: ${q.prompt}`,
      ...(q.passage ? [q.passage.title, q.passage.text] : []),
      visualText(q.visual),
      ...(q.diagramUrl
        ? [
            `Diagram: ${q.diagramAlt ?? "Question illustration"} (${q.diagramUrl})`,
          ]
        : []),
      ...(q.responseType === "STRUCTURED"
        ? (q.parts ?? []).flatMap((p) => [
            `${p.id}) ${p.prompt}`,
            `Your answer: ${typeof paper.answers[q.id] === "object" ? ((paper.answers[q.id] as Exclude<MockAnswer, number>).responses[p.id] ?? "Unanswered") : "Unanswered"}`,
            `Model answer: ${p.answer ?? "Not released"}`,
          ])
        : [
            `Your answer: ${typeof paper.answers[q.id] === "number" ? q.options[paper.answers[q.id] as number] : "Unanswered"}`,
            `Correct answer: ${q.correctIndex === undefined ? "Not released" : q.options[q.correctIndex]}`,
          ]),
      ...(typeof paper.answers[q.id] === "object"
        ? [
            `Working: ${(paper.answers[q.id] as Exclude<MockAnswer, number>).working}`,
          ]
        : []),
      q.explanation ?? "",
      "",
    ]),
  ].join("\n");
}
