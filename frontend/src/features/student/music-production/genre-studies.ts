export interface GenreStudy {
  name: string;
  bpm: number;
  chords: string[];
  phrase: number[];
  steps: number[];
  pianoSteps: number[];
  hits: number[][];
  concept: string;
  task: string;
  question: string;
  answer: string;
}
// Original teaching arrangements. These are technique studies, not traditional-song transcriptions.
export const GENRE_STUDIES: GenreStudy[] = [
  {
    name: "Dancehall",
    bpm: 100,
    chords: ["Am", "F", "C", "G"],
    phrase: [69, 72, 76, 72, 71, 69],
    steps: [0, 3, 6, 8, 11, 14],
    pianoSteps: [0, 6, 10],
    hits: [
      [0, 6, 10],
      [4, 12],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [14],
      [],
      [],
      [4, 12],
      [3, 7, 11, 15],
    ],
    concept: "Syncopation",
    task: "Move a kick from step 1 to step 3. Compare the original and edited groove.",
    question: "What changes when a strong sound falls between the main beats?",
    answer:
      "The rhythm becomes syncopated: accents move away from the expected strong beats.",
  },
  {
    name: "Reggae",
    bpm: 78,
    chords: ["C", "F", "G", "C"],
    phrase: [64, 67, 69, 67],
    steps: [2, 6, 10, 14],
    pianoSteps: [2, 6, 10, 14],
    hits: [
      [8],
      [8],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [15],
      [],
      [],
      [],
      [3, 7, 11, 15],
    ],
    concept: "Offbeat and one-drop",
    task: "Solo the drums, then add the offbeat guitar. Explain why the spaces matter.",
    question: "On which beat of this four-beat pattern do kick and snare meet?",
    answer:
      "Beat 3: step 9 on a sixteen-step grid. The guitar answers on the offbeats.",
  },
  {
    name: "Kenyan folk-inspired",
    bpm: 112,
    chords: ["C", "C", "F", "G"],
    phrase: [60, 64, 67, 69, 67, 64],
    steps: [0, 2, 5, 8, 10, 14],
    pianoSteps: [0, 8],
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
    concept: "Call and response",
    task: "Let a low drum call for two beats, then make a high drum answer. Describe the dialogue.",
    question:
      "Is this a transcription of a particular Kenyan community’s performance?",
    answer:
      "No. It is an original call-and-response exercise. Use the listening references to study specific traditions.",
  },
  {
    name: "Gospel",
    bpm: 92,
    chords: ["C", "Am", "Dm", "G"],
    phrase: [64, 67, 72, 71, 69, 67],
    steps: [0, 4, 6, 8, 12, 14],
    pianoSteps: [0, 4, 8, 12],
    hits: [
      [0, 8, 14],
      [4, 12],
      [0, 2, 4, 6, 8, 10, 12, 14],
      [6, 14],
      [],
      [15],
      [4, 12],
      [2, 6, 10, 14],
    ],
    concept: "Harmony and texture",
    task: "Bring piano into the chorus only. Explain how the extra layer changes the texture.",
    question: "What is musical texture?",
    answer:
      "The way musical parts combine, such as a melody with chord and rhythm accompaniment.",
  },
  {
    name: "Pop",
    bpm: 108,
    chords: ["C", "G", "Am", "F"],
    phrase: [67, 69, 72, 71, 67, 64, 62, 64],
    steps: [0, 2, 4, 6, 8, 10, 12, 14],
    pianoSteps: [0, 8, 12],
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
    concept: "Song structure",
    task: "Create a sparse intro and a fuller chorus, then explain the contrast.",
    question:
      "How can you make a chorus stronger without increasing the master volume?",
    answer:
      "Add a musical layer, change the register or use a fuller rhythm while keeping the mix balanced.",
  },
  {
    name: "Rumba / sebene study",
    bpm: 116,
    chords: ["C", "F", "G", "C"],
    phrase: [72, 76, 79, 76, 74, 71, 67, 71],
    steps: [0, 2, 3, 6, 8, 10, 11, 14],
    pianoSteps: [0, 6, 12],
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
    concept: "Interlocking parts",
    task: "Pan guitar slightly left and piano slightly right. Keep each part audible without making both louder.",
    question:
      "What makes interlocking parts different from playing the same rhythm together?",
    answer:
      "They fill different rhythmic spaces and combine into a larger pattern.",
  },
  {
    name: "Mugithi-inspired picking",
    bpm: 122,
    chords: ["C", "G", "C", "F"],
    phrase: [48, 64, 55, 67, 48, 72, 55, 67],
    steps: [0, 2, 4, 6, 8, 10, 12, 14],
    pianoSteps: [4, 12],
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
    concept: "Alternating bass",
    task: "Identify the alternating low and high guitar notes. Keep the melody clear above the bass.",
    question: "Why alternate a low bass note with a higher chord tone?",
    answer:
      "It lets one guitar suggest both a steady bass foundation and a higher accompaniment.",
  },
  {
    name: "Benga-inspired guitar",
    bpm: 128,
    chords: ["C", "F", "C", "G"],
    phrase: [76, 79, 72, 79, 77, 81, 76, 74],
    steps: [0, 1, 4, 6, 8, 9, 12, 14],
    pianoSteps: [0, 10],
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
    concept: "Register and motif",
    task: "Listen to the high-register guitar motif, then change its final two notes to create an answering phrase.",
    question: "What is a motif?",
    answer:
      "A short recognisable musical idea that can be repeated, varied and developed.",
  },
  {
    name: "Funk",
    bpm: 104,
    chords: ["Am", "Dm", "Am", "Em"],
    phrase: [57, 69, 67, 64, 67, 69],
    steps: [0, 3, 7, 8, 11, 15],
    pianoSteps: [3, 7, 11, 15],
    hits: [
      [0, 3, 8, 11],
      [4, 12],
      [0, 1, 2, 4, 6, 7, 8, 10, 12, 14, 15],
      [6],
      [],
      [15],
      [12],
      [3, 7, 11, 15],
    ],
    concept: "Space and articulation",
    task: "Remove two guitar notes and compare the space in the groove. Avoid filling every step.",
    question: "Why can fewer notes make a groove clearer?",
    answer:
      "Rests separate accents and leave room for the other instruments to be heard.",
  },
];
export const LISTENING_REFERENCES = [
  {
    title: "Gusii / Kisii: obokano ensembles",
    culture: "Gusii",
    focus: "Identify the plucked bass, repeated pattern and vocal response.",
    url: "https://www.youtube.com/results?search_query=Gusii+obokano+traditional+music",
  },
  {
    title: "Mugithi guitar performances",
    culture: "Gikuyu",
    focus: "Compare alternating bass and lead-guitar phrases.",
    url: "https://www.youtube.com/results?search_query=Mugithi+guitar+instrumental",
  },
  {
    title: "Isukuti ensemble performances",
    culture: "Isukha and Idakho",
    focus: "Compare the three drum roles, dance pulse and response.",
    url: "https://ich.unesco.org/en/RL/isukuti-dance-of-isukha-and-idakho-communities-of-western-kenya-00981",
  },
  {
    title: "Congolese rumba: Kanda Bongo Man",
    culture: "Congolese rumba / soukous",
    focus: "Listen for interlocking guitars and the transition into a sebene.",
    url: "https://www.youtube.com/results?search_query=Kanda+Bongo+Man+Monie",
  },
  {
    title: "Benga guitar performances",
    culture: "Kenyan benga",
    focus: "Listen for high-register guitar figures and bass movement.",
    url: "https://www.youtube.com/results?search_query=Kenyan+benga+guitar+instrumental",
  },
];
// Video IDs supplied by the platform owner. Playback stays with the source; no audio is copied or sold.
export const SUPPLIED_RECORDINGS = [
  {
    id: "-__S85XFZ68",
    title: "Isukuti listening reference",
    source: "Recording supplied by the platform owner",
    task: "Identify the recurring pulse, then listen for different percussion roles. Compare with your own call-and-response pattern.",
  },
  {
    id: "1vbY0rG2r4E",
    title: "SILA WA SILA — Abakristayo Musaye",
    source: "Recording supplied by the platform owner",
    task: "Identify the leader and responding voices. Listen for the bass pattern and where the accompaniment changes.",
  },
];
