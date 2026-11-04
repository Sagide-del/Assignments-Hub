import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HeartHandshake,
  Plus,
  Download,
  Clock,
  CheckCircle2,
  X,
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
            placeholder="Community clean-up"
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
  if (!senior)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">My CSL Impact</h1>
        <p className="mt-2 text-sm text-slate-500">
          The service-hour logbook is available in Grades 10–12.
        </p>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">My CSL Impact</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#101820] px-4 py-2.5 text-sm font-medium text-white"
        >
          <Plus size={17} />
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
      <section className="flex flex-wrap items-center gap-7 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="relative h-36 w-36 shrink-0">
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label={`${hours} of ${target} approved service hours`}
            className="h-full w-full -rotate-90"
          >
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#edf0f2"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#8da919"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${percent * 3.14159} 314.159`}
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-3xl font-semibold tabular-nums">
              {hours}
            </strong>
            <span className="text-xs text-slate-500">of {target} hours</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HeartHandshake size={19} className="text-[#7f961b]" />
            Your community contribution
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {report.data?.pending_hours ?? 0} hours awaiting teacher approval
          </p>
          {report.data?.complete && (
            <button
              disabled={busy}
              onClick={() => void pdf()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Download size={16} />
              {busy ? "Creating PDF…" : "Download CSL Logbook (PDF)"}
            </button>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-400">
            School tracking target. Research-project completion is verified
            separately.
          </p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Service activities</h2>
        {report.isLoading ? (
          <p role="status" className="p-5 text-sm text-slate-500">
            Loading logbook…
          </p>
        ) : !report.data?.logs.length ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <HeartHandshake size={30} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm text-slate-500">
              Your first contribution starts here. Log an activity you have
              completed.
            </p>
          </div>
        ) : (
          report.data.logs.map((log) => (
            <article
              key={log.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold [overflow-wrap:anywhere]">
                    {log.activity_name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {log.activity_date.slice(0, 10)} · {log.hours_logged} hours
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${log.review_status === "APPROVED" ? "bg-emerald-50 text-emerald-800" : log.review_status === "REJECTED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}
                >
                  {log.review_status === "APPROVED" ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <Clock size={13} />
                  )}{" "}
                  {log.review_status === "PENDING"
                    ? "Pending Teacher Approval"
                    : log.review_status === "APPROVED"
                      ? "Approved"
                      : "Not approved"}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6 text-slate-600">
                {log.description}
              </p>
              {log.photo_url && (
                <img
                  src={log.photo_url}
                  alt={`Evidence for ${log.activity_name}`}
                  loading="lazy"
                  className="mt-3 max-h-40 max-w-full rounded-lg object-contain"
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
      {open && (
        <ActivityForm
          onClose={() => setOpen(false)}
          onSaved={() => void report.refetch()}
        />
      )}
    </div>
  );
}
