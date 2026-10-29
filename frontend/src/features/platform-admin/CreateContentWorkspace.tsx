import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  ingestionApi,
  type Mapping,
  type ScopeCoverage,
} from "../../api/ingestion.api";
import {
  contentLibraryApi,
  type Candidate,
} from "../../api/content-library.api";
import { apiErrorMessage } from "../../api/axios";
import { OutcomeEditor } from "./CurriculumIngestion";
import { DocumentMappingEditor } from "./DocumentMappingEditor";

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";
const primary =
  button.replace("bg-white", "bg-blue-700") + " border-blue-700 text-white";
const grades = [6, 7, 8, 9, 10, 11, 12].map((n) => `Grade ${n}`);
export function CreateContentWorkspace() {
  const [params, setParams] = useSearchParams();
  const grade = grades.includes(params.get("grade") ?? "")
    ? params.get("grade")!
    : "Grade 7";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Create learning content</h2>
          <p className="mt-2 text-sm text-slate-500">
            Start with one grade. No textbook or notes upload is needed.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-xs font-medium">
          Choose a grade
          <select
            aria-label="Content grade"
            className={button}
            value={grade}
            onChange={(e) =>
              setParams({ view: "create", grade: e.target.value })
            }
          >
            {grades.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
      </div>
      <GradeContentFlow key={grade} grade={grade} />
    </div>
  );
}
function GradeContentFlow({ grade }: { grade: string }) {
  const client = useQueryClient();
  const [step, setStep] = useState(1),
    [notice, setNotice] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]),
    [picked, setPicked] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState(false),
    [exceptions, setExceptions] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false),
    [catalogueChecked, setCatalogueChecked] = useState(false);
  const [subject, setSubject] = useState("ALL"),
    [written, setWritten] = useState(false);
  const [scope, setScope] = useState<ScopeCoverage | null>(null);
  const [collection, setCollection] = useState(""),
    [page, setPage] = useState(0);
  const [asset, setAsset] = useState<{
    id: string;
    name: string;
    text: string;
    mapping: Mapping;
  } | null>(null);
  useEffect(() => {
    if (asset) {
      const editor = document.getElementById("guided-document-review");
      editor?.focus({ preventScroll: true });
      editor?.scrollIntoView({ block: "start" });
    }
  }, [asset?.id]);
  const overview = useQuery({
    queryKey: ["curriculum-ingestion"],
    queryFn: ingestionApi.overview,
    refetchInterval: 4000,
  });
  const data = overview.data,
    scopes = (data?.scopes ?? []).filter((s) => s.grade === grade);
  const gradeReviewed = !!data?.gradeReviews.some(
    (r) => r.grade === grade && r.verifiedAt,
  );
  const ready = scopes.filter(
    (s) => gradeReviewed && s.verified && s.unitIds.length,
  );
  const initialStepChosen = useRef(false);
  useEffect(() => {
    if (overview.data && !initialStepChosen.current) {
      initialStepChosen.current = true;
      if (ready.length) setStep(2);
    }
  }, [overview.data, ready.length]);
  const sources = (data?.sources ?? []).filter(
    (s) => s.grade === grade && !s.reviewed,
  );
  const documents = useQuery({
    queryKey: ["ingestion-documents", collection, page],
    queryFn: () => ingestionApi.documents(collection, page),
    enabled: !!collection,
    refetchInterval: 4000,
  });
  const assets = collection
    ? (documents.data?.items ?? [])
    : (data?.collections ?? [])
        .filter((c) => c.grades.includes(grade))
        .flatMap((c) => c.assets);
  const pending = assets.filter(
    (a) => !["DIRECTORY", "INDEXED"].includes(a.status),
  );
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["curriculum-ingestion"] });
    void client.invalidateQueries({ queryKey: ["ingestion-documents"] });
    void client.invalidateQueries({ queryKey: ["content-library"] });
  };
  const error = (e: unknown) =>
    setNotice(
      apiErrorMessage(
        e,
        e instanceof Error
          ? e.message
          : "Could not complete this step. Please try again.",
      ),
    );
  const discover = useMutation({
    mutationFn: () => contentLibraryApi.discover(undefined, [grade]),
    onSuccess: (r) => {
      const unique = [...new Map(r.candidates.map((c) => [c.url, c])).values()];
      setCandidates(unique);
      setPicked(
        unique
          .filter((c) => c.grade === grade && c.subject && !c.issue)
          .map((c) => c.url),
      );
      setExceptions(r.errors.map((e) => e.message));
      setConfirmed(false);
      setDiscovered(true);
      setNotice(
        unique.length
          ? "Curriculum links found. Check the subjects below, then save them."
          : "No usable curriculum links were found. Existing curriculum can still be used; source tools are available below.",
      );
    },
    onError: error,
  });
  const saveCurriculum = useMutation({
    mutationFn: async () => {
      const selected = candidates.filter(
        (c) =>
          picked.includes(c.url) && c.grade === grade && c.subject && !c.issue,
      );
      if (!confirmed || !selected.length)
        throw Error("Check the selected subjects and confirm their use first.");
      const rows =
        "Grade,Subject,Pathway\n" +
        [
          ...new Set(
            selected.map(
              (c) => `${grade},"${c.subject!.replace(/"/g, '""')}",`,
            ),
          ),
        ].join("\n");
      await ingestionApi.catalogue(
        rows,
        `KICD official directory, checked ${new Date().toISOString().slice(0, 10)}. Subject inventory still requires completeness review.`,
      );
      let collections = 0;
      for (let n = 0; n < selected.length; n += 30) {
        await ingestionApi.create({
          name: `${grade} KICD curriculum`,
          grades: [grade],
          rightsConfirmed: true,
          urls: selected.slice(n, n + 30).map((c) => c.url),
        });
        collections++;
      }
      return collections;
    },
    onSuccess: () => {
      setCandidates([]);
      setPicked([]);
      setNotice(
        "Curriculum downloads started. They will appear below for a quick content check. You can leave this page while they process.",
      );
      refresh();
    },
    onError: error,
  });
  const reuse = useMutation({
    mutationFn: () => ingestionApi.fromLibrary(sources.map((s) => s.id)),
    onSuccess: () => {
      setNotice(
        "Saved sources are being prepared. Check the documents below when processing finishes.",
      );
      refresh();
    },
    onError: error,
  });
  const openDocument = useMutation({
    mutationFn: ingestionApi.asset,
    onSuccess: (d) => {
      setAsset({
        id: d.id,
        name: d.name,
        text: d.extractedText,
        mapping: d.mapping ?? { role: "CURRICULUM", note: "", subjects: [] },
      });
    },
    onError: error,
  });
  const index = useMutation({
    mutationFn: async () => {
      if (!asset) return;
      await ingestionApi.mapping(asset.id, asset.mapping);
      await ingestionApi.approve([asset.id]);
    },
    onSuccess: () => {
      setAsset(null);
      setNotice(
        "Document confirmed. Its learning outcomes are being saved below.",
      );
      refresh();
    },
    onError: error,
  });
  const verify = useMutation({
    mutationFn: () => ingestionApi.verify([grade]),
    onSuccess: () => {
      setCatalogueChecked(false);
      setNotice(
        `${grade} subject list confirmed. Now check the learning outcomes for each subject.`,
      );
      refresh();
    },
    onError: error,
  });
  const selectedScopes = ready.filter(
    (s) => subject === "ALL" || String(s.id) === subject,
  );
  const plans = selectedScopes.map((s) => {
    // A small starter set spreads selection across the ready outcomes, keeping
    // first-run cost bounded. This does not claim every strand is covered.
    const ids = [...new Set(s.unitIds)],
      size = Math.min(6, ids.length);
    const chosen = Array.from(
      { length: size },
      (_, i) => ids[Math.floor((i * ids.length) / size)],
    );
    return {
      scope: s,
      ids: chosen,
      count: Math.max(5, Math.ceil(30 / chosen.length)),
    };
  });
  const generate = useMutation({
    mutationFn: async () => {
      let queued = 0;
      const failures: string[] = [];
      for (const plan of plans) {
        try {
          const result = await ingestionApi.generate(
            plan.ids,
            "BOTH",
            plan.count,
            written ? "WRITTEN" : "PRACTICE",
          );
          queued += result.queued;
        } catch (e) {
          failures.push(
            `${plan.scope.subject}: ${apiErrorMessage(e, "Could not queue this subject")}`,
          );
        }
      }
      return { queued, failures };
    },
    onSuccess: ({ queued, failures }) => {
      setNotice(
        `${queued} generation jobs queued. ${queued ? "Drafts and memory cards will be saved automatically for your review." : "No new jobs were queued."}${failures.length ? " Could not queue: " + failures.join(" · ") : ""}`,
      );
      if (queued) setStep(3);
      refresh();
    },
    onError: error,
  });
  if (scope)
    return (
      <OutcomeEditor
        backLabel="Back to curriculum setup"
        scope={scope}
        sources={data?.sources ?? []}
        onBack={() => {
          setScope(null);
          refresh();
        }}
      />
    );
  return (
    <div className="space-y-5">
      <ol
        className="grid gap-2 sm:grid-cols-3"
        aria-label="Content creation steps"
      >
        {["Set up curriculum", "Generate content", "Review & publish"].map(
          (label, i) => (
            <li key={label}>
              <button
                aria-current={step === i + 1 ? "step" : undefined}
                className={`flex min-h-12 w-full items-center gap-3 rounded-lg border p-3 text-left text-sm ${step === i + 1 ? "border-blue-300 bg-blue-50 text-blue-800" : "bg-white text-slate-500"}`}
                onClick={() => {
                  setStep(i + 1);
                  setNotice("");
                }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
                  {i + 1}
                </span>
                {label}
              </button>
            </li>
          ),
        )}
      </ol>
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6"
        >
          {notice}
        </p>
      )}
      {overview.isLoading ? (
        <p className="flex items-center gap-2 p-5 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Loading {grade}…
        </p>
      ) : overview.isError ? (
        <div role="alert" className="rounded-xl border bg-white p-5">
          <p>
            We couldn’t load your curriculum. Your saved work has not been
            changed.
          </p>
          <button
            className={button + " mt-3"}
            onClick={() => overview.refetch()}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {step === 1 && (
            <section className="space-y-5 rounded-xl border bg-white p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-semibold">Set up {grade}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use KICD curriculum designs to tell the AI what to teach. You
                  only need to set this up once, then review occasional updates.
                </p>
              </div>
              {!scopes.length && !pending.length && !candidates.length && (
                <div className="rounded-lg bg-slate-50 p-5">
                  <BookOpen size={25} className="mb-3 text-blue-700" />
                  <h4 className="font-medium">Let’s find your curriculum</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    We’ll look for the official {grade} designs. You won’t need
                    to upload a PDF for each subject.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  className={scopes.length ? button : primary}
                  disabled={discover.isPending || saveCurriculum.isPending}
                  onClick={() => discover.mutate()}
                >
                  {discover.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <BookOpen size={16} />
                  )}{" "}
                  {discover.isPending
                    ? "Finding curriculum…"
                    : `Find ${grade} curriculum`}
                </button>
                {sources.length > 0 && (
                  <button
                    className={button}
                    disabled={reuse.isPending}
                    onClick={() => reuse.mutate()}
                  >
                    Use {sources.length} saved sources
                  </button>
                )}
                <button
                  className={button}
                  aria-label="Refresh curriculum"
                  onClick={refresh}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              {discovered && (
                <>
                  {!!exceptions.length && (
                    <p className="text-sm leading-6 text-amber-800">
                      Some directory pages could not be reached. This result may
                      be incomplete. {exceptions.join(" · ")}
                    </p>
                  )}
                  {!!candidates.length && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <h4 className="font-medium">
                        Check the subjects we found
                      </h4>
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {candidates.map((c) => (
                          <label
                            key={c.url}
                            className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm"
                          >
                            <input
                              aria-label={`Import ${c.subject ?? c.title}`}
                              type="checkbox"
                              checked={picked.includes(c.url)}
                              disabled={
                                !!c.issue || c.grade !== grade || !c.subject
                              }
                              onChange={(e) =>
                                setPicked((v) =>
                                  e.target.checked
                                    ? [...v, c.url]
                                    : v.filter((url) => url !== c.url),
                                )
                              }
                            />
                            <span className="min-w-0">
                              <strong className="block">
                                {c.subject ?? c.title}
                              </strong>
                              <span className="block text-xs text-slate-500">
                                {c.grade ?? "Grade needs checking"}
                                {c.issue ? ` · ${c.issue}` : ""}
                              </span>
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-700 underline"
                              >
                                View source
                              </a>
                            </span>
                          </label>
                        ))}
                      </div>
                      <label className="flex items-start gap-3 text-sm leading-6">
                        <input
                          className="mt-1"
                          type="checkbox"
                          checked={confirmed}
                          onChange={(e) => setConfirmed(e.target.checked)}
                        />
                        I checked the selected grade and subject names and have
                        permission to use these designs.
                      </label>
                      <button
                        className={primary}
                        disabled={
                          !confirmed ||
                          !picked.length ||
                          saveCurriculum.isPending
                        }
                        onClick={() => saveCurriculum.mutate()}
                      >
                        {saveCurriculum.isPending
                          ? "Saving curriculum…"
                          : `Save ${picked.length} curriculum designs`}
                      </button>
                    </div>
                  )}
                </>
              )}
              {!!pending.length && (
                <div className="space-y-3 border-t pt-5">
                  <h4 className="font-medium">
                    Check your curriculum documents
                  </h4>
                  <p className="text-sm text-slate-500">
                    When a document is ready, check its grade, subject and
                    extracted outcomes.
                  </p>
                  {pending.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">
                          {a.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {a.status === "REVIEW"
                            ? "Ready for your check"
                            : a.status === "FAILED"
                              ? "Could not process this document"
                              : "Processing — check back shortly"}
                        </p>
                        {a.error && (
                          <p className="mt-2 max-w-xl break-words text-xs text-amber-800">
                            {a.error}
                          </p>
                        )}
                      </div>
                      {a.status === "REVIEW" && (
                        <button
                          className={button}
                          disabled={openDocument.isPending}
                          onClick={() => openDocument.mutate(a.id)}
                        >
                          Check document
                        </button>
                      )}
                      {a.status === "FAILED" && (
                        <Link
                          className="text-sm text-blue-700 underline"
                          to="?view=jobs"
                        >
                          View error & retry
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {asset && (
                <div
                  id="guided-document-review"
                  tabIndex={-1}
                  className="scroll-mt-20 space-y-4 rounded-xl border border-blue-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="break-words font-medium">{asset.name}</h4>
                    <button className={button} onClick={() => setAsset(null)}>
                      Close
                    </button>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm text-blue-700">
                      Read extracted source text
                    </summary>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-6">
                      {asset.text}
                    </pre>
                  </details>
                  <DocumentMappingEditor
                    value={asset.mapping}
                    onChange={(m) =>
                      setAsset((v) => (v ? { ...v, mapping: m } : v))
                    }
                  />
                  {index.isError && (
                    <p role="alert" className="text-sm text-red-700">
                      {apiErrorMessage(
                        index.error,
                        "Could not confirm this document. Check the fields and try again.",
                      )}
                    </p>
                  )}
                  <button
                    className={primary}
                    disabled={index.isPending}
                    onClick={() => index.mutate()}
                  >
                    {index.isPending
                      ? "Saving…"
                      : "Confirm document & save outcomes"}
                  </button>
                </div>
              )}
              {!!scopes.length && (
                <div className="space-y-4 border-t pt-5">
                  <h4 className="font-medium">Your {grade} subjects</h4>
                  <div className="divide-y rounded-lg border">
                    {scopes.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-4"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {s.subject}
                            {s.pathway ? ` · ${s.pathway}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {!s.curriculumSources
                              ? "Curriculum document needed"
                              : !s.outcomeCount
                                ? "Learning outcomes needed"
                                : `${s.verifiedOutcomes}/${s.outcomeCount} outcomes checked`}
                          </p>
                        </div>
                        <button
                          className={button}
                          disabled={!s.outcomeCount}
                          onClick={() => setScope(s)}
                        >
                          {s.verifiedOutcomes === s.outcomeCount &&
                          s.outcomeCount
                            ? "View outcomes"
                            : "Check outcomes"}
                        </button>
                      </div>
                    ))}
                  </div>
                  {!gradeReviewed && (
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 text-sm leading-6">
                        <input
                          className="mt-1"
                          type="checkbox"
                          checked={catalogueChecked}
                          onChange={(e) =>
                            setCatalogueChecked(e.target.checked)
                          }
                        />
                        This is the complete subject list for {grade}, including
                        applicable pathways and subject alternatives.
                      </label>
                      <button
                        className={button}
                        disabled={!catalogueChecked || verify.isPending}
                        onClick={() => verify.mutate()}
                      >
                        Confirm subject list
                      </button>
                    </div>
                  )}
                  <button
                    className={primary}
                    disabled={!ready.length}
                    onClick={() => {
                      setStep(2);
                      setNotice("");
                    }}
                  >
                    Continue to generation <ArrowRight size={16} />
                  </button>
                  {!ready.length && (
                    <p className="text-sm leading-6 text-slate-500">
                      To continue, confirm the subject list and check at least
                      one subject’s learning outcomes.
                    </p>
                  )}
                </div>
              )}
              <details className="border-t pt-4 text-sm">
                <summary className="cursor-pointer text-slate-500">
                  More curriculum options
                </summary>
                <div className="mt-4 space-y-3">
                  <p className="text-xs leading-6 text-slate-500">
                    Open older collections or use the advanced tools if official
                    discovery cannot reach your curriculum.
                  </p>
                  <label className="block text-xs">
                    Browse saved collections
                    <select
                      aria-label="Saved curriculum collection"
                      className={button + " mt-2 w-full min-w-0"}
                      value={collection}
                      onChange={(e) => {
                        setCollection(e.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="">Recent collections for {grade}</option>
                      {data?.collectionIndex?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {collection && (
                    <div className="flex gap-3">
                      <button
                        className={button}
                        disabled={!page}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous documents
                      </button>
                      <button
                        className={button}
                        disabled={
                          !documents.data ||
                          (page + 1) * documents.data.take >=
                            documents.data.total
                        }
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next documents
                      </button>
                    </div>
                  )}
                  <Link
                    className="block text-blue-700 underline"
                    to="?view=collections"
                  >
                    Collection uploads and curriculum corrections
                  </Link>
                  <Link
                    className="block text-blue-700 underline"
                    to="?view=sources"
                  >
                    Official source tools
                  </Link>
                </div>
              </details>
            </section>
          )}
          {step === 2 && (
            <section className="space-y-5 rounded-xl border bg-white p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-semibold">
                  Generate {grade} starter content
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  AI will create original questions, explanations and recall
                  cards from the outcomes you checked. Start small to keep
                  generation costs down.
                </p>
              </div>
              {!ready.length ? (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm">
                    No subjects are ready yet. Finish the curriculum check
                    first.
                  </p>
                  <button
                    className={button + " mt-3"}
                    onClick={() => setStep(1)}
                  >
                    Back to curriculum setup
                  </button>
                </div>
              ) : (
                <>
                  <label className="block text-xs font-medium">
                    Generate for
                    <select
                      aria-label="Generation subject"
                      className={button + " mt-2 w-full min-w-0"}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option value="ALL">
                        All ready subjects ({ready.length})
                      </option>
                      {ready.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject}
                          {s.pathway ? ` · ${s.pathway}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={written}
                      onChange={(e) => setWritten(e.target.checked)}
                    />
                    Create written-response tasks instead of multiple-choice
                    practice
                  </label>
                  <div className="rounded-lg bg-slate-50 p-4 text-sm leading-7">
                    <strong>
                      {plans.reduce((n, p) => n + p.ids.length * p.count, 0)}{" "}
                      draft questions requested
                    </strong>
                    <p>
                      Across {plans.length} subjects and{" "}
                      {plans.reduce((n, p) => n + p.ids.length, 0)} selected
                      outcomes, plus recall cards. Review this starter set
                      before generating more to cover additional outcomes.
                    </p>
                  </div>
                  {scopes.length > ready.length && (
                    <p className="text-sm text-amber-800">
                      {scopes.length - ready.length} subjects still need
                      curriculum checks. Return to setup to prepare them.
                    </p>
                  )}
                  <button
                    className={primary}
                    disabled={generate.isPending || !plans.length}
                    onClick={() => generate.mutate()}
                  >
                    {generate.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ArrowRight size={16} />
                    )}{" "}
                    {generate.isPending
                      ? "Queuing content…"
                      : "Generate starter content"}
                  </button>
                  <p className="text-xs leading-6 text-slate-500">
                    Content is saved as drafts. You decide what students receive
                    after checking the answers.
                  </p>
                </>
              )}
            </section>
          )}
          {step === 3 && (
            <section className="space-y-5 rounded-xl border bg-white p-5 sm:p-6">
              <CheckCircle2 className="text-blue-700" size={28} />
              <div>
                <h3 className="text-lg font-semibold">
                  Review before students receive it
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Check the answers and explanations, then approve the
                  questions. Approved multiple-choice questions automatically
                  enter the matching grade and subject practice pool once at
                  least 30 are available. Memory cards have their own Publish
                  action.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className={primary}
                  to={`?view=questions&grade=${encodeURIComponent(grade)}`}
                >
                  Review {grade} questions <ArrowRight size={16} />
                </Link>
                <Link className={button} to="?view=jobs">
                  Check generation progress
                </Link>
                <Link className={button} to="?view=cards">
                  Review memory cards
                </Link>
              </div>
              <p className="text-xs leading-6 text-slate-500">
                School teachers can select approved questions through their
                existing subscribed question-bank access.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
