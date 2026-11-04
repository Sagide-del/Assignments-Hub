import katex from "katex";
import "katex/dist/katex.min.css";
import { RichContent } from "../../components/ui/RichContent";
import { useId, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, BookOpenCheck } from "lucide-react";
import {
  validateTheoryCheatsheet,
  parseConceptMap,
} from "../../../../backend/src/cms/theory-cheatsheet";
import { MathText } from "../../components/ExamDiagrams/MathText";
function PrintCheatsheet({ value, title }: { value: unknown; title: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    const done = () => setOpen(false);
    window.addEventListener("afterprint", done);
    void document.fonts.ready.then(() => {
      if (live) window.print();
    });
    return () => {
      live = false;
      window.removeEventListener("afterprint", done);
    };
  }, [open]);
  return (
    <>
      <style>{`.print-only-cheatsheet{display:none}@media print{body:has(> .print-only-cheatsheet) #root{display:none!important}.print-only-cheatsheet{display:block!important;width:100%}.print-only-cheatsheet .cheatsheet-card{border:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}.print-only-cheatsheet button{display:none}}`}</style>
      <button
        disabled={open}
        className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium"
        onClick={() => setOpen(true)}
      >
        <Printer size={15} />
        Print cheat sheet
      </button>
      {open &&
        createPortal(
          <div className="print-only-cheatsheet">
            <TheoryCheatsheet value={value} title={title} printable={false} />
          </div>,
          document.body,
        )}
    </>
  );
}
export function TheoryCheatsheet({
  value,
  title = "Topic cheat sheet",
  printable = true,
}: {
  value: unknown;
  title?: string;
  printable?: boolean;
}) {
  const marker = useId().replace(/:/g, "");
  let sheet;
  try {
    sheet = validateTheoryCheatsheet(value);
  } catch {
    return null;
  }
  const map = parseConceptMap(sheet.concept_diagram.latex_code);
  const position = (id: string) => {
    const n = map.nodes.find((n) => n.id === id)!;
    return { x: 100 + n.x * 70, y: 70 + (6 - n.y) * 60 };
  };
  const points = map.nodes.map((n) => position(n.id));
  const minX = Math.min(...points.map((p) => p.x)) - 105,
    minY = Math.min(...points.map((p) => p.y)) - 50;
  const width = Math.max(...points.map((p) => p.x)) - minX + 105,
    height = Math.max(...points.map((p) => p.y)) - minY + 50;
  return (
    <article
      className="cheatsheet-card min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 print:border-0"
      aria-label="Topic cheat sheet"
    >
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold text-[#71851b]">
            <BookOpenCheck size={16} />
            Assignment Hub · Cheat sheet
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {printable && <PrintCheatsheet value={sheet} title={title} />}
      </header>
      <figure className="min-w-0 overflow-x-auto rounded-lg bg-slate-50 p-3">
        <svg
          role="img"
          aria-label={`${title} concept diagram`}
          viewBox={`${minX} ${minY} ${width} ${height}`}
          className="mx-auto max-h-80 w-full min-w-[640px] max-w-3xl"
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" fill="#64748b" />
            </marker>
          </defs>
          {map.edges.map((e, i) => {
            const a = position(e.from),
              b = position(e.to),
              dx = b.x - a.x,
              dy = b.y - a.y,
              len = Math.hypot(dx, dy),
              short = Math.min(75, len * 0.25);
            return (
              <line
                key={i}
                x1={a.x + (dx / len) * short}
                y1={a.y + (dy / len) * short}
                x2={b.x - (dx / len) * short}
                y2={b.y - (dy / len) * short}
                stroke="#64748b"
                strokeWidth="2"
                markerEnd={`url(#${marker})`}
              />
            );
          })}
          {map.nodes.map((n) => {
            const p = position(n.id);
            const words = n.label.split(" "),
              lines: string[] = [];
            let line = "";
            for (const word of words) {
              if ((line + " " + word).trim().length > 23 && line) {
                lines.push(line);
                line = word;
              } else line = (line + " " + word).trim();
            }
            if (line) lines.push(line);
            return (
              <g key={n.id}>
                <rect
                  x={p.x - 85}
                  y={p.y - 35}
                  width="170"
                  height="70"
                  rx="10"
                  fill="white"
                  stroke="#9cba37"
                />
                <text
                  x={p.x}
                  y={p.y - (lines.length - 1) * 7}
                  textAnchor="middle"
                  fill="#101820"
                  fontSize="12"
                >
                  {lines.map((text, i) => (
                    <tspan key={i} x={p.x} dy={i ? 14 : 0}>
                      {text}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption className="sr-only">
          {map.nodes.map((n) => n.label).join("; ")}
        </figcaption>
      </figure>
      <section className="mt-5">
        <h3 className="text-sm font-semibold">Key concepts</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
          {sheet.key_concepts.map((s) => (
            <li key={s}>
              <MathText text={s} />
            </li>
          ))}
        </ul>
      </section>
      {sheet.key_formulas.length > 0 && (
        <section className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <h3 className="text-sm font-semibold text-emerald-950">
            Key formulas
          </h3>
          <div className="mt-3 space-y-3 overflow-x-auto text-emerald-950">
            {sheet.key_formulas.map((s) => (
              <div key={s}>
                <RichContent
                  html={katex.renderToString(s, {
                    throwOnError: false,
                    trust: false,
                    strict: "ignore",
                    maxExpand: 100,
                    maxSize: 20,
                  })}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="mt-5 rounded-lg border border-red-100 bg-red-50/60 p-4">
        <h3 className="text-sm font-semibold text-red-950">Common mistakes</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
          {sheet.common_mistakes.map((s) => (
            <li key={s}>
              <MathText text={s} />
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-4 text-right text-xs text-slate-400">
        assignmenthub.co.ke
      </p>
    </article>
  );
}
