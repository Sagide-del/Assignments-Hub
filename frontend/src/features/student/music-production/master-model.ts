import { validVocals, type VocalSettings } from "./vocal-model";
import { createBeat, validBeat, type BeatMix } from "./beat-model";
import { validDraft, type InstrumentDraft } from "./instrument-model";
import { type RollProject, parseRollProject } from "./piano-roll-model";
export type TrackId = 0 | 1 | 2;
export interface BeatClip {
  id: string;
  track: TrackId;
  start: number;
  length: number;
  offset: number;
}
export interface MasterProject {
  version: 2;
  mix: BeatMix;
  bars: number;
  clips: BeatClip[];
  pan: number[];
  master: number;
  fadeOutBars: number;
  sources: string[];
  sourceBars: number[];
  pianoSource?: RollProject;
  vocals?: VocalSettings;
}
const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function arrange(mix: BeatMix): MasterProject {
  const clips: BeatClip[] = [];
  for (const [start, length, tracks] of [
    [0, 4, [1]],
    [4, 8, [0, 1]],
    [12, 8, [0, 1, 2]],
    [20, 4, [1, 2]],
  ] as [number, number, TrackId[]][])
    for (const track of tracks)
      clips.push({ id: id(), track, start, length, offset: 0 });
  return {
    version: 2,
    mix: structuredClone(mix),
    bars: 24,
    clips,
    pan: [0, -0.15, 0.15],
    master: 0.8,
    fadeOutBars: 1,
    sources: ["Starter drums", "Starter guitar", "Starter piano"],
    sourceBars: [1, mix.draft.chords.length, mix.draft.chords.length],
  };
}
export function parseMaster(value: unknown): MasterProject {
  const p = value as MasterProject;
  if (validBeat(value)) return arrange(value);
  if (
    !p ||
    p.version !== 2 ||
    !validBeat(p.mix) ||
    !Number.isInteger(p.bars) ||
    p.bars < 4 ||
    p.bars > 64 ||
    !Array.isArray(p.clips) ||
    p.clips.length > 96 ||
    !Array.isArray(p.pan) ||
    p.pan.length !== 3 ||
    !p.pan.every((x) => Number.isFinite(x) && x >= -1 && x <= 1) ||
    !Number.isInteger(p.fadeOutBars) ||
    p.fadeOutBars < 0 ||
    p.fadeOutBars > 4 ||
    p.fadeOutBars > p.bars ||
    !Number.isFinite(p.master) ||
    p.master < 0 ||
    p.master > 1 ||
    !Array.isArray(p.sourceBars) ||
    p.sourceBars.length !== 3 ||
    !p.sourceBars.every(
      (n) => Number.isInteger(n) && n >= 1 && n <= p.mix.draft.chords.length,
    ) ||
    !Array.isArray(p.sources) ||
    p.sources.length !== 3 ||
    !p.sources.every((s) => typeof s === "string" && s.length <= 160)
  )
    throw Error("Invalid Master Beat project.");
  if (p.vocals !== undefined && !validVocals(p.vocals))
    throw Error("Invalid vocal track settings.");
  if (p.pianoSource) {
    const source = parseRollProject(p.pianoSource);
    if (source.bars !== p.sourceBars[2])
      throw Error("Piano source length does not match its pattern.");
  }
  const ids = new Set<string>();
  for (const c of p.clips) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !c.id.length ||
      c.id.length > 100 ||
      ids.has(c.id) ||
      ![0, 1, 2].includes(c.track) ||
      !Number.isInteger(c.start) ||
      c.start < 0 ||
      !Number.isInteger(c.length) ||
      c.length < 1 ||
      c.start + c.length > p.bars ||
      !Number.isInteger(c.offset) ||
      c.offset < 0 ||
      c.offset >= p.sourceBars[c.track]
    )
      throw Error("Invalid arrangement clip.");
    ids.add(c.id);
  }
  for (const a of p.clips)
    for (const b of p.clips)
      if (
        a !== b &&
        a.track === b.track &&
        a.start < b.start + b.length &&
        b.start < a.start + a.length
      )
        throw Error("Clips on the same track cannot overlap.");
  return structuredClone(p);
}
export function newMaster(style = "Dancehall") {
  return arrange(createBeat(style));
}
export function changeClip(p: MasterProject, clip: BeatClip): MasterProject {
  return parseMaster({
    ...p,
    clips: p.clips.some((c) => c.id === clip.id)
      ? p.clips.map((c) => (c.id === clip.id ? clip : c))
      : [...p.clips, clip],
  });
}
export function addClip(
  p: MasterProject,
  track: TrackId,
  start: number,
  length = p.mix.draft.chords.length,
) {
  return changeClip(p, { id: id(), track, start, length, offset: 0 });
}
export function duplicateClip(p: MasterProject, clip: BeatClip) {
  return changeClip(p, { ...clip, id: id(), start: clip.start + clip.length });
}
export function importPart(
  p: MasterProject,
  kind: "piano" | "guitar" | "drums",
  payload: unknown,
): MasterProject {
  const next = structuredClone(p),
    oldBars = p.mix.draft.chords.length;
  if (kind === "piano") {
    const piano = parseRollProject(payload),
      bars = Math.max(oldBars, piano.bars);
    next.mix.draft.chords = Array.from(
      { length: bars },
      (_, i) => p.mix.draft.chords[i % oldBars],
    );
    next.mix.piano = piano.tracks
      .filter((t) => !t.muted)
      .flatMap((t) =>
        t.notes.map((n) => ({
          step: n.start * 4,
          length: n.duration * 4,
          midi: n.midi,
          velocity: Math.max(1, n.velocity * t.volume),
        })),
      );
    next.pianoSource = structuredClone(piano);
    next.sourceBars[2] = piano.bars;
    next.sources[2] = `${piano.title.slice(0, 90)} · ${piano.bpm} BPM source · follows shared tempo; key not supplied`;
  } else {
    if (!validDraft(payload)) throw Error("No valid saved instrument pattern.");
    const d = payload as InstrumentDraft;
    if (kind === "drums") next.mix.draft.drums = structuredClone(d.drums);
    else {
      const bars = Math.max(oldBars, d.chords.length);
      next.mix.draft = {
        ...structuredClone(d),
        bpm: p.mix.draft.bpm,
        drums: structuredClone(p.mix.draft.drums),
        chords: Array.from(
          { length: bars },
          (_, i) => d.chords[i % d.chords.length],
        ),
      };
    }
    next.sourceBars[kind === "drums" ? 0 : 1] =
      kind === "drums" ? 1 : d.chords.length;
    next.clips = next.clips.map((c) => ({
      ...c,
      offset: c.offset % next.sourceBars[c.track],
    }));
    next.sources[kind === "drums" ? 0 : 1] =
      `Saved ${kind} · ${d.bpm} BPM source · follows shared tempo`;
  }
  next.clips = next.clips.map((c) => ({
    ...c,
    offset: c.offset % next.sourceBars[c.track],
  }));
  return parseMaster(next);
}
export function resizeArrangement(p: MasterProject, bars: number) {
  return parseMaster({
    ...p,
    bars,
    clips: p.clips
      .filter((c) => c.start < bars)
      .map((c) => ({ ...c, length: Math.min(c.length, bars - c.start) })),
  });
}
