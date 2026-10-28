import { useEffect, useMemo, useRef, useState } from "react";
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
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Headphones,
  GraduationCap,
} from "lucide-react";
import type { Lab } from "../../../../types";
import {
  replayStarch,
  starchReady,
  type LeafSample,
  type StarchResult,
  type StarchEvent,
} from "../../../../../../backend/src/labs/starch-engine";
import { useStudio, StudioReport, StudioBrief } from "./useStudio";
import { starchGuide, starchInstruction } from "./starch-guide";
import { useLabNarration } from "./useLabNarration";
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
    { state: selfState, draft, dispatch } = studio;
  const [mode, setMode] = useState<"guided" | "self">("guided"),
    [demoSample, setDemoSample] = useState<LeafSample>("light"),
    [demoEvents, setDemoEvents] = useState<StarchEvent[]>([]),
    [guideIndex, setGuideIndex] = useState(0),
    [running, setRunning] = useState(false),
    [demoComplete, setDemoComplete] = useState(false),
    [voice, setVoice] = useState(true),
    [replayKey, setReplayKey] = useState(0);
  const narrator = useLabNarration(),
    cursor = useRef({ step: 0, action: 0 });
  const guide = useMemo(() => starchGuide(demoSample), [demoSample]);
  const demoState = useMemo(
    () => replayStarch([{ type: "sample", sample: demoSample }, ...demoEvents]),
    [demoSample, demoEvents],
  );
  const state = mode === "guided" ? demoState : selfState;
  const instruction = starchInstruction(selfState);
  const resetDemo = () => {
    setRunning(false);
    narrator.stop();
    setDemoEvents([]);
    setGuideIndex(0);
    cursor.current = { step: 0, action: 0 };
    setDemoComplete(false);
  };
  const changeMode = (next: "guided" | "self") => {
    setRunning(false);
    narrator.stop();
    setMode(next);
    setTool("inspect");
  };
  useEffect(() => {
    if (mode !== "guided" || !running) return;
    let active = true;
    const step = guide[guideIndex];
    if (cursor.current.step !== guideIndex)
      cursor.current = { step: guideIndex, action: 0 };
    const wait = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    const actions = async () => {
      while (active && cursor.current.action < step.events.length) {
        const e = step.events[cursor.current.action++];
        setDemoEvents((previous) => [...previous, e]);
        await wait(700);
      }
    };
    const narration =
      voice && narrator.available
        ? narrator.speak(step.caption)
        : wait(Math.max(2800, step.caption.split(/\s+/).length * 260));
    void Promise.all([actions(), narration, wait(2500)]).then(() => {
      if (!active) return;
      if (guideIndex < guide.length - 1) setGuideIndex((i) => i + 1);
      else {
        setRunning(false);
        setDemoComplete(true);
      }
    });
    return () => {
      active = false;
      narrator.stop();
    };
  }, [
    mode,
    running,
    guideIndex,
    guide,
    voice,
    replayKey,
    narrator.available,
    narrator.speak,
    narrator.stop,
  ]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) {
        setRunning(false);
        narrator.stop();
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [narrator.stop]);
  const [tool, setTool] = useState<
      "inspect" | "striker" | "forceps" | "ethanol" | "tube" | "dropper"
    >("inspect"),
    [tip, setTip] = useState(
      "Select a tool, then its receiving apparatus. Drag empty space to rotate the view.",
    ),
    [notes, setNotes] = useState(""),
    [result, setResult] = useState<StarchResult>("blue-black"),
    [notebook, setNotebook] = useState(false);
  useEffect(() => {
    if (mode !== "self" || !voice || notebook) return;
    void narrator.speak(instruction);
    return () => narrator.stop();
  }, [mode, voice, instruction, notebook, narrator.speak, narrator.stop]);
  const live = useRef({ state: selfState, dispatch, mode, notebook });
  live.current = { state: selfState, dispatch, mode, notebook };
  useEffect(() => {
    const timer = window.setInterval(() => {
      const {
        state: s,
        dispatch: d,
        mode: currentMode,
        notebook: inNotebook,
      } = live.current;
      if (currentMode !== "self" || inNotebook || document.hidden) return;
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
    if (mode === "guided") return;
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
        <button
          className={button}
          onClick={() => {
            setRunning(false);
            narrator.stop();
            if (!notebook) changeMode("self");
            setNotebook(!notebook);
          }}
        >
          <BookOpen className="mr-2 inline" size={16} />
          {notebook ? "Workspace" : `Notebook · ${selfState.trials.length}`}
        </button>
      </header>
      {!notebook ? (
        <>
          <section
            className="rounded-xl border bg-white p-4 sm:p-5"
            aria-label="Practical mode and narration"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="inline-flex rounded-lg bg-slate-100 p-1"
                role="group"
                aria-label="Practical mode"
              >
                <button
                  className={`${button} border-transparent ${mode === "guided" ? "bg-white shadow-sm" : ""}`}
                  aria-pressed={mode === "guided"}
                  onClick={() => changeMode("guided")}
                >
                  <Headphones size={16} className="mr-2 inline" />
                  Guided demonstration
                </button>
                <button
                  className={`${button} border-transparent ${mode === "self" ? "bg-white shadow-sm" : ""}`}
                  aria-pressed={mode === "self"}
                  onClick={() => changeMode("self")}
                >
                  <GraduationCap size={16} className="mr-2 inline" />
                  Self practical
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  aria-pressed={voice}
                  disabled={!narrator.available}
                  onClick={() => {
                    narrator.stop();
                    setVoice((v) => !v);
                  }}
                >
                  {voice ? (
                    <Volume2 size={15} className="mr-2 inline" />
                  ) : (
                    <VolumeX size={15} className="mr-2 inline" />
                  )}
                  {!narrator.available
                    ? "Voice unavailable"
                    : voice
                      ? "Voice on"
                      : "Voice off"}
                </button>
                <button
                  disabled={!narrator.available}
                  className={button}
                  onClick={() => {
                    if (mode === "guided" && running)
                      setReplayKey((k) => k + 1);
                    else
                      void narrator.speak(
                        mode === "guided"
                          ? guide[guideIndex].caption
                          : instruction,
                      );
                  }}
                >
                  <Volume2 size={15} className="mr-2 inline" />
                  Replay narration
                </button>
                {narrator.speaking && !running && (
                  <button className={button} onClick={narrator.stop}>
                    Stop voice
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t pt-4">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                  {mode === "guided"
                    ? `Demonstration · ${guideIndex + 1} of ${guide.length}`
                    : "Your turn · operate the apparatus"}
                </p>
                <h2 className="mt-2 font-semibold">
                  {mode === "guided"
                    ? guide[guideIndex].title
                    : "Complete your own investigation"}
                </h2>
                <p
                  aria-label="Narration transcript"
                  className="mt-2 text-sm leading-7 text-slate-600"
                  aria-live="polite"
                >
                  {mode === "guided" ? guide[guideIndex].caption : instruction}
                </p>
              </div>
              {mode === "guided" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`${button} bg-blue-700 text-white`}
                    disabled={demoComplete}
                    onClick={() => setRunning((v) => !v)}
                  >
                    {running ? (
                      <Pause size={15} className="mr-2 inline" />
                    ) : (
                      <Play size={15} className="mr-2 inline" />
                    )}
                    {running
                      ? "Pause demonstration"
                      : demoComplete
                        ? "Demonstration complete"
                        : guideIndex === 0 && demoEvents.length === 0
                          ? "Start demonstration"
                          : "Continue demonstration"}
                  </button>
                  <button className={button} onClick={resetDemo}>
                    <RotateCcw size={15} className="mr-2 inline" />
                    Restart
                  </button>
                  {demoComplete && (
                    <button
                      className={button}
                      onClick={() => changeMode("self")}
                    >
                      Try it myself
                    </button>
                  )}
                </div>
              )}
            </div>
            {mode === "guided" && (
              <p className="mt-3 text-xs text-slate-500">
                The equipment operates automatically after you press Start. Your
                own practical and notebook are kept separately.
              </p>
            )}
            {!narrator.available && (
              <p className="mt-3 text-xs text-slate-500">
                This browser does not support voice playback. Follow the full
                captions; the demonstration still runs.
              </p>
            )}
            {!!narrator.error && (
              <p role="status" className="mt-3 text-xs text-amber-800">
                {narrator.error}
              </p>
            )}
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
            <label className="text-sm">
              Prepared sample{" "}
              <select
                aria-label="Leaf sample"
                className="ml-2 rounded-lg border p-2"
                value={state.sample}
                onChange={(e) => {
                  if (mode === "guided") {
                    resetDemo();
                    setDemoSample(e.target.value as LeafSample);
                    return;
                  }
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
              disabled={mode === "guided" || state.ppe}
              onClick={() => dispatch({ type: "ppe" })}
            >
              <ShieldCheck className="mr-2 inline" size={16} />
              {state.ppe ? "Eye protection on" : "Put on eye protection"}
            </button>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
            <section className="overflow-hidden rounded-xl border bg-white">
              <StarchScene state={state} onTarget={target} />
              {mode === "self" && (
                <>
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
                </>
              )}
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
              {mode === "self" ? (
                <>
                  <label className="block text-xs font-medium">
                    Observed iodine result
                    <select
                      aria-label="Iodine result"
                      className="mt-2 w-full rounded-lg border p-2"
                      value={result}
                      onChange={(e) =>
                        setResult(e.target.value as StarchResult)
                      }
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
                    {state.recorded
                      ? "Observation recorded"
                      : "Record observation"}
                  </button>
                </>
              ) : (
                <p className="rounded-lg bg-blue-50 p-3 text-xs leading-6 text-blue-800">
                  Watch how the apparatus is used. Switch to Self practical to
                  make your own transfers and record observations.
                </p>
              )}
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
          ready={starchReady(selfState, draft.conclusion)}
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
          {selfState.trials.map((t, i) => (
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
