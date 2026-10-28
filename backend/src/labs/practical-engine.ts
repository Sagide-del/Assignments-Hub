import catalogue from "./practical-catalogue.json";
export interface PracticalSpec {
  key: string;
  kind: string;
  title: string;
  goal: string;
  variable: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  unit: string;
  tools: string[];
  actions: string[];
  explain: string;
}
export const PRACTICAL_CATALOGUE: PracticalSpec[] = catalogue;
export function practicalFor(lab: {
  key: string;
  title?: string;
  subject?: string;
}): PracticalSpec {
  const exact = catalogue.find((s) => s.key === lab.key);
  if (exact) return exact;
  // Catalogue IDs retain their historic -10- segment even where staff assign a later grade.
  const senior = lab.key.replace(/-(11|12)-/, "-10-");
  const keyed = catalogue.find((s) => s.key === senior);
  if (keyed) return keyed;
  const title = (lab.title ?? "").toLowerCase();
  const names: Record<string, string> = {
    cyber: "cyber",
    network: "network",
    database: "database",
    algorithm: "algorithm",
    building: "building",
    architect: "building",
    hydroponic: "hydroponics",
    greenhouse: "greenhouse",
    soil: "soil",
    livestock: "livestock",
    pendulum: "pendulum",
    photoelectric: "photoelectric",
    electrolysis: "electrolysis",
    circuit: "circuit",
    genetic: "genetics",
    microscope: "microscope",
    nutrition: "nutrition",
    "first aid": "firstaid",
    chromatograph: "chromatography",
    polymer: "polymer",
    calorimetr: "calorimetry",
    thermochem: "calorimetry",
    optics: "optics",
    projectile: "projectile",
    enzyme: "enzyme",
    "cell division": "division",
    respirat: "respiration",
    digesti: "digestion",
    weather: "weather",
    climate: "climate",
    ecosystem: "ecosystem",
    photosynth: "plant",
    "plant growth": "plant",
    filtrat: "filter",
    purific: "filter",
    "water test": "water",
    "acid-base": "acid",
    bonding: "molecule",
    organic: "organic",
    dna: "dna",
    pcr: "pcr",
    electrophoresis: "gel",
    induction: "induction",
    electromagnet: "magnet",
    heat: "thermal",
    wave: "waves",
    decay: "decay",
    spectro: "spectrum",
    aviation: "aviation",
    automotive: "automotive",
    volcano: "volcano",
    "reaction rate": "rate",
    "simple machine": "lever",
  };
  const match = Object.keys(names).find((n) => title.includes(n));
  if (match) return catalogue.find((s) => s.kind === names[match])!;
  return {
    key: lab.key,
    kind: "building",
    title: "Practical modelling bench",
    goal: "Build a model for your teacher’s activity and record the changes you make.",
    variable: "Model test load / kN",
    min: 2,
    max: 20,
    step: 2,
    initial: 10,
    unit: "kN per support",
    tools: ["Floor slab", "Wall panel", "Roof beam"],
    actions: [
      "Place base",
      "Place supports",
      "Place beam",
      "Test distributed load",
    ],
    explain:
      "This general modelling bench uses a symmetric two-support beam. Use the teacher’s supplied resources for the subject-specific activity; this model does not reproduce every custom practical.",
  };
}
export interface Placement {
  x: number;
  z: number;
  rotation: number;
}
export type PracticalEvent =
  | { type: "place"; tool: number; x: number; z: number; rotation: number }
  | { type: "setting"; value: number }
  | { type: "action"; index: number }
  | { type: "record"; observation: string }
  | { type: "reset" };
export interface PracticalTrial {
  setting: number;
  result: number;
  unit: string;
  actions: number;
  observation: string;
}
export interface PracticalState {
  value: number;
  placements: Record<number, Placement>;
  completed: number;
  trials: PracticalTrial[];
  events: PracticalEvent[];
}
export const initialPractical = (spec: PracticalSpec): PracticalState => ({
  value: spec.initial,
  placements: {},
  completed: 0,
  trials: [],
  events: [],
});
export function practicalResult(
  spec: PracticalSpec,
  value: number,
  completed: number,
): number {
  switch (spec.kind) {
    case "plant":
      return spec.key === "js7-lab1"
        ? Math.min(value, 10) * 7
        : (100 * value) / (value + 3);
    case "filter":
      return 100 * Math.exp(-0.6 * value);
    case "circuit":
      return completed >= 3 ? value / 10 : 0;
    case "thermal":
      return 20 + 60 * (1 - Math.exp(-value / 60));
    case "firstaid":
      return completed;
    case "nutrition":
      return value * 5;
    case "water":
    case "soil":
    case "acid":
    case "weather":
    case "automotive":
      return value;
    case "anatomy":
      return value * 0.07;
    case "lever":
      return 5 / value;
    case "magnet":
      return value * 0.5;
    case "microscope":
      return value * 10;
    case "digestion":
    case "division":
    case "polymer":
      return value;
    case "genetics":
      return value * 0.75;
    case "dna":
      return Math.ceil(value / 2) * 2 + Math.floor(value / 2) * 3;
    case "molecule":
      return Math.min(2, value);
    case "waves":
      return 2 * Math.abs(Math.cos((value * Math.PI) / 360));
    case "ecosystem":
      return value + value * 0.2 - value * 0.02 * 5;
    case "electrolysis":
      return spec.key === "ss-chem-10-3" ? value * 60 : value * 10;
    case "climate":
      return 5.35 * Math.log(value / 280);
    case "enzyme":
      return 100 * Math.exp(-(((value - 37) / 18) ** 2));
    case "extraction":
      return value * 2;
    case "respiration":
      return value * 0.5;
    case "pcr":
      return 2 ** value;
    case "gel":
      return 1000 / value;
    case "organic":
      return 2 * value + 2;
    case "rate":
      return value;
    case "spectrum":
      return 1239.841984 / value;
    case "chromatography":
      return 0.6;
    case "calorimetry":
      return value / (100 * 4.18);
    case "projectile":
      return (100 * Math.sin((2 * value * Math.PI) / 180)) / 9.81;
    case "pendulum":
      return 2 * Math.PI * Math.sqrt(value / 9.81);
    case "optics":
      return 1 / (0.1 - 1 / value);
    case "induction":
      return value * 2;
    case "decay":
      return 1000 * 2 ** -value;
    case "photoelectric":
      return Math.max(0, 0.4135667696 * value - 2);
    case "hydroponics":
      return 100 * Math.exp(-0.5 * ((value - 6) / 1.2) ** 2);
    case "greenhouse":
      return 100 * Math.exp(-(((value - 24) / 10) ** 2));
    case "livestock":
      return value * 5;
    case "network":
    case "database":
      return value;
    case "cyber":
      return completed >= 5 ? 3 : 0;
    case "algorithm":
      return (value * (value - 1)) / 2;
    case "aviation":
      return 0.5 * 1.225 * value ** 2 * 0.5;
    case "building":
      return value / 2;
    case "volcano":
      return value ** 2;
    default:
      throw new Error("Unsupported practical model");
  }
}
export function transition(
  spec: PracticalSpec,
  state: PracticalState,
  event: PracticalEvent,
): PracticalState {
  const fail = (message: string): never => {
    throw new Error(message);
  };
  if (state.events.length >= 300)
    fail(
      "Export this notebook before starting another experiment (300 actions maximum).",
    );
  let next = {
    ...state,
    placements: { ...state.placements },
    events: [...state.events, event],
  };
  if (event.type === "place") {
    if (
      !Number.isInteger(event.tool) ||
      event.tool < 0 ||
      event.tool >= spec.tools.length ||
      ![event.x, event.z, event.rotation].every(Number.isFinite) ||
      Math.abs(event.x) > 2.8 ||
      Math.abs(event.z) > 1.2 ||
      Math.abs(event.rotation) > Math.PI * 4
    )
      fail("Keep the equipment on the laboratory bench.");
    const old = state.placements[event.tool];
    if (
      event.tool < Math.min(state.completed, spec.tools.length) &&
      (!old ||
        Math.hypot(old.x - event.x, old.z - event.z) > 0.1 ||
        Math.abs(old.rotation - event.rotation) > 0.01)
    )
      next.completed = 0;
    next.placements[event.tool] = {
      x: event.x,
      z: event.z,
      rotation: event.rotation,
    };
  } else if (event.type === "setting") {
    if (
      !Number.isFinite(event.value) ||
      event.value < spec.min ||
      event.value > spec.max ||
      Math.abs(
        (event.value - spec.min) / spec.step -
          Math.round((event.value - spec.min) / spec.step),
      ) > 1e-6
    )
      fail("Choose a value on the instrument scale.");
    // Changing a variable needs a fresh procedure; otherwise old actions would certify new conditions.
    next.value = event.value;
    next.completed = 0;
  } else if (event.type === "action") {
    if (event.index !== state.completed || event.index >= spec.actions.length)
      fail("Complete the practical in order.");
    const tool = Math.min(event.index, spec.tools.length - 1),
      p = state.placements[tool];
    if (!p || Math.abs(p.x) > 1.5 || Math.abs(p.z) > 0.85)
      fail(
        `Pick up ${spec.tools[tool]} and place it on the central work mat first.`,
      );
    if (spec.kind === "building" && event.index === spec.actions.length - 1) {
      const base = state.placements[0];
      if (
        !base ||
        spec.tools.some(
          (_, i) =>
            !state.placements[i] ||
            Math.hypot(
              state.placements[i].x - base.x,
              state.placements[i].z - base.z,
            ) > 0.25,
        )
      )
        fail(
          "Align the walls and roof beam with the floor slab before testing the load.",
        );
    }
    next.completed = state.completed + 1;
  } else if (event.type === "record") {
    if (!measurementReady(spec, state))
      fail("Carry out the practical before recording a reading.");
    if (
      typeof event.observation !== "string" ||
      event.observation.trim().length < 8 ||
      event.observation.length > 2000
    )
      fail("Describe what you observed in at least 8 characters.");
    if (state.trials.length >= 20)
      fail("Export this notebook; the maximum is 20 trials.");
    const last = state.events.at(-1);
    if (last?.type === "record")
      fail(
        "Change a variable, repeat the procedure, or perform the next action before recording again.",
      );
    next.trials = [
      ...state.trials,
      {
        setting: state.value,
        result: Number(
          practicalResult(spec, state.value, state.completed).toFixed(4),
        ),
        unit: spec.unit,
        actions: state.completed,
        observation: event.observation.trim(),
      },
    ];
  } else if (event.type === "reset") {
    next.completed = 0;
  } else fail("Unknown practical action.");
  return next;
}
export function replayPractical(
  spec: PracticalSpec,
  events: PracticalEvent[],
): PracticalState {
  if (!Array.isArray(events) || events.length > 300)
    throw new Error("Invalid practical event log.");
  return events.reduce(
    (s, e) => transition(spec, s, e),
    initialPractical(spec),
  );
}
export function practicalComplete(
  spec: PracticalSpec,
  state: PracticalState,
  conclusion: string,
) {
  return (
    state.trials.length >= 3 &&
    new Set(state.trials.map((t) => t.setting)).size >= 2 &&
    state.trials.some((t) => t.actions === spec.actions.length) &&
    conclusion.trim().length >= 30
  );
}

export function gradePractice(grade: string): string {
  const n = Number(grade.match(/\d+/)?.[0]);
  const prompts: Record<number, string> = {
    7: "Observe carefully: change one setting, record three readings and describe a fair comparison.",
    8: "Investigate a relationship: identify the variable you change, keep other conditions fixed and compare three trials.",
    9: "Explain a pattern: use at least two conditions and evidence from three trials to justify your explanation.",
    10: "Plan a controlled investigation, record units consistently and apply the stated model to explain the readings.",
    11: "Compare quantitative results, identify a useful graph or relationship, and evaluate how the model limits your conclusion.",
    12: "Evaluate the quantitative relationship, discuss measurement uncertainty and propose a real-world validation with repeats.",
  };
  return (
    prompts[n] ??
    "Follow the teacher’s practical brief and use recorded evidence to explain your model."
  );
}

export function measurementReady(spec: PracticalSpec, state: PracticalState) {
  return state.completed >= (spec.kind === "cyber" ? 3 : spec.actions.length);
}
