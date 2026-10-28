import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Hand,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  Timer,
  Weight,
} from "lucide-react";
import type { Lab } from "../../../../types";
import {
  replayPendulum,
  pendulumReady,
  integratePendulum,
  type PendulumConfig,
} from "../../../../../../backend/src/labs/studio-engine";
import { StudioReport, StudioBrief, useStudio } from "./useStudio";
import type { StudioMotion } from "./StudioScene";
const Scene = lazy(() => import("./StudioScene"));
export default function PendulumStudio({
  lab,
  userId,
}: {
  lab: Lab;
  userId: number;
}) {
  const studio = useStudio({
      lab,
      userId,
      version: "pendulum-studio-v1",
      replay: replayPendulum,
    }),
    { state, draft, dispatch } = studio;
  const [tab, setTab] = useState<"apparatus" | "notebook">("apparatus"),
    [status, setStatus] = useState<"ready" | "running" | "paused" | "complete">(
      "ready",
    ),
    [speed, setSpeed] = useState(1),
    [display, setDisplay] = useState({
      time: 0,
      cycles: 0,
      angle: state.config.angle,
    }),
    [manual, setManual] = useState<{ start: number | null; elapsed: number }>({
      start: null,
      elapsed: 0,
    });
  const config = useRef(state.config);
  config.current = state.config;
  const motion = useRef<StudioMotion>({
      theta: (state.config.angle * Math.PI) / 180,
      time: 0,
      running: false,
    }),
    run = useRef({
      theta: (state.config.angle * Math.PI) / 180,
      omega: 0,
      time: 0,
      cycles: 0,
    }),
    lastPaint = useRef(0);
  const configure = (c: PendulumConfig) => {
    if (status === "running" || status === "paused") return;
    dispatch({ type: "configure", config: c });
    motion.current = {
      theta: (c.angle * Math.PI) / 180,
      time: 0,
      running: false,
    };
    run.current = {
      theta: (c.angle * Math.PI) / 180,
      omega: 0,
      time: 0,
      cycles: 0,
    };
    setDisplay({ time: 0, cycles: 0, angle: c.angle });
    setStatus("ready");
    setManual({ start: null, elapsed: 0 });
  };
  const reset = () => {
    setStatus("ready");
    dispatch({ type: "configure", config: state.config });
    motion.current = {
      theta: (state.config.angle * Math.PI) / 180,
      time: 0,
      running: false,
    };
    run.current = {
      theta: (state.config.angle * Math.PI) / 180,
      omega: 0,
      time: 0,
      cycles: 0,
    };
    setDisplay({ time: 0, cycles: 0, angle: state.config.angle });
    setManual({ start: null, elapsed: 0 });
  };
  function release() {
    if (status === "paused") {
      setStatus("running");
      return;
    }
    if (status === "running") {
      setStatus("paused");
      motion.current.running = false;
      return;
    }
    if (!dispatch({ type: "release" })) return;
    run.current = {
      theta: (state.config.angle * Math.PI) / 180,
      omega: 0,
      time: 0,
      cycles: 0,
    };
    setDisplay({ time: 0, cycles: 0, angle: state.config.angle });
    setStatus("running");
  }
  useEffect(() => {
    if (status !== "running") return;
    let frame = 0,
      last = performance.now();
    motion.current.running = true;
    const tick = (now: number) => {
      let dt = Math.min((now - last) / 1000, 0.05) * speed;
      last = now;
      const r = run.current;
      let finished = false;
      while (dt > 1e-9) {
        const h = Math.min(dt, 1 / 240),
          prevOmega = r.omega;
        const [theta, omega] = integratePendulum(
          r.theta,
          r.omega,
          config.current.length,
          h,
        );
        r.theta = theta;
        r.omega = omega;
        r.time += h;
        dt -= h;
        if (
          config.current.angle >= 0
            ? prevOmega > 0 && omega <= 0 && theta > 0
            : prevOmega < 0 && omega >= 0 && theta < 0
        ) {
          r.cycles++;
          if (r.cycles === 10) {
            r.time -= h * (1 - prevOmega / (prevOmega - omega));
            finished = true;
            break;
          }
        }
      }
      motion.current = { theta: r.theta, time: r.time, running: !finished };
      if (now - lastPaint.current > 80 || finished) {
        lastPaint.current = now;
        setDisplay({
          time: r.time,
          cycles: r.cycles,
          angle: (r.theta * 180) / Math.PI,
        });
      }
      if (finished) {
        setStatus("complete");
        setManual((m) =>
          m.start === null ? m : { start: null, elapsed: r.time - m.start },
        );
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      motion.current.running = false;
    };
  }, [status, speed]);
  useEffect(() => {
    if (tab === "notebook" && status === "running") setStatus("paused");
  }, [tab, status]);
  useEffect(() => {
    if (state.released) dispatch({ type: "configure", config: state.config });
  }, []);
  useEffect(() => {
    if (status === "ready") {
      motion.current = {
        theta: (state.config.angle * Math.PI) / 180,
        time: 0,
        running: false,
      };
      run.current = {
        theta: (state.config.angle * Math.PI) / 180,
        omega: 0,
        time: 0,
        cycles: 0,
      };
      setDisplay({ time: 0, cycles: 0, angle: state.config.angle });
    }
  }, [state.config.angle, state.config.length, state.config.mass]);
  const recorded = status === "complete" && !state.released,
    canRecord = status === "complete" && state.released;
  return (
    <div className="mx-auto max-w-[1450px] space-y-5 pb-6 text-slate-800">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <Link
            to="/student/stem-labs"
            className="inline-flex items-center gap-2 text-xs text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            STEM Labs
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Pendulum investigation
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {lab.grade} · {lab.subject} · Measure the period of an oscillation
          </p>
        </div>
        <span
          className={`text-[11px] ${studio.storageError ? "text-red-700" : "text-slate-500"}`}
        >
          {studio.storageError
            ? "Browser storage unavailable — export your work"
            : "Recorded trials saved in this browser"}
        </span>
      </header>
      <nav
        aria-label="Pendulum lab views"
        className="flex w-fit rounded-lg bg-slate-100 p-1"
      >
        {(["apparatus", "notebook"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`min-h-10 rounded-md px-4 text-xs font-semibold ${tab === t ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            {t === "apparatus"
              ? "Apparatus"
              : `Notebook (${state.readings.length})`}
          </button>
        ))}
      </nav>
      {studio.message && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {studio.message}
        </p>
      )}
      {tab === "apparatus" && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <section className="overflow-hidden rounded-xl border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-medium">
                <Ruler className="h-4 w-4 text-slate-500" />
                Precision pendulum · optical gate
              </p>
              <span className="text-[11px] text-slate-500">
                Drag to inspect · scroll to zoom
              </span>
            </div>
            <div className="relative h-[520px] sm:h-[600px]">
              <Suspense
                fallback={
                  <p className="p-6 text-sm">Preparing the apparatus…</p>
                }
              >
                <Scene
                  kind="pendulum"
                  length={state.config.length}
                  mass={state.config.mass}
                  motion={motion}
                  onAngle={(angle) => configure({ ...config.current, angle })}
                />
              </Suspense>
              <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/80 bg-white/85 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
                <p className="font-semibold tabular-nums">
                  {Math.abs(display.angle).toFixed(1)}°
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Angle from vertical
                </p>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/90 p-4 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Gate timer
                  </p>
                  <p
                    aria-label="Pendulum elapsed time"
                    className="mt-1 font-mono text-3xl font-medium tabular-nums text-slate-900"
                  >
                    {display.time.toFixed(2)}
                    <span className="ml-1 text-sm text-slate-400">s</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums">
                    {display.cycles}
                    <span className="text-sm font-normal text-slate-400">
                      {" "}
                      / 10
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Complete oscillations
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <p className="flex max-w-md items-start gap-2 text-xs leading-6 text-slate-500">
                <Hand className="mt-1 h-4 w-4 shrink-0" />
                Drag the bob to choose a release angle. The gate measures ten
                complete swings after release.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-xs font-medium"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  disabled={status === "complete"}
                  onClick={release}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {status === "running" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {status === "running"
                    ? "Pause"
                    : status === "paused"
                      ? "Resume"
                      : "Release bob"}
                </button>
              </div>
            </div>
          </section>
          <aside className="space-y-4">
            <section className="rounded-xl border bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                Set up your experiment
              </p>
              <h2 className="mt-2 text-base font-semibold">
                Change one variable
              </h2>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                Begin with the length. Keep the mass and release angle unchanged
                between trials.
              </p>
              <div className="mt-5 space-y-5">
                {[
                  {
                    key: "length" as const,
                    label: "String length",
                    unit: "m",
                    min: 0.2,
                    max: 1.5,
                    step: 0.05,
                    Icon: Ruler,
                  },
                  {
                    key: "angle" as const,
                    label: "Release angle",
                    unit: "°",
                    min: 5,
                    max: 40,
                    step: 1,
                    Icon: RotateCcw,
                  },
                  {
                    key: "mass" as const,
                    label: "Bob mass",
                    unit: "g",
                    min: 50,
                    max: 500,
                    step: 50,
                    Icon: Weight,
                  },
                ].map(({ key, label, unit, min, max, step, Icon }) => (
                  <label key={key} className="block">
                    <span className="flex items-center justify-between gap-2 text-xs font-medium">
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                        {label}
                      </span>
                      <output className="tabular-nums">
                        {key === "length"
                          ? state.config[key].toFixed(2)
                          : Math.abs(state.config[key])}{" "}
                        {unit}
                      </output>
                    </span>
                    <input
                      aria-label={label}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      disabled={status === "running" || status === "paused"}
                      value={Math.abs(state.config[key])}
                      onChange={(e) =>
                        configure({
                          ...state.config,
                          [key]: Number(e.target.value),
                        })
                      }
                      className="mt-3 w-full accent-blue-700 disabled:opacity-40"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-5 flex items-center justify-between gap-3 text-xs">
                <span>Playback</span>
                <select
                  aria-label="Pendulum playback speed"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="min-h-10 rounded-lg border bg-white px-3"
                >
                  <option value={1}>Real time · 1×</option>
                  <option value={2}>2× speed</option>
                  <option value={4}>4× speed</option>
                </select>
              </label>
              <p className="mt-2 text-[10px] leading-5 text-slate-500">
                The timer always displays simulated seconds, including
                accelerated playback.
              </p>
            </section>
            <section className="rounded-xl border bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-4 w-4 text-slate-500" />
                Measurement
              </h2>
              <p
                role="status"
                className="mt-3 text-xs leading-6 text-slate-500"
              >
                {status === "ready"
                  ? "Set up the apparatus, then release the bob."
                  : status === "running"
                    ? "Gate recording… the timer stops after ten full oscillations."
                    : status === "paused"
                      ? "Paused. Resume to continue the same measurement."
                      : "Ten complete oscillations recorded by the gate."}
              </p>
              {status === "complete" && (
                <div className="mt-4 rounded-lg bg-slate-50 p-4">
                  <p className="text-[10px] text-slate-500">
                    Measured period · elapsed time ÷ 10
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {(display.time / 10).toFixed(3)}{" "}
                    <span className="text-sm font-normal text-slate-400">
                      s
                    </span>
                  </p>
                </div>
              )}
              <button
                disabled={!canRecord}
                onClick={() =>
                  dispatch({
                    type: "reading",
                    cycles: 10,
                    elapsed: run.current.time,
                  })
                }
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white disabled:opacity-40"
              >
                {recorded ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {recorded ? "Measurement in notebook" : "Record measurement"}
              </button>
              <button
                onClick={() => setTab("notebook")}
                className="mt-3 min-h-9 w-full text-xs text-slate-500"
              >
                View {state.readings.length} recorded measurements
              </button>
            </section>
            <details className="rounded-xl border bg-white p-5">
              <summary className="cursor-pointer text-xs font-semibold">
                Method & model assumptions
              </summary>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Measure length from the pivot to the bob’s centre. Record three
                trials across at least two lengths. Calculate T = t/10 and
                compare how T changes with length. For small angles, T ≈
                2π√(L/g).
              </p>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Motion integrates the nonlinear pendulum equation at g = 9.81
                m/s². Air resistance, string mass and real sensor noise are
                omitted. Larger release angles increase the period; bob mass
                does not affect this ideal model.
              </p>
            </details>
            <details className="rounded-xl border bg-white p-5">
              <summary className="cursor-pointer text-xs font-semibold">
                Manual stopwatch practice
              </summary>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Practise starting and stopping while counting swings. The
                notebook uses the gate measurement.
              </p>
              <p className="mt-3 font-mono text-xl tabular-nums">
                {(manual.start === null
                  ? manual.elapsed
                  : Math.max(0, display.time - manual.start)
                ).toFixed(2)}{" "}
                s
              </p>
              <button
                disabled={status !== "running" && manual.start === null}
                onClick={() =>
                  setManual((m) =>
                    m.start === null
                      ? { start: run.current.time, elapsed: 0 }
                      : { start: null, elapsed: run.current.time - m.start },
                  )
                }
                className="mt-3 min-h-9 rounded-lg border px-3 text-xs disabled:opacity-40"
              >
                {manual.start === null ? "Start stopwatch" : "Stop stopwatch"}
              </button>
            </details>
          </aside>
        </div>
      )}
      {tab === "notebook" && (
        <StudioReport
          restore={studio.restore}
          lab={lab}
          conclusion={draft.conclusion}
          answers={draft.answers}
          onChange={(conclusion) => studio.update({ conclusion })}
          onAnswers={(answers) => studio.update({ answers })}
          ready={pendulumReady(state, draft.conclusion)}
          saved={studio.saved}
          pending={studio.save.isPending}
          error={studio.save.error}
          onSave={() => studio.save.mutate()}
          onExport={studio.exportReport}
        >
          <p className="text-xs leading-6 text-slate-500">
            Record three measurements across at least two lengths. Compare the
            measured periods using consistent units and controlled variables.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b bg-slate-50 text-slate-500">
                <tr>
                  {[
                    "Trial",
                    "Length / m",
                    "Angle / °",
                    "Mass / g",
                    "10 swings / s",
                    "Period / s",
                  ].map((h) => (
                    <th key={h} className="p-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.readings.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 tabular-nums">{r.length.toFixed(2)}</td>
                    <td className="p-3">{Math.abs(r.angle)}</td>
                    <td className="p-3">{r.mass}</td>
                    <td className="p-3 tabular-nums">{r.elapsed.toFixed(3)}</td>
                    <td className="p-3 font-semibold tabular-nums">
                      {r.period.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!state.readings.length && (
              <p className="p-5 text-xs text-slate-500">
                Release the bob and time your first ten oscillations.
              </p>
            )}
          </div>
          {state.readings.length >= 2 && (
            <PendulumPlot readings={state.readings} />
          )}
        </StudioReport>
      )}
      <StudioBrief lab={lab} />
    </div>
  );
}

function PendulumPlot({
  readings,
}: {
  readings: ReturnType<typeof replayPendulum>["readings"];
}) {
  const maxL = Math.max(...readings.map((r) => r.length)) * 1.2,
    maxY = Math.max(...readings.map((r) => r.period * r.period)) * 1.2;
  return (
    <figure className="rounded-lg border p-4">
      <figcaption className="text-sm font-semibold">
        Period squared against length
      </figcaption>
      <p className="mt-2 text-xs leading-6 text-slate-500">
        For a fixed release angle, compare whether T² is proportional to L.
        Hover or focus a point to inspect a measurement.
      </p>
      <svg
        role="img"
        aria-label="Scatter plot of measured period squared against string length"
        viewBox="0 0 520 240"
        className="mt-4 w-full max-w-2xl"
      >
        <path d="M55 15V195H490" fill="none" stroke="#94a3b8" />
        {[1, 2, 3, 4].map((i) => (
          <g key={i}>
            <path d={`M55 ${195 - i * 42}H490`} stroke="#e2e8f0" />
            <text
              x="45"
              y={200 - i * 42}
              textAnchor="end"
              fontSize="10"
              fill="#64748b"
            >
              {((maxY * i) / 4).toFixed(1)}
            </text>
            <text
              x={55 + i * 108}
              y="213"
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {((maxL * i) / 4).toFixed(2)}
            </text>
          </g>
        ))}
        <text x="260" y="235" fontSize="11" fill="#475569">
          String length / m
        </text>
        <text
          x="10"
          y="120"
          transform="rotate(-90 10 120)"
          fontSize="11"
          fill="#475569"
        >
          Period² / s²
        </text>
        {readings.map((r, i) => (
          <circle
            key={i}
            tabIndex={0}
            aria-label={`Trial ${i + 1}: length ${r.length} metres, period squared ${(r.period * r.period).toFixed(3)} seconds squared`}
            cx={55 + (r.length / maxL) * 432}
            cy={195 - ((r.period * r.period) / maxY) * 168}
            r="5"
            fill="#2563eb"
            stroke="white"
            strokeWidth="2"
          >
            <title>{`Trial ${i + 1} · L ${r.length.toFixed(2)} m · T² ${(r.period * r.period).toFixed(3)} s²`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}
