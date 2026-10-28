export type Element = "C" | "H" | "O";
export type MoleculeId = "water" | "methane" | "ethene" | "ethyne" | "ethanol";
export interface MoleculeSpec {
  id: MoleculeId;
  name: string;
  formula: string;
  shape: string;
  lesson: string;
  slots: { element: Element; position: [number, number, number] }[];
  bonds: { a: number; b: number; order: number }[];
}
const atom = (element: Element, x: number, y: number, z: number) => ({
  element,
  position: [x, y, z] as [number, number, number],
});
const bond = (a: number, b: number, order = 1) => ({ a, b, order });
const h = 1.09 / Math.sqrt(3),
  wa = (52.25 * Math.PI) / 180;
export const MOLECULES: MoleculeSpec[] = [
  {
    id: "water",
    name: "Water",
    formula: "H₂O",
    shape: "Bent · 104.5°",
    lesson:
      "Oxygen forms two single bonds. The bent arrangement reflects two bonding pairs and two lone pairs around oxygen.",
    slots: [
      atom("O", 0, 0, 0),
      atom("H", 0.96 * Math.sin(wa), 0.96 * Math.cos(wa), 0),
      atom("H", -0.96 * Math.sin(wa), 0.96 * Math.cos(wa), 0),
    ],
    bonds: [bond(0, 1), bond(0, 2)],
  },
  {
    id: "methane",
    name: "Methane",
    formula: "CH₄",
    shape: "Tetrahedral · 109.5°",
    lesson:
      "Carbon forms four single bonds. The four C–H directions point toward the corners of a tetrahedron, rather than lying in a flat cross.",
    slots: [
      atom("C", 0, 0, 0),
      atom("H", h, h, h),
      atom("H", h, -h, -h),
      atom("H", -h, h, -h),
      atom("H", -h, -h, h),
    ],
    bonds: [bond(0, 1), bond(0, 2), bond(0, 3), bond(0, 4)],
  },
  {
    id: "ethene",
    name: "Ethene",
    formula: "C₂H₄",
    shape: "Planar · about 120°",
    lesson:
      "The two carbon atoms share a double bond. Each carbon also forms two C–H bonds, with the atoms approximately in one plane.",
    slots: [
      atom("C", -0.67, 0, 0),
      atom("C", 0.67, 0, 0),
      atom("H", -1.215, 0.944, 0),
      atom("H", -1.215, -0.944, 0),
      atom("H", 1.215, 0.944, 0),
      atom("H", 1.215, -0.944, 0),
    ],
    bonds: [bond(0, 1, 2), bond(0, 2), bond(0, 3), bond(1, 4), bond(1, 5)],
  },
  {
    id: "ethyne",
    name: "Ethyne",
    formula: "C₂H₂",
    shape: "Linear · 180°",
    lesson:
      "A carbon–carbon triple bond counts as three bonds toward each carbon’s valency. Each carbon has one remaining C–H bond.",
    slots: [
      atom("C", -0.6, 0, 0),
      atom("C", 0.6, 0, 0),
      atom("H", -1.66, 0, 0),
      atom("H", 1.66, 0, 0),
    ],
    bonds: [bond(0, 1, 3), bond(0, 2), bond(1, 3)],
  },
  {
    id: "ethanol",
    name: "Ethanol",
    formula: "C₂H₆O",
    shape: "Tetrahedral carbon centres · hydroxyl group",
    lesson:
      "Build a C–C–O skeleton and add six hydrogens. The O–H group identifies this alcohol; oxygen forms two single bonds.",
    slots: [
      atom("C", -1, 0, 0),
      atom("C", 0.52, 0, 0),
      atom("O", 1.07, 1.31, 0),
      atom("H", -1.36, 1.027, 0),
      atom("H", -1.36, -0.513, 0.89),
      atom("H", -1.36, -0.513, -0.89),
      atom("H", 0.88, -0.52, 0.89),
      atom("H", 0.88, -0.52, -0.89),
      atom("H", 1.8, 1.31, 0.63),
    ],
    bonds: [
      bond(0, 1),
      bond(1, 2),
      bond(0, 3),
      bond(0, 4),
      bond(0, 5),
      bond(1, 6),
      bond(1, 7),
      bond(2, 8),
    ],
  },
];
export const VALENCE: Record<Element, number> = { C: 4, H: 1, O: 2 };
export type MolecularEvent =
  | { type: "choose"; molecule: MoleculeId }
  | { type: "atom"; slot: number; element: Element }
  | { type: "remove"; slot: number }
  | { type: "bond"; a: number; b: number; order: number }
  | { type: "record"; explanation: string };
export interface MolecularState {
  molecule: MoleculeId;
  atoms: Record<number, Element>;
  bonds: { a: number; b: number; order: number }[];
  recorded: boolean;
  builds: {
    molecule: MoleculeId;
    formula: string;
    mass: number;
    explanation: string;
  }[];
  events: MolecularEvent[];
}
export const emptyMolecular = (): MolecularState => ({
  molecule: "methane",
  atoms: {},
  bonds: [],
  recorded: false,
  builds: [],
  events: [],
});
export const moleculeSpec = (id: MoleculeId) =>
  MOLECULES.find((m) => m.id === id)!;
export function atomValence(s: MolecularState, id: number) {
  return s.bonds
    .filter((b) => b.a === id || b.b === id)
    .reduce((n, b) => n + b.order, 0);
}
export function moleculeInventory(s: MolecularState) {
  const counts = { C: 0, H: 0, O: 0 };
  Object.values(s.atoms).forEach((e) => counts[e]++);
  const mass = counts.C * 12.011 + counts.H * 1.008 + counts.O * 15.999;
  return {
    counts,
    mass,
    formula:
      (["C", "H", "O"] as Element[])
        .filter((e) => counts[e] > 0)
        .map((e) => e + (counts[e] === 1 ? "" : String(counts[e])))
        .join("") || "—",
  };
}
export function molecularComplete(s: MolecularState) {
  const spec = moleculeSpec(s.molecule);
  return (
    spec.slots.every(
      (slot, i) =>
        s.atoms[i] === slot.element &&
        atomValence(s, i) === VALENCE[slot.element],
    ) &&
    s.bonds.length === spec.bonds.length &&
    spec.bonds.every((b) =>
      s.bonds.some(
        (v) =>
          v.order === b.order &&
          ((v.a === b.a && v.b === b.b) || (v.a === b.b && v.b === b.a)),
      ),
    )
  );
}
export function molecularStep(
  s: MolecularState,
  e: MolecularEvent,
): MolecularState {
  const fail = (m: string): never => {
    throw new Error(m);
  };
  if (s.events.length >= 500)
    fail("Export this notebook before starting a new session.");
  let n = { ...s, events: [...s.events, e] };
  const spec = moleculeSpec(s.molecule),
    slot = (id: number) =>
      Number.isInteger(id) && id >= 0 && id < spec.slots.length;
  if (e.type === "choose") {
    if (!MOLECULES.some((m) => m.id === e.molecule))
      fail("Choose a supported molecule.");
    n = {
      ...emptyMolecular(),
      molecule: e.molecule,
      builds: s.builds,
      events: n.events,
    };
  } else if (e.type === "atom") {
    if (s.recorded)
      fail("Choose a fresh structure before editing a recorded model.");
    if (
      !slot(e.slot) ||
      !["C", "H", "O"].includes(e.element) ||
      s.atoms[e.slot]
    )
      fail("Choose an empty atomic site and an available element.");
    n.atoms = { ...s.atoms, [e.slot]: e.element };
  } else if (e.type === "remove") {
    if (!slot(e.slot) || s.recorded) fail("Choose an editable atomic site.");
    n.atoms = { ...s.atoms };
    delete n.atoms[e.slot];
    n.bonds = s.bonds.filter((b) => b.a !== e.slot && b.b !== e.slot);
  } else if (e.type === "bond") {
    if (
      s.recorded ||
      !slot(e.a) ||
      !slot(e.b) ||
      e.a === e.b ||
      !s.atoms[e.a] ||
      !s.atoms[e.b] ||
      ![1, 2, 3].includes(e.order)
    )
      fail("Select two placed atoms and a single, double or triple bond.");
    const others = s.bonds.filter(
      (b) => !((b.a === e.a && b.b === e.b) || (b.a === e.b && b.b === e.a)),
    );
    for (const id of [e.a, e.b])
      if (
        others
          .filter((b) => b.a === id || b.b === id)
          .reduce((t, b) => t + b.order, 0) +
          e.order >
        VALENCE[s.atoms[id]]
      )
        fail(
          `${s.atoms[id]} at site ${id + 1} would exceed its normal valency of ${VALENCE[s.atoms[id]]}.`,
        );
    n.bonds = [...others, { a: e.a, b: e.b, order: e.order }];
  } else if (e.type === "record") {
    if (
      s.recorded ||
      !molecularComplete(s) ||
      typeof e.explanation !== "string" ||
      e.explanation.trim().length < 20 ||
      e.explanation.length > 2000
    )
      fail(
        "Complete the correct structure and explain its bonding before recording.",
      );
    if (s.builds.length >= 15) fail("This notebook holds fifteen structures.");
    n.recorded = true;
    n.builds = [
      ...s.builds,
      {
        molecule: s.molecule,
        formula: spec.formula,
        mass: moleculeInventory(s).mass,
        explanation: e.explanation.trim(),
      },
    ];
  } else fail("Unknown molecular modelling action.");
  return n;
}
export function replayMolecular(events: MolecularEvent[]) {
  if (!Array.isArray(events) || events.length > 500)
    throw new Error("Invalid molecular construction log.");
  return events.reduce(molecularStep, emptyMolecular());
}
export function molecularReady(s: MolecularState, conclusion: string) {
  return (
    new Set(s.builds.map((b) => b.molecule)).size >= 2 &&
    conclusion.trim().length >= 30
  );
}
