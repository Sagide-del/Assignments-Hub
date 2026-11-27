import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Volume2,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage } from "../../../api/axios";
import { learningCoachApi } from "../../../api/learning-coach.api";
import { useAuthStore } from "../../../store/auth.store";
import { VisualizationRouter } from "./VisualizationRouter";

export function GuidedLessonPage({
  subject: embeddedSubject,
  topic: embeddedTopic,
  onBack,
  onPractice,
}: {
  subject?: string;
  topic?: string;
  onBack?: () => void;
  onPractice?: () => Promise<void>;
} = {}) {
  const params = useParams(),
    userId = useAuthStore((s) => s.user?.id),
    qc = useQueryClient();
  const subject = embeddedSubject ?? params.subject ?? "",
    topic = embeddedTopic ?? params.topic ?? "";
  const [stepIndex, setStepIndex] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [answers, setAnswers] = useState<Record<number, string>>({}),
    [done, setDone] = useState(false),
    [practiceError, setPracticeError] = useState(""),
    [starting, setStarting] = useState(false),
    [voiceError, setVoiceError] = useState("");
  const chosenRef = useRef<Record<number, string>>({});
  const lesson = useQuery({
    queryKey: ["guided-lesson", userId, subject, topic],
    queryFn: () => learningCoachApi.openLesson(subject, topic),
    enabled: Boolean(subject && topic),
    retry: false,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });
  const complete = useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: string[] }) =>
      learningCoachApi.completeLesson(id, answers),
    onSuccess: () => {
      setDone(true);
      void qc.invalidateQueries({ queryKey: ["learning-coach-guided-topics"] });
      void qc.invalidateQueries({ queryKey: ["learning-recovery"] });
      void qc.invalidateQueries({ queryKey: ["engagement-report"] });
    },
  });
  const steps = lesson.data?.script ?? [],
    step = steps[stepIndex];
  useEffect(() => {
    setStepIndex(0);
    setSelected(null);
    setAnswers({});
    chosenRef.current = {};
    setDone(false);
    setVoiceError("");
  }, [subject, topic]);
  useEffect(() => {
    window.speechSynthesis?.cancel();
    return () => window.speechSynthesis?.cancel();
  }, [stepIndex, subject, topic, done]);
  const back = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"
    >
      <ArrowLeft size={16} /> Learning Coach
    </button>
  ) : (
    <Link
      to="/student/learning-coach"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
    >
      <ArrowLeft size={16} /> Learning Coach
    </Link>
  );
  if (lesson.isPending)
    return (
      <main className="mx-auto max-w-5xl space-y-5">
        {back}
        <p role="status" className="rounded-2xl bg-white p-8">
          Preparing your guided lesson…
        </p>
      </main>
    );
  if (lesson.isError || !lesson.data || !step)
    return (
      <main className="mx-auto max-w-3xl space-y-4">
        {back}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold">This lesson couldn’t open</h1>
          <p role="alert" className="mt-2 text-sm">
            {apiErrorMessage(
              lesson.error,
              "Please retry or return to your recovery resources.",
            )}
          </p>
          <button
            type="button"
            onClick={() => void lesson.refetch()}
            className="mt-4 min-h-11 rounded-lg bg-[#143e32] px-4 text-sm font-semibold text-white"
          >
            Retry lesson
          </button>
        </section>
      </main>
    );
  const questions = steps.filter((s) => s.type === "QUESTION");
  const questionNumber =
    steps.slice(0, stepIndex + 1).filter((s) => s.type === "QUESTION").length -
    1;
  const isQuestion = step.type === "QUESTION",
    correct = !isQuestion || selected === step.correctAnswer;
  const finish = () =>
    complete.mutate({
      id: lesson.data.id,
      answers: questions.map((_, i) => answers[i]),
    });
  const choose = (answer: string) => {
    if (selected !== null) return;
    if (!(questionNumber in chosenRef.current)) {
      chosenRef.current[questionNumber] = answer;
      setAnswers({ ...chosenRef.current });
    }
    setSelected(answer);
  };
  const next = () => {
    if (stepIndex === steps.length - 1) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
    setSelected(null);
  };
  const speak = () => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setVoiceError(
        "Audio is unavailable in this browser. The full explanation is shown below.",
      );
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(step.voiceoverText);
    u.rate = 0.92;
    u.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted")
        setVoiceError("Audio could not play. You can continue using the text.");
    };
    window.speechSynthesis.speak(u);
  };
  if (done)
    return (
      <main className="mx-auto max-w-3xl space-y-4 pb-12">
        {back}
        <section className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8">
          <CheckCircle2 className="text-emerald-600" size={36} />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-700">
            Lesson completed
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{topic}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {
              Object.values(answers).filter(
                (a, i) => a === questions[i]?.correctAnswer,
              ).length
            }{" "}
            of {questions.length} checks correct on the first try. Retrying
            helps you learn; reviewed practice measures your progress.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {onPractice ? (
              <button
                type="button"
                disabled={starting}
                onClick={async () => {
                  setStarting(true);
                  setPracticeError("");
                  try {
                    await onPractice();
                  } catch (e) {
                    setPracticeError(
                      apiErrorMessage(
                        e,
                        "Practice could not start. Your lesson is saved; please retry.",
                      ),
                    );
                  } finally {
                    setStarting(false);
                  }
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-semibold"
              >
                {starting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}
                Practise this topic
              </button>
            ) : null}
            {back}
          </div>
          {!onPractice ? (
            <p className="mt-3 text-sm text-slate-500">
              Return to your Coach for the next study resource or available
              practice.
            </p>
          ) : null}
          {practiceError ? (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {practiceError}
            </p>
          ) : null}
        </section>
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl space-y-4 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-2">
        {back}
        <span className="text-sm text-slate-500">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={stepIndex + 1}
          className="h-1.5 bg-slate-100"
        >
          <div
            className="h-full bg-lime-400"
            style={{ width: `${(100 * (stepIndex + 1)) / steps.length}%` }}
          />
        </div>
        <div className="grid lg:grid-cols-2">
          <section className="bg-[#101820] p-6 text-white sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-lime-300">
              Guided lesson · {subject}
            </p>
            <h1 className="mt-3 text-2xl font-semibold">{topic}</h1>
            <p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-100">
              {step.text}
            </p>
            <button
              type="button"
              onClick={speak}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold"
            >
              <Volume2 size={16} />
              Play voiceover
            </button>
            {voiceError ? (
              <p role="status" className="mt-3 text-sm text-slate-300">
                {voiceError}
              </p>
            ) : null}
          </section>
          <section className="min-w-0 p-5 sm:p-8">
            <VisualizationRouter
              type={lesson.data.visualizationType}
              state={step.visualizationState}
              data={lesson.data.visualizationData}
            />
            {isQuestion ? (
              <div className="mt-6">
                <h2 className="text-sm font-semibold">
                  Check your understanding
                </h2>
                <div className="mt-3 grid gap-3">
                  {step.questionOptions?.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={selected !== null}
                      onClick={() => choose(option)}
                      className={`min-h-11 rounded-xl border p-4 text-left text-sm font-medium disabled:opacity-100 ${selected === option ? (correct ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "border-rose-400 bg-rose-50 text-rose-900") : "border-slate-200 hover:bg-slate-50"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {selected !== null ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-4 text-sm"
                  >
                    {correct ? (
                      <p className="text-emerald-700">
                        Correct. Explain how you reached your answer.
                      </p>
                    ) : (
                      <>
                        <p className="text-rose-700">
                          Not quite. Revisit the explanation and try again.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="mt-2 min-h-11 font-semibold underline"
                        >
                          Try this question again
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={(isQuestion && !correct) || complete.isPending}
                onClick={next}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-400 px-5 text-sm font-semibold disabled:opacity-40"
              >
                {complete.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {stepIndex === steps.length - 1
                  ? "Complete lesson"
                  : "Continue"}
                <ArrowRight size={16} />
              </button>
            </div>
            {complete.isError ? (
              <p role="alert" className="mt-4 text-sm text-rose-700">
                {apiErrorMessage(
                  complete.error,
                  "Completion was not saved. Please try again; your answers are still here.",
                )}
              </p>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
