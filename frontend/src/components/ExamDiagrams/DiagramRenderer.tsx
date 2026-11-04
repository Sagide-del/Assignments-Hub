import { validateIllustration } from "./blueprint";
import { CircuitDiagram } from "./CircuitDiagram";
import { FractionalDistillation } from "./FractionalDistillation";
export function DiagramRenderer({ illustration }: { illustration?: unknown }) {
  if (illustration === null || illustration === undefined) return null;
  let diagram;
  try {
    diagram = validateIllustration(illustration);
  } catch {
    return (
      <p role="note" className="text-xs text-slate-500">
        Diagram unavailable: invalid blueprint.
      </p>
    );
  }
  if (!diagram) return null;
  const { apparatus_type: type, parameters: p } = diagram.blueprint;
  return (
    <figure className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white p-3 sm:p-5">
      {type === "circuit" ? (
        <CircuitDiagram
          arrangement={p.arrangement!}
          components={p.components!}
          showLabels={p.showLabels}
          switchClosed={p.switch_closed}
        />
      ) : type === "fractional_distillation" ? (
        <FractionalDistillation showLabels={p.showLabels} />
      ) : (
        <figcaption className="text-sm text-slate-500">
          [Diagram: {type} (Pending)]
        </figcaption>
      )}
    </figure>
  );
}
