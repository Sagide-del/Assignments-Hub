export const METERS = ["4/4", "6/8", "12/8"] as const;
export type ProductionMeter = (typeof METERS)[number];
export const TRACK_IDS = [
  "melody",
  "isatsa",
  "ikhasi",
  "omwana",
  "gong",
  "rattles",
] as const;
export const INSTRUMENTS = [
  "Piano",
  "Marimba",
  "Kalimba",
  "Nyatiti",
  "Sitar",
  "Erhu",
] as const;
export type Instrument = (typeof INSTRUMENTS)[number];
export const SCALES = {
  "C Major": [60, 62, 64, 65, 67, 69, 71, 72],
  "A Minor": [57, 59, 60, 62, 64, 65, 67, 69],
  Pentatonic: [60, 62, 64, 67, 69, 72],
} as const;
export interface MelodyNote {
  bar: number;
  step: number;
  midi: number;
  length: number;
}
export interface MixTrack {
  id: (typeof TRACK_IDS)[number];
  volume: number;
  muted: boolean;
  pattern: boolean[];
  instrument: Instrument;
}
export interface ProductionMix {
  version: 2;
  scale: keyof typeof SCALES;
  tracks: MixTrack[];
  melody: MelodyNote[];
  completed_activities: string[];
  reflection: string;
}
export interface ProductionDraft {
  title: string;
  song_id: string | null;
  bpm: number;
  time_signature: ProductionMeter;
  tracks_json: ProductionMix;
}
export const stepsFor = (meter: ProductionMeter) =>
  meter === "4/4" ? 16 : meter === "6/8" ? 12 : 24;
export const quarterBeats = (meter: ProductionMeter) => stepsFor(meter) / 4;
export function newMix(meter: ProductionMeter = "6/8"): ProductionMix {
  const steps = stepsFor(meter);
  return {
    version: 2,
    scale: "C Major",
    tracks: TRACK_IDS.map((id) => ({
      id,
      volume: id === "melody" ? 0.7 : 0.55,
      muted: false,
      instrument: "Piano",
      pattern: Array.from({ length: steps }, (_, i) =>
        id === "isatsa"
          ? i === 0 || i === steps / 2
          : id === "ikhasi"
            ? i === steps / 4 || i === (steps * 3) / 4
            : id === "omwana"
              ? i % 2 === 0
              : id === "gong"
                ? i === 0
                : id === "rattles"
                  ? i % 2 === 1
                  : false,
      ),
    })),
    melody: [],
    completed_activities: [],
    reflection: "",
  };
}
export function validMix(
  value: unknown,
  meter: ProductionMeter,
): value is ProductionMix {
  if (!METERS.includes(meter) || !value || typeof value !== "object")
    return false;
  const m = value as ProductionMix,
    steps = stepsFor(meter);
  if (
    m.version !== 2 ||
    !Object.keys(SCALES).includes(m.scale) ||
    !Array.isArray(m.tracks) ||
    m.tracks.length !== 6 ||
    new Set(m.tracks.map((t) => t?.id)).size !== 6 ||
    !m.tracks.every(
      (t) =>
        t &&
        TRACK_IDS.includes(t.id) &&
        INSTRUMENTS.includes(t.instrument) &&
        typeof t.muted === "boolean" &&
        Number.isFinite(t.volume) &&
        t.volume >= 0 &&
        t.volume <= 1 &&
        Array.isArray(t.pattern) &&
        t.pattern.length === steps &&
        t.pattern.every((p) => typeof p === "boolean"),
    )
  )
    return false;
  if (
    !Array.isArray(m.melody) ||
    m.melody.length > steps * 4 ||
    !m.melody.every(
      (n) =>
        n &&
        Number.isInteger(n.bar) &&
        n.bar >= 0 &&
        n.bar < 4 &&
        Number.isInteger(n.step) &&
        n.step >= 0 &&
        n.step < steps &&
        Number.isInteger(n.midi) &&
        n.midi >= 48 &&
        n.midi <= 84 &&
        Number.isInteger(n.length) &&
        [1, 2, 3, 4, 6, 8, 12, 16].includes(n.length) &&
        n.step + n.length <= steps,
    )
  )
    return false;
  for (let i = 0; i < m.melody.length; i++)
    for (let j = i + 1; j < m.melody.length; j++) {
      const a = m.melody[i],
        b = m.melody[j];
      if (
        a.bar === b.bar &&
        a.step < b.step + b.length &&
        b.step < a.step + a.length
      )
        return false;
    }
  return (
    typeof m.reflection === "string" &&
    m.reflection.length <= 2000 &&
    Array.isArray(m.completed_activities) &&
    m.completed_activities.length <= 5 &&
    new Set(m.completed_activities).size === m.completed_activities.length &&
    m.completed_activities.every((s) =>
      ["rhythm", "melody", "instrument", "composition", "production"].includes(
        s,
      ),
    )
  );
}
export function changeMeter(
  mix: ProductionMix,
  old: ProductionMeter,
  next: ProductionMeter,
): ProductionMix {
  const from = stepsFor(old),
    to = stepsFor(next),
    ratio = to / from;
  return {
    ...mix,
    tracks: mix.tracks.map((t) => ({
      ...t,
      pattern: Array.from(
        { length: to },
        (_, i) => t.pattern[Math.min(from - 1, Math.floor(i / ratio))] ?? false,
      ),
    })),
    melody: mix.melody
      .map((n) => ({
        ...n,
        step: Math.floor(n.step * ratio),
        length: Math.max(
          ...[1, 2, 3, 4, 6, 8, 12, 16].filter(
            (v) => v <= Math.max(1, Math.floor(n.length * ratio)),
          ),
        ),
      }))
      .filter(
        (n, i, all) =>
          n.step + n.length <= to &&
          !all
            .slice(0, i)
            .some(
              (a) =>
                a.bar === n.bar &&
                a.step < n.step + n.length &&
                n.step < a.step + a.length,
            ),
      ),
  };
}
export function pitchName(midi: number) {
  return (
    ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][
      midi % 12
    ] +
    (Math.floor(midi / 12) - 1)
  );
}
export function midiFromName(name: string) {
  const m = name.match(/^([A-G])([#b]?)([2-6])$/);
  if (!m) return 60;
  const offsets: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  return (
    (Number(m[3]) + 1) * 12 +
    offsets[m[1]] +
    (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)
  );
}
