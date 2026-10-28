import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { loadTypeScript } from "./load-typescript.mjs";
const e = await loadTypeScript(
  new URL("../../backend/src/labs/respiratory-engine.ts", import.meta.url),
);
const { assessStudio } = await loadTypeScript(
  new URL("../../backend/src/labs/studio-engine.ts", import.meta.url),
);
function events() {
  const events = e.RESPIRATORY_STRUCTURES.filter((s) => s !== "alveoli").map(
    (structure) => ({ type: "inspect", structure }),
  );
  for (const config of [
    { rate: 12, tidalVolume: 0.5 },
    { rate: 24, tidalVolume: 0.25 },
    { rate: 8, tidalVolume: 0.75 },
  ])
    events.push(
      { type: "configure", config },
      {
        type: "observe",
        cycles: 2,
        elapsed: 120 / config.rate,
        notes:
          "The diaphragm descended and the lungs expanded during inspiration.",
      },
    );
  return events;
}
const conclusion =
  "Rapid shallow breathing moved the same total volume but delivered less fresh air to the alveoli because the fixed conducting-airway dead space was filled more often.";
test("the shipped atlas contains five named lung lobes, trachea, diaphragm and real bronchial meshes with embedded attribution", () => {
  const base = new URL("../public/stem/anatomy/", import.meta.url),
    bytes = readFileSync(new URL("respiratory-atlas.glb", base)),
    manifest = JSON.parse(readFileSync(new URL("manifest.json", base)));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const size = bytes.readUInt32LE(12),
    gltf = JSON.parse(bytes.subarray(20, 20 + size).toString());
  for (const name of [
    "right_upper",
    "right_middle",
    "right_lower",
    "left_upper",
    "left_lower",
    "trachea",
    "diaphragm",
  ])
    assert.ok(gltf.nodes.some((n) => n.name === name));
  assert.equal(gltf.nodes.length, 35);
  assert.ok(
    gltf.nodes.filter((n) => n.name.startsWith("airway_")).length >= 20,
  );
  assert.match(gltf.asset.copyright, /Z-Anatomy/);
  assert.equal(
    gltf.asset.extras.license,
    "https://creativecommons.org/licenses/by-sa/4.0/",
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    manifest.sha256,
  );
  assert.ok(bytes.length < 4 * 1024 * 1024);
});
test("equal minute volumes can have different alveolar ventilation under the stated adult dead-space assumption", () => {
  const resting = e.ventilation({ rate: 12, tidalVolume: 0.5 }),
    shallow = e.ventilation({ rate: 24, tidalVolume: 0.25 }),
    deeper = e.ventilation({ rate: 8, tidalVolume: 0.75 });
  for (const v of [resting, shallow, deeper])
    assert.equal(v.minuteVentilation, 6);
  assert.ok(Math.abs(resting.alveolarVentilation - 4.2) < 1e-9);
  assert.ok(Math.abs(shallow.alveolarVentilation - 2.4) < 1e-9);
  assert.ok(Math.abs(deeper.alveolarVentilation - 4.8) < 1e-9);
});
test("breathing volume and flow are continuous, bounded and agree with the phase of the cycle", () => {
  const c = { rate: 12, tidalVolume: 0.5 };
  let total = 0;
  for (let t = 0; t < 5; t += 0.002) {
    const s = e.breathingSample(t, c);
    assert.ok(s.fraction >= 0 && s.fraction <= 1);
    assert.ok(s.volume >= 2.5 && s.volume <= 3);
    assert.ok(s.inhale ? s.flow >= -1e-10 : s.flow <= 1e-10);
    const derivative =
      (e.breathingSample(t + 0.00001, c).volume - s.volume) / 0.00001;
    assert.ok(Math.abs(derivative - s.flow) < 0.0001);
    total += s.flow * 0.002;
  }
  assert.ok(Math.abs(total) < 0.001);
  assert.equal(e.breathingSample(0, c).fraction, 0);
  assert.equal(e.breathingSample(2, c).fraction, 1);
});
test("observation replay requires complete breaths, descriptions and a new condition/window before a repeat", () => {
  const state = e.replayRespiratory(events());
  assert.equal(state.observations.length, 3);
  assert.equal(state.observations[1].minuteVentilation, 6);
  assert.throws(
    () =>
      e.replayRespiratory([
        ...events(),
        {
          type: "observe",
          cycles: 2,
          elapsed: 15,
          notes: "Another repeated observation.",
        },
      ]),
    /Reset/,
  );
  assert.throws(
    () =>
      e.replayRespiratory([
        {
          type: "observe",
          cycles: 1,
          elapsed: 5,
          notes: "Only one complete breath.",
        },
      ]),
    /two complete/,
  );
  assert.throws(
    () =>
      e.replayRespiratory([
        {
          type: "observe",
          cycles: 2,
          elapsed: 1,
          notes: "An impossible timing interval.",
        },
      ]),
    /two complete/,
  );
});
test("unsafe model inputs and invented structures are rejected", () => {
  for (const config of [
    { rate: 0, tidalVolume: 0.5 },
    { rate: 99, tidalVolume: 0.5 },
    { rate: 12, tidalVolume: NaN },
    { rate: 12, tidalVolume: 0.05 },
  ])
    assert.throws(
      () => e.replayRespiratory([{ type: "configure", config }]),
      /Choose/,
    );
  assert.throws(
    () => e.replayRespiratory([{ type: "inspect", structure: "invented" }]),
    /structure/,
  );
  assert.throws(
    () =>
      e.replayRespiratory(
        Array(501).fill({ type: "inspect", structure: "trachea" }),
      ),
    /Invalid/,
  );
});
test("completion requires anatomy inspection and a meaningful comparison; the server derives the report", () => {
  const s = e.replayRespiratory(events());
  assert.equal(e.respiratoryReady(s, conclusion), true);
  assert.equal(e.respiratoryReady({ ...s, inspected: [] }, conclusion), false);
  assert.equal(e.respiratoryReady(s, "done"), false);
  const report = assessStudio("respiration", {
    version: "respiratory-studio-v1",
    events: events(),
    conclusion,
  });
  assert.equal(report.observations.length, 3);
  assert.ok(Math.abs(report.observations[1].alveolarVentilation - 2.4) < 1e-9);
  assert.throws(
    () =>
      assessStudio("cyber", {
        version: "respiratory-studio-v1",
        events: events(),
        conclusion,
      }),
    /match/,
  );
});
