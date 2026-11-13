import { useEffect, useMemo, useRef, useState } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Dot,
  Accidental,
} from "vexflow";
export interface ScorePart {
  name: string;
  clef: string;
  measures: { keys: string[]; duration: string }[][];
}
export interface NotationJson {
  parts: ScorePart[];
}
export default function MusicNotation({
  notation_json,
  timeSignature,
  bpm,
  musicKey = "C",
  currentMeasure = -1,
}: {
  notation_json: NotationJson;
  timeSignature: string;
  bpm: number;
  musicKey?: string;
  currentMeasure?: number;
}) {
  const root = useRef<HTMLDivElement>(null),
    [partSet, setPartSet] = useState("voices"),
    [error, setError] = useState("");
  const parts = useMemo(
    () =>
      notation_json.parts.filter((p) =>
        partSet === "all" || partSet === "voices"
          ? ["Soprano", "Alto", "Tenor", "Bass", "Melody"].includes(p.name) ||
            partSet === "all"
          : p.name === partSet,
      ),
    [notation_json, partSet],
  );
  useEffect(() => {
    if (!root.current) return;
    const el = root.current;
    el.replaceChildren();
    setError("");
    try {
      const visible = parts.slice(0, 9);
      if (!visible.length) return;
      const width = 1020,
        height = visible.length * 112 + 16,
        renderer = new Renderer(el, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();
      const svg = el.querySelector("svg")!;
      svg.setAttribute("role", "img");
      svg.setAttribute(
        "aria-label",
        `${timeSignature} score with ${visible.map((p) => p.name).join(", ")}`,
      );
      for (let b = 0; b < 4; b++) {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        );
        rect.setAttribute("x", String(110 + b * 225));
        rect.setAttribute("y", "0");
        rect.setAttribute("width", "225");
        rect.setAttribute("height", String(height));
        rect.setAttribute("fill", "transparent");
        rect.dataset.barIndex = String(b);
        svg.insertBefore(rect, svg.firstChild);
      }
      const [num, den] = timeSignature.split("/").map(Number);
      for (let row = 0; row < visible.length; row++) {
        const part = visible[row];
        ctx.save();
        ctx.setFont("Arial", 11);
        ctx.fillText(part.name, 3, row * 112 + 54);
        ctx.restore();
        for (let bar = 0; bar < 4; bar++) {
          const stave = new Stave(110 + bar * 225, row * 112, 225);
          if (bar === 0) {
            stave.addClef(
              part.clef === "percussion"
                ? "percussion"
                : part.clef === "bass"
                  ? "bass"
                  : "treble",
            );
            if (part.clef !== "percussion")
              stave.addKeySignature(
                ["C", "G", "D", "A", "E", "F", "Am"].includes(musicKey)
                  ? musicKey
                  : "C",
              );
            stave.addTimeSignature(timeSignature);
          }
          stave.setContext(ctx).draw();
          const notes = (part.measures[bar] ?? []).map((n) => {
            const rest = n.duration.endsWith("r"),
              keys = n.keys.map((k) => {
                const m = k.match(/^([A-G])([#b]?)([2-6])$/);
                return m ? `${m[1].toLowerCase()}${m[2]}/${m[3]}` : "c/4";
              });
            const note = new StaveNote({
              clef: part.clef === "bass" ? "bass" : "treble",
              keys: keys.length ? keys : ["b/4"],
              duration: n.duration,
            });
            if (n.duration.includes("d"))
              Dot.buildAndAttach([note], { all: true });
            if (!rest)
              n.keys.forEach((k, i) => {
                const a = k.match(/^[A-G]([#b])/);
                if (a) note.addModifier(new Accidental(a[1]), i);
              });
            return note;
          });
          const voice = new Voice({
            num_beats: num,
            beat_value: den,
          }).addTickables(notes);
          new Formatter()
            .joinVoices([voice])
            .format([voice], bar === 0 ? 155 : 205);
          voice.draw(ctx, stave);
        }
      }
    } catch {
      setError(
        "This score could not be rendered. Your composition is still available in the editor.",
      );
    }
    return () => {
      el.replaceChildren();
    };
  }, [parts, timeSignature, musicKey]);
  useEffect(() => {
    root.current
      ?.querySelectorAll<SVGRectElement>("[data-bar-index]")
      .forEach((r) =>
        r.setAttribute(
          "fill",
          Number(r.dataset.barIndex) === currentMeasure
            ? "#edf3db"
            : "transparent",
        ),
      );
  }, [currentMeasure, parts]);
  return (
    <section
      aria-label="Musical notation"
      className="min-w-0 rounded-xl border border-slate-200 bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <div>
          <h2 className="text-sm font-semibold">Score</h2>
          <p className="mt-1 text-xs text-slate-500">
            {bpm} BPM · {timeSignature} · {musicKey} · 4 bars
          </p>
        </div>
        <label className="text-xs text-slate-500">
          Parts{" "}
          <select
            aria-label="Score parts"
            value={partSet}
            onChange={(e) => setPartSet(e.target.value)}
            className="ml-2 rounded-lg border border-slate-200 p-2"
          >
            <option value="voices">Voices</option>
            <option value="all">Full arrangement</option>
            {notation_json.parts
              .filter(
                (p) =>
                  !["Soprano", "Alto", "Tenor", "Bass", "Melody"].includes(
                    p.name,
                  ),
              )
              .map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="p-4 text-sm text-amber-800">
          {error}
        </p>
      )}
      <div className="max-h-[480px] overflow-auto p-3">
        <div ref={root} className="min-w-[1020px]" />
      </div>
    </section>
  );
}
