/** Authored learning designs. Grade assignments retain the existing school catalogue;
 * official sub-strand mapping must be verified before making KICD alignment claims. New keys preserve every older lab and notebook. */
export type JuniorKind = "filtration" | "microscope" | "waves";
export const JUNIOR_DESIGNS = {
  "junior-science-g7-filtration-v1": {
    grade: 7,
    kind: "filtration" as JuniorKind,
    title: "Can a filter remove everything?",
    topic: "Separating mixtures",
    question: "Compare filters fairly. What passes through, and why?",
    outcomes: [
      "Compare particle retention using the same mixture.",
      "Distinguish suspended particles from dissolved substances.",
      "Explain why clear water is not necessarily safe to drink.",
    ],
    variable: "Filter opening",
    controlled: "Same starting mixture and volume",
    limitation: "A size-separation model, not a drinking-water safety test.",
  },
  "junior-science-g8-microscopy-v1": {
    grade: 8,
    kind: "microscope" as JuniorKind,
    title: "Bring a cell into focus",
    topic: "Microscopy and observation",
    question: "Does a larger image always show you more?",
    outcomes: [
      "Focus a specimen at low and high power.",
      "Calculate total magnification.",
      "Compare magnification with field of view.",
    ],
    variable: "Objective lens",
    controlled: "Same specimen and eyepiece",
    limitation:
      "Simulated onion epidermis and simplified optics; not a real microscope photograph.",
  },
  "junior-science-g9-waves-v1": {
    grade: 9,
    kind: "waves" as JuniorKind,
    title: "When two waves meet",
    topic: "Wave superposition",
    question: "Can two moving waves produce zero displacement?",
    outcomes: [
      "Compare in-phase and opposite-phase waves.",
      "Read individual and resultant displacement.",
      "Use a controlled comparison to explain interference.",
    ],
    variable: "Phase difference",
    controlled: "Same amplitude, frequency and wave speed",
    limitation: "Equal-amplitude, linear waves with no damping or reflection.",
  },
};
export function juniorDesign(key: string) {
  return JUNIOR_DESIGNS[key as keyof typeof JUNIOR_DESIGNS] ?? null;
}
export type JuniorConfig = {
  filter: 20 | 100 | 1000;
  objective: 4 | 10 | 40;
  focus: number;
  phase: 0 | 90 | 180;
  amplitude: number;
  frequency: number;
};
export type JuniorEvent =
  | { type: "predict"; choice: string }
  | { type: "configure"; config: JuniorConfig }
  | { type: "record"; observation: string }
  | { type: "answer"; question: number; choice: number };
export interface JuniorTrial {
  config: JuniorConfig;
  reading: number;
  secondary: number;
  observation: string;
}
export interface JuniorState {
  prediction: string;
  config: JuniorConfig;
  trials: JuniorTrial[];
  answers: Record<number, number>;
  events: JuniorEvent[];
}
export const juniorInitial = (): JuniorState => ({
  prediction: "",
  config: {
    filter: 100,
    objective: 4,
    focus: 0,
    phase: 0,
    amplitude: 1,
    frequency: 2,
  },
  trials: [],
  answers: {},
  events: [],
});
export function juniorReading(kind: JuniorKind, c: JuniorConfig) {
  if (kind === "filtration") {
    const grains = [
      { size: 20, mass: 1 },
      { size: 80, mass: 2 },
      { size: 300, mass: 3 },
      { size: 1500, mass: 4 },
    ];
    const retained = grains
      .filter((g) => g.size >= c.filter)
      .reduce((sum, g) => sum + g.mass, 0);
    return {
      reading: retained,
      secondary: 10 - retained,
      unit: "g retained",
      detail: "7 g dissolved salt remains in the filtrate",
    };
  }
  if (kind === "microscope")
    return {
      reading: c.objective * 10,
      secondary: 18 / c.objective,
      unit: "× magnification",
      detail: "Field diameter in mm; eyepiece field number 18 mm",
    };
  return {
    reading: 2 * c.amplitude * Math.abs(Math.cos((c.phase * Math.PI) / 360)),
    secondary: 2 / c.frequency,
    unit: "cm resultant amplitude",
    detail: "Wavelength in m at a fixed wave speed of 2 m/s",
  };
}
export const focusTarget = (objective: number) =>
  objective === 4 ? 0 : objective === 10 ? 0.25 : 0.55;
export function replayJunior(
  kind: JuniorKind,
  events: JuniorEvent[],
): JuniorState {
  if (!Array.isArray(events) || events.length > 200)
    throw Error("This investigation allows up to 200 actions.");
  return events.reduce((state, e) => {
    if (!e || typeof e !== "object")
      throw Error("Invalid investigation action.");
    const next = {
      ...state,
      answers: { ...state.answers },
      events: [...state.events, e],
    };
    if (e.type === "predict") {
      if (
        !["first", "second", "same"].includes(e.choice) ||
        state.trials.length
      )
        throw Error("Record a prediction before taking measurements.");
      next.prediction = e.choice;
    } else if (e.type === "configure") {
      const c = e.config;
      if (
        !c ||
        ![20, 100, 1000].includes(c.filter) ||
        ![4, 10, 40].includes(c.objective) ||
        ![0, 90, 180].includes(c.phase) ||
        !Number.isFinite(c.focus) ||
        c.focus < -1 ||
        c.focus > 1 ||
        ![0.5, 1, 1.5, 2].includes(c.amplitude) ||
        ![1, 2, 3, 4].includes(c.frequency)
      )
        throw Error("Choose valid instrument settings.");
      next.config = { ...c };
    } else if (e.type === "record") {
      if (!state.prediction) throw Error("Make your prediction first.");
      if (
        typeof e.observation !== "string" ||
        e.observation.trim().length < 20 ||
        e.observation.length > 1500
      )
        throw Error("Describe the evidence in at least 20 characters.");
      if (state.trials.length >= 12)
        throw Error("This notebook holds 12 measurements.");
      if (
        kind === "microscope" &&
        Math.abs(state.config.focus - focusTarget(state.config.objective)) >
          0.08
      )
        throw Error("Bring the specimen into focus before recording.");
      const reading = juniorReading(kind, state.config);
      next.trials = [
        ...state.trials,
        {
          config: { ...state.config },
          reading: reading.reading,
          secondary: reading.secondary,
          observation: e.observation.trim(),
        },
      ];
    } else if (e.type === "answer") {
      if (
        !Number.isInteger(e.question) ||
        e.question < 0 ||
        e.question > 1 ||
        !Number.isInteger(e.choice) ||
        e.choice < 0 ||
        e.choice > 2
      )
        throw Error("Choose one answer.");
      next.answers[e.question] = e.choice;
    } else throw Error("Unknown investigation action.");
    return next;
  }, juniorInitial());
}
export function juniorReady(
  kind: JuniorKind,
  s: JuniorState,
  conclusion: string,
) {
  const pair = s.trials.some((a, i) =>
    s.trials.some(
      (b, j) =>
        i !== j &&
        (kind === "filtration"
          ? a.config.filter !== b.config.filter
          : kind === "microscope"
            ? a.config.objective !== b.config.objective
            : a.config.phase === 0 &&
              b.config.phase === 180 &&
              a.config.frequency === b.config.frequency &&
              a.config.amplitude === b.config.amplitude),
    ),
  );
  return (
    !!s.prediction &&
    pair &&
    conclusion.trim().length >= 50 &&
    Number.isInteger(s.answers[0]) &&
    Number.isInteger(s.answers[1])
  );
}
export const JUNIOR_QUESTIONS: Record<
  JuniorKind,
  { prompt: string; options: string[] }[]
> = {
  filtration: [
    {
      prompt: "The filtrate looks clear. What can you conclude?",
      options: [
        "It is safe to drink.",
        "Some particles were removed; safety is not established.",
        "Every dissolved substance was removed.",
      ],
    },
    {
      prompt: "How could you recover the dissolved salt?",
      options: [
        "Use a wider sieve.",
        "Pass it through paper again.",
        "Evaporate the water in a suitable supervised experiment.",
      ],
    },
  ],
  microscope: [
    {
      prompt: "A 10× eyepiece and 40× objective give:",
      options: [
        "400× total magnification.",
        "50× total magnification.",
        "4× total magnification.",
      ],
    },
    {
      prompt: "Increasing the objective magnification usually:",
      options: [
        "Shows a larger specimen area.",
        "Shows a smaller specimen area at greater magnification.",
        "Makes focusing unnecessary.",
      ],
    },
  ],
  waves: [
    {
      prompt: "Equal waves meet 180° out of phase. The resultant is:",
      options: [
        "Twice the amplitude.",
        "Zero displacement in this ideal model.",
        "Twice the frequency.",
      ],
    },
    {
      prompt: "For a fair phase comparison, keep constant:",
      options: [
        "Only the colour of the plot.",
        "Nothing else.",
        "Amplitude, frequency and wave speed.",
      ],
    },
  ],
};
