import { DocumentMappingEditor } from "./DocumentMappingEditor";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Archive,
  FolderOpen,
  Link2,
  BookOpen,
  RefreshCw,
  ArrowLeft,
  FileText,
} from "lucide-react";
import {
  ingestionApi,
  type IngestionAsset,
  type Mapping,
  type Outcome,
  type ScopeCoverage,
} from "../../api/ingestion.api";
import { contentLibraryApi } from "../../api/content-library.api";
import { apiErrorMessage } from "../../api/axios";
const GRADES = [6, 7, 8, 9, 10, 11, 12].map((g) => `Grade ${g}`),
  control =
    "min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40";
export function CurriculumIngestion() {
  const client = useQueryClient(),
    folder = useRef<HTMLInputElement>(null),
    [grades, setGrades] = useState(GRADES),
    [tab, setTab] = useState<"intake" | "review" | "coverage">("intake"),
    [name, setName] = useState("CBC content collection"),
    [rights, setRights] = useState(false),
    [urls, setUrls] = useState(""),
    [notice, setNotice] = useState(""),
    [progress, setProgress] = useState(""),
    [selection, setSelection] = useState<string[]>([]),
    [catalogue, setCatalogue] = useState("Grade,Subject,Pathway\n"),
    [catalogueProposal, setCatalogueProposal] = useState<
      { grade: string; subject: string }[]
    >([]),
    [authority, setAuthority] = useState(""),
    [catalogReviewed, setCatalogReviewed] = useState(false),
    [scope, setScope] = useState<ScopeCoverage | null>(null),
    [asset, setAsset] = useState<IngestionAsset | null>(null),
    [mapping, setMapping] = useState<Mapping>({
      role: "TEACHING",
      note: "",
      subjects: [],
    }),
    [excerpt, setExcerpt] = useState(""),
    [count, setCount] = useState(10),
    [focusCollection, setFocusCollection] = useState(""),
    [documentPage, setDocumentPage] = useState(0);
  const query = useQuery({
    queryKey: ["curriculum-ingestion"],
    queryFn: ingestionApi.overview,
    refetchInterval: 4000,
  });
  useEffect(() => {
    folder.current?.setAttribute("webkitdirectory", "");
  }, [tab]);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["curriculum-ingestion"] });
    void client.invalidateQueries({ queryKey: ["content-library"] });
    void client.invalidateQueries({ queryKey: ["question-bank-admin"] });
  };
  const error = (e: unknown) =>
    setNotice(
      apiErrorMessage(e, e instanceof Error ? e.message : "Operation failed."),
    );
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      if (!rights || !grades.length)
        throw Error("Select grades and confirm source-use rights.");
      const c = await ingestionApi.create({
        name,
        grades,
        rightsConfirmed: true,
      });
      const failures: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1}/${files.length}: ${files[i].name}`);
        try {
          const r = await ingestionApi.upload(c.id, files[i]);
          failures.push(
            ...r.results
              .filter((x) => x.error)
              .map((x) => `${x.name}: ${x.error}`),
          );
        } catch (e) {
          failures.push(
            `${files[i].name}: ${apiErrorMessage(e, "Upload failed")}`,
          );
        }
      }
      return { files: files.length, failures };
    },
    onSuccess: (r) => {
      setProgress("");
      setNotice(
        `${r.files} uploads processed. Classification continues in the background.${r.failures.length ? " Exceptions: " + r.failures.join(" · ") : ""}`,
      );
      setTab("review");
      refresh();
    },
    onError: (e) => {
      setProgress("");
      error(e);
    },
  });
  const crawl = useMutation({
    mutationFn: () => {
      if (!rights || !grades.length)
        throw Error("Select grades and confirm source-use rights.");
      const links = urls
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean);
      if (!links.length) throw Error("Enter at least one collection URL.");
      return ingestionApi.create({
        name,
        grades,
        rightsConfirmed: true,
        urls: links,
      });
    },
    onSuccess: () => {
      setNotice(
        "Website collection queued. Failed or unclassified documents remain visible for review.",
      );
      setTab("review");
      refresh();
    },
    onError: error,
  });
  const official = useMutation({
    mutationFn: () => contentLibraryApi.discover(undefined, grades),
    onSuccess: (r) => {
      const mapped = r.candidates.filter(
        (c) => c.grade && c.subject && !c.issue,
      );
      setCatalogueProposal(
        Array.from(
          new Map(
            mapped.map((c) => [
              `${c.grade}/${c.subject}`,
              { grade: c.grade!, subject: c.subject! },
            ]),
          ).values(),
        ),
      );
      setCatalogue(
        "Grade,Subject,Pathway\n" +
          [
            ...new Set(
              mapped.map(
                (c) => `${c.grade},"${c.subject!.replace(/"/g, '""')}",`,
              ),
            ),
          ].join("\n"),
      );
      setAuthority(
        `KICD curriculum-design directory, retrieved ${new Date().toISOString().slice(0, 10)}. Confirm subject-list completeness against current official designs.`,
      );
      setNotice(
        `Found ${mapped.length} mapped designs. Review the proposed subjects; ${r.errors.length} discovery exceptions mean this is not automatically a complete subject list.`,
      );
      setTab("coverage");
    },
    onError: error,
  });
  const reuse = useMutation({
    mutationFn: () =>
      ingestionApi.fromLibrary(
        (query.data?.sources ?? [])
          .filter((s) => grades.includes(s.grade) && !s.reviewed)
          .map((s) => s.id),
      ),
    onSuccess: () => {
      setNotice(
        "Existing indexed sources queued for curriculum/teaching classification; no re-upload required.",
      );
      setTab("review");
      refresh();
    },
    onError: error,
  });
  const addCatalogue = useMutation({
    mutationFn: () => ingestionApi.catalogue(catalogue, authority),
    onSuccess: (r) => {
      setNotice(
        `${r.count} expected subject rows saved as unverified. Missing resources will now appear in coverage.`,
      );
      setCatalogReviewed(false);
      refresh();
    },
    onError: error,
  });
  const verify = useMutation({
    mutationFn: () => ingestionApi.verify(grades),
    onSuccess: () => {
      setNotice(
        "Expected subject lists confirmed for the selected grades. Outcomes still require their own evidence review.",
      );
      refresh();
    },
    onError: error,
  });
  const approve = useMutation({
    mutationFn: () => ingestionApi.approve(selection),
    onSuccess: (r) => {
      setSelection([]);
      setNotice(`${r.queued} reviewed documents queued for indexing.`);
      refresh();
    },
    onError: error,
  });
  const saveMapping = useMutation({
    mutationFn: () => ingestionApi.mapping(asset!.id, mapping),
    onSuccess: () => {
      setAsset(null);
      setNotice("Mapping saved. Select the document to index it after review.");
      refresh();
    },
    onError: error,
  });
  const removeScope = useMutation({
    mutationFn: ingestionApi.removeScope,
    onSuccess: () => {
      setNotice(
        "Empty subject row removed. Reconfirm this grade’s expected catalogue after correction.",
      );
      refresh();
    },
    onError: error,
  });
  const documents = useQuery({
    queryKey: ["ingestion-documents", focusCollection, documentPage],
    queryFn: () => ingestionApi.documents(focusCollection, documentPage),
    enabled: !!focusCollection,
    refetchInterval: 4000,
  });
  const data = query.data,
    scopes = (data?.scopes ?? []).filter((s) => grades.includes(s.grade)),
    ready = scopes
      .filter(
        (s) =>
          s.verified &&
          data?.gradeReviews.some((r) => r.grade === s.grade && r.verifiedAt),
      )
      .flatMap((s) => s.unitIds);
  const generate = useMutation({
    mutationFn: () => ingestionApi.generate(ready, "BOTH", count),
    onSuccess: () => {
      setNotice(
        "Outcome-based question and recall-card jobs queued as drafts. Open Generation jobs to monitor them.",
      );
      refresh();
    },
    onError: error,
  });
  const reviewCollections =
    focusCollection && documents.data
      ? [
          {
            id: focusCollection,
            name: documents.data.name,
            assets: documents.data.items,
          },
        ]
      : (data?.collections ?? []);
  async function openAsset(a: IngestionAsset) {
    try {
      const d = await ingestionApi.asset(a.id);
      saveMapping.reset();
      setAsset(a);
      setMapping(d.mapping ?? { role: "TEACHING", note: "", subjects: [] });
      setExcerpt(d.extractedText);
    } catch (e) {
      error(e);
    }
  }
  if (scope)
    return (
      <OutcomeEditor
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            Curriculum Coverage & Ingestion
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            Ingest whole collections, establish the expected CBC subjects, then
            generate against reviewed learning outcomes. Uploaded files alone
            never prove complete curriculum coverage.
          </p>
        </div>
        <button className={control} onClick={refresh}>
          <RefreshCw size={15} className="mr-2 inline" />
          Refresh
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {GRADES.map((g) => (
          <label
            className={`${control} inline-flex items-center gap-2`}
            key={g}
          >
            <input
              type="checkbox"
              aria-label={`Coverage ${g}`}
              checked={grades.includes(g)}
              onChange={(e) => {
                setGrades((v) =>
                  e.target.checked ? [...v, g] : v.filter((x) => x !== g),
                );
                setCatalogReviewed(false);
              }}
            />
            {g}
          </label>
        ))}
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Ingestion workflow">
        {(
          [
            ["intake", "1 · Add collections"],
            ["review", "2 · Review documents"],
            ["coverage", "3 · Coverage & generation"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={`${control} ${tab === id ? "border-blue-400 text-blue-700" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <div
          role="status"
          className="rounded-lg border bg-white p-4 text-sm leading-7"
        >
          {notice}
        </div>
      )}
      {query.isError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 p-4 text-sm"
        >
          The ingestion backend is not ready or could not load.{" "}
          <button onClick={() => query.refetch()} className="underline">
            Retry
          </button>
        </p>
      )}
      {tab === "intake" && (
        <div className="space-y-5">
          <section className="space-y-4 rounded-xl border bg-white p-5">
            <h3 className="font-semibold">
              One collection, many grades and subjects
            </h3>
            <label className="block text-xs">
              Collection name
              <input
                aria-label="Collection name"
                className={control + " mt-2 w-full"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="flex items-start gap-3 text-sm leading-7">
              <input
                aria-label="Source use rights confirmed"
                className="mt-2"
                type="checkbox"
                checked={rights}
                onChange={(e) => setRights(e.target.checked)}
              />
              I own these materials or have permission to use them for indexing
              and content generation.
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className={`${control} flex cursor-pointer items-center justify-center gap-2 p-5 ${!rights ? "opacity-40" : ""}`}
              >
                <FolderOpen size={20} />
                Select a whole folder
                <input
                  ref={folder}
                  type="file"
                  aria-label="Upload document folder"
                  className="sr-only"
                  multiple
                  disabled={!rights || !grades.length || upload.isPending}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) upload.mutate(files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label
                className={`${control} flex cursor-pointer items-center justify-center gap-2 p-5 ${!rights ? "opacity-40" : ""}`}
              >
                <Archive size={20} />
                Upload ZIP or multiple documents
                <input
                  type="file"
                  aria-label="Upload content collection"
                  className="sr-only"
                  multiple
                  accept=".zip,.pdf,.txt,.html,.htm"
                  disabled={!rights || !grades.length || upload.isPending}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) upload.mutate(files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-xs leading-6 text-slate-500">
              Choose the collection once. Files upload in sequence; indexing
              continues in saved background jobs. PDFs/TXT/HTML: up to 15 MB
              each. ZIP: 50 MB compressed, 100 MB expanded, 200 entries. Keep
              this page open until uploads finish.
            </p>
            {progress && (
              <p role="status" className="text-sm text-blue-700">
                {progress}
              </p>
            )}
            <label className="block text-xs">
              Website directory or source-link collection
              <textarea
                aria-label="Collection website URLs"
                className={control + " mt-2 w-full"}
                rows={4}
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://kicd.ac.ke/cbc-materials/&#10;https://kcserevision.com/grade-1-2-3-4-5-6-7-8-cbc-revision/"
              />
            </label>
            <button
              className={control}
              disabled={!rights || !grades.length || crawl.isPending}
              onClick={() => crawl.mutate()}
            >
              <Link2 size={16} className="mr-2 inline" />
              Ingest website collection
            </button>
            <p className="text-xs leading-6 text-slate-500">
              KICD and KCSE Revision are enabled source hosts. Links requiring
              login, disabled external hosts, inaccessible pages and scanned
              documents are not silently replaced with generated facts.
            </p>
          </section>
          <section className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold">
              Start with the expected curriculum
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Import a framework/design collection to propose grade-specific
              subjects and quoted outcomes, or discover the official subject
              directory. Framework proposals require review and do not
              substitute for detailed subject designs.
            </p>
            <button
              className={control + " mt-4"}
              disabled={!grades.length || official.isPending}
              onClick={() => official.mutate()}
            >
              {official.isPending
                ? "Discovering official subjects…"
                : "Propose expected subjects from KICD"}
            </button>
            <button
              className={control + " mt-4"}
              disabled={
                reuse.isPending ||
                !(data?.sources ?? []).some(
                  (s) => grades.includes(s.grade) && !s.reviewed,
                )
              }
              onClick={() => reuse.mutate()}
            >
              Classify existing indexed sources · no re-upload
            </button>
            <Link
              to="/platform/question-bank?view=sources"
              className="ml-3 text-xs underline"
            >
              Official PDF discovery tools
            </Link>
          </section>
        </div>
      )}
      {tab === "review" && (
        <section className="space-y-4 rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">
              Document classification & provenance
            </h3>
            <button
              className={control}
              disabled={!selection.length || approve.isPending}
              onClick={() => approve.mutate()}
            >
              Index {selection.length} reviewed documents
            </button>
          </div>
          <p className="text-xs leading-6 text-slate-500">
            Check grade, subject, document role and source excerpts. Designs
            establish outcomes; teaching references supply explanations. Review
            proposed mappings before indexing.
          </p>
          <label className="block text-xs">
            Browse a complete collection
            <select
              aria-label="Review collection"
              className={control + " mt-2 w-full max-w-full"}
              value={focusCollection}
              onChange={(e) => {
                setFocusCollection(e.target.value);
                setDocumentPage(0);
              }}
            >
              <option value="">Recent collections · preview</option>
              {(data?.collectionIndex ?? data?.collections ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {focusCollection && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span>
                {documents.data?.total ?? 0} documents · Page {documentPage + 1}
              </span>
              <div className="flex gap-2">
                <button
                  className={control}
                  disabled={!documentPage}
                  onClick={() => setDocumentPage((p) => p - 1)}
                >
                  Previous documents
                </button>
                <button
                  className={control}
                  disabled={
                    !documents.data ||
                    (documentPage + 1) * documents.data.take >=
                      documents.data.total
                  }
                  onClick={() => setDocumentPage((p) => p + 1)}
                >
                  Next documents
                </button>
              </div>
            </div>
          )}
          {!data?.collections.length && (
            <p className="p-8 text-sm text-slate-500">
              No collections yet. Add a folder, ZIP or website directory.
            </p>
          )}
          {reviewCollections.map((c) => (
            <div key={c.id} className="space-y-3 border-t pt-4">
              <h4 className="font-semibold">{c.name}</h4>
              {c.assets.map((a) => (
                <article key={a.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <label className="flex min-w-0 items-start gap-3">
                      <input
                        aria-label={`Select document ${a.name}`}
                        className="mt-1"
                        type="checkbox"
                        disabled={a.status !== "REVIEW" || !a.mapping}
                        checked={selection.includes(a.id)}
                        onChange={(e) =>
                          setSelection(
                            e.target.checked
                              ? [...selection, a.id]
                              : selection.filter((id) => id !== a.id),
                          )
                        }
                      />
                      <span className="min-w-0">
                        <strong className="block break-words text-sm">
                          {a.name}
                        </strong>
                        <span className="mt-1 block text-xs text-slate-500">
                          {a.status} · {a.role}
                        </span>
                      </span>
                    </label>
                    <button
                      className="text-xs text-blue-700"
                      onClick={() => openAsset(a)}
                    >
                      Review mapping & excerpt
                    </button>
                  </div>
                  {a.mapping && (
                    <p className="mt-3 text-xs leading-6">
                      {a.mapping.subjects
                        .map(
                          (s) =>
                            `${s.grade} ${s.subject}${s.pathway ? " / " + s.pathway : ""} · ${s.units.length} outcomes`,
                        )
                        .join(" · ")}
                    </p>
                  )}
                  {a.error && (
                    <p className="mt-2 text-xs leading-6 text-amber-800">
                      {a.error}
                    </p>
                  )}
                  <p className="mt-2 break-all text-[11px] text-slate-400">
                    Source: {a.origin}
                  </p>
                </article>
              ))}
            </div>
          ))}
        </section>
      )}
      {tab === "coverage" && (
        <div className="space-y-5">
          <section className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold">Expected subject catalogue</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Include every applicable subject and senior pathway, including
              subjects with no uploaded content. Use the official discovery
              proposal, a reviewed framework extraction, or paste a complete
              CSV/TSV list. No subject list is assumed complete automatically.
            </p>
            <button
              className={control + " mt-4"}
              disabled={official.isPending || !grades.length}
              onClick={() => official.mutate()}
            >
              {official.isPending
                ? "Checking official directories…"
                : "Propose expected subjects from KICD"}
            </button>
            {catalogueProposal.length > 0 && (
              <div className="mt-4 rounded-lg border">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3">Grade</th>
                        <th className="p-3">Proposed subject</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogueProposal.map((row) => (
                        <tr
                          className="border-t"
                          key={`${row.grade}/${row.subject}`}
                        >
                          <td className="p-3">{row.grade}</td>
                          <td className="p-3">{row.subject}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t p-3">
                  <p className="mb-3 text-xs leading-6 text-slate-500">
                    {authority}
                  </p>
                  <button
                    className={control}
                    disabled={addCatalogue.isPending}
                    onClick={() => addCatalogue.mutate()}
                  >
                    Save proposed subject list
                  </button>
                </div>
              </div>
            )}
            <details className="mt-4 rounded-lg border p-3">
              <summary className="cursor-pointer text-sm text-slate-600">
                Add or correct catalogue rows (CSV/TSV)
              </summary>
              <textarea
                aria-label="Expected subject catalogue"
                className={control + " mt-4 w-full font-mono text-xs"}
                rows={6}
                value={catalogue}
                onChange={(e) => {
                  setCatalogue(e.target.value);
                  setCatalogueProposal([]);
                }}
              />
              <input
                aria-label="Catalogue authority"
                className={control + " mt-3 w-full"}
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                placeholder="Official curriculum source, edition/date and verification reference"
              />
              <button
                className={control + " mt-3"}
                disabled={addCatalogue.isPending || !authority.trim()}
                onClick={() => addCatalogue.mutate()}
              >
                Save expected subjects
              </button>
            </details>
            <label className="mt-4 flex items-start gap-3 text-xs leading-7">
              <input
                aria-label="Complete subject catalogue reviewed"
                className="mt-2"
                type="checkbox"
                checked={catalogReviewed}
                onChange={(e) => setCatalogReviewed(e.target.checked)}
              />
              I checked that the expected subject lists are complete for the
              selected grades and applicable senior-school pathways.
            </label>
            <button
              className={control + " mt-3"}
              disabled={!catalogReviewed || !grades.length || verify.isPending}
              onClick={() => verify.mutate()}
            >
              Confirm selected grade catalogues
            </button>
          </section>
          <section className="overflow-hidden rounded-xl border bg-white">
            <div className="border-b p-5">
              <h3 className="font-semibold">Coverage matrix</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {grades.map((g) => (
                  <span
                    className={`rounded-lg px-3 py-2 text-xs ${data?.gradeReviews.some((r) => r.grade === g && r.verifiedAt) ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                    key={g}
                  >
                    {g}:{" "}
                    {data?.gradeReviews.some(
                      (r) => r.grade === g && r.verifiedAt,
                    )
                      ? "catalogue reviewed"
                      : "subject list unverified / missing"}
                  </span>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {[
                      "Grade / subject / pathway",
                      "Curriculum designs",
                      "Teaching references",
                      "Reviewed outcomes / ready",
                      "Questions draft / approved",
                      "Cards draft / published",
                      "",
                    ].map((h, i) => (
                      <th className="p-3" key={i}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scopes.map((s) => (
                    <tr className="border-t" key={s.id}>
                      <th className="p-3">
                        <span className="block">
                          {s.grade} · {s.subject}
                        </span>
                        <span className="mt-1 block font-normal text-slate-500">
                          {s.pathway || "General"} ·{" "}
                          {s.verified
                            ? "Catalogue reviewed"
                            : "Catalogue draft"}
                        </span>
                      </th>
                      <td className="p-3">
                        {s.curriculumSources || "Missing"}
                      </td>
                      <td className="p-3">{s.teachingSources || "Missing"}</td>
                      <td className="p-3">
                        {s.verifiedOutcomes}/{s.outcomeCount} ·{" "}
                        {s.readyOutcomes} ready
                      </td>
                      <td className="p-3">
                        {s.draftQuestions} / {s.approvedQuestions}
                      </td>
                      <td className="p-3">
                        {s.draftCards} / {s.publishedCards}
                      </td>
                      <td className="p-3">
                        <button
                          className="whitespace-nowrap text-blue-700 underline"
                          onClick={() => setScope(s)}
                        >
                          Review outcomes
                        </button>
                        {s.outcomeCount === 0 && (
                          <button
                            className="mt-2 block text-xs text-red-700 underline"
                            disabled={removeScope.isPending}
                            onClick={() => removeScope.mutate(s.id)}
                          >
                            Remove empty catalogue row
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!scopes.length && (
              <p className="p-8 text-sm text-slate-500">
                No expected subjects recorded for these grades. Import/review
                the catalogue first; missing subjects cannot be measured from
                uploads alone.
              </p>
            )}
          </section>
          <section className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold">
              Generate from evidence-ready outcomes
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {ready.length} outcomes pass catalogue, curriculum and
              teaching-reference checks. Draft content is linked to its outcome
              and source document IDs. Missing material is a gap, not permission
              to invent.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="text-xs">
                Questions per outcome
                <input
                  aria-label="Outcome question count"
                  className={control + " ml-2 w-20"}
                  type="number"
                  min={5}
                  max={30}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
              <button
                disabled={
                  !ready.length || generate.isPending || count < 5 || count > 30
                }
                className={control + " text-blue-700"}
                onClick={() => generate.mutate()}
              >
                Generate questions & cards · {ready.length} outcomes
              </button>
            </div>
            <Link
              className="mt-4 inline-block text-xs underline"
              to="/platform/question-bank?view=jobs"
            >
              Open generation jobs
            </Link>
          </section>
        </div>
      )}
      {asset && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 sm:p-8"
          role="dialog"
          aria-label="Review document mapping"
          aria-modal="true"
        >
          <div className="mx-auto max-w-4xl space-y-4 rounded-xl bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{asset.name}</h3>
              <button className={control} onClick={() => setAsset(null)}>
                Close
              </button>
            </div>
            <p className="text-xs leading-6 text-slate-500">
              Review the structured mapping and exact source excerpts. Use role
              CURRICULUM, TEACHING or FRAMEWORK. Outcome quotations must occur
              in the extracted text.
            </p>
            <details>
              <summary className="cursor-pointer text-xs text-blue-700">
                Extracted source text
              </summary>
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-xs leading-6">
                {excerpt}
              </pre>
            </details>
            <DocumentMappingEditor value={mapping} onChange={setMapping} />
            <button
              className={control}
              disabled={asset.status === "INDEXED" || saveMapping.isPending}
              onClick={() => saveMapping.mutate()}
            >
              Save mapping for review
            </button>
            {saveMapping.isError && (
              <p role="alert" className="text-sm text-red-700">
                {apiErrorMessage(
                  saveMapping.error,
                  "Could not save this mapping. Check its source excerpts and grade selection.",
                )}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Saving does not publish content or mark a complete grade
              catalogue.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
function OutcomeEditor({
  scope,
  sources,
  onBack,
}: {
  scope: ScopeCoverage;
  sources: import("../../api/ingestion.api").SourceReference[];
  onBack: () => void;
}) {
  const client = useQueryClient(),
    query = useQuery({
      queryKey: ["curriculum-outcomes", scope.id],
      queryFn: () => ingestionApi.units(scope.id),
    }),
    [edited, setEdited] = useState<Record<number, Outcome>>({}),
    [notice, setNotice] = useState(""),
    [reviewed, setReviewed] = useState(false);
  const teaching = sources.filter(
      (s) =>
        s.grade === scope.grade &&
        s.subject === scope.subject &&
        s.role === "TEACHING" &&
        s.reviewed,
    ),
    units = (query.data ?? []).map((u) => edited[u.id] ?? u);
  const save = useMutation({
    mutationFn: async (ids: number[]) => {
      const selected = units.filter((u) => ids.includes(u.id));
      const results = await Promise.allSettled(
        selected.map((u) => ingestionApi.reviewUnit({ ...u, verified: true })),
      );
      return {
        count: results.filter((r) => r.status === "fulfilled").length,
        failures: results.flatMap((r, i) =>
          r.status === "rejected"
            ? [
                `${selected[i].subStrand}: ${apiErrorMessage(r.reason, "Review failed")}`,
              ]
            : [],
        ),
      };
    },
    onSuccess: (r) => {
      setNotice(
        `${r.count} outcomes reviewed.${r.failures.length ? " " + r.failures.join(" · ") : ""}`,
      );
      setEdited({});
      setReviewed(false);
      void client.invalidateQueries({
        queryKey: ["curriculum-outcomes", scope.id],
      });
      void client.invalidateQueries({ queryKey: ["curriculum-ingestion"] });
    },
  });
  return (
    <div className="space-y-5">
      <button
        className="inline-flex items-center gap-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft size={16} />
        Coverage matrix
      </button>
      <h2 className="text-xl font-semibold">
        {scope.grade} · {scope.subject}
        {scope.pathway ? " · " + scope.pathway : ""}
      </h2>
      <p className="text-sm leading-7 text-slate-500">
        Check the quoted curriculum evidence and teaching references. References
        are suggested automatically when grade and subject match; review their
        relevance to each outcome.
      </p>
      {notice && (
        <p role="status" className="rounded-lg border bg-white p-4 text-sm">
          {notice}
        </p>
      )}
      {query.isError && (
        <p role="alert">
          Could not load outcomes.{" "}
          <button onClick={() => query.refetch()}>Retry</button>
        </p>
      )}
      {!units.length && !query.isLoading && (
        <p className="rounded-xl border border-dashed p-8 text-sm text-slate-500">
          No detailed curriculum outcomes indexed. Ingest a subject-design
          collection; a framework or textbook alone does not establish outcomes.
        </p>
      )}
      {units.length > 0 && (
        <section className="rounded-xl border bg-white p-4">
          <label className="flex items-start gap-3 text-xs leading-7">
            <input
              aria-label="All outcome evidence reviewed"
              className="mt-2"
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed the outcomes below, their source quotations and selected
            supporting references.
          </label>
          <button
            className={control + " mt-3"}
            disabled={
              !reviewed ||
              save.isPending ||
              units.some((u) => !u.supportingSourceIds.length)
            }
            onClick={() => save.mutate(units.map((u) => u.id))}
          >
            Confirm all {units.length} reviewed outcomes
          </button>
          {!teaching.length && (
            <p className="mt-3 text-xs text-amber-800">
              Missing teaching material. Ingest notes, a textbook or revision
              references for this grade and subject.
            </p>
          )}
        </section>
      )}
      {units.map((unit) => (
        <section
          key={unit.id}
          className="space-y-4 rounded-xl border bg-white p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">
              {unit.strand} / {unit.subStrand}
            </h3>
            <span className="text-xs text-slate-500">
              {unit.verified ? "Reviewed" : "Needs review"}
            </span>
          </div>
          {(["strand", "subStrand", "outcome", "quote"] as const).map((key) => (
            <label key={key} className="block text-xs">
              {key === "quote"
                ? "Exact curriculum quotation"
                : key === "outcome"
                  ? "Learning outcome"
                  : key === "subStrand"
                    ? "Sub-strand"
                    : "Strand"}
              <textarea
                className={control + " mt-2 w-full"}
                rows={key === "quote" ? 3 : 2}
                value={unit[key]}
                onChange={(e) => {
                  setEdited((v) => ({
                    ...v,
                    [unit.id]: { ...unit, [key]: e.target.value },
                  }));
                  setReviewed(false);
                }}
              />
            </label>
          ))}
          <p className="text-xs text-slate-500">
            <FileText size={14} className="mr-2 inline" />
            Curriculum source #{unit.sourceDocumentId}:{" "}
            {sources.find((s) => s.id === unit.sourceDocumentId)?.title ??
              "Source record"}
          </p>
          <fieldset className="space-y-2 border-t pt-4">
            <legend className="text-xs font-semibold">
              Supporting teaching references
            </legend>
            {teaching.map((s) => (
              <label
                className="flex items-start gap-3 text-xs leading-6"
                key={s.id}
              >
                <input
                  aria-label={`Reference ${s.id} for outcome ${unit.id}`}
                  className="mt-1"
                  type="checkbox"
                  checked={unit.supportingSourceIds.includes(s.id)}
                  onChange={(e) => {
                    setEdited((v) => ({
                      ...v,
                      [unit.id]: {
                        ...unit,
                        supportingSourceIds: e.target.checked
                          ? [...unit.supportingSourceIds, s.id]
                          : unit.supportingSourceIds.filter(
                              (id) => id !== s.id,
                            ),
                      },
                    }));
                    setReviewed(false);
                  }}
                />
                {s.title}
              </label>
            ))}
          </fieldset>
          <button
            className={control}
            disabled={save.isPending || !unit.supportingSourceIds.length}
            onClick={() => save.mutate([unit.id])}
          >
            <BookOpen size={15} className="mr-2 inline" />
            Save reviewed outcome
          </button>
        </section>
      ))}
    </div>
  );
}
