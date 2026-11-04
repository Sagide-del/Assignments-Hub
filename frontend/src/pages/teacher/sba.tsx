import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Save, ClipboardCheck } from "lucide-react";
import { teacherApi } from "../../api/teacher.api";
import { sbaApi } from "../../api/sba.api";
import { apiErrorMessage } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";
import { SbaScore } from "../admin/school/sba";
export default function TeacherSba() {
  const actor = useAuthStore((s) => s.user),
    cache = useQueryClient();
  const classes = useQuery({
    queryKey: ["teaching-classes", actor?.id],
    queryFn: teacherApi.classes,
    retry: false,
  });
  const [selected, setSelected] = useState(""),
    [term, setTerm] = useState("Term 1"),
    [level, setLevel] = useState(11),
    [year, setYear] = useState(new Date().getFullYear());
  const [scores, setScores] = useState<Record<number, string>>({}),
    [message, setMessage] = useState("");
  const activeId = selected || classes.data?.[0]?.id || "";
  const active = classes.data?.find((c) => c.id === activeId);
  const report = useQuery({
    queryKey: ["sba-teaching", actor?.id, activeId],
    queryFn: () => sbaApi.teaching(activeId),
    enabled: !!activeId,
  });
  useEffect(() => {
    setScores({});
    setMessage("");
    if (active?.stream.grade === "Grade 10") setLevel(10);
  }, [activeId]);
  useEffect(() => {
    setScores({});
    setMessage("");
  }, [term, level, year]);
  const save = useMutation({
    mutationFn: ({ id, score }: { id: number; score: number }) =>
      sbaApi.record({
        student_id: id,
        subject: active!.subject,
        grade_level: level,
        term,
        score,
        academic_year: year,
      }),
    onSuccess: () => {
      setMessage("Score saved.");
      void cache.invalidateQueries({ queryKey: ["sba-teaching"] });
    },
    onError: (e) => setMessage(apiErrorMessage(e, "Could not save score.")),
  });
  const unassigned =
    isAxiosError(classes.error) && classes.error.response?.status === 403;
  const control =
    "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#101820]">
          SBA scorebook
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Assigned subjects and streams
        </p>
      </header>
      {((classes.error && !unassigned) || report.error) && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
        >
          {apiErrorMessage(
            report.error || classes.error,
            "Could not load scorebook.",
          )}{" "}
          <button
            onClick={() => {
              void classes.refetch();
              void report.refetch();
            }}
            className="ml-2 underline"
          >
            Try again
          </button>
        </p>
      )}
      {classes.isLoading ? (
        <p role="status" className="p-5 text-sm text-slate-500">
          Loading classes…
        </p>
      ) : unassigned || classes.data?.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          You have no assigned classes. Contact your School Admin.
        </p>
      ) : (
        active && (
          <>
            <section className="grid items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
              <label className="text-xs font-medium text-slate-600">
                Class
                <select
                  aria-label="My SBA class"
                  className={control}
                  value={activeId}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {classes.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject} · {c.stream.grade} · {c.stream.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Assessment grade
                <select
                  aria-label="Assessment grade"
                  className={control}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                >
                  <option value={10}>Grade 10</option>
                  <option value={11}>Grade 11</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Term
                <select
                  aria-label="Assessment term"
                  className={control}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                >
                  {["Term 1", "Term 2", "Term 3"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                School year
                <input
                  aria-label="School year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className={control}
                />
              </label>
            </section>
            {message && (
              <p
                role={save.isError ? "alert" : "status"}
                className={`rounded-lg p-3 text-sm ${save.isError ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}
              >
                {message}
              </p>
            )}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <ClipboardCheck
                  size={18}
                  className="text-slate-400"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-semibold">
                  {active.subject} · {active.stream.name}
                </h2>
              </div>
              {report.isLoading ? (
                <p className="p-5 text-sm text-slate-500">Loading learners…</p>
              ) : !report.data?.rows.length ? (
                <p className="p-5 text-sm text-slate-500">
                  No learners are enrolled in this assigned stream.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {report.data.rows.map((r) => {
                    const existing = r.records.find(
                      (v) =>
                        v.grade_level === level &&
                        v.term === term &&
                        v.academic_year === year,
                    );
                    const value =
                      scores[r.student_id] ??
                      (existing ? String(existing.score) : "");
                    const number = Number(value);
                    return (
                      <li
                        key={r.student_id}
                        className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#101820]">
                            {r.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {r.admission_number ?? "—"} · Grade {level} average{" "}
                            <SbaScore
                              value={
                                level === 10 ? r.grade10_sba : r.grade11_sba
                              }
                            />
                          </p>
                        </div>
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (
                              value.trim() &&
                              Number.isFinite(number) &&
                              number >= 0 &&
                              number <= 100
                            )
                              save.mutate({ id: r.student_id, score: number });
                          }}
                        >
                          <label
                            className="sr-only"
                            htmlFor={`score-${r.student_id}`}
                          >
                            {r.name} score
                          </label>
                          <input
                            id={`score-${r.student_id}`}
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            placeholder="0–100"
                            value={value}
                            onChange={(e) =>
                              setScores({
                                ...scores,
                                [r.student_id]: e.target.value,
                              })
                            }
                            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                          />
                          <button
                            disabled={
                              save.isPending ||
                              !value.trim() ||
                              !Number.isFinite(number) ||
                              number < 0 ||
                              number > 100 ||
                              !Number.isInteger(year) ||
                              year < 2000 ||
                              year > 2100
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101820] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                          >
                            <Save size={14} aria-hidden="true" />
                            Save
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
