import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cslSubmissionsApi } from '../../api/csl.api';
import { apiErrorMessage } from '../../api/axios';

// PATCH /csl-submissions/:id/review — approve or send back for revision,
// with a score and feedback. See backend/src/csl-submissions/csl-submissions.controller.ts.
export function CslReview() {
  const queryClient = useQueryClient();
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['csl-submissions', 'all'],
    queryFn: () => cslSubmissionsApi.findAll(),
  });
  const [status, setStatus] = useState<string | null>(null);

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: number; approve: boolean; score?: number; feedback?: string }) =>
      cslSubmissionsApi.review(vars.id, {
        status: vars.approve ? 'APPROVED' : 'NEEDS_REVISION',
        score: vars.score,
        feedback: vars.feedback,
      }),
    onSuccess: () => {
      setStatus('Saved.');
      queryClient.invalidateQueries({ queryKey: ['csl-submissions'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save review')),
  });

  const pending = (submissions ?? []).filter((s) => s.status === 'PENDING');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">CSL Submissions to Review</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {status && <p className="text-sm text-gray-600">{status}</p>}
      {pending.length === 0 && !isLoading && <p className="text-sm text-gray-500">Nothing pending review.</p>}
      <div className="space-y-3">
        {pending.map((sub) => (
          <ReviewRow key={sub.id} submissionId={sub.id} evidenceUrl={sub.evidenceUrl} reflection={sub.reflection} onReview={(approve, score, feedback) => reviewMutation.mutate({ id: sub.id, approve, score, feedback })} pending={reviewMutation.isPending} />
        ))}
      </div>
    </div>
  );
}

function ReviewRow({
  evidenceUrl,
  reflection,
  onReview,
  pending,
}: {
  submissionId: number;
  evidenceUrl: string | null;
  reflection: string | null;
  onReview: (approve: boolean, score?: number, feedback?: string) => void;
  pending: boolean;
}) {
  const [score, setScore] = useState<number | undefined>(undefined);
  const [feedback, setFeedback] = useState('');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
      {evidenceUrl && (
        <a href={evidenceUrl} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">
          View evidence →
        </a>
      )}
      {reflection && <p className="text-sm text-gray-600">{reflection}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          placeholder="Score"
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <input
          placeholder="Feedback"
          onChange={(e) => setFeedback(e.target.value)}
          className="flex-1 min-w-[150px] border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <button
          disabled={pending}
          onClick={() => onReview(true, score, feedback)}
          className="px-3 py-1.5 text-sm rounded bg-green-600 text-white disabled:opacity-60"
        >
          Approve
        </button>
        <button
          disabled={pending}
          onClick={() => onReview(false, score, feedback)}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-60"
        >
          Needs revision
        </button>
      </div>
    </div>
  );
}
