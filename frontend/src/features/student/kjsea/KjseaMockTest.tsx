import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Clock3,
  FilePlus2,
  History,
  LoaderCircle,
  GraduationCap,
} from "lucide-react";
import { kjseaApi } from "../../../api/kjsea.api";
import { apiErrorMessage } from "../../../api/axios";
import { useAuthStore } from "../../../store/auth.store";
const JUNIOR_SUBJECTS = [
  "English",
  "Kiswahili",
  "Mathematics",
  "Integrated Science",
  "Social Studies",
  "Pre-Technical Studies",
  "Agriculture and Nutrition",
  "Creative Arts and Sports",
  "Christian Religious Education",
  "Islamic Religious Education",
  "Hindu Religious Education",
];
const subjectKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z]/g, "");
export function KjseaMockTestPage() {
  const user = useAuthStore((s) => s.user);
  const client = useQueryClient();
  const navigate = useNavigate();
  const profileGrade = user?.grade?.match(/(?:grade\s*)?([789])$/i)?.[1];
  const [grade, setGrade] = useState(`Grade ${profileGrade ?? "9"}`);
  const [subjectId, setSubjectId] = useState("generated-mathematics");
  const subjects = useQuery({
    queryKey: ["kjsea-subjects", user?.id, grade],
    queryFn: () => kjseaApi.subjects(grade),
    enabled: !!user && !user.isIndependentTrial,
  });
  const selected =
    subjects.data?.find((s) => s.id === subjectId) ?? subjects.data?.[0];
  const missingSubjects = JUNIOR_SUBJECTS.filter(
    (name) =>
      !subjects.data?.some(
        (item) => subjectKey(item.subject) === subjectKey(name),
      ),
  );
  const [mode, setMode] = useState("untimed");
  const [discardId, setDiscardId] = useState<string | null>(null);
  const config = useQuery({
    queryKey: ["kjsea-blueprint"],
    queryFn: kjseaApi.blueprint,
  });
  const attempts = useQuery({
    queryKey: ["kjsea-attempts", user?.id],
    queryFn: kjseaApi.list,
    enabled: !!user && !user.isIndependentTrial,
  });
  const generate = useMutation({
    mutationFn: () =>
      kjseaApi.create(
        mode === "untimed" ? undefined : Number(mode),
        selected?.subject ?? "Mathematics",
        selected?.source ?? "GENERATED",
        grade,
      ),
    onSuccess: (paper) => {
      client.setQueryData(["kjsea-attempt", user?.id, paper.id], paper);
      void client.invalidateQueries({ queryKey: ["kjsea-attempts"] });
      navigate(`/student/kjsea-mock-test/${paper.id}`);
    },
  });
  const discard = useMutation({
    mutationFn: () => kjseaApi.discard(discardId!),
    onSuccess: () => {
      setDiscardId(null);
      void client.invalidateQueries({ queryKey: ["kjsea-attempts"] });
    },
  });
  if (user?.isIndependentTrial)
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">KJSEA Mock Test</h1>
        <p className="mt-3">Activate your account to open mock tests.</p>
        <Link
          className="mt-4 inline-block text-teal-800 underline"
          to="/student/activate"
        >
          Activate full access
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">
            Assessments / Mock tests
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            KJSEA Mock Test
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Practice by grade and subject. Review every answer.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-600">
          <GraduationCap className="h-4 w-4" />
          Grades 7–9
        </span>
      </header>
      <section
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
        aria-label="Generate a junior-school mock"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Create a practice paper</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose your grade, subject and timing.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium" htmlFor="mock-grade">
              Grade
              <select
                aria-label="Grade"
                id="mock-grade"
                value={grade}
                disabled={generate.isPending}
                onChange={(e) => {
                  setGrade(e.target.value);
                  setSubjectId("generated-mathematics");
                  generate.reset();
                }}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
              >
                {["Grade 7", "Grade 8", "Grade 9"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium" htmlFor="mock-timing">
              Timing
              <select
                aria-label="Timing"
                id="mock-timing"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
              >
                <option value="untimed">Untimed practice</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </label>
          </div>
          <label
            htmlFor="mock-subject"
            className="mt-5 block text-sm font-medium"
          >
            Subject
          </label>
          <select
            id="mock-subject"
            value={selected?.id ?? ""}
            onChange={(e) => {
              setSubjectId(e.target.value);
              generate.reset();
            }}
            disabled={subjects.isFetching || generate.isPending}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            {subjects.isPending ? (
              <option>Loading subjects…</option>
            ) : (
              subjects.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subject}
                  {item.source === "GENERATED"
                    ? " · varied questions"
                    : " · reviewed bank"}
                </option>
              ))
            )}
            {!subjects.isPending && !subjects.isError && (
              <optgroup label={`Awaiting reviewed ${grade} questions`}>
                {missingSubjects.map((name) => (
                  <option key={name} disabled>
                    {name} — not available yet
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {subjects.isError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              Subjects could not be loaded.{" "}
              <button onClick={() => subjects.refetch()} className="underline">
                Retry
              </button>
            </p>
          )}
          {selected && !subjects.isFetching && (
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-y border-slate-100 py-4 text-sm text-slate-500">
              <span>
                <strong className="font-semibold text-slate-900">
                  {selected.questionCount}
                </strong>{" "}
                questions
              </span>
              <span>
                <strong className="font-semibold text-slate-900">
                  {selected.topicCount}
                </strong>{" "}
                topics
              </span>
              <span>{grade} only</span>
            </div>
          )}
          {selected?.source === "BANK" && selected.questionCount < 40 && (
            <p className="mt-3 text-xs leading-6 text-amber-800">
              This is a short practice set of {selected.questionCount}{" "}
              questions. A full mock needs more reviewed questions for this
              grade.
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xs text-xs leading-5 text-slate-500">
              {mode === "untimed"
                ? "Your answers save automatically. Return whenever you’re ready."
                : "The timer starts at generation and continues when you leave."}
            </p>
            <button
              type="button"
              disabled={
                generate.isPending ||
                subjects.isFetching ||
                subjects.isError ||
                !selected ||
                config.isPending ||
                config.isError
              }
              onClick={() => generate.mutate()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {generate.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <FilePlus2 className="h-4 w-4" />
              )}
              {generate.isPending ? "Building paper…" : "Generate new paper"}
            </button>
          </div>
          {config.isError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              The mock service is unavailable.{" "}
              <button onClick={() => config.refetch()} className="underline">
                Retry
              </button>
            </p>
          )}
        </div>
        <aside className="py-2 lg:py-5">
          <h2 className="text-sm font-semibold">How this paper is built</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {selected?.source === "BANK"
              ? `Questions come only from the reviewed ${grade} ${selected.subject} pool. Recent questions are avoided where possible.`
              : "Original mathematics questions with varied values and order. Each grade has a separate practice progression; topic templates can repeat."}
          </p>
          <details className="mt-5 border-t border-slate-200 pt-4">
            <summary className="cursor-pointer text-xs font-medium text-slate-700">
              Coverage and sources
            </summary>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              Mathematics topic progression is platform-authored and awaits
              verification against current grade-specific KICD designs. Other
              subjects require reviewed questions for the selected grade. Scores
              are practice results, not official KNEC grades.
            </p>
          </details>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-xs font-medium text-slate-700">
              Subject availability
            </h3>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Every subject with reviewed questions for {grade} appears in the
              selector. Content from other grades is excluded.
            </p>
          </div>
        </aside>
      </section>
      {generate.isError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {apiErrorMessage(
            generate.error,
            "Could not generate your mock. Please try again.",
          )}
        </p>
      )}
      <section
        aria-label="My mock attempts"
        className="rounded-2xl border bg-white p-5 sm:p-6"
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5 text-teal-800" />
          My mock attempts
        </h2>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          Your latest 30 papers. Resume a draft or review a completed paper.
        </p>
        {attempts.isPending ? (
          <p role="status" className="mt-4 text-sm">
            Loading your attempts…
          </p>
        ) : attempts.isError ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            Could not load your attempts.{" "}
            <button
              type="button"
              onClick={() => attempts.refetch()}
              className="underline"
            >
              Retry
            </button>
          </p>
        ) : !attempts.data?.length ? (
          <div className="mt-5 rounded-xl border border-dashed p-6 text-center">
            <BookOpen className="mx-auto h-7 w-7 text-teal-700" />
            <p className="mt-3 text-sm text-slate-600">
              Generate your first paper to start your revision record.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {attempts.data.map((a, i) => (
              <article key={a.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {a.subject} ·{" "}
                      {a.coverage?.grades?.join(", ") || "Junior school"} ·{" "}
                      {new Intl.DateTimeFormat("en-KE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Africa/Nairobi",
                      }).format(new Date(a.createdAt))}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{a.questionCount} questions</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {a.timeLimitMinutes
                          ? `${a.timeLimitMinutes} min`
                          : "Untimed"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ChartNoAxesCombined className="h-3.5 w-3.5" />
                        {a.status === "SUBMITTED"
                          ? `${a.score ?? 0}/${a.questionCount}`
                          : "In progress"}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/student/kjsea-mock-test/${a.id}`}
                    aria-label={`${a.status === "SUBMITTED" ? "Review" : "Resume"} mock ${i + 1}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"
                  >
                    {a.status === "SUBMITTED"
                      ? "Review answers"
                      : "Resume paper"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {a.status === "DRAFT" && (
                  <div className="mt-3 text-xs">
                    {discardId === a.id ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span>
                          Discard this unfinished paper and its saved answers?
                        </span>
                        <button
                          type="button"
                          onClick={() => discard.mutate()}
                          disabled={discard.isPending}
                          className="min-h-9 font-semibold text-red-700 underline"
                        >
                          {discard.isPending
                            ? "Discarding…"
                            : "Yes, discard draft"}
                        </button>
                        <button
                          type="button"
                          disabled={discard.isPending}
                          onClick={() => setDiscardId(null)}
                          className="min-h-9 underline"
                        >
                          Keep paper
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDiscardId(a.id)}
                        className="min-h-9 text-slate-500 underline"
                      >
                        Discard draft
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {discard.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {apiErrorMessage(discard.error, "Could not discard this draft.")}
          </p>
        )}
      </section>
    </div>
  );
}
