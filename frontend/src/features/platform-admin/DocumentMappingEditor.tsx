import type { Mapping } from "../../api/ingestion.api";
const field =
  "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-sm";
const grades = [6, 7, 8, 9, 10, 11, 12].map((n) => `Grade ${n}`);
export function DocumentMappingEditor({
  value,
  onChange,
}: {
  value: Mapping;
  onChange: (m: Mapping) => void;
}) {
  const changeSubject = (
    index: number,
    change: Partial<Mapping["subjects"][number]>,
  ) =>
    onChange({
      ...value,
      subjects: value.subjects.map((s, i) =>
        i === index ? { ...s, ...change } : s,
      ),
    });
  return (
    <div className="space-y-5">
      <label className="block text-xs font-medium">
        Document type
        <select
          aria-label="Document type"
          className={field}
          value={value.role}
          onChange={(e) =>
            onChange({ ...value, role: e.target.value as Mapping["role"] })
          }
        >
          <option value="CURRICULUM">
            Curriculum design · establishes learning outcomes
          </option>
          <option value="TEACHING">
            Teaching reference · notes, textbook or revision
          </option>
          <option value="FRAMEWORK">
            General framework · proposes subject structure
          </option>
        </select>
      </label>
      <label className="block text-xs">
        Edition, uncertainty and source notes
        <textarea
          className={field}
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </label>
      {value.subjects.map((subject, i) => (
        <section
          key={i}
          className="space-y-4 rounded-xl border bg-slate-50 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              Grade
              <select
                aria-label={`Mapped grade ${i + 1}`}
                className={field}
                value={subject.grade}
                onChange={(e) => changeSubject(i, { grade: e.target.value })}
              >
                <option value="">Choose grade</option>
                {grades.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              Subject
              <input
                aria-label={`Mapped subject ${i + 1}`}
                className={field}
                value={subject.subject}
                onChange={(e) => changeSubject(i, { subject: e.target.value })}
              />
            </label>
          </div>
          <label className="block text-xs">
            Senior-school pathway, if applicable
            <input
              className={field}
              value={subject.pathway}
              onChange={(e) => changeSubject(i, { pathway: e.target.value })}
            />
          </label>
          <label className="block text-xs">
            Source excerpt supporting this grade and subject
            <textarea
              aria-label={`Subject evidence ${i + 1}`}
              className={field}
              rows={3}
              value={subject.evidence}
              onChange={(e) => changeSubject(i, { evidence: e.target.value })}
            />
          </label>
          {subject.units.map((u, j) => (
            <div className="space-y-3 rounded-lg border bg-white p-4" key={j}>
              <p className="text-xs font-semibold">Learning outcome {j + 1}</p>
              {(["strand", "subStrand", "outcome", "quote"] as const).map(
                (key) => (
                  <label key={key} className="block text-xs">
                    {key === "subStrand"
                      ? "Sub-strand"
                      : key === "quote"
                        ? "Exact curriculum quotation"
                        : key === "outcome"
                          ? "Specific learning outcome"
                          : "Strand"}
                    <textarea
                      className={field}
                      rows={key === "quote" ? 3 : 2}
                      value={u[key]}
                      onChange={(e) =>
                        changeSubject(i, {
                          units: subject.units.map((v, n) =>
                            n === j ? { ...v, [key]: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                ),
              )}
              <button
                type="button"
                className="text-xs text-red-700 underline"
                onClick={() =>
                  changeSubject(i, {
                    units: subject.units.filter((_, n) => n !== j),
                  })
                }
              >
                Remove this outcome
              </button>
            </div>
          ))}
          {value.role === "CURRICULUM" && (
            <button
              type="button"
              className="min-h-10 text-xs text-blue-700 underline"
              onClick={() =>
                changeSubject(i, {
                  units: [
                    ...subject.units,
                    { strand: "", subStrand: "", outcome: "", quote: "" },
                  ],
                })
              }
            >
              Add a missing quoted outcome
            </button>
          )}
          <button
            type="button"
            className="ml-3 text-xs text-red-700 underline"
            onClick={() =>
              onChange({
                ...value,
                subjects: value.subjects.filter((_, n) => n !== i),
              })
            }
          >
            Remove subject mapping
          </button>
        </section>
      ))}
      <button
        type="button"
        className="min-h-11 rounded-lg border px-4 text-sm"
        onClick={() =>
          onChange({
            ...value,
            subjects: [
              ...value.subjects,
              { grade: "", subject: "", pathway: "", evidence: "", units: [] },
            ],
          })
        }
      >
        Add subject mapping
      </button>
    </div>
  );
}
