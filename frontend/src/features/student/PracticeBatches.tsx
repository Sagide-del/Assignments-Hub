import { useAuthStore } from "../../store/auth.store";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenCheck } from "lucide-react";
import { api } from "../../api/axios";
import { apiErrorMessage } from "../../api/axios";
export function PracticeBatches() {
  const user = useAuthStore((s) => s.user),
    navigate = useNavigate(),
    query = useQuery({
      queryKey: ["practice-batches", user?.id, user?.grade],
      queryFn: () =>
        api
          .get<{
            grade: string;
            subjects: { subject: string; count: number; batchSize: number }[];
            active: { id: string; subject: string }[];
          }>("/practice")
          .then((r) => r.data),
    }),
    start = useMutation({
      mutationFn: (subject: string) =>
        api.post<{ id: string }>("/practice", { subject }).then((r) => r.data),
      onSuccess: (r) => navigate(`/student/kjsea-mock-test/${r.id}`),
    });
  return (
    <section className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex items-center gap-3">
        <BookOpenCheck className="text-blue-700" size={22} />
        <div>
          <h2 className="font-semibold">Your subject practice</h2>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            30 reviewed questions per batch ·{" "}
            {query.data?.grade ?? "Your grade"} · unfinished batches resume
            automatically. Subject options follow your grade catalogue.
          </p>
        </div>
      </div>
      {query.isLoading ? (
        <p className="text-sm">Loading practice subjects…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-slate-500">
          {apiErrorMessage(
            query.error,
            "Subject practice is not available yet.",
          )}{" "}
          <button className="underline" onClick={() => query.refetch()}>
            Retry
          </button>
        </p>
      ) : !query.data?.subjects.length ? (
        <p className="text-sm text-slate-500">
          Your approved subject pools are being prepared. Assigned work remains
          available below.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.subjects.map((s) => {
            const active = query.data.active.find(
              (a) => a.subject.toLowerCase() === s.subject.toLowerCase(),
            );
            return (
              <button
                key={s.subject}
                disabled={(!active && s.count < 30) || start.isPending}
                className="flex min-h-24 items-center justify-between gap-3 rounded-lg border p-4 text-left disabled:bg-slate-50 disabled:text-slate-500"
                onClick={() => start.mutate(s.subject)}
              >
                <span>
                  <strong className="text-sm">{s.subject}</strong>
                  <span className="mt-2 block text-xs text-slate-500">
                    {active
                      ? "Continue your batch"
                      : s.count < 30
                        ? s.count === 0
                          ? "Content being prepared"
                          : `${s.count}/30 questions ready`
                        : "Start next 30-question batch"}
                  </span>
                </span>
                <ArrowRight size={16} />
              </button>
            );
          })}
        </div>
      )}
      {start.isError && (
        <p role="alert" className="text-sm text-red-700">
          {apiErrorMessage(start.error, "Could not open practice.")}
        </p>
      )}
      <p className="text-xs leading-6 text-slate-400">
        Unseen questions are prioritised. Once you have seen the pool, older
        questions return for revision. Overlap depends on the available pool
        size.
      </p>
    </section>
  );
}
