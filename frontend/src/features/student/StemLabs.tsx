import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { labsApi, stemApi } from '../../api/labs.api';
import { MetricCard, PageHeader } from '../../components/ui/Saas';

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SubjectIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M10 3h4M11 3v5.5L6.4 16a3 3 0 0 0 2.6 4.5h6a3 3 0 0 0 2.6-4.5L13 8.5V3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function dashboardCardClass(active: boolean) {
  return active
    ? 'border-[#B5E61D] bg-[#FAFDEB] shadow-[0_14px_28px_rgba(16,24,32,0.06)]'
    : 'border-slate-200 bg-white hover:border-slate-300';
}

export function StemLabsPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['stem-categories'],
    queryFn: stemApi.findCategories,
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['stem-subjects'],
    queryFn: stemApi.findSubjects,
  });
  const { data: labs = [], isLoading: labsLoading } = useQuery({
    queryKey: ['labs', 'student-catalogue'],
    queryFn: () => labsApi.findAll(),
  });

  const categoriesWithLabs = useMemo(() => {
    return categories
      .map((category) => {
        const categorySubjects = subjects.filter((subject) => subject.categoryId === category.id);
        const categoryLabs = labs.filter((lab) => {
          if (lab.categoryId) return lab.categoryId === category.id;
          if (lab.stemSubjectId) return categorySubjects.some((subject) => subject.id === lab.stemSubjectId);
          return categorySubjects.some((subject) => subject.name.toLowerCase() === lab.subject.toLowerCase());
        });

        return {
          ...category,
          labs: categoryLabs,
          subjects: categorySubjects.filter((subject) =>
            categoryLabs.some(
              (lab) =>
                lab.stemSubjectId === subject.id ||
                (!lab.stemSubjectId && lab.subject.toLowerCase() === subject.name.toLowerCase()),
            ),
          ),
        };
      })
      .filter((category) => category.labs.length > 0);
  }, [categories, labs, subjects]);

  const activeCategory =
    categoriesWithLabs.find((category) => category.id === activeCategoryId) ?? categoriesWithLabs[0] ?? null;
  const visibleSubjects = activeCategory?.subjects ?? [];
  const activeSubject = visibleSubjects.find((subject) => subject.id === activeSubjectId) ?? visibleSubjects[0] ?? null;

  const visibleLabs = useMemo(() => {
    if (!activeCategory) return [];

    const categoryLabs = activeCategory.labs;
    if (!activeSubject) return categoryLabs;

    return categoryLabs.filter(
      (lab) =>
        lab.stemSubjectId === activeSubject.id ||
        (!lab.stemSubjectId && lab.subject.toLowerCase() === activeSubject.name.toLowerCase()),
    );
  }, [activeCategory, activeSubject]);

  return (
    <div className="space-y-6">
      <PageHeader title="STEM Labs" />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Categories" value={categoriesLoading ? '-' : categoriesWithLabs.length} compact />
        <MetricCard label="Subjects" value={categoriesLoading ? '-' : subjects.length} compact />
        <MetricCard label="Labs" value={labsLoading ? '-' : labs.length} compact />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {categoriesWithLabs.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => {
              setActiveCategoryId(category.id);
              setActiveSubjectId(null);
            }}
            className={`rounded-[28px] border p-6 text-left transition ${dashboardCardClass(activeCategory?.id === category.id)}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D] shadow-sm">
              <LibraryIcon />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-[#101820]">{category.name}</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {category.subjects.length} subjects
              </span>
              <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {category.labs.length} labs
              </span>
            </div>
          </button>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
              <SubjectIcon />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subjects</p>
              <h2 className="mt-1 text-xl font-semibold text-[#101820]">
                {activeCategory ? `${activeCategory.name} subjects` : 'Subject catalogue'}
              </h2>
            </div>
          </div>

          {categoriesLoading || labsLoading ? (
            <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">Loading subject catalogue...</p>
          ) : visibleSubjects.length === 0 ? (
            <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">No STEM subjects are available for your current grade yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {visibleSubjects.map((subject) => {
                const subjectLabCount = activeCategory?.labs.filter(
                  (lab) =>
                    lab.stemSubjectId === subject.id ||
                    (!lab.stemSubjectId && lab.subject.toLowerCase() === subject.name.toLowerCase()),
                ).length;

                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setActiveSubjectId(subject.id)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${dashboardCardClass(activeSubject?.id === subject.id)}`}
                  >
                    <p className="text-sm font-semibold text-[#101820]">{subject.name}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {subjectLabCount} labs available
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
              <LabIcon />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Labs</p>
              <h2 className="mt-1 text-xl font-semibold text-[#101820]">
                {activeSubject ? `${activeSubject.name} labs` : 'Available STEM labs'}
              </h2>
            </div>
          </div>

          {categoriesLoading || labsLoading ? (
            <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">Loading labs...</p>
          ) : visibleLabs.length === 0 ? (
            <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">No labs are available for this subject yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {visibleLabs.map((lab) => (
                <article key={lab.id} className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {lab.subject}
                    </span>
                    {lab.durationMinutes ? (
                      <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {lab.durationMinutes} min
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#101820]">{lab.title}</h3>
                  {lab.topic ?? lab.topicArea ?? lab.description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {lab.topic ?? lab.topicArea ?? lab.description}
                    </p>
                  ) : null}
                  {lab.competency || lab.pathway ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {lab.competency ? <LabMeta label="Competency" value={lab.competency} /> : null}
                      {lab.pathway ? <LabMeta label="Pathway" value={lab.pathway} /> : null}
                    </div>
                  ) : null}
                  <Link
                    to={`/student/stem-labs/${lab.id}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:opacity-80"
                  >
                    Open lab
                    <ArrowIcon />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function LabMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-600">{value}</p>
    </div>
  );
}
