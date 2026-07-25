import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { skillsApi } from '../../api/skills.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import type { SkillCategory, SkillCourse, SkillEnrollment } from '../../types';

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
  const courseListRef = useRef<HTMLDivElement | null>(null);

  const categories = categoriesQuery.data ?? [];
  const courses = coursesQuery.data ?? [];
  const enrollments = enrollmentsQuery.data ?? [];
  const enrollmentByCourse = new Map(enrollments.map((enrollment) => [enrollment.courseId, enrollment]));
  const visibleCourses = categoryId ? courses.filter((course) => course.categoryId === categoryId) : courses;
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === 'ACTIVE');

  function selectCategory(id: number | null) {
    setCategoryId(id);
    courseListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Learn a Skill" meta="Practical, industry-relevant skills sourced from our training partners." />

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

      {/* Premium category marketplace grid. Every field (name, description,
          image, course count) comes from the database-driven SkillCategory
          records via skillsApi.getCategories() — nothing here is
          hardcoded course content. The only thing decided client-side is
          which fallback icon to show when a category has no imageUrl set
          yet, and that's a generated visual (SVG), never a hardcoded image
          URL. */}
      {!categoriesQuery.isLoading && categories.length > 0 ? (
        <section>
          <PageHeader eyebrow="Browse by category" title="Find your next skill" />
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                courseCount={category._count?.courses ?? 0}
                active={categoryId === category.id}
                onSelect={() => selectCategory(category.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section ref={courseListRef}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => selectCategory(null)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${categoryId === null ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>All skills</button>
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => selectCategory(category.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${categoryId === category.id ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
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

// Small set of curated fallback icons keyed by keyword match against the
// category name — used only when a category has no imageUrl configured
// yet (see CategoryVisual below). This covers the five categories named in
// the demo brief (AI & Robotics, First Aid, Video Editing, Programming,
// Public Speaking) but degrades gracefully to a generic graduation-cap
// icon for any other category a Platform Admin creates later, since
// categories are entirely database-driven.
const CATEGORY_ICON_RULES = [
  { test: /robot|\bai\b|artificial intelligence/i, icon: RobotIcon },
  { test: /first aid|health|safety|medic/i, icon: FirstAidIcon },
  { test: /video|film|editing/i, icon: VideoIcon },
  { test: /program|code|software|develop/i, icon: CodeIcon },
  { test: /speak|communication|presentation/i, icon: MicIcon },
];

function iconForCategory(category: SkillCategory) {
  const match = CATEGORY_ICON_RULES.find((rule) => rule.test.test(category.name));
  return match?.icon ?? GraduationCapIcon;
}

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="5" y="9" width="14" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9.5" cy="14" r="1.3" fill="currentColor" />
      <circle cx="14.5" cy="14" r="1.3" fill="currentColor" />
      <path d="M12 9V6M9 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="4.5" r="1.3" fill="currentColor" />
      <path d="M5 13H3M21 13h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FirstAidIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 9.5v6M9 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 6V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3.5" y="7" width="12" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.5 10.5 20.5 8v8l-5-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M9 8 4.5 12 9 16M15 8l4.5 4-4.5 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="9.5" y="3.5" width="5" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5M9 20.5h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GraduationCapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 5 3 9.5 12 14l9-4.5L12 5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 11.5v4c0 1.1 2.2 2 5 2s5-.9 5-2v-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Shows the category's configured imageUrl (backend-managed asset), falling
// back to a generated gradient + icon visual if there is no image, or if
// the image URL fails to load. Never a hardcoded image URL in the markup.
function CategoryVisual({ category }: { category: SkillCategory }) {
  const [broken, setBroken] = useState(false);
  const Icon = iconForCategory(category);

  if (category.imageUrl && !broken) {
    return (
      <img
        src={category.imageUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#101820] to-[#233245]">
      <Icon className="h-12 w-12 text-[#B5E61D]" />
    </div>
  );
}

function CategoryCard({
  category,
  courseCount,
  active,
  onSelect,
}: {
  category: SkillCategory;
  courseCount: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[24px] border bg-white shadow-[0_12px_34px_rgba(16,24,32,0.05)] transition ${
        active ? 'border-[#B5E61D] ring-2 ring-[#B5E61D]/40' : 'border-slate-200'
      }`}
    >
      <div className="aspect-[16/9]">
        <CategoryVisual category={category} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-[#101820]">{category.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
          {category.description ?? 'Explore courses curated for this skill track.'}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {courseCount} {courseCount === 1 ? 'course' : 'courses'} available
          </span>
          <button
            type="button"
            onClick={onSelect}
            className="text-sm font-semibold text-[#101820] hover:text-[#8BB800]"
          >
            View Skills →
          </button>
        </div>
      </div>
    </article>
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
