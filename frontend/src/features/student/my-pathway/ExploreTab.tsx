import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../../api/axios';
import { pathwaysApi } from '../../../api/pathways.api';
import { EmptyState } from '../../../components/ui/Saas';
import type { Track } from '../../../types';
import { ArrowIcon, ExploreIcon, XIcon } from './icons';
import type { GradeTier } from './types';

export function ExploreTab({ tier }: { tier: GradeTier }) {
  const { data: pathways = [], isLoading } = useQuery({ queryKey: ['pathways'], queryFn: pathwaysApi.findAllPathways });
  const [activePathwayId, setActivePathwayId] = useState<number | null>(null);
  const [openTrack, setOpenTrack] = useState<Track | null>(null);

  const activePathway = pathways.find((p) => p.id === activePathwayId) ?? pathways[0] ?? null;

  return (
    <div className="space-y-6">
      <p className="rounded-[24px] border border-slate-200 bg-[#FAFDEB] p-5 text-sm leading-6 text-slate-600">
        {tier === 'junior'
          ? 'Junior School (Grade 7-9) is your time to explore. Look through each pathway below, open a track that sounds interesting, and see what it could lead to — nothing here locks you in.'
          : tier === 'senior'
            ? 'Browse every pathway and track below. When you find one that fits your subjects and interests, select it — you can always change your mind later.'
            : 'Browse pathways and tracks, and open any one that interests you to see required subjects, careers, and universities.'}
      </p>

      {isLoading ? (
        <EmptyState title="Loading pathways..." />
      ) : pathways.length === 0 ? (
        <EmptyState title="No pathways are published yet." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {pathways.map((pathway) => (
              <button
                key={pathway.id}
                type="button"
                onClick={() => setActivePathwayId(pathway.id)}
                className={`rounded-[28px] border p-6 text-left transition ${
                  activePathway?.id === pathway.id
                    ? 'border-[#B5E61D] bg-[#FAFDEB] shadow-[0_14px_28px_rgba(16,24,32,0.06)]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ backgroundColor: pathway.colorHex || '#101820' }}
                >
                  <ExploreIcon />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-[#101820]">{pathway.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{pathway.description}</p>
                <span className="mt-4 inline-block rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {pathway.tracks.length} tracks
                </span>
              </button>
            ))}
          </section>

          {activePathway ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
              <h3 className="text-lg font-semibold text-[#101820]">{activePathway.name} tracks</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {activePathway.tracks.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setOpenTrack(track)}
                    className="rounded-[20px] border border-slate-200 bg-[#FCFDFE] p-4 text-left transition hover:border-[#B5E61D]"
                  >
                    <p className="text-sm font-semibold text-[#101820]">{track.name}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">{track.description}</p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {openTrack ? <TrackDetailModal track={openTrack} tier={tier} onClose={() => setOpenTrack(null)} /> : null}
    </div>
  );
}

function TrackDetailModal({ track, tier, onClose }: { track: Track; tier: GradeTier; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);

  const selectMutation = useMutation({
    mutationFn: () => pathwaysApi.selectTrack({ trackId: track.id, source: 'MANUAL' }),
    onSuccess: () => {
      setStatus('Track selected.');
      queryClient.invalidateQueries({ queryKey: ['my-pathway-summary'] });
      queryClient.invalidateQueries({ queryKey: ['my-pathway-selections'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not select track')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold tracking-tight text-[#101820]">{track.name}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <XIcon />
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">{track.description}</p>

        {track.minMeanGrade ? (
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Min mean grade: {track.minMeanGrade}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {track.requiredSubjects?.length > 0 ? (
            <DetailSection title="Required subjects">
              {track.requiredSubjects.map((s) => `${s.subject} (${s.minGrade})`).join(', ')}
            </DetailSection>
          ) : null}
          {track.careers?.length > 0 ? <DetailSection title="Careers">{track.careers.map((c) => c.title).join(', ')}</DetailSection> : null}
          {track.skills?.length > 0 ? <DetailSection title="Skills">{track.skills.join(', ')}</DetailSection> : null}
          {track.universitiesKenya?.length > 0 ? (
            <DetailSection title="Universities (Kenya)">{track.universitiesKenya.map((u) => u.name).join(', ')}</DetailSection>
          ) : null}
        </div>

        {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}
        <button
          type="button"
          onClick={() => selectMutation.mutate()}
          disabled={selectMutation.isPending}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
        >
          {selectMutation.isPending ? 'Selecting...' : tier === 'junior' ? 'Add to my interests' : 'Select this track'}
          <ArrowIcon />
        </button>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}
