import { useEffect, useRef, useState } from "react";
import { Expand, X } from "lucide-react";
import type { RecallVisual } from "../../api/content-library.api";
import { RecallIllustration } from "./RecallIllustration";
export function IllustrationViewer({
  visual,
  reveal,
  visualOnly = false,
}: {
  visual: RecallVisual;
  reveal: boolean;
  visualOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [open]);
  return (
    <>
      <RecallIllustration
        visual={visual}
        reveal={reveal}
        visualOnly={visualOnly}
      />
      <div className="mt-3 flex justify-center" data-recall-interactive>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
        >
          <Expand size={13} />
          View illustration larger
        </button>
      </div>
      {open && (
        <dialog
          ref={dialog}
          onCancel={() => setOpen(false)}
          className="recall-illustration-dialog rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl"
          aria-label={`Enlarged illustration: ${visual.title}`}
        >
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <p className="text-sm font-semibold">{visual.title}</p>
            <button
              onClick={() => {
                dialog.current?.close();
                setOpen(false);
              }}
              aria-label="Close enlarged illustration"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4 sm:p-8">
            <RecallIllustration
              visual={visual}
              reveal={reveal}
              visualOnly={visualOnly}
            />
          </div>
        </dialog>
      )}
    </>
  );
}
