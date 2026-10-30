import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Grip,
  Hand,
  LoaderCircle,
  Move,
  Play,
  RotateCcw,
  RotateCw,
  Save,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { Lab } from "../../../../types";
import { labSessionsApi } from "../../../../api/labs.api";
import { apiErrorMessage } from "../../../../api/axios";
import { gradeDesignLink } from "../../curriculum/framework";
import {
  practicalFor,
  measurementReady,
  gradePractice,
  practicalResult,
  practicalComplete,
  replayPractical,
  transition,
  type PracticalEvent,
  type Placement,
} from "../../../../../../backend/src/labs/practical-engine";
const Scene = lazy(() => import("./WorkshopScene3D"));
const input =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
function hasEarlierNotebook(userId: number, labId: number) {
  try {
    return !!localStorage.getItem(`stem-notebook-v1:${userId}:${labId}`);
  } catch {
    return false;
  }
}
interface Draft {
  events: PracticalEvent[];
  conclusion: string;
  answers: Record<number, string>;
}
export const workshopKey = (userId: number, labId: number) =>
  `stem-workshop-v2:${userId}:${labId}`;
export default function PracticalWorkshop({
  lab,
  userId,
}: {
  lab: Lab;
  userId: number;
}) {
  const spec = practicalFor(lab),
    key = workshopKey(userId, lab.id),
    grade = Number(lab.grade.match(/\d+/)?.[0] ?? 0),
    junior = grade <= 9;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? "null");
      if (raw?.version !== "stem-workshop-v2") throw new Error();
      replayPractical(spec, raw.events);
      return {
        events: raw.events,
        conclusion:
          typeof raw.conclusion === "string"
            ? raw.conclusion.slice(0, 5000)
            : "",
        answers:
          raw.answers && typeof raw.answers === "object"
            ? Object.fromEntries(
                Object.entries(raw.answers).filter(
                  ([, v]) => typeof v === "string",
                ),
              )
            : {},
      } as Draft;
    } catch {
      return { events: [], conclusion: "", answers: {} };
    }
  });
  const state = replayPractical(spec, draft.events),
    [selected, setSelected] = useState(0),
    [held, setHeld] = useState<number | null>(null),
    [tab, setTab] = useState<"bench" | "results" | "brief">("bench"),
    [observation, setObservation] = useState(""),
    [message, setMessage] = useState(""),
    [storageError, setStorageError] = useState(false),
    [saved, setSaved] = useState(false);
  const latest = useRef(draft);
  latest.current = draft;
  const client = useQueryClient(),
    submitted = useRef("");
  const update = (change: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...change }));
    setSaved(false);
  };
  useEffect(() => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ version: "stem-workshop-v2", ...draft }),
      );
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [draft, key]);
  const dispatch = (event: PracticalEvent) => {
    try {
      const current = replayPractical(spec, latest.current.events);
      transition(spec, current, event);
      update({ events: [...latest.current.events, event] });
      setMessage(
        event.type === "action" ? `${spec.actions[event.index]} — done.` : "",
      );
      if (event.type === "place") setHeld(null);
      if (event.type === "record") {
        setObservation("");
        setTab("results");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "This action could not be completed.",
      );
    }
  };
  const place = (tool: number, position: Placement) =>
    dispatch({ type: "place", tool, ...position });
  const position = state.placements[selected] ?? {
    x: -2.25 + selected * 2.2,
    z: -0.85,
    rotation: 0,
  };
  const questions = lab.questions ?? [],
    ready =
      practicalComplete(spec, state, draft.conclusion) &&
      questions.every((q) => draft.answers[q.id]?.trim());
  const payload = () => ({
    labKey: lab.key,
    competency: lab.competency ?? undefined,
    answers: questions.map((q) => ({
      questionId: q.id,
      answer: latest.current.answers[q.id] ?? "",
    })),
    workshop: {
      version: "stem-workshop-v2",
      events: latest.current.events,
      conclusion: latest.current.conclusion,
    },
  });
  const save = useMutation({
    mutationFn: () => {
      const p = payload();
      submitted.current = JSON.stringify(p);
      return labSessionsApi.create(p);
    },
    onSuccess: () => {
      setSaved(submitted.current === JSON.stringify(payload()));
      void client.invalidateQueries({ queryKey: ["lab-sessions"] });
    },
  });
  const reports = useQuery({
    queryKey: ["lab-sessions", "workshop", userId],
    queryFn: () => labSessionsApi.findAll(),
  });
  const stored = reports.data?.find(
    (r) =>
      r.labKey === lab.key &&
      r.completionSummary?.version === "stem-workshop-v2",
  )?.completionSummary;
  const result = Number(
    practicalResult(spec, state.value, state.completed).toFixed(4),
  );
  function exportNotebook() {
    const data = {
      activity: lab.title,
      grade: lab.grade,
      subject: lab.subject,
      model: spec.explain,
      trials: state.trials,
      conclusion: draft.conclusion,
      events: draft.events,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lab.key}-practical.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-6 text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            to="/student/stem-labs"
            className="inline-flex items-center gap-2 text-xs text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            STEM Labs
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {lab.title}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {lab.grade} · {lab.subject}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`text-xs ${storageError ? "text-red-700" : "text-slate-500"}`}
          >
            {storageError
              ? "Browser draft unavailable — export your work"
              : "Draft saved in this browser"}
          </span>
          <button
            onClick={exportNotebook}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs"
          >
            <Download className="h-4 w-4" />
            Export notebook
          </button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Laboratory workspace"
          className="flex rounded-lg bg-slate-100 p-1"
        >
          {(["bench", "results", "brief"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`min-h-10 rounded-md px-4 text-xs font-semibold ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              {t === "bench"
                ? "3D workspace"
                : t === "results"
                  ? `Notebook (${state.trials.length})`
                  : "Practical brief"}
            </button>
          ))}
        </nav>
        <span className="text-xs text-slate-500">
          {state.completed}/{spec.actions.length} procedure steps
        </span>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"
        >
          {message}
        </p>
      )}
      {tab === "bench" && (
        <>
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section
              className="min-w-0 overflow-hidden rounded-xl border bg-white"
              aria-label="Manipulable 3D workspace"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <Grip className="h-4 w-4 text-blue-700" />
                  {held !== null
                    ? `Holding ${spec.tools[held]}`
                    : spec.tools[selected]}
                </span>
                <span className="text-[11px] text-slate-500">
                  Drag equipment · orbit empty space · scroll to zoom
                </span>
              </div>
              <div className="h-[460px] sm:h-[540px]">
                <Suspense
                  fallback={<p className="p-6 text-sm">Preparing equipment…</p>}
                >
                  <Scene
                    spec={spec}
                    state={state}
                    selected={selected}
                    held={held}
                    onPick={(i) => {
                      setSelected(i);
                      setHeld(i);
                    }}
                    onPlace={place}
                    onActivate={() =>
                      dispatch({ type: "action", index: state.completed })
                    }
                  />
                </Suspense>
              </div>
              <div className="border-t p-4">
                <div className="flex flex-wrap gap-2">
                  {spec.tools.map((name, i) => (
                    <button
                      key={name}
                      onClick={() => {
                        setSelected(i);
                        setHeld(i);
                      }}
                      aria-pressed={selected === i}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs ${selected === i ? "border-blue-300 bg-blue-50 text-blue-800" : "bg-white text-slate-600"}`}
                    >
                      <Hand className="h-3.5 w-3.5" />
                      {name}
                    </button>
                  ))}
                </div>
                <div
                  className="mt-3 flex flex-wrap items-center gap-2"
                  aria-label="Equipment placement controls"
                >
                  <button
                    onClick={() =>
                      place(selected, {
                        x: spec.kind === "building" ? 0 : (selected - 1) * 0.8,
                        z: 0,
                        rotation: position.rotation,
                      })
                    }
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs text-white"
                  >
                    <Move className="h-3.5 w-3.5" />
                    Place on work mat
                  </button>
                  {[
                    { name: "Move left", x: -0.2, z: 0 },
                    { name: "Move right", x: 0.2, z: 0 },
                    { name: "Move forward", x: 0, z: 0.2 },
                    { name: "Move back", x: 0, z: -0.2 },
                  ].map((m) => (
                    <button
                      key={m.name}
                      aria-label={m.name}
                      onClick={() =>
                        place(selected, {
                          ...position,
                          x: Number(
                            Math.max(
                              -2.8,
                              Math.min(2.8, position.x + m.x),
                            ).toFixed(2),
                          ),
                          z: Number(
                            Math.max(
                              -1.2,
                              Math.min(1.2, position.z + m.z),
                            ).toFixed(2),
                          ),
                        })
                      }
                      className="min-h-10 rounded-lg border px-3 text-xs"
                    >
                      {m.name.replace("Move ", "")}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      place(selected, {
                        ...position,
                        rotation:
                          (position.rotation + Math.PI / 4) % (Math.PI * 2),
                      })
                    }
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Rotate 45°
                  </button>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  Pick up an item, position it on the central mat, then use it
                  in the procedure. Touch and keyboard controls perform the same
                  actions.
                </p>
              </div>
            </section>
            <aside
              className="min-w-0 space-y-4"
              aria-label="Procedure and instruments"
            >
              <section className="rounded-xl border bg-white p-4">
                <h2 className="text-sm font-semibold">Your investigation</h2>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {spec.goal}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  {gradePractice(lab.grade)}
                </p>
                <label className="mt-4 block text-xs font-medium">
                  {spec.variable}
                  {spec.kind === "cyber" ? (
                    <select
                      aria-label={spec.variable}
                      className={`${input} mt-2`}
                      value={state.value}
                      onChange={(e) =>
                        dispatch({
                          type: "setting",
                          value: Number(e.target.value),
                        })
                      }
                    >
                      <option value={1}>Unexpected open service</option>
                      <option value={2}>Repeated sign-in attempts</option>
                      <option value={3}>Suspicious attachment</option>
                    </select>
                  ) : (
                    <>
                      <output className="ml-2 font-semibold tabular-nums">
                        {state.value}
                      </output>
                      <input
                        type="range"
                        aria-label={spec.variable}
                        min={spec.min}
                        max={spec.max}
                        step={spec.step}
                        value={state.value}
                        onChange={(e) =>
                          dispatch({
                            type: "setting",
                            value: Number(e.target.value),
                          })
                        }
                        className="mt-3 w-full accent-blue-700"
                      />
                    </>
                  )}
                </label>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  Changing the variable starts a fresh procedure. Earlier
                  readings remain in your notebook.
                </p>
              </section>
              <section className="rounded-xl border bg-white p-4">
                <h2 className="text-sm font-semibold">Practical procedure</h2>
                <div className="mt-3 space-y-2">
                  {spec.actions.map((action, i) => (
                    <button
                      key={action}
                      onClick={() => dispatch({ type: "action", index: i })}
                      disabled={i !== state.completed}
                      className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs disabled:opacity-55"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${i < state.completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}`}
                      >
                        {i < state.completed ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      {action}
                      {i === state.completed && (
                        <Play className="ml-auto h-3 w-3 shrink-0 text-blue-700" />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => dispatch({ type: "reset" })}
                  className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs text-slate-500"
                >
                  <RotateCcw className="h-3 w-3" />
                  Repeat procedure
                </button>
              </section>
              <section className="rounded-xl border bg-white p-4">
                <h2 className="text-xs font-medium text-slate-500">
                  Instrument reading
                </h2>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {measurementReady(spec, state) ? result : "—"}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    {spec.unit}
                  </span>
                </p>
                {spec.kind === "chromatography" && (
                  <p className="mt-2 text-xs text-slate-500">
                    Solvent front: {state.value.toFixed(1)} cm · spot:{" "}
                    {(state.value * 0.6).toFixed(1)} cm
                  </p>
                )}
                <label className="mt-4 block text-xs">
                  Observation
                  <textarea
                    aria-label="Practical observation"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="What changed? What did the instrument or model show?"
                    className={`${input} mt-2 py-2`}
                  />
                </label>
                <button
                  disabled={
                    !measurementReady(spec, state) ||
                    observation.trim().length < 8
                  }
                  onClick={() => dispatch({ type: "record", observation })}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Record trial
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </section>
            </aside>
          </div>
          {spec.kind === "cyber" && (
            <section
              className="rounded-xl border bg-[#101b2b] p-5 text-slate-200"
              aria-label="Simulated security event log"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Terminal className="h-4 w-4" />
                School network · simulation console
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Contained practice network. No live connections or executable
                attack code.
              </p>
              <ol className="mt-4 space-y-2 font-mono text-xs leading-6">
                {[
                  "Workstation powered on.",
                  "Local switch connected.",
                  "THREAT: " +
                    [
                      "unexpected service probe reached the workstation.",
                      "three repeated sign-in attempts detected.",
                      "suspicious attachment reached the model inbox.",
                    ][state.value - 1],
                  "DEFENCE: " +
                    [
                      "inbound service rule enabled.",
                      "sign-in rate limit enabled.",
                      "attachment filter enabled.",
                    ][state.value - 1],
                  "RETEST: 3 of 3 scenario events blocked.",
                ]
                  .slice(0, state.completed)
                  .map((line, i) => (
                    <li
                      key={line}
                      className={
                        i === 2
                          ? "text-amber-300"
                          : i >= 3
                            ? "text-emerald-300"
                            : "text-slate-300"
                      }
                    >
                      {String(i + 1).padStart(2, "0")} · {line}
                    </li>
                  ))}
                {!state.completed && (
                  <li>
                    Workstation is off. Pick it up, position it and press Power
                    computer.
                  </li>
                )}
              </ol>
            </section>
          )}
        </>
      )}
      {tab === "results" && (
        <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Experimental record</h2>
            <button
              className="min-h-10 rounded-lg border px-4 text-xs"
              onClick={() => {
                setTab("bench");
              }}
            >
              Return to practical
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead className="border-b text-slate-500">
                <tr>
                  {[
                    "Trial",
                    spec.variable,
                    `Reading / ${spec.unit}`,
                    "Procedure",
                    "Observation",
                  ].map((h) => (
                    <th key={h} className="p-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.trials.map((t, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 tabular-nums">{t.setting}</td>
                    <td className="p-3 font-semibold tabular-nums">
                      {t.result}
                    </td>
                    <td className="p-3">
                      {t.actions}/{spec.actions.length}
                    </td>
                    <td className="max-w-80 break-words p-3 leading-6">
                      {t.observation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!state.trials.length && (
            <p className="text-sm text-slate-500">
              Carry out your first trial at the 3D bench.
            </p>
          )}
          <p className="rounded-lg bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            {spec.explain}
          </p>
          <label className="block text-sm font-semibold">
            {junior
              ? "What did you discover?"
              : "Evidence, explanation & evaluation"}
            <textarea
              aria-label="Workshop conclusion"
              value={draft.conclusion}
              maxLength={5000}
              onChange={(e) => update({ conclusion: e.target.value })}
              rows={5}
              className={`${input} mt-3 py-3`}
              placeholder={
                junior
                  ? "Compare two results. Explain what changed and one way to make the test fair."
                  : "Use your readings and the model relationship. Explain controlled variables, limitations and one improvement."
              }
            />
          </label>
          {questions.map((q) => (
            <label key={q.id} className="block text-sm">
              {q.questionText}
              <textarea
                aria-label={`Lab question ${q.id}`}
                value={draft.answers[q.id] ?? ""}
                onChange={(e) =>
                  update({
                    answers: { ...draft.answers, [q.id]: e.target.value },
                  })
                }
                className={`${input} mt-2 py-2`}
                rows={2}
              />
            </label>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <p className="max-w-xl text-xs leading-6 text-slate-500">
              Record three trials across at least two settings, complete the
              full procedure at least once, and explain your findings. Saving
              requires a confirmed account response.
            </p>
            <button
              disabled={!ready || save.isPending || saved}
              onClick={() => save.mutate()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {save.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Report saved" : "Save practical report"}
            </button>
          </div>
          {save.isError && (
            <p role="alert" className="text-sm text-red-700">
              {apiErrorMessage(
                save.error,
                "The account save failed. Your browser draft is kept; retry or export it.",
              )}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-emerald-700">
              Practical report saved to your account.
            </p>
          )}
          {stored && !state.events.length && (
            <button
              className="min-h-10 text-sm underline"
              onClick={() => {
                try {
                  replayPractical(spec, stored.events as PracticalEvent[]);
                  update({
                    events: stored.events as PracticalEvent[],
                    conclusion: String(stored.conclusion ?? ""),
                  });
                  setSaved(true);
                } catch {
                  setMessage("This older report cannot be restored.");
                }
              }}
            >
              Load previous account report
            </button>
          )}
        </section>
      )}
      {tab === "brief" && (
        <section className="max-w-3xl space-y-5 rounded-xl border bg-white p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{lab.grade} practical brief</h2>
          <p className="text-sm leading-7">{lab.description || spec.goal}</p>
          <p className="text-sm leading-7 text-slate-600">
            {junior
              ? "Explore the equipment, change one variable and compare your observations. Explain a fair test using your own words."
              : "Plan controlled comparisons, record quantitative evidence and evaluate the relationship against the model assumptions."}
          </p>
          {lab.juniorVersion && junior && (
            <p className="text-sm leading-7">{lab.juniorVersion}</p>
          )}
          {lab.seniorVersion && !junior && (
            <p className="text-sm leading-7">{lab.seniorVersion}</p>
          )}
          {(lab.steps?.length ?? 0) > 0 && (
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Teacher’s instructions
              </summary>
              <ol className="mt-3 space-y-3 text-sm leading-7">
                {[...(lab.steps ?? [])]
                  .sort((a, b) => a.order - b.order)
                  .map((step) => (
                    <li key={step.id}>
                      <strong>{step.title}</strong>
                      <p>{step.instruction}</p>
                    </li>
                  ))}
              </ol>
            </details>
          )}
          {((lab.media?.length ?? 0) > 0 ||
            !!lab.resourceUrl ||
            !!lab.introVideoUrl) && (
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Supporting resources
              </summary>
              <div className="mt-3 space-y-3">
                {[lab.resourceUrl, lab.introVideoUrl]
                  .filter(
                    (url): url is string => !!url && /^https?:\/\//.test(url),
                  )
                  .map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-blue-700 underline"
                    >
                      Teacher demonstration
                    </a>
                  ))}
                {lab.media
                  ?.filter(
                    (m) => /^https?:\/\//.test(m.url) || m.url.startsWith("/"),
                  )
                  .map((m) => (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-blue-700 underline"
                    >
                      {m.title || "Open practical resource"}
                    </a>
                  ))}
              </div>
            </details>
          )}
          {(lab.reflectionPrompts?.length ?? 0) > 0 && (
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Teacher’s reflection prompts
              </summary>
              <p className="mt-3 text-xs text-slate-500">
                Address these prompts in your notebook conclusion.
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-7">
                {lab.reflectionPrompts?.map((prompt) => (
                  <li key={prompt.id}>{prompt.prompt}</li>
                ))}
              </ul>
            </details>
          )}
          {hasEarlierNotebook(userId, lab.id) && (
            <button
              className="min-h-10 text-xs underline"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      localStorage.getItem(
                        `stem-notebook-v1:${userId}:${lab.id}`,
                      ) ?? "{}",
                    ],
                    { type: "application/json" },
                  ),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = `${lab.key}-earlier-notebook.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Export earlier notebook
            </button>
          )}
          <div className="rounded-lg bg-slate-50 p-4 text-sm leading-7">
            <h3 className="font-semibold">Model & limitations</h3>
            <p className="mt-2">{spec.explain}</p>
          </div>
          <div className="flex gap-3 text-sm leading-7">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <h3 className="font-semibold">Work safely</h3>
              <p className="mt-1 text-slate-600">
                These are virtual teaching models. Physical work needs teacher
                supervision and suitable equipment. Do not handle mains
                electricity, unknown chemicals or real emergency casualties to
                repeat a browser activity.
              </p>
              {lab.safetyChecklist?.map((s) => (
                <p key={s} className="mt-2">
                  {s}
                </p>
              ))}
            </div>
          </div>
          <details className="border-t pt-4">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              Curriculum context
              <ChevronDown className="h-3 w-3" />
            </summary>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              Assignment Hub teaching adaptation using the KICD Basic Education
              Curriculum Framework: inquiry, problem solving, digital literacy
              and evidence-based reflection. Subject sequencing follows the
              grade assigned to this lab by the platform; this is not an
              official KICD-approved subject-design mapping.
            </p>
            {lab.learningOutcomes?.map((o) => (
              <p key={o} className="mt-2 text-xs leading-6">
                {o}
              </p>
            ))}
            <a
              href={gradeDesignLink(lab.grade).url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs text-blue-700 underline"
            >
              KICD grade curriculum designs
            </a>
          </details>
        </section>
      )}
    </div>
  );
}
