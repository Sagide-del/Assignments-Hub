/**
 * Normalizes a free-text grade value into the canonical "Grade N" format
 * that every grade-scoped catalog matches against exactly: User.grade,
 * Assignment.grade (see AssignmentsService.findAll's `grade: actor.grade`
 * filter), and Lab.grade (see LabsService.findAll's equivalent filter).
 * Without this, a grade typed or imported as a bare number ("12") silently
 * never matches records stored as "Grade 12", and the student sees an
 * empty catalog with no error.
 *
 * Handles the common data-entry variants ("9", "grade9", "GRADE 9",
 * " Grade  12 ") without guessing at unrelated grading schemes (e.g.
 * "Form 3", "PP1"), which are passed through unchanged/untouched.
 *
 * Applied at every write path that sets one of these `grade` columns
 * (student create/import, assignment create/update/from-json, lab
 * create/update) so the exact-match filters above always line up
 * regardless of how a teacher/admin typed the grade in.
 */
export function normalizeGrade(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Bare number, e.g. "9", "12" -> "Grade 9", "Grade 12"
  if (/^\d{1,2}$/.test(trimmed)) return `Grade ${trimmed}`;

  // Already grade-prefixed but casing/spacing varies, e.g. "grade9",
  // "GRADE 9", "grade  09" -> "Grade 9"
  const gradeMatch = /^grade\s*0*(\d{1,2})$/i.exec(trimmed);
  if (gradeMatch) return `Grade ${gradeMatch[1]}`;

  return trimmed;
}
