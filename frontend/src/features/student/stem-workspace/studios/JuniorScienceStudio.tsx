import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Save } from "lucide-react";
import type { Lab } from "../../../../types";
import {
  juniorDesign,
  juniorReading,
  juniorReady,
  replayJunior,
  focusTarget,
  JUNIOR_QUESTIONS,
  type JuniorConfig,
  type JuniorEvent,
} from "../../../../../../backend/src/labs/junior-science";
import { useStudio } from "./useStudio";
const Scene = lazy(() => import("./JuniorScienceScene"));
const input =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
export default function JuniorScienceStudio({
  lab,
  userId,
}: {
  lab: Lab;
  userId: number;
}) {
  const design = juniorDesign(lab.key)!;
  const studio = useStudio<JuniorEvent, ReturnType<typeof replayJunior>>({
    lab,
    userId,
    version: "junior-science-v1",
    replay: (events) => replayJunior(design.kind, events),
  });
  const { state, draft, dispatch, update } = studio;
  const [tab, setTab] = useState<"investigate" | "notebook">("investigate"),
    [observation, setObservation] = useState("");
  const reading = juniorReading(design.kind, state.config),
    questions = JUNIOR_QUESTIONS[design.kind];
  const configure = (change: Partial<JuniorConfig>) =>
    dispatch({ type: "configure", config: { ...state.config, ...change } });
  const assessment = studio.save.data?.completionSummary as
    { knowledgeCheck?: { score: number; maxScore: number } } | undefined;
  const ready =
    juniorReady(design.kind, state, draft.conclusion) &&
    (lab.questions ?? []).every((q) => draft.answers[q.id]?.trim());
  return (
    <main className="mx-auto max-w-6xl space-y-4 text-slate-900">
      <Link
        to="/student/stem-labs"
        className="inline-flex items-center gap-2 text-xs text-slate-600"
      >
        <ArrowLeft size={14} />
        Grade {design.grade} investigations
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
            Grade {design.grade} · {design.topic}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {design.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{design.question}</p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
          {state.trials.length} measurements
        </span>
      </header>
      <nav className="flex gap-1 border-b" aria-label="Investigation workspace">
        {(["investigate", "notebook"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`min-h-11 border-b-2 px-4 text-sm ${tab === t ? "border-teal-700 font-semibold" : "border-transparent text-slate-500"}`}
          >
            {t === "investigate" ? "Experiment" : "Evidence & understanding"}
          </button>
        ))}
      </nav>
      {tab === "investigate" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <section className="min-w-0 space-y-4">
            <Suspense fallback={<div className="h-72 bg-slate-100" />}>
              <Scene kind={design.kind} config={state.config} />
            </Suspense>
            {design.kind === "microscope" ? (
              <div className="flex items-center gap-5 rounded-xl border bg-slate-950 p-4 text-white">
                <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full border-4 border-slate-600 bg-white">
                  <img
                    alt="Simulated onion epidermis viewed through the eyepiece"
                    src="/stem/junior/onion-epidermis-simulated.webp"
                    className="h-full w-full object-cover"
                    style={{
                      transform: `scale(${state.config.objective / 4})`,
                      filter: `blur(${Math.min(12, Math.abs(state.config.focus - focusTarget(state.config.objective)) * 20)}px)`,
                    }}
                  />
                </div>
                <div>
                  <p className="text-lg font-bold">{reading.reading}×</p>
                  <p className="text-xs text-slate-300">
                    Field diameter {reading.secondary.toFixed(2)} mm
                  </p>
                  <p className="mt-3 text-xs">
                    {Math.abs(
                      state.config.focus - focusTarget(state.config.objective),
                    ) <= 0.08
                      ? "Specimen in focus"
                      : "Adjust focus to resolve the cell"}
                  </p>
                </div>
              </div>
            ) : design.kind === "waves" ? (
              <div className="rounded-xl border p-3">
                <div className="flex gap-4 text-[11px]">
                  <span className="text-blue-700">Wave A</span>
                  <span className="text-amber-700">Wave B</span>
                  <span className="text-purple-700">Resultant</span>
                </div>
                <svg
                  viewBox="0 0 600 160"
                  className="mt-2 w-full"
                  role="img"
                  aria-label="Individual and resultant wave displacement"
                >
                  <path d="M10 80H590" stroke="#cbd5e1" />
                  {[0, 1, 2].map((index) => (
                    <path
                      key={index}
                      fill="none"
                      stroke={["#2563eb", "#d97706", "#7c3aed"][index]}
                      strokeWidth="2"
                      d={Array.from({ length: 181 }, (_, i) => {
                        const a =
                            state.config.amplitude *
                            22 *
                            Math.sin((i / 180) * Math.PI * 4),
                          b =
                            state.config.amplitude *
                            22 *
                            Math.sin(
                              (i / 180) * Math.PI * 4 +
                                (state.config.phase * Math.PI) / 180,
                            );
                        return `${i ? "L" : "M"}${10 + (i / 180) * 580},${80 - (index === 0 ? a : index === 1 ? b : a + b)}`;
                      }).join(" ")}
                    />
                  ))}
                </svg>
                <p className="text-xs text-slate-600">
                  Resultant amplitude {reading.reading.toFixed(2)} cm ·
                  wavelength {reading.secondary.toFixed(2)} m
                </p>
              </div>
            ) : (
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold">
                  Account for the starting mixture: 10 g suspended solids + 7 g
                  dissolved salt
                </p>
                <div
                  className="mt-3 flex h-7 overflow-hidden rounded bg-sky-100"
                  role="img"
                  aria-label={`${reading.reading} grams retained, ${reading.secondary} grams suspended solids pass through`}
                >
                  <div
                    className="bg-amber-700"
                    style={{ width: `${reading.reading * 10}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span>{reading.reading} g retained</span>
                  <span>{reading.secondary} g solids pass through</span>
                </div>
                <p className="mt-3 text-xs font-semibold text-sky-800">
                  All 7 g dissolved salt passes through every filter.
                </p>
              </div>
            )}
            <p className="text-xs leading-5 text-slate-500">
              {design.limitation}
            </p>
          </section>
          <aside className="space-y-4 rounded-xl border bg-white p-4">
            <div>
              <h2 className="text-sm font-bold">1. Predict before measuring</h2>
              <p className="mt-1 text-xs text-slate-600">
                {design.kind === "filtration"
                  ? "Which filter will retain more suspended solids?"
                  : design.kind === "microscope"
                    ? "Which objective shows the smaller field of view?"
                    : "Which phase difference gives the greater resultant amplitude?"}
              </p>
              <select
                aria-label="Prediction"
                className={input + " mt-2"}
                disabled={!!state.trials.length}
                value={state.prediction}
                onChange={(e) =>
                  dispatch({ type: "predict", choice: e.target.value })
                }
              >
                <option value="">Choose your prediction</option>
                <option value="first">
                  {design.kind === "filtration"
                    ? "20 μm paper"
                    : design.kind === "microscope"
                      ? "4× objective"
                      : "0° phase"}
                </option>
                <option value="second">
                  {design.kind === "filtration"
                    ? "1000 μm sieve"
                    : design.kind === "microscope"
                      ? "40× objective"
                      : "180° phase"}
                </option>
                <option value="same">Both are the same</option>
              </select>
            </div>
            <div className="space-y-3 border-t pt-4">
              <h2 className="text-sm font-bold">2. Change one variable</h2>
              {design.kind === "filtration" ? (
                <label className="block text-xs">
                  Filter opening
                  <select
                    aria-label="Filter opening"
                    className={input + " mt-1"}
                    value={state.config.filter}
                    onChange={(e) =>
                      configure({
                        filter: Number(
                          e.target.value,
                        ) as JuniorConfig["filter"],
                      })
                    }
                  >
                    <option value="20">Paper · 20 μm</option>
                    <option value="100">Cloth · 100 μm</option>
                    <option value="1000">Sieve · 1000 μm</option>
                  </select>
                </label>
              ) : design.kind === "microscope" ? (
                <>
                  <label className="block text-xs">
                    Objective
                    <select
                      aria-label="Objective"
                      className={input + " mt-1"}
                      value={state.config.objective}
                      onChange={(e) =>
                        configure({
                          objective: Number(
                            e.target.value,
                          ) as JuniorConfig["objective"],
                        })
                      }
                    >
                      {[4, 10, 40].map((n) => (
                        <option key={n} value={n}>
                          {n}× objective
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs">
                    Focus
                    <input
                      aria-label="Focus"
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={state.config.focus}
                      onChange={(e) =>
                        configure({ focus: Number(e.target.value) })
                      }
                      className="mt-3 w-full"
                    />
                  </label>
                </>
              ) : (
                <>
                  {(
                    [
                      ["phase", "Phase difference", [0, 90, 180]],
                      ["amplitude", "Amplitude / cm", [0.5, 1, 1.5, 2]],
                      ["frequency", "Frequency / Hz", [1, 2, 3, 4]],
                    ] as const
                  ).map(([key, label, values]) => (
                    <label key={key} className="block text-xs">
                      {label}
                      <select
                        aria-label={label}
                        className={input + " mt-1"}
                        value={state.config[key]}
                        onChange={(e) =>
                          configure({ [key]: Number(e.target.value) })
                        }
                      >
                        {values.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </>
              )}
              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5">
                <b>Keep constant:</b> {design.controlled}
              </p>
            </div>
            <div className="border-t pt-4">
              <h2 className="text-sm font-bold">3. Record your observation</h2>
              <textarea
                aria-label="Observation"
                className={input + " mt-2 py-2"}
                rows={3}
                maxLength={1500}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Describe what changed and quote a reading."
              />
              <button
                className="mt-2 min-h-11 w-full rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white"
                onClick={() => {
                  if (dispatch({ type: "record", observation }))
                    setObservation("");
                }}
              >
                Record measurement
              </button>
              <button
                onClick={() => setTab("notebook")}
                className="mt-2 min-h-10 w-full text-xs font-semibold underline"
              >
                Compare my evidence
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
          <h2 className="text-lg font-bold">
            Use measurements to explain the science
          </h2>
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Trial</th>
                  <th>Changed variable</th>
                  <th>Measurement</th>
                  <th>Observation</th>
                </tr>
              </thead>
              <tbody>
                {state.trials.map((t, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{i + 1}</td>
                    <td>
                      {design.kind === "filtration"
                        ? `${t.config.filter} μm`
                        : design.kind === "microscope"
                          ? `${t.config.objective}×`
                          : `${t.config.phase}°`}
                    </td>
                    <td>
                      {t.reading.toFixed(2)} {reading.unit}
                    </td>
                    <td className="max-w-xs p-2">{t.observation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="block text-sm font-semibold">
            Explain your controlled comparison
            <textarea
              aria-label="Investigation conclusion"
              className={input + " mt-2 py-3 font-normal"}
              rows={4}
              value={draft.conclusion}
              maxLength={5000}
              onChange={(e) => update({ conclusion: e.target.value })}
              placeholder="Compare two readings. Explain the pattern, what you kept constant and one limitation."
            />
          </label>
          {questions.map((q, i) => (
            <fieldset key={q.prompt} className="space-y-2">
              <legend className="mb-2 text-sm font-semibold">
                {i + 1}. {q.prompt}
              </legend>
              {q.options.map((option, j) => (
                <label
                  key={option}
                  className="flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm"
                >
                  <input
                    type="radio"
                    name={`junior-check-${i}`}
                    checked={state.answers[i] === j}
                    onChange={() =>
                      dispatch({ type: "answer", question: i, choice: j })
                    }
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          {(lab.questions ?? []).map((q) => (
            <fieldset key={q.id}>
              <legend className="mb-2 text-sm font-semibold">
                {q.questionText}
              </legend>
              {Array.isArray(q.options) &&
              q.options.some((option) => typeof option === "string") ? (
                q.options
                  .filter(
                    (option): option is string => typeof option === "string",
                  )
                  .map((option) => (
                    <label
                      key={option}
                      className="my-1 flex min-h-11 items-center gap-3 rounded border p-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={`teacher-question-${q.id}`}
                        checked={draft.answers[q.id] === option}
                        onChange={() =>
                          update({
                            answers: { ...draft.answers, [q.id]: option },
                          })
                        }
                      />
                      {option}
                    </label>
                  ))
              ) : (
                <textarea
                  aria-label={`Teacher question ${q.id}`}
                  className={input}
                  value={draft.answers[q.id] ?? ""}
                  onChange={(e) =>
                    update({
                      answers: { ...draft.answers, [q.id]: e.target.value },
                    })
                  }
                />
              )}
            </fieldset>
          ))}
          <p className="text-xs text-slate-500">
            Your explanation is saved as evidence. The knowledge check is
            assessed separately; a written reflection is not automatically
            certified as correct.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={!ready || studio.saved || studio.save.isPending}
              onClick={() => studio.save.mutate()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Save size={15} />
              {studio.saved ? "Investigation saved" : "Save investigation"}
            </button>
            <button
              onClick={studio.exportReport}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm"
            >
              <Download size={15} />
              Export notebook
            </button>
            {studio.restore && (
              <button
                onClick={studio.restore}
                className="min-h-11 text-xs underline"
              >
                Restore account notebook
              </button>
            )}
          </div>
          {studio.saved && (
            <p role="status" className="text-sm text-teal-800">
              Your measurements and explanation have been saved. Knowledge
              check: {assessment?.knowledgeCheck?.score ?? "—"}/
              {assessment?.knowledgeCheck?.maxScore ?? 2}.
            </p>
          )}
        </section>
      )}
      {studio.message && (
        <p
          role="status"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          {studio.message}
        </p>
      )}
      {studio.save.isError && (
        <p role="alert" className="text-sm text-red-700">
          Saving failed. Your device notebook is retained; please retry.
        </p>
      )}
      <details className="border-t pt-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold">
          What you should be able to explain
        </summary>
        <ul className="mt-3 list-disc space-y-2 pl-4">
          {design.outcomes.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </details>
    </main>
  );
}
