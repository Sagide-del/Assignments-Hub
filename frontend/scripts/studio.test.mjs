import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";
const e = await loadTypeScript(
  new URL("../../backend/src/labs/studio-engine.ts", import.meta.url),
);
const conclusion =
  "The protected retest differed from the baseline. Each defence must match the observed threat.";
function workstation() {
  return [
    { type: "power", on: true },
    { type: "boot" },
    { type: "network", connected: true },
  ];
}
test("workstation requires power, startup and a network before running a scenario", () => {
  assert.throws(
    () => e.replayCyber([{ type: "run", scenario: "service" }]),
    /Power on/,
  );
  assert.throws(
    () =>
      e.replayCyber([
        { type: "power", on: true },
        { type: "run", scenario: "service" },
      ]),
    /Power on/,
  );
  assert.throws(
    () =>
      e.replayCyber([
        { type: "power", on: true },
        { type: "boot" },
        { type: "run", scenario: "service" },
      ]),
    /Connect/,
  );
  let s = e.replayCyber([...workstation(), { type: "power", on: false }]);
  assert.equal(s.ready, false);
  assert.equal(s.connected, false);
});
test("a service rule does not protect sign-ins; an appropriate sign-in limit blocks repeated attempts", () => {
  let events = [
    ...workstation(),
    { type: "run", scenario: "service" },
    {
      type: "policy",
      policy: { denyRemoteService: true, loginLimit: 0, quarantine: false },
    },
    { type: "run", scenario: "service" },
    { type: "run", scenario: "signin" },
  ];
  let s = e.replayCyber(events);
  assert.deepEqual(
    s.runs.map((r) => r.blocked),
    [0, 5, 0],
  );
  assert.equal(e.cyberReady(s, conclusion), true);
  s = e.replayCyber([
    ...events,
    {
      type: "policy",
      policy: { denyRemoteService: true, loginLimit: 5, quarantine: false },
    },
    { type: "run", scenario: "signin" },
  ]);
  assert.equal(s.runs.at(-1).passed, false);
  s = e.replayCyber([
    ...events,
    {
      type: "policy",
      policy: { denyRemoteService: true, loginLimit: 3, quarantine: false },
    },
    { type: "run", scenario: "signin" },
  ]);
  assert.equal(s.runs.at(-1).blocked, 2);
  assert.equal(s.runs.at(-1).passed, true);
});
test("suspicious-mail reporting and attachment quarantine provide independent defences", () => {
  const baseline = [...workstation(), { type: "run", scenario: "attachment" }];
  assert.equal(e.replayCyber(baseline).runs[0].blocked, 0);
  assert.equal(
    e
      .replayCyber([
        ...baseline,
        { type: "email", decision: "report" },
        { type: "run", scenario: "attachment" },
      ])
      .runs.at(-1).blocked,
    1,
  );
  assert.equal(
    e
      .replayCyber([
        ...baseline,
        {
          type: "policy",
          policy: { denyRemoteService: false, loginLimit: 0, quarantine: true },
        },
        { type: "run", scenario: "attachment" },
      ])
      .runs.at(-1).blocked,
    1,
  );
});
test("completion needs a baseline, a protected retest and multiple scenarios; malformed policies and cross-studio evidence fail", () => {
  const protectedOnly = [
    ...workstation(),
    {
      type: "policy",
      policy: { denyRemoteService: true, loginLimit: 3, quarantine: true },
    },
    { type: "run", scenario: "service" },
    { type: "run", scenario: "signin" },
    { type: "run", scenario: "attachment" },
  ];
  assert.equal(e.cyberReady(e.replayCyber(protectedOnly), conclusion), false);
  assert.throws(
    () =>
      e.replayCyber([
        ...workstation(),
        {
          type: "policy",
          policy: {
            denyRemoteService: true,
            loginLimit: 999,
            quarantine: false,
          },
        },
      ]),
    /supported/,
  );
  assert.throws(
    () =>
      e.assessStudio("pendulum", {
        version: "cyber-studio-v1",
        events: [],
        conclusion,
      }),
    /match/,
  );
});
test("nonlinear period approaches the small-angle result and increases with amplitude, independently of mass", () => {
  assert.ok(
    Math.abs(e.pendulumPeriod(1, 5) / (2 * Math.PI * Math.sqrt(1 / 9.81)) - 1) <
      0.001,
  );
  assert.ok(e.pendulumPeriod(1, 40) > e.pendulumPeriod(1, 15));
  assert.equal(e.pendulumPeriod(1, 15) / e.pendulumPeriod(0.25, 15), 2);
});
test("numerically timed full oscillations agree with the nonlinear period for both release directions", () => {
  for (const angle of [5, 15, 40, -25]) {
    const length = 0.4;
    let theta = (angle * Math.PI) / 180,
      omega = 0,
      time = 0,
      cycles = 0;
    for (let i = 0; i < 10000 && cycles < 3; i++) {
      const prev = omega;
      [theta, omega] = e.integratePendulum(theta, omega, length, 1 / 240);
      time += 1 / 240;
      if (
        angle > 0
          ? prev > 0 && omega <= 0 && theta > 0
          : prev < 0 && omega >= 0 && theta < 0
      )
        cycles++;
    }
    assert.equal(cycles, 3);
    assert.ok(Math.abs(time / 3 / e.pendulumPeriod(length, angle) - 1) < 0.002);
  }
});
test("pendulum rejects duplicate, untimed, impossible and mismatched measurements", () => {
  const config = { length: 0.8, angle: 15, mass: 100 },
    elapsed = e.pendulumPeriod(0.8, 15) * 10;
  assert.throws(
    () => e.replayPendulum([{ type: "reading", cycles: 10, elapsed }]),
    /running/,
  );
  let events = [
    { type: "configure", config },
    { type: "release" },
    { type: "reading", cycles: 10, elapsed },
  ];
  assert.equal(e.replayPendulum(events).readings.length, 1);
  assert.throws(
    () =>
      e.replayPendulum([...events, { type: "reading", cycles: 10, elapsed }]),
    /running/,
  );
  assert.throws(
    () =>
      e.replayPendulum([
        { type: "configure", config: { ...config, length: 0 } },
      ]),
    /length/,
  );
  assert.throws(
    () =>
      e.replayPendulum([
        { type: "configure", config },
        { type: "release" },
        { type: "reading", cycles: 10, elapsed: 1 },
      ]),
    /running/,
  );
});
test("pendulum report derives periods from timed evidence and requires a comparison across lengths", () => {
  let events = [];
  for (const length of [0.4, 0.8, 0.8])
    events.push(
      { type: "configure", config: { length, angle: 15, mass: 100 } },
      { type: "release" },
      {
        type: "reading",
        cycles: 10,
        elapsed: e.pendulumPeriod(length, 15) * 10,
      },
    );
  const report = e.assessStudio("pendulum", {
    version: "pendulum-studio-v1",
    events,
    conclusion,
  });
  assert.equal(report.readings.length, 3);
  assert.ok(report.readings[1].period > report.readings[0].period);
});
