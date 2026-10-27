import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Atom,
  BookOpen,
  CheckCircle2,
  CircuitBoard,
  ClipboardList,
  Clock3,
  Droplets,
  FlaskConical,
  Leaf,
  Search,
  Sprout,
  Waves,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { labsApi, labSessionsApi, stemApi } from '../../api/labs.api';
import { useAuthStore } from '../../store/auth.store';
import type { Lab, StemCategory, StemSubject } from '../../types';
import { LearningGuideLink } from './curriculum/LearningDesignPanel';
import { investigationFor, notebookKey } from './stem-workspace/investigations';

function labMatchesCategory(
  lab: Lab,
  category: StemCategory | undefined,
  subjects: StemSubject[],
) {
  if (!category) return false;
  if (lab.categoryId) return lab.categoryId === category.id;
  const matches = subjects.filter((s) => s.categoryId === category.id);
  return matches.some((s) =>
    lab.stemSubjectId
      ? s.id === lab.stemSubjectId
      : s.name.toLowerCase() === lab.subject.toLowerCase(),
  );
}
function appearance(lab: Lab) {
  const model = investigationFor(lab)?.model;
  if (model === 'photoelectric')
    return {
      Icon: Zap,
      style: 'bg-amber-50 text-amber-900',
      line: 'Predict · test · reason',
    };

  if (
    model === 'circuit' ||
    /electri|circuit|network|computer|cyber|algorithm/i.test(lab.title)
  )
    return {
      Icon: CircuitBoard,
      style: 'bg-indigo-50 text-indigo-800',
      line: 'Build · test · improve',
    };
  if (model === 'filter' || /water|hydro/i.test(lab.title))
    return {
      Icon: Droplets,
      style: 'bg-cyan-50 text-cyan-800',
      line: 'Compare · observe · explain',
    };
  if (model === 'pendulum' || /wave|motion|optics|physics/i.test(lab.title))
    return {
      Icon: Waves,
      style: 'bg-violet-50 text-violet-800',
      line: 'Measure · model · explain',
    };
  if (/plant|agri|soil|greenhouse|ecosystem|nutrition/i.test(lab.title))
    return {
      Icon: Sprout,
      style: 'bg-emerald-50 text-emerald-800',
      line: 'Observe · compare · grow',
    };
  if (/bio|cell|body|genetic|dna/i.test(lab.title))
    return {
      Icon: Leaf,
      style: 'bg-teal-50 text-teal-800',
      line: 'Explore · connect · explain',
    };
  return {
    Icon: Atom,
    style: 'bg-sky-50 text-sky-800',
    line: 'Question · investigate · explain',
  };
}
export function StemLabsPage() {
  const user = useAuthStore((s) => s.user);
  const [categoryId, setCategoryId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('all');
  const { data: categories = [] } = useQuery({
    queryKey: ['stem-categories'],
    queryFn: stemApi.findCategories,
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['stem-subjects'],
    queryFn: stemApi.findSubjects,
  });
  const {
    data: labs = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['labs', 'student-catalogue', user?.id, user?.grade],
    queryFn: () => labsApi.findAll(),
  });
  const { data: sessions = [], isError: sessionsError } = useQuery({
    queryKey: ['lab-sessions', 'my-discoveries', user?.id],
    queryFn: () => labSessionsApi.findAll(),
  });
  // The API enforces grade access. Never substitute local content for an inaccessible lab.
  const completed = new Set(
    sessions.filter((s) => s.completedAt).map((s) => s.labKey),
  );
  const drafts = useMemo(
    () =>
      new Set(
        labs
          .filter((lab) => {
            try {
              const raw = localStorage.getItem(notebookKey(user!.id, lab.id));
              if (!raw) return false;
              const d = JSON.parse(raw);
              return Boolean(
                d.prediction ||
                  d.observations ||
                  d.conclusion ||
                  d.trials?.length,
              );
            } catch {
              return false;
            }
          })
          .map((lab) => lab.id),
      ),
    [labs, user?.id],
  );
  const availableCategories = categories.filter((c) =>
    labs.some((l) => labMatchesCategory(l, c, subjects)),
  );
  const subjectNames = [
    ...new Set(
      labs
        .filter(
          (l) =>
            !categoryId ||
            labMatchesCategory(
              l,
              categories.find((c) => c.id === Number(categoryId))!,
              subjects,
            ),
        )
        .map((l) => l.subject),
    ),
  ].sort();
  const visible = labs
    .filter((l) => {
      if (categoryId) {
        const c = categories.find((c) => c.id === Number(categoryId));
        if (c && !labMatchesCategory(l, c, subjects)) return false;
      }
      if (subjectId && l.subject !== subjectId) return false;
      if (view === 'interactive' && !investigationFor(l)) return false;
      if (view === 'notebooks' && !drafts.has(l.id)) return false;
      if (view === 'completed' && !completed.has(l.key)) return false;
      return `${l.title} ${l.subject} ${l.topic ?? l.topicArea ?? ''} ${investigationFor(l)?.question ?? ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());
    })
    .sort(
      (a, b) => Number(!!investigationFor(b)) - Number(!!investigationFor(a)),
    );
  const resume = labs.find((l) => drafts.has(l.id) && !completed.has(l.key));
  return (
    <div className="mx-auto max-w-6xl space-y-6 text-slate-800">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-800">
            Your investigation workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">STEM Labs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Ask a question. Test an idea. Build an explanation from your
            evidence.
          </p>
        </div>
        {user?.grade && (
          <span className="rounded-full border bg-white px-4 py-2 text-sm font-semibold">
            {user.grade}
          </span>
        )}
      </header>
      <LearningGuideLink/>
      <section
        className="grid overflow-hidden rounded-2xl border bg-white md:grid-cols-[1fr_280px]"
        aria-label="Your lab notebook"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-800">
            <ClipboardList className="h-4 w-4" />
            My lab notebook
          </div>
          <h2 className="mt-3 text-xl font-semibold">
            {resume
              ? `Pick up: ${resume.title}`
              : 'Turn a good question into an investigation'}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
            {resume
              ? 'Your notes and recorded trials are saved on this browser. Continue testing, then explain what you found.'
              : 'Each notebook gives you space for a prediction, method, observations and conclusion. Download your work to share with your teacher.'}
          </p>
          {resume && (
            <Link
              to={`/student/stem-labs/${resume.id}`}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white"
            >
              Continue notebook
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="flex items-center justify-around gap-4 border-t bg-slate-50 p-6 md:border-l md:border-t-0">
          <div>
            <FlaskConical className="mb-3 h-5 w-5 text-teal-700" />
            <p className="text-2xl font-semibold">
              {isLoading ? '—' : labs.filter((l) => investigationFor(l)).length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Working models</p>
          </div>
          <div>
            <CheckCircle2 className="mb-3 h-5 w-5 text-teal-700" />
            <p className="text-2xl font-semibold">
              {sessionsError
                ? '—'
                : labs.filter((l) => completed.has(l.key)).length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Labs completed</p>
          </div>
        </div>
      </section>
      <section aria-label="Find an investigation" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'Explore labs'],
            ['interactive', 'Interactive models'],
            ['notebooks', 'My notebooks'],
            ['completed', 'Completed'],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${view === key ? 'bg-[#101820] text-white' : 'border bg-white text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_190px_190px]">
          <label className="relative block">
            <span className="sr-only">Search labs</span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"
            />
            <input
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a topic or investigation…"
            />
          </label>
          <label>
            <span className="sr-only">Lab category</span>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubjectId('');
              }}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All categories</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Lab subject</span>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">All subjects</option>
              {subjectNames.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {sessionsError && (
        <p role="status" className="text-sm text-amber-900">
          Completion history could not be loaded. You can still open your labs
          and local notebooks.
        </p>
      )}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-2xl border bg-white p-6">
          <p>We couldn’t load your labs.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500" role="status">
            {visible.length}{' '}
            {visible.length === 1 ? 'investigation' : 'investigations'}
            {view === 'interactive' ? ' with a working browser model' : ''}
          </p>
          {visible.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-teal-700" />
              <h2 className="mt-3 font-semibold">
                {view === 'notebooks'
                  ? 'Your next investigation starts here'
                  : 'No labs in this selection'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {view === 'notebooks'
                  ? 'Open a lab and write a prediction to start a notebook on this browser.'
                  : 'Try another subject or clear your filters.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategoryId('');
                  setSubjectId('');
                  setView('all');
                }}
                className="mt-4 text-sm font-semibold text-teal-800 underline"
              >
                Explore all available labs
              </button>
            </div>
          ) : (
            <section
              aria-label="Available investigations"
              className="grid gap-4 sm:grid-cols-2"
            >
              {visible.map((lab) => {
                const pack = investigationFor(lab);
                const { Icon, style, line } = appearance(lab);
                return (
                  <article
                    key={lab.id}
                    className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-teal-500"
                  >
                    <div
                      className={`relative flex items-center justify-between gap-3 px-5 py-5 ${style}`}
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          {lab.subject}
                        </p>
                        <p className="mt-2 text-xs opacity-80">{line}</p>
                      </div>
                      <Icon
                        strokeWidth={1.3}
                        className="h-16 w-16 shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-1 font-semibold ${pack ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {pack ? 'Interactive model' : 'Activity & notebook'}
                        </span>
                        {completed.has(lab.key) && (
                          <span className="inline-flex items-center gap-1 text-teal-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-lg font-semibold">
                        {lab.title}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {pack?.question ??
                          lab.topic ??
                          lab.topicArea ??
                          'Explore the activity, record your observations and explain what you learn.'}
                      </p>
                      <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-slate-500">
                        <ClipboardList className="h-4 w-4" />
                        {pack
                          ? 'Controls · results table · evidence notebook'
                          : 'Instructions and supporting resources inside'}
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                        {lab.durationMinutes ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            About {lab.durationMinutes} min
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            At your pace
                          </span>
                        )}
                        <Link
                          to={`/student/stem-labs/${lab.id}`}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"
                        >
                          {drafts.has(lab.id)
                            ? 'Open notebook'
                            : pack
                              ? 'Start investigating'
                              : 'Explore activity'}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
