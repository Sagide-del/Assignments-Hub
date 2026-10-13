import { useQuery } from '@tanstack/react-query';
import { mentorshipApi } from '../../../api/mentorship.api';
import { pathwaysApi } from '../../../api/pathways.api';
import { talentsApi } from '../../../api/talents.api';
import { ActionCard, EmptyState, MetricCard } from '../../../components/ui/Saas';
import { useAuthStore } from '../../../store/auth.store';
import { ArrowIcon, JourneyIcon } from './icons';
import type { GradeTier, MyPathwayTab } from './types';

export function DashboardTab({ tier, onNavigate }: { tier: GradeTier; onNavigate: (tab: MyPathwayTab) => void }) {
  const user = useAuthStore((state) => state.user);

  const { data: summary } = useQuery({
    queryKey: ['my-pathway-summary', user?.id],
    queryFn: () => pathwaysApi.getStudentSummary(user!.id),
    enabled: !!user,
  });
  const { data: talentData } = useQuery({
    queryKey: ['my-pathway-talents', user?.id],
    queryFn: () => talentsApi.getStudentProfile(user!.id),
    enabled: !!user,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ['my-pathway-mentorship-requests'],
    queryFn: () => mentorshipApi.findRequests(),
  });

  const current = summary?.current ?? null;
  const talentCount = (talentData?.profile?.talents.length ?? 0) + (talentData?.profile?.strengths.length ?? 0);
  const activeMentorships = requests.filter((r) => r.status === 'ACCEPTED').length;
  const pendingMentorships = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label={tier === 'senior' ? 'My track' : 'Pathways explored'} value={current?.track?.name ?? 'Not chosen yet'} compact />
        <MetricCard label="Talents logged" value={talentCount} compact />
        <MetricCard label="Mentorship" value={activeMentorships > 0 ? `${activeMentorships} active` : pendingMentorships > 0 ? `${pendingMentorships} pending` : 'None yet'} compact />
      </section>

      <ActionCard
        title={current ? current.track?.name ?? 'Current pathway' : 'Pathway not selected'}
        meta={current ? current.track?.pathway?.name : undefined}
        icon={<JourneyIcon />}
        action={
          <button
            type="button"
            onClick={() => onNavigate(current ? 'career-journey' : 'explore')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            {current ? 'View my journey' : 'Start exploring'}
            <ArrowIcon />
          </button>
        }
      >
        {!current && !summary ? (
          <EmptyState title="Loading..." />
        ) : null}
      </ActionCard>
    </div>
  );
}
