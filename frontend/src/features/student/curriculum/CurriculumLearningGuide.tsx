import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Download,
  ExternalLink,
  Target,
} from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { assignmentsApi } from '../../../api/assignments.api';
import { labsApi } from '../../../api/labs.api';
import { skillsApi } from '../../../api/skills.api';
import { courseLessons } from '../skill-workspace/workspace-mode';
import {
  COMPETENCIES,
  CONTEXT_THEMES,
  FRAMEWORK,
  LEARNING_CYCLE,
  OFFICIAL_RESOURCES,
  gradeDesignLink,
  levelContext,
  type CompetencyId,
  type LearningArea,
} from './framework';
import { assignmentDesign, skillDesign, stemDesign } from './activity-designs';
import { readReviews, type LearningReview } from './learning-journal';
import { downloadReview } from './LearningDesignPanel';
const AREAS: Record<LearningArea, string> = {
  assignments: 'Assignments',
  stem: 'STEM Labs',
  skills: 'Learn a Skill',
};
export function CurriculumLearningGuide() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-[#101820] p-5 text-white sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">
          Outcomes → practice → evidence → improvement
        </p>
        <h2 className="mt-3 text-2xl font-semibold">
          Know what you are learning and how to show it
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
          Use an assignment to apply an idea, a lab to investigate it, and a
          skill activity to create something. Keep evidence, use feedback and
          decide what to try next.
        </p>
      </header>
      <section
        aria-label="Learning cycle"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {LEARNING_CYCLE.map((step, i) => (
          <article key={step.title} className="rounded-2xl border bg-white p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-xs font-semibold text-teal-800">
              {i + 1}
            </span>
            <h3 className="mt-3 font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {step.instruction}
            </p>
          </article>
        ))}
      </section>
      <LearningActivities key={user?.id} />
      <SavedEvidence key={`reviews-${user?.id}`} />
      <section
        className="rounded-2xl border bg-white p-5 sm:p-6"
        aria-label="Seven core competencies"
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Target className="h-5 w-5 text-teal-800" />
          The seven core competencies
        </h2>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          KICD framework, p. 21. The practice suggestions below are Assignment
          Hub adaptations.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {COMPETENCIES.map((c) => (
            <div key={c.id}>
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {c.practice}
              </p>
            </div>
          ))}
        </div>
      </section>
      <details className="rounded-2xl border bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-teal-900">
          Connect learning to life and community
        </summary>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          Six broad areas of pertinent and contemporary issues in the 2017
          framework, p. 110. The examples below are activity-planning
          suggestions; choose a relevant context with your teacher.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CONTEXT_THEMES.map((t) => (
            <article key={t.title}>
              <h3 className="text-sm font-semibold">{t.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {t.example}
              </p>
            </article>
          ))}
        </div>
      </details>
      <OfficialSources grade={user?.grade} />
    </div>
  );
}
function LearningActivities() {
  const user = useAuthStore((s) => s.user);
  const [area, setArea] = useState('all');
  const [competency, setCompetency] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(6);
  const assignments = useQuery({
    queryKey: ['assignments', user?.schoolId, user?.grade],
    queryFn: () => assignmentsApi.findAll(),
    enabled: !!user?.id,
  });
  const labs = useQuery({
    queryKey: ['labs', 'student-catalogue', user?.id, user?.grade],
    queryFn: () => labsApi.findAll(),
    enabled: !!user?.id,
  });
  const courses = useQuery({
    queryKey: ['skill-courses', user?.id],
    queryFn: () => skillsApi.getCourses(),
    enabled: !!user?.id,
  });
  const designs = useMemo(
    () => [
      ...(assignments.data ?? [])
        .filter((a) => a.isPublished)
        .map(assignmentDesign),
      ...(labs.data ?? []).map(stemDesign),
      ...(courses.data ?? []).map((c) =>
        skillDesign({
          ...c,
          learningOutcomes: courseLessons(c).some((l) => l.learning)
            ? courseLessons(c).flatMap((l) =>
                l.learning ? [l.learning.objective] : [],
              )
            : c.learningOutcomes,
        }),
      ),
    ],
    [assignments.data, labs.data, courses.data],
  );
  const visible = designs.filter(
    (d) =>
      (area === 'all' || d.area === area) &&
      (!competency ||
        d.outcomes.some((o) =>
          o.competencies.includes(competency as CompetencyId),
        )) &&
      `${d.title} ${d.outcomes.map((o) => o.statement).join(' ')}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const failed = [assignments, labs, courses].filter((q) => q.isError);
  const pending = [assignments, labs, courses].some((q) => q.isPending);
  return (
    <section aria-label="Learning outcome explorer" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          Find an outcome to work towards
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Activity goals for content available to your account. These are
          learning intentions, not claims that a competency has been mastered.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">
          Search outcomes
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(6);
            }}
            placeholder="Topic, activity or outcome"
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Learning area
          <select
            aria-label="Learning area"
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setLimit(6);
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal"
          >
            <option value="all">All learning areas</option>
            {Object.entries(AREAS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Competency to practise
          <select
            aria-label="Competency to practise"
            value={competency}
            onChange={(e) => {
              setCompetency(e.target.value);
              setLimit(6);
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal"
          >
            <option value="">All competencies</option>
            {COMPETENCIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {pending && (
        <p role="status" className="text-sm text-slate-500">
          Loading available activities…
        </p>
      )}
      {failed.length > 0 && (
        <div
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
        >
          Some activity lists could not be loaded. Available activities and
          official resource links are still shown.
          <button
            type="button"
            onClick={() => failed.forEach((q) => void q.refetch())}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {visible.slice(0, limit).map((d) => (
          <article
            key={d.id}
            className="flex min-w-0 flex-col rounded-2xl border bg-white p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
              {AREAS[d.area]}
            </p>
            <h3 className="mt-2 font-semibold">{d.title}</h3>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-slate-600">
              {d.outcomes.slice(0, 2).map((o) => (
                <li key={o.id}>{o.statement}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              <strong>Keep evidence:</strong> {d.outcomes[0].evidence}
            </p>
            <Link
              className="mt-auto inline-flex min-h-11 items-center gap-2 pt-4 text-sm font-semibold text-teal-800"
              to={d.href}
            >
              Open activity & evidence plan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
      {!pending && visible.length === 0 && (
        <p className="rounded-xl border bg-white p-5 text-sm text-slate-600">
          No activities match this selection. Try another competency or learning
          area. You can still use the official resource directory below.
        </p>
      )}
      {visible.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + 6)}
          className="min-h-11 rounded-xl border bg-white px-4 text-sm font-semibold"
        >
          Show more outcomes
        </button>
      )}
    </section>
  );
}
function SavedEvidence() {
  const userId = useAuthStore((s) => s.user?.id);
  const [records, setRecords] = useState<LearningReview[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    function load() {
      try {
        setRecords(readReviews(localStorage, userId!));
        setUnavailable(false);
      } catch {
        setUnavailable(true);
      }
    }
    load();
    window.addEventListener('storage', load);
    window.addEventListener('learning-review-saved', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('learning-review-saved', load);
    };
  }, [userId]);
  return (
    <section
      aria-label="My saved learning evidence"
      className="rounded-2xl border bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck className="h-5 w-5 text-teal-800" />
          My saved learning evidence
        </h2>
        {records.length > 0 && (
          <button
            type="button"
            onClick={() => downloadReview(records)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"
          >
            <Download className="h-4 w-4" />
            Download evidence journal
          </button>
        )}
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-500">
        Personal self-reviews saved on this browser, not submitted work or
        teacher-assessed mastery. Activity notebooks and submitted answers
        remain in their original workspaces.
      </p>
      {unavailable ? (
        <p role="status" className="mt-3 text-sm text-amber-900">
          Browser storage is unavailable. Download reflections from each
          activity before leaving.
        </p>
      ) : records.length === 0 ? (
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Open “Learning outcomes & evidence” in an activity, describe your
          evidence and save a next step. Your saved reflections will appear
          here.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {records.map((r) => (
            <article key={r.activityId} className="rounded-xl border p-4">
              <p className="text-xs font-semibold text-teal-800">
                {AREAS[r.area]}
              </p>
              <h3 className="mt-1 text-sm font-semibold">{r.title}</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {r.evidence}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                <strong>Next step:</strong> {r.nextStep}
              </p>
              <Link
                className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-teal-800"
                to={r.href}
              >
                Return to activity
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function OfficialSources({ grade }: { grade?: string | null }) {
  const gradeLink = gradeDesignLink(grade);
  const context = levelContext(grade);
  return (
    <section
      aria-label="Curriculum sources and official resources"
      className="rounded-2xl border bg-white p-5 sm:p-6"
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <BookOpen className="h-5 w-5 text-teal-800" />
        Curriculum sources & official resources
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Framework reference: {FRAMEWORK.publisher}, <em>{FRAMEWORK.title}</em> (
        {FRAMEWORK.year}). Core competencies p. 21; contemporary issues p. 110;
        assessment pp. 113–121.
      </p>
      <p className="mt-3 rounded-xl bg-teal-50 p-4 text-sm leading-7 text-teal-950">
        {context.text}{' '}
        <span className="text-xs">(Framework p. {context.page}.)</span>
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-500">
        This is a 2017 framework, not a current subject-by-subject syllabus.
        Links below come from KICD’s CBC materials directory; linked subject
        designs have not yet been reviewed for grade-specific alignment. The
        activity goals in Assignment Hub are adaptations and do not imply KICD
        endorsement.
      </p>
      <a
        href={gradeLink.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white"
      >
        {gradeLink.title}
        <ExternalLink className="h-4 w-4" />
      </a>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {OFFICIAL_RESOURCES.map((r) => (
          <article key={r.url}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-teal-800 underline"
            >
              {r.title}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
            <p className="mt-1 text-sm leading-6 text-slate-600">{r.purpose}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
