import {
  newVocals,
  vocalAudible,
  placeVocal,
  vocalWindow,
} from "./vocal-model";
import { voiceBus, updateVoice, type VoiceBus } from "./vocal-audio";
import { renderBeat } from "./beat-audio";
import { activeTrack } from "./beat-model";
import type { MasterProject } from "./master-model";
export const MASTER_RATE = 22050;
// Each isolated stem uses the same beat-based clock. Clip placement never changes pitch or tempo.
export function renderMasterStems(
  p: MasterProject,
  rate = MASTER_RATE,
  keyboard?: Float32Array,
): Float32Array[] {
  const bar = 240 / p.mix.draft.bpm,
    frames = Math.ceil(p.bars * bar * rate);
  return [0, 1, 2].map((track) => {
    const cycleBars = p.sourceBars[track];
    const cycle =
        track === 2 && keyboard
          ? keyboard
          : renderBeat(
              {
                ...p.mix,
                levels: [1, 1, 1],
                muted: [false, false, false],
                solo: track,
              },
              rate,
            ),
      out = new Float32Array(frames);
    for (const clip of p.clips.filter((c) => c.track === track)) {
      const start = Math.round(clip.start * bar * rate),
        length = Math.round(clip.length * bar * rate);
      for (let i = 0; i < length && start + i < frames; i++) {
        const phase = (clip.offset * bar + i / rate) % (cycleBars * bar),
          at = Math.min(cycle.length - 1, Math.floor(phase * rate));
        const fade = Math.min(
          1,
          i / (rate * 0.004),
          (length - i) / (rate * 0.008),
        );
        out[start + i] += cycle[at] * fade;
      }
    }
    if (p.fadeOutBars > 0) {
      const start = Math.floor((p.bars - p.fadeOutBars) * bar * rate);
      for (let i = start; i < out.length; i++)
        out[i] *= (out.length - i) / (out.length - start);
    }
    return out;
  });
}
export interface MasterGraph {
  gains: GainNode[];
  pans: StereoPannerNode[];
  master: GainNode;
  meter: AnalyserNode;
  voice: VoiceBus;
  disconnect: () => void;
}
export function connectMaster(ctx: BaseAudioContext): MasterGraph {
  const master = ctx.createGain(),
    compressor = ctx.createDynamicsCompressor(),
    limit = ctx.createWaveShaper(),
    meter = ctx.createAnalyser();
  compressor.threshold.value = -6;
  compressor.knee.value = 6;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.12;
  const curve = new Float32Array(8192);
  for (let i = 0; i < curve.length; i++)
    curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 1.35) * 0.95;
  limit.curve = curve;
  limit.oversample = "2x";
  master.connect(compressor);
  compressor.connect(limit);
  limit.connect(meter);
  meter.connect(ctx.destination);
  meter.fftSize = 256;
  const gains = [0, 1, 2].map(() => ctx.createGain()),
    pans = [0, 1, 2].map(() => ctx.createStereoPanner());
  gains.forEach((g, i) => {
    g.connect(pans[i]);
    pans[i].connect(master);
  });
  const voice = voiceBus(ctx, master);
  return {
    voice,
    gains,
    pans,
    master,
    meter,
    disconnect: () => {
      voice.disconnect();
      gains.forEach((g) => g.disconnect());
      pans.forEach((g) => g.disconnect());
      master.disconnect();
      compressor.disconnect();
      limit.disconnect();
      meter.disconnect();
    },
  };
}
export function updateMaster(
  graph: MasterGraph,
  p: MasterProject,
  time: number,
  immediate = false,
) {
  const set = (param: AudioParam, value: number) => {
    param.cancelScheduledValues(time);
    if (immediate) param.setValueAtTime(value, time);
    else param.setTargetAtTime(value, time, 0.015);
  };
  graph.gains.forEach((g, i) =>
    set(
      g.gain,
      !(p.vocals?.solo && p.vocals.selectedId) && activeTrack(p.mix, i)
        ? p.mix.levels[i]
        : 0,
    ),
  );
  graph.pans.forEach((g, i) => set(g.pan, p.pan[i]));
  set(graph.master.gain, p.master);
  updateVoice(
    graph.voice,
    p.vocals ?? newVocals(),
    vocalAudible(p.vocals, p.mix.solo),
    time,
    immediate,
  );
}
export async function exportMaster(p: MasterProject, vocal?: AudioBuffer) {
  const selected = p.vocals?.takes.find((t) => t.id === p.vocals?.selectedId);
  if (
    vocalAudible(p.vocals, p.mix.solo) &&
    selected &&
    vocalWindow(selected, (p.bars * 240) / p.mix.draft.bpm).duration <= 0
  )
    throw Error(
      "The vocal take is outside the song. Adjust its start or trim before exporting.",
    );
  const stems = await renderProductionStems(p),
    ctx = new OfflineAudioContext(2, stems[0].length, MASTER_RATE),
    graph = connectMaster(ctx);
  updateMaster(graph, p, 0, true);
  for (let i = 0; i < 3; i++) {
    const source = ctx.createBufferSource(),
      b = ctx.createBuffer(1, stems[i].length, MASTER_RATE);
    b.getChannelData(0).set(stems[i]);
    source.buffer = b;
    source.connect(graph.gains[i]);
    source.start(0);
  }
  if (vocal && p.vocals?.selectedId) {
    const take = p.vocals.takes.find((t) => t.id === p.vocals!.selectedId)!;
    const samples = placeVocal(
        vocal.getChannelData(0),
        vocal.sampleRate,
        take,
        (p.bars * 240) / p.mix.draft.bpm,
        MASTER_RATE,
      ),
      b = ctx.createBuffer(1, samples.length, MASTER_RATE),
      s = ctx.createBufferSource();
    b.getChannelData(0).set(samples);
    s.buffer = b;
    s.connect(graph.voice.gain);
    s.start(0);
  }
  if (vocalAudible(p.vocals, p.mix.solo) && !vocal)
    throw Error(
      "Selected vocal audio is missing. Reattach it before exporting.",
    );
  const buffer = await ctx.startRendering();
  graph.disconnect();
  return stereoWav(buffer);
}
export function stereoWav(b: AudioBuffer): ArrayBuffer {
  const bytes = new ArrayBuffer(44 + b.length * 4),
    v = new DataView(bytes);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  v.setUint32(4, 36 + b.length * 4, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, b.sampleRate, true);
  v.setUint32(28, b.sampleRate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, b.length * 4, true);
  const l = b.getChannelData(0),
    r = b.getChannelData(1);
  for (let i = 0; i < b.length; i++) {
    v.setInt16(
      44 + i * 4,
      Math.round(Math.max(-1, Math.min(1, l[i])) * 32767),
      true,
    );
    v.setInt16(
      46 + i * 4,
      Math.round(Math.max(-1, Math.min(1, r[i])) * 32767),
      true,
    );
  }
  return bytes;
}

export async function renderProductionStems(
  p: MasterProject,
): Promise<Float32Array[]> {
  const { renderKeyboard } = await import("./master-keyboard");
  const keyboard = await renderKeyboard(p);
  return renderMasterStems(p, MASTER_RATE, keyboard);
}
