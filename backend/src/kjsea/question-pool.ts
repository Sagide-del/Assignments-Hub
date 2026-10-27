import { seededRandom, shuffle, type MockQuestion } from './mathematics';
export interface BankItem {
  id: number;
  subject: string;
  grade: string;
  topic: string;
  questionType: string;
  questionText: string;
  contentHtml: string | null;
  options: unknown;
  correctAnswer: string | null;
  explanation: string | null;
  diagramUrl: string | null;
  diagramAlt: string | null;
}
export function approvedChoices(items: BankItem[]) {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    if (
      item.questionType !== 'MULTIPLE_CHOICE' ||
      !Array.isArray(item.options) ||
      item.options.length !== 4 ||
      !item.options.every((o) => typeof o === 'string' && o.trim()) ||
      !item.correctAnswer?.trim() ||
      !item.explanation?.trim()
    )
      return [];
    const options = item.options as string[];
    const matches = options.flatMap((o, i) =>
      o.trim().toLowerCase() === item.correctAnswer!.trim().toLowerCase()
        ? [i]
        : [],
    );
    if (
      matches.length !== 1 ||
      new Set(options.map((o) => o.trim().toLowerCase())).size !== 4
    )
      return [];
    const signature = `${item.subject.trim().toLowerCase()}:${item.questionText.trim().toLowerCase()}:${item.contentHtml ?? ''}:${JSON.stringify(options)}`;
    if (seen.has(signature)) return [];
    seen.add(signature);
    return [{ ...item, options, correctIndex: matches[0] }];
  });
}
export function bankPaper(
  items: ReturnType<typeof approvedChoices>,
  seed: number,
  usedIds: Set<number>,
): MockQuestion[] {
  const r = seededRandom(seed);
  const groups = new Map<string, typeof items>();
  for (const item of shuffle(items, r))
    groups.set(item.topic, [...(groups.get(item.topic) ?? []), item]);
  const buckets = shuffle([...groups.values()], r).map((group) =>
    group.sort((a, b) => Number(usedIds.has(a.id)) - Number(usedIds.has(b.id))),
  );
  const selected: typeof items = [];
  while (selected.length < Math.min(40, items.length)) {
    for (const bucket of buckets) {
      const item = bucket.shift();
      if (item) selected.push(item);
      if (selected.length === 40) break;
    }
  }

  return selected.map((item, i) => {
    const original = shuffle(
      item.options.map((text, index) => ({ text, index })),
      r,
    );
    return {
      id: `q-${i + 1}`,
      topicId: `bank-topic:${item.topic}`,
      topic: item.topic || 'Subject practice',
      area: item.topic || 'Subject practice',
      prompt: item.questionText,
      options: original.map((o) => o.text),
      correctIndex: original.findIndex((o) => o.index === item.correctIndex),
      explanation: item.explanation!,
      sourceQuestionId: item.id,
      sourceGrade: item.grade,
      ...(item.contentHtml ? { contentHtml: item.contentHtml } : {}),
      ...(item.diagramUrl
        ? {
            diagramUrl: item.diagramUrl,
            diagramAlt: item.diagramAlt ?? 'Question illustration',
          }
        : {}),
    };
  });
}
