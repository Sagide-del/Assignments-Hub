import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FolderClosed,
  Layers3,
  Plus,
  Send,
} from "lucide-react";
import { questionBankAdminApi } from "../../api/question-bank.api";

type PublishScope = { grade: string; batchId: number; subject: string };
export function SavedQuestionLibrary({
  onPublish,
}: {
  onPublish: (scope: PublishScope) => void;
}) {
  const [params, setParams] = useSearchParams();
  const [subject, setSubject] = useState("");
  const library = useQuery({
    queryKey: ["saved-question-library"],
    queryFn: questionBankAdminApi.savedLibrary,
    refetchInterval: 15000,
  });
  const grades = library.data ?? [];
  const selectedGrade =
    grades.find((g) => g.grade === params.get("grade")) ??
    grades.find((g) => g.total > 0) ??
    grades[0];
  const subjects = [
    ...new Set(selectedGrade?.batches.map((b) => b.subject) ?? []),
  ].sort();
  const activeSubject = subjects.includes(subject) ? subject : "";
  const date = (value: string) =>
    new Intl.DateTimeFormat("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Nairobi",
    }).format(new Date(value));
  const createUrl = `?view=create&grade=${encodeURIComponent(selectedGrade?.grade ?? "Grade 7")}`;
  if (library.isPending)
    return (
      <p className="rounded-xl border bg-white p-8 text-sm text-slate-500">
        Loading your saved question library…
      </p>
    );
  if (library.isError)
    return (
      <div role="alert" className="rounded-xl border bg-white p-6 text-sm">
        The saved library could not load. Your stored questions have not been
        removed.{" "}
        <button
          className="ml-2 text-blue-700 underline"
          onClick={() => library.refetch()}
        >
          Retry
        </button>
        <Link className="ml-4 text-blue-700 underline" to="?view=questions">
          Open question review
        </Link>
      </div>
    );
  return (
    <section className="space-y-5" aria-label="Saved question library">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Saved library</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Choose a grade, open a subject, then review or publish a saved
            batch.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 size={15} className="text-emerald-600" />
          New generation keeps your previous questions.
        </p>
      </div>
      <nav
        aria-label="Saved question grades"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7"
      >
        {grades.map((g) => (
          <button
            key={g.grade}
            aria-pressed={g.grade === selectedGrade?.grade}
            onClick={() => {
              setSubject("");
              setParams({ view: "library", grade: g.grade });
            }}
            className={`min-w-0 rounded-xl border p-4 text-left transition ${g.grade === selectedGrade?.grade ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-400"}`}
          >
            <span className="block text-sm font-semibold">{g.grade}</span>
            <span className="mt-2 block text-xs text-slate-500">
              {g.total.toLocaleString()} questions
            </span>
          </button>
        ))}
      </nav>
      {selectedGrade && (
        <>
          <div className="rounded-xl border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
              <div>
                <h3 className="font-semibold">
                  {selectedGrade.grade} collection
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {subjects.length}{" "}
                  {subjects.length === 1 ? "subject" : "subjects"} ·{" "}
                  {selectedGrade.total} saved · {selectedGrade.approved}{" "}
                  approved · {selectedGrade.drafts} need review
                </p>
              </div>
              <Link
                to={createUrl}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Generate for {selectedGrade.grade}
              </Link>
            </div>
            {activeSubject ? (
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex min-h-10 items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
                    onClick={() => setSubject("")}
                  >
                    <ArrowLeft size={16} />
                    All subjects
                  </button>
                  <span className="text-sm font-semibold">{activeSubject}</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {selectedGrade.batches
                    .filter((b) => b.subject === activeSubject)
                    .map((batch) => (
                      <article
                        key={`${batch.batchId}-${batch.subject}`}
                        className="min-w-0 rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold">
                            <Layers3 size={18} className="text-blue-600" />
                            {batch.batchId
                              ? `Batch ${batch.batchId}`
                              : "Earlier saved content"}
                          </span>
                          {batch.published > 0 && (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                              {batch.published} published
                            </span>
                          )}
                        </div>
                        {batch.createdAt && (
                          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <CalendarDays size={14} />
                            {date(batch.createdAt)}
                          </p>
                        )}
                        <p className="mt-5 text-sm font-medium">
                          {batch.total} saved questions
                        </p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          {batch.approved} approved · {batch.drafts} need review
                          {batch.rejected
                            ? ` · ${batch.rejected} rejected`
                            : ""}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3 border-t pt-4">
                          <Link
                            to={`?view=questions&grade=${encodeURIComponent(selectedGrade.grade)}${batch.batchId ? `&batch=${batch.batchId}` : ""}&subject=${encodeURIComponent(activeSubject)}&status=${batch.drafts ? "GENERATED" : "APPROVED"}`}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
                          >
                            <BookOpen size={15} />
                            Review questions
                          </Link>
                          <button
                            disabled={!batch.approved || !batch.batchId}
                            onClick={() =>
                              batch.batchId &&
                              onPublish({
                                grade: selectedGrade.grade,
                                batchId: batch.batchId,
                                subject: activeSubject,
                              })
                            }
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <Send size={15} />
                            Publish
                          </button>
                        </div>
                        {!batch.approved && (
                          <p className="mt-3 text-xs text-slate-500">
                            Approve questions in this batch to publish.
                          </p>
                        )}
                      </article>
                    ))}
                </div>
              </div>
            ) : subjects.length ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                {subjects.map((name) => {
                  const batches = selectedGrade.batches.filter(
                    (b) => b.subject === name,
                  );
                  return (
                    <button
                      key={name}
                      onClick={() => setSubject(name)}
                      className="group min-w-0 rounded-xl border border-slate-200 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50/30"
                    >
                      <FolderClosed size={23} className="text-blue-600" />
                      <span className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold">
                        <span className="break-words">{name}</span>
                        <ArrowRight
                          size={16}
                          className="shrink-0 text-slate-400 group-hover:text-blue-600"
                        />
                      </span>
                      <span className="mt-2 block text-xs text-slate-500">
                        {batches.reduce((n, b) => n + b.total, 0)} questions ·{" "}
                        {batches.length} saved batches
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <FolderClosed size={30} className="mx-auto text-slate-300" />
                <h4 className="mt-4 font-semibold">
                  No questions saved for {selectedGrade.grade} yet
                </h4>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Generate the first batch for this grade. Questions already
                  saved for other grades stay in their collections.
                </p>
                <Link
                  to={createUrl}
                  className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-700"
                >
                  Create {selectedGrade.grade} content
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
