import { cheatsheetDiagramSvg } from "../../../../backend/src/cms/cheatsheet-diagram";
import { resolveCheatsheetVisual } from "../../../../backend/src/cms/cheatsheet-visuals";
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
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let live = true;
    const done = () => setOpen(false);
    window.addEventListener("afterprint", done);
    void document.fonts.ready.then(async () => {
      const root = document.querySelector<HTMLElement>(
        ".print-only-cheatsheet",
      );
      if (!root) return;
      await Promise.all(
        Array.from(root.querySelectorAll("img")).map((image) =>
          image.decode().catch(() => {}),
        ),
      );
      if (!live) return;
      let fits = false;
      for (const size of [13, 12.5, 12]) {
        root.style.fontSize = `${size}px`;
        if (
          root.getBoundingClientRect().height <= 1027 &&
          root.scrollWidth <= root.clientWidth + 1
        ) {
          fits = true;
          break;
        }
      }
      if (!fits) {
        setError(
          "This sheet needs shorter teaching points to fit legibly on one page. No content has been removed.",
        );
        setOpen(false);
        return;
      }
      window.print();
    });
    return () => {
      live = false;
      window.removeEventListener("afterprint", done);
    };
  }, [open]);
  return (
    <>
      <style>{`
.print-only-cheatsheet{display:block;position:fixed;left:-10000px;top:0;width:186mm;background:white;font:13px/1.45 Arial,sans-serif}
.print-only-cheatsheet .cheatsheet-card{padding:0;border:0;border-radius:0}
.print-only-cheatsheet header{margin-bottom:8px;padding-bottom:8px}
.print-only-cheatsheet h2{font-size:25px;line-height:1.15}
.print-only-cheatsheet h3{font-size:12px}
.print-only-cheatsheet .text-sm{font-size:inherit;line-height:1.45}
.print-only-cheatsheet section{margin-top:12px;padding:8px;break-inside:avoid}
.print-only-cheatsheet li{margin-top:4px}
.print-only-cheatsheet figure{margin:10px 0;padding:6px;break-inside:avoid}
.print-only-cheatsheet figure svg{height:155px;min-width:0}
.print-only-cheatsheet figure.generated-cheatsheet-diagram svg{height:auto}
.print-only-cheatsheet figure img{height:180px}
.print-only-cheatsheet .cheatsheet-concepts ul{columns:2;column-gap:24px}
.print-only-cheatsheet .cheatsheet-concepts li{break-inside:avoid}
.print-only-cheatsheet button{display:none}
@media print{@page{size:A4;margin:12mm}body:has(> .print-only-cheatsheet) #root{display:none!important}body:has(> .print-only-cheatsheet){margin:0}.print-only-cheatsheet{position:static;display:block!important;width:186mm}.print-only-cheatsheet .cheatsheet-card{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`}</style>
      <button
        disabled={open}
        className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Printer size={15} />
        Print cheat sheet
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-800">
          {error}
        </p>
      )}
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
  const [visualFailed, setVisualFailed] = useState(false);
  useEffect(() => setVisualFailed(false), [title]);
  const visual = resolveCheatsheetVisual(title);
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
      <style>{`.cheatsheet-card{color:#111!important}.cheatsheet-card header{border-color:#111}.cheatsheet-card header p{color:#111}.cheatsheet-card figure{background:white}.cheatsheet-card>p{color:#444}.cheatsheet-card h2{font-size:1.65rem;line-height:1.2}.cheatsheet-card h3{text-transform:uppercase;letter-spacing:.06em}.cheatsheet-card section{background:white!important;border-color:#999!important;color:#111!important}.cheatsheet-card section ul,.cheatsheet-card section h3,.cheatsheet-card section>div{color:#222!important}.cheatsheet-card svg{filter:grayscale(1)}.generated-cheatsheet-diagram svg{display:block;width:100%;height:auto}.cheatsheet-card figure img{filter:grayscale(1) contrast(1.06);object-fit:contain}.cheatsheet-card li{overflow-wrap:anywhere}`}</style>
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold text-[#71851b]">
            <BookOpenCheck size={16} />
            Assignment Hub · Visual revision guide
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {printable && <PrintCheatsheet value={sheet} title={title} />}
      </header>
      {visual && !visualFailed ? (
        <figure className="my-4 border-b border-neutral-300 pb-3">
          <img
            src={visual.src}
            alt={visual.alt}
            onError={() => setVisualFailed(true)}
            className="h-56 w-full sm:h-64"
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold sm:text-xs">
            {visual.labels.map((label) => (
              <span className="border-t-2 border-black pt-2" key={label}>
                {label}
              </span>
            ))}
          </div>
          <figcaption className="mt-2 text-center text-[10px] text-neutral-600">
            {visual.caption}
          </figcaption>
        </figure>
      ) : sheet.visual_diagram ? (
        <figure className="generated-cheatsheet-diagram my-4 border border-neutral-300 p-3">
          <h3 className="text-xs font-semibold">
            {sheet.visual_diagram.title}
          </h3>
          <div
            className="mx-auto max-w-3xl"
            dangerouslySetInnerHTML={{
              __html: cheatsheetDiagramSvg(sheet.visual_diagram),
            }}
          />
          <figcaption className="mt-2 text-center text-xs text-neutral-600">
            {sheet.visual_diagram.caption}
          </figcaption>
        </figure>
      ) : (
        <figure className="min-w-0 overflow-x-auto rounded-lg bg-slate-50 p-3">
          <svg
            role="img"
            aria-label={`${title} concept diagram`}
            viewBox={`${minX} ${minY} ${width} ${height}`}
            className="mx-auto max-h-80 w-full min-w-0 max-w-3xl"
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
      )}
      <section className="cheatsheet-concepts mt-5">
        <h3 className="text-sm font-semibold">
          01 / Understand the essentials
        </h3>
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
        Cover the notes. Explain one idea, give an example and correct a
        mistake.
        <br />
        assignmenthub.co.ke
      </p>
    </article>
  );
}
