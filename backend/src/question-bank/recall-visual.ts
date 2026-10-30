export type RecallVisualKind =
  | "diagram"
  | "concept-map"
  | "process"
  | "comparison"
  | "timeline"
  | "fraction";
export const RECALL_SCENE_IDS = [
  "water",
  "weeds",
  "crop-yield",
  "none",
] as const;
export const RECALL_SYMBOL_IDS = [
  "water",
  "drought",
  "rain",
  "sun",
  "cloud",
  "plant",
  "crop",
  "weed",
  "soil",
  "roots",
  "insect",
  "disease",
  "nutrients",
  "harvest",
  "tools",
  "temperature",
  "wind",
  "energy",
  "growth",
  "decline",
  "money",
  "time",
  "people",
  "book",
  "language",
  "numbers",
  "location",
  "cycle",
  "protection",
  "microscope",
  "seed",
  "idea",
  "light",
  "heart",
  "lungs",
  "cell",
  "circuit",
  "mulch",
] as const;
export interface RecallVisual {
  kind: RecallVisualKind;
  title: string;
  template?: "heart" | "lungs" | "plant-cell" | "circuit";
  scene?: (typeof RECALL_SCENE_IDS)[number];
  labels?: {
    label: string;
    detail: string;
    icon?: (typeof RECALL_SYMBOL_IDS)[number];
  }[];
  numerator?: number;
  denominator?: number;
}
export const recallVisualInstructions = `Keep visual labels to 1–4 words. Put full explanations in facts and checks, not in diagram labels. Keep each fact to one short sentence for the optional study notes. Include a visual specification on every card, using plain JSON only, never SVG/HTML/image URLs. visual={"kind":"concept-map|process|comparison|timeline|diagram|fraction","title":"short explanatory caption","labels":[{"label":"short label","detail":"one accurate sentence"}]}. Use 2-5 labels that explain the actual concept; process steps and timeline events must be in correct order. A diagram also requires template="heart|lungs|plant-cell|circuit" and must match the card's concept; diagram labels are supplied by the application's authored illustration. A fraction visual requires integer numerator and denominator (0 <= numerator <= denominator, 2 <= denominator <= 12). Use concept-map or comparison for topics without a matching anatomical or scientific illustration. For literal topic imagery, add optional scene="water|weeds|crop-yield" to concept-map/process/comparison/timeline visuals when relevant. A water card should show water, weed-control cards should show weeds, crop-yield cards should show harvest outcomes. These are supporting scenes, not species identification or proof of a particular cause. Preserve ordered steps when kind=process/timeline. Each label may include icon from: ${RECALL_SYMBOL_IDS.join("|")}. Match the icon to its meaning (water -> water, drought -> drought, pests -> insect, harvest -> harvest); never use arbitrary URLs. Visuals must clarify the concept, not add decoration or unsupported facts.`;
export function validateRecallVisual(value: any): RecallVisual | undefined {
  if (value == null) return undefined; // Old stored cards remain valid.
  const text = (v: unknown, max: number) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= max;
  if (
    !value ||
    ![
      "diagram",
      "concept-map",
      "process",
      "comparison",
      "timeline",
      "fraction",
    ].includes(value.kind) ||
    !text(value.title, 140)
  )
    throw Error("Choose a valid recall illustration and short caption.");
  const visual: RecallVisual = { kind: value.kind, title: value.title.trim() };
  if (value.scene !== undefined) {
    if (
      ![...RECALL_SCENE_IDS].includes(value.scene) ||
      ["diagram", "fraction"].includes(value.kind)
    )
      throw Error(
        "Choose an available topic illustration for this visual style.",
      );
    visual.scene = value.scene;
  }
  if (value.kind === "diagram") {
    if (!["heart", "lungs", "plant-cell", "circuit"].includes(value.template))
      throw Error("Choose an available recall diagram template.");
    visual.template = value.template;
  } else if (value.kind === "fraction") {
    if (
      !Number.isInteger(value.numerator) ||
      !Number.isInteger(value.denominator) ||
      value.denominator < 2 ||
      value.denominator > 12 ||
      value.numerator < 0 ||
      value.numerator > value.denominator
    )
      throw Error(
        "Fraction illustrations require equal parts and valid numerator/denominator.",
      );
    visual.numerator = value.numerator;
    visual.denominator = value.denominator;
  } else {
    if (
      !Array.isArray(value.labels) ||
      value.labels.length < 2 ||
      value.labels.length > 5 ||
      !value.labels.every(
        (x: any) =>
          text(x.label, 70) &&
          text(x.detail, 220) &&
          (x.icon === undefined || RECALL_SYMBOL_IDS.includes(x.icon)),
      )
    )
      throw Error("Recall visuals need 2–5 concise, accurate labels.");
    visual.labels = value.labels.map((x: any) => ({
      label: x.label.trim(),
      detail: x.detail.trim(),
      ...(x.icon ? { icon: x.icon } : {}),
    }));
  }
  return visual;
}
