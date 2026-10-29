import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Flag,
  LoaderCircle,
  Save,
  XCircle,
} from "lucide-react";
import { apiErrorMessage } from "../../../api/axios";
import { kjseaApi, type MockAttempt } from "../../../api/kjsea.api";
import { useAuthStore } from "../../../store/auth.store";
import { RichContent } from "../../../components/ui/RichContent";
import { resolveUploadUrl } from "../../../api/uploads.api";
import { MockVisual } from "./MockVisual";
import {
  mockDraftKey,
  resultAreas,
  resultText,
  validAnswers,
} from "./mock-tools";
export function KjseaMockPlayerPage() {
  const { id } = useParams();
  const userId = useAuthStore((s) => s.user?.id);
  const query = useQuery({
    queryKey: ["kjsea-attempt", userId, id],
    queryFn: () => kjseaApi.get(id!),
    enabled: !!id && !!userId,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.isPending || query.isFetching)
    return (
      <p role="status" className="rounded-2xl border bg-white p-6">
        Opening your mock paper…
      </p>
    );
  if (query.isError || !query.data)
    return (
      <div role="alert" className="rounded-2xl border bg-white p-6">
        <p>
          {apiErrorMessage(query.error, "This mock paper could not be loaded.")}
        </p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-3 font-semibold text-teal-800 underline"
        >
          Try again
        </button>
        <Link to="/student/kjsea-mock-test" className="ml-4 underline">
          Back to mocks
        </Link>
      </div>
    );
  return (
    <PaperWorkspace
      key={`${userId}:${id}`}
      initial={query.data}
      userId={userId!}
    />
  );
}
function PaperWorkspace({
  initial,
  userId,
}: {
  initial: MockAttempt;
  userId: number;
}) {
  const client = useQueryClient();
  const [result, setResult] = useState(initial);
  const completed = result.status === "SUBMITTED";
  const storageKey = mockDraftKey(userId, initial.id);
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    if (initial.status === "SUBMITTED") return initial.answers;
    try {
      return {
        ...initial.answers,
        ...validAnswers(
          JSON.parse(localStorage.getItem(storageKey) ?? "null"),
          initial.questions,
        ),
      };
    } catch {
      return initial.answers;
    }
  });
  const [index, setIndex] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  const [flags, setFlags] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState(
    "Answers autosave to your account.",
  );
  const [saveError, setSaveError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [tick, setTick] = useState(Date.now());
  const serverOffset = useRef(Date.parse(initial.serverNow) - Date.now());
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const revision = useRef(0);
  const finishingRef = useRef(false);
  const expiredOnce = useRef(false);
  const now = tick + serverOffset.current;
  const remaining = result.deadline
    ? Math.max(0, Math.ceil((Date.parse(result.deadline) - now) / 1000))
    : null;
  const elapsed = Math.max(
    0,
    Math.floor((now - Date.parse(result.createdAt)) / 1000),
  );
  const expired = remaining === 0 && !completed;
  const question = result.questions[index];
  const answered = Object.keys(validAnswers(answers, result.questions)).length;
  useEffect(() => {
    if (completed) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [completed]);
  function save(snapshot: Record<string, number>, version: number) {
    setSaveError(false);
    setSaveStatus("Saving answers…");
    chain.current = chain.current
      .catch(() => undefined)
      .then(() => kjseaApi.save(initial.id, snapshot))
      .then((paper) => {
        if (paper.status === "SUBMITTED") {
          setResult(paper);
          setAnswers(paper.answers);
        }
        if (version === revision.current) {
          setSaveStatus("All current answers saved to your account.");
          setSaveError(false);
        }
      })
      .catch((error) => {
        if (version === revision.current) {
          setSaveStatus(
            apiErrorMessage(
              error,
              "Answers could not be saved. Keep this page open and retry.",
            ),
          );
          setSaveError(true);
        }
      });
  }
  useEffect(() => {
    if (completed || finishing) return;
    const version = ++revision.current;
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    if (expired) return;
    setSaveStatus("Saving answers…");
    const timeout = setTimeout(() => save({ ...answers }, version), 600);
    return () => clearTimeout(timeout);
  }, [answers, completed, finishing, expired, storageKey]);
  async function submit() {
    if (finishingRef.current || completed) return;
    finishingRef.current = true;
    setFinishing(true);
    setSubmitError("");
    setConfirm(false);
    try {
      await chain.current;
      const paper = await kjseaApi.submit(initial.id, answers);
      setResult(paper);
      setAnswers(paper.answers);
      client.setQueryData(["kjsea-attempt", userId, initial.id], paper);
      await client.invalidateQueries({ queryKey: ["kjsea-attempts"] });
      if (initial.source === "PRACTICE")
        await client.invalidateQueries({ queryKey: ["practice-batches"] });
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* Server has the submitted paper. */
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(
        apiErrorMessage(
          error,
          "Submission failed. Your paper is still open; please retry.",
        ),
      );
    } finally {
      finishingRef.current = false;
      setFinishing(false);
    }
  }
  useEffect(() => {
    if (expired && !completed && !expiredOnce.current) {
      expiredOnce.current = true;
      void submit();
    }
  }, [expired, completed]);
  function go(next: number) {
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([resultText(result)], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${result.source === "PRACTICE" ? "practice" : "mock"}-review.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const correct = completed && question.correctIndex === answers[question.id];
  const areas = completed ? resultAreas(result) : [];
  const gaps = completed
    ? [
        ...new Set(
          result.questions
            .filter((q) => q.correctIndex !== result.answers[q.id])
            .map((q) => q.topic),
        ),
      ]
    : [];
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        to={
          result.source === "PRACTICE"
            ? "/student/my-assignments"
            : "/student/kjsea-mock-test"
        }
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600"
      >
        <ArrowLeft className="h-4 w-4" />
        {result.source === "PRACTICE" ? "Subject practice" : "KJSEA Mock Test"}
      </Link>
      <header className="rounded-2xl bg-[#101820] p-5 text-white sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">
          {result.subject} ·{" "}
          {result.coverage?.grades?.join(", ") || "School revision"}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {result.source === "PRACTICE"
                ? completed
                  ? "Your practice review"
                  : `Your ${result.subject} practice`
                : completed
                  ? "Your mock review"
                  : `Your ${result.subject} mock`}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {completed
                ? `${result.score ?? 0}/${result.questions.length} correct · ${Math.round(((result.score ?? 0) / result.questions.length) * 100)}%`
                : `${answered}/${result.questions.length} answered · one mark per question`}
            </p>
          </div>
          {!completed && (
            <p className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm">
              <Clock3 className="h-4 w-4" />
              {remaining !== null
                ? `Time left ${formatTime(remaining)}`
                : `Untimed · elapsed ${formatTime(elapsed)}`}
            </p>
          )}
          {completed && (
            <button
              type="button"
              onClick={download}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900"
            >
              <Download className="h-4 w-4" />
              Download review
            </button>
          )}
        </div>
        <p className="mt-4 text-xs leading-6 text-slate-400">
          Original Assignment Hub practice, not an official KNEC paper. Use the
          result to identify topics to revise.
        </p>
      </header>
      <p className="text-xs leading-6 text-slate-500">
        This paper: {result.questions.length} questions ·{" "}
        {new Set(result.questions.map((q) => q.topicId)).size} topics ·{" "}
        {
          result.questions.filter(
            (q) =>
              q.visual ||
              q.diagramUrl ||
              /<(?:img|svg|table)\b/i.test(q.contentHtml ?? ""),
          ).length
        }{" "}
        questions with a diagram or table.{" "}
        {result.questions.length < 40
          ? "Short practice set, not a full 40-question mock."
          : ""}
      </p>
      {!completed && (
        <div
          className={`rounded-xl border p-3 text-xs leading-6 ${saveError ? "border-amber-300 bg-amber-50 text-amber-950" : "border-slate-200 bg-white text-slate-500"}`}
        >
          <p role="status" className="flex items-start gap-2">
            <Save className="mt-1 h-4 w-4 shrink-0" />
            {saveStatus}
          </p>
          {saveError && !expired && (
            <button
              type="button"
              onClick={() => save({ ...answers }, ++revision.current)}
              className="mt-2 min-h-9 font-semibold underline"
            >
              Retry saving answers
            </button>
          )}
          {storageError && (
            <p role="alert" className="mt-2 text-amber-900">
              Browser backup is unavailable. Check that answers have saved to
              your account before leaving.
            </p>
          )}
        </div>
      )}
      {expired && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950"
        >
          Time has ended. Only answers saved to the server before the deadline
          are marked.
        </p>
      )}
      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{submitError}</p>
          <button
            type="button"
            disabled={finishing}
            onClick={() => void submit()}
            className="mt-3 min-h-10 font-semibold underline"
          >
            Retry submission
          </button>
        </div>
      )}
      {completed && (
        <section
          aria-label="Revision priorities"
          className="rounded-2xl border bg-white p-5"
        >
          <h2 className="text-lg font-semibold">
            Use your evidence to plan revision
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {areas.map((a) => (
              <div key={a.area} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{a.area}</p>
                <p className="mt-1 font-semibold">
                  {a.correct}/{a.total}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {gaps.length
              ? `Topics to revisit: ${gaps.join(" · ")}. Review an explanation, correct an example, then try another paper.`
              : "You answered every question correctly. Explain a method in your own words, then try a new paper with different values."}
          </p>
          <Link
            to={
              result.source === "PRACTICE"
                ? "/student/my-assignments"
                : "/student/kjsea-mock-test"
            }
            className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-teal-800"
          >
            {result.source === "PRACTICE"
              ? "Choose your next 30-question batch"
              : "Prepare another paper"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border bg-white p-4">
          <details
            open={navigatorOpen}
            onToggle={(e) => setNavigatorOpen(e.currentTarget.open)}
          >
            <summary className="cursor-pointer text-sm font-semibold">
              Question navigator · {index + 1}/{result.questions.length}
            </summary>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              {completed
                ? "Green: correct · red: incorrect or unanswered."
                : "Use the flag to mark a question to revisit. Flags stay in this open session."}
            </p>
            <nav
              aria-label="Mock question navigator"
              className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5"
            >
              {result.questions.map((q, i) => {
                const done = answers[q.id] !== undefined;
                const right = completed && q.correctIndex === answers[q.id];
                return (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() => go(i)}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={`Question ${i + 1}, ${completed ? (right ? "correct" : "incorrect or unanswered") : done ? "answered" : "unanswered"}${flags.includes(q.id) ? ", flagged" : ""}`}
                    className={`relative min-h-10 rounded-lg border text-xs font-semibold ${i === index ? "ring-2 ring-teal-700 ring-offset-1 " : ""}${completed ? (right ? "border-teal-200 bg-teal-50 text-teal-900" : "border-red-200 bg-red-50 text-red-800") : done ? "border-slate-700 bg-slate-800 text-white" : "bg-white text-slate-500"}`}
                  >
                    {i + 1}
                    {flags.includes(q.id) && (
                      <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </nav>
          </details>
        </aside>
        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Question {index + 1} of {result.questions.length} ·{" "}
                {question.area}
              </p>
              {!completed && (
                <button
                  type="button"
                  onClick={() =>
                    setFlags((f) =>
                      f.includes(question.id)
                        ? f.filter((id) => id !== question.id)
                        : [...f, question.id],
                    )
                  }
                  className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-600"
                >
                  <Flag
                    className={`h-4 w-4 ${flags.includes(question.id) ? "fill-amber-200 text-amber-700" : ""}`}
                  />
                  {flags.includes(question.id) ? "Flagged" : "Flag for review"}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">{question.topic}</p>
            <fieldset className="mt-5 min-w-0">
              <legend className="mb-5 block text-lg font-semibold leading-8">
                {question.prompt}
              </legend>
              {question.contentHtml && (
                <div className="mb-5">
                  <RichContent html={question.contentHtml} />
                </div>
              )}
              {question.diagramUrl && (
                <figure className="mb-5 rounded-xl border p-3">
                  <img
                    key={question.id}
                    src={resolveUploadUrl(question.diagramUrl)}
                    alt={question.diagramAlt ?? "Question illustration"}
                    className="mx-auto max-h-80 max-w-full object-contain"
                  />
                  {question.diagramAlt && (
                    <figcaption className="mt-2 text-xs leading-6 text-slate-500">
                      {question.diagramAlt}
                    </figcaption>
                  )}
                </figure>
              )}
              {question.visual && (
                <div className="mb-5">
                  <MockVisual visual={question.visual} />
                </div>
              )}
              <div className="space-y-3">
                {question.options.map((option, i) => (
                  <label
                    key={`${question.id}-${i}`}
                    className={`flex min-h-12 items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${completed && i === question.correctIndex ? "border-teal-400 bg-teal-50" : answers[question.id] === i ? "border-slate-700 bg-slate-50" : "border-slate-200"}`}
                  >
                    <input
                      type="radio"
                      name={`mock-${question.id}`}
                      checked={answers[question.id] === i}
                      disabled={completed || finishing || expired}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, [question.id]: i }))
                      }
                      className="mt-1 shrink-0 accent-teal-800"
                    />
                    <span className="font-semibold text-slate-500">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span className="min-w-0 break-words">{option}</span>
                    {completed && i === question.correctIndex && (
                      <CheckCircle2
                        aria-label="Correct answer"
                        className="ml-auto mt-1 h-4 w-4 shrink-0 text-teal-700"
                      />
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            {completed && (
              <div
                className={`mt-5 rounded-xl p-4 ${correct ? "bg-teal-50" : "bg-amber-50"}`}
              >
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  {correct ? (
                    <CheckCircle2 className="h-4 w-4 text-teal-700" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-800" />
                  )}
                  {correct
                    ? "Correct"
                    : answers[question.id] === undefined
                      ? "Not answered"
                      : "Let’s work through it"}
                </h2>
                <p className="mt-3 text-sm leading-7">{question.explanation}</p>
              </div>
            )}
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            {index < result.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"
              >
                Next question
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              !completed && (
                <button
                  type="button"
                  disabled={finishing}
                  onClick={() => setConfirm(true)}
                  className="min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Review & submit
                </button>
              )
            )}
          </div>
          {!completed && (
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="text-sm font-semibold">Ready to finish?</h2>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                {answered} answered · {result.questions.length - answered}{" "}
                unanswered · {flags.length} flagged. Unanswered questions
                receive zero marks.
              </p>
              {confirm ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm">
                    Submit this paper now? You can review explanations
                    afterwards, but you cannot change submitted answers.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={finishing}
                      onClick={() => void submit()}
                      className="min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white"
                    >
                      Confirm submission
                    </button>
                    <button
                      type="button"
                      disabled={finishing}
                      onClick={() => setConfirm(false)}
                      className="min-h-11 rounded-xl border px-4 text-sm font-semibold"
                    >
                      Keep working
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={finishing}
                  onClick={() => setConfirm(true)}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {finishing && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}
                  {finishing ? "Submitting…" : "Submit answers"}
                </button>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
