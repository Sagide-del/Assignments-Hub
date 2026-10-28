import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Wind,
} from "lucide-react";
import type { Lab } from "../../../../types";
import {
  breathingSample,
  replayRespiratory,
  respiratoryReady,
  ventilation,
  type RespiratoryConfig,
  type RespiratoryStructure,
} from "../../../../../../backend/src/labs/respiratory-engine";
import { StudioBrief, StudioReport, useStudio } from "./useStudio";
import { RESPIRATORY_GUIDE } from "./respiratory-guide";
import type { RespiratoryMotion, RespiratoryView } from "./RespiratoryScene";
const Scene = lazy(() => import("./RespiratoryScene"));
const patterns = [
  { name: "Quiet breathing", rate: 12, tidalVolume: 0.5 },
  { name: "Rapid, shallow", rate: 24, tidalVolume: 0.25 },
  { name: "Slower, deeper", rate: 8, tidalVolume: 0.75 },
];
export default function RespiratoryStudio({
  lab,
  userId,
}: {
  lab: Lab;
  userId: number;
}) {
  const studio = useStudio({
      lab,
      userId,
      version: "respiratory-studio-v1",
      replay: replayRespiratory,
    }),
    { state, draft, dispatch } = studio;
  const [tab, setTab] = useState<"anatomy" | "notebook">("anatomy"),
    [view, setView] = useState<RespiratoryView>("surface"),
    [selected, setSelected] = useState<RespiratoryStructure>("right-lung"),
    [cameraView, setCameraView] = useState<"front" | "back" | "side">("front"),
    [labels, setLabels] = useState(true),
    [running, setRunning] = useState(true),
    [speed, setSpeed] = useState(1),
    [ready, setReady] = useState(false),
    [notes, setNotes] = useState(""),
    [display, setDisplay] = useState({ time: 0, cycles: 0 });
  const [resetKey, setResetKey] = useState(0);
  const motion = useRef<RespiratoryMotion>({ time: 0, running: true }),
    lastPaint = useRef(0),
    config = useRef(state.config);
  config.current = state.config;
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      last = performance.now();
    motion.current.running = true;
    const tick = (now: number) => {
      motion.current.time += Math.min((now - last) / 1000, 0.1) * speed;
      last = now;
      if (now - lastPaint.current > 100) {
        lastPaint.current = now;
        setDisplay({
          time: motion.current.time,
          cycles: Math.floor(motion.current.time / (60 / config.current.rate)),
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      motion.current.running = false;
    };
  }, [running, speed]);
  useEffect(() => {
    if (tab === "notebook") setRunning(false);
  }, [tab]);
  useEffect(() => {
    motion.current.time = 0;
    setDisplay({ time: 0, cycles: 0 });
  }, [state.config.rate, state.config.tidalVolume]);
  function configure(c: RespiratoryConfig) {
    if (dispatch({ type: "configure", config: c })) {
      motion.current.time = 0;
      setDisplay({ time: 0, cycles: 0 });
      setRunning(true);
    }
  }
  function inspect(id: RespiratoryStructure) {
    setSelected(id);
    dispatch({ type: "inspect", structure: id });
    if (id === "alveoli") setView("alveoli");
    else if (id === "bronchi" || id === "trachea") setView("airways");
    else if (view === "alveoli") setView("surface");
  }
  const sample = breathingSample(display.time, state.config),
    rates = ventilation(state.config),
    guide = RESPIRATORY_GUIDE[selected];
  const canRecord =
    ready &&
    !state.recorded &&
    display.cycles >= 2 &&
    notes.trim().length >= 12;
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-6 text-slate-800">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            to="/student/stem-labs"
            className="inline-flex items-center gap-2 text-xs text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            STEM Labs
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Respiratory System Simulator
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {lab.grade} · {lab.subject} · Human respiratory anatomy
          </p>
        </div>
        <span
          className={`text-[11px] ${studio.storageError ? "text-red-700" : "text-slate-500"}`}
        >
          {studio.storageError
            ? "Browser storage unavailable — export your work"
            : "Draft saved in this browser"}
        </span>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Respiratory lab views"
          className="flex rounded-lg bg-slate-100 p-1"
        >
          {(["anatomy", "notebook"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`min-h-10 rounded-md px-4 text-xs font-semibold ${tab === t ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {t === "anatomy"
                ? "Anatomy & breathing"
                : `Notebook (${state.observations.length})`}
            </button>
          ))}
        </nav>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Layers className="h-3.5 w-3.5" />
          Anatomical atlas geometry
        </span>
      </div>
      {studio.message && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {studio.message}
        </p>
      )}
      {tab === "anatomy" && (
        <>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section
              className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
              aria-label="Respiratory anatomy viewer"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div
                  className="flex flex-wrap gap-1"
                  aria-label="Anatomy display modes"
                >
                  {(
                    [
                      { id: "surface", title: "Lung surface" },
                      { id: "airways", title: "Reveal airways" },
                      { id: "lobes", title: "Lung lobes" },
                      { id: "alveoli", title: "Alveoli close-up" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setView(t.id);
                        if (t.id === "alveoli") inspect("alveoli");
                      }}
                      aria-pressed={view === t.id}
                      className={`min-h-9 rounded-md px-3 text-[11px] font-semibold ${view === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
                <label className="flex min-h-9 items-center gap-2 text-[11px] text-slate-500">
                  <input
                    aria-label="Show anatomical labels"
                    type="checkbox"
                    checked={labels}
                    onChange={(e) => setLabels(e.target.checked)}
                    className="accent-blue-700"
                  />
                  Labels
                </label>
              </div>
              <div className="relative h-[520px] sm:h-[620px]">
                <Suspense
                  fallback={
                    <p className="p-6 text-sm">
                      Preparing the anatomical viewer…
                    </p>
                  }
                >
                  <Scene
                    config={state.config}
                    motion={motion}
                    view={view}
                    selected={selected}
                    cameraView={cameraView}
                    resetKey={resetKey}
                    labels={labels}
                    onSelect={inspect}
                    onLoaded={() => {
                      setReady(true);
                      motion.current.time = 0;
                      setDisplay({ time: 0, cycles: 0 });
                    }}
                  />
                </Suspense>
                <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/80 bg-white/90 px-4 py-3 text-xs backdrop-blur-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span
                      className={`h-2 w-2 rounded-full ${running ? "bg-emerald-500" : "bg-slate-400"}`}
                    />
                    {running
                      ? sample.inhale
                        ? "Inspiration · air entering"
                        : "Expiration · air leaving"
                      : "Breathing paused"}
                  </span>
                  <span className="font-mono text-slate-500">
                    {display.cycles} complete breaths
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                <p className="max-w-md text-[11px] leading-6 text-slate-500">
                  {view === "alveoli"
                    ? "Enlarged gas-exchange schematic · not to scale. O₂ enters blood; CO₂ enters the airspace."
                    : "Drag to rotate · scroll/pinch to zoom · select a lung or airway to inspect it."}
                </p>
                <div
                  className="flex flex-wrap gap-1"
                  aria-label="Anatomy camera views"
                >
                  {(["front", "back", "side"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setCameraView(v);
                        setResetKey((n) => n + 1);
                      }}
                      aria-pressed={cameraView === v}
                      className={`min-h-9 rounded-lg border px-3 text-xs capitalize ${cameraView === v ? "border-slate-400 bg-slate-50" : "text-slate-500"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <aside className="space-y-4">
              <section className="rounded-xl border bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                  Explore the anatomy
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    Object.keys(RESPIRATORY_GUIDE) as RespiratoryStructure[]
                  ).map((id) => (
                    <button
                      key={id}
                      onClick={() => inspect(id)}
                      aria-pressed={selected === id}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 text-left text-xs ${selected === id ? "border-rose-300 bg-rose-50 text-rose-900" : "border-slate-200 text-slate-600"}`}
                    >
                      {RESPIRATORY_GUIDE[id].name}
                      {state.inspected.includes(id) ? (
                        <Check className="h-3 w-3 shrink-0 text-emerald-600" />
                      ) : (
                        <Eye className="h-3 w-3 shrink-0 opacity-40" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-4 border-t pt-4">
                  <h2 className="text-base font-semibold">{guide.name}</h2>
                  <p className="mt-1 text-[11px] font-medium text-rose-700">
                    {guide.short}
                  </p>
                  <p className="mt-3 text-xs leading-7 text-slate-600">
                    {guide.description}
                  </p>
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] leading-6 text-slate-500">
                    {guide.observe}
                  </p>
                </div>
              </section>
              <section className="rounded-xl border bg-white p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Wind className="h-4 w-4 text-slate-400" />
                  Control a breath
                </h2>
                <div className="mt-4 space-y-5">
                  <label className="block">
                    <span className="flex items-center justify-between text-xs">
                      <span>Breathing rate</span>
                      <output className="font-semibold tabular-nums">
                        {state.config.rate} /min
                      </output>
                    </span>
                    <input
                      aria-label="Breathing rate"
                      type="range"
                      min={6}
                      max={30}
                      step={1}
                      value={state.config.rate}
                      onChange={(e) =>
                        configure({
                          ...state.config,
                          rate: Number(e.target.value),
                        })
                      }
                      className="mt-3 w-full accent-rose-700"
                    />
                  </label>
                  <label className="block">
                    <span className="flex items-center justify-between text-xs">
                      <span>Tidal volume</span>
                      <output className="font-semibold tabular-nums">
                        {state.config.tidalVolume.toFixed(2)} L
                      </output>
                    </span>
                    <input
                      aria-label="Tidal volume"
                      type="range"
                      min={0.2}
                      max={1.2}
                      step={0.05}
                      value={state.config.tidalVolume}
                      onChange={(e) =>
                        configure({
                          ...state.config,
                          tidalVolume: Number(e.target.value),
                        })
                      }
                      className="mt-3 w-full accent-rose-700"
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {patterns.map((p) => (
                    <button
                      key={p.name}
                      onClick={() =>
                        configure({ rate: p.rate, tidalVolume: p.tidalVolume })
                      }
                      className="min-h-9 rounded-lg border px-3 text-[11px] text-slate-600"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setRunning((v) => !v)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white"
                  >
                    {running ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {running ? "Pause breathing" : "Play breathing"}
                  </button>
                  <select
                    aria-label="Breathing playback speed"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="min-h-10 rounded-lg border bg-white px-3 text-xs"
                  >
                    <option value={1}>1× speed</option>
                    <option value={2}>2× speed</option>
                    <option value={4}>4× speed</option>
                  </select>
                </div>
                <p className="mt-3 text-[10px] leading-5 text-slate-500">
                  Changing a condition resets this observation window. Saved
                  observations remain in your notebook.
                </p>
              </section>
            </aside>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
            <section className="rounded-xl border bg-white p-5">
              <h2 className="text-sm font-semibold">Ventilation readings</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric
                  label="Air moved per minute"
                  value={rates.minuteVentilation.toFixed(2)}
                  unit="L/min"
                />
                <Metric
                  label="Estimated alveolar ventilation"
                  value={rates.alveolarVentilation.toFixed(2)}
                  unit="L/min"
                />
              </div>
              <p className="mt-4 text-xs leading-6 text-slate-500">
                Minute ventilation = breathing rate × tidal volume. Alveolar
                ventilation = rate × (tidal volume − 0.15 L dead space).
              </p>
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] leading-6 text-slate-500">
                Try all three breathing patterns. Each moves 6 L/min overall,
                but rapid shallow breathing sends less fresh air to gas-exchange
                surfaces in this model.
              </p>
            </section>
            <section className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Record an observation</h2>
                <span className="text-[11px] text-slate-500">
                  {Math.min(2, display.cycles)}/2 breaths observed
                </span>
              </div>
              <label className="mt-3 block text-xs text-slate-600">
                What did you notice?
                <textarea
                  aria-label="Respiratory observation"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Describe diaphragm movement, airflow, or the difference between breathing patterns."
                  className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm leading-6 focus:border-rose-400 focus:outline-none"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={!canRecord}
                  onClick={() => {
                    if (
                      dispatch({
                        type: "observe",
                        cycles: Math.min(20, display.cycles),
                        elapsed:
                          (Math.min(20, display.cycles) * 60) /
                          state.config.rate,
                        notes,
                      })
                    ) {
                      setNotes("");
                    }
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-rose-800 px-4 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {state.recorded ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {state.recorded
                    ? "Observation recorded"
                    : "Record observation"}
                </button>
                <button
                  onClick={() => configure(state.config)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  New observation
                </button>
                <button
                  onClick={() => setTab("notebook")}
                  className="min-h-11 px-3 text-xs text-slate-500"
                >
                  Open notebook
                </button>
              </div>
            </section>
          </div>
        </>
      )}
      {tab === "notebook" && (
        <StudioReport
          lab={lab}
          conclusion={draft.conclusion}
          answers={draft.answers}
          onChange={(conclusion) => studio.update({ conclusion })}
          onAnswers={(answers) => studio.update({ answers })}
          ready={respiratoryReady(state, draft.conclusion)}
          saved={studio.saved}
          pending={studio.save.isPending}
          error={studio.save.error}
          restore={studio.restore}
          onSave={() => studio.save.mutate()}
          onExport={studio.exportReport}
        >
          <p className="text-xs leading-6 text-slate-500">
            Inspect both lungs, the trachea, bronchi and diaphragm. Record three
            observations across at least two conditions, then explain your
            evidence.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b bg-slate-50 text-slate-500">
                <tr>
                  {[
                    "Trial",
                    "Rate /min",
                    "Tidal / L",
                    "Minute / L·min⁻¹",
                    "Alveolar / L·min⁻¹",
                    "Observation",
                  ].map((h) => (
                    <th key={h} className="p-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.observations.map((o, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3">{o.rate}</td>
                    <td className="p-3">{o.tidalVolume.toFixed(2)}</td>
                    <td className="p-3 tabular-nums">
                      {o.minuteVentilation.toFixed(2)}
                    </td>
                    <td className="p-3 font-semibold tabular-nums">
                      {o.alveolarVentilation.toFixed(2)}
                    </td>
                    <td className="max-w-80 break-words p-3 leading-6">
                      {o.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!state.observations.length && (
              <p className="p-5 text-xs text-slate-500">
                Play at least two breaths and record what you observe.
              </p>
            )}
          </div>
        </StudioReport>
      )}
      <details className="rounded-xl border bg-white p-5">
        <summary className="cursor-pointer text-xs font-semibold">
          About this anatomical model & credits
        </summary>
        <div className="mt-4 max-w-3xl space-y-3 text-xs leading-7 text-slate-600">
          <p>
            The organ surfaces come from the Z-Anatomy atlas, derived from
            BodyParts3D. They show actual atlas anatomy, including five separate
            lung lobes and the bronchial tree. They are not a scan of a
            particular student or patient.
          </p>
          <p>
            Lung expansion, diaphragm motion and the enlarged alveolar view are
            teaching illustrations. The fixed 0.15 L dead-space estimate and 2.5
            L resting-volume reference represent a simplified adult model, not
            an individual lung-function assessment. Ventilation is not the same
            as oxygen uptake.
          </p>
          <p>
            BodyParts3D — The Database Center for Life Science / Kousaku Okubo;
            Z-Anatomy — Gauthier Kervyn and Marcin Zielinski. Atlas adaptation
            distributed under Creative Commons Attribution–ShareAlike 4.0.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/Z-Anatomy/Models-of-human-anatomy"
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 underline"
            >
              Atlas source
            </a>
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 underline"
            >
              CC BY-SA 4.0
            </a>
            <a
              href="/stem/anatomy/ATTRIBUTION.txt"
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 underline"
            >
              Model attribution & modifications
            </a>
          </div>
        </div>
      </details>
      <StudioBrief lab={lab} />
    </div>
  );
}
function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-[10px] leading-5 text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-[10px] font-normal text-slate-500">
          {unit}
        </span>
      </p>
    </div>
  );
}
