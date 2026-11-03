import type { UserRecord } from "../api/users.api";

/** Streams are real school profile labels; never infer or invent labels. */
export function cmsSchoolStreams(
  users: UserRecord[],
  schoolId: number,
  grade: number,
): string[] {
  return [
    ...new Set(
      users
        .filter((user) => {
          const value = user.grade ?? user.studentProfile?.grade ?? "";
          const number = Number(value.trim().replace(/^grade\s*/i, ""));
          return (
            user.role === "STUDENT" &&
            user.isActive &&
            user.schoolId === schoolId &&
            number === grade
          );
        })
        .map(
          (user) =>
            user.studentProfile?.stream?.trim() ||
            user.studentProfile?.className?.trim() ||
            "",
        )
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
