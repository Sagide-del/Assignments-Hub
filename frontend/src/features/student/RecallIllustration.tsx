import { RECALL_DIAGRAMS } from "./recall-diagrams";
import type { RecallVisual } from "../../api/content-library.api";
function words(value: string, width = 20) {
  const lines: string[] = [];
  for (const word of value.split(/\s+/)) {
    if (!lines.length || lines[lines.length - 1].length + word.length > width)
      lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines.slice(0, 3);
}
export function RecallIllustration({
  visual,
  reveal = true,
  visualOnly = false,
}: {
  visual: RecallVisual;
  reveal?: boolean;
  visualOnly?: boolean;
}) {
  const artwork =
    visual.kind === "diagram"
      ? RECALL_DIAGRAMS[visual.template ?? "heart"]
      : undefined;
  const label = (name: string, i: number) => (reveal ? name : `${i + 1}`);
  const callout = (
    name: string,
    i: number,
    x: number,
    y: number,
    ax: number,
    ay: number,
    side: "left" | "right",
  ) => (
    <g key={name}>
      <path
        d={`M${side === "left" ? x + 170 : x - 12} ${y - 6} H${side === "left" ? ax - 35 : ax + 35} L${ax} ${ay}`}
        fill="none"
        stroke="#64748b"
        strokeWidth="1.6"
      />
      <circle cx={ax} cy={ay} r="4" fill="#101820" />
      <text x={x} y={y} fontSize="20" fontWeight="600" fill="#1e293b">
        {label(name, i)}
      </text>
    </g>
  );
  const common = {
    viewBox: artwork?.viewBox ?? "0 0 1000 510",
    role: "img",
    "aria-label": `${visual.title}${reveal ? " — labelled illustration" : " — identify the numbered parts"}`,
    className: "recall-diagram block h-auto w-full",
  };
  if (visual.kind === "diagram" && artwork) {
    const drawing = (
      <>
        <image
          href={artwork.src}
          {...artwork.image}
          preserveAspectRatio="xMidYMid meet"
        />
        {artwork.labels.map((part, i) =>
          callout(part.name, i, part.x, part.y, part.ax, part.ay, part.side),
        )}
        {!visualOnly && (
          <text
            x="500"
            y={
              visual.template === "heart" || visual.template === "lungs"
                ? 635
                : 540
            }
            textAnchor="middle"
            fill="#64748b"
            fontSize="17"
          >
            {artwork.caption}
          </text>
        )}
      </>
    );
    return (
      <figure className="min-w-0">
        <svg {...common}>{drawing}</svg>
        {!visualOnly && (
          <figcaption className="mt-2 text-center text-xs leading-5 text-slate-500">
            {visual.title}
          </figcaption>
        )}
        {visual.template === "heart" && reveal && (
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              Oxygenated blood
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Deoxygenated blood
            </span>
          </div>
        )}
        {reveal && (
          <ol className="revision-diagram-legend">
            {artwork.labels
              .map((part) => part.name)
              .map((name, i) => (
                <li key={name}>
                  <strong>{i + 1}.</strong> {name}
                </li>
              ))}
          </ol>
        )}
      </figure>
    );
  }
  if (visual.kind === "fraction") {
    const n = visual.numerator ?? 0,
      d = visual.denominator ?? 2;
    return (
      <figure>
        <svg {...common}>
          <text
            x="500"
            y="125"
            textAnchor="middle"
            fill="#0f172a"
            fontSize="58"
            fontWeight="700"
          >
            {reveal ? `${n} / ${d}` : "What fraction is shaded?"}
          </text>
          {Array.from({ length: d }, (_, i) => (
            <rect
              key={i}
              x={110 + (i * 780) / d}
              y="200"
              width={780 / d - 6}
              height="145"
              rx="8"
              fill={i < n ? "#B5E61D" : "#f5f9e8"}
              stroke="#607D00"
              strokeWidth="2"
            />
          ))}
          {!visualOnly && (
            <text
              x="500"
              y="420"
              textAnchor="middle"
              fill="#64748b"
              fontSize="25"
            >
              {reveal
                ? `${n} shaded parts out of ${d} equal parts`
                : "Count the shaded parts and all equal parts."}
            </text>
          )}
        </svg>
        {!visualOnly && (
          <figcaption className="text-center text-xs text-slate-500">
            {visual.title}
          </figcaption>
        )}
      </figure>
    );
  }
  const items = visual.labels ?? [],
    count = items.length;
  if (visualOnly && (visual.kind === "process" || visual.kind === "timeline"))
    return (
      <figure>
        <svg {...common} viewBox="0 0 1000 360">
          <rect x="25" y="55" width="950" height="280" rx="30" fill="#f8faf4" />
          {items.map((part, i) => {
            const x = 120 + (i * 760) / Math.max(1, count - 1),
              next = 120 + ((i + 1) * 760) / Math.max(1, count - 1);
            return (
              <g key={i}>
                {i < count - 1 && (
                  <>
                    <path
                      d={`M${x + 52} 150H${next - 58}`}
                      stroke="#a5c650"
                      strokeWidth="4"
                    />
                    <path
                      d={`M${next - 68} 140L${next - 54} 150L${next - 68} 160`}
                      fill="none"
                      stroke="#607d00"
                      strokeWidth="4"
                    />
                  </>
                )}
                <circle
                  cx={x}
                  cy="150"
                  r="48"
                  fill={i % 2 ? "#101820" : "#B5E61D"}
                />
                <text
                  x={x}
                  y="162"
                  textAnchor="middle"
                  fill={i % 2 ? "#fff" : "#101820"}
                  fontSize="32"
                  fontWeight="700"
                >
                  {i + 1}
                </text>
                <text
                  x={x}
                  y="240"
                  textAnchor="middle"
                  fill="#334155"
                  fontSize="20"
                  fontWeight="600"
                >
                  {words(reveal ? part.label : "?", 18).map((line, j) => (
                    <tspan key={j} x={x} dy={j ? 25 : 0}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </figure>
    );
  if (visualOnly && visual.kind === "comparison")
    return (
      <figure>
        <svg {...common} viewBox="0 0 1000 360">
          {items.map((part, i) => {
            const w = 850 / Math.max(1, count),
              x = 75 + i * w;
            return (
              <g key={i}>
                <rect
                  x={x + 8}
                  y="35"
                  width={w - 16}
                  height="285"
                  rx="24"
                  fill={i % 2 ? "#f8fafc" : "#f5f9e8"}
                  stroke={i % 2 ? "#cbd5e1" : "#d9e9a5"}
                  strokeWidth="2"
                />
                <circle
                  cx={x + w / 2}
                  cy="120"
                  r="45"
                  fill={i % 2 ? "#101820" : "#B5E61D"}
                />
                <text
                  x={x + w / 2}
                  y="132"
                  textAnchor="middle"
                  fill={i % 2 ? "#fff" : "#101820"}
                  fontSize="32"
                  fontWeight="700"
                >
                  {String.fromCharCode(65 + i)}
                </text>
                <text
                  x={x + w / 2}
                  y="220"
                  textAnchor="middle"
                  fill="#334155"
                  fontSize="19"
                  fontWeight="600"
                >
                  {words(
                    reveal ? part.label : "?",
                    Math.max(12, 32 / count),
                  ).map((line, j) => (
                    <tspan key={j} x={x + w / 2} dy={j ? 25 : 0}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </figure>
    );
  if (visual.kind === "process" || visual.kind === "timeline")
    return (
      <figure className="space-y-3">
        <figcaption className="mb-4 text-sm font-semibold text-slate-700">
          {visual.title}
        </figcaption>
        {items.map((item, i) => (
          <div key={i} className="relative flex gap-4 pb-3">
            {i < count - 1 && (
              <span className="absolute bottom-0 left-[17px] top-8 w-px bg-[#d9e9a5]" />
            )}
            <span className="recall-brand-step z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
              {i + 1}
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-semibold text-slate-900">
                {reveal
                  ? item.label
                  : `Recall ${visual.kind === "timeline" ? "event" : "step"} ${i + 1}`}
              </p>
              {reveal && (
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {item.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </figure>
    );
  if (visual.kind === "comparison")
    return (
      <figure>
        <figcaption className="mb-4 text-sm font-semibold text-slate-700">
          {visual.title}
        </figcaption>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 ${i % 2 ? "border-slate-200 bg-slate-50" : "recall-brand-comparison"}`}
            >
              <span className="text-xs font-bold text-slate-400">0{i + 1}</span>
              <p className="mt-3 text-sm font-semibold">
                {reveal ? item.label : `Compare idea ${i + 1}`}
              </p>
              {reveal && (
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  {item.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      </figure>
    );
  const nodes = items.map((item, i) => ({
    item,
    x:
      500 +
      285 * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, count)),
    y:
      245 +
      160 * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, count)),
  }));
  return (
    <figure>
      <svg {...common}>
        {nodes.map(({ x, y }, i) => (
          <path
            key={i}
            d={`M500 245L${x} ${y}`}
            stroke="#c4d98e"
            strokeWidth="3"
          />
        ))}
        <circle
          cx="500"
          cy="245"
          r="80"
          fill="#f5f9e8"
          stroke="#a5c650"
          strokeWidth="2"
        />
        {visualOnly ? (
          <g stroke="#607d00" strokeWidth="4" fill="#B5E61D">
            <path d="M475 225L525 225L500 270Z" fill="none" />
            <circle cx="475" cy="225" r="10" />
            <circle cx="525" cy="225" r="10" />
            <circle cx="500" cy="270" r="10" />
          </g>
        ) : (
          <>
            {" "}
            <text
              x="500"
              y="240"
              textAnchor="middle"
              fill="#101820"
              fontSize="21"
              fontWeight="700"
            >
              <tspan x="500">Connect</tspan>
              <tspan x="500" dy="28">
                the ideas
              </tspan>
            </text>
          </>
        )}
        {nodes.map(({ item, x, y }, i) => (
          <g key={i}>
            <rect
              x={x - 110}
              y={y - 38}
              width="220"
              height="76"
              rx="12"
              fill="#fff"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <text
              x={x}
              y={y - 7}
              textAnchor="middle"
              fill="#334155"
              fontSize="17"
              fontWeight="600"
            >
              {words(label(item.label, i)).map((line, j) => (
                <tspan key={j} x={x} dy={j ? 21 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}
      </svg>
      {!visualOnly && (
        <figcaption className="text-center text-xs leading-5 text-slate-500">
          {visual.title}
        </figcaption>
      )}
    </figure>
  );
}
