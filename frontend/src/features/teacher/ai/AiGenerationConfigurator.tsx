import { useState } from 'react';
import type { AiQuestionType, AiTopic } from '../../../api/ai-content.api';

const QUESTION_TYPES: { value: AiQuestionType; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
  { value: 'TRUE_FALSE', label: 'True or false' },
  { value: 'NUMERIC', label: 'Numeric' },
  { value: 'SHORT_ANSWER', label: 'Short answer' },
  { value: 'ESSAY', label: 'Essay' },
];

export interface AiGenerationOptions {
  topicId: string;
  subtopicIds: string[];
  questionCount: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  questionTypes: AiQuestionType[];
}

export function AiGenerationConfigurator({
  topic,
  isGenerating,
  onGenerate,
}: {
  topic: AiTopic;
  isGenerating: boolean;
  onGenerate: (options: AiGenerationOptions) => void;
}) {
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<AiGenerationOptions['difficulty']>('MIXED');
  const [questionTypes, setQuestionTypes] = useState<AiQuestionType[]>(['MULTIPLE_CHOICE', 'SHORT_ANSWER']);
  const [subtopicIds, setSubtopicIds] = useState<string[]>([]);

  function toggleQuestionType(type: AiQuestionType) {
    setQuestionTypes((current) =>
      current.includes(type) ? current.filter((entry) => entry !== type) : [...current, type],
    );
  }

  function toggleSubtopic(id: string) {
    setSubtopicIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(16,24,32,0.05)]">
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Selected topic</p>
          <h2 className="mt-1 text-xl font-semibold text-[#101820]">{topic.name}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {topic.subject} · {topic.grade ?? 'Grade not specified'}
        </span>
      </div>

      {topic.subtopics.length ? (
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Subtopics
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {topic.subtopics.map((subtopic) => (
              <button
                type="button"
                key={subtopic.id}
                onClick={() => toggleSubtopic(subtopic.id)}
                className={`min-h-10 rounded-xl border px-3 text-sm font-medium ${
                  subtopicIds.includes(subtopic.id)
                    ? 'border-[#101820] bg-[#101820] text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {subtopic.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Leave unselected to use the complete topic.</p>
        </fieldset>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Questions: {questionCount}
          </span>
          <input
            type="range"
            min={5}
            max={20}
            value={questionCount}
            onChange={(event) => setQuestionCount(Number(event.target.value))}
            className="mt-4 w-full accent-[#101820]"
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as AiGenerationOptions['difficulty'])}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="MIXED">Mixed</option>
          </select>
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Question types</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUESTION_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-[#101820]"
            >
              <input
                type="checkbox"
                checked={questionTypes.includes(type.value)}
                onChange={() => toggleQuestionType(type.value)}
                className="h-4 w-4 accent-[#101820]"
              />
              {type.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={isGenerating || questionTypes.length === 0}
        onClick={() =>
          onGenerate({
            topicId: topic.id,
            subtopicIds,
            questionCount,
            difficulty,
            questionTypes,
          })
        }
        className="mt-6 min-h-11 w-full rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isGenerating ? 'Generating assignment...' : 'Generate assignment'}
      </button>
    </section>
  );
}
