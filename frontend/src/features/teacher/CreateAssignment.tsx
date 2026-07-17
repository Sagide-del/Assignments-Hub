import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { assignmentsApi, type CreateQuestionInput } from '../../api/assignments.api';
import { apiErrorMessage } from '../../api/axios';
import type { QuestionType } from '../../types';

const QUESTION_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ESSAY', 'FILE_UPLOAD', 'MATCHING', 'ORDERING',
];

let nextTempId = 1;
interface DraftQuestion extends CreateQuestionInput {
  tempId: number;
}

// Manual question-by-question builder — calls POST /assignments directly
// (backend/src/assignments/assignments.controller.ts create()), the
// counterpart to the Teacher Dashboard's JSON-upload path. Real
// `notifyParents` checkbox: the backend actually sends parent SMS on
// creation when set (see create-assignment.dto.ts), unlike the automatic
// SMS-on-publish flow described in the original brief, which doesn't exist.
export function CreateAssignment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notifyParents, setNotifyParents] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { tempId: nextTempId++, questionText: '', questionType: 'ESSAY', points: 10, order: prev.length },
    ]);
  }

  function updateQuestion(tempId: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q)));
  }

  function removeQuestion(tempId: number) {
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  }

  const createMutation = useMutation({
    mutationFn: () =>
      assignmentsApi.create({
        title,
        subject,
        grade,
        dueDate: dueDate || undefined,
        notifyParents,
        questions: questions.map(({ tempId: _tempId, ...q }) => q),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      navigate('/teacher', { replace: true });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not create assignment')),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">New Assignment (Manual)</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade 7" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyParents} onChange={(e) => setNotifyParents(e.target.checked)} />
          SMS every parent in this grade when created
        </label>
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={q.tempId} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Question {idx + 1}</p>
              <button onClick={() => removeQuestion(q.tempId)} className="text-xs text-red-600">Remove</button>
            </div>
            <textarea
              value={q.questionText}
              onChange={(e) => updateQuestion(q.tempId, { questionText: e.target.value })}
              rows={2}
              placeholder="Question text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={q.questionType}
                onChange={(e) => updateQuestion(q.tempId, { questionType: e.target.value as QuestionType })}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
              <input
                type="number"
                value={q.points ?? 10}
                onChange={(e) => updateQuestion(q.tempId, { points: Number(e.target.value) })}
                placeholder="Points"
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            {q.questionType === 'MULTIPLE_CHOICE' && (
              <input
                placeholder="Options, comma-separated"
                onChange={(e) => updateQuestion(q.tempId, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            )}
            {['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'].includes(q.questionType ?? '') && (
              <input
                placeholder="Correct answer (for auto-grading)"
                value={q.correctAnswer ?? ''}
                onChange={(e) => updateQuestion(q.tempId, { correctAnswer: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            )}
          </div>
        ))}
        <button onClick={addQuestion} className="px-3 py-2 text-sm rounded border border-gray-300">
          + Add question
        </button>
      </div>

      {status && <p className="text-sm text-red-600">{status}</p>}

      <button
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending || !title || !subject || !grade}
        className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
      >
        {createMutation.isPending ? 'Creating…' : 'Create Assignment'}
      </button>
    </div>
  );
}
