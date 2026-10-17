import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, ChevronLeft, Clock3, Lightbulb, RotateCcw, Target } from 'lucide-react';
import { apiErrorMessage } from '../../api/axios';
import { learningCoachApi, type LearningPlan, type LearningSession, type LearningTopic } from '../../api/learning-coach.api';

function MasteryBadge({ score }: { score: number }) {
  const tone = score >= 70 ? 'bg-emerald-100 text-emerald-800' : score >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{score}% mastery</span>;
}

function PlanCard({ plan, onPractice }: { plan: LearningPlan; onPractice: () => void }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607D00]">{plan.subject}</p>
          <h2 className="mt-1 text-lg font-semibold text-[#101820]">{plan.topic}</h2>
        </div>
        <MasteryBadge score={plan.masteryScore} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{plan.recommendedTechnique}</p>
      <button type="button" onClick={onPractice} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white hover:bg-[#1d2c38] sm:w-auto">
        <RotateCcw className="h-4 w-4" /> Continue practice
      </button>
    </article>
  );
}

function TopicPicker({ topics, plans, onStart, loading }: { topics: LearningTopic[]; plans: LearningPlan[]; onStart: (topic: LearningTopic, mode: 'DIAGNOSTIC' | 'PRACTICE') => void; loading: boolean }) {
  const [subject, setSubject] = useState('');
  const subjects = useMemo(() => Array.from(new Set(topics.map((topic) => topic.subject))), [topics]);
  const visible = topics.filter((topic) => !subject || topic.subject === subject);
  const planByTopic = new Map(plans.map((plan) => [`${plan.subject}::${plan.topic}`, plan]));
  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-[#101820] p-5 text-white sm:p-7">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-[#B5E61D] p-3 text-[#101820]"><BrainCircuit className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B5E61D]">Learning Coach</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Master one difficult topic at a time.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Choose a topic, take a short check-in, then practise with immediate feedback and a plan that adjusts to your results.</p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setSubject('')} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${!subject ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>All subjects</button>
        {subjects.map((item) => <button key={item} type="button" onClick={() => setSubject(item)} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${subject === item ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{item}</button>)}
      </div>
      {!visible.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">There are no approved practice topics for your grade yet. Ask your teacher or platform administrator to add curriculum questions.</div> : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((topic) => {
            const plan = planByTopic.get(`${topic.subject}::${topic.topic}`);
            return <article key={`${topic.subject}-${topic.topic}`} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607D00]">{topic.subject}</p><h2 className="mt-1 text-lg font-semibold text-[#101820]">{topic.topic}</h2></div>{plan ? <MasteryBadge score={plan.masteryScore} /> : null}</div>
              <p className="mt-3 text-sm text-slate-500">{topic.questionCount} rotated practice questions available.</p>
              <button type="button" disabled={loading} onClick={() => onStart(topic, plan ? 'PRACTICE' : 'DIAGNOSTIC')} className="mt-5 min-h-11 w-full rounded-xl bg-[#B5E61D] px-4 text-sm font-semibold text-[#101820] disabled:cursor-wait disabled:opacity-60">{plan ? 'Continue practice' : 'Start quick check-in'}</button>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}

function SessionPlayer({ data, onClose }: { data: LearningSession; onClose: () => void }) {
  const client = useQueryClient();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Awaited<ReturnType<typeof learningCoachApi.answer>> | null>(null);
  const question = data.questions[index];
  const submit = useMutation({
    mutationFn: () => learningCoachApi.answer(data.session.id, { questionId: question.id, answer }),
    onSuccess: (result) => { setFeedback(result); if (result.completed) void client.invalidateQueries({ queryKey: ['learning-coach-plans'] }); },
  });
  const next = () => { if (feedback?.completed) { onClose(); return; } setIndex((current) => current + 1); setAnswer(''); setFeedback(null); };
  const options = Array.isArray(question.options) ? question.options : [];
  return <section className="mx-auto max-w-3xl space-y-4">
    <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#101820]"><ChevronLeft className="h-4 w-4" /> Back to topics</button>
    <header className="rounded-2xl bg-[#101820] p-5 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B5E61D]">{data.plan.subject} · {data.session.mode === 'DIAGNOSTIC' ? 'Quick check-in' : 'Practice'}</p><h1 className="mt-2 text-2xl font-semibold">{data.plan.topic}</h1></div><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium">{index + 1} of {data.session.total}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#B5E61D]" style={{ width: `${((index + (feedback ? 1 : 0)) / data.session.total) * 100}%` }} /></div></header>
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Question {index + 1}</p><h2 className="mt-3 text-lg font-semibold leading-8 text-[#101820] sm:text-xl">{question.questionText}</h2>{question.diagramUrl ? <img src={question.diagramUrl} alt={question.diagramAlt ?? ''} className="mt-5 max-h-80 w-full rounded-xl object-contain" /> : null}
      {options.length ? <div className="mt-6 grid gap-3">{options.map((option) => <button key={option} type="button" disabled={Boolean(feedback)} onClick={() => setAnswer(option)} className={`min-h-12 rounded-xl border px-4 text-left text-sm font-medium transition ${answer === option ? 'border-[#B5E61D] bg-lime-50 text-[#101820]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}>{option}</button>)}</div> : <textarea value={answer} disabled={Boolean(feedback)} onChange={(event) => setAnswer(event.target.value)} className="mt-6 min-h-28 w-full rounded-xl border border-slate-300 p-4 text-base text-[#101820] outline-none focus:border-[#8DBB00] focus:ring-2 focus:ring-lime-100" placeholder="Write your answer here" />}
      {question.hint && !feedback ? <p className="mt-4 flex gap-2 text-sm leading-6 text-slate-500"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#739400]" /> {question.hint}</p> : null}
      {feedback ? <div className={`mt-6 rounded-xl border p-4 ${feedback.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className="font-semibold text-[#101820]">{feedback.isCorrect ? 'Correct' : 'Keep going'}</p><p className="mt-2 text-sm leading-6 text-slate-700">{feedback.feedback}</p>{feedback.completed && feedback.score !== undefined ? <p className="mt-3 font-semibold text-[#101820]">Session score: {feedback.score}%</p> : null}</div> : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" disabled={!answer.trim() || submit.isPending || Boolean(feedback)} onClick={() => submit.mutate()} className="min-h-12 rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] disabled:cursor-not-allowed disabled:opacity-50">{submit.isPending ? 'Checking...' : 'Check my answer'}</button>{feedback ? <button type="button" onClick={next} className="min-h-12 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white">{feedback.completed ? 'View my plan' : 'Next question'}</button> : null}</div>
      {submit.isError ? <p className="mt-3 text-sm text-red-700">{apiErrorMessage(submit.error, 'Your answer could not be checked.')}</p> : null}
    </article>
  </section>;
}

export function LearningCoachPage() {
  const [session, setSession] = useState<LearningSession | null>(null);
  const catalog = useQuery({ queryKey: ['learning-coach-catalog'], queryFn: learningCoachApi.catalog });
  const plans = useQuery({ queryKey: ['learning-coach-plans'], queryFn: learningCoachApi.plans });
  const start = useMutation({ mutationFn: (input: { subject: string; topic: string; mode: 'DIAGNOSTIC' | 'PRACTICE' }) => learningCoachApi.start(input), onSuccess: setSession });
  if (session) return <SessionPlayer data={session} onClose={() => setSession(null)} />;
  if (catalog.isLoading || plans.isLoading) return <div className="space-y-4"><div className="h-44 animate-pulse rounded-2xl bg-slate-200" /><div className="h-28 animate-pulse rounded-2xl bg-slate-200" /></div>;
  return <div className="mx-auto max-w-6xl space-y-8"><TopicPicker topics={catalog.data ?? []} plans={plans.data ?? []} loading={start.isPending} onStart={(topic, mode) => start.mutate({ ...topic, mode })} />{start.isError ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{apiErrorMessage(start.error, 'Learning Coach could not start this topic.')}</p> : null}{(plans.data ?? []).length ? <section><div className="mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-[#607D00]" /><h2 className="text-xl font-semibold text-[#101820]">My mastery plans</h2></div><div className="grid gap-4 md:grid-cols-2">{plans.data!.map((plan) => <PlanCard key={plan.id} plan={plan} onPractice={() => start.mutate({ subject: plan.subject, topic: plan.topic, mode: 'PRACTICE' })} />)}</div></section> : null}<div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4" /> Short sessions, immediate feedback, and spaced follow-up practice.</div></div>;
}
