import type { MasterModule } from "./cmsApi";
export function cmsFolders(modules: MasterModule[]) {
  const grades = new Map<number, Map<string, Map<string, MasterModule[]>>>();
  for (const m of modules) {
    if (!grades.has(m.grade)) grades.set(m.grade, new Map());
    const subjects = grades.get(m.grade)!;
    if (!subjects.has(m.subject)) subjects.set(m.subject, new Map());
    const topics = subjects.get(m.subject)!;
    if (!topics.has(m.topic)) topics.set(m.topic, []);
    topics.get(m.topic)!.push(m);
  }
  return [...grades]
    .sort(([a], [b]) => a - b)
    .map(([grade, subjects]) => ({
      grade,
      subjects: [...subjects]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subject, topics]) => ({
          subject,
          topics: [...topics]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([topic, batches]) => ({
              topic,
              batches: batches.sort(
                (a, b) =>
                  (a.batch_number ?? 1) - (b.batch_number ?? 1) ||
                  a.created_at.localeCompare(b.created_at),
              ),
            })),
        })),
    }));
}

export function cmsQuestionCount(module: MasterModule): number {
  if (
    typeof module.question_count === "number" &&
    Number.isInteger(module.question_count) &&
    module.question_count >= 0
  )
    return module.question_count;
  const questions = (module.content_json as { questions?: unknown })?.questions;
  return Array.isArray(questions) ? questions.length : 0;
}
