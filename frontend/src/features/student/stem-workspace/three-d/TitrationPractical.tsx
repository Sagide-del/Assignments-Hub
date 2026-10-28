import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Download,
  FlaskConical,
  Glasses,
  LoaderCircle,
  RotateCcw,
  Save,
} from "lucide-react";
import type { Lab } from "../../../../types";
import { labSessionsApi } from "../../../../api/labs.api";
import { apiErrorMessage } from "../../../../api/axios";
import {
  ALIQUOT_ML,
  BASE_MOLARITY,
  freshTitration,
  indicatorColour,
  practicalReady,
  reportText,
  restoreTitration,
  selectedResults,
  trialQuality,
  type TitrationDraft,
} from "./titration-model";
const LabScene3D = lazy(() => import("./LabScene3D"));
const CONTROL =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
export default function TitrationPractical({
  lab,
  userId,
}: {
  lab: Lab;
  userId: number;
}) {
  const key = `titration-3d-v1:${userId}:${lab.id}`;
  const [draft, setDraft] = useState<TitrationDraft>(() => {
    try {
      return restoreTitration(JSON.parse(localStorage.getItem(key) ?? "null"));
    } catch {
      return freshTitration();
    }
  });
  const latest = useRef(draft);
  latest.current = draft;
  const [tab, setTab] = useState<"bench" | "results" | "guide">("bench");
  const [mode, setMode] = useState<"guided" | "independent">("guided");
  const [selected, setSelected] = useState("Burette");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [view, setView] = useState("bench");
  const [valve, setValve] = useState(false);
  const [rate, setRate] = useState(1);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const quiz = draft.quiz;
  const setQuiz = (
    updater: (value: Record<number, string>) => Record<number, string>,
  ) => {
    setDraft((d) => ({ ...d, quiz: updater(d.quiz) }));
    setSaved(false);
  };
  const swirlUntil = useRef(0);
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const submittedSnapshot = useRef("");
  const update = (value: Partial<TitrationDraft>) => {
    setDraft((d) => ({ ...d, ...value }));
    setSaved(false);
  };
  const signal = (name: string) => setAction(`${name}-${Date.now()}`);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [draft, key]);
  useEffect(() => {
    if (!valve) return;
    let last = performance.now(),
      frame = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.15);
      last = now;
      setDraft((d) => {
        const next = Math.min(50 - d.initial, d.dispensed + dt * rate);
        return { ...d, dispensed: next, mixed: now < swirlUntil.current };
      });
      setSaved(false);
      if (latest.current.dispensed >= 50 - latest.current.initial - 0.001) {
        setValve(false);
        setMessage(
          "The burette is empty. Close this trial and prepare a fresh run.",
        );
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valve, rate]);
  useEffect(() => {
    const pause = () => {
      setValve(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const client = useQueryClient();
  const sessions = useQuery({
    queryKey: ["lab-sessions", "3d-reports", userId],
    queryFn: () => labSessionsApi.findAll(),
  });
  const storedReport = sessions.data?.find(
    (s) => s.labKey === lab.key && s.completionSummary,
  )?.completionSummary;
  const result = selectedResults(draft.trials, draft.selected);
  const questions = lab.questions ?? [];
  const ready =
    practicalReady(draft) && questions.every((q) => quiz[q.id]?.trim());
  const makePayload = () => ({
    labKey: lab.key,
    competency: lab.competency ?? undefined,
    answers: questions.map((q) => ({
      questionId: q.id,
      answer: quizRef.current[q.id] ?? "",
    })),
    practical: {
      version: "titration-3d-v1",
      trials: latest.current.trials,
      selected: latest.current.selected,
      calculation: Number(latest.current.calculation),
      conclusion: latest.current.conclusion,
    },
  });
  const completion = useMutation({
    mutationFn: () => {
      const payload = makePayload();
      submittedSnapshot.current = JSON.stringify(payload);
      return labSessionsApi.create(payload);
    },
    onSuccess: () => {
      setSaved(submittedSnapshot.current === JSON.stringify(makePayload()));
      void client.invalidateQueries({ queryKey: ["lab-sessions"] });
    },
  });
  const colour = draft.indicator
    ? indicatorColour(draft.dispensed)
    : "Colourless";
  const burette = draft.placements.Burette ?? { x: 0, z: 0, rotation: 0 },
    flaskPosition = draft.placements.Flask ?? { x: 0, z: 0, rotation: 0 };
  const apparatusAligned =
    Math.abs(burette.x) < 0.15 &&
    Math.abs(burette.z) < 0.15 &&
    Math.hypot(flaskPosition.x - burette.x, flaskPosition.z - burette.z) < 0.2;
  useEffect(() => {
    if (!apparatusAligned || held) setValve(false);
  }, [apparatusAligned, held]);
  const placeEquipment = (
    name: string,
    p: { x: number; z: number; rotation: number },
  ) => {
    setValve(false);
    setHeld(null);
    update({ placements: { ...latest.current.placements, [name]: p } });
  };
  const canDose =
    !held &&
    apparatusAligned &&
    draft.goggles &&
    draft.rinsed &&
    draft.filled &&
    draft.aliquot &&
    draft.indicator;
  function prepare(step: string) {
    setMessage("");
    if (step === "goggles") {
      update({ goggles: true });
      setSelected("Goggles");
      return;
    }
    if (!draft.goggles) {
      setMessage("Complete the eye-protection check first.");
      return;
    }
    if (step === "rinse") {
      update({ rinsed: true });
      setSelected("Burette");
      signal("rinse");
      return;
    }
    if (step === "fill" && draft.rinsed) {
      update({ filled: true });
      setSelected("Burette");
      signal("fill");
      return;
    }
    if (draft.dispensed > 0 || draft.recorded) {
      setMessage("Prepare a fresh trial before changing the sample.");
      return;
    }
    if (step === "pipette" && draft.filled && !draft.aliquot) {
      update({ pipetteVolume: 25 });
      setSelected("Pipette");
      signal("aspirate");
      setMessage(
        "25.00 mL HCl measured using the pipette filler. Select the flask to deliver it.",
      );
      return;
    }
    if (step === "deliver" && draft.pipetteVolume === 25 && !draft.aliquot) {
      update({ aliquot: true, pipetteVolume: 0 });
      setSelected("Pipette");
      signal("pipette");
      return;
    }
    if (step === "load-indicator" && draft.aliquot && !draft.indicator) {
      update({ dropperFilled: true });
      signal("load-indicator");
      setMessage(
        "Indicator dropper loaded. Select the conical flask to add two drops.",
      );
      return;
    }
    if (
      step === "indicator" &&
      draft.aliquot &&
      draft.dropperFilled &&
      !draft.indicator
    ) {
      update({ indicator: true, dropperFilled: false });
      setSelected("Flask");
      signal("indicator");
      return;
    }
    setMessage(
      "Complete the preparation in order and use the correct reagent and receiving vessel.",
    );
  }
  function useOn(target: string) {
    if (activeTool === "Pipette" && target === "HCl") return prepare("pipette");
    if (activeTool === "Pipette" && target === "Flask")
      return prepare("deliver");
    if (activeTool === "Dropper" && target === "Indicator")
      return prepare("load-indicator");
    if (activeTool === "Dropper" && target === "Flask")
      return prepare("indicator");
    if (activeTool === "Burette" && target === "NaOH") return prepare("fill");
    setMessage(
      activeTool === "Pipette"
        ? "Use the volumetric pipette for the HCl sample, then deliver into the flask. Indicator is added with a separate dropper; the pipette does not go into the burette."
        : "Choose the matching reagent bottle or receiving flask for this tool.",
    );
  }
  function newRun() {
    setActiveTool(null);
    setValve(false);
    setConfirmReset(false);
    setMessage(
      "Fresh aliquot ready to prepare. Your recorded trials are kept.",
    );
    setDraft((d) => ({
      ...freshTitration(),
      goggles: d.goggles,
      rinsed: d.rinsed,
      initial: Number((0.2 + (d.trials.length % 4) * 0.45).toFixed(2)),
      trials: d.trials,
      selected: d.selected,
      calculation: d.calculation,
      conclusion: d.conclusion,
      quiz: d.quiz,
      placements: d.placements,
      rough: d.trials.length === 0,
    }));
    setSaved(false);
    signal("reset");
  }
  function record() {
    if (draft.recorded) {
      setMessage(
        "This run is already recorded. Prepare a fresh trial before repeating.",
      );
      return;
    }
    if (valve || !draft.mixed || !canDose) {
      setMessage(
        "Close the tap, swirl the flask, and complete preparation before recording.",
      );
      return;
    }
    const initial = Number(draft.initialEntry),
      final = Number(draft.finalEntry);
    if (
      !draft.initialEntry.trim() ||
      !draft.finalEntry.trim() ||
      ![initial, final].every((n) => Number.isFinite(n) && n >= 0 && n <= 50) ||
      final < initial
    ) {
      setMessage(
        "Enter valid initial and final readings between 0 and 50 mL, with final ≥ initial.",
      );
      return;
    }
    if (draft.trials.length >= 20) {
      setMessage(
        "This notebook holds 20 trials. Export it before starting another notebook.",
      );
      return;
    }
    const trial = {
      id: (draft.trials.at(-1)?.id ?? 0) + 1,
      initial,
      final,
      dispensed: Number(draft.dispensed.toFixed(4)),
      rough: draft.rough,
      mixed: draft.mixed,
      colour,
      notes: draft.notes,
    };
    update({ trials: [...draft.trials, trial], recorded: true });
    setTab("results");
    setMessage(
      `Trial ${trial.id} recorded. ${mode === "guided" ? (trialQuality(trial) === "Overshot" ? "The endpoint was exceeded. Use single drops near the endpoint on the next run." : trialQuality(trial) === "Before endpoint" ? "The sample was still before the indicator endpoint." : trialQuality(trial) === "Check readings" ? "Your titre differs from the delivered volume. Recheck the meniscus and subtraction." : "Compare this run with your other observations.") : ""}`,
    );
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([reportText(draft)], { type: "text/plain" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "titration-practical-report.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            to="/student/stem-labs"
            className="inline-flex min-h-9 items-center gap-2 text-xs text-slate-500"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            STEM Labs
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Acid–base titration
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {lab.grade} · Chemistry · Interactive 3D practical
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            className={`text-xs ${storageError ? "text-amber-800" : "text-slate-500"}`}
          >
            {storageError
              ? "Browser saving unavailable"
              : "Saved in this browser"}
          </span>
          <button
            type="button"
            onClick={download}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-medium"
          >
            <Download className="h-4 w-4" />
            Export notebook
          </button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Practical workspace"
          className="flex gap-1 rounded-lg bg-slate-100 p-1"
        >
          {(["bench", "results", "guide"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setValve(false);
                setTab(t);
              }}
              className={`min-h-10 rounded-md px-4 text-xs font-semibold ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              {t === "bench"
                ? "Lab bench"
                : t === "results"
                  ? `Results (${draft.trials.length})`
                  : "Method & safety"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Practice mode
          <select
            aria-label="Practice mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            className="min-h-10 rounded-lg border bg-white px-3 text-xs"
          >
            <option value="guided">Guided</option>
            <option value="independent">Independent practice</option>
          </select>
        </label>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900"
        >
          {message}
        </p>
      )}
      {tab === "bench" && (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section
            className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
            aria-label="3D laboratory bench"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <FlaskConical className="h-4 w-4" />
                {selected}
              </span>
              <div className="flex gap-1">
                {[
                  ["bench", "Whole bench"],
                  ["meniscus", "Burette reading"],
                  ["flask", "Flask"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                    className={`min-h-9 rounded-md px-2 text-[11px] ${view === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[430px] min-w-0 sm:h-[560px]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Building your 3D bench…
                  </div>
                }
              >
                <LabScene3D
                  state={{
                    reading: draft.filled
                      ? draft.initial + draft.dispensed
                      : 50,
                    volume: draft.dispensed,
                    colour,
                    valve,
                    mixed: draft.mixed,
                    aliquot: draft.aliquot,
                    indicator: draft.indicator,
                    pipetteVolume: draft.pipetteVolume,
                    dropperFilled: draft.dropperFilled,
                    action,
                  }}
                  view={view}
                  activeTool={activeTool}
                  onTarget={useOn}
                  onSelect={setSelected}
                  placements={draft.placements}
                  held={held}
                  onPick={(name) => {
                    setValve(false);
                    setSelected(name);
                    setHeld(name);
                  }}
                  onPlace={placeEquipment}
                />
              </Suspense>
            </div>
            <div className="border-t bg-slate-50 p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {["Pipette", "Dropper", "Burette"].map((tool) => (
                  <button
                    key={tool}
                    aria-pressed={activeTool === tool}
                    className={`min-h-11 rounded-lg border px-3 text-xs ${activeTool === tool ? "bg-blue-700 text-white" : "bg-white"}`}
                    onClick={() => {
                      setHeld(null);
                      setValve(false);
                      setActiveTool(activeTool === tool ? null : tool);
                    }}
                  >
                    Use {tool.toLowerCase()}
                  </button>
                ))}
                {activeTool && (
                  <button
                    className="min-h-11 px-3 text-xs underline"
                    onClick={() => setActiveTool(null)}
                  >
                    Put tool down
                  </button>
                )}
              </div>
              <p className="text-xs leading-6 text-slate-600">
                {activeTool
                  ? `Using ${activeTool.toLowerCase()}: select a labelled reagent bottle, then the receiving flask.`
                  : "Select a tool to transfer liquids, or drag apparatus to arrange your bench."}{" "}
                Pipette: {draft.pipetteVolume.toFixed(2)} mL · Dropper:{" "}
                {draft.dropperFilled ? "indicator loaded" : "empty"}
              </p>
              {activeTool && (
                <div className="flex flex-wrap gap-2">
                  {["HCl", "NaOH", "Indicator", "Flask"].map((target) => (
                    <button
                      key={target}
                      className="min-h-10 rounded-lg border bg-white px-3 text-xs"
                      onClick={() => useOn(target)}
                    >
                      {target === "Flask"
                        ? "Conical flask"
                        : target === "HCl"
                          ? "HCl sample"
                          : target === "NaOH"
                            ? "NaOH stock"
                            : "Indicator bottle"}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs">
                <span
                  className="h-7 w-7 rounded-full border"
                  style={{
                    background:
                      colour === "Deep pink"
                        ? "#d81b70"
                        : colour === "Pale pink"
                          ? "#ef9fc3"
                          : "#fafafa",
                  }}
                />
                <span>
                  Flask: {draft.aliquot ? colour : "empty"}
                  {!draft.mixed && draft.dispensed > 0 ? " · swirl to mix" : ""}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t p-3">
              {["Burette", "Pipette", "Flask", "Indicator", "Goggles"].map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelected(name);
                      setView(
                        name === "Flask"
                          ? "flask"
                          : name === "Burette"
                            ? "meniscus"
                            : "bench",
                      );
                    }}
                    className={`min-h-9 rounded-md border px-3 text-xs ${selected === name ? "border-blue-300 bg-blue-50 text-blue-800" : "text-slate-500"}`}
                  >
                    {name}
                  </button>
                ),
              )}
            </div>
            <div
              className="flex flex-wrap gap-2 px-3 pb-3"
              aria-label="Equipment handling"
            >
              <button
                type="button"
                className="min-h-10 rounded-lg border px-3 text-xs"
                onClick={() => {
                  setValve(false);
                  setHeld(selected);
                }}
              >
                Pick up {selected}
              </button>
              <button
                type="button"
                className="min-h-10 rounded-lg border px-3 text-xs"
                onClick={() =>
                  placeEquipment(selected, { x: 0, z: 0, rotation: 0 })
                }
              >
                Return to original position
              </button>
              {selected === "Burette" && (
                <button
                  type="button"
                  className="min-h-10 rounded-lg bg-slate-900 px-3 text-xs text-white"
                  onClick={() =>
                    placeEquipment("Burette", { x: 0, z: 0, rotation: 0 })
                  }
                >
                  Clamp burette to stand
                </button>
              )}
              {selected === "Flask" && (
                <button
                  type="button"
                  className="min-h-10 rounded-lg bg-slate-900 px-3 text-xs text-white"
                  onClick={() => placeEquipment("Flask", { ...burette })}
                >
                  Place under burette
                </button>
              )}
              {selected === "Pipette" && (
                <button
                  type="button"
                  className="min-h-10 rounded-lg bg-slate-900 px-3 text-xs text-white"
                  onClick={() =>
                    placeEquipment("Pipette", {
                      x: flaskPosition.x - 1.15,
                      z: flaskPosition.z - 0.4,
                      rotation: 0,
                    })
                  }
                >
                  Position pipette at flask
                </button>
              )}
              <button
                type="button"
                className="min-h-10 rounded-lg border px-3 text-xs"
                onClick={() =>
                  placeEquipment(selected, { x: 1, z: 0.6, rotation: 0 })
                }
              >
                Place at side of bench
              </button>
            </div>
            {(!apparatusAligned || held) && (
              <p role="status" className="px-4 pb-3 text-xs text-amber-800">
                {held
                  ? `Holding ${held}. Place it before operating the tap.`
                  : "Clamp the burette to its stand and position the flask beneath the tip before titrating."}
              </p>
            )}
            <p className="px-4 pb-3 text-[11px] text-slate-500">
              Drag equipment to move it · drag empty space to orbit ·
              scroll/pinch to zoom. Equipment buttons offer keyboard access.
            </p>
          </section>
          <aside className="min-w-0 space-y-4" aria-label="Practical controls">
            <section className="rounded-xl border bg-white p-4">
              <h2 className="text-sm font-semibold">Prepare your apparatus</h2>
              <div className="mt-3 space-y-2">
                {[
                  {
                    id: "goggles",
                    label: "Eye protection checked",
                    done: draft.goggles,
                    enabled: true,
                  },
                  {
                    id: "rinse",
                    label: "Rinse burette with titrant",
                    done: draft.rinsed,
                    enabled: draft.goggles,
                  },
                  {
                    id: "fill",
                    label: "Fill burette with NaOH",
                    done: draft.filled,
                    enabled: draft.rinsed,
                  },
                  {
                    id: "pipette",
                    label: "Rinse & draw 25.00 mL HCl into pipette",
                    done: draft.pipetteVolume === 25 || draft.aliquot,
                    enabled: draft.filled,
                  },
                  {
                    id: "deliver",
                    label: "Deliver pipette sample into flask",
                    done: draft.aliquot,
                    enabled: draft.pipetteVolume === 25,
                  },
                  {
                    id: "load-indicator",
                    label: "Load separate indicator dropper",
                    done: draft.dropperFilled || draft.indicator,
                    enabled: draft.aliquot,
                  },
                  {
                    id: "indicator",
                    label: "Add two indicator drops into flask",
                    done: draft.indicator,
                    enabled: draft.dropperFilled,
                  },
                ].map((step, i) => (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!step.enabled || step.done || draft.dispensed > 0}
                    onClick={() => prepare(step.id)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-slate-200 px-3 text-left text-xs disabled:cursor-default disabled:opacity-60"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {step.done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {step.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-xl border bg-white p-4">
              <h2 className="text-sm font-semibold">Control the titration</h2>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                NaOH: {BASE_MOLARITY.toFixed(3)} mol/dm³ · HCl aliquot:{" "}
                {ALIQUOT_ML.toFixed(2)} mL
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">Burette reading</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {draft.filled
                      ? (draft.initial + draft.dispensed).toFixed(2)
                      : "—"}{" "}
                    <span className="text-xs font-normal">mL</span>
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500">
                    Mixed flask colour
                  </p>
                  <p className="mt-1 text-xs font-semibold">
                    {!draft.aliquot
                      ? "Empty"
                      : !draft.mixed
                        ? "Swirl to observe"
                        : colour}
                  </p>
                </div>
              </div>
              <label className="mt-4 block text-xs font-medium text-slate-600">
                Flow rate: {rate.toFixed(2)} mL/s
                <input
                  aria-label="Titrant flow rate"
                  type="range"
                  min="0.05"
                  max="1.5"
                  step="0.05"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="mt-2 w-full accent-blue-600"
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={
                    !canDose ||
                    draft.recorded ||
                    draft.dispensed >= 50 - draft.initial
                  }
                  onClick={() => setValve((v) => !v)}
                  className={`min-h-11 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-40 ${valve ? "bg-red-700" : "bg-blue-700"}`}
                >
                  {valve ? "Close tap" : "Open tap"}
                </button>
                <button
                  type="button"
                  disabled={
                    !canDose ||
                    draft.recorded ||
                    valve ||
                    draft.dispensed >= 50 - draft.initial
                  }
                  onClick={() => {
                    update({
                      dispensed: Math.min(
                        50 - draft.initial,
                        Number((draft.dispensed + 0.05).toFixed(4)),
                      ),
                      mixed: false,
                    });
                    signal("drop");
                  }}
                  className="min-h-11 rounded-lg border px-2 text-xs font-medium disabled:opacity-40"
                >
                  Add one drop · 0.05 mL
                </button>
                <button
                  type="button"
                  disabled={!draft.aliquot}
                  onClick={() => {
                    swirlUntil.current = performance.now() + 2000;
                    update({ mixed: true });
                    signal("swirl");
                  }}
                  className="min-h-11 rounded-lg border px-3 text-xs font-medium disabled:opacity-40"
                >
                  Swirl flask
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValve(false);
                    setConfirmReset(true);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Fresh trial
                </button>
              </div>
              {mode === "guided" && (
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {!canDose
                    ? "Complete preparation in order. Use a pipette filler, never your mouth."
                    : draft.dispensed < 20
                      ? "Record the initial meniscus, then open the tap. Slow down as you approach the colour change."
                      : !draft.mixed
                        ? "Swirl: a local pink streak is not a mixed endpoint."
                        : colour === "Deep pink"
                          ? "You overshot. Record the result, then try again with single drops."
                          : colour === "Pale pink"
                            ? "Close the tap. A faint pink endpoint should persist for about 30 seconds in a real practical."
                            : "Approach slowly, one drop at a time. Stop when faint pink persists after mixing."}
                </p>
              )}
            </section>
            <section className="rounded-xl border bg-white p-4">
              <h2 className="text-sm font-semibold">Record your readings</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[11px] text-slate-500">
                  Initial (mL)
                  <input
                    aria-label="Initial burette reading"
                    inputMode="decimal"
                    value={draft.initialEntry}
                    onChange={(e) => update({ initialEntry: e.target.value })}
                    placeholder="0.00"
                    className={`${CONTROL} mt-1`}
                  />
                </label>
                <label className="text-[11px] text-slate-500">
                  Final (mL)
                  <input
                    aria-label="Final burette reading"
                    inputMode="decimal"
                    value={draft.finalEntry}
                    onChange={(e) => update({ finalEntry: e.target.value })}
                    placeholder="0.00"
                    className={`${CONTROL} mt-1`}
                  />
                </label>
              </div>
              <label className="mt-3 flex min-h-9 items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={draft.rough}
                  onChange={(e) => update({ rough: e.target.checked })}
                />
                Rough trial
              </label>
              <textarea
                aria-label="Trial observation"
                rows={2}
                value={draft.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Colour change, endpoint, reading uncertainty…"
                className={`${CONTROL} py-2`}
              />
              <button
                type="button"
                onClick={record}
                disabled={!canDose || valve || !draft.mixed || draft.recorded}
                className="mt-3 min-h-11 w-full rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white disabled:opacity-40"
              >
                Record trial
              </button>
            </section>
          </aside>
        </div>
      )}
      {tab === "results" && (
        <section
          className="space-y-5 rounded-xl border bg-white p-4 sm:p-6"
          aria-label="Titration results"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Results notebook</h2>
              <p className="mt-1 text-xs text-slate-500">
                Exclude the rough run. Select at least two accurate titres
                within 0.10 mL.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                newRun();
                setTab("bench");
              }}
              className="min-h-10 rounded-lg border px-4 text-xs font-medium"
            >
              Prepare next trial
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b text-slate-500">
                <tr>
                  {[
                    "Use",
                    "Trial",
                    "Initial / mL",
                    "Final / mL",
                    "Titre / mL",
                    "Observation",
                    "Feedback",
                  ].map((h) => (
                    <th key={h} className="px-2 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draft.trials.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="p-2">
                      <input
                        aria-label={`Use trial ${t.id} in average`}
                        type="checkbox"
                        checked={draft.selected.includes(t.id)}
                        onChange={(e) =>
                          update({
                            selected: e.target.checked
                              ? [...draft.selected, t.id]
                              : draft.selected.filter((id) => id !== t.id),
                          })
                        }
                      />
                    </td>
                    <td className="p-2">
                      {t.id}
                      {t.rough ? " · rough" : ""}
                    </td>
                    <td className="p-2 tabular-nums">{t.initial.toFixed(2)}</td>
                    <td className="p-2 tabular-nums">{t.final.toFixed(2)}</td>
                    <td className="p-2 font-semibold tabular-nums">
                      {(t.final - t.initial).toFixed(2)}
                    </td>
                    <td className="max-w-48 break-words p-2">
                      {t.notes || t.colour}
                    </td>
                    <td className="p-2">
                      {mode === "guided"
                        ? trialQuality(t)
                        : "Review after calculation"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!draft.trials.length && (
            <p className="py-4 text-sm text-slate-500">
              No readings yet. Complete a trial at the lab bench.
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-semibold">Analyse your data</h3>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                HCl + NaOH → NaCl + H₂O. The mole ratio is 1:1. Use c(acid) =
                c(base) × mean titre ÷ 25.00.
              </p>
              <p className="mt-3 text-sm">
                Mean selected titre:{" "}
                <strong>{result.mean?.toFixed(2) ?? "—"} mL</strong>
              </p>
              <p
                className={`mt-2 text-xs ${result.concordant ? "text-emerald-700" : "text-amber-800"}`}
              >
                {result.concordant
                  ? "Concordant endpoint runs selected."
                  : "Select at least two non-rough endpoint runs with consistent readings."}
              </p>
              <label className="mt-4 block text-xs font-medium">
                Your HCl concentration (mol/dm³)
                <input
                  aria-label="Calculated acid concentration"
                  value={draft.calculation}
                  onChange={(e) => update({ calculation: e.target.value })}
                  inputMode="decimal"
                  placeholder="Calculate from your mean titre"
                  className={`${CONTROL} mt-2`}
                />
              </label>
              {draft.calculation && result.concordant && (
                <p className="mt-2 text-xs text-slate-500">
                  {Math.abs(
                    Number(draft.calculation) - (result.concentration ?? 0),
                  ) <= 0.0005
                    ? "Your calculation agrees with your selected readings."
                    : "Recheck units and the 1:1 reacting ratio."}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold">
                Conclusion & improvement
                <textarea
                  aria-label="Practical conclusion"
                  value={draft.conclusion}
                  onChange={(e) => update({ conclusion: e.target.value })}
                  rows={6}
                  placeholder="Explain your concentration estimate, endpoint evidence, and one way to reduce reading or endpoint error."
                  className={`${CONTROL} mt-3 py-3`}
                />
              </label>
              {questions.map((q) => (
                <label key={q.id} className="mt-3 block text-sm">
                  {q.questionText}
                  <textarea
                    aria-label={`Lab question ${q.id}`}
                    rows={2}
                    value={quiz[q.id] ?? ""}
                    onChange={(e) =>
                      setQuiz((previous) => ({
                        ...previous,
                        [q.id]: e.target.value,
                      }))
                    }
                    className={`${CONTROL} mt-2 py-2`}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <p className="max-w-xl text-xs leading-6 text-slate-500">
              Complete three trials, choose concordant accurate runs, calculate
              concentration and explain your findings. Your report is saved to
              your account only after the server confirms.
            </p>
            <button
              type="button"
              disabled={!ready || completion.isPending || saved}
              onClick={() => completion.mutate()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {completion.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Report saved" : "Save practical report"}
            </button>
          </div>
          {completion.isError && (
            <p role="alert" className="text-sm text-red-700">
              {apiErrorMessage(
                completion.error,
                "The report could not be saved. Export your notebook and retry.",
              )}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-emerald-700">
              Practical report saved to your account.
            </p>
          )}
          {storedReport && (
            <div className="text-xs text-slate-500">
              <p>
                A previous account report exists for this practical. Current
                browser readings are kept separately.
              </p>
              {!draft.trials.length && (
                <button
                  type="button"
                  className="mt-2 min-h-10 font-semibold underline"
                  onClick={() => {
                    setDraft(
                      restoreTitration({
                        ...storedReport,
                        calculation: String(storedReport.calculation ?? ""),
                      }),
                    );
                    setSaved(true);
                  }}
                >
                  Load account report
                </button>
              )}
            </div>
          )}
        </section>
      )}
      {tab === "guide" && (
        <section className="grid gap-6 rounded-xl border bg-white p-6 lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Glasses className="h-5 w-5" />
              Method & apparatus
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-600">
              <li>
                Check eye protection. Rinse the burette with NaOH, fill it, and
                read the lower meniscus at eye level. In a real lab, remove air
                bubbles and the filling funnel before taking the initial
                reading.
              </li>
              <li>
                Rinse the pipette with a little sample, use a pipette filler,
                then transfer 25.00 mL of HCl to the conical flask. Add a few
                drops of phenolphthalein.
              </li>
              <li>
                Place the flask on a white tile. Add NaOH while mixing. Near the
                endpoint, close the tap and add single drops, swirling after
                each.
              </li>
              <li>
                Stop at the first faint pink colour that persists after mixing;
                a real practical commonly checks persistence for about 30
                seconds. Deep pink indicates excess base.
              </li>
              <li>
                Record initial and final readings, calculate the difference,
                then repeat with fresh acid. Do not include the rough trial in
                the final average.
              </li>
            </ol>
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              What this model represents
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              An ideal strong monoprotic acid–strong base titration at 25 °C.
              The pH model uses mole balance, dilution and water autoionisation;
              the indicator changes across its approximate transition range. The
              animated liquid is a visual representation, not a fluid-dynamics
              model. Real solutions, glassware, temperature and endpoint
              judgements introduce uncertainty.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              For a physical practical, use teacher supervision, splash
              protection and a pipette filler. Never mouth-pipette. Handle acids
              and alkalis according to the school’s procedure. This simulation
              develops understanding; it does not certify physical laboratory
              competence.
            </p>
          </div>
        </section>
      )}
      {confirmReset && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-trial-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <section className="max-w-sm rounded-xl bg-white p-6">
            <h2 id="new-trial-title" className="font-semibold">
              Prepare a fresh trial?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              The current unrecorded run will be discarded. Recorded trials and
              your calculations stay in the notebook.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmReset(false)}
                className="min-h-11 rounded-lg border px-4 text-sm"
              >
                Keep this run
              </button>
              <button
                type="button"
                onClick={newRun}
                className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm text-white"
              >
                Fresh trial
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
