import {
  VocalsPanel,
  type RecordingClock,
} from "../../../../features/student/music-production/VocalsPanel";
import {
  vocalAudible,
  placeVocal,
  vocalWindow,
} from "../../../../features/student/music-production/vocal-model";
import { readVocalBuffer } from "../../../../features/student/music-production/vocal-audio";
import "../../../../features/student/music-production/master-workbench.css";
import { GENRE_STUDIES } from "../../../../features/student/music-production/genre-studies";
import {
  MELODY_STUDIES,
  melodyProject,
} from "../../../../features/student/music-production/repertoire";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Square,
  Download,
  Drum,
  Guitar,
  Piano,
  Mic,
  Plus,
  Copy,
  Trash2,
  Undo2,
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
    [pianoKey, setPianoKey] = useState(""),
    [view, setView] = useState("arrange"),
    [showLibrary, setShowLibrary] = useState(false),
    [search, setSearch] = useState(""),
    [reveal, setReveal] = useState(false),
    [reflection, setReflection] = useState(""),
    [completed, setCompleted] = useState<string[]>(() => {
      try {
        const value = JSON.parse(
          localStorage.getItem(`ah-music-learning:${scope}`) || "[]",
        );
        return Array.isArray(value)
          ? value.filter((v) => typeof v === "string")
          : [];
      } catch {
        return [];
      }
    });
  const ctx = useRef<AudioContext>(),
    graph = useRef<MasterGraph>(),
    sources = useRef<AudioBufferSourceNode[]>([]),
    frame = useRef(0),
    generation = useRef(0),
    mounted = useRef(true),
    loopRef = useRef(loop),
    latest = useRef(project),
    handoff = useRef(false),
    recordStop = useRef<() => void>(),
    recordingActive = useRef(false),
    cache = useRef<{ signature: string; stems: Float32Array[] }>();
  latest.current = project;
  loopRef.current = loop;
  function stop(keepRecording = false) {
    if (!keepRecording) {
      recordingActive.current = false;
      recordStop.current?.();
    }
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
      recordStop.current?.();
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
      if (
        next.mix.solo !== latest.current.mix.solo &&
        next.mix.solo !== null &&
        next.vocals
      )
        next = { ...next, vocals: { ...next.vocals, solo: false } };
      const valid = parseMaster(next);
      setMessage("");
      if (!live) stop();
      setHistory((old) => [...old.slice(-19), latest.current]);
      setProject(valid);
      if (live && ctx.current && graph.current)
        updateMaster(
          graph.current,
          recordingActive.current ? { ...valid, vocals: undefined } : valid,
          ctx.current.currentTime,
        );
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
  async function play(record?: {
    bar: number;
    countIn: boolean;
  }): Promise<RecordingClock | undefined> {
    stop(!!record);
    recordingActive.current = !!record;
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
      const voice =
        !record && vocalAudible(p.vocals, p.mix.solo) && p.vocals?.selectedId
          ? await readVocalBuffer(scope, p.vocals.selectedId, ctx.current)
          : undefined;
      if (!mounted.current || ticket !== generation.current) return;
      const g = connectMaster(ctx.current);
      graph.current = g;
      updateMaster(
        g,
        record ? { ...latest.current, vocals: undefined } : latest.current,
        ctx.current.currentTime,
        true,
      );
      const offset = record
        ? ((Math.min(p.bars, Math.max(1, record.bar)) - 1) * 240) /
          p.mix.draft.bpm
        : 0;
      const start =
        ctx.current.currentTime +
        0.1 +
        (record?.countIn ? (4 * 60) / p.mix.draft.bpm : 0);
      if (record?.countIn)
        for (let beat = 0; beat < 4; beat++) {
          const osc = ctx.current.createOscillator(),
            gain = ctx.current.createGain(),
            at = start - ((4 - beat) * 60) / p.mix.draft.bpm;
          osc.frequency.value = beat === 0 ? 880 : 660;
          gain.gain.setValueAtTime(0.08, at);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.06);
          osc.connect(gain);
          gain.connect(g.master);
          osc.start(at);
          osc.stop(at + 0.07);
          osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
          };
        }
      cache.current.stems.forEach((samples, i) => {
        const s = ctx.current!.createBufferSource(),
          b = ctx.current!.createBuffer(1, samples.length, MASTER_RATE);
        b.getChannelData(0).set(samples);
        s.buffer = b;
        s.loop = !record && loopRef.current;
        s.connect(g.gains[i]);
        sources.current.push(s);
        s.start(start, offset);
      });
      if (voice && p.vocals?.selectedId) {
        const take = p.vocals.takes.find((t) => t.id === p.vocals!.selectedId)!,
          samples = placeVocal(
            voice.getChannelData(0),
            voice.sampleRate,
            take,
            (p.bars * 240) / p.mix.draft.bpm,
            MASTER_RATE,
          ),
          b = ctx.current.createBuffer(1, samples.length, MASTER_RATE),
          source = ctx.current.createBufferSource();
        b.getChannelData(0).set(samples);
        source.buffer = b;
        source.loop = loopRef.current;
        source.connect(g.voice.gain);
        sources.current.push(source);
        source.start(start);
      }
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
            Math.max(
              0,
              (offset + (Math.max(0, time - start) % duration)) /
                (240 / p.mix.draft.bpm),
            ),
          );
          g.meter.getFloatTimeDomainData(values);
          setPeak(values.reduce((n, v) => Math.max(n, Math.abs(v)), 0));
          last = time;
        }
        frame.current = requestAnimationFrame(tick);
      };
      tick();
      return {
        ctx: ctx.current,
        start,
        offset,
        duration: duration - offset,
        bpm: p.mix.draft.bpm,
      };
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Audio could not start. Try again.",
      );
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
      const p = latest.current;
      ctx.current ??= new AudioContext();
      const voice =
        vocalAudible(p.vocals, p.mix.solo) && p.vocals?.selectedId
          ? await readVocalBuffer(scope, p.vocals.selectedId, ctx.current)
          : undefined;
      const data = await exportMaster(p, voice);
      if (!mounted.current) return;
      download(
        new Blob([data], { type: "audio/wav" }),
        vocalAudible(p.vocals, p.mix.solo)
          ? "assignment-hub-song.wav"
          : "assignment-hub-master-beat.wav",
      );
      setMessage(
        "Stereo Master Beat exported with your arrangement, mixer settings and output limiter.",
      );
    } catch (e) {
      if (mounted.current)
        setMessage(
          e instanceof Error ? e.message : "Export failed. Please try again.",
        );
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
  const clip = project.clips.find((c) => c.id === selected);
  const study =
    GENRE_STUDIES.find((s) => project.mix.title === s.name + " sketch") ??
    GENRE_STUDIES.find((s) => s.name === style) ??
    GENRE_STUDIES[0];
  useEffect(() => {
    try {
      setReflection(
        localStorage.getItem(`ah-music-reflection:${scope}:${study.name}`) ||
          "",
      );
    } catch {
      setReflection("");
    }
    setReveal(false);
  }, [scope, study.name]);
  const vocalTake = project.vocals?.takes.find(
    (t) => t.id === project.vocals?.selectedId,
  );
  const vocalSpan = vocalTake
    ? vocalWindow(vocalTake, (project.bars * 240) / project.mix.draft.bpm)
    : undefined;
  return (
    <div className="master-beat workbench">
      <StudioNav title="Music Studio" compact />
      <section className="wb-transport" aria-label="Master Beat transport">
        <button
          aria-label={playing ? "Stop Master Beat" : "Play Master Beat"}
          disabled={busy}
          onClick={() => (playing ? stop() : void play())}
          className="wb-play"
        >
          {playing ? <Square size={16} /> : <Play size={16} />}
          {busy ? "Loading…" : playing ? "Stop" : "Play"}
        </button>
        <label>
          Tempo
          <select
            aria-label="Master tempo"
            value={project.mix.draft.bpm}
            onChange={(e) =>
              edit({
                ...project,
                mix: {
                  ...project.mix,
                  draft: { ...project.mix.draft, bpm: Number(e.target.value) },
                },
              })
            }
          >
            {Array.from({ length: 101 }, (_, i) => i + 60).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Pitch
          <select
            aria-label="Master transpose"
            value={project.mix.transpose}
            onChange={(e) =>
              edit({
                ...project,
                mix: { ...project.mix, transpose: Number(e.target.value) },
              })
            }
          >
            {Array.from({ length: 12 }, (_, i) => i - 5).map((n) => (
              <option key={n} value={n}>
                {n > 0 ? "+" : ""}
                {n} st
              </option>
            ))}
          </select>
        </label>
        <label>
          Length
          <select
            aria-label="Arrangement bars"
            value={project.bars}
            onChange={(e) => {
              action(() => resizeArrangement(project, Number(e.target.value)));
              setSelected("");
            }}
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
          onClick={() => {
            setLoop(!loop);
            sources.current.forEach((s) => (s.loop = !loop));
          }}
        >
          Loop {loop ? "on" : "off"}
        </button>
        <span className="wb-clock">
          {playing
            ? `Bar ${Math.floor(bar) + 1}`
            : `${Math.round((project.bars * 240) / project.mix.draft.bpm)}s`}{" "}
          · 4/4
        </span>
        <button
          disabled={busy || recordingActive.current}
          className="wb-export"
          onClick={() => void exportAudio()}
        >
          <Download size={15} />
          <span>
            {vocalAudible(project.vocals, project.mix.solo)
              ? "Export song"
              : "Export Master Beat"}
          </span>
        </button>
      </section>
      {message && (
        <p role="status" className="wb-notice">
          {message}
        </p>
      )}
      <div className="wb-actions">
        <button
          aria-expanded={showLibrary}
          onClick={() => setShowLibrary(!showLibrary)}
        >
          Library
        </button>
        <label className="sr-only" htmlFor="master-style">
          Original style
        </label>
        <select
          id="master-style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          {styles.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => {
            edit({ ...newMaster(style), vocals: project.vocals });
            setSelected("");
            setReveal(false);
            setReflection("");
            setMessage(
              "Original technique study loaded. Undo restores your last project.",
            );
          }}
        >
          New arrangement
        </button>
        <button
          disabled={!history.length}
          onClick={() => {
            stop();
            setProject(history.at(-1)!);
            setHistory(history.slice(0, -1));
            setSelected("");
          }}
        >
          <Undo2 size={13} />
          Undo
        </button>
        <details className="wb-file">
          <summary>Project</summary>
          <div>
            <button
              onClick={() => {
                download(
                  new Blob([JSON.stringify(project, null, 2)], {
                    type: "application/json",
                  }),
                  "assignment-hub-master-beat.json",
                );
                if (project.vocals?.takes.length)
                  setMessage(
                    "Project JSON excludes voice audio. In Vocals, download each take separately for backup.",
                  );
              }}
            >
              Back up project
            </button>
            <label>
              Restore project
              <input
                aria-label="Restore Master Beat JSON"
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
        </details>
        <span className="wb-save">
          {saved ? "Saved on device" : "Storage unavailable"} · v3
        </span>
      </div>
      <nav aria-label="Workbench panels" className="wb-panels">
        {[
          ["arrange", "Arrange"],
          ["mixer", "Mixer"],
          ["learn", "Learn"],
          ["vocals", "Vocals"],
        ].map(([id, name]) => (
          <button
            key={id}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className={`wb-body ${showLibrary ? "library-open" : ""}`}>
        <aside className="wb-library" aria-label="Studio library">
          <input
            aria-label="Search studio library"
            placeholder="Find a style or melody"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <h2>Technique studies</h2>
          {GENRE_STUDIES.filter((s) =>
            (s.name + " " + s.concept)
              .toLowerCase()
              .includes(search.toLowerCase()),
          ).map((s) => (
            <button
              key={s.name}
              className={study.name === s.name ? "active" : ""}
              onClick={() => {
                setStyle(s.name);
                edit({ ...newMaster(s.name), vocals: project.vocals });
                setReveal(false);
                setReflection("");
                setShowLibrary(false);
              }}
            >
              <strong>{s.name}</strong>
              <span>
                {s.bpm} BPM · {s.concept}
              </span>
            </button>
          ))}
          <h2>Playable melodies</h2>
          {MELODY_STUDIES.filter((s) =>
            s.title.toLowerCase().includes(search.toLowerCase()),
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => {
                edit(importPart(project, "piano", melodyProject(s)));
                setMessage(
                  `${s.title} loaded: public-domain melody with original accompaniment. Open Learn to study its phrasing.`,
                );
                setShowLibrary(false);
              }}
            >
              <strong>{s.title}</strong>
              <span>{s.bars} bars · public-domain study</span>
            </button>
          ))}
          <Link to="/student/labs/music/library">
            Kenyan listening & score sources →
          </Link>
        </aside>
        <div className="wb-main">
          <section
            className={`wb-arrange ${view === "arrange" ? "is-active" : ""}`}
          >
            <header>
              <h2>Arrangement</h2>
              <span>{project.mix.title}</span>
              <button
                onClick={() => {
                  const el = document.querySelector(".wb-timeline");
                  if (el) el.scrollLeft = 0;
                }}
              >
                Start
              </button>
            </header>
            <div className="wb-timeline" aria-label="Master arrangement">
              <div style={{ width: project.bars * 42 + 74 }}>
                <div className="wb-ruler" style={{ marginLeft: 74 }}>
                  {Array.from({ length: project.bars }, (_, i) => (
                    <span key={i} style={{ width: 42 }}>
                      {i + 1}
                    </span>
                  ))}
                </div>
                {tracks.map(({ name, Icon, color }, track) => (
                  <div key={name} className="wb-lane">
                    <div className="wb-track">
                      <Icon size={14} />
                      {name}
                    </div>
                    <div
                      data-track={track}
                      style={{
                        width: project.bars * 42,
                        backgroundSize: "42px 100%",
                      }}
                      className="wb-clips"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const c = project.clips.find(
                          (c) => c.id === e.dataTransfer.getData("text/plain"),
                        );
                        if (!c || c.track !== track) return;
                        action(() =>
                          changeClip(project, {
                            ...c,
                            start: Math.max(
                              0,
                              Math.min(
                                project.bars - c.length,
                                Math.round(
                                  (e.clientX -
                                    e.currentTarget.getBoundingClientRect()
                                      .left) /
                                    42,
                                ),
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
                            style={{
                              left: c.start * 42 + 1,
                              width: c.length * 42 - 2,
                              background: color,
                            }}
                          >
                            <span>
                              {name} · {c.length} bars
                            </span>
                            <i aria-hidden="true">
                              {Array.from(
                                { length: Math.min(c.length * 3, 32) },
                                (_, i) => (
                                  <b
                                    key={i}
                                    style={{
                                      height: 4 + ((i * 7 + track * 3) % 15),
                                    }}
                                  />
                                ),
                              )}
                            </i>
                          </button>
                        ))}
                      {playing && (
                        <div
                          className="wb-playhead"
                          style={{ left: bar * 42 }}
                        />
                      )}
                    </div>
                  </div>
                ))}
                {vocalTake && vocalSpan && vocalSpan.duration > 0 && (
                  <div className="wb-lane">
                    <div className="wb-track">
                      <Mic size={14} />
                      Vocals
                    </div>
                    <div
                      className="wb-clips"
                      style={{
                        width: project.bars * 42,
                        backgroundSize: "42px 100%",
                      }}
                    >
                      <button
                        aria-label={`Vocal clip ${vocalTake.name}`}
                        onClick={() => setView("vocals")}
                        style={{
                          left:
                            (vocalSpan.start / (240 / project.mix.draft.bpm)) *
                            42,
                          width: Math.max(
                            3,
                            (vocalSpan.duration /
                              (240 / project.mix.draft.bpm)) *
                              42,
                          ),
                          background: "#c4add7",
                        }}
                      >
                        <span>{vocalTake.name}</span>
                        <svg
                          viewBox="0 0 640 30"
                          preserveAspectRatio="none"
                          style={{ width: "100%", height: 24 }}
                          aria-hidden="true"
                        >
                          {Array.from({ length: 64 }, (_, i) => {
                            const at = Math.min(
                                63,
                                Math.floor(
                                  ((vocalSpan.offset +
                                    (i / 64) * vocalSpan.duration) /
                                    vocalTake.duration) *
                                    64,
                                ),
                              ),
                              n = vocalTake.waveform[at];
                            return (
                              <line
                                key={i}
                                x1={i * 10 + 5}
                                x2={i * 10 + 5}
                                y1={15 - n * 14}
                                y2={15 + n * 14}
                                stroke="#43334c"
                                strokeWidth="5"
                              />
                            );
                          })}
                        </svg>
                      </button>
                      {playing && (
                        <div
                          className="wb-playhead"
                          style={{ left: bar * 42 }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="wb-clip-tools">
              <label>
                Track
                <select id="add-clip-track" aria-label="Add clip track">
                  {tracks.map((t, i) => (
                    <option key={t.name} value={i}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Bar
                <input
                  id="add-clip-start"
                  aria-label="Add clip start bar"
                  type="number"
                  min="1"
                  max={project.bars}
                  defaultValue="1"
                />
              </label>
              <button
                onClick={() => {
                  const track = Number(
                      (
                        document.getElementById(
                          "add-clip-track",
                        ) as HTMLSelectElement
                      ).value,
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
                      Math.min(project.sourceBars[track], project.bars - start),
                    ),
                  );
                }}
              >
                <Plus size={13} />
                Add clip
              </button>
              {clip && (
                <>
                  <label>
                    Move to
                    <input
                      aria-label="Selected clip start"
                      key={clip.id + "start" + clip.start}
                      type="number"
                      defaultValue={clip.start + 1}
                      onBlur={(e) => {
                        const start = Number(e.target.value) - 1;
                        e.currentTarget.value = String(clip.start + 1);
                        action(() => changeClip(project, { ...clip, start }));
                      }}
                    />
                  </label>
                  <label>
                    Length
                    <input
                      aria-label="Selected clip length"
                      key={clip.id + "length" + clip.length}
                      type="number"
                      defaultValue={clip.length}
                      onBlur={(e) => {
                        const length = Number(e.target.value);
                        e.currentTarget.value = String(clip.length);
                        action(() => changeClip(project, { ...clip, length }));
                      }}
                    />
                  </label>
                  <label>
                    Source
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
                    >
                      {Array.from(
                        { length: project.sourceBars[clip.track] },
                        (_, i) => (
                          <option key={i} value={i}>
                            {i + 1}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <button
                    onClick={() => action(() => duplicateClip(project, clip))}
                  >
                    <Copy size={13} />
                    Repeat clip
                  </button>
                  <button
                    onClick={() => {
                      edit({
                        ...project,
                        clips: project.clips.filter((c) => c.id !== clip.id),
                      });
                      setSelected("");
                    }}
                  >
                    <Trash2 size={13} />
                    Remove clip
                  </button>
                </>
              )}
            </div>
            <p className="wb-hint">
              Select a clip to move or trim it. Drag on desktop; use the bar
              controls on a phone.
            </p>
          </section>
          <section
            className={`wb-mixer ${view === "mixer" ? "is-active" : ""}`}
            aria-label="Live mixer"
          >
            <header>
              <h2>Live mixer</h2>
              <span>Volume, pan, mute and solo do not restart playback.</span>
            </header>
            {tracks.map(({ name, kind, Icon, color }, i) => (
              <div className="wb-channel" key={name}>
                <div className="wb-channel-name">
                  <Icon size={15} style={{ color }} />
                  <strong>{name}</strong>
                  <Link to={`/student/labs/music/${kind}`}>Edit</Link>
                  <small>{project.sources[i]}</small>
                </div>
                <label>
                  Volume {Math.round(project.mix.levels[i] * 100)}%
                  <input
                    aria-label={`${name} volume`}
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    value={project.mix.levels[i]}
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
                <label>
                  Pan{" "}
                  {project.pan[i] === 0
                    ? "C"
                    : `${Math.round(Math.abs(project.pan[i]) * 100)}${project.pan[i] < 0 ? "L" : "R"}`}
                  <input
                    aria-label={`${name} pan`}
                    type="range"
                    min="-1"
                    max="1"
                    step=".05"
                    value={project.pan[i]}
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
                <div className="wb-ms">
                  <button
                    aria-label={`Mute ${name}`}
                    aria-pressed={project.mix.muted[i]}
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
                    M
                  </button>
                  <button
                    aria-label={`Solo ${name}`}
                    aria-pressed={project.mix.solo === i}
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
                    S
                  </button>
                </div>
                <div className="wb-load">
                  {i === 2 && (
                    <select
                      aria-label="Saved piano pattern"
                      value={pianoKey}
                      onChange={(e) => setPianoKey(e.target.value)}
                    >
                      <option value="">Saved piano</option>
                      {pianoKeys.map((k) => (
                        <option key={k} value={k}>
                          {k.split(":").slice(3).join(":")}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    disabled={i === 2 && !pianoKey}
                    onClick={() => load(kind)}
                  >
                    Load saved {kind}
                  </button>
                </div>
              </div>
            ))}
            <div className="wb-master">
              <strong>Master</strong>
              <label>
                Level {Math.round(project.master * 100)}%
                <input
                  aria-label="Master volume"
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={project.master}
                  onChange={(e) =>
                    edit({ ...project, master: Number(e.target.value) }, true)
                  }
                />
              </label>
              <div
                role="meter"
                aria-label="Master output level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(peak * 100)}
                className="wb-meter"
              >
                <i style={{ width: `${peak * 100}%` }} />
              </div>
              <span>
                {peak ? `${(20 * Math.log10(peak)).toFixed(1)} dBFS` : "— dBFS"}{" "}
                · limiter
              </span>
              <label>
                Fade
                <select
                  aria-label="Outro fade"
                  value={project.fadeOutBars}
                  onChange={(e) =>
                    edit({ ...project, fadeOutBars: Number(e.target.value) })
                  }
                >
                  {[0, 1, 2, 4].map((n) => (
                    <option key={n} value={n}>
                      {n ? `${n} bars` : "None"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <section
            className={`wb-learn ${view === "learn" ? "is-active" : ""}`}
          >
            <header>
              <h2>{study.concept}</h2>
              <span>{study.name} · production study</span>
            </header>
            <p>{study.task}</p>
            <h3>Rhythm editor · 16 steps / 4 beats</h3>
            <div className="wb-rhythm">
              <div style={{ minWidth: 520 }}>
                {project.mix.draft.drums.map((row, i) => (
                  <div key={i}>
                    <span>
                      {
                        [
                          "Kick",
                          "Snare",
                          "Closed hat",
                          "Open hat",
                          "Low tom",
                          "High tom",
                          "Clap",
                          "Shaker",
                        ][i]
                      }
                    </span>
                    {row.map((hit, j) => (
                      <button
                        key={j}
                        aria-label={`Learning ${["Kick", "Snare", "Closed hat", "Open hat", "Low tom", "High tom", "Clap", "Shaker"][i]} step ${j + 1}`}
                        aria-pressed={hit}
                        className={j % 4 === 0 ? "downbeat" : ""}
                        onClick={() =>
                          edit({
                            ...project,
                            mix: {
                              ...project.mix,
                              draft: {
                                ...project.mix.draft,
                                drums: project.mix.draft.drums.map((r, k) =>
                                  i === k
                                    ? r.map((v, n) => (j === n ? !v : v))
                                    : r,
                                ),
                              },
                            },
                          })
                        }
                      >
                        {j % 4 === 0 ? j / 4 + 1 : ""}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <h3>Check your understanding</h3>
            <p>{study.question}</p>
            <button onClick={() => setReveal(!reveal)}>
              {reveal ? "Hide explanation" : "Reveal explanation"}
            </button>
            {reveal && <p className="wb-answer">{study.answer}</p>}
            <label className="wb-reflection">
              What did you change, and what did you hear?
              <textarea
                aria-label="Production reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Describe one musical choice and its effect."
              />
            </label>
            <button
              disabled={!reveal || reflection.trim().length < 20}
              onClick={() => {
                const next = [...new Set([...completed, study.name])];
                try {
                  localStorage.setItem(
                    `ah-music-learning:${scope}`,
                    JSON.stringify(next),
                  );
                  localStorage.setItem(
                    `ah-music-reflection:${scope}:${study.name}`,
                    reflection,
                  );
                  setCompleted(next);
                  setMessage("Practice reflection saved on this device.");
                } catch {
                  setMessage("Could not save your reflection.");
                }
              }}
            >
              {completed.includes(study.name)
                ? "Practice completed"
                : "Save practice reflection"}
            </button>
            <p className="wb-hint">
              {completed.length}/{GENRE_STUDIES.length} studies reflected on ·
              curriculum focus: rhythm, melody, harmony, form, texture,
              listening and digital production. This is not a KICD
              certification.
            </p>
            <Link to="/student/labs/music/library">
              Real listening references, playable melodies & score sources →
            </Link>
          </section>
          <div
            className={`wb-voice-panel ${view === "vocals" ? "is-active" : ""}`}
          >
            <VocalsPanel
              scope={scope}
              project={project}
              onChange={(vocals, live) =>
                edit(
                  {
                    ...latest.current,
                    vocals,
                    mix: {
                      ...latest.current.mix,
                      solo: vocals.solo ? null : latest.current.mix.solo,
                    },
                  },
                  live,
                )
              }
              startBacking={async (bar, countIn) => {
                const clock = await play({ bar, countIn });
                if (!clock) throw Error("Backing playback could not start.");
                return clock;
              }}
              unlockAudio={async () => {
                ctx.current ??= new AudioContext();
                await ctx.current.resume();
              }}
              stopBacking={stop}
              registerStop={(fn) => {
                recordStop.current = fn;
              }}
            />
          </div>
        </div>
      </div>
      <footer className="wb-footer">
        Master Beat · stereo WAV · local drafts & JSON backup · short patterns
        repeat inside clips. Imported keys are not declared; check harmony by
        ear.
      </footer>
    </div>
  );
}
