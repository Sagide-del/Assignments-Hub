import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { questionBankApi, type QuestionBankItem } from '../../api/question-bank.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

export default function QuestionBankBrowser() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const filtersQuery = useQuery({
    queryKey: ['question-bank-filters'],
    queryFn: async () => ({
      subjects: await questionBankApi.subjects(),
      grades: await questionBankApi.grades(),
      topics: await questionBankApi.topics(),
    }),
  });

  const browseQuery = useQuery({
    queryKey: ['question-bank-browse', subject, grade, topic],
    queryFn: () =>
      questionBankApi.browse({
        subject: subject || undefined,
        grade: grade || undefined,
        topic: topic || undefined,
        take: 100,
      }),
  });

  const select = useMutation({
    mutationFn: () =>
      questionBankApi.select({
        questionIds: Array.from(selected),
        title,
      }),
    onSuccess: () => {
      setNotice('Assignment created from the Question Bank.');
      setSelected(new Set());
      setTitle('');
      void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not create the assignment')),
  });

  const items = browseQuery.data?.items ?? [];

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teacher tools"
        title="Question Bank"
        meta="Curated by Platform Admin. Select questions to build your own assignment."
      />

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-medium text-[#33410a]">
          {notice}{' '}
          <button
            type="button"
            className="ml-2 font-semibold underline"
            onClick={() => navigate('/teacher')}
          >
            Back to dashboard
          </button>
        </div>
      ) : null}

      {browseQuery.error ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#101820]">Question Bank unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">
            {apiErrorMessage(browseQuery.error, 'The Question Bank has not been activated for your school yet. Ask your Platform Admin to activate it.')}
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Available questions" value={browseQuery.data?.total ?? '-'} />
            <MetricCard label="Selected" value={selected.size} />
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="">All subjects</option>
                {(filtersQuery.data?.subjects ?? []).map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
              <select
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="">All grades</option>
                {(filtersQuery.data?.grades ?? []).map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="">All topics</option>
                {(filtersQuery.data?.topics ?? []).map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6">
            {browseQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading questions...</p>
            ) : items.length === 0 ? (
              <EmptyState title="No questions match these filters" />
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item: QuestionBankItem) => (
                  <label key={item.id} className="flex gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      className="mt-1 h-4 w-4 accent-[#101820]"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {item.subject} · {item.grade} · {item.topic} · {item.questionType}
                      </span>
                      <span className="mt-1 block text-sm font-medium text-[#101820]">{item.questionText}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="text-lg font-semibold text-[#101820]">Create assignment from selection</h2>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Assignment title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <button
                type="button"
                disabled={!title || selected.size === 0 || select.isPending}
                onClick={() => select.mutate()}
                className="min-h-11 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {select.isPending ? 'Creating...' : `Create from ${selected.size || ''} question(s)`}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
