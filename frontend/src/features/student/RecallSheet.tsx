import { ArrowUpRight, Brain, Lightbulb, Sparkles } from "lucide-react";
import { AssignmentHubWordmark } from "../../components/ui/Logo";
import "./recall-cards.css";
import type { RecallContent } from "../../api/content-library.api";
import { IllustrationViewer } from "./IllustrationViewer";
import { recallVisual } from "./recall-visual";
import { RecallVisualRail } from "./RecallVisualRail";
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
        <a
          href="https://assignmenthub.co.ke/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Assignment Hub"
          className="recall-card-logo inline-flex rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <AssignmentHubWordmark size="md" />
        </a>
        <div className="flex items-center gap-2">
          <span
            className="recall-edition-sticker flex h-8 w-8 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <Sparkles size={16} />
          </span>
          <span className="recall-course-label rounded-full px-3 py-1.5 text-[11px] font-semibold">
            {grade} · {subject}
          </span>
        </div>
      </header>
      <div className="px-4 pb-4 pt-4 sm:px-7">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-2xl">
            {title}
          </h2>
          <span className="recall-brand-badge shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold">
            {cardNumber ? String(cardNumber).padStart(2, "0") : "AH"}
          </span>
        </div>
        <div
          className={`recall-visual-first ${visual.kind === "diagram" || (visual.scene && visual.scene !== "none") ? "recall-visual-first-with-rail" : ""}`}
        >
          <div className="recall-visual-canvas min-w-0">
            <IllustrationViewer visual={visual} reveal={reveal} visualOnly />
          </div>
          <RecallVisualRail visual={visual} reveal={reveal} />
        </div>
        <footer className="recall-brand-footer mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 pt-3">
          <span
            className="inline-flex items-center gap-2 text-slate-400"
            aria-hidden="true"
          >
            <Brain size={14} />
            <span className="recall-footer-dot" />
            <Lightbulb size={14} />
          </span>
          <a
            href="https://assignmenthub.co.ke/"
            target="_blank"
            rel="noopener noreferrer"
            className="recall-site-link inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-4"
          >
            assignmenthub.co.ke
            <ArrowUpRight size={12} />
          </a>
        </footer>
      </div>
    </article>
  );
}
