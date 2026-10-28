export type CyberScenario = "service" | "signin" | "attachment";
export interface CyberPolicy {
  denyRemoteService: boolean;
  loginLimit: number;
  quarantine: boolean;
}
export type CyberEvent =
  | { type: "power"; on: boolean }
  | { type: "boot" }
  | { type: "network"; connected: boolean }
  | { type: "policy"; policy: CyberPolicy }
  | { type: "email"; decision: "report" | "open" }
  | { type: "run"; scenario: CyberScenario };
export interface CyberRun {
  scenario: CyberScenario;
  attempted: number;
  blocked: number;
  passed: boolean;
  policy: CyberPolicy;
  emailReported: boolean;
}
export interface CyberState {
  on: boolean;
  ready: boolean;
  connected: boolean;
  policy: CyberPolicy;
  emailReported: boolean;
  runs: CyberRun[];
  events: CyberEvent[];
}
export const emptyCyber = (): CyberState => ({
  on: false,
  ready: false,
  connected: false,
  policy: { denyRemoteService: false, loginLimit: 0, quarantine: false },
  emailReported: false,
  runs: [],
  events: [],
});
export function cyberStep(s: CyberState, e: CyberEvent): CyberState {
  const fail = (m: string): never => {
    throw new Error(m);
  };
  if (s.events.length >= 500)
    fail("Export this notebook before starting a new session.");
  let n = { ...s, events: [...s.events, e] };
  if (e.type === "power") {
    if (typeof e.on !== "boolean" || e.on === s.on)
      fail("Use the system unit power button to change its power state.");
    n.on = e.on;
    n.ready = false;
    n.connected = false;
    n.emailReported = false;
  } else if (e.type === "boot") {
    if (!s.on || s.ready) fail("The computer must be powered on and starting.");
    n.ready = true;
  } else {
    if (!s.on || !s.ready)
      fail("Power on the system unit and wait for the desktop.");
    if (e.type === "network") {
      if (typeof e.connected !== "boolean") fail("Invalid network setting.");
      n.connected = e.connected;
    } else if (e.type === "policy") {
      const p = e.policy;
      if (
        !p ||
        typeof p.denyRemoteService !== "boolean" ||
        typeof p.quarantine !== "boolean" ||
        ![0, 3, 5].includes(p.loginLimit)
      )
        fail("Choose a supported security policy.");
      n.policy = { ...p };
    } else if (e.type === "email") {
      if (!s.connected || !["report", "open"].includes(e.decision))
        fail("Connect the practice network first.");
      n.emailReported = e.decision === "report";
    } else if (e.type === "run") {
      if (!s.connected)
        fail("Connect the practice network before running a scenario.");
      if (!["service", "signin", "attachment"].includes(e.scenario))
        fail("Unknown practice scenario.");
      if (s.runs.length >= 30)
        fail("This notebook holds thirty scenario runs.");
      const attempted = e.scenario === "attachment" ? 1 : 5,
        blocked =
          e.scenario === "service"
            ? s.policy.denyRemoteService
              ? 5
              : 0
            : e.scenario === "signin"
              ? s.policy.loginLimit
                ? Math.max(0, 5 - s.policy.loginLimit)
                : 0
              : s.policy.quarantine || s.emailReported
                ? 1
                : 0;
      n.runs = [
        ...s.runs,
        {
          scenario: e.scenario,
          attempted,
          blocked,
          passed:
            e.scenario === "signin" ? blocked >= 2 : blocked === attempted,
          policy: { ...s.policy },
          emailReported: s.emailReported,
        },
      ];
    } else fail("Unknown workstation action.");
  }
  return n;
}
export function replayCyber(events: CyberEvent[]) {
  if (!Array.isArray(events) || events.length > 500)
    throw new Error("Invalid workstation log.");
  return events.reduce(cyberStep, emptyCyber());
}
export function cyberReady(s: CyberState, conclusion: string) {
  return (
    s.runs.length >= 3 &&
    new Set(s.runs.map((r) => r.scenario)).size >= 2 &&
    s.runs.some(
      (r, i) =>
        r.passed &&
        s.runs
          .slice(0, i)
          .some((b) => b.scenario === r.scenario && b.blocked === 0),
    ) &&
    conclusion.trim().length >= 30
  );
}
export interface PendulumConfig {
  length: number;
  angle: number;
  mass: number;
}
export type PendulumEvent =
  | { type: "configure"; config: PendulumConfig }
  | { type: "release" }
  | { type: "reading"; cycles: number; elapsed: number };
export interface PendulumReading extends PendulumConfig {
  cycles: number;
  elapsed: number;
  period: number;
  reference: number;
}
export interface PendulumState {
  config: PendulumConfig;
  released: boolean;
  readings: PendulumReading[];
  events: PendulumEvent[];
}
export const emptyPendulum = (): PendulumState => ({
  config: { length: 1, angle: 15, mass: 100 },
  released: false,
  readings: [],
  events: [],
});
export function pendulumPeriod(length: number, angle: number) {
  let a = 1,
    b = Math.cos((Math.abs(angle) * Math.PI) / 360);
  for (let i = 0; i < 12; i++) {
    const next = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = next;
  }
  return (2 * Math.PI * Math.sqrt(length / 9.81)) / a;
}
export function pendulumStep(
  s: PendulumState,
  e: PendulumEvent,
): PendulumState {
  if (s.events.length >= 500)
    throw new Error("Export this notebook before starting another session.");
  let n = { ...s, events: [...s.events, e] };
  if (e.type === "configure") {
    const c = e.config;
    if (
      !c ||
      ![c.length, c.angle, c.mass].every(Number.isFinite) ||
      c.length < 0.2 ||
      c.length > 1.5 ||
      Math.abs(c.angle) < 5 ||
      Math.abs(c.angle) > 40 ||
      c.mass < 50 ||
      c.mass > 500
    )
      throw new Error(
        "Use a length from 0.20–1.50 m, angle 5–40° and mass 50–500 g.",
      );
    n.config = { ...c };
    n.released = false;
  } else if (e.type === "release") {
    if (s.released)
      throw new Error("Reset the apparatus before another release.");
    n.released = true;
  } else if (e.type === "reading") {
    const reference = pendulumPeriod(s.config.length, s.config.angle);
    if (
      !s.released ||
      !Number.isInteger(e.cycles) ||
      e.cycles < 1 ||
      e.cycles > 20 ||
      !Number.isFinite(e.elapsed) ||
      Math.abs(e.elapsed / e.cycles / reference - 1) > 0.015
    )
      throw new Error(
        "Record a complete oscillation interval from the running apparatus.",
      );
    if (s.readings.length >= 20)
      throw new Error("This notebook holds twenty measurements.");
    n.readings = [
      ...s.readings,
      {
        ...s.config,
        cycles: e.cycles,
        elapsed: e.elapsed,
        period: e.elapsed / e.cycles,
        reference,
      },
    ];
    n.released = false;
  } else throw new Error("Unknown pendulum action.");
  return n;
}
export function replayPendulum(events: PendulumEvent[]) {
  if (!Array.isArray(events) || events.length > 500)
    throw new Error("Invalid pendulum log.");
  return events.reduce(pendulumStep, emptyPendulum());
}
export function pendulumReady(s: PendulumState, conclusion: string) {
  return (
    s.readings.length >= 3 &&
    new Set(s.readings.map((r) => r.length)).size >= 2 &&
    conclusion.trim().length >= 30
  );
}
// RK4 integrates theta'' = -g/L sin(theta); time is simulated seconds.
export function integratePendulum(
  theta: number,
  omega: number,
  length: number,
  dt: number,
): [number, number] {
  const f = (t: number) => (-9.81 / length) * Math.sin(t),
    a1 = omega,
    b1 = f(theta),
    a2 = omega + (b1 * dt) / 2,
    b2 = f(theta + (a1 * dt) / 2),
    a3 = omega + (b2 * dt) / 2,
    b3 = f(theta + (a2 * dt) / 2),
    a4 = omega + b3 * dt,
    b4 = f(theta + a3 * dt);
  return [
    theta + (dt * (a1 + 2 * a2 + 2 * a3 + a4)) / 6,
    omega + (dt * (b1 + 2 * b2 + 2 * b3 + b4)) / 6,
  ];
}
export interface StudioEvidence {
  version: string;
  events: (CyberEvent | PendulumEvent)[];
  conclusion: string;
}
export function assessStudio(kind: string, e: StudioEvidence) {
  if (!e || typeof e.conclusion !== "string" || e.conclusion.length > 5000)
    throw new Error("Provide a practical conclusion.");
  if (kind === "cyber" && e.version === "cyber-studio-v1") {
    const s = replayCyber(e.events as CyberEvent[]);
    if (!cyberReady(s, e.conclusion))
      throw new Error(
        "Compare an unprotected scenario with its protected retest, test a second scenario and explain your findings.",
      );
    return {
      ...e,
      runs: s.runs,
      model:
        "Contained workstation and rule-based network simulation; no external connections or executable attacks.",
    };
  }
  if (kind === "pendulum" && e.version === "pendulum-studio-v1") {
    const s = replayPendulum(e.events as PendulumEvent[]);
    if (!pendulumReady(s, e.conclusion))
      throw new Error(
        "Record three measurements across two lengths and explain your evidence.",
      );
    return {
      ...e,
      readings: s.readings,
      model:
        "Nonlinear ideal pendulum at g=9.81 m/s²; no damping, string elasticity or real sensor noise. Student-reported virtual measurements.",
    };
  }
  throw new Error("This studio report does not match the activity.");
}
