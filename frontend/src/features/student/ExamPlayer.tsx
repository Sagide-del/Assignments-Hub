import { useEffect, useMemo, useState } from 'react';
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

function ReleasedAnswerCard({ answer, index }: { answer: Answer; index: number }) {
  const question = answer.question;
  const correct = expectedAnswer(question);
  const badge = resultBadge(answer, question?.points);
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#101820]">Question {index + 1}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
        </div>
        <span className="text-sm font-medium text-slate-500">
          {answer.pointsAwarded != null && question
            ? `${answer.pointsAwarded} / ${question.points} pts`
            : 'Not scored'}
        </span>
      </div>
      </div>
      <div className="px-4 py-4 sm:px-5">
      {question ? (
        <div>
          {question.contentHtml ? (
            <RichContent html={question.contentHtml} className="assessment-question-copy" />
          ) : (
            <p className="text-sm font-medium leading-6 text-[#101820]">{question.questionText}</p>
          )}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg bg-[#F8FAFC] p-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Your answer</p>
          <ResponseValue value={answer.studentAnswer} />
        </div>
        <div className="rounded-lg border border-lime-200 bg-lime-50 p-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-lime-800">Expected answer</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {correct ?? 'Reviewed manually'}
          </p>
        </div>
      </div>
      {answer.feedback ? (
        <div className="mt-3 border-l-2 border-slate-300 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Feedback</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{answer.feedback}</p>
        </div>
      ) : null}
      {question?.explanation ? (
        <details className="group mt-3 rounded-lg border border-sky-200 bg-sky-50">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-sky-900">
            Explanation
            <span className="text-base transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p className="border-t border-sky-200 px-3 py-3 text-sm leading-6 text-slate-700">{question.explanation}</p>
        </details>
      ) : null}
      </div>
    </article>
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
    return (
      <div className={workspaceClassName}>
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
            <button
              type="button"
              onClick={() => navigate(assignmentListPath)}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#101820]"
            >
              <ArrowIcon direction="left" />
              Back
            </button>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Submitted</p>
                <h1 className="mt-2 break-words text-xl font-semibold tracking-tight text-[#101820] [overflow-wrap:anywhere] sm:text-2xl">
                  {assignment?.title}
                </h1>
                <p className="mt-2 break-words text-sm text-slate-500">
                  {assignment?.subject} · {assignmentMaxPoints} marks
                </p>
              </div>
              <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-[#EEF8D1] px-3 text-xs font-semibold text-[#4D6310]">
                {resultsReleased ? 'Results released' : 'Awaiting review'}
              </span>
            </div>
          </div>
          <div className="grid divide-y divide-slate-200 border-b border-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <StatTile label="Submitted" value={formatDateTime(existing.completedAt ?? existing.createdAt)} />
            <StatTile label="Submission status" value={resultsReleased ? 'RESULTS RELEASED' : existing.status} />
            <StatTile label="Score" value={displayedSubmission?.score != null ? `${displayedSubmission.score} / ${assignmentMaxPoints}` : 'Pending'} />
            <StatTile label="Feedback" value={resultsReleased ? 'Available' : 'Awaiting review'} />
          </div>
          <div className="p-4 sm:p-6">
            <div className="min-w-0">
              {resultsReleased && displayedSubmission?.gradedAt ? (
                <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
                  <p className="text-sm font-semibold text-[#101820]">
                    {displayedSubmission.gradedBy?.name
                      ? `Graded by ${displayedSubmission.gradedBy.name}`
                      : 'Reviewed result'} on {formatDateTime(displayedSubmission.gradedAt)}
                  </p>
                  {displayedSubmission.feedback ? (
                    <p className="mt-2 text-sm leading-7 text-slate-600">{displayedSubmission.feedback}</p>
                  ) : null}
                </div>
              ) : null}
              {resultsReleased && loadingReleasedResults ? (
                <p className="mt-4 text-sm text-slate-500">Loading released results...</p>
              ) : null}
              {resultsReleased && releasedResults?.answers?.length ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-[#101820]">Reviewed answers</p>
                  {releasedResults.answers.map((answer, index) => (
                    <ReleasedAnswerCard key={answer.id} answer={answer} index={index} />
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => navigate(assignmentListPath)}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white sm:w-auto"
              >
                Back to list
              </button>
            </div>
          </div>
        </section>
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
