import { useEffect, useState } from 'react';

type FunctionReference = {
  name: string;
  symbol: string;
  example: string;
};

type ReferenceSection = {
  id: 'scientific' | 'statistics' | 'complex' | 'base' | 'equations';
  label: string;
  functions: FunctionReference[];
};

const REFERENCE_SECTIONS: ReferenceSection[] = [
  {
    id: 'scientific',
    label: 'Scientific',
    functions: [
      { name: 'Square', symbol: 'x²', example: '5² = 25' },
      { name: 'Cube', symbol: 'x³', example: '3³ = 27' },
      { name: 'Power', symbol: 'xⁿ', example: '2⁴ = 16' },
      { name: 'Square Root', symbol: '√', example: '√25 = 5' },
      { name: 'Cube Root', symbol: '³√', example: '³√27 = 3' },
      { name: 'nth Root', symbol: 'ⁿ√', example: '⁴√16 = 2' },
      { name: 'Reciprocal', symbol: '1/x', example: '1/4 = 0.25' },
      { name: 'Factorial', symbol: 'x!', example: '5! = 120' },
      { name: 'Pi', symbol: 'π', example: 'π = 3.14159' },
      { name: 'Exponent', symbol: 'EXP', example: '5 × 10³ = 5000' },
      { name: 'Logarithm', symbol: 'log', example: 'log 100 = 2' },
      { name: 'Natural Log', symbol: 'ln', example: 'ln(e) = 1' },
      { name: 'Sine', symbol: 'sin', example: 'sin 30° = 0.5' },
      { name: 'Cosine', symbol: 'cos', example: 'cos 60° = 0.5' },
      { name: 'Tangent', symbol: 'tan', example: 'tan 45° = 1' },
      { name: 'Inverse Sine', symbol: 'sin⁻¹', example: 'sin⁻¹(0.5) = 30°' },
      { name: 'Inverse Cosine', symbol: 'cos⁻¹', example: 'cos⁻¹(0.5) = 60°' },
      { name: 'Inverse Tangent', symbol: 'tan⁻¹', example: 'tan⁻¹(1) = 45°' },
      { name: 'Hyperbolic', symbol: 'sinh · cosh · tanh', example: 'sinh(1) = 1.175' },
      { name: 'Angle Units', symbol: '°  ′  ″', example: '30°30′ = 30.5°' },
      { name: 'Polar / Rectangular', symbol: 'Pol() · Rec()', example: 'Pol(3,4) = 5∠53.13°' },
      { name: 'Absolute Value', symbol: '|x|', example: '|-5| = 5' },
      { name: 'Random Number', symbol: 'Ran#', example: 'Random value from 0 to 1' },
      { name: 'Memory', symbol: 'M+ · M− · MR · MC', example: 'Store and recall values' },
    ],
  },
  {
    id: 'statistics',
    label: 'Statistics',
    functions: [
      { name: 'Sum', symbol: 'Σx', example: 'Sum of all values' },
      { name: 'Mean', symbol: 'x̄', example: 'Average of the data' },
      { name: 'Standard Deviation', symbol: 'σn · σn−1', example: 'Population or sample' },
      { name: 'Variance', symbol: 'σ²', example: 'Standard deviation squared' },
      { name: 'Minimum', symbol: 'min', example: 'Smallest value' },
      { name: 'Maximum', symbol: 'max', example: 'Largest value' },
      { name: 'Count', symbol: 'n', example: 'Number of values' },
      { name: 'Regression', symbol: 'a · b · r', example: 'Linear regression values' },
    ],
  },
  {
    id: 'complex',
    label: 'Complex',
    functions: [
      { name: 'Imaginary Unit', symbol: 'i', example: '√(-1) = i' },
      { name: 'Real Part', symbol: 'Re()', example: 'Re(3 + 4i) = 3' },
      { name: 'Imaginary Part', symbol: 'Im()', example: 'Im(3 + 4i) = 4' },
      { name: 'Argument', symbol: 'arg()', example: 'arg(3 + 4i) = 53.13°' },
      { name: 'Complex Mode', symbol: 'CMPLX', example: 'Switch to complex mode' },
    ],
  },
  {
    id: 'base',
    label: 'Number Bases',
    functions: [
      { name: 'Binary', symbol: 'bin', example: '1010₂ = 10' },
      { name: 'Octal', symbol: 'oct', example: '17₈ = 15' },
      { name: 'Decimal', symbol: 'dec', example: '15 = 1111₂' },
      { name: 'Hexadecimal', symbol: 'hex', example: 'F₁₆ = 15' },
    ],
  },
  {
    id: 'equations',
    label: 'Equations',
    functions: [
      { name: 'Linear Equation', symbol: 'ax + b = c', example: 'Solve for x' },
      { name: 'Quadratic Equation', symbol: 'ax² + bx + c = 0', example: 'Find both roots' },
      { name: 'Simultaneous Equations', symbol: '2x + 3y = 5', example: 'Solve for x and y' },
    ],
  },
];

export function MathsFunctionsPanel({ onClose }: { onClose: () => void }) {
  const [activeSectionId, setActiveSectionId] =
    useState<ReferenceSection['id']>('scientific');
  const activeSection =
    REFERENCE_SECTIONS.find((section) => section.id === activeSectionId) ??
    REFERENCE_SECTIONS[0];

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#101820]/55 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maths-functions-title"
    >
      <section className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] bg-[#F8FAFC] shadow-2xl sm:max-h-[88vh] sm:rounded-[28px]">
        <header className="flex shrink-0 items-start justify-between gap-4 bg-[#101820] px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#B5E61D] text-[#101820]">
              <CalculatorIcon />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B5E61D]">
                Maths reference
              </p>
              <h2
                id="maths-functions-title"
                className="mt-1 break-words text-lg font-semibold sm:text-xl"
              >
                Scientific functions
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10"
            aria-label="Close maths functions"
          >
            <CloseIcon />
          </button>
        </header>

        <nav
          className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 sm:px-6"
          aria-label="Maths function categories"
        >
          {REFERENCE_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSectionId(section.id)}
              className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
                activeSectionId === section.id
                  ? 'bg-[#101820] text-[#B5E61D]'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            {activeSection.functions.map((item) => (
              <article
                key={`${activeSection.id}-${item.name}`}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(16,24,32,0.04)]"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-[#101820]">{item.name}</p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">{item.example}</p>
                </div>
                <span className="flex min-h-11 min-w-11 max-w-44 items-center justify-center break-words rounded-xl bg-[#EEF8D1] px-3 text-center text-sm font-bold text-[#3E5209]">
                  {item.symbol}
                </span>
              </article>
            ))}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] sm:w-auto"
          >
            Return to question
          </button>
        </footer>
      </section>
    </div>
  );
}

function CalculatorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <path d="M8 7h8v3H8zM8 14h1M12 14h1M16 14h1M8 17h1M12 17h1M16 17h1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}
