import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { schoolsApi } from '../api/schools.api';
import { authApi } from '../api/auth.api';
import { applySchoolTheme } from '../themes/schoolTheme';

interface NavItem {
  to: string;
  label: string;
}

// Shared shell for every logged-in role. Pulls the caller's school record
// (name + logo — the only branding fields the backend actually has, see
// ROADMAP.md) so each school's dashboard is visibly "theirs" even though
// it's the same React build for every tenant.
export function DashboardLayout({ nav }: { nav: NavItem[] }) {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: school } = useQuery({
    queryKey: ['school', user?.schoolId],
    queryFn: () => schoolsApi.findOne(user!.schoolId),
    enabled: !!user,
  });

  useEffect(() => {
    applySchoolTheme(school ?? null);
    return () => applySchoolTheme(null);
  }, [school]);

  async function handleLogout() {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best-effort — clear local session regardless of API result.
      }
    }
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="h-8 w-8 rounded object-cover" />
          ) : (
            <div className="h-8 w-8 rounded bg-brand text-white flex items-center justify-center text-sm font-semibold">
              {school?.name?.[0] ?? 'A'}
            </div>
          )}
          <p className="font-medium text-sm truncate">{school?.name ?? 'Assignments Hub'}</p>
        </div>
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Toggle menu"
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          {mobileNavOpen ? '✕' : '☰'}
        </button>
      </div>

      <aside className={`md:w-64 bg-white border-r border-gray-200 md:flex md:flex-col ${mobileNavOpen ? 'flex flex-col' : 'hidden'}`}>
        <div className="hidden md:flex p-4 border-b border-gray-100 items-center gap-3">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 rounded bg-brand text-white flex items-center justify-center font-semibold">
              {school?.name?.[0] ?? 'A'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{school?.name ?? 'Assignments Hub'}</p>
            <p className="text-xs text-gray-500 truncate">{school?.code}</p>
          </div>
        </div>

        <nav className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm whitespace-nowrap ${
                  isActive ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.role.replace('_', ' ')}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-sm text-left text-red-600 hover:text-red-700"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
