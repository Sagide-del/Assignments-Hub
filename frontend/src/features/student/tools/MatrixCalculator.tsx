import { useState } from 'react';

type Dims = { rows: number; cols: number };

function emptyGrid(dims: Dims): string[][] {
  return Array.from({ length: dims.rows }, () => Array.from({ length: dims.cols }, () => '0'));
}

function toNumbers(grid: string[][]): number[][] {
  return grid.map((row) => row.map((cell) => parseFloat(cell) || 0));
}

function multiply(a: number[][], b: number[][]): number[][] | null {
  if (a[0].length !== b.length) return null; // A's cols must equal B's rows
  const result: number[][] = [];
  for (let i = 0; i < a.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) sum += a[i][k] * b[k][j];
      row.push(Math.round(sum * 1000) / 1000);
    }
    result.push(row);
  }
  return result;
}

function MatrixGrid({
  label,
  dims,
  setDims,
  grid,
  setGrid,
}: {
  label: string;
  dims: Dims;
  setDims: (d: Dims) => void;
  grid: string[][];
  setGrid: (g: string[][]) => void;
}) {
  function resize(next: Dims) {
    const clamped = { rows: Math.min(4, Math.max(1, next.rows)), cols: Math.min(4, Math.max(1, next.cols)) };
    setDims(clamped);
    setGrid(emptyGrid(clamped));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <input
            type="number"
            min={1}
            max={4}
            value={dims.rows}
            onChange={(e) => resize({ rows: Number(e.target.value) || 1, cols: dims.cols })}
            className="w-12 rounded-lg border border-slate-200 px-1.5 py-1 text-center"
          />
          ×
          <input
            type="number"
            min={1}
            max={4}
            value={dims.cols}
            onChange={(e) => resize({ rows: dims.rows, cols: Number(e.target.value) || 1 })}
            className="w-12 rounded-lg border border-slate-200 px-1.5 py-1 text-center"
          />
        </div>
      </div>
      <div className="mt-2 inline-block rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {grid.map((row, i) => (
          <div key={i} className="flex gap-1.5">
            {row.map((cell, j) => (
              <input
                key={j}
                value={cell}
                onChange={(e) => {
                  const next = grid.map((r) => [...r]);
                  next[i][j] = e.target.value;
                  setGrid(next);
                }}
                className="mb-1.5 h-10 w-14 rounded-lg border border-slate-200 bg-white text-center text-sm"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Scratch tool for students working through matrix problems — not tied to
// any question or graded automatically, purely a calculator they can open
// while answering (see ToolsPanel.tsx). No backend involved at all.
export function MatrixCalculator() {
  const [dimsA, setDimsA] = useState<Dims>({ rows: 2, cols: 2 });
  const [gridA, setGridA] = useState<string[][]>(emptyGrid({ rows: 2, cols: 2 }));
  const [dimsB, setDimsB] = useState<Dims>({ rows: 2, cols: 2 });
  const [gridB, setGridB] = useState<string[][]>(emptyGrid({ rows: 2, cols: 2 }));

  const result = multiply(toNumbers(gridA), toNumbers(gridB));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Enter two matrices and multiply them. Columns of A must match rows of B.</p>
      <div className="flex flex-wrap items-start gap-4">
        <MatrixGrid label="Matrix A" dims={dimsA} setDims={setDimsA} grid={gridA} setGrid={setGridA} />
        <span className="mt-8 text-2xl text-slate-400">×</span>
        <MatrixGrid label="Matrix B" dims={dimsB} setDims={setDimsB} grid={gridB} setGrid={setGridB} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Result</p>
        {result ? (
          <div className="mt-2 inline-block rounded-2xl border border-[#B5E61D] bg-[#FAFDEB] p-2">
            {result.map((row, i) => (
              <div key={i} className="flex gap-1.5">
                {row.map((v, j) => (
                  <div key={j} className="mb-1.5 flex h-10 w-16 items-center justify-center rounded-lg bg-white text-sm font-medium text-[#101820]">
                    {v}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-red-600">Matrix A's column count must match Matrix B's row count.</p>
        )}
      </div>
    </div>
  );
}
