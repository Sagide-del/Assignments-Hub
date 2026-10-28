import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Activity, LineChart } from "lucide-react";
import type { RespiratoryConfig } from "../../../../../../backend/src/labs/respiratory-engine";
import {
  gasCarriedPerMinute,
  respiratoryTracePoint,
  respiratoryTraceWindow,
  type RespiratoryTracePoint,
} from "./respiratory-traces";
type Mode = "gases" | "volume" | "airflow";
interface Series {
  key: keyof Omit<RespiratoryTracePoint, "time">;
  label: string;
  colour: string;
  dash?: string;
}
const GAS_SERIES: Series[] = [
  { key: "oxygenIn", label: "O₂ inhaled", colour: "#2563eb" },
  { key: "oxygenOut", label: "O₂ exhaled", colour: "#0891b2", dash: "6 4" },
  { key: "carbonDioxideOut", label: "CO₂ exhaled", colour: "#c47712" },
];
const descriptions: Record<
  Mode,
  { title: string; unit: string; axis: string; description: string }
> = {
  gases: {
    title: "Illustrative oxygen & carbon dioxide movement",
    unit: "mL/s",
    axis: "Gas carried / mL·s⁻¹",
    description:
      "Blue rises as oxygen-containing air enters. Cyan and amber rise as oxygen and carbon dioxide leave in exhaled air.",
  },
  volume: {
    title: "Air added during each breath",
    unit: "mL",
    axis: "Volume above rest / mL",
    description:
      "The rise shows inspiration; the fall shows expiration. The height of each wave is the tidal volume, not total lung capacity.",
  },
  airflow: {
    title: "Direction and speed of airflow",
    unit: "L/s",
    axis: "Airflow / L·s⁻¹",
    description:
      "Positive values show air entering the lungs. Negative values show air leaving; zero is the change in direction.",
  },
};
export default function RespiratoryGraphs({
  config,
  time,
  running,
}: {
  config: RespiratoryConfig;
  time: number;
  running: boolean;
}) {
  const [mode, setMode] = useState<Mode>("gases"),
    [windowSeconds, setWindow] = useState(20),
    [inspection, setInspection] = useState<number | null>(null);
  const plotHost = useRef<HTMLDivElement>(null),
    [plotWidth, setPlotWidth] = useState(760);
  useEffect(() => {
    const host = plotHost.current;
    if (!host) return;
    const observer = new ResizeObserver(() =>
      setPlotWidth(Math.max(240, Math.round(host.clientWidth))),
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  const id = useId().replace(/:/g, ""),
    trace = useMemo(
      () => respiratoryTraceWindow(time, config, windowSeconds),
      [time, config.rate, config.tidalVolume, windowSeconds],
    );
  const series =
    mode === "gases"
      ? GAS_SERIES
      : mode === "volume"
        ? [
            {
              key: "volume",
              label: "Air above resting level",
              colour: "#be185d",
            } as Series,
          ]
        : [{ key: "airflow", label: "Airflow", colour: "#0f766e" } as Series];
  const info = descriptions[mode],
    cycle = 60 / config.rate,
    peakFlow = (config.tidalVolume * Math.PI) / (2 * cycle * 0.4),
    max =
      mode === "volume"
        ? config.tidalVolume * 1000 * 1.12
        : mode === "airflow"
          ? peakFlow * 1.15
          : peakFlow * 0.2095 * 1000 * 1.15,
    min = mode === "airflow" ? -max : 0;
  const width = plotWidth,
    height = 280,
    left = 65,
    right = 22,
    top = 22,
    bottom = 51,
    pw = width - left - right,
    ph = height - top - bottom;
  const x = (t: number) =>
      left + ((t - trace.start) / (trace.end - trace.start)) * pw,
    y = (v: number) => top + ((max - v) / (max - min)) * ph;
  const isInspecting =
      inspection !== null &&
      inspection >= trace.start &&
      inspection <= trace.now,
    activeTime = isInspecting ? inspection! : trace.now,
    active = respiratoryTracePoint(activeTime, config),
    totals = gasCarriedPerMinute(config);
  const path = (s: Series) =>
    trace.points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(p.time).toFixed(2)},${y(p[s.key]).toFixed(2)}`,
      )
      .join(" ");
  function inspectPointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect(),
      local = ((e.clientX - rect.left) / rect.width) * width;
    setInspection(
      Math.max(
        trace.start,
        Math.min(
          trace.now,
          trace.start + ((local - left) / pw) * (trace.end - trace.start),
        ),
      ),
    );
  }
  function keyInspect(e: React.KeyboardEvent<HTMLDivElement>) {
    let t = activeTime;
    if (e.key === "ArrowLeft") t -= windowSeconds / 100;
    else if (e.key === "ArrowRight") t += windowSeconds / 100;
    else if (e.key === "Home") t = trace.start;
    else if (e.key === "End" || e.key === "Escape") {
      e.preventDefault();
      setInspection(null);
      return;
    } else return;
    e.preventDefault();
    setInspection(Math.max(trace.start, Math.min(trace.now, t)));
  }
  const numericRows = trace.points
    .filter(
      (_, i) => i % Math.max(1, Math.floor(trace.points.length / 8)) === 0,
    )
    .slice(-9);
  return (
    <section
      aria-label="Live respiratory graphs"
      className="min-w-0 space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
            <LineChart className="h-3.5 w-3.5" />
            Live graphs
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">
            See what changes with each breath
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${running ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-500" : "bg-slate-400"}`}
          />
          {running ? "Following breathing" : "Paused with breathing"}
        </span>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Respiratory graph type"
          className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
        >
          {(
            [
              ["gases", "O₂ & CO₂"],
              ["volume", "Breath volume"],
              ["airflow", "Airflow"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setMode(key);
                setInspection(null);
              }}
              aria-pressed={mode === key}
              className={`min-h-10 rounded-md px-3 text-xs font-semibold ${mode === key ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <label className="flex items-center gap-2 text-[11px] text-slate-500">
          Window
          <select
            aria-label="Graph time window"
            value={windowSeconds}
            onChange={(e) => {
              setWindow(Number(e.target.value));
              setInspection(null);
            }}
            className="min-h-10 rounded-lg border bg-white px-2 text-xs"
          >
            <option value={10}>10 seconds</option>
            <option value={20}>20 seconds</option>
            <option value={30}>30 seconds</option>
          </select>
        </label>
      </div>
      <figure>
        <figcaption className="text-sm font-semibold text-slate-800">
          {info.title}
        </figcaption>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          {info.description}
        </p>
        <div
          ref={plotHost}
          tabIndex={0}
          role="group"
          aria-label="Interactive breathing graph. Use left and right arrows to inspect samples; End returns to live."
          onKeyDown={keyInspect}
          className="mt-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <svg
            role="img"
            aria-label={info.title}
            viewBox={`0 0 ${width} ${height}`}
            onPointerMove={inspectPointer}
            onPointerDown={inspectPointer}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setInspection(null);
            }}
            className="block w-full touch-pan-y"
          >
            <defs>
              <clipPath id={`trace-${id}`}>
                <rect x={left} y={top} width={pw} height={ph} />
              </clipPath>
            </defs>
            <g clipPath={`url(#trace-${id})`}>
              {trace.inspirations.map((band, i) => (
                <rect
                  key={i}
                  x={x(band.start)}
                  y={top}
                  width={Math.max(0, x(band.end) - x(band.start))}
                  height={ph}
                  fill="#f0f5fb"
                />
              ))}
            </g>
            {[0, 1, 2, 3, 4].map((i) => {
              const v = min + ((max - min) * i) / 4,
                tx = trace.start + ((trace.end - trace.start) * i) / 4;
              return (
                <g key={i}>
                  <path
                    d={`M${left} ${y(v)}H${width - right}`}
                    stroke="#e2e8f0"
                    strokeDasharray={Math.abs(v) < 1e-10 ? undefined : "3 4"}
                  />
                  <text
                    x={left - 10}
                    y={y(v) + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {mode === "airflow" ? v.toFixed(2) : Math.round(v)}
                  </text>
                  <text
                    x={x(tx)}
                    y={height - 31}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
                  >
                    {tx.toFixed(0)}
                  </text>
                </g>
              );
            })}
            <path
              d={`M${left} ${top}V${top + ph}H${width - right}`}
              fill="none"
              stroke="#94a3b8"
            />
            <g clipPath={`url(#trace-${id})`}>
              {series.map((s) => (
                <path
                  key={s.key}
                  data-series={s.key}
                  d={path(s)}
                  fill="none"
                  stroke={s.colour}
                  strokeWidth="2.5"
                  strokeDasharray={s.dash}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              <path
                data-testid="respiratory-graph-cursor"
                data-time={trace.now.toFixed(3)}
                d={`M${x(activeTime)} ${top}V${top + ph}`}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              {series.map((s) => (
                <circle
                  key={s.key}
                  cx={x(activeTime)}
                  cy={y(active[s.key])}
                  r="4"
                  fill={s.colour}
                  stroke="white"
                  strokeWidth="1.5"
                />
              ))}
            </g>
            <text
              x="16"
              y={top + ph / 2}
              transform={`rotate(-90 16 ${top + ph / 2})`}
              textAnchor="middle"
              fontSize="11"
              fill="#475569"
            >
              {info.axis}
            </text>
            <text
              x={left + pw / 2}
              y={height - 7}
              textAnchor="middle"
              fontSize="11"
              fill="#475569"
            >
              Simulated time / seconds
            </text>
          </svg>
        </div>
        <div
          className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600"
          aria-label="Graph legend"
        >
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-2">
              <svg width="22" height="8" aria-hidden="true">
                <path
                  d="M0 4H22"
                  stroke={s.colour}
                  strokeWidth="2.5"
                  strokeDasharray={s.dash}
                />
              </svg>
              {s.label}
            </span>
          ))}
        </div>
        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px]"
          aria-label="Selected graph sample"
          aria-live={isInspecting ? "polite" : "off"}
          aria-atomic="true"
        >
          <span className="font-medium text-slate-600">
            {isInspecting ? "Sample" : "Live"} · {active.time.toFixed(2)} s
          </span>
          {series.map((s) => (
            <span key={s.key} style={{ color: s.colour }}>
              {s.label}:{" "}
              <strong className="font-mono tabular-nums">
                {active[s.key].toFixed(mode === "airflow" ? 3 : 1)}
              </strong>{" "}
              {info.unit}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">
          Shaded intervals show inspiration. Hover, tap or use ← / → to inspect
          a sample. End or Esc returns to live.
        </p>
      </figure>
      {mode === "gases" && (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              {
                label: "O₂ carried in",
                value: totals.oxygenIn,
                colour: "text-blue-700",
              },
              {
                label: "O₂ carried out",
                value: totals.oxygenOut,
                colour: "text-cyan-700",
              },
              {
                label: "CO₂ carried out",
                value: totals.carbonDioxideOut,
                colour: "text-amber-700",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-slate-200 px-3 py-3"
              >
                <p className={`text-[10px] font-medium ${m.colour}`}>
                  {m.label}
                </p>
                <p className="mt-2 text-base font-semibold tabular-nums">
                  {Math.round(m.value).toLocaleString()}{" "}
                  <span className="text-[10px] font-normal text-slate-500">
                    mL/min
                  </span>
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-6 text-slate-500">
            Example gas fractions are held constant. These values describe gas
            carried at the mouth.
          </p>
          <details className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <summary className="cursor-pointer text-xs font-medium text-blue-900">
              How these gas estimates work
            </summary>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              This illustration holds example mouth-gas fractions constant:
              inhaled O₂ 20.95%, exhaled O₂ 16%, and exhaled CO₂ 4%. It assumes
              equal total inspired and expired volumes.
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              These curves show gas carried at the mouth, not oxygen taken up by
              the blood or metabolic CO₂ production. Actual gas exchange also
              depends on metabolism, blood flow and gas composition. The example
              fractions do not adjust to those factors.
            </p>
          </details>
        </>
      )}
      <details className="border-t pt-3">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-500">
          View numeric samples
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-[11px]">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="p-2 font-medium">Time / s</th>
                {series.map((s) => (
                  <th key={s.key} className="p-2 font-medium">
                    {s.label} / {info.unit}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numericRows.map((p, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2 font-mono">{p.time.toFixed(2)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="p-2 font-mono">
                      {p[s.key].toFixed(mode === "airflow" ? 3 : 1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="flex items-start gap-2 text-[11px] leading-6 text-slate-500">
        <Activity className="mt-1 h-3.5 w-3.5 shrink-0" />
        Use the breathing controls beside this graph to change rate or depth.
        Playback and pause are shared with the 3D lungs; a new breathing
        condition starts a new trace.
      </p>
    </section>
  );
}
