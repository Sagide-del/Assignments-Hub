import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Square,
  Repeat2,
  Save,
  Download,
  Library,
  Headphones,
  SlidersHorizontal,
  ChevronDown,
  Piano,
  KeyboardMusic,
  Loader2,
  Send,
} from "lucide-react";
import { api } from "../../../../api/axios";
import { useAuthStore } from "../../../../store/auth.store";
import { StudioNav } from "../../../../features/student/music-production/StudioNav";
import { StudioLibrary } from "../../../../features/student/music-production/StudioLibrary";
import {
  PLAY_ALONG,
  StemEngine,
  barSeconds,
} from "../../../../features/student/music-production/stem-engine";
import {
  ProductionAudio,
  mp3Blob,
} from "../../../../features/student/music-production/production-audio";
import {
  draftFromSong,
  scoreFor,
  type StudioSong,
} from "../../../../features/student/music-production/score";
import MusicNotation from "../../../../components/MusicNotation";
import { useMidiKeyboard } from "../../../../features/student/music-production/useMidiKeyboard";
import {
  newPlayAlong,
  validPlayAlong,
  validMix,
  pitchName,
  SCALES,
  type ProductionDraft,
  type PlayAlongMix,
  type StemSetting,
} from "../../../../../../backend/src/student/music-production/model";
interface Saved extends ProductionDraft {
  id: string;
  status: string;
  score: number | null;
  review_comment: string | null;
}
const colors: Record<string, string> = {
  melody: "#aa9764",
  keys: "#7195ac",
  bass: "#809a78",
  strings: "#9b87ab",
  percussion: "#b38982",
};
const action =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium disabled:opacity-50";
const clock = (n: number) =>
  `${Math.floor(n / 60)}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
function Wave({ peaks, color }: { peaks: number[]; color: string }) {
  return (
    <svg
      viewBox="0 0 640 50"
      preserveAspectRatio="none"
      className="h-12 w-full"
      aria-hidden="true"
    >
      {peaks.map((p, i) => (
        <rect
          key={i}
          x={i * 5}
          width="2.5"
          y={25 - Math.max(1, p * 26)}
          height={Math.max(2, p * 52)}
          rx="1"
          fill={color}
        />
      ))}
    </svg>
  );
}
export default function PlayAlong() {
  const user = useAuthStore((s) => s.user),
    [params] = useSearchParams(),
    requested = params.get("project"),
    key = `music-play-along-v1:${user?.id}:${user?.schoolId}`;
  const [mix, setMix] = useState<PlayAlongMix>(newPlayAlong),
    [title, setTitle] = useState("Ode to Joy — my session"),
    [reflection, setReflection] = useState(""),
    [id, setId] = useState<string | null>(null),
    [status, setStatus] = useState("DRAFT"),
    [saved, setSaved] = useState("New session"),
    [feedback, setFeedback] = useState<Saved | null>(null),
    [library, setLibrary] = useState(false),
    [selected, setSelected] = useState("keys"),
    [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [count, setCount] = useState(0),
    [position, setPosition] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [ready, setReady] = useState(false),
    [lastNote, setLastNote] = useState<number | null>(null);
  const engine = useRef<StemEngine | null>(null),
    keys = useRef<ProductionAudio | null>(null),
    mounted = useRef(true),
    revision = useRef(0);
  const songs = useQuery({
    queryKey: ["production-songs", user?.id, user?.schoolId],
    queryFn: () =>
      api.get<StudioSong[]>("/music-production/songs").then((r) => r.data),
    staleTime: 60000,
  });
  const song = songs.data?.find((s) => s.slug === PLAY_ALONG.song_slug),
    stem = mix.stems.find((s) => s.id === selected)!,
    definition = PLAY_ALONG.stems.find((s) => s.id === selected)!;
  const draft = useMemo(() => {
    if (!song) return null;
    const p = draftFromSong(song);
    return {
      ...p,
      title,
      bpm: PLAY_ALONG.bpm,
      time_signature: "4/4" as const,
      tracks_json: { ...p.tracks_json, play_along: mix, reflection },
    };
  }, [song, mix, title, reflection]);
  function audio() {
    return engine.current ?? (engine.current = new StemEngine());
  }
  function changed() {
    revision.current++;
    setSaved("Unsaved changes");
  }
  function change(next: PlayAlongMix) {
    changed();
    setMix(next);
  }
  function updateStem(id: string, values: Partial<StemSetting>) {
    change({
      ...mix,
      stems: mix.stems.map((s) => (s.id === id ? { ...s, ...values } : s)),
    });
  }
  useEffect(() => {
    mounted.current = true;
    try {
      if (!requested) {
        const local = JSON.parse(localStorage.getItem(key) ?? "null");
        if (local?.mix) {
          const p = local.mix;
          if (validPlayAlong(p)) {
            setMix(p);
            setTitle(local.title ?? "Ode to Joy — my session");
            setId(local.id ?? null);
            setStatus(local.status ?? "DRAFT");
            setReflection(local.reflection ?? "");
            setSaved("Draft restored on this device");
          }
        }
      }
    } catch {}
    setReady(true);
    return () => {
      mounted.current = false;
      engine.current?.dispose();
      keys.current?.dispose();
      engine.current = null;
      keys.current = null;
    };
  }, [key]);
  useEffect(() => {
    if (!requested) return;
    let live = true;
    setReady(false);
    api
      .get<Saved>(`/music-production/projects/${encodeURIComponent(requested)}`)
      .then((r) => {
        if (!live) return;
        const p = r.data;
        if (
          !p.tracks_json.play_along ||
          !validMix(p.tracks_json, p.time_signature)
        )
          throw Error("Not a play-along session");
        engine.current?.stop();
        setMix(p.tracks_json.play_along);
        setTitle(p.title);
        setId(p.id);
        setStatus(p.status);
        setReflection(p.tracks_json.reflection);
        setFeedback(p);
        setSaved("Loaded from your account");
      })
      .catch(
        () =>
          live &&
          setError(
            "This session could not be opened. Check your project list.",
          ),
      )
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [requested]);
  useEffect(() => {
    if (!ready) return;
    engine.current?.update(mix);
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ mix, title, id, status, reflection }),
      );
    } catch {}
  }, [ready, mix, title, id, status, reflection, key]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const e = engine.current;
      if (!e) return;
      setPosition(e.position());
      if (!e.playing()) setPlaying(false);
    }, 80);
    return () => clearInterval(timer);
  }, [playing]);
  async function toggle() {
    setError("");
    if (playing) {
      audio().pause();
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      const started = await audio().play(
        mix,
        (n) => mounted.current && setCount(n),
      );
      if (mounted.current && started) setPlaying(true);
    } catch {
      if (mounted.current)
        setError(
          "The recording could not load. Check your connection and try Play again.",
        );
    } finally {
      if (mounted.current) {
        setLoading(false);
        setCount(0);
      }
    }
  }
  function stop() {
    audio().stop();
    setPlaying(false);
    setCount(0);
    setPosition(mix.start_bar * barSeconds);
  }
  function audition(midi: number) {
    setLastNote(midi);
    keys.current ??= new ProductionAudio();
    void keys.current
      .instrument(pitchName(midi), "Piano")
      .catch(() => setError("The piano could not load. Try a key again."));
  }
  const midi = useMidiKeyboard(audition);
  async function persist() {
    if (!draft) throw Error("Library not ready");
    const version = revision.current;
    const r =
      id && status === "DRAFT"
        ? await api.put<Saved>(`/music-production/projects/${id}`, draft)
        : await api.post<Saved>("/music-production/projects", draft);
    if (mounted.current) {
      setId(r.data.id);
      setStatus(r.data.status);
      setFeedback(null);
      setSaved(
        version === revision.current
          ? "Saved to your account"
          : "Unsaved changes",
      );
    }
    return r.data;
  }
  async function save() {
    setBusy("save");
    try {
      await persist();
      setError("");
    } catch {
      setError(
        "This session could not be saved. Keep this tab open and try again.",
      );
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  async function submit() {
    if (
      !confirm("Submit this backing mix and reflection to your Music teacher?")
    )
      return;
    setBusy("submit");
    try {
      const p = await persist(),
        r = await api.post<Saved>(`/music-production/projects/${p.id}/submit`);
      if (mounted.current) {
        setStatus(r.data.status);
        setSaved("Submitted to your Music teacher");
      }
    } catch {
      setError("Submission did not finish. Your session can still be saved.");
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  async function exportMix() {
    if (!draft) return;
    stop();
    setBusy("export");
    setError("");
    try {
      const blob = await mp3Blob(draft),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9 -]/gi, "").slice(0, 70) || "Ode to Joy"} - My backing mix.mp3`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Export could not finish. Keep this tab open and try again.");
    } finally {
      if (mounted.current) setBusy("");
    }
  }
  const solo = mix.stems.some((s) => s.solo),
    silent = (s: StemSetting) => s.muted || (solo && !s.solo);
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-28 text-[#101820]">
      <StudioNav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${saved === "Saved to your account" ? "bg-[#748e35]" : "bg-slate-300"}`}
          />
          <input
            aria-label="Session title"
            value={title}
            maxLength={100}
            onChange={(e) => {
              setTitle(e.target.value);
              changed();
            }}
            className="min-w-0 bg-transparent text-sm font-medium outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            role="status"
            className="hidden text-[11px] text-slate-400 sm:inline"
          >
            {saved}
          </span>
          <button onClick={() => setLibrary(true)} className={action}>
            <Library size={15} />
            Library
          </button>
          <button
            disabled={!!busy || !draft || !title.trim()}
            onClick={() => void save()}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#101820] px-4 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy === "save" ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <Save size={15} />
            )}{" "}
            {status === "DRAFT" ? "Save session" : "Save a copy"}
          </button>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {error}
        </p>
      )}
      {feedback?.review_comment && (
        <div className="rounded-xl bg-[#eef3e2] p-4">
          <strong className="text-sm">
            Teacher feedback · {feedback.score}/100
          </strong>
          <p className="mt-2 text-sm text-slate-600">
            {feedback.review_comment}
          </p>
        </div>
      )}
      <section className="relative overflow-hidden rounded-2xl bg-[#101820] p-5 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[38px] border-white/[.035]" />
        <div className="pointer-events-none absolute right-24 top-8 h-36 w-36 rounded-full border border-white/[.08]" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.2em] text-[#becba4]">
              <Headphones size={13} />
              Your play-along session
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ode to Joy
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Beethoven’s theme · an original acoustic arrangement
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px] text-white/70">
              {["100 BPM", "4/4", "4 bars", "5 recorded-sample parts"].map(
                (v) => (
                  <span
                    key={v}
                    className="rounded-full border border-white/15 px-2.5 py-1"
                  >
                    {v}
                  </span>
                ),
              )}
            </div>
          </div>
          <div
            className="relative hidden h-24 w-40 items-center justify-center gap-1.5 sm:flex"
            aria-hidden="true"
          >
            {[
              0.2, 0.45, 0.7, 0.95, 0.6, 0.35, 0.8, 1, 0.55, 0.3, 0.65, 0.85,
              0.4, 0.2, 0.55, 0.7,
            ].map((v, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-[#c4d59d]/70"
                style={{ height: `${v * 80}px`, opacity: playing ? 1 : 0.65 }}
              />
            ))}
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="max-w-lg text-xs leading-5 text-slate-400">
            Mute the melody, then take its place on the piano. Repeat a bar,
            find your balance, and make the arrangement yours.
          </p>
          <button
            onClick={() => updateStem("melody", { muted: !mix.stems[0].muted })}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#dbe6c3] px-4 text-xs font-semibold text-[#263216]"
          >
            <Piano size={15} />
            {mix.stems[0].muted ? "Restore melody" : "I’ll play the melody"}
          </button>
        </div>
      </section>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section
          aria-label="Recorded backing tracks"
          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold">Shape the band</h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Select a part to adjust its position and level.
              </p>
            </div>
            <span className="text-[10px] text-slate-400">
              {clock(position)} / {clock(PLAY_ALONG.duration)}
            </span>
          </div>
          <div className="ml-32 mr-20 flex justify-between px-4 pb-1 pt-3 text-[9px] tabular-nums text-slate-400">
            {[1, 2, 3, 4].map((b) => (
              <span key={b}>BAR {b}</span>
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {PLAY_ALONG.stems.map((def) => {
              const s = mix.stems.find((s) => s.id === def.id)!;
              return (
                <div
                  key={s.id}
                  className={`relative grid min-w-0 grid-cols-[104px_minmax(0,1fr)_66px] items-center gap-2 px-3 py-3 transition sm:grid-cols-[120px_minmax(0,1fr)_72px] sm:px-4 ${selected === s.id ? "bg-[#f6f8f2]" : "hover:bg-slate-50"}`}
                >
                  <button
                    onClick={() => setSelected(s.id)}
                    aria-pressed={selected === s.id}
                    className="flex items-center gap-2 text-left"
                  >
                    <span
                      className="h-7 w-1 shrink-0 rounded-full"
                      style={{ background: colors[s.id] }}
                    />
                    <span className="text-[11px] font-medium sm:text-xs">
                      {def.label}
                      <span className="mt-0.5 block text-[9px] font-normal text-slate-400">
                        Recorded sample
                      </span>
                    </span>
                  </button>
                  <button
                    aria-label={`Seek in ${def.label}`}
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect(),
                        at =
                          ((e.clientX - r.left) / r.width) *
                          PLAY_ALONG.musical_duration;
                      audio().seek(at);
                      setPosition(at);
                    }}
                    className={`relative min-w-0 overflow-hidden rounded-md bg-slate-50 px-1 transition ${silent(s) ? "opacity-30" : ""}`}
                  >
                    <Wave peaks={def.waveform} color={colors[s.id]} />
                    <span
                      className="pointer-events-none absolute inset-y-0 w-px bg-[#526b10]"
                      style={{
                        left: `${Math.min(position / PLAY_ALONG.musical_duration, 1) * 100}%`,
                      }}
                    />
                  </button>
                  <div className="flex gap-1">
                    <button
                      aria-label={`Mute ${s.id} stem`}
                      aria-pressed={s.muted}
                      onClick={() => updateStem(s.id, { muted: !s.muted })}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold ${s.muted ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}
                    >
                      M
                    </button>
                    <button
                      aria-label={`Solo ${s.id} stem`}
                      aria-pressed={s.solo}
                      onClick={() => updateStem(s.id, { solo: !s.solo })}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold ${s.solo ? "bg-[#dfe8cb] text-[#486015]" : "bg-slate-100 text-slate-500"}`}
                    >
                      S
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 px-4 py-3">
            <input
              aria-label="Playback position"
              type="range"
              min={0}
              max={PLAY_ALONG.musical_duration - 0.01}
              step={0.01}
              value={Math.min(position, PLAY_ALONG.musical_duration - 0.01)}
              onChange={(e) => {
                audio().seek(Number(e.target.value));
                setPosition(Number(e.target.value));
              }}
              className="w-full accent-[#637c35]"
            />
          </div>
        </section>
        <section
          aria-label="Selected part controls"
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="mb-5 flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold">{definition.label}</h2>
          </div>
          <label className="block text-xs font-medium">
            Level{" "}
            <span className="float-right text-slate-400">
              {Math.round(stem.volume * 100)}%
            </span>
            <input
              aria-label="Selected stem volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={stem.volume}
              onChange={(e) =>
                updateStem(selected, { volume: Number(e.target.value) })
              }
              className="mt-3 w-full accent-[#637c35]"
            />
          </label>
          <label className="mt-6 block text-xs font-medium">
            Stereo position{" "}
            <span className="float-right text-slate-400">
              {stem.pan === 0
                ? "Centre"
                : `${Math.round(Math.abs(stem.pan) * 100)}% ${stem.pan < 0 ? "L" : "R"}`}
            </span>
            <input
              aria-label="Selected stem pan"
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={stem.pan}
              onChange={(e) =>
                updateStem(selected, { pan: Number(e.target.value) })
              }
              className="mt-3 w-full accent-[#637c35]"
            />
          </label>
          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
            Try placing the piano slightly left and the strings slightly right.
            Leave room in the middle for your melody.
          </div>
          <a
            href="/assets/music/recorded/LICENSE-CC0.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-[10px] text-slate-400 underline"
          >
            Recording credits · VSCO 2 CE · CC0
          </a>
        </section>
      </div>
      <section
        aria-label="Practice piano"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <KeyboardMusic size={17} className="text-slate-500" />
              Take your turn
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Recorded piano · live practice, not recorded into the backing mix
            </p>
          </div>
          <button onClick={() => void midi.connect()} className={action}>
            <Piano size={14} />
            {midi.status}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-8 gap-1 rounded-xl bg-[#101820] p-2">
          {SCALES["C Major"].map((n) => (
            <button
              key={n}
              aria-label={`Practice ${pitchName(n)}`}
              onClick={() => audition(n)}
              className={`relative flex h-24 items-end justify-center rounded-b-lg pb-3 text-[10px] font-medium shadow-inner transition active:bg-[#dfe8c9] ${lastNote === n ? "bg-[#dce8bf] text-[#486015]" : "bg-[#fbfcf9] text-slate-500"}`}
            >
              {pitchName(n)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
          {PLAY_ALONG.chords.map((c, i) => (
            <span
              key={i}
              className={`rounded-lg border px-3 py-1.5 ${Math.floor(position / barSeconds) === i && playing ? "border-[#b3c58f] bg-[#f1f5e8] text-[#526b10]" : "border-slate-100"}`}
            >
              {c}
            </span>
          ))}
          <span className="ml-auto self-center">
            C major · keep a steady pulse
          </span>
        </div>
      </section>
      {draft && (
        <details className="rounded-2xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-medium">
            Follow the melody
            <ChevronDown size={15} className="text-slate-400" />
          </summary>
          <MusicNotation
            notation_json={scoreFor(draft, song)}
            timeSignature="4/4"
            bpm={100}
            currentMeasure={
              playing ? Math.min(3, Math.floor(position / barSeconds)) : -1
            }
          />
        </details>
      )}
      <details className="rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-medium">
          Reflect & share with your teacher
          <ChevronDown size={15} className="text-slate-400" />
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <textarea
            aria-label="Play along reflection"
            maxLength={2000}
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value);
              changed();
            }}
            placeholder="What did you change in the mix? What did you practise?"
            className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
          <button
            onClick={() => void submit()}
            disabled={!!busy || !draft}
            className={action}
          >
            <Send size={14} />
            Submit backing mix
          </button>
          <p className="text-[10px] text-slate-400">
            Your teacher receives the saved mix settings and reflection. Live
            playing is not captured.
          </p>
        </div>
      </details>
      <div className="fixed bottom-3 left-3 right-3 z-20 rounded-2xl border border-white/10 bg-[#101820]/95 px-4 py-3 text-white shadow-xl backdrop-blur md:left-[calc(15rem+1rem)] md:right-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              aria-label={playing ? "Pause backing" : "Play backing"}
              disabled={loading || !ready}
              onClick={() => void toggle()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dce8bf] text-[#283416] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={19} className="animate-spin" />
              ) : playing ? (
                <Pause size={19} />
              ) : (
                <Play size={19} />
              )}
            </button>
            <button
              aria-label="Stop backing"
              onClick={stop}
              className="p-2 text-white/60"
            >
              <Square size={16} />
            </button>
            <div className="text-[11px]">
              <span className="font-medium">
                {count
                  ? `Count in · ${count}`
                  : loading
                    ? "Loading recordings…"
                    : playing
                      ? "Playing"
                      : "Ready when you are"}
              </span>
              <span className="mt-1 block text-[10px] text-white/40">
                100 BPM · 4/4
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Repeat practice bars"
              aria-pressed={mix.loop}
              onClick={() => change({ ...mix, loop: !mix.loop })}
              className={`rounded-lg p-2 ${mix.loop ? "bg-white/15 text-[#dce8bf]" : "text-white/40"}`}
            >
              <Repeat2 size={17} />
            </button>
            <label className="flex items-center gap-1.5 text-[10px] text-white/60">
              <input
                aria-label="Count in"
                type="checkbox"
                checked={mix.count_in}
                onChange={(e) => change({ ...mix, count_in: e.target.checked })}
                className="accent-[#b9cd8e]"
              />
              Count in
            </label>
            <button
              disabled={!!busy || !draft}
              onClick={() => void exportMix()}
              className="ml-1 flex min-h-9 items-center gap-2 rounded-xl border border-white/15 px-3 text-[11px] text-white/80 disabled:opacity-50"
            >
              {busy === "export" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span className="hidden sm:inline">Export backing MP3</span>
              <span className="sm:hidden">MP3</span>
            </button>
          </div>
        </div>
        {mix.loop && (
          <div className="mx-auto mt-2 flex max-w-7xl items-center gap-2 border-t border-white/10 pt-2 text-[10px] text-white/50">
            Repeat bars
            <select
              aria-label="Loop first bar"
              value={mix.start_bar}
              onChange={(e) => {
                const start = Number(e.target.value);
                change({
                  ...mix,
                  start_bar: start,
                  end_bar: Math.max(mix.end_bar, start + 1),
                });
              }}
              className="rounded bg-[#26323b] p-1 text-white"
            >
              {[0, 1, 2, 3].map((b) => (
                <option key={b} value={b}>
                  {b + 1}
                </option>
              ))}
            </select>
            to
            <select
              aria-label="Loop last bar"
              value={mix.end_bar}
              onChange={(e) =>
                change({ ...mix, end_bar: Number(e.target.value) })
              }
              className="rounded bg-[#26323b] p-1 text-white"
            >
              {[1, 2, 3, 4]
                .filter((b) => b > mix.start_bar)
                .map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
            </select>
            <span className="ml-auto">
              The export contains the full four-bar backing mix.
            </span>
          </div>
        )}
      </div>
      {library && (
        <StudioLibrary
          songs={songs.data ?? []}
          onClose={() => setLibrary(false)}
        />
      )}
      {songs.isError && (
        <p role="alert" className="text-sm text-amber-800">
          Your library could not load.{" "}
          <button className="underline" onClick={() => void songs.refetch()}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
