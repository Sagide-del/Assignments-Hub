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
export const PITCHES = Array.from({ length: 45 }, (_, i) => 84 - i);
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
  "Gentle arpeggio": {
    bpm: 92,
    chords: ["C", "Em", "F", "G"],
    phrase: [60, 64, 67, 64, 62, 67, 71, 67],
  },
  "Rumba-inspired interlock": {
    bpm: 116,
    chords: ["C", "F", "G", "C"],
    phrase: [72, 76, 79, 76, 74, 71, 67, 71],
  },
  "Mugithi-inspired picking": {
    bpm: 122,
    chords: ["C", "G", "C", "F"],
    phrase: [48, 64, 55, 67, 48, 72, 55, 67],
  },
  "Benga-inspired lead": {
    bpm: 128,
    chords: ["C", "F", "C", "G"],
    phrase: [76, 79, 72, 79, 77, 81, 76, 74],
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
Object.assign(drumPresets, {
  "Rumba-inspired clave": {
    bpm: 116,
    hits: [
      [0, 8],
      [4, 12],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [7, 15],
      [2, 10],
      [5, 13],
      [0, 3, 6, 10, 12],
      [1, 3, 5, 7, 9, 11, 13, 15],
    ],
  },
  "Mugithi-inspired pulse": {
    bpm: 122,
    hits: [
      [0, 4, 8, 12],
      [4, 12],
      [2, 6, 10, 14],
      [],
      [],
      [15],
      [12],
      [0, 2, 4, 6, 8, 10, 12, 14],
    ],
  },
  "Benga-inspired drive": {
    bpm: 128,
    hits: [
      [0, 7, 8, 14],
      [4, 12],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [6, 14],
      [11],
      [],
      [4, 12],
      [1, 3, 5, 7, 9, 11, 13, 15],
    ],
  },
});
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
    d.chords.length >= 1 &&
    d.chords.length <= 16 &&
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
        n.step < d.chords.length * 16 &&
        Number.isInteger(n.midi) &&
        n.midi >= 40 &&
        n.midi <= 84 &&
        Number.isInteger(n.length) &&
        n.length >= 1 &&
        n.length <= 8 &&
        n.step + n.length <= d.chords.length * 16,
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
          { step, midi, length: Math.min(length, d.chords.length * 16 - step) },
        ],
  };
}

export function parseGuitarImport(value: unknown): InstrumentDraft {
  if (validDraft(value)) return value;
  const v = value as {
    bpm: number;
    voice?: GuitarVoice;
    bars: { chord: string; notes: string[] }[];
  };
  if (!v || !Array.isArray(v.bars) || v.bars.length < 1 || v.bars.length > 16)
    throw Error("Use 1–16 bars, each with a chord and eight notes.");
  const d = starter();
  d.bpm = v.bpm;
  d.voice = v.voice ?? "Nylon";
  d.chords = v.bars.map((b) => b.chord);
  d.melody = v.bars.flatMap((b, bar) => {
    if (!Array.isArray(b.notes) || b.notes.length !== 8)
      throw Error("Each bar needs eight eighth-notes. Use R for a rest.");
    return b.notes.flatMap((note, i) => {
      if (note === "R") return [];
      const m = /^([A-G])(#|b)?([2-6])$/.exec(note);
      if (!m) throw Error("Invalid note: " + note);
      const midi =
        (Number(m[3]) + 1) * 12 +
        ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] ?? 0) +
        (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
      return [{ step: bar * 16 + i * 2, midi, length: 2 }];
    });
  });
  if (!validDraft(d))
    throw Error(
      "Check tempo (60–160), chords (C, Am, F, G, Em, Dm), and notes (E2–C6).",
    );
  return d;
}
