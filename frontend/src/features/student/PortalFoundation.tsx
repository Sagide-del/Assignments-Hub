import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

interface QuickLink {
  to: string;
  label: string;
  description: string;
}

interface PortalFoundationProps {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  quickLinks: QuickLink[];
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 17L17 7M9 7h8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PortalFoundation({
  eyebrow,
  title,
  description,
  highlights,
  quickLinks,
}: PortalFoundationProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(16,24,32,0.08)]">
        <div className="relative overflow-hidden bg-[#101820] px-6 py-8 text-white md:px-8 md:py-10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(181,230,29,0.22),transparent_55%)]" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B5E61D]">{eyebrow}</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              {description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/88 backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-200 bg-[#F8FAFC] p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Student context</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Student</p>
                <p className="mt-1 text-lg font-semibold text-[#101820]">{user?.name ?? 'Student account'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Grade</p>
                <p className="mt-1 text-lg font-semibold text-[#101820]">{user?.grade ?? 'Not assigned yet'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">School reference</p>
                <p className="mt-1 text-lg font-semibold text-[#101820]">School-scoped portal</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Experience status</p>
                <p className="mt-1 text-lg font-semibold text-[#101820]">Phase 1 foundation</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Available now</p>
            <div className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-start justify-between rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-[#B5E61D] hover:bg-[#F8FAFC]"
                >
                  <div className="pr-3">
                    <p className="text-sm font-semibold text-[#101820]">{link.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{link.description}</p>
                  </div>
                  <span className="mt-0.5 text-[#101820]">
                    <ArrowUpRightIcon />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
