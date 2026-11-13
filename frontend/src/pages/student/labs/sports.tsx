import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bone,
  Dumbbell,
  Zap,
  HeartPulse,
  Brain,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Play,
  Pause,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { api, apiErrorMessage } from "../../../api/axios";
import { useAuthStore } from "../../../store/auth.store";
import {
  SPORTS_CONTROLS,
  BONE_GUIDE,
  defaultSportsConfig,
  validSportsConfig,
  sportsResult,
  isSportsId,
  type SportsId,
  type SportsSubmission,
} from "../../../../../backend/src/student/sports/sports-engine";
const Scene = lazy(
  () => import("../../../features/student/sports/SportsScene"),
);
const LungScene = lazy(
  () =>
    import("../../../features/student/stem-workspace/studios/RespiratoryScene"),
);
interface Activity {
  id: SportsId;
  title: string;
  subtitle: string;
  objective: string;
  focus: string;
  limits: string;
  questions: { prompt: string; options: string[] }[];
}
interface Progress {
  simulation: SportsId;
  score: number;
  completed_at: string | null;
}
interface Result {
  score: number;
  completed: boolean;
  feedback: { correct: boolean; correct_answer: number; explanation: string }[];
}
const icons = {
  skeletal: Bone,
  muscle: Dumbbell,
  energy: Zap,
  respiratory: HeartPulse,
  reflex: Brain,
};
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium disabled:opacity-40";
const primary = button + " !border-[#101820] !bg-[#101820] !text-white";
const field =
  "w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#a5b582]";
export default function SportsLab() {
  const user = useAuthStore((s) => s.user),
    slug = useLocation().pathname.split("/").filter(Boolean).at(-1),
    id = slug && isSportsId(slug) ? slug : null;
  const activities = useQuery({
      queryKey: ["sports-activities", user?.id, user?.schoolId],
      queryFn: () =>
        api
          .get<{ grade: number; activities: Activity[] }>(
            "/student/sports-lab/activities",
          )
          .then((r) => r.data),
    }),
    progress = useQuery({
      queryKey: ["sports-progress", user?.id, user?.schoolId],
      queryFn: () =>
        api.get<Progress[]>("/student/sports-lab/progress").then((r) => r.data),
    });
  if (activities.isLoading)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Preparing Sports Lab…
      </p>
    );
  if (activities.isError || !activities.data)
    return (
      <div role="alert" className="rounded-xl border bg-white p-6">
        <p>Sports Lab could not load.</p>
        <button
          onClick={() => void activities.refetch()}
          className={button + " mt-3"}
        >
          Try again
        </button>
      </div>
    );
  if (slug !== "sports" && !id)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Activity not found</h1>
        <Link to="/student/labs/sports" className="mt-3 inline-block underline">
          Open Sports Lab
        </Link>
      </div>
    );
  if (id) {
    const activity = activities.data.activities.find((a) => a.id === id);
    return activity ? (
      <SportsActivity
        key={`${id}-${activities.data.grade}`}
        activity={activity}
        grade={activities.data.grade}
      />
    ) : null;
  }
  const complete = progress.data?.filter((p) => p.completed_at).length ?? 0;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-[#101820] p-3 text-[#dce8bf]">
            <Dumbbell size={25} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Sports Science Lab
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Grade {activities.data.grade} · Anatomy, physiology & movement
            </p>
          </div>
        </div>
        <div className="min-w-44">
          <p className="mb-2 text-right text-xs text-slate-500">
            {complete}/5 investigations complete
          </p>
          <div
            role="progressbar"
            aria-label="Sports Lab completion"
            aria-valuenow={complete}
            aria-valuemin={0}
            aria-valuemax={5}
            className="h-2 overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className="h-full rounded-full bg-[#6b8341]"
              style={{ width: `${(complete / 5) * 100}%` }}
            />
          </div>
        </div>
      </header>
      <section className="relative overflow-hidden rounded-2xl bg-[#101820] p-6 text-white sm:p-8">
        <span className="text-[10px] uppercase tracking-[.2em] text-[#c4d0ae]">
          Your body in motion
        </span>
        <h2 className="mt-3 max-w-xl text-2xl font-semibold sm:text-3xl">
          Explore the anatomy.
          <br />
          Test the explanation.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          Make a prediction, change a condition, and use your observations to
          explain how movement works.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Explore", "Predict", "Experiment", "Compare", "Explain"].map(
            (s, i) => (
              <span
                key={s}
                className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] text-white/70"
              >
                {i + 1} · {s}
              </span>
            ),
          )}
        </div>
      </section>
      {progress.isError && (
        <p role="alert" className="text-sm text-amber-800">
          Saved progress is unavailable.{" "}
          <button className="underline" onClick={() => void progress.refetch()}>
            Retry
          </button>
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activities.data.activities.map((a, i) => {
          const Icon = icons[a.id],
            p = progress.data?.find((p) => p.simulation === a.id);
          return (
            <Link
              key={a.id}
              to={`/student/labs/sports/${a.id}`}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#a6b58a] hover:shadow-sm"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-xl bg-[#edf2e5] p-3 text-[#526b10]">
                  <Icon size={23} />
                </span>
                <span className="text-[10px] text-slate-400">0{i + 1}</span>
              </div>
              <h2 className="text-lg font-semibold">{a.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{a.subtitle}</p>
              <p className="mb-6 mt-4 text-xs leading-6 text-slate-500">
                {a.focus}
              </p>
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                <span
                  className={`text-[11px] ${p?.completed_at ? "text-[#526b10]" : "text-slate-500"}`}
                >
                  {p?.completed_at ? (
                    <>
                      <Check className="mr-1 inline h-3 w-3" />
                      Completed · {p.score}%
                    </>
                  ) : p ? (
                    `Best score ${p.score}%`
                  ) : (
                    "Start investigation"
                  )}
                </span>
                <ArrowUpRight size={17} className="text-slate-400" />
              </div>
            </Link>
          );
        })}
      </div>
      <p className="text-[11px] leading-6 text-slate-500">
        Curriculum-linked learning objectives. Anatomical atlas models and
        simplified physiology models support classroom inquiry; they are not
        clinical tests or an official certification.
      </p>
    </div>
  );
}
interface Draft {
  config: Record<string, number>;
  prediction: string;
  conclusion: string;
  note: string;
  observations: SportsSubmission["observations"];
  answers: number[];
  inspected: string[];
}
function SportsActivity({
  activity: a,
  grade,
}: {
  activity: Activity;
  grade: number;
}) {
  const user = useAuthStore((s) => s.user),
    client = useQueryClient(),
    storageKey = `sports-lab-v1:${user?.id}:${user?.schoolId}:${grade}:${a.id}`;
  const initial = (): Draft => ({
    config: defaultSportsConfig(a.id),
    prediction: "",
    conclusion: "",
    note: "",
    observations: [],
    answers: [-1, -1, -1],
    inspected: [],
  });
  const [draft, setDraft] = useState<Draft>(() => {
      try {
        const d = JSON.parse(localStorage.getItem(storageKey) ?? "null");
        if (
          d &&
          validSportsConfig(a.id, d.config) &&
          ["prediction", "conclusion", "note"].every(
            (k) => typeof d[k] === "string",
          ) &&
          Array.isArray(d.observations) &&
          d.observations.length <= 6 &&
          d.observations.every(
            (o: SportsSubmission["observations"][number]) =>
              validSportsConfig(a.id, o.config) && typeof o.note === "string",
          ) &&
          Array.isArray(d.answers) &&
          d.answers.length === 3 &&
          d.answers.every(
            (v: number) => Number.isInteger(v) && v >= -1 && v <= 3,
          ) &&
          Array.isArray(d.inspected) &&
          d.inspected.every((k: string) => !!BONE_GUIDE[k])
        )
          return d;
      } catch {}
      return initial();
    }),
    [selected, setSelected] = useState("femur"),
    [running, setRunning] = useState(true),
    [stimulus, setStimulus] = useState(0),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [storageError, setStorageError] = useState(false),
    [notice, setNotice] = useState("");
  const revision = useRef(0),
    mounted = useRef(true),
    motion = useRef({ time: 0, running: true });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [draft, storageKey]);
  useEffect(() => {
    let frame = 0,
      last = performance.now();
    const tick = (now: number) => {
      if (running)
        motion.current.time += Math.max(0, Math.min(0.1, (now - last) / 1000));
      motion.current.running = running;
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  function change(p: Partial<Draft>) {
    revision.current++;
    setResult(null);
    setNotice("");
    setDraft((d) => ({ ...d, ...p }));
  }
  function pick(key: string) {
    setSelected(key);
    if (BONE_GUIDE[key])
      change({ inspected: [...new Set([...draft.inspected, key])] });
  }
  const results = sportsResult(a.id, draft.config),
    controls = SPORTS_CONTROLS[a.id],
    bone = BONE_GUIDE[selected];
  const recordReady =
    draft.prediction.trim().length >= 12 &&
    draft.note.trim().length >= 12 &&
    draft.observations.length < 6;
  function record() {
    if (!recordReady) return;
    const signature = (c: Record<string, number>) =>
      JSON.stringify(controls.map((k) => c[k.key]));
    if (
      draft.observations.some(
        (o) => signature(o.config) === signature(draft.config),
      )
    ) {
      setError("Change a condition before recording another trial.");
      return;
    }
    setError("");
    change({
      observations: [
        ...draft.observations,
        { config: { ...draft.config }, note: draft.note.trim() },
      ],
      note: "",
    });
  }
  async function submit() {
    setBusy(true);
    setError("");
    const version = revision.current;
    try {
      const response = await api.post<Result>("/student/sports-lab/complete", {
        simulation: a.id,
        prediction: draft.prediction,
        conclusion: draft.conclusion,
        observations: draft.observations,
        answers: draft.answers,
        inspected: draft.inspected,
      });
      void client.invalidateQueries({
        queryKey: ["sports-progress", user?.id, user?.schoolId],
      });
      if (mounted.current) {
        if (version === revision.current) setResult(response.data);
        setNotice(
          version === revision.current
            ? "Assessment saved to your account."
            : "The submitted snapshot was saved. Your latest edits remain in this browser.",
        );
      }
    } catch (e) {
      if (mounted.current) setError(apiErrorMessage(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const canSubmit =
    draft.observations.length >= 2 &&
    draft.conclusion.trim().length >= 30 &&
    draft.answers.every((n) => n >= 0) &&
    (a.id !== "skeletal" ||
      (draft.inspected.includes("femur") && draft.inspected.length >= 3));
  const Icon = icons[a.id];
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <header>
        <Link
          to="/student/labs/sports"
          className="inline-flex items-center gap-2 text-xs text-slate-500"
        >
          <ArrowLeft size={14} />
          Sports Lab
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#edf2e5] p-3 text-[#526b10]">
              <Icon size={23} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {a.title}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Grade {grade} · {a.focus}
              </p>
            </div>
          </div>
          <button className={button} onClick={() => setRunning((p) => !p)}>
            {running ? <Pause size={14} /> : <Play size={14} />}{" "}
            {running ? "Pause animation" : "Play animation"}
          </button>
        </div>
      </header>
      <nav
        aria-label="Investigation stages"
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5"
      >
        {["Explore", "Predict", "Experiment", "Compare", "Explain"].map(
          (name, i) => {
            const done = [
              a.id !== "skeletal" || draft.inspected.length >= 3,
              draft.prediction.trim().length >= 12,
              draft.observations.length >= 1,
              draft.observations.length >= 2,
              draft.conclusion.trim().length >= 30,
            ][i];
            return (
              <a
                key={name}
                href={`#sports-${["explore", "predict", "experiment", "compare", "explain"][i]}`}
                className={`flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs ${done ? "bg-[#edf2e5] text-[#526b10]" : "text-slate-500"}`}
              >
                {done ? (
                  <Check size={13} />
                ) : (
                  <span className="text-[10px]">{i + 1}</span>
                )}
                {name}
              </a>
            );
          },
        )}
      </nav>
      <div
        id="sports-explore"
        className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"
      >
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold">
              {a.id === "skeletal"
                ? "Inspect the skeleton"
                : a.id === "muscle"
                  ? "Muscle anatomy & movement"
                  : a.id === "reflex"
                    ? "Follow the neural pathway"
                    : a.id === "energy"
                      ? "ATP supply to working muscle"
                      : "Breathing & circulation"}
            </h2>
          </div>
          <Suspense
            fallback={
              <p className="p-10 text-sm text-slate-500">
                Preparing the workspace…
              </p>
            }
          >
            {a.id === "respiratory" ? (
              <div className="relative h-[340px] sm:h-[470px]">
                <LungScene
                  config={{
                    rate: 12,
                    tidalVolume: 0.5,
                  }}
                  motion={motion}
                  view="surface"
                  selected="right-lung"
                  cameraView="front"
                  resetKey={0}
                  labels={false}
                  onSelect={() => {}}
                />
              </div>
            ) : (
              <Scene
                kind={a.id}
                config={draft.config}
                selected={selected}
                onSelect={pick}
                running={running}
                stimulus={stimulus}
                onStimulus={() => {
                  setRunning(true);
                  setStimulus((s) => s + 1);
                }}
              />
            )}
          </Suspense>
          {a.id === "skeletal" && (
            <div className="border-t border-slate-100 p-4">
              <p className="text-[11px] text-slate-500">
                Idealized forearm lever · 0.30 m · separate from the atlas pose
              </p>
              <svg
                aria-label="Forearm lever angle schematic"
                role="img"
                viewBox="0 0 260 110"
                className="mt-2 h-28 w-full"
              >
                <path d="M80 10V95" stroke="#cbd5e1" strokeDasharray="3 3" />
                <g
                  transform={`translate(80 20) rotate(${-draft.config.angle})`}
                >
                  <path
                    d="M0 0V65"
                    stroke="#6b8341"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <circle
                    cy="65"
                    r={5 + draft.config.load / 3}
                    fill="#af8d63"
                  />
                </g>
                <circle cx="80" cy="20" r="6" fill="#101820" />
                <text x="160" y="40" fontSize="12" fill="#526b10">
                  {draft.config.angle}°
                </text>
                <text x="160" y="64" fontSize="11" fill="#64748b">
                  {draft.config.load} kg load
                </text>
              </svg>
            </div>
          )}
          {a.id === "skeletal" && (
            <div className="border-t border-slate-100 p-4">
              <p className="mb-3 text-xs font-medium">
                Challenge: find the longest bone. Inspect three bone groups.
              </p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {Object.entries(BONE_GUIDE).map(([key, b]) => (
                  <button
                    key={key}
                    aria-pressed={selected === key}
                    onClick={() => pick(key)}
                    className={`rounded-lg border px-2.5 py-2 text-[11px] ${selected === key ? "border-[#a4b77e] bg-[#edf2e5]" : "border-slate-200 text-slate-500"}`}
                  >
                    {draft.inspected.includes(key) && (
                      <Check size={10} className="mr-1 inline" />
                    )}
                    {b.name}
                  </button>
                ))}
              </div>
              {selected === "femur" && draft.inspected.includes("femur") && (
                <p className="mt-3 text-xs text-[#526b10]">
                  Correct location: the femur is in the thigh.
                </p>
              )}
            </div>
          )}
          {a.id === "energy" && (
            <div
              aria-label="Relative energy system contributions"
              className="h-60 border-t border-slate-100 p-4"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={results}
                  margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                  <Tooltip
                    formatter={(v: number) => [
                      `${v.toFixed(1)} relative %`,
                      "Contribution",
                    ]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {results.map((r, i) => (
                      <Cell
                        key={r.label}
                        fill={["#9b864d", "#ac7372", "#6d8f7a"][i]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {a.id === "respiratory" && (
            <Circulation running={running} heartRate={draft.config.heartRate} />
          )}
          {a.id === "reflex" && (
            <div className="space-y-3 border-t border-slate-100 p-4">
              <button
                className={primary}
                onClick={() => {
                  setRunning(true);
                  setStimulus((s) => s + 1);
                }}
              >
                Apply virtual heat stimulus
              </button>
              <ol className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                {[
                  "Receptor",
                  "Sensory neurone",
                  "Spinal interneurone",
                  "Motor neurone",
                  "Muscle response",
                ].map((s, i) => (
                  <li key={s} className="rounded-lg bg-slate-50 px-2 py-2">
                    {i + 1} · {s}
                  </li>
                ))}
              </ol>
              <p className="text-[11px] leading-5 text-slate-500">
                Gold pathway = spinal reflex. Ascending information also reaches
                the brain. Animation is slowed to four seconds; the calculated
                time below is illustrative.
              </p>
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <section
            id="sports-experiment"
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h2 className="text-sm font-semibold">Change a condition</h2>
            <div className="mt-5 space-y-5">
              {controls.map((c) => (
                <label key={c.key} className="block text-xs">
                  <span className="flex justify-between gap-2">
                    <span>{c.label}</span>
                    <output className="shrink-0 font-medium text-[#526b10]">
                      {draft.config[c.key].toFixed(c.step < 1 ? 1 : 0)} {c.unit}
                    </output>
                  </span>
                  <input
                    aria-label={c.label}
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={draft.config[c.key]}
                    onChange={(e) =>
                      change({
                        config: {
                          ...draft.config,
                          [c.key]: Number(e.target.value),
                        },
                      })
                    }
                    className="mt-3 w-full accent-[#667e3c]"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => change({ config: defaultSportsConfig(a.id) })}
              className={button + " mt-5 w-full"}
            >
              <RotateCcw size={13} />
              Reset controls
            </button>
          </section>
          {a.id === "skeletal" && bone && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold">{bone.name}</h2>
              <div className="mt-2 flex gap-2 text-[10px] text-[#526b10]">
                <span className="rounded bg-[#edf2e5] px-2 py-1">
                  {bone.type}
                </span>
                <span className="rounded bg-[#edf2e5] px-2 py-1">
                  {bone.division}
                </span>
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                {bone.function}
              </p>
            </section>
          )}
          <section className="rounded-2xl bg-[#101820] p-5 text-white">
            <h2 className="mb-4 text-xs text-white/50">Model readout</h2>
            <dl className="space-y-4">
              {results.map((r) => (
                <div key={r.label}>
                  <dt className="text-[11px] text-white/55">{r.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">
                    {r.value.toFixed(1)}{" "}
                    <span className="text-[10px] font-normal text-white/50">
                      {r.unit}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          {a.id === "muscle" && draft.config.atp < 15 && (
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900"
            >
              Very low ATP limits cross-bridge cycling and detachment. This
              simplified model does not equate ATP depletion with ordinary
              exercise fatigue.
            </p>
          )}
        </aside>
      </div>
      <section
        id="sports-predict"
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2"
      >
        <div>
          <h2 className="text-sm font-semibold">Before you compare</h2>
          <label className="mt-3 block text-xs text-slate-500">
            What do you predict will change, and why?
            <textarea
              aria-label="Investigation prediction"
              maxLength={600}
              value={draft.prediction}
              onChange={(e) => change({ prediction: e.target.value })}
              className={field + " mt-2 min-h-24"}
              placeholder="If I change… I expect… because…"
            />
          </label>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Record this trial</h2>
          <label className="mt-3 block text-xs text-slate-500">
            What did you observe?
            <textarea
              aria-label="Trial observation"
              maxLength={600}
              value={draft.note}
              onChange={(e) => change({ note: e.target.value })}
              className={field + " mt-2 min-h-24"}
              placeholder="Use a structure, number or visible change as evidence."
            />
          </label>
          <button
            disabled={!recordReady}
            onClick={record}
            className={primary + " mt-3"}
          >
            Record condition {draft.observations.length + 1}
          </button>
        </div>
      </section>
      <section
        id="sports-compare"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <h2 className="p-5 text-sm font-semibold">
          Compare your evidence{" "}
          <span className="ml-2 font-normal text-slate-400">
            {draft.observations.length}/6 trials
          </span>
        </h2>
        {draft.observations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3">Trial</th>
                  <th className="p-3">Conditions</th>
                  <th className="p-3">Results</th>
                  <th className="p-3">Observation</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.observations.map((o, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 leading-6">
                      {controls.map((c) => (
                        <div key={c.key}>
                          {c.label}: {o.config[c.key]} {c.unit}
                        </div>
                      ))}
                    </td>
                    <td className="p-3 leading-6">
                      {sportsResult(a.id, o.config).map((r) => (
                        <div key={r.label}>
                          {r.label}: {r.value.toFixed(1)} {r.unit}
                        </div>
                      ))}
                    </td>
                    <td className="max-w-72 break-words p-3 leading-6">
                      {o.note}
                    </td>
                    <td className="p-3">
                      <button
                        aria-label={`Remove trial ${i + 1}`}
                        onClick={() =>
                          change({
                            observations: draft.observations.filter(
                              (_, n) => n !== i,
                            ),
                          })
                        }
                        className="text-slate-400 underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 pb-5 text-xs text-slate-500">
            Record two different conditions to make a comparison.
          </p>
        )}
      </section>
      <section
        id="sports-explain"
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold">Explain & check understanding</h2>
        <label className="block text-xs text-slate-500">
          Was your prediction supported? Explain using your trial results.
          <textarea
            aria-label="Investigation conclusion"
            maxLength={2000}
            value={draft.conclusion}
            onChange={(e) => change({ conclusion: e.target.value })}
            className={field + " mt-2 min-h-24"}
          />
        </label>
        <div className="grid gap-4 lg:grid-cols-3">
          {a.questions.map((q, i) => (
            <fieldset key={i} className="rounded-xl bg-slate-50 p-4">
              <legend className="mb-2 px-1 text-xs font-medium leading-6">
                {i + 1}. {q.prompt}
              </legend>
              {q.options.map((option, n) => (
                <label
                  key={n}
                  className="flex min-h-10 items-start gap-2 py-2 text-xs leading-5"
                >
                  <input
                    type="radio"
                    name={`sports-q-${i}`}
                    value={n}
                    checked={draft.answers[i] === n}
                    onChange={() =>
                      change({
                        answers: draft.answers.map((v, k) => (k === i ? n : v)),
                      })
                    }
                    className="mt-1 accent-[#667e3c]"
                  />
                  {option}
                </label>
              ))}
              {result && (
                <p
                  className={`mt-3 text-xs leading-6 ${result.feedback[i].correct ? "text-[#526b10]" : "text-amber-800"}`}
                >
                  {result.feedback[i].correct ? "Correct. " : "Review: "}
                  {result.feedback[i].explanation}
                </p>
              )}
            </fieldset>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={!canSubmit || busy}
            onClick={() => void submit()}
            className={primary}
          >
            <Save size={14} />
            {busy ? "Checking…" : "Check & save investigation"}
          </button>
          <span className="text-[10px] text-slate-500">
            Two distinct trials · three answers · explanation · 2/3 correct to
            complete
          </span>
        </div>
        {result && (
          <div
            role="status"
            className="rounded-xl bg-[#edf2e5] p-4 text-sm text-[#435822]"
          >
            {result.score}% ·{" "}
            {result.completed
              ? "Investigation complete"
              : "Review the explanations and try again. Your best score is retained."}
          </div>
        )}
        {notice && (
          <p role="status" className="text-xs text-[#526b10]">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-amber-800">
            {error}
          </p>
        )}
        {storageError && (
          <p role="alert" className="text-xs text-amber-800">
            Browser drafts could not be saved. Keep this page open and submit
            when ready.
          </p>
        )}
      </section>
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-xs font-medium">
          Learning objective, model limits & credits
        </summary>
        <div className="mt-3 space-y-3 text-xs leading-6 text-slate-500">
          <p>{a.objective}</p>
          <p>{a.limits}</p>
          <a
            className="underline"
            href="/stem/anatomy/sports/ATTRIBUTION.txt"
            target="_blank"
            rel="noreferrer"
          >
            Z-Anatomy / BodyParts3D · CC BY-SA 4.0 attribution
          </a>
        </div>
      </details>
    </div>
  );
}
function Circulation({
  running,
  heartRate,
}: {
  running: boolean;
  heartRate: number;
}) {
  return (
    <div className="border-t border-slate-100 p-4">
      <h3 className="text-xs font-medium">Trace the two circuits</h3>
      <svg
        role="img"
        aria-label="Pulmonary and systemic blood flow: right heart to lungs, lungs to left heart, left heart to body, body to right heart"
        viewBox="0 0 440 250"
        className="mx-auto mt-2 max-h-72 w-full"
      >
        <style>
          {"@keyframes sports-blood-flow{to{stroke-dashoffset:-36}}"}
        </style>
        {[
          { d: "M170 125 Q70 20 205 32", c: "#6d89ad" },
          { d: "M235 32 Q365 20 270 125", c: "#b87578" },
          { d: "M270 125 Q365 230 235 220", c: "#b87578" },
          { d: "M205 220 Q70 230 170 125", c: "#6d89ad" },
        ].map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.c}
            strokeWidth="7"
            strokeDasharray="10 8"
            style={{
              animation: `sports-blood-flow ${360 / heartRate}s linear infinite`,
              animationPlayState: running ? "running" : "paused",
            }}
          />
        ))}
        {[
          { x: 220, y: 32, t: "Lungs" },
          { x: 170, y: 125, t: "Right heart" },
          { x: 270, y: 125, t: "Left heart" },
          { x: 220, y: 220, t: "Working muscle" },
        ].map((n) => (
          <g key={n.t}>
            <rect
              x={n.x - 48}
              y={n.y - 17}
              width="96"
              height="34"
              rx="12"
              fill="#f1f4eb"
              stroke="#d4ddc7"
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              fontSize="10"
              fill="#34452e"
            >
              {n.t}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-[10px] leading-5 text-slate-500">
        Rose: oxygen-rich blood · Blue: oxygen-poor blood. Pulmonary arteries
        carry oxygen-poor blood; pulmonary veins carry oxygen-rich blood. Flow
        arrows are schematic.
      </p>
    </div>
  );
}
