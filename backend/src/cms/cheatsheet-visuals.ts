/** Curated, bundled teaching artwork only. Never resolve model-supplied URLs. */
export interface CheatsheetVisual {
  key: string;
  src: string;
  alt: string;
  caption: string;
  labels: string[];
}
const visuals: (CheatsheetVisual & { topics: string[] })[] = [
  {
    key: "sports-skills",
    src: "/cheatsheet-illustrations/sports-skills.webp",
    topics: [
      "sports skills",
      "fundamental sports skills",
      "fundamental movement skills",
    ],
    alt: "Realistic illustrations of a runner, a ball thrower and a learner balancing on one leg",
    caption:
      "Movement skills combine: travelling, controlling an object and maintaining balance.",
    labels: [
      "Locomotor · run, jump, hop",
      "Object control · throw, catch, kick",
      "Stability · balance, twist, turn",
    ],
  },
  {
    key: "lungs",
    src: "/recall-illustrations/lungs-atlas.png",
    topics: [
      "respiratory system",
      "human respiratory system",
      "structure of the lungs",
      "lungs",
    ],
    alt: "Anatomical illustration of the lungs, branching airways and diaphragm",
    caption:
      "Front view: anatomical right appears on the left. Teaching illustration; not to scale.",
    labels: [
      "Airway → branching bronchi",
      "Lungs → gas exchange",
      "Diaphragm → ventilation",
    ],
  },
  {
    key: "heart",
    src: "/recall-illustrations/heart-cutaway.png",
    topics: ["heart", "human heart", "structure of the heart"],
    alt: "Cutaway anatomical illustration showing the chambers and major vessels of the heart",
    caption:
      "Cutaway view: anatomical right appears on the left. Not to scale.",
    labels: [
      "Atria receive blood",
      "Ventricles pump blood",
      "Valves prevent backflow",
    ],
  },
  {
    key: "plant-cell",
    src: "/recall-illustrations/plant-cell-atlas.png",
    topics: ["plant cell", "plant cells", "structure of a plant cell"],
    alt: "Cutaway illustration of a plant cell and its internal structures",
    caption: "Cutaway teaching model. Organelles are not drawn to scale.",
    labels: [
      "Cell wall → support",
      "Nucleus → control",
      "Chloroplasts → photosynthesis",
    ],
  },
  {
    key: "circuit",
    src: "/recall-illustrations/circuit-kit.png",
    topics: [
      "simple electric circuit",
      "simple electric circuits",
      "electric circuits",
      "electrical circuits",
    ],
    alt: "Realistic teaching illustration of components connected in an electrical circuit",
    caption: "A complete conducting path connects both battery terminals.",
    labels: [
      "Source supplies energy",
      "Wires connect components",
      "Switch controls the path",
    ],
  },
];
export function resolveCheatsheetVisual(
  topic: string,
): CheatsheetVisual | null {
  const normalized = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const match = visuals.find((visual) => visual.topics.includes(normalized));
  if (!match) return null;
  const { topics: _, ...visual } = match;
  return visual;
}
