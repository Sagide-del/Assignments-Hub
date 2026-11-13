import * as Tone from "tone";
import { Howl } from "howler";
import {
  loopRate,
  type MusicProject,
  type Meter,
} from "../../../../../backend/src/student/music/project";
export interface StudioLoop {
  id: string;
  name: string;
  category: string;
  origin: string;
  bpm: number;
  time_signature: Meter;
  file: string;
  context: string;
  provenance: string;
  waveform: number[];
}
/** Audio nodes live here, never in React state or saved project JSON. */
export class MusicAudioEngine {
  private buffers = new Map<string, Tone.ToneAudioBuffer>();
  private players = new Map<
    number,
    { loop: string; player: Tone.GrainPlayer }
  >();
  private output?: Tone.Gain;
  private limiter?: Tone.Limiter;
  private analyser?: Tone.Analyser;
  private previewSound?: Howl;
  private loading?: Promise<void>;
  private disposed = false;
  private signature = "";
  private project?: MusicProject;
  private attempt = 0;
  private playing = false;
  async start(project: MusicProject, loops: StudioLoop[]) {
    const attempt = ++this.attempt;
    this.project = project;
    await Tone.start(); // Only called from an explicit user gesture.
    if (this.disposed || attempt !== this.attempt) return false;
    this.stopPreview();
    if (!this.loading) this.loading = this.load(loops);
    await this.loading;
    if (this.disposed || attempt !== this.attempt) return false;
    this.configure(this.project ?? project, loops);
    const transport = Tone.getTransport();
    transport.loop = true;
    transport.loopEnd = "1m";
    transport.start();
    this.playing = true;
    return true;
  }
  private async load(loops: StudioLoop[]) {
    const output = new Tone.Gain(0.4),
      limiter = new Tone.Limiter(-1).toDestination(),
      analyser = new Tone.Analyser("waveform", 256);
    output.connect(limiter);
    output.connect(analyser);
    this.output = output;
    this.limiter = limiter;
    this.analyser = analyser;
    try {
      const results = await Promise.allSettled(
        loops.map(async (l) => {
          const buffer = await Tone.ToneAudioBuffer.fromUrl(l.file);
          if (this.disposed) buffer.dispose();
          else this.buffers.set(l.id, buffer);
        }),
      );
      if (results.some((r) => r.status === "rejected"))
        throw Error("Some loop files could not be loaded.");
    } catch (e) {
      this.loading = undefined;
      for (const b of this.buffers.values()) b.dispose();
      this.buffers.clear();
      output.dispose();
      limiter.dispose();
      analyser.dispose();
      this.output = undefined;
      this.limiter = undefined;
      this.analyser = undefined;
      throw e;
    }
  }
  configure(project: MusicProject, loops: StudioLoop[]) {
    this.project = project;
    if (!this.output || this.disposed) return;
    const transport = Tone.getTransport();
    const signature = JSON.stringify([
      project.time_signature,
      project.tracks_json.map((t) => t.loop_id),
    ]);
    const restart = this.signature !== signature && this.playing;
    if (restart) transport.stop();
    transport.bpm.value = project.bpm;
    transport.timeSignature = project.time_signature.split("/").map(Number) as [
      number,
      number,
    ];
    transport.loopEnd = "1m";
    const solo = project.tracks_json.some((t) => t.solo);
    for (const track of project.tracks_json) {
      const previous = this.players.get(track.id);
      if (previous && previous.loop !== track.loop_id) {
        previous.player.dispose();
        this.players.delete(track.id);
      }
      if (!track.loop_id) continue;
      const loop = loops.find((l) => l.id === track.loop_id),
        buffer = this.buffers.get(track.loop_id);
      if (!loop || !buffer) continue;
      let node = this.players.get(track.id);
      if (!node) {
        const player = new Tone.GrainPlayer({
          url: buffer,
          loop: true,
          grainSize: 0.08,
          overlap: 0.04,
        }).connect(this.output);
        player.sync().start(0);
        node = { loop: loop.id, player };
        this.players.set(track.id, node);
      }
      node.player.playbackRate = loopRate(
        loop,
        project.bpm,
        project.time_signature,
      );
      node.player.volume.value =
        track.muted || (solo && !track.solo) || track.volume === 0
          ? -100
          : Tone.gainToDb(track.volume);
    }
    this.signature = signature;
    if (restart) transport.start();
  }
  pause() {
    Tone.getTransport().pause();
    this.playing = false;
  }
  stop() {
    this.attempt++;
    if (this.output) Tone.getTransport().stop();
    this.playing = false;
  }
  progress() {
    return this.playing ? Tone.getTransport().progress : 0;
  }
  level() {
    const values = this.analyser?.getValue() as Float32Array | undefined;
    return values ? Math.max(...Array.from(values, Math.abs)) : 0;
  }
  async preview(loop: StudioLoop, onEnd: () => void, onError: () => void) {
    this.stopPreview();
    this.previewSound = new Howl({
      src: [loop.file],
      format: ["wav"],
      volume: 0.45,
      onend: onEnd,
      onloaderror: onError,
      onplayerror: onError,
    });
    this.previewSound.play();
  }
  stopPreview() {
    this.previewSound?.stop();
    this.previewSound?.unload();
    this.previewSound = undefined;
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.stopPreview();
    for (const p of this.players.values()) p.player.dispose();
    this.players.clear();
    for (const b of this.buffers.values()) b.dispose();
    this.buffers.clear();
    this.output?.dispose();
    this.limiter?.dispose();
    this.analyser?.dispose();
  }
}
