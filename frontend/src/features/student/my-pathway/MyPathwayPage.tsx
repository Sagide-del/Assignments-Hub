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
  { key: 'dashboard', label: 'Overview', icon: <DashboardIcon /> },
  { key: 'explore', label: 'Explore', icon: <ExploreIcon /> },
  { key: 'career-journey', label: 'Career plan', icon: <JourneyIcon /> },
  { key: 'talents', label: 'Talents', icon: <TalentIcon /> },
  { key: 'mentorship', label: 'Mentorship', icon: <MentorIcon /> },
  { key: 'parent-corner', label: 'Parent report', icon: <ParentIcon /> },
];

export function MyPathwayPage() {
  const user = useAuthStore((state) => state.user);
  const tier = gradeTier(user?.grade);
  const [tab, setTab] = useState<MyPathwayTab>('dashboard');

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader title="My Pathway" />

        <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                tab === t.key ? 'bg-[#101820] text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-[#101820]'
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
