import { PageHeader } from "../../components/ui/Saas";
import { useEffect, useMemo, useRef, useState } from "react";
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
  BrainCircuit,
  Sparkles,
  BookOpenCheck,
  Pause,
  Play,
  TimerReset,
  X,
  Target,
} from "lucide-react";
import { apiErrorMessage } from "../../api/axios";
import {
  learningCoachApi,
  type LearningPlan,
  type LearningCoachReportCard,
  type LearningSession,
  type LearningTopic,
} from "../../api/learning-coach.api";
import { ReportCardPreview, type ReportScore } from "./ReportCardPreview";
import { useAuthStore } from "../../store/auth.store";
import { isCbcGrade } from "../../utils/gradeTier";
import { useStudentContentScope } from "../../hooks/useStudentContentScope";
import { timetableApi } from "../../api/timetable.api";
import { useNavigate } from "react-router-dom";

const REPORT_SUBJECTS = [
  "English",
  "Kiswahili",
  "Mathematics",
  "Integrated Science",
  "Biology",
  "Chemistry",
  "Physics",
  "Computer Studies",
  "Community Service Learning",
  "Social Studies",
  "Religious Education",
  "Christian Religious Education",
  "Islamic Religious Education",
  "Agriculture",
  "Business Studies",
  "Geography",
  "History",
  "Home Science",
  "Pre-Technical Studies",
  "Life Skills",
  "Art and Craft",
  "Music",
  "French",
  "German",
] as const;

function normaliseReportText(value: string) {
  return value.toUpperCase().replace(/[^A-Z]/g, "");
}

function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[right.length];
}

// Report photos frequently turn characters such as I/l or swap two letters.
// Only map text to an approved learning area; never use headers, phone numbers,
// or free-form OCR text as a subject.
function resolveReportSubject(line: string) {
  const candidate = normaliseReportText(line);
  if (candidate.length < 4) return null;

  let best: { subject: string; distance: number } | null = null;
  for (const subject of REPORT_SUBJECTS) {
    const expected = normaliseReportText(subject);
    const distance = editDistance(candidate, expected);
    const isPrefix =
      candidate.startsWith(expected.slice(0, Math.max(5, expected.length - 4))) ||
      expected.startsWith(candidate.slice(0, Math.max(5, candidate.length - 4)));
    if (
      (isPrefix || distance <= Math.max(2, Math.floor(expected.length * 0.2))) &&
      (!best || distance < best.distance)
    ) {
      best = { subject, distance };
    }
  }
  return best?.subject ?? null;
}

async function cropReportTable(
  file: File,
  crop: { left: number; top: number; width: number; height: number },
) {
  const image = await createImageBitmap(file);
  try {
    const sourceWidth = Math.max(1, Math.round(image.width * crop.width));
    const sourceHeight = Math.max(1, Math.round(image.height * crop.height));
    const canvas = document.createElement("canvas");
    // Enlarging a small table region gives OCR a much clearer character edge.
    canvas.width = Math.min(2400, Math.max(640, sourceWidth * 5));
    canvas.height = Math.min(1800, Math.max(420, sourceHeight * 5));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the report image.");
    context.filter = "grayscale(1) contrast(1.45)";
    context.drawImage(
      image,
      Math.round(image.width * crop.left),
      Math.round(image.height * crop.top),
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not read the report image."))),
        "image/png",
      ),
    );
  } finally {
    image.close();
  }
}

function parseTableScores(subjectText: string, scoreText: string): ReportScore[] {
  const subjects = subjectText
    .split(/\r?\n/)
    .map(resolveReportSubject)
    .filter((subject): subject is string => Boolean(subject))
    .filter((subject, index, all) => all.indexOf(subject) === index);
  const percentages = [...scoreText.matchAll(/\b(\d{1,3})\s*%/g)]
    .map((match) => Number(match[1]))
    .filter((score) => score >= 0 && score <= 100);

  return subjects
    .map((subject, index) => ({ subject, percentage: percentages[index] }))
    .filter((score): score is ReportScore => Number.isFinite(score.percentage));
}

async function readReportImage(file: File): Promise<ReportScore[]> {
  const tesseract = await import("tesseract.js");
  // These percentages cover the assessment table on the common Kenyan report
  // card layout. Reading separate columns prevents marks, rubrics and remarks
  // from being mixed into subject names.
  const [subjectsImage, scoresImage] = await Promise.all([
    cropReportTable(file, { left: 0, top: 0.4, width: 0.31, height: 0.17 }),
    cropReportTable(file, { left: 0.285, top: 0.425, width: 0.14, height: 0.13 }),
  ]);
  const [subjectsResult, scoresResult] = await Promise.all([
    tesseract.default.recognize(subjectsImage, "eng"),
    tesseract.default.recognize(scoresImage, "eng"),
  ]);
  return parseTableScores(subjectsResult.data.text, scoresResult.data.text);
}

function ReportCardPanel({
  initialReport,
  onAnalyzed,
}: {
  initialReport?: LearningCoachReportCard;
  onAnalyzed?: () => void;
}) {
  const client = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [activeReport, setActiveReport] =
    useState<LearningCoachReportCard | null>(initialReport ?? null);
  const [dismissedReportIds, setDismissedReportIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [scores, setScores] = useState<ReportScore[]>(
    () => initialReport?.extractedScores ?? [],
  );
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
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
      setScores(initialScores.length ? initialScores : [{ subject: "", percentage: Number.NaN }]);
      setLocalPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);

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
        scores.filter(
          (score) =>
            score.subject.trim() &&
            Number.isFinite(score.percentage) &&
            score.percentage >= 0 &&
            score.percentage <= 100,
        ),
      ),
    onSuccess: (data) => {
      if (activeReport) {
        const analyzed = {
          ...activeReport,
          status: "ANALYZED" as const,
          extractedScores: scores.filter(
            (score) =>
              score.subject.trim() &&
              Number.isFinite(score.percentage) &&
              score.percentage >= 0 &&
              score.percentage <= 100,
          ),
          diagnosis: data.diagnosis,
        };
        client.setQueryData<LearningCoachReportCard[]>(
          ["learning-coach-report-cards"],
          (current = []) =>
            current.map((report) =>
              report.id === analyzed.id ? analyzed : report,
            ),
        );
      }
      void client.invalidateQueries({
        queryKey: ["learning-coach-report-cards"],
      });
      void client.invalidateQueries({ queryKey: ["learning-coach-catalog"] });
      setActiveReport(null);
      setLocalPreviewUrl(null);
      onAnalyzed?.();
    },
  });
  const preview = useQuery({
    queryKey: ["learning-coach-report-preview", activeReport?.id],
    queryFn: () => learningCoachApi.reportCardPreview(activeReport!.id),
    enabled: Boolean(activeReport?.id) && !localPreviewUrl,
    staleTime: 4 * 60 * 1000,
  });
  const selected = activeReport;
  const selectReport = (report: LearningCoachReportCard) => {
    setActiveReport(report);
    setScores(
      report.extractedScores?.length
        ? report.extractedScores
        : [{ subject: "", percentage: Number.NaN }],
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

  useEffect(() => {
    if (!upload.isPending && !isReadingImage && !confirm.isPending) {
      setProgress(0);
      return;
    }
    setProgress(12);
    const steps = [28, 47, 69, 84, 96];
    let index = 0;
    const timer = window.setInterval(() => {
      setProgress(steps[index] ?? 96);
      index += 1;
    }, 650);
    return () => window.clearInterval(timer);
  }, [upload.isPending, isReadingImage, confirm.isPending]);

  useEffect(
    () => () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    },
    [localPreviewUrl],
  );

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
  const processing = upload.isPending || isReadingImage || confirm.isPending;
  const chooseFile = () => fileInput.current?.click();
  const discardActiveReport = () => {
    setDismissedReportIds((ids) => new Set(ids).add(activeReport?.id ?? -1));
    setActiveReport(null);
    setScores([]);
    setLocalPreviewUrl(null);
  };
  return (
    <>
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        disabled={processing}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload.mutate(file);
          event.currentTarget.value = "";
        }}
      />
      {processing ? <div className="fixed inset-0 z-50 grid place-items-center bg-[#0b1727]/80 p-5 backdrop-blur-sm"><section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#101f38] p-7 text-center text-white shadow-2xl"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime-300 text-[#101f38]"><BrainCircuit className="h-7 w-7 animate-pulse" /></span><h2 className="mt-5 text-2xl font-semibold">{confirm.isPending ? "Analyzing your strengths and weaknesses…" : "Reading your report card…"}</h2><p className="mt-3 text-sm leading-6 text-slate-300">{confirm.isPending ? "Creating your color-coded focus profile and study actions." : "Extracting subjects, scores, and KCBE grades…"}</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-lime-300 transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs font-semibold text-lime-200">{confirm.isPending ? "Generating your personalized learning plan…" : `${progress}% complete`}</p></section></div> : null}
      {!selected ? <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
        <button type="button" onClick={chooseFile} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#101820] px-4 text-sm font-semibold text-[#101820] hover:bg-slate-50"><Upload className="h-4 w-4" />Upload report</button>
      </div>
      {upload.isError ? (
        <p className="mt-3 text-sm text-red-700">
          {apiErrorMessage(
            upload.error,
            "The report card could not be uploaded.",
          )}
        </p>
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
      </section> : null}
      {selected ? <><ReportCardPreview fileName={selected.fileName} previewUrl={localPreviewUrl ?? preview.data} scores={scores} onChange={setScores} onReupload={() => { discardActiveReport(); window.setTimeout(chooseFile, 50); }} onConfirm={() => confirm.mutate()} confirming={confirm.isPending} />{preview.isError ? <p className="text-sm text-slate-500">The report preview is unavailable, but you can still review and correct the extracted scores.</p> : null}{confirm.isError ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{apiErrorMessage(confirm.error, "Your learning plan could not be created.")}</p> : null}</> : null}
    </>
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

function reportLevel(percentage: number) {
  if (percentage >= 70) return "EE · Strength";
  if (percentage >= 40) return "ME · Developing";
  return "BE · Priority";
}

function FocusTimer({ subject, topic, onClose }: { subject: string; topic: string; onClose: () => void }) {
  const [seconds, setSeconds] = useState(15 * 60);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  return <aside className="sticky bottom-3 z-20 rounded-2xl border border-[#293944] bg-[#101820] p-4 text-white shadow-[0_18px_44px_rgba(16,24,32,.28)] sm:flex sm:items-center sm:justify-between">
    <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b5e719] text-[#101820]"><Target className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.13em] text-lime-200">Focus session</p><p className="text-sm font-semibold">{subject}: {topic}</p></div></div>
    <div className="mt-4 flex items-center gap-2 sm:mt-0"><span className="mr-auto font-mono text-2xl font-semibold tabular-nums">{minutes}:{remainder}</span><button type="button" onClick={() => setRunning((value) => !value)} className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[#101820]" aria-label={running ? "Pause timer" : "Resume timer"}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button><button type="button" onClick={() => { setSeconds(15 * 60); setRunning(false); }} className="grid h-10 w-10 place-items-center rounded-lg border border-white/20" aria-label="Reset timer"><TimerReset className="h-4 w-4" /></button><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg border border-white/20" aria-label="Close timer"><X className="h-4 w-4" /></button></div>
  </aside>;
}

function PlanCard({
  plan,
  onPractice,
  onFocus,
  diagnosticReady,
}: {
  plan: LearningPlan;
  onPractice: () => void;
  onFocus: () => void;
  diagnosticReady: boolean;
}) {
  const totalMinutes = plan.plan.reduce(
    (total, step) => total + step.minutes,
    0,
  );
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(16,24,32,.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607D00]">
            {plan.subject}
          </p>
          <h2 className="mt-1 text-base font-semibold text-[#101820]">{plan.topic}</h2>
        </div>
        <MasteryBadge score={plan.masteryScore} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{plan.recommendedTechnique}</p>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-4 w-4" /> About {totalMinutes} min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlarmClock className="h-4 w-4" /> Review{" "}
          {formatReview(plan.nextReviewAt)}
        </span>
      </div>
      <button type="button" onClick={diagnosticReady ? onPractice : onFocus} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white hover:bg-[#1d2c38]">
        {diagnosticReady ? <><RotateCcw className="h-4 w-4" /> Start diagnostic</> : <><Play className="h-4 w-4" /> Start 15-min session</>}
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
      {duePlan && dueTopic ? (
          <div className="rounded-2xl bg-[#101820] p-5 text-white">
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
  const [reviewReport, setReviewReport] = useState(false);
  const [focusTimer, setFocusTimer] = useState<{ subject: string; topic: string } | null>(null);
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
  const prioritySubjects = profile.filter((item) => item.color === "RED").sort((left, right) => left.percentage - right.percentage);
  const diagnosticTopics = new Set((catalog.data ?? []).map((topic) => `${topic.subject.toLowerCase()}::${topic.topic.toLowerCase()}`));
  const startPriority = (plan: LearningPlan) => {
    const isReady = diagnosticTopics.has(`${plan.subject.toLowerCase()}::${plan.topic.toLowerCase()}`);
    if (isReady) start.mutate({ subject: plan.subject, topic: plan.topic, mode: "DIAGNOSTIC" });
    else setFocusTimer({ subject: plan.subject, topic: plan.topic });
  };
  if (!report || reviewReport) return <div className="mx-auto max-w-5xl space-y-6"><PageHeader title="Learning Coach" />{report ? <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-lime-200 bg-lime-50 p-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">Report check</p><h2 className="mt-1 text-xl font-semibold text-[#101820]">Correct your results before continuing</h2><p className="mt-1 text-sm text-slate-600">Review each subject and score. Your updated confirmation replaces the earlier diagnosis.</p></div><button type="button" onClick={() => setReviewReport(false)} className="min-h-10 rounded-xl border border-[#101820] bg-white px-4 text-sm font-bold text-[#101820]">Back to Coach</button></div> : <div className="rounded-3xl border border-dashed border-lime-300 bg-lime-50 p-8 text-center"><BrainCircuit className="mx-auto h-10 w-10 text-[#607D00]"/><h2 className="mt-4 text-2xl font-semibold text-[#101820]">Unlock your personalized Learning Coach</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Upload a report card, confirm the scores, then receive a private study plan built around your real results.</p></div>}<ReportCardPanel initialReport={reviewReport ? report : undefined} onAnalyzed={() => setReviewReport(false)} /></div>;
  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-24">
      <PageHeader title="Learning Coach" />
      <section className="overflow-hidden rounded-3xl bg-[#101820] text-white shadow-[0_18px_48px_rgba(16,24,32,.16)]"><div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_270px]"><div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b5e719] text-[#101820]"><Target className="h-5 w-5" /></span><p className="text-xs font-bold uppercase tracking-[.15em] text-lime-200">Academic briefing</p></div><h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">Your KCBE Recovery Plan.</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">{report.diagnosis?.message}</p><button type="button" onClick={() => paths[0] && startPriority(paths[0])} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#b5e719] px-4 text-sm font-bold text-[#101820]">Start {paths[0]?.subject ?? "recovery"} Recovery <ArrowRight className="h-4 w-4" /></button></div><aside className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">This week&apos;s focus</p><div className="mt-3 space-y-3">{prioritySubjects.slice(0, 3).map((item) => <div key={item.subject} className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_0_4px_rgba(251,113,133,.12)]"/><div><p className="text-sm font-bold">{item.subject}</p><p className="text-xs text-slate-300">{item.percentage}% · rebuild foundations</p></div></div>)}</div></aside></div></section>
      <section><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Confirmed results</p><h2 className="mt-1 text-xl font-semibold text-[#101820]">Your learning profile</h2></div><button type="button" onClick={() => setReviewReport(true)} className="text-sm font-semibold text-[#466000]">Review report</button></div><div className="mt-4 flex gap-3 overflow-x-auto pb-2">{profile.map((item) => { const priority = item.color === "RED"; const tone = item.color === "GREEN" ? "border-emerald-200 bg-emerald-50" : item.color === "YELLOW" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"; return <article key={item.subject} className={`min-w-[168px] flex-1 rounded-2xl border p-4 ${tone}`}><p className="text-xs font-bold uppercase tracking-[.11em] text-slate-600">{item.subject}</p><p className="mt-4 text-3xl font-semibold tracking-tight text-[#101820]">{item.percentage}%</p><p className="mt-1 text-xs font-semibold text-slate-600">{priority ? "Priority focus" : reportLevel(item.percentage)}</p></article>; })}</div></section>
      <section><div className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-[#607D00]"/><div><h2 className="text-xl font-semibold text-[#101820]">Mastery paths</h2><p className="text-sm text-slate-500">One focused topic at a time. Your next diagnostic unlocks when a question pack is ready.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{paths.map((plan) => <PlanCard key={plan.id} plan={plan} diagnosticReady={diagnosticTopics.has(`${plan.subject.toLowerCase()}::${plan.topic.toLowerCase()}`)} onPractice={() => start.mutate({ subject: plan.subject, topic: plan.topic, mode: "DIAGNOSTIC" })} onFocus={() => setFocusTimer({ subject: plan.subject, topic: plan.topic })} />)}</div></section>
      <section><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#607D00]"/><div><h2 className="text-xl font-semibold text-[#101820]">Targeted Study Techniques</h2><p className="text-sm text-slate-500">Short, subject-specific methods designed to rebuild recall and confidence.</p></div></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{prioritySubjects.map((item) => { const path = paths.find((plan) => plan.subject.toLowerCase() === item.subject.toLowerCase()); return <article key={item.subject} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.13em] text-[#607D00]">{item.subject}{path ? ` · ${path.topic}` : ""}</p><p className="mt-3 text-sm font-semibold leading-6 text-[#101820]">{path?.recommendedTechnique ?? report.diagnosis?.learningTechniques?.[item.subject]}</p><button type="button" onClick={() => setFocusTimer({ subject: item.subject, topic: path?.topic ?? "recovery" })} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#101820]"><Play className="h-4 w-4 text-[#607D00]" />Start 15-min session</button></article>; })}</div></section>
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#607D00]">Adaptive timetable</p><h2 className="mt-1 text-lg font-semibold text-[#101820]">Turn recovery into a weekly routine</h2><p className="mt-1 text-sm text-slate-600">Focus subjects receive more time, with spaced review built in.</p></div><button type="button" disabled={generatePlan.isPending} onClick={() => generatePlan.mutate()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#b5e719] px-5 text-sm font-bold text-[#101820] disabled:opacity-60">{generatePlan.isPending ? "Preparing plan…" : "Generate study plan"}<ArrowRight className="h-4 w-4"/></button></section>
      {focusTimer ? <FocusTimer {...focusTimer} onClose={() => setFocusTimer(null)} /> : null}
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
