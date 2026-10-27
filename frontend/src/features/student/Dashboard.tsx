import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Calculator, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Clock3, GraduationCap, Leaf, LibraryBig, Search } from 'lucide-react';
import { assignmentsApi } from '../../api/assignments.api';
import { submissionsApi } from '../../api/submissions.api';
import { useAuthStore } from '../../store/auth.store';
import type { Assignment, Submission } from '../../types';

type AssignmentState = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'RESULTS_READY';

function stateFor(submission?: Submission): AssignmentState {
  if (!submission) return 'NOT_STARTED';
  if (submission.status === 'DRAFT') return 'IN_PROGRESS';
  return submission.resultsReleasedAt ? 'RESULTS_READY' : 'SUBMITTED';
}

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : null;
}

function statusLabel(state: AssignmentState) {
  return state === 'RESULTS_READY' ? 'Results ready' : state === 'SUBMITTED' ? 'Submitted' : state === 'IN_PROGRESS' ? 'In progress' : 'Not started';
}

function statusStyle(state: AssignmentState) {
  return state === 'RESULTS_READY' ? 'border-lime-200 bg-lime-50 text-[#527000]' : state === 'SUBMITTED' ? 'border-sky-200 bg-sky-50 text-sky-700' : state === 'IN_PROGRESS' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600';
}

function subjectIcon(subject: string) {
  return /math/i.test(subject) ? <Calculator className="h-7 w-7" /> : <Leaf className="h-7 w-7" />;
}

function ProgressCard({ icon, value, label, tone }: { icon: ReactNode; value: number; label: string; tone: string }) {
  return <Link to="/student/my-assignments" className="group flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5"><div className={`rounded-2xl p-3 ${tone}`}>{icon}</div><div className="min-w-0 flex-1"><p className="text-2xl font-semibold tracking-tight text-[#101820] sm:text-3xl">{value}</p><p className="mt-1 text-sm font-medium text-slate-500">{label}</p></div><ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#101820]" /></Link>;
}

function AssignmentRow({ assignment, submission }: { assignment: Assignment; submission?: Submission }) {
  const state = stateFor(submission);
  const marks = assignment.maxPoints ?? assignment.totalMarks ?? 0;
  const questions = assignment._count?.questions ?? 0;
  const isResult = state === 'RESULTS_READY';
  const date = formatDate(submission?.completedAt ?? assignment.dueDate);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-center"><div className={`hidden rounded-2xl p-4 sm:block ${/math/i.test(assignment.subject) ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700'}`}>{subjectIcon(assignment.subject)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">{assignment.subject}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(state)}`}>{statusLabel(state)}</span></div><h2 className="mt-2 break-words text-lg font-semibold leading-snug text-[#101820] sm:text-xl">{assignment.title}</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" />{questions} questions</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{marks} marks</span></div>{isResult && submission?.score != null ? <div className="mt-3 flex items-center gap-3"><span className="text-sm font-semibold text-[#466000]">Score {submission.score} / {marks}</span><div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#14913f]" style={{ width: `${marks ? Math.min(100, (submission.score / marks) * 100) : 0}%` }} /></div></div> : null}</div><div className="flex items-center gap-4 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><div className="hidden min-w-28 text-sm text-slate-500 sm:block"><CalendarDays className="mb-1 h-4 w-4" />{date ? <span>{state === 'NOT_STARTED' ? 'Due ' : ''}{date}</span> : <span>Available now</span>}</div><Link to={`/student/assignments/${assignment.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white transition hover:bg-[#1d2c38] lg:flex-none">{isResult ? 'View results' : state === 'IN_PROGRESS' ? 'Continue' : state === 'NOT_STARTED' ? 'Start' : 'View'}<ArrowRight className="h-4 w-4" /></Link></div></div></article>;
}

export function StudentDashboard() {
  const user = useAuthStore((state) => state.user);
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [search, setSearch] = useState('');
  const assignmentsQuery = useQuery({ queryKey: ['assignments', user?.schoolId, user?.grade], queryFn: () => assignmentsApi.findAll() });
  const submissionsQuery = useQuery({ queryKey: ['student-submissions', user?.id], queryFn: () => submissionsApi.findAll(), enabled: Boolean(user?.id) });
  const assignments = useMemo(() => (assignmentsQuery.data ?? []).filter((assignment) => assignment.isPublished), [assignmentsQuery.data]);
  const submissionByAssignment = useMemo(() => new Map((submissionsQuery.data ?? []).map((submission) => [submission.assignmentId, submission])), [submissionsQuery.data]);
  const subjects = useMemo(() => Array.from(new Set(assignments.map((item) => item.subject))).sort(), [assignments]);
  const counts = useMemo(() => assignments.reduce((all, assignment) => { all[stateFor(submissionByAssignment.get(assignment.id))] += 1; return all; }, { NOT_STARTED: 0, IN_PROGRESS: 0, SUBMITTED: 0, RESULTS_READY: 0 } as Record<AssignmentState, number>), [assignments, submissionByAssignment]);
  const visible = useMemo(() => assignments.filter((assignment) => (subjectFilter === 'All' || assignment.subject === subjectFilter) && assignment.title.toLowerCase().includes(search.toLowerCase())).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [assignments, search, subjectFilter]);
  const isLoading = assignmentsQuery.isLoading || submissionsQuery.isLoading;

  return <div className="mx-auto max-w-7xl space-y-7 pb-8"><header className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight text-[#101820] sm:text-3xl">Dashboard</h1><p className="mt-1 text-sm text-slate-500 sm:text-base">{user?.name?.split(' ')[0] ?? 'Your'}’s assignments and learning activity.</p></div><Link to="/student/learning-coach" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#101820] shadow-sm hover:bg-slate-50"><GraduationCap className="h-4 w-4" /> Open Learning Coach</Link></header><section className="grid gap-3 md:grid-cols-3"><ProgressCard icon={<ClipboardList className="h-6 w-6" />} value={counts.NOT_STARTED} label="Not started" tone="bg-slate-100 text-slate-600" /><ProgressCard icon={<Clock3 className="h-6 w-6" />} value={counts.IN_PROGRESS} label="In progress" tone="bg-amber-50 text-amber-600" /><ProgressCard icon={<CheckCircle2 className="h-6 w-6" />} value={counts.SUBMITTED + counts.RESULTS_READY} label="Submitted" tone="bg-emerald-50 text-emerald-700" /></section><section><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center"><h2 className="text-xl font-semibold tracking-tight text-[#101820] sm:text-2xl">My Assignments</h2><div className="flex gap-2 overflow-x-auto pb-1">{['All', ...subjects].map((subject) => <button key={subject} type="button" onClick={() => setSubjectFilter(subject)} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${subjectFilter === subject ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{subject}{subject === 'All' ? ` (${assignments.length})` : ''}</button>)}</div></div><label className="relative block w-full xl:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assignments..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-[#101820] outline-none transition focus:border-[#B5E61D] focus:ring-2 focus:ring-lime-100" /></label></div><div className="mt-5 space-y-4">{isLoading ? [0, 1].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-200" />) : visible.length ? visible.slice(0, 4).map((assignment) => <AssignmentRow key={assignment.id} assignment={assignment} submission={submissionByAssignment.get(assignment.id)} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No assignments match your search.</div>}</div>{visible.length > 4 ? <Link to="/student/my-assignments" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#101820] hover:text-[#607D00]">View all assignments <ArrowRight className="h-4 w-4" /></Link> : null}</section><section className="grid gap-3 md:grid-cols-3"><Link to="/student/kjsea-mock-test" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"><div className="flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-3 text-[#101820]"><GraduationCap className="h-6 w-6" /></span><div><h3 className="font-semibold text-[#101820]">Mock tests</h3><p className="mt-1 text-sm leading-5 text-slate-500">Generate a subject paper for your grade and review your answers.</p></div><ChevronRight className="ml-auto h-5 w-5 text-slate-400" /></div></Link><Link to="/student/learning-coach" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"><div className="flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-3 text-[#101820]"><BarChart3 className="h-6 w-6" /></span><div><h3 className="font-semibold text-[#101820]">Learning Coach</h3><p className="mt-1 text-sm leading-5 text-slate-500">Continue your practice and review.</p></div><ChevronRight className="ml-auto h-5 w-5 text-slate-400" /></div></Link><Link to="/student/resources" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"><div className="flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-3 text-[#101820]"><LibraryBig className="h-6 w-6" /></span><div><h3 className="font-semibold text-[#101820]">My Resources</h3><p className="mt-1 text-sm leading-5 text-slate-500">Access notes, cards, and learning tools.</p></div><ChevronRight className="ml-auto h-5 w-5 text-slate-400" /></div></Link></section></div>;
}
