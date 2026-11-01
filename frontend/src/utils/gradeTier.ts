// Grade 7-9 = Junior School, Grade 10-12 = Senior School (Kenyan CBC/BECF
// structure). Shared by the STEM Lab player (which version text to show)
// and the STEM Labs catalogue (which experience — Junior Explorer vs Senior
// Specialist — to render). Single source of truth so the two stay in sync.
export function gradeTier(grade: string | null | undefined): 'junior' | 'senior' | null {
  if (!grade) return null;
  const match = /grade\s*(\d{1,2})/i.exec(grade);
  if (!match) return null;
  const n = Number(match[1]);
  if (n >= 7 && n <= 9) return 'junior';
  if (n >= 10 && n <= 12) return 'senior';
  return null;
}

export function gradeNumber(grade: string | null | undefined): number | null {
  const match = /grade\s*(\d{1,2})/i.exec(grade ?? '');
  return match ? Number(match[1]) : null;
}

export function isKjseaGrade(grade: string | null | undefined) {
  const value = gradeNumber(grade);
  return value !== null && value >= 7 && value <= 9;
}

export function isPathwayGuidanceGrade(grade: string | null | undefined) {
  const value = gradeNumber(grade);
  return value !== null && value >= 6 && value <= 9;
}

export function isCbcGrade(grade: string | null | undefined) {
  return grade === 'PP1' || grade === 'PP2' || (gradeNumber(grade) !== null && gradeNumber(grade)! >= 1 && gradeNumber(grade)! <= 12);
}

export function isEarlyYearsGrade(grade: string | null | undefined) {
  const value = gradeNumber(grade);
  return grade === 'PP1' || grade === 'PP2' || (value !== null && value >= 1 && value <= 3);
}
