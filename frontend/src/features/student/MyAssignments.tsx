import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Search, SlidersHorizontal } from 'lucide-react';
import { assignmentsApi } from '../../api/assignments.api';
import { submissionsApi } from '../../api/submissions.api';
import { EmptyState } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';
import type { Submission } from '../../types';
import {
  STATE_META, assignmentDeadline, assignmentState, assignmentSubject, selectAssignments,
  type AssignmentSort, type AssignmentState,
} from './assignment-list';

const STATUS_OPTIONS = ['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'RESULTS_AVAILABLE'] as const;

const CONTROL_CLASS = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-[#101820] focus:outline-none focus:ring-2 focus:ring-[#607D00] focus:ring-offset-2';

export function MyAssignmentsPage() {
  const user = useAuthStore((state) => state.user);
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<AssignmentState | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AssignmentSort>('priority');

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
    () => Array.from(new Set(assignments.map(assignmentSubject))).sort(),
    [assignments],
  );
  const visibleAssignments = useMemo(
    () => selectAssignments(assignments, submissionByAssignment, { subject, state: status, search, sort }),
    [assignments, submissionByAssignment, subject, status, search, sort],
  );
  const counts = useMemo(() => {
    const values = { ALL: assignments.length, NOT_STARTED: 0, IN_PROGRESS: 0, SUBMITTED: 0, RESULTS_AVAILABLE: 0 };
    for (const assignment of assignments) values[assignmentState(submissionByAssignment.get(assignment.id))]++;
    return values;
  }, [assignments, submissionByAssignment]);
  const isLoading = assignmentsQuery.isLoading || submissionsQuery.isLoading;
  const hasError = assignmentsQuery.isError || submissionsQuery.isError;
  const hasFilters = Boolean(subject || status !== 'ALL' || search);
  const now = new Date();

  function clearFilters() {
    setSubject('');
    setStatus('ALL');
    setSearch('');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#101820] sm:text-3xl">My Assignments</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Find your next task, continue your work or review your answers.</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Assignment filters">
        <div className="hidden flex-wrap gap-2 sm:flex" role="group" aria-label="Filter assignments by status">
          {STATUS_OPTIONS.map((value) => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#607D00] focus-visible:ring-offset-2 ${status === value ? 'border-[#101820] bg-[#101820] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {value === 'ALL' ? 'All' : STATE_META[value].label}
              <span className={`rounded-md px-1.5 py-0.5 text-xs ${status === value ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{isLoading || hasError ? '–' : counts[value]}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="sm:hidden">
            <label htmlFor="assignment-status" className="mb-1.5 block text-xs font-semibold text-slate-600">Status</label>
            <select id="assignment-status" value={status} onChange={(event) => setStatus(event.target.value as AssignmentState | 'ALL')} className={CONTROL_CLASS}>
              {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All assignments' : STATE_META[value].label} ({isLoading || hasError ? '–' : counts[value]})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="assignment-search" className="mb-1.5 block text-xs font-semibold text-slate-600">Search assignments</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
              <input id="assignment-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or subject" className={`${CONTROL_CLASS} pl-10`} />
            </div>
          </div>
          <div>
            <label htmlFor="assignment-subject" className="mb-1.5 block text-xs font-semibold text-slate-600">Subject</label>
            <select id="assignment-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className={CONTROL_CLASS}>
              <option value="">All subjects</option>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="assignment-sort" className="mb-1.5 block text-xs font-semibold text-slate-600">Sort by</label>
            <select id="assignment-sort" value={sort} onChange={(event) => setSort(event.target.value as AssignmentSort)} className={CONTROL_CLASS}>
              <option value="priority">Unfinished first</option>
              <option value="deadline">Soonest deadline</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p role="status" className="text-slate-600">{hasError ? 'Assignment list unavailable' : isLoading ? 'Loading assignments…' : `${visibleAssignments.length} of ${assignments.length} assignments`}</p>
          {hasFilters ? <button type="button" onClick={clearFilters} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-[#466000] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Clear filters</button> : null}
        </div>
      </section>

      {hasError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>Assignments could not be loaded. Try again to get your latest work and submission status.</p>
          <button type="button" onClick={() => { void assignmentsQuery.refetch(); void submissionsQuery.refetch(); }} disabled={assignmentsQuery.isFetching || submissionsQuery.isFetching} className="mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 font-semibold disabled:opacity-50">{assignmentsQuery.isFetching || submissionsQuery.isFetching ? 'Retrying…' : 'Try again'}</button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading assignment list">
          {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : !visibleAssignments.length ? (
        <div className="space-y-3">
          <EmptyState title={assignments.length ? 'No assignments match your filters' : 'No assignments available yet'}
            action={assignments.length ? <button type="button" onClick={clearFilters} className="min-h-11 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white">Clear filters</button> : undefined} />
          {!assignments.length && user?.isIndependentTrial ? (
            <p className="rounded-xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm leading-6 text-[#466000]">Your starter assignment will appear here when it is published for your grade. Activate full access to unlock every assignment and learning tool.</p>
          ) : null}
        </div>
      ) : (
        <section className="space-y-3" aria-label="Assignment list">
          {visibleAssignments.map((assignment) => {
            const submission = submissionByAssignment.get(assignment.id);
            const state = assignmentState(submission);
            const meta = STATE_META[state];
            const marks = assignment.maxPoints ?? assignment.totalMarks;
            const questionCount = assignment._count?.questions ?? assignment.questions?.length;
            const deadline = assignmentDeadline(assignment.dueDate, now);
            const unfinished = state === 'NOT_STARTED' || state === 'IN_PROGRESS';
            const urgent = unfinished && (deadline.isPast || deadline.isSoon);

            return (
              <article key={assignment.id} aria-labelledby={`assignment-title-${assignment.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-xs font-semibold uppercase tracking-[0.1em] text-[#526B00]">{assignmentSubject(assignment)}</p>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                    </div>
                    <h2 id={`assignment-title-${assignment.id}`} className="mt-2 break-words text-lg font-semibold leading-snug text-[#101820]">{assignment.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                      {questionCount != null ? <span>{questionCount} {questionCount === 1 ? 'question' : 'questions'}</span> : null}
                      {marks != null ? <span>{marks} {marks === 1 ? 'mark' : 'marks'}</span> : null}
                      {assignment.timeAllowedMinutes ? <span>{assignment.timeAllowedMinutes} min</span> : null}
                      <span title={deadline.detail} className={`inline-flex items-center gap-1.5 ${urgent ? 'font-semibold text-amber-800' : ''}`}><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />{deadline.label}</span>
                    </div>
                    {assignment.dueDate && deadline.detail.startsWith('Due ') ? <p className="mt-2 text-xs text-slate-500">{deadline.detail}</p> : null}
                    {state === 'SUBMITTED' ? <p className="mt-2 text-sm text-sky-800">Your work is submitted. Results have not been released yet.</p> : null}
                    {state === 'RESULTS_AVAILABLE' && submission?.score != null ? <p className="mt-2 text-sm font-semibold text-[#466000]">Score: {submission.score}{marks != null && marks > 0 ? ` / ${marks}` : ''}</p> : null}
                  </div>
                  <Link to={`/student/assignments/${assignment.id}`} aria-label={`${meta.action}: ${assignment.title}`}
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white transition hover:bg-[#1D2C38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#607D00] focus-visible:ring-offset-2 sm:w-auto">
                    {meta.action}<ArrowRight className="h-4 w-4" aria-hidden="true" />
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
