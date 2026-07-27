import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { assignmentsApi, type CreateQuestionInput } from '../../api/assignments.api';
import { apiErrorMessage } from '../../api/axios';
import { sanitizeRichHtml, RichContent } from '../../components/ui/RichContent';
import { PageHeader, ActionCard } from '../../components/ui/Saas';
import type { QuestionType } from '../../types';
import { RichTextEditor } from './rich-editor/RichTextEditor';
import { DiagramLabeler } from './rich-editor/DiagramLabeler';
import { buildDiagramHtml, type DiagramValue } from './rich-editor/diagramHtml';

const QUESTION_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ESSAY', 'FILE_UPLOAD', 'MATCHING', 'ORDERING',
];

let nextTempId = 1;
interface DraftQuestion {
  tempId: number;
  questionType: QuestionType;
  points: number;
  bodyHtml: string;
  diagram: DiagramValue | null;
  options: string;
  correctAnswer: string;
  hint: string;
}

function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = sanitizeRichHtml(html);
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

function newQuestion(): DraftQuestion {
  return {
    tempId: nextTempId++,
    questionType: 'ESSAY',
    points: 10,
    bodyHtml: '',
    diagram: null,
    options: '',
    correctAnswer: '',
    hint: '',
  };
}

// The "Rich Editor" path for creating an assignment — a second option next
// to the existing manual question-builder (CreateAssignment.tsx) and AI
// Generator, not a replacement for either. Lets a teacher write question
// text with real formatting, insert a math or chemistry equation (KaTeX,
// including \ce{...} chemistry via the mhchem extension — see
// rich-editor/RichTextEditor.tsx), embed images, and attach a numbered
// labeled diagram (rich-editor/DiagramLabeler.tsx). Submits through the
// exact same POST /assignments the manual builder uses
// (assignmentsApi.create) — same grade handling, same publish/notify
// behavior, same backend validation. Students currently see this content
// read-only (rendered via RichContent.tsx in ExamPlayer) and answer the
// same way they do today; interactive answering for diagrams/equations is
// a later addition.
export function CreateAssignmentRich() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notifyParents, setNotifyParents] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);
  const [status, setStatus] = useState<string | null>(null);

  function updateQuestion(tempId: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q)));
  }

  function removeQuestion(tempId: number) {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.tempId !== tempId) : prev));
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const payloadQuestions: CreateQuestionInput[] = questions.map((q, index) => {
        const diagramHtml = q.diagram ? buildDiagramHtml(q.diagram) : '';
        const contentHtml = `${q.bodyHtml}${diagramHtml}`;
        const plainText = htmlToPlainText(q.bodyHtml) || (q.diagram ? 'Diagram-based question' : 'Untitled question');
        return {
          questionText: plainText,
          contentHtml,
          questionType: q.questionType,
          options:
            q.questionType === 'MULTIPLE_CHOICE'
              ? q.options.split(',').map((s) => s.trim()).filter(Boolean)
              : undefined,
          correctAnswer: q.correctAnswer || undefined,
          points: q.points,
          order: index,
          hint: q.hint || undefined,
        };
      });

      return assignmentsApi.create({
        title,
        subject,
        grade,
        dueDate: dueDate || undefined,
        notifyParents,
        questions: payloadQuestions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      navigate('/teacher', { replace: true });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not create assignment')),
  });

  const canSubmit = !!title && !!subject && !!grade && questions.every((q) => q.bodyHtml.trim() || q.diagram);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Rich Editor (Beta)"
        title="New Assignment — Rich Editor"
        meta="Format question text, insert math or chemistry equations, embed images, and label diagrams."
      />

      <ActionCard title="Assignment details">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Grade</label>
            <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade 7" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={notifyParents} onChange={(e) => setNotifyParents(e.target.checked)} />
          SMS every parent in this grade when created
        </label>
      </ActionCard>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <ActionCard key={q.tempId} title={`Question ${idx + 1}`} meta={`${q.points} pts`}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={q.questionType}
                  onChange={(e) => updateQuestion(q.tempId, { questionType: e.target.value as QuestionType })}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                <input
                  type="number"
                  value={q.points}
                  onChange={(e) => updateQuestion(q.tempId, { points: Number(e.target.value) || 0 })}
                  placeholder="Points"
                  className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                {questions.length > 1 ? (
                  <button type="button" onClick={() => removeQuestion(q.tempId)} className="ml-auto text-xs font-semibold text-red-600 hover:underline">
                    Remove question
                  </button>
                ) : null}
              </div>

              <RichTextEditor value={q.bodyHtml} onChange={(html) => updateQuestion(q.tempId, { bodyHtml: html })} />

              <DiagramLabeler value={q.diagram} onChange={(d) => updateQuestion(q.tempId, { diagram: d })} />

              {q.questionType === 'MULTIPLE_CHOICE' && (
                <input
                  value={q.options}
                  onChange={(e) => updateQuestion(q.tempId, { options: e.target.value })}
                  placeholder="Options, comma-separated"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              )}
              {['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'].includes(q.questionType) && (
                <input
                  value={q.correctAnswer}
                  onChange={(e) => updateQuestion(q.tempId, { correctAnswer: e.target.value })}
                  placeholder="Correct answer (for auto-grading)"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              )}
              <input
                value={q.hint}
                onChange={(e) => updateQuestion(q.tempId, { hint: e.target.value })}
                placeholder="Hint (optional)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />

              {(q.bodyHtml.trim() || q.diagram) ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Student preview</p>
                  <RichContent html={`${q.bodyHtml}${q.diagram ? buildDiagramHtml(q.diagram) : ''}`} />
                </div>
              ) : null}
            </div>
          </ActionCard>
        ))}

        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
          className="w-full rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 hover:border-slate-400"
        >
          + Add question
        </button>
      </div>

      {status && <p className="text-sm text-red-600">{status}</p>}

      <button
        type="button"
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending || !canSubmit}
        className="rounded-2xl bg-[#101820] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {createMutation.isPending ? 'Creating…' : 'Create Assignment'}
      </button>
    </div>
  );
}
