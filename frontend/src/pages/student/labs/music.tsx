import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Square,
  Save,
  FolderOpen,
  Plus,
  Music2,
  Volume2,
  Headphones,
  X,
  GripVertical,
  Globe2,
  Download,
  Check,
  Loader2,
} from "lucide-react";
import { api } from "../../../api/axios";
import { useAuthStore } from "../../../store/auth.store";
import {
  MusicAudioEngine,
  type StudioLoop,
} from "../../../features/student/music/audio-engine";
import {
  emptyTracks,
  validProject,
  type MusicProject,
  type MusicTrack,
  type Meter,
  type LoopId,
} from "../../../../../backend/src/student/music/project";
interface SavedProject extends MusicProject {
  id: string;
  updated_at: string;
}
const initial = (): MusicProject => ({
  title: "Untitled composition",
  bpm: 120,
  time_signature: "4/4",
  tracks_json: emptyTracks(),
});
function Waveform({ loop }: { loop: StudioLoop }) {
  return (
    <svg viewBox="0 0 320 36" className="h-9 w-full" aria-hidden="true">
      {loop.waveform.map((p, i) => (
        <rect
          key={i}
          x={i * 10}
          y={18 - p * 20}
          width="5"
          height={Math.max(2, p * 40)}
          rx="2"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
export default function MusicStudio() {
  const user = useAuthStore((s) => s.user),
    draftKey = `music-studio-v1:${user?.id}:${user?.schoolId}`;
  const [project, setProject] = useState<MusicProject>(initial),
    [projectId, setProjectId] = useState<string | null>(null),
    [activeTrack, setActiveTrack] = useState(1),
    [category, setCategory] = useState("Kenyan Rhythms"),
    [mobilePanel, setMobilePanel] = useState("compose"),
    [context, setContext] = useState<StudioLoop | null>(null),
    [playing, setPlaying] = useState(false),
    [loadingAudio, setLoadingAudio] = useState(false),
    [preview, setPreview] = useState<string | null>(null),
    [error, setError] = useState(""),
    [saveStatus, setSaveStatus] = useState("Unsaved"),
    [saving, setSaving] = useState(false),
    [picker, setPicker] = useState(false),
    [progress, setProgress] = useState(0),
    [level, setLevel] = useState(0),
    [restored, setRestored] = useState(false);
  const engine = useRef<MusicAudioEngine | null>(null),
    revision = useRef(0),
    mounted = useRef(true);
  const loops = useQuery({
    queryKey: ["music-loop-library"],
    queryFn: async () => {
      const r = await fetch("/assets/music-loops/loops.json");
      if (!r.ok) throw Error("Loop library unavailable");
      return (await r.json()).loops as StudioLoop[];
    },
    staleTime: Infinity,
  });
  const projects = useQuery({
    queryKey: ["music-projects", user?.id, user?.schoolId],
    queryFn: () =>
      api
        .get<SavedProject[]>("/student/music-studio/projects")
        .then((r) => r.data),
  });
  const library = loops.data ?? [];
  function audio() {
    return engine.current ?? (engine.current = new MusicAudioEngine());
  }
  useEffect(() => {
    mounted.current = true;
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (validProject(draft?.project)) {
        setProject(draft.project);
        setProjectId(draft.id ?? null);
        setSaveStatus("Draft restored on this device");
      }
    } catch {}
    setRestored(true);
    return () => {
      mounted.current = false;
      engine.current?.dispose();
      engine.current = null;
    };
  }, [draftKey]);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ id: projectId, project }),
      );
    } catch {}
    engine.current?.configure(project, library);
  }, [project, projectId, restored, loops.data]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setProgress(engine.current?.progress() ?? 0);
      setLevel(engine.current?.level() ?? 0);
    }, 100);
    return () => clearInterval(timer);
  }, [playing]);
  function change(fn: (p: MusicProject) => MusicProject) {
    revision.current++;
    setProject(fn);
    setSaveStatus("Unsaved changes");
  }
  function trackChange(id: number, values: Partial<MusicTrack>) {
    change((p) => ({
      ...p,
      tracks_json: p.tracks_json.map((t) =>
        t.id === id ? { ...t, ...values } : t,
      ),
    }));
  }
  function addLoop(id: number, loopId: string) {
    const loop = library.find((l) => l.id === loopId);
    if (!loop) return;
    trackChange(id, { loop_id: loop.id as LoopId });
    setContext(loop);
    setMobilePanel("compose");
    setError("");
  }
  async function play() {
    setError("");
    if (playing) {
      audio().pause();
      setLevel(0);
      setPlaying(false);
      return;
    }
    if (!project.tracks_json.some((t) => t.loop_id)) {
      setError("Add a loop to a track first.");
      return;
    }
    setLoadingAudio(true);
    try {
      const started = await audio().start(project, library);
      if (mounted.current && started) {
        setPlaying(true);
        setPreview(null);
      }
    } catch {
      if (mounted.current)
        setError("Audio could not start. Check your connection and try again.");
    } finally {
      if (mounted.current) setLoadingAudio(false);
    }
  }
  function stop() {
    audio().stop();
    setPlaying(false);
    setProgress(0);
    setLevel(0);
  }
  async function save() {
    setSaving(true);
    setError("");
    const snapshot = project,
      version = revision.current;
    try {
      const r = projectId
        ? await api.put<SavedProject>(
            `/student/music-studio/projects/${projectId}`,
            snapshot,
          )
        : await api.post<SavedProject>(
            "/student/music-studio/projects",
            snapshot,
          );
      if (mounted.current) {
        setProjectId(r.data.id);
        setSaveStatus(
          revision.current === version
            ? "Saved to your account"
            : "Unsaved changes",
        );
        void projects.refetch();
      }
    } catch {
      if (mounted.current) {
        setSaveStatus("Not saved to account");
        setError(
          "Could not save to your account. Keep this tab open or export a copy.",
        );
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  function replace(p: MusicProject, id: string | null) {
    if (
      saveStatus === "Unsaved changes" &&
      !window.confirm("Replace your unsaved composition?")
    )
      return;
    stop();
    setProject(p);
    setProjectId(id);
    revision.current++;
    setSaveStatus(id ? "Saved to your account" : "Unsaved");
    setPicker(false);
    setContext(null);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "assignment-hub-composition.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="mx-auto max-w-7xl space-y-4 text-[#101820]">
      <nav aria-label="Music workspaces" className="flex flex-wrap gap-2"><span className="rounded-lg bg-[#101820] px-3 py-2 text-xs text-white">Loop studio</span><Link to="/student/labs/music/composition" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">Songs, notation & production →</Link></nav>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Music Studio
          </h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <Headphones size={14} />
            Compose · listen · refine
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="music-action"
            disabled={saving}
            onClick={() => replace(initial(), null)}
          >
            <Plus size={15} />
            New
          </button>
          <button
            className="music-action"
            onClick={() => setPicker(!picker)}
            aria-expanded={picker}
          >
            <FolderOpen size={15} />
            Projects
          </button>
          <button className="music-action" onClick={download}>
            <Download size={15} />
            Export
          </button>
          <button
            className="music-action bg-[#101820] text-white"
            disabled={saving || !project.title.trim()}
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save project
          </button>
        </div>
      </header>
      {picker && (
        <section
          aria-label="Saved projects"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-semibold">Your projects</h2>
          {projects.isLoading ? (
            <p>Loading projects…</p>
          ) : projects.isError ? (
            <p role="alert">
              Projects could not be loaded.{" "}
              <button
                onClick={() => void projects.refetch()}
                className="underline"
              >
                Retry
              </button>
            </p>
          ) : projects.data?.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {projects.data.map((p) => (
                <button
                  key={p.id}
                  disabled={saving}
                  onClick={() => replace(p, p.id)}
                  className="rounded-lg border border-slate-200 p-3 text-left text-sm"
                >
                  <strong className="block">{p.title}</strong>
                  <span className="text-xs text-slate-500">
                    {p.bpm} BPM · {p.time_signature} ·{" "}
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No saved projects yet.</p>
          )}
        </section>
      )}
      <section
        aria-label="Transport controls"
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Music2 size={18} className="shrink-0 text-[#617c17]" />
            <input
              aria-label="Composition title"
              maxLength={100}
              value={project.title}
              onChange={(e) => change((p) => ({ ...p, title: e.target.value }))}
              className="min-w-0 w-full max-w-72 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <span role="status" className="text-xs text-slate-500">
            {saveStatus === "Saved to your account" && (
              <Check size={13} className="mr-1 inline text-emerald-600" />
            )}
            {saveStatus}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void play()}
              disabled={loadingAudio || loops.isLoading || loops.isError}
              aria-label={playing ? "Pause composition" : "Play composition"}
              className="flex h-10 w-24 items-center justify-center gap-2 rounded-lg bg-[#101820] text-sm font-medium text-white disabled:opacity-50"
            >
              {loadingAudio ? (
                <Loader2 size={17} className="animate-spin" />
              ) : playing ? (
                <Pause size={17} />
              ) : (
                <Play size={17} />
              )}{" "}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={stop}
              aria-label="Stop composition"
              className="music-action h-10"
            >
              <Square size={15} />
            </button>
          </div>
          <label className="flex items-center gap-3 text-xs font-medium">
            Tempo
            <input
              aria-label="Tempo"
              type="range"
              min={60}
              max={180}
              value={project.bpm}
              onChange={(e) =>
                change((p) => ({ ...p, bpm: Number(e.target.value) }))
              }
              className="w-28 accent-[#617c17]"
            />
            <output aria-label="Current tempo" className="w-16 tabular-nums">
              {project.bpm} BPM
            </output>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium">
            Meter
            <select
              aria-label="Time signature"
              value={project.time_signature}
              onChange={(e) =>
                change((p) => ({
                  ...p,
                  time_signature: e.target.value as Meter,
                }))
              }
              className="rounded-lg border border-slate-200 px-2 py-2"
            >
              <option>4/4</option>
              <option>6/8</option>
              <option>12/8</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <Volume2 size={15} className="text-slate-400" />
            <meter
              aria-label="Output level"
              min={0}
              max={1}
              value={level}
              className="h-3 w-16 accent-[#617c17]"
            />
          </div>
        </div>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          {error}
        </p>
      )}
      <nav
        aria-label="Studio view"
        className="flex gap-1 rounded-lg bg-slate-100 p-1 lg:hidden"
      >
        {[
          ["compose", "Compose"],
          ["loops", "Loops"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMobilePanel(id)}
            aria-pressed={mobilePanel === id}
            className={`flex-1 rounded-md px-3 py-2 text-sm ${mobilePanel === id ? "bg-white font-semibold shadow-sm" : "text-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`${mobilePanel === "loops" ? "block" : "hidden"} min-w-0 rounded-xl border border-slate-200 bg-white p-4 lg:block`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Loop library</h2>
            <span className="text-xs text-slate-400">6 loops</span>
          </div>
          <div
            className="mt-3 flex flex-wrap gap-1"
            aria-label="Loop categories"
          >
            {["Kenyan Rhythms", "Afrobeat", "Amapiano"].map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-md px-2 py-2 text-[11px] font-medium ${category === c ? "bg-[#101820] text-white" : "bg-slate-50 text-slate-600"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center justify-between text-xs text-slate-500">
            Add to
            <select
              aria-label="Selected track"
              value={activeTrack}
              onChange={(e) => setActiveTrack(Number(e.target.value))}
              className="rounded-md border border-slate-200 p-1.5 text-slate-800"
            >
              {project.tracks_json.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          {loops.isLoading ? (
            <p className="mt-4 text-sm">Loading sounds…</p>
          ) : loops.isError ? (
            <p role="alert" className="mt-4 text-sm">
              Loop library unavailable.{" "}
              <button
                onClick={() => void loops.refetch()}
                className="underline"
              >
                Retry
              </button>
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {library
                .filter((l) => l.category === category)
                .map((loop) => (
                  <article
                    key={loop.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", loop.id)
                    }
                    className="rounded-lg border border-slate-200 p-3"
                    aria-label={loop.name}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical
                        size={14}
                        className="mt-1 shrink-0 text-slate-300"
                      />
                      <button
                        onClick={() => setContext(loop)}
                        className="min-w-0 text-left"
                      >
                        <h3 className="text-xs font-semibold">{loop.name}</h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {loop.bpm} BPM · {loop.time_signature}
                        </p>
                      </button>
                    </div>
                    <div className="my-2 text-[#849553]">
                      <Waveform loop={loop} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        aria-label={`Preview ${loop.name}`}
                        onClick={() => {
                          if (preview === loop.id) {
                            audio().stopPreview();
                            setPreview(null);
                          } else {
                            stop();
                            setPreview(loop.id);
                            void audio().preview(
                              loop,
                              () => mounted.current && setPreview(null),
                              () => {
                                if (mounted.current) {
                                  setPreview(null);
                                  setError("This preview could not be loaded.");
                                }
                              },
                            );
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs text-slate-600"
                      >
                        {preview === loop.id ? (
                          <Square size={12} />
                        ) : (
                          <Play size={12} />
                        )}
                        Preview
                      </button>
                      <button
                        aria-label={`Add ${loop.name} to Track ${activeTrack}`}
                        onClick={() => addLoop(activeTrack, loop.id)}
                        className="rounded-md bg-slate-100 p-1.5 text-slate-700"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}
          <p className="mt-4 text-[11px] leading-5 text-slate-400">
            Original synthesized teaching loops. Inspired by musical styles; not
            traditional recordings.
          </p>
        </aside>
        <div
          className={`${mobilePanel === "compose" ? "block" : "hidden"} min-w-0 space-y-4 lg:block`}
        >
          <section
            aria-label="Your composition"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold">Your composition</h2>
              <span className="text-[11px] text-slate-400">
                1 bar · 4 tracks
              </span>
            </div>
            <div className="bg-[#101820] px-4 py-3 text-white/60">
              <div className="ml-0 flex justify-between text-[10px] tabular-nums">
                {Array.from(
                  {
                    length:
                      project.time_signature === "4/4"
                        ? 4
                        : project.time_signature === "6/8"
                          ? 6
                          : 12,
                  },
                  (_, i) => (
                    <span key={i}>{i + 1}</span>
                  ),
                )}
              </div>
              <div className="relative mt-2 h-1 rounded bg-white/10">
                <div
                  className="absolute h-1 w-1 rounded bg-[#B5E61D]"
                  style={{ left: `${Math.min(progress, 0.99) * 99}%` }}
                />
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {project.tracks_json.map((track) => {
                const loop = library.find((l) => l.id === track.loop_id);
                return (
                  <div
                    key={track.id}
                    role="group"
                    aria-label={`Track ${track.id}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      addLoop(track.id, e.dataTransfer.getData("text/plain"));
                    }}
                    className={`p-4 ${activeTrack === track.id ? "bg-slate-50/80" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setActiveTrack(track.id)}
                        aria-pressed={activeTrack === track.id}
                        className="flex flex-1 items-center gap-2 text-left text-xs font-semibold"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-200/70 text-[10px] text-slate-600">
                          0{track.id}
                        </span>
                        {track.name}
                      </button>
                      <button
                        onClick={() =>
                          trackChange(track.id, { muted: !track.muted })
                        }
                        aria-label={`Mute Track ${track.id}`}
                        aria-pressed={track.muted}
                        className={`rounded px-2 py-1 text-[10px] font-semibold ${track.muted ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}
                      >
                        M
                      </button>
                      <button
                        onClick={() =>
                          trackChange(track.id, { solo: !track.solo })
                        }
                        aria-label={`Solo Track ${track.id}`}
                        aria-pressed={track.solo}
                        className={`rounded px-2 py-1 text-[10px] font-semibold ${track.solo ? "bg-[#eaf0d8] text-[#526b10]" : "bg-slate-100 text-slate-500"}`}
                      >
                        S
                      </button>
                      <label className="flex items-center gap-1">
                        <Volume2 size={13} className="text-slate-400" />
                        <input
                          aria-label={`Track ${track.id} volume`}
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={track.volume}
                          onChange={(e) =>
                            trackChange(track.id, {
                              volume: Number(e.target.value),
                            })
                          }
                          className="w-20 accent-[#617c17]"
                        />
                      </label>
                    </div>
                    <div
                      className={`relative mt-3 flex min-h-14 items-center gap-3 rounded-lg border px-3 ${loop ? "border-[#d8e2bc] bg-[#f0f4e5]" : "border-dashed border-slate-300 bg-white"}`}
                    >
                      {loop ? (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium">{loop.name}</p>
                            <div className="mt-1 text-[#859953]">
                              <Waveform loop={loop} />
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              trackChange(track.id, { loop_id: null })
                            }
                            aria-label={`Remove loop from Track ${track.id}`}
                            className="p-1 text-slate-400"
                          >
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveTrack(track.id);
                            setMobilePanel("loops");
                          }}
                          className="w-full py-2 text-left text-xs text-slate-400"
                        >
                          Drop a loop here, or select this track and tap +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          {context && (
            <section
              aria-label="Cultural context"
              className="rounded-xl border border-[#dce4c8] bg-[#f5f7ef] p-4"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Globe2 size={17} className="text-[#617c17]" />
                Behind the rhythm
              </h2>
              <p className="mt-2 text-xs font-medium text-[#526b10]">
                {context.name} · {context.origin}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                {context.context}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                {context.provenance}
              </p>
            </section>
          )}
          <p className="text-[11px] leading-5 text-slate-400">
            Loops are fitted to one bar in the selected meter. Tempo uses
            quarter-note BPM. Changing meter restarts the bar; stretching a loop
            changes its feel.
          </p>
        </div>
      </div>
      <style>{`.music-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:500;min-height:38px}.music-action:disabled{opacity:.5} .music-action:focus-visible{outline:2px solid #64748b;outline-offset:2px}`}</style>
    </div>
  );
}
