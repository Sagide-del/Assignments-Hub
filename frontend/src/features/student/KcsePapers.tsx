import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

function PaperIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M6 3.5h8l4 4V20.5H6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function KcsePapersPage() {
  const [subject, setSubject] = useState('');
  const papersQuery = useQuery({
    queryKey: ['assignments', 'kcse'],
    queryFn: assignmentsApi.findKcse,
  });
  const papers = papersQuery.data ?? [];
  const subjects = useMemo(
    () => Array.from(new Set(papers.map((paper) => paper.subject))).sort(),
    [papers],
  );
  const visible = subject ? papers.filter((paper) => paper.subject === subject) : papers;

  return (
    <div className="space-y-6">
      <PageHeader title="KCSE Papers" />

      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Available papers" value={papers.length} />
        <MetricCard label="Subjects" value={subjects.length} />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="kcse-subject">
          Subject
        </label>
        <select
          id="kcse-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base sm:max-w-xs"
        >
          <option value="">All subjects</option>
          {subjects.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
        </select>
      </section>

      {papersQuery.isLoading ? (
        <EmptyState title="Loading papers..." />
      ) : visible.length === 0 ? (
        <EmptyState title="No KCSE papers available" />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {visible.map((paper) => (
            <article key={paper.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#101820] text-[#B5E61D]">
                  <PaperIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {paper.subject} · {paper.grade}
                  </p>
                  <h2 className="mt-1 break-words text-lg font-semibold text-[#101820]">{paper.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{paper._count?.questions ?? paper.questions?.length ?? 0} questions</span>
                    {paper.timeAllowedMinutes ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{paper.timeAllowedMinutes} min</span> : null}
                    {paper.maxPoints ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{paper.maxPoints} marks</span> : null}
                  </div>
                </div>
              </div>
              <Link
                to={`/student/assignments/${paper.id}`}
                className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B5E61D] px-4 text-sm font-semibold text-[#101820]"
              >
                Open paper
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
