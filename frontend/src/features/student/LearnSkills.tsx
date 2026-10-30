import { PageHeader } from "../../components/ui/Saas";
import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  Check,
  CheckCheck,
  ChevronRight,
  CirclePlay,
  Clock3,
  CodeXml,
  Clapperboard,
  Compass,
  DraftingCompass,
  GraduationCap,
  HeartPulse,
  Layers3,
  Microscope,
  PenTool,
  Search,
  ShieldCheck,
  Speech,
  Sprout,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { skillsApi } from '../../api/skills.api';
import { useAuthStore } from '../../store/auth.store';
import type { SkillCourse, SkillEnrollment } from '../../types';
import { courseLessons, hasWorkspaceAccess, summarizeSkillProgress } from './skill-workspace/workspace-mode';

type LearningView = 'my' | 'explore' | 'completed';
type Progress = ReturnType<typeof summarizeSkillProgress>;
interface LearningCourse {
  course: SkillCourse;
  enrollment?: SkillEnrollment;
  progress?: Progress;
  progressLoading: boolean;
  progressError: boolean;
  retryProgress: () => void;
  complete: boolean;
}
const CONTROL =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-[#101820] outline-none focus:ring-2 focus:ring-[#607D00] focus:ring-offset-2';
const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#607D00] focus-visible:ring-offset-2';
const LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  REQUESTED: 'Enrollment requested',
  AWAITING_PAYMENT: 'Awaiting payment',
  REJECTED: 'Enrollment declined',
  CANCELLED: 'Enrollment cancelled',
};

export function LearnSkillsPage() {
  const userId = useAuthStore((state) => state.user?.id);
  const [view, setView] = useState<LearningView | 'auto'>('auto');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const coursesQuery = useQuery({
    queryKey: ['skill-courses', userId],
    queryFn: () => skillsApi.getCourses(),
    enabled: Boolean(userId),
  });
  const enrollmentsQuery = useQuery({
    queryKey: ['skill-enrollments', userId],
    queryFn: skillsApi.getStudentEnrollments,
    enabled: Boolean(userId),
  });
  const courses = coursesQuery.data ?? [];
  const enrollments = enrollmentsQuery.data ?? [];
  const enrollmentByCourse = new Map(enrollments.map((item) => [item.courseId, item]));
  // Do not request progress for untouched free courses: that GET endpoint can
  // create an enrollment. Reading this page must not enroll students in bulk.
  const enrolledCourses = courses.filter((course) =>
    ['ACTIVE', 'COMPLETED'].includes(enrollmentByCourse.get(course.id)?.status ?? ''),
  );
  const progressQueries = useQueries({
    queries: enrolledCourses.map((course) => ({
      queryKey: ['skill-course-progress', course.id, userId],
      queryFn: () => skillsApi.getCourseProgress(course.id),
      enabled: Boolean(userId && enrollmentsQuery.isSuccess && !enrollmentsQuery.isError),
    })),
  });
  const learning: LearningCourse[] = courses.map((course) => {
    const enrollment = enrollmentByCourse.get(course.id);
    const index = enrolledCourses.findIndex((item) => item.id === course.id);
    const query = index >= 0 ? progressQueries[index] : undefined;
    const progress =
      query?.isSuccess && !query.isError ? summarizeSkillProgress(course, query.data) : undefined;
    return {
      course,
      enrollment,
      progress,
      progressLoading: Boolean(query?.isPending),
      progressError: Boolean(query?.isError),
      retryProgress: () => {
        void query?.refetch();
      },
      complete:
        enrollment?.status === 'COMPLETED' || Boolean(progress && progress.completed === progress.total),
    };
  });
  const myLearning = learning.filter((item) => item.enrollment && !item.complete);
  const completed = learning.filter((item) => item.complete);
  const activeView =
    view === 'auto' ? (myLearning.length ? 'my' : completed.length ? 'completed' : 'explore') : view;
  const categories = useMemo(
    () =>
      Array.from(new Map(courses.map((course) => [course.categoryId, course.category])).values()).sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    [courses],
  );
  const group = activeView === 'my' ? myLearning : activeView === 'completed' ? completed : learning;
  const visible = group.filter(
    (item) =>
      (!categoryId || String(item.course.categoryId) === categoryId) &&
      `${item.course.title} ${item.course.category.name} ${item.course.shortDescription}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const resume = learning
    .filter((item) => item.enrollment?.status === 'ACTIVE' && !item.complete && item.progress)
    .sort((a, b) => (b.progress?.latestActivity ?? 0) - (a.progress?.latestActivity ?? 0))[0];
  const loading = coursesQuery.isLoading || enrollmentsQuery.isLoading;
  const error = coursesQuery.isError || enrollmentsQuery.isError;
  const counts = { my: myLearning.length, explore: learning.length, completed: completed.length };
  const filtering = Boolean(search || categoryId);
  const progressPending = progressQueries.some((query) => query.isPending);
  const progressFailed = progressQueries.some((query) => query.isError);
  const waitingForProgress = progressPending || progressFailed;
  const lessonsCompleted = learning.reduce((sum, item) => sum + (item.progress?.completed ?? 0), 0);

  function clearFilters() {
    setSearch('');
    setCategoryId('');
  }
  function retry() {
    void coursesQuery.refetch();
    void enrollmentsQuery.refetch();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <PageHeader title="Learn a Skill" />

      {!loading && !error && (myLearning.length > 0 || completed.length > 0) ? (
        <>
          <section className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Learning summary">
            <LearningStat
              icon={Layers3}
              label="My learning"
              value={waitingForProgress ? '–' : String(myLearning.length)}
            />
            <LearningStat
              icon={BookOpenCheck}
              label="Lessons done"
              value={waitingForProgress ? '–' : String(lessonsCompleted)}
            />
            <LearningStat
              icon={CheckCheck}
              label="Completed"
              value={waitingForProgress ? '–' : String(completed.length)}
            />
          </section>
          {resume ? <ResumeLearning item={resume} /> : null}
        </>
      ) : null}

      <section
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        aria-label="Find a skill"
      >
        <div
          className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
          role="group"
          aria-label="Learning views"
        >
          {(
            [
              { value: 'my', label: 'My learning', icon: BookOpen },
              { value: 'explore', label: 'Explore skills', icon: Compass },
              { value: 'completed', label: 'Completed', icon: CheckCheck },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={activeView === value}
              onClick={() => {
                setView(value);
                clearFilters();
              }}
              className={`flex min-h-12 flex-wrap items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-xs font-semibold transition sm:gap-2 sm:px-3 sm:text-sm ${FOCUS} ${activeView === value ? 'bg-[#101820] text-white shadow-sm' : 'text-slate-600 hover:bg-white/80'}`}
            >
              <Icon className="hidden h-4 w-4 sm:block" aria-hidden="true" />
              <span>{label}</span>
              <span
                className={`rounded-md px-1.5 text-[11px] ${activeView === value ? 'bg-white/15' : 'bg-white'}`}
              >
                {loading || error || (value !== 'explore' && waitingForProgress) ? '–' : counts[value]}
              </span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <label htmlFor="skill-search" className="mb-1.5 block text-xs font-semibold text-slate-600">
              Search skills
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="skill-search"
                type="search"
                placeholder="Search a skill or topic"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${CONTROL} pl-10`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="skill-category" className="mb-1.5 block text-xs font-semibold text-slate-600">
              Category
            </label>
            <select
              id="skill-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={CONTROL}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p role="status" className="text-slate-500">
            {loading
              ? 'Loading your skills…'
              : error
                ? 'Learning information unavailable'
                : `${visible.length} ${visible.length === 1 ? 'course' : 'courses'}${activeView === 'my' ? ' in your learning' : activeView === 'completed' ? ' completed' : ' to explore'}`}
          </p>
          {filtering ? (
            <button
              type="button"
              onClick={clearFilters}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-[#466000] ${FOCUS}`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      {!loading && !error && progressFailed ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
        >
          Some saved progress could not be loaded. Completion totals are unavailable until it is restored.{' '}
          <button
            type="button"
            onClick={() => {
              progressQueries
                .filter((query) => query.isError)
                .forEach((query) => {
                  void query.refetch();
                });
            }}
            className={`min-h-11 rounded-lg px-1 font-semibold underline ${FOCUS}`}
          >
            Retry saved progress
          </button>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>
            Your courses and enrollment details could not be loaded. Try again to see the right learning
            options.
          </p>
          <button
            type="button"
            onClick={retry}
            disabled={coursesQuery.isFetching || enrollmentsQuery.isFetching}
            className={`mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 font-semibold disabled:opacity-50 ${FOCUS}`}
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div role="status" aria-label="Loading skill courses" className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((id) => (
            <div key={id} className="h-60 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : !visible.length ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <Compass className="mx-auto h-9 w-9 text-[#607D00]" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#101820]">
            {filtering
              ? 'No skills match your filters'
              : activeView === 'completed' && progressPending
                ? 'Checking completed courses…'
                : activeView === 'completed' && progressFailed
                  ? 'Completion records unavailable'
                  : activeView === 'my'
                    ? 'Choose your first skill'
                    : activeView === 'completed'
                      ? 'Your completed courses will appear here'
                      : 'No skills available yet'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            {filtering
              ? 'Try another topic or clear your filters.'
              : activeView === 'completed'
                ? 'Complete the lessons in a course, then return here to revisit them.'
                : 'Explore the available courses and open a lesson when you are ready.'}
          </p>
          {filtering ? (
            <button
              type="button"
              onClick={clearFilters}
              className={`mt-5 min-h-11 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white ${FOCUS}`}
            >
              Clear filters
            </button>
          ) : activeView !== 'explore' ? (
            <button
              type="button"
              onClick={() => {
                setView('explore');
                clearFilters();
              }}
              className={`mt-5 min-h-11 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white ${FOCUS}`}
            >
              Explore skills
            </button>
          ) : null}
        </section>
      ) : (
        <section aria-label="Skill courses" className="grid items-stretch gap-4 md:grid-cols-2">
          {visible.map((item) => (
            <CourseCard key={item.course.id} item={item} />
          ))}
        </section>
      )}

    </div>
  );
}

function LearningStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F5E3] text-[#526B00]">
        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div>
        <p className="text-xl font-semibold text-[#101820]">{value}</p>
        <p className="text-xs leading-5 text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function ResumeLearning({ item }: { item: LearningCourse }) {
  const { course, progress } = item;
  if (!progress) return null;
  const visual = skillVisual(course);
  const Icon = visual.icon;
  return (
    <section
      aria-label="Continue learning"
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 text-slate-900 sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Icon className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {progress.hasActivity ? 'Continue learning' : 'Ready for your first lesson'}
            </p>
            <h2 className="mt-2 break-words text-xl font-semibold">{course.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Next: {progress.nextLesson?.title}</p>
          </div>
        </div>
        <Link
          to={`/student/learn-skills/${course.id}/workspace`}
          className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white ${FOCUS}`}
        >
          {progress.hasActivity ? 'Continue learning' : 'Start learning'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ProgressBar progress={progress} title={course.title} />
        <p className="text-xs text-slate-500">
          {progress.completed} of {progress.total} lessons completed
        </p>
      </div>
    </section>
  );
}

function CourseCard({ item }: { item: LearningCourse }) {
  const { course, enrollment, progress, complete, progressLoading, progressError } = item;
  const visual = skillVisual(course);
  const Icon = visual.icon;
  const access = hasWorkspaceAccess({ ...course, enrollment });
  const action = access
    ? complete
      ? 'Review lessons'
      : progress?.hasActivity
        ? 'Continue'
        : enrollment && (progressLoading || progressError)
          ? 'Open workspace'
          : 'Start learning'
    : enrollment
      ? 'View enrollment'
      : 'View course';
  const destination = `/student/learn-skills/${course.id}${access ? '/workspace' : ''}`;
  const outcome =
    course.learningOutcomes?.find((value) => typeof value === 'string' && value.trim()) ||
    course.shortDescription;
  const count = courseLessons(course).length;
  return (
    <article
      aria-labelledby={`skill-title-${course.id}`}
      className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${visual.color}`}
        >
          <Icon className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${complete ? 'bg-lime-50 text-[#466000]' : enrollment && !access ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
        >
          {complete ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Completed
            </>
          ) : enrollment && !access ? (
            (LABELS[enrollment.status] ?? 'Enrollment pending')
          ) : enrollment ? (
            'My learning'
          ) : course.costKES === 0 ? (
            'Included'
          ) : (
            `KES ${course.costKES.toLocaleString()}`
          )}
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500">{course.category.name}</p>
      <h2
        id={`skill-title-${course.id}`}
        className="mt-1 break-words text-lg font-semibold leading-7 text-[#101820]"
      >
        {course.title}
      </h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{outcome}</p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          {LABELS[course.level] ?? course.level}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {count} {count === 1 ? 'lesson' : 'lessons'}
        </span>
        {course.durationWeeks > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {course.durationWeeks} weeks
          </span>
        ) : null}
      </div>
      <div className="mt-auto pt-5">
        {progressError ? (
          <div role="status" className="mb-4 text-xs text-amber-800">
            Progress unavailable.{' '}
            <button
              type="button"
              onClick={item.retryProgress}
              className={`min-h-11 rounded-md px-1 font-semibold underline ${FOCUS}`}
            >
              Retry progress<span className="sr-only"> for {course.title}</span>
            </button>
          </div>
        ) : progressLoading ? (
          <p className="mb-4 text-xs text-slate-500" role="status">
            Loading saved progress…
          </p>
        ) : progress ? (
          <div className="mb-4">
            <div className="mb-2 flex justify-between gap-2 text-xs text-slate-500">
              <span>
                {progress.completed} of {progress.total} lessons completed
              </span>
              <span>{progress.percent}%</span>
            </div>
            <ProgressBar progress={progress} title={course.title} />
          </div>
        ) : enrollment && !access ? (
          <p className="mb-4 text-xs leading-5 text-amber-800">
            {enrollment.status === 'AWAITING_PAYMENT'
              ? 'Payment is required before the lessons open.'
              : enrollment.status === 'REQUESTED'
                ? 'Your enrollment request is awaiting review.'
                : 'Open your enrollment details to check access.'}
          </p>
        ) : !access ? (
          <p className="mb-4 text-xs text-slate-500">Check course access before requesting enrollment.</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={destination}
            aria-label={`${action}: ${course.title}`}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white hover:bg-[#1D2C38] ${FOCUS}`}
          >
            {access && !complete ? <CirclePlay className="h-4 w-4" aria-hidden="true" /> : null}
            {action}
            {complete ? (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            )}
          </Link>
          {access ? (
            <Link
              to={`/student/learn-skills/${course.id}`}
              aria-label={`Course details: ${course.title}`}
              className={`inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 ${FOCUS}`}
            >
              Details
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ProgressBar({
  progress,
  title,
  dark = false,
}: {
  progress: Progress;
  title: string;
  dark?: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-label={`Lesson completion: ${title}`}
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.completed}
      aria-valuetext={`${progress.completed} of ${progress.total} lessons completed`}
      className={`h-1.5 min-w-[100px] flex-1 overflow-hidden rounded-full ${dark ? 'bg-white/15' : 'bg-slate-100'}`}
    >
      <div
        className="h-full rounded-full bg-slate-700 transition-[width]"
        style={{ width: `${progress.percent}%` }}
      />
    </div>
  );
}

function skillVisual(course: SkillCourse): { icon: LucideIcon; color: string } {
  const name = `${course.title} ${course.category.name}`.toLowerCase();
  if (/robot|arduino|mechatronic/.test(name))
    return { icon: Bot, color: 'bg-violet-50 text-violet-700 ring-violet-100' };
  if (/machine learning|artificial intelligence|\bai\b|\bml\b|data science/.test(name))
    return { icon: BrainCircuit, color: 'bg-indigo-50 text-indigo-700 ring-indigo-100' };
  if (/first aid|health|medical/.test(name))
    return { icon: HeartPulse, color: 'bg-rose-50 text-rose-700 ring-rose-100' };
  if (/cyber|security|safety/.test(name))
    return { icon: ShieldCheck, color: 'bg-teal-50 text-teal-700 ring-teal-100' };
  if (/cad|fabrication|construction/.test(name))
    return { icon: DraftingCompass, color: 'bg-orange-50 text-orange-700 ring-orange-100' };
  if (/video|film|editing/.test(name))
    return { icon: Clapperboard, color: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100' };
  if (/python|coding|program|software/.test(name))
    return { icon: CodeXml, color: 'bg-sky-50 text-sky-700 ring-sky-100' };
  if (/research|laboratory|science/.test(name))
    return { icon: Microscope, color: 'bg-cyan-50 text-cyan-700 ring-cyan-100' };
  if (/speak|communication|presentation/.test(name))
    return { icon: Speech, color: 'bg-amber-50 text-amber-700 ring-amber-100' };
  if (/agricultur|garden|farm/.test(name))
    return { icon: Sprout, color: 'bg-emerald-50 text-emerald-700 ring-emerald-100' };
  if (/design|art|creative|craft/.test(name))
    return { icon: PenTool, color: 'bg-purple-50 text-purple-700 ring-purple-100' };
  return { icon: Compass, color: 'bg-lime-50 text-[#526B00] ring-lime-100' };
}
