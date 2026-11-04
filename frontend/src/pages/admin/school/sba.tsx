import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Upload,
  ClipboardCheck,
  TrendingUp,
  TriangleAlert,
  Award,
  HeartHandshake,
} from "lucide-react";
import { useAuthStore } from "../../../store/auth.store";
import { sbaApi } from "../../../api/sba.api";
import { ExternalMocksModal } from "./external-mocks-modal";
import { apiErrorMessage } from "../../../api/axios";

export function SbaScore({ value }: { value: number | null }) {
  return value === null ? (
    <span className="text-slate-400">—</span>
  ) : (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium tabular-nums ${value < 50 ? "bg-red-50 text-red-700" : value < 70 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}
    >
      {value.toFixed(1)}%
    </span>
  );
}
export default function SchoolSbaDashboard() {
  const [below50, setBelow50] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const actor = useAuthStore((s) => s.user);
  const report = useQuery({
    queryKey: ["sba-school", actor?.schoolId, actor?.id],
    queryFn: () => sbaApi.school(actor!.schoolId),
    enabled: !!actor,
  });
  const [filters, setFilters] = useState<Record<string, string>>({
    grade: "",
    stream: "",
    pathway: "",
    track: "",
  });
  const [exporting, setExporting] = useState(false),
    [error, setError] = useState("");
  const rows = (report.data?.rows ?? []).filter(
    (row) =>
      (!below50 || (row.csl_hours ?? 0) < 50) &&
      Object.entries(filters).every(
        ([key, value]) =>
          !value || String(row[key as keyof typeof row] ?? "") === value,
      ),
  );
  const complete = rows.filter((r) => r.projected !== null);
  const mean = complete.length
    ? complete.reduce((s, r) => s + r.projected!, 0) / complete.length
    : null;
  async function download() {
    setExporting(true);
    setError("");
    try {
      const blob = await sbaApi.csv(actor!.schoolId, {
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        ...(below50 ? { csl_below50: "true" } : {}),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sba-projections.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiErrorMessage(e, "Export failed."));
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#101820]">
            School assessments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Senior school · SBA and mock projections
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium"
          >
            <Upload size={16} aria-hidden="true" />
            Import External Mocks
          </button>
          <button
            onClick={() => void download()}
            disabled={exporting || !report.data || report.isError}
            className="inline-flex items-center gap-2 rounded-lg bg-[#101820] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Download size={16} aria-hidden="true" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </header>
      {(report.error || error) && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {error ||
            apiErrorMessage(report.error, "Could not load assessments.")}{" "}
          <button
            onClick={() => void report.refetch()}
            className="ml-2 underline"
          >
            Try again
          </button>
        </div>
      )}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "School-wide CSL completion",
            value: `${report.data?.summary.csl_completion_rate ?? 0}%`,
            icon: HeartHandshake,
          },
          {
            title: "Average projected score",
            value: mean === null ? "—" : `${mean.toFixed(1)}%`,
            icon: TrendingUp,
          },
          {
            title: "Students below 50%",
            value: complete.filter((r) => r.projected! < 50).length,
            icon: TriangleAlert,
          },
          {
            title: "Top performers · 70%+",
            value: complete.filter((r) => r.projected! >= 70).length,
            icon: Award,
          },
        ].map(({ title, value, icon: Icon }) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{title}</span>
              <Icon size={17} aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[#101820]">
              {report.isLoading ? "—" : value}
            </p>
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {["grade", "stream", "pathway", "track"].map((key) => (
            <label
              key={key}
              className="text-xs font-medium capitalize text-slate-600"
            >
              {key}
              <select
                aria-label={`Filter ${key}`}
                value={filters[key]}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
              >
                <option value="">
                  All {key === "grade" ? "grades" : key + "s"}
                </option>
                {[
                  ...new Set(
                    (report.data?.rows ?? [])
                      .map((r) => String(r[key as keyof typeof r] ?? ""))
                      .filter(Boolean),
                  ),
                ]
                  .sort()
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs text-slate-500">
          <span>
            {rows.length} learners · {complete.length} complete projections
          </span>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={below50}
              onChange={(e) => setBelow50(e.target.checked)}
            />
            Students below 50 CSL hours
          </label>
          <span>G10 SBA 15% · G11 SBA 15% · Grade 12 mock 70%</span>
        </div>
        {report.isLoading ? (
          <p role="status" className="p-8 text-sm text-slate-500">
            Loading assessments…
          </p>
        ) : !rows.length ? (
          <div className="p-10 text-center">
            <ClipboardCheck
              className="mx-auto mb-3 text-slate-400"
              size={28}
              aria-hidden="true"
            />
            <p className="text-sm text-slate-600">
              {report.isError
                ? "Assessments are unavailable."
                : "No senior-school learners match these filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-xs text-slate-500">
                <tr>
                  {[
                    "Student",
                    "Grade / stream",
                    "G10 SBA",
                    "G11 SBA",
                    "Internal Mock",
                    "External Mock",
                    "Best Mock",
                    "Projected",
                    "Indicative band",
                    "CSL Hours",
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-5 py-3 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.student_id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#101820]">{r.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {r.admission_number ?? "No admission number"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                      {r.grade} · {r.stream ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <SbaScore value={r.grade10_sba} />
                    </td>
                    <td className="px-5 py-4">
                      <SbaScore value={r.grade11_sba} />
                    </td>
                    <td className="px-5 py-4">
                      <SbaScore value={r.internal_mock ?? null} />
                    </td>
                    <td className="px-5 py-4">
                      <SbaScore value={r.external_mock ?? null} />
                    </td>
                    <td className="px-5 py-4">
                      <SbaScore value={r.kcbe_mock} />
                    </td>
                    <td className="px-5 py-4">
                      {r.projected === null ? (
                        <span className="whitespace-nowrap text-xs text-slate-400">
                          {r.evidence_components}/3 evidence sets
                        </span>
                      ) : (
                        <SbaScore value={r.projected} />
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {r.predicted_grade ?? "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-4 text-xs font-medium ${(r.csl_hours ?? 0) < 50 ? "text-red-700" : "text-emerald-700"}`}
                    >
                      {r.csl_hours ?? 0}/{report.data?.csl_target ?? 135}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-500">
        Calculated using best of External Mock OR Internal Mock (Grade 12
        averages).
      </p>
      {importOpen && (
        <ExternalMocksModal
          onClose={() => setImportOpen(false)}
          onImported={() => void report.refetch()}
        />
      )}
      <p className="text-xs leading-5 text-slate-500">
        Internal planning projection, not an official KCBE result. Missing
        evidence is excluded, never treated as zero. The CSV is an internal
        export; an official KNEC upload format has not been verified.
      </p>
    </div>
  );
}
