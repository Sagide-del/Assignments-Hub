import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { skillsApi } from '../../api/skills.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import type { SkillCourse, SkillEnrollment } from '../../types';

function formatCurrency(value: number) {
  return value === 0 ? 'Free' : `KES ${value.toLocaleString()}`;
}

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
  const visibleCourses = categoryId ? courses.filter((course) => course.categoryId === categoryId) : courses;
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === 'ACTIVE');

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Learn a Skill" />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Available courses" value={coursesQuery.isLoading ? '-' : courses.length} compact />
        <MetricCard label="Enrolled" value={enrollmentsQuery.isLoading ? '-' : enrollments.length} compact />
        <MetricCard label="Continue learning" value={enrollmentsQuery.isLoading ? '-' : activeEnrollments.length} compact />
      </section>

      {activeEnrollments.length > 0 ? (
        <section className="rounded-[24px] bg-[#101820] p-5 text-white shadow-[0_18px_40px_rgba(16,24,32,0.14)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B5E61D]">Continue learning</p>
              <h2 className="mt-2 text-xl font-semibold">{activeEnrollments[0].course?.title ?? 'Active course'}</h2>
            </div>
            <Link to={`/student/learn-skills/${activeEnrollments[0].courseId}`} className="w-fit rounded-xl bg-[#B5E61D] px-5 py-2.5 text-sm font-semibold text-[#101820]">Open course</Link>
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => setCategoryId(null)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${categoryId === null ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>All skills</button>
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${categoryId === category.id ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {coursesQuery.isLoading ? (
        <EmptyState title="Loading courses..." />
      ) : coursesQuery.isError ? (
        <EmptyState title="Courses are temporarily unavailable." />
      ) : visibleCourses.length === 0 ? (
        <EmptyState title="No courses available in this category." />
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course) => <CourseCard key={course.id} course={course} enrollment={enrollmentByCourse.get(course.id)} />)}
        </section>
      )}
    </div>
  );
}

function CourseCard({ course, enrollment }: { course: SkillCourse; enrollment?: SkillEnrollment }) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
      <div className="aspect-[16/8] bg-slate-100">
        {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl font-semibold text-slate-300">{course.title.charAt(0)}</div>}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          <span>{course.category.name}</span><span>{course.durationWeeks} weeks</span>
        </div>
        <h2 className="mt-3 text-lg font-semibold text-[#101820]">{course.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{course.shortDescription}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Fact label="Provider" value={course.provider.name} />
          <Fact label="Level" value={label(course.level)} />
          <Fact label="Certificate" value={course.certificateAvailable ? 'Available' : 'Not included'} />
          <Fact label="Cost" value={formatCurrency(course.costKES)} />
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{enrollment ? label(enrollment.status) : 'Available'}</span>
          <Link to={`/student/learn-skills/${course.id}`} className="rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white">View course</Link>
        </div>
      </div>
    </article>
  );
}

function Fact({ label: factLabel, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-400">{factLabel}</p><p className="mt-1 truncate font-medium text-[#101820]">{value}</p></div>;
}
