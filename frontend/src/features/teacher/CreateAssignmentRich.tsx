import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { assignmentsApi, type CreateQuestionInput } from '../../api/assignments.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, PageHeader } from '../../components/ui/Saas';
import { RichContent, sanitizeRichHtml } from '../../components/ui/RichContent';
import type { Assignment, Question, QuestionType } from '../../types';
import { DiagramLabeler } from './rich-editor/DiagramLabeler';
import { RichTextEditor } from './rich-editor/RichTextEditor';
import { buildDiagramHtml, type DiagramValue } from './rich-editor/diagramHtml';

const QUESTION_TYPES: { value: QuestionType; label: string; description: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice', description: 'Students select one option' },
  { value: 'TRUE_FALSE', label: 'True or false', description: 'Students choose between two answers' },
  { value: 'FILL_BLANK', label: 'Fill in the blank', description: 'One exact text response' },
  { value: 'NUMERIC', label: 'Numeric', description: 'A number with tolerance, units, or significant figures' },
  { value: 'SHORT_ANSWER', label: 'Short answer', description: 'A concise response graded by key concepts' },
  { value: 'ESSAY', label: 'Long response', description: 'Written work with math, chemistry, and images' },
  { value: 'FILE_UPLOAD', label: 'File upload', description: 'Students submit a graph, document, or image' },
  { value: 'MATCHING', label: 'Matching', description: 'A structured matching response' },
  { value: 'ORDERING', label: 'Ordering', description: 'A structured ordering response' },
];

const STEPS = ['Setup', 'Questions', 'Review'];
const GRADES = [6, 7, 8, 9, 10, 11, 12];

let nextTempId = 1;

interface DraftQuestion {
  tempId: number;
  questionType: QuestionType;
  points: number;
  bodyHtml: string;
  diagram: DiagramValue | null;
  options: string[];
  correctAnswer: string;
  hint: string;
  numericAcceptedValue: string;
  numericTolerance: string;
  numericUnit: string;
  numericSignificantFigures: string;
  shortAnswerKeywords: string;
  shortAnswerPassThreshold: string;
}

interface CsvImportResult {
  questions: DraftQuestion[];
  warnings: string[];
}

function newQuestion(type: QuestionType = 'ESSAY'): DraftQuestion {
  return {
    tempId: nextTempId++,
    questionType: type,
    points: 1,
    bodyHtml: '',
    diagram: null,
    options: type === 'MULTIPLE_CHOICE' ? ['', ''] : [],
    correctAnswer: '',
    hint: '',
    numericAcceptedValue: '',
    numericTolerance: '0.01',
    numericUnit: '',
    numericSignificantFigures: '',
    shortAnswerKeywords: '',
    shortAnswerPassThreshold: '0.7',
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function draftFromQuestion(question: Question): DraftQuestion {
  const config = asRecord(question.config);
  const numeric = asRecord(config.numeric);
  const shortAnswer = asRecord(config.shortAnswer);
  const options = Array.isArray(question.options)
    ? question.options.map(String)
    : [];

  return {
    ...newQuestion(question.questionType),
    bodyHtml: question.contentHtml || `<p>${escapeHtml(question.questionText)}</p>`,
    options:
      question.questionType === 'MULTIPLE_CHOICE'
        ? options.length
          ? options
          : ['', '']
        : options,
    correctAnswer: question.correctAnswer ?? '',
    points: question.points,
    hint: question.hint ?? '',
    numericAcceptedValue:
      numeric.acceptedValue !== undefined
        ? String(numeric.acceptedValue)
        : question.questionType === 'NUMERIC'
          ? question.correctAnswer ?? ''
          : '',
    numericTolerance:
      numeric.tolerance !== undefined ? String(numeric.tolerance) : '0.01',
    numericUnit: typeof numeric.unit === 'string' ? numeric.unit : '',
    numericSignificantFigures:
      numeric.significantFigures !== undefined
        ? String(numeric.significantFigures)
        : '',
    shortAnswerKeywords: Array.isArray(shortAnswer.keywords)
      ? shortAnswer.keywords.map(String).join(', ')
      : '',
    shortAnswerPassThreshold:
      shortAnswer.passThreshold !== undefined
        ? String(shortAnswer.passThreshold)
        : '0.7',
  };
}

function gradeValue(grade?: string): string {
  return grade?.match(/\d+/)?.[0] ?? '';
}

function dateInputValue(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = sanitizeRichHtml(html);
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function questionHasContent(question: DraftQuestion): boolean {
  return Boolean(htmlToPlainText(question.bodyHtml) || question.diagram);
}

function questionContent(question: DraftQuestion): string {
  return `${question.bodyHtml}${question.diagram ? buildDiagramHtml(question.diagram) : ''}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeQuestionType(rawType: string): { type: QuestionType; warning?: string } {
  const normalized = rawType.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const supported = QUESTION_TYPES.find((item) => item.value === normalized);
  if (supported) return { type: supported.value };

  return {
    type: 'ESSAY',
    warning: `${rawType || 'Blank question type'} was imported as Long response.`,
  };
}

function parseOptions(rawOptions: string): string[] {
  if (!rawOptions.trim()) return ['', ''];
  try {
    const parsed = JSON.parse(rawOptions);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Pipe-separated options remain convenient for spreadsheet authors.
  }
  return rawOptions.split('|').map((option) => option.trim()).filter(Boolean);
}

function importQuestionsFromCsv(text: string): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV must contain a header and at least one question.');

  const headers = rows[0].map((header) => header.toLowerCase().trim().replace(/\s+/g, '_'));
  const required = ['question_text', 'question_type'];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);

  const warnings: string[] = [];
  const questions = rows.slice(1).map((row, rowIndex) => {
    const value = (header: string) => row[headers.indexOf(header)]?.trim() ?? '';
    const questionText = value('question_text');
    if (!questionText) throw new Error(`Row ${rowIndex + 2}: question_text is required.`);

    const normalizedType = normalizeQuestionType(value('question_type'));
    if (normalizedType.warning) warnings.push(`Row ${rowIndex + 2}: ${normalizedType.warning}`);

    const pointsValue = Number(value('points'));
    const imageUrl = value('image_url');
    const safeImage = /^(https?:\/\/|\/uploads\/)/i.test(imageUrl)
      ? `<p><img src="${escapeHtml(imageUrl)}" alt="Question reference" /></p>`
      : '';
    if (imageUrl && !safeImage) {
      warnings.push(`Row ${rowIndex + 2}: image_url was skipped because it was not a valid web or upload URL.`);
    }

    let config: Record<string, unknown> = {};
    if (value('config')) {
      try {
        const parsed = JSON.parse(value('config'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          config = parsed as Record<string, unknown>;
        }
      } catch {
        throw new Error(`Row ${rowIndex + 2}: config must contain valid JSON.`);
      }
    }
    const numeric = config.numeric && typeof config.numeric === 'object'
      ? config.numeric as Record<string, unknown>
      : {};
    const shortAnswer = config.shortAnswer && typeof config.shortAnswer === 'object'
      ? config.shortAnswer as Record<string, unknown>
      : {};
    const importedKeywords = Array.isArray(shortAnswer.keywords)
      ? shortAnswer.keywords.map(String).join(', ')
      : '';

    return {
      ...newQuestion(normalizedType.type),
      bodyHtml: `<p>${escapeHtml(questionText)}</p>${safeImage}`,
      points: Number.isFinite(pointsValue) && pointsValue > 0 ? Math.round(pointsValue) : 1,
      options: normalizedType.type === 'MULTIPLE_CHOICE' ? parseOptions(value('options')) : [],
      correctAnswer: value('correct_answer'),
      hint: value('hint'),
      numericAcceptedValue: numeric.acceptedValue !== undefined
        ? String(numeric.acceptedValue)
        : normalizedType.type === 'NUMERIC'
          ? value('correct_answer')
          : '',
      numericTolerance: numeric.tolerance !== undefined ? String(numeric.tolerance) : '0.01',
      numericUnit: typeof numeric.unit === 'string' ? numeric.unit : '',
      numericSignificantFigures: numeric.significantFigures !== undefined
        ? String(numeric.significantFigures)
        : '',
      shortAnswerKeywords: importedKeywords,
      shortAnswerPassThreshold: shortAnswer.passThreshold !== undefined
        ? String(shortAnswer.passThreshold)
        : '0.7',
    };
  });

  return { questions, warnings };
}

export function EditAssignmentRich({
  target = 'school',
  returnTo = '/teacher',
}: {
  target?: 'school' | 'independent';
  returnTo?: string;
} = {}) {
  const { id } = useParams();
  const assignmentId = Number(id);
  const { data, isLoading, error } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => assignmentsApi.findOne(assignmentId),
    enabled: Number.isInteger(assignmentId) && assignmentId > 0,
  });

  if (!Number.isInteger(assignmentId) || assignmentId < 1) {
    return <EmptyState title="Invalid assignment" />;
  }
  if (isLoading) {
    return <EmptyState title="Loading assignment..." />;
  }
  if (error || !data) {
    return (
      <EmptyState
        title={apiErrorMessage(error, 'Could not load this assignment')}
      />
    );
  }

  return (
    <CreateAssignmentRich
      key={data.id}
      target={target}
      returnTo={returnTo}
      initialAssignment={data}
    />
  );
}

export function CreateAssignmentRich({
  target = 'school',
  returnTo = '/teacher',
  initialAssignment,
}: {
  target?: 'school' | 'independent';
  returnTo?: string;
  initialAssignment?: Assignment;
} = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(initialAssignment?.title ?? '');
  const [description, setDescription] = useState(initialAssignment?.description ?? '');
  const [subject, setSubject] = useState(initialAssignment?.subject ?? '');
  const [grade, setGrade] = useState(gradeValue(initialAssignment?.grade));
  const [dueDate, setDueDate] = useState(dateInputValue(initialAssignment?.dueDate));
  const [timeAllowedMinutes, setTimeAllowedMinutes] = useState(
    initialAssignment?.timeAllowedMinutes
      ? String(initialAssignment.timeAllowedMinutes)
      : '',
  );
  const [notifyParents, setNotifyParents] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    initialAssignment?.questions?.length
      ? initialAssignment.questions.map(draftFromQuestion)
      : [newQuestion()],
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState(questions[0].tempId);
  const [questionMode, setQuestionMode] = useState<'manual' | 'csv'>('manual');
  const [status, setStatus] = useState<string | null>(null);
  const isEditing = Boolean(initialAssignment);
  const hasStudentWork = Boolean(initialAssignment?._count?.submissions);
  const hasStructuredQuestions = Boolean(
    initialAssignment?.questions?.some(
      (question) =>
        question.sectionId !== null ||
        ['MATCHING', 'ORDERING'].includes(question.questionType),
    ),
  );
  const questionsLocked = hasStudentWork || hasStructuredQuestions;

  const totalPoints = useMemo(
    () => questions.reduce((total, question) => total + Math.max(0, question.points), 0),
    [questions],
  );
  const completeQuestions = useMemo(
    () => questions.filter(questionHasContent).length,
    [questions],
  );
  const selectedQuestion = questions.find((question) => question.tempId === selectedQuestionId) ?? questions[0];

  function updateQuestion(tempId: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question) => (
      question.tempId === tempId ? { ...question, ...patch } : question
    )));
  }

  function addQuestion(type: QuestionType = 'ESSAY') {
    const question = newQuestion(type);
    setQuestions((current) => [...current, question]);
    setSelectedQuestionId(question.tempId);
    setQuestionMode('manual');
  }

  function duplicateQuestion(tempId: number) {
    const source = questions.find((question) => question.tempId === tempId);
    if (!source) return;
    const copy = { ...source, tempId: nextTempId++, options: [...source.options] };
    const sourceIndex = questions.findIndex((question) => question.tempId === tempId);
    setQuestions((current) => [
      ...current.slice(0, sourceIndex + 1),
      copy,
      ...current.slice(sourceIndex + 1),
    ]);
    setSelectedQuestionId(copy.tempId);
  }

  function removeQuestion(tempId: number) {
    if (questions.length === 1) return;
    const index = questions.findIndex((question) => question.tempId === tempId);
    const remaining = questions.filter((question) => question.tempId !== tempId);
    setQuestions(remaining);
    setSelectedQuestionId(remaining[Math.min(index, remaining.length - 1)].tempId);
  }

  function moveQuestion(tempId: number, direction: -1 | 1) {
    const index = questions.findIndex((question) => question.tempId === tempId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= questions.length) return;
    setQuestions((current) => {
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  }

  function importCsv(result: CsvImportResult) {
    setQuestions(result.questions);
    setSelectedQuestionId(result.questions[0].tempId);
    setQuestionMode('manual');
    setStatus(result.warnings.length ? result.warnings.join(' ') : `${result.questions.length} questions imported.`);
  }

  function goToQuestions() {
    setStatus(null);
    if (!title.trim() || !subject.trim() || !grade) {
      setStatus('Add a title, subject, and grade before continuing.');
      return;
    }
    setStep(questionsLocked ? 2 : 1);
  }

  function goToReview() {
    setStatus(null);
    if (!questions.length || completeQuestions !== questions.length) {
      setStatus('Every question needs question text or a diagram before review.');
      return;
    }
    const invalidChoice = questions.find(
      (question) =>
        question.questionType === 'MULTIPLE_CHOICE' &&
        (question.options.filter((option) => option.trim()).length < 2 ||
          !question.correctAnswer.trim()),
    );
    if (invalidChoice) {
      setSelectedQuestionId(invalidChoice.tempId);
      setStatus('Multiple-choice questions need at least two options and a correct answer.');
      return;
    }
    const invalidNumeric = questions.find((question) => {
      if (question.questionType !== 'NUMERIC') return false;
      const acceptedValue = Number(question.numericAcceptedValue);
      const tolerance = Number(question.numericTolerance);
      const significantFigures = question.numericSignificantFigures
        ? Number(question.numericSignificantFigures)
        : null;
      return (
        !question.numericAcceptedValue.trim() ||
        !Number.isFinite(acceptedValue) ||
        !Number.isFinite(tolerance) ||
        tolerance < 0 ||
        (significantFigures !== null &&
          (!Number.isInteger(significantFigures) || significantFigures < 1))
      );
    });
    if (invalidNumeric) {
      setSelectedQuestionId(invalidNumeric.tempId);
      setQuestionMode('manual');
      setStatus('Numeric questions need a valid accepted value, non-negative tolerance, and valid significant figures.');
      return;
    }
    const invalidShortAnswer = questions.find(
      (question) => {
        if (question.questionType !== 'SHORT_ANSWER') return false;
        const passThreshold = Number(question.shortAnswerPassThreshold);
        return (
          !question.shortAnswerKeywords.split(',').some((keyword) => keyword.trim()) ||
          !Number.isFinite(passThreshold) ||
          passThreshold <= 0 ||
          passThreshold > 1
        );
      },
    );
    if (invalidShortAnswer) {
      setSelectedQuestionId(invalidShortAnswer.tempId);
      setQuestionMode('manual');
      setStatus('Short-answer questions need at least one grading keyword.');
      return;
    }
    setStep(2);
  }

  const createMutation = useMutation({
    mutationFn: (isPublished: boolean) => {
      const payloadQuestions: CreateQuestionInput[] = questions.map((question, index) => {
        const contentHtml = questionContent(question);
        const plainText = htmlToPlainText(question.bodyHtml) || 'Diagram-based question';
        const options = question.questionType === 'MULTIPLE_CHOICE'
          ? question.options.map((option) => option.trim()).filter(Boolean)
          : undefined;
        const config = question.questionType === 'NUMERIC'
          ? {
              numeric: {
                acceptedValue: Number(question.numericAcceptedValue),
                tolerance: Number(question.numericTolerance),
                unit: question.numericUnit.trim() || undefined,
                significantFigures: question.numericSignificantFigures
                  ? Number(question.numericSignificantFigures)
                  : undefined,
              },
            }
          : question.questionType === 'SHORT_ANSWER'
            ? {
                shortAnswer: {
                  keywords: question.shortAnswerKeywords
                    .split(',')
                    .map((keyword) => keyword.trim())
                    .filter(Boolean),
                  passThreshold: Number(question.shortAnswerPassThreshold) || 0.7,
                },
              }
            : undefined;
        const correctAnswer = question.questionType === 'NUMERIC'
          ? question.numericAcceptedValue.trim()
          : question.correctAnswer.trim();

        return {
          questionText: plainText,
          contentHtml,
          questionType: question.questionType,
          options,
          config,
          correctAnswer: correctAnswer || undefined,
          points: question.points,
          order: index,
          hint: question.hint.trim() || undefined,
        };
      });

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        subject: subject.trim(),
        grade: `Grade ${grade}`,
        dueDate: dueDate || undefined,
        maxPoints: totalPoints,
        timeAllowedMinutes: timeAllowedMinutes ? Number(timeAllowedMinutes) : undefined,
        isPublished,
        notifyParents:
          !isEditing && target === 'school' && isPublished
            ? notifyParents
            : false,
        questions: questionsLocked ? undefined : payloadQuestions,
      };

      if (initialAssignment) {
        return assignmentsApi.update(initialAssignment.id, payload);
      }

      const createAssignment = target === 'independent'
        ? assignmentsApi.createIndependent
        : assignmentsApi.create;
      return createAssignment(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['independent-assignments'] });
      if (initialAssignment) {
        queryClient.invalidateQueries({
          queryKey: ['assignment', initialAssignment.id],
        });
      }
      navigate(returnTo, { replace: true });
    },
    onError: (error) =>
      setStatus(
        apiErrorMessage(
          error,
          isEditing
            ? 'Could not update assignment'
            : 'Could not create assignment',
        ),
      ),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={target === 'independent' ? 'Platform Studio' : 'Teacher Workspace'}
        title={isEditing ? 'Edit assignment' : 'Create assignment'}
        actions={
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#101820]"
          >
            Exit
          </button>
        }
      />

      <AudienceBanner target={target} />
      {questionsLocked ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {hasStudentWork
            ? 'Student work exists for this assignment. You can update its details and publication status, but its questions are locked.'
            : 'This assignment uses structured questions. You can update its details and publication status without changing its question structure.'}
        </section>
      ) : null}
      <StepIndicator
        currentStep={step}
        onSelect={(nextStep) => {
          if (nextStep >= step || (questionsLocked && nextStep === 1)) return;
          setStep(nextStep);
        }}
      />

      {step === 0 ? (
        <SetupStep
          title={title}
          description={description}
          subject={subject}
          grade={grade}
          dueDate={dueDate}
          timeAllowedMinutes={timeAllowedMinutes}
          onTitle={setTitle}
          onDescription={setDescription}
          onSubject={setSubject}
          onGrade={setGrade}
          onDueDate={setDueDate}
          onTimeAllowed={setTimeAllowedMinutes}
        />
      ) : null}

      {step === 1 ? (
        <QuestionsStep
          questions={questions}
          selectedQuestion={selectedQuestion}
          mode={questionMode}
          onMode={setQuestionMode}
          onSelect={setSelectedQuestionId}
          onUpdate={updateQuestion}
          onAdd={addQuestion}
          onDuplicate={duplicateQuestion}
          onRemove={removeQuestion}
          onMove={moveQuestion}
          onImport={importCsv}
        />
      ) : null}

      {step === 2 ? (
        <ReviewStep
          target={target}
          title={title}
          description={description}
          subject={subject}
          grade={grade}
          dueDate={dueDate}
          timeAllowedMinutes={timeAllowedMinutes}
          totalPoints={totalPoints}
          questions={questions}
          notifyParents={notifyParents}
          onNotifyParents={setNotifyParents}
          showParentNotification={!isEditing}
        />
      ) : null}

      {status ? (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.includes('imported')
              ? 'border-lime-200 bg-lime-50 text-lime-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {status}
        </div>
      ) : null}

      <footer className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_50px_rgba(16,24,32,0.16)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 px-2 text-sm text-slate-500">
          <span><strong className="text-[#101820]">{questions.length}</strong> questions</span>
          <span><strong className="text-[#101820]">{totalPoints}</strong> marks</span>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setStatus(null);
                setStep((current) =>
                  questionsLocked && current === 2 ? 0 : current - 1,
                );
              }}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#101820]"
            >
              Back
            </button>
          ) : null}
          {step === 0 ? (
            <PrimaryButton onClick={goToQuestions}>
              {questionsLocked ? 'Review changes' : 'Continue to questions'}
            </PrimaryButton>
          ) : null}
          {step === 1 ? <PrimaryButton onClick={goToReview}>Review assignment</PrimaryButton> : null}
          {step === 2 ? (
            <>
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#101820] disabled:opacity-50"
              >
                Save draft
              </button>
              <PrimaryButton
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(true)}
              >
                {createMutation.isPending
                  ? isEditing
                    ? 'Saving...'
                    : 'Creating...'
                  : isEditing
                    ? 'Save and publish'
                    : target === 'independent'
                    ? 'Publish to independent learners'
                    : 'Publish assignment'}
              </PrimaryButton>
            </>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

function AudienceBanner({ target }: { target: 'school' | 'independent' }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[#101820] px-5 py-5 text-white sm:px-6">
      <div className="absolute -right-10 -top-20 h-44 w-44 rounded-full border-[28px] border-[#B5E61D]/20" />
      <div className="relative flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B5E61D] text-[#101820]">
          {target === 'independent' ? <LibraryIcon /> : <SchoolIcon />}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B5E61D]">Audience</p>
          <h2 className="mt-1 text-lg font-semibold">
            {target === 'independent' ? 'Independent learner library' : 'Students in your school'}
          </h2>
        </div>
      </div>
    </section>
  );
}

function StepIndicator({
  currentStep,
  onSelect,
}: {
  currentStep: number;
  onSelect: (step: number) => void;
}) {
  return (
    <nav aria-label="Assignment creation progress" className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {STEPS.map((label, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;
        return (
          <button
            key={label}
            type="button"
            disabled={!complete}
            onClick={() => onSelect(index)}
            className={`relative flex items-center justify-center gap-2 px-3 py-4 text-sm font-semibold ${
              active ? 'bg-[#101820] text-white' : complete ? 'text-[#101820]' : 'text-slate-400'
            }`}
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              active ? 'bg-[#B5E61D] text-[#101820]' : complete ? 'bg-lime-100 text-lime-800' : 'bg-slate-100'
            }`}>
              {complete ? <CheckIcon /> : index + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
            {active ? <span className="absolute inset-x-0 bottom-0 h-1 bg-[#B5E61D]" /> : null}
          </button>
        );
      })}
    </nav>
  );
}

function SetupStep({
  title,
  description,
  subject,
  grade,
  dueDate,
  timeAllowedMinutes,
  onTitle,
  onDescription,
  onSubject,
  onGrade,
  onDueDate,
  onTimeAllowed,
}: {
  title: string;
  description: string;
  subject: string;
  grade: string;
  dueDate: string;
  timeAllowedMinutes: string;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
  onSubject: (value: string) => void;
  onGrade: (value: string) => void;
  onDueDate: (value: string) => void;
  onTimeAllowed: (value: string) => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(16,24,32,0.05)] sm:p-7">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#101820]">Assignment setup</h2>
        <p className="mt-1 text-sm text-slate-500">Set the learning context and delivery details.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Assignment title" required className="sm:col-span-2">
          <input
            value={title}
            onChange={(event) => onTitle(event.target.value)}
            placeholder="e.g. Volume of Solids"
            className={inputClass}
          />
        </Field>
        <Field label="Subject" required>
          <input
            value={subject}
            onChange={(event) => onSubject(event.target.value)}
            placeholder="e.g. Mathematics"
            className={inputClass}
          />
        </Field>
        <Field label="Grade" required>
          <select value={grade} onChange={(event) => onGrade(event.target.value)} className={inputClass}>
            <option value="">Select grade</option>
            {GRADES.map((gradeOption) => (
              <option key={gradeOption} value={gradeOption}>Grade {gradeOption}</option>
            ))}
          </select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea
            value={description}
            onChange={(event) => onDescription(event.target.value)}
            rows={3}
            placeholder="Optional instructions or learning objective"
            className={inputClass}
          />
        </Field>
        <Field label="Due date">
          <input type="date" value={dueDate} onChange={(event) => onDueDate(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Time limit">
          <div className="relative">
            <input
              type="number"
              min="5"
              max="480"
              value={timeAllowedMinutes}
              onChange={(event) => onTimeAllowed(event.target.value)}
              placeholder="No limit"
              className={`${inputClass} pr-20`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-400">minutes</span>
          </div>
        </Field>
      </div>
    </section>
  );
}

function QuestionsStep({
  questions,
  selectedQuestion,
  mode,
  onMode,
  onSelect,
  onUpdate,
  onAdd,
  onDuplicate,
  onRemove,
  onMove,
  onImport,
}: {
  questions: DraftQuestion[];
  selectedQuestion: DraftQuestion;
  mode: 'manual' | 'csv';
  onMode: (mode: 'manual' | 'csv') => void;
  onSelect: (id: number) => void;
  onUpdate: (id: number, patch: Partial<DraftQuestion>) => void;
  onAdd: (type?: QuestionType) => void;
  onDuplicate: (id: number) => void;
  onRemove: (id: number) => void;
  onMove: (id: number, direction: -1 | 1) => void;
  onImport: (result: CsvImportResult) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex rounded-2xl border border-slate-200 bg-white p-1">
        <ModeButton active={mode === 'manual'} onClick={() => onMode('manual')}>Build questions</ModeButton>
        <ModeButton active={mode === 'csv'} onClick={() => onMode('csv')}>Import CSV</ModeButton>
      </div>

      {mode === 'csv' ? (
        <CsvImporter onImport={onImport} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="self-start rounded-[24px] border border-slate-200 bg-white p-3 lg:sticky lg:top-4">
            <div className="flex items-center justify-between px-2 py-2">
              <h2 className="text-sm font-semibold text-[#101820]">Questions</h2>
              <button
                type="button"
                onClick={() => onAdd()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B5E61D] text-[#101820]"
                aria-label="Add question"
              >
                <PlusIcon />
              </button>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
              {questions.map((question, index) => {
                const selected = question.tempId === selectedQuestion.tempId;
                return (
                  <button
                    key={question.tempId}
                    type="button"
                    onClick={() => onSelect(question.tempId)}
                    className={`flex min-w-[150px] items-center gap-3 rounded-xl px-3 py-3 text-left transition lg:w-full ${
                      selected ? 'bg-[#101820] text-white' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      selected ? 'bg-[#B5E61D] text-[#101820]' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">
                        {htmlToPlainText(question.bodyHtml) || 'Untitled question'}
                      </span>
                      <span className={`mt-0.5 block text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {question.points} {question.points === 1 ? 'mark' : 'marks'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <QuestionEditor
            question={selectedQuestion}
            index={questions.findIndex((question) => question.tempId === selectedQuestion.tempId)}
            questionCount={questions.length}
            onUpdate={(patch) => onUpdate(selectedQuestion.tempId, patch)}
            onDuplicate={() => onDuplicate(selectedQuestion.tempId)}
            onRemove={() => onRemove(selectedQuestion.tempId)}
            onMove={(direction) => onMove(selectedQuestion.tempId, direction)}
          />
        </div>
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  questionCount,
  onUpdate,
  onDuplicate,
  onRemove,
  onMove,
}: {
  question: DraftQuestion;
  index: number;
  questionCount: number;
  onUpdate: (patch: Partial<DraftQuestion>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const typeDetails = QUESTION_TYPES.find((item) => item.value === question.questionType)!;

  function changeType(questionType: QuestionType) {
    onUpdate({
      questionType,
      options: questionType === 'MULTIPLE_CHOICE' && !question.options.length ? ['', ''] : question.options,
      correctAnswer: ['ESSAY', 'FILE_UPLOAD'].includes(questionType) ? '' : question.correctAnswer,
    });
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(16,24,32,0.05)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Question {index + 1}</p>
          <h2 className="mt-1 text-lg font-semibold text-[#101820]">{typeDetails.label}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(-1)}><UpIcon /></IconButton>
          <IconButton label="Move down" disabled={index === questionCount - 1} onClick={() => onMove(1)}><DownIcon /></IconButton>
          <IconButton label="Duplicate" onClick={onDuplicate}><CopyIcon /></IconButton>
          <IconButton label="Delete" disabled={questionCount === 1} danger onClick={onRemove}><TrashIcon /></IconButton>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_130px]">
        <Field label="Question type">
          <select
            value={question.questionType}
            onChange={(event) => changeType(event.target.value as QuestionType)}
            className={inputClass}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-400">{typeDetails.description}</p>
        </Field>
        <Field label="Marks">
          <input
            type="number"
            min="1"
            max="1000"
            value={question.points}
            onChange={(event) => onUpdate({ points: Math.max(1, Number(event.target.value) || 1) })}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-5 space-y-5">
        <Field label="Question content" required>
          <RichTextEditor
            value={question.bodyHtml}
            onChange={(bodyHtml) => onUpdate({ bodyHtml })}
            placeholder="Write the question. Use the toolbar for equations, images, and formatting."
          />
        </Field>

        <DiagramLabeler value={question.diagram} onChange={(diagram) => onUpdate({ diagram })} />

        {question.questionType === 'MULTIPLE_CHOICE' ? (
          <OptionEditor
            options={question.options}
            correctAnswer={question.correctAnswer}
            onChange={(options, correctAnswer) => onUpdate({ options, correctAnswer })}
          />
        ) : null}

        {question.questionType === 'TRUE_FALSE' ? (
          <Field label="Correct answer">
            <div className="grid grid-cols-2 gap-3">
              {['true', 'false'].map((answer) => (
                <button
                  key={answer}
                  type="button"
                  onClick={() => onUpdate({ correctAnswer: answer })}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold capitalize ${
                    question.correctAnswer === answer
                      ? 'border-[#B5E61D] bg-[#F8FDEB] text-[#101820]'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {answer}
                </button>
              ))}
            </div>
          </Field>
        ) : null}

        {question.questionType === 'NUMERIC' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accepted value" required>
              <input
                type="number"
                step="any"
                value={question.numericAcceptedValue}
                onChange={(event) => onUpdate({ numericAcceptedValue: event.target.value })}
                placeholder="e.g. 2.73"
                className={inputClass}
              />
            </Field>
            <Field label="Tolerance" required>
              <input
                type="number"
                min="0"
                step="any"
                value={question.numericTolerance}
                onChange={(event) => onUpdate({ numericTolerance: event.target.value })}
                placeholder="e.g. 0.01"
                className={inputClass}
              />
            </Field>
            <Field label="Required unit">
              <input
                value={question.numericUnit}
                onChange={(event) => onUpdate({ numericUnit: event.target.value })}
                placeholder="e.g. cm"
                className={inputClass}
              />
            </Field>
            <Field label="Significant figures">
              <input
                type="number"
                min="1"
                step="1"
                value={question.numericSignificantFigures}
                onChange={(event) => onUpdate({ numericSignificantFigures: event.target.value })}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}

        {question.questionType === 'SHORT_ANSWER' ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <Field label="Grading keywords" required>
              <input
                value={question.shortAnswerKeywords}
                onChange={(event) => onUpdate({ shortAnswerKeywords: event.target.value })}
                placeholder="e.g. photosynthesis, chlorophyll, sunlight"
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-slate-400">Separate key concepts with commas.</p>
            </Field>
            <Field label="Pass threshold">
              <select
                value={question.shortAnswerPassThreshold}
                onChange={(event) => onUpdate({ shortAnswerPassThreshold: event.target.value })}
                className={inputClass}
              >
                <option value="0.5">50%</option>
                <option value="0.6">60%</option>
                <option value="0.7">70%</option>
                <option value="0.8">80%</option>
                <option value="1">100%</option>
              </select>
            </Field>
          </div>
        ) : null}

        {['FILL_BLANK', 'MATCHING', 'ORDERING'].includes(question.questionType) ? (
          <Field label={question.questionType === 'FILL_BLANK' ? 'Correct answer' : 'Expected answer'}>
            <input
              value={question.correctAnswer}
              onChange={(event) => onUpdate({ correctAnswer: event.target.value })}
              placeholder={question.questionType === 'FILL_BLANK' ? 'Enter the accepted answer' : 'Enter the expected structured response'}
              className={inputClass}
            />
          </Field>
        ) : null}

        <Field label="Hint">
          <input
            value={question.hint}
            onChange={(event) => onUpdate({ hint: event.target.value })}
            placeholder="Optional support for the learner"
            className={inputClass}
          />
        </Field>
      </div>
    </section>
  );
}

function OptionEditor({
  options,
  correctAnswer,
  onChange,
}: {
  options: string[];
  correctAnswer: string;
  onChange: (options: string[], correctAnswer: string) => void;
}) {
  function updateOption(index: number, value: string) {
    const next = [...options];
    const previous = next[index];
    next[index] = value;
    onChange(next, correctAnswer === previous ? value : correctAnswer);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    const removed = options[index];
    onChange(options.filter((_, optionIndex) => optionIndex !== index), correctAnswer === removed ? '' : correctAnswer);
  }

  return (
    <Field label="Answer options" required>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2">
            <button
              type="button"
              onClick={() => onChange(options, option)}
              disabled={!option.trim()}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold ${
                correctAnswer === option && option
                  ? 'border-[#B5E61D] bg-[#B5E61D] text-[#101820]'
                  : 'border-slate-200 text-slate-400'
              }`}
              aria-label={`Mark option ${index + 1} as correct`}
            >
              {String.fromCharCode(65 + index)}
            </button>
            <input
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              placeholder={`Option ${index + 1}`}
              className="min-w-0 flex-1 border-0 px-1 py-2 text-sm text-[#101820] outline-none"
            />
            <button
              type="button"
              onClick={() => removeOption(index)}
              disabled={options.length <= 2}
              className="px-2 text-xs font-semibold text-slate-400 hover:text-red-600 disabled:opacity-30"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...options, ''], correctAnswer)}
        className="mt-3 text-sm font-semibold text-[#476400]"
      >
        Add option
      </button>
      <p className="mt-2 text-xs text-slate-400">Select the letter beside the correct option.</p>
    </Field>
  );
}

function CsvImporter({ onImport }: { onImport: (result: CsvImportResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Select a CSV file.');
      return;
    }
    try {
      const result = importQuestionsFromCsv(await file.text());
      setFileName(file.name);
      onImport(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read the CSV file.');
    }
  }

  function downloadTemplate() {
    const csv = [
      'subject,grade,topic,question_type,question_text,points,correct_answer,options,config,image_url,hint',
      'Mathematics,11,Volume of Solids,NUMERIC,"Enter the radius of the sphere to 3 significant figures.",3,2.73,,"{""numeric"":{""acceptedValue"":2.73,""tolerance"":0.01,""unit"":""cm"",""significantFigures"":3}}",,"Use the volume formula"',
      'Biology,10,Photosynthesis,SHORT_ANSWER,"State what plants require for photosynthesis.",3,,,"{""shortAnswer"":{""keywords"":[""sunlight"",""chlorophyll"",""carbon dioxide""],""passThreshold"":0.7}}",,',
      'Mathematics,11,Volume of Solids,MULTIPLE_CHOICE,"Which unit measures volume?",1,cm3,"cm|cm2|cm3|kg",,,,',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'assignment-question-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(16,24,32,0.05)] sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#101820]">Import questions</h2>
          <p className="mt-1 text-sm text-slate-500">Review imported questions in the builder before publishing.</p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#101820]"
        >
          Download CSV template
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className="mt-6 flex w-full flex-col items-center rounded-[24px] border-2 border-dashed border-slate-300 bg-[#F8FAFC] px-6 py-12 text-center transition hover:border-[#B5E61D]"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]"><UploadIcon /></span>
        <span className="mt-4 text-sm font-semibold text-[#101820]">Choose a CSV or drop it here</span>
        <span className="mt-1 text-xs text-slate-400">Existing questions are replaced after a valid import</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = '';
        }}
      />
      {fileName ? <p className="mt-3 text-sm font-medium text-lime-800">Imported {fileName}</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
    </section>
  );
}

function ReviewStep({
  target,
  title,
  description,
  subject,
  grade,
  dueDate,
  timeAllowedMinutes,
  totalPoints,
  questions,
  notifyParents,
  onNotifyParents,
  showParentNotification,
}: {
  target: 'school' | 'independent';
  title: string;
  description: string;
  subject: string;
  grade: string;
  dueDate: string;
  timeAllowedMinutes: string;
  totalPoints: number;
  questions: DraftQuestion[];
  notifyParents: boolean;
  onNotifyParents: (value: boolean) => void;
  showParentNotification: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(16,24,32,0.05)]">
        <div className="bg-[#101820] px-5 py-6 text-white sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B5E61D]">{subject} / Grade {grade}</p>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p> : null}
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          <ReviewMetric label="Questions" value={questions.length} />
          <ReviewMetric label="Marks" value={totalPoints} />
          <ReviewMetric label="Time" value={timeAllowedMinutes ? `${timeAllowedMinutes} min` : 'No limit'} />
          <ReviewMetric label="Due" value={dueDate ? new Date(`${dueDate}T00:00:00`).toLocaleDateString() : 'No date'} />
        </div>
      </section>

      {target === 'school' && showParentNotification ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input
            type="checkbox"
            checked={notifyParents}
            onChange={(event) => onNotifyParents(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold text-[#101820]">Notify parents when published</span>
            <span className="mt-1 block text-xs text-slate-500">SMS is sent only to parents on file for this grade.</span>
          </span>
        </label>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#101820]">Student preview</h2>
        {questions.map((question, index) => (
          <article key={question.tempId} className="rounded-[24px] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Question {index + 1}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {question.points} {question.points === 1 ? 'mark' : 'marks'}
              </span>
            </div>
            <div className="mt-4"><RichContent html={questionContent(question)} /></div>
            {question.questionType === 'MULTIPLE_CHOICE' ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {question.options.filter(Boolean).map((option, optionIndex) => (
                  <div key={`${option}-${optionIndex}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-[#101820] outline-none transition focus:border-[#101820] focus:ring-2 focus:ring-[#B5E61D]/30';

function Field({
  label,
  required,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}{required ? <span className="ml-1 text-lime-700">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl bg-[#B5E61D] px-5 py-2.5 text-sm font-semibold text-[#101820] transition hover:bg-[#A8D517] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active ? 'bg-[#101820] text-white' : 'text-slate-500 hover:text-[#101820]'
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:opacity-30 ${
        danger
          ? 'border-red-100 text-red-500 hover:bg-red-50'
          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-[#101820]'
      }`}
    >
      {children}
    </button>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-[#101820]">{value}</p>
    </div>
  );
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SchoolIcon() {
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10 12 5l9 5-9 5-9-5Z" /><path d="M7 12.5V17c3 2 7 2 10 0v-4.5M21 10v6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function LibraryIcon() {
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></svg>;
}

function UploadIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function UpIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DownIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5m4-5v5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
