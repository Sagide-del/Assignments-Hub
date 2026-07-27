import { useEffect, useRef, useState } from 'react';

const CANVAS_SIZE = 360;
const SCALE = 20; // pixels per unit

// Scratch tool: plots a student-typed function of x on a canvas. Purely
// client-side — `Function('x', 'return ' + expr)` only ever runs inside the
// student's own browser tab, on their own input, and touches nothing on the
// server or any other user's data (equivalent to what devtools already lets
// them do). Never sent anywhere, never stored.
export function GraphPlotter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [expr, setExpr] = useState('x^2');
  const [error, setError] = useState<string | null>(null);

  function plot() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Axes
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_SIZE / 2);
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2);
    ctx.moveTo(CANVAS_SIZE / 2, 0);
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
    ctx.stroke();

    // `^` isn't valid JS exponentiation — translate it to `**` so students
    // can type the notation they're used to from math class. The extra
    // named parameters below let them write sin(x)/sqrt(x)/PI/etc directly
    // instead of Math.sin(x) — bound to the real Math functions when called.
    const jsExpr = expr.replace(/\^/g, '**');
    const MATH_PARAM_NAMES = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp', 'PI', 'E'];
    const MATH_PARAM_VALUES = [Math.sin, Math.cos, Math.tan, Math.sqrt, Math.abs, Math.log, Math.exp, Math.PI, Math.E];
    let fn: (x: number) => number;
    try {
      // eslint-disable-next-line no-new-func
      const raw = new Function('x', ...MATH_PARAM_NAMES, `return ${jsExpr}`) as (...args: unknown[]) => number;
      fn = (x: number) => raw(x, ...MATH_PARAM_VALUES);
      fn(1); // smoke-test with a real value so a bad expression throws now, not mid-plot
      setError(null);
    } catch {
      setError('Could not understand that function — try something like x^2, 2*x+1, or sin(x).');
      return;
    }

    ctx.strokeStyle = '#101820';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= CANVAS_SIZE; px++) {
      const x = (px - CANVAS_SIZE / 2) / SCALE;
      let y: number;
      try {
        y = fn(x);
        if (!Number.isFinite(y)) throw new Error('non-finite');
      } catch {
        started = false;
        continue;
      }
      const py = CANVAS_SIZE / 2 - y * SCALE;
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  useEffect(() => {
    plot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Type a function of x — supports +, -, *, /, ^ (power), and Math functions like sin(x), cos(x), sqrt(x).
      </p>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="rounded-2xl border border-slate-200 bg-white"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">y =</span>
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && plot()}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="button" onClick={plot} className="rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white">
          Plot
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
