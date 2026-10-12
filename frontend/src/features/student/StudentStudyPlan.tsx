import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  Clock3,
  Coffee,
  ExternalLink,
  Focus,
  Printer,
  Target,
} from 'lucide-react';
import { academicResultsApi, type StudySession } from '../../api/academic-results.api';
import { schoolsApi } from '../../api/schools.api';
import { Logo } from '../../components/ui/Logo';
import { EmptyState } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';

export function StudentStudyPlan() {
  const user = useAuthStore((state) => state.user);
  const [openSession, setOpenSession] = useState<number | null>(0);
  const planQuery = useQuery({ queryKey: ['academic-results', 'my-plan'], queryFn: academicResultsApi.myPlan });
  const schoolQuery = useQuery({
    queryKey: ['school', user?.schoolId],
    queryFn: () => schoolsApi.findOne(user!.schoolId),
    enabled: Boolean(user?.schoolId),
  });

  if (planQuery.isLoading) return <EmptyState title="Loading your study plan..." />;
  if (planQuery.isError) return <EmptyState title="Your study plan is temporarily unavailable." />;
  if (!planQuery.data?.plan) {
    return <EmptyState title="Your study plan will appear after your school uploads an academic result." />;
  }

  const { plan, practiceAssignments, subjectTrends } = planQuery.data;
  const school = schoolQuery.data;
  const timetable = Array.isArray(plan.timetable) ? plan.timetable : [];

  return (
    <section className="study-plan-print space-y-4">
      <header className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 bg-[#101820] p-4 text-white sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <Logo src={school?.logoUrl} name={school?.name ?? 'Assignment Hub'} size="sm" className="shadow-none ring-white/10 sm:h-14 sm:w-14" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[#B5E61D]">{school?.name ?? 'Assignment Hub'}</p>
              <h2 className="mt-1 truncate text-lg font-semibold sm:text-2xl">{user?.name}</h2>
              <p className="mt-1 text-sm text-slate-300">{[user?.grade, plan.periodKey.replace(/-/g, ' ')].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15 sm:w-auto sm:gap-2 sm:px-4"
            aria-label="Print timetable"
          >
            <Printer className="h-4 w-4" strokeWidth={1.8} />
            <span className="hidden sm:inline">Print timetable</span>
          </button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-200">
          <PlanMetric label="Weekly sessions" value={String(timetable.length)} />
          <PlanMetric label="Focus subjects" value={String(plan.weakSubjects.length || 1)} />
          <PlanMetric label="Practice available" value={String(practiceAssignments.length)} />
        </div>
      </header>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h3 className="font-semibold text-[#101820]">Weekly timetable</h3>
            <p className="mt-0.5 text-xs text-slate-500">Tap a session for details.</p>
          </div>
          <Clock3 className="h-5 w-5 text-slate-400" strokeWidth={1.7} />
        </div>
        <div className="divide-y divide-slate-100">
          {timetable.map((session, index) => {
            const open = openSession === index;
            const assignment = practiceAssignments.find((item) => item.subject.toLowerCase() === session.subject.toLowerCase());
            return (
              <article key={`${session.day}-${session.subject}-${index}`}>
                <button
                  type="button"
                  onClick={() => setOpenSession(open ? null : index)}
                  className="grid min-h-[72px] w-full min-w-0 grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 text-left hover:bg-slate-50 sm:grid-cols-[110px_100px_minmax(0,1fr)_auto] sm:gap-3 sm:px-5"
                  aria-expanded={open}
                >
                  <span className="text-sm font-semibold text-[#101820]">{session.day}</span>
                  <span className="hidden text-sm tabular-nums text-slate-500 sm:block">{session.startTime}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#101820]">{session.subject}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 sm:hidden">{session.startTime} · {session.durationMinutes} min</span>
                    <span className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">{session.topic} · {session.durationMinutes} min</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
                </button>
                {open ? <SessionDetails session={session} assignment={assignment} /> : null}
              </article>
            );
          })}
        </div>
      </div>

      {subjectTrends.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {subjectTrends.map((trend) => (
            <div key={trend.subject} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#101820]">{trend.subject}</p>
                <span className="text-lg font-semibold tabular-nums text-[#101820]">{trend.latest}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#B5E61D]" style={{ width: `${Math.max(4, trend.latest)}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Based on {trend.dataPoints} result {trend.dataPoints === 1 ? 'record' : 'records'}</p>
            </div>
          ))}
        </section>
      ) : null}
    </section>
  );
}

function SessionDetails({ session, assignment }: { session: StudySession; assignment?: { id: number; title: string } }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail icon={BookOpen} label="Topic" value={session.topic} secondary={session.subtopic} />
        <Detail icon={Focus} label="Technique" value={session.learningTechnique} secondary={session.activity} />
        <Detail icon={Clock3} label="Study time" value={`${session.startTime} · ${session.durationMinutes} min`} />
        <Detail icon={Coffee} label="Break" value={`${session.breakMinutes} minutes`} />
      </div>
      {assignment ? (
        <Link to={`/student/assignments/${assignment.id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-4 text-center text-sm font-semibold text-white sm:w-auto">
          <Target className="h-4 w-4" />
          Open {assignment.title}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function Detail({ icon: Icon, label, value, secondary }: { icon: typeof BookOpen; label: string; value: string; secondary?: string }) {
  return (
    <div className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.8} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-[#101820]">{value}</p>
        {secondary ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{secondary}</p> : null}
      </div>
    </div>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-2 py-3 text-center sm:px-5 sm:py-4 sm:text-left"><p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">{label}</p><p className="mt-1 text-lg font-semibold text-[#101820] sm:text-xl">{value}</p></div>;
}
