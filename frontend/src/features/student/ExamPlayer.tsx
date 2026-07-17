import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments.api';
import { uploadsApi } from '../../api/uploads.api';
import { apiErrorMessage } from '../../api/axios';
import type { AnswerInput, Question } from '../../types';

// Real exam-taking flow: loads the assignment's question bank (with
// correctAnswer already stripped server-side for STUDENT actors — see
// AssignmentsService.stripAnswersForStudent), lets the student answer each
// question by its type, autosaves as a draft, and submits for real grading
// via POST /assignments/:id/submissions.
export function ExamPlayer() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = Number(id);
  const navigate = useNavigate();

  const { data: assignment } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => assignmentsApi.findOne(assignmentId),
    enabled: !!assignmentId,
  });

  const { data: questions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['assignment-questions', assignmentId],
    queryFn: () => assignmentsApi.findQuestions(assignmentId),
    enabled: !!assignmentId,
  });

  // A STUDENT actor hitting GET /assignments/:id/submissions only ever gets
  // back their own submission (at most one — see the controller's comment).
  const { data: existingSubmissions } = useQuery({
    queryKey: ['my-submission', assignmentId],
    queryFn: () => assignmentsApi.listSubmissions(assignmentId),
    enabled: !!assignmentId,
  });
  const existing = existingSubmissions?.[0];

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const startTime = useMemo(() => Date.now(), []);

  useEffect(() => {
    if (existing?.answers) {
      const map: Record<number, string> = {};
      for (const a of existing.answers) map[a.questionId] = a.studentAnswer;
      setAnswers(map);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: (isDraft: boolean) => {
      const answerList: AnswerInput[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: Number(questionId),
        answer,
      }));
      const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
      return assignmentsApi.submit(assignmentId, { answers: answerList, isDraft, timeSpentSeconds });
    },
    onSuccess: (_, isDraft) => {
      setStatus(isDraft ? 'Draft saved.' : 'Submitted for grading.');
      if (!isDraft) navigate('/student', { replace: true });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save')),
  });

  async function handleFileChange(questionId: number, file: File) {
    setUploadingFor(questionId);
    try {
      const result = await uploadsApi.uploadSingle(file);
      setAnswers((prev) => ({ ...prev, [questionId]: result.url }));
    } catch (err) {
      setStatus(apiErrorMessage(err, 'Upload failed'));
    } finally {
      setUploadingFor(null);
    }
  }

  const alreadyFinal = existing && existing.status !== 'DRAFT';

  if (loadingQuestions) return <p className="text-sm text-gray-500">Loading…</p>;

  if (alreadyFinal) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">{assignment?.title}</h1>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            You already submitted this assignment
            {existing?.gradedAt ? ' and it has been graded.' : ' — it is awaiting grading.'}
          </p>
          {existing?.score != null && (
            <p className="text-2xl font-semibold mt-2">
              {existing.score}
              <span className="text-sm text-gray-500"> / {assignment?.totalMarks}</span>
            </p>
          )}
          {existing?.feedback && <p className="text-sm text-gray-600 mt-2">{existing.feedback}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{assignment?.title}</h1>
        <p className="text-sm text-gray-500">{assignment?.subject} · {assignment?.totalMarks} marks</p>
      </div>

      <div className="space-y-4">
        {(questions ?? []).map((q, idx) => (
          <QuestionInput
            key={q.id}
            index={idx}
            question={q}
            value={answers[q.id] ?? ''}
            onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
            onFile={(file) => handleFileChange(q.id, file)}
            uploading={uploadingFor === q.id}
          />
        ))}
      </div>

      {status && <p className="text-sm text-gray-600">{status}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => saveMutation.mutate(true)}
          disabled={saveMutation.isPending}
          className="px-4 py-2 text-sm rounded border border-gray-300 disabled:opacity-60"
        >
          Save Draft
        </button>
        <button
          onClick={() => {
            if (confirm('Submit for grading? You cannot edit answers afterwards.')) {
              saveMutation.mutate(false);
            }
          }}
          disabled={saveMutation.isPending}
          className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

function QuestionInput({
  index,
  question,
  value,
  onChange,
  onFile,
  uploading,
}: {
  index: number;
  question: Question;
  value: string;
  onChange: (v: string) => void;
  onFile: (f: File) => void;
  uploading: boolean;
}) {
  const options = Array.isArray(question.options) ? (question.options as string[]) : [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-medium mb-2">
        {index + 1}. {question.questionText} <span className="text-xs text-gray-400">({question.points} pts)</span>
      </p>

      {question.questionType === 'MULTIPLE_CHOICE' && (
        <div className="space-y-1">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {question.questionType === 'TRUE_FALSE' && (
        <div className="flex gap-4">
          {['true', 'false'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm capitalize">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {(question.questionType === 'FILL_BLANK') && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      )}

      {question.questionType === 'ESSAY' && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      )}

      {(question.questionType === 'MATCHING' || question.questionType === 'ORDERING') && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="Enter your matched/ordered answer"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
        />
      )}

      {question.questionType === 'FILE_UPLOAD' && (
        <div className="space-y-1">
          <input
            type="file"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="text-sm"
          />
          {uploading && <p className="text-xs text-gray-500">Uploading…</p>}
          {value && !uploading && <p className="text-xs text-green-700">Uploaded — {value}</p>}
        </div>
      )}

      {question.hint && <p className="text-xs text-gray-400 mt-2">Hint: {question.hint}</p>}
    </div>
  );
}
