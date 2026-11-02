import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BrainCircuit, ClipboardCheck, FlaskConical, Lightbulb, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { learningCoachApi } from '../../../api/learning-coach.api';
import { pathwaysApi } from '../../../api/pathways.api';
import { EmptyState, MetricCard } from '../../../components/ui/Saas';
import { useAuthStore } from '../../../store/auth.store';

/**
 * Grade 10–12 is an execution space, not a pathway-selection test. The
 * learner's persisted selection remains the authority; this view connects it
 * to practice, coaching and evidence planning without pretending to predict a
 * career from personality scores.
 */
export function SeniorPathwayExecution() {
  const user = useAuthStore((state) => state.user);
  const summary = useQuery({
    queryKey: ['my-pathway-summary', user?.id],
    queryFn: () => pathwaysApi.getStudentSummary(user!.id),
    enabled: Boolean(user?.id),
  });
  const coachPlans = useQuery({ queryKey: ['learning-coach-plans'], queryFn: learningCoachApi.plans });
  const reports = useQuery({ queryKey: ['learning-coach-report-cards'], queryFn: learningCoachApi.reportCards });

  if (summary.isLoading || coachPlans.isLoading || reports.isLoading) return <EmptyState title="Preparing your pathway workspace..." />;
  if (summary.isError || coachPlans.isError || reports.isError) return <EmptyState title="Your pathway workspace is temporarily unavailable." />;

  const current = summary.data?.current;
  const track = current?.track;
  const pathway = track?.pathway;
  const weakPlans = (coachPlans.data ?? []).filter((plan) => plan.masteryScore < 70 || plan.requiresHumanSupport);
  const practiceHref = pathway?.key === 'STEM' ? '/student/stem-labs' : '/student/learn-skills';
  const practiceLabel = pathway?.key === 'STEM' ? 'Open STEM Labs' : 'Explore skill practice';

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-3xl bg-[#101820] p-5 text-white sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B5E61D]">Senior school pathway</p>
      {track ? <><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{track.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{pathway?.name}. Use this space to keep your subjects, practical work and targeted revision connected.</p></> : <><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Confirm your pathway</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Your school pathway is not yet recorded here. Ask your school to confirm it, then return to see aligned practice and planning.</p></>}
      <div className="mt-5 flex flex-wrap gap-3"><Link to="/student/my-assignments" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#101820]"><ClipboardCheck className="h-4 w-4" />My pathway assignments</Link>{track ? <Link to={practiceHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold text-white hover:bg-white/10"><FlaskConical className="h-4 w-4" />{practiceLabel}</Link> : null}</div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3"><MetricCard compact label="Current track" value={track?.name ?? 'Awaiting confirmation'} /><MetricCard compact label="Coaching priorities" value={weakPlans.length} /><MetricCard compact label="Report cards saved" value={reports.data?.length ?? 0} /></section>

    {track ? <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">Your subject direction</p><h2 className="mt-2 text-xl font-semibold text-[#101820]">Build depth in your track</h2><p className="mt-2 text-sm leading-6 text-slate-600">{track.description}</p>{track.requiredSubjects?.length ? <div className="mt-4 flex flex-wrap gap-2">{track.requiredSubjects.map((subject) => <span key={subject.subject} className="rounded-full bg-lime-50 px-3 py-2 text-sm font-semibold text-[#375000]">{subject.subject}</span>)}</div> : null}{track.skills?.length ? <p className="mt-4 text-sm leading-6 text-slate-600"><strong className="text-[#101820]">Skills to practise:</strong> {track.skills.slice(0, 5).join(' · ')}</p> : null}</article><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">Next best step</p><h2 className="mt-2 text-xl font-semibold text-[#101820]">Strengthen the ideas that need recall</h2>{weakPlans.length ? <div className="mt-4 space-y-2">{weakPlans.slice(0, 3).map((plan) => <div key={plan.id} className="rounded-xl bg-amber-50 px-3 py-3 text-sm"><span className="font-semibold text-amber-950">{plan.subject}: {plan.topic}</span><span className="ml-2 text-amber-800">{plan.masteryScore}% mastery</span></div>)}</div> : <p className="mt-3 text-sm leading-6 text-slate-600">No coaching priorities yet. Start a diagnostic to create a personal review plan.</p>}<Link to="/student/learning-coach" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"><BrainCircuit className="h-4 w-4" />Open Learning Coach</Link></article></section> : null}

    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">Academic evidence</p><h2 className="mt-2 text-xl font-semibold text-[#101820]">Report cards and SBA portfolio</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload report cards privately for your Learning Coach profile. SBA evidence and any verification must be confirmed by your school; the portfolio workspace will be enabled after the school’s evidence requirements are configured.</p></div><Link to="/student/learning-coach" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#101820] px-4 text-sm font-semibold text-[#101820]"><Upload className="h-4 w-4" />Upload report card</Link></div><p className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#739400]" />A saved report card is private. It is not automatically interpreted as a formal result until you or a teacher confirms the subjects and scores.</p></section>
  </div>;
}
