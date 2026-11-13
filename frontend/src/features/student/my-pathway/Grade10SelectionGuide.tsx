import { KjseaResultsEditor } from "./KjseaResultsEditor";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Check,
  Compass,
  ArrowRight,
  Target,
  ExternalLink,
} from "lucide-react";
import { api, apiErrorMessage } from "../../../api/axios";
import { useAuthStore } from "../../../store/auth.store";
import { PageHeader, EmptyState } from "../../../components/ui/Saas";
type Track = {
  preparation?: {
    average: number | null;
    indicators?: { performance_level?: string | null }[];
  };
  id: number;
  name: string;
  pathway: string;
  description: string;
  careers: string[];
};
type Combination = {
  id: string;
  code: string;
  subjects: string[];
  pathway: string;
  track: string;
  source_url: string;
  verified_at: string;
  is_verified?: boolean;
  why_it_matches?: string;
  careers: string[];
  preparation: {
    average: number | null;
    indicators: {
      area: string;
      subject: string;
      percentage: number | null;
      performance_level?: string | null;
      gap: number | null;
    }[];
  };
};
type Guide = {
  catalog_count: number;
  catalog: Combination[];
  pathways: Track[];
  target_score: number;
  score_source: string;
  scores: { subject: string; percentage: number }[];
  choice: {
    combination_id: string | null;
    track_id: number | null;
    combination: Combination | null;
    track: Track | null;
  } | null;
};
const subjects = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Integrated Science",
  "Pre-Technical Studies",
  "Agriculture and Nutrition",
  "Social Studies",
  "Creative Arts",
];
const label = (area: string) =>
  ({
    integratedscience: "Integrated Science",
    pretechnicalstudies: "Pre-Technical Studies",
    agricultureandnutrition: "Agriculture and Nutrition",
    mathematics: "Mathematics",
  })[area] ?? area;
export function Grade10SelectionGuide() {
  const user = useAuthStore((s) => s.user),
    client = useQueryClient(),
    grade = Number(user?.grade?.match(/\d+/)?.[0]);
  const key = ["grade10-guide", user?.id];
  const query = useQuery({
    queryKey: key,
    queryFn: () =>
      api.post<Guide>("/career/recommend-combinations", {}).then((r) => r.data),
    enabled: grade === 9,
    staleTime: 300000,
  });
  const [marks, setMarks] = useState<Record<string, string>>({}),
    [interests, setInterests] = useState(""),
    [career, setCareer] = useState(""),
    [target, setTarget] = useState("60"),
    [pathway, setPathway] = useState(""),
    [status, setStatus] = useState("");
  const analyze = useMutation({
    mutationFn: () => {
      const scores = Object.entries(marks)
        .filter(([, v]) => v !== "")
        .map(([subject, v]) => ({ subject, percentage: Number(v) }));
      return api
        .post<Guide>("/career/recommend-combinations", {
          ...(scores.length ? { scores } : {}),
          interests: interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 10),
          desired_career: career,
          target_score: Number(target),
        })
        .then((r) => r.data);
    },
    onSuccess: (data) => {
      client.setQueryData(key, data);
      setStatus("Preparation updated.");
    },
    onError: (e) =>
      setStatus(apiErrorMessage(e, "Could not update your guide.")),
  });
  const save = useMutation({
    mutationFn: (body: { combination_id?: string; track_id?: number }) =>
      api.post("/career/selection", body),
    onSuccess: () => {
      setStatus(
        "Saved as a planning preference. Your enrolled subjects are unchanged.",
      );
      void client.invalidateQueries({ queryKey: key });
    },
    onError: (e) =>
      setStatus(apiErrorMessage(e, "Could not save your preference.")),
  });
  if (grade !== 9)
    return <EmptyState title="This selection guide is for Grade 9 learners." />;
  if (query.isPending)
    return <EmptyState title="Preparing your Grade 10 guide…" />;
  if (query.isError)
    return (
      <div>
        <EmptyState title="Your selection guide is temporarily unavailable." />
        <button
          onClick={() => void query.refetch()}
          className="min-h-11 font-semibold"
        >
          Try again
        </button>
      </div>
    );
  const data = query.data,
    options = [
      ...new Set([
        ...data.catalog.map((c) => c.pathway),
        ...data.pathways.map((t) => t.pathway),
      ]),
    ],
    matches = data.catalog
      .filter((c) => !pathway || c.pathway === pathway)
      .slice(0, 3),
    tracks = data.pathways.filter((t) => !pathway || t.pathway === pathway);
  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#101820] px-4 text-sm font-semibold text-white disabled:opacity-50";
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Grade 10 Selection Guide" />
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <Compass className="text-[#607d00]" size={24} />
          <div>
            <h2 className="font-semibold">Explore your next step</h2>
            <p className="mt-1 text-sm text-slate-500">
              Grade 9 preparation · subject interests · a shortlist to discuss
              at school
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium">
          {data.catalog_count} source-reviewed combinations
        </span>
      </section>
      {status && (
        <p role="status" className="rounded-lg bg-[#f1f5e5] px-4 py-3 text-sm">
          {status}
        </p>
      )}
      {data.choice && (
        <div className="flex items-center gap-3 rounded-lg border border-[#d9e7b9] bg-[#f6f8ed] p-4 text-sm">
          <Bookmark size={18} />
          <span>
            Shortlisted:{" "}
            <strong>
              {data.choice.combination?.code ?? data.choice.track?.name}
            </strong>{" "}
            ·{" "}
            {data.choice.combination?.is_verified === false
              ? "previously saved; source entry is no longer published — check with your school"
              : "planning preference"}
          </span>
        </div>
      )}
      <KjseaResultsEditor />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyze.mutate();
        }}
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="font-semibold">Your interests and preparation</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            Interests <span className="text-slate-400">(comma separated)</span>
            <input
              aria-label="Interests"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              maxLength={800}
              placeholder="e.g. aviation, science, design"
              className="block min-h-11 w-full rounded-lg border border-slate-200 px-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            Career you would like to explore
            <input
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              maxLength={120}
              placeholder="e.g. engineer"
              className="block min-h-11 w-full rounded-lg border border-slate-200 px-3"
            />
          </label>
        </div>
        <details className="mt-5 border-t border-slate-100 pt-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Add school or KJSEA percentage results
          </summary>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            Optional. Enter percentages only; performance bands are not
            converted to invented percentages. Otherwise, your latest confirmed
            Learning Coach report is used when available.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {subjects.map((subject) => (
              <label key={subject} className="text-xs text-slate-600">
                {subject}
                <input
                  aria-label={`${subject} percentage`}
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={marks[subject] ?? ""}
                  onChange={(e) =>
                    setMarks({ ...marks, [subject]: e.target.value })
                  }
                  className="mt-1 block min-h-11 w-full rounded-lg border border-slate-200 px-3"
                />
              </label>
            ))}
          </div>
        </details>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <label className="text-xs text-slate-600">
            Personal practice goal (%)
            <input
              type="number"
              min={0}
              max={100}
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 block min-h-11 w-24 rounded-lg border border-slate-200 px-3"
            />
          </label>
          <button className={button} disabled={analyze.isPending}>
            <Target size={16} />
            {analyze.isPending ? "Updating…" : "Update preparation"}
          </button>
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {data.catalog_count
            ? "Combinations to explore"
            : "Explore published pathways"}
        </h2>
        <select
          aria-label="Filter pathway"
          value={pathway}
          onChange={(e) => setPathway(e.target.value)}
          className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All pathways</option>
          {options.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      {data.catalog_count === 0 && (
        <p className="rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-600">
          The official combinations catalogue is awaiting a source-reviewed
          import. You can explore the published pathway guidance below; it is
          not a list of official combination codes.
        </p>
      )}
      {matches.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {matches.map((c) => (
            <article
              key={c.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
            >
              <p className="text-xs font-medium text-slate-500">
                {c.pathway} · {c.track}
              </p>
              <h3 className="mt-3 text-lg font-semibold">{c.code}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {c.subjects.map((s) => (
                  <li key={s} className="flex gap-2">
                    <Check
                      size={15}
                      className="mt-0.5 shrink-0 text-[#607d00]"
                    />
                    {s}
                  </li>
                ))}
              </ul>
              {c.why_it_matches && (
                <p className="mt-4 text-xs leading-6 text-slate-500">
                  {c.why_it_matches}
                </p>
              )}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold">
                  Junior preparation indicators
                </p>
                {c.preparation.indicators.map((i) => (
                  <p key={i.area} className="mt-2 text-xs text-slate-600">
                    {label(i.area)}:{" "}
                    {i.percentage === null
                      ? i.performance_level
                        ? `${i.performance_level} · reported level`
                        : "No result recorded"
                      : `${i.percentage}%${i.gap ? ` · ${Math.round(i.gap * 10) / 10} points to your goal` : " · personal goal met"}`}
                  </p>
                ))}
              </div>
              {c.careers.length > 0 && (
                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Careers to explore: {c.careers.join(", ")}
                </p>
              )}
              <a
                href={c.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#526b00]"
              >
                View source <ExternalLink size={13} />
              </a>
              <button
                onClick={() => save.mutate({ combination_id: c.id })}
                disabled={
                  save.isPending || data.choice?.combination_id === c.id
                }
                className={`${button} mt-auto`}
              >
                {data.choice?.combination_id === c.id ? (
                  <>
                    <Check size={15} />
                    Shortlisted
                  </>
                ) : (
                  <>
                    <Bookmark size={15} />
                    Shortlist combination
                  </>
                )}
              </button>
            </article>
          ))}
        </div>
      ) : data.catalog_count > 0 ? (
        <EmptyState title="No combinations in this pathway are published yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => (
            <article
              key={t.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <p className="text-xs text-slate-500">
                {t.pathway} · exploration
              </p>
              <h3 className="mt-2 font-semibold">{t.name}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {t.description}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-600">
                Junior preparation:{" "}
                {t.preparation?.average == null
                  ? t.preparation?.indicators?.some((i) => i.performance_level)
                    ? "Performance levels recorded; no percentage inferred"
                    : "Results not entered"
                  : `${t.preparation.average}% across available indicators`}
              </p>
              {t.careers.length > 0 && (
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  Possible careers: {t.careers.join(", ")}
                </p>
              )}
              <button
                className={`${button} mt-4`}
                disabled={save.isPending || data.choice?.track_id === t.id}
                onClick={() => save.mutate({ track_id: t.id })}
              >
                {data.choice?.track_id === t.id
                  ? "Shortlisted"
                  : "Shortlist pathway"}
                <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs leading-6 text-slate-500">
        Preparation indicators and your personal practice goal are not official
        entry requirements. Check subject availability and current selection
        rules with your school and the Ministry. A shortlist does not change
        enrolment or submit a placement application.
      </p>
    </div>
  );
}
