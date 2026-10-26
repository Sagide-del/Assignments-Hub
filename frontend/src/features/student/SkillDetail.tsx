import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Images, MessageCircle, ShieldPlus } from 'lucide-react';
import { apiErrorMessage } from '../../api/axios';
import { skillsApi } from '../../api/skills.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';
import { courseLessons, hasWorkspaceAccess } from './skill-workspace/workspace-mode';
function label(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
export function SkillDetailPage() {
  const courseId = Number(useParams<{ id: string }>().id);
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const courseQuery = useQuery({
    queryKey: ['skill-course', courseId, userId],
    queryFn: () => skillsApi.getCourse(courseId),
    enabled: Number.isInteger(courseId) && courseId > 0 && Boolean(userId),
  });
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
  if (courseQuery.isError || !courseQuery.data)
    return (
      <EmptyState
        title="Course not available."
        action={
          <Link to="/student/learn-skills" className="font-semibold text-[#101820]">
            Back to skills
          </Link>
        }
      />
    );
  const course = courseQuery.data;
  const enrollment = course.enrollment;
  const access = hasWorkspaceAccess(course);
  const lessons = courseLessons(course);
  const firstAid =
    lessons.find((lesson) => lesson.learning?.firstAid && lesson.key.endsWith('-fainting')) ??
    lessons.find((lesson) => lesson.learning?.firstAid);
  const cover = firstAid?.learning?.image;
  const scenarios = lessons.reduce(
    (total, lesson) => total + (lesson.learning?.firstAid?.scenarios.length ?? 0),
    0,
  );
  const destination = (key: string) =>
    `/student/learn-skills/${course.id}/workspace?lesson=${encodeURIComponent(key)}`;
  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={course.title} meta={`${course.category.name} · ${label(course.level)}`} />
        <Link
          to="/student/learn-skills"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500"
        >
          Back to skills
        </Link>
      </div>
      {firstAid && cover ? (
        <section
          aria-label="First aid learning overview"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="grid lg:grid-cols-2">
            <img
              src={cover.src}
              alt={cover.alt}
              width={cover.width}
              height={cover.height}
              className="h-full max-h-[420px] w-full object-cover"
            />
            <div className="p-5 sm:p-7">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#607D00]">
                <ShieldPlus className="h-4 w-4" aria-hidden="true" />
                Illustrated first-aid learning
              </p>
              <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-[#101820]">
                Recognise the situation.
                <br />
                Understand the next step.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Work through school-based situations with an illustrated scene, a response guide and explained
                decisions. Learn what to do, what to avoid and when urgent help is needed.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2">
                  <Images className="h-4 w-4 text-[#607D00]" aria-hidden="true" />
                  {lessons.length} illustrated lessons
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2">
                  <MessageCircle className="h-4 w-4 text-[#607D00]" aria-hidden="true" />
                  {scenarios} situation exercises
                </span>
              </div>
              {access ? (
                <Link
                  to={destination(firstAid.key)}
                  className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white"
                >
                  Open the fainting lesson
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
              <p className="mt-4 text-xs leading-6 text-slate-500">
                Introductory education, not a first-aid qualification. A qualified first-aid instructor should
                review this material before formal training use. Illustration, not a clinical assessment.
              </p>
            </div>
          </div>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid gap-5 border-b border-slate-200 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div className="min-w-0">
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              {firstAid
                ? 'Each lesson combines recognition signs, response steps with reasons, actions to avoid, urgent warning signs and scenario practice.'
                : course.shortDescription}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              <CourseFact label="Lessons" value={String(lessons.length)} />
              <CourseFact label="Pace" value={firstAid ? 'Self-paced' : `${course.durationWeeks} weeks`} />
              <CourseFact label="Provider" value={course.provider.name} />
              <CourseFact
                label="Access"
                value={course.costKES === 0 ? 'Included' : `KES ${course.costKES.toLocaleString()}`}
              />
            </div>
          </div>
          <div>
            {access ? (
              <Link
                to={`/student/learn-skills/${course.id}/workspace`}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white"
              >
                Open learning path
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : enrollment ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-semibold text-[#101820]">{label(enrollment.status)}</span>
                <span className="ml-2 text-slate-500">Payment {label(enrollment.paymentStatus)}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => enrollmentMutation.mutate()}
                disabled={enrollmentMutation.isPending}
                className="min-h-12 w-full rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] disabled:opacity-50"
              >
                {enrollmentMutation.isPending ? 'Requesting...' : 'Request enrollment'}
              </button>
            )}
            {enrollmentMutation.isError ? (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {apiErrorMessage(enrollmentMutation.error, 'Enrollment request failed')}
              </p>
            ) : null}
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#101820]">Your lesson path</h2>
          <div className="mt-4 space-y-3">
            {lessons.map((lesson, index) => (
              <article
                key={lesson.key}
                aria-labelledby={`course-lesson-${lesson.key}`}
                className="flex min-w-0 flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
              >
                {firstAid && lesson.learning?.image ? (
                  <img
                    src={lesson.learning.image.src}
                    alt=""
                    width={144}
                    height={96}
                    loading="lazy"
                    className="h-24 w-36 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-50 text-[#607D00]">
                    <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#607D00]">
                    Lesson {index + 1}
                    {lesson.learning ? ` · About ${lesson.learning.minutes} min` : ''}
                  </p>
                  <h3
                    id={`course-lesson-${lesson.key}`}
                    className="mt-1 break-words text-sm font-semibold leading-7 text-[#101820]"
                  >
                    {lesson.title}
                  </h3>
                  {lesson.description ? (
                    <p className="mt-1 text-xs leading-6 text-slate-600">{lesson.description}</p>
                  ) : null}
                </div>
                {access ? (
                  <Link
                    to={destination(lesson.key)}
                    aria-label={`${lesson.learning ? 'Open lesson' : 'View outline'}: ${lesson.title}`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#101820] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#607D00]"
                  >
                    {lesson.learning ? 'Open lesson' : 'View outline'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
function CourseFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#101820]">{value}</p>
    </div>
  );
}
