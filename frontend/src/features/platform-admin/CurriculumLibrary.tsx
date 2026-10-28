import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Upload,
  BookOpen,
  FileText,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Send,
  LoaderCircle,
  ChevronRight,
} from "lucide-react";
import { aiContentApi, type AiArtifactContent } from "../../api/ai-content.api";
import { curriculumApi, type CurriculumUnit } from "../../api/curriculum.api";
import { apiErrorMessage } from "../../api/axios";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold disabled:opacity-40";
const input =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm";
function status(unit: CurriculumUnit) {
  return unit.artifacts[0]?.status ?? unit.status;
}
function Review({ id, onClose }: { id: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const client = useQueryClient(),
    query = useQuery({
      queryKey: ["curriculum-artifact", id],
      queryFn: () => aiContentApi.getArtifact(id),
    });
  const [content, setContent] = useState<AiArtifactContent | null>(null),
    [checked, setChecked] = useState(false),
    [note, setNote] = useState("");
  useEffect(() => {
    if (query.data) {
      setContent(query.data.content);
      setChecked(false);
    }
  }, [query.data]);
  const action = useMutation({
    mutationFn: async (type: "save" | "approve" | "reject") => {
      if (type === "save" && content)
        return aiContentApi.editArtifact(id, content);
      if (type === "reject") return aiContentApi.rejectArtifact(id, note);
      return aiContentApi.approveArtifact(id, note);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["curriculum-artifact", id] });
      void client.invalidateQueries({ queryKey: ["curriculum-coverage"] });
    },
  });
  const a = query.data;
  const editable = a && !["PUBLISHED", "ARCHIVED"].includes(a.status);
  const dirty = JSON.stringify(content) !== JSON.stringify(a?.content);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-label="Assignment review"
      className="max-h-[90vh] w-[min(1000px,95vw)] rounded-xl p-0 backdrop:bg-slate-900/50"
    >
      <section
        className="space-y-4 rounded-xl border border-blue-200 bg-white p-5 sm:p-7"
        aria-label="Assignment review"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-700">
              Review assignment #{id} · {a?.status}
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              {a?.content.title ?? "Loading draft…"}
            </h2>
          </div>
          <button className={button} onClick={onClose}>
            Close review
          </button>
        </div>
        {query.error && (
          <p role="alert">
            {apiErrorMessage(query.error, "Could not load draft.")}
          </p>
        )}
        {content && (
          <>
            <p className="text-sm text-slate-500">
              {content.grade} · {content.subject} · {content.topicName}
            </p>
            <label className="block text-sm">
              Title
              <input
                className={input}
                disabled={!editable}
                value={content.title}
                onChange={(e) =>
                  setContent({ ...content, title: e.target.value })
                }
              />
            </label>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-2">
              {content.questions.map((q, i) => {
                const change = (value: Partial<typeof q>) => {
                  setChecked(false);
                  setContent({
                    ...content,
                    questions: content.questions.map((v, j) =>
                      i === j ? { ...v, ...value } : v,
                    ),
                  });
                };
                return (
                  <article key={i} className="space-y-3 rounded-lg border p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Question {i + 1} · {q.questionType} · {q.points} marks
                    </p>
                    <label className="block text-xs">
                      Question
                      <textarea
                        className={input}
                        disabled={!editable}
                        rows={3}
                        value={q.questionText}
                        onChange={(e) =>
                          change({ questionText: e.target.value })
                        }
                      />
                    </label>
                    {q.options && (
                      <label className="block text-xs">
                        Options · one per line
                        <textarea
                          className={input}
                          disabled={!editable}
                          rows={4}
                          value={q.options.join("\n")}
                          onChange={(e) =>
                            change({ options: e.target.value.split("\n") })
                          }
                        />
                      </label>
                    )}
                    <label className="block text-xs">
                      Correct answer
                      <input
                        className={input}
                        disabled={!editable}
                        value={q.correctAnswer}
                        onChange={(e) =>
                          change({ correctAnswer: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-xs">
                      Worked explanation
                      <textarea
                        className={input}
                        disabled={!editable}
                        rows={3}
                        value={q.explanation}
                        onChange={(e) =>
                          change({ explanation: e.target.value })
                        }
                      />
                    </label>
                  </article>
                );
              })}
            </div>
            {editable && (
              <>
                <label className="block text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />{" "}
                  I checked the questions, correct answers, explanations and
                  grade suitability against the source.
                </label>
                <label className="block text-xs">
                  Review notes
                  <textarea
                    className={input}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={!dirty || action.isPending}
                    onClick={() => action.mutate("save")}
                  >
                    Save edits
                  </button>
                  <button
                    className={`${button} bg-blue-700 text-white`}
                    disabled={
                      !checked ||
                      dirty ||
                      action.isPending ||
                      a.status === "APPROVED"
                    }
                    onClick={() => action.mutate("approve")}
                  >
                    <CheckCircle2 size={15} />
                    Validate & approve
                  </button>
                  <button
                    className={button}
                    disabled={note.trim().length < 3 || action.isPending}
                    onClick={() => action.mutate("reject")}
                  >
                    Reject with notes
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Approval runs structural validation. You remain responsible
                  for factual correctness. Editing a draft clears its approval.
                </p>
              </>
            )}
            {action.error && (
              <p role="alert" className="text-sm text-red-700">
                {apiErrorMessage(action.error, "Review action failed.")}
              </p>
            )}
          </>
        )}
      </section>
    </dialog>
  );
}
export function CurriculumLibrary() {
  const client = useQueryClient(),
    [selected, setSelected] = useState<number | null>(null),
    [grade, setGrade] = useState("Grade 9"),
    [subject, setSubject] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [reviewed, setReviewed] = useState(false),
    [count, setCount] = useState(10),
    [reviewId, setReviewId] = useState<number | null>(null),
    [publishIds, setPublishIds] = useState<number[]>([]),
    [notice, setNotice] = useState(""),
    [filter, setFilter] = useState("");
  const documents = useQuery({
    queryKey: ["curriculum-documents"],
    queryFn: curriculumApi.documents,
    refetchInterval: 10000,
  });
  const coverage = useQuery({
    queryKey: ["curriculum-coverage", selected],
    queryFn: () => curriculumApi.coverage(selected!),
    enabled: selected !== null,
    refetchInterval: 5000,
  });
  const units = coverage.data?.units ?? [],
    doc = coverage.data?.document;
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["curriculum-documents"] });
    void client.invalidateQueries({ queryKey: ["curriculum-coverage"] });
  };
  const upload = useMutation({
    mutationFn: () =>
      aiContentApi.uploadPdf({ file: file!, grade, subject: subject.trim() }),
    onSuccess: (d) => {
      setSelected(d.id);
      setReviewed(false);
      setNotice(
        "PDF uploaded. Curriculum extraction is running in the background.",
      );
      refresh();
    },
  });
  const populate = useMutation({
    mutationFn: async () => {
      const missing = units.filter(
        (u) =>
          ["MISSING", "FAILED", "CANCELLED", "REJECTED", "ARCHIVED"].includes(
            status(u),
          ) || u.status === "QUEUED",
      );
      let accepted = 0;
      const failures: string[] = [];
      for (let i = 0; i < missing.length; i += 20) {
        const response = await curriculumApi.populate(
          selected!,
          missing.slice(i, i + 20).map((u) => u.id),
          count,
        );
        for (const r of response.results) {
          if (r.status === "ERROR")
            failures.push(r.error ?? "Generation request failed");
          else accepted++;
        }
        setNotice(
          `${accepted} units accepted. ${failures.length} could not be queued.`,
        );
      }
      return { accepted, failures };
    },
    onSuccess: (r) => {
      setNotice(
        `${r.accepted} units accepted for background generation.${r.failures.length ? " Issues: " + [...new Set(r.failures)].join("; ") : " Review drafts as they become ready."}`,
      );
      refresh();
    },
  });
  const publish = useMutation({
    mutationFn: async () => {
      const errors: string[] = [];
      let total = 0;
      for (let i = 0; i < publishIds.length; i += 20) {
        const r = await curriculumApi.publish(
          selected!,
          publishIds.slice(i, i + 20),
        );
        r.results.forEach((row) =>
          row.status === "ERROR"
            ? errors.push(row.error ?? "Publication failed")
            : total++,
        );
      }
      return { total, errors };
    },
    onSuccess: (r) => {
      setNotice(
        `${r.total} assignments published to independent learners.${r.errors.length ? " Issues: " + r.errors.join("; ") : ""}`,
      );
      setPublishIds([]);
      refresh();
    },
  });
  const busy = populate.isPending || publish.isPending || upload.isPending;
  const choose = (id: number) => {
    setSelected(id);
    setReviewed(false);
    setReviewId(null);
    setPublishIds([]);
    setNotice("");
  };
  const missing = units.filter(
    (u) =>
      ["MISSING", "FAILED", "CANCELLED", "REJECTED", "ARCHIVED"].includes(
        status(u),
      ) || u.status === "QUEUED",
  ).length;
  return (
    <div className="space-y-6 text-slate-800">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Platform content
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Curriculum library</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Upload a grade and subject curriculum, check its structure, then
            generate and review practice for independent learners.
          </p>
        </div>
        <Link className={button} to="/platform/ai-management">
          AI settings
        </Link>
      </header>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Upload size={18} />
          Upload curriculum design
        </h2>
        <form
          className="mt-4 grid items-end gap-4 md:grid-cols-[150px_1fr_1.5fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            upload.mutate();
          }}
        >
          <label className="text-xs">
            Grade
            <select
              className={input}
              aria-label="Grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i}>Grade {i + 1}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Subject / learning area
            <input
              required
              maxLength={120}
              className={input}
              aria-label="Subject / learning area"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Integrated Science"
            />
          </label>
          <label className="text-xs">
            Curriculum PDF · up to 15 MB
            <input
              aria-label="Curriculum PDF"
              className={input}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            disabled={
              !file || file.size > 15 * 1024 * 1024 || !subject.trim() || busy
            }
            className={`${button} bg-slate-900 text-white`}
          >
            <Upload size={15} />
            Upload & extract
          </button>
        </form>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          Use an official grade/subject design or material you have permission
          to use. The PDF is a blueprint for original practice. Upload each
          grade and subject separately; no online scraping is performed.
        </p>
      </section>
      {(upload.error ||
        documents.error ||
        coverage.error ||
        populate.error ||
        publish.error) && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {apiErrorMessage(
            upload.error ??
              documents.error ??
              coverage.error ??
              populate.error ??
              publish.error,
            "Could not complete this action. Check AI settings and retry.",
          )}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm"
        >
          {notice}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-xl border bg-white">
          <h2 className="border-b p-4 text-sm font-semibold">
            Uploaded curricula
          </h2>
          {documents.isLoading && <p className="p-4 text-sm">Loading…</p>}
          {documents.data?.length === 0 && (
            <p className="p-4 text-sm text-slate-500">
              Upload your first curriculum to start.
            </p>
          )}
          <div className="max-h-[65vh] overflow-y-auto">
            {documents.data?.map((d) => (
              <button
                disabled={busy}
                key={d.id}
                onClick={() => choose(d.id)}
                className={`flex min-h-20 w-full items-start gap-3 border-b p-4 text-left ${d.id === selected ? "bg-blue-50" : ""}`}
              >
                <FileText className="mt-1 shrink-0" size={17} />
                <span className="min-w-0">
                  <strong className="block text-sm">
                    {d.grade} · {d.subject}
                  </strong>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {d.fileName}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-wide">
                    {d.status}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className="min-w-0 space-y-4">
          {!selected ? (
            <div className="rounded-xl border bg-white p-10 text-center">
              <BookOpen className="mx-auto mb-4 text-slate-400" size={30} />
              <p>Select a curriculum to view its coverage.</p>
            </div>
          ) : !doc ? (
            <p className="p-5">Loading curriculum…</p>
          ) : (
            <>
              <div className="rounded-xl border bg-white p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {doc.grade} · {doc.subject}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {doc.fileName}
                    </p>
                  </div>
                  <button className={button} onClick={refresh}>
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>
                {doc.status === "PROCESSING" ? (
                  <p className="mt-5 flex items-center gap-2 text-sm">
                    <LoaderCircle size={16} className="animate-spin" />
                    Extracting curriculum structure… You can leave and return to
                    this document.
                  </p>
                ) : doc.status === "FAILED" ? (
                  <p role="alert" className="mt-4 text-sm text-red-700">
                    {doc.error ?? "Extraction failed."} Upload the PDF again, or
                    split a large document into smaller strand PDFs.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                      {[
                        ["Units", units.length],
                        [
                          "Drafts ready",
                          units.filter((u) =>
                            ["GENERATED", "IN_REVIEW", "APPROVED"].includes(
                              status(u),
                            ),
                          ).length,
                        ],
                        [
                          "Published",
                          units.filter((u) => status(u) === "PUBLISHED").length,
                        ],
                      ].map(([name, n]) => (
                        <div key={name} className="rounded-lg bg-slate-50 p-3">
                          <strong className="block text-xl">{n}</strong>
                          <span className="text-xs text-slate-500">{name}</span>
                        </div>
                      ))}
                    </div>
                    <label className="mt-5 block text-sm leading-6">
                      <input
                        type="checkbox"
                        checked={reviewed}
                        onChange={(e) => setReviewed(e.target.checked)}
                      />{" "}
                      I checked the extracted strands, sub-strands and outcomes
                      against the PDF.
                    </label>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <label className="text-xs">
                        Questions per unit
                        <select
                          className={`${input} !mt-1`}
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                        >
                          {[5, 10, 15, 20].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className={`${button} bg-blue-700 text-white`}
                        disabled={!reviewed || !missing || busy}
                        onClick={() => populate.mutate()}
                      >
                        <Sparkles size={15} />
                        {populate.isPending
                          ? "Queuing…"
                          : `Generate missing / retry (${missing})`}
                      </button>
                      <button
                        className={button}
                        disabled={!publishIds.length || busy}
                        onClick={() => publish.mutate()}
                      >
                        <Send size={15} />
                        Publish selected approved ({publishIds.length})
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-500">
                      Each unit gets a mixed-difficulty, self-marking practice
                      set. Approved drafts publish only to the matching grade in
                      the independent-student library. A generated draft is not
                      proof of complete outcome coverage.
                    </p>
                  </>
                )}
              </div>
              {doc.status === "COMPLETED" && (
                <>
                  <input
                    aria-label="Find curriculum unit"
                    className={input}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Find a strand, sub-strand or outcome…"
                  />
                  {units
                    .filter((u) =>
                      `${u.strand} ${u.subStrand} ${u.outcomes.join(" ")}`
                        .toLowerCase()
                        .includes(filter.toLowerCase()),
                    )
                    .map((u) => (
                      <article
                        key={u.id}
                        className="rounded-xl border bg-white p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500">{u.strand}</p>
                            <h3 className="mt-1 font-semibold">
                              {u.subStrand}
                            </h3>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold">
                            {status(u).replace(/_/g, " ")}
                          </span>
                        </div>
                        <details className="mt-3 text-xs leading-6">
                          <summary className="cursor-pointer font-medium">
                            Learning outcomes & source excerpt
                          </summary>
                          {u.outcomes.length ? (
                            <ul className="mt-2 list-disc pl-5">
                              {u.outcomes.map((o, i) => (
                                <li key={i}>{o}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-amber-800">
                              No explicit outcomes were extracted. Check the
                              source before generating. Older uploads may need
                              re-extraction.
                            </p>
                          )}
                          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">
                            {u.sourceContent}
                          </p>
                        </details>
                        {u.error && (
                          <p className="mt-3 text-xs text-red-700">{u.error}</p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-3">
                          {u.artifacts.map((a) => (
                            <div className="flex items-center gap-3" key={a.id}>
                              <button
                                className={button}
                                onClick={() => {
                                  setReviewId(a.id);
                                }}
                              >
                                <ChevronRight size={15} />
                                Review #{a.id}
                              </button>
                              {a.status === "APPROVED" && (
                                <label className="text-xs">
                                  <input
                                    type="checkbox"
                                    checked={publishIds.includes(a.id)}
                                    onChange={(e) =>
                                      setPublishIds((ids) =>
                                        e.target.checked
                                          ? [...ids, a.id]
                                          : ids.filter((id) => id !== a.id),
                                      )
                                    }
                                  />
                                  Include in publication
                                </label>
                              )}
                              {a.publishedAssignmentId && (
                                <span className="text-xs text-emerald-700">
                                  Assignment #{a.publishedAssignmentId}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                </>
              )}
            </>
          )}
          {reviewId && (
            <Review
              key={reviewId}
              id={reviewId}
              onClose={() => setReviewId(null)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
