import { PageHeader } from "../../components/ui/Saas";
import { learningTitle } from "./assignment-presentation";
import { subjectAppearance } from "./subject-appearance";
import { LearningTitle, FullLearningTitle } from "./LearningTitle";
import { api, apiErrorMessage } from "../../api/axios";
import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FolderOpen,
  Search,
} from "lucide-react";
import { assignmentsApi } from "../../api/assignments.api";
import { submissionsApi } from "../../api/submissions.api";
import { useAuthStore } from "../../store/auth.store";
import type { Assignment, Submission } from "../../types";
import {
  STATE_META,
  assignmentDeadline,
  assignmentState,
  selectAssignments,
  type AssignmentSort,
  type AssignmentState,
} from "./assignment-list";
import {
  catalogueKey,
  assignmentTopic,
  groupAssignments,
  matchesAssignmentSearch,
} from "./assignment-catalogue";
const STATES = [
  "ALL",
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "RESULTS_AVAILABLE",
] as const;
const CONTROL =
  "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700";
function GroupProgress({
  items,
  submissions,
}: {
  items: Assignment[];
  submissions: Map<number, Submission>;
}) {
  const fixed = items.filter((a) => !a.bankPractice);
  if (!fixed.length)
    return (
      <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
        Reviewed topic practice · up to 30 questions per batch
      </p>
    );
  const submitted = fixed.filter((a) =>
    ["SUBMITTED", "RESULTS_AVAILABLE"].includes(
      assignmentState(submissions.get(a.id)),
    ),
  ).length;
  const active = fixed.filter(
    (a) => assignmentState(submissions.get(a.id)) === "IN_PROGRESS",
  ).length;
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>
          {submitted} of {fixed.length} submitted
        </span>
        {active > 0 && (
          <span className="text-blue-700">{active} in progress</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Assignments submitted"
        aria-valuemin={0}
        aria-valuemax={fixed.length}
        aria-valuenow={submitted}
        className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-blue-600"
          style={{
            width: `${fixed.length ? (submitted / fixed.length) * 100 : 0}%`,
          }}
        />
      </div>
    </div>
  );
}
function AssignmentCard({
  assignment,
  submission,
}: {
  assignment: Assignment;
  submission?: Submission;
}) {
  const navigate = useNavigate();
  const practice = useMutation({
    mutationFn: () =>
      api
        .post<{ id: string }>("/practice", {
          subject: assignment.bankPractice!.subject,
          topic: assignment.bankPractice!.topic,
        })
        .then((r) => r.data),
    onSuccess: (r) => navigate(`/student/assignments/practice/${r.id}`),
  });
  const location = useLocation();
  const state = assignmentState(submission),
    meta = STATE_META[state];
  const count = assignment._count?.questions ?? assignment.questions?.length;
  const marks = assignment.maxPoints ?? assignment.totalMarks;
  const due = assignmentDeadline(assignment.dueDate);
  const unfinished = state === "NOT_STARTED" || state === "IN_PROGRESS";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/50 transition hover:border-slate-300 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${meta.className}`}
          >
            {meta.label}
          </span>
          <LearningTitle
            value={assignment.title}
            subject={assignment.subject}
            className="mt-3"
          />
          <FullLearningTitle
            value={assignment.title}
            subject={assignment.subject}
          />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            {count != null && <span>{count} questions</span>}
            {marks != null && <span>{marks} marks</span>}
            {assignment.timeAllowedMinutes ? (
              <span>{assignment.timeAllowedMinutes} min</span>
            ) : null}
            {unfinished && (
              <span
                title={due.detail}
                className={`inline-flex items-center gap-1.5 ${due.isPast ? "text-red-700" : due.isSoon ? "text-amber-700" : ""}`}
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {due.label}
              </span>
            )}
          </div>
          {state === "SUBMITTED" && (
            <p className="mt-3 text-xs text-slate-500">
              Results have not been released.
            </p>
          )}
          {state === "RESULTS_AVAILABLE" && submission?.score != null && (
            <p className="mt-3 text-sm font-semibold text-emerald-700">
              Score: {submission.score}
              {marks != null ? ` / ${marks}` : ""}
            </p>
          )}
        </div>
        {assignment.bankPractice ? (
          <div>
            <button
              disabled={practice.isPending}
              onClick={() =>
                assignment.bankPractice?.activeId
                  ? navigate(
                      `/student/assignments/practice/${assignment.bankPractice.activeId}`,
                    )
                  : assignment.bankPractice?.historicalOnly &&
                      assignment.bankPractice.latestResultId
                    ? navigate(
                        `/student/assignments/practice/${assignment.bankPractice.latestResultId}`,
                      )
                    : practice.mutate()
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              {practice.isPending
                ? "Opening…"
                : assignment.bankPractice.activeId
                  ? "Continue assignment"
                  : assignment.bankPractice.historicalOnly
                    ? "View saved review"
                    : "Start topic practice"}
              <ArrowRight className="h-4 w-4" />
            </button>
            {assignment.bankPractice.latestResultId && (
              <Link
                to={`/student/assignments/practice/${assignment.bankPractice.latestResultId}`}
                className="mt-3 block text-xs font-medium text-blue-700 underline"
              >
                View last review · {assignment.bankPractice.completedBatches}{" "}
                completed batches
              </Link>
            )}
            {practice.isError && (
              <p role="alert" className="mt-2 max-w-sm text-xs text-red-700">
                {apiErrorMessage(
                  practice.error,
                  "Could not open topic practice.",
                )}
              </p>
            )}
          </div>
        ) : (
          <Link
            to={`/student/assignments/${assignment.id}`}
            state={{ assignmentCatalogue: location.pathname + location.search }}
            aria-label={`${meta.action}: ${assignment.title}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 sm:w-auto"
          >
            {meta.action}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}
export function MyAssignmentsPage() {
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const subjectKey = params.get("subject") ?? "";
  const topicKey = subjectKey ? (params.get("topic") ?? "") : "";
  const search = params.get("q") ?? "";
  const stateValue = params.get("status") ?? "ALL";
  const state: AssignmentState | "ALL" = STATES.includes(
    stateValue as (typeof STATES)[number],
  )
    ? (stateValue as AssignmentState | "ALL")
    : "ALL";
  const sortValue = params.get("sort") ?? "priority";
  const sort: AssignmentSort = ["priority", "deadline", "newest"].includes(
    sortValue,
  )
    ? (sortValue as AssignmentSort)
    : "priority";
  const assignmentsQuery = useQuery({
    queryKey: ["assignment-catalogue", user?.id, user?.schoolId, user?.grade],
    queryFn: () => assignmentsApi.findAll(),
    enabled: !!user?.id,
    refetchInterval: 15000,
  });
  const submissionsQuery = useQuery({
    queryKey: ["student-submissions", user?.id],
    queryFn: () => submissionsApi.findAll(),
    enabled: !!user?.id,
  });
  const practiceQuery = useQuery({
    queryKey: ["practice-batches", user?.id, user?.grade],
    queryFn: () =>
      api
        .get<{
          grade: string;
          subjects: {
            subject: string;
            topics: { topic: string; count: number }[];
          }[];
          active: {
            id: string;
            subject: string;
            coverage?: { topic?: string };
          }[];
          completed?: {
            id: string;
            subject: string;
            coverage?: { topic?: string };
          }[];
        }>("/practice")
        .then((r) => r.data),
    enabled: !!user?.id && !user.isIndependentTrial,
    retry: false,
  });
  const assignments = useMemo(() => {
    const published = (assignmentsQuery.data ?? []).filter(
      (a) => a.isPublished,
    );
    const key = (subject: string, topic: string) =>
      JSON.stringify([catalogueKey(subject), catalogueKey(topic)]);
    const publishedTopics = new Set(
      published.map((a) => key(a.subject, assignmentTopic(a))),
    );
    const bank: Assignment[] = (practiceQuery.data?.subjects ?? [])
      .flatMap((s) =>
        (s.topics ?? [])
          .filter(
            (t) => t.count > 0 && !publishedTopics.has(key(s.subject, t.topic)),
          )
          .map((t) => ({
            id: 0,
            title: `${t.topic} · Topic practice`,
            subject: s.subject,
            topic: t.topic,
            grade: practiceQuery.data!.grade,
            schoolId: user!.schoolId,
            isPublished: true,
            createdAt: "2020-01-01T00:00:00Z",
            type: "AUTO_MARKED",

            _count: { questions: Math.min(30, t.count), submissions: 0 },
            bankPractice: {
              subject: s.subject,
              topic: t.topic,
              latestResultId: practiceQuery.data?.completed?.find(
                (a) =>
                  a.subject.toLowerCase() === s.subject.toLowerCase() &&
                  a.coverage?.topic === t.topic,
              )?.id,
              completedBatches:
                practiceQuery.data?.completed?.filter(
                  (a) =>
                    a.subject.toLowerCase() === s.subject.toLowerCase() &&
                    a.coverage?.topic === t.topic,
                ).length ?? 0,
              activeId: practiceQuery.data?.active.find(
                (a) =>
                  a.subject.toLowerCase() === s.subject.toLowerCase() &&
                  a.coverage?.topic === t.topic,
              )?.id,
            },
          })),
      )
      .map((a, i) => ({ ...a, id: -(i + 1) }));
    const seen = new Set(bank.map((a) => key(a.subject, a.topic!)));
    for (const record of [
      ...(practiceQuery.data?.active ?? []),
      ...(practiceQuery.data?.completed ?? []),
    ]) {
      const topic = record.coverage?.topic ?? "Saved practice",
        identity = key(record.subject, topic);
      if (seen.has(identity)) continue;
      seen.add(identity);
      bank.push({
        id: -(bank.length + 1),
        title: `${topic} · Saved practice`,
        subject: record.subject,
        topic,
        grade: practiceQuery.data!.grade,
        schoolId: user!.schoolId,
        isPublished: true,
        createdAt: "2020-01-01T00:00:00Z",
        bankPractice: {
          subject: record.subject,
          topic,
          historicalOnly: true,
          activeId: practiceQuery.data?.active.find(
            (a) =>
              a.subject === record.subject &&
              a.coverage?.topic === record.coverage?.topic,
          )?.id,
          latestResultId: practiceQuery.data?.completed?.find(
            (a) =>
              a.subject === record.subject &&
              a.coverage?.topic === record.coverage?.topic,
          )?.id,
          completedBatches:
            practiceQuery.data?.completed?.filter(
              (a) =>
                a.subject === record.subject &&
                a.coverage?.topic === record.coverage?.topic,
            ).length ?? 0,
        },
      });
    }
    return [...published, ...bank];
  }, [assignmentsQuery.data, practiceQuery.data, user?.schoolId]);
  const submissions = useMemo(() => {
    const map = new Map<number, Submission>();
    for (const row of submissionsQuery.data ?? [])
      if (!map.has(row.assignmentId)) map.set(row.assignmentId, row);
    return map;
  }, [submissionsQuery.data]);
  const allGroups = useMemo(() => groupAssignments(assignments), [assignments]);
  const filtered = useMemo(
    () =>
      selectAssignments(assignments, submissions, {
        subject: "",
        state,
        search: "",
        sort,
      }).filter((a) => matchesAssignmentSearch(a, search)),
    [assignments, submissions, state, search, sort],
  );
  const groups = useMemo(() => groupAssignments(filtered), [filtered]);
  const selectedSubject = allGroups.find(
    (s) => s.key === catalogueKey(subjectKey),
  );
  const selectedTopic = selectedSubject?.topics.find(
    (t) => t.key === catalogueKey(topicKey),
  );
  const matchingSubject = groups.find(
    (s) => s.key === catalogueKey(subjectKey),
  );
  const matchingTopic = matchingSubject?.topics.find(
    (t) => t.key === catalogueKey(topicKey),
  );
  const loading =
    assignmentsQuery.isPending ||
    submissionsQuery.isPending ||
    (practiceQuery.isPending && practiceQuery.fetchStatus !== "idle");
  const error = assignmentsQuery.isError || submissionsQuery.isError;
  const hasFilters = !!search || state !== "ALL";
  function navigate(subject = "", topic = "") {
    const next = new URLSearchParams(params);
    next.delete("subject");
    next.delete("topic");
    if (subject) next.set("subject", subject);
    if (topic) next.set("topic", topic);
    setParams(next);
  }
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  function clearFilters() {
    const next = new URLSearchParams(params);
    next.delete("q");
    next.delete("status");
    next.delete("sort");
    setParams(next, { replace: true });
  }
  const title = topicKey
    ? (selectedTopic?.name ?? "Topic")
    : subjectKey
      ? (selectedSubject?.name ?? "Subject")
      : "Your subjects";
  const count = topicKey
    ? (matchingTopic?.assignments.length ?? 0)
    : subjectKey
      ? (matchingSubject?.topics.length ?? 0)
      : groups.length;
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-6">
      <PageHeader title="My Assignments" actions={user?.grade ? <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">{user.grade}</span> : null} />
      <nav
        aria-label="Assignment breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs"
      >
        <button
          type="button"
          onClick={() => navigate()}
          aria-current={!subjectKey ? "page" : undefined}
          className="inline-flex min-h-9 items-center gap-2 font-medium text-slate-600 hover:text-slate-900"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          All subjects
        </button>
        {subjectKey && (
          <>
            <ChevronRight
              className="h-3 w-3 text-slate-400"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => navigate(subjectKey)}
              aria-current={!topicKey ? "page" : undefined}
              className="min-h-9 font-medium text-slate-600"
            >
              {selectedSubject?.name ?? "Subject"}
            </button>
          </>
        )}
        {topicKey && (
          <>
            <ChevronRight
              className="h-3 w-3 text-slate-400"
              aria-hidden="true"
            />
            <span
              aria-current="page"
              className="break-words font-medium text-slate-900"
            >
              <span className="line-clamp-1" title={title}>
                {learningTitle(title, selectedSubject?.name).title}
              </span>
            </span>
          </>
        )}
      </nav>
      <section
        aria-label="Assignment filters"
        className={`grid gap-3 ${topicKey ? "sm:grid-cols-[minmax(0,1fr)_190px_170px]" : "sm:grid-cols-[minmax(0,1fr)_220px]"}`}
      >
        <label className="relative">
          <span className="sr-only">Search assignments</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Search a subject, topic or assignment"
            className={`${CONTROL} pl-10`}
          />
        </label>
        <label>
          <span className="sr-only">Assignment status</span>
          <select
            aria-label="Assignment status"
            value={state}
            onChange={(e) =>
              update("status", e.target.value === "ALL" ? "" : e.target.value)
            }
            className={CONTROL}
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All statuses" : STATE_META[s].label}
              </option>
            ))}
          </select>
        </label>
        {topicKey && (
          <label>
            <span className="sr-only">Sort assignments</span>
            <select
              aria-label="Sort assignments"
              value={sort}
              onChange={(e) => update("sort", e.target.value)}
              className={CONTROL}
            >
              <option value="priority">Unfinished first</option>
              <option value="deadline">Soonest deadline</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="line-clamp-2 break-words text-lg font-semibold text-slate-900 [overflow-wrap:anywhere]"
            title={title}
          >
            {topicKey
              ? learningTitle(title, selectedSubject?.name).title
              : title}
          </h2>
          <p role="status" className="mt-1 text-xs text-slate-500">
            {error
              ? "Assignments unavailable"
              : loading
                ? "Loading your assignments…"
                : `${count} ${topicKey ? (count === 1 ? "assignment" : "assignments") : subjectKey ? (count === 1 ? "topic" : "topics") : count === 1 ? "subject" : "subjects"}`}
          </p>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-10 text-xs font-medium text-slate-600 underline underline-offset-4"
          >
            Clear filters
          </button>
        )}
        {subjectKey && !hasFilters && (
          <button
            type="button"
            onClick={() => (topicKey ? navigate(subjectKey) : navigate())}
            className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {topicKey ? "Back to topics" : "Back to subjects"}
          </button>
        )}
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          <p>Could not load your assignments and saved progress.</p>
          <button
            type="button"
            onClick={() => {
              void assignmentsQuery.refetch();
              void submissionsQuery.refetch();
            }}
            disabled={
              assignmentsQuery.isFetching || submissionsQuery.isFetching
            }
            className="mt-3 min-h-10 rounded-lg border border-red-200 bg-white px-4 font-semibold"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div
          role="status"
          aria-label="Loading assignment catalogue"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : count === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FolderOpen
            className="mx-auto h-8 w-8 text-slate-300"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-sm font-semibold text-slate-700">
            {assignments.length
              ? "No assignments match this view"
              : "No assignments available yet"}
          </h3>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {hasFilters
              ? "Try another search or clear the filters."
              : "Published assignments will appear under their subject and topic."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 min-h-10 text-sm font-medium underline"
            >
              Clear filters
            </button>
          )}
        </section>
      ) : !subjectKey ? (
        <section
          aria-label="Assignment subjects"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {groups.map((s) => {
            const { Icon, tone, key: iconKey } = subjectAppearance(s.name);
            return (
              <button
                type="button"
                key={s.key}
                aria-label={`Open ${s.name}`}
                onClick={() => navigate(s.key)}
                className="group relative min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 motion-reduce:transform-none sm:p-6"
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
                  >
                    <Icon
                      data-subject-icon={iconKey}
                      className="h-6 w-6"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>
                  <ChevronRight
                    className="h-4 w-4 text-slate-300 group-hover:text-slate-600"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mt-5 min-h-12 break-words text-base font-semibold leading-6 text-slate-900">
                  {s.name}
                </h3>
                <p className="mt-2 text-xs text-slate-500">
                  {s.topics.length} {s.topics.length === 1 ? "topic" : "topics"}{" "}
                  · {s.assignments.length}{" "}
                  {s.assignments.length === 1 ? "assignment" : "assignments"}
                </p>
                <GroupProgress
                  items={s.assignments}
                  submissions={submissions}
                />
              </button>
            );
          })}
        </section>
      ) : !topicKey ? (
        <section aria-label="Subject topics" className="grid gap-3">
          {matchingSubject?.topics.map((t) => {
            const { Icon, tone } = subjectAppearance(
              selectedSubject?.name ?? "",
            );
            return (
              <article
                key={t.key}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 sm:px-5"
              >
                <button
                  type="button"
                  aria-label={`Open topic: ${t.name}`}
                  onClick={() => navigate(subjectKey, t.key)}
                  className="group flex min-h-20 w-full min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:gap-4"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
                  >
                    <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <LearningTitle
                      value={t.name}
                      subject={selectedSubject?.name}
                    />
                  </div>
                  <span className="hidden shrink-0 text-xs text-slate-500 sm:block">
                    {t.assignments.length}{" "}
                    {t.assignments.length === 1 ? "assignment" : "assignments"}
                  </span>
                  <ChevronRight
                    size={17}
                    className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
                <div className="pl-14 sm:pl-[60px]">
                  <p className="text-xs text-slate-500 sm:hidden">
                    {t.assignments.length}{" "}
                    {t.assignments.length === 1 ? "assignment" : "assignments"}
                  </p>
                  <FullLearningTitle
                    value={t.name}
                    subject={selectedSubject?.name}
                  />
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section aria-label="Topic assignments" className="space-y-3">
          {matchingTopic?.assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              submission={submissions.get(a.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
