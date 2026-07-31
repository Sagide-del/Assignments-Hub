import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments.api';
import { analyticsApi } from '../../api/analytics.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

function formatMinutes(totalSeconds: number) {
  if (!totalSeconds) return '—';
  const minutes = Math.round(totalSeconds / 60);
  return minutes < 1 ? '<1 min' : `${minutes} min`;
}

function difficultyBadge(level: 'EASY' | 'MEDIUM' | 'HARD' | null) {
  if (level === 'HARD') return { label: 'Hard (observed)', className: 'bg-red-50 text-red-700' };
  if (level === 'MEDIUM') return { label: 'Medium (observed)', className: 'bg-amber-50 text-amber-700' };
  if (level === 'EASY') return { label: 'Easy (observed)', className: 'bg-emerald-50 text-emerald-700' };
  return { label: 'Not enough data', className: 'bg-slate-100 text-slate-500' };
}

// Teacher-facing performance dashboard for a single assignment: overview
// stats, per-question performance (computed from actual student answers,
// not the AI-assigned difficulty label used at generation time), and
// struggling/top-performing students. Read-only — see
// backend/src/analytics/analytics.service.ts.
export function AnalyticsDashboard() {
  const [assignmentId, setAssignmentId] = useState<number | null>(null);

  const assignmentsQuery = useQuery({
    queryKey: ['analytics-assignments-list'],
    queryFn: () => assignmentsApi.findAll(),
  });

  const analyticsQuery = useQuery({
    queryKey: ['analytics-assignment', assignmentId],
    queryFn: () => analyticsApi.assignment(assignmentId as number),
    enabled: assignmentId != null,
  });

  const assignments = assignmentsQuery.data ?? [];
  const data = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Teacher" title="Assignment Analytics" />

      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Choose an assignment
        </label>
        <select
          value={assignmentId ?? ''}
          onChange={(event) => setAssignmentId(event.target.value ? Number(event.target.value) : null)}
          className="min-h-11 w-full max-w-xl rounded-xl border border-slate-200 px-3 text-sm sm:w-auto"
        >
          <option value="">Select an assignment...</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.title}
            </option>
          ))}
        </select>
      </section>

      {!assignmentId ? (
        <EmptyState title="Pick an assignment above to see its analytics" />
      ) : analyticsQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading analytics...</p>
      ) : analyticsQuery.isError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {apiErrorMessage(analyticsQuery.error, 'Could not load analytics')}
        </div>
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Average score" value={`${data.overview.averageScore} / ${data.maxPoints}`} />
            <MetricCard label="Average percentage" value={`${data.overview.averagePercentage}%`} />
            <MetricCard label="Pass rate" value={`${data.overview.passRate}%`} />
            <MetricCard label="Average time spent" value={formatMinutes(data.overview.averageTimeSpentSeconds)} />
          </section>
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard compact label="Total submissions" value={data.overview.totalSubmissions} />
            <MetricCard compact label="Graded" value={data.overview.gradedCount} />
            <MetricCard compact label="Pending review" value={data.overview.pendingReviewCount} />
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#101820]">Question performance</h2>
            {data.questionPerformance.length === 0 ? (
              <EmptyState title="No questions on this assignment" />
            ) : (
              <div className="divide-y divide-slate-100">
                {data.questionPerformance.map((question, index) => {
                  const badge = difficultyBadge(question.observedDifficulty);
                  return (
                    <div key={question.questionId} className="py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#101820]">
                          Q{index + 1}. {question.questionText}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                          {question.struggled ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Students struggled here
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {question.questionType.replace(/_/g, ' ')} · {question.timesGraded}/{question.timesAnswered} graded ·{' '}
                        {question.percentCorrect != null ? `${question.percentCorrect}% correct` : 'Not yet graded'}
                      </p>
                      {question.struggled ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Recommendation: revisit this question in class or review the topic before the next assessment.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="text-lg font-semibold text-[#101820]">Struggling students</h2>
              {data.strugglingStudents.length === 0 ? (
                <p className="text-sm text-slate-500">No students below 50% on this assignment.</p>
              ) : (
                <ul className="space-y-2">
                  {data.strugglingStudents.map((student) => (
                    <li key={student.studentId} className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm">
                      <span className="font-medium text-[#101820]">{student.studentName}</span>
                      <span className="text-slate-500">{student.percentage}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="text-lg font-semibold text-[#101820]">Top performers</h2>
              {data.topPerformers.length === 0 ? (
                <p className="text-sm text-slate-500">No graded submissions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.topPerformers.map((student) => (
                    <li key={student.studentId} className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm">
                      <span className="font-medium text-[#101820]">{student.studentName}</span>
                      <span className="text-slate-500">{student.percentage}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AnalyticsDashboard;
