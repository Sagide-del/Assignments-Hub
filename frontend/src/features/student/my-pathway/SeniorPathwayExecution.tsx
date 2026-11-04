import { useStudentContentScope } from '../../../hooks/useStudentContentScope';
import { ExploreTab } from './ExploreTab';
import type { Track } from "../../../types";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, ClipboardCheck, FlaskConical, Lightbulb, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { learningCoachApi } from '../../../api/learning-coach.api';
import { pathwaysApi } from '../../../api/pathways.api';
import { sbaEvidenceApi } from '../../../api/sba-evidence.api';
import { EmptyState, MetricCard } from '../../../components/ui/Saas';
import { useAuthStore } from '../../../store/auth.store';
import { useState } from 'react';

/**
 * Grade 10–12 is an execution space, not a pathway-selection test. The
 * learner's persisted selection remains the authority; this view connects it
 * to practice, coaching and evidence planning without pretending to predict a
 * career from personality scores.
 */
export function SeniorPathwayExecution() {
  const user = useAuthStore((state) => state.user);
  const contentScope=useStudentContentScope();
  const summary = useQuery({
    queryKey: ['my-pathway-summary', user?.id],
    queryFn: () => pathwaysApi.getStudentSummary(user!.id),
    enabled: Boolean(user?.id),
  });
  const coachPlans = useQuery({ queryKey: ['learning-coach-plans'], queryFn: learningCoachApi.plans });
  const reports = useQuery({ queryKey: ['learning-coach-report-cards'], queryFn: learningCoachApi.reportCards });
  const evidence = useQuery({ queryKey: ['sba-evidence'], queryFn: sbaEvidenceApi.list });

  if (contentScope.isLoading || summary.isLoading || coachPlans.isLoading || reports.isLoading || evidence.isLoading) return <EmptyState title="Preparing your pathway workspace..." />;
  if (contentScope.isError || summary.isError || coachPlans.isError || reports.isError || evidence.isError) return <EmptyState title="Your pathway workspace is temporarily unavailable." />;

  const current = summary.data?.current;
  const track = contentScope.data?.setup_required ? undefined : current?.track;
  const pathway = track?.pathway;
  const weakPlans = (coachPlans.data ?? []).filter((plan) => plan.masteryScore < 70 || plan.requiresHumanSupport);
  const hasLabs=(contentScope.data?.availability.labs??0)>0;
  const hasSkills=(contentScope.data?.availability.skills??0)>0;
  const practiceHref = hasLabs ? '/student/stem-labs' : '/student/learn-skills';
  const practiceLabel = hasLabs ? 'Open STEM Labs' : 'Explore skill practice';

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-3xl bg-[#101820] p-5 text-white sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B5E61D]">My Senior Journey · Grade {user?.grade?.replace('Grade ', '')}</p>
      {track ? <><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{track.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{pathway?.name}. Use this space to keep your subjects, practical work and targeted revision connected.</p></> : <><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Confirm your pathway</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Your pathway is not recorded yet. Select your confirmed pathway below; school learners should check it matches their school placement.</p></>}
      <div className="mt-5 flex flex-wrap gap-3"><Link to="/student/my-assignments" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#101820]"><ClipboardCheck className="h-4 w-4" />My pathway assignments</Link>{track && (hasLabs || hasSkills) ? <Link to={practiceHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-bold text-white hover:bg-white/10"><FlaskConical className="h-4 w-4" />{practiceLabel}</Link> : null}</div>
    </section>

    {!track ? <ExploreTab tier="senior" /> : null}
    <section className="grid gap-3 sm:grid-cols-3"><MetricCard compact label="Current track" value={track?.name ?? 'Awaiting confirmation'} /><MetricCard compact label="Coaching priorities" value={weakPlans.length} /><MetricCard compact label="Report cards saved" value={reports.data?.length ?? 0} /></section>

    {track ? <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">Your subject direction</p><h2 className="mt-2 text-xl font-semibold text-[#101820]">Build depth in your track</h2><p className="mt-2 text-sm leading-6 text-slate-600">{track.description}</p>{track.requiredSubjects?.length ? <div className="mt-4 flex flex-wrap gap-2">{track.requiredSubjects.filter((subject: Track["requiredSubjects"][number]) => contentScope.data?.subjects.some(name=>name.toLowerCase()===subject.subject.toLowerCase())).map((subject: Track["requiredSubjects"][number]) => <span key={subject.subject} className="rounded-full bg-lime-50 px-3 py-2 text-sm font-semibold text-[#375000]">{subject.subject}</span>)}</div> : null}{track.skills?.length ? <p className="mt-4 text-sm leading-6 text-slate-600"><strong className="text-[#101820]">Skills to practise:</strong> {track.skills.slice(0, 5).join(' · ')}</p> : null}</article><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">Next best step</p><h2 className="mt-2 text-xl font-semibold text-[#101820]">Strengthen the ideas that need recall</h2>{weakPlans.length ? <div className="mt-4 space-y-2">{weakPlans.slice(0, 3).map((plan) => <div key={plan.id} className="rounded-xl bg-amber-50 px-3 py-3 text-sm"><span className="font-semibold text-amber-950">{plan.subject}: {plan.topic}</span><span className="ml-2 text-amber-800">{plan.masteryScore}% mastery</span></div>)}</div> : <p className="mt-3 text-sm leading-6 text-slate-600">No coaching priorities yet. Start a diagnostic to create a personal review plan.</p>}<Link to="/student/learning-coach" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"><BrainCircuit className="h-4 w-4" />Open Learning Coach</Link></article></section> : null}

    <EvidenceVault items={evidence.data ?? []} />
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">Academic evidence</p><h2 className="mt-2 text-xl font-semibold text-[#101820]">Private report-card record</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload report cards privately for your Learning Coach profile. A saved report card is not automatically interpreted as a formal result until the subjects and scores are confirmed.</p></div><Link to="/student/learning-coach" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#101820] px-4 text-sm font-semibold text-[#101820]"><Upload className="h-4 w-4" />Upload report card</Link></div><p className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#739400]" />Your school verifies SBA evidence; students cannot mark their own work as complete.</p></section>
  </div>;
}

function EvidenceVault({ items }: { items: Awaited<ReturnType<typeof sbaEvidenceApi.list>> }) {
  const client = useQueryClient();
  const [subject, setSubject] = useState(''); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [file, setFile] = useState<File | undefined>();
  const submit = useMutation({ mutationFn: () => sbaEvidenceApi.create({ subject, title, description, file }), onSuccess: async () => { setSubject(''); setTitle(''); setDescription(''); setFile(undefined); await client.invalidateQueries({ queryKey: ['sba-evidence'] }); } });
  const verified = items.filter((item) => item.status === 'VERIFIED').length;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607D00]">SBA evidence vault</p><h2 className="mt-2 text-xl font-semibold text-[#101820]">Keep project evidence ready for verification</h2><p className="mt-2 text-sm leading-6 text-slate-600">{verified} verified of {items.length} submitted evidence records.</p></div></div><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}><input required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" /><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project or evidence title" className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm" /><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this evidence show?" className="min-h-24 rounded-xl border border-slate-200 p-3 text-sm sm:col-span-2" /><label className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-sm text-slate-600 sm:col-span-2"><Upload className="h-4 w-4" />{file?.name ?? 'Optional file (max 10 MB)'}<input className="sr-only" type="file" onChange={(event) => setFile(event.target.files?.[0])} /></label><button disabled={submit.isPending} className="min-h-11 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">{submit.isPending ? 'Saving evidence…' : 'Submit for school verification'}</button></form>{submit.isError ? <p className="mt-3 text-sm text-red-700">Evidence could not be saved. Check the details or try again.</p> : null}{items.length ? <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">{items.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-semibold text-[#101820]">{item.title}</p><p className="text-xs text-slate-500">{item.subject}{item.fileName ? ` · ${item.fileName}` : ''}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : item.status === 'NEEDS_REVISION' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{item.status.replace('_', ' ').toLowerCase()}</span></div>)}</div> : null}</section>;
}
