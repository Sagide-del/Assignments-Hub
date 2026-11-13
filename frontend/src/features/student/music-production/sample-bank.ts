import * as Tone from "tone";
import manifest from "../../../../public/assets/music/recorded/samples.json";
const decoded = new Map<string, Promise<AudioBuffer>>();
export async function recordedBuffer(url: string): Promise<AudioBuffer> {
  let pending = decoded.get(url);
  if (!pending) {
    pending = Tone.ToneAudioBuffer.fromUrl(url)
      .then((b) => {
        const audio = b.get();
        if (!audio) throw Error("Recorded sample could not be decoded.");
        return audio;
      })
      .catch((e) => {
        decoded.delete(url);
        throw e;
      });
    decoded.set(url, pending);
    while (decoded.size > 24) decoded.delete(decoded.keys().next().value!);
  }
  return pending;
}
export const hasRecordedVoice = (instrument: string) =>
  instrument === "Piano" || instrument === "Marimba";
export async function prepareVoice(instrument: string) {
  if (!hasRecordedVoice(instrument)) return;
  await Promise.all(
    manifest.samples
      .filter((s) => s.instrument === instrument)
      .map((s) => recordedBuffer(s.url)),
  );
}
const audioBuffers = new Map<string, AudioBuffer>();
export async function loadVoice(instrument: string) {
  await prepareVoice(instrument);
  for (const sample of manifest.samples.filter(
    (s) => s.instrument === instrument,
  ))
    audioBuffers.set(sample.url, await recordedBuffer(sample.url));
}
export function sampler(instrument: string, context: Tone.BaseContext) {
  const urls: Record<string, AudioBuffer> = {};
  for (const s of manifest.samples.filter((s) => s.instrument === instrument)) {
    const b = audioBuffers.get(s.url);
    if (!b) throw Error("Instrument samples are still loading.");
    urls[Tone.Frequency(s.midi, "midi").toNote()] = b;
  }
  return new Tone.Sampler({
    context,
    urls,
    attack: 0.003,
    release: instrument === "Piano" ? 0.35 : 0.18,
  });
}
export const soundCredits = manifest;
