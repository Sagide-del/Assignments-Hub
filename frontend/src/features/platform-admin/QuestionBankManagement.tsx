import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked,
  Layers,
  Brain,
  School,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  FileSearch,
  RefreshCw,
} from "lucide-react";
import {
  contentLibraryApi,
  type Candidate,
} from "../../api/content-library.api";
import {
  questionBankAdminApi,
  type QuestionBankItem,
  type QuestionBankStatus,
} from "../../api/question-bank.api";
import { apiErrorMessage } from "../../api/axios";
import { RichContent } from "../../components/ui/RichContent";
import { RecallCardsManager } from "./RecallCardsManager";
import { SchoolActivation } from "./SchoolActivation";
import { QuestionBankLegacy } from "./QuestionBankLegacy";
const control =
  "min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";
const grades = [7, 8, 9, 10, 11, 12].map((g) => `Grade ${g}`);
export function QuestionBankManagement() {
  const [params, setParams] = useSearchParams(),
    view = params.get("view") ?? "questions",
    client = useQueryClient();
  const [grade, setGrade] = useState(""),
    [subject, setSubject] = useState(""),
    [topic, setTopic] = useState(""),
    [status, setStatus] = useState("GENERATED"),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<QuestionBankItem[]>([]),
    [title, setTitle] = useState(""),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState<QuestionBankItem | null>(null),
    [legacy, setLegacy] = useState(false),
    [sourceIds, setSourceIds] = useState<number[]>([]),
    [count, setCount] = useState(30),
    [generationTopic, setGenerationTopic] = useState(""),
    [candidates, setCandidates] = useState<Candidate[]>([]),
    [picked, setPicked] = useState<string[]>([]);
  const overview = useQuery({
    queryKey: ["content-library"],
    queryFn: contentLibraryApi.overview,
    refetchInterval: (q) =>
      q.state.data?.jobs.some((j) => ["QUEUED", "RUNNING"].includes(j.status))
        ? 4000
        : false,
  });
  const list = useQuery({
    queryKey: ["question-bank-admin", grade, subject, topic, status, page],
    queryFn: () =>
      questionBankAdminApi.list({
        grade: grade || undefined,
        subject: subject || undefined,
        topic: topic || undefined,
        status: (status || undefined) as QuestionBankStatus | undefined,
        skip: page * 25,
        take: 25,
      }),
    enabled: view === "questions",
  });
  const error = (e: unknown) =>
    setNotice(apiErrorMessage(e, "The operation could not be completed."));
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["question-bank-admin"] });
    void client.invalidateQueries({ queryKey: ["content-library"] });
  };
  const changeView = (value: string) => {
    setParams({ view: value });
    setLegacy(false);
  };
  const review = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: number;
      action: "approve" | "reject";
    }) =>
      action === "approve"
        ? questionBankAdminApi.approve(id)
        : questionBankAdminApi.reject(id),
    onSuccess: () => {
      refresh();
      setSelected([]);
    },
    onError: error,
  });
  const save = useMutation({
    mutationFn: () =>
      questionBankAdminApi.update(editing!.id, {
        questionText: editing!.questionText,
        options: editing!.options ?? undefined,
        correctAnswer: editing!.correctAnswer ?? undefined,
        explanation: editing!.explanation ?? undefined,
        topic: editing!.topic,
        points: editing!.points,
        hint: editing!.hint ?? undefined,
      }),
    onSuccess: () => {
      setEditing(null);
      setSelected([]);
      refresh();
      setNotice("Changes saved. This question needs approval again.");
    },
    onError: error,
  });
  const publish = useMutation({
    mutationFn: () =>
      questionBankAdminApi.publish({
        questionIds: selected.map((q) => q.id),
        title,
      }),
    onSuccess: (r) => {
      setNotice(
        `Published assignment #${r.assignmentId} with ${r.questionCount} questions.`,
      );
      setSelected([]);
      setTitle("");
      refresh();
    },
    onError: error,
  });
  const generation = useMutation({
    mutationFn: (kind: "QUESTIONS" | "CARDS") =>
      contentLibraryApi.generate(sourceIds, kind, count, generationTopic),
    onSuccess: () => {
      setNotice(
        "Generation queued. You can leave this page; progress is saved.",
      );
      refresh();
      changeView("jobs");
    },
    onError: error,
  });
  const discover = useMutation({
    mutationFn: (file?: File) => contentLibraryApi.discover(file),
    onSuccess: (r) => {
      setCandidates(
        r.candidates.map((c) => ({
          ...c,
          subject: c.title
            .replace(/\.pdf$/i, "")
            .replace(/[_-]/g, " ")
            .replace(
              /\b(?:grade|designs?|curriculum|20\d\d|7|8|9|10|11|12)\b/gi,
              "",
            )
            .replace(/\s+/g, " ")
            .trim(),
        })),
      );
      setPicked([]);
      setNotice(
        r.errors.length
          ? `${r.candidates.length} links found; ${r.errors.length} directory pages could not be retrieved. Review each mapping before import.`
          : `${r.candidates.length} official PDF links found. Review grade and subject before import.`,
      );
    },
    onError: error,
  });
  const importing = useMutation({
    mutationFn: () =>
      contentLibraryApi.imports(
        candidates
          .filter((c) => picked.includes(c.url))
          .map((c) => ({
            url: c.url,
            subject: c.subject!.trim(),
            grade: c.grade!,
          })),
      ),
    onSuccess: () => {
      setNotice("Official curriculum imports queued.");
      setPicked([]);
      refresh();
      changeView("jobs");
    },
    onError: error,
  });
  const retry = useMutation({
    mutationFn: contentLibraryApi.retry,
    onSuccess: refresh,
    onError: error,
  });
  const sources = overview.data?.sources ?? [],
    coverage = overview.data?.coverage ?? [],
    rows = list.data?.items ?? [],
    subjects = [
      ...new Set([
        ...sources.map((s) => s.subject),
        ...coverage.map((c) => c.subject),
      ]),
    ].sort();
  const sameSelection =
    !selected.length ||
    selected.every(
      (q) => q.grade === selected[0].grade && q.subject === selected[0].subject,
    );
  const tabs = [
    ["questions", "Questions", BookMarked],
    ["sources", "Curriculum sources", Layers],
    ["jobs", "Generation jobs", Clock],
    ["cards", "Memory cards", Brain],
    ["schools", "School access", School],
  ] as const;
  return (
    <div className="space-y-5 pb-12 text-slate-800">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Content management · Grades 7–12
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Question Bank</h1>
          <p className="mt-2 text-sm text-slate-500">
            One reviewed repository for independent learners and subscribed
            schools.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white"
          onClick={() => changeView("sources")}
        >
          <Plus size={16} />
          Generate content
        </button>
      </header>
      <nav
        className="flex gap-1 overflow-x-auto border-b"
        aria-label="Content library"
      >
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm ${view === key ? "border-blue-700 font-semibold text-blue-700" : "border-transparent text-slate-500"}`}
            onClick={() => changeView(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border bg-white p-4 text-sm"
        >
          <span>{notice}</span>
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {overview.isError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 p-4 text-sm"
        >
          Content library could not load. The backend may still be deploying.{" "}
          <button className="underline" onClick={() => overview.refetch()}>
            Retry
          </button>
        </p>
      )}
      {view === "schools" ? (
        <SchoolActivation />
      ) : view === "cards" ? (
        <RecallCardsManager />
      ) : view === "sources" ? (
        <div className="space-y-5">
          <section className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">Curriculum coverage</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Choose verified grade-specific sources. Questions and memory
                  cards are saved as drafts.
                </p>
              </div>
              <button
                onClick={() => setLegacy(!legacy)}
                className="text-sm underline"
              >
                Upload a subject PDF or paste text
              </button>
            </div>
            {legacy && (
              <div className="mt-5">
                <QuestionBankLegacy />
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <label className="text-xs">
                Questions per source
                <input
                  aria-label="Generation count"
                  type="number"
                  min={5}
                  max={100}
                  className={control + " ml-2 w-20"}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
              <input
                aria-label="Generation topic"
                className={control}
                value={generationTopic}
                onChange={(e) => setGenerationTopic(e.target.value)}
                placeholder="All source topics, or focus on a topic"
              />
              <button
                disabled={
                  !sourceIds.length ||
                  generation.isPending ||
                  count < 5 ||
                  count > 100
                }
                className={
                  control + " bg-blue-700 text-blue-800 disabled:opacity-40"
                }
                onClick={() => generation.mutate("QUESTIONS")}
              >
                Generate questions · {sourceIds.length} sources
              </button>
              <button
                disabled={!sourceIds.length || generation.isPending}
                className={control + " disabled:opacity-40"}
                onClick={() => generation.mutate("CARDS")}
              >
                Generate memory cards
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Memory-card batches are capped at 12 per source for careful
              review. Questions can be generated repeatedly to grow the rotating
              pool.
            </p>
            <div className="mt-4 divide-y">
              {sources.map((source) => {
                const matching = coverage.filter(
                  (c) =>
                    c.grade === source.grade && c.subject === source.subject,
                );
                return (
                  <label
                    key={source.id}
                    className="flex flex-wrap items-center gap-3 py-4 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={sourceIds.includes(source.id)}
                      disabled={!grades.includes(source.grade)}
                      onChange={(e) =>
                        setSourceIds(
                          e.target.checked
                            ? [...sourceIds, source.id]
                            : sourceIds.filter((id) => id !== source.id),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <strong>
                        {source.grade} · {source.subject}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {source.title} · {source._count.chunks} indexed sections
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {matching
                        .filter((c) => c.status === "APPROVED")
                        .reduce((n, c) => n + c._count._all, 0)}{" "}
                      approved questions
                    </span>
                  </label>
                );
              })}
              {!sources.length && (
                <p className="p-6 text-sm text-slate-500">
                  Import official designs below, or upload your first subject
                  source.
                </p>
              )}
            </div>
          </section>
          <section className="space-y-4 rounded-xl border bg-white p-5">
            <div>
              <h2 className="font-semibold">Import official KICD designs</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Discover Grade 7–12 subject designs from KICD, then confirm each
                grade and subject. The general framework alone is not a subject
                source. External or inaccessible documents are not silently
                invented.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={discover.isPending}
                className={control}
                onClick={() => discover.mutate(undefined)}
              >
                <FileSearch size={16} className="mr-2 inline" />
                {discover.isPending
                  ? "Discovering official links…"
                  : "Discover KICD subjects"}
              </button>
              <label className={control + " cursor-pointer"}>
                Use saved KICD HTML
                <input
                  aria-label="KICD directory HTML"
                  className="sr-only"
                  type="file"
                  accept=".html,text/html"
                  disabled={discover.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) discover.mutate(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <Link className={control} to="/platform/curriculum-library">
                Framework & legacy curriculum tools
              </Link>
            </div>
            <div className="max-h-[500px] space-y-3 overflow-y-auto">
              {candidates.map((c, i) => (
                <div
                  key={c.url}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[24px_140px_1fr]"
                >
                  <input
                    aria-label={`Import ${c.title}`}
                    type="checkbox"
                    checked={picked.includes(c.url)}
                    disabled={!c.grade || !c.subject?.trim()}
                    onChange={(e) =>
                      setPicked(
                        e.target.checked
                          ? [...picked, c.url]
                          : picked.filter((url) => url !== c.url),
                      )
                    }
                  />
                  <select
                    aria-label={`Grade for ${c.title}`}
                    className={control}
                    value={c.grade ?? ""}
                    onChange={(e) =>
                      setCandidates((cs) =>
                        cs.map((v, j) =>
                          j === i ? { ...v, grade: e.target.value } : v,
                        ),
                      )
                    }
                  >
                    <option value="">Choose grade</option>
                    {grades.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <div>
                    <input
                      aria-label={`Subject for ${c.title}`}
                      className={control + " w-full"}
                      value={c.subject ?? ""}
                      onChange={(e) =>
                        setCandidates((cs) =>
                          cs.map((v, j) =>
                            j === i ? { ...v, subject: e.target.value } : v,
                          ),
                        )
                      }
                    />
                    <a
                      className="mt-2 block break-all text-xs text-blue-700"
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {c.title}
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {candidates.length > 0 && (
              <button
                className={control}
                disabled={!picked.length || importing.isPending}
                onClick={() => importing.mutate()}
              >
                Import {picked.length} reviewed sources
              </button>
            )}
          </section>
        </div>
      ) : view === "jobs" ? (
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex justify-between border-b p-5">
            <h2 className="font-semibold">Generation queue</h2>
            <button onClick={refresh} className="text-sm">
              <RefreshCw size={16} className="mr-2 inline" />
              Refresh
            </button>
          </div>
          {(overview.data?.jobs ?? []).map((job) => (
            <article
              key={job.id}
              className="flex flex-wrap justify-between gap-3 border-b p-5 text-sm"
            >
              <div>
                <strong>
                  {job.input.grade} · {job.input.subject}
                </strong>
                <p className="mt-1 text-xs text-slate-500">
                  {job.kind} · {job.input.topic ?? "Official source import"} ·{" "}
                  {job.status}
                  {job.result?.count !== undefined
                    ? ` · ${job.result.count} created`
                    : ""}
                </p>
                {job.error && (
                  <p
                    role="alert"
                    className="mt-2 max-w-xl text-xs text-red-700"
                  >
                    {job.error}
                  </p>
                )}
              </div>
              {job.status === "FAILED" && (
                <button
                  disabled={retry.isPending}
                  className={control}
                  onClick={() => retry.mutate(job.id)}
                >
                  Retry
                </button>
              )}
            </article>
          ))}
          {!overview.data?.jobs.length && (
            <p className="p-10 text-sm text-slate-500">
              No generation jobs yet.
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [
                "Saved questions",
                coverage.reduce((n, c) => n + c._count._all, 0),
              ],
              [
                "Ready for students",
                coverage
                  .filter((c) => c.status === "APPROVED")
                  .reduce((n, c) => n + c._count._all, 0),
              ],
              [
                "Needs review",
                coverage
                  .filter((c) => c.status === "GENERATED")
                  .reduce((n, c) => n + c._count._all, 0),
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-white p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <section className="rounded-xl border bg-white">
            <div className="flex flex-wrap gap-3 border-b p-4">
              <select
                aria-label="Question grade"
                className={control}
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value);
                  setPage(0);
                  setSelected([]);
                }}
              >
                <option value="">All grades</option>
                {grades.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <select
                aria-label="Question subject"
                className={control}
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setPage(0);
                  setSelected([]);
                }}
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                aria-label="Filter question topic"
                className={control + " min-w-0 flex-1"}
                placeholder="Find a topic"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setPage(0);
                }}
              />
              <select
                aria-label="Review status"
                className={control}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All statuses</option>
                <option value="GENERATED">Needs review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div
              className="max-h-[70vh] overflow-y-auto"
              aria-label="Question results"
            >
              {list.isLoading ? (
                <p className="p-10">Loading questions…</p>
              ) : list.isError ? (
                <p role="alert" className="p-6">
                  Could not load questions.{" "}
                  <button onClick={() => list.refetch()}>Retry</button>
                </p>
              ) : rows.length ? (
                rows.map((item) => (
                  <article
                    key={item.id}
                    className="flex items-start gap-3 border-b p-5"
                  >
                    <input
                      aria-label={`Select question ${item.id}`}
                      className="mt-1"
                      type="checkbox"
                      disabled={item.status !== "APPROVED"}
                      checked={selected.some((q) => q.id === item.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, item]
                            : selected.filter((q) => q.id !== item.id),
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">
                        {item.grade} · {item.subject} · {item.topic}{" "}
                        <span className="ml-2 rounded bg-slate-100 px-2 py-1">
                          {item.status === "GENERATED"
                            ? "Needs review"
                            : item.status.toLowerCase()}
                        </span>
                      </p>
                      <p className="mt-3 text-sm font-medium leading-6">
                        {item.questionText}
                      </p>
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-blue-700">
                          Preview question & answer
                        </summary>
                        <div className="mt-3 max-w-2xl space-y-3">
                          {item.contentHtml && (
                            <RichContent html={item.contentHtml} />
                          )}{" "}
                          {item.diagramUrl && (
                            <img
                              className="max-h-80 max-w-full object-contain"
                              src={item.diagramUrl}
                              alt={item.diagramAlt ?? "Question illustration"}
                            />
                          )}
                          <ol className="space-y-2">
                            {item.options?.map((o, i) => (
                              <li
                                key={i}
                                className={`rounded-lg border p-3 ${o === item.correctAnswer ? "border-emerald-200 bg-emerald-50" : ""}`}
                              >
                                {String.fromCharCode(65 + i)}. {o}
                              </li>
                            ))}
                          </ol>
                          <p>
                            <strong>Answer:</strong> {item.correctAnswer}
                          </p>
                          <p className="leading-7 text-slate-600">
                            {item.explanation}
                          </p>
                          <p className="text-xs text-slate-400">
                            Source {item.sourceDocumentId ?? "record"} ·{" "}
                            {item.points} marks
                          </p>
                        </div>
                      </details>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs">
                        <button
                          onClick={() =>
                            setEditing({
                              ...item,
                              options: item.options ? [...item.options] : null,
                            })
                          }
                          className="font-medium text-blue-700"
                        >
                          Edit & review
                        </button>
                        {item.status !== "APPROVED" && (
                          <button
                            disabled={review.isPending}
                            onClick={() =>
                              review.mutate({ id: item.id, action: "approve" })
                            }
                            className="inline-flex items-center gap-1 text-emerald-700"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                        )}
                        {item.status !== "REJECTED" && (
                          <button
                            disabled={review.isPending}
                            onClick={() =>
                              review.mutate({ id: item.id, action: "reject" })
                            }
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="p-10 text-center text-sm text-slate-500">
                  No questions match these filters. Select curriculum sources to
                  generate a batch.
                </p>
              )}
            </div>
            <footer className="flex items-center justify-between gap-3 p-4 text-xs text-slate-500">
              <span>
                {list.data?.total ?? 0} matching questions · Page {page + 1}
              </span>
              <div className="flex gap-2">
                <button
                  aria-label="Previous question page"
                  disabled={!page}
                  onClick={() => setPage((p) => p - 1)}
                  className={control + " disabled:opacity-30"}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="Next question page"
                  disabled={(page + 1) * 25 >= (list.data?.total ?? 0)}
                  onClick={() => setPage((p) => p + 1)}
                  className={control + " disabled:opacity-30"}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          </section>
          {selected.length > 0 && (
            <section className="sticky bottom-3 space-y-3 rounded-xl border bg-white p-4 shadow-lg">
              <p className="text-sm font-semibold">
                {selected.length} questions ·{" "}
                {selected.reduce((n, q) => n + q.points, 0)} marks ·{" "}
                {selected[0].grade} {selected[0].subject}
              </p>
              {!sameSelection && (
                <p role="alert" className="text-sm text-red-700">
                  Select one grade and subject per assignment.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <input
                  aria-label="Assignment title"
                  placeholder="Assignment title"
                  className={control + " min-w-0 flex-1"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <button
                  disabled={
                    !sameSelection || !title.trim() || publish.isPending
                  }
                  className={control + " disabled:opacity-40"}
                  onClick={() => publish.mutate()}
                >
                  Publish assignment
                </button>
                <button
                  onClick={() => setSelected([])}
                  className="text-xs underline"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Independent practice uses approved questions automatically in
                rotating batches of 30. Publishing an assignment is optional.
              </p>
            </section>
          )}
        </>
      )}
      {editing && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Edit bank question"
        >
          <form
            className="mx-auto max-w-2xl space-y-4 rounded-xl bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="flex justify-between">
              <h2 className="font-semibold">Edit question · #{editing.id}</h2>
              <button type="button" onClick={() => setEditing(null)}>
                Close
              </button>
            </div>
            <label className="block text-xs">
              Question
              <textarea
                aria-label="Question text"
                className={control + " mt-2 w-full"}
                rows={4}
                value={editing.questionText}
                onChange={(e) =>
                  setEditing({ ...editing, questionText: e.target.value })
                }
              />
            </label>
            {editing.options?.map((o, i) => (
              <label className="block text-xs" key={i}>
                Option {String.fromCharCode(65 + i)}
                <input
                  className={control + " mt-1 w-full"}
                  value={o}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      options: editing.options!.map((v, j) =>
                        j === i ? e.target.value : v,
                      ),
                    })
                  }
                />
              </label>
            ))}
            <label className="block text-xs">
              Correct answer
              <input
                className={control + " mt-1 w-full"}
                value={editing.correctAnswer ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, correctAnswer: e.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              Explanation
              <textarea
                className={control + " mt-1 w-full"}
                rows={4}
                value={editing.explanation ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, explanation: e.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              Topic
              <input
                className={control + " mt-1 w-full"}
                value={editing.topic}
                onChange={(e) =>
                  setEditing({ ...editing, topic: e.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              Marks
              <input
                className={control + " ml-2 w-24"}
                type="number"
                min={1}
                max={1000}
                value={editing.points}
                onChange={(e) =>
                  setEditing({ ...editing, points: Number(e.target.value) })
                }
              />
            </label>
            <button
              disabled={save.isPending}
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm text-white"
            >
              Save for review
            </button>
          </form>
        </div>
      )}
      <details className="border-t pt-4 text-xs text-slate-500">
        <summary className="cursor-pointer">Advanced & legacy tools</summary>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link to="/platform/ai-management">AI settings</Link>
          <Link to="/platform/independent-assignments">
            Authored assignments
          </Link>
          <Link to="/platform/curriculum-library">
            Legacy curriculum library
          </Link>
          <Link to="/platform/private-tutor">Tutor management</Link>
        </div>
      </details>
    </div>
  );
}
export default QuestionBankManagement;
