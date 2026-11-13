import * as Tone from "tone";
import arrangement from "../../../../public/assets/music/recorded/play-along.json";
import { recordedBuffer } from "./sample-bank";
import {
  newPlayAlong,
  type PlayAlongMix,
} from "../../../../../backend/src/student/music-production/model";
export const PLAY_ALONG = arrangement;
export const barSeconds = (60 / arrangement.bpm) * 4;
const buffers = new Map<string, AudioBuffer>();
export async function prepareStems() {
  await Promise.all(
    arrangement.stems.map(async (stem) => {
      buffers.set(stem.id, await recordedBuffer(stem.url));
    }),
  );
}
export function stemGraph(context: Tone.BaseContext, mix: PlayAlongMix) {
  const limiter = new Tone.Limiter({ context, threshold: -1 }).toDestination(),
    master = new Tone.Gain({ context, gain: 0.6 }).connect(limiter);
  const nodes = arrangement.stems.map((stem) => {
    const buffer = buffers.get(stem.id);
    if (!buffer) throw Error("The recording is still loading.");
    const pan = new Tone.Panner({ context, pan: 0 }).connect(master),
      gain = new Tone.Gain({ context, gain: 0 }).connect(pan),
      player = new Tone.Player({
        context,
        url: buffer,
        fadeIn: 0.005,
        fadeOut: 0.01,
      }).connect(gain);
    player.sync().start(0);
    return { id: stem.id, player, gain, pan };
  });
  function update(next: PlayAlongMix) {
    const solo = next.stems.some((s) => s.solo);
    for (const s of next.stems) {
      const n = nodes.find((n) => n.id === s.id)!;
      n.gain.gain.rampTo(s.muted || (solo && !s.solo) ? 0 : s.volume, 0.02);
      n.pan.pan.rampTo(s.pan, 0.02);
    }
  }
  update(mix);
  return {
    update,
    dispose: () => {
      nodes.forEach((n) => {
        n.player.dispose();
        n.gain.dispose();
        n.pan.dispose();
      });
      master.dispose();
      limiter.dispose();
    },
  };
}
export class StemEngine {
  private graph?: ReturnType<typeof stemGraph>;
  private attempt = 0;
  private disposed = false;
  private active = false;
  private hasStarted = false;
  private offset: number | null = null;
  private mix: PlayAlongMix = newPlayAlong();
  private timer?: ReturnType<typeof setTimeout>;
  private cancelWait?: () => void;
  private click?: Tone.Synth;
  async play(mix: PlayAlongMix, onCount?: (n: number) => void) {
    const attempt = ++this.attempt;
    await Tone.start();
    await prepareStems();
    if (this.disposed || attempt !== this.attempt) return false;
    const transport = Tone.getTransport();
    this.mix = mix;
    if (!this.graph) {
      transport.stop();
      this.graph = stemGraph(Tone.getContext(), mix);
      transport.seconds = this.offset ?? mix.start_bar * barSeconds;
    }
    this.update(mix);
    if (mix.count_in && !this.hasStarted) {
      const completed = await this.countIn(onCount);
      if (!completed || this.disposed || attempt !== this.attempt) return false;
    }
    onCount?.(0);
    transport.start();
    this.active = true;
    this.hasStarted = true;
    return true;
  }
  private countIn(onCount?: (n: number) => void) {
    return new Promise<boolean>((resolve) => {
      this.click = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.01 },
      }).toDestination();
      this.click.volume.value = -22;
      let beat = 0;
      const tick = () => {
        if (this.disposed) return resolve(false);
        if (beat === 4) {
          this.click?.dispose();
          this.click = undefined;
          this.cancelWait = undefined;
          return resolve(true);
        }
        onCount?.(4 - beat);
        this.click!.triggerAttackRelease(beat === 0 ? "C6" : "G5", 0.03);
        beat++;
        this.timer = setTimeout(tick, 60000 / arrangement.bpm);
      };
      this.cancelWait = () => {
        clearTimeout(this.timer);
        this.click?.dispose();
        this.click = undefined;
        resolve(false);
      };
      tick();
    });
  }
  update(mix: PlayAlongMix) {
    this.mix = mix;
    this.graph?.update(mix);
    if (!this.graph) return;
    const t = Tone.getTransport();
    t.bpm.value = arrangement.bpm;
    t.timeSignature = [4, 4];
    t.loop = mix.loop;
    t.loopStart = mix.start_bar * barSeconds;
    t.loopEnd = mix.end_bar * barSeconds;
  }
  pause() {
    this.attempt++;
    this.cancelWait?.();
    this.cancelWait = undefined;
    if (this.graph) Tone.getTransport().pause();
    this.active = false;
  }
  stop() {
    this.attempt++;
    this.cancelWait?.();
    this.cancelWait = undefined;
    if (this.graph) {
      Tone.getTransport().stop();
      Tone.getTransport().seconds = this.mix.start_bar * barSeconds;
    }
    this.active = false;
    this.hasStarted = false;
    this.offset = null;
  }
  seek(seconds: number) {
    this.offset = Math.max(
      0,
      Math.min(arrangement.musical_duration - 0.01, seconds),
    );
    if (this.graph) Tone.getTransport().seconds = this.offset;
  }
  position() {
    return this.graph
      ? Tone.getTransport().seconds
      : (this.offset ?? this.mix.start_bar * barSeconds);
  }
  playing() {
    if (
      this.active &&
      !this.mix.loop &&
      this.position() >= arrangement.duration
    ) {
      this.stop();
      return false;
    }
    return this.active;
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.graph?.dispose();
    this.graph = undefined;
  }
}
export async function renderStems(mix: PlayAlongMix) {
  await prepareStems();
  let graph: ReturnType<typeof stemGraph> | undefined;
  try {
    return await Tone.Offline(
      (context) => {
        const t = context.transport;
        t.bpm.value = arrangement.bpm;
        t.timeSignature = [4, 4];
        t.loop = false;
        graph = stemGraph(context, mix);
        t.start(0);
      },
      arrangement.duration,
      2,
      44100,
    );
  } finally {
    graph?.dispose();
  }
}
