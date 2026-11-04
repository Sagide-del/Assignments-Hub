import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { api, apiErrorMessage } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";
import { catalogueKey } from "./assignment-catalogue";
interface LearningModule {
  id: string;
  batch_number?: number;
  grade: number;
  subject: string;
  topic: string;
  question_count: number;
  expected_question_count?: number;
  assessment_type?: string;
}
export function CmsLearningLibrary({
  subject,
  topic,
  search,
}: {
  subject: string;
  topic: string;
  search: string;
}) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const enabled = !!user && !user.isIndependentTrial;
  const list = useQuery({
    queryKey: ["cms-learning", user?.id],
    enabled,
    retry: false,
    queryFn: () =>
      api
        .get<LearningModule[]>("/cms/learning")
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
  const modules = (list.data ?? []).filter(
    (module) =>
      (!subject || catalogueKey(module.subject) === catalogueKey(subject)) &&
      (!topic || catalogueKey(module.topic) === catalogueKey(topic)) &&
      `${module.subject} ${module.topic}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (!modules.length) return null;
  return (
    <section aria-label="Published learning modules" className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">Learning library</h2>
      {start.isError && (
        <p role="alert" className="text-sm text-amber-900">
          {apiErrorMessage(start.error, "This set could not be opened.")}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
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
              <span className="mt-1 block text-sm font-semibold text-slate-900">
                {module.topic}
              </span>
              <span className="mt-2 block text-xs text-slate-500">
                Batch {module.batch_number ?? 1} · {module.question_count} questions ·{" "}
                {module.question_count < (module.expected_question_count ?? 30)
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
  );
}
