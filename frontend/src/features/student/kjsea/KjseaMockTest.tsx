import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Clock3,
  FilePlus2,
  History,
  LoaderCircle,
  Shapes,
} from 'lucide-react';
import { kjseaApi } from '../../../api/kjsea.api';
import { apiErrorMessage } from '../../../api/axios';
import { useAuthStore } from '../../../store/auth.store';
export function KjseaMockTestPage() {
  const user = useAuthStore((s) => s.user);
  const client = useQueryClient();
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState('generated-mathematics');
  const subjects = useQuery({
    queryKey: ['kjsea-subjects', user?.id],
    queryFn: kjseaApi.subjects,
    enabled: !!user && !user.isIndependentTrial,
  });
  const selected =
    subjects.data?.find((s) => s.id === subjectId) ?? subjects.data?.[0];
  const [mode, setMode] = useState('untimed');
  const [discardId, setDiscardId] = useState<string | null>(null);
  const config = useQuery({
    queryKey: ['kjsea-blueprint'],
    queryFn: kjseaApi.blueprint,
  });
  const attempts = useQuery({
    queryKey: ['kjsea-attempts', user?.id],
    queryFn: kjseaApi.list,
    enabled: !!user && !user.isIndependentTrial,
  });
  const generate = useMutation({
    mutationFn: () =>
      kjseaApi.create(
        mode === 'untimed' ? undefined : Number(mode),
        selected?.subject ?? 'Mathematics',
        selected?.source ?? 'GENERATED',
      ),
    onSuccess: (paper) => {
      client.setQueryData(['kjsea-attempt', user?.id, paper.id], paper);
      void client.invalidateQueries({ queryKey: ['kjsea-attempts'] });
      navigate(`/student/kjsea-mock-test/${paper.id}`);
    },
  });
  const discard = useMutation({
    mutationFn: () => kjseaApi.discard(discardId!),
    onSuccess: () => {
      setDiscardId(null);
      void client.invalidateQueries({ queryKey: ['kjsea-attempts'] });
    },
  });
  if (user?.isIndependentTrial)
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">KJSEA Mock Test</h1>
        <p className="mt-3">Activate your account to open mock tests.</p>
        <Link
          className="mt-4 inline-block text-teal-800 underline"
          to="/student/activate"
        >
          Activate full access
        </Link>
      </div>
    );
  const blueprint = config.data;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">
          Junior-school revision · All available subjects
        </p>
        <h1 className="mt-2 text-3xl font-semibold">KJSEA Mock Test</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Generate a practice paper, work through it here, then use explained
          answers to plan your revision.
        </p>
      </header>
      {config.isPending ? (
        <p role="status" className="rounded-2xl border bg-white p-6">
          Preparing the mock-test generator…
        </p>
      ) : config.isError || !blueprint ? (
        <div role="alert" className="rounded-2xl border bg-white p-6">
          <p>The mock-test service could not be loaded.</p>
          <button
            type="button"
            onClick={() => config.refetch()}
            className="mt-3 font-semibold text-teal-800 underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <section
            aria-label="Generate a junior-school mock"
            className="overflow-hidden rounded-2xl border bg-white"
          >
            <div className="grid lg:grid-cols-[1fr_320px]">
              <div className="p-5 sm:p-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
                  <Shapes className="h-4 w-4" />
                  {selected?.source === 'BANK'
                    ? 'Junior-school question bank'
                    : blueprint.level}
                </div>
                <h2 className="mt-4 text-2xl font-semibold">
                  {selected?.subject ?? 'Mathematics'} practice paper
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                  Choose untimed practice for learning, or add a practice time
                  limit. Your paper and answers are saved privately to your
                  account.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    [
                      String(
                        selected?.questionCount ?? blueprint.questionCount,
                      ),
                      'questions',
                    ],
                    [
                      String(selected?.topicCount ?? blueprint.topicCount),
                      selected?.source === 'BANK'
                        ? 'topics in pool'
                        : 'practice topics',
                    ],
                    [
                      String(
                        selected?.source === 'BANK'
                          ? selected.availableCount
                          : blueprint.visualCount,
                      ),
                      selected?.source === 'BANK'
                        ? 'approved questions'
                        : 'visual questions',
                    ],
                  ].map(([n, label]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-2xl font-semibold">{n}</p>
                      <p className="mt-1 text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t bg-slate-50 p-5 sm:p-7 lg:border-l lg:border-t-0">
                <label htmlFor="mock-subject" className="text-sm font-semibold">
                  Subject
                </label>
                <select
                  id="mock-subject"
                  value={selected?.id ?? 'generated-mathematics'}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={subjects.isPending || generate.isPending}
                  className="mb-4 mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  {subjects.data?.length ? (
                    subjects.data.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject}
                        {s.source === 'GENERATED' ? ' · new values' : ' · bank'}
                      </option>
                    ))
                  ) : (
                    <option value="generated-mathematics">
                      Mathematics — varied-number papers
                    </option>
                  )}
                </select>
                {subjects.isError && (
                  <p
                    role="alert"
                    className="mb-3 text-xs leading-6 text-amber-900"
                  >
                    Other subjects could not be loaded.{' '}
                    <button
                      type="button"
                      onClick={() => subjects.refetch()}
                      className="underline"
                    >
                      Retry subject list
                    </button>
                  </p>
                )}
                {selected?.source === 'BANK' && selected.questionCount < 40 && (
                  <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-950">
                    This subject currently supports a {selected.questionCount}
                    -question practice set, not a full 40-question mock. More
                    reviewed questions can be added through the platform
                    question bank.
                  </p>
                )}
                <label htmlFor="mock-timing" className="text-sm font-semibold">
                  Practice mode
                </label>
                <select
                  id="mock-timing"
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="untimed">Untimed — learn at your pace</option>
                  <option value="30">Timed — 30 minutes</option>
                  <option value="60">Timed — 60 minutes</option>
                  <option value="90">Timed — 90 minutes</option>
                </select>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {mode === 'untimed'
                    ? 'Return to an unfinished paper whenever you want.'
                    : 'Timing starts when the paper is generated. It continues if you close the page. When time ends, the server grades the answers saved before the deadline.'}
                </p>
                <button
                  type="button"
                  disabled={generate.isPending || subjects.isPending}
                  onClick={() => generate.mutate()}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {generate.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <FilePlus2 className="h-4 w-4" />
                  )}
                  {generate.isPending
                    ? 'Building your paper…'
                    : 'Generate new paper'}
                </button>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  One mark per question. Scores support practice; they are not
                  official KJSEA grades.
                </p>
              </div>
            </div>
          </section>
          <aside className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
            <strong>How this paper is built.</strong>
            {selected?.source === 'BANK'
              ? ` Up to 40 questions are selected from the approved ${selected.subject} multiple-choice pool for Grades 7–9. Questions include an answer explanation. Recent questions are deprioritised where the pool allows; content can repeat. The paper’s actual coverage is shown when you open it.`
              : ` Each mathematics paper has ${blueprint.questionCount} questions covering ${blueprint.topicCount} practice topics across ${blueprint.areaCount} maths areas. ${blueprint.visualCount} questions use a diagram or table. New papers vary the numbers and order; topic templates can repeat.`}
          </aside>
          <details className="rounded-2xl border bg-white p-5">
            <summary className="cursor-pointer text-sm font-semibold text-teal-900">
              Coverage and question sources
            </summary>
            <p className="mt-3 text-xs leading-6 text-slate-600">
              The subject selector includes every available junior-school pool
              with eligible approved multiple-choice questions and explanations.
              Written or practical-response questions are not automatically
              converted into marked multiple-choice mocks. Subjects without
              eligible questions need reviewed content first.
            </p>
            {selected?.source === 'BANK' ? (
              <p className="mt-4 text-sm leading-7">
                {selected.availableCount} eligible approved questions across{' '}
                {selected.topicCount} pool topics. Grades represented:{' '}
                {selected.grades.join(', ')}. This is revision coverage, not a
                claim that the complete current syllabus is covered.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {blueprint.areas.map((area) => (
                  <section key={area}>
                    <h3 className="text-sm font-semibold">{area}</h3>
                    <p className="mt-2 text-xs leading-6 text-slate-600">
                      {blueprint.topics
                        .filter((t) => t.area === area)
                        .map((t) => t.name)
                        .join(' · ')}
                    </p>
                  </section>
                ))}
              </div>
            )}
            <p className="mt-4 border-t pt-3 text-xs leading-6 text-slate-500">
              {selected?.source === 'BANK'
                ? 'Questions are drawn from platform-approved junior-school content. Approval is a platform review status, not KICD or KNEC endorsement. This is not an official examination paper.'
                : blueprint.sourceNote}
            </p>
          </details>
        </>
      )}
      {generate.isError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {apiErrorMessage(
            generate.error,
            'Could not generate your mock. Please try again.',
          )}
        </p>
      )}
      <section
        aria-label="My mock attempts"
        className="rounded-2xl border bg-white p-5 sm:p-6"
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5 text-teal-800" />
          My mock attempts
        </h2>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          Your latest 30 papers. Resume a draft or review a completed paper.
        </p>
        {attempts.isPending ? (
          <p role="status" className="mt-4 text-sm">
            Loading your attempts…
          </p>
        ) : attempts.isError ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            Could not load your attempts.{' '}
            <button
              type="button"
              onClick={() => attempts.refetch()}
              className="underline"
            >
              Retry
            </button>
          </p>
        ) : !attempts.data?.length ? (
          <div className="mt-5 rounded-xl border border-dashed p-6 text-center">
            <BookOpen className="mx-auto h-7 w-7 text-teal-700" />
            <p className="mt-3 text-sm text-slate-600">
              Generate your first paper to start your revision record.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {attempts.data.map((a, i) => (
              <article key={a.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {a.subject} practice ·{' '}
                      {new Intl.DateTimeFormat('en-KE', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Africa/Nairobi',
                      }).format(new Date(a.createdAt))}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{a.questionCount} questions</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {a.timeLimitMinutes
                          ? `${a.timeLimitMinutes} min`
                          : 'Untimed'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ChartNoAxesCombined className="h-3.5 w-3.5" />
                        {a.status === 'SUBMITTED'
                          ? `${a.score ?? 0}/${a.questionCount}`
                          : 'In progress'}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/student/kjsea-mock-test/${a.id}`}
                    aria-label={`${a.status === 'SUBMITTED' ? 'Review' : 'Resume'} mock ${i + 1}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"
                  >
                    {a.status === 'SUBMITTED'
                      ? 'Review answers'
                      : 'Resume paper'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {a.status === 'DRAFT' && (
                  <div className="mt-3 text-xs">
                    {discardId === a.id ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span>
                          Discard this unfinished paper and its saved answers?
                        </span>
                        <button
                          type="button"
                          onClick={() => discard.mutate()}
                          disabled={discard.isPending}
                          className="min-h-9 font-semibold text-red-700 underline"
                        >
                          {discard.isPending
                            ? 'Discarding…'
                            : 'Yes, discard draft'}
                        </button>
                        <button
                          type="button"
                          disabled={discard.isPending}
                          onClick={() => setDiscardId(null)}
                          className="min-h-9 underline"
                        >
                          Keep paper
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDiscardId(a.id)}
                        className="min-h-9 text-slate-500 underline"
                      >
                        Discard draft
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {discard.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {apiErrorMessage(discard.error, 'Could not discard this draft.')}
          </p>
        )}
      </section>
    </div>
  );
}
