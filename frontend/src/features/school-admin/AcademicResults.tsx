import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { academicResultsApi } from '../../api/academic-results.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, PageHeader } from '../../components/ui/Saas';

export function AcademicResults() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', academicYear: new Date().getFullYear(), term: '', grade: '', className: '', stream: '' });
  const [message, setMessage] = useState<string | null>(null);
  const batches = useQuery({ queryKey: ['academic-results', 'batches'], queryFn: academicResultsApi.batches });
  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Select a results file');
      const payload = new FormData();
      payload.append('file', file);
      Object.entries(form).forEach(([key, value]) => { if (value !== '') payload.append(key, String(value)); });
      return academicResultsApi.importResults(payload);
    },
    onSuccess: async (result) => {
      setMessage(`${result.summary.imported} results imported${result.summary.failed ? `, ${result.summary.failed} rows need attention` : ''}.`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await queryClient.invalidateQueries({ queryKey: ['academic-results'] });
    },
    onError: (error) => setMessage(apiErrorMessage(error, error instanceof Error ? error.message : 'Import failed')),
  });
  const canImport = Boolean(file && form.name.trim() && form.term.trim() && form.grade.trim());

  return (
    <div className="space-y-5 pb-12">
      <PageHeader title="Academic Results" meta={`${batches.data?.length ?? 0} result batches`} />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={(event) => { event.preventDefault(); setMessage(null); upload.mutate(); }} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="font-semibold text-[#101820]">Import results</h2><p className="mt-1 text-xs text-slate-500">Excel and CSV files are supported.</p></div>
            <button type="button" onClick={() => void academicResultsApi.downloadTemplate()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-[#101820]"><Download className="h-4 w-4" />Template</button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Result set name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Form 4 Term 2" />
            <Field label="Academic year" value={String(form.academicYear)} onChange={(value) => setForm({ ...form, academicYear: Number(value) })} type="number" />
            <Field label="Term" value={form.term} onChange={(value) => setForm({ ...form, term: value })} placeholder="Term 2" />
            <Field label="Grade / form" value={form.grade} onChange={(value) => setForm({ ...form, grade: value })} placeholder="Grade 10" />
            <Field label="Class" value={form.className} onChange={(value) => setForm({ ...form, className: value })} placeholder="Optional" />
            <Field label="Stream" value={form.stream} onChange={(value) => setForm({ ...form, stream: value })} placeholder="Optional" />
          </div>
          <label className="mt-4 flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 hover:border-slate-400">
            <FileSpreadsheet className="h-6 w-6 text-slate-400" strokeWidth={1.6} />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#101820]">{file?.name ?? 'Select results file'}</span><span className="mt-1 block text-xs text-slate-500">.xlsx, .xls or .csv · maximum 15 MB</span></span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          {message ? <p role="status" className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</p> : null}
          <button disabled={!canImport || upload.isPending} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500"><Upload className="h-4 w-4" />{upload.isPending ? 'Importing...' : 'Import results'}</button>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-[#101820]">Required columns</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {['Admission Number', 'Subject', 'Score', 'Max Score'].map((item) => <div key={item} className="rounded-xl bg-slate-50 px-4 py-3">{item}</div>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Wide files are also accepted: keep Admission Number first, then use each subject as a score column.</p>
        </section>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-[#101820]">Import history</h2>
        {batches.isLoading ? <EmptyState title="Loading results..." /> : !batches.data?.length ? <EmptyState title="No results uploaded yet." /> : (
          <div className="divide-y divide-slate-100">
            {batches.data.map((batch) => <div key={batch.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#101820]">{batch.name}</p><p className="mt-1 text-xs text-slate-500">{[batch.grade, batch.stream, batch.term, batch.academicYear].filter(Boolean).join(' · ')}</p></div><span className="text-sm font-semibold tabular-nums text-slate-600">{batch.rowCount} results</span></div>)}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label><span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={!placeholder?.includes('Optional')} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#101820]" /></label>;
}
