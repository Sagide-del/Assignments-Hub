import { parsePianoSketch, noteMidi, pianoPitch } from "./piano-songs";
export interface RollNote {
  id: string;
  start: number;
  duration: number;
  midi: number;
  velocity: number;
}
export interface RollTrack {
  name: string;
  instrument: "piano" | "synth_pad";
  volume: number;
  muted: boolean;
  notes: RollNote[];
}
export interface RollProject {
  version: 2;
  title: string;
  bpm: number;
  bars: number;
  source: string;
  tracks: RollTrack[];
}
export const noteId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const cloneRoll = (p: RollProject): RollProject =>
  JSON.parse(JSON.stringify(p));
export const snapBeat = (value: number, snap: number) =>
  Math.round(value / snap) * snap;
export function blankRoll(title = "Untitled pattern"): RollProject {
  return {
    version: 2,
    title,
    bpm: 100,
    bars: 4,
    source: "Original composition",
    tracks: [
      {
        name: "Melody · Piano",
        instrument: "piano",
        volume: 0.8,
        muted: false,
        notes: [],
      },
      {
        name: "Harmony · Pad",
        instrument: "synth_pad",
        volume: 0.55,
        muted: false,
        notes: [],
      },
    ],
  };
}
export function legacyToRoll(
  value: unknown,
  title = "Imported pattern",
): RollProject {
  const sketch = parsePianoSketch(value),
    p = blankRoll(title);
  p.bpm = sketch.bpm;
  p.source = "Imported note pattern · original pitches preserved";
  p.tracks = p.tracks.map((t, i) => ({
    ...t,
    notes: sketch.tracks[i].pattern.map((pitch, start) => ({
      id: noteId(),
      start,
      duration: 1,
      midi: noteMidi(pitch),
      velocity: i === 0 ? 96 : 76,
    })),
  }));
  return p;
}
export function timedToRoll(score: {
  title: string;
  bpm: number;
  beats: number;
  source: string;
  melody: { beat: number; duration: number; notes: string[] }[];
  pad: { beat: number; duration: number; notes: string[] }[];
}): RollProject {
  const p = blankRoll(score.title);
  p.bpm = score.bpm;
  p.bars = Math.ceil(score.beats / 4);
  p.source = score.source;
  p.tracks = p.tracks.map((t, i) => ({
    ...t,
    notes: (i === 0 ? score.melody : score.pad).flatMap((e) =>
      e.notes.map((pitch) => ({
        id: noteId(),
        start: e.beat,
        duration: e.duration,
        midi: noteMidi(pitch),
        velocity: i === 0 ? 96 : 72,
      })),
    ),
  }));
  return p;
}
export function parseRollProject(
  value: unknown,
  title = "Imported pattern",
): RollProject {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 2
  )
    return legacyToRoll(value, title);
  const p = value as RollProject;
  if (
    typeof p.title !== "string" ||
    !p.title.trim() ||
    p.title.length > 120 ||
    typeof p.source !== "string" ||
    p.source.length > 500 ||
    !Number.isInteger(p.bpm) ||
    p.bpm < 60 ||
    p.bpm > 160 ||
    !Number.isInteger(p.bars) ||
    p.bars < 1 ||
    p.bars > 16 ||
    !Array.isArray(p.tracks) ||
    p.tracks.length !== 2
  )
    throw Error("Invalid piano project. Use 1–16 bars and 60–160 BPM.");
  const ids = new Set<string>();
  p.tracks.forEach((t, i) => {
    if (
      !t ||
      t.instrument !== (i === 0 ? "piano" : "synth_pad") ||
      typeof t.name !== "string" ||
      t.name.length > 80 ||
      typeof t.volume !== "number" ||
      !Number.isFinite(t.volume) ||
      t.volume < 0 ||
      t.volume > 1 ||
      typeof t.muted !== "boolean" ||
      !Array.isArray(t.notes) ||
      t.notes.length > 256
    )
      throw Error(`Track ${i + 1}: invalid instrument, level or note count.`);
    t.notes.forEach((n, j) => {
      if (
        !n ||
        typeof n.id !== "string" ||
        !/^[a-zA-Z0-9-]{1,80}$/.test(n.id) ||
        ids.has(n.id) ||
        !Number.isFinite(n.start) ||
        n.start < 0 ||
        !Number.isFinite(n.duration) ||
        n.duration < 1 / 16 ||
        n.start + n.duration > p.bars * 4 + 1e-7 ||
        !Number.isInteger(n.midi) ||
        n.midi < 21 ||
        n.midi > 108 ||
        !Number.isInteger(n.velocity) ||
        n.velocity < 1 ||
        n.velocity > 127
      )
        throw Error(
          `Track ${i + 1}, note ${j + 1}: invalid pitch, timing or velocity.`,
        );
      ids.add(n.id);
    });
  });
  return cloneRoll(p);
}
export function moveRollNotes(
  p: RollProject,
  track: number,
  ids: string[],
  beatDelta: number,
  pitchDelta: number,
): RollProject {
  const selected = p.tracks[track].notes.filter((n) => ids.includes(n.id));
  if (!selected.length) return p;
  const dt = Math.max(
    -Math.min(...selected.map((n) => n.start)),
    Math.min(
      beatDelta,
      p.bars * 4 - Math.max(...selected.map((n) => n.start + n.duration)),
    ),
  );
  const dp = Math.max(
    21 - Math.min(...selected.map((n) => n.midi)),
    Math.min(pitchDelta, 108 - Math.max(...selected.map((n) => n.midi))),
  );
  return {
    ...p,
    tracks: p.tracks.map((t, i) =>
      i !== track
        ? t
        : {
            ...t,
            notes: t.notes.map((n) =>
              ids.includes(n.id)
                ? {
                    ...n,
                    start: Math.round((n.start + dt) * 10000) / 10000,
                    midi: n.midi + dp,
                  }
                : n,
            ),
          },
    ),
  };
}
export function resizeRollNote(
  p: RollProject,
  track: number,
  id: string,
  duration: number,
  snap: number,
): RollProject {
  return {
    ...p,
    tracks: p.tracks.map((t, i) =>
      i !== track
        ? t
        : {
            ...t,
            notes: t.notes.map((n) =>
              n.id === id
                ? {
                    ...n,
                    duration: Math.min(
                      p.bars * 4 - n.start,
                      Math.max(snap, snapBeat(duration, snap)),
                    ),
                  }
                : n,
            ),
          },
    ),
  };
}
export function duplicateRollNotes(
  p: RollProject,
  track: number,
  ids: string[],
): { project: RollProject; ids: string[] } {
  const selected = p.tracks[track].notes.filter((n) => ids.includes(n.id));
  if (!selected.length) return { project: p, ids: [] };
  const offset = Math.max(
    0.25,
    Math.ceil(
      (Math.max(...selected.map((n) => n.start + n.duration)) -
        Math.min(...selected.map((n) => n.start))) *
        4,
    ) / 4,
  );
  if (
    p.tracks[track].notes.length + selected.length > 256 ||
    Math.max(...selected.map((n) => n.start + n.duration)) + offset > p.bars * 4
  )
    return { project: p, ids: [] };
  const notes = selected.map((n) => ({
    ...n,
    id: noteId(),
    start: n.start + offset,
  }));
  return {
    project: {
      ...p,
      tracks: p.tracks.map((t, i) =>
        i !== track ? t : { ...t, notes: [...t.notes, ...notes] },
      ),
    },
    ids: notes.map((n) => n.id),
  };
}
export const rollPitch = pianoPitch;
export function rollMidi(p: RollProject): ArrayBuffer {
  const vlq = (n: number) => {
    const bytes = [n & 127];
    while ((n >>= 7)) bytes.unshift((n & 127) | 128);
    return bytes;
  };
  const be = (n: number, size: number) =>
      Array.from(
        { length: size },
        (_, i) => (n >>> ((size - 1 - i) * 8)) & 255,
      ),
    txt = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
  const tracks = p.tracks.map((track, channel) => {
    const events: { tick: number; order: number; data: number[] }[] = [
      { tick: 0, order: 0, data: [0xc0 | channel, channel === 0 ? 0 : 89] },
    ];
    if (channel === 0)
      events.push(
        {
          tick: 0,
          order: 0,
          data: [255, 81, 3, ...be(Math.round(60000000 / p.bpm), 3)],
        },
        { tick: 0, order: 0, data: [255, 88, 4, 4, 2, 24, 8] },
      );
    if (!track.muted && track.volume > 0)
      for (const n of track.notes)
        events.push(
          {
            tick: Math.round(n.start * 480),
            order: 2,
            data: [
              0x90 | channel,
              n.midi,
              Math.max(1, Math.round(n.velocity * track.volume)),
            ],
          },
          {
            tick: Math.round((n.start + n.duration) * 480),
            order: 1,
            data: [0x80 | channel, n.midi, 0],
          },
        );
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    let last = 0;
    const bytes: number[] = [];
    for (const e of events) {
      bytes.push(...vlq(e.tick - last), ...e.data);
      last = e.tick;
    }
    bytes.push(...vlq(p.bars * 4 * 480 - last), 255, 47, 0);
    return [...txt("MTrk"), ...be(bytes.length, 4), ...bytes];
  });
  return new Uint8Array([
    ...txt("MThd"),
    0,
    0,
    0,
    6,
    0,
    1,
    0,
    2,
    1,
    224,
    ...tracks.flat(),
  ]).buffer;
}
