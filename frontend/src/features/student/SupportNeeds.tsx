import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supportNeedsApi } from '../../api/support-needs.api';
import { apiErrorMessage } from '../../api/axios';
import type { DisabilityCategory, SupportLevel } from '../../types';

const CATEGORIES: { value: DisabilityCategory; label: string }[] = [
  { value: 'VISUAL_IMPAIRMENT', label: 'Visual impairment' },
  { value: 'HEARING_IMPAIRMENT', label: 'Hearing impairment' },
  { value: 'PHYSICAL_DISABILITY', label: 'Physical disability' },
  { value: 'INTELLECTUAL_DEVELOPMENTAL', label: 'Intellectual / developmental' },
  { value: 'AUTISM_SPECTRUM', label: 'Autism spectrum' },
  { value: 'MULTIPLE_DEAFBLIND', label: 'Multiple / deafblind' },
  { value: 'OTHER_UNSURE', label: 'Other / not sure' },
];

const SUPPORT_LEVELS: { value: SupportLevel; label: string }[] = [
  { value: 'MILD_SOME_SUPPORT', label: 'Mild — some support' },
  { value: 'MODERATE_REGULAR_SUPPORT', label: 'Moderate — regular support' },
  { value: 'SIGNIFICANT_INTENSIVE_SUPPORT', label: 'Significant — intensive support' },
];

// This is guidance, not a diagnosis — mirrors the backend's own framing
// (see backend/src/support-needs/dto/submit-support-assessment.dto.ts).
// Real submission to POST /support-needs/assessments, plus a real
// institution catalog browse.
export function SupportNeedsPage() {
  const [tab, setTab] = useState<'assess' | 'directory'>('assess');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Support Needs</h1>
      <p className="text-sm text-gray-500 max-w-xl">
        A short, respectful questionnaire to help point you toward the right local support — not a diagnosis.
      </p>
      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab('assess')} className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === 'assess' ? 'border-brand text-brand font-medium' : 'border-transparent text-gray-500'}`}>Self-Assessment</button>
        <button onClick={() => setTab('directory')} className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === 'directory' ? 'border-brand text-brand font-medium' : 'border-transparent text-gray-500'}`}>Institution Directory</button>
      </div>
      {tab === 'assess' ? <AssessmentForm /> : <Directory />}
    </div>
  );
}

function AssessmentForm() {
  const [category, setCategory] = useState<DisabilityCategory | ''>('');
  const [supportLevel, setSupportLevel] = useState<SupportLevel | ''>('');
  const [hasFormalAssessment, setHasFormalAssessment] = useState(false);
  const [currentChallenges, setCurrentChallenges] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: () =>
      supportNeedsApi.submitAssessment({
        category: category as DisabilityCategory,
        supportLevel: supportLevel as SupportLevel,
        hasFormalAssessment,
        currentChallenges: currentChallenges || undefined,
      }),
    onSuccess: () => setStatus('Submitted. Your teacher/school admin can now see this and offer support.'),
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not submit')),
  });

  return (
    <div className="max-w-lg bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as DisabilityCategory)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">Select…</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Support level</label>
        <select value={supportLevel} onChange={(e) => setSupportLevel(e.target.value as SupportLevel)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">Select…</option>
          {SUPPORT_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hasFormalAssessment} onChange={(e) => setHasFormalAssessment(e.target.checked)} />
        I've had a formal EARC assessment before
      </label>
      <textarea
        value={currentChallenges}
        onChange={(e) => setCurrentChallenges(e.target.value)}
        placeholder="Current challenges (optional)"
        rows={3}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      />
      {status && <p className="text-sm text-gray-600">{status}</p>}
      <button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending || !category || !supportLevel}
        className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
      >
        {submitMutation.isPending ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  );
}

function Directory() {
  const { data: institutions, isLoading } = useQuery({
    queryKey: ['support-institutions'],
    queryFn: () => supportNeedsApi.findAllInstitutions(),
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-2">
      {(institutions ?? []).map((inst) => (
        <div key={inst.id} className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-sm font-medium">{inst.name}</p>
          <p className="text-xs text-gray-500">{inst.type} · {inst.county}{inst.town ? `, ${inst.town}` : ''}</p>
          <p className="text-sm text-gray-600 mt-1">{inst.description}</p>
          {inst.contactPhone && <p className="text-xs text-gray-500 mt-1">{inst.contactPhone}</p>}
        </div>
      ))}
    </div>
  );
}
