import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage } from '../../api/axios';
import { paymentApi } from '../../api/subscriptions.api';
import { skillsApi } from '../../api/skills.api';
import { EmptyState } from '../../components/ui/Saas';

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
  const paymentProvidersQuery = useQuery({ queryKey: ['billing-providers'], queryFn: paymentApi.getProviders });

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

  return (
    <div className="space-y-6 pb-10">
      <Link to="/student/learn-skills" className="inline-flex text-sm font-semibold text-slate-500">Back to skills</Link>

      <section className="overflow-hidden rounded-[28px] bg-[#101820] text-white shadow-[0_20px_50px_rgba(16,24,32,0.16)]">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B5E61D]">{course.category.name}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{course.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{course.shortDescription}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <HeroFact label="Duration" value={`${course.durationWeeks} weeks`} />
              <HeroFact label="Level" value={label(course.level)} />
              <HeroFact label="Provider" value={course.provider.name} />
              <HeroFact label="Certificate" value={course.certificateAvailable ? 'Available' : 'Not included'} />
              <HeroFact label="Cost" value={formatCurrency(course.costKES)} />
              <HeroFact label="Enrollment" value={enrollment ? label(enrollment.status) : 'Available'} />
            </div>
          </div>
          <div className="min-h-56 bg-slate-800">
            {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full min-h-56 items-center justify-center text-6xl font-semibold text-white/20">{course.title.charAt(0)}</div>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <DetailSection title="What you will learn" items={course.learningOutcomes ?? []} fallback={course.fullDescription} />
          <DetailSection title="Course structure" items={course.courseStructure ?? []} fallback="Course structure will be provided by the training provider." />
          <section className="rounded-[24px] border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-[#101820]">Training provider</h2>
            <div className="mt-4 flex items-center gap-4">
              {course.provider.logoUrl ? <img src={course.provider.logoUrl} alt={course.provider.name} className="h-14 w-20 rounded-xl object-contain" /> : null}
              <div><p className="font-semibold text-[#101820]">{course.provider.name}</p>{course.provider.verified ? <p className="mt-1 text-xs font-semibold text-emerald-700">Verified provider</p> : null}</div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
          <p className="text-sm text-slate-500">Course fee</p>
          <p className="mt-2 text-3xl font-semibold text-[#101820]">{formatCurrency(course.costKES)}</p>
          {enrollment ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">Enrollment status</p><p className="mt-2 font-semibold text-[#101820]">{label(enrollment.status)}</p><p className="mt-1 text-sm text-slate-500">Payment: {label(enrollment.paymentStatus)}</p></div>
          ) : (
            <button type="button" onClick={() => enrollmentMutation.mutate()} disabled={enrollmentMutation.isPending} className="mt-5 w-full rounded-xl bg-[#B5E61D] px-5 py-3 text-sm font-semibold text-[#101820] disabled:opacity-50">{enrollmentMutation.isPending ? 'Requesting...' : 'Request enrollment'}</button>
          )}
          {enrollmentMutation.isError ? <p className="mt-3 text-sm text-red-700">{apiErrorMessage(enrollmentMutation.error, 'Enrollment request failed')}</p> : null}

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Parent payment methods</p>
            <div className="mt-3 space-y-2">
              {(paymentProvidersQuery.data ?? []).map((provider) => (
                <div key={provider.method} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  {provider.logoUrl ? <img src={provider.logoUrl} alt={provider.displayName} className="h-8 w-14 rounded object-cover" /> : null}
                  <div><p className="text-sm font-semibold text-[#101820]">{provider.displayName}</p><p className="text-xs text-slate-400">{provider.isActive ? 'Available' : 'Not currently enabled'}</p></div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function HeroFact({ label: factLabel, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wider text-white/40">{factLabel}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>;
}

function DetailSection({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return <section className="rounded-[24px] border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold text-[#101820]">{title}</h2>{items.length > 0 ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{item}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-slate-600">{fallback}</p>}</section>;
}
