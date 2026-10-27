import type { MockVisual as Visual } from '../../../api/kjsea.api';
export function MockVisual({ visual: v }: { visual: Visual }) {
  if (v.kind === 'table')
    return (
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <caption className="bg-slate-50 p-3 text-left font-semibold">
            {v.caption}
          </caption>
          <thead>
            <tr>
              {v.headings.map((h, i) => (
                <th key={i} scope="col" className="border-b p-3 text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border-b p-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  let label = '';
  let drawing;
  if (v.kind === 'rectangle') {
    label = `Rectangle, width ${v.width} cm and height ${v.height} cm; not to scale.`;
    drawing = (
      <>
        <rect
          x="65"
          y="40"
          width="190"
          height="90"
          fill="#ccfbf1"
          stroke="#115e59"
          strokeWidth="2"
        />
        <text x="160" y="158" textAnchor="middle">
          {v.width} cm
        </text>
        <text x="280" y="90" textAnchor="middle">
          {v.height} cm
        </text>
      </>
    );
  } else if (v.kind === 'triangle') {
    label = `Triangle with base ${v.base} cm and perpendicular height ${v.height} cm; not to scale.`;
    drawing = (
      <>
        <path
          d="M65 135H260L65 30Z"
          fill="#ccfbf1"
          stroke="#115e59"
          strokeWidth="2"
        />
        <path d="M65 120H80V135" fill="none" stroke="#115e59" />
        <text x="160" y="160" textAnchor="middle">
          {v.base} cm
        </text>
        <text x="32" y="85" textAnchor="middle">
          {v.height} cm
        </text>
      </>
    );
  } else if (v.kind === 'circle') {
    label = `Circle of radius ${v.radius} cm, not to scale.`;
    drawing = (
      <>
        <circle
          cx="155"
          cy="90"
          r="63"
          fill="#ccfbf1"
          stroke="#115e59"
          strokeWidth="2"
        />
        <circle cx="155" cy="90" r="3" fill="#115e59" />
        <path d="M155 90H218" stroke="#115e59" strokeWidth="2" />
        <text x="185" y="80" textAnchor="middle">
          {v.radius} cm
        </text>
      </>
    );
  } else if (v.kind === 'angles') {
    label = `Two adjacent angles on a straight line: ${v.known} degrees between the right-hand ray and the sloping ray; x is between the left-hand ray and the sloping ray.`;
    const angle = (v.known * Math.PI) / 180;
    drawing = (
      <>
        <path d="M30 135H290" stroke="#115e59" strokeWidth="2" />
        <path
          d={`M160 135L${160 + 100 * Math.cos(angle)} ${135 - 100 * Math.sin(angle)}`}
          stroke="#115e59"
          strokeWidth="2"
        />
        <text
          x={160 + 55 * Math.cos(angle / 2)}
          y={135 - 55 * Math.sin(angle / 2)}
          textAnchor="middle"
        >
          {v.known}°
        </text>
        <text x="115" y="112" textAnchor="middle">
          x
        </text>
      </>
    );
  } else if (v.kind === 'point') {
    label = `Cartesian grid with point P at horizontal position ${v.x}, vertical position ${v.y}. Each grid interval is one unit.`;
    drawing = (
      <>
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <path
              d={`M${45 + i * 30} 20V150M45 ${150 - i * 20}H225`}
              stroke="#cbd5e1"
            />
            <text x={45 + i * 30} y="166" textAnchor="middle" fontSize="11">
              {i}
            </text>
            <text x="32" y={154 - i * 20} textAnchor="middle" fontSize="11">
              {i}
            </text>
          </g>
        ))}
        <path d="M45 15V150H240" fill="none" stroke="#334155" strokeWidth="2" />
        <text x="250" y="155">
          x
        </text>
        <text x="40" y="12">
          y
        </text>
        <circle cx={45 + v.x * 30} cy={150 - v.y * 20} r="5" fill="#0f766e" />
        <text x={53 + v.x * 30} y={145 - v.y * 20} fontWeight="bold">
          P
        </text>
      </>
    );
  } else {
    label = `Bar chart. ${v.labels.map((l, i) => `${l}: ${v.values[i]} seedlings`).join('; ')}.`;
    drawing = (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <path d={`M45 ${145 - i * 24}H285`} stroke="#e2e8f0" />
            <text x="30" y={149 - i * 24} fontSize="11">
              {i * 2}
            </text>
          </g>
        ))}
        <path d="M45 20V145H285" fill="none" stroke="#334155" />
        {v.values.map((n, i) => (
          <g key={i}>
            <rect
              x={65 + i * 75}
              y={145 - n * 12}
              width="40"
              height={n * 12}
              rx="3"
              fill="#0f766e"
            />
            <text
              x={85 + i * 75}
              y={138 - n * 12}
              textAnchor="middle"
              fontSize="12"
            >
              {n}
            </text>
            <text x={85 + i * 75} y="166" textAnchor="middle">
              {v.labels[i]}
            </text>
          </g>
        ))}
      </>
    );
  }
  return (
    <figure className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 320 180"
        className="mx-auto h-52 w-full max-w-md text-slate-700"
        fill="currentColor"
        fontSize="14"
      >
        {drawing}
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
