import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pathwaysApi } from '../../api/pathways.api';
import { apiErrorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import type { PathwayRecommendation, Track } from '../../types';

// Fixed interest vocabulary — matches the tags PathwaysService.recommend
// actually scores against (see backend/src/pathways/pathways.service.ts and
// prisma/seed-pathways-data.ts's interestTags comment). Not enforced by the
// backend DTO, but using anything outside this list just won't match any
// track's interestTags.
const INTEREST_TAGS = [
  'science', 'technology', 'art', 'sports', 'business', 'environment', 'health', 'writing', 'music', 'social',
];

export function CareerPathwaysPage() {
  const [tab, setTab] = useState<'explore' | 'assessment' | 'selection'>('explore');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Career Pathways</h1>
      <div className="flex gap-2 border-b border-gray-200">
        {(['explore', 'assessment', 'selection'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px ${tab === t ? 'border-brand text-brand font-medium' : 'border-transparent text-gray-500'}`}
          >
            {t === 'selection' ? 'My Selection' : t}
          </button>
        ))}
      </div>
      {tab === 'explore' && <ExploreTab />}
      {tab === 'assessment' && <AssessmentTab />}
      {tab === 'selection' && <SelectionTab />}
    </div>
  );
}

function ExploreTab() {
  const { data: pathways, isLoading } = useQuery({ queryKey: ['pathways'], queryFn: pathwaysApi.findAllPathways });
  const [openTrack, setOpenTrack] = useState<Track | null>(null);

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      {(pathways ?? []).map((pathway) => (
        <div key={pathway.id}>
          <h2 className="text-sm font-medium mb-2" style={{ color: pathway.colorHex }}>{pathway.name}</h2>
          <p className="text-xs text-gray-500 mb-2">{pathway.description}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {pathway.tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => setOpenTrack(track)}
                className="text-left bg-white rounded-lg border border-gray-200 p-3 hover:border-brand"
              >
                <p className="text-sm font-medium">{track.name}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{track.description}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
      {openTrack && <TrackDetailModal track={openTrack} onClose={() => setOpenTrack(null)} />}
    </div>
  );
}

function TrackDetailModal({ track, onClose }: { track: Track; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const selectMutation = useMutation({
    mutationFn: () => pathwaysApi.selectTrack({ trackId: track.id, source: 'MANUAL' }),
    onSuccess: () => {
      setStatus('Track selected.');
      queryClient.invalidateQueries({ queryKey: ['my-pathway-selections'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not select track')),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold">{track.name}</h3>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{track.description}</p>

        {track.minMeanGrade && <p className="text-xs text-gray-500 mb-2">Min mean grade: {track.minMeanGrade}</p>}

        {track.requiredSubjects?.length > 0 && (
          <Section title="Required subjects">
            {track.requiredSubjects.map((s) => `${s.subject} (${s.minGrade})`).join(', ')}
          </Section>
        )}
        {track.careers?.length > 0 && (
          <Section title="Careers">
            {track.careers.map((c) => c.title).join(', ')}
          </Section>
        )}
        {track.skills?.length > 0 && <Section title="Skills">{track.skills.join(', ')}</Section>}
        {track.universitiesKenya?.length > 0 && (
          <Section title="Universities (Kenya)">{track.universitiesKenya.map((u) => u.name).join(', ')}</Section>
        )}

        {status && <p className="text-sm text-gray-600 mt-2">{status}</p>}
        <button
          onClick={() => selectMutation.mutate()}
          disabled={selectMutation.isPending}
          className="mt-3 px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
        >
          {selectMutation.isPending ? 'Selecting…' : 'Select This Track'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-medium text-gray-700">{title}</p>
      <p className="text-sm text-gray-600">{children}</p>
    </div>
  );
}

function AssessmentTab() {
  const [subjectGrades, setSubjectGrades] = useState<{ subject: string; grade: string }[]>([{ subject: '', grade: '' }]);
  const [interests, setInterests] = useState<string[]>([]);
  const [results, setResults] = useState<PathwayRecommendation[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const recommendMutation = useMutation({
    mutationFn: () =>
      pathwaysApi.recommend({
        subjectGrades: subjectGrades.filter((s) => s.subject && s.grade),
        interests,
      }),
    onSuccess: setResults,
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not compute recommendations')),
  });

  const queryClient = useQueryClient();
  const selectMutation = useMutation({
    mutationFn: (trackId: number) => pathwaysApi.selectTrack({ trackId, source: 'RECOMMENDATION' }),
    onSuccess: () => {
      setStatus('Track selected from your recommendation.');
      queryClient.invalidateQueries({ queryKey: ['my-pathway-selections'] });
    },
  });

  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-medium">Your KCSE-style grades (optional)</p>
        {subjectGrades.map((sg, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder="Subject"
              value={sg.subject}
              onChange={(e) => setSubjectGrades((prev) => prev.map((p, idx) => idx === i ? { ...p, subject: e.target.value } : p))}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <input
              placeholder="Grade e.g. B+"
              value={sg.grade}
              onChange={(e) => setSubjectGrades((prev) => prev.map((p, idx) => idx === i ? { ...p, grade: e.target.value } : p))}
              className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        ))}
        <button onClick={() => setSubjectGrades((prev) => [...prev, { subject: '', grade: '' }])} className="text-xs text-brand">
          + Add subject
        </button>

        <p className="text-sm font-medium pt-2">What are you interested in?</p>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setInterests((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
              className={`px-3 py-1 rounded-full text-xs border ${interests.includes(tag) ? 'bg-brand text-white border-brand' : 'border-gray-300 text-gray-600'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        <button
          onClick={() => recommendMutation.mutate()}
          disabled={recommendMutation.isPending}
          className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
        >
          {recommendMutation.isPending ? 'Calculating…' : 'Get Recommendations'}
        </button>
      </div>

      {status && <p className="text-sm text-gray-600">{status}</p>}

      {results && (
        <div className="space-y-2">
          {results.slice(0, 5).map((r) => (
            <div key={r.track.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{r.track.name}</p>
                <p className="text-xs text-gray-500">
                  Match score: {r.score} · Grade fit: {r.gradeScore}% · Interest fit: {r.interestScore}%
                </p>
              </div>
              <button onClick={() => selectMutation.mutate(r.track.id)} className="text-brand text-sm font-medium">
                Select
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectionTab() {
  const user = useAuthStore((s) => s.user);
  const { data: selections, isLoading } = useQuery({
    queryKey: ['my-pathway-selections', user?.id],
    queryFn: () => pathwaysApi.findSelections({ studentId: user?.id, includeHistory: true }),
    enabled: !!user,
  });
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const notesMutation = useMutation({
    mutationFn: () => pathwaysApi.updateActiveNotes(notes),
    onSuccess: () => {
      setStatus('Notes saved.');
      queryClient.invalidateQueries({ queryKey: ['my-pathway-selections'] });
    },
  });

  async function handleDownload() {
    if (!user) return;
    const blob = await pathwaysApi.downloadReport(user.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'career-pathway-report.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  const active = (selections ?? []).find((s) => s.isActive);
  const history = (selections ?? []).filter((s) => !s.isActive);

  if (!active) return <p className="text-sm text-gray-500">You haven't selected a track yet — try Explore or Assessment.</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-medium">Current track: Track #{active.trackId}</p>
        <p className="text-xs text-gray-500">Chosen via {active.source.toLowerCase()} · {new Date(active.createdAt).toLocaleDateString()}</p>
        <textarea
          defaultValue={active.notes ?? ''}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why did you choose this track?"
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-2"
        />
        <div className="flex gap-2 mt-2">
          <button onClick={() => notesMutation.mutate()} className="px-3 py-2 text-sm rounded border border-gray-300">
            Save Notes
          </button>
          <button onClick={handleDownload} className="px-3 py-2 text-sm rounded bg-brand text-white">
            Download Report (PDF)
          </button>
        </div>
        {status && <p className="text-sm text-gray-600 mt-2">{status}</p>}
      </div>

      {history.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">History</p>
          <ul className="text-sm text-gray-500 space-y-1">
            {history.map((h) => (
              <li key={h.id}>Track #{h.trackId} — {new Date(h.createdAt).toLocaleDateString()}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
