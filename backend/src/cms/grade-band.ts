export function cmsGradeBand(grade: number) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 12)
    throw Error("Grade must be between 1 and 12");
  return grade <= 6
    ? {
        theoryWords: 150,
        questions: 5,
        assessmentType: "FORMATIVE",
        extra: "offline_activity" as const,
      }
    : grade <= 9
      ? {
          theoryWords: 200,
          questions: 10,
          assessmentType: "CAT",
          extra: "diagram_description" as const,
        }
      : {
          theoryWords: 300,
          questions: 30,
          assessmentType: "KCBE_MOCK",
          extra: "asset_url" as const,
        };
}
// This file is already shipped with the app; never ask AI to invent asset URLs.
export function verifiedCmsAsset(
  subject: string,
  topic: string,
): string | null {
  return subject === "Biology" && /respiration|gaseous exchange/i.test(topic)
    ? "/stem/anatomy/respiratory-atlas.glb"
    : null;
}
