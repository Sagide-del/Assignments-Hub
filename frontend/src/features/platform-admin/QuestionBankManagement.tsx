import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  questionBankAdminApi,
  type QuestionBankItem,
  type QuestionBankQuestionType,
  type QuestionBankStatus,
} from '../../api/question-bank.api';
import { uploadsApi } from '../../api/uploads.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

const STATUS_TABS: { label: string; value: QuestionBankStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Needs review', value: 'GENERATED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

// Only these are actually generatable today — QuestionBankService.generate
// silently drops any other type from the batch (AI_GENERATABLE_QUESTION_TYPES
// server-side), so offering Matching/Fill-in-the-Blank as live checkboxes
// would look like a working option that quietly produces zero questions.
const ENABLED_QUESTION_TYPES: { value: QuestionBankQuestionType; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'TRUE_FALSE', label: 'True/False' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
];
const UNSUPPORTED_QUESTION_TYPES = ['Matching', 'Fill in the Blank'];
const DEFAULT_QUESTION_TYPES: QuestionBankQuestionType[] = [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'NUMERIC',
  'SHORT_ANSWER',
];

const DIAGRAM_MAX_BYTES = 5 * 1024 * 1024;
const DIAGRAM_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

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
  const [questionCount, setQuestionCount] = useState(60);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'>('MIXED');
  const [inputType, setInputType] = useState<'PDF' | 'TEXT'>('PDF');
  const [file, setFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [questionTypes, setQuestionTypes] = useState<Set<QuestionBankQuestionType>>(
    new Set(DEFAULT_QUESTION_TYPES),
  );
  const [autoTagTopic, setAutoTagTopic] = useState(false);
  const [includeDiagramPlaceholders, setIncludeDiagramPlaceholders] = useState(false);
  const [prioritizeHigherOrder, setPrioritizeHigherOrder] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [publishTitle, setPublishTitle] = useState('');
  const [diagramUploadingFor, setDiagramUploadingFor] = useState<number | null>(null);

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
      if (inputType === 'PDF' && !file) throw new Error('Choose a PDF file first');
      if (inputType === 'TEXT' && sourceText.trim().length < 50) {
        throw new Error('Paste at least 50 characters of source text');
      }
      return questionBankAdminApi.generate({
        inputType,
        file: inputType === 'PDF' ? (file as File) : undefined,
        sourceText: inputType === 'TEXT' ? sourceText.trim() : undefined,
        subject,
        grade,
        topic,
        questionCount,
        difficulty,
        questionTypes: Array.from(questionTypes),
        autoTagTopic,
        includeDiagramPlaceholders,
        prioritizeHigherOrder,
      });
    },
    onSuccess: (items) => {
      setNotice(`Generated ${items.length} questions. Review them below before approving.`);
      setError('');
      setFile(null);
      setSourceText('');
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

  const updateDiagram = useMutation({
    mutationFn: (input: { id: number; diagramUrl: string; diagramAlt?: string }) =>
      questionBankAdminApi.update(input.id, { diagramUrl: input.diagramUrl, diagramAlt: input.diagramAlt }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['question-bank-admin'] }),
    onError: (err) => setError(apiErrorMessage(err, 'Could not save the diagram')),
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

  function toggleQuestionType(type: QuestionBankQuestionType) {
    setQuestionTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  async function handleDiagramUpload(item: QuestionBankItem, uploadedFile: File) {
    setError('');
    if (uploadedFile.size > DIAGRAM_MAX_BYTES) {
      setError('Diagram images must be 5MB or smaller');
      return;
    }
    setDiagramUploadingFor(item.id);
    try {
      const result = await uploadsApi.uploadSingle(uploadedFile);
      await updateDiagram.mutateAsync({ id: item.id, diagramUrl: result.url, diagramAlt: item.diagramAlt ?? undefined });
    } catch (err) {
      setError(apiErrorMessage(err, 'Diagram upload failed'));
    } finally {
      setDiagramUploadingFor(null);
    }
  }

  function handleDiagramRemove(item: QuestionBankItem) {
    updateDiagram.mutate({ id: item.id, diagramUrl: '', diagramAlt: '' });
  }

  const canGenerate =
    !!subject &&
    !!grade &&
    !!topic &&
    questionTypes.size > 0 &&
    (inputType === 'PDF' ? !!file : sourceText.trim().length >= 50) &&
    !generate.isPending;

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

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-5">
        <h2 className="text-lg font-semibold text-[#101820]">Generate a new batch</h2>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Source</p>
          <div className="flex flex-wrap gap-2">
            {(['PDF', 'TEXT'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setInputType(type)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  inputType === type ? 'bg-[#101820] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {type === 'PDF' ? 'PDF Upload' : 'Text Paste'}
              </button>
            ))}
            {['URL/Link', 'Video Transcript'].map((label) => (
              <button
                key={label}
                type="button"
                disabled
                title="Coming soon — needs a safe content fetcher / transcription service that doesn't exist yet"
                className="cursor-not-allowed rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400"
              >
                {label} (coming soon)
              </button>
            ))}
          </div>
        </div>

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
        </div>

        {inputType === 'PDF' ? (
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        ) : (
          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Paste the source text to generate questions from (at least 50 characters)"
            rows={6}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Question types</p>
          <div className="flex flex-wrap gap-2">
            {ENABLED_QUESTION_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold ${
                  questionTypes.has(type.value)
                    ? 'border-[#101820] bg-[#101820] text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={questionTypes.has(type.value)}
                  onChange={() => toggleQuestionType(type.value)}
                  className="sr-only"
                />
                {type.label}
              </label>
            ))}
            {UNSUPPORTED_QUESTION_TYPES.map((label) => (
              <span
                key={label}
                title="Not yet supported by AI generation — build these manually in the assignment editor instead"
                className="flex min-h-9 cursor-not-allowed items-center rounded-full border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-400"
              >
                {label} (not yet supported)
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Difficulty</p>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
              className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Question count: <span className="text-[#101820]">{questionCount}</span>
            </p>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              className="w-full accent-[#101820]"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Bloom's Taxonomy / Higher-Order Thinking
          </p>
          <label className="flex min-h-9 w-fit cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={prioritizeHigherOrder}
              onChange={(event) => setPrioritizeHigherOrder(event.target.checked)}
            />
            Prioritize Higher-Order Thinking questions (Analyze/Evaluate/Create)
          </label>
          <p className="mt-1.5 text-xs text-slate-400">
            Every generated question is automatically classified with a Bloom's level for review filtering, regardless of this setting.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Additional options</p>
          <div className="flex flex-wrap gap-4">
            <label
              className="flex min-h-9 items-center gap-2 text-xs font-semibold text-slate-400"
              title="Always included — every question stores its correct answer for the review queue and grading"
            >
              <input type="checkbox" checked disabled />
              Include Answer Key
            </label>
            <label
              className="flex min-h-9 items-center gap-2 text-xs font-semibold text-slate-400"
              title="Always included — every question is generated with an explanation"
            >
              <input type="checkbox" checked disabled />
              Include Feedback Explanations
            </label>
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={includeDiagramPlaceholders}
                onChange={(event) => setIncludeDiagramPlaceholders(event.target.checked)}
              />
              Suggest Diagram Placeholders
            </label>
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={autoTagTopic}
                onChange={(event) => setAutoTagTopic(event.target.checked)}
              />
              Auto-tag by Topic
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={!canGenerate}
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
                    {item.bloomLevel ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                        {item.bloomLevel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#101820]">{item.questionText}</p>
                  <p className="mt-1 text-xs text-slate-500">Answer: {item.correctAnswer}</p>

                  <div className="mt-3 rounded-xl border border-slate-100 bg-[#F8FAFC] p-3">
                    {item.diagramUrl ? (
                      <div className="flex flex-wrap items-start gap-3">
                        <img
                          src={item.diagramUrl}
                          alt={item.diagramAlt ?? 'Question diagram'}
                          className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                        />
                        <div className="flex flex-col gap-2">
                          <label className="cursor-pointer text-xs font-semibold text-sky-700 underline">
                            {diagramUploadingFor === item.id ? 'Uploading...' : 'Replace'}
                            <input
                              type="file"
                              accept={DIAGRAM_ACCEPT}
                              className="hidden"
                              disabled={diagramUploadingFor === item.id}
                              onChange={(event) => {
                                const picked = event.target.files?.[0];
                                if (picked) void handleDiagramUpload(item, picked);
                                event.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDiagramRemove(item)}
                            className="text-xs font-semibold text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700">
                          {diagramUploadingFor === item.id ? 'Uploading...' : 'Upload Diagram'}
                          <input
                            type="file"
                            accept={DIAGRAM_ACCEPT}
                            className="hidden"
                            disabled={diagramUploadingFor === item.id}
                            onChange={(event) => {
                              const picked = event.target.files?.[0];
                              if (picked) void handleDiagramUpload(item, picked);
                              event.target.value = '';
                            }}
                          />
                        </label>
                        {item.diagramAlt ? (
                          <p className="mt-2 text-xs text-slate-500">Suggested diagram: {item.diagramAlt}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-slate-400">PNG, JPEG, GIF, or WebP — max 5MB</p>
                      </div>
                    )}
                  </div>
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
