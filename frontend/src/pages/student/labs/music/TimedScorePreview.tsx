import { useEffect, useRef, useState } from "react";
import { Play, Square, Download } from "lucide-react";
import { howLongPreview as score } from "../../../../features/student/music-production/how-long-preview";
import {
  renderTimedPianoExcerpt,
  pianoWav,
} from "../../../../features/student/music-production/piano-song-audio";
export default function TimedScorePreview() {
  const [busy, setBusy] = useState(false),
    [playing, setPlaying] = useState(false),
    [message, setMessage] = useState("");
  const ctx = useRef<AudioContext | null>(null),
    source = useRef<AudioBufferSourceNode | null>(null),
    ticket = useRef(0),
    alive = useRef(true);
  function stop() {
    ticket.current++;
    source.current?.stop();
    source.current = null;
    setPlaying(false);
    setBusy(false);
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ticket.current++;
      source.current?.stop();
      void ctx.current?.close().catch(() => {});
    };
  }, []);
  async function run(exporting: boolean) {
    stop();
    const id = ticket.current;
    setBusy(true);
    setMessage("");
    try {
      if (!exporting) {
        ctx.current ??= new AudioContext();
        await ctx.current.resume();
      }
      const b = await renderTimedPianoExcerpt(score);
      if (!alive.current || id !== ticket.current) return;
      if (exporting) {
        const url = URL.createObjectURL(
            new Blob([pianoWav(b)], { type: "audio/wav" }),
          ),
          a = document.createElement("a");
        a.href = url;
        a.download = "how-long-will-i-love-you-opening-study.wav";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else {
        const s = ctx.current!.createBufferSource();
        s.buffer = b;
        s.connect(ctx.current!.destination);
        source.current = s;
        s.start();
        setPlaying(true);
        s.onended = () => {
          if (alive.current && id === ticket.current) {
            source.current = null;
            setPlaying(false);
          }
        };
      }
    } catch {
      if (alive.current && id === ticket.current)
        setMessage(
          "Audio could not load. Check your connection and try again.",
        );
    } finally {
      if (alive.current && id === ticket.current) setBusy(false);
    }
  }
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#17352e]">
            Opening two bars · 60 BPM · 4/4
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Melody transcribed from your uploaded sample. The soft pad uses
            simplified C → G → F → C chords. This is an excerpt, not the
            complete song or the full written piano accompaniment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => (playing ? stop() : void run(false))}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17352e] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {playing ? <Square size={16} /> : <Play size={16} />}{" "}
            {busy
              ? "Preparing excerpt…"
              : playing
                ? "Stop excerpt"
                : "Play opening excerpt"}
          </button>
          <button
            disabled={busy}
            onClick={() => void run(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm"
          >
            <Download size={16} />
            Download excerpt WAV
          </button>
        </div>
      </div>
      {message && (
        <p role="status" className="text-sm text-amber-800">
          {message}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl bg-[#111e1b] p-4">
        <div className="min-w-[680px] text-xs text-white/70">
          <div className="mb-2 grid grid-cols-8 gap-px pl-16">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i}>
                {Math.floor(i / 4) + 1}.{(i % 4) + 1}
              </span>
            ))}
          </div>
          {(["G4", "F4", "E4", "D4", "C4"] as const).map((note) => (
            <div key={note} className="flex items-center gap-3">
              <span className="w-12 shrink-0">{note}</span>
              <div
                className="relative h-10 flex-1 border-b border-[#34473b] bg-[#203029]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right,#43584c 1px,transparent 1px)",
                  backgroundSize: "12.5% 100%",
                }}
              >
                {score.melody
                  .filter((e) => e.notes.includes(note))
                  .map((e) => (
                    <span
                      key={e.beat}
                      data-score-note={note}
                      data-beat={e.beat}
                      data-duration={e.duration}
                      className="absolute inset-y-1 flex items-center rounded-sm bg-[#c5f235] px-1 text-[10px] font-semibold text-[#17352e]"
                      style={{
                        left: `${(e.beat / 8) * 100}%`,
                        width: `${(e.duration / 8) * 100}%`,
                      }}
                    >
                      {note}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        The blank space before the first note and after the last is intentional:
        these are rests. Note lengths retain the dotted and sustained values in
        the opening melody.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold text-[#17352e]">
            Melody timing · beats measured from the start
          </caption>
          <thead>
            <tr className="border-b text-slate-500">
              <th className="p-2">Pitch</th>
              <th className="p-2">Start beat</th>
              <th className="p-2">Length (beats)</th>
            </tr>
          </thead>
          <tbody>
            {score.melody.map((e) => (
              <tr key={e.beat} className="border-b border-slate-100">
                <td className="p-2">{e.notes.join(" + ")}</td>
                <td className="p-2">{e.beat}</td>
                <td className="p-2">{e.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        The PDF contains a sample page. The remainder of the song has not been
        reconstructed or invented.
      </p>
    </section>
  );
}
