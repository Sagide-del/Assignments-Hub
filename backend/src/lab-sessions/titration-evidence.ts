export interface TitrationEvidence {
  version: string;
  trials: {
    id: number;
    initial: number;
    final: number;
    dispensed: number;
    rough: boolean;
    mixed: boolean;
    colour: string;
    notes: string;
  }[];
  selected: number[];
  calculation: number;
  conclusion: string;
}
export const isTitrationKey = (key: string) =>
  /^3d-titration-grade-(10|11|12)-v1$/.test(key) || key === "ss-chem-10-1";
export function titrationPH(volume: number) {
  const excess =
    ((0.1 * volume) / 1000 - (0.0959 * 25) / 1000) / ((25 + volume) / 1000);
  const root = Math.sqrt(excess * excess + 4e-14);
  return -Math.log10(
    excess >= 0 ? 2e-14 / (excess + root) : (-excess + root) / 2,
  );
}
export function assessTitration(value: TitrationEvidence) {
  const invalid = () => {
    throw new Error(
      "Complete three recorded trials, select concordant endpoint runs, and provide a valid concentration calculation and conclusion.",
    );
  };
  if (
    !value ||
    value.version !== "titration-3d-v1" ||
    !Array.isArray(value.trials) ||
    value.trials.length < 3 ||
    value.trials.length > 20 ||
    !Array.isArray(value.selected) ||
    value.selected.length < 2 ||
    new Set(value.selected).size !== value.selected.length ||
    !Number.isFinite(value.calculation) ||
    typeof value.conclusion !== "string" ||
    value.conclusion.trim().length < 30
  )
    invalid();
  value.trials.forEach((t, i) => {
    if (
      t.id !== i + 1 ||
      ![t.initial, t.final, t.dispensed].every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 50,
      ) ||
      t.final < t.initial ||
      typeof t.rough !== "boolean" ||
      typeof t.mixed !== "boolean" ||
      typeof t.notes !== "string" ||
      typeof t.colour !== "string"
    )
      invalid();
  });
  const chosen = value.trials.filter((t) => value.selected.includes(t.id));
  if (chosen.length !== value.selected.length) invalid();
  for (const t of chosen) {
    const actualInitial = Number((0.2 + ((t.id - 1) % 4) * 0.45).toFixed(2));
    const ph = titrationPH(t.dispensed);
    if (
      t.rough ||
      !t.mixed ||
      Math.abs(t.initial - actualInitial) > 0.050001 ||
      Math.abs(t.final - actualInitial - t.dispensed) > 0.050001 ||
      ph < 8.2 ||
      ph > 10 ||
      t.colour !== "Pale pink"
    )
      invalid();
  }
  const titres = chosen.map((t) => Number((t.final - t.initial).toFixed(2)));
  if (Math.max(...titres) - Math.min(...titres) > 0.100001) invalid();
  const mean = titres.reduce((sum, n) => sum + n, 0) / titres.length,
    concentration = (0.1 * mean) / 25;
  if (Math.abs(value.calculation - concentration) > 0.0005) invalid();
  return {
    ...value,
    meanTitre: mean,
    calculatedConcentration: concentration,
    model:
      "Ideal strong acid/strong base at 25 C; student-reported simulation evidence, not physical skills certification.",
  };
}
