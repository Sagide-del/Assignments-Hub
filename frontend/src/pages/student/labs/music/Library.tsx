import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Square, ArrowUpRight } from "lucide-react";
import { StudioNav } from "../../../../features/student/music-production/StudioNav";
import {
  MELODY_STUDIES,
  melodyProject,
} from "../../../../features/student/music-production/repertoire";
import {
  SUPPLIED_RECORDINGS,
  LISTENING_REFERENCES,
  GENRE_STUDIES,
} from "../../../../features/student/music-production/genre-studies";
import { renderRoll } from "../../../../features/student/music-production/piano-roll-audio";
import { useAuthStore } from "../../../../store/auth.store";
import { useEffect } from "react";
export default function MusicLibrary() {
  const user = useAuthStore((s) => s.user),
    nav = useNavigate(),
    [message, setMessage] = useState(""),
    [active, setActive] = useState(""),
    [recording, setRecording] = useState(""),
    ctx = useRef<AudioContext>(),
    source = useRef<AudioBufferSourceNode>(),
    ticket = useRef(0);
  function stop() {
    ticket.current++;
    source.current?.stop();
    source.current = undefined;
    setActive("");
  }
  useEffect(
    () => () => {
      ticket.current++;
      source.current?.stop();
      void ctx.current?.close();
    },
    [],
  );
  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-6">
      <StudioNav title="Music library" compact />
      <p className="text-xs text-slate-500">
        Study melodies you can play, production exercises you can edit, and
        listening references for cultural context.
      </p>
      {message && (
        <p role="status" className="text-xs text-amber-800">
          {message}
        </p>
      )}
      <h2 className="text-sm font-semibold text-[#17352e]">
        Playable repertoire · public-domain melodies
      </h2>
      <div className="divide-y border-y">
        {MELODY_STUDIES.map((s) => (
          <div key={s.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
            <div>
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {s.composer} · {s.bars} bars · {s.bpm} BPM
              </p>
              <p className="mt-1 text-xs">{s.focus}</p>
              <a
                className="mt-1 inline-block text-[11px] underline"
                href={s.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Score reference
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs"
                aria-label={`Preview ${s.title}`}
                onClick={async () => {
                  if (active === s.id) {
                    stop();
                    return;
                  }
                  stop();
                  const t = ticket.current;
                  setActive(s.id);
                  try {
                    ctx.current ??= new AudioContext();
                    await ctx.current.resume();
                    const b = await renderRoll(melodyProject(s));
                    if (t !== ticket.current) return;
                    const sound = ctx.current.createBufferSource();
                    sound.buffer = b;
                    sound.connect(ctx.current.destination);
                    source.current = sound;
                    sound.onended = () => {
                      if (ticket.current === t) setActive("");
                    };
                    sound.start();
                  } catch {
                    setActive("");
                    setMessage("Audio could not load. Please try again.");
                  }
                }}
              >
                {active === s.id ? <Square size={14} /> : <Play size={14} />}
                Listen
              </button>
              <button
                className="min-h-11 rounded-lg bg-[#17352e] px-3 text-xs text-white"
                onClick={() => {
                  try {
                    localStorage.setItem(
                      `ah-master-handoff:${user?.id}:${user?.schoolId}`,
                      JSON.stringify({
                        kind: "piano",
                        payload: melodyProject(s),
                      }),
                    );
                    stop();
                    nav("/student/labs/music/beat-maker");
                  } catch {
                    setMessage("Browser storage unavailable.");
                  }
                }}
              >
                Use in Master Beat
              </button>
            </div>
          </div>
        ))}
      </div>
      <h2 className="pt-3 text-sm font-semibold text-[#17352e]">
        Listen to real performances
      </h2>
      <div className="divide-y border-y">
        {SUPPLIED_RECORDINGS.map((r) => (
          <div key={r.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{r.source}</p>
              </div>
              <button
                className="min-h-11 rounded-lg border px-3 text-xs"
                onClick={() => {
                  stop();
                  setRecording(recording === r.id ? "" : r.id);
                }}
              >
                {recording === r.id ? "Close video" : "Open listening player"}
              </button>
            </div>
            <p className="mt-2 text-xs">{r.task}</p>
            {recording === r.id && (
              <iframe
                title={r.title}
                className="mt-3 aspect-video w-full border-0"
                src={`https://www.youtube-nocookie.com/embed/${r.id}?rel=0`}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>
      <h2 className="pt-3 text-sm font-semibold text-[#17352e]">
        Kenyan & regional listening
      </h2>
      <p className="text-xs text-slate-500">
        External performances for comparison. These links are not playable song
        transcriptions or bundled recordings; specific community repertoire
        needs a sourced score and cultural review.
      </p>
      <div className="divide-y border-y">
        {LISTENING_REFERENCES.map((r) => (
          <a
            key={r.title}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 items-center justify-between gap-4 py-3"
          >
            <span>
              <strong className="text-sm">{r.title}</strong>
              <span className="mt-1 block text-xs text-slate-500">
                {r.focus}
              </span>
            </span>
            <ArrowUpRight size={16} />
          </a>
        ))}
      </div>
      <h2 className="pt-3 text-sm font-semibold text-[#17352e]">
        Production studies
      </h2>
      <div className="divide-y border-y">
        {GENRE_STUDIES.map((s) => (
          <div key={s.name} className="py-3">
            <h3 className="text-sm font-semibold">
              {s.name} · {s.concept}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{s.task}</p>
          </div>
        ))}
      </div>
      <a
        href="https://kicd.ac.ke/cbc-materials/curriculum-designs/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs underline"
      >
        KICD curriculum designs · teaching focus: rhythm, melody, harmony, form,
        texture and listening
      </a>
    </div>
  );
}
