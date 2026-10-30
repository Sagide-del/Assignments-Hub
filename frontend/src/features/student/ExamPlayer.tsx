import { NextTopicSet } from "./NextTopicSet";
import { assignmentTopic } from "./assignment-catalogue";
import { learningTitle } from "./assignment-presentation";
import { ReleasedReview } from "./ReleasedReview";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Flag,
  Focus,
  Grid2X2,
  Save,
  Send,
  WifiOff,
  X,
  LoaderCircle,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useAssignmentDraft } from "./exam-workspace/useAssignmentDraft";
import { assignmentsApi } from "../../api/assignments.api";
import { submissionsApi } from "../../api/submissions.api";
import { uploadsApi } from "../../api/uploads.api";
import { apiErrorMessage } from "../../api/axios";
import { RichContent } from "../../components/ui/RichContent";
import { AnswerInputWithSymbols } from "./answer-input/AnswerInputWithSymbols";
import type { Question } from "../../types";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatch = () => setMatches(mediaQuery.matches);
    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);
    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, [query]);

  return matches;
}

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function extractMediaUrl(question: Question) {
  const match = question.questionText.match(
    /https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)/i,
  );
  return match?.[0] ?? null;
}

function isAnswered(question: Question, value: string) {
  if (question.questionType === "FILE_UPLOAD") return value.trim().length > 0;
  if (question.questionType === "ESSAY") {
    if (/<(img|math)\b|class=["'][^"']*ql-formula/i.test(value)) return true;
    return (
      value
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .trim().length > 0
    );
  }
  return value.trim().length > 0;
}

// Real exam-taking flow: loads the assignment's question bank (with
// correctAnswer already stripped server-side for STUDENT actors), lets the
// student answer each question by its type, autosaves as a draft, and submits
// for real grading via POST /assignments/:id/submissions.
export function ExamPlayer() {
  const { id } = useParams();
  const userId = useAuthStore((s) => s.user?.id);
  return <ExamWorkspace key={`${userId}:${id}`} />;
}
function ExamWorkspace() {
  const catalogueReturn = useLocation().state?.assignmentCatalogue;
  const userId = useAuthStore((s) => s.user?.id) ?? 0;
  const { id } = useParams<{ id: string }>();
  const assignmentId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const workspaceClassName = `assessment-workspace min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-6 ${
    isMobile ? "assessment-workspace--mobile" : "assessment-workspace--desktop"
  }`;

  const {
    data: assignment,
    isError: assignmentError,
    refetch: reloadAssignment,
  } = useQuery({
    queryKey: ["assignment", userId, assignmentId],
    queryFn: () => assignmentsApi.findOne(assignmentId),
    enabled: !!assignmentId,
  });

  const {
    data: questions,
    isLoading: loadingQuestions,
    isError: questionsError,
    refetch: reloadQuestions,
  } = useQuery({
    queryKey: ["assignment-questions", userId, assignmentId],
    queryFn: () => assignmentsApi.findQuestions(assignmentId),
    enabled: !!assignmentId,
  });

  // A STUDENT actor hitting GET /assignments/:id/submissions only ever gets
  // back their own submission (at most one).
  const {
    data: existingSubmissions,
    isError: submissionError,
    refetch: reloadSubmission,
  } = useQuery({
    queryKey: ["my-submission", userId, assignmentId],
    refetchOnWindowFocus: false,
    queryFn: () => assignmentsApi.listSubmissions(assignmentId),
    enabled: !!assignmentId,
  });
  const existing = existingSubmissions?.[0];
  const {
    data: releasedResults,
    isLoading: loadingReleasedResults,
    isError: releasedResultsError,
    refetch: reloadReleasedResults,
  } = useQuery({
    queryKey: ["submission-results", existing?.id],
    queryFn: () => submissionsApi.getResults(existing!.id),
    enabled: Boolean(existing?.id && existing.resultsReleasedAt),
  });

  const [status, setStatus] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusInterrupted, setFocusInterrupted] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(
    () => window.innerWidth >= 1280,
  );
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [flagged, setFlagged] = useState<number[]>(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem(`assignment-flags-v1:${userId}:${assignmentId}`) ??
          "[]",
      );
      return Array.isArray(value) ? value.filter(Number.isInteger) : [];
    } catch {
      return [];
    }
  });
  const questionIds = useMemo(
    () => questions?.map((q) => q.id) ?? [],
    [questions],
  );
  const draft = useAssignmentDraft({
    userId,
    assignmentId,
    questionIds,
    loaded: Boolean(assignment && questions?.length && existingSubmissions),
    existing,
    timeAllowedMinutes: assignment?.timeAllowedMinutes,
    onResult: (submission) => {
      queryClient.setQueryData(
        ["my-submission", userId, assignmentId],
        [submission],
      );
      void queryClient.invalidateQueries({ queryKey: ["student-submissions"] });
      if (submission.status !== "DRAFT") {
        setConfirmSubmit(false);
        void endFocusMode();
      }
    },
  });
  const answers = draft.answers;
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (draft.expired && !autoSubmitted.current && !existing?.completedAt) {
      autoSubmitted.current = true;
      void draft.persist(true).catch(() => undefined);
    }
  }, [draft.expired, existing?.completedAt]);
  useEffect(() => {
    if (!focusMode) return;
    document.body.classList.add("exam-focus-active");
    return () => document.body.classList.remove("exam-focus-active");
  }, [focusMode]);
  function toggleFlag() {
    const qid = questions?.[currentIndex]?.id;
    if (qid == null) return;
    setFlagged((previous) => {
      const next = previous.includes(qid)
        ? previous.filter((id) => id !== qid)
        : [...previous, qid];
      try {
        localStorage.setItem(
          `assignment-flags-v1:${userId}:${assignmentId}`,
          JSON.stringify(next),
        );
      } catch {
        /* Flags are also retained for this session. */
      }
      return next;
    });
  }
  function goToQuestion(index: number) {
    if (uploadingFor !== null) {
      setStatus(
        "Wait for the attachment upload to finish before changing questions.",
      );
      return;
    }
    setCurrentIndex(index);
    setReviewMode(false);
    if (window.innerWidth < 1280) setNavigatorOpen(false);
    document
      .getElementById("exam-question-heading")
      ?.scrollIntoView({ block: "start" });
  }
  useEffect(() => {
    if (!confirmSubmit && !(focusMode && focusInterrupted)) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirmSubmit && !draft.submitting) {
        e.preventDefault();
        setConfirmSubmit(false);
        return;
      }
      if (e.key !== "Tab") return;
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
      const dialog = dialogs[dialogs.length - 1];
      const elements = Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
      const first = elements[0],
        last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [confirmSubmit, focusMode, focusInterrupted, draft.submitting]);
  useEffect(() => {
    if (!questions?.length) return;
    setCurrentIndex((prev) => Math.min(prev, questions.length - 1));
  }, [questions]);

  useEffect(() => {
    if (!focusMode) return;
    const handleVisibilityChange = () => {
      if (document.hidden) setFocusInterrupted(true);
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setFocusInterrupted(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [focusMode]);

  async function activateFocusMode() {
    setFocusMode(true);
    setFocusInterrupted(false);
    if (
      !document.fullscreenElement &&
      document.documentElement.requestFullscreen
    ) {
      try {
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
      } catch {
        // iOS and some managed browsers do not expose fullscreen. Visibility
        // recovery still works, and the OS kiosk policy remains authoritative.
      }
    }
  }

  async function endFocusMode() {
    setFocusMode(false);
    setFocusInterrupted(false);
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
  }

  async function handleFileChange(questionId: number, file: File) {
    setStatus(null);
    setUploadingFor(questionId);
    try {
      const result = await uploadsApi.uploadSingle(file);
      draft.change(questionId, result.url);
    } catch (err) {
      setStatus(apiErrorMessage(err, "Upload failed"));
    } finally {
      setUploadingFor(null);
    }
  }

  const alreadyFinal = existing && existing.status !== "DRAFT";
  const questionList = questions ?? [];
  const totalQuestions = questionList.length;
  const currentQuestion = questionList[currentIndex];
  const answeredCount = questionList.filter((q) =>
    isAnswered(q, answers[q.id] ?? ""),
  ).length;
  const unansweredCount = totalQuestions - answeredCount;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const assignmentMaxPoints =
    assignment?.maxPoints ?? assignment?.totalMarks ?? 0;
  const defaultAssignmentListPath =
    assignment?.kind === "KCSE_PAPER"
      ? "/student/kjsea-mock-test"
      : "/student/my-assignments";
  const assignmentListPath =
    typeof catalogueReturn === "string" &&
    (catalogueReturn === "/student/my-assignments" ||
      catalogueReturn.startsWith("/student/my-assignments?"))
      ? catalogueReturn
      : defaultAssignmentListPath;

  if (assignmentError || questionsError || submissionError)
    return (
      <div role="alert" className="rounded-xl border bg-white p-6">
        <p>
          The assessment could not be loaded. Your saved work has not been
          changed.
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg border px-4 py-2"
          onClick={() => {
            void reloadAssignment();
            void reloadQuestions();
            void reloadSubmission();
          }}
        >
          Try again
        </button>
      </div>
    );
  if (
    loadingQuestions ||
    !assignment ||
    !existingSubmissions ||
    (questionList.length > 0 && !draft.hydrated)
  ) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (alreadyFinal) {
    const displayedSubmission = releasedResults ?? existing;
    const resultsReleased = Boolean(existing.resultsReleasedAt);
    const reviewAnswers = resultsReleased
      ? (releasedResults?.answers ?? [])
      : [];
    const reviewIndex = Math.min(
      currentIndex,
      Math.max(reviewAnswers.length - 1, 0),
    );
    const activeReviewAnswer = reviewAnswers[reviewIndex];
    const score = resultsReleased ? displayedSubmission?.score : null;
    const scorePercent =
      score != null && assignmentMaxPoints > 0
        ? Math.min(
            100,
            Math.max(0, Math.round((score / assignmentMaxPoints) * 100)),
          )
        : null;
    const resultSummary = (
      <section
        aria-label="Assessment result"
        className="flex flex-wrap items-center justify-between gap-4 px-2 py-3 sm:px-3"
      >
        <div>
          <button
            type="button"
            onClick={() => navigate(assignmentListPath)}
            className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Assignments
          </button>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {resultsReleased ? "Review your answers" : "Assignment submitted"}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Submitted{" "}
            {formatDateTime(existing.completedAt ?? existing.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">
            {resultsReleased ? "Your score" : "Results"}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {score != null ? `${score} / ${assignmentMaxPoints}` : "Pending"}
          </p>
          {scorePercent != null && (
            <p className="mt-1 text-xs text-slate-500">
              {scorePercent}% of marks
            </p>
          )}
        </div>
      </section>
    );

    return (
      <div className={workspaceClassName}>
        <NextTopicSet
          subject={assignment.subject}
          topic={assignmentTopic(assignment)}
        />
        {resultsReleased && loadingReleasedResults ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading released results...
          </p>
        ) : null}

        {resultsReleased && activeReviewAnswer ? (
          <ReleasedReview
            answers={reviewAnswers}
            index={reviewIndex}
            onSelect={setCurrentIndex}
            summary={resultSummary}
            feedback={displayedSubmission?.feedback}
          />
        ) : null}
        {resultsReleased && !loadingReleasedResults && !activeReviewAnswer && (
          <>
            {resultSummary}
            <section
              role={releasedResultsError ? "alert" : "status"}
              className="rounded-xl bg-white p-5 text-sm text-slate-600"
            >
              <p>
                {releasedResultsError
                  ? "Your released review could not be loaded. Your saved result has not changed."
                  : "No question-level review is available for this submission."}
              </p>
              {releasedResultsError && (
                <button
                  type="button"
                  onClick={() => void reloadReleasedResults()}
                  className="mt-3 min-h-10 rounded-lg border border-slate-200 px-4 font-semibold"
                >
                  Try again
                </button>
              )}
            </section>
          </>
        )}

        {!resultsReleased ? (
          <>
            {resultSummary}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-[#101820]">
                Submission received
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your answers will appear here after the results are released.
              </p>
            </section>
          </>
        ) : null}
      </div>
    );
  }

  if (!currentQuestion && !reviewMode) {
    return <p className="text-sm text-gray-500">No questions available.</p>;
  }

  const savedLabel =
    draft.saveState === "saved"
      ? "Saved to your account"
      : draft.saveState === "saving"
        ? "Saving…"
        : draft.saveState === "offline"
          ? "Offline · not synced"
          : draft.saveState === "error"
            ? "Save failed · retry"
            : "Unsaved changes";
  const blocked = draft.submitting || draft.expired || !draft.timerReady;
  return (
    <div className="assessment-workspace exam-player-v2 min-w-0 pb-4">
      <header className="exam-header sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
            <button
              type="button"
              aria-label="Back to assignments"
              onClick={() => {
                void draft
                  .persist(draft.expired)
                  .then(() => navigate(assignmentListPath))
                  .catch(() => undefined);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-slate-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1
                className="truncate text-base font-semibold text-slate-900"
                title={assignment.title}
              >
                {learningTitle(assignment.title, assignment.subject).title}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {assignment.subject} · {assignmentMaxPoints} marks ·{" "}
                {totalQuestions} questions
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
            <span
              role="timer"
              aria-label={
                assignment.timeAllowedMinutes
                  ? "Time remaining"
                  : "Untimed assessment"
              }
              className={`rounded-lg border px-2 py-2 text-sm font-semibold tabular-nums ${draft.remaining !== null && draft.remaining < 300 ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 text-slate-700"}`}
            >
              {assignment.timeAllowedMinutes
                ? draft.remaining === null
                  ? "Starting timer…"
                  : formatElapsed(draft.remaining)
                : "Untimed"}
            </span>
            <button
              type="button"
              onClick={() =>
                void (focusMode ? endFocusMode() : activateFocusMode())
              }
              aria-pressed={focusMode}
              aria-label={focusMode ? "Exit focus mode" : "Focus mode"}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-2 text-xs font-medium"
            >
              <Focus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {focusMode ? "Exit focus" : "Focus mode"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmSubmit(true)}
              disabled={
                draft.submitting || !draft.timerReady || uploadingFor !== null
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Submit exam
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            aria-expanded={navigatorOpen}
            aria-controls="exam-navigator"
            onClick={() => setNavigatorOpen((value) => !value)}
            className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-slate-600"
          >
            <Grid2X2 className="h-4 w-4" />
            {navigatorOpen ? "Hide questions" : "Questions"}
            <ChevronDown className="h-3 w-3" />
          </button>
          <div
            role="progressbar"
            aria-label="Questions answered"
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
            aria-valuenow={answeredCount}
            className="h-1.5 min-w-12 max-w-xs flex-1 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full bg-blue-600"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">
            {answeredCount}/{totalQuestions} answered
          </span>
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 text-xs ${draft.saveState === "error" || draft.saveState === "offline" ? "text-amber-800" : "text-slate-500"}`}
          >
            {draft.saveState === "saving" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : draft.saveState === "saved" ? (
              <Check className="h-3.5 w-3.5" />
            ) : draft.saveState === "offline" ? (
              <WifiOff className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {savedLabel}
          </span>
        </div>
      </header>
      {(draft.error || status || draft.storageError || draft.expired) && (
        <div
          role="alert"
          className="my-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {draft.expired
            ? "Time has ended. The server will grade only answers saved before the deadline. "
            : ""}
          {draft.error ?? status}
          {draft.storageError
            ? " Browser backup is unavailable. Keep this page open until your answers are saved to your account."
            : ""}
          {(draft.saveState === "error" || draft.saveState === "offline") && (
            <button
              type="button"
              onClick={() =>
                void draft.persist(draft.expired).catch(() => undefined)
              }
              className="ml-3 min-h-9 font-semibold underline"
            >
              {draft.expired ? "Retry submission" : "Retry saving"}
            </button>
          )}
        </div>
      )}
      <div
        className={`grid items-start gap-5 pt-5 ${navigatorOpen ? "xl:grid-cols-[220px_minmax(0,1fr)]" : ""}`}
      >
        {navigatorOpen && (
          <aside
            id="exam-navigator"
            aria-label="Exam question navigator"
            className="exam-navigator rounded-xl border border-slate-200 bg-white p-4 xl:sticky xl:top-36"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Questions</h2>
              <button
                type="button"
                aria-label="Close question navigator"
                onClick={() => setNavigatorOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              {unansweredCount} unanswered ·{" "}
              {flagged.filter((id) => questionIds.includes(id)).length} flagged
            </p>
            <nav
              aria-label="Choose a question"
              className="grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-5"
            >
              {questionList.map((q, index) => {
                const answered = isAnswered(q, answers[q.id] ?? "");
                const active = !reviewMode && currentIndex === index;
                const flag = flagged.includes(q.id);
                return (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    aria-current={active ? "step" : undefined}
                    aria-label={`Question ${index + 1}, ${answered ? "answered" : "unanswered"}${flag ? ", flagged" : ""}`}
                    className={`relative flex h-9 items-center justify-center rounded-md border text-xs font-semibold ${active ? "border-blue-700 bg-blue-700 text-white" : answered ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"} ${flag ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                  >
                    {index + 1}
                    {flag && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-3 text-[10px] text-slate-500">
              {[
                ["bg-blue-700", "Current"],
                ["bg-blue-100", "Answered"],
                ["border border-slate-300 bg-white", "Unanswered"],
                ["bg-amber-400", "Flagged"],
              ].map(([tone, label]) => (
                <span key={label} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-sm ${tone}`} />
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-5 text-slate-400">
              Review flags are kept on this browser.
            </p>
          </aside>
        )}
        <div className="min-w-0 space-y-4">
          {assignment.description && (
            <details className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-600">
                Teacher instructions
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {assignment.description}
              </p>
            </details>
          )}
          {!reviewMode && currentQuestion ? (
            <section
              aria-label="Current question"
              className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-7"
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="exam-question-heading"
                  tabIndex={-1}
                  className="scroll-mt-44 text-sm font-semibold text-slate-800"
                >
                  Question {currentIndex + 1} of {totalQuestions}
                </h2>
                <span className="text-xs text-slate-500">
                  {currentQuestion.questionType
                    .replace(/_/g, " ")
                    .toLowerCase()}{" "}
                  · {currentQuestion.points} marks
                </span>
              </div>
              <fieldset
                disabled={blocked}
                className="min-w-0 disabled:opacity-70"
              >
                <legend className="sr-only">
                  Answer question {currentIndex + 1}
                </legend>
                <QuestionInput
                  key={currentQuestion.id}
                  index={currentIndex}
                  question={currentQuestion}
                  subject={assignment.subject}
                  value={answers[currentQuestion.id] ?? ""}
                  onChange={(value) => draft.change(currentQuestion.id, value)}
                  onFile={(file) => handleFileChange(currentQuestion.id, file)}
                  uploading={uploadingFor === currentQuestion.id}
                  onUploading={(busy) =>
                    setUploadingFor(busy ? currentQuestion.id : null)
                  }
                />
              </fieldset>
            </section>
          ) : (
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold">
                Review before submitting
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {answeredCount} answered · {unansweredCount} unanswered ·{" "}
                {flagged.filter((id) => questionIds.includes(id)).length}{" "}
                flagged
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {questionList.map((q, index) => (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className="flex min-h-11 items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <span>
                      Question {index + 1}
                      {flagged.includes(q.id) ? " · Flagged" : ""}
                    </span>
                    <span className="text-xs text-slate-500">
                      {isAnswered(q, answers[q.id] ?? "")
                        ? "Answered"
                        : "Unanswered"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <footer
            aria-label="Exam actions"
            className="exam-actions sticky bottom-0 z-20 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex sm:flex-wrap sm:items-center"
          >
            <button
              type="button"
              disabled={currentIndex === 0 && !reviewMode}
              onClick={() =>
                reviewMode
                  ? setReviewMode(false)
                  : goToQuestion(currentIndex - 1)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              {reviewMode ? "Return" : "Previous"}
            </button>
            <button
              type="button"
              aria-pressed={
                !!currentQuestion && flagged.includes(currentQuestion.id)
              }
              disabled={reviewMode || blocked}
              onClick={toggleFlag}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium disabled:opacity-40"
            >
              <Flag className="h-4 w-4" />
              {currentQuestion && flagged.includes(currentQuestion.id)
                ? "Unflag"
                : "Mark for review"}
            </button>
            <button
              type="button"
              disabled={
                draft.submitting || uploadingFor !== null || draft.expired
              }
              onClick={() => void draft.persist().catch(() => undefined)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              Save answer
            </button>
            <button
              type="button"
              onClick={() =>
                reviewMode
                  ? setConfirmSubmit(true)
                  : currentIndex === totalQuestions - 1
                    ? setReviewMode(true)
                    : goToQuestion(currentIndex + 1)
              }
              disabled={draft.submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white disabled:opacity-40 sm:ml-auto"
            >
              {reviewMode
                ? "Submit exam"
                : currentIndex === totalQuestions - 1
                  ? "Review answers"
                  : "Next question"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </footer>
        </div>
      </div>
      {confirmSubmit && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-exam-title"
        >
          <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="submit-exam-title" className="text-lg font-semibold">
              Submit this assessment?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {answeredCount} of {totalQuestions} questions answered.{" "}
              {unansweredCount} unanswered. You cannot edit your answers after
              submission.
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Submission waits for pending saves and sends your latest answers
              to the server.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmSubmit(false)}
                disabled={draft.submitting}
                className="min-h-11 rounded-lg border px-4 text-sm"
              >
                Keep working
              </button>
              <button
                type="button"
                onClick={() => void draft.persist(true).catch(() => undefined)}
                disabled={draft.submitting || uploadingFor !== null}
                className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {draft.submitting ? "Submitting…" : "Confirm submission"}
              </button>
            </div>
            {draft.error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {draft.error}
              </p>
            )}
          </section>
        </div>
      )}
      {focusMode && focusInterrupted && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="focus-mode-title"
        >
          <section className="max-w-md rounded-xl bg-white p-6">
            <h2 id="focus-mode-title" className="text-lg font-semibold">
              Return to your assessment
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The timer continues while you are away. Unsynced answers stay in
              this browser when storage is available.
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => void activateFocusMode()}
              className="mt-5 min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white"
            >
              Return to assessment
            </button>
            <button
              type="button"
              onClick={() => void endFocusMode()}
              className="ml-3 min-h-11 text-sm"
            >
              Leave focus mode
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function QuestionInput({
  index,
  question,
  value,
  onChange,
  onFile,
  uploading,
  subject,
  onUploading,
}: {
  index: number;
  question: Question;
  value: string;
  onChange: (v: string) => void;
  onFile: (f: File) => void;
  uploading: boolean;
  subject: string;
  onUploading: (value: boolean) => void;
}) {
  const options = Array.isArray(question.options)
    ? (question.options as string[])
    : [];
  const mediaUrl = extractMediaUrl(question);
  const symbolMode =
    question.questionType === "NUMERIC" ||
    /math|physic|technical/i.test(subject)
      ? "math"
      : /chem|science/i.test(subject)
        ? "science"
        : "none";

  return (
    <div className="min-w-0 space-y-5">
      <div className="min-w-0">
        {question.contentHtml ? (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Question {index + 1}
            </p>
            <div className="mt-2 min-w-0">
              <RichContent
                html={question.contentHtml}
                className="assessment-question-copy"
              />
            </div>
          </div>
        ) : (
          <p className="break-words text-base font-semibold leading-7 text-[#101820] [overflow-wrap:anywhere] sm:text-lg sm:leading-8">
            {index + 1}. {question.questionText}
          </p>
        )}
        {question.hint ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-slate-500">
            Hint: {question.hint}
          </p>
        ) : null}
      </div>

      {mediaUrl ? (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3 sm:rounded-[24px] sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Media reference
          </p>
          <img
            src={mediaUrl}
            alt="Question media"
            className="mt-3 h-auto max-h-72 w-full max-w-full rounded-2xl object-contain bg-white"
          />
        </div>
      ) : null}

      {question.questionType === "MULTIPLE_CHOICE" && (
        <div className="space-y-3">
          {options.map((opt, optionIndex) => {
            const selected = value === opt;
            return (
              <label
                key={opt}
                className={`flex min-h-11 min-w-0 cursor-pointer touch-manipulation items-start gap-3 rounded-2xl border px-3 py-4 transition sm:gap-4 sm:rounded-[24px] sm:px-4 ${
                  selected
                    ? "border-[#B5E61D] bg-[#FAFDEB] shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={selected}
                  onChange={() => onChange(opt)}
                  className="mt-1"
                />
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-[#101820] text-white" : "bg-[#F8FAFC] text-slate-600"}`}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="min-w-0 break-words text-base leading-7 text-slate-700 [overflow-wrap:anywhere]">
                    {opt}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {question.questionType === "TRUE_FALSE" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {["true", "false"].map((opt) => {
            const selected = value === opt;
            return (
              <label
                key={opt}
                className={`flex min-h-11 cursor-pointer touch-manipulation items-center gap-3 rounded-2xl border px-4 py-4 capitalize transition sm:rounded-[24px] ${
                  selected
                    ? "border-[#B5E61D] bg-[#FAFDEB] shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={selected}
                  onChange={() => onChange(opt)}
                />
                <span className="text-sm font-medium text-slate-700">
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {question.questionType === "FILL_BLANK" && (
        <AnswerInputWithSymbols
          toolbarPosition="above"
          symbolMode={symbolMode}
          value={value}
          onChange={onChange}
          rows={2}
          placeholder="Enter your answer"
        />
      )}

      {question.questionType === "NUMERIC" && (
        <AnswerInputWithSymbols
          toolbarPosition="above"
          symbolMode={symbolMode}
          value={value}
          onChange={onChange}
          rows={2}
          inputMode="decimal"
          placeholder="e.g. 2.73 cm or 3/4"
        />
      )}

      {question.questionType === "SHORT_ANSWER" && (
        <AnswerInputWithSymbols
          toolbarPosition="above"
          symbolMode={symbolMode}
          value={value}
          onChange={onChange}
          rows={7}
          placeholder="Write a clear, concise response"
        />
      )}

      {question.questionType === "ESSAY" && (
        <AnswerInputWithSymbols
          toolbarPosition="above"
          symbolMode={symbolMode}
          value={value}
          onChange={onChange}
          rows={12}
          allowImageUpload
          onUploadStateChange={onUploading}
          placeholder="Write your response, calculation, or explanation"
        />
      )}

      {(question.questionType === "MATCHING" ||
        question.questionType === "ORDERING") && (
        <AnswerInputWithSymbols
          toolbarPosition="above"
          symbolMode={symbolMode}
          value={value}
          onChange={onChange}
          placeholder="Enter your matched or ordered answer"
        />
      )}

      {question.questionType === "FILE_UPLOAD" && (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 sm:rounded-[24px]">
          <p className="text-sm font-medium text-[#101820]">
            Take or upload a photo of your graph
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="mt-4 block min-h-11 w-full min-w-0 cursor-pointer text-base file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#101820] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {uploading ? (
            <p className="mt-3 text-xs text-slate-500">Uploading...</p>
          ) : null}
          {value && !uploading ? (
            <p className="mt-3 text-xs font-medium text-green-700">
              Graph photo uploaded.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
