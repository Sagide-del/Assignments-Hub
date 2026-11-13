import { useQuery } from "@tanstack/react-query";
import { api } from "../api/axios";
import { useAuthStore } from "../store/auth.store";
import { useStudentContentScope } from "./useStudentContentScope";
export interface LabConfig {
  label: string;
  route: string;
  category: string | null;
}
export function useLabConfig() {
  const user = useAuthStore((s) => s.user);
  const scope = useStudentContentScope();
  const query = useQuery({
    queryKey: [
      "student-lab-config",
      user?.id,
      user?.schoolId,
      scope.data?.grade,
      scope.data?.pathway,
      scope.data?.track,
    ],
    queryFn: () =>
      api.get<LabConfig>("/student/lab-config").then((r) => {
        if (
          !r.data ||
          typeof r.data.label !== "string" ||
          !r.data.route?.startsWith("/student/labs") ||
          !(r.data.category === null || typeof r.data.category === "string")
        )
          throw Error("Invalid lab configuration");
        return r.data;
      }),
    enabled: user?.role === "STUDENT" && !user.isIndependentTrial,
    staleTime: 30000,
  });
  return { ...query, labConfig: query.data };
}
