import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileCheck2, Upload } from "lucide-react";
import { api, apiErrorMessage } from "../../../api/axios";
import { PageHeader } from "../../../components/ui/Saas";
type Row = {
  id: string;
  code: string;
  pathway: string;
  track: string;
  subjects: string[];
  source_url: string;
  verified_at: string;
};
export default function CombinationCatalog() {
  const client = useQueryClient(),
    catalog = useQuery({
      queryKey: ["moe-catalog"],
      queryFn: () => api.get<Row[]>("/career/combinations").then((r) => r.data),
    });
  const [source, setSource] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [rows, setRows] = useState<unknown[]>([]),
    [message, setMessage] = useState(""),
    [validated, setValidated] = useState(false);
  const archive = useMutation({
    mutationFn: (id: string) => api.delete(`/career/combinations/${id}`),
    onSuccess: () => {
      setMessage(
        "Combination unpublished; existing shortlists were preserved.",
      );
      void client.invalidateQueries({ queryKey: ["moe-catalog"] });
    },
    onError: (e) =>
      setMessage(apiErrorMessage(e, "Could not unpublish combination.")),
  });
  const upload = useMutation({
    mutationFn: (dry_run: boolean) =>
      api
        .post<{ records?: number; imported?: number }>(
          "/career/combinations/import",
          { source_url: source, reviewed, combinations: rows, dry_run },
        )
        .then((r) => r.data),
    onSuccess: (data, dry) => {
      setValidated(dry);
      setMessage(
        dry
          ? `${data.records} records validated. Review the source, then publish the catalogue.`
          : `${data.imported} combinations published.`,
      );
      if (!dry) void client.invalidateQueries({ queryKey: ["moe-catalog"] });
    },
    onError: (e) => {
      setValidated(false);
      setMessage(apiErrorMessage(e, "Could not validate this catalogue."));
    },
  });
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Grade 10 subject combinations" />
      <Link
        to="/platform/cms"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600"
      >
        ← Content Library
      </Link>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Import one complete catalogue</h2>
        <p className="text-sm leading-6 text-slate-500">
          Upload a JSON array of code, pathway, track and three subjects per
          record. Review it against the official Ministry/KEMIS/KICD source.
          Counts reflect imported records; no national coverage is assumed.
        </p>
        <label className="block text-sm">
          Official source page
          <input
            type="url"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setValidated(false);
              setReviewed(false);
            }}
            placeholder="https://…education.go.ke/…"
            className="mt-2 block min-h-11 w-full rounded-lg border border-slate-200 px-3"
          />
        </label>
        <input
          aria-label="Catalogue JSON file"
          type="file"
          accept=".json,application/json"
          className="block w-full text-sm"
          onChange={async (e) => {
            setValidated(false);
            setReviewed(false);
            setRows([]);
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              setMessage("Use a JSON file under 2 MB.");
              return;
            }
            try {
              const raw = JSON.parse(await file.text());
              const records = Array.isArray(raw) ? raw : raw.combinations;
              if (!Array.isArray(records)) throw Error();
              setRows(records);
              setMessage(`${records.length} records loaded for validation.`);
            } catch {
              setMessage("Could not read a combination JSON array.");
            }
          }}
        />
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="mt-1"
          />
          I reviewed these records against the official source; they are not
          AI-generated combination codes.
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => upload.mutate(true)}
            disabled={!rows.length || !source || upload.isPending}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold disabled:opacity-40"
          >
            <FileCheck2 size={16} />
            Validate without publishing
          </button>
          <button
            onClick={() => upload.mutate(false)}
            disabled={!validated || !reviewed || upload.isPending}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#101820] px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Upload size={16} />
            Publish catalogue
          </button>
        </div>
        {message && (
          <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm">
            {message}
          </p>
        )}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">
          Published combinations · {catalog.data?.length ?? 0}
        </h2>
        {catalog.isError ? (
          <p role="alert" className="mt-4 text-sm">
            The catalogue is unavailable. Try again shortly.
          </p>
        ) : catalog.isPending ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : !catalog.data.length ? (
          <p className="mt-4 text-sm text-slate-500">
            No official combination data has been imported. Grade 9 learners can
            still use published pathway exploration.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {catalog.data.map((row) => (
              <article key={row.id} className="py-4">
                <p className="text-sm font-semibold">
                  {row.code} · {row.subjects.join(" · ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.pathway} · {row.track}
                </p>
                <a
                  href={row.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-[#526b00]"
                >
                  Official source →
                </a>
                <button
                  type="button"
                  disabled={archive.isPending}
                  onClick={() => archive.mutate(row.id)}
                  className="ml-4 min-h-9 text-xs font-medium text-slate-500 underline"
                >
                  Unpublish
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
