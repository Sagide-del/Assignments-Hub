import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { submissionsApi } from '../../api/submissions.api';
import { EmptyState, MetricCard } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';
import type { Assignment, Submission } from '../../types';

function BookIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v14.5A1.5 1.5 0 0 0 17.5 17H7.5A2.5 2.5 0 0 0 5 19.5v-13Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.5 4A2.5 2.5 0 0 0 5 6.5V20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.5l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

const STATE_META: Record<AssignmentState, { label: string; action: string; className: string }> = {
  AVAILABLE: {
    label: 'Available',
    action: 'Start assignment',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  IN_PROGRESS: {
    label: 'In progress',
    action: 'Continue',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  AWAITING_REVIEW: {
    label: 'Awaiting review',
    action: 'View submission',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  RESULTS_READY: {
    label: 'Results ready',
    action: 'View feedback',
    className: 'border-lime-300 bg-lime-50 text-[#466000]',
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
    <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function Detail({ children }: { children: ReactNode }) {
  return <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-slate-500">{children}</span>;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
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

  const subjects = useMemo(() => {
    const groups = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      const subject = assignment.subject.trim() || 'General';
      groups.set(subject, [...(groups.get(subject) ?? []), assignment]);
    }
    return Array.from(groups.entries())
      .map(([name, items]) => ({
        name,
        assignments: items,
        available: items.filter((item) => !submissionByAssignment.has(item.id)).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, submissionByAssignment]);

  const visibleAssignments = useMemo(
    () => assignments
      .filter((assignment) => !selectedSubject || assignment.subject.trim() === selectedSubject)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assignments, selectedSubject],
  );

  const states = assignments.map((assignment) => assignmentState(submissionByAssignment.get(assignment.id)));
  const availableCount = states.filter((state) => state === 'AVAILABLE').length;
  const inProgressCount = states.filter((state) => state === 'IN_PROGRESS').length;
  const completedCount = states.filter((state) => state === 'AWAITING_REVIEW' || state === 'RESULTS_READY').length;
  const isLoading = assignmentsQuery.isLoading || submissionsQuery.isLoading;
  const hasError = assignmentsQuery.isError || submissionsQuery.isError;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#101820] text-white shadow-[0_18px_55px_rgba(16,24,32,0.14)]">
        <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B5E61D] text-sm font-bold text-[#101820]">
              {initials(user?.name ?? 'Student') || 'ST'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Signed in as</p>
              <h1 className="mt-1 break-words text-xl font-semibold sm:text-2xl">{user?.name ?? 'Student'}</h1>
              <p className="mt-1 text-sm text-white/65">
                {[user?.grade, user?.admissionNumber].filter(Boolean).join(' · ') || 'Learner profile'}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75">
            {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Available" value={isLoading ? '-' : availableCount} compact />
        <MetricCard label="In progress" value={isLoading ? '-' : inProgressCount} compact />
        <MetricCard label="Completed" value={isLoading ? '-' : completedCount} compact />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#101820]">Subjects</h2>
          {selectedSubject ? (
            <button type="button" onClick={() => setSelectedSubject(null)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#536D00] hover:bg-lime-50">
              View all
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-3xl bg-slate-200" />)}
          </div>
        ) : subjects.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map((subject) => {
              const active = selectedSubject === subject.name;
              return (
                <button
                  key={subject.name}
                  type="button"
                  onClick={() => setSelectedSubject(active ? null : subject.name)}
                  aria-pressed={active}
                  className={`min-h-32 rounded-3xl border p-5 text-left transition ${active ? 'border-[#B5E61D] bg-[#101820] text-white shadow-lg' : 'border-slate-200 bg-white text-[#101820] shadow-sm hover:-translate-y-0.5 hover:border-lime-300 hover:shadow-md'}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-[#B5E61D] text-[#101820]' : 'bg-lime-50 text-[#536D00]'}`}>
                    <BookIcon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 break-words font-semibold">{subject.name}</p>
                  <p className={`mt-1 text-sm ${active ? 'text-white/60' : 'text-slate-500'}`}>
                    {subject.assignments.length} total · {subject.available} available
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Assignments</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#101820]">{selectedSubject ?? 'All subjects'}</h2>
          </div>
          <p className="text-sm font-medium text-slate-500">{visibleAssignments.length} available to your grade</p>
        </div>

        {hasError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">Assignments could not be loaded.</div>
        ) : !isLoading && !visibleAssignments.length ? (
          <EmptyState title={selectedSubject ? `No ${selectedSubject} assignments available` : 'No assignments available'} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleAssignments.map((assignment) => {
              const submission = submissionByAssignment.get(assignment.id);
              const state = assignmentState(submission);
              const meta = STATE_META[state];
              const marks = assignment.maxPoints ?? assignment.totalMarks ?? 0;

              return (
                <article key={assignment.id} className="flex min-w-0 flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(16,24,32,0.05)] transition hover:border-lime-300 hover:shadow-[0_16px_38px_rgba(16,24,32,0.08)] sm:p-6">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#607D00]">{assignment.subject}</p>
                      <h3 className="mt-2 break-words text-xl font-semibold tracking-tight text-[#101820]">{assignment.title}</h3>
                    </div>
                    <StatusBadge state={state} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                    <Detail><ClockIcon /> Posted {formatDate(assignment.createdAt)}</Detail>
                    <Detail>{marks} marks</Detail>
                    <Detail>{assignment._count?.questions ?? 0} questions</Detail>
                    {assignment.targetStream ? <Detail>Stream {assignment.targetStream}</Detail> : null}
                    {assignment.dueDate ? <Detail>Due {formatDate(assignment.dueDate)}</Detail> : null}
                  </div>

                  {state === 'RESULTS_READY' && submission?.score != null ? (
                    <div className="mt-5 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-[#334800]">
                      Score: {submission.score} / {marks}
                    </div>
                  ) : null}

                  <div className="mt-auto pt-5">
                    <Link to={`/student/assignments/${assignment.id}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1D2C38] sm:w-auto">
                      {meta.action}
                      <ArrowIcon />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
