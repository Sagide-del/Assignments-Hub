import { RollNumberInput } from "./RollNumberInput";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent,
} from "react";
import {
  MousePointer2,
  Pencil,
  Eraser,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Magnet,
  Hand,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  type RollProject,
  type RollNote,
  noteId,
  snapBeat,
  moveRollNotes,
  resizeRollNote,
  duplicateRollNotes,
  rollPitch,
} from "./piano-roll-model";
import "./piano-roll.css";
type Tool = "draw" | "select" | "erase" | "pan";
interface Gesture {
  mode: "move" | "resize" | "draw" | "box" | "pan";
  x: number;
  y: number;
  base: RollProject;
  ids: string[];
  note?: RollNote;
  pointer: number;
  endX: number;
  endY: number;
  scrollX?: number;
  scrollY?: number;
}
export function PianoRollEditor({
  project,
  track,
  onCommit,
  onAudition,
  cursor,
  position,
  playing,
  onSeek,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  setZoom,
}: {
  project: RollProject;
  track: number;
  onCommit: (p: RollProject) => void;
  onAudition: (midi: number) => void;
  cursor: RefObject<HTMLDivElement>;
  position: number;
  playing: boolean;
  onSeek: (beat: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  setZoom: (n: number) => void;
}) {
  const [tool, setTool] = useState<Tool>("draw"),
    [snap, setSnap] = useState(0.25),
    [length, setLength] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [preview, setPreview] = useState<RollProject | null>(null),
    [box, setBox] = useState<{
      x: number;
      y: number;
      w: number;
      h: number;
    } | null>(null);
  const editorRoot = useRef<HTMLElement>(null);
  const velocityScroll = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    grid = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null),
    clipboard = useRef<RollNote[]>([]),
    lastPitch = useRef(64);
  const latestPreview = useRef<RollProject | null>(null);
  function setLive(value: RollProject | null) {
    latestPreview.current = value;
    setPreview(value);
  }
  const p = preview ?? project,
    notes = p.tracks[track].notes,
    chosen = notes.filter((n) => selected.includes(n.id)),
    first = chosen[0],
    row = 22,
    width = p.bars * 4 * zoom,
    height = 88 * row;
  useEffect(() => {
    setSelected([]);
    setLive(null);
    gesture.current = null;
    setBox(null);
  }, [track, project.title]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const pitches = project.tracks[track].notes.map((n) => n.midi),
      high = pitches.length ? Math.max(...pitches) : 72,
      low = pitches.length ? Math.min(...pitches) : 60;
    const padding = Math.max(
      0,
      (el.clientHeight - 36 - (high - low + 1) * row) / 2,
    );
    el.scrollTop = Math.max(0, (108 - high) * row - padding);
  }, [track, project.title]);
  useEffect(() => {
    const cancel = () => {
      gesture.current = null;
      setLive(null);
      setBox(null);
    };
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, []);
  function remove(ids = selected) {
    if (!ids.length) return;
    onCommit({
      ...project,
      tracks: project.tracks.map((t, i) =>
        i !== track
          ? t
          : { ...t, notes: t.notes.filter((n) => !ids.includes(n.id)) },
      ),
    });
    setSelected([]);
  }
  function duplicate() {
    const result = duplicateRollNotes(project, track, selected);
    if (result.ids.length) {
      onCommit(result.project);
      setSelected(result.ids);
    }
  }
  function commit(next: RollProject) {
    if (JSON.stringify(next) !== JSON.stringify(project)) onCommit(next);
  }
  function local(e: { clientX: number; clientY: number }) {
    const r = grid.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(width, e.clientX - r.left)),
      y: Math.max(0, Math.min(height - 1, e.clientY - r.top)),
    };
  }
  function start(
    e: PointerEvent<HTMLElement>,
    note?: RollNote,
    resize = false,
  ) {
    if (e.button !== 0 || e.isPrimary === false) return;
    e.preventDefault();
    e.stopPropagation();
    editorRoot.current?.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "pan") {
      gesture.current = {
        mode: "pan",
        x: e.clientX,
        y: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
        base: project,
        ids: [],
        pointer: e.pointerId,
        scrollX: viewport.current?.scrollLeft ?? 0,
        scrollY: viewport.current?.scrollTop ?? 0,
      };
      return;
    }
    if (note && tool === "erase") {
      remove([note.id]);
      return;
    }
    const point = local(e);
    let ids = selected;
    if (note) {
      ids = e.shiftKey
        ? selected.includes(note.id)
          ? selected.filter((id) => id !== note!.id)
          : [...selected, note.id]
        : selected.includes(note.id)
          ? selected
          : [note.id];
      setSelected(ids);
      if (!ids.includes(note.id)) return;
      lastPitch.current = note.midi;
      onAudition(note.midi);
    } else if (tool === "erase") return;
    else if (tool === "select" || e.shiftKey) {
      gesture.current = {
        mode: "box",
        x: point.x,
        y: point.y,
        endX: point.x,
        endY: point.y,
        base: project,
        ids: e.shiftKey ? selected : [],
        pointer: e.pointerId,
      };
      if (!e.shiftKey) setSelected([]);
      return;
    } else {
      if (notes.length >= 256) return;
      const at = Math.min(
          project.bars * 4 - snap,
          Math.max(0, Math.floor(point.x / zoom / snap) * snap),
        ),
        midi = 108 - Math.floor(point.y / row);
      note = {
        id: noteId(),
        start: at,
        duration: Math.min(length, project.bars * 4 - at),
        midi,
        velocity: 96,
      };
      ids = [note.id];
      setSelected(ids);
      lastPitch.current = midi;
      onAudition(midi);
      const next = {
        ...project,
        tracks: project.tracks.map((t, i) =>
          i !== track ? t : { ...t, notes: [...t.notes, note!] },
        ),
      };
      setLive(next);
      gesture.current = {
        mode: "draw",
        x: point.x,
        y: point.y,
        endX: point.x,
        endY: point.y,
        base: next,
        ids,
        note,
        pointer: e.pointerId,
      };
      return;
    }
    gesture.current = {
      mode: resize ? "resize" : "move",
      x: point.x,
      y: point.y,
      endX: point.x,
      endY: point.y,
      base: project,
      ids,
      note,
      pointer: e.pointerId,
    };
  }
  function move(e: PointerEvent) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointer) return;
    if (g.mode === "pan") {
      if (viewport.current) {
        viewport.current.scrollLeft = g.scrollX! + g.x - e.clientX;
        viewport.current.scrollTop = g.scrollY! + g.y - e.clientY;
      }
      return;
    }
    const point = local(e);
    g.endX = point.x;
    g.endY = point.y;
    if (g.mode === "box") {
      setBox({
        x: Math.min(g.x, point.x),
        y: Math.min(g.y, point.y),
        w: Math.abs(g.x - point.x),
        h: Math.abs(g.y - point.y),
      });
      return;
    }
    const dx = snapBeat((point.x - g.x) / zoom, snap),
      dy = Math.round((g.y - point.y) / row);
    if (g.mode === "move") setLive(moveRollNotes(g.base, track, g.ids, dx, dy));
    else if (g.mode === "resize")
      setLive(
        resizeRollNote(g.base, track, g.note!.id, g.note!.duration + dx, snap),
      );
    else if (Math.abs(point.x - g.x) > 4)
      setLive(
        resizeRollNote(
          g.base,
          track,
          g.note!.id,
          Math.max(snap, snapBeat(point.x / zoom - g.note!.start, snap)),
          snap,
        ),
      );
  }
  function end(e: PointerEvent) {
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId) return;
    if (g.mode === "box") {
      const x1 = Math.min(g.x, g.endX) / zoom,
        x2 = Math.max(g.x, g.endX) / zoom,
        y1 = Math.min(g.y, g.endY),
        y2 = Math.max(g.y, g.endY);
      setSelected([
        ...new Set([
          ...g.ids,
          ...notes
            .filter(
              (n) =>
                n.start < x2 &&
                n.start + n.duration > x1 &&
                (108 - n.midi) * row < y2 &&
                (109 - n.midi) * row > y1,
            )
            .map((n) => n.id),
        ]),
      ]);
    } else if (latestPreview.current) commit(latestPreview.current);
    gesture.current = null;
    setLive(null);
    setBox(null);
  }
  function cancel() {
    gesture.current = null;
    setLive(null);
    setBox(null);
  }
  function paste() {
    if (!clipboard.current.length) return;
    const start = Math.max(
        0,
        position >= 0
          ? Math.floor(position / snap) * snap
          : Math.min(...clipboard.current.map((n) => n.start)),
      ),
      original = Math.min(...clipboard.current.map((n) => n.start)),
      pasted = clipboard.current.map((n) => ({
        ...n,
        id: noteId(),
        start: n.start - original + start,
      }));
    if (
      notes.length + pasted.length > 256 ||
      pasted.some((n) => n.start + n.duration > project.bars * 4)
    )
      return;
    onCommit({
      ...project,
      tracks: project.tracks.map((t, i) =>
        i !== track ? t : { ...t, notes: [...t.notes, ...pasted] },
      ),
    });
    setSelected(pasted.map((n) => n.id));
  }
  return (
    <section
      ref={editorRoot}
      className={`pro-roll ${tool === "pan" ? "roll-pan" : ""}`}
      aria-label="Professional piano editor"
      tabIndex={0}
      onKeyDown={(e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLSelectElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        const command = e.ctrlKey || e.metaKey,
          key = e.key.toLowerCase();
        if (command && key === "z") {
          e.preventDefault();
          e.shiftKey ? onRedo() : onUndo();
        } else if (command && key === "y") {
          e.preventDefault();
          onRedo();
        } else if (command && key === "a") {
          e.preventDefault();
          setSelected(notes.map((n) => n.id));
        } else if (command && key === "c") {
          e.preventDefault();
          clipboard.current = chosen.map((n) => ({ ...n }));
        } else if (command && key === "v") {
          e.preventDefault();
          paste();
        } else if (command && key === "d") {
          e.preventDefault();
          duplicate();
        } else if (key === "delete" || key === "backspace") {
          e.preventDefault();
          remove();
        } else if (key === "escape") {
          cancel();
          setSelected([]);
        } else if (e.key.startsWith("Arrow") && selected.length) {
          e.preventDefault();
          commit(
            moveRollNotes(
              project,
              track,
              selected,
              e.key === "ArrowRight" ? snap : e.key === "ArrowLeft" ? -snap : 0,
              e.key === "ArrowUp"
                ? e.shiftKey
                  ? 12
                  : 1
                : e.key === "ArrowDown"
                  ? -(e.shiftKey ? 12 : 1)
                  : 0,
            ),
          );
        }
      }}
    >
      <div className="roll-editbar">
        <div className="roll-toolset" aria-label="Editing tools">
          {(
            [
              { id: "draw", Icon: Pencil, label: "Draw notes" },
              { id: "select", Icon: MousePointer2, label: "Select notes" },
              { id: "erase", Icon: Eraser, label: "Erase notes" },
              { id: "pan", Icon: Hand, label: "Pan piano view" },
            ] as const
          ).map(({ id, Icon, label }) => (
            <button
              key={id}
              title={label}
              aria-label={label}
              aria-pressed={tool === id}
              onClick={() => setTool(id)}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
        <span className="roll-divider" />
        <button
          title="Undo (Ctrl+Z)"
          aria-label="Undo piano edit"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 size={15} />
        </button>
        <button
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo piano edit"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 size={15} />
        </button>
        <button
          title="Duplicate (Ctrl+D)"
          aria-label="Duplicate selected notes"
          disabled={!chosen.length}
          onClick={duplicate}
        >
          <Copy size={15} />
        </button>
        <button
          title="Delete (Delete)"
          aria-label="Delete selected notes"
          disabled={!chosen.length}
          onClick={() => remove()}
        >
          <Trash2 size={15} />
        </button>
        <span className="roll-divider" />
        <label>
          <Magnet size={14} />
          <span>Snap</span>
          <select
            aria-label="Grid snap"
            value={snap}
            onChange={(e) => setSnap(Number(e.target.value))}
          >
            <option value={0.25}>1/16</option>
            <option value={0.5}>1/8</option>
            <option value={1}>1/4</option>
          </select>
        </label>
        <label>
          Length
          <select
            aria-label="New note length"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          >
            {[0.25, 0.5, 1, 2, 4].map((n) => (
              <option key={n} value={n}>
                {n === 0.25
                  ? "1/16"
                  : n === 0.5
                    ? "1/8"
                    : n === 1
                      ? "1/4"
                      : n === 2
                        ? "1/2"
                        : "1 bar"}
              </option>
            ))}
          </select>
        </label>
        <div className="roll-zoom">
          <button
            aria-label="Zoom out piano roll"
            disabled={zoom <= 40}
            onClick={() => setZoom(Math.max(40, zoom - 16))}
          >
            <ZoomOut size={16} />
          </button>
          <span>{Math.round((zoom / 80) * 100)}%</span>
          <button
            aria-label="Zoom in piano roll"
            disabled={zoom >= 160}
            onClick={() => setZoom(Math.min(160, zoom + 16))}
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() =>
              setZoom(
                Math.max(
                  40,
                  Math.min(
                    160,
                    ((viewport.current?.clientWidth ?? 1000) - 76) /
                      (p.bars * 4),
                  ),
                ),
              )
            }
          >
            Fit
          </button>
        </div>
      </div>
      <div className="roll-overview" aria-label="Pattern overview">
        <span>OVERVIEW</span>
        <div>
          {project.tracks.flatMap((t, i) =>
            t.notes.map((n) => (
              <i
                key={n.id}
                style={{
                  left: `${(n.start / (p.bars * 4)) * 100}%`,
                  width: `${(n.duration / (p.bars * 4)) * 100}%`,
                  top: 3 + ((108 - n.midi) / 88) * 23,
                  background: i === track ? "#33c5ed" : "#698e7b",
                }}
              />
            )),
          )}
        </div>
      </div>
      <div
        ref={viewport}
        className="roll-viewport"
        onScroll={(e) => {
          if (
            velocityScroll.current &&
            velocityScroll.current.scrollLeft !== e.currentTarget.scrollLeft
          )
            velocityScroll.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={cancel}
        onLostPointerCapture={() => {
          if (gesture.current) cancel();
        }}
      >
        <div
          className="roll-surface"
          style={{ width: width + 64, height: height + 36 }}
        >
          <div className="roll-ruler">
            <div className="roll-ruler-corner">4/4</div>
            <div className="roll-ruler-beats" style={{ width }}>
              {Array.from({ length: p.bars * 4 }, (_, beat) => (
                <button
                  key={beat}
                  aria-label={`Seek bar ${Math.floor(beat / 4) + 1} beat ${(beat % 4) + 1}`}
                  style={{ left: beat * zoom, width: zoom }}
                  className={beat % 4 === 0 ? "bar-mark" : ""}
                  onClick={() => onSeek(beat)}
                >
                  {beat % 4 === 0 ? (
                    <strong>{Math.floor(beat / 4) + 1}</strong>
                  ) : (
                    <span>{(beat % 4) + 1}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="roll-keys" aria-label="Piano keyboard">
            {Array.from({ length: 88 }, (_, i) => {
              const midi = 108 - i,
                black = [1, 3, 6, 8, 10].includes(midi % 12),
                active =
                  playing &&
                  project.tracks.some(
                    (t) =>
                      !t.muted &&
                      t.notes.some(
                        (n) =>
                          n.midi === midi &&
                          position >= n.start &&
                          position < n.start + n.duration,
                      ),
                  );
              return (
                <button
                  key={midi}
                  aria-label={`Play ${rollPitch(midi)}`}
                  className={`${black ? "black-key" : "white-key"} ${active ? "sounding" : ""}`}
                  style={{ height: row }}
                  onClick={() => {
                    lastPitch.current = midi;
                    onAudition(midi);
                  }}
                >
                  {rollPitch(midi)}
                </button>
              );
            })}
          </div>
          <div
            ref={grid}
            className="roll-grid"
            aria-label="Piano note canvas"
            role="group"
            style={{
              width,
              height,
              left: 64,
              top: 36,
              backgroundSize: `${zoom / 4}px 100%,${zoom}px 100%,${zoom * 4}px 100%`,
            }}
            onPointerDown={(e) => start(e)}
          >
            {Array.from({ length: 88 }, (_, i) => (
              <div
                key={i}
                className={`pitch-row ${[1, 3, 6, 8, 10].includes((108 - i) % 12) ? "accidental-row" : ""} ${(108 - i) % 12 === 0 ? "octave-row" : ""}`}
                style={{ height: row, top: i * row }}
              />
            ))}
            {p.tracks[1 - track].notes.map((n) => (
              <div
                key={n.id}
                className="roll-ghost"
                style={{
                  left: n.start * zoom,
                  top: (108 - n.midi) * row + 3,
                  width: n.duration * zoom - 2,
                  height: row - 6,
                }}
              />
            ))}
            {notes.map((n) => (
              <button
                key={n.id}
                data-roll-note={n.id}
                data-start={n.start}
                data-midi={n.midi}
                data-duration={n.duration}
                data-velocity={n.velocity}
                aria-label={`${rollPitch(n.midi)}, start ${n.start}, length ${n.duration}`}
                aria-pressed={selected.includes(n.id)}
                className={`roll-note ${selected.includes(n.id) ? "selected-note" : ""} ${playing && position >= n.start && position < n.start + n.duration ? "playing-note" : ""}`}
                style={{
                  left: n.start * zoom,
                  top: (108 - n.midi) * row + 2,
                  width: Math.max(5, n.duration * zoom - 2),
                  height: row - 4,
                  opacity: 0.5 + n.velocity / 254,
                }}
                onPointerDown={(e) => start(e, n)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  remove([n.id]);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  remove([n.id]);
                }}
              >
                <span>{rollPitch(n.midi)}</span>
                <span
                  className="roll-resize"
                  title="Drag to resize note"
                  onPointerDown={(e) => start(e, n, true)}
                />
              </button>
            ))}
            {box && (
              <div
                className="roll-marquee"
                style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
              />
            )}
            <div
              ref={cursor}
              className="roll-playhead"
              style={{ display: position < 0 ? "none" : "block" }}
            />
          </div>
        </div>
      </div>
      <div className="roll-inspector">
        <span className="roll-selection">
          {chosen.length
            ? `${chosen.length} selected`
            : "Click to draw · drag to move · drag the right edge to resize"}
        </span>
        {first && (
          <>
            <label>
              Pitch
              <select
                aria-label="Selected note pitch"
                value={first.midi}
                onChange={(e) =>
                  commit(
                    moveRollNotes(
                      project,
                      track,
                      selected,
                      0,
                      Number(e.target.value) - first.midi,
                    ),
                  )
                }
              >
                {Array.from({ length: 88 }, (_, i) => 108 - i).map((n) => (
                  <option key={n} value={n}>
                    {rollPitch(n)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start
              <RollNumberInput
                label="Selected note start"
                value={Number(first.start.toFixed(4))}
                min={0}
                max={p.bars * 4 - first.duration}
                step={snap}
                onCommit={(v) =>
                  commit(
                    moveRollNotes(
                      project,
                      track,
                      selected,
                      snapBeat(v - first.start, snap),
                      0,
                    ),
                  )
                }
              />
            </label>
            <label>
              Length
              <RollNumberInput
                label="Selected note duration"
                value={Number(first.duration.toFixed(4))}
                min={Math.min(snap, first.duration)}
                max={p.bars * 4 - first.start}
                step={snap}
                onCommit={(v) =>
                  commit(resizeRollNote(project, track, first.id, v, snap))
                }
              />
            </label>
            <label>
              Velocity
              <RollNumberInput
                label="Selected note velocity"
                value={first.velocity}
                min={1}
                max={127}
                integer
                onCommit={(v) =>
                  commit({
                    ...project,
                    tracks: project.tracks.map((t, i) =>
                      i !== track
                        ? t
                        : {
                            ...t,
                            notes: t.notes.map((n) =>
                              selected.includes(n.id)
                                ? { ...n, velocity: v }
                                : n,
                            ),
                          },
                    ),
                  })
                }
              />
            </label>
          </>
        )}
      </div>
      <div className="roll-velocity-header">
        <span>VELOCITY</span>
        <span>
          {notes.length} notes · {p.bars} bars ·{" "}
          {snap === 0.25 ? "1/16" : snap === 0.5 ? "1/8" : "1/4"} snap
        </span>
      </div>
      <div
        ref={velocityScroll}
        className="roll-velocity-scroll"
        onScroll={(e) => {
          if (
            viewport.current &&
            viewport.current.scrollLeft !== e.currentTarget.scrollLeft
          )
            viewport.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
      >
        <div className="roll-velocity-lane" style={{ width: width + 64 }}>
          {notes.map((n) => (
            <button
              key={n.id}
              aria-label={`Select velocity for ${rollPitch(n.midi)} at ${n.start}`}
              title={`${rollPitch(n.midi)} · velocity ${n.velocity}`}
              onClick={() => setSelected([n.id])}
              className={selected.includes(n.id) ? "velocity-selected" : ""}
              style={{
                left: 64 + n.start * zoom,
                height: Math.max(6, (n.velocity / 127) * 58),
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
