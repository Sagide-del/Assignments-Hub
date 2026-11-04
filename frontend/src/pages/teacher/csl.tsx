import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";
import { cslLogbookApi } from "../../api/csl-logbook.api";
import { useAuthStore } from "../../store/auth.store";
import { apiErrorMessage } from "../../api/axios";
import { CompetencyBadges } from "../student/csl";
export default function TeacherCsl() {
  const actor = useAuthStore((s) => s.user),
    report = useQuery({
      queryKey: ["csl-pending", actor?.id, actor?.schoolId],
      queryFn: cslLogbookApi.pending,
      retry: false,
    refetchInterval: 30000,
    });
  const [comments, setComments] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function review(id: string, approve: boolean) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      if (approve) await cslLogbookApi.approve(id);
      else await cslLogbookApi.reject(id, comments[id]?.trim() ?? "");
      setMessage(
        approve
          ? "Activity approved. Hours added to the learner’s logbook."
          : "Activity rejected with your comment.",
      );
      await report.refetch();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not review activity."));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">CSL Approvals</h1>
        <span className="text-xs text-slate-500">Assigned streams only</span>
      </header>
      {(error || report.error) && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
        >
          {error ||
            apiErrorMessage(
              report.error,
              "You have no assigned classes. Contact your School Admin.",
            )}{" "}
          <button onClick={() => void report.refetch()} className="underline">
            Retry
          </button>
        </p>
      )}
      {message && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2 size={16} />
          {message}
        </p>
      )}
      {report.isLoading ? (
        <p role="status" className="p-5 text-sm text-slate-500">
          Loading submissions…
        </p>
      ) : !report.data?.logs.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <HeartHandshake className="mx-auto mb-3 text-slate-400" size={30} />
          <p className="text-sm text-slate-600">
            No pending activities in your assigned streams.
          </p>
        </div>
      ) : (
        report.data.logs.map((log) => (
          <article
            key={log.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold [overflow-wrap:anywhere]">{log.activity_name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {log.student?.name} · {log.student?.admissionNumber} ·{" "}
                  {log.student?.grade} / {log.student?.studentProfile?.stream}
                </p>
              </div>
              <strong className="text-sm tabular-nums">
                {log.hours_logged} hours
              </strong>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {log.activity_date.slice(0, 10)}
            </p>
            <p className="mt-3 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6 text-slate-600">
              {log.description}
            </p>
            {log.photo_url && (
              <img
                src={log.photo_url}
                alt={`Evidence for ${log.activity_name}`}
                loading="lazy"
                className="mt-3 max-h-48 max-w-full rounded-lg object-contain"
              />
            )}
            {log.photo_unavailable&&<p className="mt-2 text-xs text-amber-800">Photo temporarily unavailable. Refresh to retry.</p>}
            <CompetencyBadges log={log} />
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <button
                disabled={!!busy}
                onClick={() => void review(log.id, true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#101820] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                <Check size={15} />
                {busy === log.id ? "Saving…" : "Approve"}
              </button>
              <label className="min-w-40 flex-1">
                <span className="sr-only">
                  Rejection comment for {log.activity_name}
                </span>
                <input
                  disabled={!!busy}
                  maxLength={1000}
                  value={comments[log.id] ?? ""}
                  onChange={(e) =>
                    setComments({ ...comments, [log.id]: e.target.value })
                  }
                  placeholder="Comment required to reject"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </label>
              <button
                disabled={!!busy || (comments[log.id]?.trim().length ?? 0) < 5}
                onClick={() => void review(log.id, false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                Reject with comment
              </button>
            </div>
          </article>
        ))
      )}
      {(report.data?.logs.length ?? 0) >= 200 && (
        <p className="text-xs text-slate-500">
          Showing the oldest 200 pending activities. Review these to load the
          next group.
        </p>
      )}
      <Link
        to="/teacher/csl-review"
        className="inline-block text-xs text-slate-500 underline"
      >
        Previous activity reviews
      </Link>
    </div>
  );
}
