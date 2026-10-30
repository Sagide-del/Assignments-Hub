import { useEffect, useRef, useState } from "react";
import { RotateCcw, CheckCircle2, Eye, Printer, Zap } from "lucide-react";
import type { MnemonicCard } from "../../types";
import { RecallSheet } from "./RecallSheet";
import { printRecallSheet } from "./recall-print";
export function RecallCard({
  card,
  cardNumber,
}: {
  card: MnemonicCard;
  cardNumber?: number;
}) {
  const [revealed, setRevealed] = useState(false),
    [checked, setChecked] = useState<number[]>([]),
    [rating, setRating] = useState(""),
    [printing, setPrinting] = useState(false),
    [printError, setPrintError] = useState("");
  const [challengeEnd, setChallengeEnd] = useState<number | null>(null),
    [seconds, setSeconds] = useState(30),
    [challengeNote, setChallengeNote] = useState("");
  useEffect(() => {
    if (!challengeEnd) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((challengeEnd - Date.now()) / 1000));
      setSeconds(left);
      if (!left) {
        setChallengeEnd(null);
        setChallengeNote(
          "Time’s up. Reveal the card and check what you remembered.",
        );
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [challengeEnd]);
  const printSheet = useRef<HTMLDivElement>(null),
    c = card.content!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {revealed
            ? "Study the illustration, then cover it and try again."
            : "Try the question from memory before revealing the labels and notes."}
        </p>
        <button
          disabled={printing}
          onClick={async () => {
            if (!printSheet.current) return;
            setPrinting(true);
            setPrintError("");
            try {
              await printRecallSheet(printSheet.current, card.title);
            } catch {
              setPrintError("Could not open the print view. Please try again.");
            } finally {
              setPrinting(false);
            }
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-semibold disabled:opacity-40"
        >
          <Printer size={15} />
          {printing ? "Preparing…" : "Print / Save PDF"}
        </button>
      </div>
      <RecallSheet
        content={c}
        title={card.title}
        grade={card.grade}
        subject={card.subject}
        topic={card.topic}
        cardNumber={cardNumber}
        reveal={revealed}
      />
      <div className="hidden" aria-hidden="true">
        <div ref={printSheet}>
          <RecallSheet
            content={c}
            title={card.title}
            grade={card.grade}
            subject={card.subject}
            topic={card.topic}
            cardNumber={cardNumber}
            reveal
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            if (challengeEnd) {
              setChallengeEnd(null);
              setChallengeNote(
                "Challenge stopped. You can reveal the card whenever you are ready.",
              );
            } else {
              setSeconds(30);
              setRevealed(false);
              setChecked([]);
              setChallengeEnd(Date.now() + 30000);
              setChallengeNote(
                "Say the answer out loud, or jot it down. Check it when you reveal the card.",
              );
            }
          }}
          className="recall-sprint-button inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
        >
          <Zap size={16} />
          {challengeEnd
            ? `${seconds}s · Stop challenge`
            : "30-second challenge"}
        </button>
        <button
          onClick={() => {
            setChallengeEnd(null);
            setChallengeNote("");
            setRevealed((v) => !v);
            setChecked([]);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white"
        >
          <Eye size={17} />
          {revealed ? "Cover labels & notes" : "Reveal labelled study card"}
        </button>
      </div>
      {challengeNote && (
        <p role="status" className="text-xs leading-6 text-slate-600">
          {challengeNote}
        </p>
      )}
      {revealed && (
        <section
          className="rounded-xl border bg-white p-5"
          aria-label="Check your recall"
        >
          <h3 className="text-sm font-semibold">Check your recall</h3>
          <p className="mt-1 text-xs text-slate-500">
            Answer each question before checking the explanation.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {c.checks.map((q, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-4">
                <p className="recall-brand-ink text-[10px] font-bold uppercase tracking-wider">
                  {["Retrieve", "Explain", "Apply"][i] ?? `Check ${i + 1}`}
                </p>
                <p className="mt-2 text-sm leading-6">{q.question}</p>
                <button
                  onClick={() =>
                    setChecked((v) =>
                      v.includes(i) ? v.filter((x) => x !== i) : [...v, i],
                    )
                  }
                  className="mt-3 min-h-9 recall-brand-ink text-xs font-semibold underline"
                >
                  {checked.includes(i) ? "Hide answer" : "Check answer"}
                </button>
                {checked.includes(i) && (
                  <p className="mt-2 border-t pt-3 text-xs leading-6 text-slate-600">
                    {q.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-medium"
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
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-medium"
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
        </section>
      )}
      {rating && (
        <p role="status" className="text-xs text-slate-600">
          {rating}
        </p>
      )}
      {printError && (
        <p role="alert" className="text-sm text-red-700">
          {printError}
        </p>
      )}
    </div>
  );
}
