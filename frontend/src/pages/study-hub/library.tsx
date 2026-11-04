import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  Search,
  X,
} from "lucide-react";
import { api, apiErrorMessage } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";
import { TheoryCheatsheet } from "../../features/student/TheoryCheatsheet";
import { parseConceptMap } from "../../../../backend/src/cms/theory-cheatsheet";
import { filterLibrary, LibraryModule, LibrarySubject } from "./library-model";
function ConceptThumbnail({ module }: { module: LibraryModule }) {
  let map;
  try {
    map = module.concept_diagram
      ? parseConceptMap(module.concept_diagram.latex_code)
      : null;
  } catch {
    map = null;
  }
  if (!map)
    return <BookOpen className="h-9 w-9 text-slate-400" aria-hidden="true" />;
  const points = map.nodes.map(n => ({x:70+n.x*65, y:40+(6-n.y)*60}));
  const left = Math.min(...points.map(p=>p.x))-80, top = Math.min(...points.map(p=>p.y))-42;
  const width = Math.max(...points.map(p=>p.x))-left+80, height = Math.max(...points.map(p=>p.y))-top+42;
  return (
    <svg
      viewBox={`${left} ${top} ${width} ${height}`}
      className="h-28 w-full"
      role="img"
      aria-label={`${module.topic} concept diagram`}
    >
      {map.edges.map((e, i) => {
        const a = map.nodes.find((n) => n.id === e.from)!,
          b = map.nodes.find((n) => n.id === e.to)!;
        return (
          <line
            key={i}
            x1={70 + a.x * 65}
            y1={40 + (6 - a.y) * 60}
            x2={70 + b.x * 65}
            y2={40 + (6 - b.y) * 60}
            stroke="#94a3b8"
            strokeWidth="3"
          />
        );
      })}
      {map.nodes.map((n) => (
        <g key={n.id}>
          <rect
            x={70 + n.x * 65 - 67}
            y={40 + (6 - n.y) * 60 - 28}
            width="134"
            height="56"
            rx="9"
            fill="white"
            stroke="#9cba37"
            strokeWidth="2"
          />
          <text
            x={70 + n.x * 65}
            y={45 + (6 - n.y) * 60}
            textAnchor="middle"
            fontSize="13"
            fill="#334155"
          >
            {n.label.length > 19 ? n.label.slice(0, 17) + "…" : n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
export default function StudentLibrary() {
  const user = useAuthStore((s) => s.user),
    navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selected = params.get("module");
  const [search, setSearch] = useState("");
  const list = useQuery({
    queryKey: ["student-library", user?.id],
    queryFn: () =>
      api
        .get<{ subjects: LibrarySubject[] }>("/library?grouped=true")
        .then((r) => r.data),
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["student-library-module", user?.id, selected],
    enabled: !!selected,
    queryFn: () =>
      api
        .get<LibraryModule & { theory_cheatsheet: unknown }>(
          `/library/modules/${encodeURIComponent(selected!)}`,
        )
        .then((r) => r.data),
    retry: false,
  });
  const start = useMutation({
    mutationFn: (id: string) =>
      api.post<{ id: number }>(`/cms/learning/${id}/start`).then((r) => r.data),
    onSuccess: (a) => navigate(`/student/assignments/${a.id}`),
  });
  const download = useMutation({
    mutationFn: async (id: string) => {
      const r = await api.get(`/library/modules/${id}/cheatsheet.pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Assignment-Hub-Grade-${detail.data?.grade}-cheat-sheet.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
  });
  const subjects = filterLibrary(list.data?.subjects ?? [], search);
  return (
    <div className="min-w-0 space-y-6 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/student/resources"
            className="mb-3 inline-flex items-center gap-2 text-xs text-slate-500"
          >
            <ArrowLeft size={14} />
            My Study Hub
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Learning library
          </h1>
        </div>
        <BookOpen className="text-slate-400" size={25} />
      </header>
      {selected ? (
        <section className="space-y-4">
          <button
            onClick={() => setParams({})}
            className="inline-flex items-center gap-2 text-sm text-slate-600"
          >
            <X size={16} />
            Close topic
          </button>
          {detail.isPending ? (
            <p role="status">Loading topic…</p>
          ) : detail.isError ? (
            <p role="alert">
              {apiErrorMessage(detail.error, "This topic is unavailable.")}
            </p>
          ) : detail.data ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-slate-500">
                  {detail.data.subject} · Grade {detail.data.grade} · Batch{" "}
                  {detail.data.batch_number}
                </span>
                <div className="flex flex-wrap gap-2">
                  {detail.data.theory_cheatsheet ? (
                    <button
                      disabled={download.isPending}
                      onClick={() => download.mutate(selected)}
                      className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50"
                    >
                      <Download size={16} />
                      {download.isPending
                        ? "Preparing PDF…"
                        : "Download Cheat Sheet PDF"}
                    </button>
                  ) : null}
                  {detail.data.question_count > 0 &&
                  detail.data.content_type === "ASSIGNMENT" ? (
                    <button
                      disabled={start.isPending}
                      onClick={() => start.mutate(selected)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#101820] px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      Practise · {detail.data.question_count} questions
                      <ArrowRight size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
              {detail.data.theory_cheatsheet ? (
                <TheoryCheatsheet
                  value={detail.data.theory_cheatsheet}
                  title={detail.data.topic}
                />
              ) : (
                <div className="rounded-xl border bg-white p-6">
                  <h2 className="font-semibold">{detail.data.topic}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    A cheat sheet hasn’t been published for this topic yet.
                  </p>
                </div>
              )}
            </>
          ) : null}
          {(download.isError || start.isError) && (
            <p role="alert" className="text-sm text-amber-900">
              {apiErrorMessage(
                download.error || start.error,
                "Please try again.",
              )}
            </p>
          )}
        </section>
      ) : (
        <>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input
              aria-label="Search subjects or topics"
              placeholder="Search subjects or topics"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          {list.isPending ? (
            <p role="status">Loading library…</p>
          ) : list.isError ? (
            <p role="alert">
              {apiErrorMessage(list.error, "Your library could not load.")}
            </p>
          ) : !subjects.length ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <BookOpen className="mx-auto mb-3 text-slate-400" />
              <h2 className="font-semibold">
                {search
                  ? "No matching topics"
                  : "Your library is ready for new content"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try another subject or topic."
                  : "Your teacher hasn’t published content for this yet. Check back soon."}
              </p>
            </div>
          ) : (
            subjects.map((s) => (
              <section key={s.subject} className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {s.subject}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {s.topics.map((t) => (
                    <article
                      key={t.topic}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <button
                        onClick={() => setParams({ module: t.modules[0].id })}
                        className="block w-full text-left"
                      >
                        <div className="flex h-32 items-center justify-center bg-slate-50 px-5">
                          <ConceptThumbnail
                            module={
                              t.modules.find((m) => m.has_cheatsheet) ??
                              t.modules[0]
                            }
                          />
                        </div>
                        <div className="p-5">
                          <h3 className="font-semibold text-slate-900">
                            {t.topic}
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                            {t.modules.some((m) => m.has_cheatsheet) && (
                              <span className="rounded bg-[#f2f5e9] px-2 py-1">
                                Cheat Sheet
                              </span>
                            )}
                            <span className="rounded bg-slate-100 px-2 py-1">
                              {t.modules.reduce(
                                (n, m) => n + m.question_count,
                                0,
                              )}{" "}
                              Questions
                            </span>
                            {t.modules.some((m) => m.has_lab) && (
                              <span className="rounded bg-slate-100 px-2 py-1">
                                3D Lab
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
                        {t.modules.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setParams({ module: m.id })}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                          >
                            <FileText size={12} />
                            Batch {m.batch_number}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
