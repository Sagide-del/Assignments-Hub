import type { ReactNode } from "react";
const ink = "#111";
export function Wire({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={2} />;
}
function Symbol({
  x,
  y,
  rotate = 0,
  children,
}: {
  x: number;
  y: number;
  rotate?: number;
  children: ReactNode;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate})`}
      stroke={ink}
      fill="white"
      strokeWidth={2}
    >
      {children}
    </g>
  );
}
export function Battery({
  x,
  y,
  rotate = 0,
}: {
  x: number;
  y: number;
  rotate?: number;
}) {
  return (
    <Symbol x={x} y={y} rotate={rotate}>
      <path d="M-30 0H-7 M7 0H30 M-7 -22V22 M7 -12V12" fill="none" />
    </Symbol>
  );
}
export function Switch({
  x,
  y,
  closed = false,
}: {
  x: number;
  y: number;
  closed?: boolean;
}) {
  return (
    <Symbol x={x} y={y}>
      <path
        d={`M-30 0H-20 M20 0H30 M-20 0L20 ${closed ? 0 : -20}`}
        fill="none"
      />
      <circle cx={-20} cy={0} r={2} />
      <circle cx={20} cy={0} r={2} />
    </Symbol>
  );
}
export function LightBulb({ x, y }: { x: number; y: number }) {
  return (
    <Symbol x={x} y={y}>
      <path d="M-30 0H-18 M18 0H30" />
      <circle r={18} />
      <path d="M-12 -12L12 12 M-12 12L12 -12" />
    </Symbol>
  );
}
export function Beaker({ x, y }: { x: number; y: number }) {
  return (
    <Symbol x={x} y={y}>
      <path
        d="M-35 -45H-27V35Q-27 42 -20 42H25Q32 42 32 35V-45H40"
        fill="none"
      />
      <path d="M-27 10H32 M-20 24H-10 M-20 -5H-10" fill="none" />
    </Symbol>
  );
}
export function RoundBottomFlask({ x, y }: { x: number; y: number }) {
  return (
    <Symbol x={x} y={y}>
      <path d="M-10 -70V-38A42 42 0 1 0 10 -38V-70 M-12 -70H12" />
      <path d="M-36 18Q0 9 36 18" fill="none" />
    </Symbol>
  );
}
export function Condenser({ x, y }: { x: number; y: number }) {
  return (
    <Symbol x={x} y={y} rotate={20}>
      <path d="M0 -15H220V15H0Z M-25 -5H245V5H-25Z" />
      <path d="M20 -15V-40H45 M200 15V40H175" fill="none" />
    </Symbol>
  );
}
export function Thermometer({ x, y }: { x: number; y: number }) {
  return (
    <Symbol x={x} y={y}>
      <rect x={-4} y={-65} width={8} height={65} rx={4} />
      <circle cy={4} r={7} />
      <path d="M0 -50V0" fill="none" />
      <path d="M4 -48H10 M4 -32H10 M4 -16H10" />
    </Symbol>
  );
}
export function BunsenBurner({ x, y }: { x: number; y: number }) {
  return (
    <Symbol x={x} y={y}>
      <path d="M-9 0V44H-30V50H30V44H9V0Z" />
      <path
        d="M0 -40Q-23 -15 0 -4Q23 -15 0 -40Z M0 -25Q-8 -12 0 -5Q8 -12 0 -25Z"
        fill="none"
      />
      <path d="M9 33H40" />
    </Symbol>
  );
}
