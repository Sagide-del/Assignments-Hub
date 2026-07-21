import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { schoolsApi } from '../../api/schools.api';
import { useAuthStore } from '../../store/auth.store';

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M14.8 9.2l-1.8 5.8-5.8 1.8 1.8-5.8 5.8-1.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 12h4l2.2-4 3.6 8 2.2-4H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M10 3h4M11 3v5.5L6.4 16a3 3 0 0 0 2.6 4.5h6a3 3 0 0 0 2.6-4.5L13 8.5V3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 14h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8v4.5l3 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M8 11V8.5a4 4 0 1 1 8 0V11M7 11h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 17L17 7M9 7h8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardIconFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D] shadow-sm">
      {children}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function learningAreaFromSubject(subject: string) {
  const value = subject.trim().toLowerCase();
  if (['mathematics', 'biology', 'chemistry', 'physics', 'computer studies'].includes(value)) {
    return 'STEM learning area';
  }
  return 'Curriculum learning area';
}

function OverviewCard({
  icon,
  title,
  value,
  helper,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <DashboardIconFrame>{icon}</DashboardIconFrame>
        <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Portfolio
        </span>
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight text-[#101820]">{title}</h2>
      <p className="mt-3 text-3xl font-semibold text-[#101820]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </article>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function TimelineEvent({
  title,
  description,
  meta,
  status,
}: {
  title: string;
  description: string;
  meta: string;
  status: string;
}) {
  return (
    <div className="flex gap-4 rounded-3xl border border-slate-200 p-4">
      <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#B5E61D]" />
      <div className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#101820]">{title}</p>
          <span className="inline-flex rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-slate-600">
            {status}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{meta}</p>
      </div>
    </div>
  );
}

function PortfolioPlaceholder({
  title,
  description,
  helper,
}: {
  title: string;
  description: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-5">
      <p className="text-lg font-semibold text-[#101820]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{helper}</p>
    </div>
  );
}

function SkillCard({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: 'locked' | 'open';
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 ${
        state === 'open' ? 'border-[#D7E89A] bg-[#FAFDEB]' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-[#101820]">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            state === 'open' ? 'bg-[#101820] text-[#B5E61D]' : 'bg-[#F8FAFC] text-slate-500'
          }`}
        >
          {state === 'open' ? <SparkIcon /> : <LockIcon />}
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {state === 'open' ? 'Learning provider ready' : 'Unlock advanced mentorship'}
      </p>
    </div>
  );
}

function InsightCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4">
      <p className="text-sm font-semibold text-[#101820]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function MyActivitiesPage() {
  const user = useAuthStore((s) => s.user);

  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['assignments', user?.schoolId],
    queryFn: () => assignmentsApi.findAll(),
  });

  const { data: school } = useQuery({
    queryKey: ['school', user?.schoolId],
    queryFn: () => schoolsApi.findOne(user!.schoolId),
    enabled: !!user?.schoolId,
  });

  const publishedAssignments = (assignments ?? []).filter((assignment) => assignment.isPublished);
  const recentAcademicEvents = useMemo(
    () =>
      [...publishedAssignments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [publishedAssignments],
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(16,24,32,0.08)]">
        <div className="grid gap-6 bg-[#101820] px-6 py-8 text-white md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 hidden w-40 bg-[radial-gradient(circle_at_center,rgba(181,230,29,0.2),transparent_70%)] md:block" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B5E61D]">My Activities</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                {user?.name ?? 'Student learning portfolio'}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                Your learning journey at a glance. This portfolio is designed to bring together
                academic work, STEM exploration, future skills, and competency development in one
                school-ready record.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">
                  {user?.grade ? `Grade ${user.grade}` : 'Grade profile available'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">
                  Learning portfolio foundation
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Student context</p>
            <div className="mt-5 grid gap-3">
              <ContextItem label="Student" value={user?.name ?? 'Student account'} />
              <ContextItem label="School" value={school?.name ?? 'School profile available when loaded'} />
              <ContextItem label="Grade" value={user?.grade ? `Grade ${user.grade}` : 'Grade not assigned'} />
              <ContextItem label="Pathway" value="Pathway portfolio will appear here when available" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <OverviewCard
          icon={<ActivityIcon />}
          title="Assignments Completed"
          value="Data developing"
          helper="Completion history will come from learning activities once assignment submission records are connected."
        />
        <OverviewCard
          icon={<FlaskIcon />}
          title="STEM Activities"
          value="Data developing"
          helper="Hands-on science and lab activity totals will appear here as the STEM portfolio connects."
        />
        <OverviewCard
          icon={<SparkIcon />}
          title="Future Skills"
          value="Coming from learning activities"
          helper="Skills earned through pathway learning, mentorship, and practical experiences will surface here."
        />
        <OverviewCard
          icon={<ClockIcon />}
          title="Learning Hours"
          value="Data developing"
          helper="Study time and practical learning hours will appear once activity tracking is connected."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Academic activity timeline
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#101820]">Learning events in your workspace</h2>
            </div>
            <Link
              to="/student/my-assignments"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:text-[#6D8F08]"
            >
              Open assignments
              <ArrowIcon />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
                Loading your activity history...
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                We could not load activity events right now.
              </div>
            ) : recentAcademicEvents.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
                No academic activity has been published yet. When your teachers add learning tasks,
                they will appear in this timeline.
              </div>
            ) : (
              recentAcademicEvents.map((assignment) => (
                <TimelineEvent
                  key={assignment.id}
                  title={`${assignment.subject} coursework assigned`}
                  description={assignment.title}
                  meta={`${formatDate(assignment.createdAt)} · ${learningAreaFromSubject(assignment.subject)} · Learning activity available`}
                  status="Available"
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-center gap-3">
            <DashboardIconFrame>
              <CompassIcon />
            </DashboardIconFrame>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Learning insights
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#101820]">Portfolio intelligence</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <InsightCard
              title="Strengths"
              description="This area will summarize strong competencies, consistent learning habits, and high-engagement subjects."
            />
            <InsightCard
              title="Areas to improve"
              description="This area will later highlight skill gaps, incomplete practical work, and recommended support priorities."
            />
            <InsightCard
              title="Recommended next activities"
              description="This area will propose future labs, pathway-aligned tasks, and development opportunities."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                STEM learning portfolio
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#101820]">Practical learning record</h2>
            </div>
            <Link
              to="/student/stem-labs"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:text-[#6D8F08]"
            >
              Open STEM Labs
              <ArrowIcon />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PortfolioPlaceholder
              title="Chemistry practical portfolio"
              description="Completed STEM tasks such as food testing practicals and lab explorations will appear here with dates and outcomes."
              helper="Date completed · Learning outcome"
            />
            <PortfolioPlaceholder
              title="Biology activity portfolio"
              description="Biology practical records, observations, and experiment reflections will be collected in this section."
              helper="Prepared for competency evidence"
            />
            <PortfolioPlaceholder
              title="Physics simulations"
              description="Simulation activities such as electricity and mechanics will appear here once STEM activity history is connected."
              helper="Prepared for practical learning"
            />
            <PortfolioPlaceholder
              title="CSL and applied learning"
              description="Community-based practical work and service-learning activity evidence can also be surfaced in this portfolio."
              helper="Prepared for CBC growth record"
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-start gap-3">
            <DashboardIconFrame>
              <SparkIcon />
            </DashboardIconFrame>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Future skills portfolio
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#101820]">Growth opportunities</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <SkillCard
              title="AI Fundamentals"
              description="A future-ready space for practical AI learning, guided exploration, and foundational digital literacy."
              state="open"
            />
            <SkillCard
              title="Robotics"
              description="Unlock advanced robotics mentorship and pathway-linked practical guidance from future learning providers."
              state="locked"
            />
            <SkillCard
              title="Coding"
              description="Prepare for structured coding journeys connected to school progression and professional skill development."
              state="open"
            />
            <SkillCard
              title="Video Editing and Media"
              description="A future portfolio stream for creative technology, digital storytelling, and practical production skills."
              state="locked"
            />
            <SkillCard
              title="Arduino and Physical Computing"
              description="A future practical track for electronics, prototyping, and engineering-focused mentorship."
              state="locked"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
