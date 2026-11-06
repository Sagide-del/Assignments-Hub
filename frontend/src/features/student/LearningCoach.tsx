import { PageHeader } from "../../components/ui/Saas";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Clock3,
  Lightbulb,
  RotateCcw,
  Upload,
  Volume2,
  Plus,
  Trash2,
  BrainCircuit,
  Sparkles,
  BookOpenCheck,
} from "lucide-react";
import { apiErrorMessage } from "../../api/axios";
import {
  learningCoachApi,
  type LearningPlan,
  type LearningCoachReportCard,
  type LearningSession,
  type LearningTopic,
} from "../../api/learning-coach.api";
import { useAuthStore } from "../../store/auth.store";
import { isCbcGrade } from "../../utils/gradeTier";
import { useStudentContentScope } from "../../hooks/useStudentContentScope";
import { timetableApi } from "../../api/timetable.api";
import { useNavigate } from "react-router-dom";

type ReportScore = { subject: string; percentage: number };

function parseReportImageText(text: string): ReportScore[] {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/)
    .flatMap((line) => {
      const subject = line.match(/^\s*([A-Za-z][A-Za-z &/-]{2,60}?)(?=\s+\d)/)?.[1];
      const values = [...line.matchAll(/\b\d{1,3}\b/g)].map((match) => Number(match[0]));
      if (!subject || !values.length) return [];
      const last = values[values.length - 1];
      const previous = values.length > 1 ? values[values.length - 2] : undefined;
      const percentage = last === 100 && previous !== undefined ? previous : last;
      const normalized = subject.replace(/\s+/g, " ").trim();
      if (percentage > 100 || seen.has(normalized.toLowerCase())) return [];
      seen.add(normalized.toLowerCase());
      return [{ subject: normalized, percentage }];
    })
    .slice(0, 30);
}

async function readReportImage(file: File): Promise<ReportScore[]> {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(file, "eng");
  return parseReportImageText(result.data.text);
}

function ReportCardPanel() {
  const client = useQueryClient();
  const [activeReport, setActiveReport] =
    useState<LearningCoachReportCard | null>(null);
  const [dismissedReportIds, setDismissedReportIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [scores, setScores] = useState<ReportScore[]>([]);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const reports = useQuery({
    queryKey: ["learning-coach-report-cards"],
    queryFn: learningCoachApi.reportCards,
  });
  const upload = useMutation({
    mutationFn: learningCoachApi.uploadReportCard,
    onSuccess: async (report, file) => {
      client.setQueryData<LearningCoachReportCard[]>(
        ["learning-coach-report-cards"],
        (current = []) => [
          report,
          ...current.filter((item) => item.id !== report.id),
        ],
      );
      void client.invalidateQueries({
        queryKey: ["learning-coach-report-cards"],
      });
      const initialScores =
        report.extractedScores?.length
          ? report.extractedScores
          : [];
      setActiveReport(report);
      setScores(initialScores.length ? initialScores : [{ subject: "", percentage: 0 }]);

      // Browser OCR is a privacy-preserving fallback for image reports when
      // server OCR is unavailable. It never uploads image bytes to an AI API.
      if (!initialScores.length && file.type.startsWith("image/")) {
        setIsReadingImage(true);
        try {
          const detected = await readReportImage(file);
          if (!detected.length) return;
          const enriched = { ...report, extractedScores: detected };
          client.setQueryData<LearningCoachReportCard[]>(
            ["learning-coach-report-cards"],
            (current = []) =>
              current.map((item) => (item.id === report.id ? enriched : item)),
          );
          setActiveReport(enriched);
          setScores(detected);
        } finally {
          setIsReadingImage(false);
        }
      }
    },
  });
  const confirm = useMutation({
    mutationFn: () =>
      learningCoachApi.confirmReportCard(
        activeReport!.id,
        scores.filter((score) => score.subject.trim()),
      ),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["learning-coach-report-cards"],
      });
      void client.invalidateQueries({ queryKey: ["learning-coach-catalog"] });
      setActiveReport(null);
    },
  });
  const selected = activeReport;
  const selectReport = (report: LearningCoachReportCard) => {
    setActiveReport(report);
    setScores(
      report.extractedScores?.length
        ? report.extractedScores
        : [{ subject: "", percentage: 0 }],
    );
  };

  // A learner should never have to hunt for a report they have just uploaded.
  // On a refresh, resume the newest unconfirmed report at its score table.
  useEffect(() => {
    if (activeReport) return;
    const pending = (reports.data ?? []).find(
      (report) =>
        report.status !== "ANALYZED" && !dismissedReportIds.has(report.id),
    );
    if (pending) selectReport(pending);
  }, [activeReport, dismissedReportIds, reports.data]);

  const reportHistory = (reports.data ?? [])
    .filter((report) => report.id !== selected?.id)
    .filter(
      (report, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.fileName === report.fileName &&
            candidate.status === report.status,
        ) === index,
    )
    .slice(0, 3);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607D00]">
            Learning profile
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#101820]">
            Turn results into a practical study plan
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Upload a report card, confirm the subject scores, then receive a
            private focus plan using retrieval practice, worked examples and
            spaced review.
          </p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#101820] px-4 text-sm font-semibold text-[#101820] hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          {upload.isPending || isReadingImage ? "Reading report…" : "Upload report"}
          <input
            className="sr-only"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={upload.isPending || isReadingImage}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {upload.isError ? (
        <p className="mt-3 text-sm text-red-700">
          {apiErrorMessage(
            upload.error,
            "The report card could not be uploaded.",
          )}
        </p>
      ) : null}
      {selected && selected.status !== "ANALYZED" ? (
        <div className="mt-5 rounded-2xl border border-lime-200 bg-lime-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#101820]">
                Confirm your scores
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Please correct any score before saving. This keeps your plan
                accurate even if a scan was hard to read.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissedReportIds((ids) => new Set(ids).add(selected.id));
                setActiveReport(null);
              }}
              className="text-sm font-semibold text-slate-600"
            >
              Not now
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-lime-200 bg-white">
            <div className="grid grid-cols-[1fr_86px_36px] gap-2 border-b border-lime-100 bg-lime-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#466000]">
              <span>Subject</span>
              <span>Score</span>
              <span aria-hidden="true" />
            </div>
            <div className="space-y-2 p-3">
            {scores.map((score, index) => (
              <div key={index} className="grid grid-cols-[1fr_86px_36px] gap-2">
                <input
                  value={score.subject}
                  onChange={(event) =>
                    setScores((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, subject: event.target.value }
                          : row,
                      ),
                    )
                  }
                  placeholder="Subject"
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score.percentage || ""}
                  onChange={(event) =>
                    setScores((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, percentage: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                  placeholder="%"
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
                <button
                  type="button"
                  aria-label="Remove subject"
                  onClick={() =>
                    setScores((rows) =>
                      rows.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                  className="grid place-items-center rounded-xl border border-slate-200 text-slate-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            </div>
          </div>
          {isReadingImage ? (
            <p className="mt-3 text-sm text-slate-600" role="status">
              Reading the uploaded image securely on this device. Your scores
              will appear in the table shortly.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setScores((rows) => [...rows, { subject: "", percentage: 0 }])
            }
            className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#466000]"
          >
            <Plus className="h-4 w-4" />
            Add subject
          </button>
          <button
            type="button"
            disabled={
              confirm.isPending || !scores.some((score) => score.subject.trim())
            }
            onClick={() => confirm.mutate()}
            className="mt-4 min-h-11 w-full rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {confirm.isPending
              ? "Building your plan…"
              : "Create my learning plan"}
          </button>
          {confirm.isError ? (
            <p className="mt-2 text-sm text-red-700">
              {apiErrorMessage(
                confirm.error,
                "Your learning plan could not be created.",
              )}
            </p>
          ) : null}
        </div>
      ) : null}
      {reportHistory.length ? (
        <div className="mt-5 space-y-3">
          {reportHistory.map((report) => (
            <article
              key={report.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-[#101820]">
                  {report.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    selectReport(report);
                  }}
                  className="shrink-0 text-sm font-semibold text-[#466000]"
                >
                  {report.status === "ANALYZED"
                    ? "View plan"
                    : "Confirm scores"}
                </button>
              </div>
              {report.diagnosis?.message ? (
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {report.diagnosis.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  {report.status === "NEEDS_MANUAL_ENTRY"
                    ? "Add your subject scores to build your plan."
                    : "Scores ready for confirmation."}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MasteryBadge({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "bg-emerald-100 text-emerald-800"
      : score >= 40
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {score}% mastery
    </span>
  );
}

function formatReview(date: string | null) {
  if (!date) return "after your first check-in";
  const review = new Date(date);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (review.toDateString() === today.toDateString()) return "today";
  if (review.toDateString() === tomorrow.toDateString()) return "tomorrow";
  return review.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function PlanCard({
  plan,
  onPractice,
}: {
  plan: LearningPlan;
  onPractice: () => void;
}) {
  const totalMinutes = plan.plan.reduce(
    (total, step) => total + step.minutes,
    0,
  );
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607D00]">
            {plan.subject}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#101820]">
            {plan.topic}
          </h2>
        </div>
        <MasteryBadge score={plan.masteryScore} />
      </div>
      {plan.requiresHumanSupport ? (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          This topic still needs support. Ask a teacher or tutor to review it
          with you.
        </div>
      ) : null}
      <p className="mt-4 text-sm leading-6 text-slate-600">
        {plan.recommendedTechnique}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4" /> About {totalMinutes} min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlarmClock className="h-4 w-4" /> Review{" "}
          {formatReview(plan.nextReviewAt)}
        </span>
      </div>
      <button
        type="button"
        onClick={onPractice}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white hover:bg-[#1d2c38]"
      >
        <RotateCcw className="h-4 w-4" /> Continue practice
      </button>
    </article>
  );
}

function TopicPicker({
  topics,
  plans,
  onStart,
  loading,
}: {
  topics: LearningTopic[];
  plans: LearningPlan[];
  onStart: (topic: LearningTopic, mode: "DIAGNOSTIC" | "PRACTICE") => void;
  loading: boolean;
}) {
  const [subject, setSubject] = useState("");
  const subjects = useMemo(
    () => Array.from(new Set(topics.map((topic) => topic.subject))),
    [topics],
  );
  const visible = topics
    .filter((topic) => !subject || topic.subject === subject)
    .sort(
      (left, right) =>
        Number(Boolean(right.isRecommended)) -
          Number(Boolean(left.isRecommended)) ||
        left.subject.localeCompare(right.subject) ||
        left.topic.localeCompare(right.topic),
    );
  const planByTopic = new Map(
    plans.map((plan) => [`${plan.subject}::${plan.topic}`, plan]),
  );
  const duePlan =
    plans.find(
      (plan) => !plan.nextReviewAt || new Date(plan.nextReviewAt) <= new Date(),
    ) ?? plans[0];
  const dueTopic = duePlan
    ? topics.find(
        (topic) =>
          `${topic.subject}::${topic.topic}` ===
          `${duePlan.subject}::${duePlan.topic}`,
      )
    : undefined;
  return (
    <section className="space-y-5">
      <div className="space-y-4">
        <PageHeader title="Learning Coach" />
        {duePlan && dueTopic ? (
          <div className="mt-6 rounded-2xl bg-[#101820] p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
                  Continue your practice
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {duePlan.subject}: {duePlan.topic}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  {duePlan.masteryScore}% mastery · Review{" "}
                  {formatReview(duePlan.nextReviewAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => onStart(dueTopic, "PRACTICE")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 disabled:opacity-60"
              >
                Continue coaching <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSubject("")}
          className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${!subject ? "bg-[#101820] text-white" : "border border-slate-200 bg-white text-slate-600"}`}
        >
          All subjects
        </button>
        {subjects.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSubject(item)}
            className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${subject === item ? "bg-[#101820] text-white" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {!visible.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          There are no approved practice topics for your grade yet. Ask your
          teacher or platform administrator to add curriculum questions.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((topic) => {
            const plan = planByTopic.get(`${topic.subject}::${topic.topic}`);
            return (
              <article
                key={`${topic.subject}-${topic.topic}`}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607D00]">
                      {topic.subject}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#101820]">
                      {topic.topic}
                    </h2>
                  </div>
                  {plan ? (
                    <MasteryBadge score={plan.masteryScore} />
                  ) : topic.isRecommended ? (
                    <span className="rounded-full bg-lime-100 px-2.5 py-1 text-xs font-semibold text-[#466000]">
                      Suggested
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    onStart(topic, plan ? "PRACTICE" : "DIAGNOSTIC")
                  }
                  className="mt-5 min-h-11 w-full rounded-xl border border-[#101820] px-4 text-sm font-semibold text-[#101820] hover:bg-[#101820] hover:text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {plan ? "Resume mastery path" : "Begin diagnostic"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SessionPlayer({
  data,
  onClose,
}: {
  data: LearningSession;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [stage, setStage] = useState<"LESSON" | "PRACTICE">("LESSON");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Awaited<
    ReturnType<typeof learningCoachApi.answer>
  > | null>(null);
  const question = data.questions[index];
  const submit = useMutation({
    mutationFn: () =>
      learningCoachApi.answer(data.session.id, {
        questionId: question.id,
        answer,
      }),
    onSuccess: (result) => {
      setFeedback(result);
      if (result.completed)
        void client.invalidateQueries({ queryKey: ["learning-coach-plans"] });
    },
  });
  const next = () => {
    if (feedback?.completed) {
      onClose();
      return;
    }
    setIndex((current) => current + 1);
    setAnswer("");
    setFeedback(null);
  };
  const options = Array.isArray(question.options) ? question.options : [];
  const speakLesson = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(
        `${data.lesson.objective}. Worked example. ${data.lesson.workedExample}. Model answer. ${data.lesson.modelAnswer}. ${data.lesson.explanation}`,
      ),
    );
  };
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#101820]"
      >
        <ChevronLeft className="h-4 w-4" /> Back to topics
      </button>
      <header className="rounded-2xl bg-[#101820] p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              {data.plan.subject} ·{" "}
              {data.session.mode === "DIAGNOSTIC"
                ? "Diagnostic check-in"
                : "Mastery practice"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{data.plan.topic}</h1>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
            {stage === "LESSON"
              ? "1 of 4"
              : `2 of 4 · ${index + 1}/${data.session.total}`}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
          <span className="rounded-md bg-white/15 py-1 text-white">Learn</span>
          <span
            className={
              stage === "PRACTICE"
                ? "rounded-md bg-white/15 py-1 text-white"
                : "py-1"
            }
          >
            Practice
          </span>
          <span className="py-1">Recall</span>
          <span className="py-1">Review</span>
        </div>
      </header>
      {stage === "LESSON" ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#607D00]">
                Step 1 · Learn with an example
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#101820]">
                Understand the idea before testing it.
              </h2>
            </div>
            <button
              type="button"
              onClick={speakLesson}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-[#101820] hover:bg-slate-50"
            >
              <Volume2 className="h-4 w-4" /> Listen
            </button>
          </div>
          <p className="mt-4 rounded-xl bg-lime-50 p-4 text-sm leading-6 text-[#375000]">
            {data.lesson.objective}
          </p>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Worked example
            </p>
            <p className="mt-3 text-base font-semibold leading-7 text-[#101820]">
              {data.lesson.workedExample}
            </p>
            {data.lesson.diagramUrl ? (
              <img
                src={data.lesson.diagramUrl}
                alt={data.lesson.diagramAlt ?? ""}
                className="mt-4 max-h-72 w-full rounded-xl object-contain"
              />
            ) : null}
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                Model answer
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
                {data.lesson.modelAnswer}
              </p>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Why this works
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {data.lesson.explanation}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm leading-6 text-sky-950">
              <strong>Say it back:</strong> {data.lesson.reflectionPrompt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStage("PRACTICE")}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white"
          >
            I understand the example <ArrowRight className="h-4 w-4" />
          </button>
        </article>
      ) : (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            Step 2 · Question {index + 1} of {data.session.total} · Try before
            using notes
          </p>
          <h2 className="mt-3 text-lg font-semibold leading-8 text-[#101820] sm:text-xl">
            {question.questionText}
          </h2>
          {question.diagramUrl ? (
            <img
              src={question.diagramUrl}
              alt={question.diagramAlt ?? ""}
              className="mt-5 max-h-80 w-full rounded-xl object-contain"
            />
          ) : null}
          {options.length ? (
            <div className="mt-6 grid gap-3">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() => setAnswer(option)}
                  className={`min-h-12 rounded-xl border px-4 text-left text-sm font-medium transition ${answer === option ? "border-slate-500 bg-slate-100 text-[#101820]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={answer}
              disabled={Boolean(feedback)}
              onChange={(event) => setAnswer(event.target.value)}
              className="mt-6 min-h-28 w-full rounded-xl border border-slate-300 p-4 text-base text-[#101820] outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              placeholder="Write your answer here"
            />
          )}
          {question.hint && !feedback ? (
            <p className="mt-4 flex gap-2 text-sm leading-6 text-slate-500">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#739400]" />{" "}
              {question.hint}
            </p>
          ) : null}
          {feedback ? (
            <div
              className={`mt-6 rounded-xl border p-4 ${feedback.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            >
              <p className="inline-flex items-center gap-2 font-semibold text-[#101820]">
                {feedback.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                )}
                {feedback.isCorrect
                  ? "Correct. Strengthen the explanation."
                  : "A useful correction."}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {feedback.feedback}
              </p>
              {feedback.completed && feedback.score !== undefined ? (
                <p className="mt-3 font-semibold text-[#101820]">
                  Today’s check-in: {feedback.score}%. Your personalised next
                  step is ready.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!answer.trim() || submit.isPending || Boolean(feedback)}
              onClick={() => submit.mutate()}
              className="min-h-12 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submit.isPending ? "Checking..." : "Check my answer"}
            </button>
            {feedback ? (
              <button
                type="button"
                onClick={next}
                className="min-h-12 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white"
              >
                {feedback.completed ? "View my plan" : "Next question"}
              </button>
            ) : null}
          </div>
          {submit.isError ? (
            <p className="mt-3 text-sm text-red-700">
              {apiErrorMessage(
                submit.error,
                "Your answer could not be checked.",
              )}
            </p>
          ) : null}
        </article>
      )}
    </section>
  );
}

export function LearningCoachPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const scope = useStudentContentScope();
  const [session, setSession] = useState<LearningSession | null>(null);
  const catalog = useQuery({
    queryKey: ["learning-coach-catalog"],
    queryFn: learningCoachApi.catalog,
  });
  const plans = useQuery({
    queryKey: ["learning-coach-plans"],
    queryFn: learningCoachApi.plans,
  });
  const reports = useQuery({ queryKey: ["learning-coach-report-cards"], queryFn: learningCoachApi.reportCards });
  const start = useMutation({
    mutationFn: (input: {
      subject: string;
      topic: string;
      mode: "DIAGNOSTIC" | "PRACTICE";
    }) => learningCoachApi.start(input),
    onSuccess: setSession,
  });
  const generatePlan = useMutation({ mutationFn: () => timetableApi.generate(false), onSuccess: () => navigate("/student/study-hub/timetable") });
  if (!isCbcGrade(user?.grade))
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-950">
        <PageHeader title="Learning Coach" />
        <p className="mt-4">
          Learning Coach is designed for CBC learners from PP1 to Grade 12.
        </p>
      </div>
    );
  if (session)
    return <SessionPlayer data={session} onClose={() => setSession(null)} />;
  if (catalog.isLoading || plans.isLoading || reports.isLoading)
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  const report = reports.data?.find((item) => item.status === "ANALYZED");
  const profile = report?.diagnosis?.colorCodes ?? [];
  const allowed = new Set((scope.data?.assignment_subjects ?? scope.data?.subjects ?? []).map((subject) => subject.toLowerCase()));
  const red = new Set(profile.filter((item) => item.color === "RED").map((item) => item.subject.toLowerCase()));
  const paths = (plans.data ?? []).filter((plan) => red.has(plan.subject.toLowerCase()) && (!allowed.size || allowed.has(plan.subject.toLowerCase())));
  if (!report) return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title="Learning Coach" /><div className="rounded-3xl border border-dashed border-lime-300 bg-lime-50 p-8 text-center"><BrainCircuit className="mx-auto h-10 w-10 text-[#607D00]"/><h2 className="mt-4 text-2xl font-semibold text-[#101820]">Unlock your personalized Learning Coach</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Upload your end-term report card to get a color-coded diagnosis, custom study techniques, and a priority study plan.</p></div><ReportCardPanel /></div>;
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <PageHeader title="Learning Coach" />
      <section className="rounded-3xl bg-[#101820] p-6 text-white sm:p-8"><div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#b5e719] text-[#101820]"><BrainCircuit className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-200">Socratic diagnosis</p><p className="mt-3 max-w-4xl text-lg leading-8">{report.diagnosis?.message}</p></div></div></section>
      <section><h2 className="text-xl font-semibold text-[#101820]">Your subject profile</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{profile.filter((item) => !allowed.size || allowed.has(item.subject.toLowerCase())).map((item) => { const priority = item.color === "RED"; const tone = item.color === "GREEN" ? "border-emerald-200 bg-emerald-50" : item.color === "YELLOW" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"; return <article key={item.subject} className={`rounded-2xl border p-4 ${tone}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.subject}</p><p className="mt-3 text-3xl font-semibold text-[#101820]">{item.percentage}%</p><p className="mt-1 text-sm text-slate-600">{priority ? "Needs focused support" : item.color === "GREEN" ? "A current strength" : "Building consistency"}</p>{priority ? <span className="mt-3 inline-flex rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">Priority focus</span> : null}</article>; })}</div></section>
      <section><div className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-[#607D00]"/><h2 className="text-xl font-semibold text-[#101820]">Mastery paths</h2></div>{paths.length ? <div className="mt-3 grid gap-4 md:grid-cols-2">{paths.map((plan) => <PlanCard key={plan.id} plan={plan} onPractice={() => start.mutate({ subject: plan.subject, topic: plan.topic, mode: "PRACTICE" })} />)}</div> : <TopicPicker topics={(catalog.data ?? []).filter((topic) => red.has(topic.subject.toLowerCase()) && (!allowed.size || allowed.has(topic.subject.toLowerCase())))} plans={[]} loading={start.isPending} onStart={({ subject, topic }, mode) => start.mutate({ subject, topic, mode })} />}</section>
      <section><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#607D00]"/><h2 className="text-xl font-semibold text-[#101820]">How you should study this week</h2></div><div className="mt-3 grid gap-3 md:grid-cols-2">{profile.filter((item) => item.color === "RED" && (!allowed.size || allowed.has(item.subject.toLowerCase()))).map((item) => <article key={item.subject} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex gap-3"><BrainCircuit className="h-6 w-6 shrink-0 text-[#607D00]"/><div><p className="text-xs font-bold uppercase tracking-wide text-[#607D00]">{item.subject}</p><h3 className="mt-1 font-semibold text-[#101820]">{report.diagnosis?.learningTechniques?.[item.subject] ?? "Active recall and error correction"}</h3></div></div><p className="mt-4 text-sm leading-6 text-slate-600">Why: your latest confirmed score is {item.percentage}%, so short repeat practice will help more than rereading notes.</p><p className="mt-2 text-sm font-medium text-[#101820]">Action: explain a worked example aloud, answer without notes, then correct one mistake.</p></article>)}</div></section>
      <button type="button" disabled={generatePlan.isPending} onClick={() => generatePlan.mutate()} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#b5e719] px-6 text-base font-bold text-[#101820] disabled:opacity-60">{generatePlan.isPending ? "Preparing your adaptive plan…" : "Generate my adaptive study plan"}<ArrowRight className="h-5 w-5"/></button>
      {start.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {apiErrorMessage(
            start.error,
            "Learning Coach could not start this topic.",
          )}
        </p>
      ) : null}
    </div>
  );
}
