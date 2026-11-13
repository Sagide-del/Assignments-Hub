import * as Tone from "tone";
import {
  pitchName,
  quarterBeats,
  stepsFor,
  type ProductionDraft,
  type ProductionMix,
  type Instrument,
} from "../../../../../backend/src/student/music-production/model";
export interface ProductionSound {
  play: () => void;
  dispose: () => void;
  setMix: (m: ProductionMix) => void;
}
function melodic(instrument: Instrument, context: Tone.BaseContext) {
  if (["Marimba", "Kalimba", "Nyatiti", "Sitar"].includes(instrument))
    return new Tone.Synth({
      context,
      oscillator: { type: instrument === "Sitar" ? "sawtooth" : "triangle" },
      envelope: {
        attack: 0.003,
        decay: instrument === "Nyatiti" ? 0.2 : 0.5,
        sustain: 0,
        release: 0.15,
      },
    });
  if (instrument === "Erhu")
    return new Tone.Synth({
      context,
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.08, decay: 0.12, sustain: 0.45, release: 0.2 },
    });
  return new Tone.Synth({
    context,
    oscillator: { type: "triangle" },
    envelope: { attack: 0.008, decay: 0.4, sustain: 0.15, release: 0.3 },
  });
}
/** One scheduler is shared by live playback and offline export. */
export function buildProductionSound(
  p: ProductionDraft,
  context: Tone.BaseContext,
): ProductionSound {
  const transport = context.transport,
    steps = stepsFor(p.time_signature),
    stepSeconds = 60 / p.bpm / 4;
  transport.bpm.value = p.bpm;
  transport.timeSignature = p.time_signature.split("/").map(Number) as [
    number,
    number,
  ];
  const limiter = new Tone.Limiter({ context, threshold: -1 }).toDestination(),
    master = new Tone.Gain({ context, gain: 0.35 }).connect(limiter);
  const tracks = p.tracks_json.tracks.map((t) => {
    const gain = new Tone.Gain({
      context,
      gain: t.muted ? 0 : t.volume,
    }).connect(master);
    const synth =
      t.id === "melody"
        ? melodic(t.instrument, context)
        : t.id === "rattles"
          ? new Tone.NoiseSynth({
              context,
              noise: { type: "white" },
              envelope: {
                attack: 0.001,
                decay: 0.025,
                sustain: 0,
                release: 0.01,
              },
            })
          : t.id === "gong"
            ? new Tone.MetalSynth({
                context,
                envelope: { attack: 0.001, decay: 0.25, release: 0.1 },
                harmonicity: 3.1,
                modulationIndex: 12,
                resonance: 2200,
                octaves: 1,
              })
            : new Tone.MembraneSynth({
                context,
                pitchDecay: 0.02,
                octaves: 2,
                envelope: {
                  attack: 0.001,
                  decay: 0.12,
                  sustain: 0,
                  release: 0.07,
                },
              });
    synth.connect(gain);
    return { id: t.id, gain, synth };
  });
  const eventIds: number[] = [];
  for (const t of p.tracks_json.tracks) {
    const node = tracks.find((x) => x.id === t.id)!;
    if (t.id === "melody")
      for (const n of p.tracks_json.melody)
        eventIds.push(
          transport.schedule(
            (time) =>
              (node.synth as Tone.Synth).triggerAttackRelease(
                pitchName(n.midi),
                Math.max(0.035, n.length * stepSeconds * 0.9),
                time,
                0.65,
              ),
            (n.bar * steps + n.step) * stepSeconds,
          ),
        );
    else
      for (let bar = 0; bar < 4; bar++)
        t.pattern.forEach((hit, i) => {
          if (hit)
            eventIds.push(
              transport.schedule(
                (time) => {
                  if (t.id === "rattles")
                    (node.synth as Tone.NoiseSynth).triggerAttackRelease(
                      0.025,
                      time,
                      0.35,
                    );
                  else if (t.id === "gong")
                    (node.synth as Tone.MetalSynth).triggerAttackRelease(
                      "C5",
                      0.06,
                      time,
                      0.25,
                    );
                  else
                    (node.synth as Tone.MembraneSynth).triggerAttackRelease(
                      t.id === "isatsa"
                        ? "C2"
                        : t.id === "ikhasi"
                          ? "G2"
                          : "C4",
                      0.06,
                      time,
                      0.65,
                    );
                },
                (bar * steps + i) * stepSeconds,
              ),
            );
        });
  }
  return {
    play: () => transport.start(),
    setMix: (mix) => {
      for (const t of mix.tracks) {
        const gain = tracks.find((x) => x.id === t.id)?.gain;
        if (gain) gain.gain.rampTo(t.muted ? 0 : t.volume, 0.02);
      }
    },
    dispose: () => {
      eventIds.forEach((id) => transport.clear(id));
      tracks.forEach((t) => {
        t.synth.dispose();
        t.gain.dispose();
      });
      master.dispose();
      limiter.dispose();
    },
  };
}
export class ProductionAudio {
  private sound?: ProductionSound;
  private running = false;
  private attempt = 0;
  private current?: ProductionDraft;
  private disposed = false;
  private signature = "";
  async play(p: ProductionDraft) {
    const attempt = ++this.attempt;
    await Tone.start();
    if (this.disposed || attempt !== this.attempt) return false;
    if (this.sound && this.signature === this.structure(p)) {
      this.current = p;
      this.sound.setMix(p.tracks_json);
      Tone.getTransport().start();
      this.running = true;
      return true;
    }
    this.stop();
    this.current = p;
    this.sound = buildProductionSound(p, Tone.getContext());
    const transport = Tone.getTransport();
    transport.loop = true;
    transport.loopEnd = (quarterBeats(p.time_signature) * 4 * 60) / p.bpm;
    transport.start();
    this.running = true;
    this.signature = this.structure(p);
    return true;
  }
  private structure(p: ProductionDraft) {
    return JSON.stringify([
      p.bpm,
      p.time_signature,
      p.tracks_json.melody,
      p.tracks_json.tracks.map((t) => [t.pattern, t.instrument]),
    ]);
  }
  update(p: ProductionDraft) {
    this.current = p;
    if (!this.running) return;
    if (this.signature !== this.structure(p)) {
      void this.play(p);
    } else this.sound?.setMix(p.tracks_json);
  }
  pause() {
    Tone.getTransport().pause();
    this.running = false;
  }
  stop() {
    this.attempt++;
    if (this.sound) {
      Tone.getTransport().stop();
      this.sound.dispose();
      this.sound = undefined;
    }
    this.running = false;
  }
  measure() {
    if (!this.running || !this.current) return 0;
    return Math.min(
      3,
      Math.floor(
        Tone.getTransport().seconds /
          ((quarterBeats(this.current.time_signature) * 60) / this.current.bpm),
      ) % 4,
    );
  }
  async instrument(note: string, instrument: Instrument) {
    await Tone.start();
    if (this.disposed) return;
    const synth = melodic(instrument, Tone.getContext()).toDestination();
    synth.volume.value = -12;
    synth.triggerAttackRelease(note, 0.4);
    setTimeout(() => synth.dispose(), 1200);
  }
  dispose() {
    this.disposed = true;
    this.stop();
  }
}
export async function renderProduction(p: ProductionDraft) {
  let sound: ProductionSound | undefined;
  const duration = (quarterBeats(p.time_signature) * 4 * 60) / p.bpm + 1;
  try {
    return await Tone.Offline(
      (context) => {
        sound = buildProductionSound(p, context);
        sound.play();
      },
      duration,
      2,
      44100,
    );
  } finally {
    sound?.dispose();
  }
}
export async function mp3Blob(p: ProductionDraft) {
  const buffer = await renderProduction(p),
    left = buffer.getChannelData(0),
    right = buffer.getChannelData(1);
  const { Mp3Encoder } = await import("lamejs");
  const encoder = new Mp3Encoder(2, 44100, 128),
    chunks: Uint8Array[] = [];
  for (let offset = 0; offset < left.length; offset += 1152) {
    const count = Math.min(1152, left.length - offset),
      l = new Int16Array(count),
      r = new Int16Array(count);
    for (let i = 0; i < count; i++) {
      l[i] = Math.round(Math.max(-1, Math.min(1, left[offset + i])) * 32767);
      r[i] = Math.round(Math.max(-1, Math.min(1, right[offset + i])) * 32767);
    }
    const encoded = encoder.encodeBuffer(l, r);
    if (encoded.length) chunks.push(new Uint8Array(encoded));
    if (offset % (1152 * 80) === 0)
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  const end = encoder.flush();
  if (end.length) chunks.push(new Uint8Array(end));
  buffer.dispose();
  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}
export async function midiBlob(p: ProductionDraft) {
  const { Midi } = await import("@tonejs/midi");
  const midi = new Midi();
  midi.header.setTempo(p.bpm);
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: p.time_signature.split("/").map(Number) as [number, number],
  });
  const track = midi.addTrack();
  track.name = "Original student melody";
  for (const n of p.tracks_json.melody)
    track.addNote({
      midi: n.midi,
      time: ((n.bar * stepsFor(p.time_signature) + n.step) * 60) / p.bpm / 4,
      duration: (n.length * 60) / p.bpm / 4,
      velocity: 0.7,
    });
  return new Blob([midi.toArray() as Uint8Array<ArrayBuffer>], {
    type: "audio/midi",
  });
}
