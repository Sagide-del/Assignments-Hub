import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HeartHandshake,
  Plus,
  Download,
  Clock,
  CheckCircle2,
  X,
  Sprout,
  Handshake,
  Sparkles,
  Trophy,
  GraduationCap,
  LockKeyhole,
  Flag,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { apiErrorMessage } from "../../api/axios";
import {
  cslLogbookApi,
  cslToday,
  saveCslPdf,
  type CslLog,
} from "../../api/csl-logbook.api";
export function CompetencyBadges({ log }: { log: CslLog }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {log.competency_tags.map((t) => (
        <span
          key={t}
          className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
        >
          {t}
        </span>
      ))}
      {log.ai_status !== "COMPLETE" && (
        <span className="text-xs text-slate-400">
          {log.ai_status === "FAILED"
            ? "Competency tagging deferred"
            : "Competency tagging pending"}
        </span>
      )}
    </div>
  );
}
function ActivityForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(""),
    [reflection, setReflection] = useState(""),
    [hours, setHours] = useState(""),
    [date, setDate] = useState(cslToday()),
    [photo, setPhoto] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submissionKey = useRef(crypto.randomUUID()),
    dialog = useRef<HTMLDialogElement | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (photo && photo.size > 5 * 1024 * 1024) {
      setError("Choose a photo smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("activity_name", name.trim());
    form.append("description", reflection.trim());
    form.append("hours_logged", hours);
    form.append("activity_date", date);
    form.append("submission_key", submissionKey.current);
    if (photo) form.append("photo", photo);
    try {
      await cslLogbookApi.log(form);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        apiErrorMessage(err, "Could not save activity. You can retry safely."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={(node) => {
        dialog.current = node;
        if (node && !node.open) node.showModal();
      }}
      aria-labelledby="csl-form-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-auto rounded-2xl border border-slate-200 bg-white p-6 text-[#101820] shadow-xl backdrop:bg-slate-950/40"
    >
      <header className="mb-5 flex items-center justify-between">
        <h2 id="csl-form-title" className="text-lg font-semibold">
          Log a service activity
        </h2>
        <button
          aria-label="Close activity form"
          onClick={onClose}
          disabled={busy}
        >
          <X size={18} />
        </button>
      </header>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block text-sm font-medium">
          Activity name
          <input
            required
            minLength={3}
            maxLength={120}
            disabled={busy}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Mentored Grade 5 students in Math"
            className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 font-normal"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">
            Activity date
            <input
              type="date"
              required
              max={cslToday()}
              min="2020-01-01"
              disabled={busy}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Hours served
            <input
              type="number"
              required
              min={0.01}
              max={24}
              step={0.01}
              disabled={busy}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="2.5"
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 font-normal"
            />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Your reflection
          <textarea
            required
            minLength={30}
            maxLength={3000}
            rows={5}
            disabled={busy}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What did you contribute? Who benefited, and what did you learn?"
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 p-3 font-normal"
          />
        </label>
        <label className="block text-sm font-medium">
          Evidence photo{" "}
          <span className="font-normal text-slate-400">optional</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-xs"
          />
          <span className="mt-1 block text-xs font-normal text-slate-400">
            JPEG, PNG or WebP · up to 5 MB / 12 megapixels · visible to your
            school reviewers
          </span>
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-[#101820] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Submit for approval"}
        </button>
      </form>
    </dialog>
  );
}
export default function StudentCsl() {
  const actor = useAuthStore((s) => s.user),
    senior = /^Grade (10|11|12)$/.test(actor?.grade ?? "");
  const report = useQuery({
    queryKey: ["csl-hours", actor?.id, actor?.schoolId],
    queryFn: cslLogbookApi.mine,
    enabled: senior,
    refetchInterval: 30000,
  });
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const hours = report.data?.approved_hours ?? 0,
    target = report.data?.target_hours ?? 135,
    percent = Math.min(100, (hours / target) * 100);
  async function pdf() {
    setBusy(true);
    setError("");
    try {
      saveCslPdf(await cslLogbookApi.pdf(actor!.id));
    } catch (e) {
      setError(apiErrorMessage(e, "Could not create logbook PDF."));
    } finally {
      setBusy(false);
    }
  }
  const formatHours = (value: number) =>
    new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value);
  const remaining = Math.max(0, Math.round((target - hours) * 100) / 100);
  const milestones = [
    {
      name: "Starter",
      hours: 25,
      icon: Sprout,
      color: "text-emerald-700 bg-emerald-50",
    },
    {
      name: "Helper",
      hours: 50,
      icon: Handshake,
      color: "text-sky-700 bg-sky-50",
    },
    {
      name: "Change Maker",
      hours: 75,
      icon: Sparkles,
      color: "text-violet-700 bg-violet-50",
    },
    {
      name: "Champion",
      hours: 100,
      icon: Trophy,
      color: "text-amber-700 bg-amber-50",
    },
    {
      name: "Journey Complete",
      hours: target,
      icon: GraduationCap,
      color: "text-emerald-700 bg-emerald-50",
    },
  ];
  const earned = milestones.filter((m) => hours >= m.hours).length;
  const next = milestones.find((m) => hours < m.hours);
  const canDownload = report.data?.complete === true && hours >= target;
  const motivation =
    hours >= target
      ? "Congratulations! You've completed your service-hours goal."
      : hours < 25
        ? "Your journey has just begun. Keep going!"
        : hours < 75
          ? "Great progress! You're making a real difference."
          : "Almost there! The finish line is in sight.";
  if (!senior)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">My CSL Journey</h1>
        <p className="mt-2 text-sm text-slate-500">
          The service-hour logbook is available in Grades 10–12.
        </p>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-4">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div className="w-full min-w-0 sm:flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[#101820] sm:text-3xl">
            My CSL Journey
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Log your community service, build your KICD portfolio, and make an
            impact.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#101820] px-4 py-3 text-sm font-medium text-white sm:w-auto"
        >
          <Plus size={17} aria-hidden="true" />
          Log New Activity
        </button>
      </header>
      {(error || report.error) && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          {error ||
            apiErrorMessage(report.error, "Could not load your logbook.")}{" "}
          <button className="underline" onClick={() => void report.refetch()}>
            Retry
          </button>
        </p>
      )}
      <section
        aria-label="Journey progress"
        className="grid items-center gap-7 rounded-2xl border border-slate-200 bg-white px-5 py-7 sm:px-8 lg:grid-cols-[280px_1fr] lg:gap-12"
      >
        <div className="flex flex-col items-center">
          <div
            role="progressbar"
            aria-label="Approved CSL hours"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.min(hours, target)}
            aria-valuetext={`${formatHours(hours)} of ${target} approved hours`}
            className="relative h-56 w-56 shrink-0 sm:h-60 sm:w-60"
          >
            <svg
              viewBox="0 0 240 240"
              aria-hidden="true"
              className="h-full w-full -rotate-90"
            >
              <circle
                cx="120"
                cy="120"
                r="102"
                fill="none"
                stroke="#edf0f2"
                strokeWidth="12"
              />
              <circle
                cx="120"
                cy="120"
                r="102"
                fill="none"
                stroke={canDownload ? "#15803d" : "#8da919"}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0, percent) * 6.40885} 640.885`}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <strong className="text-4xl font-semibold tracking-tight text-[#101820]">
                  {report.isPending ? "—" : formatHours(hours)}
                </strong>
                <span className="text-xl font-medium text-slate-400">
                  / {target}
                </span>
              </div>
              <span className="mt-1 text-sm font-medium text-slate-500">
                Hours
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-400">
                <CheckCircle2 size={12} aria-hidden="true" />
                Teacher approved
              </span>
            </div>
          </div>
          <p
            role="status"
            className="mt-4 max-w-72 text-center text-sm font-medium leading-6 text-slate-700"
          >
            {report.isPending ? "Loading your journey…" : motivation}
          </p>
        </div>
        <div className="min-w-0 space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71851b]">
            <HeartHandshake size={17} aria-hidden="true" />
            Community service learning
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#101820]">
            Every contribution moves you forward.
          </h2>
          <dl className="grid grid-cols-2 gap-4 border-y border-slate-100 py-5">
            <div>
              <dt className="text-xs text-slate-500">Awaiting approval</dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums">
                {formatHours(report.data?.pending_hours ?? 0)}{" "}
                <span className="text-sm font-normal text-slate-400">hrs</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Hours to your goal</dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums">
                {formatHours(remaining)}{" "}
                <span className="text-sm font-normal text-slate-400">hrs</span>
              </dd>
            </div>
          </dl>
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <Flag
              size={19}
              className="mt-0.5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {next
                  ? `Next milestone · ${next.name}`
                  : "All milestones unlocked"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {next
                  ? `${formatHours(Math.round((next.hours - hours) * 100) / 100)} more approved hours to unlock.`
                  : "Your approved service-hours goal is complete."}
              </p>
            </div>
          </div>
        </div>
      </section>
      <section
        aria-labelledby="milestones-title"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="milestones-title" className="text-base font-semibold">
            Your milestones
          </h2>
          <span className="text-xs text-slate-500">
            {earned} of {milestones.length} unlocked
          </span>
        </div>
        <ul
          aria-label="Journey milestones"
          className="flex snap-x gap-3 overflow-x-auto pb-2"
        >
          {milestones.map(({ name, hours: threshold, icon: Icon, color }) => {
            const unlocked = hours >= threshold;
            return (
              <li
                key={name}
                data-state={unlocked ? "unlocked" : "locked"}
                aria-label={`${name}, ${threshold} hours, ${unlocked ? "unlocked" : "locked"}`}
                className={`flex min-w-28 flex-1 snap-start flex-col items-center rounded-xl border p-3 text-center sm:min-w-0 ${unlocked ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${unlocked ? color : "bg-slate-100 text-slate-400"}`}
                >
                  <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <p
                  className={`mt-3 min-h-8 text-xs font-semibold leading-4 ${unlocked ? "text-slate-800" : "text-slate-400"}`}
                >
                  {name}
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                  {unlocked ? (
                    <CheckCircle2 size={11} aria-hidden="true" />
                  ) : (
                    <LockKeyhole size={11} aria-hidden="true" />
                  )}
                  {threshold} hrs
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Milestones are earned with teacher-approved hours.
        </p>
      </section>
      <section aria-labelledby="service-activities-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="service-activities-title" className="text-base font-semibold">
            Service activities
          </h2>
          <span className="text-xs text-slate-400">
            {report.data?.logs.length ?? 0} entries
          </span>
        </div>
        {report.isLoading ? (
          <p role="status" className="p-5 text-sm text-slate-500">
            Loading logbook…
          </p>
        ) : !report.data?.logs.length ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <HeartHandshake
              size={30}
              className="mx-auto mb-3 text-slate-400"
              aria-hidden="true"
            />
            <p className="text-sm text-slate-500">
              Your first contribution starts here. Log an activity you have
              completed.
            </p>
          </div>
        ) : (
          report.data.logs.map((log) => (
            <article
              key={log.id}
              className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#101820] [overflow-wrap:anywhere]">
                    {log.activity_name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400">
                    <time dateTime={log.activity_date.slice(0, 10)}>
                      {log.activity_date.slice(0, 10)}
                    </time>
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-slate-700">
                  <Clock size={12} aria-hidden="true" />
                  {formatHours(log.hours_logged)} hrs
                </span>
              </div>
              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${log.review_status === "APPROVED" ? "bg-emerald-50 text-emerald-800" : log.review_status === "REJECTED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}
              >
                {log.review_status === "APPROVED" ? (
                  <CheckCircle2 size={12} aria-hidden="true" />
                ) : (
                  <Clock size={12} aria-hidden="true" />
                )}
                {log.review_status === "PENDING"
                  ? "Pending Approval"
                  : log.review_status === "APPROVED"
                    ? "Approved"
                    : "Not approved"}
              </span>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {log.description}
              </p>
              {log.photo_url && (
                <img
                  src={log.photo_url}
                  alt={`Evidence for ${log.activity_name}`}
                  loading="lazy"
                  className="mt-4 max-h-56 max-w-full rounded-xl object-contain"
                />
              )}
              {log.photo_unavailable && (
                <p className="mt-2 text-xs text-amber-800">
                  Photo temporarily unavailable. Refresh to retry.
                </p>
              )}
              <CompetencyBadges log={log} />
              {log.rejection_comment && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  Teacher comment: {log.rejection_comment}
                </p>
              )}
            </article>
          ))
        )}
      </section>
      <section
        aria-labelledby="journey-logbook-title"
        className={`rounded-2xl border p-5 sm:p-6 ${canDownload ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${canDownload ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
          >
            {canDownload ? (
              <GraduationCap size={24} aria-hidden="true" />
            ) : (
              <LockKeyhole size={22} aria-hidden="true" />
            )}
          </div>
          <div>
            <h2 id="journey-logbook-title" className="font-semibold">
              Your CSL Logbook
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {canDownload
                ? "Your approved activities, competencies and photo evidence, ready to share with your school."
                : `${formatHours(remaining)} more approved hours to unlock your portfolio export.`}
            </p>
          </div>
        </div>
        <button
          disabled={busy || !canDownload || report.isError}
          onClick={() => void pdf()}
          className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold sm:w-auto ${canDownload ? "bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50" : "cursor-not-allowed bg-slate-100 text-slate-400"}`}
        >
          {canDownload ? (
            <Download size={17} aria-hidden="true" />
          ) : (
            <LockKeyhole size={16} className="shrink-0" aria-hidden="true" />
          )}
          {canDownload
            ? busy
              ? "Creating PDF…"
              : "Download Your CSL Logbook (PDF)"
            : `Locked — Reach ${target} approved hours to unlock your CSL Logbook (PDF)`}
        </button>
        <p className="mt-4 text-xs leading-5 text-slate-400">
          School tracking target. Research-project completion and any official
          certification are verified separately.
        </p>
      </section>
      {open && (
        <ActivityForm
          onClose={() => setOpen(false)}
          onSaved={() => void report.refetch()}
        />
      )}
    </div>
  );
}
