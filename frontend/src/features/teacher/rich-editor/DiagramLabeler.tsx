import { useState } from 'react';
import { uploadsApi } from '../../../api/uploads.api';
import type { DiagramValue } from './diagramHtml';

// Teacher-authoring tool: upload a diagram (e.g. a neuron, a cell, a
// skeleton) and click on it to drop numbered labels — no interactive
// student-side answering yet (per scope), this just produces a static,
// numbered reference image + legend that gets appended to the question's
// content when the assignment is saved (see CreateAssignmentRich.tsx /
// buildDiagramHtml in diagramHtml.ts).
export function DiagramLabeler({
  value,
  onChange,
}: {
  value: DiagramValue | null;
  onChange: (v: DiagramValue | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadsApi.uploadSingle(file);
      onChange({ imageUrl: result.url, labels: [] });
    } catch {
      setError('Upload failed — please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    setPending({ x, y });
    setDraftLabel('');
  }

  function confirmLabel() {
    if (!value || !pending || !draftLabel.trim()) {
      setPending(null);
      return;
    }
    onChange({ ...value, labels: [...value.labels, { x: pending.x, y: pending.y, label: draftLabel.trim() }] });
    setPending(null);
    setDraftLabel('');
  }

  function removeLabel(index: number) {
    if (!value) return;
    onChange({ ...value, labels: value.labels.filter((_, i) => i !== index) });
  }

  if (!value) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white">
          {uploading ? 'Uploading...' : 'Add a labeled diagram'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">Optional — e.g. a neuron, a cell, a skeleton. Click the image afterward to drop numbered labels.</p>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Labeled diagram</p>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-red-600 hover:underline"
        >
          Remove diagram
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">Click anywhere on the image to add a numbered label.</p>

      <div className="relative mt-3 inline-block max-w-full">
        <img
          src={value.imageUrl}
          alt="Diagram being labeled"
          onClick={handleImageClick}
          className="max-w-full cursor-crosshair rounded-2xl"
        />
        {value.labels.map((l, i) => (
          <span
            key={i}
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
            className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#101820] text-xs font-bold text-[#B5E61D] shadow"
            title={l.label}
          >
            {i + 1}
          </span>
        ))}
        {pending ? (
          <div
            style={{ left: `${pending.x}%`, top: `${pending.y}%` }}
            className="absolute z-10 flex -translate-x-1/2 translate-y-3 items-center gap-1 rounded-xl border border-slate-300 bg-white p-1.5 shadow-lg"
          >
            <input
              autoFocus
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmLabel();
                if (e.key === 'Escape') setPending(null);
              }}
              placeholder="Label name"
              className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs"
            />
            <button type="button" onClick={confirmLabel} className="rounded-lg bg-[#B5E61D] px-2 py-1 text-xs font-semibold text-[#101820]">
              Add
            </button>
            <button type="button" onClick={() => setPending(null)} className="rounded-lg px-1 text-xs text-slate-400">
              ×
            </button>
          </div>
        ) : null}
      </div>

      {value.labels.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          {value.labels.map((l, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
              <span>{i + 1}. {l.label}</span>
              <button type="button" onClick={() => removeLabel(i)} className="text-xs font-semibold text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
