import { renderInstrument } from "./instrument-audio";
import { activeTrack, type BeatMix } from "./beat-model";
export function renderBeat(p: BeatMix, rate = 44100): Float32Array {
  const step = 60 / p.draft.bpm / 4,
    out = new Float32Array(Math.ceil(p.draft.chords.length * 16 * step * rate));
  for (const i of [0, 1]) {
    if (!activeTrack(p, i)) continue;
    const sound = renderInstrument(
      p.draft,
      i === 0 ? "drums" : "guitar",
      rate,
      i === 1 ? p.transpose : 0,
    );
    for (let j = 0; j < out.length; j++)
      out[j] += sound[j] * p.levels[i] * 0.65;
  }
  if (activeTrack(p, 2))
    for (const n of p.piano) {
      const at = Math.round(n.step * step * rate),
        duration = Math.min(n.length * step + 0.18, 2),
        frequency = 440 * 2 ** ((n.midi + p.transpose - 69) / 12);
      for (let j = 0; j < duration * rate && at + j < out.length; j++) {
        const t = j / rate,
          envelope =
            Math.min(1, t / 0.006) *
            Math.exp(-t * 3.5) *
            Math.min(1, (duration - t) / 0.05);
        out[at + j] +=
          (((Math.sin(2 * Math.PI * frequency * t) +
            0.28 * Math.sin(4 * Math.PI * frequency * t) +
            0.1 * Math.sin(6 * Math.PI * frequency * t)) *
            envelope *
            p.levels[2] *
            n.velocity) /
            127) *
          0.16;
      }
    }
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i]) * 0.9;
  return out;
}
