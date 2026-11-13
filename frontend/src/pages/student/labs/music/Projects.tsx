import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, ArrowUpRight, Headphones, Music2 } from "lucide-react";
import { api } from "../../../../api/axios";
import { useAuthStore } from "../../../../store/auth.store";
import { StudioNav } from "../../../../features/student/music-production/StudioNav";
interface Project {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  tracks_json?: { play_along?: unknown };
}
export default function Projects() {
  const user = useAuthStore((s) => s.user),
    [filter, setFilter] = useState("all");
  const projects = useQuery({
    queryKey: ["studio-project-hub", user?.id, user?.schoolId],
    queryFn: async () => {
      const [production, loops] = await Promise.all([
        api.get<Project[]>("/music-production/projects"),
        api.get<Project[]>("/student/music-studio/projects"),
      ]);
      return [
        ...production.data.map((p) => ({
          ...p,
          kind: p.tracks_json?.play_along ? "play" : "compose",
        })),
        ...loops.data.map((p) => ({ ...p, kind: "loops" })),
      ].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    },
  });
  const list =
    projects.data?.filter((p) => filter === "all" || p.kind === filter) ?? [];
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <StudioNav subtitle="Your ideas, sessions and finished work." />
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            My projects{" "}
            <span className="ml-2 text-sm font-normal text-slate-400">
              {projects.data?.length ?? 0}
            </span>
          </h2>
          <div className="flex flex-wrap gap-1">
            {[
              ["all", "All"],
              ["play", "Play along"],
              ["compose", "Compositions"],
              ["loops", "Loops"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={`rounded-lg px-3 py-2 text-xs ${filter === id ? "bg-[#101820] text-white" : "text-slate-500 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {projects.isLoading ? (
          <p role="status" className="py-10 text-sm text-slate-500">
            Loading your projects…
          </p>
        ) : projects.isError ? (
          <p role="alert" className="py-10 text-sm">
            Projects could not load.{" "}
            <button
              onClick={() => void projects.refetch()}
              className="underline"
            >
              Try again
            </button>
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => (
              <Link
                key={`${p.kind}-${p.id}`}
                to={
                  p.kind === "loops"
                    ? "/student/labs/music/loops"
                    : `/student/labs/music${p.kind === "play" ? "" : "/composition"}?project=${encodeURIComponent(p.id)}`
                }
                className="group rounded-xl border border-slate-200 p-4 transition hover:border-[#a7b587] hover:bg-[#f9fbf5]"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-xl bg-[#f0f4e6] p-3 text-[#526b10]">
                    {p.kind === "play" ? (
                      <Headphones size={19} />
                    ) : (
                      <Music2 size={19} />
                    )}
                  </span>
                  <ArrowUpRight size={16} className="text-slate-400" />
                </div>
                <h3 className="truncate text-sm font-semibold">{p.title}</h3>
                <p className="mt-2 text-xs text-slate-500">
                  {p.kind === "play"
                    ? "Play-along session"
                    : p.kind === "loops"
                      ? "Loop studio project"
                      : "Composition"}{" "}
                  · {new Date(p.updated_at).toLocaleDateString()}
                </p>
                <span className="mt-4 inline-block rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
                  {p.status ?? "DRAFT"}
                </span>
                {p.kind === "loops" && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    Choose this saved project in Loop studio.
                  </p>
                )}
              </Link>
            ))}
            {!list.length && (
              <div className="col-span-full py-12 text-center">
                <FolderOpen className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500">
                  Your saved work will appear here.
                </p>
                <Link
                  to="/student/labs/music"
                  className="mt-3 inline-block text-xs underline"
                >
                  Start a session
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
