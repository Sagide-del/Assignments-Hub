import { useQuery } from '@tanstack/react-query';
import { pathwaysApi } from '../../../api/pathways.api';
import { talentsApi } from '../../../api/talents.api';
import { ActionCard, EmptyState } from '../../../components/ui/Saas';
import { useAuthStore } from '../../../store/auth.store';
import { ParentIcon, PrintIcon } from './icons';
import type { GradeTier } from './types';

const JUNIOR_PROMPTS = [
  'Ask what pathway they explored this week and what surprised them about it.',
  'Talk about a talent or strength they\'re proud of — how could they practice it more at home?',
  'Ask if there\'s a subject they\'re curious about that we don\'t usually talk about.',
];

const SENIOR_PROMPTS = [
  'Ask why they chose their current track, and whether their subjects still feel like a good fit.',
  'Talk through the careers linked to their track — which ones genuinely interest them, and why?',
  'Ask whether they\'ve requested a mentor yet, and what they\'d want help with.',
  'Discuss what a realistic next step after school looks like for their chosen track.',
];

export function ParentCornerTab({ tier }: { tier: GradeTier }) {
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

  const prompts = tier === 'senior' ? SENIOR_PROMPTS : JUNIOR_PROMPTS;
  const current = summary?.current ?? null;
  const profile = talentData?.profile ?? null;

  return (
    <div className="space-y-6">
      <p className="rounded-[24px] border border-slate-200 bg-[#FAFDEB] p-5 text-sm leading-6 text-slate-600 print:hidden">
        This system doesn't have parent accounts yet, so there's no login here — instead, print or share this page with your
        parent or guardian so you can talk through it together.
      </p>

      <ActionCard title="Discussion guide" meta={tier === 'senior' ? 'For Senior School families' : 'For Junior School families'} icon={<ParentIcon />}>
        <ul className="space-y-2">
          {prompts.map((prompt) => (
            <li key={prompt} className="rounded-2xl border border-slate-200 bg-[#FCFDFE] p-4 text-sm leading-6 text-slate-600">
              {prompt}
            </li>
          ))}
        </ul>
      </ActionCard>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)] print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <h2 className="text-lg font-semibold text-[#101820]">Printable summary</h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            <PrintIcon />
            Print / Save as PDF
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Student</p>
            <p className="mt-1 text-base font-semibold text-[#101820]">
              {summary?.student?.name ?? user?.name} · {summary?.student?.grade ?? user?.grade ?? 'Grade not set'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Pathway &amp; track</p>
            {current ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {current.track?.name} ({current.track?.pathway?.name}) — chosen {new Date(current.createdAt).toLocaleDateString()}
                {current.notes ? <span className="block mt-1 text-slate-500">"{current.notes}"</span> : null}
              </p>
            ) : (
              <EmptyState title="No pathway chosen yet." />
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Talents &amp; strengths</p>
            {profile && (profile.talents.length > 0 || profile.strengths.length > 0) ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {[...profile.talents, ...profile.strengths].map((item) => (
                  <span key={item} className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-slate-600">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing logged yet." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
