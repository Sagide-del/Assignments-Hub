import { LabCategory } from "@prisma/client";
import { key, pathwayKey, trackKey } from "./student-scope.policy";
export interface LabConfig {
  label: string;
  route: string;
  category: LabCategory | null;
  icon?: "Music";
}
const config = (
  label: string,
  slug: string,
  category: LabCategory,
): LabConfig => ({
  label,
  route: `/student/labs/${slug}`,
  category,
  ...(category === "ARTS_MUSIC" ? { icon: "Music" as const } : {}),
});
export function labConfigFor(student: {
  grade: number;
  pathway: string | null;
  track: string | null;
}): LabConfig {
  if (student.grade <= 3) return config("Play Lab", "play", "LOWER_PLAY");
  if (student.grade <= 6)
    return config("Explorer Lab", "explorer", "LOWER_EXPLORER");
  if (student.grade <= 9)
    return {
      label: "Junior Science Lab",
      route: "/student/labs",
      category: null,
    };
  const pathway = pathwayKey(student.pathway),
    track = trackKey(student.track);
  if (pathway === "stem") {
    if (track === "puresciences")
      return config("Pure Sciences Lab", "pure", "STEM_PURE");
    if (track === "technicalandengineering")
      return config("Technical Lab", "technical", "STEM_TECHNICAL");
    if (track === "appliedsciences")
      return config("Applied Sciences Lab", "applied", "STEM_APPLIED");
  }
  if (pathway === "artsandsportsscience") {
    if (["music", "performingarts"].includes(track))
      return config("Music Studio", "music", "ARTS_MUSIC");
    if (["visualarts", "arts"].includes(track))
      return config("Design Canvas", "visual", "ARTS_VISUAL");
    if (track === "sportsscience")
      return config("Sports Lab", "sports", "ARTS_SPORTS");
  }
  if (pathway === "socialsciences") {
    if (track === "humanities")
      return config("Humanities Lab", "humanities", "SOCIAL_HUMANITIES");
    if (["languages", "languagesandliterature"].includes(track))
      return config("Language Lab", "languages", "SOCIAL_LANGUAGES");
  }
  if (
    [
      "cts",
      "careerandtechnologystudies",
      "careerandtechnologystudiescts",
    ].includes(key(student.pathway))
  ) {
    if (track === "culinaryarts")
      return config("Virtual Kitchen", "culinary", "CTS_CULINARY");
    if (track === "trades") return config("Skills Lab", "trades", "CTS_TRADES");
  }
  return { label: "Labs", route: "/student/labs", category: null };
}
