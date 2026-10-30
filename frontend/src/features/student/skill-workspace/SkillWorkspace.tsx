import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { skillsApi } from '../../../api/skills.api';
import { EmptyState } from '../../../components/ui/Saas';
import type { SkillCourse } from '../../../types';
import { courseLessons, hasWorkspaceAccess, workspaceModeForCourse } from './workspace-mode';
import { LessonWorkspace } from './LessonWorkspace';

export function SkillWorkspacePage() {
  const courseId = Number(useParams<{ id: string }>().id);
  const [params] = useSearchParams();
  const initialLessonKey = params.get('lesson');
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const courseQuery = useQuery({
    queryKey: ['skill-course', courseId, userId],
    queryFn: () => skillsApi.getCourse(courseId),
    enabled: Number.isInteger(courseId) && courseId > 0,
  });
  const course = courseQuery.data;
  const canAccess = Boolean(course && hasWorkspaceAccess(course));
  const progressQuery = useQuery({
    queryKey: ['skill-course-progress', courseId, userId],
    queryFn: () => skillsApi.getCourseProgress(courseId),
    enabled: canAccess,
  });
  useEffect(() => {
    if (progressQuery.isSuccess) void queryClient.invalidateQueries({ queryKey: ['skill-enrollments'] });
  }, [progressQuery.isSuccess, progressQuery.dataUpdatedAt, queryClient]);
  if (courseQuery.isLoading) return <EmptyState title="Loading learning workspace..." />;
  if (courseQuery.isError || !course)
    return (
      <EmptyState
        title="Course not available."
        action={<Link to="/student/learn-skills">Back to skills</Link>}
      />
    );
  if (!canAccess)
    return (
      <EmptyState
        title="An active enrollment is required for this course."
        action={<Link to={`/student/learn-skills/${course.id}`}>View course access</Link>}
      />
    );
  if (progressQuery.isPending) return <EmptyState title="Loading saved progress..." />;
  if (progressQuery.isError)
    return (
      <EmptyState
        title="Your saved progress could not be loaded."
        action={
          <button
            type="button"
            onClick={() => {
              void progressQuery.refetch();
            }}
            className="min-h-11 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white"
          >
            Retry progress
          </button>
        }
      />
    );
  const validKeys = new Set(courseLessons(course).map((lesson) => lesson.key));
  const completedKeys = new Set(
    (progressQuery.data ?? [])
      .filter((record) => record.completedAt && validKeys.has(record.lessonKey))
      .map((record) => record.lessonKey),
  );
  return (
    <Workspace
      key={`${userId}-${course.id}-${initialLessonKey ?? 'resume'}`}
      userId={userId!}
      course={course}
      completedKeys={completedKeys}
      initialLessonKey={initialLessonKey}
    />
  );
}
function Workspace({
  course,
  userId,
  completedKeys,
  initialLessonKey,
}: {
  course: SkillCourse;
  userId: number;
  completedKeys: Set<string>;
  initialLessonKey: string | null;
}) {
  const lessons = courseLessons(course);
  const firstIncomplete = lessons.findIndex((lesson) => !completedKeys.has(lesson.key));
  const requestedIndex = lessons.findIndex((lesson) => lesson.key === initialLessonKey);
  const [activeIndex, setActiveIndex] = useState(
    requestedIndex >= 0 ? requestedIndex : firstIncomplete >= 0 ? firstIncomplete : 0,
  );
  const activeLesson = lessons[activeIndex];
  const percent = Math.round((completedKeys.size / lessons.length) * 100);
  function advance(savedKey: string) {
    setActiveIndex((current) =>
      lessons[current].key === savedKey ? Math.min(current + 1, lessons.length - 1) : current,
    );
  }
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/student/learn-skills"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            My learning
          </Link>
          <h1 className="mt-1 break-words text-xl font-semibold text-[#101820] sm:text-2xl">
            {course.title}
          </h1>

        </div>
        <Link
          to={`/student/learn-skills/${course.id}`}
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
        >
          Course details
        </Link>
      </header>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <BookOpen className="h-4 w-4 text-[#607D00]" aria-hidden="true" />
        <div
          role="progressbar"
          aria-label="Course lesson completion"
          aria-valuemin={0}
          aria-valuemax={lessons.length}
          aria-valuenow={completedKeys.size}
          className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-slate-100"
        >
          <div className="h-full rounded-full bg-[#B5E61D]" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-600">
          {completedKeys.size}/{lessons.length} complete
        </span>
      </div>
      {completedKeys.size === lessons.length ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-lime-200 bg-lime-50 p-4 text-sm text-[#466000]"
        >
          <CheckCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          You have completed this learning path. Revisit a lesson to keep practising; completion is not a
          professional qualification.
        </p>
      ) : null}
      <div className="2xl:hidden">
        <label htmlFor="lesson-select" className="mb-1.5 block text-xs font-semibold text-slate-600">
          Choose a lesson
        </label>
        <select
          id="lesson-select"
          value={activeIndex}
          onChange={(event) => setActiveIndex(Number(event.target.value))}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
        >
          {lessons.map((lesson, index) => (
            <option key={lesson.key} value={index}>
              {completedKeys.has(lesson.key) ? '✓ ' : ''}
              {index + 1}. {lesson.title}
            </option>
          ))}
        </select>
      </div>
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden self-start rounded-2xl border border-slate-200 bg-white p-3 2xl:block">
          <h2 className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your lessons
          </h2>
          <nav aria-label="Course lessons" className="space-y-1">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.key}
                type="button"
                aria-current={index === activeIndex ? 'step' : undefined}
                onClick={() => setActiveIndex(index)}
                className={`flex min-h-14 w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#607D00] ${index === activeIndex ? 'bg-[#101820] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${index === activeIndex ? 'bg-[#B5E61D] text-[#101820]' : 'bg-slate-100 text-slate-600'}`}
                >
                  {completedKeys.has(lesson.key) ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span>{lesson.title}</span>
              </button>
            ))}
          </nav>
        </aside>
        <LessonWorkspace
          key={`${userId}-${course.id}-${activeLesson.key}`}
          userId={userId}
          course={course}
          lesson={activeLesson}
          mode={workspaceModeForCourse(course)}
          index={activeIndex}
          total={lessons.length}
          completed={completedKeys.has(activeLesson.key)}
          onPrevious={() => setActiveIndex((current) => Math.max(0, current - 1))}
          onNext={() => setActiveIndex((current) => Math.min(lessons.length - 1, current + 1))}
          onComplete={advance}
        />
      </div>
    </div>
  );
}
