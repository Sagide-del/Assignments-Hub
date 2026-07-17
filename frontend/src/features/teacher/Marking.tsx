import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments.api';
import { submissionsApi } from '../../api/submissions.api';
import { apiErrorMessage } from '../../api/axios';
import type { Question } from '../../types';

// Real grading UI — PATCH /submissions/:id/grade, per-question points +
// overall feedback. Auto-gradable question types (multiple choice, true/
// false, fill-blank) are already scored server-side on submit; this UI is
// mainly for essay/file-upload answers a human has to read, but works for
// any question type since the backend accepts an override either way.
export function Marking() {
  const { data: assignments } = useQuery({ queryKey: ['assignments'], queryFn: () => assignmentsApi.findAll() });
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);

  const { data: submissions } = useQuery({
    queryKey: ['submissions', selectedAssignmentId],
    queryFn: () => submissionsApi.findAll({ assignmentId: selectedAssignmentId! }),
    enabled: !!selectedAssignmentId,
  });

  const { data: questions } = useQuery({
    queryKey: ['assignment-questions', selectedAssignmentId],
    queryFn: () => assignmentsApi.findQuestions(selectedAssignmentId!),
    enabled: !!selectedAssignmentId,
  });

  const [openSubmissionId, setOpenSubmissionId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Marking</h1>

      <select
        value={selectedAssignmentId ?? ''}
        onChange={(e) => {
          setSelectedAssignmentId(e.target.value ? Number(e.target.value) : null);
          setOpenSubmissionId(null);
        }}
        className="border border-gray-300 rounded px-3 py-2 text-sm"
      >
        <option value="">Select an assignment…</option>
        {(assignments ?? []).map((a) => (
          <option key={a.id} value={a.id}>{a.title}</option>
        ))}
      </select>

      {selectedAssignmentId && (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {(submissions ?? []).length === 0 && <p className="p-4 text-sm text-gray-500">No submissions yet.</p>}
          {(submissions ?? []).map((sub) => (
            <div key={sub.id}>
              <button
                onClick={() => setOpenSubmissionId(openSubmissionId === sub.id ? null : sub.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between text-sm"
              >
                <span>Student #{sub.studentId} · {sub.status}</span>
                <span className="text-gray-500">{sub.score != null ? `${sub.score} pts` : 'Ungraded'}</span>
              </button>
              {openSubmissionId === sub.id && (
                <GradeForm submissionId={sub.id} questions={questions ?? []} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GradeForm({ submissionId, questions }: { submissionId: number; questions: Question[] }) {
  const queryClient = useQueryClient();
  const { data: submission } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => submissionsApi.findOne(submissionId),
  });

  const [points, setPoints] = useState<Record<number, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const gradeMutation = useMutation({
    mutationFn: () =>
      submissionsApi.grade(submissionId, {
        feedback: overallFeedback || undefined,
        answers: Object.entries(points).map(([questionId, pointsAwarded]) => ({
          questionId: Number(questionId),
          pointsAwarded,
          feedback: feedbacks[Number(questionId)],
        })),
      }),
    onSuccess: () => {
      setStatus('Graded.');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save grade')),
  });

  return (
    <div className="px-4 pb-4 space-y-3 bg-gray-50">
      {questions.map((q) => {
        const answer = submission?.answers?.find((a) => a.questionId === q.id);
        return (
          <div key={q.id} className="bg-white rounded border border-gray-200 p-3">
            <p className="text-sm font-medium">{q.questionText}</p>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{answer?.studentAnswer || '—'}</p>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-gray-500">Points (of {q.points})</label>
              <input
                type="number"
                min={0}
                max={q.points}
                defaultValue={answer?.pointsAwarded ?? undefined}
                onChange={(e) => setPoints((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <input
              placeholder="Feedback for this answer"
              onChange={(e) => setFeedbacks((prev) => ({ ...prev, [q.id]: e.target.value }))}
              className="w-full mt-2 border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        );
      })}

      <textarea
        placeholder="Overall feedback (optional)"
        value={overallFeedback}
        onChange={(e) => setOverallFeedback(e.target.value)}
        rows={2}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      />

      {status && <p className="text-sm text-gray-600">{status}</p>}

      <button
        onClick={() => gradeMutation.mutate()}
        disabled={gradeMutation.isPending}
        className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
      >
        {gradeMutation.isPending ? 'Saving…' : 'Save Grade'}
      </button>
    </div>
  );
}
