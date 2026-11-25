import { ParentReportCharts } from "./ParentReportCharts";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Download,
  Activity,
  BookOpen,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { learningHubApi } from "../../api/learning-hub.api";
import { useAuthStore } from "../../store/auth.store";
import { apiErrorMessage } from "../../api/axios";
const date = (s: string) =>
  new Date(s).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
export function LearningEngagementReport() {
  const user = useAuthStore((s) => s.user),
    [days, setDays] = useState(30),
    [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["learning-engagement", user?.id, days],
    queryFn: () => learningHubApi.report(days),
    refetchOnMount: "always",
  });
  const pdf = useMutation({
    mutationFn: () => learningHubApi.pdf(days),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "assignment-hub-learning-report.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    },
  });
  const data = q.data;
  return (
    <section className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Academic-day ready
          </p>
          <h2 className="mt-1 text-2xl font-semibold">
            Learning & engagement report
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Report period"
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(0);
            }}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            {[7, 30, 90].map((n) => (
              <option key={n} value={n}>
                Last {n} days
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => pdf.mutate()}
            disabled={!data || pdf.isPending}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#143e32] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Download size={16} />
            {pdf.isPending ? "Preparing…" : "One-page PDF"}
          </button>
        </div>
      </header>
      {q.isPending ? (
        <p className="p-5 text-sm text-slate-500">
          Preparing your recorded progress…
        </p>
      ) : q.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          {apiErrorMessage(q.error, "Report could not load.")}{" "}
          <button onClick={() => void q.refetch()} className="underline">
            Retry
          </button>
        </p>
      ) : data ? (
        <>
          <div className="rounded-2xl bg-[#143e32] p-5 text-white">
            <p className="text-xl font-semibold">{data.student.name}</p>
            <p className="mt-1 text-sm text-emerald-100">
              {data.student.grade} · {data.student.school.name}
            </p>
            <p className="mt-3 text-xs text-emerald-100">
              {date(data.period.from)} — {date(data.period.to)} · East Africa
              Time
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [CalendarDays, "Active days", data.summary.activeDays],
              [BookOpen, "Subjects practised", data.summary.subjects],
              [Activity, "Recorded activities", data.summary.activities],
              [
                BarChart3,
                "Average score",
                data.summary.average === null
                  ? "—"
                  : `${data.summary.average}%`,
              ],
            ].map(([Icon, label, value]) => {
              const I = Icon as typeof Activity;
              return (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <I size={18} className="text-emerald-700" />
                  <p className="mt-3 text-3xl font-semibold">{String(value)}</p>
                  <p className="mt-1 text-xs text-slate-500">{String(label)}</p>
                </div>
              );
            })}
          </div>
          <ParentReportCharts report={data} />
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold">Subject performance</h3>
              <p className="mt-1 text-xs text-slate-500">
                Completed scored activities; not formal school grades.
              </p>
              <div className="mt-5 space-y-4">
                {data.subjectScores.length ? (
                  data.subjectScores.map((s) => (
                    <div key={s.subject}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span>{s.subject}</span>
                        <span className="font-semibold">
                          {s.average === null ? "Unscored" : `${s.average}%`}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${s.average !== null && s.average < 50 ? "bg-rose-400" : s.average !== null && s.average < 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                          style={{ width: `${s.average ?? 0}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {s.count} recorded activities
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Complete a practice session to see your results here.
                  </p>
                )}
              </div>
            </article>
            <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold">Your learning rhythm</h3>
              <p className="mt-1 text-xs text-slate-500">
                Recorded activities per day
              </p>
              <div
                className="mt-8 flex h-36 items-end gap-px"
                role="img"
                aria-label={`Daily completed activity chart for ${days} days`}
              >
                {data.daily.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.count} activities`}
                    className="min-w-0 flex-1 rounded-t bg-emerald-500"
                    style={{
                      height: `${Math.max(1, (100 * d.count) / Math.max(1, ...data.daily.map((x) => x.count)))}%`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>{data.daily[0]?.date}</span>
                <span>Today</span>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-4 text-sm leading-7 text-slate-600">
                <p>
                  <strong>{data.summary.logins}</strong> successful sign-ins
                </p>
                <p>
                  Last sign-in:{" "}
                  {data.summary.lastLogin
                    ? `${date(data.summary.lastLogin)} EAT`
                    : "not recorded in this period"}
                </p>
                <p>
                  Timetable:{" "}
                  <strong>
                    {data.summary.timetableCompleted}/
                    {data.summary.timetableTotal}
                  </strong>{" "}
                  study blocks marked complete
                </p>
              </div>
            </article>
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <h3 className="p-5 font-semibold">
              Activity timeline{" "}
              <span className="text-sm font-normal text-slate-400">
                ({data.events.length})
              </span>
            </h3>
            <div className="divide-y divide-slate-100">
              {data.events.slice(page * 20, page * 20 + 20).map((e, i) => (
                <article
                  key={`${e.at}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-700">
                      {e.kind}
                      {e.subject ? ` · ${e.subject}` : ""}
                    </p>
                    <p className="mt-1 break-words text-sm font-medium">
                      {e.title}
                    </p>
                    <time className="mt-1 block text-xs text-slate-400">
                      {date(e.at)} EAT
                    </time>
                  </div>
                  {e.score !== null ? (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-800">
                      {e.score}%
                    </span>
                  ) : null}
                </article>
              ))}
            </div>
            {!data.events.length ? (
              <p className="p-5 text-sm text-slate-500">
                No recorded activity in this period.
              </p>
            ) : null}
            {data.events.length > 20 ? (
              <div className="flex items-center justify-between border-t p-3 text-sm">
                <button
                  className="min-h-11 px-3 disabled:opacity-30"
                  disabled={!page}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span>
                  {page + 1}/{Math.ceil(data.events.length / 20)}
                </span>
                <button
                  className="min-h-11 px-3 disabled:opacity-30"
                  disabled={(page + 1) * 20 >= data.events.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
          <p className="text-xs leading-5 text-slate-500">{data.notes}</p>
        </>
      ) : null}
      {pdf.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          The PDF could not be downloaded. Please retry.
        </p>
      ) : null}
    </section>
  );
}
