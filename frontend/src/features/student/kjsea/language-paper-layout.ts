import type { MockQuestion } from "../../../api/kjsea.api";

export interface LanguagePage {
  first: number;
  last: number;
  questions: MockQuestion[];
}
/** Keep a shared stimulus together, preserving the saved paper's question order. */
export function languagePages(questions: MockQuestion[]): LanguagePage[] {
  const pages: LanguagePage[] = [];
  let lastKey = "";
  questions.forEach((q, index) => {
    const key = JSON.stringify([
      q.section ?? q.area,
      q.passage?.text ?? q.contentHtml ?? "",
    ]);
    if (!pages.length || key !== lastKey)
      pages.push({ first: index, last: index, questions: [q] });
    else {
      pages[pages.length - 1].questions.push(q);
      pages[pages.length - 1].last = index;
    }
    lastKey = key;
  });
  return pages;
}
export function gapLabels(page: LanguagePage): Map<number, number> {
  const text = page.questions[0]?.passage?.text ?? "";
  const numbers = [
    ...new Set(
      [...text.matchAll(/\((\d+)\)\s*_{2,}/g)].map((m) => Number(m[1])),
    ),
  ];
  return new Map(numbers.map((local, i) => [local, page.first + i + 1]));
}
export function paperDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60),
    remaining = minutes % 60;
  return `${hours ? `${hours} hr${hours > 1 ? "s" : ""}` : ""}${hours && remaining ? " " : ""}${remaining ? `${remaining} min` : ""}`;
}
