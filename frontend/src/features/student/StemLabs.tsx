import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labsApi, labSessionsApi } from '../../api/labs.api';
import { cslActivitiesApi, cslSubmissionsApi } from '../../api/csl.api';
import { uploadsApi } from '../../api/uploads.api';
import { apiErrorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import type { Lab } from '../../types';

// Both catalogs (labs, CSL activities) are auto-scoped to the student's own
// grade server-side (LabsService.findAll / CslActivitiesService.findAll) —
// no ?grade filter needed here, the backend already only returns what
// applies to this student.
export function StemLabsPage() {
  const [tab, setTab] = useState<'labs' | 'csl'>('labs');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">STEM Labs & Community Service</h1>
      <div className="flex gap-2 border-b border-gray-200">
        <TabButton active={tab === 'labs'} onClick={() => setTab('labs')} label="STEM Labs" />
        <TabButton active={tab === 'csl'} onClick={() => setTab('csl')} label="Community Service (CSL)" />
      </div>
      {tab === 'labs' ? <LabsTab /> : <CslTab />}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm border-b-2 -mb-px ${active ? 'border-brand text-brand font-medium' : 'border-transparent text-gray-500'}`}
    >
      {label}
    </button>
  );
}

function LabsTab() {
  const user = useAuthStore((s) => s.user);
  const { data: labs, isLoading } = useQuery({ queryKey: ['labs'], queryFn: () => labsApi.findAll() });
  const { data: sessions } = useQuery({
    queryKey: ['lab-sessions', user?.id],
    queryFn: () => labSessionsApi.findAll({ studentId: user?.id }),
    enabled: !!user,
  });
  const [openLabId, setOpenLabId] = useState<number | null>(null);

  const completedKeys = new Set((sessions ?? []).map((s) => s.labKey));

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-3">
      {(labs ?? []).length === 0 && <p className="text-sm text-gray-500">No labs published for your grade yet.</p>}
      {(labs ?? []).map((lab) => (
        <div key={lab.id} className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setOpenLabId(openLabId === lab.id ? null : lab.id)}
            className="w-full text-left px-4 py-3 flex items-center justify-between text-sm"
          >
            <div>
              <p className="font-medium">{lab.title}</p>
              <p className="text-gray-500">{lab.subject} · {lab.topicArea ?? lab.type}</p>
            </div>
            {completedKeys.has(lab.key) && <span className="text-xs text-green-700">Completed</span>}
          </button>
          {openLabId === lab.id && <LabDetail lab={lab} />}
        </div>
      ))}
    </div>
  );
}

function LabDetail({ lab }: { lab: Lab }) {
  const queryClient = useQueryClient();
  const { data: full } = useQuery({ queryKey: ['lab', lab.id], queryFn: () => labsApi.findOne(lab.id) });
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: () =>
      labSessionsApi.create({
        labKey: lab.key,
        competency: lab.competency ?? undefined,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          answer,
        })),
      }),
    onSuccess: () => {
      setStatus('Lab marked complete.');
      queryClient.invalidateQueries({ queryKey: ['lab-sessions'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save')),
  });

  return (
    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
      {lab.description && <p className="text-sm text-gray-600">{lab.description}</p>}
      {lab.resourceUrl && (
        <a href={lab.resourceUrl} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">
          Watch lab video →
        </a>
      )}
      {(full?.questions ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Quick check</p>
          {(full?.questions ?? []).map((q) => {
            const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
            return (
              <div key={q.id} className="text-sm">
                <p>{q.questionText}</p>
                {opts.length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {opts.map((opt) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`lab-q-${q.id}`}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1 mt-1"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      {status && <p className="text-sm text-gray-600">{status}</p>}
      <button
        onClick={() => completeMutation.mutate()}
        disabled={completeMutation.isPending}
        className="px-3 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
      >
        {completeMutation.isPending ? 'Saving…' : 'Mark Complete'}
      </button>
    </div>
  );
}

function CslTab() {
  const user = useAuthStore((s) => s.user);
  const { data: activities, isLoading } = useQuery({ queryKey: ['csl-activities'], queryFn: () => cslActivitiesApi.findAll() });
  const { data: submissions } = useQuery({
    queryKey: ['csl-submissions', user?.id],
    queryFn: () => cslSubmissionsApi.findAll({ studentId: user?.id }),
    enabled: !!user,
  });
  const submittedIds = new Set((submissions ?? []).map((s) => s.cslActivityId));
  const [openId, setOpenId] = useState<number | null>(null);

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-3">
      {(activities ?? []).length === 0 && <p className="text-sm text-gray-500">No CSL activities published for your grade yet.</p>}
      {(activities ?? []).map((activity) => {
        const existing = (submissions ?? []).find((s) => s.cslActivityId === activity.id);
        return (
          <div key={activity.id} className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setOpenId(openId === activity.id ? null : activity.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between text-sm"
            >
              <div>
                <p className="font-medium">{activity.title} {activity.isRequired && <span className="text-xs text-red-500">(required)</span>}</p>
                <p className="text-gray-500">{activity.targetHours ? `${activity.targetHours}h target` : ''}</p>
              </div>
              {existing && <span className="text-xs text-gray-500">{existing.status}</span>}
            </button>
            {openId === activity.id && (
              <CslSubmitForm activityId={activity.id} description={activity.description} disabled={submittedIds.has(activity.id)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CslSubmitForm({ activityId, description, disabled }: { activityId: number; description: string | null; disabled: boolean }) {
  const queryClient = useQueryClient();
  const [reflection, setReflection] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: () => cslSubmissionsApi.create({ cslActivityId: activityId, evidenceUrl: evidenceUrl ?? undefined, reflection }),
    onSuccess: () => {
      setStatus('Submitted for review.');
      queryClient.invalidateQueries({ queryKey: ['csl-submissions'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not submit')),
  });

  return (
    <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
      {description && <p className="text-sm text-gray-600">{description}</p>}
      {disabled ? (
        <p className="text-sm text-gray-500">You've already submitted this activity.</p>
      ) : (
        <>
          <input
            type="file"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const res = await uploadsApi.uploadSingle(file);
                setEvidenceUrl(res.url);
              } catch (err) {
                setStatus(apiErrorMessage(err, 'Upload failed'));
              } finally {
                setUploading(false);
              }
            }}
            className="text-sm"
          />
          {evidenceUrl && <p className="text-xs text-green-700">Evidence uploaded.</p>}
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Reflection — what did you do and learn?"
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          {status && <p className="text-sm text-gray-600">{status}</p>}
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="px-3 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
          >
            {submitMutation.isPending ? 'Submitting…' : 'Submit'}
          </button>
        </>
      )}
    </div>
  );
}
