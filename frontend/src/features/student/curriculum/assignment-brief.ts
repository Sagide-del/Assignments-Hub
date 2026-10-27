export const BRIEF_MARKER = 'LEARNING BRIEF (teacher-authored)';
export interface AssignmentBrief {
  outcome: string;
  evidence: string;
  criteria: string[];
  connection: string;
  support: string;
  feedback: string;
}
export function formatAssignmentBrief(brief: AssignmentBrief) {
  return [
    BRIEF_MARKER,
    `Learning outcome: ${brief.outcome.trim()}`,
    `Evidence: ${brief.evidence.trim()}`,
    'Success criteria:',
    ...brief.criteria
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `- ${s}`),
    `Real-life connection: ${brief.connection.trim()}`,
    `Support: ${brief.support.trim()}`,
    `Feedback and next step: ${brief.feedback.trim()}`,
  ].join('\n');
}
export function readAssignmentBrief(
  description?: string | null,
): AssignmentBrief | null {
  if (!description?.includes(BRIEF_MARKER)) return null;
  const normalized = description.replace(/\r\n?/g, '\n');
  const text = normalized.slice(
    normalized.indexOf(BRIEF_MARKER) + BRIEF_MARKER.length,
  );
  const line = (label: string) =>
    text
      .split('\n')
      .find((s) => s.startsWith(label))
      ?.slice(label.length)
      .trim() ?? '';
  const criteria =
    text
      .split('Success criteria:\n')[1]
      ?.split('\nReal-life connection:')[0]
      .split('\n')
      .filter((s) => s.startsWith('- '))
      .map((s) => s.slice(2).trim())
      .filter(Boolean) ?? [];
  const brief = {
    outcome: line('Learning outcome:'),
    evidence: line('Evidence:'),
    criteria,
    connection: line('Real-life connection:'),
    support: line('Support:'),
    feedback: line('Feedback and next step:'),
  };
  return brief.outcome && brief.evidence && brief.criteria.length
    ? brief
    : null;
}
