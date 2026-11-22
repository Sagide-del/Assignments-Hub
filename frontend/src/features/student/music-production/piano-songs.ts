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
    id: "how_long_will_i_love_you",
    title: "How Long Will I Love You — opening excerpt",
    artist: "Ellie Goulding / Mike Scott",
    key: "C Major",
    bpm: 60,
    time_signature: "4/4",
    genre: "Pop ballad",
    tracks: [],
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
function normalizedNote(value: string): string {
  return value
    .trim()
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/^[a-g]/, (letter) => letter.toUpperCase());
}
export function noteMidi(note: string): number {
  const match = /^([A-G])(#|b)?([0-8])$/.exec(normalizedNote(note));
  if (!match) throw Error("Use notes such as C4, F#3 or Bb3.");
  const midi =
    (Number(match[3]) + 1) * 12 +
    ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[
      match[1]
    ] +
    (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
  if (midi < 21 || midi > 108)
    throw Error("Keep notes within the piano range A0–C8.");
  return midi;
}
export function parsePianoSketch(value: unknown): PianoSketch {
  if (!value || typeof value !== "object")
    throw Error("Provide a JSON object with bpm and two tracks.");
  const d = value as Record<string, unknown>;
  if (d.time_signature !== undefined && d.time_signature !== "4/4")
    throw Error("Song sketches currently use 4/4 time.");
  if (
    typeof d.bpm !== "number" ||
    !Number.isInteger(d.bpm) ||
    d.bpm < 60 ||
    d.bpm > 160
  )
    throw Error("Tempo must be a whole number from 60–160 BPM.");
  if (!Array.isArray(d.tracks) || d.tracks.length !== 2)
    throw Error("Provide two tracks: piano first, synth_pad second.");
  const tracks = d.tracks.map((raw: unknown, i: number) => {
    if (!raw || typeof raw !== "object")
      throw Error(`Track ${i + 1} must be an object.`);
    const t = raw as Record<string, unknown>,
      expected = i === 0 ? ("piano" as const) : ("synth_pad" as const);
    // Explicit instrument wins; an invalid explicit value is never silently replaced.
    const kind = t.instrument === undefined ? t.name : t.instrument;
    if (typeof kind !== "string" || kind.trim().toLowerCase() !== expected)
      throw Error(
        `Track ${i + 1}: use instrument: "${expected}" or name: "${expected}".`,
      );
    if (!Array.isArray(t.pattern) || !t.pattern.length || t.pattern.length > 16)
      throw Error(`Track ${i + 1}: provide 1–16 note names in pattern.`);
    const pattern = t.pattern.map((note: unknown, j: number) => {
      if (typeof note !== "string")
        throw Error(
          `Track ${i + 1}, note ${j + 1}: use a pitch name such as C4.`,
        );
      try {
        noteMidi(note);
      } catch (e) {
        throw Error(
          `Track ${i + 1}, note ${j + 1}: ${e instanceof Error ? e.message : "Invalid pitch."}`,
        );
      }
      return normalizedNote(note);
    });
    return {
      name: i === 0 ? "Melody (Piano)" : "Chords (Pad)",
      instrument: expected,
      pattern,
    };
  });
  return { bpm: d.bpm, tracks };
}
export const pianoPitch = (midi: number) =>
  ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][midi % 12] +
  (Math.floor(midi / 12) - 1);
