import { useStudentContentScope } from "../../hooks/useStudentContentScope";
import { subjectKey } from "../../../../backend/src/student/student-scope.policy";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { api, apiErrorMessage } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";
import { catalogueKey, catalogueSubjectName } from "./assignment-catalogue";
export interface LearningModule {
  id: string;
  batch_number?: number;
  grade: number;
  subject: string;
  topic: string;
  question_count: number;
  created_at?: string;
  expected_question_count?: number;
  assessment_type?: string;
  state?: "TO_START" | "IN_PROGRESS" | "COMPLETED";
  due_date?: string | null;
  results_released?: boolean;
  priority_focus?: boolean;
  mastery?: import("../../types").MasteryProgress | null;
}
export function filterCmsModules(
  rows: LearningModule[],
  options: {
    subject: string;
    topic: string;
    search: string;
    subjects?: string[];
    state?: string;
    excluded?: Set<string>;
  },
) {
  return rows.filter(
    (m) =>
      !options.excluded?.has(m.id) &&
      (!options.subjects ||
        options.subjects.some(
          (s) => subjectKey(s) === subjectKey(m.subject),
        )) &&
      (!options.subject ||
        subjectKey(m.subject) === subjectKey(options.subject)) &&
      (!options.topic ||
        catalogueKey(m.topic) === catalogueKey(options.topic)) &&
      `${m.subject} ${m.topic}`
        .toLowerCase()
        .includes(options.search.toLowerCase()) &&
      (!options.state ||
        options.state === "ALL" ||
        (options.state === "NOT_STARTED"
          ? (m.state ?? "TO_START") === "TO_START"
          : options.state === "IN_PROGRESS"
            ? m.state === "IN_PROGRESS"
            : options.state === "RESULTS_AVAILABLE"
              ? m.state === "COMPLETED" && m.results_released
              : m.state === "COMPLETED" && !m.results_released)),
  );
}
export function CmsLearningLibrary({
  subject,
  topic,
  search,
  items,
}: {
  subject: string;
  topic: string;
  search: string;
  items?: LearningModule[];
}) {
  const scope = useStudentContentScope();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const enabled = !!user && !user.isIndependentTrial;
  const list = useQuery({
    queryKey: ["cms-learning", user?.id],
    enabled: enabled && items === undefined,
    retry: false,
    queryFn: () =>
      api
        .get<LearningModule[]>("/student/assignments")
        .then((response) => response.data),
  });
  const start = useMutation({
    mutationFn: (id: string) =>
      api
        .post<{ id: number }>(`/cms/learning/${encodeURIComponent(id)}/start`)
        .then((response) => response.data),
    onSuccess: (assignment) =>
      navigate(`/student/assignments/${assignment.id}`),
  });
  if (!enabled) return null;
  if (list.isError)
    return (
      <p role="alert" className="text-xs text-slate-500">
        {apiErrorMessage(
          list.error,
          "Published learning modules could not be loaded.",
        )}
      </p>
    );
  const modules = filterCmsModules(items ?? list.data ?? [], {
    subject,
    topic,
    search,
    subjects: scope.data?.assignment_subjects,
  });
  if (!modules.length) return null;
  return (
    <section aria-label="Published learning modules" className="space-y-3">
      <h2 className="sr-only">Published practice</h2>
      {start.isError && (
        <p role="alert" className="text-sm text-amber-900">
          {apiErrorMessage(start.error, "This set could not be opened.")}
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[...new Set(modules.map((m) => catalogueSubjectName(m.subject)))]
          .sort()
          .map((subjectName) => (
            <section key={subjectName} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-800">
                {subjectName}
              </h3>
              <div className="grid gap-3">
                {modules
                  .filter(
                    (m) => catalogueSubjectName(m.subject) === subjectName,
                  )
                  .map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      disabled={start.isPending}
                      onClick={() => start.mutate(module.id)}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left disabled:opacity-50"
                    >
                      <BookOpen
                        size={18}
                        className="mt-1 shrink-0 text-slate-500"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-slate-500">
                          {module.subject}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                          <span className="rounded bg-slate-100 px-2 py-1">
                            {module.state === "COMPLETED"
                              ? "Completed"
                              : module.state === "IN_PROGRESS"
                                ? "In Progress"
                                : "To Start"}
                          </span>
                          <span className="rounded bg-slate-50 px-2 py-1">
                            {module.due_date
                              ? `Due ${new Date(module.due_date).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}`
                              : "No deadline"}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-slate-900">
                          {module.topic}
                        </span>
                        <span className="mt-2 block text-xs text-slate-500">
                          Batch {module.batch_number ?? 1} ·{" "}
                          {module.question_count} questions ·{" "}
                          {module.question_count <
                          (module.expected_question_count ?? 30)
                            ? "Practice Set (Partial)"
                            : module.assessment_type === "FORMATIVE"
                              ? "Formative Practice"
                              : module.assessment_type === "CAT"
                                ? "CAT Practice"
                                : "Practice Set"}
                        </span>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ))}
              </div>
            </section>
          ))}
      </div>
    </section>
  );
}
