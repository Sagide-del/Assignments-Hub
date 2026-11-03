import katex from "katex";
import "katex/dist/katex.min.css";
import { cmsLearningContent } from "../../services/cms-content";
import { RichContent } from "../../components/ui/RichContent";
export function CmsTheory({ content }: { content: unknown }) {
  const view = cmsLearningContent(content);
  return (
    <>
      {view.partial && (
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
          Practice Set (Partial)
        </span>
      )}
      {view.theory && (
        <details className="rounded-lg border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            Theory
          </summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {view.theory}
          </p>
          {view.equations.map((equation, index) => (
            <RichContent
              key={index}
              html={katex.renderToString(equation, {
                throwOnError: false,
                trust: false,
                strict: "ignore",
                maxExpand: 1000,
              })}
            />
          ))}
        </details>
      )}
    </>
  );
}
