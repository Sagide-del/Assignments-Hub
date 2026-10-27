import { useState } from 'react';
import { FlaskConical, Plus, RotateCcw } from 'lucide-react';
import { modelResult, type ModelKind, type Trial } from './investigations';

const settings: Record<
  ModelKind,
  { label: string; min: number; max: number; step: number; initial: number }
> = {
  circuit: { label: 'Voltage (V)', min: 1, max: 6, step: 1, initial: 2 },
  filter: { label: 'Treatment', min: 0, max: 3, step: 1, initial: 0 },
  plant: { label: 'Daily light (hours)', min: 0, max: 12, step: 1, initial: 6 },
  pendulum: {
    label: 'Length (m)',
    min: 0.25,
    max: 2,
    step: 0.25,
    initial: 0.25,
  },
  hydroponics: { label: 'Solution pH', min: 3, max: 9, step: 0.5, initial: 6 },
  photoelectric: {
    label: 'Frequency (×10¹⁴ Hz)',
    min: 2,
    max: 10,
    step: 0.5,
    initial: 4,
  },
};
const treatments = ['Untreated', 'Settling', 'Cloth filter', 'Sand filter'];
export function ExperimentBench({
  kind,
  trials,
  onRecord,
  onClear,
}: {
  kind: ModelKind;
  trials: Trial[];
  onRecord: (trial: Trial) => void;
  onClear: () => void;
}) {
  const config = settings[kind];
  const [value, setValue] = useState(config.initial);
  const [secondary, setSecondary] = useState(kind === 'circuit' ? 10 : 1);
  const [closed, setClosed] = useState(true);
  const result = modelResult(
    kind,
    value,
    kind === 'circuit' && !closed ? 0 : secondary,
  );
  const setting = `${config.label}: ${kind === 'filter' ? treatments[value] : value}${kind === 'circuit' ? `; ${secondary} Ω; switch ${closed ? 'closed' : 'open'}` : kind === 'plant' ? `; water: ${['Too little', 'Adequate', 'Too much'][secondary]}` : kind === 'pendulum' ? `; mass: ${secondary} kg` : kind === 'photoelectric' ? `; intensity: ${secondary}` : ''}`;
  return (
    <section
      className="overflow-hidden rounded-2xl border border-teal-200 bg-white"
      aria-label="Interactive experiment"
    >
      <div className="flex items-center gap-2 border-b border-teal-100 bg-teal-50 px-5 py-4">
        <FlaskConical className="h-5 w-5 text-teal-700" />
        <h2 className="font-semibold">Your experiment bench</h2>
        <span className="ml-auto text-xs text-teal-800">Browser model</span>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl bg-slate-950 p-4 text-white">
          <svg
            viewBox="0 0 320 180"
            role="img"
            aria-label={`${kind} model diagram`}
            className="mx-auto h-44 w-full"
          >
            {kind === 'circuit' ? (
              <>
                <path
                  d="M65 90V35H235V145H65V110"
                  stroke={closed ? '#5eead4' : '#94a3b8'}
                  strokeWidth="4"
                  fill="none"
                />
                <path d="M48 90H82M55 110H75" stroke="white" strokeWidth="4" />
                <circle
                  cx="235"
                  cy="90"
                  r="23"
                  fill={closed ? '#fde047' : '#334155'}
                />
                <path
                  d="M221 77L249 103M249 77L221 103"
                  stroke="#0f172a"
                  strokeWidth="3"
                />
                <path
                  d={closed ? 'M120 35H170' : 'M120 35L163 10'}
                  stroke="#fde047"
                  strokeWidth="5"
                />
                <text x="25" y="165" fill="white" fontSize="13">
                  {value} V · {secondary} Ω ·{' '}
                  {closed ? 'Closed path' : 'Broken path'}
                </text>
              </>
            ) : kind === 'pendulum' ? (
              <>
                <path d="M90 20H230" stroke="#94a3b8" strokeWidth="7" />
                <path
                  d={`M160 20V${45 + value * 47}`}
                  stroke="#5eead4"
                  strokeWidth="3"
                />
                <circle cx="160" cy={45 + value * 47} r="16" fill="#bef264" />
                <text x="190" y="80" fill="white" fontSize="14">
                  {value} m
                </text>
              </>
            ) : kind === 'filter' ? (
              <>
                <path
                  d="M85 20V150Q160 175 235 150V20"
                  fill="#164e63"
                  stroke="#67e8f9"
                  strokeWidth="3"
                />
                {Array.from(
                  { length: Math.min(40, Math.round(result.value / 2)) },
                  (_, i) => (
                    <circle
                      key={i}
                      cx={100 + ((i * 37) % 120)}
                      cy={50 + ((i * 19) % 90)}
                      r="3"
                      fill="#d6b587"
                    />
                  ),
                )}
                <text
                  x="160"
                  y="35"
                  textAnchor="middle"
                  fill="white"
                  fontSize="13"
                >
                  {treatments[value]}
                </text>
              </>
            ) : kind === 'plant' || kind === 'hydroponics' ? (
              <>
                <path
                  d="M110 125H210L195 170H125Z"
                  fill={kind === 'plant' ? '#92400e' : '#155e75'}
                />
                <path
                  d={`M160 130V${125 - Math.max(15, result.value * 0.7)}`}
                  stroke="#bef264"
                  strokeWidth="5"
                />
                <ellipse
                  cx="143"
                  cy={120 - Math.max(10, result.value * 0.4)}
                  rx="23"
                  ry="10"
                  transform={`rotate(25 143 ${120 - Math.max(10, result.value * 0.4)})`}
                  fill="#4ade80"
                />
                <ellipse
                  cx="178"
                  cy={110 - Math.max(10, result.value * 0.45)}
                  rx="23"
                  ry="10"
                  fill="#5eead4"
                />
                <circle cx="260" cy="35" r="20" fill="#fde047" />
                <text x="20" y="25" fill="#cbd5e1" fontSize="12">
                  Illustrative growth / availability
                </text>
              </>
            ) : (
              <>
                <path d="M65 30V150H260" stroke="#94a3b8" strokeWidth="4" />
                <path
                  d="M40 50L80 110M90 25L130 110M145 25L185 110"
                  stroke="#c4b5fd"
                  strokeWidth="4"
                />
                {result.value > 0 &&
                  [0, 1, 2].map((i) => (
                    <g key={i}>
                      <path
                        d={`M${105 + i * 55} 130l20 -35`}
                        stroke="#5eead4"
                        strokeWidth="2"
                      />
                      <circle cx={125 + i * 55} cy="95" r="5" fill="#5eead4" />
                    </g>
                  ))}
                <text
                  x="160"
                  y="173"
                  textAnchor="middle"
                  fill="white"
                  fontSize="13"
                >
                  {result.value > 0
                    ? 'Electron emission'
                    : 'Below emission threshold'}
                </text>
              </>
            )}
          </svg>
          <p className="text-xs text-slate-300">{result.label}</p>
          <p className="mt-1 text-3xl font-semibold" aria-live="polite">
            {Number(result.value.toFixed(3))}{' '}
            <span className="text-base text-teal-200">{result.unit}</span>
          </p>
        </div>
        <div className="space-y-5">
          <label className="block text-sm font-medium">
            {config.label}:{' '}
            <strong>{kind === 'filter' ? treatments[value] : value}</strong>
            {kind === 'filter' ? (
              <select
                className="mt-2 w-full rounded-xl border p-3"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
              >
                {treatments.map((t, i) => (
                  <option key={t} value={i}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="range"
                className="mt-4 block w-full accent-teal-700"
                min={config.min}
                max={config.max}
                step={config.step}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
              />
            )}
          </label>
          {kind === 'circuit' && (
            <>
              <label className="block text-sm">
                Resistance (Ω)
                <select
                  className="mt-2 block w-full rounded-xl border p-2"
                  value={secondary}
                  onChange={(e) => setSecondary(Number(e.target.value))}
                >
                  {[5, 10, 20].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={closed}
                  onChange={(e) => setClosed(e.target.checked)}
                />{' '}
                Switch closed
              </label>
            </>
          )}
          {kind === 'plant' && (
            <label className="block text-sm">
              Water setting
              <select
                className="mt-2 block w-full rounded-xl border p-2"
                value={secondary}
                onChange={(e) => setSecondary(Number(e.target.value))}
              >
                {['Too little', 'Adequate', 'Too much'].map((s, i) => (
                  <option key={s} value={i}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(kind === 'pendulum' || kind === 'photoelectric') && (
            <label className="block text-sm">
              {kind === 'pendulum' ? 'Mass (kg)' : 'Relative intensity'}
              <select
                className="mt-2 block w-full rounded-xl border p-2"
                value={secondary}
                onChange={(e) => setSecondary(Number(e.target.value))}
              >
                {[1, 2, 3].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            disabled={trials.length >= 20}
            onClick={() =>
              onRecord({
                setting,
                result: `${Number(result.value.toFixed(3))} ${result.unit}`,
              })
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Record trial
          </button>
          <p className="text-xs leading-5 text-slate-500">
            Record at least three trials. Change one factor at a time. Up to 20
            trials per notebook.
          </p>
        </div>
      </div>
      <div className="border-t p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">
            Results table · {trials.length} trials
          </h3>
          {trials.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-xs text-slate-600"
            >
              <RotateCcw className="h-3 w-3" />
              Undo last trial
            </button>
          )}
        </div>
        {trials.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="p-2">Trial</th>
                  <th className="p-2">Settings</th>
                  <th className="p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((t, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{t.setting}</td>
                    <td className="whitespace-nowrap p-2 font-semibold">
                      {t.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Your recorded trials will appear here.
          </p>
        )}
      </div>
    </section>
  );
}
