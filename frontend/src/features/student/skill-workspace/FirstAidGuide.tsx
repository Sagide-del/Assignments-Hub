import { useState } from 'react';
import { CircleAlert, Eye, Lightbulb, MessageCircle, ShieldCheck, XCircle } from 'lucide-react';
import type { FirstAidGuide as Guide, FirstAidScenario } from './content/types';

export function FirstAidGuide({ guide }: { guide: Guide }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#101820]">Understand the situation</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{guide.summary}</p>
        <h4 className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#101820]">
          <Eye className="h-4 w-4 text-[#607D00]" aria-hidden="true" />
          What to recognise
        </h4>
        <ul className="mt-3 space-y-3">
          {guide.recognise.map((text) => (
            <li key={text} className="flex items-start gap-3 text-sm leading-7 text-slate-600">
              <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8AAF12]" />
              {text}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold text-[#101820]">
          <ShieldCheck className="h-5 w-5 text-[#607D00]" aria-hidden="true" />
          What to do, and why
        </h3>
        <ol className="mt-5 space-y-5">
          {guide.actions.map((step, index) => (
            <li key={step.title} className="relative flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#101820] text-xs font-bold text-white">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <h4 className="font-semibold leading-7 text-[#101820]">{step.title}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.text}</p>
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#F3F7EA] p-3">
                  <Lightbulb className="mt-1 h-3.5 w-3.5 shrink-0 text-[#607D00]" aria-hidden="true" />
                  <p className="text-xs leading-6 text-slate-600">
                    <strong className="font-semibold text-[#466000]">Why this matters: </strong>
                    {step.why}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="flex items-center gap-2 font-semibold text-amber-950">
          <XCircle className="h-5 w-5" aria-hidden="true" />
          What not to do
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-amber-950">
          {guide.avoid.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <h3 className="flex items-center gap-2 font-semibold text-rose-950">
          <CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
          When to get urgent help
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-rose-950">
          {guide.urgent.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <p className="mt-4 border-t border-rose-200 pt-3 text-xs font-semibold leading-6 text-rose-950">
          Kenya: call 999 or 112 for a life-threatening emergency. Follow the dispatcher’s instructions.
        </p>
      </section>
      <section className="rounded-2xl bg-[#101820] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-white">Keep this in mind</p>
        <p className="mt-3 text-sm font-medium leading-7 text-white">{guide.remember}</p>
      </section>
    </div>
  );
}

export function FirstAidScenarios({
  scenarios,
  onResult,
}: {
  scenarios: FirstAidScenario[];
  onResult: (id: string, passed: boolean) => void;
}) {
  return (
    <section
      aria-label="First aid scenario practice"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h3 className="flex items-center gap-2 font-semibold text-[#101820]">
        <MessageCircle className="h-5 w-5 text-[#607D00]" aria-hidden="true" />
        Make the next decision
      </h3>
      <p className="text-sm leading-7 text-slate-600">
        Apply the guidance to both situations. Check your decision and read the reason before completing the
        lesson.
      </p>
      {scenarios.map((scenario, index) => (
        <Scenario key={scenario.id} scenario={scenario} index={index} onResult={onResult} />
      ))}
    </section>
  );
}
function Scenario({
  scenario,
  index,
  onResult,
}: {
  scenario: FirstAidScenario;
  index: number;
  onResult: (id: string, passed: boolean) => void;
}) {
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = answer === scenario.answer;
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#607D00]">Situation {index + 1}</p>
      <h4 className="mt-2 font-semibold text-[#101820]">{scenario.title}</h4>
      <p className="mt-2 text-sm leading-7 text-slate-600">{scenario.situation}</p>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold leading-7 text-slate-700">{scenario.question}</legend>
        <div className="mt-3 space-y-2">
          {scenario.options.map((option, i) => (
            <label
              key={option}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-7 ${answer === i ? 'border-lime-400 bg-lime-50' : 'border-slate-200'}`}
            >
              <input
                type="radio"
                name={scenario.id}
                value={i}
                checked={answer === i}
                onChange={() => {
                  setAnswer(i);
                  setChecked(false);
                  onResult(scenario.id, false);
                }}
                className="mt-1 h-5 w-5 shrink-0 accent-[#607D00]"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        disabled={answer === null}
        onClick={() => {
          setChecked(true);
          onResult(scenario.id, correct);
        }}
        className="mt-4 min-h-11 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#607D00] disabled:opacity-40"
      >
        Check decision<span className="sr-only"> for {scenario.title}</span>
      </button>
      {checked ? (
        <div
          role="status"
          className={`mt-3 rounded-xl p-3 text-sm leading-7 ${correct ? 'bg-lime-50 text-[#466000]' : 'bg-amber-50 text-amber-950'}`}
        >
          <p className="font-semibold">{correct ? 'A good decision.' : 'Revisit this decision.'}</p>
          <p>{scenario.explanation}</p>
        </div>
      ) : null}
    </article>
  );
}
