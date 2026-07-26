import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../../api/axios';
import { talentsApi } from '../../../api/talents.api';
import { ActionCard, EmptyState } from '../../../components/ui/Saas';
import { useAuthStore } from '../../../store/auth.store';
import { TalentIcon, TagInput } from './icons';

export function TalentsTab() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-pathway-talents', user?.id],
    queryFn: () => talentsApi.getStudentProfile(user!.id),
    enabled: !!user,
  });

  const [talents, setTalents] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [reflection, setReflection] = useState('');
  const [growthPlan, setGrowthPlan] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!data || hydrated) return;
    const profile = data.profile;
    setTalents(profile?.talents ?? []);
    setStrengths(profile?.strengths ?? []);
    setInterests(profile?.interests ?? []);
    setReflection(profile?.reflection ?? '');
    setGrowthPlan(profile?.growthPlan ?? '');
    setHydrated(true);
  }, [data, hydrated]);

  const saveMutation = useMutation({
    mutationFn: () => talentsApi.upsertMyProfile({ talents, strengths, interests, reflection: reflection || undefined, growthPlan: growthPlan || undefined }),
    onSuccess: () => {
      setStatus('Saved.');
      queryClient.invalidateQueries({ queryKey: ['my-pathway-talents'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not save your profile')),
  });

  if (isLoading) return <EmptyState title="Loading your talents profile..." />;

  return (
    <div className="space-y-6">
      <p className="rounded-[24px] border border-slate-200 bg-[#FAFDEB] p-5 text-sm leading-6 text-slate-600">
        Talents and strengths aren't just academic — sport, music, art, leadership, and craft all count. List what you're good at
        and what you enjoy, and we'll keep it here for you (and your teachers) to see how to help you grow it.
      </p>

      <ActionCard title="My talents" meta="What are you naturally good at?" icon={<TalentIcon />}>
        <TagInput values={talents} onChange={setTalents} placeholder="e.g. Storytelling, football, drawing" />
      </ActionCard>

      <ActionCard title="My strengths" meta="What do people say you're strong at?">
        <TagInput values={strengths} onChange={setStrengths} placeholder="e.g. Problem-solving, teamwork, patience" />
      </ActionCard>

      <ActionCard title="My interests" meta="What do you enjoy doing outside class?">
        <TagInput values={interests} onChange={setInterests} placeholder="e.g. Coding, poetry, athletics" />
      </ActionCard>

      <ActionCard title="Reflection" meta="Tell us more, in your own words">
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={3}
          placeholder="What makes you proud of yourself? When do you feel most confident?"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
        />
      </ActionCard>

      <ActionCard title="How I want to grow this" meta="A plan for nurturing your talent">
        <textarea
          value={growthPlan}
          onChange={(e) => setGrowthPlan(e.target.value)}
          rows={3}
          placeholder="e.g. Join the school choir, practice coding every weekend, ask my mentor for feedback"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
        />
      </ActionCard>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save my profile'}
        </button>
        {status ? <p className="text-sm text-slate-500">{status}</p> : null}
      </div>
    </div>
  );
}
