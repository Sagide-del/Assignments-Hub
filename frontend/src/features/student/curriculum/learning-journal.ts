import type { LearningArea, LearningDesign } from './framework';
export const JOURNAL_PREFIX = 'assignmenthub-learning-review-v1:';
export const REVIEW_STATES = [
  'NOT_YET',
  'PRACTISING',
  'READY_TO_DISCUSS',
] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];
export const REVIEW_LABELS: Record<ReviewState, string> = {
  NOT_YET: 'I need help',
  PRACTISING: 'I am practising',
  READY_TO_DISCUSS: 'Ready to discuss my evidence',
};
export interface LearningReview {
  version: 1;
  activityId: string;
  title: string;
  href: string;
  area: LearningArea;
  statements: string[];
  outcomeIds: string[];
  evidence: string;
  nextStep: string;
  reviews: Record<string, ReviewState>;
  updatedAt: string;
}
export function reviewKey(userId: number, activityId: string) {
  return `${JOURNAL_PREFIX}${userId}:${activityId}`;
}
export function validReview(value: unknown): value is LearningReview {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<LearningReview>;
  return (
    v.version === 1 &&
    typeof v.activityId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.href === 'string' &&
    /^\/student\/(assignments|stem-labs|learn-skills)\/\d+(?:\/workspace)?(?:\?lesson=[a-zA-Z0-9%_-]+)?$/.test(
      v.href,
    ) &&
    ['assignments', 'stem', 'skills'].includes(v.area ?? '') &&
    Array.isArray(v.statements) &&
    v.statements.every((s) => typeof s === 'string') &&
    Array.isArray(v.outcomeIds) &&
    v.outcomeIds.length === v.statements.length &&
    v.outcomeIds.every((s) => typeof s === 'string') &&
    typeof v.evidence === 'string' &&
    typeof v.nextStep === 'string' &&
    !!v.reviews &&
    typeof v.reviews === 'object' &&
    Object.values(v.reviews).every((s) => REVIEW_STATES.includes(s)) &&
    typeof v.updatedAt === 'string' &&
    Number.isFinite(Date.parse(v.updatedAt))
  );
}
export function reviewRecord(
  design: LearningDesign,
  evidence: string,
  nextStep: string,
  reviews: Record<string, ReviewState>,
): LearningReview {
  return {
    version: 1,
    activityId: design.id,
    title: design.title,
    href: design.href,
    area: design.area,
    statements: design.outcomes.map((o) => o.statement),
    outcomeIds: design.outcomes.map((o) => o.id),
    evidence,
    nextStep,
    reviews,
    updatedAt: new Date().toISOString(),
  };
}
export function reviewText(records: LearningReview[]) {
  return [
    'MY LEARNING EVIDENCE',
    'Assignment Hub self-review — not a teacher assessment or KICD certification.',
    'Source approach: KICD Basic Education Curriculum Framework (2017), pp. 21, 113–121.',
    '',
    ...records.flatMap((r) => [
      r.title,
      `Activity: ${r.href}`,
      `Saved: ${r.updatedAt}`,
      'Learning outcomes:',
      ...r.statements.map((s) => `- ${s}`),
      'My evidence:',
      r.evidence,
      'My self-review:',
      ...r.statements.map(
        (statement, i) =>
          `- ${statement}: ${r.reviews[r.outcomeIds[i]] ? REVIEW_LABELS[r.reviews[r.outcomeIds[i]]] : 'Not reviewed yet'}`,
      ),
      'My next step:',
      r.nextStep,
      '',
    ]),
  ].join('\n');
}
export function readReviews(
  storage: Pick<Storage, 'length' | 'key' | 'getItem'>,
  userId: number,
): LearningReview[] {
  const prefix = `${JOURNAL_PREFIX}${userId}:`;
  const result: LearningReview[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const value: unknown = JSON.parse(storage.getItem(key) ?? 'null');
      if (validReview(value) && reviewKey(userId, value.activityId) === key)
        result.push(value);
    } catch {
      /* Ignore malformed individual records. */
    }
  }
  return result.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}
