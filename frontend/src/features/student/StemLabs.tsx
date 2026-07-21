import { useMemo, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labsApi, labSessionsApi } from '../../api/labs.api';
import { cslActivitiesApi, cslSubmissionsApi } from '../../api/csl.api';
import { uploadsApi } from '../../api/uploads.api';
import { apiErrorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { schoolsApi } from '../../api/schools.api';
import type { Lab } from '../../types';

const STEM_CATEGORIES = [
  {
    name: 'Pure Sciences',
    description: 'Curriculum-aligned scientific inquiry across core science disciplines.',
    subjects: ['Biology', 'Chemistry', 'Physics', 'General Science'],
  },
  {
    name: 'Applied Sciences',
    description: 'Applied learning designed to connect science with practical problem-solving.',
    subjects: ['Agriculture', 'Computer Studies', 'Home Science'],
  },
  {
    name: 'Technical Studies',
    description: 'Technical exploration for systems, tools, design, and pathway preparation.',
    subjects: ['Electricity', 'Aviation', 'Building & Construction', 'Power Mechanics', 'Woodwork', 'Media Technology'],
  },
] as const;

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M10 3h4M11 3v5.5L6.4 16a3 3 0 0 0 2.6 4.5h6a3 3 0 0 0 2.6-4.5L13 8.5V3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 14h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AtomIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4c3.8 0 7 3.6 7 8s-3.2 8-7 8-7-3.6-7-8 3.2-8 7-8Z" fill="none" stroke="currentColor" strokeWidth="1.7" transform="rotate(60 12 12)" />
      <path d="M12 4c3.8 0 7 3.6 7 8s-3.2 8-7 8-7-3.6-7-8 3.2-8 7-8Z" fill="none" stroke="currentColor" strokeWidth="1.7" transform="rotate(-60 12 12)" />
    </svg>
  );
}

function LabScreenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <rect x="4" y="5" width="16" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 19h6M12 16v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="9" y="4" width="6" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="6" width="11" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15 10l5-3v10l-5-3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function ReflectionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M7 5h10a2 2 0 0 1 2 2v10H7a2 2 0 0 0-2 2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 9h6M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 19V9M12 19V5M19 19v-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.5l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

function DashboardIconFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D] shadow-sm">
      {children}
    </div>
  );
}

function classifyCategory(subject: string) {
  const normalized = subject.trim().toLowerCase();
  for (const category of STEM_CATEGORIES) {
    if (category.subjects.some((entry) => entry.toLowerCase() === normalized)) {
      return category.name;
    }
  }
  return 'Pure Sciences';
}

function formatMinutes(value: number | null) {
  return value ? `${value} minutes` : 'Duration set by content manager';
}

function formatDifficulty(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

// Both catalogs (labs, CSL activities) are auto-scoped to the student's own
// grade server-side (LabsService.findAll / CslActivitiesService.findAll).
export function StemLabsPage() {
  const [tab, setTab] = useState<'labs' | 'csl'>('labs');
  const user = useAuthStore((s) => s.user);
  const { data: school } = useQuery({
    queryKey: ['school', user?.schoolId],
    queryFn: () => schoolsApi.findOne(user!.schoolId),
    enabled: !!user?.schoolId,
  });

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(16,24,32,0.08)]">
        <div className="grid gap-6 bg-[#101820] px-6 py-8 text-white md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 hidden w-40 bg-[radial-gradient(circle_at_center,rgba(181,230,29,0.2),transparent_70%)] md:block" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B5E61D]">STEM Labs</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Explore STEM Labs</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                Interactive science experiences designed for your learning pathway. This workspace is built
                to deliver structured STEM content, practical learning, and future-ready scientific exploration.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">
                  {user?.grade ? `Grade ${user.grade}` : 'Grade profile available'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">
                  Pathway profile ready
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">
                  {school?.name ?? 'School-linked STEM workspace'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Student context</p>
            <div className="mt-5 grid gap-3">
              <ContextItem label="Student" value={user?.name ?? 'Student account'} />
              <ContextItem label="School" value={school?.name ?? 'School profile available when loaded'} />
              <ContextItem label="Grade" value={user?.grade ? `Grade ${user.grade}` : 'Grade not assigned'} />
              <ContextItem label="Pathway" value="Learning pathway will appear here when available" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === 'labs'} onClick={() => setTab('labs')} label="STEM Labs" />
          <TabButton active={tab === 'csl'} onClick={() => setTab('csl')} label="Community Service (CSL)" />
        </div>
      </section>

      {tab === 'labs' ? <LabsTab /> : <CslTab />}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        active
          ? 'bg-[#101820] text-white shadow-sm'
          : 'bg-[#F8FAFC] text-slate-600 hover:bg-white hover:text-[#101820]'
      }`}
    >
      {label}
    </button>
  );
}

function LabsTab() {
  const user = useAuthStore((s) => s.user);
  const { data: labs, isLoading } = useQuery({ queryKey: ['labs'], queryFn: () => labsApi.findAll() });
  const { data: sessions } = useQuery({
    queryKey: ['lab-sessions', user?.id],
    queryFn: () => labSessionsApi.findAll({ studentId: user?.id }),
    enabled: !!user,
  });
  const [openLabId, setOpenLabId] = useState<number | null>(null);

  const completedKeys = new Set((sessions ?? []).map((s) => s.labKey));

  const categoryData = useMemo(() => {
    return STEM_CATEGORIES.map((category) => {
      const categoryLabs = (labs ?? []).filter((lab) => classifyCategory(lab.subject) === category.name);
      const subjects = Array.from(new Set(categoryLabs.map((lab) => lab.subject)));
      return {
        ...category,
        count: categoryLabs.length,
        subjects,
      };
    });
  }, [labs]);

  const subjectGroups = useMemo(() => {
    return Array.from(
      ((labs ?? []).reduce((map, lab) => {
        const current = map.get(lab.subject) ?? [];
        current.push(lab);
        map.set(lab.subject, current);
        return map;
      }, new Map<string, Lab[]>())),
    ).sort(([subjectA], [subjectB]) => subjectA.localeCompare(subjectB));
  }, [labs]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        {categoryData.map((category) => (
          <article
            key={category.name}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]"
          >
            <DashboardIconFrame>
              {category.name === 'Pure Sciences' ? <AtomIcon /> : category.name === 'Applied Sciences' ? <FlaskIcon /> : <LabScreenIcon />}
            </DashboardIconFrame>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-[#101820]">{category.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{category.description}</p>
            <p className="mt-5 text-sm font-medium text-slate-700">
              {category.count} {category.count === 1 ? 'lab' : 'labs'} available
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {category.subjects.length > 0 ? category.subjects.join(', ') : 'Content will appear as labs are published'}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
        <div className="flex items-start gap-3">
          <DashboardIconFrame>
            <LabScreenIcon />
          </DashboardIconFrame>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subject catalog</p>
            <h2 className="mt-1 text-xl font-semibold text-[#101820]">STEM subjects for your grade</h2>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
            Loading STEM labs...
          </p>
        ) : subjectGroups.length === 0 ? (
          <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
            No labs published for your grade yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subjectGroups.map(([subject, subjectLabs]) => (
              <article key={subject} className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {classifyCategory(subject)}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#101820]">{subject}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {subjectDescription(subject)}
                </p>
                <p className="mt-4 text-sm font-medium text-slate-700">
                  {subjectLabs.length} {subjectLabs.length === 1 ? 'lab' : 'labs'} available
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
        <div className="flex items-start gap-3">
          <DashboardIconFrame>
            <FlaskIcon />
          </DashboardIconFrame>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lab framework</p>
            <h2 className="mt-1 text-xl font-semibold text-[#101820]">Interactive learning experiences</h2>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
            Loading lab delivery framework...
          </p>
        ) : (labs ?? []).length === 0 ? (
          <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
            STEM lab cards will appear here when your grade-level content is published.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {(labs ?? []).map((lab) => (
              <div
                key={lab.id}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenLabId(openLabId === lab.id ? null : lab.id)}
                  className="flex w-full flex-col gap-4 px-5 py-5 text-left md:flex-row md:items-start md:justify-between"
                >
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {lab.subject}
                      </span>
                      <span className="rounded-full bg-[#FAFDEB] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#5B6B11]">
                        {user?.grade ? `Grade ${user.grade}` : `Grade ${lab.grade}`}
                      </span>
                      {completedKeys.has(lab.key) ? (
                        <span className="rounded-full border border-[#D7E89A] bg-[#EEF8D1] px-3 py-1 text-xs font-semibold text-[#4D6310]">
                          Completed
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          Available
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-[#101820]">{lab.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {lab.topicArea ?? lab.description ?? 'Structured STEM learning activity'}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <LabMeta label="Topic" value={lab.topicArea ?? 'Topic set by content manager'} />
                      <LabMeta label="Learning objective" value={lab.competency ?? 'Learning objective will appear here'} />
                      <LabMeta label="Duration" value={formatMinutes(lab.durationMinutes)} icon={<ClockIcon />} />
                      <LabMeta label="Activity type" value={formatDifficulty(lab.type)} />
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#101820]">
                    {openLabId === lab.id ? 'Hide lab' : 'Open lab'}
                    <ArrowIcon />
                  </span>
                </button>
                {openLabId === lab.id && <LabDetail lab={lab} />}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-start gap-3">
            <DashboardIconFrame>
              <LabScreenIcon />
            </DashboardIconFrame>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Interactive framework</p>
              <h2 className="mt-1 text-xl font-semibold text-[#101820]">Future lab delivery components</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ConceptCard
              icon={<MicIcon />}
              title="Voice guidance"
              description="Prepared for guided narration and spoken activity support."
            />
            <ConceptCard
              icon={<VideoIcon />}
              title="Image and video resources"
              description="Prepared for rich media demonstrations and teacher-linked resources."
            />
            <ConceptCard
              icon={<LabScreenIcon />}
              title="Simulation area"
              description="Prepared for interactive scientific models and digital experimentation."
            />
            <ConceptCard
              icon={<ChartIcon />}
              title="Question assessment"
              description="Prepared for knowledge checks, scoring, and competency verification."
            />
            <ConceptCard
              icon={<ReflectionIcon />}
              title="Reflection"
              description="Prepared for student observations, conclusions, and scientific thinking records."
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
          <div className="flex items-start gap-3">
            <DashboardIconFrame>
              <ChartIcon />
            </DashboardIconFrame>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Learning report</p>
              <h2 className="mt-1 text-xl font-semibold text-[#101820]">Future-ready STEM learning record</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <ReportPlaceholder
              title="Lab completed"
              description="This area will store completed lab records once connected to the broader student portfolio."
            />
            <ReportPlaceholder
              title="Time spent"
              description="Learning time will appear here when deeper interactive tracking is connected."
            />
            <ReportPlaceholder
              title="Score and learning outcomes"
              description="Performance summaries and achieved outcomes will appear after lab assessment flows expand."
            />
            <ReportPlaceholder
              title="Areas for improvement"
              description="Reflection and teacher-guided improvement areas will eventually feed into My Activities."
            />
          </div>
        </section>
      </section>
    </div>
  );
}

function LabDetail({ lab }: { lab: Lab }) {
  const queryClient = useQueryClient();
  const { data: full } = useQuery({ queryKey: ['lab', lab.id], queryFn: () => labsApi.findOne(lab.id) });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: () =>
      labSessionsApi.create({
        labKey: lab.key,
        competency: lab.competency ?? undefined,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          answer,
        })),
      }),
    onSuccess: () => {
      setStatus('Lab marked complete.');
      queryClient.invalidateQueries({ queryKey: ['lab-sessions'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save')),
  });

  return (
    <div className="border-t border-slate-200 bg-[#F8FAFC] px-5 py-5">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h4 className="text-lg font-semibold text-[#101820]">Lab brief</h4>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {lab.description ?? 'This lab will provide a structured STEM investigation for the student.'}
            </p>
            {lab.resourceUrl ? (
              <a
                href={lab.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#101820] hover:text-[#6D8F08]"
              >
                Open learning resource
                <ArrowIcon />
              </a>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h4 className="text-lg font-semibold text-[#101820]">Interactive learning framework</h4>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FrameworkPill label="Interactive activity" />
              <FrameworkPill label="Voice guidance ready" />
              <FrameworkPill label="Media resource support" />
              <FrameworkPill label="Question assessment" />
              <FrameworkPill label="Reflection and outcomes" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <h4 className="text-lg font-semibold text-[#101820]">Knowledge check</h4>
          {(full?.questions ?? []).length > 0 ? (
            <div className="mt-4 space-y-4">
              {(full?.questions ?? []).map((q) => {
                const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
                return (
                  <div key={q.id} className="rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4 text-sm">
                    <p className="font-medium text-[#101820]">{q.questionText}</p>
                    {opts.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {opts.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-slate-600">
                            <input
                              type="radio"
                              name={`lab-q-${q.id}`}
                              onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4 text-sm text-slate-500">
              Question assessment will appear here when configured for this lab.
            </p>
          )}
          {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
          <button
            type="button"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1D2C38] disabled:opacity-60"
          >
            {completeMutation.isPending ? 'Saving...' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CslTab() {
  const user = useAuthStore((s) => s.user);
  const { data: activities, isLoading } = useQuery({ queryKey: ['csl-activities'], queryFn: () => cslActivitiesApi.findAll() });
  const { data: submissions } = useQuery({
    queryKey: ['csl-submissions', user?.id],
    queryFn: () => cslSubmissionsApi.findAll({ studentId: user?.id }),
    enabled: !!user,
  });
  const submittedIds = new Set((submissions ?? []).map((s) => s.cslActivityId));
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
      <div className="flex items-start gap-3">
        <DashboardIconFrame>
          <ReflectionIcon />
        </DashboardIconFrame>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Community service</p>
          <h2 className="mt-1 text-xl font-semibold text-[#101820]">CSL activities and reflection</h2>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
          Loading CSL activities...
        </p>
      ) : (activities ?? []).length === 0 ? (
        <p className="mt-6 rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
          No CSL activities published for your grade yet.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {(activities ?? []).map((activity) => {
            const existing = (submissions ?? []).find((s) => s.cslActivityId === activity.id);
            return (
              <div key={activity.id} className="overflow-hidden rounded-[24px] border border-slate-200">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === activity.id ? null : activity.id)}
                  className="flex w-full flex-col gap-3 px-5 py-5 text-left md:flex-row md:items-start md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        CSL activity
                      </span>
                      {activity.isRequired ? (
                        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          Required
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-[#101820]">{activity.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {activity.targetHours ? `${activity.targetHours} hour target` : 'Hours target set by school'}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {existing?.status ?? 'Available'}
                  </span>
                </button>
                {openId === activity.id ? (
                  <CslSubmitForm
                    activityId={activity.id}
                    description={activity.description}
                    disabled={submittedIds.has(activity.id)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CslSubmitForm({ activityId, description, disabled }: { activityId: number; description: string | null; disabled: boolean }) {
  const queryClient = useQueryClient();
  const [reflection, setReflection] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: () => cslSubmissionsApi.create({ cslActivityId: activityId, evidenceUrl: evidenceUrl ?? undefined, reflection }),
    onSuccess: () => {
      setStatus('Submitted for review.');
      queryClient.invalidateQueries({ queryKey: ['csl-submissions'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not submit')),
  });

  return (
    <div className="border-t border-slate-200 bg-[#F8FAFC] px-5 py-5">
      {description ? <p className="text-sm leading-7 text-slate-600">{description}</p> : null}
      {disabled ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          You've already submitted this activity.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <input
            type="file"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const res = await uploadsApi.uploadSingle(file);
                setEvidenceUrl(res.url);
              } catch (err) {
                setStatus(apiErrorMessage(err, 'Upload failed'));
              } finally {
                setUploading(false);
              }
            }}
            className="text-sm"
          />
          {evidenceUrl ? <p className="text-xs font-medium text-green-700">Evidence uploaded.</p> : null}
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Reflection - what did you do and learn?"
            rows={3}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
          />
          {status ? <p className="text-sm text-slate-600">{status}</p> : null}
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="inline-flex items-center justify-center rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1D2C38] disabled:opacity-60"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function LabMeta({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
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

function ConceptCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F8FAFC] text-[#101820]">
        {icon}
      </div>
      <p className="mt-4 text-lg font-semibold text-[#101820]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ReportPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-4">
      <p className="text-sm font-semibold text-[#101820]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function FrameworkPill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-slate-200 bg-[#F8FAFC] px-4 py-2 text-sm font-medium text-slate-600">
      {label}
    </div>
  );
}

function subjectDescription(subject: string) {
  const normalized = subject.trim().toLowerCase();
  if (normalized === 'biology') return 'Explore living systems through investigation and discovery.';
  if (normalized === 'chemistry') return 'Understand matter, reactions, and materials through practical inquiry.';
  if (normalized === 'physics') return 'Explore forces, energy, motion, and technology through structured experimentation.';
  if (normalized === 'general science') return 'Build broad scientific understanding across multiple scientific domains.';
  if (normalized === 'agriculture') return 'Connect scientific principles to food systems, land use, and applied production.';
  if (normalized === 'computer studies') return 'Develop computational thinking and digital problem-solving through applied tasks.';
  if (normalized === 'home science') return 'Apply scientific principles to everyday living, nutrition, and design contexts.';
  return 'Explore structured STEM learning aligned with curriculum goals and pathway growth.';
}
