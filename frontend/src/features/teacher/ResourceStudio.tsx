import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, FileUp, Package, Plus, Send } from 'lucide-react';
import { apiErrorMessage } from '../../api/axios';
import {
  resourcesApi,
  type CreateResourceInput,
  type ResourceFulfillment,
  type ResourceListingType,
} from '../../api/resources.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

const initialForm: CreateResourceInput = {
  title: '',
  description: '',
  type: 'NOTES',
  fulfillment: 'DIGITAL_DOWNLOAD',
  subject: '',
  grade: '',
  priceKES: 0,
};

const MAX_RESOURCE_FILE_SIZE = 25 * 1024 * 1024;

function validateResourceFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Select a PDF document.';
  if (file.size > MAX_RESOURCE_FILE_SIZE) return 'The PDF must be 25 MB or smaller.';
  return null;
}

function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ResourceStudioPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateResourceInput>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const listingsQuery = useQuery({ queryKey: ['seller-resources'], queryFn: resourcesApi.myListings });
  const summaryQuery = useQuery({ queryKey: ['seller-resource-summary'], queryFn: resourcesApi.sellerSummary });

  const createMutation = useMutation({
    mutationFn: async () => {
      let fileFields: Partial<CreateResourceInput> = {};
      if (form.fulfillment === 'DIGITAL_DOWNLOAD') {
        if (!file) throw new Error('Select a PDF file');
        const fileError = validateResourceFile(file);
        if (fileError) throw new Error(fileError);
        const uploaded = await resourcesApi.upload(file);
        fileFields = { assetKey: uploaded.assetKey, fileName: uploaded.filename, fileSize: uploaded.size };
      }
      return resourcesApi.create({ ...form, ...fileFields, stockQuantity: form.fulfillment === 'PHYSICAL_DELIVERY' ? form.stockQuantity ?? 0 : undefined });
    },
    onSuccess: async () => {
      setForm(initialForm);
      setFile(null);
      setCreating(false);
      setStatus('Resource saved as a draft. Publish it when ready.');
      await queryClient.invalidateQueries({ queryKey: ['seller-resources'] });
    },
    onError: (error) => setStatus(apiErrorMessage(error, error instanceof Error ? error.message : 'Resource could not be saved')),
  });

  const publishMutation = useMutation({
    mutationFn: resourcesApi.publish,
    onSuccess: async () => { setStatus('Resource published.'); await queryClient.invalidateQueries({ queryKey: ['seller-resources'] }); },
    onError: (error) => setStatus(apiErrorMessage(error, 'Resource could not be published')),
  });
  const archiveMutation = useMutation({
    mutationFn: resourcesApi.archive,
    onSuccess: async () => { setStatus('Resource archived.'); await queryClient.invalidateQueries({ queryKey: ['seller-resources'] }); },
    onError: (error) => setStatus(apiErrorMessage(error, 'Resource could not be archived')),
  });

  const summary = summaryQuery.data;
  return (
    <div className="space-y-5 pb-12">
      <PageHeader title="Resource Studio" actions={<button type="button" onClick={() => setCreating((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />New resource</button>} />

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard compact label="Published resources" value={(listingsQuery.data ?? []).filter((item) => item.status === 'PUBLISHED').length} />
        <MetricCard compact label="Confirmed sales" value={summary?.confirmedSales ?? 0} />
        <MetricCard compact label="Your share" value={`KES ${(summary?.sellerShareKES ?? 0).toLocaleString()}`} />
      </section>

      {creating ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
            <Select label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value as ResourceListingType })} options={['NOTES', 'ESSAY', 'REVISION_GUIDE', 'STUDY_GUIDE', 'TOOLKIT']} />
            <Select label="Delivery" value={form.fulfillment} onChange={(value) => setForm({ ...form, fulfillment: value as ResourceFulfillment })} options={['DIGITAL_DOWNLOAD', 'PHYSICAL_DELIVERY']} />
            <Input label="Price (KES)" type="number" value={String(form.priceKES)} onChange={(value) => setForm({ ...form, priceKES: Math.max(0, Number(value) || 0) })} />
            <Input label="Subject" value={form.subject ?? ''} onChange={(value) => setForm({ ...form, subject: value })} />
            <Input label="Grade / Form" value={form.grade ?? ''} onChange={(value) => setForm({ ...form, grade: value })} />
            {form.fulfillment === 'PHYSICAL_DELIVERY' ? <Input label="Stock quantity" type="number" value={String(form.stockQuantity ?? 0)} onChange={(value) => setForm({ ...form, stockQuantity: Math.max(0, Number(value) || 0) })} /> : (
              <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">PDF file</span><span className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-sm text-slate-600"><FileUp className="h-4 w-4" /><input type="file" accept="application/pdf,.pdf" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); setStatus(selected ? validateResourceFile(selected) : null); }} className="min-w-0 flex-1 text-sm" /></span>{file ? <span className="mt-1.5 block text-xs text-slate-500">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span> : null}</label>
            )}
          </div>
          <label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">Description</span><textarea value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-[#101820]" /></label>
          <div className="mt-4 flex justify-end"><button type="button" disabled={!form.title.trim() || createMutation.isPending} onClick={() => createMutation.mutate()} className="min-h-11 rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] disabled:opacity-50">{createMutation.isPending ? 'Saving...' : 'Save draft'}</button></div>
        </section>
      ) : null}

      {status ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{status}</p> : null}

      {listingsQuery.isLoading ? <EmptyState title="Loading resources..." /> : !(listingsQuery.data ?? []).length ? <EmptyState title="No resources created yet." /> : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-[#101820]">Your listings</h2></div>
          <div className="divide-y divide-slate-100">
            {(listingsQuery.data ?? []).map((resource) => (
              <div key={resource.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">{resource.fulfillment === 'PHYSICAL_DELIVERY' ? <Package className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#101820]">{resource.title}</p><p className="mt-1 text-xs text-slate-500">{label(resource.type)} · KES {resource.priceKES.toLocaleString()} · {resource._count?.purchases ?? 0} orders</p></div></div>
                <div className="flex items-center gap-2"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{label(resource.status)}</span>{resource.status === 'DRAFT' ? <button type="button" onClick={() => publishMutation.mutate(resource.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#101820] px-3 text-xs font-semibold text-white"><Send className="h-4 w-4" />Publish</button> : null}{resource.status !== 'ARCHIVED' ? <button type="button" onClick={() => archiveMutation.mutate(resource.id)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200" aria-label={`Archive ${resource.title}`}><Archive className="h-4 w-4" /></button> : null}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Input({ label: fieldLabel, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">{fieldLabel}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-base outline-none focus:border-[#101820]" /></label>;
}

function Select({ label: fieldLabel, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-500">{fieldLabel}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base outline-none">{options.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select></label>;
}
