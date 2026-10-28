export const RESPIRATORY_STRUCTURES = [
  "right-lung",
  "left-lung",
  "trachea",
  "bronchi",
  "diaphragm",
  "alveoli",
] as const;
export type RespiratoryStructure = (typeof RESPIRATORY_STRUCTURES)[number];
export interface RespiratoryConfig {
  rate: number;
  tidalVolume: number;
}
export type RespiratoryEvent =
  | { type: "inspect"; structure: RespiratoryStructure }
  | { type: "configure"; config: RespiratoryConfig }
  | { type: "observe"; cycles: number; elapsed: number; notes: string };
export interface RespiratoryObservation extends RespiratoryConfig {
  cycles: number;
  elapsed: number;
  notes: string;
  minuteVentilation: number;
  alveolarVentilation: number;
}
export interface RespiratoryState {
  config: RespiratoryConfig;
  inspected: RespiratoryStructure[];
  recorded: boolean;
  observations: RespiratoryObservation[];
  events: RespiratoryEvent[];
}
export const emptyRespiratory = (): RespiratoryState => ({
  config: { rate: 12, tidalVolume: 0.5 },
  inspected: [],
  recorded: false,
  observations: [],
  events: [],
});
export function ventilation(c: RespiratoryConfig) {
  return {
    minuteVentilation: c.rate * c.tidalVolume,
    alveolarVentilation: c.rate * Math.max(0, c.tidalVolume - 0.15),
  };
}
// Smooth volume change, with a 40:60 inspiratory:expiratory cycle. Animation is illustrative.
export function breathingSample(seconds: number, c: RespiratoryConfig) {
  const cycle = 60 / c.rate,
    phase = (((seconds % cycle) + cycle) % cycle) / cycle,
    inhale = phase < 0.4,
    local = inhale ? phase / 0.4 : (phase - 0.4) / 0.6,
    fraction = (1 + (inhale ? -1 : 1) * Math.cos(Math.PI * local)) / 2,
    flow =
      ((inhale ? 1 : -1) *
        c.tidalVolume *
        Math.PI *
        Math.sin(Math.PI * local)) /
      (2 * cycle * (inhale ? 0.4 : 0.6));
  return {
    fraction,
    inhale,
    flow,
    volume: 2.5 + c.tidalVolume * fraction,
    phase,
  };
}
export function respiratoryStep(
  s: RespiratoryState,
  e: RespiratoryEvent,
): RespiratoryState {
  if (s.events.length >= 500)
    throw new Error("Export this notebook before starting another session.");
  let n = { ...s, events: [...s.events, e] };
  if (e.type === "inspect") {
    if (!(RESPIRATORY_STRUCTURES as readonly string[]).includes(e.structure))
      throw new Error("Choose a structure from the anatomy guide.");
    n.inspected = [...new Set([...s.inspected, e.structure])];
  } else if (e.type === "configure") {
    const c = e.config;
    if (
      !c ||
      ![c.rate, c.tidalVolume].every(Number.isFinite) ||
      !Number.isInteger(c.rate) ||
      c.rate < 6 ||
      c.rate > 30 ||
      c.tidalVolume < 0.2 ||
      c.tidalVolume > 1.2
    )
      throw new Error(
        "Choose 6–30 breaths/min and a tidal volume of 0.20–1.20 L.",
      );
    n.config = { ...c };
    n.recorded = false;
  } else if (e.type === "observe") {
    if (s.recorded)
      throw new Error(
        "Reset or change a breathing condition before recording another observation.",
      );
    if (
      !Number.isInteger(e.cycles) ||
      e.cycles < 2 ||
      e.cycles > 20 ||
      !Number.isFinite(e.elapsed) ||
      Math.abs(e.elapsed - (e.cycles * 60) / s.config.rate) > 0.05 ||
      typeof e.notes !== "string" ||
      e.notes.trim().length < 12 ||
      e.notes.length > 2000
    )
      throw new Error(
        "Observe at least two complete breaths and describe what changed.",
      );
    if (s.observations.length >= 20)
      throw new Error("This notebook holds twenty observations.");
    n.observations = [
      ...s.observations,
      {
        ...s.config,
        ...ventilation(s.config),
        cycles: e.cycles,
        elapsed: e.elapsed,
        notes: e.notes.trim(),
      },
    ];
    n.recorded = true;
  } else throw new Error("Unknown respiratory activity.");
  return n;
}
export function replayRespiratory(events: RespiratoryEvent[]) {
  if (!Array.isArray(events) || events.length > 500)
    throw new Error("Invalid respiratory event log.");
  return events.reduce(respiratoryStep, emptyRespiratory());
}
export function respiratoryReady(s: RespiratoryState, conclusion: string) {
  return (
    s.observations.length >= 3 &&
    new Set(s.observations.map((o) => `${o.rate}:${o.tidalVolume}`)).size >=
      2 &&
    RESPIRATORY_STRUCTURES.filter((id) => id !== "alveoli").every((id) =>
      s.inspected.includes(id),
    ) &&
    conclusion.trim().length >= 30
  );
}
