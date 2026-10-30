import type { RecallContent } from "../../api/content-library.api";
export function RecallStudyNotes({ content }: { content: RecallContent }) {
  return (
    <details
      className="rounded-xl border border-slate-200 bg-white p-5"
      data-recall-study-notes
    >
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        Study notes
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm font-semibold leading-6">{content.cue}</p>
        <p className="recall-brand-memory rounded-lg border-l-4 p-4 text-sm font-semibold">
          {content.mnemonic}
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          {content.facts.map((fact, i) => (
            <div key={i} className="text-sm leading-6">
              <dt className="font-semibold">{fact.label}</dt>
              <dd className="mt-1 text-slate-600">{fact.meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm leading-7 text-slate-600">
          {content.explanation}
        </p>
        {content.visual?.labels && (
          <dl className="space-y-3 border-t pt-4">
            {content.visual.labels.map((part, i) => (
              <div key={i} className="text-sm leading-6">
                <dt className="font-semibold">{part.label}</dt>
                <dd className="text-slate-600">{part.detail}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </details>
  );
}
