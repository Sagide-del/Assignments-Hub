import type {
  RecallContent,
  RecallVisual,
} from "../../api/content-library.api";
export const RECALL_TOPIC_SCENES = {
  water: {
    src: "/recall-illustrations/water-scene.png",
    title: "Water",
    color: "#0284c7",
    wash: "#edf8ff",
  },
  weeds: {
    src: "/recall-illustrations/weeds-scene.png",
    title: "Weed competition",
    color: "#4d7c0f",
    wash: "#f5f9e8",
  },
  "crop-yield": {
    src: "/recall-illustrations/crop-yield-scene.png",
    title: "Crop yield",
    color: "#a16207",
    wash: "#fffbeb",
  },
} as const;
export function topicRecallScene(
  content: RecallContent,
  context: { title?: string; subject?: string; topic?: string },
): Exclude<RecallVisual["scene"], "none" | undefined> | undefined {
  const subject = context.subject ?? "",
    focus = `${context.title ?? ""} ${content.cue}`;
  const practical =
    /agricultur|science|biology|biolojia|geography|environment|social studies|nutrition/i.test(
      subject,
    );
  const vocabulary =
    /english|kiswahili|language/i.test(subject) &&
    /vocabulary|word meaning|msamiati|maana ya/i.test(focus) &&
    !/poem|poetry|metaphor|simile|proverb|literature/i.test(focus);
  if (!practical && !vocabulary) return;
  const detect = (
    text: string,
  ): Exclude<RecallVisual["scene"], "none" | undefined> | undefined => {
    if (/\b(weeds?|weeding|magugu|palizi)\b/i.test(text)) return "weeds";
    if (
      /crop (failure|yield|stress)|low yields?|poor harvest|failed crops?|kupungua kwa mavuno|mavuno kidogo/i.test(
        text,
      )
    )
      return "crop-yield";
    if (
      /\b(water|irrigation|watering|rainfall|maji|umwagiliaji|hydration|evaporation|condensation|precipitation|runoff)\b/i.test(
        text,
      )
    )
      return "water";
  };
  return detect(focus) ?? detect(context.topic ?? "");
}
