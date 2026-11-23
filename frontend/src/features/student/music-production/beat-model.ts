import {
  CHORDS,
  starter,
  validDraft,
  type InstrumentDraft,
} from "./instrument-model";
import { GENRE_STUDIES } from "./genre-studies";
export const styles = GENRE_STUDIES.map((s) => s.name);
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
  const study = GENRE_STUDIES.find((s) => s.name === style) ?? GENRE_STUDIES[0];
  const d = starter();
  d.bpm = study.bpm;
  d.chords = [...study.chords];
  d.drums = study.hits.map((h) =>
    Array.from({ length: 16 }, (_, i) => h.includes(i)),
  );
  d.melody = Array.from({ length: 4 }, (_, bar) =>
    study.steps.map((step, i) => {
      const tones = CHORDS[d.chords[bar]],
        original = study.phrase[i % study.phrase.length];
      const candidates = Array.from({ length: 45 }, (_, n) => n + 40).filter(
        (n) => tones.some((t) => t % 12 === n % 12),
      );
      const midi =
        study.name === "Mugithi-inspired picking" && i % 2 === 0
          ? tones[0] + (i % 4 === 0 ? 0 : 7)
          : candidates.reduce((a, b) =>
              Math.abs(b - original) < Math.abs(a - original) ? b : a,
            );
      return { step: bar * 16 + step, midi, length: Math.min(2, 16 - step) };
    }),
  ).flat();
  return {
    version: 1,
    title: style + " sketch",
    draft: d,
    transpose: 0,
    levels: [0.8, 0.7, 0.55],
    muted: [false, false, false],
    solo: null,
    piano: Array.from({ length: 4 }, (_, bar) =>
      study.pianoSteps.map((step, i) => ({
        step: bar * 16 + step,
        midi: CHORDS[d.chords[bar]][i % 3] + 12,
        length: Math.min(3, 16 - step),
        velocity: 78 + (i % 2) * 10,
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
