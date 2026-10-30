export type RecallVisualKind =
  | "diagram"
  | "concept-map"
  | "process"
  | "comparison"
  | "timeline"
  | "fraction";
export interface RecallVisual {
  kind: RecallVisualKind;
  title: string;
  template?: "heart" | "lungs" | "plant-cell" | "circuit";
  labels?: { label: string; detail: string }[];
  numerator?: number;
  denominator?: number;
}
export const recallVisualInstructions = `Keep visual labels to 1–4 words. Put full explanations in facts and checks, not in diagram labels. Keep each fact to one short sentence for the optional study notes. Include a visual specification on every card, using plain JSON only, never SVG/HTML/image URLs. visual={"kind":"concept-map|process|comparison|timeline|diagram|fraction","title":"short explanatory caption","labels":[{"label":"short label","detail":"one accurate sentence"}]}. Use 2-5 labels that explain the actual concept; process steps and timeline events must be in correct order. A diagram also requires template="heart|lungs|plant-cell|circuit" and must match the card's concept; diagram labels are supplied by the application's authored illustration. A fraction visual requires integer numerator and denominator (0 <= numerator <= denominator, 2 <= denominator <= 12). Use concept-map or comparison for topics without a matching anatomical or scientific illustration. Visuals must clarify the concept, not add decoration or unsupported facts.`;
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
      !value.labels.every((x: any) => text(x.label, 70) && text(x.detail, 220))
    )
      throw Error("Recall visuals need 2–5 concise, accurate labels.");
    visual.labels = value.labels.map((x: any) => ({
      label: x.label.trim(),
      detail: x.detail.trim(),
    }));
  }
  return visual;
}
