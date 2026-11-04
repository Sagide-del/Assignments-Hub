import { useQuery } from "@tanstack/react-query";
import { api } from "../api/axios";
import { useAuthStore } from "../store/auth.store";
import type { StudentContentScope } from "../utils/studentContentScope";
export { studentToolAvailable } from "../utils/studentContentScope";
export type { StudentContentScope } from "../utils/studentContentScope";
export function useStudentContentScope() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["student-content-scope", user?.id, user?.schoolId],
    queryFn: () =>
      api
        .get<StudentContentScope>("/student/content-scope")
        .then((r) => r.data),
    enabled: user?.role === "STUDENT" && !user.isIndependentTrial,
    staleTime: 30000,
  });
}
