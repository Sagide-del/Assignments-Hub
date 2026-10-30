import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api, apiErrorMessage } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";
import { catalogueKey } from "./assignment-catalogue";

/** Completion never generates paid AI content or changes the saved result. */
export function NextTopicSet({
  subject,
  topic,
}: {
  subject: string;
  topic?: string;
}) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const catalogue = useQuery({
    queryKey: ["practice-batches", user?.id, user?.grade],
    queryFn: () =>
      api
        .get<{
          active?: {
            id: string;
            subject: string;
            coverage?: { topic?: string };
          }[];
          subjects: {
            subject: string;
            topics: { topic: string; count: number; remainingCount?: number }[];
          }[];
        }>("/practice")
        .then((r) => r.data),
    enabled: !!user?.id && !user.isIndependentTrial && !!topic,
    retry: false,
    staleTime: 0,
  });
  const next = useMutation({
    mutationFn: () =>
      api
        .post<{ id: string }>("/practice", { subject, topic })
        .then((r) => r.data),
    onSuccess: (result) =>
      navigate(`/student/assignments/practice/${result.id}`),
  });
  const available = catalogue.data?.subjects
    ?.find((s) => catalogueKey(s.subject) === catalogueKey(subject))
    ?.topics.find((t) => catalogueKey(t.topic) === catalogueKey(topic ?? ""));
  if (!available) return null;
  const active = catalogue.data?.active?.find(
    (a) =>
      catalogueKey(a.subject) === catalogueKey(subject) &&
      catalogueKey(a.coverage?.topic ?? "") === catalogueKey(topic ?? ""),
  );
  const ready = !!active || (available.remainingCount ?? available.count) >= 20;
  return (
    <section
      aria-label="Next topic set"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{topic}</p>
        <p className="mt-1 text-xs text-slate-500">
          {ready
            ? "Your next set is ready. Completed sets stay saved."
            : "Topic complete for now. More questions will appear when published."}
        </p>
      </div>
      {ready && (
        <button
          type="button"
          disabled={next.isPending}
          onClick={() =>
            active
              ? navigate(`/student/assignments/practice/${active.id}`)
              : next.mutate()
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          {next.isPending
            ? "Opening…"
            : active
              ? "Continue current set"
              : "Start next set"}
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      )}
      {next.isError && (
        <p role="alert" className="w-full text-xs text-red-700">
          {apiErrorMessage(next.error, "Could not open the next set.")}
        </p>
      )}
    </section>
  );
}
