import { SendToMaster } from "../../../../features/student/music-production/SendToMaster";
import { RollNumberInput } from "../../../../features/student/music-production/RollNumberInput";
import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  Download,
  Piano,
  Repeat2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Upload,
  Plus,
  Timer,
  Loader2,
} from "lucide-react";
import { StudioNav } from "../../../../features/student/music-production/StudioNav";
import { useAuthStore } from "../../../../store/auth.store";
import { pianoSongs } from "../../../../features/student/music-production/piano-songs";
import { howLongPreview } from "../../../../features/student/music-production/how-long-preview";
import { PianoRollEditor } from "../../../../features/student/music-production/PianoRollEditor";
import {
  blankRoll,
  cloneRoll,
  legacyToRoll,
  timedToRoll,
  parseRollProject,
  rollMidi,
  type RollProject,
} from "../../../../features/student/music-production/piano-roll-model";
import {
  renderRoll,
  auditionRollKey,
} from "../../../../features/student/music-production/piano-roll-audio";
import { pianoWav } from "../../../../features/student/music-production/piano-song-audio";
export default function PianoRoll() {
  const user = useAuthStore((s) => s.user),
    [song, setSong] = useState(pianoSongs[0].id),
    [project, setProject] = useState<RollProject | null>(null),
    [track, setTrack] = useState(0),
    [editorRevision, setEditorRevision] = useState(0),
    [past, setPast] = useState<RollProject[]>([]),
    [future, setFuture] = useState<RollProject[]>([]),
    [json, setJson] = useState(""),
    [message, setMessage] = useState(""),
    [playing, setPlaying] = useState(false),
    [busy, setBusy] = useState(false),
    [position, setPosition] = useState(0),
    [loop, setLoop] = useState(true),
    [metro, setMetro] = useState(false),
    [volume, setVolume] = useState(0.7),
    [zoom, setZoom] = useState(80),
    [saved, setSaved] = useState(false),
    [expanded, setExpanded] = useState(false);
  const selected = pianoSongs.find((s) => s.id === song)!,
    storageKey = `ah-piano-roll-v2:${user?.id}:${user?.schoolId}:${song}`,
    legacyKey = `ah-piano-song-v1:${user?.id}:${user?.schoolId}:${song}`;
  const ctx = useRef<AudioContext | null>(null),
    source = useRef<AudioBufferSourceNode | null>(null),
    master = useRef<GainNode | null>(null),
    frame = useRef(0),
    ticket = useRef(0),
    alive = useRef(true),
    cursor = useRef<HTMLDivElement>(null),
    positionRef = useRef(0),
    renderCache = useRef<{ key: string; promise: Promise<AudioBuffer> } | null>(
      null,
    ),
    importPanel = useRef<HTMLDetailsElement>(null),
    workbench = useRef<HTMLDivElement>(null);
  function positionAt(beat: number) {
    positionRef.current = beat;
    setPosition(Math.floor(beat * 4) / 4);
    if (cursor.current)
      cursor.current.style.transform = `translateX(${beat * zoom}px)`;
  }
  function stop(reset = true) {
    ticket.current++;
    cancelAnimationFrame(frame.current);
    try {
      source.current?.stop();
    } catch {
      /* Already ended. */
    }
    source.current?.disconnect();
    source.current = null;
    setPlaying(false);
    setBusy(false);
    if (reset) positionAt(0);
  }
  useEffect(() => {
    stop();
    setTrack(0);
    setPast([]);
    setFuture([]);
    setJson("");
    setMessage("");
    setSaved(false);
    let next: RollProject;
    try {
      const current = localStorage.getItem(storageKey),
        old = localStorage.getItem(legacyKey);
      next = current
        ? parseRollProject(JSON.parse(current))
        : old
          ? legacyToRoll(JSON.parse(old), selected.title)
          : song === howLongPreview.id
            ? timedToRoll(howLongPreview)
            : selected.tracks.length
              ? legacyToRoll(selected, selected.title)
              : blankRoll(selected.title);
      setSaved(!!current);
      if (!current && old)
        next.source =
          "Restored from your earlier saved piano sketch · pitches preserved";
    } catch {
      next =
        song === howLongPreview.id
          ? timedToRoll(howLongPreview)
          : selected.tracks.length
            ? legacyToRoll(selected, selected.title)
            : blankRoll(selected.title);
      setMessage(
        "A saved draft could not be read. The earlier draft has been kept on this device.",
      );
    }
    if (
      !selected.tracks.length &&
      song !== howLongPreview.id &&
      next.tracks.every((t) => !t.notes.length)
    )
      next.source =
        "Blank study pattern · no arrangement is bundled for this title. Draw your own notes or import an arrangement.";
    if (next.bars <= 2)
      setZoom(
        Math.max(
          40,
          Math.min(
            160,
            ((workbench.current?.clientWidth ?? 1100) - 76) / (next.bars * 4),
          ),
        ),
      );
    if (importPanel.current) importPanel.current.open = false;
    setProject(next);
  }, [storageKey]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ticket.current++;
      cancelAnimationFrame(frame.current);
      try {
        source.current?.stop();
      } catch {}
      void ctx.current?.close().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (master.current) master.current.gain.value = volume;
  }, [volume]);
  useEffect(() => {
    if (cursor.current)
      cursor.current.style.transform = `translateX(${positionRef.current * zoom}px)`;
  }, [zoom, project]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);
  function persist(p: RollProject) {
    setProject(p);
    try {
      localStorage.setItem(storageKey, JSON.stringify(p));
      setSaved(true);
    } catch {
      setSaved(false);
      setMessage(
        "Browser storage is unavailable. Export your project to keep it.",
      );
    }
  }
  function commit(next: RollProject) {
    if (!project || JSON.stringify(next) === JSON.stringify(project)) return;
    stop(false);
    setPast((p) => [...p.slice(-39), cloneRoll(project)]);
    setFuture([]);
    setMessage("");
    persist(next);
  }
  function undo() {
    if (!project || !past.length) return;
    stop(false);
    const previous = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture((f) => [cloneRoll(project), ...f.slice(0, 39)]);
    persist(previous);
  }
  function redo() {
    if (!project || !future.length) return;
    stop(false);
    setPast((p) => [...p.slice(-39), cloneRoll(project)]);
    persist(future[0]);
    setFuture(future.slice(1));
  }
  async function context() {
    if (!ctx.current || ctx.current.state === "closed") {
      ctx.current = new AudioContext();
      master.current = ctx.current.createGain();
      master.current.gain.value = volume;
      const limiter = ctx.current.createDynamicsCompressor();
      limiter.threshold.value = -5;
      limiter.ratio.value = 10;
      master.current.connect(limiter);
      limiter.connect(ctx.current.destination);
    }
    await ctx.current.resume();
    return ctx.current;
  }
  async function audition(midi: number) {
    const channel = project?.tracks[track];
    if (!channel || channel.muted || channel.volume === 0) return;
    try {
      const c = await context();
      if (alive.current)
        await auditionRollKey(
          c,
          midi,
          master.current!,
          channel.instrument,
          channel.volume,
        );
    } catch {
      if (alive.current)
        setMessage(
          "Piano samples could not load. Check your connection and retry.",
        );
    }
  }
  async function play(from = positionRef.current) {
    if (!project) return;
    stop(false);
    const id = ticket.current;
    setBusy(true);
    setMessage("");
    try {
      const c = await context(),
        key = JSON.stringify(project) + metro;
      if (renderCache.current?.key !== key)
        renderCache.current = {
          key,
          promise: renderRoll(project, false, metro),
        };
      const b = await renderCache.current.promise;
      if (!alive.current || id !== ticket.current) return;
      const startBeat = Math.max(0, Math.min(project.bars * 4 - 0.001, from)),
        s = c.createBufferSource();
      s.buffer = b;
      s.loop = loop;
      s.connect(master.current!);
      source.current = s;
      const started = c.currentTime;
      s.start(0, (startBeat * 60) / project.bpm);
      setPlaying(true);
      setBusy(false);
      const tick = () => {
        if (!alive.current || id !== ticket.current) return;
        const elapsed =
            startBeat + ((c.currentTime - started) * project.bpm) / 60,
          beat = s.loop
            ? elapsed % (project.bars * 4)
            : Math.min(project.bars * 4, elapsed);
        positionAt(beat);
        frame.current = requestAnimationFrame(tick);
      };
      tick();
      s.onended = () => {
        if (alive.current && id === ticket.current) {
          cancelAnimationFrame(frame.current);
          source.current = null;
          setPlaying(false);
          positionAt(0);
        }
      };
    } catch {
      renderCache.current = null;
      if (alive.current && id === ticket.current) {
        setBusy(false);
        setMessage(
          "Playback could not start. Check your connection and try again.",
        );
      }
    }
  }
  function seek(beat: number) {
    if (playing) void play(beat);
    else positionAt(beat);
  }
  function downloadFile(bytes: BlobPart, type: string, extension: string) {
    const url = URL.createObjectURL(new Blob([bytes], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = `${song}-piano.${extension}`;
    a.click();
    workbench.current
      ?.querySelector(".roll-export-menu details")
      ?.removeAttribute("open");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function exportAudio() {
    if (!project) return;
    const id = ticket.current;
    setBusy(true);
    setMessage("");
    try {
      const b = await renderRoll(project, true, false);
      if (alive.current && id === ticket.current)
        downloadFile(pianoWav(b), "audio/wav", "wav");
    } catch {
      if (alive.current)
        setMessage("Audio export failed. Check your connection and retry.");
    } finally {
      if (alive.current && id === ticket.current) setBusy(false);
    }
  }
  if (!project)
    return (
      <p role="status" className="p-5 text-sm text-slate-500">
        Loading piano workspace…
      </p>
    );
  const total = project.tracks.reduce((n, t) => n + t.notes.length, 0),
    hasAudio = project.tracks.some(
      (t) => !t.muted && t.volume > 0 && t.notes.length,
    ),
    bar = Math.floor(position / 4) + 1,
    beat = Math.floor(position % 4) + 1,
    sub = Math.floor((position % 1) * 4) + 1;
  return (
    <div className="mx-auto max-w-[1500px] space-y-3 pb-5">
      <StudioNav title="Piano Roll" subtitle="Write. Shape. Play." compact />
      <SendToMaster
        kind="piano"
        payload={project}
        beforeSend={() => stop(true)}
      />
      <div
        ref={workbench}
        onKeyDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            e.code === "Space" &&
            !e.repeat &&
            target.closest(".pro-roll") &&
            !["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
          ) {
            e.preventDefault();
            if (!busy && (hasAudio || metro)) {
              if (playing) stop(false);
              else void play();
            }
          }
        }}
        className={`piano-workbench ${expanded ? "is-expanded" : ""}`}
      >
        <header className="roll-topbar">
          <div className="roll-title-icon">
            <Piano size={20} />
          </div>
          <label className="roll-song">
            <span className="sr-only">Choose a song</span>
            <select
              aria-label="Choose a song"
              value={song}
              onChange={(e) => {
                stop();
                setSong(e.target.value);
              }}
            >
              {pianoSongs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <span className="roll-local">
            <i />
            {saved ? "Saved on this device" : "Local study pattern"}
          </span>
          <div className="roll-topbar-actions">
            <button
              aria-label="Import piano arrangement"
              title="Import JSON"
              onClick={() => {
                if (importPanel.current) {
                  importPanel.current.open = true;
                  importPanel.current.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                  });
                }
              }}
            >
              <Upload size={15} />
            </button>
            <button
              aria-label="New blank pattern"
              title="New blank pattern"
              onClick={() => {
                commit(blankRoll("Untitled pattern"));
              }}
            >
              <Plus size={16} />
            </button>
            <div className="roll-export-menu">
              <details>
                <summary>
                  <Download size={15} />
                  Export
                </summary>
                <div>
                  <button
                    disabled={busy || !hasAudio}
                    onClick={() => void exportAudio()}
                  >
                    WAV audio
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(rollMidi(project), "audio/midi", "mid")
                    }
                  >
                    MIDI notes
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(
                        JSON.stringify(project, null, 2),
                        "application/json",
                        "json",
                      )
                    }
                  >
                    Project JSON
                  </button>
                </div>
              </details>
            </div>
            <button
              aria-label={
                expanded ? "Collapse piano editor" : "Expand piano editor"
              }
              title={expanded ? "Collapse editor" : "Expand editor"}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </header>
        <div className="roll-transport" aria-label="Piano transport">
          <button
            className="roll-play"
            disabled={busy || (!hasAudio && !metro)}
            aria-label={
              playing ? "Pause piano playback" : "Play piano arrangement"
            }
            onClick={() => (playing ? stop(false) : void play())}
          >
            {busy ? (
              <Loader2 className="animate-spin" size={16} />
            ) : playing ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}{" "}
            {busy ? "Loading" : playing ? "Pause" : "Play"}
          </button>
          <button
            aria-label="Stop piano playback"
            title="Stop and return to start"
            onClick={() => stop()}
          >
            <Square size={15} />
          </button>
          <button
            aria-label="Loop piano arrangement"
            title="Loop pattern"
            aria-pressed={loop}
            onClick={() => {
              setLoop(!loop);
              if (source.current) source.current.loop = !loop;
            }}
          >
            <Repeat2 size={16} />
          </button>
          <button
            aria-label="Piano metronome"
            title="Metronome (playback only)"
            aria-pressed={metro}
            onClick={() => {
              stop(false);
              setMetro(!metro);
            }}
          >
            <Timer size={16} />
          </button>
          <output
            aria-live="off"
            className="roll-time"
            aria-label="Playback position"
          >
            {String(Math.min(project.bars, bar)).padStart(2, "0")} :{" "}
            {String(beat).padStart(2, "0")} : {String(sub).padStart(2, "0")}
          </output>
          <label>
            <span>BPM</span>
            <RollNumberInput
              label="Piano tempo"
              value={project.bpm}
              min={60}
              max={160}
              integer
              onCommit={(bpm) => commit({ ...project, bpm })}
            />
          </label>
          <label title="Master volume">
            <Volume2 size={15} />
            <input
              aria-label="Piano master volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
          <label className="roll-bars">
            Bars
            <select
              aria-label="Piano pattern bars"
              value={project.bars}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (
                  project.tracks.some((t) =>
                    t.notes.some((note) => note.start + note.duration > n * 4),
                  )
                ) {
                  setMessage(
                    "Move or shorten notes beyond the new end before reducing the number of bars.",
                  );
                  return;
                }
                commit({ ...project, bars: n });
                if (position >= n * 4) positionAt(0);
              }}
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="roll-trackbar">
          {project.tracks.map((t, i) => (
            <div
              key={t.instrument}
              className={`roll-channel ${i === 1 ? "pad" : ""}`}
            >
              <button
                aria-pressed={track === i}
                onClick={() => {
                  stop(false);
                  setTrack(i);
                }}
              >
                <i className="roll-channel-mark" />
                {i === 0 ? "Piano" : "Soft pad"}
                <span className="roll-track-count">{t.notes.length}</span>
              </button>
              <button
                aria-label={`${t.muted ? "Unmute" : "Mute"} ${i === 0 ? "piano" : "pad"} track`}
                title={`${t.muted ? "Unmute" : "Mute"} channel`}
                onClick={() =>
                  commit({
                    ...project,
                    tracks: project.tracks.map((v, j) =>
                      j === i ? { ...v, muted: !v.muted } : v,
                    ),
                  })
                }
              >
                {t.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            </div>
          ))}
          <label className="roll-level">
            Channel level
            <input
              aria-label="Selected channel volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={project.tracks[track].volume}
              onChange={(e) =>
                commit({
                  ...project,
                  tracks: project.tracks.map((t, i) =>
                    i === track ? { ...t, volume: Number(e.target.value) } : t,
                  ),
                })
              }
            />
          </label>
        </div>
        {project.source.includes("opening") ||
        project.source.includes("Opening") ? (
          <p className="roll-source">{project.source}</p>
        ) : !total ? (
          <p className="roll-notice">
            No song arrangement is bundled for this title. Draw your own notes
            or import a pattern to begin.
          </p>
        ) : null}
        {message && (
          <p role="status" className="roll-notice">
            {message}
          </p>
        )}
        <PianoRollEditor
          key={`${song}:${editorRevision}`}
          project={project}
          track={track}
          onCommit={commit}
          onAudition={(midi) => void audition(midi)}
          cursor={cursor}
          position={position}
          playing={playing}
          onSeek={seek}
          onUndo={undo}
          onRedo={redo}
          canUndo={!!past.length}
          canRedo={!!future.length}
          zoom={zoom}
          setZoom={setZoom}
        />
        <footer className="roll-footer">
          <span>{total} notes · 4/4 · A0–C8</span>
          <span>
            Shift-click to select · arrows to nudge · Ctrl+D to duplicate ·
            Delete to remove
          </span>
          <span>Edits pause playback</span>
        </footer>
        <details ref={importPanel} className="roll-import-panel">
          <summary>Import arrangement JSON</summary>
          <p>
            Paste your earlier two-track note patterns, or a piano project
            exported from this editor. Your original pitches are kept; editing
            adds timing, duration and velocity.
          </p>
          <textarea
            aria-label="Arrangement JSON"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
            placeholder={
              '{"bpm":75,"tracks":[{"name":"piano","pattern":["G4","B4","D6"]},{"name":"synth_pad","pattern":["G2","D3","G3"]}]}'
            }
          />
          <button
            onClick={() => {
              try {
                const next = parseRollProject(JSON.parse(json), selected.title);
                commit(next);
                setTrack(0);
                positionAt(0);
                setEditorRevision((v) => v + 1);
                if (importPanel.current) importPanel.current.open = false;
                setMessage(
                  "Arrangement imported. Your notes and tempo have been preserved.",
                );
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Invalid arrangement JSON.",
                );
              }
            }}
          >
            Load note pattern
          </button>
          <p>
            Drafts stay on this device. Export Project JSON for an editable
            backup, MIDI for another music app, or WAV for listening.
          </p>
        </details>
      </div>
    </div>
  );
}
