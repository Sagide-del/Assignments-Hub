import {
  Activity,
  Atom,
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  CodeXml,
  CookingPot,
  Cross,
  Dna,
  FlaskConical,
  Flower2,
  Globe2,
  Landmark,
  Languages,
  MessagesSquare,
  MoonStar,
  Music2,
  Palette,
  Ruler,
  Sprout,
  type LucideIcon,
} from "lucide-react";

/** Shared visual identity; subject names and curriculum grouping remain unchanged. */
export function subjectAppearance(name: string): {
  Icon: LucideIcon;
  tone: string;
  key: string;
} {
  const rules: [RegExp, LucideIcon, string, string][] = [
    [/math/i, Calculator, "blue", "mathematics"],
    [/chem/i, FlaskConical, "violet", "chemistry"],
    [/bio|life science/i, Dna, "emerald", "biology"],
    [
      /computer|computing|coding|digital|technology/i,
      CodeXml,
      "indigo",
      "computing",
    ],
    [/home science|nutrition|food/i, CookingPot, "orange", "nutrition"],
    [/pre.?technical|technical|engineering/i, Ruler, "slate", "technical"],
    [/physics\b|science/i, Atom, "sky", "science"],
    [/kiswahili|swahili/i, MessagesSquare, "teal", "kiswahili"],
    [
      /english|arabic|french|german|mandarin|language|literature/i,
      Languages,
      "orange",
      "languages",
    ],
    [/christian|\bcre\b/i, Cross, "violet", "christian-religious-education"],
    [/islam|\bire\b/i, MoonStar, "emerald", "islamic-religious-education"],
    [/hindu|\bhre\b/i, Flower2, "rose", "hindu-religious-education"],
    [/geo|environment/i, Globe2, "cyan", "geography"],
    [/history|government|social/i, Landmark, "amber", "social-studies"],
    [/agri/i, Sprout, "green", "agriculture"],
    [/business|commerce|econom/i, BriefcaseBusiness, "indigo", "business"],
    [
      /physical.*(?:education|health)|sports?|\bpe\b/i,
      Activity,
      "teal",
      "physical-education",
    ],
    [/music/i, Music2, "rose", "music"],
    [/arts?|design/i, Palette, "rose", "arts"],
  ];
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    indigo: "bg-indigo-50 text-indigo-700",
    orange: "bg-orange-50 text-orange-700",
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-50 text-sky-700",
    teal: "bg-teal-50 text-teal-700",
    rose: "bg-rose-50 text-rose-700",
    cyan: "bg-cyan-50 text-cyan-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
  };
  const match = rules.find(([pattern]) => pattern.test(name));
  return match
    ? { Icon: match[1], tone: tones[match[2]], key: match[3] }
    : { Icon: BookOpen, tone: tones.slate, key: "general" };
}
