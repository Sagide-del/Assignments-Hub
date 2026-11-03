import { CheckCircle2, CircleAlert, Trophy } from "lucide-react";
import type { LabSession } from "../../../types";

type LabAnswer = NonNullable<LabSession["answers"]>[number];

export function LabQuizFeedback({ session }: { session?: LabSession | null }) {
  if (!session || session.score == null || session.maxScore == null) return null;

  const graded = (session.answers ?? []).filter((answer: LabAnswer) => answer.isCorrect != null);
  const correct = graded.filter((answer: LabAnswer) => answer.isCorrect).length;
  const percentage = session.maxScore > 0
    ? Math.round((session.score / session.maxScore) * 100)
    : 0;
  const message = percentage >= 80
    ? "Strong recall. Keep the practical notes with this result for your next review."
    : percentage >= 50
      ? "You have a useful starting point. Revisit the brief, then try to explain each idea aloud."
      : "Use the practical brief and your observations to rebuild the key idea, then try another activity.";

  return (
    <section aria-live="polite" className="rounded-2xl border border-lime-200 bg-lime-50 p-5 text-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#b5d334] text-[#202226]">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-wide">Knowledge check auto-marked</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{message}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-2xl font-black tabular-nums">{session.score} / {session.maxScore}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{percentage}%</p>
        </div>
      </div>
      {graded.length > 0 && (
        <p className="mt-4 flex items-center gap-2 border-t border-lime-200 pt-4 text-sm font-medium text-slate-700">
          {correct === graded.length ? <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : <CircleAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />}
          {correct} of {graded.length} knowledge-check question{graded.length === 1 ? "" : "s"} correct. Your practical evidence is saved separately for teacher review where needed.
        </p>
      )}
    </section>
  );
}
