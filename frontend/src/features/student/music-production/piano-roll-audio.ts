import { pianoSamples } from "./piano-song-audio";
import type { RollProject } from "./piano-roll-model";
export async function renderRoll(
  p: RollProject,
  tail = true,
  metronome = false,
): Promise<AudioBuffer> {
  const seconds = 60 / p.bpm,
    length = p.bars * 4 * seconds,
    ctx = new OfflineAudioContext(
      1,
      Math.ceil((length + (tail ? 1 : 0)) * 44100),
      44100,
    ),
    samples = await pianoSamples(ctx),
    master = ctx.createGain(),
    limiter = ctx.createDynamicsCompressor();
  master.gain.value = 0.7;
  limiter.threshold.value = -6;
  limiter.knee.value = 10;
  limiter.ratio.value = 10;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  for (const track of p.tracks) {
    if (track.muted) continue;
    for (const n of track.notes) {
      const start = n.start * seconds,
        end = (n.start + n.duration) * seconds,
        g = ctx.createGain(),
        level = (track.volume * n.velocity) / 127;
      g.connect(master);
      if (track.instrument === "piano") {
        const sample = samples.reduce((a, b) =>
            Math.abs(a.midi - n.midi) < Math.abs(b.midi - n.midi) ? a : b,
          ),
          s = ctx.createBufferSource();
        s.buffer = sample.buffer;
        s.playbackRate.value = 2 ** ((n.midi - sample.midi) / 12);
        g.gain.setValueAtTime(level, start);
        g.gain.setValueAtTime(level, Math.max(start, end - 0.03));
        g.gain.linearRampToValueAtTime(0, end);
        s.connect(g);
        s.start(start);
        s.stop(end);
      } else {
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(
          level * 0.25,
          start + Math.min(0.035, (end - start) / 3),
        );
        g.gain.setValueAtTime(
          level * 0.25,
          Math.max(start + 0.035, end - 0.08),
        );
        g.gain.linearRampToValueAtTime(0, end);
        for (const detune of [-4, 4]) {
          const o = ctx.createOscillator();
          o.type = "triangle";
          o.frequency.value = 440 * 2 ** ((n.midi - 69) / 12);
          o.detune.value = detune;
          o.connect(g);
          o.start(start);
          o.stop(end);
        }
      }
    }
  }
  if (metronome)
    for (let beat = 0; beat < p.bars * 4; beat++) {
      const o = ctx.createOscillator(),
        g = ctx.createGain(),
        at = beat * seconds;
      o.frequency.value = beat % 4 === 0 ? 1400 : 950;
      g.gain.setValueAtTime(0.12, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.035);
      o.connect(g);
      g.connect(master);
      o.start(at);
      o.stop(at + 0.04);
    }
  return ctx.startRendering();
}
export async function auditionRollKey(
  ctx: AudioContext,
  midi: number,
  gain: GainNode,
  voice: "piano" | "synth_pad" = "piano",
  channelLevel = 1,
) {
  if (voice === "synth_pad") {
    if (ctx.state === "closed") return;
    const g = ctx.createGain(),
      at = ctx.currentTime;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.2 * channelLevel, at + 0.04);
    g.gain.setValueAtTime(0.2 * channelLevel, at + 0.4);
    g.gain.linearRampToValueAtTime(0, at + 0.7);
    g.connect(gain);
    let ended = 0;
    for (const cents of [-4, 4]) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      o.detune.value = cents;
      o.connect(g);
      o.start(at);
      o.stop(at + 0.72);
      o.onended = () => {
        o.disconnect();
        if (++ended === 2) g.disconnect();
      };
    }
    return;
  }
  const samples = await pianoSamples(ctx);
  if (ctx.state === "closed") return;
  const sample = samples.reduce((a, b) =>
      Math.abs(a.midi - midi) < Math.abs(b.midi - midi) ? a : b,
    ),
    s = ctx.createBufferSource(),
    g = ctx.createGain();
  s.buffer = sample.buffer;
  s.playbackRate.value = 2 ** ((midi - sample.midi) / 12);
  g.gain.setValueAtTime(0.65 * channelLevel, ctx.currentTime);
  g.gain.setValueAtTime(0.65 * channelLevel, ctx.currentTime + 0.35);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
  s.connect(g);
  g.connect(gain);
  s.start();
  s.stop(ctx.currentTime + 0.75);
  s.onended = () => {
    s.disconnect();
    g.disconnect();
  };
}
