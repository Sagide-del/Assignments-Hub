import { blankRoll, type RollProject } from "./piano-roll-model";
export interface MelodyStudy {
  id: string;
  title: string;
  composer: string;
  focus: string;
  source: string;
  bars: number;
  bpm: number;
  phrases: [number, number][][];
}
// Recognisable public-domain themes; accompaniment is a new teaching arrangement.
export const MELODY_STUDIES: MelodyStudy[] = [
  {
    id: "ode-to-joy",
    title: "Ode to Joy — opening theme",
    composer: "Ludwig van Beethoven",
    focus: "Stepwise motion, repeated notes and a phrase ending.",
    source:
      "https://imslp.org/wiki/Symphony_No.9,_Op.125_(Beethoven,_Ludwig_van)",
    bars: 4,
    bpm: 100,
    phrases: [
      [
        [64, 1],
        [64, 1],
        [65, 1],
        [67, 1],
      ],
      [
        [67, 1],
        [65, 1],
        [64, 1],
        [62, 1],
      ],
      [
        [60, 1],
        [60, 1],
        [62, 1],
        [64, 1],
      ],
      [
        [64, 1.5],
        [62, 0.5],
        [62, 2],
      ],
    ],
  },
  {
    id: "twinkle",
    title: "Twinkle, Twinkle, Little Star",
    composer: "Traditional melody, Ah! vous dirai-je, maman",
    focus: "Recognise an A–B–A form and compare repeated phrases.",
    source: "https://imslp.org/wiki/Ah!_vous_dirai-je,_maman_(Traditional)",
    bars: 12,
    bpm: 96,
    phrases: [
      [
        [60, 1],
        [60, 1],
        [67, 1],
        [67, 1],
      ],
      [
        [69, 1],
        [69, 1],
        [67, 2],
      ],
      [
        [65, 1],
        [65, 1],
        [64, 1],
        [64, 1],
      ],
      [
        [62, 1],
        [62, 1],
        [60, 2],
      ],
      [
        [67, 1],
        [67, 1],
        [65, 1],
        [65, 1],
      ],
      [
        [64, 1],
        [64, 1],
        [62, 2],
      ],
      [
        [67, 1],
        [67, 1],
        [65, 1],
        [65, 1],
      ],
      [
        [64, 1],
        [64, 1],
        [62, 2],
      ],
      [
        [60, 1],
        [60, 1],
        [67, 1],
        [67, 1],
      ],
      [
        [69, 1],
        [69, 1],
        [67, 2],
      ],
      [
        [65, 1],
        [65, 1],
        [64, 1],
        [64, 1],
      ],
      [
        [62, 1],
        [62, 1],
        [60, 2],
      ],
    ],
  },
  {
    id: "frere-jacques",
    title: "Frère Jacques — complete round melody",
    composer: "Traditional French round",
    focus: "Imitation: repeat a phrase, then enter another part later.",
    source: "https://imslp.org/wiki/Fr%C3%A8re_Jacques_(Traditional)",
    bars: 8,
    bpm: 100,
    phrases: [
      [
        [60, 1],
        [62, 1],
        [64, 1],
        [60, 1],
      ],
      [
        [60, 1],
        [62, 1],
        [64, 1],
        [60, 1],
      ],
      [
        [64, 1],
        [65, 1],
        [67, 2],
      ],
      [
        [64, 1],
        [65, 1],
        [67, 2],
      ],
      [
        [67, 0.5],
        [69, 0.5],
        [67, 0.5],
        [65, 0.5],
        [64, 1],
        [60, 1],
      ],
      [
        [67, 0.5],
        [69, 0.5],
        [67, 0.5],
        [65, 0.5],
        [64, 1],
        [60, 1],
      ],
      [
        [60, 1],
        [55, 1],
        [60, 2],
      ],
      [
        [60, 1],
        [55, 1],
        [60, 2],
      ],
    ],
  },
];
export function melodyProject(study: MelodyStudy): RollProject {
  const p = blankRoll(study.title);
  p.bars = study.bars;
  p.bpm = study.bpm;
  p.source = `Public-domain melody study · ${study.composer}`;
  p.tracks[0].notes = study.phrases.flatMap((phrase, bar) => {
    let beat = bar * 4;
    return phrase.map(([midi, duration], i) => {
      const n = {
        id: `study-${bar}-${i}`,
        start: beat,
        duration,
        midi,
        velocity: 88,
      };
      beat += duration;
      return n;
    });
  });
  p.tracks[1].notes = [];
  return p;
}
