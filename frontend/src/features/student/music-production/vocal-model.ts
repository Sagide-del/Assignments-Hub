export interface VocalTake {
  id: string;
  name: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  startSeconds: number;
  waveform: number[];
  createdAt: string;
  recordedBpm?: number;
}
export interface VocalSettings {
  selectedId: string | null;
  takes: VocalTake[];
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  reverb: number;
}
export const newVocals = (): VocalSettings => ({
  selectedId: null,
  takes: [],
  volume: 0.8,
  pan: 0,
  muted: false,
  solo: false,
  reverb: 0,
});
export function validVocals(value: unknown): value is VocalSettings {
  const v = value as VocalSettings;
  if (
    !v ||
    !Array.isArray(v.takes) ||
    v.takes.length > 8 ||
    !Number.isFinite(v.volume) ||
    v.volume < 0 ||
    v.volume > 1 ||
    !Number.isFinite(v.pan) ||
    v.pan < -1 ||
    v.pan > 1 ||
    typeof v.muted !== "boolean" ||
    typeof v.solo !== "boolean" ||
    !Number.isFinite(v.reverb) ||
    v.reverb < 0 ||
    v.reverb > 0.35
  )
    return false;
  const ids = new Set<string>();
  for (const t of v.takes) {
    if (
      !t ||
      typeof t.id !== "string" ||
      !/^[A-Za-z0-9-]{1,80}$/.test(t.id) ||
      ids.has(t.id) ||
      typeof t.name !== "string" ||
      t.name.length < 1 ||
      t.name.length > 80 ||
      !Number.isFinite(t.duration) ||
      t.duration < 0.15 ||
      t.duration > 300 ||
      !Number.isFinite(t.trimStart) ||
      !Number.isFinite(t.trimEnd) ||
      t.trimStart < 0 ||
      t.trimEnd > t.duration ||
      t.trimEnd - t.trimStart < 0.1 ||
      !Number.isFinite(t.startSeconds) ||
      t.startSeconds < -10 ||
      t.startSeconds > 600 ||
      !Array.isArray(t.waveform) ||
      t.waveform.length !== 64 ||
      !t.waveform.every((n) => Number.isFinite(n) && n >= 0 && n <= 1) ||
      typeof t.createdAt !== "string" ||
      !Number.isFinite(Date.parse(t.createdAt)) ||
      (t.recordedBpm !== undefined &&
        (!Number.isInteger(t.recordedBpm) ||
          t.recordedBpm < 60 ||
          t.recordedBpm > 160))
    )
      return false;
    ids.add(t.id);
  }
  return (
    v.selectedId === null ||
    (typeof v.selectedId === "string" && ids.has(v.selectedId))
  );
}
export function vocalWindow(t: VocalTake, songSeconds: number) {
  const start = Math.max(0, t.startSeconds),
    offset = t.trimStart + Math.max(0, -t.startSeconds),
    duration = Math.max(0, Math.min(t.trimEnd - offset, songSeconds - start));
  return { start, offset, duration };
}
export function vocalWaveform(samples: Float32Array): number[] {
  return Array.from({ length: 64 }, (_, i) => {
    let peak = 0;
    const a = Math.floor((i * samples.length) / 64),
      b = Math.floor(((i + 1) * samples.length) / 64);
    for (let j = a; j < b; j++) peak = Math.max(peak, Math.abs(samples[j]));
    return Math.min(1, peak);
  });
}
export const vocalAudible = (
  v: VocalSettings | undefined,
  instrumentSolo: number | null,
) =>
  !!v &&
  !!v.selectedId &&
  v.volume > 0 &&
  !v.muted &&
  (v.solo || instrumentSolo === null);
export function placeVocal(
  samples: Float32Array,
  inputRate: number,
  take: VocalTake,
  songSeconds: number,
  outputRate: number,
) {
  const out = new Float32Array(Math.ceil(songSeconds * outputRate)),
    w = vocalWindow(take, songSeconds),
    at = Math.round(w.start * outputRate),
    frames = Math.floor(w.duration * outputRate);
  for (let i = 0; i < frames && at + i < out.length; i++) {
    const pos = (w.offset + i / outputRate) * inputRate,
      lo = Math.floor(pos),
      f = pos - lo,
      fade = Math.min(
        1,
        i / (outputRate * 0.004),
        (frames - i) / (outputRate * 0.008),
      );
    out[at + i] =
      ((samples[lo] ?? 0) * (1 - f) + (samples[lo + 1] ?? 0) * f) * fade;
  }
  return out;
}
