import { useQuery } from '@tanstack/react-query';
import { mentorshipApi } from '../../../api/mentorship.api';
import { pathwaysApi } from '../../../api/pathways.api';
import { talentsApi } from '../../../api/talents.api';
import { ActionCard, EmptyState, MetricCard } from '../../../components/ui/Saas';
import { useAuthStore } from '../../../store/auth.store';
import { ArrowIcon, ExploreIcon, JourneyIcon, MentorIcon, ParentIcon, TalentIcon } from './icons';
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
        title={current ? `Your current track: ${current.track?.name}` : "You haven't chosen a pathway yet"}
        meta={
          current
            ? `${current.track?.pathway?.name} · chosen ${new Date(current.createdAt).toLocaleDateString()}`
            : tier === 'junior'
              ? 'Grade 7-9 is for exploring — try a few pathways and see what excites you.'
              : 'Grade 10-12 is for specializing — take the assessment to find your best-fit track.'
        }
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

      <section className="grid gap-4 sm:grid-cols-2">
        <QuickLinkCard
          icon={<ExploreIcon />}
          title="Explore Pathways"
          meta="Arts & Sports, Social Sciences, and STEM"
          onClick={() => onNavigate('explore')}
        />
        <QuickLinkCard
          icon={<TalentIcon />}
          title="My Talents & Strengths"
          meta={talentCount > 0 ? `${talentCount} logged` : 'Discover what you\'re good at'}
          onClick={() => onNavigate('talents')}
        />
        <QuickLinkCard
          icon={<MentorIcon />}
          title="Mentorship"
          meta="Find a teacher-mentor to guide you"
          onClick={() => onNavigate('mentorship')}
        />
        <QuickLinkCard
          icon={<ParentIcon />}
          title="Parent Corner"
          meta="A printable summary to share at home"
          onClick={() => onNavigate('parent-corner')}
        />
      </section>
    </div>
  );
}

function QuickLinkCard({ icon, title, meta, onClick }: { icon: React.ReactNode; title: string; meta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-[0_12px_34px_rgba(16,24,32,0.05)] transition hover:border-[#B5E61D]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#101820] text-[#B5E61D]">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-[#101820]">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{meta}</p>
        </div>
      </div>
      <span className="text-[#101820]">
        <ArrowIcon />
      </span>
    </button>
  );
}
