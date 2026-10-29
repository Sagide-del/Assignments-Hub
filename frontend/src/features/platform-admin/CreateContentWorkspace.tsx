import { githubCurriculumApi } from "../../api/github-curriculum.api";
import { RepositorySourceReview } from "./RepositorySourceReview";
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
function originalDocumentLink(origin: string) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:") return null;
    if (
      u.hostname === "drive.google.com" &&
      u.searchParams.get("id") &&
      u.pathname === "/uc"
    ) {
      const id = u.searchParams.get("id")!;
      if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) return null;
      const link = new URL(`https://drive.google.com/file/d/${id}/view`);
      const key = u.searchParams.get("resourcekey");
      if (key) link.searchParams.set("resourcekey", key);
      return link.href;
    }
    return u.href;
  } catch {
    return null;
  }
}
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
  const savedPage = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1),
    [notice, setNotice] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]),
    [picked, setPicked] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState(false),
    [exceptions, setExceptions] = useState<{ url: string; message: string }[]>(
      [],
    );
  const [subjectEdits, setSubjectEdits] = useState<string[]>([]);
  const [limitationsReviewed, setLimitationsReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false),
    [catalogueChecked, setCatalogueChecked] = useState(false);
  const [subject, setSubject] = useState("NEW"),
    [written, setWritten] = useState(false);
  const [generationSubjects, setGenerationSubjects] = useState<number[]>([]);
  useEffect(() => {
    setSubject("NEW");
    setGenerationSubjects([]);
  }, [grade]);
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
  const ready = scopes
    .filter(
      (s) =>
        s.verified &&
        (gradeReviewed ? s.unitIds.length : s.snapshotReadyUnitIds?.length),
    )
    .map((s) => ({
      ...s,
      unitIds: gradeReviewed ? s.unitIds : (s.snapshotReadyUnitIds ?? []),
    }));
  const preparation = data?.preparations?.find((j) => j.input.grade === grade);
  const preparing =
    !!preparation && ["QUEUED", "RUNNING"].includes(preparation.status);
  const [advanceAfterPreparation, setAdvanceAfterPreparation] = useState(false);
  useEffect(() => {
    if (
      advanceAfterPreparation &&
      ready.length &&
      preparation?.status === "COMPLETED"
    ) {
      setStep(2);
      setAdvanceAfterPreparation(false);
      setNotice(
        "Your available curriculum is prepared. Generate starter questions and recall cards next.",
      );
    }
  }, [advanceAfterPreparation, ready.length, preparation?.status]);
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
  const repository = useQuery({
    queryKey: ["github-curriculum", grade],
    queryFn: () => githubCurriculumApi.catalogue(grade),
  });
  const assets = collection
    ? (documents.data?.items ?? [])
    : (data?.collections ?? [])
        .filter((c) => c.grades.includes(grade))
        .flatMap((c) => c.assets);
  const pinnedAssets = assets.filter((a) =>
    a.origin.includes(
      "github.com/Vincent-mutwiri/KICD-Curriculum-Designs/blob/",
    ),
  );
  const [showOtherSources, setShowOtherSources] = useState(false);
  const activeAssets =
    !showOtherSources && pinnedAssets.length ? pinnedAssets : assets;
  const pending = activeAssets.filter(
    (a) => !["DIRECTORY", "INDEXED", "PAUSED"].includes(a.status),
  );
  const failed = pending.filter((a) => a.status === "FAILED");
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
  const prepareRepository = useMutation({
    mutationFn: () =>
      githubCurriculumApi.prepare(grade, repository.data!.commit),
    onSuccess: (r) => {
      setNotice(
        `Automatic preparation ${r.resumed ? "is already running" : "queued"}. ${r.pausedDownloads} older download jobs paused. You can leave this page; progress is saved.`,
      );
      setAdvanceAfterPreparation(true);
      refresh();
    },
    onError: error,
  });
  const retryFailed = useMutation({
    mutationFn: () => ingestionApi.retry(failed.map((a) => a.id)),
    onSuccess: (r) => {
      setNotice(
        `${r.queued} failed documents queued for another download attempt.${r.skipped ? ` ${r.skipped} were already retried or have no failed job.` : ""}`,
      );
      refresh();
    },
    onError: error,
  });
  const canImport = (candidate: Candidate) =>
    candidate.grade === grade &&
    (!candidate.issue || candidate.issue.startsWith("Subject could"));
  const discover = useMutation({
    onMutate: () => {
      setNotice("");
      setExceptions([]);
    },
    mutationFn: (file?: File) => {
      if (file && file.size > 1024 * 1024)
        throw Error("Choose a saved KICD HTML page up to 1 MB.");
      return contentLibraryApi.discover(file, [grade]);
    },
    onSuccess: (r) => {
      const unique = [...new Map(r.candidates.map((c) => [c.url, c])).values()];
      setCandidates(unique);
      setSubjectEdits([]);
      setPicked(unique.filter(canImport).map((c) => c.url));
      setExceptions(r.errors);
      setConfirmed(false);
      setDiscovered(true);
      setNotice(
        unique.length
          ? "Curriculum links found. Check the subjects below, then save them."
          : "The live lookup could not resolve curriculum documents. Use the source links or saved-page option below; no subjects have been marked complete.",
      );
    },
    onError: error,
  });
  const saveCurriculum = useMutation({
    mutationFn: async () => {
      const selected = candidates.filter(
        (c) => picked.includes(c.url) && canImport(c),
      );
      if (!confirmed || !selected.length)
        throw Error(
          "Check the selected document links and confirm their use first.",
        );
      const rows =
        "Grade,Subject,Pathway\n" +
        [
          ...new Set(
            selected
              .filter((c) => c.subject?.trim())
              .map((c) => `${grade},"${c.subject!.replace(/"/g, '""')}",`),
          ),
        ].join("\n");
      if (selected.some((c) => c.subject?.trim())) {
        await ingestionApi.catalogue(
          rows,
          `KICD official directory, checked ${new Date().toISOString().slice(0, 10)}. Subject inventory still requires completeness review.`,
        );
      }
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
      setDiscovered(false);
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
      setLimitationsReviewed(d.mapping?._source?.limitationsReviewed ?? false);
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
      await ingestionApi.mapping(asset.id, asset.mapping, limitationsReviewed);
      await ingestionApi.approve([asset.id]);
      return asset.mapping.role;
    },
    onSuccess: (role) => {
      setAsset(null);
      setNotice(
        role === "FRAMEWORK"
          ? "Framework confirmed. Its subject proposals are being saved. Detailed grade-specific outcomes still need a reviewed subject design."
          : role === "TEACHING"
            ? "Teaching reference confirmed. It can support matching learning outcomes."
            : "Document confirmed. Its learning outcomes are being saved below.",
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
  const available = ready.map((s) => {
    const remaining = written ? s.nextWrittenUnitIds : s.nextPracticeUnitIds;
    const nextIds = remaining
      ? s.unitIds.filter((id) => remaining.includes(id))
      : s.unitIds;
    return {
      ...s,
      nextIds,
      isNew:
        nextIds.length === s.unitIds.length &&
        (remaining !== undefined ||
          s.draftQuestions + s.approvedQuestions === 0),
    };
  });
  const selectedScopes = available.filter((s) =>
    subject === "NEW"
      ? s.isNew
      : subject === "ALL" || generationSubjects.includes(s.id),
  );
  const plans = selectedScopes
    .filter((s) => s.nextIds.length > 0)
    .map((s) => {
      // Spread each new batch across outcomes that have neither saved questions
      // nor an active generation job for this assessment mode.
      const ids = [...new Set(s.nextIds)].sort((a, b) => a - b);
      const size = Math.min(6, ids.length);
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
      let reused = 0;
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
          reused += result.reused;
        } catch (e) {
          failures.push(
            `${plan.scope.subject}: ${apiErrorMessage(e, "Could not queue this subject")}`,
          );
        }
      }
      return { queued, reused, failures };
    },
    onSuccess: ({ queued, reused, failures }) => {
      setNotice(
        `${queued} new jobs queued${reused ? ` · ${reused} existing jobs or saved drafts reused` : ""}. ${queued ? "Questions run first, with up to three jobs together. Drafts and memory cards are saved for your review." : "Existing matching jobs or saved drafts are being reused."}${failures.length ? " Could not queue: " + failures.join(" · ") : ""}`,
      );
      if (queued || reused) setStep(3);
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
              <section className="space-y-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div>
                  <h4 className="font-semibold">Prepare {grade} curriculum</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Prepare all available subjects in one background run. No
                    individual PDF uploads or document checks are needed.
                  </p>
                </div>
                {repository.isLoading ? (
                  <p className="text-sm">Loading source list…</p>
                ) : repository.isError ? (
                  <p role="alert" className="text-sm">
                    The source snapshot is not ready yet.{" "}
                    <button
                      className="underline"
                      onClick={() => repository.refetch()}
                    >
                      Retry source list
                    </button>
                  </p>
                ) : (
                  <>
                    <details>
                      <summary className="cursor-pointer text-sm font-medium">
                        Review {repository.data?.files.length ?? 0} available{" "}
                        {grade} subject files
                      </summary>
                      <ul className="mt-3 divide-y rounded-lg border bg-white">
                        {repository.data?.files.map((f) => (
                          <li
                            key={f.id}
                            className="space-y-1 p-3 text-xs leading-6"
                          >
                            <strong>{f.subject}</strong>
                            <p>
                              Source revision {f.revision} ·{" "}
                              {f.extraction.error
                                ? "Extraction needs repair"
                                : `${f.extraction.outcomes} available outcome statements`}
                              {f.extraction.coverage?.warnings.length
                                ? " · Source gaps/discrepancies flagged"
                                : ""}
                            </p>
                            <div className="flex flex-wrap gap-3 text-blue-700 underline">
                              <a
                                href={f.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Source
                              </a>
                              <a
                                href={f.officialDirectory}
                                target="_blank"
                                rel="noreferrer"
                              >
                                KICD directory
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </details>
                    <p className="text-xs leading-6 text-slate-600">
                      The system checks and organises the available source
                      content automatically. Missing subjects or sections stay
                      flagged. Generated answers still need approval before
                      publication.
                    </p>
                    <button
                      className={primary}
                      disabled={
                        !repository.data?.files.length ||
                        prepareRepository.isPending ||
                        preparing
                      }
                      onClick={() => prepareRepository.mutate()}
                    >
                      {prepareRepository.isPending || preparing
                        ? `Preparing ${grade}…`
                        : `Prepare ${grade} automatically`}
                    </button>
                  </>
                )}
              </section>
              {preparation && (
                <section
                  className="space-y-3 rounded-lg border bg-slate-50 p-4"
                  aria-label="Grade preparation progress"
                >
                  <h4 className="font-semibold">
                    {grade} preparation ·{" "}
                    {preparation.status === "COMPLETED"
                      ? "Ready for generation"
                      : preparation.status === "FAILED"
                        ? "Needs attention"
                        : preparing
                          ? "In progress"
                          : preparation.status}
                  </h4>
                  <p className="text-sm">
                    {preparation.result?.processed ?? 0}/
                    {preparation.result?.total ??
                      repository.data?.files.length ??
                      0}{" "}
                    subject files processed ·{" "}
                    {preparation.result?.subjects?.length ?? 0} subjects ready
                  </p>
                  {!!preparation.result?.subjects?.filter(
                    (s) => s.sourceGaps > 0,
                  ).length && (
                    <p className="text-xs leading-6 text-amber-800">
                      {
                        preparation.result.subjects.filter(
                          (s) => s.sourceGaps > 0,
                        ).length
                      }{" "}
                      subjects have known source gaps. Available outcomes are
                      usable; missing sections remain flagged.
                    </p>
                  )}
                  {preparation.error && (
                    <p className="text-sm text-amber-800">
                      {preparation.error}
                    </p>
                  )}
                  {!!preparation.result?.failures?.length && (
                    <details>
                      <summary className="cursor-pointer text-sm">
                        View {preparation.result.failures.length} subject
                        exceptions
                      </summary>
                      {preparation.result.failures.map((f, i) => (
                        <p key={i} className="mt-2 text-xs leading-6">
                          {f.subject}: {f.error}
                        </p>
                      ))}
                    </details>
                  )}
                  {ready.length > 0 && (
                    <button className={primary} onClick={() => setStep(2)}>
                      Continue to generation <ArrowRight size={16} />
                    </button>
                  )}
                </section>
              )}
              <details className="rounded-lg border bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-500">
                  Other curriculum sources and advanced import
                </summary>
                <div className="mt-4 space-y-5">
                  {!scopes.length &&
                    !pending.length &&
                    !candidates.length &&
                    !repository.data?.files.length && (
                      <div className="rounded-lg bg-slate-50 p-5">
                        <BookOpen size={25} className="mb-3 text-blue-700" />
                        <h4 className="font-medium">
                          Let’s find your curriculum
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          We’ll look for the official {grade} designs. You won’t
                          need to upload a PDF for each subject.
                        </p>
                      </div>
                    )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={button}
                      disabled={discover.isPending || saveCurriculum.isPending}
                      onClick={() => discover.mutate(undefined)}
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
                  {(discover.isError ||
                    (discovered && !candidates.some(canImport))) && (
                    <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <h4 className="font-medium">
                        Use the page you can open in your browser
                      </h4>
                      <p className="text-sm leading-6 text-slate-600">
                        Open the official {grade} page, save it as “Webpage,
                        HTML only”, then select that single file here. We’ll
                        extract its document links; you do not need to upload
                        each subject PDF. Linked files must still be publicly
                        accessible.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <a
                          className={button}
                          target="_blank"
                          rel="noreferrer"
                          href={`https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-${["six-designs", "seven-designs", "eight-designs", "nine-designs", "ten", "eleven", "twelve"][grades.indexOf(grade)]}/`}
                        >
                          Open official {grade} page
                        </a>
                        <button
                          className={button}
                          disabled={discover.isPending}
                          onClick={() => savedPage.current?.click()}
                        >
                          Read saved KICD page
                        </button>
                      </div>
                      <input
                        ref={savedPage}
                        aria-label="Saved KICD grade page"
                        className="sr-only"
                        type="file"
                        accept=".html,text/html"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) discover.mutate(file);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                  {discovered && (
                    <>
                      {!!exceptions.length && (
                        <details className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                          <summary className="cursor-pointer font-medium">
                            Some curriculum links could not be resolved · view
                            details
                          </summary>
                          <ul className="mt-3 space-y-3">
                            {exceptions.map((e, i) => (
                              <li
                                key={i}
                                className="space-y-1 text-xs leading-6"
                              >
                                <p>{e.message}</p>
                                <a
                                  className="break-all text-blue-700 underline"
                                  href={e.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open source page
                                </a>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {!!candidates.length && (
                        <div className="space-y-4 rounded-lg border p-4">
                          <h4 className="font-medium">
                            Check the subjects we found
                          </h4>
                          <div className="max-h-72 space-y-2 overflow-y-auto">
                            {candidates.map((c) => (
                              <div
                                key={c.url}
                                className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm"
                              >
                                <input
                                  aria-label={`Import ${c.subject ?? c.title}`}
                                  type="checkbox"
                                  checked={picked.includes(c.url)}
                                  disabled={!canImport(c)}
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
                                    {!c.subject && canImport(c)
                                      ? " · Subject will be identified after download"
                                      : c.issue
                                        ? ` · ${c.issue}`
                                        : ""}
                                  </span>
                                  {subjectEdits.includes(c.url) ? (
                                    <input
                                      aria-label={`Subject name for ${c.title}`}
                                      className="my-2 block min-h-10 w-full min-w-0 rounded-lg border p-2 text-sm"
                                      placeholder="Optional: leave blank for automatic identification"
                                      value={c.subject ?? ""}
                                      onChange={(e) => {
                                        const subject = e.target.value;
                                        setCandidates((v) =>
                                          v.map((x) =>
                                            x.url === c.url
                                              ? {
                                                  ...x,
                                                  subject,
                                                  issue:
                                                    x.issue?.startsWith(
                                                      "Subject could",
                                                    ) && subject.trim()
                                                      ? undefined
                                                      : x.issue,
                                                }
                                              : x,
                                          ),
                                        );
                                      }}
                                    />
                                  ) : (
                                    <button
                                      className="mr-3 text-xs text-slate-500 underline"
                                      onClick={() =>
                                        setSubjectEdits((v) => [...v, c.url])
                                      }
                                    >
                                      Edit subject
                                    </button>
                                  )}
                                  <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-700 underline"
                                  >
                                    View source
                                  </a>
                                </span>
                              </div>
                            ))}
                          </div>
                          <label className="flex items-start gap-3 text-sm leading-6">
                            <input
                              className="mt-1"
                              type="checkbox"
                              checked={confirmed}
                              onChange={(e) => setConfirmed(e.target.checked)}
                            />
                            I checked that these are the intended curriculum
                            documents and have permission to use them.
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
                </div>
              </details>
              {!!pending.length && (
                <details className="space-y-3 border-t pt-5">
                  <summary className="cursor-pointer text-sm font-medium">
                    Source details and manual corrections ({pending.length})
                  </summary>
                  <h4 className="font-medium">
                    Check your curriculum documents
                  </h4>
                  <p className="text-sm text-slate-500">
                    When a document is ready, check its grade, subject and
                    extracted outcomes.
                  </p>
                  {failed.length > 0 && (
                    <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                      <p className="text-sm leading-6">
                        {failed.length} documents need another download attempt.
                        Retry the existing jobs without finding or importing the
                        curriculum again.
                      </p>
                      <button
                        className={button}
                        disabled={retryFailed.isPending}
                        onClick={() => retryFailed.mutate()}
                      >
                        {retryFailed.isPending
                          ? "Queuing retries…"
                          : `Retry failed documents (${failed.length})`}
                      </button>
                    </div>
                  )}
                  <details
                    open={
                      !failed.length ||
                      pending.some((a) => a.status === "REVIEW")
                    }
                  >
                    <summary className="cursor-pointer text-sm text-slate-500">
                      View {pending.length} documents and download details
                    </summary>
                    <div className="mt-3 space-y-3">
                      {pending.map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium">
                              {["uc", "download"].includes(a.name) &&
                              a.origin.includes("drive.google")
                                ? "Google Drive curriculum document"
                                : a.name}
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
                          {originalDocumentLink(a.origin) && (
                            <a
                              className="text-sm text-blue-700 underline"
                              href={originalDocumentLink(a.origin)!}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open original document
                            </a>
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
                  </details>
                </details>
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
                  {asset.mapping.role === "FRAMEWORK" && (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      This framework can propose subjects and broad learning
                      goals. Saving it does not create verified grade-specific
                      strands or unlock every subject for generation.
                    </p>
                  )}
                  <RepositorySourceReview
                    source={asset.mapping._source}
                    acknowledged={limitationsReviewed}
                    onAcknowledge={setLimitationsReviewed}
                  />
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
                    disabled={
                      index.isPending ||
                      (!!asset.mapping._source?.coverage.warnings.length &&
                        !limitationsReviewed)
                    }
                    onClick={() => index.mutate()}
                  >
                    {index.isPending
                      ? "Saving…"
                      : asset.mapping.role === "FRAMEWORK"
                        ? "Confirm framework & save subject structure"
                        : asset.mapping.role === "TEACHING"
                          ? "Confirm teaching reference"
                          : "Confirm document & save outcomes"}
                  </button>
                </div>
              )}
              {!!scopes.length && (
                <details className="space-y-4 border-t pt-5" open={false}>
                  <summary className="cursor-pointer text-sm font-medium">
                    Available {grade} subjects ({scopes.length})
                  </summary>
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
                                : `${s.verifiedOutcomes}/${s.outcomeCount} outcomes validated`}
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
                  {!gradeReviewed &&
                    !preparation &&
                    !repository.data?.files.length && (
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
                          This is the complete subject list for {grade},
                          including applicable pathways and subject
                          alternatives.
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
                      Use automatic preparation above to validate the available
                      curriculum and continue.
                    </p>
                  )}
                </details>
              )}
              <details className="border-t pt-4 text-sm">
                <summary className="cursor-pointer text-slate-500">
                  More curriculum options
                </summary>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={showOtherSources}
                      onChange={(e) => setShowOtherSources(e.target.checked)}
                    />
                    Show alternative and old download attempts
                  </label>
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
                  Generate {grade} content
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  AI will create original questions, explanations and recall
                  cards from validated outcomes. Start small to keep generation
                  costs down.
                </p>
              </div>
              {!ready.length ? (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm">
                    No subjects are ready yet. Prepare this grade to continue.
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
                      disabled={generate.isPending}
                      className={button + " mt-2 w-full min-w-0"}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option value="NEW">
                        New subjects only (
                        {available.filter((s) => s.isNew).length})
                      </option>
                      <option value="ALL">
                        Next batch for all ready subjects ({ready.length})
                      </option>
                      <option value="CHOOSE">Choose subjects</option>
                    </select>
                  </label>
                  {subject === "CHOOSE" && (
                    <fieldset className="rounded-lg border border-slate-200 p-4">
                      <legend className="px-1 text-xs font-medium">
                        Subjects for this batch
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {available.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-start gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={generationSubjects.includes(s.id)}
                              disabled={generate.isPending || !s.nextIds.length}
                              onChange={(e) =>
                                setGenerationSubjects((ids) =>
                                  e.target.checked
                                    ? [...ids, s.id]
                                    : ids.filter((id) => id !== s.id),
                                )
                              }
                            />
                            <span>
                              {s.subject}
                              <span className="mt-1 block text-xs text-slate-500">
                                {s.nextIds.length
                                  ? `${s.nextIds.length} unused outcomes${s.isNew ? " · new subject" : ""}`
                                  : "All available outcomes already used or queued"}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {!plans.length && (
                    <p className="rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                      {subject === "NEW"
                        ? "These subjects already have saved or queued questions. Choose subjects, or select the next batch for all ready subjects, to cover additional outcomes."
                        : subject === "CHOOSE" && !generationSubjects.length
                          ? "Select the subjects you want to generate."
                          : "No unused validated outcomes remain in this selection. Failed jobs can be retried from Generation jobs."}
                    </p>
                  )}
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={written}
                      disabled={generate.isPending}
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
                      outcomes, plus recall cards. Existing saved or queued
                      outcomes are skipped. Each new batch covers additional
                      available outcomes.
                    </p>
                  </div>
                  {!!preparation?.result?.subjects?.filter(
                    (s) => s.sourceGaps > 0,
                  ).length && (
                    <p className="text-xs leading-6 text-slate-500">
                      Some source files are partial. Generation uses the
                      validated outcomes that are available; missing sections
                      remain flagged.
                    </p>
                  )}
                  {scopes.length > ready.length && (
                    <p className="text-sm text-amber-800">
                      {scopes.length - ready.length} subjects still need
                      curriculum checks. Return to setup to prepare them.
                    </p>
                  )}
                  <button
                    className={primary}
                    disabled={
                      generate.isPending || !plans.length || overview.isFetching
                    }
                    onClick={() => generate.mutate()}
                  >
                    {generate.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ArrowRight size={16} />
                    )}{" "}
                    {generate.isPending
                      ? "Queuing content…"
                      : "Generate new batch"}
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
