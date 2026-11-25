// Server-owned quiz evidence survives timetable refreshes and repeat quizzes.
// Legacy JSON is accepted; stable keys prevent preserved results counting twice.
export interface RecallRecord {
  id: string;
  subject: string;
  topic: string;
  score: number;
  total: number;
  completed_at: string;
}
export function recallRecords(plan: unknown): RecallRecord[] {
  const p = plan as any,
    records = new Map<string, RecallRecord>();
  const add = (r: any) => {
    if (
      r &&
      typeof r.id === "string" &&
      typeof r.subject === "string" &&
      typeof r.topic === "string" &&
      Number.isFinite(r.score) &&
      Number.isInteger(r.total) &&
      r.total > 0 &&
      r.score >= 0 &&
      r.score <= r.total &&
      typeof r.completed_at === "string" &&
      Number.isFinite(Date.parse(r.completed_at))
    )
      records.set(r.id, r);
  };
  for (const r of Array.isArray(p?.recall_history) ? p.recall_history : [])
    add(r);
  const blocks = Array.isArray(p?.days)
    ? p.days.flatMap((d: any) => (Array.isArray(d?.blocks) ? d.blocks : []))
    : [];
  for (const [id, r] of Object.entries(p?.quiz_results ?? {}) as [
    string,
    any,
  ][]) {
    const b = blocks.find((b: any) => b.id === id);
    if (b && r)
      add({
        id: r.event_id ?? `${id}:${r.completed_at}`,
        subject: b.subject,
        topic: b.topic,
        score: r.score,
        total: r.total,
        completed_at: r.completed_at,
      });
  }
  return [...records.values()].sort((a, b) =>
    a.completed_at.localeCompare(b.completed_at),
  );
}
