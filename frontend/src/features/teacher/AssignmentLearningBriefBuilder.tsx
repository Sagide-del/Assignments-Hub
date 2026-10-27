import { useState } from 'react';
import {
  BRIEF_MARKER,
  formatAssignmentBrief,
  type AssignmentBrief,
} from '../student/curriculum/assignment-brief';
export function AssignmentLearningBriefBuilder({
  description,
  onDescription,
}: {
  description: string;
  onDescription: (value: string) => void;
}) {
  const [brief, setBrief] = useState<AssignmentBrief>({
    outcome: '',
    evidence: '',
    criteria: [],
    connection: '',
    support: '',
    feedback: '',
  });
  const [status, setStatus] = useState('');
  const existing = description.includes(BRIEF_MARKER);
  function insert() {
    onDescription(
      [description.trim(), formatAssignmentBrief(brief)]
        .filter(Boolean)
        .join('\n\n'),
    );
    setStatus(
      'Learning brief added to the description. Review and edit it before publishing.',
    );
  }
  return (
    <details className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-teal-900">
        Build an outcome-based learning brief
      </summary>
      <p className="mt-3 text-xs leading-6 text-slate-600">
        Teacher-authored planning using KICD’s 2017 framework: an observable
        outcome, evidence, criteria, feedback and support. Check the current
        subject design for this grade; do not treat a framework-level example as
        an official syllabus outcome.
      </p>
      <div className="mt-4 space-y-3">
        {(
          [
            [
              'outcome',
              'By the end, the learner can…',
              'Use an observable verb: compare, calculate, explain, design…',
            ],
            [
              'evidence',
              'What will the learner produce or demonstrate?',
              'Worked solutions, a labelled diagram, an investigation record…',
            ],
            [
              'connection',
              'Real-life application (optional)',
              'Where could this learning be useful?',
            ],
            [
              'support',
              'Access and support (optional)',
              'Agreed format, language support, equipment or supervision…',
            ],
            [
              'feedback',
              'Feedback and next step (optional)',
              'How will feedback guide a correction or another attempt?',
            ],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key} className="block text-sm">
            {label}
            <textarea
              rows={2}
              value={brief[key]}
              onChange={(e) =>
                setBrief((b) => ({
                  ...b,
                  [key]: e.target.value.replace(/\n/g, ' '),
                }))
              }
              placeholder={placeholder}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            />
          </label>
        ))}
        <label className="block text-sm">
          Success criteria (one per line)
          <textarea
            rows={3}
            value={brief.criteria.join('\n')}
            onChange={(e) =>
              setBrief((b) => ({ ...b, criteria: e.target.value.split('\n') }))
            }
            placeholder={
              'Use the correct method.\nLabel quantities and units.\nExplain the result using evidence.'
            }
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
          />
        </label>
      </div>
      {existing && (
        <p className="mt-3 text-xs text-amber-900">
          A learning brief is already in the description. Edit that text
          directly to preserve the existing task.
        </p>
      )}
      <button
        type="button"
        onClick={insert}
        disabled={
          existing ||
          !brief.outcome.trim() ||
          !brief.evidence.trim() ||
          !brief.criteria.some((c) => c.trim())
        }
        className="mt-4 min-h-11 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-40"
      >
        Add brief to assignment description
      </button>
      {status && (
        <p role="status" className="mt-3 text-xs text-teal-900">
          {status}
        </p>
      )}
    </details>
  );
}
