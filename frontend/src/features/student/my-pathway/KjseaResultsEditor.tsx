import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Plus } from "lucide-react";
import { api, apiErrorMessage } from "../../../api/axios";
import { useAuthStore } from "../../../store/auth.store";
type Entry = {
  subject: string;
  percentage?: number;
  performance_level?: string;
};
type RecordData = {
  results: Entry[];
  source: string | null;
  updated_at: string | null;
};
const levels = [
  "EE1",
  "EE2",
  "ME1",
  "ME2",
  "AE1",
  "AE2",
  "BE1",
  "BE2",
  "EE",
  "ME",
  "AE",
  "BE",
];
const baseSubjects = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Integrated Science",
  "Pre-Technical Studies",
  "Agriculture and Nutrition",
  "Social Studies",
  "Creative Arts and Sports",
  "Religious Education",
];
export function KjseaResultsEditor() {
  const user = useAuthStore((s) => s.user),
    client = useQueryClient();
  const key = ["grade9-results", user?.id],
    query = useQuery({
      queryKey: key,
      queryFn: () =>
        api.get<RecordData>("/career/kjsea-results").then((r) => r.data),
      staleTime: 300000,
    });
  const [edited, setEdited] = useState<Record<string, Entry> | null>(null),
    [extra, setExtra] = useState<string[]>([]),
    [other, setOther] = useState(""),
    [message, setMessage] = useState("");
  const saved = Object.fromEntries(
      (query.data?.results ?? []).map((r) => [r.subject, r]),
    ),
    rows = edited ?? saved,
    subjects = [...new Set([...baseSubjects, ...Object.keys(rows), ...extra])];
  const entries = Object.values(rows).filter(
    (r) => typeof r.percentage === "number" || r.performance_level,
  );
  const save = useMutation({
    mutationFn: () =>
      api
        .put<RecordData>("/career/kjsea-results", { results: entries })
        .then((r) => r.data),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      setEdited(null);
      setMessage(
        data.results.length
          ? "Results saved. Performance levels have not been converted into percentages."
          : "Saved results cleared.",
      );
      void client.invalidateQueries({ queryKey: ["grade10-guide", user?.id] });
    },
    onError: (e) =>
      setMessage(apiErrorMessage(e, "Could not save your results.")),
  });
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold">
        Grade 9 results · {query.data?.results.length ?? 0} saved subjects
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="mt-4 space-y-4"
      >
        <p className="text-xs leading-6 text-slate-500">
          Copy the performance level or percentage shown on your school/KJSEA
          report. Choose one per subject. These entries are self-reported; they
          do not certify eligibility.
        </p>
        {query.isPending ? (
          <p className="text-sm text-slate-500">Loading saved results…</p>
        ) : query.isError ? (
          <p role="alert" className="text-sm text-amber-800">
            Saved results are unavailable. Refresh before replacing existing
            results.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {subjects.map((subject) => (
              <fieldset key={subject}>
                <legend className="mb-2 text-xs font-medium text-slate-600">
                  {subject}
                </legend>
                <div className="flex gap-2">
                  <select
                    aria-label={`${subject} saved level`}
                    value={rows[subject]?.performance_level ?? ""}
                    onChange={(e) =>
                      setEdited({
                        ...rows,
                        [subject]: {
                          subject,
                          ...(e.target.value
                            ? { performance_level: e.target.value }
                            : {}),
                        },
                      })
                    }
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                  >
                    <option value="">Performance level</option>
                    {levels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                  <input
                    aria-label={`${subject} saved percentage`}
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    placeholder="%"
                    value={rows[subject]?.percentage ?? ""}
                    onChange={(e) =>
                      setEdited({
                        ...rows,
                        [subject]: {
                          subject,
                          ...(e.target.value !== ""
                            ? { percentage: Number(e.target.value) }
                            : {}),
                        },
                      })
                    }
                    className="min-h-11 w-24 rounded-lg border border-slate-200 px-3 text-sm"
                  />
                </div>
              </fieldset>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Other report subject"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            maxLength={100}
            placeholder="Another subject on your report"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (other.trim().length >= 2) {
                setExtra([...extra, other.trim()]);
                setOther("");
              }
            }}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <Plus size={15} />
            Add subject
          </button>
        </div>
        <button
          disabled={
            query.isError ||
            query.isPending ||
            (!entries.length && edited === null) ||
            save.isPending
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#101820] px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Save size={16} />
          {save.isPending ? "Saving…" : "Save Grade 9 results"}
        </button>
        {message && (
          <p role="status" className="text-sm leading-6 text-slate-600">
            {message}
          </p>
        )}
      </form>
    </details>
  );
}
