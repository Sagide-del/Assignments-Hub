import { useState } from 'react';
import { PageHeader } from '../../../components/ui/Saas';
import { useAuthStore } from '../../../store/auth.store';
import { gradeTier } from '../../../utils/gradeTier';
import { CareerJourneyTab } from './CareerJourneyTab';
import { DashboardTab } from './DashboardTab';
import { ExploreTab } from './ExploreTab';
import { DashboardIcon, ExploreIcon, JourneyIcon, MentorIcon, ParentIcon, TalentIcon } from './icons';
import { MentorshipTab } from './MentorshipTab';
import { ParentCornerTab } from './ParentCornerTab';
import { TalentsTab } from './TalentsTab';
import type { MyPathwayTab } from './types';

const TABS: { key: MyPathwayTab; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { key: 'explore', label: 'Explore Pathways', icon: <ExploreIcon /> },
  { key: 'career-journey', label: 'My Career Journey', icon: <JourneyIcon /> },
  { key: 'talents', label: 'My Talents & Strengths', icon: <TalentIcon /> },
  { key: 'mentorship', label: 'Mentorship', icon: <MentorIcon /> },
  { key: 'parent-corner', label: 'Parent Corner', icon: <ParentIcon /> },
];

export function MyPathwayPage() {
  const user = useAuthStore((state) => state.user);
  const tier = gradeTier(user?.grade);
  const [tab, setTab] = useState<MyPathwayTab>('dashboard');

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow={tier === 'junior' ? 'Junior Explorer' : tier === 'senior' ? 'Senior Specialist' : undefined}
          title="My Pathway"
          meta={
            tier === 'junior'
              ? 'Explore who you could become — Grade 7-9 is for discovering, not deciding.'
              : tier === 'senior'
                ? 'Specialize, connect with mentors, and plan your next step.'
                : 'Career guidance, pathway selection, and talent nurturing.'
          }
        />

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                tab === t.key ? 'border-[#101820] bg-[#101820] text-[#B5E61D]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' ? <DashboardTab tier={tier} onNavigate={setTab} /> : null}
      {tab === 'explore' ? <ExploreTab tier={tier} /> : null}
      {tab === 'career-journey' ? <CareerJourneyTab tier={tier} /> : null}
      {tab === 'talents' ? <TalentsTab /> : null}
      {tab === 'mentorship' ? <MentorshipTab /> : null}
      {tab === 'parent-corner' ? <ParentCornerTab tier={tier} /> : null}
    </div>
  );
}
