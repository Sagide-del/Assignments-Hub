import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { labsApi, labSessionsApi, stemApi } from '../../api/labs.api';
import { ActionCard, EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';
import { gradeTier } from '../../utils/gradeTier';
import type { Lab, LabSession, StemCategory, StemSubject } from '../../types';

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

function PhenomenaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DiscoveryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.8 15.8 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="8.5" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="9" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c.5-3 2.5-4.7 5-4.7s4.5 1.7 5 4.7M14.5 14.9c2 .3 3.5 1.9 4 4.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PathwayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4 12h5l2-6 4 12 2-6h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CareerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="8" width="16" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function dashboardCardClass(active: boolean) {
  return active
    ? 'border-[#B5E61D] bg-[#FAFDEB] shadow-[0_14px_28px_rgba(16,24,32,0.06)]'
    : 'border-slate-200 bg-white hover:border-slate-300';
}

function formatDate(value?: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

type CategoryWithLabs = StemCategory & { labs: Lab[]; subjects: StemSubject[] };

function buildCategoriesWithLabs(categories: StemCategory[], subjects: StemSubject[], labs: Lab[]): CategoryWithLabs[] {
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
}

export function StemLabsPage() {
  const user = useAuthStore((state) => state.user);
  const tier = gradeTier(user?.grade);

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
  // GET /lab-sessions auto-scopes to the current student when called with no
  // params (see backend/src/lab-sessions/lab-sessions.service.ts).
  const { data: sessions = [] } = useQuery({
    queryKey: ['lab-sessions', 'my-discoveries'],
    queryFn: () => labSessionsApi.findAll(),
  });

  const categoriesWithLabs = useMemo(() => buildCategoriesWithLabs(categories, subjects, labs), [categories, subjects, labs]);

  const isLoading = categoriesLoading || labsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tier === 'junior' ? 'Junior Explorer' : tier === 'senior' ? 'Senior Specialist' : undefined}
        title="STEM Labs"
        meta={
          tier === 'junior'
            ? 'Discover how the world works, one hands-on lab at a time.'
            : tier === 'senior'
              ? 'Build specialist STEM skills aligned to your pathway.'
              : undefined
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Categories" value={categoriesLoading ? '-' : categoriesWithLabs.length} compact />
        <MetricCard label="Subjects" value={categoriesLoading ? '-' : subjects.length} compact />
        <MetricCard label="Labs" value={labsLoading ? '-' : labs.length} compact />
      </section>

      {tier === 'junior' ? (
        <JuniorExplorerView labs={labs} sessions={sessions} categoriesWithLabs={categoriesWithLabs} isLoading={isLoading} />
      ) : tier === 'senior' ? (
        <SeniorSpecialistView labs={labs} categoriesWithLabs={categoriesWithLabs} isLoading={isLoading} />
      ) : (
        <CategoryBrowser categoriesWithLabs={categoriesWithLabs} isLoading={isLoading} />
      )}
    </div>
  );
}

// ---- Junior Explorer (Grade 7-9) ----

function JuniorExplorerView({
  labs,
  sessions,
  categoriesWithLabs,
  isLoading,
}: {
  labs: Lab[];
  sessions: LabSession[];
  categoriesWithLabs: CategoryWithLabs[];
  isLoading: boolean;
}) {
  const communityLabs = labs.filter((lab) => lab.communityLink);

  return (
    <>
      <ActionCard title="Phenomena &amp; curiosity" meta="Real questions from your labs — go find out why" icon={<PhenomenaIcon />}>
        {isLoading ? (
          <EmptyState title="Loading phenomena..." />
        ) : labs.length === 0 ? (
          <EmptyState title="No labs are available for your grade yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {labs.slice(0, 6).map((lab) => (
              <Link
                key={lab.id}
                to={`/student/stem-labs/${lab.id}`}
                className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-5 transition hover:border-[#B5E61D]"
              >
                <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {lab.subject}
                </span>
                <p className="mt-3 text-base font-semibold text-[#101820]">{lab.topic ?? lab.topicArea ?? lab.title}</p>
                {lab.juniorVersion ?? lab.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-500">{lab.juniorVersion ?? lab.description}</p>
                ) : null}
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#101820]">
                  Go find out
                  <ArrowIcon />
                </span>
              </Link>
            ))}
          </div>
        )}
      </ActionCard>

      <ActionCard title="Hands-on labs" meta="Browse by subject" icon={<LabIcon />}>
        <CategoryBrowser categoriesWithLabs={categoriesWithLabs} isLoading={isLoading} embedded />
      </ActionCard>

      <ActionCard title="My discoveries" meta="Labs you've completed" icon={<DiscoveryIcon />}>
        {sessions.length === 0 ? (
          <EmptyState title="Complete a lab to start your discovery log." />
        ) : (
          <div className="space-y-3">
            {sessions
              .slice()
              .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime())
              .slice(0, 8)
              .map((session) => {
                const lab = labs.find((item) => item.key === session.labKey);
                return (
                  <div key={session.id} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#101820]">{lab?.title ?? session.labKey}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(session.completedAt ?? session.createdAt) ?? 'In progress'}
                      </p>
                    </div>
                    {session.score != null && session.maxScore != null ? (
                      <span className="w-fit rounded-full bg-[#101820] px-3 py-1 text-xs font-semibold text-[#B5E61D]">
                        {session.score}/{session.maxScore}
                      </span>
                    ) : null}
                  </div>
                );
              })}
          </div>
        )}
      </ActionCard>

      <ActionCard title="Community connections" meta="Take your learning beyond the classroom" icon={<CommunityIcon />}>
        {communityLabs.length === 0 ? (
          <EmptyState title="No community connections are configured for your labs yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {communityLabs.map((lab) => (
              <Link
                key={lab.id}
                to={`/student/stem-labs/${lab.id}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#B5E61D]"
              >
                <p className="font-semibold text-[#101820]">{lab.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{lab.communityLink}</p>
              </Link>
            ))}
          </div>
        )}
      </ActionCard>
    </>
  );
}

// ---- Senior Specialist (Grade 10-12) ----

function SeniorSpecialistView({
  labs,
  categoriesWithLabs,
  isLoading,
}: {
  labs: Lab[];
  categoriesWithLabs: CategoryWithLabs[];
  isLoading: boolean;
}) {
  const [activePathway, setActivePathway] = useState<string | null>(null);

  const pathwayGroups = useMemo(() => {
    const groups = new Map<string, Lab[]>();
    for (const lab of labs) {
      const key = lab.pathway ?? 'General STEM';
      const existing = groups.get(key) ?? [];
      existing.push(lab);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).map(([pathway, pathwayLabs]) => ({ pathway, labs: pathwayLabs }));
  }, [labs]);

  const visiblePathwayLabs = activePathway
    ? (pathwayGroups.find((group) => group.pathway === activePathway)?.labs ?? [])
    : labs;

  return (
    <>
      <ActionCard title="STEM pathways" meta="Filter labs by the pathway you're building toward" icon={<PathwayIcon />}>
        {isLoading ? (
          <EmptyState title="Loading pathways..." />
        ) : pathwayGroups.length === 0 ? (
          <EmptyState title="No labs are available for your grade yet." />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActivePathway(null)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activePathway === null ? 'border-[#B5E61D] bg-[#FAFDEB] text-[#101820]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                All pathways
              </button>
              {pathwayGroups.map((group) => (
                <button
                  key={group.pathway}
                  type="button"
                  onClick={() => setActivePathway(group.pathway)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    activePathway === group.pathway ? 'border-[#B5E61D] bg-[#FAFDEB] text-[#101820]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {group.pathway}
                  <span className="ml-2 rounded-full bg-[#F8FAFC] px-2 py-0.5 text-xs text-slate-400">{group.labs.length}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {visiblePathwayLabs.length === 0 ? (
                <EmptyState title="No labs in this pathway yet." />
              ) : (
                visiblePathwayLabs.map((lab) => (
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
                    {lab.seniorVersion ?? lab.topic ?? lab.topicArea ?? lab.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {lab.seniorVersion ?? lab.topic ?? lab.topicArea ?? lab.description}
                      </p>
                    ) : null}
                    {lab.competency ? (
                      <div className="mt-4">
                        <LabMeta label="Competency" value={lab.competency} />
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
                ))
              )}
            </div>
          </>
        )}
      </ActionCard>

      <ActionCard
        title="Career connections"
        meta="See where these labs can take you"
        icon={<CareerIcon />}
        action={
          <Link
            to="/student/pathways"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-slate-50"
          >
            View pathways
            <ArrowIcon />
          </Link>
        }
      >
        <p className="text-sm leading-6 text-slate-500">
          Your STEM Pathways profile matches labs like these to careers, required subjects, and university programs — open it to
          see your personalised recommendations.
        </p>
      </ActionCard>

      <ActionCard title="Full catalogue" meta="Browse by subject" icon={<LabIcon />}>
        <CategoryBrowser categoriesWithLabs={categoriesWithLabs} isLoading={isLoading} embedded />
      </ActionCard>
    </>
  );
}

// ---- Shared category/subject/lab browser (also the fallback generic view) ----

function CategoryBrowser({
  categoriesWithLabs,
  isLoading,
  embedded = false,
}: {
  categoriesWithLabs: CategoryWithLabs[];
  isLoading: boolean;
  embedded?: boolean;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

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
    <div className={embedded ? '' : 'space-y-6'}>
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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

          {isLoading ? (
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

          {isLoading ? (
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
