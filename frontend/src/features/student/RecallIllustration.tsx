import { useId } from "react";
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
}: {
  visual: RecallVisual;
  reveal?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
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
      <text x={x} y={y} fontSize="18" fontWeight="600" fill="#1e293b">
        {label(name, i)}
      </text>
    </g>
  );
  const common = {
    viewBox: "0 0 1000 510",
    role: "img",
    "aria-label": `${visual.title}${reveal ? " — labelled illustration" : " — identify the numbered parts"}`,
    className: "recall-diagram block h-auto w-full",
  };
  let drawing;
  if (visual.kind === "diagram") {
    if (visual.template === "heart")
      drawing = (
        <>
          <image
            href="/recall-illustrations/heart-cutaway.png"
            x="180"
            y="20"
            width="640"
            height="440"
            preserveAspectRatio="xMidYMid meet"
          />
          {callout("Vena cava", 0, 20, 90, 400, 113, "left")}
          {callout("Right atrium", 1, 20, 240, 395, 218, "left")}
          {callout("Right ventricle", 2, 20, 390, 440, 330, "left")}
          {callout("Aorta", 3, 805, 90, 515, 95, "right")}
          {callout("Left atrium", 4, 805, 240, 598, 205, "right")}
          {callout("Left ventricle", 5, 805, 390, 575, 350, "right")}
          <text
            x="500"
            y="490"
            textAnchor="middle"
            fill="#64748b"
            fontSize="16"
          >
            Cutaway view · anatomical right appears on the left
          </text>
        </>
      );
    else if (visual.template === "lungs")
      drawing = (
        <>
          <defs>
            <linearGradient id={`${uid}lung`} x2="1" y2="1">
              <stop stopColor="#fecdd3" />
              <stop offset="1" stopColor="#fb7185" />
            </linearGradient>
          </defs>
          <path
            d="M484 58H516V205H484Z"
            fill="#cbd5e1"
            stroke="#64748b"
            strokeWidth="3"
          />
          {[75, 96, 117, 138, 159].map((y) => (
            <path key={y} d={`M483 ${y}h34`} stroke="#94a3b8" strokeWidth="6" />
          ))}
          <path
            d="M465 175C425 110 333 146 296 231C251 333 283 413 386 420C447 425 477 385 470 309Z"
            fill={`url(#${uid}lung)`}
            stroke="#be123c"
            strokeWidth="3"
          />
          <path
            d="M535 175C575 110 667 146 704 231C749 333 717 413 614 420C553 425 522 375 534 306L563 280L535 255Z"
            fill={`url(#${uid}lung)`}
            stroke="#be123c"
            strokeWidth="3"
          />
          <path
            d="M500 181L420 258M500 181L580 258M420 258L354 278M420 258L386 350M580 258L647 278M580 258L614 350"
            fill="none"
            stroke="#f8fafc"
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M500 181L420 258M500 181L580 258M420 258L354 278M420 258L386 350M580 258L647 278M580 258L614 350"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
          />
          <path
            d="M310 432Q500 478 690 432"
            fill="none"
            stroke="#7c3aed"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <circle
            cx="755"
            cy="350"
            r="60"
            fill="#fff1f2"
            stroke="#fda4af"
            strokeWidth="2"
          />
          {[
            [735, 330],
            [760, 324],
            [778, 345],
            [759, 369],
            [730, 361],
            [751, 348],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="14"
              fill="#fecdd3"
              stroke="#be123c"
              strokeWidth="2"
            />
          ))}
          {callout("Trachea", 0, 30, 80, 500, 110, "left")}
          {callout("Bronchi", 1, 30, 260, 420, 255, "left")}
          {callout("Diaphragm", 2, 30, 445, 455, 454, "left")}
          {callout("Lung", 3, 830, 175, 650, 205, "right")}
          <path
            d="M647 278L657 302L668 316M657 302L644 322M657 302L674 292"
            fill="none"
            stroke="#64748b"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M671 323L701 337"
            fill="none"
            stroke="#be123c"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          {callout("Bronchioles", 4, 830, 270, 657, 302, "right")}
          {callout("Alveoli (enlarged)", 5, 815, 430, 758, 370, "right")}
        </>
      );
    else if (visual.template === "plant-cell")
      drawing = (
        <>
          <rect
            x="270"
            y="65"
            width="460"
            height="370"
            rx="70"
            fill="#bbf7d0"
            stroke="#15803d"
            strokeWidth="12"
          />
          <rect
            x="286"
            y="81"
            width="428"
            height="338"
            rx="59"
            fill="#fef9c3"
            stroke="#65a30d"
            strokeWidth="3"
          />
          <path
            d="M436 145Q610 100 660 188L654 332Q573 398 430 335Q413 250 436 145Z"
            fill="#bae6fd"
            stroke="#0284c7"
            strokeWidth="3"
          />
          <ellipse
            cx="360"
            cy="265"
            rx="46"
            ry="53"
            fill="#c4b5fd"
            stroke="#7c3aed"
            strokeWidth="3"
          />
          <circle cx="360" cy="265" r="16" fill="#7c3aed" />
          {[
            [352, 140],
            [350, 370],
            [651, 119],
            [673, 370],
            [690, 250],
          ].map(([cx, cy], i) => (
            <g key={i} transform={`rotate(${i * 22} ${cx} ${cy})`}>
              <ellipse
                cx={cx}
                cy={cy}
                rx="29"
                ry="14"
                fill="#4ade80"
                stroke="#15803d"
                strokeWidth="2"
              />
              <path
                d={`M${cx - 18} ${cy}h36M${cx - 14} ${cy - 5}h28M${cx - 14} ${cy + 5}h28`}
                stroke="#15803d"
                strokeWidth="2"
              />
            </g>
          ))}
          {callout("Cell wall", 0, 35, 90, 280, 130, "left")}
          {callout("Nucleus", 1, 35, 260, 360, 265, "left")}
          {callout("Cytoplasm", 2, 35, 420, 405, 380, "left")}
          {callout("Cell membrane", 3, 810, 95, 712, 160, "right")}
          {callout("Vacuole", 4, 810, 260, 570, 250, "right")}
          {callout("Chloroplast", 5, 810, 420, 673, 370, "right")}
        </>
      );
    else
      drawing = (
        <>
          <path
            d="M320 245V130H470M530 130H700V360H320V280"
            fill="none"
            stroke="#334155"
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <path d="M287 245H353M300 280H340" stroke="#0f172a" strokeWidth="7" />
          <text x="270" y="235" fill="#be123c" fontSize="28">
            +
          </text>
          <text x="270" y="302" fill="#2563eb" fontSize="28">
            −
          </text>
          <path d="M470 130L530 130" stroke="#be123c" strokeWidth="7" />
          <circle
            cx="470"
            cy="130"
            r="8"
            fill="#fff"
            stroke="#334155"
            strokeWidth="4"
          />
          <circle
            cx="530"
            cy="130"
            r="8"
            fill="#fff"
            stroke="#334155"
            strokeWidth="4"
          />
          <circle
            cx="700"
            cy="245"
            r="48"
            fill="#fef08a"
            stroke="#334155"
            strokeWidth="5"
          />
          <path
            d="M670 215L730 275M670 275L730 215"
            stroke="#334155"
            strokeWidth="4"
          />
          {callout("Cell / battery", 0, 25, 245, 319, 260, "left")}
          {callout("Connecting wire", 1, 25, 400, 420, 360, "left")}
          {callout("Closed switch", 2, 810, 120, 500, 130, "right")}
          {callout("Lamp", 3, 810, 310, 700, 245, "right")}
          <text
            x="500"
            y="475"
            textAnchor="middle"
            fill="#64748b"
            fontSize="18"
          >
            The closed switch completes a conducting path.
          </text>
        </>
      );
    return (
      <figure className="min-w-0">
        <svg {...common}>{drawing}</svg>
        <figcaption className="mt-2 text-center text-xs leading-5 text-slate-500">
          {visual.title}
        </figcaption>
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
            {{
              heart: [
                "Vena cava",
                "Right atrium",
                "Right ventricle",
                "Aorta",
                "Left atrium",
                "Left ventricle",
              ],
              lungs: [
                "Trachea",
                "Bronchi",
                "Diaphragm",
                "Lung",
                "Bronchioles",
                "Alveoli",
              ],
              "plant-cell": [
                "Cell wall",
                "Nucleus",
                "Cytoplasm",
                "Cell membrane",
                "Vacuole",
                "Chloroplast",
              ],
              circuit: [
                "Cell / battery",
                "Connecting wire",
                "Closed switch",
                "Lamp",
              ],
            }[visual.template ?? "heart"].map((name, i) => (
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
        </svg>
        <figcaption className="text-center text-xs text-slate-500">
          {visual.title}
        </figcaption>
      </figure>
    );
  }
  const items = visual.labels ?? [],
    count = items.length;
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
      <figcaption className="text-center text-xs leading-5 text-slate-500">
        {visual.title}
      </figcaption>
    </figure>
  );
}
