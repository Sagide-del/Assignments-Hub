import { Link, useLocation } from "react-router-dom";
import {
  Headphones,
  SlidersHorizontal,
  FolderOpen,
  Music2,
  ArrowUpRight,
} from "lucide-react";
export function StudioNav({
  title = "Music Studio",
  subtitle = "Listen closely. Make it yours.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { pathname } = useLocation();
  const play = pathname.endsWith("/music") || pathname.endsWith("/play-along");
  return (
    <div className="space-y-4">
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
        <Link
          to="/student/labs/music/loops"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          Loop studio
          <ArrowUpRight size={13} />
        </Link>
      </header>
      <nav
        aria-label="Studio workspace"
        className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm"
      >
        {[
          {
            to: "/student/labs/music",
            label: "Play along",
            Icon: Headphones,
            active: play,
          },
          {
            to: "/student/labs/music/composition",
            label: "Compose",
            Icon: SlidersHorizontal,
            active:
              !play &&
              !pathname.endsWith("/projects") &&
              !pathname.endsWith("/loops"),
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
    </div>
  );
}
