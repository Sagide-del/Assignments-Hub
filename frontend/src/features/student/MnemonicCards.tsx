import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mnemonicCardsApi } from '../../api/mnemonic-cards.api';
import { apiErrorMessage } from '../../api/axios';
import { resolveUploadUrl } from '../../api/uploads.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';

function formatFileSize(size: number | null) {
  if (!size) return 'PDF';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MnemonicCardsPage() {
  const [subject, setSubject] = useState('ALL');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const cardsQuery = useQuery({
    queryKey: ['mnemonic-cards'],
    queryFn: () => mnemonicCardsApi.findAll(),
  });

  const cards = cardsQuery.data ?? [];
  const subjects = useMemo(
    () => [...new Set(cards.map((card) => card.subject))].sort((a, b) => a.localeCompare(b)),
    [cards],
  );
  const visibleCards = useMemo(
    () =>
      cards.filter((card) => {
        const matchesSubject = subject === 'ALL' || card.subject === subject;
        const searchable = `${card.title} ${card.subject} ${card.topic}`.toLowerCase();
        return matchesSubject && (!deferredSearch || searchable.includes(deferredSearch));
      }),
    [cards, deferredSearch, subject],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Mnemonic Cards" />

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_34px_rgba(16,24,32,0.05)] sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="relative block">
            <span className="sr-only">Search mnemonic cards</span>
            <SearchIcon />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search topic or title"
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-base text-[#101820] outline-none focus:border-[#101820] focus:ring-2 focus:ring-[#B5E61D]/30"
            />
          </label>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-[#101820] outline-none focus:border-[#101820]"
          >
            <option value="ALL">All subjects</option>
            {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </section>

      {cardsQuery.isLoading ? (
        <EmptyState title="Loading mnemonic cards..." />
      ) : cardsQuery.error ? (
        <EmptyState title={apiErrorMessage(cardsQuery.error, 'Could not load mnemonic cards')} />
      ) : visibleCards.length === 0 ? (
        <EmptyState title={cards.length ? 'No cards match your filters' : 'No mnemonic cards are available yet'} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCards.map((card) => (
            <article
              key={card.id}
              className="group flex min-h-[250px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(16,24,32,0.05)]"
            >
              <div className="relative flex h-24 items-center justify-between overflow-hidden bg-[#101820] px-5 text-white">
                <span className="absolute -right-5 -top-10 h-28 w-28 rounded-full border-[20px] border-[#B5E61D]/20" />
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#B5E61D] text-[#101820]">
                  <PdfIcon />
                </span>
                <span className="relative rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold">
                  {card.grade ?? 'All grades'}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{card.subject}</p>
                <h2 className="mt-2 text-lg font-semibold leading-7 text-[#101820]">{card.title}</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">{card.topic}</p>
                {card.description ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{card.description}</p>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="text-xs font-semibold text-slate-400">{formatFileSize(card.fileSize)}</span>
                  <a
                    href={resolveUploadUrl(card.pdfUrl)}
                    download={card.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#B5E61D] px-4 py-2.5 text-sm font-semibold text-[#101820] transition hover:bg-[#A8D517]"
                  >
                    <DownloadIcon />
                    Download
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
      <path d="M14 3v5h5M8 15h8M8 18h5" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
