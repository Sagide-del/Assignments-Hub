import { CreateContentWorkspace } from "./CreateContentWorkspace";
import { CurriculumIngestion } from "./CurriculumIngestion";
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked,
  Layers,
  Brain,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  FileSearch,
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
const jobLabels: Record<string, string> = {
  PREPARE_GRADE: "Prepare grade curriculum",
  PUBLISH_CONTENT: "Publish content",
  INGEST_GITHUB: "Prepare saved curriculum",
  INGEST_URL: "Import source",
  INGEST_FILE: "Read uploaded file",
  INDEX_ASSET: "Index curriculum",
  OUTCOME_QUESTIONS: "Generate questions",
  OUTCOME_CARDS: "Generate recall cards",
  QUESTIONS: "Generate questions",
  CARDS: "Generate recall cards",
};
const grades = [6, 7, 8, 9, 10, 11, 12].map((g) => `Grade ${g}`);
export function QuestionBankManagement() {
  const [params, setParams] = useSearchParams(),
    view =
      params.get("view") === "coverage"
        ? "create"
        : (params.get("view") ?? "questions"),
    client = useQueryClient();
  const [grade, setGrade] = useState(params.get("grade") ?? ""),
    [subject, setSubject] = useState(""),
    [topic, setTopic] = useState(""),
    [status, setStatus] = useState(
      params.get("status") === "APPROVED" ? "APPROVED" : "GENERATED",
    ),
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
  const [draftIds, setDraftIds] = useState<number[]>([]);
  const [allDrafts, setAllDrafts] = useState<{
    before: string;
    count: number;
    excludedIds: number[];
  } | null>(null);
  const [allApproved, setAllApproved] = useState<{
    before: string;
    count: number;
    excludedIds: number[];
  } | null>(null);
  const [publishAudience, setPublishAudience] = useState<
    "INDEPENDENT" | "SCHOOLS" | "BOTH"
  >("INDEPENDENT");
  const [publishSchoolScope, setPublishSchoolScope] = useState<
    "ALL" | "SELECTED"
  >("ALL");
  const [publishSchoolIds, setPublishSchoolIds] = useState<number[]>([]);
  const publicationTargets = useQuery({
    queryKey: ["question-bank-publication-targets"],
    queryFn: questionBankAdminApi.publicationTargets,
    enabled:
      view === "questions" &&
      publishAudience !== "INDEPENDENT" &&
      (selected.length > 0 || !!allApproved),
  });
  const [approvalIssues, setApprovalIssues] = useState<
    { id: number; reason: string }[]
  >([]);
  useEffect(() => {
    setDraftIds([]);
    setAllDrafts(null);
    setAllApproved(null);
    setApprovalIssues([]);
    setSelected([]);
  }, [grade, subject, topic, status]);
  useEffect(() => {
    const requestedGrade = params.get("grade");
    if (
      view === "questions" &&
      requestedGrade &&
      grades.includes(requestedGrade)
    ) {
      setGrade(requestedGrade);
      setSubject("");
      setTopic("");
      setStatus(params.get("status") === "APPROVED" ? "APPROVED" : "GENERATED");
      setPage(0);
      setSelected([]);
    }
  }, [params, view]);
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
  const bulkApproval = useMutation({
    mutationFn: () =>
      allDrafts
        ? questionBankAdminApi.bulkApprove({
            scope: "FILTER",
            before: allDrafts.before,
            excludedIds: allDrafts.excludedIds,
            filters: {
              grade: grade || undefined,
              subject: subject || undefined,
              topic: topic || undefined,
            },
          })
        : questionBankAdminApi.bulkApprove({ scope: "IDS", ids: draftIds }),
    onSuccess: (result) => {
      const expected = allDrafts
        ? allDrafts.count - allDrafts.excludedIds.length
        : draftIds.length;
      const skipped = Math.max(
        result.changed,
        expected - result.approved - result.invalid,
      );
      setNotice(
        `${result.approved} questions approved${result.invalid ? ` · ${result.invalid} need correction` : ""}${skipped ? ` · ${skipped} changed or no longer eligible and were skipped` : ""}. Approved questions are ready to publish to individual learners or schools.`,
      );
      setDraftIds([]);
      setAllDrafts(null);
      setPage(0);
      setApprovalIssues(result.issues);
    },
    onError: error,
    onSettled: refresh,
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
      questionBankAdminApi.publishContent({
        ...(allApproved
          ? {
              scope: "FILTER" as const,
              before: allApproved.before,
              excludedIds: allApproved.excludedIds,
              filters: {
                grade: grade || undefined,
                subject: subject || undefined,
                topic: topic || undefined,
              },
            }
          : { scope: "IDS" as const, ids: selected.map((q) => q.id) }),
        audience: publishAudience,
        ...(publishAudience !== "INDEPENDENT"
          ? {
              schoolScope: publishSchoolScope,
              ...(publishSchoolScope === "SELECTED"
                ? { schoolIds: publishSchoolIds }
                : {}),
            }
          : {}),
        ...(title.trim() ? { title: title.trim() } : {}),
      }),
    onSuccess: (r) => {
      setNotice(
        `Publication queued${r.independent ? " for individual learners" : ""}${r.schoolCount ? ` for ${r.schoolCount} schools` : ""}. It will create assignments by grade, subject and topic. Follow the publishing job below.`,
      );
      setSelected([]);
      setAllApproved(null);
      setTitle("");
      refresh();
      changeView("jobs");
    },
    onError: error,
  });
  const generation = useMutation({
    mutationFn: (kind: "QUESTIONS" | "CARDS" | "BOTH") =>
      contentLibraryApi.generate(generationIds, kind, count, generationTopic),
    onSuccess: (jobs) => {
      setNotice(
        jobs.length
          ? `${jobs.length} new generation jobs queued. Questions run first; progress is saved.`
          : "Matching jobs or saved drafts already exist. No duplicate work was queued.",
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
  const publicationJob = overview.data?.jobs.find(
    (job) => job.kind === "PUBLISH_CONTENT",
  );
  const sources = overview.data?.sources ?? [],
    coverage = overview.data?.coverage ?? [],
    rows = list.data?.items ?? [],
    subjects = [
      ...new Set([
        ...sources.map((s) => s.subject),
        ...coverage.map((c) => c.subject),
      ]),
    ].sort();
  const draftInSnapshot = (item: QuestionBankItem) =>
    !allDrafts ||
    new Date(item.createdAt).getTime() <= new Date(allDrafts.before).getTime();
  const approvedInSnapshot = (item: QuestionBankItem) =>
    !allApproved ||
    new Date(item.createdAt).getTime() <=
      new Date(allApproved.before).getTime();
  const approvedPage = rows.filter(
    (item) => item.status === "APPROVED" && approvedInSnapshot(item),
  );
  const draftPage = rows.filter(
    (item) => item.status === "GENERATED" && draftInSnapshot(item),
  );
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
  const tabs = [
    ["questions", "Questions", BookMarked],
    ["create", "Create content", Layers],
    ["jobs", "Content jobs", Clock],
    ["cards", "Memory cards", Brain],
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
        {view !== "create" && (
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white"
            onClick={() => changeView("create")}
          >
            <Plus size={16} />
            Generate content
          </button>
        )}
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
      {view === "create" ? (
        <CreateContentWorkspace />
      ) : view === "collections" ? (
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
            <h2 className="font-semibold">Content queue</h2>
            <button onClick={refresh} className="text-sm">
              <RefreshCw size={16} className="mr-2 inline" />
              Refresh
            </button>
          </div>
          {publicationJob && (
            <section
              aria-label="Publishing progress"
              className="space-y-3 border-b bg-blue-50/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">
                  {publicationJob.status === "COMPLETED"
                    ? "Publication finished"
                    : publicationJob.status === "FAILED"
                      ? "Publication needs attention"
                      : "Publishing content"}
                </h3>
                <span className="text-xs font-medium text-slate-500">
                  {publicationJob.status === "QUEUED"
                    ? "Queued"
                    : publicationJob.status === "RUNNING"
                      ? "Processing"
                      : publicationJob.status === "COMPLETED"
                        ? "Finished"
                        : "Needs attention"}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {publicationJob.result?.assignmentsCreated ?? 0} assignments
                published · {publicationJob.result?.processed ?? 0}/
                {publicationJob.result?.total ??
                  (publicationJob.input.audience !== "SCHOOLS" ? 1 : 0) +
                    (publicationJob.input.schoolIds?.length ?? 0)}{" "}
                audiences processed
              </p>
              <p className="text-xs leading-6 text-slate-500">
                Published work appears in My Assignments for the matching grade,
                under its subject and topic. Existing publications are skipped.
              </p>
              {publicationJob.error && (
                <p role="alert" className="text-sm text-red-700">
                  {publicationJob.error}
                </p>
              )}
              {!!publicationJob.result?.failures?.length && (
                <details>
                  <summary className="cursor-pointer text-sm text-amber-800">
                    {publicationJob.result.failures.length} audiences need
                    attention
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {publicationJob.result.failures.map((failure, i) => (
                      <li key={i}>
                        School {failure.schoolId}: {failure.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {(publicationJob.status === "FAILED" ||
                (publicationJob.status === "COMPLETED" &&
                  !!publicationJob.result?.failures?.length)) && (
                <button
                  className={control}
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(publicationJob.id)}
                >
                  Retry publication
                </button>
              )}
            </section>
          )}
          {overview.data?.queue && (
            <div className="border-b p-5">
              <p className="mb-4 text-sm leading-6 text-slate-600">
                Up to {overview.data.queue.concurrency} jobs run together.
                Questions are prepared before recall cards; duplicate requests
                reuse existing work. You can leave this page safely.
              </p>
              <div className="divide-y divide-slate-100">
                {overview.data.queue.subjects.map((row) => {
                  const total =
                    row.queued + row.running + row.completed + row.failed;
                  const percent = total
                    ? Math.round((row.completed / total) * 100)
                    : 0;
                  return (
                    <div
                      key={`${row.grade}:${row.subject}`}
                      className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(160px,1fr)] sm:items-center sm:gap-6"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {row.subject}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {row.grade} · {row.completed}/{total} jobs finished
                          {row.running ? ` · ${row.running} processing` : ""}
                          {row.queued ? ` · ${row.queued} waiting` : ""}
                          {row.skipped
                            ? ` · ${row.skipped} duplicates skipped`
                            : ""}
                        </p>
                        {row.failed > 0 && (
                          <p className="mt-1 text-xs text-red-700">
                            {row.failed} need attention — see job details below.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          role="progressbar"
                          aria-label={`${row.grade} ${row.subject} generation progress`}
                          aria-valuemin={0}
                          aria-valuenow={row.completed}
                          aria-valuemax={Math.max(1, total)}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                        >
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums text-slate-500">
                          {percent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <details
            open={!!overview.data?.jobs.some((job) => job.status === "FAILED")}
          >
            <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-slate-600">
              Recent job details (latest 100)
            </summary>
            {(overview.data?.jobs ?? []).map((job) => (
              <article
                key={job.id}
                className="flex flex-wrap justify-between gap-3 border-b p-5 text-sm"
              >
                <div>
                  <strong>
                    {[job.input.grade, job.input.subject]
                      .filter(Boolean)
                      .join(" · ") || "Curriculum processing"}
                  </strong>
                  <p className="mt-1 text-xs text-slate-500">
                    {jobLabels[job.kind] ?? job.kind} ·{" "}
                    {job.input.topic ??
                      (job.kind === "PREPARE_GRADE"
                        ? "Available subjects"
                        : "Source preparation")}{" "}
                    ·{" "}
                    {job.status === "COMPLETED"
                      ? "Finished"
                      : job.status === "SKIPPED"
                        ? "Duplicate skipped"
                        : job.status === "RUNNING"
                          ? "Processing"
                          : job.status === "PAUSED"
                            ? "Paused"
                            : job.status === "FAILED"
                              ? "Needs attention"
                              : "Queued"}
                    {job.result?.count !== undefined
                      ? ` · ${job.result.count} created`
                      : ""}
                  </p>
                  {job.kind === "PUBLISH_CONTENT" && (
                    <p className="mt-2 text-xs leading-6 text-slate-600">
                      {job.result?.processed ?? 0}/{job.result?.total ?? 0}{" "}
                      audiences processed ·{" "}
                      {job.result?.assignmentsCreated ?? 0} assignments
                      published
                      {job.result?.failures?.length
                        ? ` · ${job.result.failures.length} need attention`
                        : ""}
                    </p>
                  )}
                  {job.kind === "PREPARE_GRADE" && job.result && (
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {job.result.processed ?? 0}/{job.result.total ?? 0} files
                      processed · {job.result.subjects?.length ?? 0} subjects
                      ready
                      {job.result.failures?.length
                        ? ` · ${job.result.failures.length} need attention`
                        : ""}
                    </p>
                  )}
                  {job.error && (
                    <p
                      role="alert"
                      className="mt-2 max-w-xl text-xs text-red-700"
                    >
                      {job.error}
                    </p>
                  )}
                </div>
                {["FAILED", "PAUSED"].includes(job.status) && (
                  <button
                    disabled={retry.isPending}
                    className={control}
                    onClick={() => retry.mutate(job.id)}
                  >
                    {job.status === "PAUSED" ? "Resume" : "Retry"}
                  </button>
                )}
              </article>
            ))}
          </details>
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
                "Approved in bank",
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
                disabled={bulkApproval.isPending || publish.isPending}
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
                disabled={bulkApproval.isPending || publish.isPending}
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
                disabled={bulkApproval.isPending || publish.isPending}
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
                disabled={bulkApproval.isPending || publish.isPending}
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
              {status !== "APPROVED" && (
                <button
                  className="text-sm font-medium text-blue-700 hover:underline"
                  disabled={bulkApproval.isPending || publish.isPending}
                  onClick={() => {
                    setStatus("APPROVED");
                    setPage(0);
                  }}
                >
                  Publish approved questions
                </button>
              )}
            </div>
            {status === "GENERATED" && list.data?.selectionBefore && (
              <div className="space-y-3 border-b bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label="Select this page of drafts"
                      disabled={
                        bulkApproval.isPending ||
                        !draftPage.length ||
                        list.isFetching
                      }
                      checked={
                        !!draftPage.length &&
                        draftPage.every((q) =>
                          allDrafts
                            ? !allDrafts.excludedIds.includes(q.id)
                            : draftIds.includes(q.id),
                        )
                      }
                      onChange={(e) => {
                        if (allDrafts) {
                          setAllDrafts({
                            ...allDrafts,
                            excludedIds: e.target.checked
                              ? allDrafts.excludedIds.filter(
                                  (id) => !draftPage.some((q) => q.id === id),
                                )
                              : [
                                  ...new Set([
                                    ...allDrafts.excludedIds,
                                    ...draftPage.map((q) => q.id),
                                  ]),
                                ],
                          });
                          return;
                        }
                        setDraftIds(
                          e.target.checked
                            ? [
                                ...new Set([
                                  ...draftIds,
                                  ...draftPage.map((q) => q.id),
                                ]),
                              ]
                            : draftIds.filter(
                                (id) => !draftPage.some((q) => q.id === id),
                              ),
                        );
                      }}
                    />
                    Select this page
                  </label>
                  <button
                    type="button"
                    className="text-blue-700 hover:underline disabled:opacity-40"
                    disabled={
                      bulkApproval.isPending ||
                      list.isFetching ||
                      !list.data?.total ||
                      !list.data.selectionBefore
                    }
                    onClick={() => {
                      setDraftIds([]);
                      setAllDrafts({
                        before: list.data!.selectionBefore,
                        count: list.data!.total,
                        excludedIds: [],
                      });
                    }}
                  >
                    Select all {list.data?.total ?? 0} matching drafts
                  </button>
                  {(allDrafts || draftIds.length > 0) && (
                    <>
                      <span className="font-medium">
                        {allDrafts
                          ? allDrafts.count - allDrafts.excludedIds.length
                          : draftIds.length}{" "}
                        selected{allDrafts ? " across all pages" : ""}
                      </span>
                      <button
                        className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white disabled:opacity-40"
                        disabled={
                          bulkApproval.isPending ||
                          (allDrafts
                            ? allDrafts.count - allDrafts.excludedIds.length <=
                              0
                            : !draftIds.length)
                        }
                        onClick={() => bulkApproval.mutate()}
                      >
                        {bulkApproval.isPending
                          ? "Approving…"
                          : `Approve selected (${allDrafts ? allDrafts.count - allDrafts.excludedIds.length : draftIds.length})`}
                      </button>
                      <button
                        className="text-slate-600 underline"
                        disabled={bulkApproval.isPending || publish.isPending}
                        onClick={() => {
                          setDraftIds([]);
                          setAllDrafts(null);
                        }}
                      >
                        Clear selection
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  Approval prepares questions for publishing. Choose individual
                  learners, schools, or both to make them available. Incomplete
                  questions and missing visuals stay in review. Select all
                  includes the matching drafts already saved when selected.
                </p>
              </div>
            )}
            {status === "APPROVED" && list.data?.selectionBefore && (
              <div className="flex flex-wrap items-center gap-4 border-b bg-slate-50/70 p-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label="Select this page of approved questions"
                    disabled={
                      publish.isPending ||
                      list.isFetching ||
                      !approvedPage.length
                    }
                    checked={
                      !!approvedPage.length &&
                      approvedPage.every((q) =>
                        allApproved
                          ? !allApproved.excludedIds.includes(q.id)
                          : selected.some((s) => s.id === q.id),
                      )
                    }
                    onChange={(e) => {
                      if (allApproved) {
                        setAllApproved({
                          ...allApproved,
                          excludedIds: e.target.checked
                            ? allApproved.excludedIds.filter(
                                (id) => !approvedPage.some((q) => q.id === id),
                              )
                            : [
                                ...new Set([
                                  ...allApproved.excludedIds,
                                  ...approvedPage.map((q) => q.id),
                                ]),
                              ],
                        });
                      } else
                        setSelected(
                          e.target.checked
                            ? [
                                ...selected.filter(
                                  (s) =>
                                    !approvedPage.some((q) => q.id === s.id),
                                ),
                                ...approvedPage,
                              ]
                            : selected.filter(
                                (s) => !approvedPage.some((q) => q.id === s.id),
                              ),
                        );
                    }}
                  />
                  Select this page
                </label>
                <button
                  type="button"
                  className="font-medium text-blue-700 hover:underline disabled:opacity-40"
                  disabled={
                    publish.isPending || list.isFetching || !list.data.total
                  }
                  onClick={() => {
                    setSelected([]);
                    setAllApproved({
                      before: list.data!.selectionBefore,
                      count: list.data!.total,
                      excludedIds: [],
                    });
                  }}
                >
                  Select all {list.data.total} matching approved questions
                </button>
                <span className="text-xs text-slate-500">
                  Approval is complete. Choose where to publish these questions.
                </span>
              </div>
            )}
            {approvalIssues.length > 0 && (
              <details className="border-b p-4">
                <summary className="cursor-pointer text-sm font-medium text-amber-800">
                  Questions needing correction ({approvalIssues.length}
                  {approvalIssues.length === 100 ? "+" : ""})
                </summary>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  {approvalIssues.map((issue) => (
                    <li key={issue.id}>
                      Question #{issue.id}: {issue.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
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
                      disabled={
                        bulkApproval.isPending ||
                        publish.isPending ||
                        (item.status === "APPROVED" &&
                          !approvedInSnapshot(item)) ||
                        (item.status === "GENERATED" &&
                          !draftInSnapshot(item)) ||
                        (item.status !== "APPROVED" &&
                          (item.status !== "GENERATED" ||
                            status !== "GENERATED"))
                      }
                      checked={
                        item.status === "GENERATED"
                          ? allDrafts
                            ? draftInSnapshot(item) &&
                              !allDrafts.excludedIds.includes(item.id)
                            : draftIds.includes(item.id)
                          : allApproved
                            ? approvedInSnapshot(item) &&
                              !allApproved.excludedIds.includes(item.id)
                            : selected.some((q) => q.id === item.id)
                      }
                      onChange={(e) => {
                        if (item.status === "GENERATED") {
                          if (allDrafts)
                            setAllDrafts({
                              ...allDrafts,
                              excludedIds: e.target.checked
                                ? allDrafts.excludedIds.filter(
                                    (id) => id !== item.id,
                                  )
                                : [...allDrafts.excludedIds, item.id],
                            });
                          else
                            setDraftIds(
                              e.target.checked
                                ? [...draftIds, item.id]
                                : draftIds.filter((id) => id !== item.id),
                            );
                        } else if (allApproved)
                          setAllApproved({
                            ...allApproved,
                            excludedIds: e.target.checked
                              ? allApproved.excludedIds.filter(
                                  (id) => id !== item.id,
                                )
                              : [...allApproved.excludedIds, item.id],
                          });
                        else
                          setSelected(
                            e.target.checked
                              ? [...selected, item]
                              : selected.filter((q) => q.id !== item.id),
                          );
                      }}
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
                      {!!item.publishedTo?.length && (
                        <p
                          className="mt-2 text-xs text-blue-700"
                          title={item.publishedTo.join(" · ")}
                        >
                          Published to:{" "}
                          {item.publishedTo.slice(0, 2).join(" · ")}
                          {item.publishedTo.length > 2
                            ? ` +${item.publishedTo.length - 2} more`
                            : ""}
                        </p>
                      )}
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
          {(selected.length > 0 || allApproved) && (
            <section
              className="sticky bottom-3 space-y-4 rounded-xl border border-blue-200 bg-white p-5 shadow-lg"
              aria-label="Publish selected content"
            >
              <div>
                <h3 className="font-semibold">
                  Publish{" "}
                  {allApproved
                    ? allApproved.count - allApproved.excludedIds.length
                    : selected.length}{" "}
                  approved questions
                </h3>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  Assignments will be grouped by grade, subject and topic.
                  Existing publications are skipped; learner submissions are
                  kept.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block min-w-0 text-xs font-medium">
                  Publish to
                  <select
                    aria-label="Publish audience"
                    className={control + " mt-2 w-full min-w-0"}
                    value={publishAudience}
                    disabled={publish.isPending}
                    onChange={(e) =>
                      setPublishAudience(
                        e.target.value as typeof publishAudience,
                      )
                    }
                  >
                    <option value="INDEPENDENT">Individual learners</option>
                    <option value="SCHOOLS">Schools</option>
                    <option value="BOTH">Individuals and schools</option>
                  </select>
                </label>
                <label className="block min-w-0 text-xs font-medium">
                  Assignment title prefix (optional)
                  <input
                    aria-label="Assignment title prefix"
                    className={control + " mt-2 w-full min-w-0"}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Automatic subject and topic titles"
                    maxLength={160}
                    disabled={publish.isPending}
                  />
                </label>
              </div>
              {publishAudience !== "INDEPENDENT" && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <label className="block min-w-0 text-xs font-medium">
                    School audience
                    <select
                      aria-label="School audience"
                      value={publishSchoolScope}
                      onChange={(e) =>
                        setPublishSchoolScope(
                          e.target.value as "ALL" | "SELECTED",
                        )
                      }
                      className={control + " mt-2 w-full min-w-0"}
                      disabled={publish.isPending}
                    >
                      <option value="ALL">
                        All subscribed schools with bank access
                      </option>
                      <option value="SELECTED">Choose schools</option>
                    </select>
                  </label>
                  {publicationTargets.isPending ? (
                    <p className="mt-3 text-sm">Loading eligible schools…</p>
                  ) : publicationTargets.isError ? (
                    <p role="alert" className="mt-3 text-sm text-red-700">
                      Could not load schools.{" "}
                      <button
                        onClick={() => publicationTargets.refetch()}
                        className="underline"
                      >
                        Retry
                      </button>
                    </p>
                  ) : !publicationTargets.data?.length ? (
                    <p className="mt-3 text-sm text-amber-800">
                      No subscribed schools have active Question Bank access
                      yet.
                    </p>
                  ) : publishSchoolScope === "SELECTED" ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {publicationTargets.data.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={publishSchoolIds.includes(s.id)}
                            disabled={publish.isPending}
                            onChange={(e) =>
                              setPublishSchoolIds((ids) =>
                                e.target.checked
                                  ? [...ids, s.id]
                                  : ids.filter((id) => id !== s.id),
                              )
                            }
                          />
                          {s.name}{" "}
                          <span className="text-xs text-slate-500">
                            {s.code}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      {publicationTargets.data.length} eligible schools.
                      Learners receive only assignments for their grade.
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  className="min-h-11 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white disabled:opacity-40"
                  disabled={
                    publish.isPending ||
                    (allApproved
                      ? allApproved.count - allApproved.excludedIds.length <= 0
                      : !selected.length) ||
                    (publishAudience !== "INDEPENDENT" &&
                      (publicationTargets.isFetching ||
                        publicationTargets.isError ||
                        !publicationTargets.data?.length ||
                        (publishSchoolScope === "SELECTED" &&
                          !publishSchoolIds.length)))
                  }
                  onClick={() => publish.mutate()}
                >
                  {publish.isPending
                    ? "Queuing publication…"
                    : "Publish content"}
                </button>
                <button
                  disabled={publish.isPending}
                  className="text-sm text-slate-600 underline"
                  onClick={() => {
                    setSelected([]);
                    setAllApproved(null);
                  }}
                >
                  Clear selection
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Published assignments appear in My Assignments for the chosen
                audience. Approval alone does not publish content.
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
        <summary className="cursor-pointer">
          Advanced tools & school access
        </summary>
        <div className="mt-3 flex flex-wrap gap-4">
          <button onClick={() => changeView("collections")}>
            Collection uploads & curriculum corrections
          </button>
          <button onClick={() => changeView("sources")}>
            Official source tools
          </button>
          <button onClick={() => changeView("schools")}>School access</button>
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
