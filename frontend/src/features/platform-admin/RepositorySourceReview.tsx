import type { RepositorySourceAudit } from "../../api/github-curriculum.api";
export function RepositorySourceReview({
  source,
  acknowledged,
  onAcknowledge,
}: {
  source?: RepositorySourceAudit;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
}) {
  if (!source) return null;
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <h4 className="font-semibold">
        KICD design transcription · {source.revision}
      </h4>
      <p className="break-words text-xs leading-6 text-slate-500">
        {source.path} · Git revision {source.commit.slice(0, 8)}. This
        third-party transcription has not been certified as the current official
        edition.
      </p>
      <div className="flex flex-wrap gap-4 text-xs text-blue-700 underline">
        <a target="_blank" rel="noreferrer" href={source.sourceUrl}>
          View pinned source
        </a>
        <a target="_blank" rel="noreferrer" href={source.officialDirectory}>
          Compare with KICD
        </a>
      </div>
      <p className="text-xs leading-6">
        {source.coverage.extractedSubstrands} distinct sub-strand IDs extracted.{" "}
        {source.comparisons.length
          ? `${source.comparisons.reduce((n, c) => Math.max(n, c.matchedQuotes), 0)} outcome quotes matched available indexed KICD text; this is not a full-edition certification.`
          : "No indexed official copy was available for automatic text comparison."}
      </p>
      {source.validationMode === "PINNED_SOURCE_AUTOMATED" && (
        <p className="text-xs leading-6 text-blue-700">
          Automatically validated against the pinned source. Known limitations
          were accepted during grade preparation; this is not a certification of
          full syllabus coverage.
        </p>
      )}
      {!!source.coverage.warnings.length &&
        source.validationMode !== "PINNED_SOURCE_AUTOMATED" && (
          <div className="space-y-3 border-t pt-3">
            <ul className="list-disc space-y-2 pl-4 text-xs leading-6 text-amber-800">
              {source.coverage.warnings.slice(0, 8).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <label className="flex items-start gap-3 text-xs leading-6">
              <input
                aria-label="Source limitations reviewed"
                className="mt-1"
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => onAcknowledge(e.target.checked)}
              />
              I reviewed the source gaps. Index only the available outcomes;
              this does not complete the syllabus.
            </label>
          </div>
        )}
    </section>
  );
}
