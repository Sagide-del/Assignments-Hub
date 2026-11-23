import { useEffect, useRef, useState } from "react";
import {
  Play,
  Square,
  Download,
  Undo2,
  Guitar,
  Drum,
  Volume2,
  Music2,
} from "lucide-react";
import { StudioNav } from "../../../../features/student/music-production/StudioNav";
import { useAuthStore } from "../../../../store/auth.store";
import {
  parseGuitarImport,
  CHORDS,
  DRUMS,
  PITCHES,
  pitch,
  starter,
  validDraft,
  toggleNote,
  guitarPresets,
  drumPresets,
  type InstrumentDraft,
  type ModuleKind,
} from "../../../../features/student/music-production/instrument-model";
import {
  SAMPLE_RATE,
  pluck,
  drum,
  renderInstrument,
  wavBytes,
} from "../../../../features/student/music-production/instrument-audio";
export default function InstrumentWorkspace({ kind }: { kind: ModuleKind }) {
  const user = useAuthStore((s) => s.user);
  return (
    <Workspace
      key={`${user?.id}:${user?.schoolId}:${kind}`}
      kind={kind}
      storageKey={`ah-instrument-v1:${user?.id}:${user?.schoolId}:${kind}`}
    />
  );
}
function Workspace({
  kind,
  storageKey,
}: {
  kind: ModuleKind;
  storageKey: string;
}) {
  const [draft, setDraft] = useState<InstrumentDraft>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (validDraft(raw)) return raw;
    } catch {
      /* Start safely if browser storage is unavailable. */
    }
    return starter();
  });
  const [bar, setBar] = useState(0),
    [length, setLength] = useState(2),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(-1),
    [volume, setVolume] = useState(0.7),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false),
    [history, setHistory] = useState<InstrumentDraft[]>([]),
    [busy, setBusy] = useState(false);
  const audio = useRef<AudioContext | null>(null),
    source = useRef<AudioBufferSourceNode | null>(null),
    gain = useRef<GainNode | null>(null),
    frame = useRef(0),
    generation = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [draft, storageKey]);
  function stop() {
    generation.current++;
    cancelAnimationFrame(frame.current);
    source.current?.stop();
    source.current?.disconnect();
    source.current = null;
    setPlaying(false);
    setPosition(-1);
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current++;
      cancelAnimationFrame(frame.current);
      source.current?.stop();
      source.current?.disconnect();
      void audio.current?.close().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (gain.current) gain.current.gain.value = volume;
  }, [volume]);
  function edit(next: InstrumentDraft) {
    stop();
    setHistory((old) => [...old.slice(-29), draft]);
    setDraft(next);
    setMessage("");
  }
  async function context() {
    if (!audio.current) {
      audio.current = new AudioContext();
      gain.current = audio.current.createGain();
      gain.current.gain.value = volume;
      gain.current.connect(audio.current.destination);
    }
    await audio.current.resume();
    return audio.current;
  }
  function buffer(ctx: AudioContext, samples: Float32Array) {
    const b = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    b.getChannelData(0).set(samples);
    return b;
  }
  async function audition(midiOrDrum: number) {
    try {
      const ctx = await context();
      if (!alive.current) return;
      const s = ctx.createBufferSource();
      s.buffer = buffer(
        ctx,
        kind === "guitar"
          ? pluck(midiOrDrum, 1.6, draft.voice)
          : drum(midiOrDrum),
      );
      s.connect(gain.current!);
      s.start();
      s.onended = () => s.disconnect();
    } catch {
      if (alive.current)
        setMessage(
          "Audio could not start. Check your browser audio settings and try again.",
        );
    }
  }
  async function play() {
    stop();
    const ticket = generation.current;
    setBusy(true);
    setMessage("");
    try {
      const ctx = await context();
      if (!alive.current || ticket !== generation.current) return;
      const samples = renderInstrument(draft, kind),
        s = ctx.createBufferSource();
      s.buffer = buffer(ctx, samples);
      s.loop = true;
      s.connect(gain.current!);
      source.current = s;
      const started = ctx.currentTime;
      s.start();
      setPlaying(true);
      const tick = () => {
        if (!alive.current || ticket !== generation.current) return;
        setPosition(
          Math.floor((ctx.currentTime - started) / (60 / draft.bpm / 4)) %
            (draft.chords.length * 16),
        );
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      if (alive.current)
        setMessage(
          "Playback could not start. Try again or download your audio.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function download() {
    try {
      const bytes = wavBytes(renderInstrument(draft, kind)),
        url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" })),
        link = document.createElement("a");
      link.href = url;
      link.download = `assignment-hub-${kind}-${draft.bpm}bpm.wav`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage("Your guitar/drum WAV is ready.");
    } catch {
      setMessage("Audio export failed. Please try again.");
    }
  }
  function preset(name: string) {
    if (kind === "guitar") {
      setBar(0);
      const p = guitarPresets[name as keyof typeof guitarPresets];
      edit({
        ...draft,
        bpm: p.bpm,
        chords: [...p.chords],
        melody: Array.from({ length: 4 }, (_, b) =>
          p.phrase.map((midi, i) => ({
            step: b * 16 + i * 2,
            midi,
            length: 2,
          })),
        ).flat(),
      });
    } else {
      const p = drumPresets[name];
      edit({
        ...draft,
        bpm: p.bpm,
        drums: p.hits.map((h) =>
          Array.from({ length: 16 }, (_, i) => h.includes(i)),
        ),
      });
    }
  }
  const guitar = kind === "guitar",
    Icon = guitar ? Guitar : Drum,
    current = position < 0 ? -1 : position % 16;
  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#17352e] hover:bg-slate-50 disabled:opacity-40";
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <StudioNav
        title={guitar ? "Guitar Studio" : "Drum Studio"}
        subtitle={
          guitar
            ? "Find a melody. Give it your own touch."
            : "Build the groove, one beat at a time."
        }
      />
      <section className="overflow-hidden rounded-2xl bg-[#17352e] p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#c5f235]">
              <Icon size={18} />
              {guitar ? "Strings & melodies" : "Rhythm workshop"}
            </div>
            <h2 className="text-xl font-semibold sm:text-2xl">
              {guitar
                ? "Small ideas. Beautiful melodies."
                : "Make a beat that feels like you."}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              {guitar
                ? "Start with an original melody, shape the notes and add warm guitar chords."
                : "Play the pads or build a loop. Explore original reggae, dancehall and folk-inspired patterns."}
            </p>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/80">
            {saved
              ? "Draft saved on this device"
              : "Draft not saved — browser storage unavailable"}
          </span>
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#c5f235] px-5 font-bold text-[#17352e] disabled:opacity-50"
            disabled={busy}
            onClick={() => (playing ? stop() : void play())}
          >
            {playing ? <Square size={17} /> : <Play size={17} />}{" "}
            {playing ? "Stop" : busy ? "Preparing…" : "Play loop"}
          </button>
          <label className="text-xs text-white/70">
            Tempo
            <input
              aria-label="Tempo"
              type="number"
              min={60}
              max={160}
              value={draft.bpm}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 60 && n <= 160)
                  edit({ ...draft, bpm: n });
              }}
              className="mt-1 block h-11 w-20 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white"
            />
          </label>
          <label className="text-xs text-white/70">
            {guitar ? "Guitar tone" : "Pattern length"}
            {guitar ? (
              <select
                aria-label="Guitar tone"
                value={draft.voice}
                onChange={(e) =>
                  edit({ ...draft, voice: e.target.value as "Nylon" | "Steel" })
                }
                className="mt-1 block h-11 rounded-xl bg-white px-3 text-sm text-[#17352e]"
              >
                <option>Nylon</option>
                <option>Steel</option>
              </select>
            ) : (
              <span className="mt-1 flex h-11 items-center rounded-xl border border-white/20 px-3 text-sm">
                16 steps · 4/4
              </span>
            )}
          </label>
          <label className="flex min-h-11 items-center gap-2 px-2 text-xs">
            <Volume2 size={17} />
            <span className="sr-only">Master volume</span>
            <input
              aria-label="Master volume"
              className="w-24 accent-[#c5f235]"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
          <button
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm hover:bg-white/10"
            onClick={download}
          >
            <Download size={16} />
            Download WAV
          </button>
        </div>
      </section>
      {guitar && (
        <section className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <h2 className="font-semibold">Import a guitar melody</h2>
            <a
              className="text-sm underline"
              href="/downloads/coastal-lanterns-guitar.json"
              download
            >
              Download Coastal Lanterns · 16 bars
            </a>
          </div>
          <textarea
            aria-label="Guitar JSON"
            id="guitar-json"
            className="w-full h-24 rounded-xl border p-3 font-mono text-xs"
            placeholder="Paste guitar JSON here"
          />
          <button
            className={button}
            onClick={() => {
              try {
                const next = parseGuitarImport(
                  JSON.parse(
                    (
                      document.getElementById(
                        "guitar-json",
                      ) as HTMLTextAreaElement
                    ).value,
                  ),
                );
                edit(next);
                setBar(0);
                setMessage(`Imported ${next.chords.length} bars.`);
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Invalid JSON");
              }
            }}
          >
            Import guitar JSON
          </button>
        </section>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {message}
        </p>
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#101820]">
              {guitar ? "Choose a starting melody" : "Find your groove"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {guitar
                ? "Original sketches, ready to make your own."
                : "Learning patterns inspired by styles; not recordings of traditional performances."}
            </p>
          </div>
          <button
            className={button}
            disabled={!history.length}
            onClick={() => {
              stop();
              setDraft(history.at(-1)!);
              setHistory(history.slice(0, -1));
            }}
          >
            <Undo2 size={16} />
            Undo
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(guitar ? guitarPresets : drumPresets).map((name) => (
            <button key={name} className={button} onClick={() => preset(name)}>
              {name}
            </button>
          ))}
        </div>
      </section>
      {guitar ? (
        <>
          <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border border-slate-200 bg-[#fbfaf6] p-5">
              <h2 className="font-semibold text-[#17352e]">Play the strings</h2>
              <p className="mt-1 text-xs text-slate-500">
                Standard tuning · tap a string to hear it.
              </p>
              <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#34251d] via-[#715137] to-[#34251d] px-3 py-4 shadow-inner">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-2/3 w-24 bg-[#101820]/65"
                />
                {[64, 59, 55, 50, 45, 40].map((midi, i) => (
                  <button
                    key={midi}
                    onClick={() => void audition(midi)}
                    aria-label={`Pluck ${pitch(midi)} string`}
                    className="group relative flex h-11 w-full items-center gap-3 rounded-lg px-2 hover:bg-white/10 active:bg-white/20"
                  >
                    <span className="w-7 text-xs font-semibold text-[#f6e6c0]">
                      {pitch(midi)}
                    </span>
                    <span
                      className="block flex-1 rounded-full bg-gradient-to-b from-[#fff5d5] to-[#947448] shadow"
                      style={{ height: 1 + i * 0.45 }}
                    />
                    <span className="w-5 text-xs text-white/50">{i + 1}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-[#17352e]">
                Your chord progression
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                One chord per bar · a gentle strummed backing under your melody.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {draft.chords.map((chord, i) => (
                  <label
                    key={i}
                    className="rounded-xl bg-[#eef3e7] p-3 text-xs text-[#52614e]"
                  >
                    Bar {i + 1}
                    <select
                      aria-label={`Bar ${i + 1} chord`}
                      className="mt-2 block min-h-11 w-full rounded-lg border-0 bg-white px-2 text-lg font-semibold text-[#17352e]"
                      value={chord}
                      onChange={(e) =>
                        edit({
                          ...draft,
                          chords: draft.chords.map((c, b) =>
                            i === b ? e.target.value : c,
                          ),
                        })
                      }
                    >
                      {Object.keys(CHORDS).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-100 p-4">
                <Music2 className="shrink-0 text-[#6c841d]" size={20} />
                <p className="text-sm leading-6 text-slate-600">
                  Try C → Am → F → G. Leave a little space between notes, then
                  listen for a phrase you can hum back.
                </p>
              </div>
            </div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <h2 className="font-semibold text-[#17352e]">
                Guitar piano roll
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-1" aria-label="Melody bars">
                  {draft.chords.map((_, b) => (
                    <button
                      key={b}
                      aria-pressed={bar === b}
                      className={`min-h-10 rounded-lg px-3 text-xs ${bar === b ? "bg-[#17352e] text-white" : "bg-slate-100 text-slate-600"}`}
                      onClick={() => setBar(b)}
                    >
                      Bar {b + 1}
                    </button>
                  ))}
                </div>
                <label className="text-xs text-slate-600">
                  Note length{" "}
                  <select
                    aria-label="Note length"
                    className="min-h-10 rounded-lg border border-slate-200 px-2"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                  >
                    {[1, 2, 4, 8].map((n) => (
                      <option key={n} value={n}>
                        {n === 1
                          ? "1/16"
                          : n === 2
                            ? "1/8"
                            : n === 4
                              ? "1/4"
                              : "1/2"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <p className="px-4 pb-3 text-xs text-slate-500">
              Tap to add or remove a note. Longer blocks sustain. Scroll
              sideways on a phone.
            </p>
            <div className="overflow-x-auto bg-[#111e1b] p-3">
              <div
                className="min-w-[720px]"
                role="group"
                aria-label="Guitar note editor"
              >
                <div
                  className="mb-1 grid gap-px"
                  style={{
                    gridTemplateColumns: "52px repeat(16,minmax(0,1fr))",
                  }}
                >
                  <span />
                  {Array.from({ length: 16 }, (_, s) => (
                    <span
                      key={s}
                      className="py-1 text-center text-[10px] text-white/45"
                    >
                      {s % 4 === 0 ? s / 4 + 1 : "·"}
                    </span>
                  ))}
                </div>
                {PITCHES.map((midi) => (
                  <div
                    key={midi}
                    className="grid gap-px"
                    style={{
                      gridTemplateColumns: "52px repeat(16,minmax(0,1fr))",
                    }}
                  >
                    <button
                      onClick={() => void audition(midi)}
                      className={`h-7 rounded-l-sm text-[10px] ${pitch(midi).includes("♯") ? "bg-[#31423c] text-white/80" : "bg-[#e9eee7] text-[#17352e]"}`}
                      aria-label={`Hear ${pitch(midi)}`}
                    >
                      {pitch(midi)}
                    </button>
                    {Array.from({ length: 16 }, (_, s) => {
                      const step = bar * 16 + s,
                        note = draft.melody.find(
                          (n) =>
                            n.midi === midi &&
                            step >= n.step &&
                            step < n.step + n.length,
                        );
                      return (
                        <button
                          key={s}
                          aria-label={`${pitch(midi)} step ${s + 1}`}
                          aria-pressed={!!note}
                          onClick={() => {
                            const start = note?.step ?? step;
                            edit(toggleNote(draft, start, midi, length));
                            if (!note) void audition(midi);
                          }}
                          className={`relative h-7 border-b border-black/15 transition ${note ? "bg-[#c5f235] hover:bg-[#d8fa7b]" : s % 4 === 0 ? "bg-[#283c33] hover:bg-[#3c5344]" : "bg-[#203029] hover:bg-[#3c5344]"}`}
                          style={
                            position === step
                              ? { boxShadow: "inset 2px 0 #6de5c4" }
                              : undefined
                          }
                        >
                          {note?.step === step && (
                            <span className="absolute left-1 top-1.5 text-[9px] font-semibold text-[#17352e]">
                              {pitch(midi)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-[#17352e]">Drum pads</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tap to audition each sound. Add hits to the sequencer below.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DRUMS.map((name, i) => (
                <button
                  key={name}
                  onClick={() => void audition(i)}
                  className="flex min-h-24 flex-col items-start justify-between rounded-xl border border-[#d9dfd6] bg-[#fbfaf6] p-4 text-left text-[#17352e] shadow-sm transition hover:border-[#8ca34d] active:scale-95 active:bg-[#edf5d8]"
                >
                  <span className="text-xs text-slate-400">0{i + 1}</span>
                  <span className="font-semibold">{name}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h2 className="font-semibold text-[#17352e]">Step sequencer</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Four beats · four steps per beat · your pattern repeats for
                  four bars.
                </p>
              </div>
              <button
                className={button}
                onClick={() =>
                  edit({
                    ...draft,
                    drums: draft.drums.map((row) => row.map(() => false)),
                  })
                }
              >
                Clear pattern
              </button>
            </div>
            <div className="overflow-x-auto bg-[#111e1b] p-4">
              <div
                className="min-w-[740px] space-y-2"
                role="group"
                aria-label="Drum step sequencer"
              >
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: "100px repeat(16,minmax(0,1fr))",
                  }}
                >
                  <span />
                  {Array.from({ length: 16 }, (_, s) => (
                    <span
                      key={s}
                      className="text-center text-[10px] text-white/45"
                    >
                      {s % 4 === 0 ? s / 4 + 1 : "·"}
                    </span>
                  ))}
                </div>
                {DRUMS.map((name, i) => (
                  <div
                    key={name}
                    className="grid items-center gap-2"
                    style={{
                      gridTemplateColumns: "100px repeat(16,minmax(0,1fr))",
                    }}
                  >
                    <button
                      className="min-h-10 text-left text-xs font-medium text-white/80"
                      onClick={() => void audition(i)}
                    >
                      {name}
                    </button>
                    {draft.drums[i].map((hit, s) => (
                      <button
                        key={s}
                        aria-label={`${name} step ${s + 1}`}
                        aria-pressed={hit}
                        onClick={() => {
                          edit({
                            ...draft,
                            drums: draft.drums.map((row, r) =>
                              r === i
                                ? row.map((v, c) => (c === s ? !v : v))
                                : row,
                            ),
                          });
                          if (!hit) void audition(i);
                        }}
                        className={`h-10 rounded-md border transition ${hit ? "border-[#c5f235] bg-[#c5f235] shadow-[0_0_12px_#c5f23525]" : s % 4 === 0 ? "border-[#43584c] bg-[#34473b] hover:bg-[#455e4d]" : "border-[#2c3d32] bg-[#223329] hover:bg-[#455e4d]"}`}
                        style={
                          current === s
                            ? { outline: "2px solid #6de5c4", outlineOffset: 2 }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
      <p className="text-xs leading-5 text-slate-500">
        {playing ? `Playing · bar ${Math.floor(position / 16) + 1} of 4. ` : ""}
        Edits stop playback so you can hear the updated pattern when you press
        Play. Drafts stay in this browser; download a WAV to keep your audio.
      </p>
    </div>
  );
}
