import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/Saas';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 17 17 7M9 7h8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const actions = [
  { to: '/student/pathways', label: 'Career Pathways' },
  { to: '/student/reports', label: 'Performance Reports' },
];

export function MyFuturePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Future" />

      <section className="grid gap-4 md:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_34px_rgba(16,24,32,0.05)] transition hover:border-[#B5E61D]"
          >
            <h2 className="text-lg font-semibold text-[#101820]">{action.label}</h2>
            <span className="text-[#101820]">
              <ArrowIcon />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
