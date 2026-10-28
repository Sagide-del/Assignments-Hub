import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Atom,
  Box,
  CheckCircle2,
  CircuitBoard,
  Clock3,
  FlaskConical,
  Leaf,
  Search,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { labsApi, labSessionsApi } from "../../api/labs.api";
import { useAuthStore } from "../../store/auth.store";
import { practicalFor } from "../../../../backend/src/labs/practical-engine";
import { isTitrationKey } from "./stem-workspace/three-d/titration-model";
import type { Lab } from "../../types";
function presentation(lab: Lab) {
  const kind = practicalFor(lab).kind;
  if (["dna", "molecule", "organic", "polymer"].includes(kind))
    return {
      Icon: Atom,
      colour: "text-violet-700 bg-violet-50",
      image: "/stem/molecular-workspace.png",
    };
  if (isTitrationKey(lab.key))
    return {
      Icon: FlaskConical,
      colour: "text-violet-700 bg-violet-50",
      image: "/stem/titration-bench.png",
    };
  if (["cyber", "network", "database", "algorithm"].includes(kind))
    return {
      Icon: kind === "cyber" ? ShieldCheck : CircuitBoard,
      colour: "text-blue-700 bg-blue-50",
      image: "/stem/computing-workspace.png",
    };
  if (["building", "aviation", "lever", "automotive"].includes(kind))
    return {
      Icon: Box,
      colour: "text-amber-800 bg-amber-50",
      image: "/stem/design-workspace.png",
    };
  if (
    ["plant", "hydroponics", "greenhouse", "soil", "ecosystem"].includes(kind)
  )
    return {
      Icon: Leaf,
      colour: "text-emerald-700 bg-emerald-50",
      image: "/stem/life-science-workspace.png",
    };
  if (
    [
      "pendulum",
      "waves",
      "optics",
      "projectile",
      "circuit",
      "magnet",
      "induction",
      "photoelectric",
    ].includes(kind)
  )
    return {
      Icon: Waves,
      colour: "text-indigo-700 bg-indigo-50",
      image: "/stem/physics-workspace.png",
    };
  return {
    Icon: Atom,
    colour: "text-violet-700 bg-violet-50",
    image: "/stem/science-workspace.png",
  };
}
export function StemLabsPage() {
  const user = useAuthStore((s) => s.user),
    [search, setSearch] = useState(""),
    [subject, setSubject] = useState(""),
    [view, setView] = useState("all");
  const {
    data: labs = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["labs", "student-catalogue", user?.id, user?.grade],
    queryFn: () => labsApi.findAll(),
  });
  const { data: sessions = [], isError: sessionsError } = useQuery({
    queryKey: ["lab-sessions", "my-discoveries", user?.id],
    queryFn: () => labSessionsApi.findAll(),
  });
  const complete = new Set(
    sessions.filter((s) => s.completedAt).map((s) => s.labKey),
  );
  const inProgress = (lab: Lab) => {
    try {
      const d = JSON.parse(
        localStorage.getItem(
          isTitrationKey(lab.key)
            ? `titration-3d-v1:${user?.id}:${lab.id}`
            : `stem-workshop-v2:${user?.id}:${lab.id}`,
        ) ?? "null",
      );
      return !!(d?.goggles || d?.trials?.length || d?.events?.length);
    } catch {
      return false;
    }
  };
  const subjects = [...new Set(labs.map((l) => l.subject))].sort();
  const visible = labs.filter(
    (l) =>
      (!subject || l.subject === subject) &&
      `${l.title} ${l.subject} ${l.topic ?? l.topicArea ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()) &&
      (view !== "progress" || inProgress(l)) &&
      (view !== "completed" || complete.has(l.key)),
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6 text-slate-800">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Practical learning workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            STEM Labs
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            Pick up equipment, build a model and test your ideas.
          </p>
        </div>
        <span className="rounded-lg border bg-white px-3 py-2 text-xs text-slate-600">
          {user?.grade} · {labs.length} practicals
        </span>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav
          className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
          aria-label="Lab status"
        >
          {[
            ["all", "All labs"],
            ["progress", "In progress"],
            ["completed", "Completed"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`min-h-10 rounded-md px-4 text-xs font-semibold ${view === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <span className="text-xs text-slate-500">
          {complete.size} completed · Grade-scoped activities
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
        <label className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            aria-label="Search labs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find an experiment or topic"
            className="min-h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-sm"
          />
        </label>
        <select
          aria-label="Lab subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="min-h-11 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {sessionsError && (
        <p role="status" className="text-xs text-amber-800">
          Your completion history is temporarily unavailable. You can still
          enter a lab.
        </p>
      )}
      {isLoading ? (
        <p className="rounded-xl border bg-white p-6 text-sm">
          Preparing your laboratory…
        </p>
      ) : isError ? (
        <div role="alert" className="rounded-xl border bg-white p-6">
          <p className="text-sm">We couldn’t load your grade’s labs.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 min-h-10 text-sm underline"
          >
            Try again
          </button>
        </div>
      ) : !visible.length ? (
        <div className="rounded-xl border bg-white p-7">
          <h2 className="font-semibold">No labs in this view</h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose another subject or clear your search.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSubject("");
              setView("all");
            }}
            className="mt-4 min-h-10 text-sm underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <section
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          aria-label="3D laboratory catalogue"
        >
          {visible.map((lab) => {
            const { Icon, colour, image } = presentation(lab),
              spec = practicalFor(lab);
            return (
              <article
                key={lab.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <Link
                  to={`/student/stem-labs/${lab.id}`}
                  aria-label={`Open ${lab.title}`}
                  className="relative block h-40 overflow-hidden bg-[#e8eef4]"
                >
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-3 left-3 rounded-md border border-white/70 bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-700">
                    3D workspace
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {lab.subject}
                    </span>
                    <span className={`rounded-lg p-2 ${colour}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold leading-6">
                    {lab.title}
                  </h2>
                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    {isTitrationKey(lab.key)
                      ? "Prepare glassware, titrate an unknown sample and calculate its concentration."
                      : spec.goal}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    {lab.durationMinutes && (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {lab.durationMinutes} min
                      </span>
                    )}
                    {complete.has(lab.key) && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/student/stem-labs/${lab.id}`}
                    className="mt-auto inline-flex min-h-11 items-center justify-between gap-2 border-t pt-4 text-xs font-semibold text-slate-900"
                  >
                    {inProgress(lab) ? "Continue practical" : "Enter 3D lab"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
      <p className="text-[11px] leading-6 text-slate-500">
        Virtual practicals support investigation and reflection. Each lab uses
        the grade assigned by your school or the platform; read its brief for
        model assumptions and curriculum context.
      </p>
    </div>
  );
}
