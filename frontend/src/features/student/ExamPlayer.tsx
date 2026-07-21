import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments.api';
import { uploadsApi } from '../../api/uploads.api';
import { apiErrorMessage } from '../../api/axios';
import type { AnswerInput, Question } from '../../types';

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

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M8 4h6l4 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 4v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#101820]">{value}</p>
    </div>
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

function extractMediaUrl(question: Question) {
  const match = question.questionText.match(/https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)/i);
  return match?.[0] ?? null;
}

function isAnswered(question: Question, value: string) {
  if (question.questionType === 'FILE_UPLOAD') return value.trim().length > 0;
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

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
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

  const saveMutation = useMutation({
    mutationFn: (isDraft: boolean) => {
      const answerList: AnswerInput[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: Number(questionId),
        answer,
      }));
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
      return assignmentsApi.submit(assignmentId, { answers: answerList, isDraft, timeSpentSeconds });
    },
    onSuccess: (_, isDraft) => {
      setStatus(isDraft ? 'Draft saved.' : 'Submitted for grading.');
      if (!isDraft) navigate('/student', { replace: true });
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

  if (loadingQuestions) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (alreadyFinal) {
    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(16,24,32,0.08)]">
          <div className="bg-[#101820] px-6 py-8 text-white md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B5E61D]">Assessment Submitted</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{assignment?.title}</h1>
            <p className="mt-3 text-sm text-slate-300">
              {assignment?.subject} · {assignment?.totalMarks} marks
            </p>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-3">
            <StatTile label="Submission status" value={existing.status} />
            <StatTile label="Score" value={existing?.score != null ? `${existing.score} / ${assignment?.totalMarks}` : 'Pending'} />
            <StatTile label="Feedback" value={existing?.gradedAt ? 'Available' : 'Awaiting grading'} />
          </div>
          <div className="border-t border-slate-200 p-6">
            <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-5">
              <p className="text-sm leading-7 text-slate-600">
                You already submitted this assignment
                {existing?.gradedAt ? ' and it has been graded.' : ' and it is awaiting grading.'}
              </p>
              {existing?.feedback ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-[#101820]">Teacher feedback</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{existing.feedback}</p>
                </div>
              ) : null}
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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(16,24,32,0.08)]">
        <div className="bg-[#101820] px-6 py-8 text-white md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B5E61D]">Assessment Workspace</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">{assignment?.title}</h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
                <span>{assignment?.subject}</span>
                <span>·</span>
                <span>{assignment?.totalMarks} marks</span>
                <span>·</span>
                <span>{totalQuestions} questions</span>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                {reviewMode ? 'Review Mode' : `Question ${currentIndex + 1} of ${totalQuestions}`}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-white">
                <ClockIcon />
                <span>{formatElapsed(elapsedSeconds)}</span>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              <span>Progress</span>
              <span>{progressPercent}% answered</span>
            </div>
            <div className="mt-3 h-3 rounded-full bg-white/10">
              <div className="h-3 rounded-full bg-[#B5E61D]" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
                <DocumentIcon />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Assessment summary</p>
                <p className="mt-1 text-sm font-semibold text-[#101820]">{assignment?.subject}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <StatTile label="Questions" value={totalQuestions} />
              <StatTile label="Answered" value={answeredCount} />
              <StatTile label="Unanswered" value={unansweredCount} />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Question navigator</p>
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
                      'flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition',
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
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#EEF8D1]" />
                Answered
              </p>
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#101820]" />
                Current
              </p>
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-slate-300 bg-white" />
                Unanswered
              </p>
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          {!reviewMode && currentQuestion ? (
            <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Question {currentIndex + 1} of {totalQuestions}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {currentQuestion.questionType.replace(/_/g, ' ')} · {currentQuestion.points} pts
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-slate-600">
                    {isAnswered(currentQuestion, answers[currentQuestion.id] ?? '') ? 'Answered' : 'Awaiting answer'}
                  </span>
                </div>
              </div>

              <div className="px-6 py-6">
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
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Review before submit</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#101820]">Assessment summary</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Review your answers before final submission. You can return to any question using the navigator.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatTile label="Total Questions" value={totalQuestions} />
                <StatTile label="Answered" value={answeredCount} />
                <StatTile label="Unanswered" value={unansweredCount} />
              </div>
              <div className="mt-6 rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  {questionList.map((question, index) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => {
                        setReviewMode(false);
                        setCurrentIndex(index);
                      }}
                      className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
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

          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                {!reviewMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#101820] disabled:opacity-50"
                    >
                      <ArrowIcon direction="left" />
                      Previous Question
                    </button>
                    {currentIndex < totalQuestions - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white"
                      >
                        Next Question
                        <ArrowIcon direction="right" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReviewMode(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white"
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
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#101820]"
                  >
                    <ArrowIcon direction="left" />
                    Return to Questions
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate(true)}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#101820] disabled:opacity-60"
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
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#B5E61D] px-4 py-3 text-sm font-semibold text-[#101820] disabled:opacity-60"
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
    <div className="space-y-5">
      <div>
        <p className="text-lg font-semibold leading-8 text-[#101820]">
          {index + 1}. {question.questionText}
        </p>
        {question.hint ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-slate-500">
            Hint: {question.hint}
          </p>
        ) : null}
      </div>

      {mediaUrl ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Media reference</p>
          <img src={mediaUrl} alt="Question media" className="mt-3 max-h-72 w-full rounded-2xl object-contain bg-white" />
        </div>
      ) : null}

      {question.questionType === 'MULTIPLE_CHOICE' && (
        <div className="space-y-3">
          {options.map((opt, optionIndex) => {
            const selected = value === opt;
            return (
              <label
                key={opt}
                className={`flex cursor-pointer items-start gap-4 rounded-[24px] border px-4 py-4 transition ${
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
                  <span className="text-sm leading-7 text-slate-700">{opt}</span>
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
                className={`flex cursor-pointer items-center gap-3 rounded-[24px] border px-4 py-4 capitalize transition ${
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
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[24px] border border-slate-300 px-4 py-3 text-sm text-slate-700"
          placeholder="Enter your answer"
        />
      )}

      {question.questionType === 'ESSAY' && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="w-full rounded-[24px] border border-slate-300 px-4 py-4 text-sm leading-7 text-slate-700"
          placeholder="Write your response here"
        />
      )}

      {(question.questionType === 'MATCHING' || question.questionType === 'ORDERING') && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Provide your structured response below. This input remains compatible with the current backend format.
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="Enter your matched or ordered answer"
            className="w-full rounded-[24px] border border-slate-300 px-4 py-4 text-sm font-mono text-slate-700"
          />
        </div>
      )}

      {question.questionType === 'FILE_UPLOAD' && (
        <div className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-4">
          <p className="text-sm font-medium text-[#101820]">Upload your file response</p>
          <input
            type="file"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="mt-4 text-sm"
          />
          {uploading ? <p className="mt-3 text-xs text-slate-500">Uploading...</p> : null}
          {value && !uploading ? (
            <p className="mt-3 text-xs font-medium text-green-700">Uploaded file reference saved.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
