export type LeafSample = "light" | "dark" | "variegated";
export type StarchResult = "blue-black" | "yellow-brown" | "patchy";
export type StarchEvent =
  | { type: "sample"; sample: LeafSample }
  | { type: "ppe" }
  | { type: "burner"; on: boolean }
  | { type: "heat"; seconds: number }
  | { type: "leaf-water" }
  | { type: "ethanol-fill" }
  | { type: "leaf-ethanol" }
  | { type: "tube-bath" }
  | { type: "rinse" }
  | { type: "dish" }
  | { type: "load-iodine" }
  | { type: "iodine" }
  | { type: "record"; result: StarchResult; explanation: string };
export interface StarchTrial {
  sample: LeafSample;
  result: StarchResult;
  explanation: string;
  boilSeconds: number;
  extractSeconds: number;
}
export interface StarchState {
  sample: LeafSample;
  ppe: boolean;
  burner: boolean;
  waterTemperature: number;
  leaf: "plant" | "water" | "ethanol" | "rinsed" | "dish";
  boilSeconds: number;
  ethanolFilled: boolean;
  tubeInBath: boolean;
  extractSeconds: number;
  iodineLoaded: boolean;
  iodineApplied: boolean;
  recorded: boolean;
  trials: StarchTrial[];
  events: StarchEvent[];
}
export const freshStarch = (): StarchState => ({
  sample: "light",
  ppe: false,
  burner: false,
  waterTemperature: 20,
  leaf: "plant",
  boilSeconds: 0,
  ethanolFilled: false,
  tubeInBath: false,
  extractSeconds: 0,
  iodineLoaded: false,
  iodineApplied: false,
  recorded: false,
  trials: [],
  events: [],
});
export const starchResult = (s: LeafSample): StarchResult =>
  s === "light" ? "blue-black" : s === "dark" ? "yellow-brown" : "patchy";
export function starchStep(s: StarchState, e: StarchEvent): StarchState {
  const fail = (m: string): never => {
    throw new Error(m);
  };
  if (s.events.length >= 500)
    fail("Export the notebook before starting another session.");
  let n = { ...s, events: [...s.events, e] };
  if (e.type === "sample") {
    if (!["light", "dark", "variegated"].includes(e.sample))
      fail("Choose a prepared leaf sample.");
    if (s.burner) fail("Extinguish the burner before changing samples.");
    n = {
      ...freshStarch(),
      sample: e.sample,
      ppe: s.ppe,
      trials: s.trials,
      events: n.events,
    };
  } else if (e.type === "ppe") n.ppe = true;
  else if (e.type === "burner") {
    if (typeof e.on !== "boolean") fail("Invalid burner control.");
    if (e.on && (!s.ppe || s.ethanolFilled || s.leaf === "ethanol"))
      fail(
        "Wear eye protection and keep ethanol closed and away from any flame. Ethanol is heated only in an off-flame water bath.",
      );
    n.burner = e.on;
  } else if (e.type === "heat") {
    if (!Number.isFinite(e.seconds) || e.seconds <= 0 || e.seconds > 10)
      fail("Invalid simulated heating interval.");
    if (s.burner) {
      n.waterTemperature = Math.min(100, s.waterTemperature + e.seconds * 5);
      if (s.leaf === "water" && s.waterTemperature >= 95)
        n.boilSeconds = Math.min(30, s.boilSeconds + e.seconds);
    } else {
      n.waterTemperature = Math.max(20, s.waterTemperature - e.seconds * 0.04);
      if (s.tubeInBath && s.leaf === "ethanol" && s.waterTemperature >= 70)
        n.extractSeconds = Math.min(60, s.extractSeconds + e.seconds);
    }
  } else if (e.type === "leaf-water") {
    if (!s.ppe || s.waterTemperature < 95 || s.leaf !== "plant")
      fail(
        "Use forceps to put the prepared leaf in hot water once the bath is near boiling.",
      );
    n.leaf = "water";
  } else if (e.type === "ethanol-fill") {
    if (!s.ppe || s.burner)
      fail("Extinguish the burner before opening ethanol.");
    if (s.boilSeconds < 30)
      fail(
        "Keep the leaf in boiling water for the simulated 30-second preparation first.",
      );
    n.ethanolFilled = true;
  } else if (e.type === "leaf-ethanol") {
    if (
      s.burner ||
      !s.ethanolFilled ||
      s.boilSeconds < 30 ||
      s.leaf !== "water"
    )
      fail(
        "With the burner off, use forceps to transfer the boiled leaf into the ethanol tube.",
      );
    n.leaf = "ethanol";
  } else if (e.type === "tube-bath") {
    if (
      s.burner ||
      s.leaf !== "ethanol" ||
      !s.ethanolFilled ||
      s.waterTemperature < 70
    )
      fail(
        "Put the ethanol tube in the hot water bath only after extinguishing the flame.",
      );
    n.tubeInBath = true;
  } else if (e.type === "rinse") {
    if (s.extractSeconds < 60 || s.leaf !== "ethanol")
      fail(
        "Wait for the leaf to decolourise in the off-flame bath, then rinse it in warm water.",
      );
    n.leaf = "rinsed";
    n.tubeInBath = false;
  } else if (e.type === "dish") {
    if (s.leaf !== "rinsed")
      fail(
        "Rinse the decolourised leaf to soften it before placing it on the white tile.",
      );
    n.leaf = "dish";
  } else if (e.type === "load-iodine") {
    if (!s.ppe) fail("Complete the eye-protection check first.");
    n.iodineLoaded = true;
  } else if (e.type === "iodine") {
    if (s.leaf !== "dish" || !s.iodineLoaded || s.burner)
      fail(
        "Use the iodine dropper on the rinsed leaf on the white tile, with the burner off.",
      );
    n.iodineApplied = true;
    n.iodineLoaded = false;
  } else if (e.type === "record") {
    if (
      !s.iodineApplied ||
      s.recorded ||
      e.result !== starchResult(s.sample) ||
      typeof e.explanation !== "string" ||
      e.explanation.trim().length < 20 ||
      e.explanation.length > 2000
    )
      fail(
        "Observe the iodine result and explain the correct interpretation before recording.",
      );
    if (s.trials.length >= 10) fail("This notebook holds ten leaf tests.");
    n.trials = [
      ...s.trials,
      {
        sample: s.sample,
        result: e.result,
        explanation: e.explanation.trim(),
        boilSeconds: s.boilSeconds,
        extractSeconds: s.extractSeconds,
      },
    ];
    n.recorded = true;
  } else fail("Unknown starch-test action.");
  return n;
}
export function replayStarch(events: StarchEvent[]) {
  if (!Array.isArray(events) || events.length > 500)
    throw new Error("Invalid starch-test log.");
  return events.reduce(starchStep, freshStarch());
}
export function starchReady(s: StarchState, conclusion: string) {
  return (
    s.trials.some((t) => t.sample === "light") &&
    s.trials.some((t) => t.sample === "dark") &&
    conclusion.trim().length >= 30
  );
}
