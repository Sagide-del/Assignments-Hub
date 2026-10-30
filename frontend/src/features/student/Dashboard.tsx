import { subjectAppearance } from "./subject-appearance";
import { groupAssignments } from "./assignment-catalogue";
import { LearningTitle, FullLearningTitle } from "./LearningTitle";
import { DashboardSubjects } from "./DashboardSubjects";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Award,
  ChartNoAxesCombined,
  ClipboardList,
  Wrench,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  CirclePlay,
  Clock3,
  CodeXml,
  Compass,
  FileCheck2,
  FlaskConical,
  LibraryBig,
  Search,
  type LucideIcon,
} from "lucide-react";
import { assignmentsApi } from "../../api/assignments.api";
import { submissionsApi } from "../../api/submissions.api";
import { useAuthStore } from "../../store/auth.store";
import type { Assignment, Submission } from "../../types";
import {
  assignmentDeadline,
  assignmentState,
  assignmentSubject,
  selectAssignments,
  STATE_META,
  type AssignmentState,
} from "./assignment-list";

const METRICS: {
  state: AssignmentState;
  label: string;
  Icon: LucideIcon;
  tone: string;
}[] = [
  {
    state: "NOT_STARTED",
    label: "To start",
    Icon: ClipboardList,
    tone: "bg-blue-50 text-blue-600",
  },
  {
    state: "IN_PROGRESS",
    label: "In progress",
    Icon: CirclePlay,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    state: "SUBMITTED",
    label: "Awaiting results",
    Icon: Clock3,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    state: "RESULTS_AVAILABLE",
    label: "Results available",
    Icon: ChartNoAxesCombined,
    tone: "bg-violet-50 text-violet-600",
  },
];
const TOOLS: {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
}[] = [
  {
    title: "KJSEA Mock Test",
    description: "Practice by grade and subject",
    href: "/student/kjsea-mock-test",
    Icon: FileCheck2,
  },
  {
    title: "Learning Coach",
    description: "Guided topic practice",
    href: "/student/learning-coach",
    Icon: BrainCircuit,
  },
  {
    title: "STEM Labs",
    description: "Experiments and notebooks",
    href: "/student/stem-labs",
    Icon: FlaskConical,
  },
  {
    title: "Learn a Skill",
    description: "Lessons and practical projects",
    href: "/student/learn-skills",
    Icon: CodeXml,
  },
  {
    title: "My Resources",
    description: "Learning guide and saved resources",
    href: "/student/resources",
    Icon: LibraryBig,
  },
  {
    title: "My Pathway",
    description: "Explore your study options",
    href: "/student/my-pathway",
    Icon: Compass,
  },
];

function AssignmentRow({
  assignment,
  submission,
}: {
  assignment: Assignment;
  submission?: Submission;
}) {
  const subject = assignmentSubject(assignment);
  const { Icon, tone, key: iconKey } = subjectAppearance(subject);
  const state = assignmentState(submission);
  const meta = STATE_META[state];
  const questions =
    assignment._count?.questions ?? assignment.questions?.length;
  const marks = assignment.maxPoints ?? assignment.totalMarks;
  const deadline = assignmentDeadline(assignment.dueDate);
  const unfinished = state === "NOT_STARTED" || state === "IN_PROGRESS";
  return (
    <article className="flex min-w-0 gap-3 border-t border-slate-100 px-4 py-5 sm:gap-4 sm:px-6">
      <span
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon
          data-subject-icon={iconKey}
          className="h-5 w-5"
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-medium text-slate-500">{subject}</span>
          <span
            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
          >
            {meta.label}
          </span>
        </div>
        <LearningTitle
          value={assignment.title}
          subject={subject}
          className="mt-2"
        />
        <FullLearningTitle value={assignment.title} subject={subject} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          {questions != null && <span>{questions} questions</span>}
          {marks != null && <span>{marks} marks</span>}
          {unfinished && (
            <span
              title={deadline.detail}
              className={`inline-flex items-center gap-1.5 ${deadline.isPast ? "text-red-700" : deadline.isSoon ? "text-amber-700" : ""}`}
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {deadline.label}
            </span>
          )}
          {state === "SUBMITTED" && <span>Results have not been released</span>}
          {state === "RESULTS_AVAILABLE" && submission?.score != null && (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
              Score: {submission.score}
              {marks != null ? ` / ${marks}` : ""}
            </span>
          )}
        </div>
        <Link
          to={`/student/assignments/${assignment.id}`}
          aria-label={`${meta.action}: ${assignment.title}`}
          className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-800 hover:text-blue-700 sm:hidden"
        >
          {meta.action}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <Link
        to={`/student/assignments/${assignment.id}`}
        aria-label={`${meta.action}: ${assignment.title}`}
        className="hidden min-h-10 shrink-0 items-center gap-2 self-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
      >
        {meta.action}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function StudentDashboard() {
  const user = useAuthStore((state) => state.user);
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<AssignmentState | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const assignmentsQuery = useQuery({
    queryKey: ["dashboard-assignments", user?.id, user?.schoolId, user?.grade],
    queryFn: () => assignmentsApi.findAll(),
    enabled: Boolean(user?.id),
  });
  const submissionsQuery = useQuery({
    queryKey: ["student-submissions", user?.id],
    queryFn: () => submissionsApi.findAll(),
    enabled: Boolean(user?.id),
  });
  const assignments = useMemo(
    () => (assignmentsQuery.data ?? []).filter((item) => item.isPublished),
    [assignmentsQuery.data],
  );
  const submissions = useMemo(() => {
    const map = new Map<number, Submission>();
    // The API returns newest first; keep that attempt if historical rows exist.
    for (const item of submissionsQuery.data ?? [])
      if (!map.has(item.assignmentId)) map.set(item.assignmentId, item);
    return map;
  }, [submissionsQuery.data]);
  const subjects = useMemo(
    () => [...new Set(assignments.map(assignmentSubject))].sort(),
    [assignments],
  );
  const subjectGroups = useMemo(
    () => groupAssignments(assignments),
    [assignments],
  );
  const counts = useMemo(() => {
    const result: Record<AssignmentState, number> = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      SUBMITTED: 0,
      RESULTS_AVAILABLE: 0,
    };
    for (const item of assignments)
      result[assignmentState(submissions.get(item.id))]++;
    return result;
  }, [assignments, submissions]);
  const visible = useMemo(
    () =>
      selectAssignments(assignments, submissions, {
        subject,
        state: status,
        search,
        sort: "priority",
      }),
    [assignments, submissions, subject, status, search],
  );
  const next = useMemo(
    () =>
      selectAssignments(assignments, submissions, {
        subject: "",
        state: "ALL",
        search: "",
        sort: "priority",
      }).find((item) =>
        ["NOT_STARTED", "IN_PROGRESS"].includes(
          assignmentState(submissions.get(item.id)),
        ),
      ),
    [assignments, submissions],
  );
  const loading = assignmentsQuery.isPending || submissionsQuery.isPending;
  const error = assignmentsQuery.isError || submissionsQuery.isError;
  const ready = !loading && !error;
  const filtered = Boolean(subject || search || status !== "ALL");
  function clearFilters() {
    setSubject("");
    setStatus("ALL");
    setSearch("");
  }
  function retry() {
    void assignmentsQuery.refetch();
    void submissionsQuery.refetch();
  }
  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <Link
          to="/student/my-assignments"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          My Assignments
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>
      <section
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Assignment overview"
      >
        {METRICS.map(({ state, label, Icon, tone }) => (
          <button
            key={state}
            type="button"
            aria-pressed={status === state}
            disabled={!ready}
            onClick={() =>
              setStatus((current) => (current === state ? "ALL" : state))
            }
            className={`flex min-w-0 items-center gap-3 rounded-2xl border bg-white p-4 text-left transition hover:shadow-md hover:shadow-slate-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:p-4 ${status === state ? "border-slate-500 ring-1 ring-slate-500" : "border-slate-200 hover:border-slate-300"} disabled:cursor-default`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${tone}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-semibold tabular-nums text-slate-900">
                {ready ? counts[state] : "—"}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-slate-500 sm:text-xs">
                {label}
              </span>
            </span>
            <ChevronRight
              className="ml-auto hidden h-4 w-4 shrink-0 text-slate-400 sm:block"
              aria-hidden="true"
            />
          </button>
        ))}
      </section>
      {ready && subjectGroups.length > 0 && (
        <DashboardSubjects subjects={subjectGroups} />
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Your assignment overview could not be loaded.
          </span>
          <button
            type="button"
            onClick={retry}
            disabled={
              assignmentsQuery.isFetching || submissionsQuery.isFetching
            }
            className="min-h-10 rounded-lg border border-red-200 bg-white px-4 font-semibold disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {ready && next && (
            <section
              aria-label="Next assignment"
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center gap-2.5 text-xs font-semibold text-blue-700">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/80">
                  <CalendarDays size={18} aria-hidden="true" />
                </span>
                Up next
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium text-slate-500">
                  {assignmentSubject(next)}
                </p>
                <LearningTitle
                  value={next.title}
                  subject={assignmentSubject(next)}
                  as="h2"
                  className="[&_h2]:text-xl [&_h2]:leading-7"
                />
                <FullLearningTitle
                  value={next.title}
                  subject={assignmentSubject(next)}
                />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 size={15} aria-hidden="true" />
                  {assignmentDeadline(next.dueDate).label}
                </p>
                <Link
                  to={`/student/assignments/${next.id}`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:w-auto"
                >
                  <CirclePlay size={16} aria-hidden="true" />
                  {assignmentState(submissions.get(next.id)) === "IN_PROGRESS"
                    ? "Continue assignment"
                    : "Start assignment"}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}
          <section
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            aria-label="Your assignments"
          >
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Your assignments
                </h2>
                <Link
                  to="/student/my-assignments"
                  className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  View all
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
                <label className="relative">
                  <span className="sr-only">Search assignments</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title or subject"
                    className="min-h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm"
                  />
                </label>
                <label>
                  <span className="sr-only">Assignment subject</span>
                  <select
                    aria-label="Assignment subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">All subjects</option>
                    {subjects.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <p role="status">
                  {error
                    ? "Overview unavailable"
                    : loading
                      ? "Loading assignments…"
                      : `${visible.length} ${visible.length === 1 ? "assignment" : "assignments"}${status === "ALL" ? " · unfinished first" : ` · ${METRICS.find((m) => m.state === status)?.label.toLowerCase()}`}`}
                </p>
                {filtered && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-9 font-medium text-slate-700 underline underline-offset-4"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            {loading && !error ? (
              <div
                role="status"
                aria-label="Loading assignment overview"
                className="space-y-4 border-t border-slate-100 p-6"
              >
                {[0, 1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-20 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : error ? (
              <p className="border-t border-slate-100 px-6 py-8 text-sm text-slate-500">
                Retry to see your tasks and their latest status.
              </p>
            ) : visible.length ? (
              <>
                {visible.slice(0, 5).map((item) => (
                  <AssignmentRow
                    key={item.id}
                    assignment={item}
                    submission={submissions.get(item.id)}
                  />
                ))}
                {visible.length > 5 && (
                  <p className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
                    Showing 5 of {visible.length}.{" "}
                    <Link
                      to="/student/my-assignments"
                      className="font-medium text-slate-800 underline underline-offset-4"
                    >
                      Open all assignments
                    </Link>
                  </p>
                )}
              </>
            ) : (
              <div className="border-t border-slate-100 px-6 py-10 text-center">
                <BookOpen
                  className="mx-auto h-7 w-7 text-slate-300"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-3 text-sm font-semibold text-slate-700">
                  {filtered
                    ? "No assignments match these filters"
                    : "No assignments available yet"}
                </h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {filtered
                    ? "Try another subject or clear your filters."
                    : "Published assignments for your account will appear here."}
                </p>
              </div>
            )}
          </section>
        </div>
        <aside
          aria-label="Learning tools"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Wrench size={19} className="text-blue-700" aria-hidden="true" />
              Quick tools
            </h2>
          </div>
          <div className="space-y-2 p-3">
            {(user?.isIndependentTrial ? [] : TOOLS).map(
              ({ title, description, href, Icon }) => (
                <Link
                  key={href}
                  to={href}
                  className="group flex min-h-20 items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-blue-100">
                    <Icon
                      className="h-[18px] w-[18px]"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-800">
                      {title}
                    </span>
                    <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                      {description}
                    </span>
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-slate-500"
                    aria-hidden="true"
                  />
                </Link>
              ),
            )}
          </div>
          {user?.isIndependentTrial && (
            <div className="border-t border-slate-100 p-5">
              <p className="text-xs leading-6 text-slate-500">
                Your account includes a starter assignment.
              </p>
              <Link
                to="/student/activate"
                className="mt-2 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-800"
              >
                Activate full access
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
