export interface StudentContentScope {
  grade: number;
  pathway: string | null;
  track: string | null;
  subjects: string[];
  assignment_subjects?: string[];
  elective_subjects?: string[];
  assignment_setup_required?: boolean;
  availability: { labs: number; skills: number; csl: boolean };
  setup_required: boolean;
}
export function studentToolAvailable(
  path: string,
  scope: StudentContentScope | undefined,
) {
  if (path === "/student/stem-labs")
    return (scope?.availability?.labs ?? 0) > 0;
  if (path === "/student/learn-skills")
    return (scope?.availability?.skills ?? 0) > 0;
  if (path === "/student/csl")
    return (
      !!scope &&
      scope.grade >= 10 &&
      scope.grade <= 12 &&
      scope.availability?.csl === true
    );
  return true;
}
