import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Square,
  Download,
  Drum,
  Guitar,
  Piano,
  Sparkles,
} from "lucide-react";
import { StudioNav } from "../../../../features/student/music-production/StudioNav";
import {
  beatChord,
  createBeat,
  styles,
  validBeat,
  type BeatMix,
} from "../../../../features/student/music-production/beat-model";
import { renderBeat } from "../../../../features/student/music-production/beat-audio";
import {
  validDraft,
  DRUMS,
} from "../../../../features/student/music-production/instrument-model";
import { parseRollProject } from "../../../../features/student/music-production/piano-roll-model";
import { wavBytes } from "../../../../features/student/music-production/instrument-audio";
import { useAuthStore } from "../../../../store/auth.store";
export default function BeatMaker() {
  const user = useAuthStore((s) => s.user);
  return (
    <Mixer
      key={`${user?.id}:${user?.schoolId}`}
      scope={`${user?.id}:${user?.schoolId}`}
    />
  );
}
function Mixer({ scope }: { scope: string }) {
  const key = `ah-beat-v1:${scope}`;
  const [mix, setMix] = useState<BeatMix>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      if (validBeat(v)) return v;
    } catch {}
    return createBeat();
  });
  const [style, setStyle] = useState("Dancehall"),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(-1),
    [pianoKey, setPianoKey] = useState(""),
    [history, setHistory] = useState<BeatMix[]>([]);
  const ctx = useRef<AudioContext>(),
    source = useRef<AudioBufferSourceNode>(),
    frame = useRef(0),
    ticket = useRef(0);
  function stop() {
    ticket.current++;
    cancelAnimationFrame(frame.current);
    source.current?.stop();
    source.current?.disconnect();
    source.current = undefined;
    setPlaying(false);
    setPosition(-1);
  }
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(mix));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [key, mix]);
  useEffect(
    () => () => {
      ticket.current++;
      cancelAnimationFrame(frame.current);
      source.current?.stop();
      void ctx.current?.close();
    },
    [],
  );
  function edit(next: BeatMix) {
    stop();
    setHistory((old) => [...old.slice(-19), mix]);
    setMix(next);
  }
  async function play() {
    stop();
    const t = ticket.current;
    try {
      ctx.current ??= new AudioContext();
      await ctx.current.resume();
      if (t !== ticket.current) return;
      const samples = renderBeat(mix),
        s = ctx.current.createBufferSource(),
        b = ctx.current.createBuffer(1, samples.length, 44100);
      b.getChannelData(0).set(samples);
      s.buffer = b;
      s.loop = true;
      s.connect(ctx.current.destination);
      source.current = s;
      const start = ctx.current.currentTime;
      s.start();
      setPlaying(true);
      const tick = () => {
        if (t !== ticket.current) return;
        setPosition(
          Math.floor(
            (ctx.current!.currentTime - start) / (60 / mix.draft.bpm / 4),
          ) %
            (mix.draft.chords.length * 16),
        );
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMessage("Audio could not start. Please try again.");
    }
  }
  function download(data: Blob, name: string) {
    const url = URL.createObjectURL(data),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function load(kind: "guitar" | "drums") {
    try {
      const d = JSON.parse(
        localStorage.getItem(`ah-instrument-v1:${scope}:${kind}`) || "null",
      );
      if (!validDraft(d))
        throw Error(
          "No saved " +
            kind +
            " draft yet. Open that studio and make a pattern first.",
        );
      const bars =
        kind === "guitar" ? d.chords.length : mix.draft.chords.length;
      edit({
        ...mix,
        draft:
          kind === "guitar"
            ? { ...d, bpm: mix.draft.bpm, drums: mix.draft.drums }
            : { ...mix.draft, drums: d.drums },
        piano: mix.piano.filter((n) => n.step + n.length <= bars * 16),
      });
      setMessage(`Loaded ${kind}. Shared tempo remains ${mix.draft.bpm} BPM.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load draft");
    }
  }
  let pianoKeys: string[] = [];
  try {
    pianoKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith(`ah-piano-roll-v2:${scope}:`),
    );
  } catch {}
  const button =
    "min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50";
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <StudioNav title="Beat Maker" subtitle="Three instruments. One groove." />
      <section className="rounded-2xl bg-[#17352e] p-5 text-white sm:p-7">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#c5f235]">
              Your production desk
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Build something worth replaying.
            </h2>
          </div>
          <span className="text-xs text-white/70">
            {saved ? "Saved on this device" : "Device storage unavailable"}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 items-end">
          <button
            className="min-h-12 rounded-xl bg-[#c5f235] px-6 font-bold text-[#17352e] flex items-center gap-2"
            onClick={() => (playing ? stop() : void play())}
          >
            {playing ? <Square size={18} /> : <Play size={18} />}
            {playing ? "Stop mix" : "Play mix"}
          </button>
          <label className="text-xs">
            Tempo
            <select
              aria-label="Beat tempo"
              className="block h-12 rounded-xl bg-white px-3 text-slate-900"
              value={mix.draft.bpm}
              onChange={(e) =>
                edit({
                  ...mix,
                  draft: { ...mix.draft, bpm: Number(e.target.value) },
                })
              }
            >
              {Array.from({ length: 101 }, (_, i) => i + 60).map((n) => (
                <option key={n} value={n}>
                  {n} BPM
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Key
            <select
              aria-label="Beat key"
              className="block h-12 rounded-xl bg-white px-3 text-slate-900"
              value={mix.transpose}
              onChange={(e) =>
                edit({ ...mix, transpose: Number(e.target.value) })
              }
            >
              {[
                "G",
                "Ab",
                "A",
                "Bb",
                "B",
                "C",
                "Db",
                "D",
                "Eb",
                "E",
                "F",
                "Gb",
              ].map((n, i) => (
                <option key={n} value={i - 5}>
                  {n} major / relative minor
                </option>
              ))}
            </select>
          </label>
          <button
            className="min-h-12 rounded-xl border border-white/30 px-4 flex items-center gap-2"
            onClick={() =>
              download(
                new Blob([wavBytes(renderBeat(mix))], { type: "audio/wav" }),
                "assignment-hub-beat.wav",
              )
            }
          >
            <Download size={17} />
            Export mixed WAV
          </button>
        </div>
        <div
          className="mt-5 grid grid-cols-4 gap-2"
          aria-label="Arrangement timeline"
        >
          {mix.draft.chords.map((c, b) => (
            <div
              key={b}
              className={`rounded-lg p-3 text-sm ${Math.floor(position / 16) === b ? "bg-[#c5f235] text-[#17352e]" : "bg-white/10"}`}
            >
              Bar {b + 1}
              <strong className="block">{beatChord(c, mix.transpose)}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-wrap gap-3 items-end rounded-2xl border bg-white p-4">
        <button
          className={button}
          disabled={!history.length}
          onClick={() => {
            stop();
            setMix(history.at(-1)!);
            setHistory(history.slice(0, -1));
          }}
        >
          Undo mix edit
        </button>
        <label className="text-xs text-slate-500">
          Original starter
          <select
            aria-label="Beat style"
            className="block min-h-11 rounded-xl border px-3 text-slate-900"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            {styles.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button
          className={button}
          onClick={() => {
            edit(createBeat(style));
            setMessage(
              "New original starter loaded. Your instrument studio drafts remain available.",
            );
          }}
        >
          <Sparkles className="inline mr-2" size={16} />
          Generate starter
        </button>
        <button
          className={button}
          onClick={() =>
            download(
              new Blob([JSON.stringify(mix, null, 2)], {
                type: "application/json",
              }),
              "assignment-hub-beat.json",
            )
          }
        >
          Back up JSON
        </button>
        <label className={button + " flex items-center cursor-pointer"}>
          Restore beat
          <input
            aria-label="Restore beat JSON"
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 250000) throw Error("File too large");
                const v = JSON.parse(await f.text());
                if (!validBeat(v)) throw Error("Invalid beat backup");
                edit(v);
                setMessage("Beat restored.");
              } catch {
                setMessage(
                  "Could not restore. Choose a valid Beat Maker JSON backup.",
                );
              }
              e.target.value = "";
            }}
          />
        </label>
      </section>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {message}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { name: "Drums", Icon: Drum, path: "drums", color: "bg-orange-100" },
          {
            name: "Guitar",
            Icon: Guitar,
            path: "guitar",
            color: "bg-lime-100",
          },
          { name: "Piano", Icon: Piano, path: "piano", color: "bg-sky-100" },
        ].map(({ name, Icon, path, color }, i) => (
          <section
            key={name}
            className="rounded-2xl border bg-white p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <span className={`rounded-xl p-3 ${color}`}>
                <Icon size={23} />
              </span>
              <h2 className="font-semibold">{name}</h2>
              <Link
                className="ml-auto text-xs underline"
                to={`/student/labs/music/${path}`}
              >
                Edit instrument
              </Link>
            </div>
            <label className="block text-xs">
              Level · {Math.round(mix.levels[i] * 100)}%
              <input
                aria-label={`${name} level`}
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="mt-3 w-full accent-[#17352e]"
                value={mix.levels[i]}
                onChange={(e) =>
                  edit({
                    ...mix,
                    levels: mix.levels.map((v, j) =>
                      j === i ? Number(e.target.value) : v,
                    ),
                  })
                }
              />
            </label>
            <div className="flex gap-2">
              <button
                aria-pressed={mix.muted[i]}
                className={button + (mix.muted[i] ? " bg-slate-200" : "")}
                onClick={() =>
                  edit({
                    ...mix,
                    muted: mix.muted.map((v, j) => (j === i ? !v : v)),
                  })
                }
              >
                Mute
              </button>
              <button
                aria-pressed={mix.solo === i}
                className={button + (mix.solo === i ? " bg-lime-100" : "")}
                onClick={() =>
                  edit({ ...mix, solo: mix.solo === i ? null : i })
                }
              >
                Solo
              </button>
            </div>
            {i < 2 ? (
              <button
                className={button + " w-full"}
                onClick={() => load(path as "drums" | "guitar")}
              >
                Load my saved {path}
              </button>
            ) : (
              <>
                <select
                  aria-label="Saved piano pattern"
                  className="w-full min-h-11 border rounded-xl px-2 text-xs"
                  value={pianoKey}
                  onChange={(e) => setPianoKey(e.target.value)}
                >
                  <option value="">Choose saved piano pattern</option>
                  {pianoKeys.map((k) => (
                    <option key={k} value={k}>
                      {k.split(":").slice(3).join(":")}
                    </option>
                  ))}
                </select>
                <button
                  className={button + " w-full"}
                  disabled={!pianoKey}
                  onClick={() => {
                    try {
                      const p = parseRollProject(
                        JSON.parse(localStorage.getItem(pianoKey) || "null"),
                      );
                      if (p.bars > mix.draft.chords.length)
                        throw Error(
                          "Load a guitar arrangement with enough bars first; piano notes will not be truncated.",
                        );
                      edit({
                        ...mix,
                        piano: p.tracks
                          .filter((t) => !t.muted)
                          .flatMap((t) =>
                            t.notes.map((n) => ({
                              step: n.start * 4,
                              length: n.duration * 4,
                              midi: n.midi,
                              velocity: Math.max(1, n.velocity * t.volume),
                            })),
                          ),
                      });
                      setMessage(
                        "Piano notes loaded at the shared tempo. Beat Maker uses its own warm keyboard voice.",
                      );
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : "Could not load piano",
                      );
                    }
                  }}
                >
                  Load piano notes
                </button>
              </>
            )}
          </section>
        ))}
      </div>
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold mb-3">Drum sequencer</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[580px] space-y-2">
            {DRUMS.map((name, row) => (
              <div key={name} className="flex gap-1 items-center">
                <span className="w-24 shrink-0 text-xs">{name}</span>
                {mix.draft.drums[row].map((hit, col) => (
                  <button
                    key={col}
                    aria-label={`${name} step ${col + 1}`}
                    aria-pressed={hit}
                    onClick={() =>
                      edit({
                        ...mix,
                        draft: {
                          ...mix.draft,
                          drums: mix.draft.drums.map((r, i) =>
                            i === row
                              ? r.map((v, j) => (j === col ? !v : v))
                              : r,
                          ),
                        },
                      })
                    }
                    className={`h-8 flex-1 rounded ${hit ? "bg-[#17352e]" : "bg-slate-100"} ${position % 16 === col ? "ring-2 ring-lime-400" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <p className="text-xs text-slate-500">
        One shared tempo · 4/4 · {mix.draft.chords.length} bars · Changes stop
        playback; press Play mix to hear the update. Drafts are saved in this
        browser; download JSON to keep a portable backup.
      </p>
    </div>
  );
}
