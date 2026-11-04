import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  Share2,
  RefreshCw,
  Sigma,
  Atom,
  BookOpen,
  Heart,
  Coffee,
  Brain,
  Shuffle,
  Target,
  Timer,
  Trophy,
  ArrowUpRight,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import {
  timetableApi,
  saveTimetable,
  type TimetableBlock,
} from "../../api/timetable.api";
import { apiErrorMessage } from "../../api/axios";
import { Logo, AssignmentHubWordmark } from "../../components/ui/Logo";
const techniques: Record<string, { icon: typeof Brain; help: string }> = {
  "Spaced Repetition": {
    icon: Brain,
    help: "Reviewing at increasing intervals.",
  },
  Interleaving: { icon: Shuffle, help: "Mixing topics for better recall." },
  "Active Recall": { icon: Target, help: "Testing yourself, not re-reading." },
  Pomodoro: { icon: Timer, help: "25 min focus + 5 min break." },
};
const dateLabel = (key: string) =>
  new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(key));
function family(subject: string) {
  return /math/i.test(subject)
    ? {
        name: "Math",
        icon: Sigma,
        color: "border-blue-200 bg-blue-50 text-blue-950",
      }
    : /science|biology|chemistry|physics|agriculture|technology|computer|aviation/i.test(
          subject,
        )
      ? {
          name: "Science",
          icon: Atom,
          color: "border-emerald-200 bg-emerald-50 text-emerald-950",
        }
      : /english|kiswahili|arabic|french|language/i.test(subject)
        ? {
            name: "Languages",
            icon: BookOpen,
            color: "border-orange-200 bg-orange-50 text-orange-950",
          }
        : /community|csl/i.test(subject)
          ? {
              name: "CSL",
              icon: Heart,
              color: "border-violet-200 bg-violet-50 text-violet-950",
            }
          : {
              name: "Other",
              icon: BookOpen,
              color: "border-slate-200 bg-slate-50 text-slate-800",
            };
}
function Technique({ name }: { name: string }) {
  const info = techniques[name];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <span
      tabIndex={0}
      title={info.help}
      aria-label={`${name}: ${info.help}`}
      className="mt-2 inline-flex cursor-help items-center gap-1 rounded bg-white/70 px-1.5 py-1 text-[10px] font-medium text-slate-600"
    >
      <Icon size={11} aria-hidden="true" />
      {name}
    </span>
  );
}
function SelfRecall({
  block,
  onClose,
  onComplete,
}: {
  block: TimetableBlock;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [answers, setAnswers] = useState<Record<number, string>>({}),
    [error, setError] = useState("");
  return (
    <dialog
      ref={(node) => {
        if (node && !node.open) node.showModal();
      }}
      aria-labelledby="self-recall-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-auto rounded-2xl border border-slate-200 bg-white p-6 text-[#101820] backdrop:bg-slate-950/40"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id="self-recall-title" className="text-lg font-semibold">
          Recall without notes
        </h2>
        <button disabled={busy} aria-label="Close recall" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <p className="mt-2 text-sm text-slate-500">
        {block.subject} · {block.topic}
      </p>
      <p className="mt-3 rounded-lg bg-pink-50 p-3 text-xs leading-5 text-pink-900">
        A published quiz is not available for this topic yet. Use these
        self-recall prompts, then check your work against your lesson.
      </p>
      <div className="mt-4 space-y-4">
        {(block.recall_prompts ?? []).map((q, i) => (
          <label key={i} className="block text-sm font-medium">
            {i + 1}. {q}
            <textarea
              rows={3}
              maxLength={2000}
              value={answers[i] ?? ""}
              onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal"
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-amber-900">
          {error}
        </p>
      )}
      <button
        disabled={
          busy ||
          (block.recall_prompts ?? []).some((_, i) => !answers[i]?.trim())
        }
        onClick={async () => {
          setBusy(true);
          try {
            await onComplete();
            onClose();
          } catch (e) {
            setError(apiErrorMessage(e, "Could not save progress."));
          } finally {
            setBusy(false);
          }
        }}
        className="mt-5 w-full rounded-lg bg-[#101820] px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "Saving…" : "I recalled, checked and corrected my work"}
      </button>
    </dialog>
  );
}
export default function WeeklyTimetable({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const actor = useAuthStore((s) => s.user),
    cache = useQueryClient(),
    [params, setParams] = useSearchParams();
  const [generating, setGenerating] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [selectedDay, setSelectedDay] = useState(
      new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        timeZone: "Africa/Nairobi",
      }).format(new Date()),
    ),
    [recall, setRecall] = useState<TimetableBlock | null>(null);
  const key = ["weekly-timetable", actor?.id, actor?.schoolId];
  const current = useQuery({
    queryKey: key,
    queryFn: timetableApi.current,
    refetchInterval: (q) =>
      generating || q.state.data?.timetable?.generating ? 5000 : false,
  });
  const historyId = params.get("plan");
  const historic = useQuery({
    queryKey: [...key, "history", historyId],
    queryFn: () => timetableApi.get(historyId!),
    enabled: !!historyId,
  });
  const timetable = historyId ? historic.data : current.data?.timetable;
  const plan = timetable?.plan;
  const student = current.data?.student;
  const preparing = generating || timetable?.generating;
  const fail =
    error ||
    ((historyId ? historic.error : current.error)
      ? apiErrorMessage(
          historyId ? historic.error : current.error,
          "Could not load your saved timetable.",
        )
      : "");
  const setHistory = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("plan", id);
    else next.delete("plan");
    setParams(next);
  };
  async function generate() {
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const result = await timetableApi.generate(
        !!current.data?.timetable?.plan,
      );
      setHistory("");
      cache.setQueryData(key, (old: any) =>
        old ? { ...old, timetable: result } : old,
      );
      await current.refetch();
    } catch (e) {
      setError(
        apiErrorMessage(
          e,
          "Your plan could not be prepared. A saved plan is kept while generation finishes.",
        ),
      );
      await current.refetch();
    } finally {
      setGenerating(false);
    }
  }
  async function progress(blockId: string, checked: boolean) {
    if (!timetable || !plan) return;
    setBusy(blockId);
    setError("");
    try {
      const updated = await timetableApi.complete(
        timetable.id,
        blockId,
        checked,
        plan.revision,
      );
      if (historyId)
        cache.setQueryData([...key, "history", historyId], updated);
      else
        cache.setQueryData(key, (old: any) =>
          old ? { ...old, timetable: updated } : old,
        );
    } catch (e) {
      setError(apiErrorMessage(e, "Could not save progress."));
      throw e;
    } finally {
      setBusy("");
    }
  }
  async function exportPdf(share = false) {
    if (!timetable || !plan) return;
    setBusy(share ? "share" : "pdf");
    setError("");
    setMessage("");
    try {
      const blob = await timetableApi.pdf(timetable.id),
        name = `assignment-hub-study-plan-${plan.week_start}.pdf`;
      const file = new File([blob], name, { type: "application/pdf" });
      if (share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "My Assignment Hub study plan",
          });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          // Browsers may expire the share gesture while the PDF renders.
        }
      }
      saveTimetable(blob, name);
      if (share)
        setMessage(
          "Your PDF was downloaded. Attach it to WhatsApp, email or your preferred sharing app.",
        );
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError(apiErrorMessage(e, "Could not prepare the PDF."));
    } finally {
      setBusy("");
    }
  }
  function blockCard(block: TimetableBlock) {
    const rest = block.activity_type === "BREAK",
      reward = block.activity_type === "REWARD",
      quiz = block.activity_type === "RECALL",
      category = family(block.subject),
      Icon = quiz ? Target : rest ? Coffee : reward ? Trophy : category.icon;
    const color = quiz
      ? "border-pink-200 bg-pink-50 text-pink-950"
      : rest
        ? "border-slate-200 bg-slate-50 text-slate-500"
        : reward
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : category.color;
    return (
      <article
        key={block.id}
        className={`min-w-0 rounded-lg border p-3 ${color}`}
        aria-label={`${block.start} ${block.activity_type} ${block.subject}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-medium tabular-nums opacity-75">
            {block.start}–{block.end}
          </span>
          <Icon size={14} className="shrink-0" aria-hidden="true" />
        </div>
        <p className="mt-1.5 text-xs font-semibold [overflow-wrap:anywhere]">
          {rest
            ? block.school_commitment
              ? "School commitment"
              : "Break"
            : reward
              ? "Reward"
              : block.subject}
        </p>
        <p className="mt-1 text-[11px] leading-5 opacity-80 [overflow-wrap:anywhere]">
          {block.topic}
        </p>
        {block.focus_zone && (
          <p className="mt-2 flex items-center gap-1.5 text-[9px] font-bold tracking-wide text-red-700">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            FOCUS ZONE
          </p>
        )}
        <Technique name={block.technique} />
        {block.review && (
          <p className="mt-1 text-[10px] text-slate-500">
            Day {block.review.offset_days} review
          </p>
        )}
        {block.activity_type === "STUDY" && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer font-medium">
              Session guide
            </summary>
            <p className="mt-1 leading-5">{block.activity}</p>
            <p className="mt-1 text-slate-500">
              20 min study + 5 min recall = one focus cycle.
            </p>
          </details>
        )}
        {quiz &&
          (block.quiz_link ? (
            <Link
              to={block.quiz_link}
              className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold underline"
            >
              Quick quiz
              <ArrowUpRight size={12} />
            </Link>
          ) : (
            <button
              onClick={() => setRecall(block)}
              className="mt-3 min-h-9 text-xs font-semibold underline"
            >
              Start self-recall
            </button>
          ))}
        {block.activity_type === "STUDY" && (
          <label className="mt-3 flex items-center gap-2 border-t border-current/10 pt-2 text-[11px] font-medium">
            <input
              type="checkbox"
              checked={plan?.completed_block_ids.includes(block.id) ?? false}
              disabled={!!busy}
              onChange={(e) =>
                void progress(block.id, e.target.checked).catch(() => {})
              }
              aria-label={`Complete ${block.subject} ${block.start} ${block.id}`}
            />
            Completed
          </label>
        )}
      </article>
    );
  }
  const Title = embedded ? "h2" : "h1";
  return (
    <div className="min-w-0 space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {student?.independent ? (
              <AssignmentHubWordmark size="sm" />
            ) : (
              <Logo
                src={student?.school.logo_url}
                name={student?.school.name}
                size="sm"
              />
            )}
            <div className="min-w-0">
              <Title className="text-xl font-semibold tracking-tight text-[#101820] sm:text-2xl">
                Weekly Study Plan
              </Title>
              <p className="mt-1 text-sm text-slate-500">
                {student?.name ?? actor?.name} ·{" "}
                {student?.grade ?? actor?.grade}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {student?.school.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => void generate()}
            disabled={!!preparing || current.isLoading || !!busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#101820] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            <RefreshCw size={15} className={preparing ? "animate-spin" : ""} />
            {preparing
              ? "Preparing plan…"
              : plan
                ? "Generate New Plan"
                : "Generate Weekly Plan"}
          </button>
        </div>
        {plan && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-sm font-medium text-slate-700">
                {dateLabel(plan.week_start)}–{dateLabel(plan.days[6].date)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Africa/Nairobi ·{" "}
                {plan.source === "AI"
                  ? "AI-assisted plan"
                  : "Structured study plan"}{" "}
                ·{" "}
                {plan.school_schedule_applied
                  ? "School schedule applied"
                  : "Default study windows"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={!!busy}
                onClick={() => void exportPdf()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-40"
              >
                <Download size={15} />
                {busy === "pdf" ? "Preparing…" : "Download as PDF"}
              </button>
              <button
                disabled={!!busy}
                onClick={() => void exportPdf(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-40"
              >
                <Share2 size={15} />
                Share PDF
              </button>
            </div>
          </div>
        )}
      </header>
      {fail && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
        >
          {fail}{" "}
          <button onClick={() => void current.refetch()} className="underline">
            Retry
          </button>
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}
      {current.isLoading || historic.isLoading ? (
        <p role="status" className="p-6 text-sm text-slate-500">
          Loading your timetable…
        </p>
      ) : !plan ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <CalendarDays size={34} className="mx-auto text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold">
            A week built around your learning
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Generate a saved plan using your available results, short focus
            sessions and recall practice. Opening the timetable reuses your
            saved plan.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold">
                This week: {timetable!.progress.completed}/
                {timetable!.progress.total} sessions completed
              </p>
              <div
                role="progressbar"
                aria-label="Study sessions completed"
                aria-valuemin={0}
                aria-valuemax={Math.max(1, timetable!.progress.total)}
                aria-valuenow={timetable!.progress.completed}
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full bg-[#8da919]"
                  style={{
                    width: `${timetable!.progress.total ? (timetable!.progress.completed / timetable!.progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Learner-reported practice progress · not a formal assessment
              </p>
            </div>
            <label className="text-xs font-medium text-slate-500">
              Saved weeks
              <select
                aria-label="Saved study weeks"
                value={historyId ?? ""}
                onChange={(e) => setHistory(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
              >
                <option value="">Current week</option>
                {current.data?.history
                  .filter((h) => h.id !== current.data?.timetable?.id)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {dateLabel(h.week_start)}
                    </option>
                  ))}
              </select>
            </label>
          </section>
          <div className="flex flex-wrap items-center gap-2">
            {plan.focus_subjects
              .filter((s) => s.weak)
              .map((s) => (
                <span
                  key={s.subject}
                  className="inline-flex items-center gap-2 rounded-md border border-red-100 bg-white px-3 py-2 text-xs text-slate-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                  {s.subject}
                  {s.percentage !== null && (
                    <span className="text-slate-400">{s.percentage}%</span>
                  )}
                </span>
              ))}
            {!plan.focus_subjects.some((s) => s.weak) && (
              <span className="text-xs text-slate-500">
                Balanced practice across your available subjects
              </span>
            )}
          </div>
          <nav
            aria-label="Choose study day"
            className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            {plan.days.map((d) => (
              <button
                key={d.day}
                aria-pressed={selectedDay === d.day}
                onClick={() => setSelectedDay(d.day)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${selectedDay === d.day ? "bg-[#101820] text-white" : "border border-slate-200 bg-white text-slate-600"}`}
              >
                {d.day.slice(0, 3)}
              </button>
            ))}
          </nav>
          <section
            aria-label="Weekly timetable"
            className="hidden max-h-[48rem] overflow-auto rounded-xl border border-slate-200 bg-white p-3 lg:block"
          >
            <div className="grid min-w-[1120px] grid-cols-7 gap-3">
              {plan.days.map((d) => (
                <div key={d.day} className="min-w-0">
                  <header className="sticky top-0 z-10 mb-3 rounded-lg bg-slate-100 p-3">
                    <h3 className="text-sm font-semibold">{d.day}</h3>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {d.date} · {d.window.start}–{d.window.end}
                    </p>
                  </header>
                  <div className="space-y-2">{d.blocks.map(blockCard)}</div>
                </div>
              ))}
            </div>
          </section>
          <section
            aria-label="Selected day timetable"
            className="space-y-3 lg:hidden"
          >
            {plan.days
              .filter((d) => d.day === selectedDay)
              .map((d) => (
                <div key={d.day} className="space-y-3">
                  <h3 className="text-base font-semibold">
                    {d.day}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      {d.window.start}–{d.window.end}
                    </span>
                  </h3>
                  {d.blocks.map(blockCard)}
                </div>
              ))}
          </section>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(techniques).map(([name, { icon: Icon, help }]) => (
              <div
                key={name}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="flex items-center gap-2 text-xs font-semibold">
                  <Icon size={16} className="text-[#71851b]" />
                  {name}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{help}</p>
              </div>
            ))}
          </section>
          <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Plan details and upcoming reviews
            </summary>
            <p className="mt-3 text-sm italic text-slate-600">“{plan.quote}”</p>
            {plan.next_week_reviews.length > 0 && (
              <ul className="mt-3 space-y-2 text-xs text-slate-500">
                {plan.next_week_reviews.map((r, i) => (
                  <li key={i}>
                    {dateLabel(r.due_date)} · {r.subject} · {r.topic} · Day{" "}
                    {r.offset_days} review
                  </li>
                ))}
              </ul>
            )}
            {plan.warnings.map((w, i) => (
              <p key={i} className="mt-3 text-xs leading-5 text-slate-500">
                {w}
              </p>
            ))}
          </details>
        </>
      )}
      <Link
        to="/student/study-hub/previous-plans"
        className="inline-block text-xs text-slate-500 underline"
      >
        Previous report-based study plans
      </Link>
      {recall && (
        <SelfRecall
          block={recall}
          onClose={() => setRecall(null)}
          onComplete={() => progress(recall.study_block_id!, true)}
        />
      )}
    </div>
  );
}
