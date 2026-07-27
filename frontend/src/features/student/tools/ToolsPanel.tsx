import { useState } from 'react';
import { MatrixCalculator } from './MatrixCalculator';
import { GraphPlotter } from './GraphPlotter';
import { PeriodicTable } from './PeriodicTable';

type Tab = 'matrix' | 'graph' | 'periodic';

const TABS: { key: Tab; label: string }[] = [
  { key: 'matrix', label: 'Matrix Calculator' },
  { key: 'graph', label: 'Graph Plotter' },
  { key: 'periodic', label: 'Periodic Table' },
];

// Scratch/reference tools available to a student while working through an
// assignment — same idea as a calculator allowed in a real exam. Pure
// client-side, nothing here is saved or sent to the backend, and none of it
// is tied to a specific question or auto-graded.
export function ToolsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('matrix');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <p className="text-sm font-semibold text-[#101820]">Tools</p>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close tools">
            ✕
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-6 py-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                tab === t.key ? 'border-[#101820] bg-[#101820] text-[#B5E61D]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {tab === 'matrix' ? <MatrixCalculator /> : null}
          {tab === 'graph' ? <GraphPlotter /> : null}
          {tab === 'periodic' ? <PeriodicTable /> : null}
        </div>
      </div>
    </div>
  );
}
