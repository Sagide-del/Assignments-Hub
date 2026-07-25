import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../store/auth.store';
import { schoolsApi } from '../api/schools.api';
import { authApi } from '../api/auth.api';
import { applySchoolTheme } from '../themes/schoolTheme';
import { Logo } from '../components/ui/Logo';
import { Footer } from '../components/ui/Footer';

interface NavItem {
  to: string;
  label: string;
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SidebarSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
      {children}
    </p>
  );
}

export function DashboardLayout({ nav }: { nav: NavItem[] }) {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';
  const isStudent = user?.role === 'STUDENT';

  const { data: school } = useQuery({
    queryKey: ['school', user?.schoolId],
    queryFn: () => schoolsApi.findOne(user!.schoolId),
    enabled: !!user && !isPlatformAdmin && !!user.schoolId,
  });

  useEffect(() => {
    applySchoolTheme(school ?? null);
    return () => {
      applySchoolTheme(null);
    };
  }, [school]);

  // Lock body scroll while the mobile nav drawer is open so the page behind
  // it doesn't scroll along with it (390px-wide phones especially).
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  async function handleLogout() {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
      }
    }

    clearSession();
    navigate('/login', { replace: true });
  }

  const brandTitle = isPlatformAdmin ? 'Assignment Hub' : school?.name ?? 'Assignment Hub';
  const subtitle = isPlatformAdmin ? 'Platform Console' : school?.code ?? 'School code';
  const logoSrc = isPlatformAdmin ? null : school?.logoUrl;
  const footerMeta = isStudent ? user?.grade ?? 'Grade not set' : user?.role.replace('_', ' ');
  const isStudentPortal = nav.some((item) => item.to.startsWith('/student'));

  return (
    <div className="min-h-screen md:flex" style={{ backgroundColor: 'var(--school-background, #F8FAFC)' }}>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Logo src={logoSrc} name={brandTitle} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#101820]">{brandTitle}</p>
            <p className="truncate text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#101820] shadow-sm transition hover:text-[#101820]"
          style={{ borderColor: mobileNavOpen ? 'var(--school-accent, #B5E61D)' : '#e2e8f0' }}
          aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Backdrop behind the mobile drawer — tapping it closes the nav,
          same as tapping a link or the close button. Desktop never renders
          it (md:hidden) since the sidebar there is static, not an overlay. */}
      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-80 max-w-[85vw] flex-col text-white transition-transform duration-300 ease-in-out md:static md:z-auto md:min-h-screen md:w-80 md:max-w-none md:translate-x-0 md:border-r md:border-white/10 ${
          mobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--school-primary, #101820)' }}
      >
        <div className="border-b border-white/10 px-6 pb-6 pt-7">
          <div className="flex items-center gap-4">
            <Logo src={logoSrc} name={brandTitle} size="md" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">{brandTitle}</h2>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-white/45">
                {subtitle}
              </p>
            </div>
          </div>

          {isStudentPortal ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
                Student profile
              </p>
              <p className="mt-3 truncate text-base font-semibold">{user?.name}</p>
              <p className="mt-1 text-sm text-white/65">{user?.grade ?? 'Grade not set'}</p>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <SidebarSectionLabel>Navigation</SidebarSectionLabel>
          <nav className="mt-4 space-y-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  [
                    'group flex items-center rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200',
                    isActive ? 'text-[#101820] shadow-[0_12px_30px_rgba(16,24,32,0.16)]' : 'text-white/72 hover:bg-white/7 hover:text-white',
                  ].join(' ')
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        backgroundColor: 'var(--school-accent, #B5E61D)',
                      }
                    : undefined
                }
              >
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 p-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="mt-1 text-sm text-white/60">{footerMeta}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-[#101820] transition hover:opacity-95"
            style={{ backgroundColor: 'var(--school-accent, #B5E61D)' }}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
