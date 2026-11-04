import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  Plus,
  Users,
  FilePenLine,
  ShieldCheck,
} from "lucide-react";
import { teacherApi } from "../../api/teacher.api";
import { submissionsApi } from "../../api/submissions.api";
import { apiErrorMessage } from "../../api/axios";
import { useAuthStore } from "../../store/auth.store";

export function TeacherDashboard() {
  const userId = useAuthStore((s) => s.user?.id);
  const [selected, setSelected] = useState("");
  const classes = useQuery({
    queryKey: ["teaching-classes", userId],
    queryFn: teacherApi.classes,
    retry: false,
  });
  const ready = Boolean(classes.data?.length);
  const students = useQuery({
    queryKey: ["teaching-students", userId],
    queryFn: teacherApi.students,
    enabled: ready,
  });
  const assignments = useQuery({
    queryKey: ["teaching-assignments", userId],
    queryFn: teacherApi.assignments,
    enabled: ready,
  });
  const submissions = useQuery({
    queryKey: ["teaching-submissions", userId],
    queryFn: () => submissionsApi.findAll(),
    enabled: ready,
  });
  const current = classes.data?.find((c) => c.id === selected);
  const papers = (assignments.data ?? []).filter(
    (a) =>
      !current ||
      (a.subject.toLowerCase() === current.subject.toLowerCase() &&
        a.grade === current.stream.grade &&
        (!a.targetStream || a.targetStream === current.stream.name)),
  );
  const learners = (students.data ?? []).filter(
    (s) =>
      !current ||
      (s.grade === current.stream.grade &&
        s.studentProfile?.stream === current.stream.name),
  );
  const pending = (submissions.data ?? []).filter(
    (s) =>
      s.status === "SUBMITTED" &&
      (!current || papers.some((a) => a.id === s.assignmentId)),
  );
  const noClasses =
    !classes.isLoading &&
    (classes.data?.length === 0 ||
      (isAxiosError(classes.error) && classes.error.response?.status === 403));
  const failure =
    classes.error && !noClasses
      ? classes.error
      : (students.error ?? assignments.error ?? submissions.error);
  const metrics = [
    {
      label: "Assigned classes",
      value: classes.data?.length ?? 0,
      icon: Layers3,
    },
    { label: "Learners", value: learners.length, icon: Users },
    { label: "Assignments", value: papers.length, icon: BookOpen },
    { label: "Ready to mark", value: pending.length, icon: ClipboardCheck },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#101820]">
            My teaching
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Classes, assignments and marking
          </p>
        </div>
        {ready && (
          <Link
            to="/teacher/assignments/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#101820] px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus size={16} aria-hidden="true" />
            New assignment
          </Link>
        )}
      </header>
      {classes.isLoading ? (
        <p role="status" className="py-10 text-sm text-slate-500">
          Loading your classes…
        </p>
      ) : noClasses ? (
        <section className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <GraduationCap
            className="mx-auto mb-4 text-slate-400"
            size={32}
            aria-hidden="true"
          />
          <h2 className="font-semibold text-[#101820]">
            You have no assigned classes. Contact your School Admin.
          </h2>
        </section>
      ) : (
        <>
          {failure && (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              {apiErrorMessage(failure, "Could not load your workspace.")}{" "}
              <button
                onClick={() => {
                  void classes.refetch();
                  void students.refetch();
                  void assignments.refetch();
                  void submissions.refetch();
                }}
                className="ml-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}
          {ready && (
            <>
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-slate-100 p-2.5">
                    <GraduationCap
                      size={20}
                      className="text-[#101820]"
                      aria-hidden="true"
                    />
                  </span>
                  <label
                    htmlFor="teaching-class"
                    className="text-sm font-medium text-[#101820]"
                  >
                    My classes
                  </label>
                </div>
                <select
                  id="teaching-class"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">All assigned classes</option>
                  {classes.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject} · {c.stream.grade} · {c.stream.name}
                    </option>
                  ))}
                </select>
              </section>
              <section
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                aria-label="Teaching overview"
              >
                {metrics.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        {label}
                      </span>
                      <Icon
                        size={18}
                        className="text-slate-400"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-[#101820]">
                      {students.isLoading ||
                      assignments.isLoading ||
                      submissions.isLoading
                        ? "—"
                        : value}
                    </p>
                  </div>
                ))}
              </section>
              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-5">
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <h2 className="text-sm font-semibold text-[#101820]">
                        Recent assignments
                      </h2>
                      <span className="text-xs text-slate-400">
                        {papers.length} total
                      </span>
                    </div>
                    {assignments.isLoading ? (
                      <p className="p-5 text-sm text-slate-500">
                        Loading assignments…
                      </p>
                    ) : !papers.length ? (
                      <div className="p-8 text-center">
                        <FilePenLine
                          className="mx-auto mb-3 text-slate-400"
                          size={26}
                          aria-hidden="true"
                        />
                        <p className="text-sm text-slate-600">
                          No assignments in this class yet.
                        </p>
                        <Link
                          to="/teacher/assignments/new"
                          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#101820]"
                        >
                          Create an assignment
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {papers.slice(0, 8).map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-3 px-5 py-4"
                          >
                            <span className="hidden rounded-lg bg-slate-50 p-2.5 sm:block">
                              <BookOpen
                                size={18}
                                className="text-slate-500"
                                aria-hidden="true"
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/teacher/assignments/${a.id}/edit`}
                                className="line-clamp-2 text-sm font-medium text-[#101820] hover:underline"
                              >
                                {a.title}
                              </Link>
                              <p className="mt-1 text-xs text-slate-500">
                                {a.subject} · {a.grade}
                                {a.targetStream ? ` · ${a.targetStream}` : ""}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium ${a.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {a.isPublished ? "Published" : "Draft"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                      <h2 className="text-sm font-semibold text-[#101820]">
                        Learners{" "}
                        <span className="ml-1 font-normal text-slate-400">
                          {learners.length}
                        </span>
                      </h2>
                    </div>
                    {students.isLoading ? (
                      <p className="p-5 text-sm text-slate-500">
                        Loading learners…
                      </p>
                    ) : !learners.length ? (
                      <p className="p-5 text-sm text-slate-500">
                        No learners enrolled in these streams yet.
                      </p>
                    ) : (
                      <ul className="grid divide-y divide-slate-100 sm:grid-cols-2">
                        {learners.slice(0, 12).map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center gap-3 px-5 py-3"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                              {s.name
                                .split(" ")
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#101820]">
                                {s.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {s.grade} · {s.studentProfile?.stream ?? "—"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
                <div className="space-y-4">
                  <section className="rounded-xl bg-[#101820] p-5 text-white">
                    <ClipboardCheck
                      size={22}
                      className="text-[#B5E61D]"
                      aria-hidden="true"
                    />
                    <h2 className="mt-4 font-medium">Marking queue</h2>
                    <p className="mt-1 text-sm text-slate-300">
                      {pending.length}{" "}
                      {pending.length === 1 ? "submission" : "submissions"}{" "}
                      awaiting review
                    </p>
                    <Link
                      to="/teacher/marking"
                      className="mt-5 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/15"
                    >
                      Open marking
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </section>
                  <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-sm font-semibold text-[#101820]">
                      Teaching tools
                    </h2>
                    {[
                      {
                        to: "/teacher/question-bank",
                        label: "Question bank",
                        icon: BookOpen,
                      },
                      {
                        to: "/teacher/academic-reports",
                        label: "Class results",
                        icon: ClipboardCheck,
                      },
                      {
                        to: "/teacher/messages",
                        label: "Learner messages",
                        icon: Users,
                      },
                    ].map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        className="mt-3 flex items-center gap-3 rounded-lg py-2 text-sm text-slate-600 hover:text-[#101820]"
                      >
                        <Icon size={17} aria-hidden="true" />
                        <span className="flex-1">{label}</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    ))}
                  </section>
                  <p className="flex items-center gap-2 px-1 text-xs text-slate-400">
                    <ShieldCheck size={14} aria-hidden="true" />
                    Assigned classes only
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
