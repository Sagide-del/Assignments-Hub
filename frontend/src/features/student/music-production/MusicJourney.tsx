import {
  AudioLines,
  BookOpenCheck,
  Drum,
  Guitar,
  Headphones,
  Layers3,
  Music2,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export const MUSIC_ACTIVITY_IDS = [
  "rhythm",
  "melody",
  "instrument",
  "composition",
  "production",
] as const;

type MusicActivityId = (typeof MUSIC_ACTIVITY_IDS)[number];

const JOURNEY: Record<
  MusicActivityId,
  {
    title: string;
    eyebrow: string;
    objective: string;
    evidence: string;
    Icon: typeof Drum;
  }
> = {
  rhythm: {
    title: "Find the pulse",
    eyebrow: "Rhythm and culture",
    objective: "Build a steady timeline, then hear where an answering rhythm belongs.",
    evidence: "One edited percussion pattern",
    Icon: Drum,
  },
  melody: {
    title: "Shape a melody",
    eyebrow: "Melody and scales",
    objective: "Write a four-bar phrase with a clear beginning, middle and ending.",
    evidence: "A four-bar melody",
    Icon: Music2,
  },
  instrument: {
    title: "Choose your sound",
    eyebrow: "Instrument practice",
    objective: "Compare timbre, then select a sound that supports the musical idea.",
    evidence: "One deliberate sound choice",
    Icon: Guitar,
  },
  composition: {
    title: "Arrange the idea",
    eyebrow: "Composition",
    objective: "Layer rhythm and melody so each part has space in the mix.",
    evidence: "A balanced six-track arrangement",
    Icon: Layers3,
  },
  production: {
    title: "Finish and reflect",
    eyebrow: "Production",
    objective: "Listen critically, export your work, then explain one choice you made.",
    evidence: "A mix, reflection and optional submission",
    Icon: Headphones,
  },
};

export function MusicJourney({
  active,
  completed,
}: {
  active: MusicActivityId;
  completed: string[];
}) {
  const current = JOURNEY[active];
  const CurrentIcon = current.Icon;
  const completeCount = MUSIC_ACTIVITY_IDS.filter((id) => completed.includes(id)).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce6c5] bg-white shadow-[0_14px_36px_rgba(16,24,32,0.07)]">
      <div className="grid gap-6 bg-[#101820] px-5 py-6 text-white md:grid-cols-[minmax(0,1fr)_auto] md:px-7">
        <div className="flex gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#b7ec0b] text-[#101820] shadow-[0_8px_18px_rgba(183,236,11,0.22)]">
            <CurrentIcon size={24} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d9f58d]">
              Studio journey · {completeCount} of {MUSIC_ACTIVITY_IDS.length} steps explored
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">{current.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{current.objective}</p>
          </div>
        </div>
        <div className="self-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Evidence</p>
          <p className="mt-1 font-medium text-white">{current.evidence}</p>
        </div>
      </div>

      <div className="grid divide-y divide-slate-100 md:grid-cols-5 md:divide-x md:divide-y-0">
        {MUSIC_ACTIVITY_IDS.map((id, index) => {
          const item = JOURNEY[id];
          const Icon = item.Icon;
          const isActive = active === id;
          const isComplete = completed.includes(id);
          return (
            <Link
              key={id}
              to={`/student/labs/music/${id}`}
              aria-current={isActive ? "step" : undefined}
              className={`group min-w-0 px-4 py-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#617c17] ${isActive ? "bg-[#f4f8e9]" : "bg-white hover:bg-slate-50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${isComplete ? "bg-[#b7ec0b] text-[#101820]" : isActive ? "bg-[#101820] text-white" : "bg-slate-100 text-slate-500"}`}>
                  {isComplete ? <BookOpenCheck size={15} /> : index + 1}
                </span>
                <Icon size={16} className={isActive ? "text-[#617c17]" : "text-slate-400"} />
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">{item.eyebrow}</p>
              <p className={`mt-1 text-sm font-semibold ${isActive ? "text-[#101820]" : "text-slate-700"}`}>{item.title}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function AudioProvenance() {
  return (
    <details className="rounded-xl border border-slate-200 bg-[#fbfcf8] text-sm text-slate-600">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 font-medium text-[#101820]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e9f0d9] text-[#526b10]">
          <AudioLines size={16} />
        </span>
        Audio library and cultural care
        <Sparkles size={15} className="ml-auto text-[#617c17]" />
      </summary>
      <div className="border-t border-slate-200 px-4 py-4 text-xs leading-6">
        <p>
          This studio includes 76 bundled CC0/original audio assets. Recorded piano, marimba and percussion samples are cleared for learning and export; the studio never claims they are field recordings of Kenyan instruments.
        </p>
        <p className="mt-2">
          Nyatiti, Isukuti and other cultural references are learning context, not substitutes for local practitioners. Listen, credit and learn from artists in your community whenever possible.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a className="font-semibold text-[#526b10] underline underline-offset-4" href="/assets/music/recorded/samples.json" target="_blank" rel="noreferrer">View sample credits</a>
          <a className="font-semibold text-[#526b10] underline underline-offset-4" href="/assets/music/recorded/LICENSE-CC0.txt" target="_blank" rel="noreferrer">Read CC0 licence</a>
        </div>
      </div>
    </details>
  );
}
