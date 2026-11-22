export type ModuleKind = "guitar" | "drums";
export type GuitarVoice = "Nylon" | "Steel";
export interface GuitarNote {
  step: number;
  midi: number;
  length: number;
}
export interface InstrumentDraft {
  version: 1;
  bpm: number;
  voice: GuitarVoice;
  melody: GuitarNote[];
  chords: string[];
  drums: boolean[][];
}
export const CHORDS: Record<string, number[]> = {
  C: [48, 52, 55, 60, 64],
  Am: [45, 52, 57, 60, 64],
  F: [41, 48, 53, 57, 60],
  G: [43, 50, 55, 59, 62],
  Em: [40, 47, 52, 55, 59],
  Dm: [50, 53, 57, 62],
};
export const DRUMS = [
  "Kick",
  "Snare",
  "Closed hat",
  "Open hat",
  "Low tom",
  "High tom",
  "Clap",
  "Shaker",
] as const;
export const PITCHES = Array.from({ length: 25 }, (_, i) => 76 - i);
export const pitch = (midi: number) =>
  ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][midi % 12] +
  (Math.floor(midi / 12) - 1);
export const guitarPresets = {
  "Sunrise picking": {
    bpm: 88,
    chords: ["C", "Am", "F", "G"],
    phrase: [64, 67, 69, 67, 64, 62, 60, 62],
  },
  "Coastal breeze": {
    bpm: 102,
    chords: ["C", "G", "Am", "F"],
    phrase: [67, 69, 72, 71, 67, 64, 62, 64],
  },
  "Evening nylon": {
    bpm: 76,
    chords: ["Am", "F", "C", "G"],
    phrase: [69, 72, 71, 67, 64, 65, 64, 60],
  },
  "Gentle waltz feel": {
    bpm: 92,
    chords: ["C", "Em", "F", "G"],
    phrase: [60, 64, 67, 64, 62, 67, 71, 67],
  },
};
export const drumPresets: Record<string, { bpm: number; hits: number[][] }> = {
  "One drop": {
    bpm: 82,
    hits: [
      [8],
      [8],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [15],
      [],
      [],
      [],
      [1, 3, 5, 7, 9, 11, 13, 15],
    ],
  },
  "Dancehall pulse": {
    bpm: 100,
    hits: [
      [0, 6, 10],
      [4, 12],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [14],
      [11],
      [],
      [4, 12],
      [3, 7, 11, 15],
    ],
  },
  "Folk-inspired conversation": {
    bpm: 112,
    hits: [
      [0, 8],
      [4, 12],
      [0, 4, 8, 12],
      [],
      [0, 6, 10],
      [3, 7, 14],
      [4, 12],
      [0, 2, 4, 6, 8, 10, 12, 14],
    ],
  },
  "Pop pocket": {
    bpm: 108,
    hits: [
      [0, 8, 10],
      [4, 12],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [15],
      [],
      [],
      [4, 12],
      [],
    ],
  },
  "Afro-inspired bounce": {
    bpm: 106,
    hits: [
      [0, 7, 10],
      [4, 12],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [6, 14],
      [3, 11],
      [7, 15],
      [4, 12],
      [1, 3, 5, 7, 9, 11, 13, 15],
    ],
  },
  "Half-time space": {
    bpm: 90,
    hits: [
      [0, 6, 11],
      [8],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [15],
      [],
      [14],
      [],
      [3, 7, 11, 15],
    ],
  },
};
export function starter(): InstrumentDraft {
  return {
    version: 1,
    bpm: 88,
    voice: "Nylon",
    chords: ["C", "Am", "F", "G"],
    melody: Array.from({ length: 4 }, (_, bar) =>
      guitarPresets["Sunrise picking"].phrase.map((midi, i) => ({
        step: bar * 16 + i * 2,
        midi,
        length: 2,
      })),
    ).flat(),
    drums: drumPresets["Pop pocket"].hits.map((h) =>
      Array.from({ length: 16 }, (_, i) => h.includes(i)),
    ),
  };
}
export function validDraft(value: unknown): value is InstrumentDraft {
  const d = value as InstrumentDraft;
  return (
    !!d &&
    d.version === 1 &&
    Number.isInteger(d.bpm) &&
    d.bpm >= 60 &&
    d.bpm <= 160 &&
    ["Nylon", "Steel"].includes(d.voice) &&
    Array.isArray(d.chords) &&
    d.chords.length === 4 &&
    d.chords.every(
      (c) =>
        typeof c === "string" &&
        Object.prototype.hasOwnProperty.call(CHORDS, c),
    ) &&
    Array.isArray(d.melody) &&
    d.melody.length <= 256 &&
    d.melody.every(
      (n) =>
        n &&
        typeof n === "object" &&
        Number.isInteger(n.step) &&
        n.step >= 0 &&
        n.step < 64 &&
        Number.isInteger(n.midi) &&
        n.midi >= 40 &&
        n.midi <= 84 &&
        Number.isInteger(n.length) &&
        n.length >= 1 &&
        n.length <= 8 &&
        n.step + n.length <= 64,
    ) &&
    Array.isArray(d.drums) &&
    d.drums.length === 8 &&
    d.drums.every(
      (r) =>
        Array.isArray(r) &&
        r.length === 16 &&
        r.every((v) => typeof v === "boolean"),
    )
  );
}
export function toggleNote(
  d: InstrumentDraft,
  step: number,
  midi: number,
  length: number,
): InstrumentDraft {
  const found = d.melody.some((n) => n.step === step && n.midi === midi);
  return {
    ...d,
    melody: found
      ? d.melody.filter((n) => n.step !== step || n.midi !== midi)
      : [
          ...d.melody.filter(
            (n) =>
              n.midi !== midi ||
              n.step + n.length <= step ||
              n.step >= step + length,
          ),
          { step, midi, length: Math.min(length, 64 - step) },
        ],
  };
}
