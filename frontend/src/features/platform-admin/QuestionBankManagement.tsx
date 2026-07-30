import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  questionBankAdminApi,
  type QuestionBankItem,
  type QuestionBankStatus,
} from '../../api/question-bank.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

const STATUS_TABS: { label: string; value: QuestionBankStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Needs review', value: 'GENERATED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

function statusBadge(status: QuestionBankStatus) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'REJECTED') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

export function QuestionBankManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<QuestionBankStatus | 'ALL'>('GENERATED');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState('60');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [publishTitle, setPublishTitle] = useState('');

  const listQuery = useQuery({
    queryKey: ['question-bank-admin', statusFilter],
    queryFn: () =>
      questionBankAdminApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        take: 100,
      }),
  });

  const generate = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a PDF file first');
      return questionBankAdminApi.generate({
        file,
        subject,
        grade,
        topic,
        questionCount: Number(questionCount) || undefined,
      });
    },
    onSuccess: (items) => {
      setNotice(`Generated ${items.length} questions. Review them below before approving.`);
      setError('');
      setFile(null);
      setStatusFilter('GENERATED');
      void queryClient.invalidateQueries({ queryKey: ['question-bank-admin'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not generate questions')),
  });

  const approve = useMutation({
    mutationFn: (id: number) => questionBankAdminApi.approve(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['question-bank-admin'] }),
    onError: (err) => setError(apiErrorMessage(err, 'Could not approve the question')),
  });

  const reject = useMutation({
    mutationFn: (id: number) => questionBankAdminApi.reject(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['question-bank-admin'] }),
    onError: (err) => setError(apiErrorMessage(err, 'Could not reject the question')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => questionBankAdminApi.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['question-bank-admin'] }),
    onError: (err) => setError(apiErrorMessage(err, 'Could not delete the question')),
  });

  const publish = useMutation({
    mutationFn: () =>
      questionBankAdminApi.publish({
        questionIds: Array.from(selected),
        title: publishTitle,
      }),
    onSuccess: (result) => {
      setNotice(`Published ${result.questionCount} questions as assignment #${result.assignmentId} for independent students.`);
      setSelected(new Set());
      setPublishTitle('');
      void queryClient.invalidateQueries({ queryKey: ['question-bank-admin'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not publish to independent students')),
  });

  const items = listQuery.data?.items ?? [];
  const approvedCount = items.filter((item) => item.status === 'APPROVED').length;

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
      <PageHeader eyebrow="Platform Admin" title="Question Bank Management" />

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-medium text-[#33410a]">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total questions" value={listQuery.data?.total ?? '-'} />
        <MetricCard label="Approved (this filter)" value={approvedCount} />
        <MetricCard label="Selected for publish" value={selected.size} />
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#101820]">Generate a new batch</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Subject (e.g. Biology)"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <input
            type="text"
            placeholder="Grade (e.g. Grade 10)"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <input
            type="text"
            placeholder="Topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm sm:col-span-2"
          />
          <input
            type="number"
            min={20}
            max={100}
            placeholder="Question count (20-100)"
            value={questionCount}
            onChange={(event) => setQuestionCount(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={!file || !subject || !grade || !topic || generate.isPending}
          onClick={() => generate.mutate()}
          className="min-h-11 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {generate.isPending ? 'Generating with OpenAI...' : 'Upload & generate'}
        </button>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#101820]">Review queue</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  statusFilter === tab.value ? 'bg-[#101820] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState title="No questions in this filter yet" />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item: QuestionBankItem) => (
              <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[auto_1fr_auto]">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  disabled={item.status !== 'APPROVED'}
                  onChange={() => toggleSelected(item.id)}
                  className="mt-1 h-4 w-4 accent-[#101820]"
                  title={item.status !== 'APPROVED' ? 'Only approved questions can be published' : 'Select for publishing'}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.subject} · {item.grade} · {item.topic} · {item.questionType}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#101820]">{item.questionText}</p>
                  <p className="mt-1 text-xs text-slate-500">Answer: {item.correctAnswer}</p>
                </div>
                <div className="flex items-start gap-2">
                  {item.status !== 'APPROVED' ? (
                    <button
                      type="button"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(item.id)}
                      className="min-h-9 rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-40"
                    >
                      Approve
                    </button>
                  ) : null}
                  {item.status !== 'REJECTED' ? (
                    <button
                      type="button"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(item.id)}
                      className="min-h-9 rounded-lg border border-amber-300 px-3 text-xs font-semibold text-amber-700 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  ) : null}
                  {!item.publishedAssignmentId ? (
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(item.id)}
                      className="min-h-9 rounded-lg border border-red-300 px-3 text-xs font-semibold text-red-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold text-[#101820]">Publish to independent students</h2>
        <p className="text-sm text-slate-600">
          Select approved questions above, name the assignment, and publish it directly to independent students.
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Assignment title"
            value={publishTitle}
            onChange={(event) => setPublishTitle(event.target.value)}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button
            type="button"
            disabled={!publishTitle || selected.size === 0 || publish.isPending}
            onClick={() => publish.mutate()}
            className="min-h-11 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {publish.isPending ? 'Publishing...' : `Publish ${selected.size || ''} question(s)`}
          </button>
        </div>
      </section>
    </div>
  );
}

export default QuestionBankManagement;
