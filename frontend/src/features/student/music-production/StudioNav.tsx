import { Link, useLocation } from "react-router-dom";
import {
  SlidersHorizontal,
  Piano,
  Guitar,
  Drum,
  Library,
  FolderOpen,
} from "lucide-react";
export function StudioNav({
  title = "Music Studio",
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const { pathname } = useLocation();
  return (
    <div className={compact ? "space-y-2 compact-studio-nav" : "space-y-2"}>
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-[#17352e]">
          {title}
        </h1>
        <div className="flex gap-3 text-[11px] text-slate-500">
          <Link
            to="/student/labs/music/library"
            className="inline-flex min-h-10 items-center gap-1"
          >
            <Library size={14} />
            Library
          </Link>
          <Link
            to="/student/labs/music/projects"
            className="inline-flex min-h-10 items-center gap-1"
          >
            <FolderOpen size={14} />
            Projects
          </Link>
        </div>
      </header>
      <nav
        aria-label="Music modules"
        className="flex border-b border-slate-200"
      >
        {[
          { path: "beat-maker", name: "Master Beat", Icon: SlidersHorizontal },
          { path: "piano", name: "Piano roll", Icon: Piano },
          { path: "guitar", name: "Guitar", Icon: Guitar },
          { path: "drums", name: "Drums", Icon: Drum },
        ].map(({ path, name, Icon }) => {
          const active =
            pathname.endsWith("/" + path) ||
            (path === "beat-maker" && pathname.endsWith("/music"));
          return (
            <Link
              key={path}
              to={"/student/labs/music/" + path}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 px-1 text-[11px] font-semibold sm:flex-none sm:px-5 sm:text-xs ${active ? "border-[#17352e] text-[#17352e]" : "border-transparent text-slate-500"}`}
            >
              <Icon size={15} />
              {name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
