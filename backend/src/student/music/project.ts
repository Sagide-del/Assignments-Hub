export const LOOP_IDS = [
  "sikuti_lead",
  "sikuti_response",
  "benga_guitar",
  "chakacha_percussion",
  "afrobeat_drums",
  "amapiano_log",
] as const;
export type LoopId = (typeof LOOP_IDS)[number];
export type Meter = "4/4" | "6/8" | "12/8";
export interface MusicTrack {
  id: number;
  name: string;
  loop_id: LoopId | null;
  volume: number;
  muted: boolean;
  solo: boolean;
}
export interface MusicProject {
  title: string;
  bpm: number;
  time_signature: Meter;
  tracks_json: MusicTrack[];
}
export const emptyTracks = (): MusicTrack[] =>
  [1, 2, 3, 4].map((id) => ({
    id,
    name: `Track ${id}`,
    loop_id: null,
    volume: 0.8,
    muted: false,
    solo: false,
  }));
export const beatsPerBar = (meter: Meter) =>
  meter === "6/8" ? 3 : meter === "12/8" ? 6 : 4;
export function loopRate(
  loop: { bpm: number; time_signature: Meter },
  bpm: number,
  meter: Meter,
) {
  return (
    ((bpm / loop.bpm) * beatsPerBar(loop.time_signature)) / beatsPerBar(meter)
  );
}
export function validProject(value: unknown): value is MusicProject {
  if (!value || typeof value !== "object") return false;
  const p = value as MusicProject;
  return (
    typeof p.title === "string" &&
    p.title.trim().length > 0 &&
    p.title.length <= 100 &&
    Number.isInteger(p.bpm) &&
    p.bpm >= 60 &&
    p.bpm <= 180 &&
    ["4/4", "6/8", "12/8"].includes(p.time_signature) &&
    Array.isArray(p.tracks_json) &&
    p.tracks_json.length === 4 &&
    new Set(p.tracks_json.map((t) => t?.id)).size === 4 &&
    p.tracks_json.every(
      (t) =>
        t &&
        Number.isInteger(t.id) &&
        t.id >= 1 &&
        t.id <= 4 &&
        typeof t.name === "string" &&
        t.name.trim().length > 0 &&
        t.name.length <= 40 &&
        (t.loop_id === null || LOOP_IDS.includes(t.loop_id)) &&
        Number.isFinite(t.volume) &&
        t.volume >= 0 &&
        t.volume <= 1 &&
        typeof t.muted === "boolean" &&
        typeof t.solo === "boolean",
    )
  );
}
