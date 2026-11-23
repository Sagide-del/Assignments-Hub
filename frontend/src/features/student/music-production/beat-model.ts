import {
  starter,
  drumPresets,
  guitarPresets,
  validDraft,
  type InstrumentDraft,
} from "./instrument-model";
export const styles = [
  "Dancehall",
  "Reggae",
  "Kenyan folk-inspired",
  "Gospel",
  "Pop",
] as const;
export interface BeatMix {
  version: 1;
  title: string;
  draft: InstrumentDraft;
  transpose: number;
  levels: number[];
  muted: boolean[];
  solo: number | null;
  piano: { step: number; midi: number; length: number; velocity: number }[];
}
export function createBeat(style: string = "Dancehall"): BeatMix {
  const names = [
    "Dancehall pulse",
    "One drop",
    "Folk-inspired conversation",
    "Half-time space",
    "Pop pocket",
  ];
  const index = Math.max(0, styles.indexOf(style as (typeof styles)[number]));
  const d = starter(),
    drums = drumPresets[names[index]],
    guitar = Object.values(guitarPresets)[index % 4];
  d.bpm = drums.bpm;
  d.chords = [...guitar.chords];
  d.drums = drums.hits.map((h) =>
    Array.from({ length: 16 }, (_, i) => h.includes(i)),
  );
  d.melody = Array.from({ length: 4 }, (_, b) =>
    guitar.phrase.map((midi, i) => ({ step: b * 16 + i * 2, midi, length: 2 })),
  ).flat();
  return {
    version: 1,
    title: style + " sketch",
    draft: d,
    transpose: 0,
    levels: [0.8, 0.7, 0.55],
    muted: [false, false, false],
    solo: null,
    piano: Array.from({ length: 4 }, (_, b) =>
      [0, 6, 10, 14].map((s, i) => ({
        step: b * 16 + s,
        midi: guitar.phrase[(i + b) % 8] + 12,
        length: 2,
        velocity: 85,
      })),
    ).flat(),
  };
}
export function validBeat(v: unknown): v is BeatMix {
  const p = v as BeatMix;
  return (
    !!p &&
    p.version === 1 &&
    typeof p.title === "string" &&
    p.title.length <= 120 &&
    validDraft(p.draft) &&
    Number.isInteger(p.transpose) &&
    p.transpose >= -5 &&
    p.transpose <= 6 &&
    Array.isArray(p.levels) &&
    p.levels.length === 3 &&
    p.levels.every((x) => Number.isFinite(x) && x >= 0 && x <= 1) &&
    Array.isArray(p.muted) &&
    p.muted.length === 3 &&
    p.muted.every((x) => typeof x === "boolean") &&
    (p.solo === null || [0, 1, 2].includes(p.solo)) &&
    Array.isArray(p.piano) &&
    p.piano.length <= 512 &&
    p.piano.every(
      (n) =>
        Number.isFinite(n.step) &&
        n.step >= 0 &&
        Number.isFinite(n.length) &&
        n.length > 0 &&
        n.step + n.length <= p.draft.chords.length * 16 &&
        Number.isInteger(n.midi) &&
        n.midi >= 21 &&
        n.midi <= 108 &&
        Number.isFinite(n.velocity) &&
        n.velocity >= 1 &&
        n.velocity <= 127,
    )
  );
}
export function activeTrack(p: BeatMix, i: number) {
  return !p.muted[i] && (p.solo === null || p.solo === i);
}

export function beatChord(chord: string, transpose: number): string {
  const roots: Record<string, number> = {
    C: 0,
    Dm: 2,
    Em: 4,
    F: 5,
    G: 7,
    Am: 9,
  };
  return (
    ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][
      (roots[chord] + transpose + 12) % 12
    ] + (chord.endsWith("m") ? "m" : "")
  );
}
