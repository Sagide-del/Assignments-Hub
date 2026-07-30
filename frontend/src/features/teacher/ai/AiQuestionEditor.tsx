import { RichTextEditor } from '../../../components/ui/RichTextEditor';
import type { AiGeneratedQuestion, AiQuestionType } from '../../../api/ai-content.api';

const TYPES: { value: AiQuestionType; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
  { value: 'TRUE_FALSE', label: 'True or false' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'SHORT_ANSWER', label: 'Short answer' },
  { value: 'ESSAY', label: 'Essay' },
];

function textFromHtml(html: string) {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element.textContent?.trim() || 'Question';
}

export function AiQuestionEditor({
  question,
  index,
  disabled,
  onChange,
}: {
  question: AiGeneratedQuestion;
  index: number;
  disabled: boolean;
  onChange: (question: AiGeneratedQuestion) => void;
}) {
  function update<K extends keyof AiGeneratedQuestion>(key: K, value: AiGeneratedQuestion[K]) {
    onChange({ ...question, [key]: value });
  }

  function changeType(questionType: AiQuestionType) {
    onChange({
      ...question,
      questionType,
      options:
        questionType === 'MULTIPLE_CHOICE'
          ? question.options?.length === 4
            ? question.options
            : ['', '', '', '']
          : undefined,
      correctAnswer: questionType === 'TRUE_FALSE' ? 'true' : question.correctAnswer,
    });
  }

  const answerControl =
    question.questionType === 'TRUE_FALSE' ? (
      <select
        disabled={disabled}
        value={question.correctAnswer.toLowerCase()}
        onChange={(event) => update('correctAnswer', event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-50"
      >
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    ) : (
      <textarea
        disabled={disabled}
        value={question.correctAnswer}
        onChange={(event) => update('correctAnswer', event.target.value)}
        rows={2}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
      />
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-[#101820] px-2 text-sm font-semibold text-white">
          {index + 1}
        </span>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <select
            disabled={disabled}
            value={question.questionType}
            onChange={(event) => changeType(event.target.value as AiQuestionType)}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold disabled:bg-slate-50"
          >
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold">
            Marks
            <input
              disabled={disabled}
              type="number"
              min={1}
              max={1000}
              value={question.points}
              onChange={(event) => update('points', Math.max(1, Number(event.target.value) || 1))}
              className="w-14 bg-transparent text-right outline-none"
            />
          </label>
        </div>
      </div>

      <div className="mt-4">
        {disabled ? (
          <div
            className="rich-content rounded-xl bg-slate-50 p-4 text-sm leading-7 text-[#101820]"
            dangerouslySetInnerHTML={{ __html: question.contentHtml || question.questionText }}
          />
        ) : (
          <RichTextEditor
            value={question.contentHtml || question.questionText}
            onChange={(contentHtml) =>
              onChange({
                ...question,
                contentHtml,
                questionText: textFromHtml(contentHtml),
              })
            }
            placeholder="Write the question"
          />
        )}
      </div>

      {question.questionType === 'MULTIPLE_CHOICE' ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(question.options ?? ['', '', '', '']).map((option, optionIndex) => (
            <label key={optionIndex} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-xs font-semibold text-slate-400">{String.fromCharCode(65 + optionIndex)}</span>
              <input
                disabled={disabled}
                value={option}
                onChange={(event) => {
                  const options = [...(question.options ?? ['', '', '', ''])];
                  options[optionIndex] = event.target.value;
                  update('options', options);
                }}
                className="min-h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Correct answer</span>
          <div className="mt-2">{answerControl}</div>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Explanation</span>
          <textarea
            disabled={disabled}
            value={question.explanation}
            onChange={(event) => update('explanation', event.target.value)}
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </label>
      </div>
    </article>
  );
}
