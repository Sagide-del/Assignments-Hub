import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Music2,
  Play,
  Pause,
  Square,
  Save,
  Download,
  Send,
  FolderOpen,
  Plus,
  Volume2,
  Check,
  ExternalLink,
  Loader2,
  Piano,
} from "lucide-react";
import { api } from "../../../../api/axios";
import { useAuthStore } from "../../../../store/auth.store";
import { useStudentContentScope } from "../../../../hooks/useStudentContentScope";
import MusicNotation from "../../../../components/MusicNotation";
import {
  ProductionAudio,
  mp3Blob,
  midiBlob,
} from "../../../../features/student/music-production/production-audio";
import {
  adaptScale,
  draftFromSong,
  editMelody,
  scoreFor,
  type StudioSong,
} from "../../../../features/student/music-production/score";
import {
  newMix,
  validMix,
  changeMeter,
  stepsFor,
  pitchName,
  INSTRUMENTS,
  SCALES,
  type ProductionDraft,
  type ProductionMeter,
  type ProductionMix,
  type Instrument,
} from "../../../../../../backend/src/student/music-production/model";
interface SavedMix extends ProductionDraft {
  id: string;
  status: string;
  updated_at: string;
  score: number | null;
  review_comment: string | null;
}
const ACTIVITIES = [
  ["rhythm", "Rhythm"],
  ["melody", "Melody"],
  ["instrument", "Instruments"],
  ["composition", "Arrange"],
  ["production", "Produce"],
] as const;
const origin: Record<Instrument, string> = {
  Piano: "A keyboard instrument developed in Europe and played worldwide.",
  Marimba:
    "Wooden-key instruments have diverse traditions across Africa; modern marimbas are also used worldwide.",
  Kalimba:
    "A modern thumb-piano name associated with the wider African lamellophone family.",
  Nyatiti:
    "An eight-string lyre associated with Luo musical traditions in Kenya.",
  Sitar:
    "A plucked string instrument associated with North Indian classical music.",
  Erhu: "A two-string bowed instrument associated with Chinese musical traditions.",
};
const names: Record<string, string> = {
  melody: "Melody",
  isatsa: "Isatsa · low drum",
  ikhasi: "Ikhasi · middle drum",
  omwana: "Omwana · high drum",
  gong: "Echikengele · gong",
  rattles: "Chisasi · rattles",
};
const blank = (): ProductionDraft => ({
  title: "Untitled arrangement",
  song_id: null,
  bpm: 90,
  time_signature: "6/8",
  tracks_json: newMix(),
});
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium disabled:opacity-50";
const darkButton = button.replace("bg-white", "bg-[#101820]") + " text-white";
export default function MusicProductionStudio() {
  const { activity: routeActivity } = useParams(),
    activity =
      routeActivity === "studio"
        ? "composition"
        : (routeActivity ?? "composition");
  const user = useAuthStore((s) => s.user),
    scope = useStudentContentScope(),
    key = `music-production-v1:${user?.id}:${user?.schoolId}`;
  const [draft, setDraft] = useState<ProductionDraft>(blank),
    [id, setId] = useState<string | null>(null),
    [recordStatus, setRecordStatus] = useState("DRAFT"),
    [message, setMessage] = useState("Unsaved"),
    [error, setError] = useState(""),
    [playing, setPlaying] = useState(false),
    [measure, setMeasure] = useState(-1),
    [busy, setBusy] = useState(""),
    [projectsOpen, setProjectsOpen] = useState(false),
    [genre, setGenre] = useState(""),
    [search, setSearch] = useState(""),
    [bar, setBar] = useState(0),
    [noteLength, setNoteLength] = useState(2),
    [instrument, setInstrument] = useState<Instrument>("Piano"),
    [feedback, setFeedback] = useState<{
      score: number | null;
      comment: string | null;
    } | null>(null),
    [restored, setRestored] = useState(false);
  const audio = useRef<ProductionAudio | null>(null),
    mounted = useRef(true),
    seeded = useRef(false),
    revision = useRef(0);
  const songs = useQuery({
    queryKey: ["production-songs", user?.id, user?.schoolId],
    queryFn: () =>
      api.get<StudioSong[]>("/music-production/songs").then((r) => r.data),
    staleTime: 60000,
  });
  const projects = useQuery({
    queryKey: ["production-projects", user?.id, user?.schoolId],
    queryFn: () =>
      api.get<SavedMix[]>("/music-production/projects").then((r) => r.data),
  });
  const selected = songs.data?.find((s) => s.id === draft.song_id),
    score = useMemo(() => scoreFor(draft, selected), [draft, selected]);
  function engine() {
    return audio.current ?? (audio.current = new ProductionAudio());
  }
  useEffect(() => {
    mounted.current = true;
    try {
      const local = JSON.parse(localStorage.getItem(key) ?? "null");
      if (
        local?.draft &&
        validMix(local.draft.tracks_json, local.draft.time_signature) &&
        typeof local.draft.title === "string" &&
        local.draft.bpm >= 60 &&
        local.draft.bpm <= 180
      ) {
        setDraft(local.draft);
        setId(local.id ?? null);
        setRecordStatus(local.status ?? "DRAFT");
        setMessage("Draft restored on this device");
        seeded.current = true;
      }
    } catch {}
    setRestored(true);
    return () => {
      mounted.current = false;
      audio.current?.dispose();
      audio.current = null;
    };
  }, [key]);
  useEffect(() => {
    if (restored && !seeded.current && songs.data?.length) {
      seeded.current = true;
      const starter = songs.data.find(
        (s) => s.content_kind === "SUPPLIED_STUDY",
      );
      if (starter) setDraft(draftFromSong(starter));
    }
  }, [restored, songs.data]);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ draft, id, status: recordStatus }),
      );
    } catch {}
    audio.current?.update(draft);
  }, [draft, id, recordStatus, restored, key]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setMeasure(audio.current?.measure() ?? 0),
      120,
    );
    return () => clearInterval(timer);
  }, [playing]);
  function change(fn: (p: ProductionDraft) => ProductionDraft) {
    revision.current++;
    setDraft(fn);
    setMessage("Unsaved changes");
    setError("");
  }
  function mixChange(fn: (m: ProductionMix) => ProductionMix) {
    change((p) => ({ ...p, tracks_json: fn(p.tracks_json) }));
  }
  function stop() {
    audio.current?.stop();
    setPlaying(false);
    setMeasure(-1);
  }
  async function toggle() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    try {
      if (await engine().play(draft)) {
        setPlaying(true);
        setError("");
      }
    } catch {
      setError("Audio could not start. Tap Play to try again.");
    }
  }
  function replace(
    p: ProductionDraft,
    newId: string | null,
    status = "DRAFT",
    review?: { score: number | null; comment: string | null },
  ) {
    if (message === "Unsaved changes" && !confirm("Replace this unsaved mix?"))
      return;
    stop();
    seeded.current = true;
    setDraft(p);
    setId(newId);
    setRecordStatus(status);
    setFeedback(review ?? null);
    revision.current++;
    setMessage(newId ? "Loaded from your account" : "Unsaved");
  }
  async function persist(): Promise<SavedMix> {
    const snapshot = draft,
      r = revision.current;
    const response =
      id && recordStatus === "DRAFT"
        ? await api.put<SavedMix>(`/music-production/projects/${id}`, snapshot)
        : await api.post<SavedMix>("/music-production/projects", snapshot);
    if (mounted.current) {
      setId(response.data.id);
      setRecordStatus(response.data.status);
      setFeedback(null);
      setMessage(
        revision.current === r ? "Saved to your account" : "Unsaved changes",
      );
      void projects.refetch();
    }
    return response.data;
  }
  async function save() {
    setBusy("save");
    try {
      await persist();
      setError("");
    } catch {
      setError("Could not save this mix. Keep this tab open and try again.");
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  async function submit() {
    if (!confirm("Submit a fixed copy of this mix to your Music teacher?"))
      return;
    setBusy("submit");
    try {
      const saved = await persist(),
        result = await api.post<SavedMix>(
          `/music-production/projects/${saved.id}/submit`,
        );
      if (mounted.current) {
        setRecordStatus(result.data.status);
        setMessage("Submitted to your Music teacher");
        void projects.refetch();
      }
    } catch {
      setError(
        "Submission did not complete. Your saved draft is still available; try again.",
      );
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  async function download(format: "mp3" | "midi") {
    stop();
    setBusy(format);
    setError("");
    try {
      const blob =
          format === "mp3" ? await mp3Blob(draft) : await midiBlob(draft),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      const safe = (s: string) =>
        s
          .replace(/[^a-z0-9 -]/gi, "")
          .trim()
          .slice(0, 70) || "Composition";
      a.download = `${safe(draft.title)} - ${safe(user?.name ?? "Learner")}.${format === "mp3" ? "mp3" : "mid"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Audio export could not finish. Try again with this tab open.");
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  if (!ACTIVITIES.some(([a]) => a === activity))
    return (
      <div>
        <h1 className="text-xl font-semibold">Activity not found</h1>
        <Link to="/student/labs/music/composition" className="underline">
          Open the production workspace
        </Link>
      </div>
    );
  const steps = stepsFor(draft.time_signature),
    complete = draft.tracks_json.completed_activities;
  const brief: Record<string, string> = {
    rhythm:
      "Hear the pulse, then change one percussion pattern. Compare an answering phrase with a repeating ostinato.",
    melody:
      "Compose four bars using the selected scale. Leave space for rhythm and try a clear ending.",
    instrument:
      "Compare synthesized practice voices. Listen to how attack and decay change the same melody.",
    composition:
      "Layer your melody and percussion. Balance the parts and explain one arrangement choice.",
    production:
      "Check the final mix, write a short reflection, export your audio and submit a fixed copy for feedback.",
  };
  return (
    <div className="mx-auto max-w-7xl space-y-4 text-[#101820]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Music2 className="text-[#617c17]" size={25} />
            Music Production
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Grade {scope.data?.grade ?? 10} · Original work, musical skills and
            reflection
          </p>
        </div>
        <Link to="/student/labs/music/loops" className={button}>
          Loop studio
        </Link>
      </header>
      <nav
        aria-label="Music activities"
        className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1"
      >
        {ACTIVITIES.map(([slug, label], i) => (
          <Link
            key={slug}
            to={`/student/labs/music/${slug}`}
            aria-current={activity === slug ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-xs ${activity === slug ? "bg-white font-semibold shadow-sm" : "text-slate-500"}`}
          >
            <span className="text-[10px]">
              {complete.includes(slug) ? <Check size={12} /> : i + 1}
            </span>
            {label}
          </Link>
        ))}
      </nav>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            aria-label="Mix title"
            maxLength={100}
            value={draft.title}
            onChange={(e) => change((p) => ({ ...p, title: e.target.value }))}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-300"
          />
          <span role="status" className="text-xs text-slate-500">
            {message}
          </span>
          <button
            className={button}
            disabled={!!busy}
            onClick={() => replace(blank(), null)}
          >
            <Plus size={14} />
            New
          </button>
          <button
            className={button}
            onClick={() => setProjectsOpen(!projectsOpen)}
            aria-expanded={projectsOpen}
          >
            <FolderOpen size={14} />
            Projects
          </button>
          <button
            className={darkButton}
            disabled={!!busy || !draft.title.trim()}
            onClick={() => void save()}
          >
            <Save size={14} />
            {recordStatus === "DRAFT" ? "Save mix" : "Save new copy"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          <button
            aria-label={playing ? "Pause mix" : "Play mix"}
            onClick={() => void toggle()}
            className={darkButton}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
            {playing ? "Pause" : "Play"}
          </button>
          <button aria-label="Stop mix" onClick={stop} className={button}>
            <Square size={14} />
          </button>
          <label className="flex items-center gap-2 text-xs">
            Tempo{" "}
            <input
              aria-label="Production tempo"
              type="range"
              min={60}
              max={180}
              value={draft.bpm}
              onChange={(e) =>
                change((p) => ({ ...p, bpm: Number(e.target.value) }))
              }
              className="w-24 accent-[#617c17]"
            />
            <output>{draft.bpm} BPM</output>
          </label>
          <label className="flex items-center gap-2 text-xs">
            Meter{" "}
            <select
              aria-label="Production meter"
              value={draft.time_signature}
              onChange={(e) => {
                const meter = e.target.value as ProductionMeter;
                change((p) => ({
                  ...p,
                  time_signature: meter,
                  tracks_json: changeMeter(
                    p.tracks_json,
                    p.time_signature,
                    meter,
                  ),
                }));
              }}
              className="rounded-lg border border-slate-200 p-2"
            >
              {["4/4", "6/8", "12/8"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <span className="ml-auto text-xs text-slate-400">
            Bar {measure < 0 ? "—" : measure + 1} / 4
          </span>
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
      {projectsOpen && (
        <section
          aria-label="Production projects"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-semibold">Your arrangements</h2>
          {projects.isLoading ? (
            <p>Loading…</p>
          ) : projects.isError ? (
            <p role="alert">
              Projects unavailable.{" "}
              <button
                onClick={() => void projects.refetch()}
                className="underline"
              >
                Retry
              </button>
            </p>
          ) : projects.data?.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {projects.data.map((p) => (
                <button
                  key={p.id}
                  disabled={!!busy}
                  onClick={() => {
                    replace(p, p.id, p.status, {
                      score: p.score,
                      comment: p.review_comment,
                    });
                    setProjectsOpen(false);
                  }}
                  className="rounded-lg border border-slate-200 p-3 text-left"
                >
                  <strong className="text-xs">{p.title}</strong>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.status} · {p.bpm} BPM · {p.time_signature}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No saved arrangements yet.</p>
          )}
        </section>
      )}
      {feedback?.comment && (
        <section className="rounded-xl bg-[#f0f4e6] p-4">
          <h2 className="text-sm font-semibold">
            Teacher feedback · {feedback.score}/100
          </h2>
          <p className="mt-2 text-sm">{feedback.comment}</p>
        </section>
      )}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f0f4e6] p-4">
        <p className="max-w-3xl text-xs leading-6 text-slate-600">
          {brief[activity]}{" "}
          {scope.data?.grade === 12
            ? "Justify your choices of texture, balance and form."
            : scope.data?.grade === 11
              ? "Try a contrasting section or change the dynamics."
              : ""}
        </p>
        <button
          onClick={() =>
            mixChange((m) => ({
              ...m,
              completed_activities: complete.includes(activity)
                ? complete.filter((s) => s !== activity)
                : [...complete, activity],
            }))
          }
          className={button}
        >
          {complete.includes(activity) ? <Check size={14} /> : null}
          {complete.includes(activity) ? "Step complete" : "Mark step complete"}
        </button>
      </section>
      {activity === "composition" && (
        <section
          aria-label="Song and exercise library"
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-sm font-semibold">
              Songs, exercises & listening
            </h2>
            <input
              aria-label="Search songs"
              placeholder="Song or artist"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
            <select
              aria-label="Song genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="rounded-lg border border-slate-200 p-2 text-xs"
            >
              <option value="">All genres</option>
              {[...new Set((songs.data ?? []).map((s) => s.genre))]
                .sort()
                .map((g) => (
                  <option key={g}>{g}</option>
                ))}
            </select>
          </div>
          {songs.isLoading ? (
            <p className="mt-3 text-sm">Loading library…</p>
          ) : songs.isError ? (
            <p role="alert" className="mt-3 text-sm">
              The library could not load.{" "}
              <button
                onClick={() => void songs.refetch()}
                className="underline"
              >
                Retry
              </button>
            </p>
          ) : (
            <div className="mt-3 grid max-h-72 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
              {songs.data
                ?.filter(
                  (s) =>
                    (!genre || s.genre === genre) &&
                    `${s.title} ${s.artist}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((s) => (
                  <article
                    key={s.id}
                    className={`rounded-lg border p-3 ${draft.song_id === s.id ? "border-[#b9cc83] bg-[#f5f7ef]" : "border-slate-200"}`}
                  >
                    <h3 className="text-xs font-semibold">{s.title}</h3>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {s.artist} · {s.genre}
                    </p>
                    {s.content_kind === "LISTENING_REFERENCE" ? (
                      <>
                        <p className="mt-2 text-[11px] text-slate-400">
                          Listening reference · no score or recording supplied
                        </p>
                        <a
                          href={s.reference_url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs underline"
                        >
                          Find recording
                          <ExternalLink size={11} />
                        </a>
                      </>
                    ) : (
                      <button
                        disabled={!!busy}
                        onClick={() => replace(draftFromSong(s), null)}
                        className="mt-2 text-xs font-medium text-[#526b10] underline"
                      >
                        Load exercise · {s.bpm} BPM · {s.time_signature}
                      </button>
                    )}
                  </article>
                ))}
            </div>
          )}
        </section>
      )}
      {selected && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium">
            {selected.chord_progression.join(" → ")}
          </span>
          <span className="text-slate-500">{selected.source_note}</span>
        </div>
      )}
      {["melody", "composition"].includes(activity) && (
        <MusicNotation
          notation_json={score}
          timeSignature={draft.time_signature}
          bpm={draft.bpm}
          musicKey={draft.tracks_json.scale === "A Minor" ? "Am" : "C"}
          currentMeasure={playing ? measure : -1}
        />
      )}
      {activity === "production" && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer p-4 text-sm font-medium">
            View score
          </summary>
          <MusicNotation
            notation_json={score}
            timeSignature={draft.time_signature}
            bpm={draft.bpm}
            musicKey={draft.tracks_json.scale === "A Minor" ? "Am" : "C"}
            currentMeasure={playing ? measure : -1}
          />
        </details>
      )}
      {activity === "rhythm" && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Call, response and ostinato</h2>
          <p className="mt-2 text-xs leading-6 text-slate-600">
            In this teaching model, Isatsa is the low-drum anchor, Ikhasi the
            middle-drum response, and Omwana the high repeating part. These
            family-role descriptions are an introductory aid; names and
            performance roles vary by community and ensemble. Listen to local
            practitioners alongside these synthesized exercises.
          </p>
        </section>
      )}
      {activity === "instrument" && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Instrument practice</h2>
          <p className="mt-1 text-xs text-slate-500">
            Synthesized practice voices, not recordings of the original
            instruments.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {INSTRUMENTS.map((i) => (
              <button
                key={i}
                aria-pressed={instrument === i}
                onClick={() => {
                  setInstrument(i);
                  mixChange((m) => ({
                    ...m,
                    tracks: m.tracks.map((t) =>
                      t.id === "melody" ? { ...t, instrument: i } : t,
                    ),
                  }));
                }}
                className={`rounded-lg border p-3 text-left ${instrument === i ? "border-[#a9bc72] bg-[#f0f4e6]" : "border-slate-200"}`}
              >
                <Piano size={18} className="mb-2 text-slate-500" />
                <strong className="text-xs">{i}</strong>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  {origin[i]}
                </p>
              </button>
            ))}
          </div>
          <div
            aria-label="Practice keyboard"
            className="mt-4 grid grid-cols-8 gap-1"
          >
            {SCALES["C Major"].map((n) => (
              <button
                key={n}
                aria-label={`Play ${pitchName(n)}`}
                onClick={() =>
                  void engine()
                    .instrument(pitchName(n), instrument)
                    .catch(() => setError("Tap the key again to start audio."))
                }
                className="h-24 rounded-b-lg border border-slate-300 bg-white pt-14 text-[10px] shadow-sm active:bg-[#edf3db]"
              >
                {pitchName(n)}
              </button>
            ))}
          </div>
        </section>
      )}
      {activity === "melody" && (
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-sm font-semibold">Four-bar melody</h2>
            <select
              aria-label="Melody scale"
              value={draft.tracks_json.scale}
              onChange={(e) =>
                mixChange((m) =>
                  adaptScale(m, e.target.value as keyof typeof SCALES),
                )
              }
              className="rounded-lg border border-slate-200 p-2 text-xs"
            >
              {Object.keys(SCALES).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <label className="text-xs">
              Length{" "}
              <select
                aria-label="Note length"
                value={noteLength}
                onChange={(e) => setNoteLength(Number(e.target.value))}
                className="rounded-lg border border-slate-200 p-2"
              >
                <option value={1}>Sixteenth</option>
                <option value={2}>Eighth</option>
                <option value={4}>Quarter</option>
              </select>
            </label>
          </div>
          <div className="my-3 flex gap-2">
            {[0, 1, 2, 3].map((b) => (
              <button
                key={b}
                aria-pressed={bar === b}
                onClick={() => setBar(b)}
                className={bar === b ? darkButton : button}
              >
                Bar {b + 1}
              </button>
            ))}
            <button
              className={`${button} ml-auto`}
              onClick={() =>
                mixChange((m) => ({
                  ...m,
                  melody: m.melody.filter((n) => n.bar !== bar),
                }))
              }
            >
              Clear bar
            </button>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(460, steps * 26) }}>
              {[...SCALES[draft.tracks_json.scale]].reverse().map((n) => (
                <div
                  key={n}
                  className="grid items-center gap-1 py-0.5"
                  style={{
                    gridTemplateColumns: `40px repeat(${steps},minmax(20px,1fr))`,
                  }}
                >
                  <span className="text-[10px] text-slate-500">
                    {pitchName(n)}
                  </span>
                  {Array.from({ length: steps }, (_, i) => {
                    const active = draft.tracks_json.melody.some(
                      (e) =>
                        e.bar === bar &&
                        e.midi === n &&
                        i >= e.step &&
                        i < e.step + e.length,
                    );
                    return (
                      <button
                        key={i}
                        aria-label={`${pitchName(n)} bar ${bar + 1} step ${i + 1}`}
                        aria-pressed={active}
                        onClick={() => {
                          mixChange((m) =>
                            editMelody(m, {
                              bar,
                              step: i,
                              midi: n,
                              length: Math.min(noteLength, steps - i),
                            }),
                          );
                          void engine()
                            .instrument(
                              pitchName(n),
                              draft.tracks_json.tracks[0].instrument,
                            )
                            .catch(() => {});
                        }}
                        className={`h-7 rounded-sm border ${active ? "border-[#91a756] bg-[#c9dba0]" : "border-slate-100 bg-slate-50 hover:bg-slate-200"}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {draft.tracks_json.scale === "A Minor"
              ? "i–iv–v–i: Am → Dm → Em → Am."
              : "I–IV–V–I: C → F → G → C."}{" "}
            Tap a pitch to add or remove a note; space between notes is part of
            the music.
          </p>
        </section>
      )}
      {["rhythm", "composition", "production"].includes(activity) && (
        <section
          aria-label="Six track mixer"
          className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <header className="flex justify-between bg-[#101820] p-4 text-white">
            <h2 className="text-sm font-semibold">Six-track mixer</h2>
            <span className="text-xs text-white/50">{steps} steps per bar</span>
          </header>
          <div className="divide-y divide-slate-100">
            {draft.tracks_json.tracks.map((t) => (
              <div key={t.id} className="min-w-0 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="mr-auto text-xs font-semibold">
                    {names[t.id]}
                  </h3>
                  <button
                    aria-label={`Mute ${t.id}`}
                    aria-pressed={t.muted}
                    onClick={() =>
                      mixChange((m) => ({
                        ...m,
                        tracks: m.tracks.map((x) =>
                          x.id === t.id ? { ...x, muted: !x.muted } : x,
                        ),
                      }))
                    }
                    className={`rounded px-2 py-1 text-[10px] font-semibold ${t.muted ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}
                  >
                    M
                  </button>
                  <Volume2 size={13} className="text-slate-400" />
                  <input
                    aria-label={`${t.id} volume`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={t.volume}
                    onChange={(e) =>
                      mixChange((m) => ({
                        ...m,
                        tracks: m.tracks.map((x) =>
                          x.id === t.id
                            ? { ...x, volume: Number(e.target.value) }
                            : x,
                        ),
                      }))
                    }
                    className="w-24 accent-[#617c17]"
                  />
                </div>
                {t.id === "melody" ? (
                  <Link
                    to="/student/labs/music/melody"
                    className="mt-3 inline-block text-xs text-[#526b10] underline"
                  >
                    Edit {draft.tracks_json.melody.length} melody notes
                  </Link>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <div
                      style={{
                        minWidth: steps * 26,
                        gridTemplateColumns: `repeat(${steps},minmax(22px,1fr))`,
                      }}
                      className="grid gap-1"
                    >
                      {t.pattern.map((hit, i) => (
                        <button
                          key={i}
                          aria-label={`${t.id} step ${i + 1}`}
                          aria-pressed={hit}
                          onClick={() =>
                            mixChange((m) => ({
                              ...m,
                              tracks: m.tracks.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      pattern: x.pattern.map((p, j) =>
                                        j === i ? !p : p,
                                      ),
                                    }
                                  : x,
                              ),
                            }))
                          }
                          className={`h-9 rounded border text-[9px] tabular-nums ${hit ? "border-[#a1b770] bg-[#dce8c1] text-[#3d5016]" : "border-slate-200 bg-slate-50 text-slate-400"}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {activity === "production" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Finish your production</h2>
          <label className="mt-4 block text-xs font-medium">
            Reflection
            <textarea
              aria-label="Production reflection"
              maxLength={2000}
              value={draft.tracks_json.reflection}
              onChange={(e) =>
                mixChange((m) => ({ ...m, reflection: e.target.value }))
              }
              placeholder="What did you change, and what should the listener notice?"
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={!!busy}
              onClick={() => void download("mp3")}
              className={button}
            >
              {busy === "mp3" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}{" "}
              {busy === "mp3" ? "Rendering MP3…" : "Download MP3"}
            </button>
            <button
              disabled={!!busy}
              onClick={() => void download("midi")}
              className={button}
            >
              <Download size={15} />
              Melody MIDI
            </button>
            <button
              disabled={!!busy}
              onClick={() => void submit()}
              className={darkButton}
            >
              <Send size={15} />
              {busy === "submit" ? "Submitting…" : "Submit to teacher"}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            MP3 export renders your four-bar mix in this browser. Submitted
            mixes are fixed copies; edits can be saved as a new draft. Your
            assigned Music teacher can assess the submission.
          </p>
        </section>
      )}
    </div>
  );
}
