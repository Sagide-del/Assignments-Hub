import type { Assignment, Submission } from '../../types';

export type AssignmentState = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'RESULTS_AVAILABLE';
export type AssignmentSort = 'priority' | 'deadline' | 'newest';

export const STATE_META: Record<AssignmentState, { label: string; action: string; className: string }> = {
  NOT_STARTED: { label: 'Not started', action: 'Start', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  IN_PROGRESS: { label: 'In progress', action: 'Continue', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  SUBMITTED: { label: 'Submitted', action: 'View submission', className: 'border-sky-200 bg-sky-50 text-sky-800' },
  RESULTS_AVAILABLE: { label: 'Results available', action: 'Review answers', className: 'border-lime-300 bg-lime-50 text-[#466000]' },
};

export function assignmentState(submission?: Submission): AssignmentState {
  if (!submission) return 'NOT_STARTED';
  if (submission.status === 'DRAFT') return 'IN_PROGRESS';
  // A graded submission is not visible as results until the backend releases it.
  return submission.resultsReleasedAt ? 'RESULTS_AVAILABLE' : 'SUBMITTED';
}

export function assignmentSubject(assignment: Assignment): string {
  return assignment.subject.trim() || 'General';
}

function timestamp(value?: string | null): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Infinity;
}

function schoolDay(value: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part('year'), part('month') - 1, part('day')) / 86_400_000;
}

export function assignmentDeadline(value?: string | null, now = new Date()) {
  if (!value) return { label: 'No deadline', detail: 'This assignment has no deadline.', isPast: false, isSoon: false };
  const time = timestamp(value);
  if (!Number.isFinite(time)) return { label: 'Deadline unavailable', detail: 'The deadline could not be read.', isPast: false, isSoon: false };
  const due = new Date(time);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric',
  }).format(due);
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(due);
  const days = schoolDay(due) - schoolDay(now);
  const isPast = time < now.getTime();
  const label = isPast ? `Deadline passed · ${date}` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due ${date}`;
  return { label, detail: `Due ${date} at ${clock} EAT (Kenya time)`, isPast, isSoon: !isPast && days <= 1 };
}

export function selectAssignments(
  assignments: Assignment[],
  submissions: Map<number, Submission>,
  filters: { subject: string; state: AssignmentState | 'ALL'; search: string; sort: AssignmentSort },
): Assignment[] {
  const search = filters.search.trim().toLocaleLowerCase('en-KE');
  return assignments.filter((assignment) => assignment.isPublished
    && (!filters.subject || assignmentSubject(assignment) === filters.subject)
    && (filters.state === 'ALL' || assignmentState(submissions.get(assignment.id)) === filters.state)
    && (!search || `${assignment.title} ${assignmentSubject(assignment)}`.toLocaleLowerCase('en-KE').includes(search)))
    .sort((a, b) => {
      const stateA = assignmentState(submissions.get(a.id));
      const stateB = assignmentState(submissions.get(b.id));
      const unfinished = (state: AssignmentState) => state === 'NOT_STARTED' || state === 'IN_PROGRESS';
      const newest = () => (timestamp(b.createdAt) === timestamp(a.createdAt) ? a.id - b.id : timestamp(b.createdAt) - timestamp(a.createdAt));
      const deadline = () => timestamp(a.dueDate) === timestamp(b.dueDate) ? 0 : timestamp(a.dueDate) - timestamp(b.dueDate);
      if (filters.sort === 'newest') return newest();
      if (filters.sort === 'deadline') return deadline() || newest();
      // Unfinished work comes first, with the earliest deadline first. Missing
      // deadlines stay visible; past deadlines do not disable submission links.
      const group = Number(!unfinished(stateA)) - Number(!unfinished(stateB));
      if (group) return group;
      return deadline() || Number(stateB === 'IN_PROGRESS') - Number(stateA === 'IN_PROGRESS') || newest();
    });
}
