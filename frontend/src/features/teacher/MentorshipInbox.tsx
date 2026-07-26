import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axios';
import { mentorshipApi } from '../../api/mentorship.api';
import { ActionCard, EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';
import { TagInput } from '../student/my-pathway/icons';
import { MentorshipRequestCard } from '../student/my-pathway/MentorshipTab';

export function MentorshipInboxPage() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['teacher-mentorship-requests'],
    queryFn: () => mentorshipApi.findRequests(),
  });
  const { data: stats } = useQuery({ queryKey: ['mentorship-stats'], queryFn: () => mentorshipApi.getStats() });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED' }) => mentorshipApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-mentorship-requests'] }),
  });

  const pending = requests.filter((r) => r.status === 'PENDING');
  const active = requests.filter((r) => r.status === 'ACCEPTED');
  const past = requests.filter((r) => r.status === 'DECLINED' || r.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <PageHeader title="Mentorship" meta="Students you're mentoring, and requests waiting on your response" />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Pending requests" value={stats?.pending ?? '-'} compact />
        <MetricCard label="Active mentorships" value={stats?.accepted ?? '-'} compact />
        <MetricCard label="Completed" value={stats?.completed ?? '-'} compact />
      </section>

      <MyMentorListingCard />

      <ActionCard title="Waiting on your response" meta={`${pending.length} pending`}>
        {isLoading ? (
          <EmptyState title="Loading..." />
        ) : pending.length === 0 ? (
          <EmptyState title="No pending requests." />
        ) : (
          <div className="space-y-4">
            {pending.map((r) => (
              <MentorshipRequestCard key={r.id} request={r} viewer="TEACHER" onStatusChange={(id, status) => statusMutation.mutate({ id, status })} />
            ))}
          </div>
        )}
      </ActionCard>

      <ActionCard title="Active mentorships" meta={`${active.length} students`}>
        {active.length === 0 ? (
          <EmptyState title="No active mentorships yet." />
        ) : (
          <div className="space-y-4">
            {active.map((r) => (
              <MentorshipRequestCard key={r.id} request={r} viewer="TEACHER" onStatusChange={(id, status) => statusMutation.mutate({ id, status })} />
            ))}
          </div>
        )}
      </ActionCard>

      {past.length > 0 ? (
        <ActionCard title="Past requests" meta={`${past.length}`}>
          <div className="space-y-4">
            {past.map((r) => (
              <MentorshipRequestCard key={r.id} request={r} viewer="TEACHER" />
            ))}
          </div>
        </ActionCard>
      ) : null}
    </div>
  );
}

function MyMentorListingCard() {
  const user = useAuthStore((state) => state.user);
  const { data: mentors = [] } = useQuery({ queryKey: ['mentorship-directory'], queryFn: () => mentorshipApi.findMentors() });
  const me = mentors.find((m) => m.teacherId === user?.id);

  const [bio, setBio] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!me || hydrated) return;
    setBio(me.bio ?? '');
    setExpertiseAreas(me.expertiseAreas);
    setIsAvailable(me.isAvailable);
    setHydrated(true);
  }, [me, hydrated]);

  const saveMutation = useMutation({
    mutationFn: () => mentorshipApi.upsertMyMentorProfile({ bio: bio || undefined, expertiseAreas, isAvailable }),
    onSuccess: () => setStatus('Saved — students will see this in Find a Mentor.'),
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save')),
  });

  return (
    <ActionCard title="My mentor listing" meta="Shown to students under Mentorship > Find a mentor">
      <div className="space-y-3">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          placeholder="A short bio students will see"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
        />
        <TagInput values={expertiseAreas} onChange={setExpertiseAreas} placeholder="e.g. Career guidance, STEM projects, public speaking" />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          Available for new mentorship requests
        </label>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save listing'}
        </button>
        {status ? <p className="text-sm text-slate-500">{status}</p> : null}
      </div>
    </ActionCard>
  );
}
