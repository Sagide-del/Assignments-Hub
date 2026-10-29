// Structured visuals only: no model-authored SVG, HTML, URLs or executable markup.
const esc = (s: unknown) =>
  String(s ?? "")
    .slice(0, 160)
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
export function renderQuestionVisual(v: any): string | undefined {
  if (!v || typeof v !== "object") return;
  if (
    v.kind === "table" &&
    Array.isArray(v.headings) &&
    v.headings.length > 0 &&
    v.headings.length <= 6 &&
    Array.isArray(v.rows) &&
    v.rows.length <= 12 &&
    v.rows.every((r: any) => Array.isArray(r) && r.length === v.headings.length)
  )
    return `<table><caption>${esc(v.caption)}</caption><thead><tr>${v.headings.map((h: any) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${v.rows.map((r: any) => `<tr>${r.map((c: any) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  let body = "";
  const label = (x: number, y: number, t: unknown) =>
    `<text x="${x}" y="${y}" font-size="16" text-anchor="middle" fill="#24364b">${esc(t)}</text>`;
  if (
    v.kind === "bars" &&
    Array.isArray(v.values) &&
    v.values.length >= 2 &&
    v.values.length <= 8 &&
    v.values.every((n: any) => Number.isFinite(n) && n >= 0 && n <= 1e9) &&
    Array.isArray(v.labels) &&
    v.labels.length === v.values.length
  ) {
    const max = Math.max(...v.values, 1),
      w = 400 / v.values.length;
    body = '<path d="M50 30V220H470" stroke="#64748b" fill="none"/>';
    v.values.forEach((n: number, i: number) => {
      const x = 60 + i * w,
        h = (n / max) * 150;
      body +=
        `<rect x="${x}" y="${220 - h}" width="${w * 0.65}" height="${h}" fill="#3977b8"/>` +
        label(x + w * 0.325, 245, v.labels[i]) +
        label(x + w * 0.325, 210 - h, n);
    });
  } else if (
    v.kind === "triangle" &&
    Number.isFinite(v.base) &&
    v.base > 0 &&
    Number.isFinite(v.height) &&
    v.height > 0
  ) {
    body =
      '<path d="M100 215L400 215L100 50Z" fill="#e9f1fa" stroke="#396a9a" stroke-width="3"/>' +
      label(250, 245, `Base: ${v.base} ${v.unit ?? ""}`) +
      label(70, 130, `${v.height}`);
  } else if (
    v.kind === "cycle" &&
    Array.isArray(v.labels) &&
    v.labels.length >= 2 &&
    v.labels.length <= 5
  ) {
    const points = v.labels.map((_: any, i: number) => ({
      x: 260 + 150 * Math.cos((i * 2 * Math.PI) / v.labels.length),
      y: 145 + 85 * Math.sin((i * 2 * Math.PI) / v.labels.length),
    }));
    body = points
      .map((p: any, i: number) => {
        const n = points[(i + 1) % points.length];
        return (
          `<path d="M${p.x} ${p.y}L${n.x} ${n.y}" stroke="#64748b" marker-end="url(#arrow)"/><rect x="${p.x - 65}" y="${p.y - 17}" width="130" height="34" rx="8" fill="#e7eff8"/>` +
          label(p.x, p.y + 5, v.labels[i])
        );
      })
      .join("");
  } else return;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 280" role="img" aria-label="${esc(v.caption || "Question diagram")}"><title>${esc(v.caption || "Question diagram")}</title><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#64748b"/></marker></defs>${body}${label(260, 275, v.caption || "")}</svg>`;
}
export interface RecallContent {
  version: 1;
  cue: string;
  mnemonic: string;
  explanation: string;
  facts: { label: string; meaning: string }[];
  checks: { question: string; answer: string }[];
  sourceIds: number[];
}
export function validateRecall(v: any, sourceIds: number[]): RecallContent {
  const str = (s: any, min: number, max: number) =>
    typeof s === "string" && s.trim().length >= min && s.length <= max;
  if (
    !v ||
    !str(v.cue, 5, 300) ||
    !str(v.mnemonic, 3, 500) ||
    !str(v.explanation, 20, 1600) ||
    !Array.isArray(v.facts) ||
    v.facts.length < 2 ||
    v.facts.length > 8 ||
    !v.facts.every(
      (f: any) => str(f.label, 1, 100) && str(f.meaning, 2, 400),
    ) ||
    !Array.isArray(v.checks) ||
    v.checks.length < 2 ||
    v.checks.length > 5 ||
    !v.checks.every(
      (c: any) => str(c.question, 5, 300) && str(c.answer, 2, 500),
    )
  )
    throw new Error("Generated card is incomplete. Retry generation.");
  return {
    version: 1,
    cue: v.cue.trim(),
    mnemonic: v.mnemonic.trim(),
    explanation: v.explanation.trim(),
    facts: v.facts.map((f: any) => ({ label: f.label, meaning: f.meaning })),
    checks: v.checks.map((c: any) => ({
      question: c.question,
      answer: c.answer,
    })),
    sourceIds,
  };
}
export function rankPractice<T extends { id: number; topic: string }>(
  pool: T[],
  own: { questions: any; completedAt?: Date | null }[],
  active: { questions: any }[],
  seed: number,
): T[] {
  const history = new Map<number, { count: number; time: number }>(),
    busy = new Map<number, number>();
  for (const a of own)
    for (const q of Array.isArray(a.questions) ? a.questions : []) {
      const id = q.sourceQuestionId;
      if (Number.isInteger(id)) {
        const old = history.get(id);
        history.set(id, {
          count: (old?.count ?? 0) + 1,
          time: Math.max(
            old?.time ?? 0,
            a.completedAt ? new Date(a.completedAt).getTime() : 0,
          ),
        });
      }
    }
  for (const a of active)
    for (const q of Array.isArray(a.questions) ? a.questions : [])
      if (Number.isInteger(q.sourceQuestionId))
        busy.set(q.sourceQuestionId, (busy.get(q.sourceQuestionId) ?? 0) + 1);
  const tie = (id: number) => {
    let x = (id ^ seed) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return (x ^ (x >>> 16)) >>> 0;
  };
  return [...pool]
    .sort(
      (a, b) =>
        Number(history.has(a.id)) - Number(history.has(b.id)) ||
        (busy.get(a.id) ?? 0) - (busy.get(b.id) ?? 0) ||
        (history.get(a.id)?.count ?? 0) - (history.get(b.id)?.count ?? 0) ||
        (history.get(a.id)?.time ?? 0) - (history.get(b.id)?.time ?? 0) ||
        tie(a.id) - tie(b.id),
    )
    .slice(0, 30);
}
