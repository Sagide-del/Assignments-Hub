import {
  CHORDS,
  type InstrumentDraft,
  type ModuleKind,
  type GuitarVoice,
} from "./instrument-model";
// Original procedural instruments: no third-party song recordings or network samples.
export const SAMPLE_RATE = 44100;
const noise = (seed: number) => {
  let state = seed | 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 2147483648 - 1;
  };
};
export function pluck(
  midi: number,
  seconds: number,
  voice: GuitarVoice,
  rate = SAMPLE_RATE,
): Float32Array {
  const frequency = 440 * 2 ** ((midi - 69) / 12),
    period = rate / frequency,
    delay = Math.floor(period),
    fraction = period - delay;
  const ring = new Float32Array(delay + 1),
    random = noise(7919 + midi * 101);
  for (let i = 0; i < ring.length; i++) ring[i] = random() * 0.65;
  const out = new Float32Array(Math.ceil(seconds * rate));
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const at = i % ring.length,
      next = (at + 1) % ring.length,
      raw = ring[at] * fraction + ring[next] * (1 - fraction);
    const filtered =
      voice === "Nylon" ? 0.68 * raw + 0.32 * last : 0.86 * raw + 0.14 * last;
    ring[at] = filtered * (voice === "Nylon" ? 0.994 : 0.997);
    last = raw;
    const attack = Math.min(1, i / (rate * 0.003)),
      release = Math.min(1, (out.length - i) / (rate * 0.06));
    out[i] = filtered * attack * release;
  }
  return out;
}
export function drum(index: number, rate = SAMPLE_RATE): Float32Array {
  const duration = [0.5, 0.24, 0.065, 0.34, 0.38, 0.24, 0.2, 0.08][index],
    out = new Float32Array(Math.ceil(rate * duration)),
    random = noise(4729 + index * 79);
  let previous = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / rate,
      n = random(),
      high = n - previous;
    previous = n;
    let value = 0;
    if (index === 0)
      value =
        Math.sin(
          2 * Math.PI * (48 * t + 90 * 0.018 * (1 - Math.exp(-t / 0.018))),
        ) * Math.exp(-t * 11);
    else if (index === 1)
      value =
        (high * 0.36 + Math.sin(2 * Math.PI * 180 * t) * 0.22) *
        Math.exp(-t * 23);
    else if (index === 2 || index === 3)
      value = high * 0.25 * Math.exp(-t * (index === 2 ? 85 : 18));
    else if (index === 4 || index === 5)
      value =
        Math.sin(
          2 *
            Math.PI *
            ((index === 4 ? 112 : 190) * t +
              22 * 0.03 * (1 - Math.exp(-t / 0.03))),
        ) *
        0.65 *
        Math.exp(-t * 14);
    else if (index === 6)
      value =
        high *
        0.45 *
        Math.exp(-t * 30) *
        (t < 0.03 ? 0.35 + 0.65 * Math.sin(t * 800) ** 2 : 1);
    else
      value =
        high *
        0.23 *
        Math.sin(Math.PI * Math.min(1, t / 0.08)) ** 2 *
        Math.exp(-t * 35);
    out[i] = value * Math.min(1, i / 40);
  }
  return out;
}
export function renderInstrument(
  d: InstrumentDraft,
  kind: ModuleKind,
  rate = SAMPLE_RATE,
): Float32Array {
  const step = 60 / d.bpm / 4,
    seconds = 64 * step,
    out = new Float32Array(Math.ceil(rate * seconds));
  const add = (sound: Float32Array, start: number, gain: number) => {
    const offset = Math.round(start * rate);
    for (let i = 0; i < sound.length && offset + i < out.length; i++)
      out[offset + i] += sound[i] * gain;
  };
  if (kind === "guitar") {
    for (const n of d.melody)
      add(
        pluck(n.midi, Math.min(2, n.length * step + 0.25), d.voice, rate),
        n.step * step,
        0.64,
      );
    d.chords.forEach((name, bar) => {
      CHORDS[name].forEach((midi, i) => {
        for (const beat of [0, 8])
          add(
            pluck(midi, Math.min(2, 8 * step), d.voice, rate),
            (bar * 16 + beat) * step + i * 0.018,
            0.22,
          );
      });
    });
  } else
    d.drums.forEach((row, instrument) => {
      const sound = drum(instrument, rate);
      for (let bar = 0; bar < 4; bar++)
        row.forEach((hit, i) => {
          if (hit) add(sound, (bar * 16 + i) * step, 0.7);
        });
    });
  // Short stereo-free room taps; bounded soft limiting protects stacked chords.
  const dry = out.slice();
  for (const [delay, gain] of [
    [0.071, 0.1],
    [0.113, 0.065],
  ]) {
    const offset = Math.floor(delay * rate);
    for (let i = offset; i < out.length; i++) out[i] += dry[i - offset] * gain;
  }
  for (let i = 0; i < out.length; i++)
    out[i] =
      Math.tanh(out[i] * 0.85) *
      0.8 *
      Math.min(1, (out.length - i) / (rate * 0.015));
  return out;
}
export function wavBytes(
  samples: Float32Array,
  rate = SAMPLE_RATE,
): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2),
    v = new DataView(buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) =>
    v.setInt16(
      44 + i * 2,
      Math.round(Math.max(-1, Math.min(1, s)) * 32767),
      true,
    ),
  );
  return buffer;
}
