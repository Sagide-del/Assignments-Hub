import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 17 17 7M9 7h8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function MyActivitiesPage() {
  const user = useAuthStore((state) => state.user);
  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['assignments', user?.schoolId],
    queryFn: () => assignmentsApi.findAll(),
  });

  const publishedAssignments = (assignments ?? []).filter((assignment) => assignment.isPublished);
  const subjectCount = new Set(publishedAssignments.map((assignment) => assignment.subject)).size;
  const recentAcademicEvents = useMemo(
    () =>
      [...publishedAssignments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [publishedAssignments],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="My Activity" />

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Available activities" value={isLoading ? '-' : publishedAssignments.length} compact />
        <MetricCard label="Subjects" value={isLoading ? '-' : subjectCount} compact />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(16,24,32,0.05)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[#101820]">Recent activity</h2>
          <Link
            to="/student/my-assignments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#101820] hover:opacity-75"
          >
            Open assignments
            <ArrowIcon />
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <EmptyState title="Loading activity..." />
          ) : error ? (
            <EmptyState title="Activity is temporarily unavailable." />
          ) : recentAcademicEvents.length === 0 ? (
            <EmptyState title="No activity available yet." />
          ) : (
            recentAcademicEvents.map((assignment) => (
              <article
                key={assignment.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#101820]">{assignment.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {assignment.subject} · {formatDate(assignment.createdAt)}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-slate-600">
                  Assignment published
                </span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
