import { ChevronDown } from "lucide-react";
import { learningTitle } from "./assignment-presentation";
export function LearningTitle({
  value,
  subject = "",
  as: Heading = "h3",
  className = "",
}: {
  value: string;
  subject?: string;
  as?: "h2" | "h3";
  className?: string;
}) {
  const view = learningTitle(value, subject);
  return (
    <div className={`min-w-0 ${className}`}>
      {view.strand && (
        <p className="mb-1 line-clamp-1 text-[11px] font-medium text-slate-500">
          {view.strand}
        </p>
      )}
      <Heading
        className="line-clamp-2 break-words text-base font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere]"
        title={view.title}
      >
        {view.title}
      </Heading>
      {(view.code || view.batch || view.coverage.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {view.code && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">
              Topic {view.code}
            </span>
          )}
          {view.coverage.length > 0 && (
            <span>
              {view.coverage.length} focus{" "}
              {view.coverage.length === 1 ? "area" : "areas"}
            </span>
          )}
          {view.batch && (
            <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-medium">
              Batch {view.batch}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
export function FullLearningTitle({
  value,
  subject = "",
}: {
  value: string;
  subject?: string;
}) {
  const view = learningTitle(value, subject);
  if (view.full === view.title && view.title.length < 85) return null;
  return (
    <details className="group mt-2 text-xs text-slate-500">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded font-medium marker:hidden hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400">
        View full title & coverage{" "}
        <ChevronDown
          size={13}
          aria-hidden="true"
          className="transition group-open:rotate-180"
        />
      </summary>
      <p className="mt-1 max-w-3xl break-words rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600 [overflow-wrap:anywhere]">
        {view.full}
      </p>
    </details>
  );
}
