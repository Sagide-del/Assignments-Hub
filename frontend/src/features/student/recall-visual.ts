import type {
  RecallContent,
  RecallVisual,
} from "../../api/content-library.api";
export function recallVisual(
  content: RecallContent,
  context: { title?: string; subject?: string; topic?: string } = {},
): RecallVisual {
  if (content.visual) return content.visual;
  const concept =
    `${context.title ?? ""} ${context.topic ?? ""} ${content.cue}`.toLowerCase();
  const science = /biology|science|biolojia/i.test(context.subject ?? "");
  if (science && /\b(heart|cardiac|moyo)\b/.test(concept))
    return {
      kind: "diagram",
      template: "heart",
      title: "The heart: chambers and major vessels",
    };
  if (science && /\b(lungs?|respiratory|breathing|mapafu)\b/.test(concept))
    return {
      kind: "diagram",
      template: "lungs",
      title: "Breathing and the respiratory system",
    };
  if (science && /plant cell|seli ya mmea/.test(concept))
    return {
      kind: "diagram",
      template: "plant-cell",
      title: "Inside a plant cell",
    };
  if (
    /physics|science|technical/i.test(context.subject ?? "") &&
    /electric.*circuit|closed circuit|simple circuit/.test(concept)
  )
    return {
      kind: "diagram",
      template: "circuit",
      title: "A complete electrical circuit",
    };
  return {
    kind: "concept-map",
    title: "Connect the key ideas",
    labels: content.facts
      .slice(0, 5)
      .map((f) => ({
        label: f.label.slice(0, 70),
        detail: f.meaning.slice(0, 220),
      })),
  };
}
