import { BadRequestException } from "@nestjs/common";
import { subjectKey } from "../student/student-scope.policy";
export type Band = { min: number; code: string; label: string };
export const PRESET_BANDS: Band[] = [
  { min: 90, code: "EE1", label: "Exceeding expectations" },
  { min: 75, code: "EE2", label: "Exceeding expectations" },
  { min: 58, code: "ME1", label: "Meeting expectations" },
  { min: 41, code: "ME2", label: "Meeting expectations" },
  { min: 31, code: "AE1", label: "Approaching expectations" },
  { min: 21, code: "AE2", label: "Approaching expectations" },
  { min: 11, code: "BE1", label: "Below expectations" },
  { min: 0, code: "BE2", label: "Below expectations" },
];
export function bands(input: unknown): Band[] {
  if (!Array.isArray(input) || !input.length || input.length > 12)
    throw new BadRequestException("Choose 1–12 grading bands.");
  const rows = input
    .map((r: any) => ({
      min: r.min,
      code: String(r.code ?? "").trim(),
      label: String(r.label ?? "").trim(),
    }))
    .sort((a, b) => b.min - a.min);
  if (
    rows.some(
      (r) =>
        !Number.isFinite(r.min) ||
        r.min < 0 ||
        r.min > 100 ||
        !r.code ||
        r.code.length > 12 ||
        !r.label ||
        r.label.length > 60,
    ) ||
    new Set(rows.map((r) => r.min)).size !== rows.length ||
    new Set(rows.map((r) => r.code)).size !== rows.length ||
    rows.at(-1)?.min !== 0
  )
    throw new BadRequestException(
      "Bands need distinct thresholds/codes and must cover 0–100, starting at 0.",
    );
  return rows;
}
export const round = (v: number) => Math.round(v * 100) / 100;
export function grade(score: number, policy: Band[]) {
  return policy.find((b) => round(score) >= b.min)?.code ?? "—";
}
export function subjectResult(
  subject: string,
  assessments: any[],
  records: any[],
  policy: Band[],
) {
  const scheme = assessments.filter(
    (a) => subjectKey(a.subject) === subjectKey(subject),
  );
  const entries = scheme.map((a) => ({
    assessment: a.assessment_name,
    max_score: a.max_score,
    weight: a.weight,
    score: records.find((r) => r.assessment_id === a.id)?.score ?? null,
  }));
  const complete = entries.length > 0 && entries.every((r) => r.score !== null);
  const score = complete
    ? round(
        entries.reduce(
          (sum, r) => sum + (r.score / r.max_score) * 100 * r.weight,
          0,
        ) / entries.reduce((sum, r) => sum + r.weight, 0),
      )
    : null;
  const remarks = records
    .filter((r) => scheme.some((a) => a.id === r.assessment_id))
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? 0).getTime() -
        new Date(a.updated_at ?? 0).getTime(),
    )
    .map((r) => r.remark)
    .filter(Boolean);
  return {
    subject,
    score,
    grade: score === null ? "—" : grade(score, policy),
    complete,
    remark: remarks[0] ?? "",
    assessments: entries,
  };
}

/**
 * A consistent first-pass report comment for completed subjects. Teachers can
 * always replace it in the gradebook; this prevents a formal report from
 * showing an empty remark when marks have already been approved.
 */
export function reportRemark(result: {
  score: number | null;
  complete: boolean;
  remark?: string | null;
}) {
  if (result.remark?.trim()) return result.remark.trim();
  if (!result.complete || result.score === null)
    return "Assessment evidence is pending.";
  if (result.score >= 90)
    return "Excellent mastery. Maintain the same focused and independent practice.";
  if (result.score >= 75)
    return "Strong progress. Continue applying concepts accurately and consistently.";
  if (result.score >= 58)
    return "Secure progress. Review missed ideas and practise them each week.";
  if (result.score >= 41)
    return "Developing steadily. Use short guided practice sessions and ask for support early.";
  return "Needs focused support. Rebuild the foundations through regular guided practice.";
}
export function rankComparable(
  rows: { subjects: any[]; average: number | null }[],
) {
  if (rows.some((r) => r.average === null))
    throw new BadRequestException(
      "Ranking requires complete marks for every learner.",
    );
  const fingerprints = new Set(
    rows.map((r) =>
      r.subjects
        .map((s) => subjectKey(s.subject))
        .sort()
        .join("|"),
    ),
  );
  if (fingerprints.size > 1)
    throw new BadRequestException(
      "Ranking is unavailable across different enrolled subject sets.",
    );
  return rows.map(
    (r) => 1 + rows.filter((other) => other.average! > r.average!).length,
  );
}
