import focusedPrograms from "../../../../../../backend/src/skills/content/focused-programs.json";
import type { CourseLearningPack, RichSkillLesson } from "./types";
import { pythonPack } from "./python";
import { firstAidPack } from "./first-aid";
import { otherPacks } from "./programs";
export type { RichSkillLesson, CourseLearningPack } from "./types";
const musicPacks = (
  focusedPrograms as unknown as {
    title: string;
    version: string;
    richLessons?: RichSkillLesson[];
  }[]
)
  .filter((p) => p.richLessons)
  .map((p) => ({
    title: p.title,
    version: p.version,
    mode: "GUIDED" as const,
    lessons: p.richLessons!,
  }));
export const learningPacks: CourseLearningPack[] = [
  pythonPack,
  firstAidPack,
  ...otherPacks,
  ...musicPacks,
];
export function focusedProgram(title: string) {
  return focusedPrograms.find((p) => p.title === title);
}
for (const pack of learningPacks) {
  const program = focusedProgram(pack.title);
  for (const lesson of pack.lessons) {
    const guide = program?.lessons.find((l) => l.key === lesson.key);
    if (guide) lesson.activity.steps = [...guide.practice];
  }
}
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");
export function learningPack(title: string) {
  return learningPacks.find(
    (pack) => normalize(pack.title) === normalize(title),
  );
}
// Original local diagrams; their essential meaning also appears in lesson text.
const images: Record<string, [string, string]> = {
  "Research Skills for Student Projects": [
    "research",
    "An investigation moves from a specific question through recorded evidence to a conclusion with limits.",
  ],
  "Cyber Safety and Networking": [
    "network",
    "A browser request passes through a router to a server.",
  ],
  "CAD and Digital Fabrication": [
    "cad",
    "A measured sketch develops into a model, then a tested prototype.",
  ],
  "Video Production and Editing": [
    "storyboard",
    "Three storyboard frames introduce a problem, explain an action and conclude.",
  ],
  "Smart Agriculture and Climate Technology": [
    "agriculture",
    "A sensor reading is reviewed before a person makes a decision.",
  ],
  "Solar Energy Systems Foundations": [
    "solar",
    "A panel supplies DC through a suitable charge controller to a battery.",
  ],
  "Python Programming Foundations": [
    "python",
    "Python executes the code print Hello to display Hello as output.",
  ],
};
for (const pack of learningPacks) {
  const image = images[pack.title];
  if (image)
    pack.lessons[0].image = {
      src: `/skill-illustrations/${image[0]}.svg`,
      alt: image[1],
      caption: image[1],
    };
}
