import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { submissionsApi } from '../../api/submissions.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';
import type { Submission } from '../../types';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h13M14 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

type AssignmentState = 'AVAILABLE' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'RESULTS_READY';

const STATE_META: Record<AssignmentState, { label: string; action: string; className: string; priority: number }> = {
  IN_PROGRESS: {
    label: 'In progress',
    action: 'Continue',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
    priority: 0,
  },
  RESULTS_READY: {
    label: 'Results ready',
    action: 'View results',
    className: 'border-lime-300 bg-lime-50 text-[#466000]',
    priority: 1,
  },
  AVAILABLE: {
    label: 'Not started',
    action: 'Start',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    priority: 2,
  },
  AWAITING_REVIEW: {
    label: 'Submitted',
    action: 'View',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
    priority: 3,
  },
};

function assignmentState(submission?: Submission): AssignmentState {
  if (!submission) return 'AVAILABLE';
  if (submission.status === 'DRAFT') return 'IN_PROGRESS';
  if (submission.resultsReleasedAt) return 'RESULTS_READY';
  return 'AWAITING_REVIEW';
}

function StatusBadge({ state }: { state: AssignmentState }) {
  const meta = STATE_META[state];
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function MyAssignmentsPage() {
  const user = useAuthStore((state) => state.user);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', user?.schoolId, user?.grade],
    queryFn: () => assignmentsApi.findAll(),
  });
  const submissionsQuery = useQuery({
    queryKey: ['student-submissions', user?.id],
    queryFn: () => submissionsApi.findAll(),
    enabled: Boolean(user?.id),
  });

  const assignments = useMemo(
    () => (assignmentsQuery.data ?? []).filter((assignment) => assignment.isPublished),
    [assignmentsQuery.data],
  );
  const submissionByAssignment = useMemo(() => {
    const map = new Map<number, Submission>();
    for (const submission of submissionsQuery.data ?? []) {
      if (!map.has(submission.assignmentId)) map.set(submission.assignmentId, submission);
    }
    return map;
  }, [submissionsQuery.data]);

  const subjects = useMemo(
    () => Array.from(new Set(assignments.map((assignment) => assignment.subject.trim() || 'General'))).sort(),
    [assignments],
  );
  const visibleAssignments = useMemo(
    () => assignments
      .filter((assignment) => !selectedSubject || assignment.subject.trim() === selectedSubject)
      .sort((a, b) => {
        const stateDifference = STATE_META[assignmentState(submissionByAssignment.get(a.id))].priority
          - STATE_META[assignmentState(submissionByAssignment.get(b.id))].priority;
        if (stateDifference !== 0) return stateDifference;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [assignments, selectedSubject, submissionByAssignment],
  );

  const states = assignments.map((assignment) => assignmentState(submissionByAssignment.get(assignment.id)));
  const availableCount = states.filter((state) => state === 'AVAILABLE').length;
  const inProgressCount = states.filter((state) => state === 'IN_PROGRESS').length;
  const completedCount = states.filter((state) => state === 'AWAITING_REVIEW' || state === 'RESULTS_READY').length;
  const isLoading = assignmentsQuery.isLoading || submissionsQuery.isLoading;
  const hasError = assignmentsQuery.isError || submissionsQuery.isError;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Assignments"
        actions={user?.grade ? (
          <span className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
            {user.grade}
          </span>
        ) : undefined}
      />

      <section className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {[
          ['Not started', availableCount],
          ['In progress', inProgressCount],
          ['Submitted', completedCount],
        ].map(([label, value], index) => (
          <div key={label} className={`px-3 py-4 sm:px-5 ${index ? 'border-l border-slate-200' : ''}`}>
            <p className="text-xl font-semibold tracking-tight text-[#101820] sm:text-2xl">{isLoading ? '-' : value}</p>
            <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs">{label}</p>
          </div>
        ))}
      </section>

      {subjects.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter assignments by subject">
          <button
            type="button"
            onClick={() => setSelectedSubject(null)}
            className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${
              selectedSubject === null ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            All
          </button>
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setSelectedSubject(subject)}
              className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${
                selectedSubject === subject ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      ) : null}

      {hasError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">Assignments could not be loaded.</div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : !visibleAssignments.length ? (
        <EmptyState title={selectedSubject ? `No ${selectedSubject} assignments available` : 'No assignments available'} />
      ) : (
        <section className="space-y-3" aria-label="Assignment list">
          {visibleAssignments.map((assignment) => {
            const submission = submissionByAssignment.get(assignment.id);
            const state = assignmentState(submission);
            const meta = STATE_META[state];
            const marks = assignment.maxPoints ?? assignment.totalMarks ?? 0;

            return (
              <article key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#607D00]">{assignment.subject}</p>
                      <StatusBadge state={state} />
                    </div>
                    <h2 className="mt-2 break-words text-lg font-semibold leading-snug text-[#101820] sm:text-xl">{assignment.title}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                      <span>{assignment._count?.questions ?? 0} questions</span>
                      <span>{marks} marks</span>
                      {assignment.timeAllowedMinutes ? <span>{assignment.timeAllowedMinutes} min</span> : null}
                      {assignment.dueDate ? (
                        <span className="inline-flex items-center gap-1.5"><CalendarIcon /> Due {formatDate(assignment.dueDate)}</span>
                      ) : null}
                    </div>
                    {state === 'RESULTS_READY' && submission?.score != null ? (
                      <p className="mt-3 text-sm font-semibold text-[#466000]">Score {submission.score} / {marks}</p>
                    ) : null}
                  </div>
                  <Link
                    to={`/student/assignments/${assignment.id}`}
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white transition hover:bg-[#1D2C38] sm:w-auto"
                  >
                    {meta.action}
                    <ArrowIcon />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
