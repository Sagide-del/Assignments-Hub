import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCheck,
  Music2,
  Pause,
  Target,
  RefreshCw,
} from "lucide-react";
import { skillsApi } from "../../api/skills.api";
import { apiErrorMessage } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";
import { SkillWorkbookButton } from "./skill-workspace/SkillWorkbookButton";
export function LearnSkillsPage() {
  const id = useAuthStore((s) => s.user?.id),
    client = useQueryClient(),
    navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState(false);
  const path = useQuery({
    queryKey: ["focused-skill-path", id],
    queryFn: skillsApi.getLearningPath,
    enabled: !!id,
  });
  const invalidate = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["focused-skill-path"] }),
      client.invalidateQueries({ queryKey: ["skill-enrollments"] }),
    ]);
  const focus = useMutation({
    mutationFn: skillsApi.chooseFocus,
    onSuccess: invalidate,
  });
  const pause = useMutation({
    mutationFn: skillsApi.pause,
    onSuccess: invalidate,
  });
  const start = useMutation({
    mutationFn: skillsApi.requestEnrollment,
    onSuccess: async (enrollment) => {
      await invalidate();
      navigate(
        `/student/learn-skills/${enrollment.courseId}${enrollment.status === "ACTIVE" ? "/workspace" : ""}`,
      );
    },
  });
  if (path.isPending)
    return (
      <p className="p-6 text-sm text-slate-500">Loading your skill path…</p>
    );
  if (path.isError || !path.data)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">
          Your skills could not be loaded
        </h1>
        <button
          onClick={() => void path.refetch()}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border px-4"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    );
  const p = path.data,
    active = p.enrollments.filter((e) =>
      ["ACTIVE", "REQUESTED", "AWAITING_PAYMENT"].includes(e.status),
    ),
    completed = p.enrollments.filter((e) => e.status === "COMPLETED");
  const error = start.error || pause.error || focus.error;
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-[240px]">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Learn a Skill
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Choose with purpose. Make something you can use.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${p.activeCount > 2 ? "bg-amber-50 text-amber-800" : "bg-[#edf4e7] text-[#4f6c35]"}`}
        >
          {p.activeCount} / 2 active skills
        </span>
      </header>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <Target size={19} className="mt-0.5 text-[#617d35]" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {p.focusLabel ?? "Choose your focus"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{p.reason}</p>
          </div>
        </div>
        <label className="text-xs font-medium text-slate-500">
          Learning focus
          <select
            aria-label="Learning focus"
            value={p.focus ?? ""}
            disabled={focus.isPending}
            onChange={(e) => focus.mutate(e.target.value)}
            className="ml-3 min-h-10 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
          >
            <option value="" disabled>
              Select a focus
            </option>
            {p.choices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          {apiErrorMessage(
            error,
            "Could not update your skill path. Please retry.",
          )}
        </p>
      )}
      {p.activeCount > 2 && (
        <p
          role="status"
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
        >
          Your previous enrollments are preserved. Pause skills until only two
          remain before continuing.
        </p>
      )}
      {active.length > 0 && (
        <section aria-label="Your active skills" className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Your active skills
          </h2>
          {active.map((e) => {
            const keys = new Set(
              e.lessonProgress
                .filter((l) => l.completedAt)
                .map((l) => l.lessonKey),
            );
            const total = e.program?.lessons.length ?? 0;
            const done =
              e.program?.lessons.filter((l) => keys.has(l.key)).length ??
              keys.size;
            const next = e.program?.lessons.find((l) => !keys.has(l.key));
            const due = e.lessonProgress.some(
              (l) =>
                l.completedAt &&
                Date.now() - Date.parse(l.completedAt) >= 86400000,
            );
            return (
              <article
                key={e.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 basis-[180px]">
                    <p className="text-xs text-slate-500">
                      {e.status === "ACTIVE"
                        ? "In progress"
                        : "Enrollment pending"}
                    </p>
                    <h3 className="mt-1 break-words font-semibold text-slate-900">
                      {e.course.title}
                    </h3>
                    <p className="mt-2 break-words text-xs leading-5 text-slate-500">
                      {next
                        ? `Next: ${next.title}`
                        : (e.program?.project ??
                          "Your previous course progress is preserved.")}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pause.isPending}
                    onClick={() => pause.mutate(e.courseId)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-50"
                  >
                    <Pause size={13} />
                    Pause
                  </button>
                </div>
                <div className="my-4 flex items-center gap-3">
                  <div
                    role="progressbar"
                    aria-label={`Progress: ${e.course.title}`}
                    aria-valuemin={0}
                    aria-valuemax={total || done || 1}
                    aria-valuenow={done}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                  >
                    <div
                      className="h-full bg-[#7e9b42]"
                      style={{
                        width: `${total ? Math.min(100, (done / total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {done}
                    {total ? ` / ${total}` : ""} lessons
                  </span>
                </div>
                {due && (
                  <p className="mb-3 text-xs text-[#6350a1]">
                    Recall break: try a previous task without the example.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  {e.status === "ACTIVE" && p.activeCount <= 2 && (
                    <Link
                      to={`/student/learn-skills/${e.courseId}/workspace${next ? `?lesson=${next.key}` : ""}`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#203e30] px-4 text-xs font-semibold text-white"
                    >
                      Continue
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  {e.program && <SkillWorkbookButton courseId={e.courseId} />}
                </div>
              </article>
            );
          })}
        </section>
      )}
      {p.focus &&
        p.courses.some((c) => !active.some((e) => e.courseId === c.id)) && (
          <section aria-label="Your focused courses" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                {active.length ? "Next in your focus" : "Your learning path"}
              </h2>
              <span className="text-xs text-slate-400">
                Practice → project → transfer
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {p.courses
                .filter((c) => !active.some((e) => e.courseId === c.id))
                .map((c) => (
                  <article
                    key={c.id}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf4e7] text-[#5c7835]">
                      {c.program.focus === "MUSIC" ? (
                        <Music2 size={18} />
                      ) : (
                        <Target size={18} />
                      )}
                    </span>
                    <h3 className="mt-4 font-semibold leading-6 text-slate-900">
                      {c.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {c.program.project}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      {c.program.lessons.length} practical lessons · workbook
                      included
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                      {c.enrollment?.status === "COMPLETED" ? (
                        <Link
                          to={`/student/learn-skills/${c.id}/workspace`}
                          className="min-h-10 py-2 text-xs font-semibold text-[#496d35]"
                        >
                          Review completed skill
                        </Link>
                      ) : (
                        <button
                          disabled={p.activeCount >= 2 || start.isPending}
                          onClick={() => start.mutate(c.id)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#203e30] px-4 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          {c.enrollment?.status === "CANCELLED"
                            ? "Resume skill"
                            : "Start skill"}
                          <ArrowRight size={14} />
                        </button>
                      )}
                      <SkillWorkbookButton courseId={c.id} />
                    </div>
                  </article>
                ))}
            </div>
            {p.activeCount >= 2 && (
              <p className="text-xs text-slate-500">
                Finish or pause one skill before starting another. Your work
                stays saved.
              </p>
            )}
          </section>
        )}
      {!p.focus && (
        <section className="rounded-xl border border-dashed border-slate-200 p-6 text-sm leading-6 text-slate-500">
          {p.choices.length
            ? "Select a focus above to see courses connected to your curriculum."
            : "No curated skill path is available for your curriculum yet. Your existing work is preserved."}
        </section>
      )}
      {p.focus === "MUSIC" && (
        <Link
          to="/student/labs/music"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#496d35]"
        >
          <Music2 size={16} />
          Open Music Studio
          <ArrowRight size={14} />
        </Link>
      )}
      {p.enrollments.some((e) => e.status === "CANCELLED" && e.pausedAt) && (
        <details className="border-t border-slate-200 pt-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold text-slate-600">
            Paused skills
          </summary>
          <p className="mb-3 text-xs leading-5 text-slate-500">
            Your work and any confirmed course payment are preserved. Resume
            within your focus when a slot is free.
          </p>
          <ul className="space-y-3">
            {p.enrollments
              .filter((e) => e.status === "CANCELLED" && e.pausedAt)
              .map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <span className="text-sm text-slate-700">
                    {e.course.title}
                  </span>
                  <button
                    disabled={
                      p.activeCount >= 2 ||
                      start.isPending ||
                      !p.courses.some((c) => c.id === e.courseId)
                    }
                    onClick={() => start.mutate(e.courseId)}
                    className="min-h-10 rounded-lg px-3 text-xs font-semibold text-[#496d35] disabled:opacity-40"
                  >
                    Resume
                  </button>
                </li>
              ))}
          </ul>
        </details>
      )}
      {completed.length > 0 && (
        <section className="border-t border-slate-200 pt-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"
          >
            <CheckCheck size={16} />
            Completed skills ({completed.length})
          </button>
          {showCompleted && (
            <ul className="mt-2 space-y-2">
              {completed.map((e) => (
                <li key={e.id}>
                  <Link
                    className="block min-h-10 py-2 text-sm text-[#496d35]"
                    to={`/student/learn-skills/${e.courseId}/workspace`}
                  >
                    {e.course.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
