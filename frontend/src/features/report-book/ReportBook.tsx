import { useEffect, useState } from "react";
import { Link, useBlocker } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Download,
  FileCheck,
  Plus,
  Save,
  Settings,
  Users,
  X,
} from "lucide-react";
import {
  reportBookApi,
  type Band,
  type Options,
  type Period,
  type ReportCard,
} from "../../api/report-book.api";
import { apiErrorMessage } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";
const input =
  "min-h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#143e32] px-4 text-sm font-semibold text-white disabled:opacity-40";
const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-40";
const tag = (s: string) =>
  `inline-block rounded-full px-2.5 py-1 text-xs font-bold ${s === "PUBLISHED" ? "bg-emerald-50 text-emerald-800" : s === "REVIEW" ? "bg-violet-50 text-violet-800" : "bg-amber-50 text-amber-800"}`;
export default function ReportBook() {
  const user = useAuthStore((s) => s.user),
    client = useQueryClient(),
    admin = user?.role !== "TEACHER";
  const [tab, setTab] = useState(admin ? "CLASS" : "GRADEBOOK"),
    [period, setPeriod] = useState(""),
    [subject, setSubject] = useState(""),
    [notice, setNotice] = useState("");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const changeView = (action: () => void) => {
    if (hasUnsaved && !window.confirm("Discard unsaved gradebook changes?"))
      return;
    setHasUnsaved(false);
    action();
  };
  const options = useQuery({
    queryKey: ["report-book-options", user?.id],
    queryFn: reportBookApi.options,
  });
  useEffect(() => {
    if (!period && options.data?.periods[0])
      setPeriod(options.data.periods[0].id);
  }, [options.data, period]);
  const selected = options.data?.periods.find((p) => p.id === period),
    pairs =
      options.data?.pairs.filter((p) => p.stream_id === selected?.stream_id) ??
      [];
  const subjects =
    (admin ? selected?.subjects : pairs.map((p) => p.subject)) ?? [];
  useEffect(() => {
    if (!subjects.includes(subject)) setSubject(subjects[0] ?? "");
  }, [subjects.join("|"), subject]);
  const canClass =
    admin ||
    options.data?.classes.some((c) => c.stream_id === selected?.stream_id);
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["report-book-options"] }),
      client.invalidateQueries({ queryKey: ["gradebook"] }),
      client.invalidateQueries({ queryKey: ["report-book-matrix"] }),
      client.invalidateQueries({ queryKey: ["report-book-cards"] }),
      client.invalidateQueries({ queryKey: ["report-book-history"] }),
    ]);
  };
  return (
    <div className="min-w-0 space-y-5 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            School academics · Grades 1–12
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Report Book
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Record marks. Review the class. Issue approved school reports.
          </p>
        </div>
        {selected ? (
          <span className={tag(selected.status)}>
            {selected.status} · Revision {selected.revision}
          </span>
        ) : null}
      </header>
      <nav
        aria-label="Report Book sections"
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
      >
        {[
          [BookOpen, "GRADEBOOK", "Gradebook"],
          [Users, "CLASS", "Class reports"],
          ...(admin ? [[Settings, "SETUP", "School setup"]] : []),
        ].map(([Icon, key, label]) => {
          const I = Icon as typeof BookOpen;
          return (
            <button
              key={String(key)}
              onClick={() => { if (tab !== String(key)) changeView(() => setTab(String(key))); }}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${tab === key ? "bg-[#143e32] text-white" : "text-slate-500"}`}
            >
              <I size={16} />
              {String(label)}
            </button>
          );
        })}
      </nav>
      {options.isPending ? (
        <p className="p-5 text-sm text-slate-500">
          Loading your assigned classes…
        </p>
      ) : options.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          {apiErrorMessage(options.error, "The report book could not load.")}{" "}
          <button onClick={() => void options.refetch()}>Retry</button>
        </p>
      ) : options.data ? (
        <>
          {tab !== "SETUP" ? (
            <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <label className="min-w-0 w-full text-xs font-semibold text-slate-500 sm:w-auto sm:flex-1">
                Reporting period
                <select
                  aria-label="Reporting period"
                  value={period}
                  onChange={(e) => {
                    changeView(() => {
                      setPeriod(e.target.value);
                      setNotice("");
                    });
                  }}
                  className={`${input} mt-1 w-full`}
                >
                  <option value="">Select a period</option>
                  {options.data.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.stream.grade} · {p.stream.name} · {p.term} · {p.year}
                    </option>
                  ))}
                </select>
              </label>
              {tab === "GRADEBOOK" ? (
                <label className="min-w-0 w-full text-xs font-semibold text-slate-500 sm:w-auto sm:flex-1">
                  Your subject
                  <select
                    aria-label="Gradebook subject"
                    value={subject}
                    onChange={(e) =>
                      changeView(() => setSubject(e.target.value))
                    }
                    className={`${input} mt-1 w-full`}
                  >
                    {subjects.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          {notice ? (
            <p
              role="status"
              className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {notice}
            </p>
          ) : null}
          {tab === "SETUP" ? (
            <Setup options={options.data} onSaved={refresh} />
          ) : !selected ? (
            <div className="rounded-xl border border-dashed bg-white p-8 text-sm text-slate-500">
              {admin
                ? "Create a reporting period in School setup to begin."
                : "Your School Admin has not created a reporting period for your assigned class yet."}
            </div>
          ) : tab === "GRADEBOOK" ? (
            subject ? (
              <Gradebook
                key={period + subject}
                period={selected}
                subject={subject}
                onSaved={refresh}
                onDirty={setHasUnsaved}
              />
            ) : (
              <p className="rounded-xl bg-white p-5 text-sm text-slate-500">
                You have no subject teaching assignment in this stream. Ask your
                School Admin to assign your subjects.
              </p>
            )
          ) : canClass ? (
            <ClassReports
              key={period}
              period={selected}
              admin={admin}
              onSaved={refresh}
              onNotice={setNotice}
            />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              Class-wide reports are available only to the explicitly assigned
              Class Teacher. Your subject gradebook remains available.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
function Gradebook({
  period,
  subject,
  onSaved,
  onDirty,
}: {
  period: Period;
  subject: string;
  onSaved: () => Promise<void>;
  onDirty: (value: boolean) => void;
}) {
  const query = useQuery({
    queryKey: ["gradebook", period.id, subject],
    queryFn: () => reportBookApi.gradebook(period.id, subject),
  });
  const [assessmentId, setAssessmentId] = useState(""),
    [name, setName] = useState("End of Term Exam"),
    [maximum, setMaximum] = useState(100),
    [weight, setWeight] = useState(1),
    [values, setValues] = useState<
      Record<
        number,
        { score: string; remark: string; expected_updated_at?: string }
      >
    >({}),
    [dirty, setDirty] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Discard unsaved gradebook changes?"))
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (query.data && !loaded) {
      setLoaded(true);
      if (query.data.assessments[0])
        setAssessmentId(query.data.assessments[0].id);
    }
  }, [query.data, loaded]);
  const existing = query.data?.assessments.find((a) => a.id === assessmentId),
    locked = ["REVIEW", "PUBLISHED"].includes(period.status);
  useEffect(() => {
    if (query.data && !dirty) {
      const assessment = query.data.assessments.find(
        (a) => a.id === assessmentId,
      );
      if (assessment) {
        setName(assessment.assessment_name);
        setMaximum(assessment.max_score);
        setWeight(assessment.weight);
      }
      setValues(
        Object.fromEntries(
          query.data.students.map((s) => {
            const r = assessment?.records.find((r) => r.student_id === s.id);
            return [
              s.id,
              {
                score:
                  r?.score !== null && r?.score !== undefined
                    ? String(r.score)
                    : "",
                remark: r?.remark ?? "",
                expected_updated_at: r?.updated_at,
              },
            ];
          }),
        ),
      );
    }
  }, [query.data, assessmentId, dirty]);
  const save = useMutation({
    mutationFn: () =>
      reportBookApi.save({
        period_id: period.id,
        subject,
        assessment_name: name,
        max_score: maximum,
        weight,
        scores: Object.entries(values).map(([id, v]) => ({
          student_id: Number(id),
          score: v.score.trim() === "" ? null : Number(v.score),
          remark: v.remark,
          expected_updated_at: v.expected_updated_at,
        })),
      }),
    onSuccess: async (data) => {
      setDirty(false);
      setAssessmentId(data.assessment_id);
      setMessage(
        `${data.saved} marks saved. A new report revision is needed after mark changes.`,
      );
      await onSaved();
    },
  });
  const suggest = useMutation({
    mutationFn: () =>
      reportBookApi.suggest(
        existing!.id,
        existing!.records
          .filter((r) => r.score !== null)
          .slice(0, 40)
          .map((r) => r.id),
      ),
    onSuccess: async () => {
      setMessage(
        "AI drafts are ready below. Review each suggestion, choose Use draft, then Save all marks to approve it.",
      );
      await query.refetch();
    },
  });
  const update = (
    id: number,
    patch: Partial<{ score: string; remark: string }>,
  ) => {
    setDirty(true);
    setValues((v) => ({ ...v, [id]: { ...v[id], ...patch } }));
  };
  const changeAssessment = (id: string) => {
    if (dirty && !window.confirm("Discard unsaved mark changes?")) return;
    setDirty(false);
    setAssessmentId(id);
    if (!id) {
      setName("");
      setMaximum(100);
      setWeight(1);
    }
  };
  return (
    <section className="space-y-4">
      {query.isPending ? (
        <p>Loading gradebook…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          {apiErrorMessage(query.error, "Gradebook unavailable.")}
        </p>
      ) : query.data ? (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="min-w-0 w-full text-xs font-semibold text-slate-500 sm:w-auto sm:flex-1">
              Assessment
              <select
                aria-label="Assessment"
                className={`${input} mt-1 w-full`}
                value={assessmentId}
                onChange={(e) => changeAssessment(e.target.value)}
              >
                <option value="">New assessment</option>
                {query.data.assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assessment_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 w-full text-xs font-semibold text-slate-500 sm:w-auto sm:flex-1">
              Name
              <input
                aria-label="Assessment name"
                value={name}
                onChange={(e) => {
                  setDirty(true);
                  setName(e.target.value);
                }}
                disabled={locked || !!existing}
                className={`${input} mt-1 w-full`}
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Maximum
              <input
                aria-label="Maximum score"
                type="number"
                min="1"
                value={maximum}
                onChange={(e) => {
                  setDirty(true);
                  setMaximum(Number(e.target.value));
                }}
                disabled={locked}
                className={`${input} mt-1 block w-24`}
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Weight
              <input
                aria-label="Assessment weight"
                type="number"
                min="0.01"
                step="0.1"
                value={weight}
                onChange={(e) => {
                  setDirty(true);
                  setWeight(Number(e.target.value));
                }}
                disabled={locked}
                className={`${input} mt-1 block w-24`}
              />
            </label>
          </div>
          {!query.data.policy.confirmed ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              Grading uses an unconfirmed school preset. The School Admin must
              confirm this grade’s bands before reports can be published.
            </p>
          ) : null}
          {locked ? (
            <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-800">
              This period is locked for {period.status.toLowerCase()}. The
              School Admin can reopen it with a recorded reason.
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Learner",
                    "Admission",
                    "Score",
                    "Level",
                    "Teacher remark",
                  ].map((x) => (
                    <th key={x} className="px-4 py-3">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.students.map((s) => {
                  const v = values[s.id] ?? { score: "", remark: "" },
                    percent =
                      v.score !== "" && maximum > 0
                        ? (Number(v.score) / maximum) * 100
                        : null,
                    code =
                      percent === null
                        ? "—"
                        : (query.data.policy.bands.find((b) => percent >= b.min)
                            ?.code ?? "—"),
                    record = existing?.records.find(
                      (r) => r.student_id === s.id,
                    );
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-semibold">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {s.admissionNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          aria-label={`Score for ${s.name}`}
                          type="number"
                          min="0"
                          max={maximum}
                          step="0.01"
                          value={v.score}
                          disabled={locked}
                          onChange={(e) =>
                            update(s.id, { score: e.target.value })
                          }
                          className={`${input} w-24`}
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-800">
                        {code}
                      </td>
                      <td className="min-w-64 px-4 py-3">
                        <textarea
                          aria-label={`Remark for ${s.name}`}
                          maxLength={500}
                          rows={2}
                          value={v.remark}
                          disabled={locked}
                          onChange={(e) =>
                            update(s.id, { remark: e.target.value })
                          }
                          className={`${input} w-full py-2`}
                        />
                        {record?.remark_suggestion ? (
                          <details className="mt-2 text-xs text-violet-800">
                            <summary className="cursor-pointer font-semibold">
                              Review AI draft
                            </summary>
                            <p className="mt-2 leading-5">
                              {record.remark_suggestion}
                            </p>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() =>
                                update(s.id, {
                                  remark: record.remark_suggestion!,
                                })
                              }
                              className="mt-2 min-h-10 font-bold underline"
                            >
                              Use draft
                            </button>
                          </details>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!query.data.students.length ? (
              <p className="p-6 text-sm text-slate-500">
                No enrolled learners for this subject in this stream.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={
                locked ||
                save.isPending ||
                !name.trim() ||
                (!existing &&
                  !Object.values(values).some((v) => v.score.trim() !== ""))
              }
              className={button}
            >
              <Save size={16} />
              {save.isPending ? "Saving…" : "Save all marks"}
            </button>
            <button
              type="button"
              onClick={() => suggest.mutate()}
              disabled={
                locked ||
                !existing?.records.some((r) => r.score !== null) ||
                dirty ||
                suggest.isPending
              }
              className={secondary}
            >
              {suggest.isPending
                ? "Preparing suggestions…"
                : "Draft AI comments (up to 40)"}
            </button>
            <button
              type="button"
              className={secondary}
              disabled={save.isPending}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    "Discard unsaved changes and reload the saved marks?",
                  )
                ) {
                  setDirty(false);
                  void query.refetch();
                }
              }}
            >
              Reload saved marks
            </button>
            {dirty ? (
              <span className="text-xs font-semibold text-amber-700">
                Unsaved changes
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            Weights apply within each subject. Blank scores stay missing and
            block publication; they are never treated as zero. AI drafts require
            your review.
          </p>
        </>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {save.isError || suggest.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          {apiErrorMessage(
            save.error ?? suggest.error,
            "The operation could not be completed.",
          )}
        </p>
      ) : null}
    </section>
  );
}
function ClassReports({
  period,
  admin,
  onSaved,
  onNotice,
}: {
  period: Period;
  admin: boolean;
  onSaved: () => Promise<void>;
  onNotice: (s: string) => void;
}) {
  const [rank, setRank] = useState(false),
    [preview, setPreview] = useState<ReportCard | null>(null),
    [reason, setReason] = useState("");
  const [reportRevision, setReportRevision] = useState(period.revision);
  useEffect(() => setReportRevision(period.revision), [period.revision]);
  const matrix = useQuery({
      queryKey: ["report-book-matrix", period.id],
      queryFn: () => reportBookApi.matrix(period.id),
    }),
    cards = useQuery({
      queryKey: ["report-book-cards", period.id, reportRevision],
      queryFn: () =>
        reportBookApi.cards(period.id, reportRevision || undefined),
    }),
    history = useQuery({
      queryKey: ["report-book-history", period.id],
      queryFn: () => reportBookApi.history(period.id),
      enabled: admin,
    });
  const generate = useMutation({
    mutationFn: () => reportBookApi.generate(period.id, rank),
    onSuccess: async (r) => {
      onNotice(
        `${r.generated} report drafts generated · Revision ${r.revision} · ${r.incomplete} incomplete.`,
      );
      await onSaved();
    },
  });
  const transition = useMutation({
    mutationFn: (action: "review" | "publish" | "reopen") =>
      reportBookApi.transition(period.id, action, reason),
    onSuccess: async () => {
      onNotice("Reporting status updated.");
      setReason("");
      await onSaved();
    },
  });
  const subjects = [
    ...new Set(
      matrix.data?.rows.flatMap((r) => r.subjects.map((s) => s.subject)) ??
        period.subjects,
    ),
  ];
  function csv() {
    if (!matrix.data) return;
    const cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+@-]/.test(s.trimStart())) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const rows = [
      ["Admission", "Name", ...subjects, "Total", "Average"],
      ...matrix.data.rows.map((r) => [
        r.student.admissionNumber,
        r.student.name,
        ...subjects.map(
          (s) => r.subjects.find((v) => v.subject === s)?.score ?? "",
        ),
        r.total ?? "",
        r.average ?? "",
      ]),
    ];
    const blob = new Blob(
        ["\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `class-results-${period.year}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {period.stream.grade} · {period.stream.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {matrix.data?.rows.length ?? 0} learners · Complete marks required
            before publication.
          </p>
        </div>
        <button
          type="button"
          onClick={csv}
          disabled={!matrix.data}
          className={secondary}
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>
      {matrix.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          {apiErrorMessage(matrix.error, "Class results unavailable.")}
        </p>
      ) : matrix.isPending ? (
        <p>Loading class results…</p>
      ) : matrix.data ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {["Learner", ...subjects, "Total", "Average"].map((s) => (
                  <th key={s} className="whitespace-nowrap px-4 py-3">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.data.rows.map((r) => (
                <tr key={r.student.id}>
                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap font-semibold">
                      {r.student.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.student.admissionNumber}
                      {r.setup_required ? " · Choose 3 electives" : ""}
                    </p>
                  </td>
                  {subjects.map((s) => {
                    const value = r.subjects.find((v) => v.subject === s);
                    return (
                      <td key={s} className="px-4 py-3">
                        {value ? (
                          value.score === null ? (
                            <span className="text-amber-700">Pending</span>
                          ) : (
                            <>
                              <b>{value.score}%</b>
                              <span className="ml-1 text-xs text-slate-400">
                                {value.grade}
                              </span>
                            </>
                          )
                        ) : (
                          <span className="text-slate-300">Not enrolled</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">{r.total ?? "Pending"}</td>
                  <td className="px-4 py-3 font-bold">
                    {r.average === null ? "Pending" : r.average + "%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <button
          type="button"
          className={button}
          disabled={
            generate.isPending ||
            ["REVIEW", "PUBLISHED"].includes(period.status)
          }
          onClick={() => generate.mutate()}
        >
          <FileCheck size={16} />
          {generate.isPending ? "Generating…" : "Generate report drafts"}
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={rank}
            onChange={(e) => setRank(e.target.checked)}
          />
          Include ranking (complete, identical subject sets only)
        </label>
        {period.status === "DRAFT" ? (
          <button
            type="button"
            className={secondary}
            disabled={transition.isPending}
            onClick={() => transition.mutate("review")}
          >
            Submit for school review
          </button>
        ) : null}
        {admin && period.status === "REVIEW" ? (
          <button
            type="button"
            className={button}
            disabled={transition.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Publish this revision? Students will be able to view and download it.",
                )
              )
                transition.mutate("publish");
            }}
          >
            Approve & publish
          </button>
        ) : null}
      </div>
      {admin && ["REVIEW", "PUBLISHED"].includes(period.status) ? (
        <div className="flex flex-wrap gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <input
            aria-label="Reason to reopen"
            placeholder="Reason for correcting this period"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${input} flex-1`}
          />
          <button
            type="button"
            disabled={reason.trim().length < 8 || transition.isPending}
            onClick={() => transition.mutate("reopen")}
            className={secondary}
          >
            Reopen for corrections
          </button>
          <p className="w-full text-xs text-amber-900">
            Issued report revisions remain unchanged. Corrections create a new
            revision.
          </p>
        </div>
      ) : null}
      {generate.isError || transition.isError ? (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
        >
          {apiErrorMessage(
            generate.error ?? transition.error,
            "The report operation could not be completed.",
          )}
        </p>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white">
        <h3 className="border-b border-slate-100 p-4 font-semibold">
          Report card revisions
        </h3>
        {period.revision > 0 ? (
          <label className="block px-4 py-3 text-xs font-semibold text-slate-500">
            Report revision
            <select
              aria-label="Report revision"
              value={reportRevision}
              onChange={(e) => setReportRevision(Number(e.target.value))}
              className={`${input} ml-3`}
            >
              {Array.from(
                { length: period.revision },
                (_, i) => period.revision - i,
              ).map((r) => (
                <option key={r} value={r}>
                  Revision {r}
                  {r === period.revision ? " · current" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="divide-y divide-slate-100">
          {cards.data?.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-semibold">{c.student_json.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Revision {c.revision} · {c.status} ·{" "}
                  {c.complete ? "Complete marks" : "Missing marks"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(c)}
                className={secondary}
              >
                View report
              </button>
            </div>
          ))}
        </div>
        {!cards.data?.length ? (
          <p className="p-5 text-sm text-slate-500">
            Generate a draft to preview individual report cards.
          </p>
        ) : null}
      </div>
      {admin ? (
        <details className="rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Revision & mark-change history
          </summary>
          <ul className="mt-4 space-y-2 text-xs text-slate-500">
            {history.data?.map((h) => {
              const d = h.details as {
                student_id?: number;
                before?: { score?: number | null };
                after?: { score?: number | null };
                reason?: string;
                revision?: number;
              };
              return (
                <li key={h.id} className="border-t border-slate-100 py-3">
                  <p>
                    {new Date(h.created_at).toLocaleString("en-GB", {
                      timeZone: "Africa/Nairobi",
                    })}{" "}
                    EAT · <strong>{h.action.replace(/_/g, " ")}</strong> ·{" "}
                    {h.actor_name ?? `Staff #${h.actor_id}`}
                  </p>
                  {h.action === "MARK_SAVED" ? (
                    <p className="mt-1 text-slate-700">
                      {h.student_name ?? `Learner #${d.student_id}`}:{" "}
                      {d.before?.score ?? "Pending"} →{" "}
                      {d.after?.score ?? "Pending"}
                    </p>
                  ) : null}
                  {d.reason ? (
                    <p className="mt-1 text-slate-700">Reason: {d.reason}</p>
                  ) : null}
                  {d.revision ? (
                    <p className="mt-1">Report revision {d.revision}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
      {preview ? (
        <CardPreview
          card={preview}
          admin={admin}
          canEdit={
            preview.revision === period.revision && preview.status !== "PUBLISHED" && (period.status === "DRAFT" || (admin && period.status === "REVIEW"))
          }
          onClose={() => setPreview(null)}
          onSaved={async () => {
            setPreview(null);
            await onSaved();
          }}
        />
      ) : null}
    </section>
  );
}
function Setup({
  options,
  onSaved,
}: {
  options: Options;
  onSaved: () => Promise<void>;
}) {
  const [stream, setStream] = useState(options.streams[0]?.id ?? ""),
    [teacher, setTeacher] = useState(options.teachers[0]?.id ?? 0),
    [term, setTerm] = useState("Term 1"),
    [year, setYear] = useState(new Date().getFullYear()),
    [subjects, setSubjects] = useState(""),
    [message, setMessage] = useState("");
  const currentPeriod = options.periods.find(
    (p) => p.stream_id === stream && p.term === term && p.year === year,
  );
  const selected = options.streams.find((s) => s.id === stream),
    level = Number(selected?.grade.replace("Grade ", ""));
  const policy = useQuery({
    queryKey: ["report-book-policy", level],
    queryFn: () => reportBookApi.policy(level),
    enabled: !!level,
  });
  const [bands, setBands] = useState<Band[]>([]),
    [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (policy.data) {
      setBands(policy.data.bands);
      setConfirmed(policy.data.confirmed);
    }
  }, [policy.data]);
  useEffect(() => {
    setSubjects(
      currentPeriod
        ? currentPeriod.subjects.join(", ")
        : [
            ...new Set(
              options.pairs
                .filter((p) => p.stream_id === stream)
                .map((p) => p.subject),
            ),
          ].join(", "),
    );
  }, [stream, term, year, options.periods]);
  const mutation = useMutation({
    mutationFn: async (action: "class" | "period" | "policy") => {
      if (action === "class") return reportBookApi.assignClass(stream, teacher);
      if (action === "period" && currentPeriod)
        return reportBookApi.updateSubjects(
          currentPeriod.id,
          subjects
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
      if (action === "period")
        return reportBookApi.createPeriod({
          stream_id: stream,
          term,
          year,
          subjects: subjects
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
      return reportBookApi.savePolicy(level, bands, confirmed);
    },
    onSuccess: async () => {
      setMessage("School report-book settings saved.");
      await policy.refetch();
      await onSaved();
    },
  });
  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">School setup</h2>
        <p className="mt-2 text-sm text-slate-500">
          Confirm each class’s subject coverage, Class Teacher and grading
          policy before issuing reports.
        </p>
        <label className="mt-4 block text-xs font-semibold text-slate-500">
          Class
          <select
            aria-label="Setup class"
            className={`${input} mt-1 w-full`}
            value={stream}
            onChange={(e) => setStream(e.target.value)}
          >
            {options.streams.map((s) => (
              <option key={s.id} value={s.id}>
                {s.grade} · {s.name}
              </option>
            ))}
          </select>
        </label>
        {!options.streams.length ? (
          <Link
            to="/school-admin/teaching-assignments"
            className="mt-3 block text-sm text-emerald-800 underline"
          >
            Create streams and subject teaching assignments first
          </Link>
        ) : null}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold">1. Assign the Class Teacher</h3>
          <p className="text-xs leading-5 text-slate-500">
            This grants class-wide report access only. Subject gradebook access
            still follows existing teaching assignments.
          </p>
          <select
            aria-label="Class Teacher"
            value={teacher}
            onChange={(e) => setTeacher(Number(e.target.value))}
            className={`${input} w-full`}
          >
            {options.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.email}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={secondary}
            disabled={!stream || !teacher || mutation.isPending}
            onClick={() => mutation.mutate("class")}
          >
            Save Class Teacher
          </button>
          <p className="text-xs text-slate-500">
            Current:{" "}
            {options.classes.find((c) => c.stream_id === stream)?.teacher
              .name ?? "Not assigned"}
          </p>
        </article>
        <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold">2. Create a reporting period</h3>
          <div className="flex gap-3">
            <select
              aria-label="New reporting term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className={`${input} flex-1`}
            >
              {["Term 1", "Term 2", "Term 3"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              aria-label="Reporting year"
              type="number"
              min="2020"
              max="2100"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={`${input} w-28`}
            />
          </div>
          <label className="block text-xs font-semibold text-slate-500">
            Class subject list (comma-separated)
            <textarea
              aria-label="Class subject list"
              rows={4}
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              className={`${input} mt-1 w-full py-3`}
            />
          </label>
          <p className="text-xs leading-5 text-slate-500">
            For Grades 1–9, this is the expected school subject list. For Grades
            10–12, each learner’s core subjects and three electives also apply.
            Include every enrolled subject; missing coverage blocks publication.
          </p>
          <button
            type="button"
            className={secondary}
            disabled={!stream || !subjects.trim() || mutation.isPending}
            onClick={() => mutation.mutate("period")}
          >
            <Plus size={15} />
            {currentPeriod ? "Save subject coverage" : "Create period"}
          </button>
        </article>
      </div>
      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">
          3. Confirm Grade {level || "—"} grading bands
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          These are editable school grading bands, not an automatic claim of
          official KICD/KNEC approval. Confirm the appropriate policy for this
          grade. Changing it requires draft reports to be regenerated.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {bands.map((b, i) => (
            <div
              key={i}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 p-2"
            >
              <label className="text-xs text-slate-500">
                From %
                <input
                  aria-label={`Band ${i + 1} minimum`}
                  type="number"
                  min="0"
                  max="100"
                  value={b.min}
                  onChange={(e) => {
                    setConfirmed(false);
                    setBands((bs) =>
                      bs.map((x, n) =>
                        n === i ? { ...x, min: Number(e.target.value) } : x,
                      ),
                    );
                  }}
                  className={`${input} block w-20`}
                />
              </label>
              <input
                aria-label={`Band ${i + 1} code`}
                value={b.code}
                onChange={(e) => {
                  setConfirmed(false);
                  setBands((bs) =>
                    bs.map((x, n) =>
                      n === i ? { ...x, code: e.target.value } : x,
                    ),
                  );
                }}
                className={`${input} w-20`}
              />
              <input
                aria-label={`Band ${i + 1} label`}
                value={b.label}
                onChange={(e) => {
                  setConfirmed(false);
                  setBands((bs) =>
                    bs.map((x, n) =>
                      n === i ? { ...x, label: e.target.value } : x,
                    ),
                  );
                }}
                className={`${input} w-full flex-1`}
              />
              <button
                aria-label={`Remove band ${i + 1}`}
                className="min-h-11 px-1 text-slate-400"
                onClick={() => {
                  setConfirmed(false);
                  setBands((bs) => bs.filter((_, n) => n !== i));
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={bands.length >= 12}
          onClick={() => {
            setConfirmed(false);
            setBands([...bands, { min: 0, code: "", label: "" }]);
          }}
          className="mt-3 min-h-10 text-sm font-semibold text-emerald-800"
        >
          Add grading band
        </button>
        <label className="my-4 flex items-start gap-3 text-sm text-slate-600">
          <input
            aria-label="Confirm school grading policy"
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I have checked these bands and approve them as this school’s Grade{" "}
          {level || "—"} reporting policy.
        </label>
        <button
          type="button"
          className={button}
          disabled={!level || mutation.isPending}
          onClick={() => mutation.mutate("policy")}
        >
          Save grading policy
        </button>
      </article>
      {message ? (
        <p role="status" className="text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {mutation.isError || policy.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          {apiErrorMessage(
            mutation.error ?? policy.error,
            "Settings could not be saved.",
          )}
        </p>
      ) : null}
    </section>
  );
}
export function CardPreview({
  card,
  admin = false,
  canEdit = false,
  onClose,
  onSaved,
}: {
  card: ReportCard;
  admin?: boolean;
  canEdit?: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void>;
}) {
  const [teacher, setTeacher] = useState(card.teacher_comment ?? ""),
    [principal, setPrincipal] = useState(card.principal_comment ?? "");
  const save = useMutation({
    mutationFn: () =>
      reportBookApi.comments(card.id, {
        teacher_comment: teacher,
        ...(admin ? { principal_comment: principal } : {}),
      }),
    onSuccess: () => onSaved?.(),
  });
  const pdf = useMutation({ mutationFn: () => reportBookApi.pdf(card.id) });
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-preview-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 sm:p-8"
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              {card.school_json.name}
            </p>
            <h2
              id="report-preview-title"
              className="mt-2 text-2xl font-semibold"
            >
              {card.student_json.name}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {card.student_json.grade} · {card.student_json.stream} · Admission{" "}
              {card.student_json.admissionNumber ?? "—"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close report preview"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-lg bg-slate-50"
          >
            <X size={20} />
          </button>
        </header>
        <div className="my-5 flex flex-wrap items-center gap-3">
          <span className={tag(card.status)}>
            {card.status} · Revision {card.revision}
          </span>
          {!card.complete ? (
            <span className="text-xs text-amber-800">Incomplete marks</span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b text-xs text-slate-500">
              <tr>
                {["Subject", "Score %", "Level", "Remark"].map((s) => (
                  <th key={s} className="p-3">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {card.subjects_json.map((r) => (
                <tr key={r.subject}>
                  <td className="p-3 font-semibold">{r.subject}</td>
                  <td className="p-3">{r.score ?? "Pending"}</td>
                  <td className="p-3 text-emerald-800">{r.grade}</td>
                  <td className="p-3 text-slate-500">{r.remark || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="my-5 flex flex-wrap gap-5 rounded-xl bg-emerald-50 p-4 text-sm">
          <p>
            Total: <b>{card.total_score ?? "Pending"}</b>
          </p>
          <p>
            Average:{" "}
            <b>
              {card.average_score === null
                ? "Pending"
                : card.average_score + "%"}
            </b>
          </p>
          <p>
            Position:{" "}
            <b>
              {card.class_position
                ? card.class_position + "/" + card.cohort_size
                : "Not ranked"}
            </b>
          </p>
        </div>
        <label className="block text-sm font-semibold">
          Class Teacher’s comment
          <textarea
            aria-label="Class Teacher comment"
            rows={3}
            maxLength={1000}
            disabled={!canEdit}
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            className={`${input} mt-2 w-full py-3`}
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Principal’s comment
          <textarea
            aria-label="Principal comment"
            rows={3}
            maxLength={1000}
            disabled={!canEdit || !admin}
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className={`${input} mt-2 w-full py-3`}
          />
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          {canEdit ? (
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className={button}
            >
              <Save size={16} />
              Save comments
            </button>
          ) : null}
          <button
            type="button"
            disabled={pdf.isPending}
            onClick={() => pdf.mutate()}
            className={secondary}
          >
            <Download size={16} />
            {pdf.isPending ? "Preparing PDF…" : "Download report PDF"}
          </button>
        </div>
        {save.isError || pdf.isError ? (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            {apiErrorMessage(
              save.error ?? pdf.error,
              "Report could not be saved/downloaded.",
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
export function SchoolReportCards() {
  const user = useAuthStore((s) => s.user);
  const q = useQuery({
    queryKey: ["published-school-reports", user?.id],
    queryFn: reportBookApi.mine,
  });
  const [preview, setPreview] = useState<ReportCard | null>(null);
  return (
    <section className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Your school’s published results
        </p>
        <h1 className="mt-1 text-3xl font-semibold">School report cards</h1>
        <p className="mt-2 text-sm text-slate-500">
          Approved term reports. Older published revisions remain available for
          your records.
        </p>
      </header>
      <Link
        to="/student/resources?section=REPORTS"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline"
      >
        View your learning & engagement report
      </Link>
      {q.isPending ? (
        <p>Loading reports…</p>
      ) : q.isError ? (
        <p role="alert" className="text-sm text-rose-700">
          {apiErrorMessage(q.error, "School reports could not load.")}
        </p>
      ) : !q.data?.length ? (
        <p className="rounded-xl border border-dashed bg-white p-6 text-sm text-slate-500">
          Your school has not published a report card for you yet. Your Learning
          Coach progress report remains available in Study Hub.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <span className={tag(c.status)}>
                Published · Revision {c.revision}
              </span>
              <h2 className="mt-4 text-xl font-semibold">
                {c.period?.term} · {c.period?.year}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {c.student_json.grade} · {c.student_json.stream}
              </p>
              <button
                type="button"
                className={`${button} mt-5`}
                onClick={() => setPreview(c)}
              >
                Open school report
              </button>
            </article>
          ))}
        </div>
      )}
      {preview ? (
        <CardPreview card={preview} onClose={() => setPreview(null)} />
      ) : null}
    </section>
  );
}
