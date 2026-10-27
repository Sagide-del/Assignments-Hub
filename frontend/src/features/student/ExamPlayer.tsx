import { useEffect, useMemo, useState, useRef } from "react";
import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { LearningDesignPanel } from "./curriculum/LearningDesignPanel";
import { assignmentDesign } from "./curriculum/activity-designs";
import { RichContent } from "../../components/ui/RichContent";
import { AnswerInputWithSymbols } from "./answer-input/AnswerInputWithSymbols";
import type { Answer, Question } from "../../types";

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

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function expectedAnswer(question: Question | undefined): string | null {
  if (!question) return null;
  if (question.questionType === "NUMERIC") {
    const numeric = question.config?.numeric;
    if (numeric && typeof numeric === "object") {
      const config = numeric as Record<string, unknown>;
      if (config.acceptedValue !== undefined) {
        return `${String(config.acceptedValue)}${typeof config.unit === "string" && config.unit ? ` ${config.unit}` : ""}`;
      }
    }
  }
  if (question.questionType === "SHORT_ANSWER") {
    const shortAnswer = question.config?.shortAnswer;
    if (shortAnswer && typeof shortAnswer === "object") {
      const keywords = (shortAnswer as Record<string, unknown>).keywords;
      if (Array.isArray(keywords) && keywords.length) {
        return `Expected concepts: ${keywords.map(String).join(", ")}`;
      }
    }
  }

  const answer = question.correctAnswer?.trim();
  if (!answer) return null;
  if (question.questionType === "ORDERING") {
    try {
      const order = JSON.parse(answer);
      if (Array.isArray(order)) return order.map(String).join(" → ");
    } catch {
      return answer;
    }
  }
  if (question.questionType === "MATCHING") {
    try {
      const matches = JSON.parse(answer) as Record<string, string>;
      const options = question.options as {
        left?: string[];
        right?: string[];
      } | null;
      if (options?.left && options.right) {
        return Object.entries(matches)
          .map(
            ([leftIndex, rightIndex]) =>
              `${options.left?.[Number(leftIndex)]} → ${options.right?.[Number(rightIndex)]}`,
          )
          .join("; ");
      }
    } catch {
      return answer;
    }
  }
  return answer;
}

function ResponseValue({ value }: { value: string }) {
  if (/^https?:\/\//i.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-sky-700 underline"
      >
        Open submitted file
      </a>
    );
  }
  if (/<[a-z][\s\S]*>/i.test(value)) {
    return <RichContent html={value} className="assessment-question-copy" />;
  }
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
      {value || "No answer provided"}
    </p>
  );
}

// Full marks = correct, zero = incorrect, anything in between (e.g. a
// partially-matched short answer or a numeric answer that missed units) =
// partial. Matches the same pointsAwarded values SubmissionsService already
// computes — this is purely a display label, not a new grading rule.
function resultBadge(answer: Answer, maxPoints: number | undefined) {
  if (answer.pointsAwarded == null || maxPoints == null) {
    return {
      label: "Awaiting review",
      className: "bg-slate-100 text-slate-600",
    };
  }
  if (answer.pointsAwarded <= 0) {
    return { label: "Incorrect", className: "bg-red-50 text-red-700" };
  }
  if (answer.pointsAwarded >= maxPoints) {
    return { label: "Correct", className: "bg-emerald-50 text-emerald-700" };
  }
  return { label: "Partial", className: "bg-amber-50 text-amber-700" };
}

function ReleasedAnswerCard({
  answer,
  index,
  total,
}: {
  answer: Answer;
  index: number;
  total: number;
}) {
  const question = answer.question;
  const correct = expectedAnswer(question);
  const badge = resultBadge(answer, question?.points);
  const responseTone =
    badge.label === "Correct"
      ? "success"
      : badge.label === "Incorrect"
        ? "incorrect"
        : badge.label === "Partial"
          ? "partial"
          : "neutral";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-6">
      <p className="text-sm font-semibold text-slate-700">
        Question {index + 1} of {total}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 sm:mt-3">
        <span
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${badge.className}`}
        >
          <ResultStatusIcon status={badge.label} />
          {badge.label}
        </span>
        <span className="text-sm font-semibold text-[#101820]">
          {answer.pointsAwarded != null && question
            ? `${answer.pointsAwarded} / ${question.points} pts`
            : "Not scored"}
        </span>
      </div>

      {question ? (
        <div className="mt-4">
          {question.contentHtml ? (
            <RichContent
              html={question.contentHtml}
              className="assessment-question-copy"
            />
          ) : (
            <p className="break-words text-base font-semibold leading-7 text-[#101820] sm:text-lg sm:leading-8">
              {question.questionText}
            </p>
          )}
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 gap-3 sm:mt-5 sm:grid-cols-2">
        <ReviewPanel label="Your answer" tone={responseTone} mark={badge.label}>
          <ResponseValue value={answer.studentAnswer} />
        </ReviewPanel>
        <ReviewPanel label="Correct answer" tone="success" mark="Correct">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {correct ?? "Reviewed manually"}
          </p>
        </ReviewPanel>
      </div>

      {answer.feedback || question?.explanation ? (
        <div className="mt-4 space-y-3">
          {answer.feedback ? (
            <ReviewDisclosure label="Teacher feedback">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {answer.feedback}
              </p>
            </ReviewDisclosure>
          ) : null}
          {question?.explanation ? (
            <ReviewDisclosure label="Explanation">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {question.explanation}
              </p>
            </ReviewDisclosure>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ReviewPanel({
  label,
  children,
  tone = "neutral",
  mark,
}: {
  label: string;
  children: ReactNode;
  tone?: "neutral" | "success" | "incorrect" | "partial";
  mark?: string;
}) {
  const toneClass = {
    neutral: "border-slate-200 bg-[#F8FAFC]",
    success: "border-[#D7E89A] bg-[#F8FCEB]",
    incorrect: "border-red-200 bg-red-50/60",
    partial: "border-amber-200 bg-amber-50/60",
  }[tone];

  return (
    <section className={`min-w-0 rounded-xl border p-3.5 sm:p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
          {label}
        </p>
        {mark ? <ResultStatusIcon status={mark} /> : null}
      </div>
      <div className="mt-2 min-w-0">{children}</div>
    </section>
  );
}

function ReviewDisclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details
      open
      className="group rounded-xl border border-sky-200 bg-sky-50/55"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#101820] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <ArrowIcon direction="right" />
          {label}
        </span>
        <span className="transition group-open:rotate-180" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="px-4 pb-4 pl-11">{children}</div>
    </details>
  );
}

function ResultStatusIcon({ status }: { status: string }) {
  const correct = status === "Correct";
  const partial = status === "Partial";
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
        correct
          ? "bg-emerald-500"
          : partial
            ? "bg-amber-500"
            : status === "Incorrect"
              ? "bg-red-500"
              : "bg-slate-400"
      }`}
      aria-hidden="true"
    >
      {correct ? "✓" : partial ? "–" : status === "Incorrect" ? "×" : "·"}
    </span>
  );
}

function ReviewNumberButton({
  answer,
  index,
  active,
  onClick,
}: {
  answer: Answer;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const badge = resultBadge(answer, answer.question?.points);
  const stateClass =
    badge.label === "Correct"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : badge.label === "Incorrect"
        ? "border-red-200 bg-red-50 text-red-700"
        : badge.label === "Partial"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition ${
        active
          ? "border-[#101820] bg-[#101820] text-white shadow-sm"
          : stateClass
      }`}
      aria-label={`Review question ${index + 1}: ${badge.label}`}
      aria-current={active ? "step" : undefined}
    >
      {index + 1}
      <ResultStatusIcon status={badge.label} />
    </button>
  );
}

function ReviewNavigatorRow({
  answer,
  index,
  active,
  onClick,
}: {
  answer: Answer;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const badge = resultBadge(answer, answer.question?.points);
  const dotClass =
    badge.label === "Correct"
      ? "bg-emerald-500"
      : badge.label === "Incorrect"
        ? "bg-red-500"
        : badge.label === "Partial"
          ? "bg-amber-500"
          : "bg-slate-300";
  const activeClass =
    badge.label === "Incorrect"
      ? "border-red-100 bg-red-50"
      : badge.label === "Correct"
        ? "border-emerald-100 bg-emerald-50"
        : badge.label === "Partial"
          ? "border-amber-100 bg-amber-50"
          : "border-slate-200 bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${active ? activeClass : "border-transparent hover:bg-slate-50"}`}
      aria-current={active ? "step" : undefined}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          badge.label === "Incorrect"
            ? "bg-red-100 text-red-700"
            : badge.label === "Correct"
              ? "bg-lime-100 text-[#526A00]"
              : "bg-slate-100 text-slate-600"
        }`}
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          {badge.label}
        </span>
      </span>
      <span className="shrink-0 text-xs text-slate-400">
        {answer.pointsAwarded ?? 0}/{answer.question?.points ?? 0}
      </span>
    </button>
  );
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
  const { data: releasedResults, isLoading: loadingReleasedResults } = useQuery(
    {
      queryKey: ["submission-results", existing?.id],
      queryFn: () => submissionsApi.getResults(existing!.id),
      enabled: Boolean(existing?.id && existing.resultsReleasedAt),
    },
  );

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
  const assignmentListPath =
    assignment?.kind === "KCSE_PAPER"
      ? "/student/kjsea-mock-test"
      : "/student/my-assignments";

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
      <section className="rounded-xl bg-[#101820] p-4 text-white shadow-[0_12px_30px_rgba(16,24,32,0.14)] sm:px-6 sm:py-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-5">
          <div className="grid min-w-0 gap-3 sm:grid-cols-[auto_minmax(180px,1fr)] sm:items-end sm:gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Quiz result
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">
                {score != null ? `${score}/${assignmentMaxPoints}` : "Pending"}
              </p>
            </div>
            {scorePercent != null ? (
              <div className="pb-1">
                <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-[#B5E61D]"
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {scorePercent}% correct
                </p>
              </div>
            ) : null}
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-white/15 pt-3 md:items-center md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Submitted
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatDateTime(existing.completedAt ?? existing.createdAt)}
              </p>
              {resultsReleased && displayedSubmission?.gradedAt ? (
                <p className="mt-1 hidden text-xs text-slate-400 sm:block">
                  Reviewed {formatDateTime(displayedSubmission.gradedAt)}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => navigate(assignmentListPath)}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#B5E61D] px-3 text-xs font-bold text-[#101820] sm:px-4"
            >
              <ArrowIcon direction="left" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Assignments</span>
            </button>
          </div>
        </div>
      </section>
    );

    return (
      <div className={workspaceClassName}>
        {resultsReleased && loadingReleasedResults ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading released results...
          </p>
        ) : null}

        {resultsReleased && activeReviewAnswer ? (
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <main className="min-w-0 space-y-4">
              {resultSummary}

              {displayedSubmission?.feedback ? (
                <section className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-800">
                    Overall feedback
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">
                    {displayedSubmission.feedback}
                  </p>
                </section>
              ) : null}

              <nav
                className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 sm:rounded-2xl sm:p-2"
                aria-label="Review question navigation"
              >
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((value) => Math.max(0, value - 1))
                  }
                  disabled={reviewIndex === 0}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40 sm:w-auto sm:px-3"
                >
                  <ArrowIcon direction="left" />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <span className="min-w-0 flex-1 text-center text-xs font-semibold text-slate-600 sm:hidden">
                  Question {reviewIndex + 1} of {reviewAnswers.length}
                </span>
                <div className="hidden min-w-0 flex-1 gap-2 overflow-x-auto px-1 sm:flex">
                  {reviewAnswers.map((answer, index) => (
                    <ReviewNumberButton
                      key={answer.id}
                      answer={answer}
                      index={index}
                      active={index === reviewIndex}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((value) =>
                      Math.min(reviewAnswers.length - 1, value + 1),
                    )
                  }
                  disabled={reviewIndex === reviewAnswers.length - 1}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40 sm:w-auto sm:px-3"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowIcon direction="right" />
                </button>
              </nav>

              <ReleasedAnswerCard
                answer={activeReviewAnswer}
                index={reviewIndex}
                total={reviewAnswers.length}
              />
              {assignment && (
                <LearningDesignPanel design={assignmentDesign(assignment)} />
              )}
            </main>

            <aside className="hidden xl:block">
              <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-semibold text-[#101820]">
                    Question navigator
                  </h2>
                  <span className="text-xs text-slate-500">
                    {reviewAnswers.length}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {reviewAnswers.map((answer, index) => (
                    <ReviewNavigatorRow
                      key={answer.id}
                      answer={answer}
                      index={index}
                      active={index === reviewIndex}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : null}

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
                {assignment.title}
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
                Teacher instructions & learning brief
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
