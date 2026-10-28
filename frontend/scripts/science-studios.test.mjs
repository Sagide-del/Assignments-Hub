import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";
const starch = await loadTypeScript(
  new URL("../../backend/src/labs/starch-engine.ts", import.meta.url),
);
const molecular = await loadTypeScript(
  new URL("../../backend/src/labs/molecular-engine.ts", import.meta.url),
);
const { assessStudio } = await loadTypeScript(
  new URL("../../backend/src/labs/studio-engine.ts", import.meta.url),
);
function leaf(sample) {
  return [
    { type: "sample", sample },
    { type: "ppe" },
    { type: "burner", on: true },
    ...Array.from({ length: 8 }, () => ({ type: "heat", seconds: 2 })),
    { type: "leaf-water" },
    ...Array.from({ length: 3 }, () => ({ type: "heat", seconds: 10 })),
    { type: "burner", on: false },
    { type: "ethanol-fill" },
    { type: "leaf-ethanol" },
    { type: "tube-bath" },
    ...Array.from({ length: 6 }, () => ({ type: "heat", seconds: 10 })),
    { type: "rinse" },
    { type: "dish" },
    { type: "load-iodine" },
    { type: "iodine" },
    {
      type: "record",
      result: starch.starchResult(sample),
      explanation:
        "The observed iodine colour indicates whether starch is present.",
    },
  ];
}
const conclusion =
  "The light-grown leaf contains starch while the dark control does not; control species, leaf age and exposure duration.";
test("starch procedure rejects flame with ethanol, premature transfers and incorrect interpretations", () => {
  assert.throws(
    () => starch.replayStarch([{ type: "burner", on: true }]),
    /eye protection/,
  );
  assert.throws(
    () => starch.replayStarch([{ type: "ppe" }, { type: "leaf-water" }]),
    /hot water/,
  );
  const events = leaf("light"),
    index = events.findIndex((e) => e.type === "ethanol-fill");
  assert.throws(
    () =>
      starch.replayStarch([
        ...events.slice(0, index + 1),
        { type: "burner", on: true },
      ]),
    /ethanol/,
  );
  assert.throws(
    () =>
      starch.replayStarch([
        ...events.slice(0, index - 1),
        { type: "ethanol-fill" },
      ]),
    /Extinguish/,
  );
  assert.throws(
    () =>
      starch.replayStarch([
        ...events.slice(0, -1),
        { type: "record", result: "yellow-brown", explanation: conclusion },
      ]),
    /interpretation/,
  );
  assert.throws(
    () => starch.replayStarch([{ type: "heat", seconds: Infinity }]),
    /interval/,
  );
});
test("server derives paired light/dark results and requires the control", () => {
  assert.throws(
    () =>
      assessStudio("starch", {
        version: "starch-studio-v1",
        events: leaf("light"),
        conclusion,
      }),
    /dark control/,
  );
  const report = assessStudio("starch", {
    version: "starch-studio-v1",
    events: [...leaf("light"), ...leaf("dark")],
    conclusion,
  });
  assert.deepEqual(
    report.trials.map((t) => t.result),
    ["blue-black", "yellow-brown"],
  );
  assert.ok(
    report.trials.every((t) => t.boilSeconds === 30 && t.extractSeconds === 60),
  );
  assert.equal(
    starch.replayStarch(leaf("variegated")).trials[0].result,
    "patchy",
  );
  assert.throws(
    () =>
      assessStudio("organic", {
        version: "starch-studio-v1",
        events: leaf("light"),
        conclusion,
      }),
    /does not match/,
  );
});
function build(id) {
  const spec = molecular.moleculeSpec(id);
  return [
    { type: "choose", molecule: id },
    ...spec.slots.map((s, slot) => ({
      type: "atom",
      slot,
      element: s.element,
    })),
    ...spec.bonds.map((b) => ({ type: "bond", ...b })),
    {
      type: "record",
      explanation:
        "Bond order and three-dimensional geometry match the valencies of each atom.",
    },
  ];
}
test("all five structures construct with correct stoichiometry and valency", () => {
  for (const id of ["water", "methane", "ethene", "ethyne", "ethanol"]) {
    const s = molecular.replayMolecular(build(id));
    assert.ok(molecular.molecularComplete(s));
    assert.equal(s.builds.length, 1);
  }
  assert.equal(
    molecular.moleculeInventory(molecular.replayMolecular(build("ethanol")))
      .formula,
    "C2H6O",
  );
  const methane = molecular.moleculeSpec("methane");
  const [a, b] = methane.slots.slice(1, 3).map((a) => a.position);
  const angle =
    (Math.acos(a.reduce((n, x, i) => n + x * b[i], 0) / 1.09 ** 2) * 180) /
    Math.PI;
  assert.ok(Math.abs(angle - 109.47) < 0.01);
});
test("invalid valency, self bonds, false elements and incomplete structures cannot be recorded", () => {
  const prefix = [
    { type: "atom", slot: 0, element: "C" },
    { type: "atom", slot: 1, element: "H" },
  ];
  assert.throws(
    () =>
      molecular.replayMolecular([
        ...prefix,
        { type: "bond", a: 0, b: 1, order: 2 },
      ]),
    /valency/,
  );
  assert.throws(
    () =>
      molecular.replayMolecular([
        ...prefix,
        { type: "bond", a: 0, b: 0, order: 1 },
      ]),
    /two placed atoms/,
  );
  assert.throws(
    () => molecular.replayMolecular([{ type: "atom", slot: 0, element: "Na" }]),
    /available element/,
  );
  assert.throws(
    () =>
      molecular.replayMolecular([
        ...prefix,
        { type: "record", explanation: conclusion },
      ]),
    /correct structure/,
  );
  const s = molecular.replayMolecular([
    ...prefix,
    { type: "bond", a: 0, b: 1, order: 1 },
    { type: "remove", slot: 1 },
  ]);
  assert.equal(s.bonds.length, 0);
});
test("server requires two distinct structures and rejects a mismatched studio", () => {
  assert.throws(
    () =>
      assessStudio("organic", {
        version: "molecular-studio-v1",
        events: build("methane"),
        conclusion,
      }),
    /two different/,
  );
  const report = assessStudio("organic", {
    version: "molecular-studio-v1",
    events: [...build("ethene"), ...build("ethyne")],
    conclusion,
  });
  assert.deepEqual(
    report.builds.map((b) => b.formula),
    ["C₂H₄", "C₂H₂"],
  );
  assert.throws(
    () =>
      assessStudio("starch", {
        version: "molecular-studio-v1",
        events: build("ethene"),
        conclusion,
      }),
    /does not match/,
  );
});
