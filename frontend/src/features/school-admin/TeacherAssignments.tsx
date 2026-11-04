import { useAuthStore } from "../../store/auth.store";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi } from "../../api/teacher.api";
import { apiErrorMessage } from "../../api/axios";
import { Plus, Trash2, Users } from "lucide-react";

export function TeacherAssignments() {
  const cache = useQueryClient();
  const actor = useAuthStore((s) => s.user);
  const teachers = useQuery({
    queryKey: ["admin-teacher-assignments", actor?.schoolId, actor?.id],
    queryFn: teacherApi.teachers,
  });
  const streams = useQuery({
    queryKey: ["admin-streams", actor?.schoolId, actor?.id],
    queryFn: teacherApi.streams,
  });
  const [teacherId, setTeacherId] = useState(""),
    [stream, setStream] = useState(""),
    [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("Grade 11"),
    [name, setName] = useState(""),
    [message, setMessage] = useState("");
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ["admin-teacher-assignments"] });
    void cache.invalidateQueries({ queryKey: ["admin-streams"] });
  };
  const assign = useMutation({
    mutationFn: () =>
      teacherApi.assign(Number(teacherId), subject.trim(), stream),
    onSuccess: () => {
      refresh();
      setMessage("Class assigned.");
      setSubject("");
    },
    onError: (e) =>
      setMessage(apiErrorMessage(e, "Could not assign this class.")),
  });
  const remove = useMutation({
    mutationFn: (input: { teacherId: number; id: string }) =>
      teacherApi.remove(input.teacherId, input.id),
    onSuccess: () => {
      refresh();
      setMessage("Class assignment removed.");
    },
    onError: (e) =>
      setMessage(apiErrorMessage(e, "Could not remove assignment.")),
  });
  const create = useMutation({
    mutationFn: () => teacherApi.createStream(grade, name.trim()),
    onSuccess: () => {
      refresh();
      setName("");
      setMessage("Stream created.");
    },
    onError: (e) => setMessage(apiErrorMessage(e, "Could not create stream.")),
  });
  const control =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#101820]">
          Teaching assignments
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage subject and stream access
        </p>
      </header>
      {(teachers.error || streams.error) && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
        >
          {apiErrorMessage(
            teachers.error || streams.error,
            "Could not load teaching assignments.",
          )}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700"
        >
          {message}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          assign.mutate();
        }}
        className="grid items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <label className="space-y-2 text-sm font-medium">
          Teacher
          <select
            aria-label="Teacher"
            required
            className={control}
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <option value="">Select teacher</option>
            {teachers.data
              ?.filter((t) => t.isActive)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          Subject
          <input
            aria-label="Subject"
            required
            maxLength={120}
            className={control}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Aviation Technology"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Stream
          <select
            aria-label="Stream"
            required
            className={control}
            value={stream}
            onChange={(e) => setStream(e.target.value)}
          >
            <option value="">Select stream</option>
            {streams.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.grade} · {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={
            assign.isPending || !subject.trim() || !stream || !teacherId
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#101820] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus size={16} aria-hidden="true" />
          {assign.isPending ? "Assigning…" : "Assign class"}
        </button>
      </form>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5">
          <Users size={18} className="text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Teachers</h2>
        </div>
        {teachers.isLoading ? (
          <p className="p-5 text-sm text-slate-500">Loading teachers…</p>
        ) : !teachers.data?.length ? (
          <p className="p-5 text-sm text-slate-500">
            Add a teacher from the school dashboard first.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {teachers.data.map((t) => (
              <li
                key={t.id}
                className="grid gap-3 p-5 sm:grid-cols-[220px_1fr]"
              >
                <div>
                  <h3 className="text-sm font-medium">{t.name}</h3>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {t.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!t.teacherAssignments.length ? (
                    <span className="text-sm text-slate-400">
                      No assigned classes
                    </span>
                  ) : (
                    t.teacherAssignments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"
                      >
                        <span>
                          {a.subject} · {a.stream.grade} · {a.stream.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${a.subject} ${a.stream.name} from ${t.name}`}
                          disabled={remove.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove access to ${a.subject}, ${a.stream.name} for ${t.name}?`,
                              )
                            )
                              remove.mutate({ teacherId: t.id, id: a.id });
                          }}
                          className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <details className="rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-medium">
          Add a stream
        </summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="space-y-2 text-sm">
            Grade
            <select
              className={control}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(
                (g) => (
                  <option key={g}>{g}</option>
                ),
              )}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            Stream name
            <input
              required
              maxLength={40}
              className={control}
              placeholder="e.g. 1B"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button
            disabled={!name.trim() || create.isPending}
            className="rounded-lg bg-[#101820] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Add stream
          </button>
        </form>
      </details>
    </div>
  );
}
