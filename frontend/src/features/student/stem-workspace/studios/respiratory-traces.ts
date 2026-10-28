import {
  breathingSample,
  type RespiratoryConfig,
} from "../../../../../../backend/src/labs/respiratory-engine";
// Fixed example mouth-gas fractions, not a metabolism or blood-gas model.
export const GAS_EXAMPLE = {
  inspiredOxygen: 0.2095,
  expiredOxygen: 0.16,
  expiredCarbonDioxide: 0.04,
} as const;
export interface RespiratoryTracePoint {
  time: number;
  volume: number;
  airflow: number;
  oxygenIn: number;
  oxygenOut: number;
  carbonDioxideOut: number;
}
export function respiratoryTracePoint(
  time: number,
  config: RespiratoryConfig,
): RespiratoryTracePoint {
  const s = breathingSample(Math.max(0, time), config),
    inflow = Math.max(0, s.flow),
    outflow = Math.max(0, -s.flow);
  return {
    time: Math.max(0, time),
    volume: (s.volume - 2.5) * 1000,
    airflow: s.flow,
    oxygenIn: inflow * GAS_EXAMPLE.inspiredOxygen * 1000,
    oxygenOut: outflow * GAS_EXAMPLE.expiredOxygen * 1000,
    carbonDioxideOut: outflow * GAS_EXAMPLE.expiredCarbonDioxide * 1000,
  };
}
export function respiratoryTraceWindow(
  time: number,
  config: RespiratoryConfig,
  seconds = 20,
  count = 240,
) {
  const now = Number.isFinite(time) ? Math.max(0, time) : 0,
    window = Number.isFinite(seconds) && seconds > 0 ? seconds : 20,
    samples = Number.isFinite(count)
      ? Math.min(600, Math.max(8, Math.round(count)))
      : 240,
    start = Math.max(0, now - window),
    end = Math.max(window, now),
    step = window / samples;
  const points: RespiratoryTracePoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = start + i * step;
    if (t > now + 1e-8) break;
    points.push(respiratoryTracePoint(Math.min(t, now), config));
  }
  if (!points.length || now - points[points.length - 1].time > 1e-7)
    points.push(respiratoryTracePoint(now, config));
  const inspirations: { start: number; end: number }[] = [],
    cycle = 60 / config.rate;
  for (let n = Math.floor(start / cycle); n * cycle <= now; n++) {
    const a = Math.max(start, n * cycle),
      b = Math.min(now, (n + 0.4) * cycle);
    if (b > a) inspirations.push({ start: a, end: b });
  }
  return { start, end, now, points, inspirations };
}
export function gasCarriedPerMinute(config: RespiratoryConfig) {
  const volume = config.rate * config.tidalVolume * 1000;
  return {
    oxygenIn: volume * GAS_EXAMPLE.inspiredOxygen,
    oxygenOut: volume * GAS_EXAMPLE.expiredOxygen,
    carbonDioxideOut: volume * GAS_EXAMPLE.expiredCarbonDioxide,
  };
}
