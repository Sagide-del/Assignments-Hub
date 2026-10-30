import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Lightbulb,
  Sparkles,
  Zap,
} from "lucide-react";
import { AssignmentHubWordmark } from "../../components/ui/Logo";
import "./recall-cards.css";
import type { RecallContent } from "../../api/content-library.api";
import { IllustrationViewer } from "./IllustrationViewer";
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
      <header className="recall-brand-header flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-7">
        <a
          href="https://assignmenthub.co.ke/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Assignment Hub"
          className="recall-card-logo inline-flex rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <AssignmentHubWordmark size="md" />
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <span className="recall-edition-sticker inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em]">
            <Sparkles size={13} />
            Recall club
          </span>
          <span className="recall-course-label rounded-full px-3 py-1.5 text-[11px] font-semibold">
            {grade} · {subject}
          </span>
        </div>
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
        <div className="recall-question-strip my-4 flex items-start gap-3 rounded-lg px-4 py-3">
          <span className="recall-challenge-icon mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Zap size={15} />
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Your memory mission
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-800">
              {content.cue}
            </p>
          </div>
        </div>
        <div className="revision-sheet-layout">
          <div className="recall-art-panel min-w-0 rounded-xl border border-slate-100 p-2 sm:p-3">
            <IllustrationViewer visual={visual} reveal={reveal} />
          </div>
          {reveal ? (
            <div className="space-y-4">
              <div className="recall-brand-memory border-l-4 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] recall-brand-ink">
                  <span className="inline-flex items-center gap-1.5">
                    <Lightbulb size={13} />
                    Make it stick
                  </span>
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
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <BookOpen size={12} />
              Understand
            </span>
            <span className="inline-flex items-center gap-1">
              <Brain size={12} />
              Recall
            </span>
            <span className="inline-flex items-center gap-1">
              <Lightbulb size={12} />
              Apply
            </span>
          </div>
          <a
            href="https://assignmenthub.co.ke/"
            target="_blank"
            rel="noopener noreferrer"
            className="recall-site-link inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-4"
          >
            assignmenthub.co.ke
            <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </article>
  );
}
