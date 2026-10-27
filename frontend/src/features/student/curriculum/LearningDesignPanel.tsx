import { useState } from 'react';
import { ClipboardCheck, Download, ExternalLink, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth.store';
import { COMPETENCIES, type LearningDesign } from './framework';
import {
  REVIEW_LABELS,
  REVIEW_STATES,
  reviewKey,
  reviewRecord,
  reviewText,
  validReview,
  type LearningReview,
  type ReviewState,
} from './learning-journal';

export function downloadReview(records: LearningReview[]) {
  const url = URL.createObjectURL(
    new Blob([reviewText(records)], { type: 'text/plain;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-learning-evidence.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function LearningGuideLink() {
  return (
    <Link
      to="/student/resources?section=GUIDE"
      className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"
    >
      <Target className="h-4 w-4" aria-hidden="true" />
      Learning outcomes & resources
    </Link>
  );
}
export function LearningDesignPanel({
  design,
  open = false,
  review = true,
}: {
  design: LearningDesign;
  open?: boolean;
  review?: boolean;
}) {
  return (
    <details
      open={open}
      className="rounded-2xl border border-teal-200 bg-white p-4 sm:p-5"
    >
      <summary className="cursor-pointer text-sm font-semibold text-teal-900">
        <Target className="mr-2 inline h-4 w-4" aria-hidden="true" />
        Learning outcomes & evidence
      </summary>
      <div className="mt-4 space-y-5">
        <p className="text-xs leading-6 text-slate-500">
          {design.teacherAuthored
            ? 'Teacher-authored goals from this assignment’s learning brief. Follow the teacher’s task, support arrangements and criteria.'
            : 'Assignment Hub activity goals using the KICD 2017 framework. These are not verified grade-specific syllabus statements. Your teacher’s task and criteria take priority.'}
        </p>
        <div className="space-y-4">
          {design.outcomes.map((o) => (
            <article
              key={o.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <h3 className="text-sm font-semibold leading-6">
                I can: {o.statement}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <strong>Evidence to keep:</strong> {o.evidence}
              </p>
              <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal-800">
                What good evidence shows
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                {o.criteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                Suggested competency practice
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {o.competencies.map((id) => (
                  <span
                    key={id}
                    className="rounded-lg bg-teal-50 px-2 py-1 text-xs text-teal-900"
                  >
                    {COMPETENCIES.find((c) => c.id === id)?.title}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="grid gap-4 text-sm leading-6 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">Connect it to life</h3>
            <p className="mt-1 text-slate-600">{design.connection}</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {design.values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">
              Choose a way to show your learning
            </h3>
            <p className="mt-1 text-slate-600">{design.access}</p>
          </div>
        </div>
        {review && <SelfReview key={design.id} design={design} />}
        <div className="border-t pt-3 text-xs leading-6 text-slate-500">
          Framework basis: core competencies p. 21; assessment, feedback and
          evidence pp. 113–121.{' '}
          <Link
            to="/student/resources?section=GUIDE"
            className="font-semibold text-teal-800 underline"
          >
            View learning guide and source notes
          </Link>
          .
        </div>
      </div>
    </details>
  );
}
function SelfReview({ design }: { design: LearningDesign }) {
  const userId = useAuthStore((s) => s.user?.id);
  return (
    <ReviewForm
      key={`${userId}:${design.id}`}
      design={design}
      userId={userId}
    />
  );
}
function ReviewForm({
  design,
  userId,
}: {
  design: LearningDesign;
  userId: number | undefined;
}) {
  const [initial] = useState(() => {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(reviewKey(userId!, design.id)) ?? 'null',
      );
      return validReview(value) && value.activityId === design.id
        ? value
        : null;
    } catch {
      return null;
    }
  });
  const [evidence, setEvidence] = useState(initial?.evidence ?? '');
  const [nextStep, setNextStep] = useState(initial?.nextStep ?? '');
  const [reviews, setReviews] = useState<Record<string, ReviewState>>(
    initial?.reviews ?? {},
  );
  const [status, setStatus] = useState('');
  const record = () => reviewRecord(design, evidence, nextStep, reviews);
  function save() {
    try {
      localStorage.setItem(
        reviewKey(userId!, design.id),
        JSON.stringify(record()),
      );
      setStatus('Self-review saved on this browser.');
      window.dispatchEvent(new Event('learning-review-saved'));
    } catch {
      setStatus(
        'This browser could not save your self-review. Download it before leaving.',
      );
    }
  }
  const ready =
    !!userId &&
    !!evidence.trim() &&
    !!nextStep.trim() &&
    design.outcomes.every((o) => !!reviews[o.id]);
  return (
    <section
      aria-label="Personal learning self-review"
      className="rounded-xl bg-slate-50 p-4"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardCheck className="h-4 w-4 text-teal-800" />
        My evidence and next step
      </h3>
      <p className="mt-2 text-xs leading-6 text-slate-500">
        This personal reflection stays on this browser. It is not submitted
        work, a grade or a teacher assessment. Do not include private
        information.
      </p>
      <div className="mt-4 space-y-4">
        {design.outcomes.map((o) => (
          <label key={o.id} className="block text-sm leading-6">
            {o.statement}
            <select
              aria-label={`Self-review: ${o.statement}`}
              value={reviews[o.id] ?? ''}
              onChange={(e) => {
                setReviews((r) => ({
                  ...r,
                  [o.id]: e.target.value as ReviewState,
                }));
                setStatus('');
              }}
              className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="" disabled>
                Choose your self-review
              </option>
              {REVIEW_STATES.map((s) => (
                <option key={s} value={s}>
                  {REVIEW_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="block text-sm">
          What evidence do I have, or where do I need help?
          <textarea
            rows={3}
            value={evidence}
            onChange={(e) => {
              setEvidence(e.target.value);
              setStatus('');
            }}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            placeholder="Describe your work, a result, or a specific difficulty…"
          />
        </label>
        <label className="block text-sm">
          My next improvement or question
          <textarea
            rows={2}
            value={nextStep}
            onChange={(e) => {
              setNextStep(e.target.value);
              setStatus('');
            }}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            placeholder="Next I will… / I need help with…"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!ready}
          onClick={save}
          className="min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          Save self-review
        </button>
        <button
          type="button"
          onClick={() => downloadReview([record()])}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold"
        >
          <Download className="h-4 w-4" />
          Download reflection
        </button>
      </div>
      {status && (
        <p role="status" className="mt-3 text-xs leading-6">
          {status}
        </p>
      )}
      <Link
        to="/student/resources?section=GUIDE"
        className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-teal-800 underline"
      >
        See my saved evidence
        <ExternalLink className="h-3 w-3" />
      </Link>
    </section>
  );
}
