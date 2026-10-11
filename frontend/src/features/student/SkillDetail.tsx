import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage } from '../../api/axios';
import { skillsApi } from '../../api/skills.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';
import { courseLessons, hasWorkspaceAccess } from './skill-workspace/workspace-mode';

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
  const workspaceAvailable = hasWorkspaceAccess(course);
  const lessons = courseLessons(course);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={course.title} meta={`${course.category.name} · ${label(course.level)}`} />
        <Link to="/student/learn-skills" className="text-sm font-semibold text-slate-500">Back to skills</Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid gap-5 border-b border-slate-200 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div className="min-w-0">
            <p className="max-w-3xl text-sm leading-6 text-slate-600">{course.shortDescription}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              <CourseFact label="Lessons" value={String(lessons.length)} />
              <CourseFact label="Duration" value={`${course.durationWeeks} weeks`} />
              <CourseFact label="Provider" value={course.provider.name} />
              <CourseFact label="Access" value={formatCurrency(course.costKES)} />
            </div>
          </div>
          <div>
            {workspaceAvailable ? (
              <Link to={`/student/learn-skills/${course.id}/workspace`} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white">Start learning</Link>
            ) : enrollment ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="font-semibold text-[#101820]">{label(enrollment.status)}</span><span className="ml-2 text-slate-500">Payment {label(enrollment.paymentStatus)}</span></div>
            ) : (
              <button type="button" onClick={() => enrollmentMutation.mutate()} disabled={enrollmentMutation.isPending} className="min-h-12 w-full rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] disabled:opacity-50">{enrollmentMutation.isPending ? 'Requesting...' : 'Request enrollment'}</button>
            )}
            {enrollmentMutation.isError ? <p className="mt-2 text-sm text-red-700">{apiErrorMessage(enrollmentMutation.error, 'Enrollment request failed')}</p> : null}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[#101820]">Lessons</h2>
          <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {lessons.map((lesson, index) => (
              <div key={lesson.key} className="flex min-h-14 items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-[#101820]">{lesson.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{label(lesson.type)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CourseFact({ label: factLabel, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{factLabel}</p><p className="mt-1 break-words text-sm font-semibold text-[#101820]">{value}</p></div>;
}
