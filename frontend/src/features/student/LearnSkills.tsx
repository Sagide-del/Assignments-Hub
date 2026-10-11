import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { skillsApi } from '../../api/skills.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';
import type { SkillCategory, SkillCourse, SkillEnrollment } from '../../types';
import { hasWorkspaceAccess, workspaceModeForCourse } from './skill-workspace/workspace-mode';

function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

export function LearnSkillsPage() {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const categoriesQuery = useQuery({ queryKey: ['skill-categories'], queryFn: skillsApi.getCategories });
  const coursesQuery = useQuery({ queryKey: ['skill-courses'], queryFn: () => skillsApi.getCourses() });
  const enrollmentsQuery = useQuery({ queryKey: ['skill-enrollments'], queryFn: skillsApi.getStudentEnrollments });
  const categories = categoriesQuery.data ?? [];
  const courses = coursesQuery.data ?? [];
  const enrollments = enrollmentsQuery.data ?? [];
  const enrollmentByCourse = new Map(enrollments.map((enrollment) => [enrollment.courseId, enrollment]));
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === 'ACTIVE');
  const visibleCourses = categoryId ? courses.filter((course) => course.categoryId === categoryId) : courses;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Skills" meta={`${courses.length} available courses`} />

      {activeEnrollments.length ? <ContinueLearning enrollment={activeEnrollments[0]} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <CategoryButton active={categoryId === null} label="All skills" count={courses.length} onClick={() => setCategoryId(null)} />
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              active={categoryId === category.id}
              category={category}
              label={category.name}
              count={category._count?.courses ?? 0}
              onClick={() => setCategoryId(category.id)}
            />
          ))}
        </div>
      </section>

      {coursesQuery.isLoading ? (
        <EmptyState title="Loading courses..." />
      ) : coursesQuery.isError ? (
        <EmptyState title="Courses are temporarily unavailable." />
      ) : visibleCourses.length === 0 ? (
        <EmptyState title="No courses in this category." />
      ) : (
        <section className="grid gap-3 lg:grid-cols-2">
          {visibleCourses.map((course) => (
            <CourseRow key={course.id} course={course} enrollment={enrollmentByCourse.get(course.id)} />
          ))}
        </section>
      )}
    </div>
  );
}

function ContinueLearning({ enrollment }: { enrollment: SkillEnrollment }) {
  const course = enrollment.course;
  if (!course) return null;
  const workspace = workspaceModeForCourse(course);
  const destination = workspace ? `/student/learn-skills/${course.id}/workspace` : `/student/learn-skills/${course.id}`;
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#101820] text-[#B5E61D]"><PlayIcon /></div>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Continue</p><h2 className="mt-1 truncate text-lg font-semibold text-[#101820]">{course.title}</h2></div>
      </div>
      <Link to={destination} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white">Resume</Link>
    </section>
  );
}

function CategoryButton({
  active,
  category,
  label: buttonLabel,
  count,
  onClick,
}: {
  active: boolean;
  category?: SkillCategory;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition ${active ? 'bg-[#101820] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
      <SkillIcon name={category?.name ?? 'all'} />
      {buttonLabel}
      <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
    </button>
  );
}

function CourseRow({ course, enrollment }: { course: SkillCourse; enrollment?: SkillEnrollment }) {
  const courseWithEnrollment = { ...course, enrollment };
  const workspace = workspaceModeForCourse(course);
  const canOpenWorkspace = Boolean(workspace && hasWorkspaceAccess(courseWithEnrollment));
  const destination = canOpenWorkspace ? `/student/learn-skills/${course.id}/workspace` : `/student/learn-skills/${course.id}`;
  return (
    <article className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#101820]"><SkillIcon name={`${course.category.name} ${course.title}`} large /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>{course.category.name}</span><span aria-hidden="true">·</span><span>{course.durationWeeks} weeks</span></div>
        <h2 className="mt-1 truncate font-semibold text-[#101820]">{course.title}</h2>
        <p className="mt-1 text-xs text-slate-500">{enrollment ? label(enrollment.status) : course.costKES === 0 ? 'Included' : `KES ${course.costKES.toLocaleString()}`}</p>
      </div>
      <Link to={destination} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#101820] hover:bg-slate-50">{canOpenWorkspace ? 'Open' : 'View'}</Link>
    </article>
  );
}

function SkillIcon({ name, large = false }: { name: string; large?: boolean }) {
  const value = name.toLowerCase();
  const className = large ? 'h-6 w-6' : 'h-4 w-4';
  if (/robot|arduino|ai|machine/.test(value)) {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 8V5M9 14h.01M15 14h.01M9 17h6M3 12h2M19 12h2" strokeLinecap="round" /></svg>;
  }
  if (/first aid|health|medical/.test(value)) {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M9 4h6l1 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1-3Z" /><path d="M12 10v6M9 13h6" strokeLinecap="round" /></svg>;
  }
  if (/research|science/.test(value)) {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M8 15h8" /></svg>;
  }
  if (/code|python|program|comput/.test(value)) {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 5h6a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4V5ZM20 5h-6a3 3 0 0 0-3 3" strokeLinejoin="round" /></svg>;
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z" strokeLinejoin="round" /></svg>;
}
