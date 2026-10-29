import { BankItem, bankPaper, approvedChoices } from "./question-pool";
import { practicePaper } from "../question-bank/practice-questions";
import { MockQuestion, shuffle, seededRandom } from "./mathematics";
export type WrittenBankItem = BankItem & { config?: any; points?: number };
export function reviewedMathReady(
  choices: BankItem[],
  written: WrittenBankItem[],
) {
  return (
    choices.length >= 20 &&
    written.length >= 20 &&
    new Set([...choices, ...written].map((q) => q.topic.trim().toLowerCase()))
      .size >= 3
  );
}
export function reviewedMathExam(
  choices: ReturnType<typeof approvedChoices>,
  written: WrittenBankItem[],
  seed: number,
  used: Set<number>,
): MockQuestion[] {
  const r = seededRandom(seed),
    pick = <T extends { id: number }>(rows: T[]) =>
      shuffle(rows, r)
        .sort((a, b) => Number(used.has(a.id)) - Number(used.has(b.id)))
        .slice(0, 20);
  const a = bankPaper(pick(choices), seed, used).map((q) => ({
    ...q,
    section: "Section A · Multiple choice",
    marks: 1,
    responseType: "CHOICE" as const,
  }));
  const b = practicePaper(pick(written), seed + 1).map((q) => ({
    ...q,
    section: "Section B · Structured questions",
    marks: 4,
    parts: q.parts?.map((p) => ({ ...p, marks: 4 })),
  }));
  return [...a, ...b].map((q, i) => ({ ...q, id: `q-${i + 1}` }));
}
const languageParts = [
  ["Dialogue", 5],
  ["Cloze", 5],
  ["Comprehension", 10],
  ["Language use", 10],
  ["Poetry", 5],
  ["Informational reading", 5],
] as const;
function languageSection(q: BankItem) {
  const topic = q.topic.toLowerCase();
  if (/dialog|conversation|mazungumzo/.test(topic)) return "Dialogue";
  if (/cloze|gap|mapengo/.test(topic)) return "Cloze";
  if (/poe[mtry]|ushairi|shairi/.test(topic)) return "Poetry";
  if (/notice|informational|functional reading|taarifa/.test(topic))
    return "Informational reading";
  if (/comprehension|reading|ufahamu/.test(topic)) return "Comprehension";
  return "Language use";
}
export function reviewedLanguageReady(items: BankItem[]) {
  return languageParts.every(
    ([section, count]) =>
      items.filter(
        (q) =>
          languageSection(q) === section &&
          (section === "Language use" || !!q.contentHtml?.trim()),
      ).length >= count,
  );
}
export function reviewedLanguageExam(
  items: ReturnType<typeof approvedChoices>,
  seed: number,
  used: Set<number>,
): MockQuestion[] {
  const r = seededRandom(seed),
    result: MockQuestion[] = [];
  for (const [section, count] of languageParts) {
    const chosen = shuffle(
      items.filter(
        (q) =>
          languageSection(q) === section &&
          (section === "Language use" || !!q.contentHtml?.trim()),
      ),
      r,
    )
      .sort((a, b) => Number(used.has(a.id)) - Number(used.has(b.id)))
      .slice(0, count);
    const groups = new Map<string, typeof chosen>();
    for (const q of chosen) {
      const key = q.contentHtml ?? "";
      groups.set(key, [...(groups.get(key) ?? []), q]);
    }
    for (const group of groups.values())
      for (const item of group) {
        const q = bankPaper([item], seed + result.length, used)[0];
        result.push({
          ...q,
          id: `q-${result.length + 1}`,
          section,
          marks: 1,
          responseType: "CHOICE",
        });
      }
  }
  return result;
}
