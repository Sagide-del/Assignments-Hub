import { blankRoll } from "./piano-roll-model";
import { renderRoll } from "./piano-roll-audio";
import type { MasterProject } from "./master-model";
export async function renderKeyboard(p: MasterProject) {
  const roll = p.pianoSource
    ? structuredClone(p.pianoSource)
    : blankRoll("Master keyboard");
  roll.bars = p.sourceBars[2];
  roll.bpm = p.mix.draft.bpm;
  if (!p.pianoSource) {
    roll.tracks[0].notes = p.mix.piano.map((n, i) => ({
      id: `master-${i}`,
      start: n.step / 4,
      duration: n.length / 4,
      midi: n.midi,
      velocity: n.velocity,
    }));
    roll.tracks[1].notes = [];
  }
  roll.tracks = roll.tracks.map((t) => ({
    ...t,
    notes: t.notes.map((n) => ({ ...n, midi: n.midi + p.mix.transpose })),
  }));
  const audio = await renderRoll(roll, false, false),
    source = audio.getChannelData(0),
    rate = 22050,
    frames = Math.ceil(((p.sourceBars[2] * 240) / p.mix.draft.bpm) * rate),
    out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    const at = (i * audio.sampleRate) / rate,
      lo = Math.floor(at),
      fraction = at - lo;
    out[i] =
      (source[lo] ?? 0) * (1 - fraction) + (source[lo + 1] ?? 0) * fraction;
  }
  return out;
}
