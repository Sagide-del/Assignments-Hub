import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { MetricCard, PageHeader } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v14.5A1.5 1.5 0 0 0 17.5 17H7.5A2.5 2.5 0 0 0 5 19.5v-13Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 4A2.5 2.5 0 0 0 5 6.5V20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 3v3M17 3v3M4 9h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 17L17 7M9 7h8v8"
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

function slugifySubject(subject: string) {
  return subject.trim().toLowerCase();
}

function classifySubject(subject: string) {
  const value = slugifySubject(subject);
  if (value === 'mathematics') return 'Mathematics';
  if (value === 'biology') return 'Biology';
  if (value === 'chemistry') return 'Chemistry';
  if (value === 'physics') return 'Physics';
  return 'Other Subjects';
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'Available'
      ? 'bg-[#F2F5F8] text-[#344252] border-slate-200'
      : status === 'Not Started'
        ? 'bg-[#FFF8E8] text-[#705316] border-[#F1DCA8]'
        : 'bg-[#EAF2FF] text-[#24477A] border-[#CFE0FF]';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-[#B5E61D] bg-[#EEF8D1] text-[#101820]'
          : 'border-slate-200 bg-white text-slate-600 hover:border-[#B5E61D] hover:text-[#101820]'
      }`}
    >
      {label}
    </button>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon ? <span className="mt-0.5 text-slate-400">{icon}</span> : null}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm text-slate-600">{value}</p>
      </div>
    </div>
  );
}

export function MyAssignmentsPage() {
  const user = useAuthStore((s) => s.user);
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');

  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['assignments', user?.schoolId],
    queryFn: () => assignmentsApi.findAll(),
  });

  const published = (assignments ?? []).filter((assignment) => assignment.isPublished);

  const subjectOptions = useMemo(() => {
    const knownOrder = ['All Subjects', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Other Subjects'];
    const dynamicSubjects = Array.from(new Set(published.map((assignment) => assignment.subject.trim())))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const includeOther = dynamicSubjects.some((subject) => classifySubject(subject) === 'Other Subjects');
    const orderedDynamic = knownOrder
      .filter((item) => item !== 'All Subjects' && (item !== 'Other Subjects' || includeOther))
      .filter((item) => item === 'Other Subjects' || dynamicSubjects.includes(item));

    const remainingDynamic = dynamicSubjects.filter(
      (subject) => !['Mathematics', 'Biology', 'Chemistry', 'Physics'].includes(subject),
    );

    return [
      'All Subjects',
      ...orderedDynamic.filter((value, index, array) => array.indexOf(value) === index),
      ...remainingDynamic.filter((subject) => !orderedDynamic.includes(subject)),
    ];
  }, [published]);

  const filteredAssignments = published.filter((assignment) => {
    if (subjectFilter === 'All Subjects') return true;
    if (subjectFilter === 'Other Subjects') return classifySubject(assignment.subject) === 'Other Subjects';
    return assignment.subject === subjectFilter;
  });

  const groupedAssignments = useMemo(() => {
    return filteredAssignments
      .slice()
      .sort((a, b) => {
        const subjectCompare = a.subject.localeCompare(b.subject);
        if (subjectCompare !== 0) return subjectCompare;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .reduce<Record<string, typeof filteredAssignments>>((groups, assignment) => {
        if (!groups[assignment.subject]) groups[assignment.subject] = [];
        groups[assignment.subject].push(assignment);
        return groups;
      }, {});
  }, [filteredAssignments]);

  const subjectGroupEntries = Object.entries(groupedAssignments);
  return (
    <div className="space-y-6">
      <PageHeader title="My Assignments" />

      <section className="grid gap-4 sm:max-w-xs">
        <MetricCard label="Assignments" value={isLoading ? '-' : published.length} compact />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
        <h2 className="text-lg font-semibold text-[#101820]">Subjects</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          {subjectOptions.map((option) => (
            <FilterPill
              key={option}
              label={option}
              active={subjectFilter === option}
              onClick={() => setSubjectFilter(option)}
            />
          ))}
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-10 text-sm text-slate-500 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          Loading assignments...
        </section>
      ) : error ? (
        <section className="rounded-[28px] border border-red-200 bg-red-50 p-10 text-sm text-red-700 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          We could not load assignments right now.
        </section>
      ) : subjectGroupEntries.length === 0 ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#101820] text-[#B5E61D]">
              <BookIcon />
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-[#101820]">No assignments available yet</h2>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {subjectGroupEntries.map(([subject, subjectAssignments]) => (
            <section
              key={subject}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]"
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
                <h2 className="text-2xl font-semibold text-[#101820]">{subject}</h2>
                <div className="rounded-full bg-[#F8FAFC] px-4 py-2 text-sm font-medium text-slate-600">
                  {subjectAssignments.length} {subjectAssignments.length === 1 ? 'assignment' : 'assignments'}
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {subjectAssignments.map((assignment) => {
                  const status = 'Available';

                  return (
                    <article
                      key={assignment.id}
                      className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-5 shadow-sm transition hover:border-[#D7E89A] hover:bg-white"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {assignment.subject}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#101820]">
                            {assignment.title}
                          </h3>
                        </div>
                        <StatusBadge status={status} />
                      </div>

                      <div className="mt-5">
                        <InfoRow label="Date posted" value={formatDate(assignment.createdAt)} icon={<CalendarIcon />} />
                      </div>

                      <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Marks</p>
                            <p className="mt-1 text-sm font-medium text-slate-700">{assignment.totalMarks} marks</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Submission status
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-700">{status}</p>
                          </div>
                        </div>

                        <Link
                          to={`/student/assignments/${assignment.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1D2C38]"
                        >
                          Open Assignment
                          <ArrowIcon />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
