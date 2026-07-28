import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mnemonicCardsApi,
  type MnemonicCardInput,
} from '../../api/mnemonic-cards.api';
import { apiErrorMessage } from '../../api/axios';
import { uploadsApi } from '../../api/uploads.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import type { MnemonicCard } from '../../types';

const GRADES = [6, 7, 8, 9, 10, 11, 12];
const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-[#101820] outline-none focus:border-[#101820] focus:ring-2 focus:ring-[#B5E61D]/30';

interface CardDraft {
  title: string;
  subject: string;
  topic: string;
  grade: string;
  description: string;
  pdfUrl: string;
  fileName: string;
  fileSize: number | null;
  isPublished: boolean;
  displayOrder: string;
}

const emptyDraft: CardDraft = {
  title: '',
  subject: '',
  topic: '',
  grade: '',
  description: '',
  pdfUrl: '',
  fileName: '',
  fileSize: null,
  isPublished: false,
  displayOrder: '0',
};

function formatFileSize(size: number | null) {
  if (!size) return 'Size unavailable';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MnemonicCardsStudio() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<CardDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cardsQuery = useQuery({
    queryKey: ['mnemonic-cards', 'admin'],
    queryFn: () => mnemonicCardsApi.findAll(),
  });
  const summaryQuery = useQuery({
    queryKey: ['mnemonic-cards', 'summary'],
    queryFn: mnemonicCardsApi.getAdminSummary,
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['mnemonic-cards', 'admin'] }),
      queryClient.invalidateQueries({ queryKey: ['mnemonic-cards', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['mnemonic-cards'] }),
    ]);
  }

  function resetForm() {
    setDraft(emptyDraft);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const isPdfName = file.name.toLowerCase().endsWith('.pdf');
      const isPdfType = !file.type || file.type === 'application/pdf';
      if (!isPdfName || !isPdfType) throw new Error('Select a PDF file.');
      if (file.size > 15 * 1024 * 1024) throw new Error('The PDF must be 15 MB or smaller.');
      return uploadsApi.uploadSingle(file);
    },
    onSuccess: (result) => {
      setDraft((current) => ({
        ...current,
        pdfUrl: result.url,
        fileName: result.filename,
        fileSize: result.size,
      }));
      setNotice('PDF uploaded and ready to save.');
    },
    onError: (error) => setNotice(apiErrorMessage(error, 'Could not upload the PDF')),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!draft.title.trim() || !draft.subject.trim() || !draft.topic.trim() || !draft.pdfUrl) {
        throw new Error('Title, subject, topic, and PDF are required.');
      }
      const payload: MnemonicCardInput = {
        title: draft.title.trim(),
        subject: draft.subject.trim(),
        topic: draft.topic.trim(),
        grade: draft.grade || null,
        description: draft.description.trim() || null,
        pdfUrl: draft.pdfUrl,
        fileName: draft.fileName,
        fileSize: draft.fileSize ?? undefined,
        isPublished: draft.isPublished,
        displayOrder: Number(draft.displayOrder) || 0,
      };
      return editingId
        ? mnemonicCardsApi.update(editingId, payload)
        : mnemonicCardsApi.create(payload);
    },
    onSuccess: async () => {
      setNotice(editingId ? 'Mnemonic card updated.' : 'Mnemonic card created.');
      resetForm();
      await refresh();
    },
    onError: (error) => setNotice(apiErrorMessage(error, 'Could not save the mnemonic card')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: number; isPublished: boolean }) =>
      mnemonicCardsApi.update(id, { isPublished }),
    onSuccess: refresh,
    onError: (error) => setNotice(apiErrorMessage(error, 'Could not update publication status')),
  });

  const removeMutation = useMutation({
    mutationFn: mnemonicCardsApi.remove,
    onSuccess: async () => {
      setNotice('Mnemonic card deleted.');
      await refresh();
    },
    onError: (error) => setNotice(apiErrorMessage(error, 'Could not delete the mnemonic card')),
  });

  function editCard(card: MnemonicCard) {
    setEditingId(card.id);
    setDraft({
      title: card.title,
      subject: card.subject,
      topic: card.topic,
      grade: card.grade ?? '',
      description: card.description ?? '',
      pdfUrl: card.pdfUrl,
      fileName: card.fileName,
      fileSize: card.fileSize,
      isPublished: card.isPublished,
      displayOrder: String(card.displayOrder),
    });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const summary = summaryQuery.data;
  const cards = cardsQuery.data ?? [];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Mnemonic Cards Studio" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total cards" value={summary?.total ?? '-'} compact />
        <MetricCard label="Published" value={summary?.published ?? '-'} compact />
        <MetricCard label="Drafts" value={summary?.drafts ?? '-'} compact />
        <MetricCard label="Subjects" value={summary?.subjects ?? '-'} compact />
      </section>

      {notice ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{notice}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="self-start rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(16,24,32,0.05)] xl:sticky xl:top-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#101820]">{editingId ? 'Edit card' : 'Add mnemonic card'}</h2>
            {editingId ? (
              <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-500">Cancel edit</button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2">
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Card title" className={inputClass} />
            </Field>
            <Field label="Subject">
              <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="e.g. Biology" className={inputClass} />
            </Field>
            <Field label="Topic">
              <input value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} placeholder="e.g. Cell division" className={inputClass} />
            </Field>
            <Field label="Grade">
              <select value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} className={inputClass}>
                <option value="">All grades</option>
                {GRADES.map((grade) => <option key={grade} value={`Grade ${grade}`}>Grade {grade}</option>)}
              </select>
            </Field>
            <Field label="Display order">
              <input type="number" min="0" value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Optional short description" className={inputClass} />
            </Field>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-[#F8FAFC] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#101820] text-[#B5E61D]"><PdfIcon /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#101820]">{draft.fileName || 'Upload PDF graphic'}</p>
                <p className="mt-1 text-xs text-slate-400">{draft.fileSize ? formatFileSize(draft.fileSize) : 'PDF only, maximum 15 MB'}</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#101820] disabled:opacity-50"
              >
                {uploadMutation.isPending ? 'Uploading...' : draft.pdfUrl ? 'Replace' : 'Choose'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
            />
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} />
            <span className="text-sm font-semibold text-[#101820]">Publish for students</span>
          </label>

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || uploadMutation.isPending}
            className="mt-4 w-full rounded-xl bg-[#B5E61D] px-4 py-3 text-sm font-semibold text-[#101820] disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : editingId ? 'Update card' : 'Save card'}
          </button>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-[#101820]">Card library</h2>
          </div>
          {cardsQuery.isLoading ? (
            <div className="p-5"><EmptyState title="Loading mnemonic cards..." /></div>
          ) : cardsQuery.error ? (
            <div className="p-5"><EmptyState title={apiErrorMessage(cardsQuery.error, 'Could not load mnemonic cards')} /></div>
          ) : cards.length === 0 ? (
            <div className="p-5"><EmptyState title="No mnemonic cards yet" /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cards.map((card) => (
                <article key={card.id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#101820]">{card.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${card.isPublished ? 'bg-[#EAF7C8] text-[#3F5B00]' : 'bg-slate-100 text-slate-500'}`}>
                          {card.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{card.subject} · {card.topic} · {card.grade ?? 'All grades'}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{card.fileName} · {formatFileSize(card.fileSize)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => editCard(card)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-[#101820]">Edit</button>
                      <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: card.id, isPublished: !card.isPublished })}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-[#101820] disabled:opacity-50"
                      >
                        {card.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        disabled={removeMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete "${card.title}"?`)) removeMutation.mutate(card.id);
                        }}
                        className="rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
      <path d="M14 3v5h5M8 15h8M8 18h5" strokeLinecap="round" />
    </svg>
  );
}
