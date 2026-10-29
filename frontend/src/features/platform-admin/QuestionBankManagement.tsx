import { CurriculumIngestion } from "./CurriculumIngestion";
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
const grades = [6, 7, 8, 9, 10, 11, 12].map((g) => `Grade ${g}`);
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
    [picked, setPicked] = useState<string[]>([]),
    [targetGrades, setTargetGrades] = useState<string[]>(grades),
    [sourceScope, setSourceScope] = useState<"ALL" | "SELECTED">("ALL"),
    [mappingsReviewed, setMappingsReviewed] = useState(false),
    [discoveryErrors, setDiscoveryErrors] = useState<
      { url: string; message: string; grade?: string }[]
    >([]);
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
    mutationFn: (kind: "QUESTIONS" | "CARDS" | "BOTH") =>
      contentLibraryApi.generate(generationIds, kind, count, generationTopic),
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
    onMutate: () => {
      setMappingsReviewed(false);
      setPicked([]);
    },
    mutationFn: (file?: File) => contentLibraryApi.discover(file, targetGrades),
    onSuccess: (r) => {
      setCandidates(r.candidates);
      setDiscoveryErrors(r.errors);
      setMappingsReviewed(false);
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
    mutationFn: (all: boolean) =>
      contentLibraryApi.imports(
        candidates
          .filter((c) =>
            all ? isConfirmed(c) : picked.includes(c.url) && isConfirmed(c),
          )
          .map((c) => ({
            url: c.url,
            subject: c.subject!.trim(),
            grade: c.grade!,
          })),
      ),
    onSuccess: (r) => {
      setNotice(
        `${r.queued ?? 0} official curriculum imports queued; ${r.skipped ?? 0} already indexed or queued sources skipped.`,
      );
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
  const eligibleSources = sources.filter((s) => targetGrades.includes(s.grade));
  const generationIds =
    sourceScope === "ALL"
      ? eligibleSources.map((s) => s.id)
      : sourceIds.filter((id) => eligibleSources.some((s) => s.id === id));
  const isConfirmed = (c: Candidate) =>
    !!c.grade &&
    targetGrades.includes(c.grade) &&
    !!c.subject?.trim() &&
    c.subject.trim().length <= 120 &&
    !c.issue;
  const confirmedCandidates = candidates.filter(isConfirmed);
  const sameSelection =
    !selected.length ||
    selected.every(
      (q) => q.grade === selected[0].grade && q.subject === selected[0].subject,
    );
  const tabs = [
    ["questions", "Questions", BookMarked],
    ["coverage", "Curriculum ingestion", Layers],
    ["sources", "Official source tools", FileSearch],
    ["jobs", "Generation jobs", Clock],
    ["cards", "Memory cards", Brain],
    ["schools", "School access", School],
  ] as const;
  return (
    <div className="space-y-5 pb-12 text-slate-800">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Content management · Grades 6–12
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Question Bank</h1>
          <p className="mt-2 text-sm text-slate-500">
            One reviewed repository for independent learners and subscribed
            schools.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white"
          onClick={() => changeView("coverage")}
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
      {view === "coverage" ? (
        <CurriculumIngestion />
      ) : view === "schools" ? (
        <SchoolActivation />
      ) : view === "cards" ? (
        <RecallCardsManager />
      ) : view === "sources" ? (
        <div className="space-y-5">
          <section
            className="space-y-4 rounded-xl border bg-white p-5"
            aria-label="Bulk curriculum setup"
          >
            <div>
              <h2 className="font-semibold">Set up curriculum across grades</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose your grades once. Discover their actual subjects, import
                confirmed designs together, then generate across all indexed
                sources. Individual PDF uploads are a fallback.
              </p>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Target curriculum grades"
            >
              <button
                className={control}
                disabled={discover.isPending}
                onClick={() => {
                  setTargetGrades(grades);
                  setMappingsReviewed(false);
                }}
              >
                Select all grades
              </button>
              {grades.map((g) => (
                <label
                  key={g}
                  className={`${control} inline-flex items-center gap-2 ${targetGrades.includes(g) ? "border-blue-300 bg-blue-50" : ""}`}
                >
                  <input
                    aria-label={`Include ${g}`}
                    disabled={discover.isPending}
                    type="checkbox"
                    checked={targetGrades.includes(g)}
                    onChange={(e) => {
                      setTargetGrades((old) =>
                        e.target.checked
                          ? [...old, g]
                          : old.filter((v) => v !== g),
                      );
                      setMappingsReviewed(false);
                    }}
                  />
                  {g}
                </label>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="p-2">Grade</th>
                    <th className="p-2">Subjects discovered / indexed</th>
                    <th className="p-2">Indexed sources</th>
                  </tr>
                </thead>
                <tbody>
                  {targetGrades.map((g) => {
                    const names = [
                      ...new Set([
                        ...sources
                          .filter((s) => s.grade === g)
                          .map((s) => s.subject),
                        ...candidates
                          .filter((c) => c.grade === g && c.subject)
                          .map((c) => c.subject!),
                      ]),
                    ].sort();
                    return (
                      <tr key={g} className="border-t">
                        <th className="whitespace-nowrap p-2">{g}</th>
                        <td className="max-w-xl p-2 leading-6">
                          {names.join(" · ") ||
                            "Discover official designs to identify this grade’s subjects."}
                        </td>
                        <td className="p-2">
                          {sources.filter((s) => s.grade === g).length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="space-y-4 rounded-xl border bg-white p-5">
            <div>
              <h2 className="font-semibold">Import official KICD designs</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Discover Grade 6–12 subject designs from KICD, then confirm each
                grade and subject. The general framework alone is not a subject
                source. External or inaccessible documents are not silently
                invented.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={discover.isPending || !targetGrades.length}
                className={control}
                onClick={() => discover.mutate(undefined)}
              >
                <FileSearch size={16} className="mr-2 inline" />
                {discover.isPending
                  ? "Discovering official links…"
                  : "Discover KICD subjects"}
              </button>
              <label className={control + " cursor-pointer"}>
                One saved KICD directory
                <input
                  aria-label="KICD directory HTML"
                  className="sr-only"
                  type="file"
                  accept=".html,text/html"
                  disabled={discover.isPending || !targetGrades.length}
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
            {discoveryErrors.length > 0 && (
              <section
                className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                aria-label="Curriculum discovery exceptions"
              >
                <h3 className="text-sm font-semibold">
                  Exceptions to review · {discoveryErrors.length}
                </h3>
                <ul className="mt-2 space-y-2 text-xs leading-6">
                  {discoveryErrors.map((e, i) => (
                    <li key={i}>
                      <strong>{e.grade ?? "Directory"}:</strong> {e.message}{" "}
                      <a
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                        href={e.url}
                      >
                        Open official page
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {candidates.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold">
                    {confirmedCandidates.length} mapped designs ·{" "}
                    {candidates.length - confirmedCandidates.length} need
                    correction or are outside selected grades
                  </p>
                  <label className="mt-3 flex items-start gap-2 text-xs leading-6">
                    <input
                      className="mt-1"
                      aria-label="Confirm bulk curriculum mappings"
                      disabled={discover.isPending}
                      type="checkbox"
                      checked={mappingsReviewed}
                      onChange={(e) => setMappingsReviewed(e.target.checked)}
                    />
                    I have reviewed the grade and subject mappings below.
                  </label>
                </div>
                <button
                  className={control + " disabled:opacity-40"}
                  disabled={
                    !confirmedCandidates.length ||
                    !mappingsReviewed ||
                    discover.isPending ||
                    importing.isPending
                  }
                  onClick={() => importing.mutate(true)}
                >
                  Import all {confirmedCandidates.length} confirmed designs
                </button>
              </div>
            )}
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
                    disabled={discover.isPending || !isConfirmed(c)}
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
                    disabled={discover.isPending}
                    className={control}
                    value={c.grade ?? ""}
                    onChange={(e) => {
                      setMappingsReviewed(false);
                      setCandidates((cs) =>
                        cs.map((v, j) =>
                          j === i ? { ...v, grade: e.target.value } : v,
                        ),
                      );
                    }}
                  >
                    <option value="">Choose grade</option>
                    {grades.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <div>
                    <input
                      aria-label={`Subject for ${c.title}`}
                      disabled={discover.isPending}
                      className={control + " w-full"}
                      value={c.subject ?? ""}
                      onChange={(e) => {
                        setMappingsReviewed(false);
                        setCandidates((cs) =>
                          cs.map((v, j) =>
                            j === i ? { ...v, subject: e.target.value } : v,
                          ),
                        );
                      }}
                    />
                    <a
                      className="mt-2 block break-all text-xs text-blue-700"
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {c.title}
                    </a>
                    {c.issue && (
                      <p className="mt-2 text-xs text-amber-800">
                        {c.issue}{" "}
                        <button
                          className="underline"
                          disabled={
                            discover.isPending || !c.grade || !c.subject?.trim()
                          }
                          onClick={() => {
                            setMappingsReviewed(false);
                            setCandidates((cs) =>
                              cs.map((v, j) =>
                                j === i ? { ...v, issue: undefined } : v,
                              ),
                            );
                          }}
                        >
                          Confirm corrected mapping
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {candidates.length > 0 && (
              <button
                className={control}
                disabled={
                  !picked.length ||
                  discover.isPending ||
                  importing.isPending ||
                  !mappingsReviewed
                }
                onClick={() => importing.mutate(false)}
              >
                Import {picked.length} reviewed sources
              </button>
            )}
          </section>
          <section className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  Generate from indexed curriculum
                </h2>
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
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label className="min-w-0 w-full text-sm sm:w-auto">
                Generation scope{" "}
                <select
                  aria-label="Generation source scope"
                  className={
                    control +
                    " mt-2 w-full min-w-0 max-w-full sm:ml-2 sm:mt-0 sm:w-auto"
                  }
                  value={sourceScope}
                  onChange={(e) =>
                    setSourceScope(e.target.value as "ALL" | "SELECTED")
                  }
                >
                  <option value="ALL">
                    All indexed sources in selected grades
                  </option>
                  <option value="SELECTED">Choose individual sources</option>
                </select>
              </label>
              <span className="text-xs text-slate-500">
                {generationIds.length} sources across {targetGrades.length}{" "}
                selected grades
              </span>
            </div>
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
                  !generationIds.length ||
                  generation.isPending ||
                  count < 5 ||
                  count > 100
                }
                className={control + " text-blue-800 disabled:opacity-40"}
                onClick={() => generation.mutate("QUESTIONS")}
              >
                Generate questions · {generationIds.length} sources
              </button>
              <button
                disabled={!generationIds.length || generation.isPending}
                className={control + " disabled:opacity-40"}
                onClick={() => generation.mutate("CARDS")}
              >
                Generate memory cards
              </button>
              <button
                className={
                  control + " bg-blue-700 text-white disabled:opacity-40"
                }
                disabled={
                  !generationIds.length ||
                  generation.isPending ||
                  count < 5 ||
                  count > 100
                }
                onClick={() => generation.mutate("BOTH")}
              >
                Generate questions & cards
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Memory-card batches are capped at 12 per source for careful
              review. Questions can be generated repeatedly to grow the rotating
              pool.
            </p>
            <div className="mt-4 max-h-[360px] divide-y overflow-y-auto">
              {eligibleSources.map((source) => {
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
                      checked={generationIds.includes(source.id)}
                      disabled={!grades.includes(source.grade)}
                      onChange={(e) => {
                        const ids = generationIds;
                        setSourceScope("SELECTED");
                        setSourceIds(
                          e.target.checked
                            ? [...ids, source.id]
                            : ids.filter((id) => id !== source.id),
                        );
                      }}
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
                          {item.curriculumUnitId && (
                            <p className="text-xs text-blue-700">
                              AI-generated · curriculum outcome #
                              {item.curriculumUnitId} · source documents{" "}
                              {item.curriculumSourceIds?.join(", ")}
                            </p>
                          )}
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
