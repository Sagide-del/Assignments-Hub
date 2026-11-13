import * as Tone from "tone";
import library from "../../../../public/assets/music/recorded/arrangements.json";
export const ARRANGEMENTS = library.arrangements;
export const getArrangement = (id: string) => {
  const found = ARRANGEMENTS.find((a) => a.id === id);
  if (!found) throw Error("Unknown recorded arrangement");
  return found;
};
const arrangement = ARRANGEMENTS[0];
import { recordedBuffer } from "./sample-bank";
import {
  newPlayAlong,
  type PlayAlongMix,
} from "../../../../../backend/src/student/music-production/model";
export const PLAY_ALONG = arrangement;
export const secondsPerBar = (a: typeof arrangement) =>
  (60 / a.bpm) * (a.time_signature === "6/8" ? 3 : 4);
export const barSeconds = secondsPerBar(arrangement);
const buffers = new Map<string, AudioBuffer>();
export async function prepareStems(mix: PlayAlongMix = newPlayAlong()) {
  const arrangement = getArrangement(mix.arrangement_id);
  await Promise.all(
    arrangement.stems.map(async (stem) => {
      buffers.set(stem.url, await recordedBuffer(stem.url));
      while (buffers.size > 10) buffers.delete(buffers.keys().next().value!);
    }),
  );
}
export function stemGraph(context: Tone.BaseContext, mix: PlayAlongMix) {
  const arrangement = getArrangement(mix.arrangement_id);
  const limiter = new Tone.Limiter({ context, threshold: -1 }).toDestination(),
    master = new Tone.Gain({ context, gain: 0.6 }).connect(limiter);
  const nodes = arrangement.stems.map((stem) => {
    const buffer = buffers.get(stem.url);
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
    if (this.mix.arrangement_id !== mix.arrangement_id) {
      this.stop();
      this.graph?.dispose();
      this.graph = undefined;
      this.offset = null;
    }
    const attempt = ++this.attempt;
    await Tone.start();
    const arrangement = getArrangement(mix.arrangement_id),
      barSeconds = secondsPerBar(arrangement);
    await prepareStems(mix);
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
    const arrangement = getArrangement(this.mix.arrangement_id);
    const beats = arrangement.time_signature === "6/8" ? 2 : 4,
      pulseMs = (secondsPerBar(arrangement) * 1000) / beats;
    return new Promise<boolean>((resolve) => {
      this.click = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.01 },
      }).toDestination();
      this.click.volume.value = -22;
      let beat = 0;
      const tick = () => {
        if (this.disposed) return resolve(false);
        if (beat === beats) {
          this.click?.dispose();
          this.click = undefined;
          this.cancelWait = undefined;
          return resolve(true);
        }
        onCount?.(beats - beat);
        this.click!.triggerAttackRelease(beat === 0 ? "C6" : "G5", 0.03);
        beat++;
        this.timer = setTimeout(tick, pulseMs);
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
    if (this.mix.arrangement_id !== mix.arrangement_id) {
      this.stop();
      this.graph?.dispose();
      this.graph = undefined;
      this.offset = null;
    }
    this.mix = mix;
    const arrangement = getArrangement(mix.arrangement_id),
      barSeconds = secondsPerBar(arrangement);
    this.graph?.update(mix);
    if (!this.graph) return;
    const t = Tone.getTransport();
    t.bpm.value = arrangement.bpm;
    t.timeSignature = arrangement.time_signature.split("/").map(Number) as [
      number,
      number,
    ];
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
      Tone.getTransport().seconds =
        this.mix.start_bar *
        secondsPerBar(getArrangement(this.mix.arrangement_id));
    }
    this.active = false;
    this.hasStarted = false;
    this.offset = null;
  }
  seek(seconds: number) {
    this.offset = Math.max(
      0,
      Math.min(
        getArrangement(this.mix.arrangement_id).musical_duration - 0.01,
        seconds,
      ),
    );
    if (this.graph) Tone.getTransport().seconds = this.offset;
  }
  position() {
    return this.graph
      ? Tone.getTransport().seconds
      : (this.offset ??
          this.mix.start_bar *
            secondsPerBar(getArrangement(this.mix.arrangement_id)));
  }
  playing() {
    if (
      this.active &&
      !this.mix.loop &&
      this.position() >= getArrangement(this.mix.arrangement_id).duration
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
  const arrangement = getArrangement(mix.arrangement_id);
  await prepareStems(mix);
  let graph: ReturnType<typeof stemGraph> | undefined;
  try {
    return await Tone.Offline(
      (context) => {
        const t = context.transport;
        t.bpm.value = arrangement.bpm;
        t.timeSignature = arrangement.time_signature.split("/").map(Number) as [
          number,
          number,
        ];
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
