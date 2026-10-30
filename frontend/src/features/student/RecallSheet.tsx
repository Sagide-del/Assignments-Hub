import { AssignmentHubWordmark } from "../../components/ui/Logo";
import "./recall-cards.css";
import type { RecallContent } from "../../api/content-library.api";
import { RecallIllustration } from "./RecallIllustration";
import { recallVisual } from "./recall-visual";
export function RecallSheet({
  content,
  title = "Revision card",
  subject = "Revision",
  grade = "",
  topic = "",
  cardNumber,
  reveal = true,
}: {
  content: RecallContent;
  title?: string;
  subject?: string;
  grade?: string | null;
  topic?: string;
  cardNumber?: number;
  reveal?: boolean;
}) {
  const visual = recallVisual(content, { title, subject, topic });
  return (
    <article
      data-revision-card
      className="overflow-hidden rounded-sm border border-slate-200 bg-white text-slate-900 shadow-sm"
    >
      <header className="recall-brand-header flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <AssignmentHubWordmark size="sm" className="rounded-md" />
          <span className="recall-brand-accent text-[10px] font-bold uppercase tracking-[0.13em]">
            Revision cards
          </span>
        </div>
        <span className="text-xs font-medium">
          {grade} · {subject}
        </span>
      </header>
      <div className="px-5 pb-5 pt-5 sm:px-7 sm:pt-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] recall-brand-ink">
              {topic || subject}
            </p>
            <h2 className="mt-2 text-xl font-bold leading-snug text-slate-950 sm:text-2xl">
              {title}
            </h2>
          </div>
          <span className="recall-brand-badge shrink-0 px-2.5 py-1 text-xs font-semibold">
            {cardNumber ? String(cardNumber).padStart(2, "0") : "AH"}
          </span>
        </div>
        <p className="my-4 text-sm font-medium leading-6 text-slate-700">
          {content.cue}
        </p>
        <div className="revision-sheet-layout">
          <div className="min-w-0 rounded-lg bg-slate-50/50 p-2 sm:p-3">
            <RecallIllustration visual={visual} reveal={reveal} />
          </div>
          {reveal ? (
            <div className="space-y-4">
              <div className="recall-brand-memory border-l-4 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] recall-brand-ink">
                  Memory cue
                </p>
                <p className="mt-2 text-base font-semibold leading-7 text-slate-900">
                  {content.mnemonic}
                </p>
              </div>
              <dl className="divide-y divide-slate-100">
                {content.facts.map((fact, i) => (
                  <div key={i} className="py-2.5 text-xs leading-5">
                    <dt className="font-bold text-slate-800">{fact.label}</dt>
                    <dd className="mt-0.5 text-slate-600">{fact.meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest recall-brand-ink">
                Look · cover · recall
              </p>
              <h3 className="mt-3 text-lg font-semibold">
                Explain it without looking.
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Identify the numbered parts or connections. Say the answer in
                your own words, then reveal the labelled study card.
              </p>
            </div>
          )}
        </div>
        {reveal && (
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-6 text-slate-600">
            {content.explanation}
          </p>
        )}
        <div className="recall-brand-footer mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Understand · Recall · Apply
          </span>
          <span className="text-[10px] font-semibold recall-brand-ink">
            Assignment Hub
          </span>
        </div>
      </div>
    </article>
  );
}
