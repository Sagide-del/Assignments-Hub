export const SBA_WEIGHTS = { grade10: 0.15, grade11: 0.15, mock: 0.7 } as const;
export const average = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export const round = (n: number | null) =>
  n === null ? null : Math.round((n + Number.EPSILON) * 100) / 100;
export function projectedScore(
  g10: number | null,
  g11: number | null,
  mock: number | null,
) {
  return g10 === null || g11 === null || mock === null
    ? null
    : round(g10 * 0.15 + g11 * 0.15 + mock * 0.7);
}
// Internal indicative bands, not an official KNEC/KCBE grading conversion.
export function predictedGrade(value: number | null) {
  if (value === null) return null;
  return value >= 80
    ? "A"
    : value >= 75
      ? "B+"
      : value >= 70
        ? "B"
        : value >= 65
          ? "C+"
          : value >= 60
            ? "C"
            : value >= 50
              ? "D"
              : "E";
}
export function mockPercentage(attempt: {
  coverage: unknown;
  score: number | null;
  source: string;
}) {
  const c = attempt.coverage as Record<string, unknown> | null;
  if (
    !c ||
    c.grade !== "Grade 12" ||
    c.assessment !== "TIMED_MOCK" ||
    c.contentKind === "STARTER" ||
    attempt.source === "PRACTICE"
  )
    return null;
  const max = c.totalMarks;
  if (
    typeof max !== "number" ||
    !Number.isFinite(max) ||
    max <= 0 ||
    attempt.score === null ||
    !Number.isFinite(attempt.score) ||
    attempt.score < 0 ||
    attempt.score > max
  )
    return null;
  return (attempt.score / max) * 100;
}
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+\-@\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
