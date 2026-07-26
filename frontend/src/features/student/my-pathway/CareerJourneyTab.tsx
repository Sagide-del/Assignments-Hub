import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../../api/axios';
import { pathwaysApi } from '../../../api/pathways.api';
import { ActionCard, EmptyState } from '../../../components/ui/Saas';
import { useAuthStore } from '../../../store/auth.store';
import type { PathwayRecommendation } from '../../../types';
import { ArrowIcon, JourneyIcon, PrintIcon } from './icons';
import type { GradeTier } from './types';

// Matches the tags PathwaysService.recommend actually scores against — see
// backend/src/pathways/pathways.service.ts and prisma/seed-pathways-data.ts.
const INTEREST_TAGS = ['science', 'technology', 'art', 'sports', 'business', 'environment', 'health', 'writing', 'music', 'social'];

export function CareerJourneyTab({ tier }: { tier: GradeTier }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: selections = [], isLoading } = useQuery({
    queryKey: ['my-pathway-selections', user?.id],
    queryFn: () => pathwaysApi.findSelections({ studentId: user?.id, includeHistory: true }),
    enabled: !!user,
  });

  const active = selections.find((s) => s.isActive);
  const history = selections.filter((s) => !s.isActive);

  return (
    <div className="space-y-6">
      <p className="rounded-[24px] border border-slate-200 bg-[#FAFDEB] p-5 text-sm leading-6 text-slate-600">
        {tier === 'junior'
          ? 'Career Journey really opens up in Senior School — but you can try the subject and interest quiz now to get a feel for what fits you.'
          : 'Enter your subject grades and interests to get a ranked list of tracks that fit you, or review the track you\'ve already chosen below.'}
      </p>

      <AssessmentCard />

      <ActionCard title="My current track" meta={active ? undefined : 'You haven\'t chosen a track yet'} icon={<JourneyIcon />}>
        {isLoading ? (
          <EmptyState title="Loading..." />
        ) : !active ? (
          <EmptyState title="Choose a track in Explore Pathways or from your quiz results above." />
        ) : (
          <CurrentSelectionCard active={active} studentId={user!.id} onNotesSaved={() => queryClient.invalidateQueries({ queryKey: ['my-pathway-selections'] })} />
        )}

        {history.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">History</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-500">
              {history.map((h) => (
                <li key={h.id}>
                  {h.track?.name ?? `Track #${h.trackId}`} — {new Date(h.createdAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ActionCard>
    </div>
  );
}

function AssessmentCard() {
  const [subjectGrades, setSubjectGrades] = useState<{ subject: string; grade: string }[]>([{ subject: '', grade: '' }]);
  const [interests, setInterests] = useState<string[]>([]);
  const [results, setResults] = useState<PathwayRecommendation[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const recommendMutation = useMutation({
    mutationFn: () =>
      pathwaysApi.recommend({
        subjectGrades: subjectGrades.filter((s) => s.subject && s.grade),
        interests,
      }),
    onSuccess: setResults,
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not compute recommendations')),
  });

  const selectMutation = useMutation({
    mutationFn: (trackId: number) => pathwaysApi.selectTrack({ trackId, source: 'RECOMMENDATION' }),
    onSuccess: () => {
      setStatus('Track selected from your recommendation.');
      queryClient.invalidateQueries({ queryKey: ['my-pathway-selections'] });
      queryClient.invalidateQueries({ queryKey: ['my-pathway-summary'] });
    },
  });

  return (
    <ActionCard title="Find your best-fit track" meta="Optional subject grades + interests quiz">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#101820]">Your grades so far (optional)</p>
        {subjectGrades.map((sg, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder="Subject"
              value={sg.subject}
              onChange={(e) => setSubjectGrades((prev) => prev.map((p, idx) => (idx === i ? { ...p, subject: e.target.value } : p)))}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
            />
            <input
              placeholder="Grade e.g. B+"
              value={sg.grade}
              onChange={(e) => setSubjectGrades((prev) => prev.map((p, idx) => (idx === i ? { ...p, grade: e.target.value } : p)))}
              className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSubjectGrades((prev) => [...prev, { subject: '', grade: '' }])}
          className="text-sm font-semibold text-[#101820] hover:opacity-70"
        >
          + Add subject
        </button>

        <p className="pt-2 text-sm font-semibold text-[#101820]">What are you interested in?</p>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                interests.includes(tag) ? 'border-[#101820] bg-[#101820] text-[#B5E61D]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => recommendMutation.mutate()}
          disabled={recommendMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
        >
          {recommendMutation.isPending ? 'Calculating...' : 'Get recommendations'}
          <ArrowIcon />
        </button>
      </div>

      {status ? <p className="mt-4 text-sm text-slate-600">{status}</p> : null}

      {results ? (
        <div className="mt-5 space-y-3">
          {results.slice(0, 5).map((r) => (
            <div key={r.track.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4">
              <div>
                <p className="text-sm font-semibold text-[#101820]">{r.track.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Match {r.score}% · Grade fit {r.gradeScore}% · Interest fit {r.interestScore}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectMutation.mutate(r.track.id)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-slate-50"
              >
                Select
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </ActionCard>
  );
}

function CurrentSelectionCard({
  active,
  studentId,
  onNotesSaved,
}: {
  active: { id: number; trackId: number; track?: { name: string; pathway?: { name: string } }; notes: string | null; source: string; createdAt: string };
  studentId: number;
  onNotesSaved: () => void;
}) {
  const [notes, setNotes] = useState(active.notes ?? '');
  const [status, setStatus] = useState<string | null>(null);

  const notesMutation = useMutation({
    mutationFn: () => pathwaysApi.updateActiveNotes(notes),
    onSuccess: () => {
      setStatus('Notes saved.');
      onNotesSaved();
    },
  });

  async function handleDownload() {
    const blob = await pathwaysApi.downloadReport(studentId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'career-pathway-report.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-lg font-semibold text-[#101820]">{active.track?.name}</p>
      <p className="mt-1 text-sm text-slate-500">
        {active.track?.pathway?.name} · chosen via {active.source.toLowerCase()} · {new Date(active.createdAt).toLocaleDateString()}
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Why did you choose this track?"
        rows={3}
        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => notesMutation.mutate()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-white">
          Save notes
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          <PrintIcon />
          Download report (PDF)
        </button>
      </div>
      {status ? <p className="mt-2 text-sm text-slate-500">{status}</p> : null}
    </div>
  );
}
