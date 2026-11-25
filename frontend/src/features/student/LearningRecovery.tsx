import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, RotateCw, Target } from "lucide-react";
import { learningHubApi } from "../../api/learning-hub.api";
import {
  learningCoachApi,
  type LearningSession,
} from "../../api/learning-coach.api";
import { useAuthStore } from "../../store/auth.store";
import { apiErrorMessage } from "../../api/axios";
export function LearningRecovery({
  onSession,
}: {
  onSession?: (session: LearningSession) => void;
}) {
  const user = useAuthStore((s) => s.user),
    navigate = useNavigate();
  const q = useQuery({
    queryKey: ["learning-recovery", user?.id],
    queryFn: learningHubApi.recovery,
    refetchOnMount: "always",
  });
  const [expanded, setExpanded] = useState(false);
  const start = useMutation({
    mutationFn: ({ subject, topic }: { subject: string; topic: string }) =>
      learningCoachApi.start({ subject, topic, mode: "PRACTICE" }),
    onSuccess: (s) => onSession?.(s),
  });
  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
      aria-labelledby="recovery-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Your learning loop
          </p>
          <h2 id="recovery-title" className="mt-1 text-xl font-semibold">
            Study → practise → review → improve
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void q.refetch()}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold"
          disabled={q.isFetching}
        >
          <RotateCw size={15} />
          Refresh
        </button>
      </header>
      {q.isPending ? (
        <p className="p-5 text-sm text-slate-500">
          Finding your next learning step…
        </p>
      ) : q.isError ? (
        <p role="alert" className="p-5 text-sm text-rose-700">
          {apiErrorMessage(
            q.error,
            "Your recovery plan could not load. Please retry.",
          )}
        </p>
      ) : (
        <>
          {!q.data.queue.length ? (
            <div className="p-5 text-sm text-slate-600">
              Confirm your report-card scores or complete a Coach diagnostic to
              identify your first focus.{" "}
              <Link
                className="font-semibold text-emerald-800 underline"
                to="/student/learning-coach"
              >
                Open Coach
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {q.data.queue.slice(0, expanded ? undefined : 3).map((s, i) => (
                <article
                  key={s.subject}
                  className="grid gap-4 p-5 lg:grid-cols-[minmax(150px,.7fr)_minmax(0,2fr)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
                        {i + 1}
                      </span>
                      <h3 className="font-semibold">{s.subject}</h3>
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wider text-violet-700">
                      {s.stage.toLowerCase().replace("practise", "Practice")}
                      {s.reviewDue ? " · review due" : ""}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Report: {s.baseline === null ? "—" : `${s.baseline}%`}{" "}
                      <ArrowRight className="inline" size={12} />{" "}
                      {s.latest ? "Practice" : "Baseline"}:{" "}
                      {s.current === null
                        ? "not yet measured"
                        : `${s.current}%`}
                    </p>
                    {s.latest ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Latest evidence: {s.latest.source}
                      </p>
                    ) : null}
                    {s.needsSupport ? (
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        Ask your teacher for support.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    {!s.topics.length ? (
                      <p className="text-sm text-slate-500">
                        Reviewed content is not available for this subject yet.
                        Ask your teacher for a worked example.
                      </p>
                    ) : (
                      s.topics.slice(0, 2).map((t) => (
                        <div
                          key={t.topic}
                          className="rounded-xl bg-slate-50 p-3"
                        >
                          <p className="text-sm font-semibold">{t.topic}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {t.resources.map((r) => (
                              <Link
                                key={r.id}
                                to={r.href}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
                              >
                                <BookOpen size={14} />
                                Study & practice · {r.questionCount} questions
                              </Link>
                            ))}
                            {t.diagnosticReady ? (
                              <button
                                type="button"
                                disabled={start.isPending}
                                onClick={() =>
                                  onSession
                                    ? start.mutate({
                                        subject: s.subject,
                                        topic: t.topic,
                                      })
                                    : navigate(
                                        `/student/learning-coach?focus=${encodeURIComponent(s.subject)}&topic=${encodeURIComponent(t.topic)}`,
                                      )
                                }
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#143e32] px-3 text-xs font-semibold text-white"
                              >
                                <Target size={14} />
                                Quick practice
                              </button>
                            ) : null}
                            {!t.resources.length && !t.diagnosticReady ? (
                              <p className="text-xs text-slate-500">
                                Reviewed questions are not ready yet. Use your
                                class notes, then check back.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {q.data.queue.length > 3 ? (
            <button
              type="button"
              className="min-h-11 px-5 text-sm font-semibold text-emerald-800"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show fewer subjects" : "See all subjects"}
            </button>
          ) : null}
          <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
            {q.data.notice}
          </p>
        </>
      )}
      {start.isError ? (
        <p role="alert" className="p-4 text-sm text-rose-700">
          {apiErrorMessage(start.error, "Practice could not start.")}
        </p>
      ) : null}
    </section>
  );
}
