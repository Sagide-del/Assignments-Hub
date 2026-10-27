export const TITRATION_VERSION = "titration-3d-v1";
export const ALIQUOT_ML = 25;
export const BASE_MOLARITY = 0.1;
// Original ideal teaching sample, not a prediction for real laboratory chemicals.
const ACID_MOLARITY = 0.0959;
export interface TitrationTrial {
  id: number;
  initial: number;
  final: number;
  dispensed: number;
  rough: boolean;
  mixed: boolean;
  colour: string;
  notes: string;
}
export interface TitrationDraft {
  version: typeof TITRATION_VERSION;
  quiz: Record<number, string>;
  recorded: boolean;
  goggles: boolean;
  rinsed: boolean;
  filled: boolean;
  aliquot: boolean;
  indicator: boolean;
  initial: number;
  dispensed: number;
  mixed: boolean;
  trials: TitrationTrial[];
  initialEntry: string;
  finalEntry: string;
  rough: boolean;
  notes: string;
  selected: number[];
  calculation: string;
  conclusion: string;
}
export const freshTitration = (): TitrationDraft => ({
  version: TITRATION_VERSION,
  quiz: {},
  recorded: false,
  goggles: false,
  rinsed: false,
  filled: false,
  aliquot: false,
  indicator: false,
  initial: 0.2,
  dispensed: 0,
  mixed: true,
  trials: [],
  initialEntry: "",
  finalEntry: "",
  rough: true,
  notes: "",
  selected: [],
  calculation: "",
  conclusion: "",
});
export function titrationPH(volume: number) {
  const excess =
    ((BASE_MOLARITY * volume) / 1000 - (ACID_MOLARITY * ALIQUOT_ML) / 1000) /
    ((ALIQUOT_ML + volume) / 1000);
  const root = Math.sqrt(excess * excess + 4e-14);
  const hydrogen = excess >= 0 ? 2e-14 / (excess + root) : (-excess + root) / 2;
  return -Math.log10(hydrogen);
}
export function indicatorColour(volume: number) {
  const ph = titrationPH(volume);
  return ph < 8.2 ? "Colourless" : ph <= 10 ? "Pale pink" : "Deep pink";
}
export function trialQuality(trial: TitrationTrial) {
  if (trial.rough) return "Rough";
  if (!trial.mixed) return "Not mixed";
  const actualInitial = Number((0.2 + ((trial.id - 1) % 4) * 0.45).toFixed(2));
  if (
    Math.abs(trial.initial - actualInitial) > 0.050001 ||
    Math.abs(trial.final - actualInitial - trial.dispensed) > 0.050001
  )
    return "Check readings";
  const ph = titrationPH(trial.dispensed);
  return ph < 8.2 ? "Before endpoint" : ph > 10 ? "Overshot" : "Endpoint";
}
export function selectedResults(trials: TitrationTrial[], selected: number[]) {
  const chosen = trials.filter((t) => selected.includes(t.id));
  const titres = chosen.map((t) => Number((t.final - t.initial).toFixed(2)));
  const concordant =
    chosen.length === selected.length &&
    new Set(selected).size === selected.length &&
    chosen.length >= 2 &&
    chosen.every((t) => trialQuality(t) === "Endpoint") &&
    Math.max(...titres) - Math.min(...titres) <= 0.100001;
  const mean = titres.length
    ? titres.reduce((sum, n) => sum + n, 0) / titres.length
    : null;
  return {
    chosen,
    titres,
    concordant,
    mean,
    concentration: mean === null ? null : (BASE_MOLARITY * mean) / ALIQUOT_ML,
  };
}
export function practicalReady(d: TitrationDraft) {
  const result = selectedResults(d.trials, d.selected),
    entered = Number(d.calculation);
  return (
    d.trials.every((t, i) => t.id === i + 1) &&
    d.trials.length >= 3 &&
    result.concordant &&
    !!d.calculation.trim() &&
    Number.isFinite(entered) &&
    result.concentration !== null &&
    Math.abs(entered - result.concentration) <= 0.0005 &&
    d.conclusion.trim().length >= 30
  );
}
export function restoreTitration(value: unknown): TitrationDraft {
  const d = freshTitration();
  if (!value || typeof value !== "object") return d;
  const v = value as Record<string, unknown>;
  if (v.version !== TITRATION_VERSION) return d;
  for (const key of [
    "recorded",
    "goggles",
    "rinsed",
    "filled",
    "aliquot",
    "indicator",
    "mixed",
    "rough",
  ] as const)
    if (typeof v[key] === "boolean") d[key] = v[key];
  for (const key of [
    "initialEntry",
    "finalEntry",
    "notes",
    "calculation",
    "conclusion",
  ] as const)
    if (typeof v[key] === "string") d[key] = (v[key] as string).slice(0, 5000);
  if (
    typeof v.initial === "number" &&
    Number.isFinite(v.initial) &&
    v.initial >= 0 &&
    v.initial <= 50
  )
    d.initial = v.initial;
  if (
    typeof v.dispensed === "number" &&
    Number.isFinite(v.dispensed) &&
    v.dispensed >= 0 &&
    v.dispensed <= 50 - d.initial
  )
    d.dispensed = v.dispensed;
  if (Array.isArray(v.trials))
    d.trials = v.trials
      .filter(
        (t): t is TitrationTrial =>
          !!t &&
          typeof t === "object" &&
          Number.isInteger(t.id) &&
          [t.initial, t.final, t.dispensed].every(
            (n) =>
              typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 50,
          ) &&
          t.final >= t.initial &&
          typeof t.rough === "boolean" &&
          typeof t.mixed === "boolean" &&
          typeof t.colour === "string" &&
          typeof t.notes === "string",
      )
      .slice(0, 20)
      .filter((t, i, a) => a.findIndex((other) => other.id === t.id) === i);
  if (Array.isArray(v.selected))
    d.selected = v.selected.filter(
      (id): id is number =>
        Number.isInteger(id) && d.trials.some((t) => t.id === id),
    );
  if (v.quiz && typeof v.quiz === "object" && !Array.isArray(v.quiz))
    d.quiz = Object.fromEntries(
      Object.entries(v.quiz)
        .filter(
          ([id, value]) =>
            Number.isInteger(Number(id)) &&
            Number(id) > 0 &&
            typeof value === "string",
        )
        .map(([id, value]) => [id, (value as string).slice(0, 5000)]),
    );
  if (typeof v.initial !== "number")
    d.initial = Number((0.2 + (d.trials.length % 4) * 0.45).toFixed(2));
  if (typeof v.rough !== "boolean") d.rough = d.trials.length === 0;
  // Invalid preparation combinations cannot unlock dosing after restoration.
  if (!d.goggles) d.rinsed = false;
  if (!d.rinsed) d.filled = false;
  if (!d.filled) d.aliquot = false;
  if (!d.aliquot) d.indicator = false;
  return d;
}
export const isTitrationKey = (key: string) =>
  /^3d-titration-grade-(10|11|12)-v1$/.test(key) || key === "ss-chem-10-1";
export function reportText(d: TitrationDraft) {
  const result = selectedResults(d.trials, d.selected);
  return [
    `ACID–BASE TITRATION · Assignment Hub`,
    `Ideal strong acid/strong base model at 25 °C. Not physical laboratory certification.`,
    `25.00 mL HCl aliquot; NaOH 0.100 mol/dm³.`,
    `Trial,Initial (mL),Final (mL),Titre (mL),Type,Quality,Observation`,
    ...d.trials.map(
      (t) =>
        `${t.id},${t.initial.toFixed(2)},${t.final.toFixed(2)},${(t.final - t.initial).toFixed(2)},${t.rough ? "Rough" : "Accurate"},${trialQuality(t)},${JSON.stringify(t.notes)}`,
    ),
    `Selected trials: ${d.selected.join(", ")}`,
    `Concordant: ${result.concordant ? "yes" : "no"}`,
    `Mean titre: ${result.mean?.toFixed(2) ?? "not selected"} mL`,
    `Student concentration: ${d.calculation} mol/dm³`,
    `Conclusion: ${d.conclusion}`,
  ].join("\n");
}
