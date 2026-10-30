import { useState } from "react";
import { ChevronLeft, ChevronRight, Layers3 } from "lucide-react";
import type { MnemonicCard } from "../../types";
import { RecallCard } from "./RecallCard";
export function RecallDeck({ cards }: { cards: MnemonicCard[] }) {
  const [activeId, setActiveId] = useState<number | null>(null);
  if (!cards.length) return null;
  const current = Math.max(
      0,
      cards.findIndex((card) => card.id === activeId),
    ),
    card = cards[current];
  return (
    <section className="space-y-4" aria-label="Revision card deck">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div className="flex items-center gap-3">
          <Layers3 size={20} className="recall-brand-ink" />
          <div>
            <p className="text-sm font-semibold">
              Card {current + 1} of {cards.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
               {card.grade}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous revision card"
            disabled={current === 0}
            onClick={() => setActiveId(cards[current - 1].id)}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-xs font-medium disabled:opacity-35"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <button
            aria-label="Next revision card"
            disabled={current === cards.length - 1}
            onClick={() => setActiveId(cards[current + 1].id)}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-xs font-medium disabled:opacity-35"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <RecallCard key={card.id} card={card} cardNumber={current + 1} />
    </section>
  );
}
