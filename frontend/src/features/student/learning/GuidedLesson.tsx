import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Headphones, Loader2, Volume2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiErrorMessage } from "../../../api/axios";
import { learningCoachApi } from "../../../api/learning-coach.api";
import { VisualizationRouter } from "./VisualizationRouter";

function speak(text: string) {
  window.speechSynthesis?.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  window.speechSynthesis?.speak(utterance);
}

export function GuidedLessonPage({
  subject: embeddedSubject,
  topic: embeddedTopic,
  onBack,
}: {
  subject?: string;
  topic?: string;
  onBack?: () => void;
} = {}) {
  const params = useParams();
  const subject = embeddedSubject ?? params.subject ?? "";
  const topic = embeddedTopic ?? params.topic ?? "";
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const lesson = useQuery({ queryKey: ["guided-lesson", subject, topic], queryFn: () => learningCoachApi.openLesson(subject, topic), enabled: Boolean(subject && topic) });
  const complete = useMutation({ mutationFn: ({ id, score }: { id: string; score: number }) => learningCoachApi.completeLesson(id, score), onSuccess: () => navigate(`/student/my-assignments?topic=${encodeURIComponent(topic)}`) });
  const steps = lesson.data?.script ?? [];
  const step = steps[stepIndex];
  useEffect(() => { setStepIndex(0); setSelected(null); setCorrectAnswers(0); }, [subject, topic]);
  if (lesson.isLoading) return <div className="mx-auto max-w-5xl animate-pulse space-y-5"><div className="h-24 rounded-3xl bg-slate-200" /><div className="h-96 rounded-3xl bg-slate-100" /></div>;
  if (lesson.isError || !lesson.data || !step) return <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-8"><h1 className="text-xl font-bold text-[#101820]">We couldn’t open this lesson.</h1><p className="mt-2 text-sm text-slate-600">{apiErrorMessage(lesson.error, "Please return to your learning topics and try again.")}</p><Link to="/student/learn" className="mt-5 inline-flex font-bold text-[#365100]">Back to topics</Link></div>;
  const isQuestion = step.type === "QUESTION";
  const answeredCorrectly = !isQuestion || selected === step.correctAnswer;
  const last = stepIndex === steps.length - 1;
  const advance = () => { if (last) { complete.mutate({ id: lesson.data.id, score: Math.round((correctAnswers / Math.max(1, steps.filter((item) => item.type === "QUESTION").length)) * 100) }); return; } setStepIndex((value) => value + 1); setSelected(null); };
  const choose = (answer: string) => { setSelected(answer); if (answer === step.correctAnswer) setCorrectAnswers((value) => value + 1); };
  return <main className="mx-auto max-w-6xl space-y-5 pb-20"><header className="flex items-center justify-between gap-4">{onBack ? <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" /> Learning Coach</button> : <Link to={`/student/learn/${encodeURIComponent(subject)}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" /> Topics</Link>}<span className="text-sm font-medium text-slate-500">Step {stepIndex + 1} of {steps.length}</span></header><section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="h-1.5 bg-slate-100"><div className="h-full bg-lime-400 transition-all" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div><div className="grid lg:grid-cols-[.9fr_1.1fr]"><section className="bg-[#101820] p-7 text-white sm:p-10"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300 text-[#101820]"><Headphones /></div><p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-lime-300">Guided lesson · {lesson.data.subject}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{lesson.data.topic}</h1><div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Your coach says</p><p className="mt-3 text-lg leading-8 text-slate-100">{step.text}</p></div><button type="button" onClick={() => speak(step.voiceoverText)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold hover:bg-white/10"><Volume2 className="h-4 w-4" /> Play voiceover</button></section><section className="p-6 sm:p-10"><VisualizationRouter type={lesson.data.visualizationType} state={step.visualizationState} data={lesson.data.visualizationData} /><div className="mt-7">{isQuestion ? <><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Check your understanding</p><div className="mt-3 grid gap-3">{step.questionOptions?.map((option) => { const chosen = selected === option; const right = selected && option === step.correctAnswer; const wrong = chosen && option !== step.correctAnswer; return <button key={option} type="button" disabled={Boolean(selected)} onClick={() => choose(option)} className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${right ? "border-emerald-300 bg-emerald-50 text-emerald-900" : wrong ? "border-rose-300 bg-rose-50 text-rose-900" : "border-slate-200 hover:border-[#101820]"}`}>{option}</button>; })}</div>{selected ? <p className={`mt-4 text-sm font-medium ${answeredCorrectly ? "text-emerald-700" : "text-rose-700"}`}>{answeredCorrectly ? "Correct. You connected the key idea." : "Not quite. Re-read the explanation, then choose again."}</p> : null}</> : <p className="text-sm leading-6 text-slate-600">Use the visual as a thinking tool. You do not need to memorise every detail before moving forward.</p>}<div className="mt-8 flex justify-end"><button type="button" disabled={isQuestion && !answeredCorrectly || complete.isPending} onClick={advance} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-lime-400 px-5 text-sm font-bold text-[#101820] disabled:cursor-not-allowed disabled:opacity-40">{complete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : last ? <CheckCircle2 className="h-4 w-4" /> : null}{last ? "Complete lesson" : "Continue"}<ArrowRight className="h-4 w-4" /></button></div></div></section></div></section></main>;
}
