import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Beaker, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { labsApi, labSessionsApi, stemApi } from '../../api/labs.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';
import type { Lab, StemCategory, StemSubject } from '../../types';

function labMatchesCategory(lab: Lab, category: StemCategory, subjects: StemSubject[]) {
  if (lab.categoryId) return lab.categoryId === category.id;
  const categorySubjects = subjects.filter((subject) => subject.categoryId === category.id);
  if (lab.stemSubjectId) return categorySubjects.some((subject) => subject.id === lab.stemSubjectId);
  return categorySubjects.some((subject) => subject.name.toLowerCase() === lab.subject.toLowerCase());
}

function labMatchesSubject(lab: Lab, subject: StemSubject) {
  if (lab.stemSubjectId) return lab.stemSubjectId === subject.id;
  return lab.subject.toLowerCase() === subject.name.toLowerCase();
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
  const { data: sessions = [] } = useQuery({
    queryKey: ['lab-sessions', 'my-discoveries'],
    queryFn: () => labSessionsApi.findAll(),
  });

  // Grade access remains enforced by GET /labs. This catalogue only
  // organises the labs returned by the backend.
  const availableCategories = useMemo(
    () => categories.filter((category) => labs.some((lab) => labMatchesCategory(lab, category, subjects))),
    [categories, labs, subjects],
  );

  const availableSubjects = useMemo(
    () => subjects.filter((subject) => {
      if (activeCategoryId && subject.categoryId !== activeCategoryId) return false;
      return labs.some((lab) => labMatchesSubject(lab, subject));
    }),
    [activeCategoryId, labs, subjects],
  );

  const visibleLabs = useMemo(() => {
    const activeCategory = categories.find((category) => category.id === activeCategoryId);
    const activeSubject = subjects.find((subject) => subject.id === activeSubjectId);

    return labs.filter((lab) => {
      if (activeCategory && !labMatchesCategory(lab, activeCategory, subjects)) return false;
      if (activeSubject && !labMatchesSubject(lab, activeSubject)) return false;
      return true;
    });
  }, [activeCategoryId, activeSubjectId, categories, labs, subjects]);

  const sessionByLabKey = useMemo(
    () => new Map(sessions.map((session) => [session.labKey, session])),
    [sessions],
  );
  const isLoading = categoriesLoading || labsLoading;

  function selectCategory(categoryId: number | null) {
    setActiveCategoryId(categoryId);
    setActiveSubjectId(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="STEM Labs"
        actions={
          <span className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500">
            {isLoading ? 'Loading' : `${labs.length} available`}
          </span>
        }
      />

      {availableCategories.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter labs by category">
          <FilterButton active={activeCategoryId === null} onClick={() => selectCategory(null)}>
            All labs
          </FilterButton>
          {availableCategories.map((category) => (
            <FilterButton
              key={category.id}
              active={activeCategoryId === category.id}
              onClick={() => selectCategory(category.id)}
            >
              {category.name}
            </FilterButton>
          ))}
        </div>
      ) : null}

      {availableSubjects.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-200 pt-4" aria-label="Filter labs by subject">
          <FilterButton active={activeSubjectId === null} onClick={() => setActiveSubjectId(null)} subtle>
            All subjects
          </FilterButton>
          {availableSubjects.map((subject) => (
            <FilterButton
              key={subject.id}
              active={activeSubjectId === subject.id}
              onClick={() => setActiveSubjectId(subject.id)}
              subtle
            >
              {subject.name}
            </FilterButton>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : visibleLabs.length === 0 ? (
        <EmptyState title="No labs are available in this selection." />
      ) : (
        <section className="grid gap-3 md:grid-cols-2" aria-label="Available STEM labs">
          {visibleLabs.map((lab) => {
            const session = sessionByLabKey.get(lab.key);
            const completed = Boolean(session?.completedAt);

            return (
              <article key={lab.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#101820] text-[#B5E61D]">
                      <Beaker className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{lab.subject}</span>
                  </div>
                  {completed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-2.5 py-1 text-xs font-semibold text-[#526A00]">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Completed
                    </span>
                  ) : session ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">In progress</span>
                  ) : null}
                </div>

                <h2 className="mt-4 break-words text-lg font-semibold leading-snug text-[#101820]">{lab.title}</h2>
                {lab.topic ?? lab.topicArea ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">{lab.topic ?? lab.topicArea}</p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                    {lab.durationMinutes ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {lab.durationMinutes} min
                      </span>
                    ) : null}
                    {lab._count?.questions ? <span>{lab._count.questions} questions</span> : null}
                  </div>
                  <Link
                    to={`/student/stem-labs/${lab.id}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"
                  >
                    {session && !completed ? 'Continue' : 'Open lab'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, subtle = false, children }: {
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
        active
          ? 'bg-[#101820] text-white'
          : subtle
            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  );
}
