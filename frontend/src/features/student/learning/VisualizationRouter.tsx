import { useMemo, useState } from "react";
import { Atom, ChevronLeft, ChevronRight, Lightbulb, Rotate3D, Zap } from "lucide-react";

type Props = { type: string; state?: string; data?: Record<string, unknown> | null };

const elements = [
  ["H", "Hydrogen", 1], ["He", "Helium", 2], ["Li", "Lithium", 3], ["Be", "Beryllium", 4], ["B", "Boron", 5],
  ["C", "Carbon", 6], ["N", "Nitrogen", 7], ["O", "Oxygen", 8], ["F", "Fluorine", 9], ["Ne", "Neon", 10],
  ["Na", "Sodium", 11], ["Mg", "Magnesium", 12], ["Al", "Aluminium", 13], ["Si", "Silicon", 14], ["P", "Phosphorus", 15],
  ["S", "Sulfur", 16], ["Cl", "Chlorine", 17], ["Ar", "Argon", 18], ["K", "Potassium", 19], ["Ca", "Calcium", 20],
] as const;

function PeriodicTable() {
  const [active, setActive] = useState<(typeof elements)[number]>(elements[0]);
  return <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {elements.map((element) => <button key={element[0]} type="button" onClick={() => setActive(element)} className={`aspect-square rounded-xl border p-1 text-left transition ${active[0] === element[0] ? "border-lime-400 bg-lime-100 shadow-sm" : "border-slate-200 bg-white hover:border-slate-400"}`}>
        <span className="block text-xs text-slate-500">{element[2]}</span><strong className="text-base text-[#101820]">{element[0]}</strong>
      </button>)}
    </div>
    <div className="rounded-2xl bg-[#101820] p-5 text-white"><Atom className="h-6 w-6 text-lime-300" /><p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-slate-400">Bohr model</p><h3 className="mt-1 text-lg font-bold">{active[1]}</h3><div className="relative mx-auto mt-5 h-28 w-28 rounded-full border border-lime-300/50"><div className="absolute inset-7 rounded-full border border-cyan-200/60" /><div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300" /><span className="absolute -right-1 top-4 h-2 w-2 rounded-full bg-white" /></div><p className="mt-3 text-sm text-slate-300">Atomic number {active[2]}</p></div>
  </div>;
}

function PunnettSquare() {
  const [first, setFirst] = useState("A"); const [second, setSecond] = useState("a");
  const combos = useMemo(() => [[first + first, first + second], [second + first, second + second]], [first, second]);
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Inheritance explorer</p><h3 className="mt-1 font-bold text-[#101820]">Combine parent alleles</h3></div><div className="flex gap-2"><label className="text-sm text-slate-600">Allele 1 <select value={first} onChange={(e) => setFirst(e.target.value)} className="ml-1 rounded-lg border border-slate-300 p-2"><option>A</option><option>a</option></select></label><label className="text-sm text-slate-600">Allele 2 <select value={second} onChange={(e) => setSecond(e.target.value)} className="ml-1 rounded-lg border border-slate-300 p-2"><option>A</option><option>a</option></select></label></div></div><div className="mt-5 grid grid-cols-3 text-center text-sm"><div className="border-b border-r border-slate-200 p-3" /><div className="border-b border-r border-slate-200 p-3 font-bold">{first}</div><div className="border-b border-slate-200 p-3 font-bold">{second}</div><div className="border-b border-r border-slate-200 p-3 font-bold">{first}</div>{combos[0].map((item) => <div key={item} className="border-b border-r border-slate-200 bg-lime-50 p-3 font-bold text-[#143e32]">{item}</div>)}<div className="border-r border-slate-200 p-3 font-bold">{second}</div>{combos[1].map((item) => <div key={item} className="border-r border-slate-200 bg-lime-50 p-3 font-bold text-[#143e32]">{item}</div>)}</div></div>;
}

function TrigGraph() { const [angle, setAngle] = useState(90); const points = Array.from({ length: 41 }, (_, index) => `${index * 7.5},${65 - Math.sin((index / 40) * Math.PI * 2) * 42}`).join(" "); return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Interactive graph</p><h3 className="mt-1 font-bold text-[#101820]">Sine wave</h3></div><span className="rounded-full bg-lime-100 px-3 py-1 text-sm font-bold text-[#365100]">{angle} degrees</span></div><svg className="mt-5 h-36 w-full overflow-visible" viewBox="0 0 300 130" aria-label="Sine wave"><path d="M0 65H300M0 20V110" stroke="#cbd5e1" strokeWidth="1" /><polyline points={points} fill="none" stroke="#8fba00" strokeWidth="4" strokeLinecap="round" /><circle cx={angle / 360 * 300} cy={65 - Math.sin(angle / 180 * Math.PI) * 42} r="6" fill="#101820" /></svg><input className="mt-4 w-full accent-lime-500" type="range" min="0" max="360" value={angle} onChange={(event) => setAngle(Number(event.target.value))} /></div>; }

function CircuitBuilder() { const [connected, setConnected] = useState(false); return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Circuit builder</p><h3 className="mt-1 font-bold text-[#101820]">Complete the circuit</h3></div><Zap className={`h-7 w-7 ${connected ? "fill-amber-300 text-amber-500" : "text-slate-300"}`} /></div><div className="relative mt-5 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"><div className="absolute left-6 top-10 h-12 w-12 rounded border-4 border-[#101820] bg-white" /><div className="absolute right-6 top-8 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#101820] bg-white"><Lightbulb className={connected ? "fill-yellow-300 text-yellow-500" : "text-slate-400"} /></div><div className={`absolute left-16 right-20 top-16 h-1 ${connected ? "bg-lime-500" : "bg-slate-300"}`} /></div><button type="button" onClick={() => setConnected((value) => !value)} className="mt-4 rounded-xl bg-[#101820] px-4 py-2 text-sm font-bold text-white">{connected ? "Disconnect wire" : "Connect wire"}</button></div>; }

function Chromosome3D() { const [rotation, setRotation] = useState(0); return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">3D explorer</p><h3 className="mt-1 font-bold text-[#101820]">Chromosome model</h3></div><Rotate3D className="text-[#607d00]" /></div><div className="flex h-44 items-center justify-center overflow-hidden" style={{ perspective: "500px" }}><div className="relative h-28 w-20" style={{ transform: `rotateY(${rotation}deg) rotateX(-8deg)`, transition: "transform .35s" }}><i className="absolute left-0 top-0 h-28 w-7 rounded-full bg-gradient-to-b from-lime-300 to-[#607d00]" /><i className="absolute right-0 top-0 h-28 w-7 rounded-full bg-gradient-to-b from-slate-600 to-[#101820]" /><i className="absolute left-6 top-11 h-6 w-8 rounded-full bg-white/70" /></div></div><div className="flex items-center justify-center gap-2"><button type="button" onClick={() => setRotation((value) => value - 45)} className="rounded-lg border p-2"><ChevronLeft /></button><span className="text-sm text-slate-600">Rotate the model</span><button type="button" onClick={() => setRotation((value) => value + 45)} className="rounded-lg border p-2"><ChevronRight /></button></div></div>; }

export function VisualizationRouter({ type }: Props) {
  if (type === "PERIODIC_TABLE") return <PeriodicTable />;
  if (type === "PUNNETT_SQUARE") return <PunnettSquare />;
  if (type === "CHROMOSOME_3D") return <Chromosome3D />;
  if (type === "TRIG_GRAPH") return <TrigGraph />;
  if (type === "CIRCUIT_BUILDER") return <CircuitBuilder />;
  return <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">Read the explanation closely, then use the question to retrieve the idea in your own words.</div>;
}
