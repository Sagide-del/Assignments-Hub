import type {
  MockAttempt,
  MockQuestion,
  MockVisual,
} from '../../../api/kjsea.api';
export function validAnswers(
  value: unknown,
  questions: MockQuestion[],
): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const ids = new Set(questions.map((q) => q.id));
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, n]) =>
        ids.has(key) &&
        typeof n === 'number' &&
        Number.isInteger(n) &&
        n >= 0 &&
        n < 4,
    ),
  );
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
    const area = map.get(q.area) ?? { area: q.area, correct: 0, total: 0 };
    area.total++;
    if (q.correctIndex !== undefined && paper.answers[q.id] === q.correctIndex)
      area.correct++;
    map.set(q.area, area);
  }
  return [...map.values()];
}
export function visualText(v: MockVisual | undefined): string {
  if (!v) return '';
  if (v.kind === 'table')
    return [
      v.caption,
      v.headings.join(' | '),
      ...v.rows.map((row) => row.join(' | ')),
    ].join('\n');
  if (v.kind === 'rectangle')
    return `Rectangle: width ${v.width} cm, height ${v.height} cm.`;
  if (v.kind === 'triangle')
    return `Triangle: base ${v.base} cm, perpendicular height ${v.height} cm.`;
  if (v.kind === 'circle') return `Circle: radius ${v.radius} cm.`;
  if (v.kind === 'angles')
    return `Adjacent angles on a straight line: ${v.known}° and x.`;
  if (v.kind === 'point') return `Cartesian point P: (${v.x}, ${v.y}).`;
  return v.labels.map((label, i) => `${label}: ${v.values[i]}`).join('; ');
}
export function resultText(paper: MockAttempt) {
  return [
    `${paper.coverage?.grades?.join(', ') || 'School'} ${paper.subject ?? 'Mathematics'} PRACTICE REVIEW`,
    'Original Assignment Hub practice; not an official KNEC paper.',
    `Completed: ${paper.completedAt ?? ''}`,
    `Score: ${paper.score ?? 0}/${paper.questions.length}`,
    '',
    ...paper.questions.flatMap((q, i) => [
      `${i + 1}. ${q.topic}: ${q.prompt}`,
      visualText(q.visual),
      ...(q.diagramUrl
        ? [
            `Diagram: ${q.diagramAlt ?? 'Question illustration'} (${q.diagramUrl})`,
          ]
        : []),
      `Your answer: ${paper.answers[q.id] === undefined ? 'Unanswered' : q.options[paper.answers[q.id]]}`,
      `Correct answer: ${q.correctIndex === undefined ? 'Not released' : q.options[q.correctIndex]}`,
      q.explanation ?? '',
      '',
    ]),
  ].join('\n');
}
