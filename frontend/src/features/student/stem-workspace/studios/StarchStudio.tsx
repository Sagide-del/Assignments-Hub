import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Flame,
  ShieldCheck,
  BookOpen,
  MousePointer2,
  Beaker,
  Pipette,
  Scissors,
} from "lucide-react";
import type { Lab } from "../../../../types";
import {
  replayStarch,
  starchReady,
  type LeafSample,
  type StarchResult,
} from "../../../../../../backend/src/labs/starch-engine";
import { useStudio, StudioReport, StudioBrief } from "./useStudio";
import StarchScene, { type StarchTarget } from "./StarchScene";
const button =
  "min-h-11 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-40";
const targets: [StarchTarget, string][] = [
  ["burner", "Bunsen burner"],
  ["bath", "Water bath"],
  ["tube", "Ethanol tube"],
  ["ethanol", "Ethanol bottle"],
  ["rinse", "Rinse beaker"],
  ["tile", "White tile"],
  ["iodine", "Iodine bottle"],
  ["leaf", "Prepared leaf"],
];
export default function StarchStudio({
  lab,
  userId,
}: {
  lab: Lab;
  userId: number;
}) {
  const studio = useStudio({
      lab,
      userId,
      version: "starch-studio-v1",
      replay: replayStarch,
    }),
    { state, draft, dispatch } = studio;
  const [tool, setTool] = useState<
      "inspect" | "striker" | "forceps" | "ethanol" | "tube" | "dropper"
    >("inspect"),
    [tip, setTip] = useState(
      "Put on eye protection, select the striker and click the burner.",
    ),
    [notes, setNotes] = useState(""),
    [result, setResult] = useState<StarchResult>("blue-black"),
    [notebook, setNotebook] = useState(false);
  const live = useRef({ state, dispatch });
  live.current = { state, dispatch };
  useEffect(() => {
    const timer = window.setInterval(() => {
      const { state: s, dispatch: d } = live.current;
      if (
        (s.burner &&
          (s.waterTemperature < 100 ||
            (s.leaf === "water" && s.boilSeconds < 30))) ||
        (!s.burner &&
          s.tubeInBath &&
          s.extractSeconds < 60 &&
          s.waterTemperature >= 70)
      )
        d({ type: "heat", seconds: 5 });
    }, 500);
    return () => clearInterval(timer);
  }, []);
  const target = (t: StarchTarget) => {
    if (tool === "striker" && t === "burner") {
      dispatch({ type: "burner", on: !state.burner });
      return;
    }
    if (tool === "ethanol" && t === "tube") {
      dispatch({ type: "ethanol-fill" });
      return;
    }
    if (tool === "tube" && t === "bath") {
      dispatch({ type: "tube-bath" });
      return;
    }
    if (tool === "dropper" && t === "iodine") {
      dispatch({ type: "load-iodine" });
      return;
    }
    if (tool === "dropper" && t === "tile") {
      dispatch({ type: "iodine" });
      return;
    }
    if (tool === "forceps") {
      if (t === "bath") {
        dispatch({ type: "leaf-water" });
        return;
      }
      if (t === "tube") {
        dispatch({ type: "leaf-ethanol" });
        return;
      }
      if (t === "rinse") {
        dispatch({ type: "rinse" });
        return;
      }
      if (t === "tile") {
        dispatch({ type: "dish" });
        return;
      }
    }
    setTip(
      tool === "inspect"
        ? {
            burner:
              "Blue flame heats the water bath. Extinguish it before opening ethanol.",
            bath: "Boiling water kills the leaf and disrupts cells. The hot bath later warms ethanol off-flame.",
            tube: "Ethanol removes chlorophyll. Never place ethanol directly over a flame.",
            ethanol:
              "Flammable solvent. Select the ethanol bottle tool, then the tube; the burner must be off.",
            rinse:
              "Warm water softens the decolourised leaf and rinses off ethanol.",
            tile: "The white background makes the iodine colour easier to compare.",
            iodine:
              "Iodine turns blue-black where starch is present, and stays yellow-brown where it is absent.",
            leaf: "Prepared specimens: light-grown and destarched dark-control leaves from otherwise comparable plants.",
          }[t]
        : "That tool does not act on this apparatus. Choose a matching tool and destination.",
    );
  };
  const stage = state.iodineApplied
    ? 5
    : state.leaf === "rinsed" || state.leaf === "dish"
      ? 4
      : state.extractSeconds >= 60
        ? 3
        : state.leaf === "ethanol"
          ? 2
          : state.boilSeconds >= 30
            ? 1
            : 0;
  const steps = [
    "Boil prepared leaf in water",
    "Extinguish flame; transfer into ethanol",
    "Warm tube in off-flame bath",
    "Rinse the pale leaf",
    "Spread on tile; add iodine",
    "Record & compare with dark control",
  ];
  return (
    <div className="space-y-5 text-slate-800">
      <Link
        to="/student/stem-labs"
        className="inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} />
        Laboratory
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            {lab.grade} · Biology · Plant nutrition
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            Testing a leaf for starch
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            A controlled investigation of light and photosynthesis.
          </p>
        </div>
        <button className={button} onClick={() => setNotebook(!notebook)}>
          <BookOpen className="mr-2 inline" size={16} />
          {notebook ? "Workspace" : `Notebook · ${state.trials.length}`}
        </button>
      </header>
      {!notebook ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
            <label className="text-sm">
              Prepared sample{" "}
              <select
                aria-label="Leaf sample"
                className="ml-2 rounded-lg border p-2"
                value={state.sample}
                onChange={(e) => {
                  if (
                    dispatch({
                      type: "sample",
                      sample: e.target.value as LeafSample,
                    })
                  ) {
                    setNotes("");
                    setTool("inspect");
                  }
                }}
              >
                <option value="light">Light-grown leaf</option>
                <option value="dark">Destarched dark control</option>
                <option value="variegated">Variegated leaf extension</option>
              </select>
            </label>
            <button
              className={`${button} ${state.ppe ? "border-emerald-200 text-emerald-700" : ""}`}
              disabled={state.ppe}
              onClick={() => dispatch({ type: "ppe" })}
            >
              <ShieldCheck className="mr-2 inline" size={16} />
              {state.ppe ? "Eye protection on" : "Put on eye protection"}
            </button>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
            <section className="overflow-hidden rounded-xl border bg-white">
              <StarchScene state={state} onTarget={target} />
              <div className="flex flex-wrap gap-2 border-t p-4">
                {(
                  [
                    ["inspect", "Inspect", MousePointer2],
                    ["striker", "Striker / gas", Flame],
                    ["forceps", "Forceps", Scissors],
                    ["ethanol", "Ethanol bottle", Beaker],
                    ["tube", "Tube holder", Beaker],
                    ["dropper", "Iodine dropper", Pipette],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    className={`${button} ${tool === id ? "bg-slate-900 text-white" : ""}`}
                    aria-pressed={tool === id}
                    key={id}
                    onClick={() => setTool(id)}
                  >
                    <Icon className="mr-2 inline" size={15} />
                    {label}
                  </button>
                ))}
              </div>
              <p
                className="px-4 pb-4 text-xs leading-6 text-slate-600"
                role="status"
              >
                {tip}
              </p>
              <details className="border-t p-4">
                <summary className="cursor-pointer text-xs font-semibold">
                  Apparatus controls · keyboard & small screens
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {targets.map(([id, label]) => (
                    <button
                      className={button}
                      key={id}
                      onClick={() => target(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </details>
            </section>
            <aside className="space-y-4 rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Practical procedure</h2>
              <ol className="space-y-3">
                {steps.map((s, i) => (
                  <li
                    key={s}
                    className={`flex gap-3 text-xs leading-5 ${i === stage ? "font-semibold text-blue-700" : "text-slate-500"}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${i < stage ? "bg-emerald-50 text-emerald-700" : i === stage ? "bg-blue-50" : "bg-slate-100"}`}
                    >
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
                <p>
                  Bath: <strong>{state.waterTemperature.toFixed(0)} °C</strong>{" "}
                  · Flame: <strong>{state.burner ? "lit" : "off"}</strong>
                </p>
                <p>Water preparation: {state.boilSeconds}/30 simulated s</p>
                <p>
                  Chlorophyll extraction: {state.extractSeconds}/60 simulated s
                </p>
                <p>
                  Dropper: {state.iodineLoaded ? "loaded with iodine" : "empty"}
                </p>
              </div>
              <p className="text-xs leading-5 text-amber-800">
                Ethanol is flammable. The burner must be off before ethanol is
                opened. This teaching model accelerates heating 10×; real
                timings depend on the apparatus.
              </p>
              {state.iodineApplied && (
                <div className="flex items-center gap-3 rounded-lg border p-3 text-xs">
                  <span
                    aria-hidden
                    className="h-8 w-8 rounded-full"
                    style={{
                      background:
                        state.sample === "dark"
                          ? "#ae6a24"
                          : state.sample === "variegated"
                            ? "linear-gradient(90deg,#25243f 60%,#ae6a24 60%)"
                            : "#25243f",
                    }}
                  />
                  Compare the observed colour with your prediction.
                </div>
              )}
              <label className="block text-xs font-medium">
                Observed iodine result
                <select
                  aria-label="Iodine result"
                  className="mt-2 w-full rounded-lg border p-2"
                  value={result}
                  onChange={(e) => setResult(e.target.value as StarchResult)}
                >
                  <option value="blue-black">Blue-black throughout</option>
                  <option value="yellow-brown">Yellow-brown</option>
                  <option value="patchy">
                    Blue-black in green regions only
                  </option>
                </select>
              </label>
              <textarea
                aria-label="Starch observation"
                rows={3}
                className="w-full rounded-lg border p-3 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What does this colour tell you about starch in the leaf?"
              />
              <button
                className={`${button} w-full bg-blue-700 text-white`}
                disabled={
                  !state.iodineApplied ||
                  state.recorded ||
                  notes.trim().length < 20
                }
                onClick={() =>
                  dispatch({ type: "record", result, explanation: notes })
                }
              >
                {state.recorded ? "Observation recorded" : "Record observation"}
              </button>
            </aside>
          </div>
          <details className="rounded-xl border bg-white p-5 text-sm leading-7">
            <summary className="cursor-pointer font-semibold">
              Why these steps? · experimental controls
            </summary>
            <p className="mt-3">
              Before the investigation, destarch comparable plants by keeping
              them in darkness, then expose one to light while keeping the
              control dark. This simulator starts with those prepared samples.
              Keep plant species, leaf age, water, carbon dioxide and exposure
              duration comparable. A positive starch test supports starch
              production; it does not measure a photosynthesis rate.
            </p>
            <p>
              Hot water prepares the tissue. Ethanol removes chlorophyll so it
              cannot mask the iodine colour; warm water rinses and softens the
              brittle leaf. Blue-black indicates starch. Yellow-brown is a
              negative result. A variegated leaf lets you compare green and
              non-green regions.
            </p>
          </details>
        </>
      ) : (
        <StudioReport
          lab={lab}
          conclusion={draft.conclusion}
          answers={draft.answers}
          onChange={(conclusion) => studio.update({ conclusion })}
          onAnswers={(answers) => studio.update({ answers })}
          ready={starchReady(state, draft.conclusion)}
          saved={studio.saved}
          pending={studio.save.isPending}
          error={studio.save.error}
          onSave={() => studio.save.mutate()}
          onExport={studio.exportReport}
          restore={studio.restore}
        >
          <p className="text-sm text-slate-500">
            Record both a light-grown leaf and a dark control before saving your
            comparison.
          </p>
          {state.trials.map((t, i) => (
            <article className="rounded-lg bg-slate-50 p-4 text-sm" key={i}>
              <strong>
                {t.sample} · {t.result}
              </strong>
              <p className="mt-2">{t.explanation}</p>
            </article>
          ))}
        </StudioReport>
      )}
      {studio.message && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          {studio.message}
        </p>
      )}
      {studio.storageError && (
        <p role="alert">
          Browser storage is unavailable. Export your work before leaving.
        </p>
      )}
      <StudioBrief lab={lab} />
    </div>
  );
}
