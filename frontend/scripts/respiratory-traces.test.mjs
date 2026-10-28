import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";
const {
  respiratoryTracePoint,
  respiratoryTraceWindow,
  gasCarriedPerMinute,
  GAS_EXAMPLE,
} = await loadTypeScript(
  new URL(
    "../src/features/student/stem-workspace/studios/respiratory-traces.ts",
    import.meta.url,
  ),
);
const config = { rate: 12, tidalVolume: 0.5 };
test("gas traces distinguish inspired oxygen from oxygen and carbon dioxide carried out", () => {
  const inhaling = respiratoryTracePoint(1, config),
    exhaling = respiratoryTracePoint(3.5, config);
  assert.ok(inhaling.airflow > 0 && inhaling.oxygenIn > 0);
  assert.equal(inhaling.oxygenOut, 0);
  assert.equal(inhaling.carbonDioxideOut, 0);
  assert.ok(
    exhaling.airflow < 0 &&
      exhaling.oxygenOut > 0 &&
      exhaling.carbonDioxideOut > 0,
  );
  assert.equal(exhaling.oxygenIn, 0);
  assert.ok(
    Math.abs(exhaling.oxygenOut / exhaling.carbonDioxideOut - 4) < 1e-10,
  );
});
test("integrated per-breath traces conserve the stated fixed gas fractions and tidal volume", () => {
  let oxygenIn = 0,
    oxygenOut = 0,
    co2Out = 0,
    volumeIn = 0,
    volumeOut = 0;
  const dt = 0.0005;
  for (let t = 0; t < 5; t += dt) {
    const p = respiratoryTracePoint(t, config);
    oxygenIn += p.oxygenIn * dt;
    oxygenOut += p.oxygenOut * dt;
    co2Out += p.carbonDioxideOut * dt;
    volumeIn += Math.max(0, p.airflow) * dt;
    volumeOut += Math.max(0, -p.airflow) * dt;
  }
  assert.ok(Math.abs(volumeIn - 0.5) < 1e-6);
  assert.ok(Math.abs(volumeOut - 0.5) < 1e-6);
  assert.ok(Math.abs(oxygenIn - 500 * GAS_EXAMPLE.inspiredOxygen) < 0.001);
  assert.ok(Math.abs(oxygenOut - 500 * GAS_EXAMPLE.expiredOxygen) < 0.001);
  assert.ok(Math.abs(co2Out - 500 * GAS_EXAMPLE.expiredCarbonDioxide) < 0.001);
});
test("rate changes frequency and instantaneous flow; tidal volume changes wave height", () => {
  const twiceRate = { rate: 24, tidalVolume: 0.5 },
    twiceDepth = { rate: 12, tidalVolume: 1 };
  const base = respiratoryTracePoint(1, config);
  assert.ok(
    Math.abs(
      respiratoryTracePoint(0.5, twiceRate).oxygenIn / base.oxygenIn - 2,
    ) < 1e-10,
  );
  assert.ok(
    Math.abs(
      respiratoryTracePoint(1, twiceDepth).oxygenIn / base.oxygenIn - 2,
    ) < 1e-10,
  );
  assert.ok(Math.abs(respiratoryTracePoint(2, config).volume - 500) < 1e-8);
  assert.ok(
    Math.abs(respiratoryTracePoint(2, twiceDepth).volume - 1000) < 1e-8,
  );
  assert.ok(Math.abs(respiratoryTracePoint(2.5, twiceRate).volume) < 1e-8);
});
test("rolling windows contain only observed times, preserve the live endpoint and bound sampling", () => {
  for (const time of [0, 0.01, 5, 20, 37.7]) {
    const w = respiratoryTraceWindow(time, config, 20);
    assert.equal(w.now, time);
    assert.equal(w.start, Math.max(0, time - 20));
    assert.equal(w.end, Math.max(20, time));
    assert.ok(w.points.every((p) => p.time >= w.start && p.time <= time));
    assert.equal(w.points.at(-1).time, time);
    assert.ok(w.points.every((p) => Object.values(p).every(Number.isFinite)));
    assert.ok(
      w.inspirations.every(
        (b) => b.start >= w.start && b.end <= time && b.end > b.start,
      ),
    );
  }
  assert.ok(
    respiratoryTraceWindow(100, config, 20, 100000).points.length <= 601,
  );
  assert.equal(respiratoryTraceWindow(NaN, config, Infinity).now, 0);
  const fresh = respiratoryTraceWindow(0, { rate: 24, tidalVolume: 0.25 });
  assert.equal(fresh.points.length, 1);
  assert.equal(fresh.points[0].volume, 0);
});
test("minute totals describe carried gas with fixed example fractions, independently of alveolar ventilation", () => {
  const total = gasCarriedPerMinute(config);
  assert.equal(total.oxygenIn, 1257);
  assert.equal(total.oxygenOut, 960);
  assert.equal(total.carbonDioxideOut, 240);
  assert.deepEqual(gasCarriedPerMinute({ rate: 24, tidalVolume: 0.25 }), total);
  assert.deepEqual(gasCarriedPerMinute({ rate: 8, tidalVolume: 0.75 }), total);
  assert.equal(
    gasCarriedPerMinute({ rate: 24, tidalVolume: 0.5 }).oxygenIn,
    2 * total.oxygenIn,
  );
});
