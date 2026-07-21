import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axios';
import { labsApi, stemApi } from '../../api/labs.api';
import type { StemCategory, StemSubject } from '../../types';

type MediaDraft = {
  type: string;
  title: string;
  caption: string;
  url: string;
  order: number;
};

type StepDraft = {
  title: string;
  instruction: string;
  mediaUrl: string;
  interactionType: string;
  expectedOutcome: string;
  order: number;
};

type ReflectionDraft = {
  prompt: string;
  order: number;
};

type LabDraft = {
  title: string;
  category: number | '';
  stemSubject: number | '';
  subject: string;
  grade: string;
  topic: string;
  topicArea: string;
  competency: string;
  pathway: string;
  description: string;
  durationMinutes: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  type: 'SIMULATION' | 'PRACTICAL';
  resourceUrl: string;
  introVideoUrl: string;
  animationUrl: string;
  voiceAudioUrl: string;
  isPublished: boolean;
  media: MediaDraft[];
  steps: StepDraft[];
  reflectionPrompts: ReflectionDraft[];
  completionReportTemplate: {
    title: string;
    summary: string;
    outcomesText: string;
  };
};

function emptyDraft(): LabDraft {
  return {
    title: '',
    category: '',
    stemSubject: '',
    subject: '',
    grade: '',
    topic: '',
    topicArea: '',
    competency: '',
    pathway: '',
    description: '',
    durationMinutes: '',
    status: 'DRAFT',
    type: 'SIMULATION',
    resourceUrl: '',
    introVideoUrl: '',
    animationUrl: '',
    voiceAudioUrl: '',
    isPublished: false,
    media: [],
    steps: [],
    reflectionPrompts: [],
    completionReportTemplate: {
      title: '',
      summary: '',
      outcomesText: '',
    },
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function formatStatus(status?: string) {
  return (status ?? 'DRAFT').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMinutes(value?: number | null) {
  return value ? `${value} min` : 'Not set';
}

function CollectionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="5" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="5" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function FlaskIcon() {
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

function PublishIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M12 4v11m0 0-4-4m4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CategoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function SectionCard({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#101820]">{title}</h2>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#101820]">{value}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-slate-700">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#B5E61D] ${props.className ?? ''}`} />;
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#B5E61D] ${props.className ?? ''}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#B5E61D] ${props.className ?? ''}`} />;
}

export function StemContentStudio() {
  const queryClient = useQueryClient();
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [draft, setDraft] = useState<LabDraft>(emptyDraft());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const { data: labs = [], isLoading: labsLoading } = useQuery({
    queryKey: ['platform-labs'],
    queryFn: () => labsApi.findAll(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['stem-categories'],
    queryFn: stemApi.findCategories,
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['stem-subjects'],
    queryFn: stemApi.findSubjects,
  });
  const { data: selectedLab, isLoading: selectedLabLoading } = useQuery({
    queryKey: ['platform-lab-cms', selectedLabId],
    queryFn: () => labsApi.findCms(selectedLabId!),
    enabled: selectedLabId !== null,
  });

  useEffect(() => {
    if (!selectedLab) return;
    setDraft({
      title: selectedLab.title ?? '',
      category: selectedLab.category?.id ?? selectedLab.categoryId ?? '',
      stemSubject: selectedLab.stemSubject?.id ?? selectedLab.stemSubjectId ?? '',
      subject: selectedLab.subject ?? '',
      grade: selectedLab.grade ?? '',
      topic: selectedLab.topic ?? '',
      topicArea: selectedLab.topicArea ?? '',
      competency: selectedLab.competency ?? '',
      pathway: selectedLab.pathway ?? '',
      description: selectedLab.description ?? '',
      durationMinutes: selectedLab.durationMinutes ? String(selectedLab.durationMinutes) : '',
      status: (selectedLab.status as LabDraft['status']) ?? 'DRAFT',
      type: selectedLab.type === 'PRACTICAL' ? 'PRACTICAL' : 'SIMULATION',
      resourceUrl: selectedLab.resourceUrl ?? '',
      introVideoUrl: selectedLab.introVideoUrl ?? '',
      animationUrl: selectedLab.animationUrl ?? '',
      voiceAudioUrl: selectedLab.voiceAudioUrl ?? '',
      isPublished: selectedLab.isPublished,
      media: (selectedLab.media ?? []).map((item, index) => ({
        type: item.type,
        title: item.title ?? '',
        caption: item.caption ?? '',
        url: item.url,
        order: item.order ?? index,
      })),
      steps: (selectedLab.steps ?? []).map((item, index) => ({
        title: item.title,
        instruction: item.instruction,
        mediaUrl: item.mediaUrl ?? '',
        interactionType: item.interactionType ?? '',
        expectedOutcome: item.expectedOutcome ?? '',
        order: item.order ?? index,
      })),
      reflectionPrompts: (selectedLab.reflectionPrompts ?? []).map((item, index) => ({
        prompt: item.prompt,
        order: item.order ?? index,
      })),
      completionReportTemplate: {
        title: selectedLab.completionReportTemplate?.title ?? '',
        summary: selectedLab.completionReportTemplate?.summary ?? '',
        outcomesText:
          selectedLab.completionReportTemplate?.outcomesJson != null
            ? JSON.stringify(selectedLab.completionReportTemplate.outcomesJson, null, 2)
            : '',
      },
    });
    setPreviewMode(false);
    setStatusMessage(null);
  }, [selectedLab]);

  const createMutation = useMutation({
    mutationFn: () => labsApi.create(buildLabPayload(draft)),
    onSuccess: async (lab) => {
      setStatusMessage('Lab created successfully.');
      setSelectedLabId(lab.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform-labs'] }),
        queryClient.invalidateQueries({ queryKey: ['platform-lab-cms'] }),
      ]);
    },
    onError: (error) => setStatusMessage(apiErrorMessage(error, 'Could not create lab')),
  });

  const updateMutation = useMutation({
    mutationFn: () => labsApi.update(selectedLabId!, buildLabPayload(draft)),
    onSuccess: async () => {
      setStatusMessage('Lab updated successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform-labs'] }),
        queryClient.invalidateQueries({ queryKey: ['platform-lab-cms', selectedLabId] }),
      ]);
    },
    onError: (error) => setStatusMessage(apiErrorMessage(error, 'Could not update lab')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => labsApi.remove(selectedLabId!),
    onSuccess: async () => {
      setStatusMessage('Lab deleted successfully.');
      setSelectedLabId(null);
      setDraft(emptyDraft());
      await queryClient.invalidateQueries({ queryKey: ['platform-labs'] });
    },
    onError: (error) => setStatusMessage(apiErrorMessage(error, 'Could not delete lab')),
  });

  const filteredSubjects = subjects.filter((subject) => {
    if (!draft.category) return true;
    return subject.categoryId === draft.category;
  });

  const totalLabs = labs.length;
  const draftLabs = labs.filter((lab) => lab.status === 'DRAFT' || !lab.isPublished).length;
  const publishedLabs = labs.filter((lab) => lab.status === 'PUBLISHED' || lab.isPublished).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(16,24,32,0.08)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Platform Admin</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#101820]">STEM Content Studio</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Create and manage the platform-wide STEM learning library for virtual practical experiences,
              structured media delivery, guided steps, reflections, and completion reporting.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedLabId(null);
                setDraft(emptyDraft());
                setStatusMessage(null);
                setPreviewMode(false);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              <PlusIcon />
              New lab
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#101820] transition hover:border-[#B5E61D]"
            >
              <PreviewIcon />
              {previewMode ? 'Close preview' : 'Preview mode'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total labs" value={totalLabs} />
        <StatCard label="Draft labs" value={draftLabs} />
        <StatCard label="Published labs" value={publishedLabs} />
        <StatCard label="Categories" value={categories.length} />
        <StatCard label="Subjects" value={subjects.length} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <div className="space-y-6">
          <SectionCard icon={<CollectionIcon />} eyebrow="Library dashboard" title="STEM library">
            {labsLoading ? (
              <p className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">Loading STEM library...</p>
            ) : (
              <div className="space-y-3">
                {labs.map((lab) => (
                  <button
                    key={lab.id}
                    type="button"
                    onClick={() => setSelectedLabId(lab.id)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      selectedLabId === lab.id ? 'border-[#B5E61D] bg-[#FAFDEB]' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#101820]">{lab.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {lab.subject} · {lab.grade}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {formatStatus(lab.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                      <span>{formatMinutes(lab.durationMinutes)}</span>
                      <span>{lab._count?.questions ?? lab.questions?.length ?? 0} questions</span>
                    </div>
                  </button>
                ))}
                {labs.length === 0 ? (
                  <p className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">
                    No STEM labs have been authored yet.
                  </p>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={<CategoryIcon />} eyebrow="Taxonomy" title="Platform STEM structure">
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#101820]">{category.name}</p>
                    <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-slate-500">
                      {category._count?.labs ?? 0} labs
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {category.subjects?.map((subject) => subject.name).join(', ') || 'Subjects will appear here when configured.'}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard icon={<FlaskIcon />} eyebrow="Authoring workflow" title={selectedLabId ? 'Edit STEM lab' : 'Create new STEM lab'}>
            {selectedLabLoading ? (
              <p className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-500">Loading lab content...</p>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Title</FieldLabel>
                    <TextInput value={draft.title} onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))} placeholder="Photosynthesis virtual practical" />
                  </div>
                  <div>
                    <FieldLabel>Grade</FieldLabel>
                    <TextInput value={draft.grade} onChange={(e) => setDraft((current) => ({ ...current, grade: e.target.value }))} placeholder="Grade 12" />
                  </div>
                  <div>
                    <FieldLabel>Category</FieldLabel>
                    <SelectInput
                      value={draft.category}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          category: e.target.value ? Number(e.target.value) : '',
                          stemSubject: '',
                        }))
                      }
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Subject</FieldLabel>
                    <SelectInput
                      value={draft.stemSubject}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : '';
                        const subject = subjects.find((item) => item.id === value);
                        setDraft((current) => ({
                          ...current,
                          stemSubject: value,
                          subject: subject?.name ?? current.subject,
                        }));
                      }}
                    >
                      <option value="">Select subject</option>
                      {filteredSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Topic</FieldLabel>
                    <TextInput value={draft.topic} onChange={(e) => setDraft((current) => ({ ...current, topic: e.target.value }))} placeholder="Gas exchange in leaves" />
                  </div>
                  <div>
                    <FieldLabel>Competency</FieldLabel>
                    <TextInput value={draft.competency} onChange={(e) => setDraft((current) => ({ ...current, competency: e.target.value }))} placeholder="Scientific investigation and observation" />
                  </div>
                  <div>
                    <FieldLabel>Pathway</FieldLabel>
                    <TextInput value={draft.pathway} onChange={(e) => setDraft((current) => ({ ...current, pathway: e.target.value }))} placeholder="Pure Sciences" />
                  </div>
                  <div>
                    <FieldLabel>Duration (minutes)</FieldLabel>
                    <TextInput value={draft.durationMinutes} onChange={(e) => setDraft((current) => ({ ...current, durationMinutes: e.target.value }))} placeholder="25" />
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <SelectInput
                      value={draft.status}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          status: e.target.value as LabDraft['status'],
                          isPublished: e.target.value === 'PUBLISHED',
                        }))
                      }
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Delivery mode</FieldLabel>
                    <SelectInput value={draft.type} onChange={(e) => setDraft((current) => ({ ...current, type: e.target.value as LabDraft['type'] }))}>
                      <option value="SIMULATION">Simulation</option>
                      <option value="PRACTICAL">Practical</option>
                    </SelectInput>
                  </div>
                </div>

                <div>
                  <FieldLabel>Short topic descriptor</FieldLabel>
                  <TextInput value={draft.topicArea} onChange={(e) => setDraft((current) => ({ ...current, topicArea: e.target.value }))} placeholder="Leaf structure and stomata" />
                </div>

                <div>
                  <FieldLabel>Description</FieldLabel>
                  <TextArea value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} rows={4} placeholder="Describe the virtual practical experience, learning goal, and student outcome." />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard icon={<PublishIcon />} eyebrow="Media management" title="Rich media delivery">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FieldLabel>Intro video URL</FieldLabel>
                <TextInput value={draft.introVideoUrl} onChange={(e) => setDraft((current) => ({ ...current, introVideoUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <FieldLabel>Animation URL</FieldLabel>
                <TextInput value={draft.animationUrl} onChange={(e) => setDraft((current) => ({ ...current, animationUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <FieldLabel>Voice audio URL</FieldLabel>
                <TextInput value={draft.voiceAudioUrl} onChange={(e) => setDraft((current) => ({ ...current, voiceAudioUrl: e.target.value }))} placeholder="https://..." />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {draft.media.map((item, index) => (
                <div key={`${item.type}-${index}`} className="grid gap-3 rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4 md:grid-cols-[0.8fr_1fr_1fr_auto]">
                  <SelectInput
                    value={item.type}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        media: current.media.map((entry, mediaIndex) =>
                          mediaIndex === index ? { ...entry, type: e.target.value } : entry,
                        ),
                      }))
                    }
                  >
                    <option value="VIDEO">Video</option>
                    <option value="ANIMATION">Animation</option>
                    <option value="AUDIO">Audio</option>
                    <option value="IMAGE">Image</option>
                  </SelectInput>
                  <TextInput
                    value={item.title}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        media: current.media.map((entry, mediaIndex) =>
                          mediaIndex === index ? { ...entry, title: e.target.value } : entry,
                        ),
                      }))
                    }
                    placeholder="Media title"
                  />
                  <TextInput
                    value={item.url}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        media: current.media.map((entry, mediaIndex) =>
                          mediaIndex === index ? { ...entry, url: e.target.value } : entry,
                        ),
                      }))
                    }
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        media: current.media.filter((_, mediaIndex) => mediaIndex !== index),
                      }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
                  >
                    Remove
                  </button>
                  <div className="md:col-span-4">
                    <TextInput
                      value={item.caption}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          media: current.media.map((entry, mediaIndex) =>
                            mediaIndex === index ? { ...entry, caption: e.target.value } : entry,
                          ),
                        }))
                      }
                      placeholder="Caption or usage note"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    media: [
                      ...current.media,
                      {
                        type: 'IMAGE',
                        title: '',
                        caption: '',
                        url: '',
                        order: current.media.length,
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                <PlusIcon />
                Add media item
              </button>
            </div>
          </SectionCard>

          <SectionCard icon={<CollectionIcon />} eyebrow="Practical steps" title="Step builder">
            <div className="space-y-3">
              {draft.steps.map((step, index) => (
                <div key={`${step.title}-${index}`} className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextInput
                      value={step.title}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.map((entry, stepIndex) =>
                            stepIndex === index ? { ...entry, title: e.target.value } : entry,
                          ),
                        }))
                      }
                      placeholder="Step title"
                    />
                    <TextInput
                      value={step.mediaUrl}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.map((entry, stepIndex) =>
                            stepIndex === index ? { ...entry, mediaUrl: e.target.value } : entry,
                          ),
                        }))
                      }
                      placeholder="Optional media URL"
                    />
                  </div>
                  <div className="mt-3">
                    <TextArea
                      value={step.instruction}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.map((entry, stepIndex) =>
                            stepIndex === index ? { ...entry, instruction: e.target.value } : entry,
                          ),
                        }))
                      }
                      rows={3}
                      placeholder="Describe what the student should do in this step."
                    />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <TextInput
                      value={step.interactionType}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.map((entry, stepIndex) =>
                            stepIndex === index ? { ...entry, interactionType: e.target.value } : entry,
                          ),
                        }))
                      }
                      placeholder="Interaction type"
                    />
                    <TextInput
                      value={step.expectedOutcome}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.map((entry, stepIndex) =>
                            stepIndex === index ? { ...entry, expectedOutcome: e.target.value } : entry,
                          ),
                        }))
                      }
                      placeholder="Expected outcome"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    steps: [
                      ...current.steps,
                      {
                        title: '',
                        instruction: '',
                        mediaUrl: '',
                        interactionType: '',
                        expectedOutcome: '',
                        order: current.steps.length,
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                <PlusIcon />
                Add practical step
              </button>
            </div>
          </SectionCard>

          <SectionCard icon={<CategoryIcon />} eyebrow="Reflection builder" title="Reflection prompts">
            <div className="space-y-3">
              {draft.reflectionPrompts.map((prompt, index) => (
                <div key={`${prompt.prompt}-${index}`} className="flex gap-3 rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4">
                  <TextArea
                    value={prompt.prompt}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        reflectionPrompts: current.reflectionPrompts.map((entry, reflectionIndex) =>
                          reflectionIndex === index ? { ...entry, prompt: e.target.value } : entry,
                        ),
                      }))
                    }
                    rows={2}
                    placeholder="Ask the learner to explain, reflect, or conclude."
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        reflectionPrompts: current.reflectionPrompts.filter((_, reflectionIndex) => reflectionIndex !== index),
                      }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    reflectionPrompts: [
                      ...current.reflectionPrompts,
                      {
                        prompt: '',
                        order: current.reflectionPrompts.length,
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                <PlusIcon />
                Add reflection prompt
              </button>
            </div>
          </SectionCard>

          <SectionCard icon={<PublishIcon />} eyebrow="Completion report" title="Report configuration">
            <div className="space-y-4">
              <div>
                <FieldLabel>Completion report title</FieldLabel>
                <TextInput
                  value={draft.completionReportTemplate.title}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      completionReportTemplate: {
                        ...current.completionReportTemplate,
                        title: e.target.value,
                      },
                    }))
                  }
                  placeholder="Biology practical completion report"
                />
              </div>
              <div>
                <FieldLabel>Report summary</FieldLabel>
                <TextArea
                  value={draft.completionReportTemplate.summary}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      completionReportTemplate: {
                        ...current.completionReportTemplate,
                        summary: e.target.value,
                      },
                    }))
                  }
                  rows={3}
                  placeholder="Summarize what the learner should demonstrate by completion."
                />
              </div>
              <div>
                <FieldLabel>Outcomes configuration</FieldLabel>
                <TextArea
                  value={draft.completionReportTemplate.outcomesText}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      completionReportTemplate: {
                        ...current.completionReportTemplate,
                        outcomesText: e.target.value,
                      },
                    }))
                  }
                  rows={5}
                  placeholder='["Observation accuracy", "Scientific explanation", "Reflection quality"]'
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<PreviewIcon />} eyebrow="Publish controls" title="Save and preview">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  if (selectedLabId) {
                    updateMutation.mutate();
                  } else {
                    createMutation.mutate();
                  }
                }}
                disabled={createMutation.isPending || updateMutation.isPending || !draft.title || !draft.subject || !draft.grade}
                className="inline-flex items-center justify-center rounded-2xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
              >
                {selectedLabId ? (updateMutation.isPending ? 'Saving...' : 'Save changes') : createMutation.isPending ? 'Creating...' : 'Create lab'}
              </button>
              {selectedLabId ? (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete lab'}
                </button>
              ) : null}
            </div>
            {statusMessage ? <p className="mt-4 text-sm text-slate-600">{statusMessage}</p> : null}
          </SectionCard>
        </div>
      </div>

      {previewMode ? (
        <SectionCard icon={<PreviewIcon />} eyebrow="Preview mode" title="Student experience preview">
          <PreviewPanel draft={draft} categories={categories} subjects={subjects} />
        </SectionCard>
      ) : null}
    </div>
  );
}

function PreviewPanel({
  draft,
  categories,
  subjects,
}: {
  draft: LabDraft;
  categories: StemCategory[];
  subjects: StemSubject[];
}) {
  const categoryName = categories.find((item) => item.id === draft.category)?.name ?? 'Selected category';
  const subjectName = subjects.find((item) => item.id === draft.stemSubject)?.name ?? (draft.subject || 'Selected subject');

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[#F8FAFC]">
      <div className="grid lg:grid-cols-[280px_1fr]">
        <aside className="bg-[#101820] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B5E61D]">STEM Labs</p>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight">{draft.title || 'Lab title preview'}</h3>
          <p className="mt-4 text-sm leading-7 text-white/75">
            {draft.description || 'A student-facing overview of this practical experience will appear here before publishing.'}
          </p>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Category</p>
              <p className="mt-2 text-sm font-medium">{categoryName}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Subject</p>
              <p className="mt-2 text-sm font-medium">{subjectName}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Grade</p>
              <p className="mt-2 text-sm font-medium">{draft.grade || 'Grade preview'}</p>
            </div>
          </div>
        </aside>

        <div className="space-y-6 p-6 md:p-8">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Media experience</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                ['Intro video', draft.introVideoUrl],
                ['Animation', draft.animationUrl],
                ['Voice audio', draft.voiceAudioUrl],
                ['Media items', draft.media.length > 0 ? `${draft.media.length} configured` : 'No media items yet'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4">
                  <p className="text-sm font-semibold text-[#101820]">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{value || 'Not configured yet'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Practical steps</p>
            <div className="mt-4 space-y-3">
              {draft.steps.length > 0 ? (
                draft.steps.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4">
                    <p className="text-sm font-semibold text-[#101820]">{step.title || `Step ${index + 1}`}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{step.instruction || 'Step instruction preview.'}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4 text-sm text-slate-500">No practical steps configured yet.</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Reflection prompts</p>
              <div className="mt-4 space-y-3">
                {draft.reflectionPrompts.length > 0 ? (
                  draft.reflectionPrompts.map((item, index) => (
                    <div key={`${item.prompt}-${index}`} className="rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4 text-sm text-slate-600">
                      {item.prompt || `Reflection prompt ${index + 1}`}
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4 text-sm text-slate-500">No reflection prompts configured yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Completion report</p>
              <p className="mt-4 text-lg font-semibold text-[#101820]">
                {draft.completionReportTemplate.title || 'Completion report title'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {draft.completionReportTemplate.summary || 'Completion summary preview will appear here.'}
              </p>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4 text-xs leading-6 text-slate-600">
                {draft.completionReportTemplate.outcomesText || '[]'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildLabPayload(draft: LabDraft) {
  const hasCompletionReport =
    Boolean(draft.completionReportTemplate.title) ||
    Boolean(draft.completionReportTemplate.summary) ||
    Boolean(draft.completionReportTemplate.outcomesText);

  return {
    key: slugify(draft.title),
    title: draft.title,
    category: draft.category || undefined,
    stemSubject: draft.stemSubject || undefined,
    subject: draft.subject,
    grade: draft.grade,
    topic: draft.topic || undefined,
    topicArea: draft.topicArea || undefined,
    competency: draft.competency || undefined,
    pathway: draft.pathway || undefined,
    description: draft.description || undefined,
    durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : undefined,
    status: draft.status,
    type: draft.type,
    resourceUrl: draft.resourceUrl || undefined,
    introVideoUrl: draft.introVideoUrl || undefined,
    animationUrl: draft.animationUrl || undefined,
    voiceAudioUrl: draft.voiceAudioUrl || undefined,
    isPublished: draft.status === 'PUBLISHED',
    media: draft.media
      .filter((item) => item.url.trim())
      .map((item, index) => ({
        type: item.type,
        title: item.title || undefined,
        caption: item.caption || undefined,
        url: item.url,
        order: index,
      })),
    steps: draft.steps
      .filter((item) => item.title.trim() || item.instruction.trim())
      .map((item, index) => ({
        title: item.title || `Step ${index + 1}`,
        instruction: item.instruction || 'Step instruction pending.',
        mediaUrl: item.mediaUrl || undefined,
        interactionType: item.interactionType || undefined,
        expectedOutcome: item.expectedOutcome || undefined,
        order: index,
      })),
    reflectionPrompts: draft.reflectionPrompts
      .filter((item) => item.prompt.trim())
      .map((item, index) => ({
        prompt: item.prompt,
        order: index,
      })),
    completionReportTemplate: hasCompletionReport
      ? {
          title: draft.completionReportTemplate.title || undefined,
          summary: draft.completionReportTemplate.summary || undefined,
          outcomesJson: parseOutcomesText(draft.completionReportTemplate.outcomesText),
        }
      : undefined,
  };
}

function parseOutcomesText(value: string) {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return { notes: value };
  }
}
