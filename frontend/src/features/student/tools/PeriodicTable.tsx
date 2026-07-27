import { useState } from 'react';

interface ElementInfo {
  name: string;
  symbol: string;
  number: number;
  config: string;
  mass: number;
  group: string;
  colorClass: string;
}

// First 20 elements — enough for KCSE-level chemistry. Reference tool only,
// not tied to any question or grading (see ToolsPanel.tsx).
const ELEMENTS: ElementInfo[] = [
  { symbol: 'H', name: 'Hydrogen', number: 1, config: '1', mass: 1.008, group: 'Nonmetal', colorClass: 'bg-emerald-100 text-emerald-800' },
  { symbol: 'He', name: 'Helium', number: 2, config: '2', mass: 4.003, group: 'Noble Gas', colorClass: 'bg-violet-100 text-violet-800' },
  { symbol: 'Li', name: 'Lithium', number: 3, config: '2.1', mass: 6.941, group: 'Alkali Metal', colorClass: 'bg-rose-100 text-rose-800' },
  { symbol: 'Be', name: 'Beryllium', number: 4, config: '2.2', mass: 9.012, group: 'Alkaline Earth', colorClass: 'bg-orange-100 text-orange-800' },
  { symbol: 'B', name: 'Boron', number: 5, config: '2.3', mass: 10.811, group: 'Nonmetal', colorClass: 'bg-emerald-100 text-emerald-800' },
  { symbol: 'C', name: 'Carbon', number: 6, config: '2.4', mass: 12.011, group: 'Nonmetal', colorClass: 'bg-emerald-100 text-emerald-800' },
  { symbol: 'N', name: 'Nitrogen', number: 7, config: '2.5', mass: 14.007, group: 'Nonmetal', colorClass: 'bg-emerald-100 text-emerald-800' },
  { symbol: 'O', name: 'Oxygen', number: 8, config: '2.6', mass: 15.999, group: 'Nonmetal', colorClass: 'bg-emerald-100 text-emerald-800' },
  { symbol: 'F', name: 'Fluorine', number: 9, config: '2.7', mass: 18.998, group: 'Halogen', colorClass: 'bg-sky-100 text-sky-800' },
  { symbol: 'Ne', name: 'Neon', number: 10, config: '2.8', mass: 20.180, group: 'Noble Gas', colorClass: 'bg-violet-100 text-violet-800' },
  { symbol: 'Na', name: 'Sodium', number: 11, config: '2.8.1', mass: 22.990, group: 'Alkali Metal', colorClass: 'bg-rose-100 text-rose-800' },
  { symbol: 'Mg', name: 'Magnesium', number: 12, config: '2.8.2', mass: 24.305, group: 'Alkaline Earth', colorClass: 'bg-orange-100 text-orange-800' },
  { symbol: 'Al', name: 'Aluminium', number: 13, config: '2.8.3', mass: 26.982, group: 'Metal', colorClass: 'bg-slate-200 text-slate-800' },
  { symbol: 'Si', name: 'Silicon', number: 14, config: '2.8.4', mass: 28.086, group: 'Metalloid', colorClass: 'bg-amber-100 text-amber-800' },
  { symbol: 'P', name: 'Phosphorus', number: 15, config: '2.8.5', mass: 30.974, group: 'Nonmetal', colorClass: 'bg-emerald-100 text-emerald-800' },
  { symbol: 'S', name: 'Sulphur', number: 16, config: '2.8.6', mass: 32.065, group: 'Nonmetal', colorClass: 'bg-emerald-100 text-emerald-800' },
  { symbol: 'Cl', name: 'Chlorine', number: 17, config: '2.8.7', mass: 35.453, group: 'Halogen', colorClass: 'bg-sky-100 text-sky-800' },
  { symbol: 'Ar', name: 'Argon', number: 18, config: '2.8.8', mass: 39.948, group: 'Noble Gas', colorClass: 'bg-violet-100 text-violet-800' },
  { symbol: 'K', name: 'Potassium', number: 19, config: '2.8.8.1', mass: 39.098, group: 'Alkali Metal', colorClass: 'bg-rose-100 text-rose-800' },
  { symbol: 'Ca', name: 'Calcium', number: 20, config: '2.8.8.2', mass: 40.078, group: 'Alkaline Earth', colorClass: 'bg-orange-100 text-orange-800' },
];

export function PeriodicTable() {
  const [selected, setSelected] = useState<ElementInfo>(ELEMENTS[7]); // default to Oxygen

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {ELEMENTS.map((el) => (
          <button
            key={el.symbol}
            type="button"
            onClick={() => setSelected(el)}
            className={`rounded-xl px-2 py-2 text-center text-sm font-semibold transition ${el.colorClass} ${
              selected.symbol === el.symbol ? 'ring-2 ring-[#101820]' : 'hover:opacity-80'
            }`}
          >
            {el.symbol}
            <div className="text-[10px] font-normal opacity-70">{el.number}</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-lg font-semibold text-[#101820]">
          {selected.name} ({selected.symbol})
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Atomic number</dt>
            <dd className="mt-1 font-medium text-slate-700">{selected.number}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Atomic mass</dt>
            <dd className="mt-1 font-medium text-slate-700">{selected.mass}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Group</dt>
            <dd className="mt-1 font-medium text-slate-700">{selected.group}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Electron config</dt>
            <dd className="mt-1 font-medium text-slate-700">{selected.config}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.config.split('.').map((shell, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Shell {i + 1}</p>
              <p className="text-sm">{'●'.repeat(parseInt(shell, 10) || 0)}</p>
              <p className="text-[10px] text-slate-400">{shell} e⁻</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
