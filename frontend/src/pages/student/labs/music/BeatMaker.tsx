import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Square,
  Download,
  Drum,
  Guitar,
  Piano,
  Layers,
  Plus,
  Copy,
  Trash2,
  Sparkles,
  Undo2,
  Volume2,
} from "lucide-react";
import { StudioNav } from "../../../../features/student/music-production/StudioNav";
import { styles } from "../../../../features/student/music-production/beat-model";
import {
  addClip,
  changeClip,
  duplicateClip,
  importPart,
  newMaster,
  parseMaster,
  resizeArrangement,
  type MasterProject,
  type TrackId,
} from "../../../../features/student/music-production/master-model";
import {
  connectMaster,
  exportMaster,
  MASTER_RATE,
  renderProductionStems,
  updateMaster,
  type MasterGraph,
} from "../../../../features/student/music-production/master-audio";
import { useAuthStore } from "../../../../store/auth.store";
const tracks = [
  { name: "Drums", kind: "drums", Icon: Drum, color: "#e9bd88" },
  { name: "Guitar", kind: "guitar", Icon: Guitar, color: "#b9d983" },
  { name: "Piano", kind: "piano", Icon: Piano, color: "#8bc8d9" },
] as const;
function readProject(scope: string) {
  try {
    const current = localStorage.getItem(`ah-master-v2:${scope}`),
      legacy = localStorage.getItem(`ah-beat-v1:${scope}`);
    if (current || legacy) return parseMaster(JSON.parse(current || legacy!));
  } catch {}
  return newMaster();
}
export default function BeatMaker() {
  const user = useAuthStore((s) => s.user);
  return (
    <Master
      key={`${user?.id}:${user?.schoolId}`}
      scope={`${user?.id}:${user?.schoolId}`}
    />
  );
}
function Master({ scope }: { scope: string }) {
  const [project, setProject] = useState(() => readProject(scope)),
    [history, setHistory] = useState<MasterProject[]>([]),
    [selected, setSelected] = useState(""),
    [style, setStyle] = useState("Dancehall"),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false),
    [playing, setPlaying] = useState(false),
    [busy, setBusy] = useState(false),
    [bar, setBar] = useState(-1),
    [peak, setPeak] = useState(0),
    [loop, setLoop] = useState(true),
    [pianoKey, setPianoKey] = useState("");
  const ctx = useRef<AudioContext>(),
    graph = useRef<MasterGraph>(),
    sources = useRef<AudioBufferSourceNode[]>([]),
    frame = useRef(0),
    generation = useRef(0),
    mounted = useRef(true),
    loopRef = useRef(loop),
    latest = useRef(project),
    handoff = useRef(false),
    cache = useRef<{ signature: string; stems: Float32Array[] }>();
  latest.current = project;
  loopRef.current = loop;
  function stop() {
    generation.current++;
    cancelAnimationFrame(frame.current);
    sources.current.forEach((s) => {
      s.onended = null;
      s.stop();
      s.disconnect();
    });
    sources.current = [];
    graph.current?.disconnect();
    graph.current = undefined;
    setPlaying(false);
    setBar(-1);
    setPeak(0);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      cancelAnimationFrame(frame.current);
      sources.current.forEach((s) => {
        s.onended = null;
        s.stop();
        s.disconnect();
      });
      graph.current?.disconnect();
      void ctx.current?.close();
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(`ah-master-v2:${scope}`, JSON.stringify(project));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [project, scope]);
  useEffect(() => {
    if (handoff.current) return;
    handoff.current = true;
    try {
      const key = `ah-master-handoff:${scope}`,
        raw = localStorage.getItem(key);
      if (!raw) return;
      const v = JSON.parse(raw);
      if (!["drums", "guitar", "piano"].includes(v.kind))
        throw Error("Invalid instrument handoff.");
      const next = importPart(latest.current, v.kind, v.payload);
      setHistory([latest.current]);
      setProject(next);
      localStorage.removeItem(key);
      setMessage(
        `${v.kind} added to Master Beat. Notes use the shared tempo. Piano key is not supplied; check the harmony before exporting.`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not import instrument.",
      );
    }
  }, [scope]);
  function edit(next: MasterProject, live = false) {
    try {
      const valid = parseMaster(next);
      if (!live) stop();
      setHistory((old) => [...old.slice(-19), latest.current]);
      setProject(valid);
      if (live && ctx.current && graph.current)
        updateMaster(graph.current, valid, ctx.current.currentTime);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid change");
    }
  }
  function action(fn: () => MasterProject) {
    try {
      edit(fn());
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Cannot place clip");
    }
  }
  async function play() {
    stop();
    setBusy(true);
    const ticket = generation.current;
    try {
      ctx.current ??= new AudioContext();
      await ctx.current.resume();
      if (!mounted.current || ticket !== generation.current) return;
      const p = latest.current,
        signature = JSON.stringify({
          draft: p.mix.draft,
          piano: p.mix.piano,
          pianoSource: p.pianoSource,
          sourceBars: p.sourceBars,
          transpose: p.mix.transpose,
          clips: p.clips,
          bars: p.bars,
          fadeOutBars: p.fadeOutBars,
        });
      if (cache.current?.signature !== signature)
        cache.current = { signature, stems: await renderProductionStems(p) };
      if (!mounted.current || ticket !== generation.current) return;
      const g = connectMaster(ctx.current);
      graph.current = g;
      updateMaster(g, latest.current, ctx.current.currentTime, true);
      const start = ctx.current.currentTime + 0.04;
      cache.current.stems.forEach((samples, i) => {
        const s = ctx.current!.createBufferSource(),
          b = ctx.current!.createBuffer(1, samples.length, MASTER_RATE);
        b.getChannelData(0).set(samples);
        s.buffer = b;
        s.loop = loopRef.current;
        s.connect(g.gains[i]);
        sources.current.push(s);
        s.start(start);
      });
      sources.current[0].onended = () => {
        if (mounted.current && ticket === generation.current) stop();
      };
      setPlaying(true);
      const values = new Float32Array(g.meter.fftSize),
        duration = (p.bars * 240) / p.mix.draft.bpm;
      let last = 0;
      const tick = () => {
        if (ticket !== generation.current) return;
        const time = ctx.current!.currentTime;
        if (time - last > 0.055) {
          setBar(
            Math.max(0, ((time - start) % duration) / (240 / p.mix.draft.bpm)),
          );
          g.meter.getFloatTimeDomainData(values);
          setPeak(values.reduce((n, v) => Math.max(n, Math.abs(v)), 0));
          last = time;
        }
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMessage("Audio could not start. Try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function download(blob: Blob, name: string) {
    const u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 30000);
  }
  async function exportAudio() {
    setBusy(true);
    setMessage("Rendering your complete stereo arrangement…");
    try {
      const data = await exportMaster(latest.current);
      if (!mounted.current) return;
      download(
        new Blob([data], { type: "audio/wav" }),
        "assignment-hub-master-beat.wav",
      );
      setMessage(
        "Stereo Master Beat exported with your arrangement, mixer settings and output limiter.",
      );
    } catch {
      if (mounted.current) setMessage("Export failed. Please try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function load(kind: "drums" | "guitar" | "piano") {
    try {
      const raw = localStorage.getItem(
        kind === "piano" ? pianoKey : `ah-instrument-v1:${scope}:${kind}`,
      );
      if (!raw)
        throw Error(
          "No saved pattern. Open the instrument and use Send to Master Beat.",
        );
      edit(importPart(project, kind, JSON.parse(raw)));
      setMessage(
        `Loaded ${kind}. Shared tempo retained. ${kind === "piano" ? "Piano key is not supplied; listen for clashes and transpose if needed." : ""}`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load instrument");
    }
  }
  let pianoKeys: string[] = [];
  try {
    pianoKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith(`ah-piano-roll-v2:${scope}:`),
    );
  } catch {}
  const clip = project.clips.find((c) => c.id === selected),
    width = project.bars * 52,
    button =
      "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#17352e] hover:bg-slate-50 disabled:opacity-40";
  return (
    <div className="master-beat mx-auto max-w-[1500px] space-y-4 pb-6">
      <StudioNav
        title="Master Beat"
        subtitle="Compose. Arrange. Make it yours."
        compact
      />
      <section className="rounded-2xl bg-[#17352e] p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[.2em] text-[#c5f235]">
              Production workspace
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              Your instruments. One finished track.
            </h2>
          </div>
          <span className="text-xs text-white/60">
            {saved ? "Saved on this device" : "Device storage unavailable"}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <button
            aria-label={playing ? "Stop Master Beat" : "Play Master Beat"}
            disabled={busy}
            onClick={() => (playing ? stop() : void play())}
            className="flex h-12 items-center gap-2 rounded-xl bg-[#c5f235] px-5 font-bold text-[#17352e] disabled:opacity-40"
          >
            {playing ? <Square size={18} /> : <Play size={18} />}
            {playing ? "Stop" : busy ? "Preparing…" : "Play"}
          </button>
          <label className="text-[11px] text-white/70">
            Tempo
            <select
              aria-label="Master tempo"
              value={project.mix.draft.bpm}
              onChange={(e) =>
                edit({
                  ...project,
                  mix: {
                    ...project.mix,
                    draft: {
                      ...project.mix.draft,
                      bpm: Number(e.target.value),
                    },
                  },
                })
              }
              className="mt-1 block h-11 rounded-lg bg-white/10 px-3 text-white [&>option]:text-slate-900"
            >
              {Array.from({ length: 101 }, (_, i) => i + 60).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-white/70">
            Transpose
            <select
              aria-label="Master transpose"
              value={project.mix.transpose}
              onChange={(e) =>
                edit({
                  ...project,
                  mix: { ...project.mix, transpose: Number(e.target.value) },
                })
              }
              className="mt-1 block h-11 rounded-lg bg-white/10 px-3 text-white [&>option]:text-slate-900"
            >
              {Array.from({ length: 12 }, (_, i) => i - 5).map((n) => (
                <option key={n} value={n}>
                  {n > 0 ? "+" : ""}
                  {n} semitones
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-white/70">
            Song length
            <select
              aria-label="Arrangement bars"
              value={project.bars}
              onChange={(e) => {
                action(() =>
                  resizeArrangement(project, Number(e.target.value)),
                );
                setSelected("");
              }}
              className="mt-1 block h-11 rounded-lg bg-white/10 px-3 text-white [&>option]:text-slate-900"
            >
              {[4, 8, 16, 24, 32, 48, 64].map((n) => (
                <option key={n} value={n}>
                  {n} bars
                </option>
              ))}
            </select>
          </label>
          <button
            aria-pressed={loop}
            className="h-11 rounded-lg border border-white/25 px-3 text-xs"
            onClick={() => {
              setLoop(!loop);
              sources.current.forEach((s) => (s.loop = !loop));
            }}
          >
            Loop {loop ? "on" : "off"}
          </button>
          <span className="font-mono text-xs text-white/70">
            {playing
              ? `Bar ${Math.floor(bar) + 1}`
              : `${Math.round((project.bars * 240) / project.mix.draft.bpm)}s`}{" "}
            · 4/4
          </span>
          <button
            disabled={busy}
            className="ml-auto flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#17352e] disabled:opacity-40"
            onClick={() => void exportAudio()}
          >
            <Download size={17} />
            Export Master Beat
          </button>
        </div>
      </section>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          {message}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="master-style">
          Original style
        </label>
        <select
          id="master-style"
          className={button}
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          {styles.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          className={button}
          onClick={() => {
            edit(newMaster(style));
            setSelected("");
            setMessage(
              "Original 24-bar arrangement loaded. Undo restores your previous project.",
            );
          }}
        >
          <Sparkles size={15} />
          New arrangement
        </button>
        <button
          className={button}
          disabled={!history.length}
          onClick={() => {
            stop();
            setProject(history.at(-1)!);
            setHistory(history.slice(0, -1));
            setSelected("");
          }}
        >
          <Undo2 size={15} />
          Undo
        </button>
        <button
          className={button}
          onClick={() =>
            download(
              new Blob([JSON.stringify(project, null, 2)], {
                type: "application/json",
              }),
              "assignment-hub-master-beat.json",
            )
          }
        >
          Back up project
        </button>
        <label className={button + " cursor-pointer"}>
          Restore project
          <input
            aria-label="Restore Master Beat JSON"
            className="sr-only"
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 300000) throw Error("File too large.");
                edit(parseMaster(JSON.parse(await file.text())));
                setMessage("Project restored.");
              } catch (err) {
                setMessage(
                  err instanceof Error ? err.message : "Invalid project",
                );
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#101d1b]">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Layers size={17} />
            Arrangement
          </h2>
          <span className="text-[10px] text-white/50">
            Drag clips to move · select to trim or repeat
          </span>
        </div>
        <div className="overflow-x-auto" aria-label="Master arrangement">
          <div style={{ width: width + 100 }} className="relative">
            <div className="ml-[100px] flex h-9">
              {Array.from({ length: project.bars }, (_, i) => (
                <div
                  key={i}
                  style={{ width: 52 }}
                  className="shrink-0 border-l border-white/10 pl-2 pt-2 font-mono text-[10px] text-white/50"
                >
                  {i + 1}
                </div>
              ))}
            </div>
            {tracks.map(({ name, Icon, color }, track) => (
              <div key={name} className="flex border-t border-white/10">
                <div className="sticky left-0 z-20 flex w-[100px] shrink-0 items-center gap-2 bg-[#152622] px-3 text-xs font-semibold text-white">
                  <Icon size={16} />
                  {name}
                </div>
                <div
                  data-track={track}
                  className="relative h-[82px]"
                  style={{
                    width,
                    backgroundImage:
                      "linear-gradient(to right,rgba(255,255,255,.07) 1px,transparent 1px)",
                    backgroundSize: "52px 100%",
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const found = project.clips.find(
                      (c) => c.id === e.dataTransfer.getData("text/plain"),
                    );
                    if (!found || found.track !== track) return;
                    const x =
                      e.clientX - e.currentTarget.getBoundingClientRect().left;
                    action(() =>
                      changeClip(project, {
                        ...found,
                        start: Math.max(
                          0,
                          Math.min(
                            project.bars - found.length,
                            Math.round(x / 52),
                          ),
                        ),
                      }),
                    );
                  }}
                >
                  {project.clips
                    .filter((c) => c.track === track)
                    .map((c) => (
                      <button
                        key={c.id}
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", c.id)
                        }
                        aria-label={`${name} clip bar ${c.start + 1}, ${c.length} bars`}
                        aria-pressed={selected === c.id}
                        onClick={() => setSelected(c.id)}
                        className={`absolute top-2 h-[66px] overflow-hidden rounded-lg border-2 text-left ${selected === c.id ? "border-white" : "border-transparent"}`}
                        style={{
                          left: c.start * 52 + 2,
                          width: c.length * 52 - 4,
                          background: color,
                        }}
                      >
                        <span className="block truncate px-2 pt-1 text-[11px] font-bold text-[#17352e]">
                          {name} · {c.length} bars
                        </span>
                        <span
                          aria-hidden="true"
                          className="flex h-7 items-center gap-1 px-2 opacity-40"
                        >
                          {Array.from(
                            { length: Math.min(c.length * 4, 48) },
                            (_, i) => (
                              <span
                                key={i}
                                className="w-1.5 rounded-sm bg-[#17352e]"
                                style={{
                                  height: 5 + ((i * 7 + track * 3) % 18),
                                }}
                              />
                            ),
                          )}
                        </span>
                      </button>
                    ))}
                  {playing && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-[#c5f235]"
                      style={{ left: bar * 52 }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 px-4 py-2 text-[10px] text-white/50">
          <span>Starter guide: Intro · 1–4</span>
          <span>Verse · 5–12</span>
          <span>Chorus · 13–20</span>
          <span>Outro · 21–24</span>
        </div>
      </section>
      <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
        <label className="text-xs">
          Track
          <select
            aria-label="Add clip track"
            id="add-clip-track"
            className="ml-2 rounded-lg border p-2"
          >
            {tracks.map((t, i) => (
              <option key={t.name} value={i}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Start bar
          <input
            aria-label="Add clip start bar"
            id="add-clip-start"
            type="number"
            min="1"
            max={project.bars}
            defaultValue="1"
            className="ml-2 w-16 rounded-lg border p-2"
          />
        </label>
        <button
          className={button}
          onClick={() => {
            const track = Number(
                (document.getElementById("add-clip-track") as HTMLSelectElement)
                  .value,
              ) as TrackId,
              start =
                Number(
                  (
                    document.getElementById(
                      "add-clip-start",
                    ) as HTMLInputElement
                  ).value,
                ) - 1;
            action(() =>
              addClip(
                project,
                track,
                start,
                Math.min(project.mix.draft.chords.length, project.bars - start),
              ),
            );
          }}
        >
          <Plus size={15} />
          Add clip
        </button>
        {clip && (
          <>
            <span className="h-7 border-l" />
            <label className="text-xs">
              Move to bar
              <input
                key={clip.id + "start" + clip.start}
                aria-label="Selected clip start"
                className="ml-2 w-16 rounded-lg border p-2"
                type="number"
                defaultValue={clip.start + 1}
                onBlur={(e) => {
                  const start = Number(e.target.value) - 1;
                  e.currentTarget.value = String(clip.start + 1);
                  action(() => changeClip(project, { ...clip, start }));
                }}
              />
            </label>
            <label className="text-xs">
              Length
              <input
                key={clip.id + "length" + clip.length}
                aria-label="Selected clip length"
                className="ml-2 w-16 rounded-lg border p-2"
                type="number"
                min="1"
                defaultValue={clip.length}
                onBlur={(e) => {
                  const length = Number(e.target.value);
                  e.currentTarget.value = String(clip.length);
                  action(() => changeClip(project, { ...clip, length }));
                }}
              />
            </label>
            <label className="text-xs">
              Source bar
              <select
                aria-label="Selected clip source bar"
                value={clip.offset}
                onChange={(e) =>
                  action(() =>
                    changeClip(project, {
                      ...clip,
                      offset: Number(e.target.value),
                    }),
                  )
                }
                className="ml-2 rounded-lg border p-2"
              >
                {Array.from(
                  { length: project.sourceBars[clip.track] },
                  (_, i) => (
                    <option value={i} key={i}>
                      {i + 1}
                    </option>
                  ),
                )}
              </select>
            </label>
            <button
              className={button}
              onClick={() => action(() => duplicateClip(project, clip))}
            >
              <Copy size={14} />
              Repeat clip
            </button>
            <button
              className={button}
              onClick={() => {
                edit({
                  ...project,
                  clips: project.clips.filter((c) => c.id !== clip.id),
                });
                setSelected("");
              }}
            >
              <Trash2 size={14} />
              Remove clip
            </button>
          </>
        )}
      </section>
      <div className="grid gap-3 lg:grid-cols-4">
        {tracks.map(({ name, Icon, color, kind }, i) => (
          <section
            key={name}
            className="space-y-3 rounded-2xl border bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-lg p-2" style={{ background: color }}>
                <Icon size={18} />
              </span>
              <h2 className="font-semibold text-sm">{name}</h2>
              <Link
                className="ml-auto text-[10px] underline"
                to={`/student/labs/music/${kind}`}
              >
                Edit
              </Link>
            </div>
            <p className="min-h-8 text-[10px] text-slate-500">
              {project.sources[i]}
            </p>
            <label className="block text-xs">
              Volume · {Math.round(project.mix.levels[i] * 100)}%
              <input
                aria-label={`${name} volume`}
                type="range"
                min="0"
                max="1"
                step=".01"
                value={project.mix.levels[i]}
                className="mt-2 w-full accent-[#17352e]"
                onChange={(e) =>
                  edit(
                    {
                      ...project,
                      mix: {
                        ...project.mix,
                        levels: project.mix.levels.map((v, j) =>
                          i === j ? Number(e.target.value) : v,
                        ),
                      },
                    },
                    true,
                  )
                }
              />
            </label>
            <label className="block text-xs">
              Pan ·{" "}
              {project.pan[i] === 0
                ? "Centre"
                : `${Math.round(Math.abs(project.pan[i]) * 100)}% ${project.pan[i] < 0 ? "L" : "R"}`}
              <input
                aria-label={`${name} pan`}
                type="range"
                min="-1"
                max="1"
                step=".05"
                value={project.pan[i]}
                className="mt-2 w-full accent-[#17352e]"
                onChange={(e) =>
                  edit(
                    {
                      ...project,
                      pan: project.pan.map((v, j) =>
                        i === j ? Number(e.target.value) : v,
                      ),
                    },
                    true,
                  )
                }
              />
            </label>
            <div className="flex gap-2">
              <button
                aria-label={`Mute ${name}`}
                aria-pressed={project.mix.muted[i]}
                className={
                  button + (project.mix.muted[i] ? " !bg-slate-200" : "")
                }
                onClick={() =>
                  edit(
                    {
                      ...project,
                      mix: {
                        ...project.mix,
                        muted: project.mix.muted.map((v, j) =>
                          i === j ? !v : v,
                        ),
                      },
                    },
                    true,
                  )
                }
              >
                Mute
              </button>
              <button
                aria-label={`Solo ${name}`}
                aria-pressed={project.mix.solo === i}
                className={
                  button + (project.mix.solo === i ? " !bg-lime-100" : "")
                }
                onClick={() =>
                  edit(
                    {
                      ...project,
                      mix: {
                        ...project.mix,
                        solo: project.mix.solo === i ? null : i,
                      },
                    },
                    true,
                  )
                }
              >
                Solo
              </button>
            </div>
            {i === 2 && (
              <select
                aria-label="Saved piano pattern"
                className="h-9 w-full rounded-lg border text-[10px]"
                value={pianoKey}
                onChange={(e) => setPianoKey(e.target.value)}
              >
                <option value="">Choose saved piano</option>
                {pianoKeys.map((k) => (
                  <option key={k} value={k}>
                    {k.split(":").slice(3).join(":")}
                  </option>
                ))}
              </select>
            )}
            <button
              disabled={i === 2 && !pianoKey}
              className={button + " w-full"}
              onClick={() => load(kind)}
            >
              Load saved {kind}
            </button>
          </section>
        ))}
        <section className="space-y-4 rounded-2xl bg-[#17352e] p-4 text-white">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Volume2 size={18} />
            Master output
          </h2>
          <div
            role="meter"
            aria-label="Master output level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(peak * 100)}
            className="h-3 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full bg-[#c5f235] transition-[width]"
              style={{ width: `${peak * 100}%` }}
            />
          </div>
          <p className="font-mono text-xs text-white/60">
            {peak > 0 ? `${(20 * Math.log10(peak)).toFixed(1)} dBFS` : "— dBFS"}{" "}
            · Limiter on
          </p>
          <label className="block text-xs">
            Master · {Math.round(project.master * 100)}%
            <input
              aria-label="Master volume"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={project.master}
              className="mt-2 w-full accent-[#c5f235]"
              onChange={(e) =>
                edit({ ...project, master: Number(e.target.value) }, true)
              }
            />
          </label>
          <p className="text-[11px] leading-5 text-white/60">
            Mix live while the track plays. Arrangement, tempo and pitch edits
            stop playback so you can restart in sync.
          </p>
          <p className="text-[11px] text-white/60">
            Stereo WAV · portable JSON backup · device-local drafts
          </p>
        </section>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-500">
        Outro fade
        <select
          aria-label="Outro fade"
          value={project.fadeOutBars}
          className="rounded-lg border bg-white p-2"
          onChange={(e) =>
            edit({ ...project, fadeOutBars: Number(e.target.value) })
          }
        >
          {[0, 1, 2, 4].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "None" : `${n} bar${n === 1 ? "" : "s"}`}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[11px] text-slate-500">
        Short patterns repeat inside each clip. Select a clip to change its
        start, length or source bar. Imported piano keys are not declared; check
        harmony by ear. Your original instrument drafts and previous Beat Maker
        backup remain untouched.
      </p>
    </div>
  );
}
