import { useAuthStore } from "../../store/auth.store";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../../api/axios";
import { subjectKey } from "../../../../backend/src/student/student-scope.policy";
import { CORE_ASSIGNMENT_SUBJECTS } from "../../../../backend/src/student/assignment-subjects";
export interface SubjectChoice {
  track_id?: number;
  elective_subjects: string[];
}
interface Options {
  grade: number;
  subjects: string[];
  core_subjects: string[];
  recommendations: {
    subject: string;
    pathway: string | null;
    track: string | null;
  }[];
  tracks: { id: number; name: string; pathway: string }[];
}
export function SubjectSelectionFields({
  grade,
  pathway,
  value,
  onChange,
  currentTrack,
}: {
  grade: number;
  pathway?: string;
  currentTrack?:{id:number;name:string;pathway:string}|null;
  value: SubjectChoice;
  onChange: (v: SubjectChoice) => void;
}) {
  const data = useQuery({
    queryKey: ["subject-options", grade],
    enabled: grade >= 10 && grade <= 12,
    queryFn: () =>
      api
        .get<Options>(`/student/subject-options?grade=${grade}`)
        .then((r) => r.data),
    retry: false,
  });
  const options = data.data,
    tracks = [...(options?.tracks ?? []),...(currentTrack && !options?.tracks.some(t=>t.id===currentTrack.id)?[currentTrack]:[])].filter(
      (t) => !pathway || t.pathway === pathway,
    ),
    selected = tracks.find((t) => t.id === value.track_id);
  const subjects = (options?.subjects ?? []).filter(
    (s) =>
      !CORE_ASSIGNMENT_SUBJECTS.some((c) => subjectKey(c) === subjectKey(s)),
  );
  const recommended = new Set(
    (options?.recommendations ?? [])
      .filter(
        (r) =>
          selected &&
          r.track === selected.name &&
          r.pathway === selected.pathway,
      )
      .map((r) => subjectKey(r.subject)),
  );
  if (data.isPending)
    return (
      <p role="status" className="text-sm text-slate-500">
        Loading subject choices…
      </p>
    );
  if (data.isError)
    return (
      <p role="alert" className="text-sm text-amber-900">
        {apiErrorMessage(
          data.error,
          "Subject choices could not load. Please retry.",
        )}
      </p>
    );
  const group = (label: string, items: string[]) => (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-semibold text-slate-500">
        {label}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((s) => {
          const checked = value.elective_subjects.some(
            (v) => subjectKey(v) === subjectKey(s),
          );
          return (
            <label
              key={s}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${checked ? "border-[#8ca42d] bg-[#f5f7ed]" : "border-slate-200 bg-white"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && value.elective_subjects.length >= 3}
                onChange={() =>
                  onChange({
                    ...value,
                    elective_subjects: checked
                      ? value.elective_subjects.filter(
                          (v) => subjectKey(v) !== subjectKey(s),
                        )
                      : [...value.elective_subjects, s],
                  })
                }
              />
              {s}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Track
        <select
          aria-label="Senior school track"
          value={value.track_id ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              track_id: Number(e.target.value) || undefined,
            })
          }
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
        >
          <option value="">Choose your track</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.pathway} · {t.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <p className="mb-2 text-sm font-semibold">
          Electives{" "}
          <span className="font-normal text-slate-500">
            {value.elective_subjects.length}/3
          </span>
        </p>
        <p className="text-xs text-slate-500">
          Core subjects are included. Choose three electives; another track’s
          subject is allowed.
        </p>
      </div>
      <p className="text-xs text-slate-500">Core: {CORE_ASSIGNMENT_SUBJECTS.join(" · ")}</p>
      {selected &&
        group(
          "Your track",
          subjects.filter((s) => recommended.has(subjectKey(s))),
        )}
      {group(
        selected ? "Other electives" : "Available electives",
        subjects.filter((s) => !selected || !recommended.has(subjectKey(s))),
      )}
    </div>
  );
}
export function AssignmentSubjectSetup({ grade }: { grade: number }) {
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const current = useQuery({
    queryKey: ["my-enrolled-subjects", user?.id, user?.schoolId],
    queryFn: () =>
      api
        .get<{ elective_subjects: string[]; track_id: number | null; current_track?:{id:number;name:string;pathway:string}|null }>(
          "/student/subjects",
        )
        .then((r) => r.data),
    retry: false,
  });
  const [open, setOpen] = useState(false),
    [value, setValue] = useState<SubjectChoice>({ elective_subjects: [] });
  useEffect(() => {
    if (current.data)
      setValue({
        track_id: current.data.track_id ?? undefined,
        elective_subjects: current.data.elective_subjects,
      });
  }, [current.data]);
  const save = useMutation({
    mutationFn: () => api.post("/student/subjects", value),
    onSuccess: (response) => {
      client.setQueryData(
        ["student-content-scope", user?.id, user?.schoolId],
        (old: any) =>
          old
            ? {
                ...old,
                elective_subjects: response.data.elective_subjects,
                assignment_subjects: [
                  ...CORE_ASSIGNMENT_SUBJECTS,
                  ...response.data.elective_subjects,
                ],
                assignment_setup_required: false,
              }
            : old,
      );
      setOpen(false);
      void client.invalidateQueries();
    },
  });
  if (grade < 10) return null;
  const incomplete = current.data?.elective_subjects.length !== 3;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">
            {incomplete
              ? "Choose your three electives"
              : "Your electives"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {current.data?.elective_subjects.join(" · ") ||
              "Core subjects only until electives are saved."}
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium"
        >
          {open ? "Close" : "Manage subjects"}
        </button>
      </div>
      {current.isError && (
        <p role="alert" className="mt-3 text-xs text-amber-900">
          {apiErrorMessage(current.error, "Your subjects could not load.")}
        </p>
      )}
      {open && (
        <div className="mt-5 space-y-4">
          <SubjectSelectionFields
            grade={grade}
            currentTrack={current.data?.current_track}
            value={value}
            onChange={setValue}
          />
          {save.isError && (
            <p role="alert" className="text-sm text-amber-900">
              {apiErrorMessage(save.error, "Subjects could not be saved.")}
            </p>
          )}
          <button
            disabled={save.isPending || value.elective_subjects.length !== 3}
            onClick={() => save.mutate()}
            className="rounded-lg bg-[#101820] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save subjects"}
          </button>
        </div>
      )}
    </section>
  );
}
