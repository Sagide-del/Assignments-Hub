import { useEffect, useRef, useState } from "react";
import { Download, Upload, X, CheckCircle2, RefreshCw } from "lucide-react";
import { sbaImportApi, type MockImportSummary } from "../../../api/sba.api";
import { apiErrorMessage } from "../../../api/axios";
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ExternalMocksModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [source, setSource] = useState(""),
    [year, setYear] = useState(new Date().getFullYear()),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [summary, setSummary] = useState<MockImportSummary | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => {
      el?.close();
    };
  }, []);
  async function template() {
    setBusy("template");
    setError("");
    try {
      save(await sbaImportApi.template(), "external-mocks-template.csv");
    } catch (e) {
      setError(apiErrorMessage(e, "Could not download template."));
    } finally {
      setBusy("");
    }
  }
  async function upload() {
    if (!file) return;
    setBusy("upload");
    setError("");
    setSummary(null);
    setMessage("");
    try {
      const result = await sbaImportApi.upload(file, source.trim(), year);
      setSummary(result);
      if (result.imported) onImported();
    } catch (e) {
      setError(
        apiErrorMessage(e, "Import failed. Your file can be retried safely."),
      );
    } finally {
      setBusy("");
    }
  }
  async function merge() {
    setBusy("merge");
    setError("");
    try {
      const result = await sbaImportApi.merge();
      setMessage(`Updated ${result.students} learner projections.`);
      onImported();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not recalculate projections."));
    } finally {
      setBusy("");
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="mock-import-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-[#101820] shadow-xl backdrop:bg-slate-950/40"
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 id="mock-import-title" className="text-lg font-semibold">
          Import external mocks
        </h2>
        <button
          aria-label="Close import"
          disabled={!!busy}
          onClick={onClose}
          className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-40"
        >
          <X size={18} />
        </button>
      </header>
      <div className="space-y-5 p-6">
        <button
          type="button"
          onClick={() => void template()}
          disabled={!!busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Download size={16} />
          {busy === "template" ? "Downloading…" : "Download CSV Template"}
        </button>
        <p className="text-sm text-slate-500">
          Your Grade 10–12 roster is prefilled. Keep admission numbers
          unchanged. Add a subject, term and percentage score; copy a learner’s
          row for additional subjects.
        </p>
        <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
          <label className="text-sm font-medium">
            Exam / source
            <input
              value={source}
              maxLength={120}
              disabled={!!busy}
              onChange={(e) => {
                setSource(e.target.value);
                setSummary(null);
              }}
              placeholder="Physical Mock Exam – Term 2"
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium">
            Academic year
            <input
              type="number"
              min={2000}
              max={2100}
              step={1}
              disabled={!!busy}
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setSummary(null);
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5 font-normal"
            />
          </label>
        </div>
        <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Upload size={17} />
            Choose results file
          </span>
          <input
            aria-label="Results file"
            disabled={!!busy}
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setSummary(null);
              setError("");
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:font-medium"
          />
          <span className="mt-2 block text-xs text-slate-500">
            CSV or single-sheet XLSX · 5 MB · 2,000 rows · values only
          </span>
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            {error}
          </p>
        )}
        {summary && (
          <section aria-label="Import summary" className="space-y-3">
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              <span>
                {summary.imported} accepted · {summary.inserted} new ·{" "}
                {summary.updated} updated · {summary.unchanged} unchanged ·{" "}
                {summary.failed} rejected · {summary.skipped} blank template
                rows skipped
              </span>
            </div>
            {summary.failed > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Fix errors</h3>
                <p className="mb-2 text-xs text-slate-500">
                  Correct these rows and upload again with the same exam name
                  and year. Previously imported scores will not duplicate.
                </p>
                <div className="max-h-52 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Admission</th>
                        <th className="p-2">Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.errors.map((e) => (
                        <tr key={e.row} className="border-t border-slate-100">
                          <td className="p-2">{e.row}</td>
                          <td className="p-2">{e.admission_number}</td>
                          <td className="p-2">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
        {message && (
          <p role="status" className="text-sm text-emerald-800">
            {message}
          </p>
        )}
        <p className="text-xs leading-5 text-slate-500">
          Imports recalculate projections automatically. The higher Grade 12
          external or internal average is used. Grade 10–11 mocks are stored as
          history and do not replace SBA scores.
        </p>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={() => void merge()}
            disabled={!!busy}
            className="inline-flex items-center gap-2 text-sm font-medium disabled:opacity-40"
          >
            <RefreshCw size={15} />
            {busy === "merge" ? "Recalculating…" : "Recalculate projections"}
          </button>
          <button
            onClick={() => void upload()}
            disabled={
              !!busy ||
              !file ||
              !source.trim() ||
              !Number.isInteger(year) ||
              year < 2000 ||
              year > 2100
            }
            className="rounded-lg bg-[#101820] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy === "upload" ? "Importing…" : "Import results"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
