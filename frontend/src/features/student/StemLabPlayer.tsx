import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage } from '../../api/axios';
import { labsApi, labSessionsApi } from '../../api/labs.api';
import type { LabMedia } from '../../types';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M15 7l-6 5 6 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MediaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="5" width="11" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 9l5-3v12l-5-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function StepsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.8 9.6a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.3 1-1.3 1.8v.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" />
    </svg>
  );
}

function ReflectionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M7 5h10a2 2 0 0 1 2 2v10H7a2 2 0 0 0-2 2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 9h6M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M7 4h7l3 3v13H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 4v4h4M9 12h6M9 16h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatMinutes(value?: number | null) {
  return value ? `${value} min` : 'Flexible duration';
}

function normalizeOptions(options: unknown) {
  return Array.isArray(options) ? (options as string[]) : [];
}

function mediaKind(value?: string | null) {
  return (value ?? '').trim().toUpperCase();
}

export function StemLabPlayerPage() {
  const { id } = useParams();
  const labId = Number(id);
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [reflections, setReflections] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: lab, isLoading } = useQuery({
    queryKey: ['lab-player', labId],
    queryFn: () => labsApi.findOne(labId),
    enabled: Number.isFinite(labId),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      labSessionsApi.create({
        labKey: lab!.key,
        competency: lab?.competency ?? undefined,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          answer,
        })),
      }),
    onSuccess: async () => {
      setStatusMessage('Lab completed successfully.');
      await queryClient.invalidateQueries({ queryKey: ['lab-sessions'] });
    },
    onError: (error) => setStatusMessage(apiErrorMessage(error, 'Could not save lab completion')),
  });

  const totalSections = 5;
  const progressCount = useMemo(() => {
    if (!lab) return 0;
    let count = 1;
    if ((lab.media ?? []).length > 0 || lab.introVideoUrl || lab.animationUrl || lab.voiceAudioUrl) count++;
    if ((lab.steps ?? []).length > 0) count++;
    if ((lab.questions ?? []).length > 0) count++;
    if ((lab.reflectionPrompts ?? []).length > 0) count++;
    return Math.min(count, totalSections);
  }, [lab]);

  const playerMedia = useMemo(() => {
    if (!lab) return [];

    const structured = (lab.media ?? []).slice().sort((left, right) => left.order - right.order);
    const fallbackMedia: LabMedia[] = [];
    let nextId = -1;

    if (lab.introVideoUrl || lab.resourceUrl) {
      fallbackMedia.push({
        id: nextId--,
        labId: lab.id,
        type: 'VIDEO',
        title: 'Intro video',
        caption: 'Core introduction for this lab.',
        url: lab.introVideoUrl ?? lab.resourceUrl ?? '',
        order: -3,
      });
    }

    if (lab.animationUrl) {
      fallbackMedia.push({
        id: nextId--,
        labId: lab.id,
        type: 'ANIMATION',
        title: 'Animation',
        caption: 'Animated explanation for this lab.',
        url: lab.animationUrl,
        order: -2,
      });
    }

    if (lab.voiceAudioUrl) {
      fallbackMedia.push({
        id: nextId--,
        labId: lab.id,
        type: 'AUDIO',
        title: 'Voice guidance',
        caption: 'Audio support for the lab experience.',
        url: lab.voiceAudioUrl,
        order: -1,
      });
    }

    return [...fallbackMedia, ...structured];
  }, [lab]);

  if (isLoading) {
    return <p className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading STEM lab...</p>;
  }

  if (!lab) {
    return <p className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Lab not available.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/student/stem-labs" className="inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:opacity-80">
          <ArrowIcon />
          Back to STEM catalogue
        </Link>
      </div>

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(16,24,32,0.08)]">
        <div
          className="grid gap-6 px-6 py-8 text-white md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10"
          style={{ backgroundColor: 'var(--school-primary, #101820)' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--school-accent, #B5E61D)' }}>
              STEM Lab Player
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{lab.title}</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              {lab.description ?? 'Follow the practical steps, complete the learning tasks, and finish the lab record.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">{lab.subject}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">{lab.grade}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90">{formatMinutes(lab.durationMinutes)}</span>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Progress</p>
            <p className="mt-4 text-4xl font-semibold text-white">{Math.round((progressCount / totalSections) * 100)}%</p>
            <p className="mt-2 text-sm text-slate-300">Learning sections prepared in this lab</p>
            <div className="mt-5 h-3 rounded-full bg-white/10">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${(progressCount / totalSections) * 100}%`,
                  backgroundColor: 'var(--school-accent, #B5E61D)',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <SectionCard icon={<MediaIcon />} title="Lab overview">
            <div className="grid gap-4 md:grid-cols-3">
              <OverviewMeta label="Topic" value={lab.topic ?? lab.topicArea ?? 'Configured in studio'} />
              <OverviewMeta label="Competency" value={lab.competency ?? 'Competency configured'} />
              <OverviewMeta label="Pathway" value={lab.pathway ?? 'Grade-level STEM pathway'} />
            </div>
          </SectionCard>

          <SectionCard icon={<MediaIcon />} title="Media viewer">
            <div className="grid gap-4 md:grid-cols-2">
              <MediaSummaryCard title="Video" value={playerMedia.filter((item) => mediaKind(item.type) === 'VIDEO').length} />
              <MediaSummaryCard title="Animation" value={playerMedia.filter((item) => mediaKind(item.type) === 'ANIMATION').length} />
              <MediaSummaryCard title="Audio" value={playerMedia.filter((item) => mediaKind(item.type) === 'AUDIO').length} />
              <MediaSummaryCard title="Images" value={playerMedia.filter((item) => mediaKind(item.type) === 'IMAGE').length} />
            </div>
            {playerMedia.length > 0 ? (
              <div className="mt-4 grid gap-4">
                {playerMedia.map((item) => (
                  <RenderedMediaCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyCard text="No structured media is configured for this lab yet." />
            )}
          </SectionCard>

          <SectionCard icon={<StepsIcon />} title="Practical steps">
            {(lab.steps ?? []).length > 0 ? (
              <div className="space-y-3">
                {lab.steps?.map((step, index) => (
                  <div key={step.id} className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#101820]">{step.title || `Step ${index + 1}`}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{step.instruction}</p>
                      </div>
                      <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-slate-500">Step {index + 1}</span>
                    </div>
                    {step.expectedOutcome ? <p className="mt-3 text-sm text-slate-600">Outcome: {step.expectedOutcome}</p> : null}
                    {step.mediaUrl ? (
                      <a
                        href={step.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:opacity-80"
                      >
                        Open step media
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyCard text="No practical steps are configured for this lab yet." />
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard icon={<QuestionIcon />} title="Questions">
            {(lab.questions ?? []).length > 0 ? (
              <div className="space-y-4">
                {lab.questions?.map((question, index) => {
                  const options = normalizeOptions(question.options);
                  return (
                    <div key={question.id} className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Question {index + 1}</p>
                      <p className="mt-2 text-sm font-semibold text-[#101820]">{question.questionText}</p>
                      {options.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {options.map((option) => (
                            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                              <input
                                type="radio"
                                name={`lab-question-${question.id}`}
                                checked={answers[question.id] === option}
                                onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          value={answers[question.id] ?? ''}
                          onChange={(e) => setAnswers((current) => ({ ...current, [question.id]: e.target.value }))}
                          rows={3}
                          className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#B5E61D]"
                          placeholder="Write your answer here"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyCard text="No lab questions are configured yet." />
            )}
          </SectionCard>

          <SectionCard icon={<ReflectionIcon />} title="Reflections">
            {(lab.reflectionPrompts ?? []).length > 0 ? (
              <div className="space-y-4">
                {lab.reflectionPrompts?.map((prompt, index) => (
                  <div key={prompt.id} className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4">
                    <p className="text-sm font-semibold text-[#101820]">{prompt.prompt || `Reflection prompt ${index + 1}`}</p>
                    <textarea
                      value={reflections[prompt.id] ?? ''}
                      onChange={(e) => setReflections((current) => ({ ...current, [prompt.id]: e.target.value }))}
                      rows={3}
                      className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#B5E61D]"
                      placeholder="Record your reflection"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyCard text="No reflection prompts are configured yet." />
            )}
          </SectionCard>

          <SectionCard icon={<ReportIcon />} title="Completion report">
            <div className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-5">
              <p className="text-lg font-semibold text-[#101820]">
                {lab.completionReportTemplate?.title ?? 'Lab completion report'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {lab.completionReportTemplate?.summary ?? 'A completion summary will be available when the lab studio provides one.'}
              </p>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600">
                {lab.completionReportTemplate?.outcomesJson != null
                  ? JSON.stringify(lab.completionReportTemplate.outcomesJson, null, 2)
                  : '[]'}
              </pre>
            </div>

            {statusMessage ? <p className="mt-4 text-sm text-slate-600">{statusMessage}</p> : null}
            <button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="mt-5 inline-flex items-center justify-center rounded-2xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
            >
              {completeMutation.isPending ? 'Saving completion...' : 'Complete lab'}
            </button>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">{icon}</div>
        <h2 className="text-xl font-semibold text-[#101820]">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function OverviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-[#101820]">{value}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <p className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-5 text-sm text-slate-500">{text}</p>;
}

function MediaSummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[#FCFDFE] p-4">
      <p className="text-sm font-semibold text-[#101820]">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{value > 0 ? `${value} available` : 'Not configured yet'}</p>
    </div>
  );
}

function RenderedMediaCard({ item }: { item: LabMedia }) {
  const kind = mediaKind(item.type);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[#FCFDFE]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-[#101820]">{item.title ?? item.type}</p>
          {item.caption ? <p className="mt-1 text-sm text-slate-500">{item.caption}</p> : null}
        </div>
        <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {kind}
        </span>
      </div>

      <div className="p-4">
        {kind === 'IMAGE' ? (
          <img src={item.url} alt={item.title ?? 'Lab image'} className="max-h-[360px] w-full rounded-2xl object-contain bg-white" />
        ) : kind === 'AUDIO' ? (
          <audio controls className="w-full">
            <source src={item.url} />
          </audio>
        ) : kind === 'VIDEO' || kind === 'ANIMATION' ? (
          <video controls className="max-h-[420px] w-full rounded-2xl bg-black">
            <source src={item.url} />
          </video>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            This media type is available as a resource link.
          </div>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#101820] transition hover:opacity-80"
        >
          Open source
        </a>
      </div>
    </div>
  );
}
