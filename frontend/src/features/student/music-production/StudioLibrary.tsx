import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Music2, Play, ExternalLink, X, Sparkles } from "lucide-react";
import type { StudioSong } from "./score";
export function StudioLibrary({
  songs,
  onClose,
  onChoose,
}: {
  songs: StudioSong[];
  onClose: () => void;
  onChoose?: (song: StudioSong) => void;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const panel = useRef<HTMLElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close.current();
        return;
      }
      if (e.key !== "Tab") return;
      const elements = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button,a[href],input,select",
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));
      const first = elements[0],
        last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const list = songs
    .filter(
      (s) =>
        normalize(s.title + " " + s.artist).includes(normalize(search)) &&
        (filter === "all" ||
          (filter === "playable"
            ? s.content_kind !== "LISTENING_REFERENCE"
            : s.content_kind === "LISTENING_REFERENCE")),
    )
    .sort(
      (a, b) =>
        Number(b.slug === "ode-to-joy-theme") -
          Number(a.slug === "ode-to-joy-theme") ||
        Number(b.content_kind === "PUBLIC_DOMAIN_STUDY") -
          Number(a.content_kind === "PUBLIC_DOMAIN_STUDY"),
    );
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[#101820]/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Studio library"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col bg-[#f8fafb] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold">Find your next piece</h2>
            <p className="mt-1 text-xs text-slate-500">
              Practice tracks, originals & listening references
            </p>
          </div>
          <button
            aria-label="Close library"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>
        <div className="space-y-3 p-4">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search size={16} className="text-slate-400" />
            <input
              autoFocus
              aria-label="Search studio library"
              placeholder="Song, style or artist"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="flex gap-1">
            {[
              ["all", "All pieces"],
              ["playable", "Create & play"],
              ["references", "Listening"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={`rounded-lg px-3 py-2 text-xs ${filter === id ? "bg-[#101820] text-white" : "bg-white text-slate-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
          {list.map((s) => (
            <article
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.slug === "ode-to-joy-theme" ? "bg-[#e9f0d9] text-[#526b10]" : "bg-slate-100 text-slate-500"}`}
                >
                  <Music2 size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    {s.genre} · {s.artist}
                  </p>
                </div>
              </div>
              {s.content_kind === "LISTENING_REFERENCE" ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    Reference · no recording supplied
                  </span>
                  <a
                    href={s.reference_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-600 underline"
                  >
                    Listen
                    <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#526b10]">
                    {s.slug === "ode-to-joy-theme" ? (
                      <>
                        <HeadphoneMark />
                        Recorded backing
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} />
                        Editable study
                      </>
                    )}
                  </span>
                  {onChoose ? (
                    <button
                      onClick={() => {
                        onChoose(s);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#101820] px-3 py-2 text-xs text-white"
                    >
                      <Play size={11} />
                      Open
                    </button>
                  ) : (
                    <Link
                      onClick={onClose}
                      to={
                        s.slug === "ode-to-joy-theme"
                          ? "/student/labs/music"
                          : `/student/labs/music/composition?song=${s.id}`
                      }
                      className="rounded-lg bg-[#101820] px-3 py-2 text-xs text-white"
                    >
                      {s.slug === "ode-to-joy-theme" ? "Play along" : "Compose"}
                    </Link>
                  )}
                </div>
              )}
            </article>
          ))}
          {!list.length && (
            <p className="p-8 text-center text-sm text-slate-500">
              No matches. Try another title or artist.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
function HeadphoneMark() {
  return <span aria-hidden="true">●</span>;
}
