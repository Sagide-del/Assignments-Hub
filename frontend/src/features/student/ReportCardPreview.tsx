import { FileText, Maximize2, PencilLine, RotateCcw, Sparkles, Upload } from "lucide-react";

export type ReportScore = { subject: string; percentage: number };

type Props = {
  fileName: string;
  previewUrl?: string | null;
  scores: ReportScore[];
  onChange: (scores: ReportScore[]) => void;
  onReupload: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

function gradeFor(score: number) {
  if (!Number.isFinite(score)) return { label: "—", className: "bg-slate-100 text-slate-500" };
  if (score >= 70) return { label: "EE", className: "bg-emerald-100 text-emerald-800" };
  if (score >= 40) return { label: "ME", className: "bg-amber-100 text-amber-800" };
  return { label: "BE", className: "bg-rose-100 text-rose-800" };
}

export function ReportCardPreview({
  fileName,
  previewUrl,
  scores,
  onChange,
  onReupload,
  onConfirm,
  confirming,
}: Props) {
  const update = (index: number, patch: Partial<ReportScore>) =>
    onChange(scores.map((score, row) => (row === index ? { ...score, ...patch } : score)));
  const validScores = scores.filter(
    (score) =>
      score.subject.trim() &&
      Number.isFinite(score.percentage) &&
      score.percentage >= 0 &&
      score.percentage <= 100,
  );
  const hasImage = /\.(jpe?g|png|webp)$/i.test(fileName);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(16,24,32,0.08)]">
      <header className="border-b border-slate-100 px-5 py-5 sm:px-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#718d00]">Step 2 of 2 · Check before we coach</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#101820]">Review your results</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">We found the subjects below. Correct anything that does not match your report card, then we will build your study plan.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-lime-50 px-3 py-1.5 text-xs font-bold text-[#506900]"><PencilLine className="h-3.5 w-3.5" /> Editable preview</span>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)]">
        <aside className="border-b border-slate-200 bg-[#f5f7f5] p-5 lg:border-b-0 lg:border-r sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Original report</p><p className="mt-1 truncate text-sm font-semibold text-[#101820]">{fileName}</p></div>
            {previewUrl && hasImage ? <a href={previewUrl} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-[#a4d019]" aria-label="Open full-size report card"><Maximize2 className="h-4 w-4" /></a> : null}
          </div>
          <div className="mt-5 grid min-h-72 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {previewUrl && hasImage ? <img src={previewUrl} alt="Uploaded report card" className="max-h-[430px] w-full rounded-xl object-contain" /> : <div className="max-w-xs text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-600"><FileText className="h-7 w-7" /></span><p className="mt-4 font-semibold text-[#101820]">Your report is stored privately</p><p className="mt-2 text-sm leading-6 text-slate-500">{hasImage ? "The preview is loading. You can still confirm or correct each result." : "This PDF cannot be shown here, but its extracted results are ready to review."}</p></div>}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Only you can view this report. It is used to create your private learning profile.</p>
        </aside>

        <div className="p-5 sm:p-7">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_76px_62px] gap-2 bg-[#101820] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300"><span>Subject</span><span>Score</span><span>Level</span></div>
            <div className="divide-y divide-slate-100">
              {scores.map((score, index) => {
                const grade = gradeFor(score.percentage);
                return <div key={index} className="grid grid-cols-[minmax(0,1fr)_76px_62px] items-center gap-2 px-3 py-2.5 sm:px-4"><input value={score.subject} onChange={(event) => update(index, { subject: event.target.value })} placeholder="Subject" className="min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-2 text-sm font-semibold text-[#101820] outline-none focus:border-lime-400 focus:bg-lime-50" /><input type="number" min="0" max="100" value={Number.isFinite(score.percentage) ? score.percentage : ""} onChange={(event) => update(index, { percentage: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-center text-sm font-semibold text-[#101820] outline-none focus:border-lime-400" /><span className={`justify-self-center rounded-full px-2 py-1 text-xs font-bold ${grade.className}`}>{grade.label}</span></div>;
              })}
            </div>
          </div>
          <button type="button" onClick={() => onChange([...scores, { subject: "", percentage: Number.NaN }])} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#526b00] hover:bg-lime-50"><Sparkles className="h-4 w-4" /> Add a subject</button>
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">EE: 70% and above · ME: 40–69% · BE: below 40%. Your edits are used instead of uncertain scan results.</p>
        </div>
      </div>

      <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <button type="button" onClick={onReupload} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-[#27343a] hover:bg-slate-100"><RotateCcw className="h-4 w-4" /> Re-upload report card</button>
        <button type="button" disabled={confirming || !validScores.length} onClick={onConfirm} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#101f38] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#172c4d] disabled:cursor-not-allowed disabled:opacity-50">{confirming ? "Analyzing your strengths…" : "Confirm & analyze"}<Upload className="h-4 w-4" /></button>
      </footer>
    </section>
  );
}
