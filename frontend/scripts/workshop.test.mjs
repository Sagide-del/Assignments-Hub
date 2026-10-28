import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadTypeScript } from "./load-typescript.mjs";
const {
  PRACTICAL_CATALOGUE,
  practicalFor,
  initialPractical,
  transition,
  replayPractical,
  practicalResult,
  practicalComplete,
} = await loadTypeScript(
  new URL("../../backend/src/labs/practical-engine.ts", import.meta.url),
);
function cycle(spec, value = spec.initial) {
  let s = initialPractical(spec);
  s = transition(spec, s, { type: "setting", value });
  for (let i = 0; i < spec.tools.length; i++)
    s = transition(spec, s, {
      type: "place",
      tool: i,
      x: 0,
      z: 0,
      rotation: 0,
    });
  for (let i = 0; i < spec.actions.length; i++)
    s = transition(spec, s, { type: "action", index: i });
  return transition(spec, s, {
    type: "record",
    observation: "A labelled model reading was observed.",
  });
}
test("all 58 original catalogue activities resolve to a 3D practical or dedicated titration", () => {
  const seed = readFileSync(
    new URL("../../backend/prisma/seed-labs-data.ts", import.meta.url),
    "utf8",
  );
  const keys = [...seed.matchAll(/key: '([^']+)'/g)].map((m) => m[1]);
  assert.equal(keys.length, 58);
  assert.equal(PRACTICAL_CATALOGUE.length, 57);
  for (const key of keys)
    if (key !== "ss-chem-10-1") assert.equal(practicalFor({ key }).key, key);
});
test("every authored model produces bounded finite readings across its scale and a replayable procedure", () => {
  for (const spec of PRACTICAL_CATALOGUE) {
    for (let v = spec.min; v <= spec.max; v += spec.step)
      assert.ok(
        Number.isFinite(practicalResult(spec, v, spec.actions.length)),
        spec.key,
      );
    const state = cycle(spec);
    assert.equal(state.trials.length, 1, spec.key);
    assert.deepEqual(replayPractical(spec, state.events), state);
  }
});
test("apparatus placement and procedure order are enforced; changing a variable clears the procedure", () => {
  const spec = practicalFor({ key: "js7-lab3" });
  let s = initialPractical(spec);
  assert.throws(
    () => transition(spec, s, { type: "action", index: 0 }),
    /work mat/,
  );
  assert.throws(
    () =>
      transition(spec, s, { type: "place", tool: 0, x: 99, z: 0, rotation: 0 }),
    /bench/,
  );
  assert.throws(
    () => transition(spec, s, { type: "action", index: 1 }),
    /order/,
  );
  s = cycle(spec);
  assert.throws(
    () =>
      transition(spec, s, { type: "record", observation: "Duplicate result" }),
    /before recording/,
  );
  s = transition(spec, s, { type: "setting", value: 4 });
  assert.equal(s.completed, 0);
  assert.throws(
    () =>
      transition(spec, s, { type: "record", observation: "Another result" }),
    /before recording/,
  );
});
test("cyber simulation demonstrates an exposed scenario then a blocked retest without real network activity", () => {
  const spec = practicalFor({ key: "ss-cs-10-2" });
  let s = initialPractical(spec);
  for (let i = 0; i < 3; i++)
    s = transition(spec, s, {
      type: "place",
      tool: i,
      x: 0,
      z: 0,
      rotation: 0,
    });
  for (let i = 0; i < 3; i++)
    s = transition(spec, s, { type: "action", index: i });
  assert.equal(practicalResult(spec, s.value, s.completed), 0);
  s = transition(spec, s, {
    type: "record",
    observation: "Unprotected scenario events reached the workstation.",
  });
  for (let i = 3; i < 5; i++)
    s = transition(spec, s, { type: "action", index: i });
  assert.equal(practicalResult(spec, s.value, s.completed), 3);
  assert.equal(s.events.filter((e) => e.type === "action").length, 5);
});
test("quantitative models follow their stated relationships", () => {
  const r = (key, value) => practicalResult(practicalFor({ key }), value, 3);
  assert.equal(r("js7-lab3", 6), 0.6);
  assert.equal(r("ss-cs-10-4", 5), 10);
  assert.equal(r("ss-bio-10-7", 10), 1024);
  assert.equal(r("ss-tech-10-2", 10), 5);
  assert.equal(r("ss-phy-10-7", 2), 250);
  assert.equal(r("js9-lab7", 280), 0);
  assert.ok(Math.abs(r("ss-phy-10-2", 1) / r("ss-phy-10-2", 0.25) - 2) < 1e-9);
});
test("completion requires distinct conditions, full execution and an evidence-based conclusion", () => {
  const spec = practicalFor({ key: "ss-tech-10-2" });
  let s = cycle(spec);
  s = { ...s, trials: [...s.trials, ...s.trials, ...s.trials] };
  assert.equal(
    practicalComplete(
      spec,
      s,
      "A sufficiently detailed interpretation of these readings.",
    ),
    false,
  );
  s.trials[2] = { ...s.trials[2], setting: spec.min };
  assert.equal(
    practicalComplete(
      spec,
      s,
      "A sufficiently detailed interpretation of these readings.",
    ),
    true,
  );
  assert.equal(practicalComplete(spec, s, "done"), false);
});

test("moving used equipment invalidates the procedure and a misaligned building cannot be load-tested", () => {
  const spec = practicalFor({ key: "ss-tech-10-2" });
  let s = cycle(spec);
  s = transition(spec, s, { type: "place", tool: 1, x: 1, z: 0, rotation: 0 });
  assert.equal(s.completed, 0);
  for (let i = 0; i < 3; i++)
    s = transition(spec, s, { type: "action", index: i });
  assert.throws(
    () =>
      transition(spec, s, {
        type: "record",
        observation: "Before testing the load.",
      }),
    /before recording/,
  );
  assert.throws(
    () => transition(spec, s, { type: "action", index: 3 }),
    /Align/,
  );
});
