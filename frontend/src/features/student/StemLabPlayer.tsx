import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  Download,
  FlaskConical,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { apiErrorMessage } from '../../api/axios';
import { labsApi, labSessionsApi } from '../../api/labs.api';
import { useAuthStore } from '../../store/auth.store';
import type { Lab } from '../../types';
import {
  emptyDraft,
  investigationFor,
  notebookKey,
  notebookReady,
  type LabDraft,
} from './stem-workspace/investigations';
import { LearningDesignPanel } from './curriculum/LearningDesignPanel';
import { stemDesign } from './curriculum/activity-designs';
import { ExperimentBench } from './stem-workspace/ExperimentBench';

export function StemLabPlayerPage() {
  const { id } = useParams();
  const userId = useAuthStore((s) => s.user?.id);
  const {
    data: lab,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['lab-player', userId, Number(id)],
    queryFn: () => labsApi.findOne(Number(id)),
    enabled: !!userId && Number.isFinite(Number(id)),
  });
  if (isLoading)
    return (
      <p className="rounded-2xl bg-white p-6">Preparing your investigation…</p>
    );
  if (isError || !lab)
    return (
      <div role="alert" className="rounded-2xl bg-white p-6">
        <p>We couldn’t open this lab.</p>
        <button
          type="button"
          className="mt-3 underline"
          onClick={() => refetch()}
        >
          Try again
        </button>
        <Link className="ml-4 underline" to="/student/stem-labs">
          Back to labs
        </Link>
      </div>
    );
  return <LabNotebook key={`${userId}:${lab.id}`} lab={lab} userId={userId!} />;
}

function readDraft(key: string): LabDraft {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!saved || typeof saved !== 'object') return emptyDraft();
    const base = emptyDraft();
    for (const field of [
      'prediction',
      'observations',
      'conclusion',
      'transfer',
    ] as const)
      if (typeof saved[field] === 'string') base[field] = saved[field];
    base.checked = Array.isArray(saved.checked)
      ? saved.checked.filter((n: unknown) => Number.isInteger(n))
      : [];
    base.trials = Array.isArray(saved.trials)
      ? saved.trials
          .filter(
            (t: unknown) =>
              t &&
              typeof t === 'object' &&
              'setting' in t &&
              typeof t.setting === 'string' &&
              'result' in t &&
              typeof t.result === 'string',
          )
          .slice(0, 20)
      : [];
    for (const field of ['answers', 'reflections'] as const)
      if (saved[field] && typeof saved[field] === 'object')
        base[field] = Object.fromEntries(
          Object.entries(saved[field]).filter(([, v]) => typeof v === 'string'),
        ) as Record<number, string>;
    return base;
  } catch {
    return emptyDraft();
  }
}
function LabNotebook({ lab, userId }: { lab: Lab; userId: number }) {
  const pack = investigationFor(lab);
  const storageKey = notebookKey(userId, lab.id);
  const [draft, setDraft] = useState(() => readDraft(storageKey));
  const [stage, setStage] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const steps = pack
    ? pack.steps.map((instruction, i) => ({
        id: i,
        title: `Investigation ${i + 1}`,
        instruction,
        expectedOutcome: null,
        mediaUrl: null,
      }))
    : [...(lab.steps ?? [])].sort((a, b) => a.order - b.order);
  const questions = [...(lab.questions ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const prompts = [...(lab.reflectionPrompts ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const ready = notebookReady(
    draft,
    steps.length,
    questions.map((q) => q.id),
    prompts.map((p) => p.id),
    !!pack,
  );
  const update = (change: Partial<LabDraft>) => {
    setDraft((d) => ({ ...d, ...change }));
    setSaved(false);
  };
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [draft, storageKey]);
  const completion = useMutation({
    mutationFn: () =>
      labSessionsApi.create({
        labKey: lab.key,
        competency: lab.competency ?? undefined,
        answers: questions.map((q) => ({
          questionId: q.id,
          answer: draft.answers[q.id] ?? '',
        })),
      }),
    onSuccess: async () => {
      setSaved(true);
      await client.invalidateQueries({ queryKey: ['lab-sessions'] });
    },
  });
  function download() {
    const text = [
      `STEM LAB NOTEBOOK: ${lab.title}`,
      `${lab.grade} · ${lab.subject}`,
      `Exported: ${new Date().toISOString()}`,
      pack
        ? 'Results below come from a simplified teaching model, not physical measurements.'
        : 'Student investigation record.',
      '\nQUESTION',
      pack?.question ?? lab.topic ?? lab.title,
      '\nMY PREDICTION',
      draft.prediction,
      '\nMETHOD',
      ...steps.map(
        (s, i) =>
          `${i + 1}. ${s.instruction} [${draft.checked.includes(i) ? 'done' : 'not checked'}]`,
      ),
      '\nRECORDED TRIALS',
      ...draft.trials.map((t, i) => `${i + 1}. ${t.setting} → ${t.result}`),
      '\nOBSERVATIONS',
      draft.observations,
      '\nCONCLUSION',
      draft.conclusion,
      '\nREAL-LIFE CONNECTION',
      draft.transfer,
      '\nQUESTIONS',
      ...questions.map(
        (q) => `${q.questionText}\n${draft.answers[q.id] ?? ''}`,
      ),
      '\nREFLECTIONS',
      ...prompts.map((p) => `${p.prompt}\n${draft.reflections[p.id] ?? ''}`),
      pack ? `\nMODEL LIMITS\n${pack.limitation}` : '',
      '\nThis notebook records student work; it is not a teacher assessment.',
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `stem-lab-${lab.id}-notebook.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const resources = [...(lab.media ?? [])].sort((a, b) => a.order - b.order);
  const stages = [
    { title: 'Prepare', icon: BookOpen, detail: 'Question & prediction' },
    { title: 'Investigate', icon: FlaskConical, detail: 'Test & record' },
    { title: 'Explain', icon: Lightbulb, detail: 'Evidence & reflection' },
  ];
  function go(next: number) {
    setStage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return (
    <div className="mx-auto max-w-6xl space-y-5 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/student/stem-labs"
          className="inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          My STEM Labs
        </Link>
        <button
          type="button"
          onClick={download}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold"
        >
          <Download className="h-4 w-4" />
          Download notebook
        </button>
      </div>
      <header className="rounded-2xl bg-[#101820] p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">
          {lab.subject} · {lab.grade} ·{' '}
          {pack ? 'Interactive investigation' : 'Guided practical'}
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{lab.title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">
          {pack?.question ??
            lab.description ??
            'Build an explanation from your own observations.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {(lab.coreCompetencies?.length
            ? lab.coreCompetencies
            : ['Critical thinking and problem solving', 'Learning to learn']
          ).map((c) => (
            <span
              key={c}
              className="rounded-full border border-white/20 px-3 py-1.5"
            >
              {c}
            </span>
          ))}
        </div>
      </header>
      <LearningDesignPanel design={stemDesign(lab)}/>
      <nav aria-label="Investigation stages" className="grid grid-cols-3 gap-2">
        {stages.map(({ title, icon: Icon, detail }, i) => (
          <button
            type="button"
            key={title}
            aria-current={stage === i ? 'step' : undefined}
            onClick={() => go(i)}
            className={`min-w-0 rounded-xl border p-3 text-left sm:p-4 ${stage === i ? 'border-teal-700 bg-teal-50 text-teal-950' : 'bg-white text-slate-500'}`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="hidden h-5 w-5 sm:block" />
              {i + 1}. {title}
            </span>
            <span className="mt-1 hidden text-xs sm:block">{detail}</span>
          </button>
        ))}
      </nav>
      <p
        role="status"
        className={`text-xs ${storageError ? 'text-red-700' : 'text-slate-500'}`}
      >
        {storageError
          ? 'This browser could not save your draft. Download your notebook before leaving.'
          : 'Notebook autosaves on this browser for your account. Download it to keep or share your work.'}
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <main className="min-w-0 space-y-5">
          {stage === 0 && (
            <>
              <Panel
                title="Start with a real problem"
                icon={<Lightbulb className="h-5 w-5" />}
              >
                <p className="leading-7">
                  {pack?.context ??
                    lab.description ??
                    `Investigate ${lab.topic ?? lab.topicArea ?? lab.title} using the practical instructions below.`}
                </p>
                {pack && (
                  <div className="mt-4 rounded-xl bg-teal-50 p-4 text-sm leading-7">
                    <h3 className="font-semibold">Before you begin</h3>
                    <p className="mt-1">{pack.learn}</p>
                  </div>
                )}
                {!!lab.learningOutcomes?.length && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
                    {lab.learningOutcomes.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel
                title="Make a prediction"
                icon={<ClipboardList className="h-5 w-5" />}
              >
                <Field
                  label={
                    pack?.prediction ??
                    'What do you think will happen, and why?'
                  }
                  value={draft.prediction}
                  onChange={(prediction) => update({ prediction })}
                  placeholder="I predict… because…"
                />
                {pack && (
                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    {[
                      ['Change', pack.variable],
                      ['Measure', pack.measure],
                      ['Keep the same', pack.controls],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border p-3">
                        <dt className="text-xs font-semibold uppercase text-teal-800">
                          {label}
                        </dt>
                        <dd className="mt-2 leading-6">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Panel>
              <Panel
                title="Get ready safely"
                icon={<ShieldCheck className="h-5 w-5" />}
              >
                {pack && (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    {pack.safety}
                  </p>
                )}
                {lab.materials?.length ? (
                  <>
                    <h3 className="mt-4 font-semibold">Materials</h3>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                      {lab.materials.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    {pack
                      ? 'Use a phone, tablet or computer. No physical equipment is needed for this browser model.'
                      : 'Check the practical instructions and ask your teacher what equipment and supervision are needed.'}
                  </p>
                )}
                {!!lab.safetyChecklist?.length && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
                    {lab.safetyChecklist.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </Panel>
              {(resources.length > 0 ||
                lab.introVideoUrl ||
                lab.resourceUrl ||
                lab.animationUrl ||
                lab.voiceAudioUrl) && (
                <Panel
                  title="Supporting resources"
                  icon={<BookOpen className="h-5 w-5" />}
                >
                  <div className="space-y-4">
                    {resources.map((m) => (
                      <div key={m.id}>
                        {m.type.toUpperCase() === 'IMAGE' ? (
                          <img
                            loading="lazy"
                            src={m.url}
                            alt={m.caption ?? m.title ?? 'Lab illustration'}
                            className="max-h-80 w-full rounded-xl object-contain"
                          />
                        ) : m.type.toUpperCase() === 'AUDIO' ? (
                          <audio controls src={m.url} className="w-full" />
                        ) : null}
                        <a
                          className="mt-2 block text-sm font-semibold text-teal-800 underline"
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {m.title ?? 'Open resource'}
                        </a>
                        {m.caption && (
                          <p className="mt-1 text-sm">{m.caption}</p>
                        )}
                      </div>
                    ))}
                    {[
                      lab.introVideoUrl,
                      lab.resourceUrl,
                      lab.animationUrl,
                      lab.voiceAudioUrl,
                    ]
                      .filter((url, i, all) => url && all.indexOf(url) === i)
                      .map((url, i) => (
                        <a
                          key={url}
                          className="block text-sm font-semibold text-teal-800 underline"
                          href={url!}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open supporting resource {i + 1}
                        </a>
                      ))}
                  </div>
                </Panel>
              )}
            </>
          )}
          {stage === 1 && (
            <>
              <Panel
                title="Follow the investigation"
                icon={<FlaskConical className="h-5 w-5" />}
              >
                {steps.length ? (
                  <ol className="space-y-4">
                    {steps.map((step, i) => (
                      <li key={step.id} className="rounded-xl border p-4">
                        <label className="flex items-start gap-3">
                          <input
                            className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
                            type="checkbox"
                            checked={draft.checked.includes(i)}
                            onChange={(e) =>
                              update({
                                checked: e.target.checked
                                  ? [...draft.checked, i]
                                  : draft.checked.filter((n) => n !== i),
                              })
                            }
                          />
                          <span>
                            <span className="font-semibold">
                              {i + 1}. {step.title}
                            </span>
                            <span className="mt-2 block text-sm leading-7">
                              {step.instruction}
                            </span>
                            {step.expectedOutcome && (
                              <span className="mt-2 block text-sm text-teal-800">
                                Look for: {step.expectedOutcome}
                              </span>
                            )}
                          </span>
                        </label>
                        {step.mediaUrl && (
                          <a
                            className="mt-2 block text-sm text-teal-800 underline"
                            href={step.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open step resource
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-4 text-sm leading-7">
                    <p>
                      This activity does not yet have practical instructions.
                      You can plan a question and prediction, but completion is
                      unavailable until your teacher adds the investigation.
                    </p>
                    <Link
                      to="/student/stem-labs"
                      className="mt-3 inline-block font-semibold underline"
                    >
                      Choose another lab
                    </Link>
                  </div>
                )}
              </Panel>
              {pack && (
                <ExperimentBench
                  kind={pack.model}
                  trials={draft.trials}
                  onRecord={(trial) =>
                    update({ trials: [...draft.trials, trial] })
                  }
                  onClear={() => update({ trials: draft.trials.slice(0, -1) })}
                />
              )}
              {pack && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950">
                  <strong>Model limits:</strong> {pack.limitation}
                </p>
              )}
              <Panel
                title="Record what you observed"
                icon={<ClipboardList className="h-5 w-5" />}
              >
                <Field
                  label="What changed? Describe a pattern, result or surprise using your evidence."
                  value={draft.observations}
                  onChange={(observations) => update({ observations })}
                  placeholder="When I changed… I observed… My recorded results show…"
                />
              </Panel>
            </>
          )}
          {stage === 2 && (
            <>
              <Panel
                title="Explain with evidence"
                icon={<Lightbulb className="h-5 w-5" />}
              >
                <Field
                  label={
                    pack?.explain ??
                    'What is your conclusion? Use evidence from the investigation to explain your reasoning.'
                  }
                  value={draft.conclusion}
                  onChange={(conclusion) => update({ conclusion })}
                  placeholder="My claim is… My evidence is… This supports my claim because…"
                />
                <div className="mt-5">
                  <Field
                    label={
                      pack?.transfer ??
                      lab.communityLink ??
                      'Where could you use what you learned at home, school or in your community? (Optional)'
                    }
                    value={draft.transfer}
                    onChange={(transfer) => update({ transfer })}
                  />
                </div>
              </Panel>
              {questions.length > 0 && (
                <Panel
                  title="Apply your understanding"
                  icon={<BookOpen className="h-5 w-5" />}
                >
                  <div className="space-y-6">
                    {questions.map((q, i) => {
                      const options = Array.isArray(q.options)
                        ? q.options.filter(
                            (o): o is string => typeof o === 'string',
                          )
                        : [];
                      return (
                        <fieldset key={q.id}>
                          <legend className="mb-3 text-sm font-semibold">
                            {i + 1}. {q.questionText}
                          </legend>
                          {options.length ? (
                            <div className="space-y-2">
                              {options.map((option) => (
                                <label
                                  key={option}
                                  className="flex items-start gap-3 rounded-xl border p-3 text-sm"
                                >
                                  <input
                                    type="radio"
                                    name={`question-${q.id}`}
                                    checked={draft.answers[q.id] === option}
                                    onChange={() =>
                                      update({
                                        answers: {
                                          ...draft.answers,
                                          [q.id]: option,
                                        },
                                      })
                                    }
                                  />
                                  {option}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <Field
                              label="Your answer"
                              value={draft.answers[q.id] ?? ''}
                              onChange={(answer) =>
                                update({
                                  answers: { ...draft.answers, [q.id]: answer },
                                })
                              }
                            />
                          )}
                        </fieldset>
                      );
                    })}
                  </div>
                </Panel>
              )}
              {prompts.length > 0 && (
                <Panel
                  title="Reflect on your method"
                  icon={<ClipboardList className="h-5 w-5" />}
                >
                  <div className="space-y-5">
                    {prompts.map((p) => (
                      <Field
                        key={p.id}
                        label={p.prompt}
                        value={draft.reflections[p.id] ?? ''}
                        onChange={(answer) =>
                          update({
                            reflections: {
                              ...draft.reflections,
                              [p.id]: answer,
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                </Panel>
              )}
              {!!lab.assessmentCriteria?.length && (
                <Panel
                  title="Review your evidence"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                >
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {lab.assessmentCriteria.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel
                title="Save your investigation"
                icon={<CheckCircle2 className="h-5 w-5" />}
              >
                <p className="text-sm leading-7">
                  Completion records your participation and any question answers
                  on your account. Your full notebook stays on this browser;
                  download it to submit or share with your teacher. Completion
                  does not certify mastery.
                </p>
                {!ready && (
                  <p className="mt-3 text-sm text-amber-900">
                    Before saving: write a prediction, check every investigation
                    step, {pack ? 'record at least three trials, ' : ''}write
                    observations and a conclusion, and answer any questions and
                    reflections.
                  </p>
                )}
                {completion.isError && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {apiErrorMessage(
                      completion.error,
                      'Could not save completion. Your notebook is still available; try again.',
                    )}
                  </p>
                )}
                {saved && (
                  <p
                    role="status"
                    className="mt-3 flex items-center gap-2 text-sm font-semibold text-teal-800"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Completion saved to your account.
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!ready || completion.isPending || saved}
                    onClick={() => completion.mutate()}
                    className="min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {completion.isPending
                      ? 'Saving…'
                      : saved
                        ? 'Completion saved'
                        : 'Save completion'}
                  </button>
                  <button
                    type="button"
                    onClick={download}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"
                  >
                    <Download className="h-4 w-4" />
                    Download notebook
                  </button>
                </div>
              </Panel>
            </>
          )}
          <div className="flex justify-between gap-3 pb-6">
            <button
              type="button"
              disabled={stage === 0}
              onClick={() => go(stage - 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            {stage < 2 && (
              <button
                type="button"
                onClick={() => go(stage + 1)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"
              >
                {stage === 0 ? 'Start investigating' : 'Explain your findings'}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </main>
        <aside className="rounded-2xl border bg-white p-5 lg:sticky lg:top-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardList className="h-5 w-5 text-teal-700" />
            My evidence checklist
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              ['Prediction written', !!draft.prediction.trim()],
              [
                'Investigation steps checked',
                steps.length > 0 &&
                  steps.every((_, i) => draft.checked.includes(i)),
              ],
              ...(pack
                ? [['Three trials recorded', draft.trials.length >= 3]]
                : []),
              ['Observations recorded', !!draft.observations.trim()],
              ['Conclusion explained', !!draft.conclusion.trim()],
            ].map(([label, done]) => (
              <li key={String(label)} className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-teal-100 text-teal-800' : 'border bg-slate-50'}`}
                >
                  {done && <Check className="h-3 w-3" />}
                </span>
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t pt-4 text-xs leading-6 text-slate-500">
            A useful notebook explains how you tested your idea, what the
            evidence shows and what you would improve.
          </p>
          {lab.portfolioPrompt && (
            <p className="mt-3 text-xs leading-6">{lab.portfolioPrompt}</p>
          )}
          {lab.adaptationNotes && (
            <p className="mt-3 text-xs leading-6">{lab.adaptationNotes}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <span className="text-teal-700">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium leading-6">
      {label}
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Write your explanation…'}
        className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm font-normal leading-6 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}
