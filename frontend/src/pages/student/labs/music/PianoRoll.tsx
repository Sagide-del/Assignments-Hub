import TimedScorePreview from "./TimedScorePreview";
import { useEffect, useRef, useState } from "react";
import { Play, Square, Download, Piano } from "lucide-react";
import { StudioNav } from "../../../../features/student/music-production/StudioNav";
import { useAuthStore } from "../../../../store/auth.store";
import {
  pianoSongs,
  parsePianoSketch,
  noteMidi,
  pianoPitch,
  type PianoSketch,
} from "../../../../features/student/music-production/piano-songs";
import {
  renderPianoSketch,
  pianoWav,
  sketchDuration,
} from "../../../../features/student/music-production/piano-song-audio";
export default function PianoRoll() {
  const user = useAuthStore((s) => s.user),
    [song, setSong] = useState(pianoSongs[0].id),
    [sketch, setSketch] = useState<PianoSketch | null>(null),
    [track, setTrack] = useState(0),
    [json, setJson] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(-1),
    [saved, setSaved] = useState(false);
  const ctx = useRef<AudioContext | null>(null),
    source = useRef<AudioBufferSourceNode | null>(null),
    frame = useRef(0),
    ticket = useRef(0),
    alive = useRef(true);
  const selected = pianoSongs.find((s) => s.id === song)!,
    key = `ah-piano-song-v1:${user?.id}:${user?.schoolId}:${song}`;
  function stop() {
    ticket.current++;
    source.current?.stop();
    source.current?.disconnect();
    source.current = null;
    cancelAnimationFrame(frame.current);
    setPlaying(false);
    setPosition(-1);
    setBusy(false);
  }
  useEffect(() => {
    stop();
    setMessage("");
    setJson("");
    setSaved(false);
    try {
      const stored = localStorage.getItem(key);
      setSketch(
        stored
          ? parsePianoSketch(JSON.parse(stored))
          : selected.tracks.length
            ? parsePianoSketch(selected)
            : null,
      );
    } catch {
      setSketch(selected.tracks.length ? parsePianoSketch(selected) : null);
    }
  }, [key]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ticket.current++;
      cancelAnimationFrame(frame.current);
      source.current?.stop();
      void ctx.current?.close().catch(() => {});
    };
  }, []);
  function update(next: PianoSketch) {
    stop();
    setSketch(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setSaved(true);
    } catch {
      setSaved(false);
      setMessage(
        "Browser storage is unavailable. Download your audio to keep it.",
      );
    }
  }
  async function play() {
    if (!sketch) return;
    stop();
    const current = ticket.current;
    setBusy(true);
    setMessage("");
    try {
      ctx.current ??= new AudioContext();
      await ctx.current.resume();
      const audio = await renderPianoSketch(sketch);
      if (!alive.current || current !== ticket.current) return;
      const s = ctx.current.createBufferSource();
      s.buffer = audio;
      s.connect(ctx.current.destination);
      source.current = s;
      const start = ctx.current.currentTime;
      s.start();
      setPlaying(true);
      setBusy(false);
      const tick = () => {
        if (!alive.current || current !== ticket.current) return;
        setPosition(
          Math.floor(((ctx.current!.currentTime - start) * sketch.bpm) / 60),
        );
        frame.current = requestAnimationFrame(tick);
      };
      tick();
      s.onended = () => {
        if (alive.current && current === ticket.current) {
          source.current = null;
          cancelAnimationFrame(frame.current);
          setPlaying(false);
          setPosition(-1);
        }
      };
    } catch {
      if (alive.current && current === ticket.current) {
        setBusy(false);
        setMessage(
          "Piano audio could not load. Check your connection and try again.",
        );
      }
    }
  }
  async function download() {
    if (!sketch) return;
    const current = ticket.current;
    setBusy(true);
    try {
      const audio = await renderPianoSketch(sketch);
      if (!alive.current || current !== ticket.current) return;
      const url = URL.createObjectURL(
          new Blob([pianoWav(audio)], { type: "audio/wav" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = `${song}-study-pattern.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      if (alive.current)
        setMessage("Audio export failed. Check your connection and try again.");
    } finally {
      if (alive.current && current === ticket.current) setBusy(false);
    }
  }
  const notes = sketch?.tracks[track]?.pattern ?? [],
    highest = Math.max(76, ...notes.map(noteMidi)),
    lowest = Math.min(48, ...notes.map(noteMidi)),
    pitches = Array.from(
      { length: highest - lowest + 1 },
      (_, i) => highest - i,
    ); // E5–C3 includes every supplied note.
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <StudioNav
        title="Piano Roll"
        subtitle="Choose a song sketch. Hear each part. Shape the notes."
      />
      <section className="rounded-2xl bg-[#17352e] p-5 text-white sm:p-7">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#c5f235]">
          <Piano size={18} />
          Song sketches
        </div>
        <label className="block text-sm">
          Choose a song
          <select
            aria-label="Choose a song"
            value={song}
            onChange={(e) => {
              stop();
              setSong(e.target.value);
            }}
            className="mt-2 min-h-12 w-full max-w-xl rounded-xl bg-white px-3 text-base font-semibold text-[#17352e]"
          >
            {pianoSongs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.tracks.length || s.id === "how_long_will_i_love_you"
                  ? ""
                  : " — add your notes"}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-sm text-white/70">
          {song === "how_long_will_i_love_you" && !sketch
            ? "Two-bar opening excerpt from your uploaded score · 60 BPM · simplified pad accompaniment."
            : song === "my_heart_will_go_on"
              ? "Your supplied note pattern · C Major · 4/4. This is a study sketch, not a verified score or an artist recording."
              : sketch
                ? "Your imported note pattern · one beat per note in 4/4."
                : "No playable arrangement is bundled for this title. Add a note pattern you have permission to use below."}
        </p>
      </section>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {message}
        </p>
      )}
      {song === "how_long_will_i_love_you" && !sketch ? (
        <TimedScorePreview />
      ) : sketch ? (
        <>
          <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <button
              disabled={busy}
              onClick={() => (playing ? stop() : void play())}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17352e] px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {playing ? <Square size={16} /> : <Play size={16} />}{" "}
              {playing
                ? "Stop song sketch"
                : busy
                  ? "Preparing audio…"
                  : "Play song sketch"}
            </button>
            <label className="text-xs text-slate-500">
              Tempo
              <input
                aria-label="Piano tempo"
                type="number"
                min={60}
                max={160}
                value={sketch.bpm}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n >= 60 && n <= 160)
                    update({ ...sketch, bpm: n });
                }}
                className="ml-2 min-h-11 w-20 rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
              />
            </label>
            <button
              disabled={busy}
              onClick={() => void download()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50"
            >
              <Download size={16} />
              Download piano WAV
            </button>
            <span className="text-xs text-slate-500">
              {saved
                ? "Draft saved on this device"
                : "Edits save on this device"}{" "}
              · {Math.round(sketchDuration(sketch) * 10) / 10}s + release
            </span>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-3 p-4">
              <h2 className="font-semibold text-[#17352e]">
                Two-track piano roll
              </h2>
              <div className="flex gap-2">
                {sketch.tracks.map((t, i) => (
                  <button
                    key={t.instrument}
                    aria-pressed={track === i}
                    onClick={() => setTrack(i)}
                    className={`min-h-11 rounded-xl px-4 text-sm ${track === i ? "bg-[#17352e] text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </header>
            <p className="px-4 pb-4 text-xs text-slate-500">
              One beat per supplied note. Tap a cell to change its pitch. The
              pad pattern contains single notes, as supplied, rather than full
              chords.
            </p>
            <div className="overflow-x-auto bg-[#111e1b] p-3">
              <div
                className="min-w-[800px]"
                role="group"
                aria-label="Song piano note editor"
              >
                <div
                  className="grid gap-px"
                  style={{
                    gridTemplateColumns: "50px repeat(16,minmax(0,1fr))",
                  }}
                >
                  <span />
                  {Array.from({ length: 16 }, (_, i) => (
                    <span
                      key={i}
                      className="py-2 text-center text-[10px] text-white/50"
                    >
                      {Math.floor(i / 4) + 1}.{(i % 4) + 1}
                    </span>
                  ))}
                </div>
                {pitches.map((midi) => (
                  <div
                    key={midi}
                    className="grid gap-px"
                    style={{
                      gridTemplateColumns: "50px repeat(16,minmax(0,1fr))",
                    }}
                  >
                    <span
                      className={`flex h-7 items-center justify-center text-[10px] ${pianoPitch(midi).includes("#") ? "bg-[#31423c] text-white" : "bg-[#e9eee7] text-[#17352e]"}`}
                    >
                      {pianoPitch(midi)}
                    </span>
                    {Array.from({ length: 16 }, (_, beat) => {
                      const active =
                        notes[beat] && noteMidi(notes[beat]) === midi;
                      return (
                        <button
                          key={beat}
                          disabled={beat >= notes.length}
                          aria-label={`${pianoPitch(midi)} beat ${beat + 1}`}
                          aria-pressed={!!active}
                          onClick={() =>
                            update({
                              ...sketch,
                              tracks: sketch.tracks.map((t, i) =>
                                i === track
                                  ? {
                                      ...t,
                                      pattern: t.pattern.map((n, b) =>
                                        b === beat ? pianoPitch(midi) : n,
                                      ),
                                    }
                                  : t,
                              ),
                            })
                          }
                          className={`h-7 border-b border-black/10 ${active ? "bg-[#c5f235]" : beat >= notes.length ? "bg-[#17251e]" : "bg-[#283c33] hover:bg-[#435b48]"}`}
                          style={
                            position === beat
                              ? { boxShadow: "inset 2px 0 #6de5c4" }
                              : undefined
                          }
                        >
                          {active && (
                            <span className="text-[9px] font-semibold text-[#17352e]">
                              {notes[beat]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="p-4 text-xs text-slate-500">
              {notes.join(" · ")}
              {playing
                ? ` · Playing beat ${Math.min(position + 1, Math.max(...sketch.tracks.map((t) => t.pattern.length)))}`
                : ""}
            </p>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <h2 className="font-semibold text-[#17352e]">
            Add the arrangement for {selected.title}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Paste two tracks below to make this entry playable. No substitute
            melody will play under the song’s name.
          </p>
        </section>
      )}
      <details className="rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-[#17352e]">
          Import your two-track note pattern
        </summary>
        <p className="mt-3 text-xs text-slate-500">
          JSON with bpm and two tracks: piano first, synth_pad second. Identify
          each track with instrument or name. Each pattern accepts 1–16 pitch
          names (A0–C8), one beat each.
        </p>
        <textarea
          aria-label="Arrangement JSON"
          className="mt-3 min-h-40 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder={
            '{"bpm":100,"tracks":[{"instrument":"piano","pattern":["C4"]},{"instrument":"synth_pad","pattern":["C3"]}]}'
          }
        />
        <button
          className="mt-3 min-h-11 rounded-xl bg-[#17352e] px-4 text-sm font-semibold text-white"
          onClick={() => {
            try {
              update(parsePianoSketch(JSON.parse(json)));
              setMessage("Your note pattern is loaded.");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Invalid arrangement JSON.",
              );
            }
          }}
        >
          Load note pattern
        </button>
      </details>
    </div>
  );
}
