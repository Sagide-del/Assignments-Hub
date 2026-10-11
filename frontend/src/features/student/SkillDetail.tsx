import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage } from '../../api/axios';
import { skillsApi } from '../../api/skills.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';
import { hasWorkspaceAccess, workspaceModeForCourse } from './skill-workspace/workspace-mode';

function formatCurrency(value: number) {
  return value === 0 ? 'Free' : `KES ${value.toLocaleString()}`;
}

function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

export function SkillDetailPage() {
  const courseId = Number(useParams<{ id: string }>().id);
  const queryClient = useQueryClient();
  const courseQuery = useQuery({ queryKey: ['skill-course', courseId], queryFn: () => skillsApi.getCourse(courseId), enabled: Number.isInteger(courseId) });

  const enrollmentMutation = useMutation({
    mutationFn: () => skillsApi.requestEnrollment(courseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['skill-course', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['skill-enrollments'] }),
      ]);
    },
  });

  if (courseQuery.isLoading) return <EmptyState title="Loading course..." />;
  if (courseQuery.isError || !courseQuery.data) return <EmptyState title="Course not available." action={<Link to="/student/learn-skills" className="font-semibold text-[#101820]">Back to skills</Link>} />;

  const course = courseQuery.data;
  const enrollment = course.enrollment;
  const workspaceMode = workspaceModeForCourse(course);
  const workspaceAvailable = workspaceMode && hasWorkspaceAccess(course);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={course.title} meta={`${course.category.name} · ${label(course.level)}`} />
        <Link to="/student/learn-skills" className="text-sm font-semibold text-slate-500">Back to skills</Link>
      </div>

      <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <section className="rounded-[22px] border border-slate-200 bg-white p-6">
            <p className="text-sm leading-6 text-slate-600">{course.shortDescription}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
              <CourseFact label="Duration" value={`${course.durationWeeks} weeks`} />
              <CourseFact label="Provider" value={course.provider.name} />
              <CourseFact label="Certificate" value={course.certificateAvailable ? 'Available' : 'Not included'} />
              <CourseFact label="Cost" value={formatCurrency(course.costKES)} />
            </div>
          </section>
          <DetailSection title="What you will learn" items={course.learningOutcomes ?? []} fallback={course.fullDescription} />
          <DetailSection title="Course structure" items={course.courseStructure ?? []} fallback="Course structure will be provided by the training provider." />
        </div>

        <aside className="h-fit rounded-[22px] border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Course access</p>
          {enrollment ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">Enrollment</p><p className="mt-1 font-semibold text-[#101820]">{label(enrollment.status)}</p><p className="mt-1 text-sm text-slate-500">Payment: {label(enrollment.paymentStatus)}</p></div>
          ) : (
            <button type="button" onClick={() => enrollmentMutation.mutate()} disabled={enrollmentMutation.isPending} className="mt-5 w-full rounded-xl bg-[#B5E61D] px-5 py-3 text-sm font-semibold text-[#101820] disabled:opacity-50">{enrollmentMutation.isPending ? 'Requesting...' : 'Request enrollment'}</button>
          )}
          {enrollmentMutation.isError ? <p className="mt-3 text-sm text-red-700">{apiErrorMessage(enrollmentMutation.error, 'Enrollment request failed')}</p> : null}
          {workspaceAvailable ? <Link to={`/student/learn-skills/${course.id}/workspace`} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white">Open workspace</Link> : null}
          {workspaceMode && !workspaceAvailable ? <p className="mt-4 text-sm text-slate-500">The practical workspace opens when enrollment is active.</p> : null}
        </aside>
      </section>
    </div>
  );
}

function DetailSection({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return <section className="rounded-[24px] border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold text-[#101820]">{title}</h2>{items.length > 0 ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{item}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-slate-600">{fallback}</p>}</section>;
}

function CourseFact({ label: factLabel, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-400">{factLabel}</p><p className="mt-1 break-words text-sm font-semibold text-[#101820]">{value}</p></div>;
}
