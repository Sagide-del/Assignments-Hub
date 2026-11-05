import {
  subjectKey,
  contentMatches,
  gradeNumber,
  StudentScope,
} from "./student-scope.policy";
export const CORE_ASSIGNMENT_SUBJECTS = [
  "English",
  "Kiswahili",
  "Core Mathematics",
  "Community Service Learning",
];
export function enrolledSubjects(
  grade: number,
  electives: string[],
  junior: string[],
) {
  return grade >= 10 ? [...CORE_ASSIGNMENT_SUBJECTS, ...electives] : junior;
}
export function allowedAssignmentSubject(
  scope: StudentScope,
  subject: unknown,
) {
  const key = subjectKey(subject);
  return (
    !!key &&
    (scope.assignment_subjects ?? scope.subjects).some(
      (s) => subjectKey(s) === key,
    )
  );
}
export function assignmentMatches(scope: StudentScope, content: any) {
  if (!content || gradeNumber(content.grade) !== scope.grade) return false;
  if (scope.assignment_subjects === undefined)
    return contentMatches(scope, content);
  // Explicit enrolment permits a cross-track subject; publication/audience checks remain mandatory.
  return allowedAssignmentSubject(scope, content.subject);
}
export function validateElectives(
  grade: number,
  value: unknown,
  subjects: string[],
) {
  if (grade < 10) {
    if (Array.isArray(value) && value.length)
      throw Error("Junior learners do not select senior electives.");
    return [];
  }
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some((v) => typeof v !== "string" || !v.trim() || v.length > 120)
  )
    throw Error("Choose exactly three elective subjects.");
  const keys = value.map(subjectKey);
  if (new Set(keys).size !== 3)
    throw Error("Choose three different electives.");
  if (
    keys.some((k) => CORE_ASSIGNMENT_SUBJECTS.some((s) => subjectKey(s) === k))
  )
    throw Error("Core subjects are already included; select three electives.");
  return value.map((v, i) => {
    const canonical = subjects.find((s) => subjectKey(s) === keys[i]);
    if (!canonical)
      throw Error(`Elective is not available for this grade: ${v}`);
    return canonical;
  });
}
