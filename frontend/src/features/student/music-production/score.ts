import {
  SCALES,
  stepsFor,
  pitchName,
  midiFromName,
  newMix,
  type ProductionDraft,
  type ProductionMeter,
  type ProductionMix,
  type MelodyNote,
} from "../../../../../backend/src/student/music-production/model";
import type {
  NotationJson,
  ScorePart,
} from "../../../components/MusicNotation";
export interface StudioSong {
  id: string;
  slug: string;
  title: string;
  artist: string;
  genre: string;
  key: string;
  bpm: number;
  time_signature: ProductionMeter;
  chord_progression: string[];
  notation_json: {
    parts?: ScorePart[];
    melody?: { bar: number; step: number; pitch: string; length: number }[];
    scale?: string;
    mix_levels?: Record<string, number>;
  };
  isukuti_pattern: Record<string, boolean[]> | null;
  content_kind: string;
  source_note: string;
  reference_url: string | null;
}
export const durationFor = (length: number): string =>
  (
    ({
      1: "16",
      2: "8",
      3: "8d",
      4: "q",
      6: "qd",
      8: "h",
      12: "hd",
      16: "w",
    }) as Record<number, string>
  )[length] ?? "16";
function measures(notes: MelodyNote[], meter: ProductionMeter) {
  const steps = stepsFor(meter);
  return Array.from({ length: 4 }, (_, bar) => {
    const out: { keys: string[]; duration: string }[] = [];
    for (let i = 0; i < steps;) {
      const n = notes.find((n) => n.bar === bar && n.step === i);
      if (n) {
        out.push({
          keys: [pitchName(n.midi)],
          duration: durationFor(n.length),
        });
        i += n.length;
      } else {
        out.push({ keys: ["B4"], duration: "16r" });
        i++;
      }
    }
    return out;
  });
}
export function scoreFor(p: ProductionDraft, song?: StudioSong): NotationJson {
  const lead: ScorePart = {
    name: "Soprano",
    clef: "treble",
    measures: measures(p.tracks_json.melody, p.time_signature),
  };
  const quarterCount = stepsFor(p.time_signature) / 4;
  const supporting = (song?.notation_json.parts ?? [])
    .filter((p) => p.name !== "Soprano")
    .map((part) => ({
      ...part,
      measures: Array.from({ length: 4 }, (_, b) =>
        Array.from(
          { length: quarterCount },
          (_, i) =>
            part.measures[b]?.[
              i % Math.max(1, part.measures[b]?.length ?? 1)
            ] ?? { keys: [part.clef === "bass" ? "C3" : "C4"], duration: "q" },
        ),
      ),
    }));
  return { parts: [lead, ...supporting] };
}
export function draftFromSong(song: StudioSong): ProductionDraft {
  const mix = newMix(song.time_signature);
  if (song.notation_json.scale === "A Minor") mix.scale = "A Minor";
  mix.melody = (song.notation_json.melody ?? []).map((n) => ({
    bar: n.bar,
    step: n.step,
    midi: midiFromName(n.pitch),
    length: n.length,
  }));
  mix.tracks = mix.tracks.map((t) => ({
    ...t,
    pattern: song.isukuti_pattern?.[t.id] ?? t.pattern,
    volume: song.notation_json.mix_levels?.[t.id] ?? t.volume,
  }));
  return {
    title: `${song.title} — my mix`,
    song_id: song.id,
    bpm: song.bpm,
    time_signature: song.time_signature,
    tracks_json: mix,
  };
}
export function editMelody(mix: ProductionMix, n: MelodyNote): ProductionMix {
  const same = mix.melody.some(
    (a) => a.bar === n.bar && a.step === n.step && a.midi === n.midi,
  );
  const without = mix.melody.filter(
    (a) =>
      a.bar !== n.bar ||
      a.step >= n.step + n.length ||
      n.step >= a.step + a.length,
  );
  return {
    ...mix,
    melody: same
      ? without
      : [...without, n].sort((a, b) => a.bar - b.bar || a.step - b.step),
  };
}

export function adaptScale(
  mix: ProductionMix,
  scale: keyof typeof SCALES,
): ProductionMix {
  const pitches = [...SCALES[scale]] as number[];
  return {
    ...mix,
    scale,
    melody: mix.melody.map((n) => ({
      ...n,
      midi: pitches.reduce(
        (best, p) =>
          Math.abs(p - n.midi) < Math.abs(best - n.midi) ? p : best,
        pitches[0],
      ),
    })),
  };
}
