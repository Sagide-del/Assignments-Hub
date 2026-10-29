import type { MockAnswer, MockAttempt } from "../../../api/kjsea.api";
import { RichContent } from "../../../components/ui/RichContent";
import { Flag } from "lucide-react";
import { resolveUploadUrl } from "../../../api/uploads.api";
import { MockVisual } from "./MockVisual";
import {
  gapLabels,
  languagePages,
  paperDuration,
} from "./language-paper-layout";

function PassageText({
  text,
  labels,
}: {
  text: string;
  labels: Map<number, number>;
}) {
  return (
    <>
      {text.split(/(\(\d+\)\s*_{2,})/g).map((part, i) => {
        const number = part.match(/^\((\d+)\)\s*_{2,}$/)?.[1];
        return number ? (
          <span key={i} className="inline-block whitespace-nowrap">
            <strong>({labels.get(Number(number)) ?? number})</strong>
            <span
              aria-label="blank"
              className="mx-1 inline-block w-24 border-b border-dotted border-slate-800 align-baseline"
            >
              &nbsp;
            </span>
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}
export function LanguagePaperPage({
  paper,
  index,
  answers,
  completed,
  disabled,
  flags,
  onAnswer,
  onFlag,
  onPage,
}: {
  paper: MockAttempt;
  index: number;
  answers: Record<string, MockAnswer>;
  completed: boolean;
  disabled: boolean;
  flags: string[];
  onAnswer: (id: string, option: number) => void;
  onFlag: (id: string) => void;
  onPage: (index: number) => void;
}) {
  const pages = languagePages(paper.questions),
    pageIndex = pages.findIndex((p) => index >= p.first && index <= p.last);
  const page = pages[pageIndex] ?? pages[0],
    first = page.questions[0],
    labels = gapLabels(page);
  const text = first.passage?.text ?? "",
    lines = text.split("\n");
  const dialogue = /dialog|mazungumzo/i.test(first.section ?? first.area);
  const isGap = labels.size > 0;
  const kiswahili = /kiswahili/i.test(paper.subject);
  const range =
    page.first === page.last
      ? `${page.first + 1}`
      : `${page.first + 1} ${kiswahili ? "hadi" : "to"} ${page.last + 1}`;
  const instruction = isGap
    ? kiswahili
      ? `Soma ${dialogue ? "mazungumzo yafuatayo" : "kifungu kifuatacho"}. Chagua jibu linalofaa kwa mapengo ${range}.`
      : `Read the ${dialogue ? "dialogue" : "passage"} below. It contains blank spaces ${range}. For each blank space, select the best alternative from the choices given.`
    : kiswahili
      ? `Soma kifungu kifuatacho kisha ujibu maswali ${range}.`
      : `Read the ${/poe|ushairi/i.test(first.section ?? "") ? "poem" : "passage"} below and answer questions ${range}.`;
  return (
    <section
      aria-label="Language examination paper"
      className="min-w-0 space-y-4"
    >
      <nav aria-label="Paper pages" className="flex flex-wrap gap-2 font-sans">
        {pages.map((p, i) => (
          <button
            key={p.first}
            onClick={() => onPage(p.first)}
            aria-current={i === pageIndex ? "page" : undefined}
            className={`min-h-10 rounded-lg border px-3 text-xs ${i === pageIndex ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}
          >
            Page {i + 1} · {p.first + 1}–{p.last + 1}
          </button>
        ))}
      </nav>
      <article
        className="min-w-0 rounded-sm border border-slate-300 bg-white px-4 py-6 text-slate-950 shadow-sm sm:px-10 sm:py-9"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <header className="border-b-2 border-slate-900 pb-4">
          <div className="grid grid-cols-[auto_1fr] items-center gap-4">
            <div className="rounded-lg border-2 border-slate-900 px-2 py-1.5 text-center text-xs font-bold leading-5 sm:px-3">
              ASSIGNMENT
              <br />
              HUB
            </div>
            <div className="text-center font-bold">
              <p className="text-base tracking-wide sm:text-xl">
                MOCK EXAMINATION
              </p>
              <p className="mt-1 text-sm sm:text-lg">
                {paper.coverage?.grades?.join(" · ") || "School assessment"}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-2 font-bold">
            <h2 className="text-xl uppercase tracking-wide sm:text-2xl">
              — {paper.subject} —
            </h2>
            <span className="text-sm">
              Time: {paperDuration(paper.timeLimitMinutes ?? 80)}
            </span>
          </div>
        </header>
        <h3 className="mt-5 text-base font-bold italic leading-7 sm:text-lg">
          {first.passage && text.length > 70
            ? instruction
            : (first.passage?.title ??
              `${first.section ?? first.area} · Questions ${range}`)}
        </h3>
        {text && text.length > 70 && (
          <div
            aria-label={dialogue ? "Dialogue passage" : "Reading passage"}
            className="mt-5 text-base leading-8 sm:text-[18px] sm:leading-9"
          >
            {dialogue ? (
              <div className="space-y-3">
                {lines
                  .filter((line) => line.trim())
                  .map((line, i) => {
                    const speaker = line.match(/^([^:]{1,48}):\s*(.*)$/);
                    return speaker ? (
                      <div
                        key={i}
                        className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[7rem_minmax(0,1fr)]"
                      >
                        <strong className="min-w-0 break-words">
                          {speaker[1]}:
                        </strong>
                        <p className="min-w-0">
                          <PassageText text={speaker[2]} labels={labels} />
                        </p>
                      </div>
                    ) : (
                      <p key={i}>
                        <PassageText text={line} labels={labels} />
                      </p>
                    );
                  })}
              </div>
            ) : (
              <p className="whitespace-pre-line">
                <PassageText text={text} labels={labels} />
              </p>
            )}
          </div>
        )}
        {!first.passage && first.contentHtml && (
          <div className="mt-5">
            <RichContent
              html={first.contentHtml}
              className="text-slate-950 [&_p]:leading-8"
            />
          </div>
        )}
        <div className="mt-6 space-y-5 border-t border-slate-200 pt-5">
          {page.questions.map((q, i) => {
            const number = page.first + i + 1,
              selected = answers[q.id],
              compact = isGap && /gap|pengo/i.test(q.prompt);
            const longChoices = q.options.some((o) => o.length > 45);
            return (
              <fieldset key={q.id} className="min-w-0" id={`paper-${q.id}`}>
                <legend
                  className={
                    compact
                      ? "sr-only"
                      : "mb-2 text-base font-semibold leading-7"
                  }
                >
                  {number}.{" "}
                  {compact
                    ? `${kiswahili ? "Chagua jibu la pengo" : "Select the answer for blank"} ${number}.`
                    : q.prompt}
                </legend>
                {q.diagramUrl && (
                  <figure className="mb-3">
                    <img
                      src={resolveUploadUrl(q.diagramUrl)}
                      alt={q.diagramAlt ?? "Question illustration"}
                      className="max-h-80 max-w-full object-contain"
                    />
                  </figure>
                )}
                {q.visual && (
                  <div className="mb-3">
                    <MockVisual visual={q.visual} />
                  </div>
                )}
                <div
                  className={
                    compact
                      ? "grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-start gap-1 sm:gap-2"
                      : ""
                  }
                >
                  {compact && (
                    <span
                      className="pt-2.5 text-base font-bold"
                      aria-hidden="true"
                    >
                      {number}.
                    </span>
                  )}
                  <div
                    className={`grid min-w-0 gap-x-3 gap-y-1 ${longChoices ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}
                  >
                    {q.options.map((option, choice) => (
                      <label
                        key={choice}
                        className={`flex min-h-11 min-w-0 cursor-pointer items-start gap-1.5 rounded px-1.5 py-2 text-base leading-6 ${completed && choice === q.correctIndex ? "bg-emerald-50 text-emerald-900" : selected === choice ? (completed ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-900 outline outline-1 outline-blue-300") : "hover:bg-slate-50"} ${disabled ? "cursor-default" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`language-${q.id}`}
                          aria-label={`Question ${number}, ${String.fromCharCode(65 + choice)}. ${option}`}
                          checked={selected === choice}
                          disabled={disabled}
                          onChange={() => onAnswer(q.id, choice)}
                          className="sr-only peer"
                        />
                        <span className="font-bold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-blue-700">
                          {String.fromCharCode(65 + choice)}.
                        </span>
                        <span className="min-w-0 break-words">{option}</span>
                      </label>
                    ))}
                  </div>
                  {compact && !completed && (
                    <button
                      type="button"
                      onClick={() => onFlag(q.id)}
                      aria-label={`Flag question ${number}`}
                      aria-pressed={flags.includes(q.id)}
                      title="Mark for review"
                      className="flex min-h-11 items-center justify-center text-slate-400"
                    >
                      <Flag
                        size={12}
                        className={
                          flags.includes(q.id)
                            ? "fill-amber-200 text-amber-700"
                            : ""
                        }
                      />
                    </button>
                  )}
                </div>
                {!compact && !completed && (
                  <button
                    type="button"
                    onClick={() => onFlag(q.id)}
                    aria-label={`Flag question ${number}`}
                    aria-pressed={flags.includes(q.id)}
                    className="mt-1 inline-flex min-h-9 items-center gap-1.5 font-sans text-[11px] text-slate-500"
                  >
                    <Flag
                      size={12}
                      className={
                        flags.includes(q.id)
                          ? "fill-amber-200 text-amber-700"
                          : ""
                      }
                    />
                    {flags.includes(q.id)
                      ? "Flagged for review"
                      : "Mark for review"}
                  </button>
                )}
                {completed && (
                  <div className="mt-2 rounded border-l-2 border-emerald-600 bg-slate-50 p-3 font-sans text-sm leading-6">
                    <p className="font-semibold">
                      {selected === q.correctIndex
                        ? "Correct"
                        : selected === undefined
                          ? "Not answered"
                          : "Review your answer"}{" "}
                      · Answer:{" "}
                      {q.correctIndex === undefined
                        ? "Not released"
                        : `${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`}
                    </p>
                    <p className="mt-1">{q.explanation}</p>
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>
        <footer className="mt-7 flex items-center justify-between gap-3 border-t border-slate-900 pt-3 text-xs">
          <span>Assignment Hub · {paper.subject}</span>
          <span>
            {pageIndex + 1} / {pages.length}
            {pageIndex < pages.length - 1 ? " · TURN OVER" : " · END"}
          </span>
        </footer>
      </article>
    </section>
  );
}
