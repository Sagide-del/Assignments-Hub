import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { useAuthStore } from '../../store/auth.store';

type DashboardCard = {
  title: string;
  description: string;
  value: string;
  meta: string;
  actionLabel: string;
  to: string;
  icon: React.ReactNode;
};

type ProgressStat = {
  label: string;
  value: string;
  tone?: 'primary' | 'neutral';
  helper: string;
};

function DashboardIconFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
      style={{ backgroundColor: 'var(--school-primary, #101820)', color: 'var(--school-accent, #B5E61D)' }}
    >
      {children}
    </div>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v14.5A1.5 1.5 0 0 0 17.5 17H7.5A2.5 2.5 0 0 0 5 19.5v-13Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 4A2.5 2.5 0 0 0 5 6.5V20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
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

function TimelineDot() {
  return <span className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--school-accent, #B5E61D)' }} />;
}

export function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['assignments', user?.schoolId],
    queryFn: () => assignmentsApi.findAll(),
  });

  const published = (assignments ?? []).filter((a) => a.isPublished);
  const firstName = user?.name?.split(' ')[0] ?? 'Student';
  const gradeLabel = user?.grade ? `Grade ${user.grade}` : 'Grade not yet assigned';

  const recentAssignments = [...published]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const pendingAssignments = recentAssignments.slice(0, 3);
  const completedAssignments: typeof published = [];
  const progressPercentage = published.length > 0 ? Math.min(84, 28 + published.length * 9) : 12;
  const learningHours = published.length > 0 ? `${Math.max(2, published.length * 2)} hrs` : '0 hrs';

  const learningCards: DashboardCard[] = [
    {
      title: 'My Assignments',
      description: 'Review active coursework, continue drafts, and open class tasks.',
      value: `${published.length}`,
      meta: published.length === 1 ? '1 published assignment' : `${published.length} published assignments`,
      actionLabel: 'Open assignments',
      to: '/student/my-assignments',
      icon: <BookIcon />,
    },
    {
      title: 'STEM Labs',
      description: 'Continue practical learning, experiments, and guided STEM sessions.',
      value: recentAssignments.length > 0 ? `${Math.min(3, recentAssignments.length)} active` : 'Ready',
      meta: 'Hands-on learning workspace',
      actionLabel: 'Open STEM Labs',
      to: '/student/stem-labs',
      icon: <FlaskIcon />,
    },
    {
      title: 'Future Skills',
      description: 'Track support, competencies, and the foundations of student growth.',
      value: 'Phase 1',
      meta: 'Personal development foundation',
      actionLabel: 'Open Future Skills',
      to: '/student/future-skills',
      icon: <SparkIcon />,
    },
    {
      title: 'My Activities',
      description: 'Follow practical work, evidence, and activity-based learning records.',
      value: recentAssignments.length > 0 ? `${recentAssignments.length} recent` : 'No recent items',
      meta: 'Activity center in progress',
      actionLabel: 'Open My Activities',
      to: '/student/my-activities',
      icon: <ActivityIcon />,
    },
  ];

  const progressStats: ProgressStat[] = [
    {
      label: 'Assignments available',
      value: `${published.length}`,
      tone: 'primary',
      helper: 'Published tasks ready in your workspace',
    },
    {
      label: 'STEM activities completed',
      value: 'Pending sync',
      helper: 'This metric will connect in a later phase',
    },
    {
      label: 'Learning hours',
      value: learningHours,
      helper: 'Dashboard estimate based on current workload',
    },
    {
      label: 'Performance overview',
      value: 'Insights soon',
      helper: 'Feedback and scoring snapshots will appear here',
    },
  ];

  const timelineItems =
    recentAssignments.length > 0
      ? recentAssignments.map((assignment) => ({
          title: `${assignment.subject} assignment added`,
          description: assignment.title,
          meta: `${assignment.totalMarks} marks available`,
        }))
      : [
          {
            title: 'Your learning timeline will appear here',
            description: 'As assignments, activities, and feedback arrive, they will be organized in one place.',
            meta: 'No activity yet',
          },
        ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(16,24,32,0.08)]">
        <div
          className="grid gap-6 px-6 py-8 text-white md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10"
          style={{ backgroundColor: 'var(--school-primary, #101820)' }}
        >
          <div className="relative">
            <div className="absolute inset-y-0 right-0 hidden w-40 bg-[radial-gradient(circle_at_center,rgba(181,230,29,0.2),transparent_70%)] md:block" />
            <div className="relative max-w-2xl">
              <p
                className="text-xs font-semibold uppercase tracking-[0.24em]"
                style={{ color: 'var(--school-accent, #B5E61D)' }}
              >
                Assignment Hub Student Portal
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                Continue your learning journey with a school-ready workspace built for assignments,
                practical learning, growth tracking, and future academic direction.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">
                  {gradeLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">
                  School-linked student account
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">
                  {published.length} learning items available
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Learning progress
            </p>
            <div className="mt-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-semibold text-white">{progressPercentage}%</p>
                  <p className="mt-1 text-sm text-slate-300">Workspace readiness for this learning cycle</p>
                </div>
                <div className="rounded-2xl bg-white/8 px-3 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">School context</p>
                  <p className="mt-1 text-sm font-medium text-white">{gradeLabel}</p>
                </div>
              </div>
              <div className="mt-6 h-3 rounded-full bg-white/10">
                <div
                  className="h-3 rounded-full"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: 'var(--school-accent, #B5E61D)',
                  }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-300">
                Your dashboard is set up to support assignment flow, STEM learning, student growth,
                and future planning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {learningCards.map((card) => (
          <article
            key={card.title}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]"
          >
            <div className="flex items-start justify-between gap-4">
              <DashboardIconFrame>{card.icon}</DashboardIconFrame>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#101820]"
                style={{ backgroundColor: 'color-mix(in srgb, var(--school-accent, #B5E61D) 20%, white)' }}
              >
                {card.value}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-semibold tracking-tight text-[#101820]">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
            <p className="mt-4 text-sm font-medium text-slate-700">{card.meta}</p>
            <Link
              to={card.to}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:opacity-80"
            >
              {card.actionLabel}
              <ArrowIcon />
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Current learning
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#101820]">Recent assignments and active work</h2>
            </div>
            <Link
              to="/student/my-assignments"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] transition hover:bg-[#F8FAFC]"
              style={{ borderColor: 'color-mix(in srgb, var(--school-accent, #B5E61D) 32%, #e2e8f0)' }}
            >
              View all
              <ArrowIcon />
            </Link>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3">
            <LearningColumn
              title="Recent assignments"
              tone="default"
              content={
                isLoading ? (
                  <StateText text="Loading your learning workspace..." />
                ) : error ? (
                  <StateText text="Could not load assignments." tone="error" />
                ) : recentAssignments.length === 0 ? (
                  <StateText text="No published assignments yet." />
                ) : (
                  recentAssignments.map((assignment) => (
                    <AssignmentTile
                      key={assignment.id}
                      title={assignment.title}
                      subtitle={assignment.subject}
                      meta={`${assignment.totalMarks} marks`}
                      actionLabel="Open"
                      onAction={() => navigate(`/student/assignments/${assignment.id}`)}
                    />
                  ))
                )
              }
            />

            <LearningColumn
              title="Pending work"
              tone="soft"
              content={
                isLoading ? (
                  <StateText text="Preparing your queue..." />
                ) : error ? (
                  <StateText text="Assignment queue unavailable." tone="error" />
                ) : pendingAssignments.length === 0 ? (
                  <StateText text="No pending work is visible yet." />
                ) : (
                  pendingAssignments.map((assignment) => (
                    <AssignmentTile
                      key={assignment.id}
                      title={assignment.title}
                      subtitle="Ready to begin"
                      meta={`${assignment.subject} · ${assignment.totalMarks} marks`}
                      actionLabel="Start"
                      onAction={() => navigate(`/student/assignments/${assignment.id}`)}
                    />
                  ))
                )
              }
            />

            <LearningColumn
              title="Completed work"
              tone="subtle"
              content={
                completedAssignments.length === 0 ? (
                  <StateText text="Completed assignment tracking will appear here once submission history is connected to this view." />
                ) : (
                  completedAssignments.map((assignment) => (
                    <AssignmentTile
                      key={assignment.id}
                      title={assignment.title}
                      subtitle="Completed"
                      meta={assignment.subject}
                      actionLabel="Review"
                      onAction={() => navigate(`/student/assignments/${assignment.id}`)}
                    />
                  ))
                )
              }
            />
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Learning progress
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {progressStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-3xl border p-5 ${
                    stat.tone === 'primary'
                      ? 'bg-[#FAFDEB]'
                      : 'border-slate-200 bg-[#F8FAFC]'
                  }`}
                  style={
                    stat.tone === 'primary'
                      ? { borderColor: 'color-mix(in srgb, var(--school-accent, #B5E61D) 35%, white)' }
                      : undefined
                  }
                >
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[#101820]">{stat.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{stat.helper}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
            <div className="flex items-center gap-3">
              <DashboardIconFrame>
                <CompassIcon />
              </DashboardIconFrame>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Future AI insights
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[#101820]">Personal learning intelligence</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <InsightPlaceholder
                title="Learning strengths"
                description="A future insight area for subjects and habits where the student is performing strongly."
              />
              <InsightPlaceholder
                title="Areas to improve"
                description="A future summary space for support priorities, gaps in understanding, and teacher follow-up."
              />
              <InsightPlaceholder
                title="Recommended activities"
                description="A future recommendation area for labs, assignments, and guided practice based on learning patterns."
              />
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Recent activity
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#101820]">Learning timeline</h2>
          </div>
          <Link
            to="/student/my-activities"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:opacity-80"
          >
            Open activity center
            <ArrowIcon />
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {timelineItems.map((item) => (
            <div key={`${item.title}-${item.description}`} className="flex gap-4 rounded-3xl border border-slate-200 p-4">
              <TimelineDot />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#101820]">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{item.meta}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-6 rounded-3xl bg-[#FAFDEB] p-4"
          style={{ border: '1px solid color-mix(in srgb, var(--school-accent, #B5E61D) 35%, white)' }}
        >
          <p className="text-sm font-semibold text-[#101820]">Need extra support?</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Explore the support-guidance space if you need learning accommodations or extra help.
          </p>
          <Link
            to="/student/support-needs"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#101820]"
          >
            Visit support needs
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}

function LearningColumn({
  title,
  content,
  tone,
}: {
  title: string;
  content: React.ReactNode;
  tone: 'default' | 'soft' | 'subtle';
}) {
  const toneClassName =
    tone === 'soft'
      ? 'border-[#E9EEF4] bg-[#FBFCFD]'
      : tone === 'subtle'
        ? 'border-[#EDF2D0] bg-[#FCFDEC]'
        : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-[24px] border p-4 ${toneClassName}`}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      <div className="mt-4 space-y-3">{content}</div>
    </div>
  );
}

function AssignmentTile({
  title,
  subtitle,
  meta,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  meta: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#101820]">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{meta}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:opacity-80"
      >
        {actionLabel}
        <ArrowIcon />
      </button>
    </div>
  );
}

function StateText({ text, tone = 'default' }: { text: string; tone?: 'default' | 'error' }) {
  return (
    <p className={`rounded-2xl border px-4 py-4 text-sm ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>
      {text}
    </p>
  );
}

function InsightPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4">
      <p className="text-sm font-semibold text-[#101820]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
