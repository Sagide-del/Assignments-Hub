import { curatedSkillAlignment } from "./curated-skill-alignment";
export const key = (v: unknown) =>
  typeof v === "string"
    ? v
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]/g, "")
    : "";
export function gradeNumber(v: unknown): number | null {
  if (typeof v === "number")
    return Number.isInteger(v) && v >= 1 && v <= 12 ? v : null;
  const m =
    typeof v === "string" && v.trim().match(/^(?:grade\s*)?(1[0-2]|[1-9])$/i);
  return m ? Number(m[1]) : null;
}
export function pathwayKey(v: unknown) {
  const k = key(v);
  return (
    (
      {
        stem: "stem",
        socialsciences: "socialsciences",
        artsandsports: "artsandsportsscience",
        artsandsportsscience: "artsandsportsscience",
      } as Record<string, string>
    )[k] ?? k
  );
}
export function trackKey(v: unknown) {
  const k = key(v);
  if (
    [
      "technical",
      "technicalstudies",
      "technicalandengineering",
      "technicalengineering",
    ].includes(k)
  )
    return "technicalandengineering";
  if (k === "finearts") return "visualarts";
  if (k === "sports") return "sportsscience";
  if (k === "businessstudies") return "humanities";
  if (k === "purescience" || k === "puresciences") return "puresciences";
  if (k.startsWith("appliedsciences")) return "appliedsciences";
  if (
    [
      "cts",
      "careerandtechnologystudiescts",
      "careerandtechnologystudies",
    ].includes(k)
  )
    return "cts";
  return k;
}
export function subjectKey(v: unknown) {
  const k = key(v);
  return (
    (
      {
        math: "mathematics",
        mathematic: "mathematics",
        cre: "christianreligiouseducation",
        ire: "islamicreligiouseducation",
        hre: "hindureligiouseducation",
        pe: "physicaleducation",
        maths: "mathematics",
        coremathematics: "mathematics",
        coremath: "mathematics",
        coremaths: "mathematics",
        essentialmathematics: "mathematics",
        computerscience: "computerstudies",
        historyandgovernment: "historyandcitizenship",
        pretechnicalstudies: "pretechnical",
        pretechnicalandprecareereducation: "pretechnical",
        pretechnicaleducation: "pretechnical",
        agricultureandnutrition: "agriculture",
        creativeartsandsports: "creativearts",
        csl: "communityservicelearning",
        sportsandphysicaleducation: "physicaleducation",
      } as Record<string, string>
    )[k] ?? k
  );
}
export interface StudentScope {
  student_id: number;
  school_id: number;
  grade: number;
  pathway: string | null;
  track: string | null;
  stream: string | null;
  className: string | null;
  subjects: string[];
  assignment_subjects?: string[];
  elective_subjects?: string[];
}
export const SHARED_SUBJECTS = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Community Service Learning",
  "Physical Education",
];
export function allowedSubject(scope: StudentScope, subject: unknown) {
  const s = subjectKey(subject);
  return (
    !!s &&
    (scope.subjects.some((x) => subjectKey(x) === s) ||
      (s === "technicalstudies" &&
        scope.grade >= 10 &&
        pathwayKey(scope.pathway) === "stem" &&
        trackKey(scope.track) === "technicalandengineering"))
  );
}
export function dimensionsMatch(scope: StudentScope, content: any) {
  if (gradeNumber(content.grade) !== scope.grade) return false;
  if (scope.grade <= 9) return true;
  return (
    (!content.pathway ||
      (!!scope.pathway &&
        pathwayKey(content.pathway) === pathwayKey(scope.pathway))) &&
    (!content.track ||
      (!!scope.track && trackKey(content.track) === trackKey(scope.track)))
  );
}
export function contentMatches(scope: StudentScope, content: any) {
  return (
    !!content &&
    dimensionsMatch(scope, content) &&
    allowedSubject(scope, content.subject)
  );
}
// Legacy Lab.pathway sometimes contains a track label rather than a pathway.
export function labContent(lab: any) {
  const label = lab.pathway;
  return {
    ...lab,
    pathway:
      !label ||
      ["stem", "socialsciences", "artsandsportsscience"].includes(
        pathwayKey(label),
      )
        ? label
        : null,
    track:
      lab.track ??
      (label &&
      !["stem", "socialsciences", "artsandsportsscience"].includes(
        pathwayKey(label),
      )
        ? label
        : null),
  };
}
// Legacy platform courses use an explicit registry; other courses require
// curriculum metadata. There is no fuzzy title/description classification.
export function skillContent(course: any, scope: StudentScope) {
  const curated =
    course.provider?.verified &&
    course.provider.name === "Assignment Hub Learning Studio"
      ? curatedSkillAlignment(course.title, scope.grade)
      : null;
  const c = course.courseStructure;
  const meta =
    c && !Array.isArray(c) && typeof c === "object" ? (c.curriculum ?? c) : {};
  if (
    curated &&
    !Object.keys(meta).length &&
    !course.fullDescription?.includes("Audience:")
  )
    return curated;
  const audience =
    typeof course.fullDescription === "string"
      ? course.fullDescription.match(
          /Audience:\s*Grade\s*(\d+)\s*[-–]\s*(\d+)(?:;\s*([^\n.;]+)\s+pathway)?/i,
        )
      : null;
  const grades = Array.isArray(meta.grades)
    ? meta.grades.map(gradeNumber)
    : audience
      ? Array.from(
          {
            length: Math.max(
              0,
              Math.min(12, Number(audience[2])) - Number(audience[1]) + 1,
            ),
          },
          (_, i) => i + Number(audience[1]),
        )
      : [gradeNumber(meta.grade)];
  return {
    grade: grades.includes(scope.grade) ? scope.grade : null,
    subject: meta.subject ?? curated?.subject,
    pathway: meta.pathway ?? audience?.[3] ?? curated?.pathway ?? null,
    track: meta.track ?? curated?.track ?? null,
  };
}
