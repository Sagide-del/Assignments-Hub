import manifest from "../../../../public/assets/music/recorded/samples.json";
import { noteMidi, type PianoSketch } from "./piano-songs";
import { wavBytes } from "./instrument-audio";
let prepared: Promise<{ midi: number; buffer: AudioBuffer }[]> | undefined;
async function pianoSamples(ctx: BaseAudioContext) {
  if (!prepared)
    prepared = Promise.all(
      manifest.samples
        .filter((s) => s.instrument === "Piano")
        .map(async (s) => {
          const response = await fetch(s.url);
          if (!response.ok) throw Error("Piano samples could not load.");
          return {
            midi: s.midi,
            buffer: await ctx.decodeAudioData(await response.arrayBuffer()),
          };
        }),
    ).catch((e) => {
      prepared = undefined;
      throw e;
    });
  return prepared;
}
export function sketchDuration(sketch: PianoSketch) {
  return (
    (Math.max(...sketch.tracks.map((t) => t.pattern.length)) * 60) / sketch.bpm
  );
}
export async function renderPianoSketch(
  sketch: PianoSketch,
): Promise<AudioBuffer> {
  const beat = 60 / sketch.bpm,
    duration = sketchDuration(sketch),
    ctx = new OfflineAudioContext(1, Math.ceil((duration + 1) * 44100), 44100),
    samples = await pianoSamples(ctx),
    master = ctx.createGain();
  master.gain.value = 0.65;
  master.connect(ctx.destination);
  sketch.tracks.forEach((track) =>
    track.pattern.forEach((note, i) => {
      const midi = noteMidi(note),
        time = i * beat,
        gain = ctx.createGain();
      gain.connect(master);
      if (track.instrument === "piano") {
        const nearest = samples.reduce((a, b) =>
            Math.abs(a.midi - midi) < Math.abs(b.midi - midi) ? a : b,
          ),
          source = ctx.createBufferSource();
        source.buffer = nearest.buffer;
        source.playbackRate.value = 2 ** ((midi - nearest.midi) / 12);
        gain.gain.setValueAtTime(0.65, time);
        gain.gain.setValueAtTime(0.65, time + beat * 0.8);
        gain.gain.linearRampToValueAtTime(0, time + beat + 0.2);
        source.connect(gain);
        source.start(time);
        source.stop(Math.min(duration + 1, time + beat + 0.25));
      } else {
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.13, time + 0.05);
        gain.gain.setValueAtTime(0.13, time + beat * 0.75);
        gain.gain.linearRampToValueAtTime(0, time + beat + 0.18);
        for (const cents of [-5, 5]) {
          const oscillator = ctx.createOscillator();
          oscillator.type = "triangle";
          oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
          oscillator.detune.value = cents;
          oscillator.connect(gain);
          oscillator.start(time);
          oscillator.stop(time + beat + 0.2);
        }
      }
    }),
  );
  return ctx.startRendering();
}
export const pianoWav = (buffer: AudioBuffer) =>
  wavBytes(buffer.getChannelData(0), buffer.sampleRate);
