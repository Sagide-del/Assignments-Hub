import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments.api';
import { submissionsApi } from '../../api/submissions.api';
import { uploadsApi } from '../../api/uploads.api';
import { apiErrorMessage } from '../../api/axios';
import { RichContent } from '../../components/ui/RichContent';
import { AnswerInputWithSymbols } from './answer-input/AnswerInputWithSymbols';
import type { Answer, AnswerInput, Question } from '../../types';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatch = () => setMatches(mediaQuery.matches);
    updateMatch();
    mediaQuery.addEventListener('change', updateMatch);
    return () => mediaQuery.removeEventListener('change', updateMatch);
  }, [query]);

  return matches;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 12.5l4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8v4.5l3 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#101820] sm:text-base">{value}</p>
    </div>
  );
}

function expectedAnswer(question: Question | undefined): string | null {
  if (!question) return null;
  if (question.questionType === 'NUMERIC') {
    const numeric = question.config?.numeric;
    if (numeric && typeof numeric === 'object') {
      const config = numeric as Record<string, unknown>;
      if (config.acceptedValue !== undefined) {
        return `${String(config.acceptedValue)}${typeof config.unit === 'string' && config.unit ? ` ${config.unit}` : ''}`;
      }
    }
  }
  if (question.questionType === 'SHORT_ANSWER') {
    const shortAnswer = question.config?.shortAnswer;
    if (shortAnswer && typeof shortAnswer === 'object') {
      const keywords = (shortAnswer as Record<string, unknown>).keywords;
      if (Array.isArray(keywords) && keywords.length) {
        return `Expected concepts: ${keywords.map(String).join(', ')}`;
      }
    }
  }

  const answer = question.correctAnswer?.trim();
  if (!answer) return null;
  if (question.questionType === 'ORDERING') {
    try {
      const order = JSON.parse(answer);
      if (Array.isArray(order)) return order.map(String).join(' → ');
    } catch {
      return answer;
    }
  }
  if (question.questionType === 'MATCHING') {
    try {
      const matches = JSON.parse(answer) as Record<string, string>;
      const options = question.options as { left?: string[]; right?: string[] } | null;
      if (options?.left && options.right) {
        return Object.entries(matches)
          .map(([leftIndex, rightIndex]) => `${options.left?.[Number(leftIndex)]} → ${options.right?.[Number(rightIndex)]}`)
          .join('; ');
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
      <a href={value} target="_blank" rel="noreferrer" className="font-medium text-sky-700 underline">
        Open submitted file
      </a>
    );
  }
  if (/<[a-z][\s\S]*>/i.test(value)) {
    return <RichContent html={value} className="assessment-question-copy" />;
  }
  return <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{value || 'No answer provided'}</p>;
}

// Full marks = correct, zero = incorrect, anything in between (e.g. a
// partially-matched short answer or a numeric answer that missed units) =
// partial. Matches the same pointsAwarded values SubmissionsService already
// computes — this is purely a display label, not a new grading rule.
function resultBadge(answer: Answer, maxPoints: number | undefined) {
  if (answer.pointsAwarded == null || maxPoints == null) {
    return { label: 'Awaiting review', className: 'bg-slate-100 text-slate-600' };
  }
  if (answer.pointsAwarded <= 0) {
    return { label: 'Incorrect', className: 'bg-red-50 text-red-700' };
  }
  if (answer.pointsAwarded >= maxPoints) {
    return { label: 'Correct', className: 'bg-emerald-50 text-emerald-700' };
  }
  return { label: 'Partial', className: 'bg-amber-50 text-amber-700' };
}

function ReleasedAnswerCard({ answer, index, total }: { answer: Answer; index: number; total: number }) {
  const question = answer.question;
  const correct = expectedAnswer(question);
  const badge = resultBadge(answer, question?.points);
  const responseTone = badge.label === 'Correct' ? 'success' : badge.label === 'Incorrect' ? 'incorrect' : badge.label === 'Partial' ? 'partial' : 'neutral';
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-6">
      <p className="text-sm font-semibold text-slate-700">Question {index + 1} of {total}</p>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 sm:mt-3">
        <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${badge.className}`}>
          <ResultStatusIcon status={badge.label} />
          {badge.label}
        </span>
        <span className="text-sm font-semibold text-[#101820]">
          {answer.pointsAwarded != null && question
            ? `${answer.pointsAwarded} / ${question.points} pts`
            : 'Not scored'}
        </span>
      </div>

      {question ? (
        <div className="mt-4">
          {question.contentHtml ? (
            <RichContent html={question.contentHtml} className="assessment-question-copy" />
          ) : (
            <p className="break-words text-base font-semibold leading-7 text-[#101820] sm:text-lg sm:leading-8">{question.questionText}</p>
          )}
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 gap-3 sm:mt-5 sm:grid-cols-2">
        <ReviewPanel label="Your answer" tone={responseTone} mark={badge.label}>
          <ResponseValue value={answer.studentAnswer} />
        </ReviewPanel>
        <ReviewPanel label="Correct answer" tone="success" mark="Correct">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{correct ?? 'Reviewed manually'}</p>
        </ReviewPanel>
      </div>

      {answer.feedback || question?.explanation ? (
        <div className="mt-4 space-y-3">
          {answer.feedback ? (
            <ReviewDisclosure label="Teacher feedback">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{answer.feedback}</p>
            </ReviewDisclosure>
          ) : null}
          {question?.explanation ? (
            <ReviewDisclosure label="Explanation">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{question.explanation}</p>
            </ReviewDisclosure>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ReviewPanel({ label, children, tone = 'neutral', mark }: {
  label: string;
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'incorrect' | 'partial';
  mark?: string;
}) {
  const toneClass = {
    neutral: 'border-slate-200 bg-[#F8FAFC]',
    success: 'border-[#D7E89A] bg-[#F8FCEB]',
    incorrect: 'border-red-200 bg-red-50/60',
    partial: 'border-amber-200 bg-amber-50/60',
  }[tone];

  return (
    <section className={`min-w-0 rounded-xl border p-3.5 sm:p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</p>
        {mark ? <ResultStatusIcon status={mark} /> : null}
      </div>
      <div className="mt-2 min-w-0">{children}</div>
    </section>
  );
}

function ReviewDisclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details open className="group rounded-xl border border-sky-200 bg-sky-50/55">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#101820] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <ArrowIcon direction="right" />
          {label}
        </span>
        <span className="transition group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>
      <div className="px-4 pb-4 pl-11">{children}</div>
    </details>
  );
}

function ResultStatusIcon({ status }: { status: string }) {
  const correct = status === 'Correct';
  const partial = status === 'Partial';
  return (
    <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
      correct ? 'bg-emerald-500' : partial ? 'bg-amber-500' : status === 'Incorrect' ? 'bg-red-500' : 'bg-slate-400'
    }`} aria-hidden="true">
      {correct ? '✓' : partial ? '–' : status === 'Incorrect' ? '×' : '·'}
    </span>
  );
}

function ReviewNumberButton({ answer, index, active, onClick }: {
  answer: Answer;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const badge = resultBadge(answer, answer.question?.points);
  const stateClass = badge.label === 'Correct'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : badge.label === 'Incorrect'
      ? 'border-red-200 bg-red-50 text-red-700'
      : badge.label === 'Partial'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition ${
        active ? 'border-[#101820] bg-[#101820] text-white shadow-sm' : stateClass
      }`}
      aria-label={`Review question ${index + 1}: ${badge.label}`}
      aria-current={active ? 'step' : undefined}
    >
      {index + 1}
      <ResultStatusIcon status={badge.label} />
    </button>
  );
}

function ReviewNavigatorRow({ answer, index, active, onClick }: {
  answer: Answer;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const badge = resultBadge(answer, answer.question?.points);
  const dotClass = badge.label === 'Correct'
    ? 'bg-emerald-500'
    : badge.label === 'Incorrect'
      ? 'bg-red-500'
      : badge.label === 'Partial'
        ? 'bg-amber-500'
        : 'bg-slate-300';
  const activeClass = badge.label === 'Incorrect'
    ? 'border-red-100 bg-red-50'
    : badge.label === 'Correct'
      ? 'border-emerald-100 bg-emerald-50'
      : badge.label === 'Partial'
        ? 'border-amber-100 bg-amber-50'
        : 'border-slate-200 bg-slate-50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${active ? activeClass : 'border-transparent hover:bg-slate-50'}`}
      aria-current={active ? 'step' : undefined}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        badge.label === 'Incorrect'
          ? 'bg-red-100 text-red-700'
          : badge.label === 'Correct'
            ? 'bg-lime-100 text-[#526A00]'
            : 'bg-slate-100 text-slate-600'
      }`}>
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
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function extractMediaUrl(question: Question) {
  const match = question.questionText.match(/https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)/i);
  return match?.[0] ?? null;
}

function isAnswered(question: Question, value: string) {
  if (question.questionType === 'FILE_UPLOAD') return value.trim().length > 0;
  if (question.questionType === 'ESSAY') {
    if (/<(img|math)\b|class=["'][^"']*ql-formula/i.test(value)) return true;
    return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim().length > 0;
  }
  return value.trim().length > 0;
}

// Real exam-taking flow: loads the assignment's question bank (with
// correctAnswer already stripped server-side for STUDENT actors), lets the
// student answer each question by its type, autosaves as a draft, and submits
// for real grading via POST /assignments/:id/submissions.
export function ExamPlayer() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const workspaceClassName = `assessment-workspace min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-6 ${
    isMobile ? 'assessment-workspace--mobile' : 'assessment-workspace--desktop'
  }`;

  const { data: assignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => assignmentsApi.findOne(assignmentId),
    enabled: !!assignmentId,
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['assignment-questions', assignmentId],
    queryFn: () => assignmentsApi.findQuestions(assignmentId),
    enabled: !!assignmentId,
  });

  // A STUDENT actor hitting GET /assignments/:id/submissions only ever gets
  // back their own submission (at most one).
  const { data: existingSubmissions } = useQuery({
    queryKey: ['my-submission', assignmentId],
    queryFn: () => assignmentsApi.listSubmissions(assignmentId),
    enabled: !!assignmentId,
  });
  const existing = existingSubmissions?.[0];
  const { data: releasedResults, isLoading: loadingReleasedResults } = useQuery({
    queryKey: ['submission-results', existing?.id],
    queryFn: () => submissionsApi.getResults(existing!.id),
    enabled: Boolean(existing?.id && existing.resultsReleasedAt),
  });

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusInterrupted, setFocusInterrupted] = useState(false);
  const startTime = useMemo(() => Date.now(), []);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    if (existing?.answers) {
      const map: Record<number, string> = {};
      for (const a of existing.answers) map[a.questionId] = a.studentAnswer;
      setAnswers(map);
    }
  }, [existing]);

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
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [focusMode]);

  async function activateFocusMode() {
    setFocusMode(true);
    setFocusInterrupted(false);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
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

  const saveMutation = useMutation({
    mutationFn: (isDraft: boolean) => {
      const answerList: AnswerInput[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: Number(questionId),
        answer,
      }));
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
      return assignmentsApi.submit(assignmentId, { answers: answerList, isDraft, timeSpentSeconds });
    },
    onSuccess: (submission, isDraft) => {
      setStatus(
        isDraft
          ? 'Draft saved.'
          : submission.resultsReleasedAt
            ? 'Assessment submitted. Your results are ready.'
            : 'Assessment submitted.',
      );
      queryClient.setQueryData(['my-submission', assignmentId], [submission]);
      queryClient.invalidateQueries({ queryKey: ['student-submissions'] });
      if (!isDraft) void endFocusMode();
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save')),
  });

  async function handleFileChange(questionId: number, file: File) {
    setUploadingFor(questionId);
    try {
      const result = await uploadsApi.uploadSingle(file);
      setAnswers((prev) => ({ ...prev, [questionId]: result.url }));
    } catch (err) {
      setStatus(apiErrorMessage(err, 'Upload failed'));
    } finally {
      setUploadingFor(null);
    }
  }

  const alreadyFinal = existing && existing.status !== 'DRAFT';
  const questionList = questions ?? [];
  const totalQuestions = questionList.length;
  const currentQuestion = questionList[currentIndex];
  const answeredCount = questionList.filter((q) => isAnswered(q, answers[q.id] ?? '')).length;
  const unansweredCount = totalQuestions - answeredCount;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const assignmentMaxPoints = assignment?.maxPoints ?? assignment?.totalMarks ?? 0;
  const assignmentListPath = assignment?.kind === 'KCSE_PAPER' ? '/student/kcse-papers' : '/student/my-assignments';

  if (loadingQuestions) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (alreadyFinal) {
    const displayedSubmission = releasedResults ?? existing;
    const resultsReleased = Boolean(existing.resultsReleasedAt);
    const reviewAnswers = resultsReleased ? (releasedResults?.answers ?? []) : [];
    const reviewIndex = Math.min(currentIndex, Math.max(reviewAnswers.length - 1, 0));
    const activeReviewAnswer = reviewAnswers[reviewIndex];
    const score = displayedSubmission?.score;
    const scorePercent = score != null && assignmentMaxPoints > 0
      ? Math.min(100, Math.max(0, Math.round((score / assignmentMaxPoints) * 100)))
      : null;
    const resultSummary = (
      <section className="rounded-xl bg-[#101820] p-4 text-white shadow-[0_12px_30px_rgba(16,24,32,0.14)] sm:px-6 sm:py-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-5">
          <div className="grid min-w-0 gap-3 sm:grid-cols-[auto_minmax(180px,1fr)] sm:items-end sm:gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quiz result</p>
              <p className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">
                {score != null ? `${score}/${assignmentMaxPoints}` : 'Pending'}
              </p>
            </div>
            {scorePercent != null ? (
              <div className="pb-1">
                <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full rounded-full bg-[#B5E61D]" style={{ width: `${scorePercent}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-400">{scorePercent}% correct</p>
              </div>
            ) : null}
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-white/15 pt-3 md:items-center md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Submitted</p>
              <p className="mt-1 text-sm font-semibold">{formatDateTime(existing.completedAt ?? existing.createdAt)}</p>
              {resultsReleased && displayedSubmission?.gradedAt ? (
                <p className="mt-1 hidden text-xs text-slate-400 sm:block">Reviewed {formatDateTime(displayedSubmission.gradedAt)}</p>
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
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading released results...</p>
        ) : null}

        {resultsReleased && activeReviewAnswer ? (
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <main className="min-w-0 space-y-4">
              {resultSummary}

              {displayedSubmission?.feedback ? (
                <section className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-800">Overall feedback</p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">{displayedSubmission.feedback}</p>
                </section>
              ) : null}

              <nav className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 sm:rounded-2xl sm:p-2" aria-label="Review question navigation">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
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
                  onClick={() => setCurrentIndex((value) => Math.min(reviewAnswers.length - 1, value + 1))}
                  disabled={reviewIndex === reviewAnswers.length - 1}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-40 sm:w-auto sm:px-3"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowIcon direction="right" />
                </button>
              </nav>

              <ReleasedAnswerCard answer={activeReviewAnswer} index={reviewIndex} total={reviewAnswers.length} />
            </main>

            <aside className="hidden xl:block">
              <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-semibold text-[#101820]">Question navigator</h2>
                  <span className="text-xs text-slate-500">{reviewAnswers.length}</span>
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
              <p className="font-semibold text-[#101820]">Submission received</p>
              <p className="mt-1 text-sm text-slate-500">Your answers will appear here after the results are released.</p>
            </section>
          </>
        ) : null}
      </div>
    );
  }

  if (!currentQuestion && !reviewMode) {
    return <p className="text-sm text-gray-500">No questions available.</p>;
  }

  return (
    <div className={workspaceClassName}>
      {focusMode && focusInterrupted ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101820]/95 p-5" role="dialog" aria-modal="true" aria-labelledby="focus-mode-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF8D1] text-[#4D6310]">
              <FocusIcon />
            </div>
            <h2 id="focus-mode-title" className="mt-4 text-xl font-semibold text-[#101820]">Assessment paused</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Return to the assessment to continue. Your answers remain saved on this device until you save the draft.</p>
            <button type="button" onClick={() => void activateFocusMode()} className="mt-5 min-h-12 w-full rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820]">Return to assessment</button>
            <button type="button" onClick={() => void endFocusMode()} className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-slate-500">Leave focus mode</button>
          </div>
        </div>
      ) : null}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(assignmentListPath)}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#101820]"
              >
                <ArrowIcon direction="left" />
                Back
              </button>
              <p className="mt-2 break-words text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {assignment?.subject}
              </p>
              <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-[#101820] [overflow-wrap:anywhere] sm:text-2xl">
                {assignment?.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>{assignmentMaxPoints} marks</span>
                <span>{totalQuestions} questions</span>
                <span className="inline-flex items-center gap-1.5"><ClockIcon /> {formatElapsed(elapsedSeconds)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void (focusMode ? endFocusMode() : activateFocusMode())}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold ${focusMode ? 'border-[#D7E89A] bg-[#EEF8D1] text-[#4D6310]' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                <FocusIcon />
                {focusMode ? 'Focus active' : 'Focus mode'}
              </button>
              <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-[#F1F5F9] px-3 text-xs font-semibold text-slate-600">
                {reviewMode ? 'Review' : `Question ${currentIndex + 1} of ${totalQuestions}`}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#B5E61D]" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-500">{answeredCount}/{totalQuestions} answered</span>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="order-1 min-w-0 xl:order-1">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#101820]">Questions</p>
              <span className="text-xs font-medium text-slate-500">{unansweredCount} unanswered</span>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-5">
              {questionList.map((question, index) => {
                const answered = isAnswered(question, answers[question.id] ?? '');
                const isCurrent = !reviewMode && index === currentIndex;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      setReviewMode(false);
                      setCurrentIndex(index);
                    }}
                    className={[
                      'flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition',
                      isCurrent
                        ? 'border-[#101820] bg-[#101820] text-white'
                        : answered
                          ? 'border-[#D7E89A] bg-[#EEF8D1] text-[#4D6310]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#B5E61D]',
                    ].join(' ')}
                    aria-label={`Question ${index + 1}`}
                  >
                    <span className="flex items-center gap-1">
                      {index + 1}
                      {answered ? <CheckIcon /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#EEF8D1]" /> Answered</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#101820]" /> Current</span>
            </div>
          </section>
        </aside>

        <section className="order-2 min-w-0 space-y-4 sm:space-y-6 xl:order-2">
          {!reviewMode && currentQuestion ? (
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Question {currentIndex + 1} of {totalQuestions}
                    </p>
                    <p className="mt-2 break-words text-sm font-medium text-slate-500">
                      {currentQuestion.questionType.replace(/_/g, ' ')} · {currentQuestion.points} pts
                    </p>
                  </div>
                  <span className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {isAnswered(currentQuestion, answers[currentQuestion.id] ?? '') ? 'Answered' : 'Awaiting answer'}
                  </span>
                </div>
              </div>

              <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-6">
                <QuestionInput
                  index={currentIndex}
                  question={currentQuestion}
                  value={answers[currentQuestion.id] ?? ''}
                  onChange={(val) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))}
                  onFile={(file) => handleFileChange(currentQuestion.id, file)}
                  uploading={uploadingFor === currentQuestion.id}
                />
              </div>
            </div>
          ) : (
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-[#101820] sm:text-2xl">Review answers</h2>
              <div className="mt-5 grid divide-y divide-slate-200 rounded-xl border border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <StatTile label="Total Questions" value={totalQuestions} />
                <StatTile label="Answered" value={answeredCount} />
                <StatTile label="Unanswered" value={unansweredCount} />
              </div>
              <div className="mt-5 min-w-0 rounded-xl bg-[#F8FAFC] p-3 sm:p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {questionList.map((question, index) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => {
                        setReviewMode(false);
                        setCurrentIndex(index);
                      }}
                      className="flex min-h-11 min-w-0 flex-col items-start justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left sm:flex-row"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#101820]">Question {index + 1}</p>
                        <p className="mt-1 text-sm text-slate-500">{question.questionType.replace(/_/g, ' ')}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isAnswered(question, answers[question.id] ?? '')
                            ? 'bg-[#EEF8D1] text-[#4D6310]'
                            : 'bg-[#F2F5F8] text-slate-600'
                        }`}
                      >
                        {isAnswered(question, answers[question.id] ?? '') ? 'Answered' : 'Unanswered'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {status ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              {status}
            </p>
          ) : null}

          <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-[0_12px_30px_rgba(16,24,32,0.12)] backdrop-blur sm:px-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                {!reviewMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#101820] disabled:opacity-50 sm:w-auto"
                    >
                      <ArrowIcon direction="left" />
                      Previous Question
                    </button>
                    {currentIndex < totalQuestions - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white sm:w-auto"
                      >
                        Next Question
                        <ArrowIcon direction="right" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReviewMode(true)}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white sm:w-auto"
                      >
                        Review Answers
                        <ArrowIcon direction="right" />
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReviewMode(false)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#101820] sm:w-auto"
                  >
                    <ArrowIcon direction="left" />
                    Return to Questions
                  </button>
                )}
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate(true)}
                  disabled={saveMutation.isPending}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#101820] disabled:opacity-60 sm:w-auto"
                >
                  Save Draft
                </button>
                {reviewMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Submit for grading? You cannot edit answers afterwards.')) {
                        saveMutation.mutate(false);
                      }
                    }}
                    disabled={saveMutation.isPending}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#B5E61D] px-4 py-3 text-sm font-semibold text-[#101820] disabled:opacity-60 sm:w-auto"
                  >
                    {saveMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FocusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 4H5a1 1 0 0 0-1 1v3M16 4h3a1 1 0 0 1 1 1v3M8 20H5a1 1 0 0 1-1-1v-3M16 20h3a1 1 0 0 0 1-1v-3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function QuestionInput({
  index,
  question,
  value,
  onChange,
  onFile,
  uploading,
}: {
  index: number;
  question: Question;
  value: string;
  onChange: (v: string) => void;
  onFile: (f: File) => void;
  uploading: boolean;
}) {
  const options = Array.isArray(question.options) ? (question.options as string[]) : [];
  const mediaUrl = extractMediaUrl(question);

  return (
    <div className="min-w-0 space-y-5">
      <div className="min-w-0">
        {question.contentHtml ? (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Question {index + 1}</p>
            <div className="mt-2 min-w-0">
              <RichContent html={question.contentHtml} className="assessment-question-copy" />
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Media reference</p>
          <img src={mediaUrl} alt="Question media" className="mt-3 h-auto max-h-72 w-full max-w-full rounded-2xl object-contain bg-white" />
        </div>
      ) : null}

      {question.questionType === 'MULTIPLE_CHOICE' && (
        <div className="space-y-3">
          {options.map((opt, optionIndex) => {
            const selected = value === opt;
            return (
              <label
                key={opt}
                className={`flex min-h-11 min-w-0 cursor-pointer touch-manipulation items-start gap-3 rounded-2xl border px-3 py-4 transition sm:gap-4 sm:rounded-[24px] sm:px-4 ${
                  selected
                    ? 'border-[#B5E61D] bg-[#FAFDEB] shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
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
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${selected ? 'bg-[#101820] text-white' : 'bg-[#F8FAFC] text-slate-600'}`}>
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="min-w-0 break-words text-base leading-7 text-slate-700 [overflow-wrap:anywhere]">{opt}</span>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {question.questionType === 'TRUE_FALSE' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {['true', 'false'].map((opt) => {
            const selected = value === opt;
            return (
              <label
                key={opt}
                className={`flex min-h-11 cursor-pointer touch-manipulation items-center gap-3 rounded-2xl border px-4 py-4 capitalize transition sm:rounded-[24px] ${
                  selected
                    ? 'border-[#B5E61D] bg-[#FAFDEB] shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={selected}
                  onChange={() => onChange(opt)}
                />
                <span className="text-sm font-medium text-slate-700">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.questionType === 'FILL_BLANK' && (
        <AnswerInputWithSymbols
          value={value}
          onChange={onChange}
          rows={2}
          placeholder="Enter your answer"
        />
      )}

      {question.questionType === 'NUMERIC' && (
        <AnswerInputWithSymbols
          value={value}
          onChange={onChange}
          rows={2}
          inputMode="decimal"
          placeholder="e.g. 2.73 cm or 3/4"
        />
      )}

      {question.questionType === 'SHORT_ANSWER' && (
        <AnswerInputWithSymbols
          value={value}
          onChange={onChange}
          placeholder="Write a clear, concise response"
        />
      )}

      {question.questionType === 'ESSAY' && (
        <AnswerInputWithSymbols
          value={value}
          onChange={onChange}
          rows={7}
          allowImageUpload
          placeholder="Write your response, calculation, or explanation"
        />
      )}

      {(question.questionType === 'MATCHING' || question.questionType === 'ORDERING') && (
        <AnswerInputWithSymbols
          value={value}
          onChange={onChange}
          placeholder="Enter your matched or ordered answer"
        />
      )}

      {question.questionType === 'FILE_UPLOAD' && (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 sm:rounded-[24px]">
          <p className="text-sm font-medium text-[#101820]">Take or upload a photo of your graph</p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="mt-4 block min-h-11 w-full min-w-0 cursor-pointer text-base file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#101820] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {uploading ? <p className="mt-3 text-xs text-slate-500">Uploading...</p> : null}
          {value && !uploading ? (
            <p className="mt-3 text-xs font-medium text-green-700">Graph photo uploaded.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
