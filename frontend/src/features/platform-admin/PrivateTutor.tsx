import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { independentStudentsApi } from '../../api/independent-students.api';
import { assignmentsApi } from '../../api/assignments.api';
import { submissionsApi } from '../../api/submissions.api';
import { apiErrorMessage } from '../../api/axios';
import { ActionCard, EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import { RichContent } from '../../components/ui/RichContent';
import type {
  Answer,
  TutorReviewState,
  TutorSubmission,
} from '../../types';

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reviewState(submission: TutorSubmission) {
  if (submission.status === 'SUBMITTED') return 'PENDING';
  return submission.gradedBy ? 'TUTOR_REVIEWED' : 'AUTO_GRADED';
}

function reviewLabel(submission: TutorSubmission) {
  const state = reviewState(submission);
  if (state === 'PENDING') return 'Needs review';
  if (state === 'AUTO_GRADED') return 'Auto-graded';
  return 'Tutor reviewed';
}

function reviewBadgeClass(submission: TutorSubmission) {
  const state = reviewState(submission);
  if (state === 'PENDING') return 'bg-amber-50 text-amber-700';
  if (state === 'AUTO_GRADED') return 'bg-sky-50 text-sky-700';
  return 'bg-[#EAF7C8] text-[#405B00]';
}

export function PrivateTutorPage() {
  const [studentId, setStudentId] = useState<number | undefined>();
  const [subject, setSubject] = useState('');
  const [filter, setFilter] = useState<TutorReviewState>('ALL');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<TutorSubmission | null>(null);

  const overviewQuery = useQuery({
    queryKey: ['private-tutor-overview'],
    queryFn: independentStudentsApi.getTutorOverview,
  });
  const studentsQuery = useQuery({
    queryKey: ['independent-students'],
    queryFn: independentStudentsApi.findStudents,
  });
  const assignmentsQuery = useQuery({
    queryKey: ['independent-assignments'],
    queryFn: assignmentsApi.findIndependent,
  });
  const submissionsQuery = useQuery({
    queryKey: ['private-tutor-submissions', studentId, subject, filter],
    queryFn: () =>
      independentStudentsApi.getTutorSubmissions({
        studentId,
        subject: subject || undefined,
        reviewState: filter,
      }),
  });

  const submissions = submissionsQuery.data ?? [];
  const students = studentsQuery.data ?? [];
  const summary = overviewQuery.data?.summary;
  const subjects = useMemo(
    () =>
      Array.from(new Set((assignmentsQuery.data ?? []).map((item) => item.subject))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [assignmentsQuery.data],
  );
  const visibleSubmissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return submissions;
    return submissions.filter(
      (submission) =>
        submission.student.name.toLowerCase().includes(term) ||
        submission.student.admissionNumber?.toLowerCase().includes(term) ||
        submission.assignment.title.toLowerCase().includes(term) ||
        submission.assignment.subject.toLowerCase().includes(term),
    );
  }, [search, submissions]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Independent learners"
        title="Private Tutor"
        meta="Submissions, feedback and learning activity"
        actions={
          <Link
            to="/platform/independent-assignments/new"
            className="rounded-xl bg-[#101820] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Create assignment
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Students" value={summary?.totalStudents ?? 0} compact />
        <MetricCard label="Submissions" value={summary?.totalSubmissions ?? 0} compact />
        <MetricCard label="Needs review" value={summary?.pendingReview ?? 0} compact />
        <MetricCard label="Auto-graded" value={summary?.autoGraded ?? 0} compact />
        <MetricCard label="STEM completions" value={summary?.labCompletions ?? 0} compact />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TutorModule
          title="Independent students"
          value={`${summary?.totalStudents ?? 0} learners`}
          to="/platform/independent-students"
          icon={<PeopleIcon />}
        />
        <TutorModule
          title="Independent assignments"
          value={`${summary?.totalAssignments ?? 0} assignments`}
          to="/platform/independent-assignments"
          icon={<AssignmentIcon />}
        />
        <TutorModule
          title="STEM Labs"
          value={`${summary?.labCompletions ?? 0} completions`}
          to="/platform/stem-content"
          icon={<LabIcon />}
        />
        <TutorModule
          title="Mnemonic Cards"
          value={`${summary?.publishedMnemonicCards ?? 0} published`}
          to="/platform/mnemonic-cards"
          icon={<CardIcon />}
        />
      </section>

      <ActionCard
        title="Assignment submissions"
        meta={`${visibleSubmissions.length} records`}
        action={
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {summary?.tutorReviewed ?? 0} reviewed
          </span>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_190px]">
          <label className="relative">
            <span className="sr-only">Search submissions</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student or assignment"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#8CB500]"
            />
          </label>
          <select
            value={studentId ?? ''}
            onChange={(event) => setStudentId(event.target.value ? Number(event.target.value) : undefined)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8CB500]"
          >
            <option value="">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8CB500]"
          >
            <option value="">All subjects</option>
            {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as TutorReviewState)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8CB500]"
          >
            <option value="ALL">All review states</option>
            <option value="PENDING">Needs review</option>
            <option value="AUTO_GRADED">Auto-graded</option>
            <option value="TUTOR_REVIEWED">Tutor reviewed</option>
          </select>
        </div>

        <div className="mt-5">
          {submissionsQuery.isLoading ? (
            <EmptyState title="Loading submissions..." />
          ) : visibleSubmissions.length === 0 ? (
            <EmptyState title="No submissions match these filters." />
          ) : (
            <SubmissionTable submissions={visibleSubmissions} onReview={setReviewing} />
          )}
        </div>
      </ActionCard>

      <ActionCard
        title="STEM learning activity"
        meta={`${overviewQuery.data?.recentLabSessions.length ?? 0} recent completions`}
      >
        {overviewQuery.isLoading ? (
          <EmptyState title="Loading STEM activity..." />
        ) : !overviewQuery.data?.recentLabSessions.length ? (
          <EmptyState title="No independent student STEM completions yet." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Grade/Form</th>
                  <th className="px-4 py-3 font-semibold">Lab</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overviewQuery.data.recentLabSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-4 py-3 font-semibold text-[#101820]">{session.student.name}</td>
                    <td className="px-4 py-3 text-slate-600">{session.student.grade ?? 'Not set'}</td>
                    <td className="px-4 py-3 text-slate-700">{session.lab?.title ?? session.labKey}</td>
                    <td className="px-4 py-3 text-slate-600">{session.lab?.subject ?? 'STEM'}</td>
                    <td className="px-4 py-3 font-semibold text-[#101820]">
                      {session.score != null && session.maxScore != null
                        ? `${session.score}/${session.maxScore}`
                        : 'Completion'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(session.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ActionCard>

      {reviewing ? (
        <ReviewSubmissionModal submission={reviewing} onClose={() => setReviewing(null)} />
      ) : null}
    </div>
  );
}

function SubmissionTable({
  submissions,
  onReview,
}: {
  submissions: TutorSubmission[];
  onReview: (submission: TutorSubmission) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Student</th>
            <th className="px-4 py-3 font-semibold">Grade/Form</th>
            <th className="px-4 py-3 font-semibold">Assignment</th>
            <th className="px-4 py-3 font-semibold">Subject</th>
            <th className="px-4 py-3 font-semibold">Submitted</th>
            <th className="px-4 py-3 font-semibold">Result</th>
            <th className="px-4 py-3 text-right font-semibold">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {submissions.map((submission) => (
            <tr key={submission.id} className="transition hover:bg-slate-50/70">
              <td className="px-4 py-4">
                <p className="font-semibold text-[#101820]">{submission.student.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {submission.student.admissionNumber ?? `Student ${submission.student.id}`}
                </p>
              </td>
              <td className="px-4 py-4 text-slate-600">
                {submission.student.grade ?? submission.assignment.grade}
              </td>
              <td className="px-4 py-4 font-medium text-slate-700">{submission.assignment.title}</td>
              <td className="px-4 py-4 text-slate-600">{submission.assignment.subject}</td>
              <td className="px-4 py-4 text-slate-500">
                {formatDateTime(submission.completedAt ?? submission.createdAt)}
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${reviewBadgeClass(submission)}`}>
                  {reviewLabel(submission)}
                </span>
                <p className="mt-2 text-xs font-semibold text-[#101820]">
                  {submission.score != null
                    ? `${submission.score}/${submission.assignment.maxPoints}`
                    : 'No final score'}
                </p>
              </td>
              <td className="px-4 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onReview(submission)}
                  className="rounded-xl bg-[#101820] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewSubmissionModal({
  submission,
  onClose,
}: {
  submission: TutorSubmission;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ['submission', submission.id],
    queryFn: () => submissionsApi.findOne(submission.id),
  });
  const [points, setPoints] = useState<Record<number, number>>({});
  const [answerFeedback, setAnswerFeedback] = useState<Record<number, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!detailQuery.data?.answers) return;
    setPoints(
      Object.fromEntries(
        detailQuery.data.answers.map((answer) => [answer.questionId, answer.pointsAwarded ?? 0]),
      ),
    );
    setAnswerFeedback(
      Object.fromEntries(
        detailQuery.data.answers.map((answer) => [answer.questionId, answer.feedback ?? '']),
      ),
    );
    setOverallFeedback(detailQuery.data.feedback ?? '');
  }, [detailQuery.data]);

  const gradeMutation = useMutation({
    mutationFn: () =>
      submissionsApi.grade(submission.id, {
        feedback: overallFeedback.trim() || undefined,
        answers: (detailQuery.data?.answers ?? []).map((answer) => ({
          questionId: answer.questionId,
          pointsAwarded: points[answer.questionId] ?? 0,
          feedback: answerFeedback[answer.questionId]?.trim() || undefined,
        })),
      }),
    onSuccess: () => {
      setNotice('Feedback and marks saved.');
      queryClient.invalidateQueries({ queryKey: ['private-tutor-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['private-tutor-overview'] });
      queryClient.invalidateQueries({ queryKey: ['submission', submission.id] });
    },
    onError: (error) => setNotice(apiErrorMessage(error, 'Could not save this review')),
  });

  const releaseMutation = useMutation({
    mutationFn: () => submissionsApi.release(submission.id),
    onSuccess: () => {
      setNotice('Results released to the student.');
      queryClient.invalidateQueries({ queryKey: ['private-tutor-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['private-tutor-overview'] });
      queryClient.invalidateQueries({ queryKey: ['submission', submission.id] });
    },
    onError: (error) => setNotice(apiErrorMessage(error, 'Could not release these results')),
  });

  const detail = detailQuery.data;
  const total = Object.values(points).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#101820]/60 p-3 sm:p-6" onClick={onClose}>
      <section
        className="mx-auto my-3 w-full max-w-4xl rounded-[28px] bg-[#F8FAFC] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[28px] border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {submission.assignment.subject} / {submission.student.grade ?? submission.assignment.grade}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#101820]">{submission.assignment.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {submission.student.name} / {formatDateTime(submission.completedAt ?? submission.createdAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          {detailQuery.isLoading ? (
            <EmptyState title="Loading submission..." />
          ) : !detail ? (
            <EmptyState title="Submission could not be loaded." />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <ReviewMetric label="Current status" value={reviewLabel(submission)} />
                <ReviewMetric
                  label="Current score"
                  value={detail.score != null ? `${detail.score}/${submission.assignment.maxPoints}` : 'Pending'}
                />
                <ReviewMetric label="Review total" value={`${total}/${submission.assignment.maxPoints}`} />
                <ReviewMetric
                  label="Student access"
                  value={detail.resultsReleasedAt ? 'Released' : 'Private'}
                />
              </div>

              <div className="space-y-4">
                {(detail.answers ?? []).map((answer, index) => (
                  <AnswerReview
                    key={answer.id}
                    answer={answer}
                    index={index}
                    points={points[answer.questionId] ?? 0}
                    feedback={answerFeedback[answer.questionId] ?? ''}
                    onPointsChange={(value) =>
                      setPoints((current) => ({ ...current, [answer.questionId]: value }))
                    }
                    onFeedbackChange={(value) =>
                      setAnswerFeedback((current) => ({ ...current, [answer.questionId]: value }))
                    }
                  />
                ))}
              </div>

              <label className="block rounded-2xl border border-slate-200 bg-white p-5">
                <span className="text-sm font-semibold text-[#101820]">Overall feedback</span>
                <textarea
                  value={overallFeedback}
                  onChange={(event) => setOverallFeedback(event.target.value)}
                  rows={4}
                  placeholder="Add guidance, encouragement or next steps"
                  className="mt-3 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#8CB500]"
                />
              </label>

              {notice ? <p className="text-sm font-medium text-slate-600">{notice}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => gradeMutation.mutate()}
                  disabled={gradeMutation.isPending}
                  className="rounded-xl bg-[#B5E61D] px-5 py-3 text-sm font-semibold text-[#101820] disabled:opacity-60"
                >
                  {gradeMutation.isPending ? 'Saving...' : 'Save review'}
                </button>
                <button
                  type="button"
                  onClick={() => releaseMutation.mutate()}
                  disabled={
                    releaseMutation.isPending ||
                    detail.status !== 'GRADED' ||
                    Boolean(detail.resultsReleasedAt)
                  }
                  className="rounded-xl border border-[#101820] bg-white px-5 py-3 text-sm font-semibold text-[#101820] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  title={detail.status !== 'GRADED' ? 'Save the review before releasing results' : undefined}
                >
                  {releaseMutation.isPending
                    ? 'Releasing...'
                    : detail.resultsReleasedAt
                      ? 'Results released'
                      : 'Release to student'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#101820]"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function AnswerReview({
  answer,
  index,
  points,
  feedback,
  onPointsChange,
  onFeedbackChange,
}: {
  answer: Answer;
  index: number;
  points: number;
  feedback: string;
  onPointsChange: (value: number) => void;
  onFeedbackChange: (value: string) => void;
}) {
  const question = answer.question;
  const maxPoints = question?.points ?? 0;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Question {index + 1}{question ? ` / ${question.questionType.replace(/_/g, ' ')}` : ''}
          </p>
          {question?.contentHtml ? (
            <RichContent html={question.contentHtml} className="mt-3 font-medium text-[#101820]" />
          ) : (
            <p className="mt-3 font-medium text-[#101820]">{question?.questionText ?? 'Question'}</p>
          )}
        </div>
        {answer.isCorrect != null ? (
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${answer.isCorrect ? 'bg-[#EAF7C8] text-[#405B00]' : 'bg-red-50 text-red-600'}`}>
            {answer.isCorrect ? 'Correct' : 'Check answer'}
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Student answer</p>
        {question?.questionType === 'ESSAY' ? (
          <RichContent html={answer.studentAnswer} className="mt-2" />
        ) : question?.questionType === 'FILE_UPLOAD' && /^https?:\/\//i.test(answer.studentAnswer) ? (
          <a href={answer.studentAnswer} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-sky-700 underline">
            Open uploaded work
          </a>
        ) : (
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
            {answer.studentAnswer || 'No answer provided'}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Points / {maxPoints}</span>
          <input
            type="number"
            min={0}
            max={maxPoints}
            value={points}
            onChange={(event) => onPointsChange(Math.min(maxPoints, Math.max(0, Number(event.target.value))))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#8CB500]"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">Answer feedback</span>
          <input
            value={feedback}
            onChange={(event) => onFeedbackChange(event.target.value)}
            placeholder="Feedback for this answer"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#8CB500]"
          />
        </label>
      </div>
    </article>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-2 font-semibold text-[#101820]">{value}</p>
    </div>
  );
}

function TutorModule({
  title,
  value,
  to,
  icon,
}: {
  title: string;
  value: string;
  to: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(16,24,32,0.04)] transition hover:-translate-y-0.5 hover:border-[#B5E61D]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#101820] text-[#B5E61D]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-[#101820]">{title}</span>
        <span className="mt-1 block text-xs text-slate-500">{value}</span>
      </span>
    </Link>
  );
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 15a3.5 3.5 0 0 1 2 3.2V20" /></svg>;
}

function AssignmentIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M9 5h10v16H5V5h2" /><path d="M9 3h4v4H9zM8 11h8M8 15h8" /></svg>;
}

function LabIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></svg>;
}

function CardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5" /></svg>;
}
