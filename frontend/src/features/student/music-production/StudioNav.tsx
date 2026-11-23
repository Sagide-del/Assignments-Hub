import { Link, useLocation } from "react-router-dom";
import {
  Headphones,
  SlidersHorizontal,
  FolderOpen,
  Music2,
  ArrowUpRight,
  Piano,
  Guitar,
  Drum,
} from "lucide-react";
export function StudioNav({
  title = "Music Studio",
  subtitle = "Listen closely. Make it yours.",
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const { pathname } = useLocation();
  const play = pathname.endsWith("/music") || pathname.endsWith("/play-along");
  return (
    <div className={compact ? "space-y-2 compact-studio-nav" : "space-y-4"}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101820] text-[#dce8b7]">
            <Music2 size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#101820]">
              {title}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Link
            to="/student/labs/music/loops"
            className="text-xs text-slate-500"
          >
            Loop studio
          </Link>
          <Link
            to="/student/labs/music/beat-maker"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            Master Beat
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>
      <nav aria-label="Music modules" className="grid grid-cols-3 gap-2">
        {[
          {
            to: "/student/labs/music",
            label: "Music",
            Icon: Music2,
            active:
              !pathname.endsWith("/guitar") && !pathname.endsWith("/drums"),
          },
          {
            to: "/student/labs/music/guitar",
            label: "Guitar",
            Icon: Guitar,
            active: pathname.endsWith("/guitar"),
          },
          {
            to: "/student/labs/music/drums",
            label: "Drums",
            Icon: Drum,
            active: pathname.endsWith("/drums"),
          },
        ].map(({ to, label, Icon, active }) => (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold transition ${active ? "border-[#17352e] bg-[#17352e] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>
      {!pathname.endsWith("/guitar") && !pathname.endsWith("/drums") && (
        <nav
          aria-label="Studio workspace"
          className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm"
        >
          {[
            {
              to: "/student/labs/music/beat-maker",
              label: "Master Beat",
              Icon: SlidersHorizontal,
              active: pathname.endsWith("/beat-maker"),
            },
            {
              to: "/student/labs/music",
              label: "Play along",
              Icon: Headphones,
              active: play,
            },
            {
              to: "/student/labs/music/piano",
              label: "Piano roll",
              Icon: Piano,
              active: pathname.endsWith("/piano"),
            },
            {
              to: "/student/labs/music/composition",
              label: "Compose",
              Icon: SlidersHorizontal,
              active:
                !play &&
                !pathname.endsWith("/piano") &&
                !pathname.endsWith("/projects") &&
                !pathname.endsWith("/loops") &&
                !pathname.endsWith("/beat-maker"),
            },
            {
              to: "/student/labs/music/projects",
              label: "My projects",
              Icon: FolderOpen,
              active: pathname.endsWith("/projects"),
            },
          ].map(({ to, label, Icon, active }) => (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium transition ${active ? "bg-[#101820] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
