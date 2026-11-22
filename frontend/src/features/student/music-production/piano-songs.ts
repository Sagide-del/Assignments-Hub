export const pianoSongs = [
  {
    id: "my_heart_will_go_on",
    title: "My Heart Will Go On (Titanic Theme)",
    artist: "Celine Dion (user-supplied study pattern)",
    key: "C Major",
    bpm: 100,
    time_signature: "4/4",
    genre: "Western Pop",
    tracks: [
      {
        name: "Melody (Piano)",
        instrument: "piano",
        pattern: [
          "C4",
          "C4",
          "C4",
          "C4",
          "B3",
          "C4",
          "C4",
          "B3",
          "C4",
          "D4",
          "E4",
        ],
      },
      {
        name: "Chords (Pad)",
        instrument: "synth_pad",
        pattern: [
          "C3",
          "C3",
          "C3",
          "C3",
          "G3",
          "G3",
          "F3",
          "F3",
          "C3",
          "C3",
          "C3",
        ],
      },
    ],
  },
  {
    id: "one_love",
    title: "One Love",
    artist: "",
    key: "C Major",
    bpm: 100,
    time_signature: "4/4",
    genre: "",
    tracks: [],
  },
  {
    id: "i_am_in_love",
    title: "I Am in Love",
    artist: "",
    key: "C Major",
    bpm: 100,
    time_signature: "4/4",
    genre: "",
    tracks: [],
  },
  {
    id: "pain_in_the_heart",
    title: "Pain in the Heart",
    artist: "",
    key: "C Major",
    bpm: 100,
    time_signature: "4/4",
    genre: "",
    tracks: [],
  },
];
export interface PianoSketch {
  bpm: number;
  tracks: {
    name: string;
    instrument: "piano" | "synth_pad";
    pattern: string[];
  }[];
}
export function noteMidi(note: string): number {
  const match = /^([A-G])(#|b)?([1-6])$/.exec(note);
  if (!match) throw Error("Use notes such as C4, F#3 or Bb3.");
  return (
    (Number(match[3]) + 1) * 12 +
    ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[
      match[1]
    ] +
    (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0)
  );
}
export function parsePianoSketch(value: unknown): PianoSketch {
  const d = value as PianoSketch;
  if (
    value &&
    typeof value === "object" &&
    "time_signature" in value &&
    value.time_signature !== "4/4"
  )
    throw Error("Song sketches currently use 4/4 time.");
  if (
    !d ||
    !Number.isInteger(d.bpm) ||
    d.bpm < 60 ||
    d.bpm > 160 ||
    !Array.isArray(d.tracks) ||
    d.tracks.length !== 2
  )
    throw Error(
      "Provide two tracks (piano and synth_pad), and a tempo from 60–160 BPM.",
    );
  const tracks = d.tracks.map((t, i) => {
    if (
      !t ||
      t.instrument !== (i === 0 ? "piano" : "synth_pad") ||
      !Array.isArray(t.pattern) ||
      !t.pattern.length ||
      t.pattern.length > 16
    )
      throw Error(
        "Each track needs 1–16 notes; piano first, synth_pad second.",
      );
    for (const n of t.pattern) {
      if (typeof n !== "string") throw Error("Each note must be text.");
      const midi = noteMidi(n);
      if (midi < 36 || midi > 84) throw Error("Keep notes between C2 and C6.");
    }
    return {
      name: i === 0 ? "Melody (Piano)" : "Chords (Pad)",
      instrument: t.instrument,
      pattern: [...t.pattern],
    };
  });
  return { bpm: d.bpm, tracks };
}
export const pianoPitch = (midi: number) =>
  ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][midi % 12] +
  (Math.floor(midi / 12) - 1);
