import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { ActionCard, EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v14.5A1.5 1.5 0 0 0 17.5 17H7.5A2.5 2.5 0 0 0 5 19.5v-13Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.5 4A2.5 2.5 0 0 0 5 6.5V20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M7 12h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StudentDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['assignments', user?.schoolId],
    queryFn: () => assignmentsApi.findAll(),
  });

  const published = (assignments ?? []).filter((assignment) => assignment.isPublished);
  const latestAssignment = [...published].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const firstName = user?.name?.split(' ')[0] ?? 'Student';
  const gradeLabel = user?.grade ? `Grade ${user.grade}` : 'Grade pending';

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${firstName}`} meta={gradeLabel} />

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Assignments available" value={isLoading ? '-' : published.length} />
        <MetricCard label="Learning level" value={gradeLabel} />
      </section>

      <ActionCard
        title="Continue learning"
        meta={latestAssignment?.subject}
        icon={<BookIcon />}
        action={
          <Link to="/student/my-assignments" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-slate-50">
            View all
            <ArrowIcon />
          </Link>
        }
      >
        {isLoading ? (
          <EmptyState title="Loading assignments..." />
        ) : error ? (
          <EmptyState title="Assignments are temporarily unavailable." />
        ) : latestAssignment ? (
          <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[#101820]">{latestAssignment.title}</p>
              <p className="mt-1 text-sm text-slate-500">{latestAssignment.totalMarks} marks</p>
            </div>
            <Link to={`/student/assignments/${latestAssignment.id}`} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white">
              Open assignment
              <ArrowIcon />
            </Link>
          </div>
        ) : (
          <EmptyState title="No assignments available yet." />
        )}
      </ActionCard>
    </div>
  );
}
