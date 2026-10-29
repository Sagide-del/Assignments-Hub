import { useState } from "react";
import { Brain, RotateCcw, CheckCircle2, Eye } from "lucide-react";
import type { MnemonicCard } from "../../types";
export function RecallCard({ card }: { card: MnemonicCard }) {
  const [revealed, setRevealed] = useState(false),
    [checked, setChecked] = useState<number[]>([]),
    [rating, setRating] = useState("");
  const c = card.content!;
  return (
    <article className="flex flex-col rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="inline-flex items-center gap-2">
          <Brain size={18} className="text-indigo-600" />
          {card.subject}
        </span>
        <span>{card.grade}</span>
      </div>
      <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
      <p className="mt-3 text-sm leading-7">{c.cue}</p>
      <p className="mt-2 text-xs text-slate-500">
        Try answering from memory before revealing the card.
      </p>
      {!revealed ? (
        <button
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-medium text-white"
          onClick={() => setRevealed(true)}
        >
          <Eye size={16} />
          Reveal memory aid
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="rounded-lg bg-indigo-50 p-4 text-lg font-semibold text-indigo-900">
            {c.mnemonic}
          </p>
          <dl className="space-y-3">
            {c.facts.map((f, i) => (
              <div className="text-sm leading-6" key={i}>
                <dt className="font-semibold">{f.label}</dt>
                <dd className="text-slate-600">{f.meaning}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-7 text-slate-600">{c.explanation}</p>
          <p className="border-t pt-3 text-xs font-semibold uppercase tracking-wide">
            Check your recall
          </p>
          {c.checks.map((q, i) => (
            <div className="rounded-lg border p-3 text-sm" key={i}>
              <p>{q.question}</p>
              <button
                className="mt-2 text-xs text-indigo-700 underline"
                onClick={() =>
                  setChecked((v) =>
                    v.includes(i) ? v.filter((x) => x !== i) : [...v, i],
                  )
                }
              >
                {checked.includes(i) ? "Hide answer" : "Check answer"}
              </button>
              {checked.includes(i) && (
                <p className="mt-2 leading-6 text-slate-600">{q.answer}</p>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs"
              onClick={() => {
                setRating("Review again: try the cue without looking.");
                setRevealed(false);
                setChecked([]);
              }}
            >
              <RotateCcw size={15} />
              Review again
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs"
              onClick={() => {
                setRating(
                  "Recalled. Try again tomorrow, then after 3, 7 and 14 days. Explain the idea and apply it to a new example.",
                );
                setRevealed(false);
                setChecked([]);
              }}
            >
              <CheckCircle2 size={15} />I remembered
            </button>
          </div>
        </div>
      )}
      {rating && (
        <p role="status" className="mt-3 text-xs text-indigo-700">
          {rating}
        </p>
      )}
    </article>
  );
}
