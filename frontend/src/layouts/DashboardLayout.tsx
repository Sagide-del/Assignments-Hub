import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Activity,
  BookMarked,
  BookOpenCheck,
  Bot,
  Brain,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Compass,
  CreditCard,
  FileChartColumn,
  FileText,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  ChevronRight,
  MessageCircle,
  Palette,
  PenSquare,
  School,
  ShieldCheck,
  UserRoundSearch,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useAuthStore } from "../store/auth.store";
import { schoolsApi } from "../api/schools.api";
import { authApi } from "../api/auth.api";
import { applySchoolTheme } from "../themes/schoolTheme";
import { Logo } from "../components/ui/Logo";
import { Footer } from "../components/ui/Footer";
import {
  endCurrentPresenceSession,
  usePresenceHeartbeat,
} from "../hooks/usePresenceHeartbeat";

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

function iconForNavigation(path: string): LucideIcon {
  if (path.includes("/activity")) return Activity;
  if (
    path.includes("my-assignments") ||
    path.includes("independent-assignments")
  )
    return PenSquare;
  if (path.includes("kcse-papers") || path.includes("kjsea-mock-test"))
    return FileText;
  if (path.includes("mnemonic-cards")) return Brain;
  if (path.includes("learning-coach")) return BrainCircuit;
  if (path.includes("stem")) return FlaskConical;
  if (path.includes("learn-skills") || path.includes("skill-studio"))
    return GraduationCap;
  if (path.includes("my-pathway") || path.includes("pathways")) return Compass;
  if (path.includes("messages")) return MessageCircle;
  if (path.includes("question-bank") || path.includes("curriculum-library")) return BookMarked;
  if (path.includes("marking") || path.includes("csl-review"))
    return BookOpenCheck;
  if (path.includes("analytics") || path.includes("reports")) return BarChart3;
  if (path.includes("mentorship") || path.includes("private-tutor"))
    return UserRoundSearch;
  if (path.includes("branding")) return Palette;
  if (path.includes("billing") || path.includes("subscription"))
    return CreditCard;
  if (path.includes("activate")) return CreditCard;
  if (path.includes("ai-management") || path.includes("ai-usage")) return Bot;
  if (path.includes("independent-students")) return Users;
  if (path.includes("schools")) return School;
  if (path.includes("resources")) return LibraryBig;
  if (path.includes("users")) return Users;
  if (path.includes("audit")) return ShieldCheck;
  if (path.includes("financial")) return BriefcaseBusiness;
  if (path.includes("platform")) return Building2;
  if (path.includes("teacher")) return FileChartColumn;
  return LayoutDashboard;
}

export function DashboardLayout({ nav }: { nav: NavItem[] }) {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  usePresenceHeartbeat(location.pathname);

  const isPlatformAdmin = user?.role === "PLATFORM_ADMIN";
  const isStudent = user?.role === "STUDENT";

  const { data: school } = useQuery({
    queryKey: ["school", user?.schoolId],
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
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  async function handleLogout() {
    await endCurrentPresenceSession();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {}
    }

    clearSession();
    navigate("/login", { replace: true });
  }

  const independent = school?.name === "Independent Students";
  const brandTitle =
    isPlatformAdmin || independent
      ? "Assignment Hub"
      : (school?.name ?? "Assignment Hub");
  const subtitle = isPlatformAdmin
    ? "Platform console"
    : isStudent
      ? "Student workspace"
      : (school?.code ?? "School workspace");
  const logoSrc = isPlatformAdmin ? null : school?.logoUrl;
  const footerMeta = isStudent
    ? (user?.grade ?? "Grade not set")
    : user?.role.replace("_", " ");
  const isStudentPortal = nav.some((item) => item.to.startsWith("/student"));
  const visibleNav =
    isStudent && user?.isIndependentTrial
      ? [
          ...nav.filter((item) => item.to === "/student/my-assignments"),
          { to: "/student/activate", label: "Activate full access" },
        ]
      : nav;

  return (
    <div
      className="platform-workspace min-h-screen md:flex"
      style={{ backgroundColor: "var(--school-background, #F8FAFC)" }}
    >
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur md:hidden">
        <div
          className="flex items-center"
          title={brandTitle}
          aria-label={brandTitle}
        >
          <Logo
            src={logoSrc}
            name={brandTitle}
            size="sm"
            className="h-9 w-9 rounded-lg shadow-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#101820] transition hover:text-[#101820]"
          style={{
            borderColor: mobileNavOpen
              ? "var(--school-accent, #B5E61D)"
              : "#e2e8f0",
          }}
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
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
        className={`fixed inset-y-0 left-0 z-40 flex w-80 max-w-[85vw] flex-col text-white transition-transform duration-300 ease-in-out md:sticky md:top-0 md:z-auto md:h-screen md:w-64 md:shrink-0 md:max-w-none md:translate-x-0 md:border-r md:border-white/10 ${
          mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--school-primary, #101820)" }}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <Logo
              src={logoSrc}
              name={brandTitle}
              size="sm"
              className="h-9 w-9 rounded-lg shadow-none"
            />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold tracking-tight">
                {brandTitle}
              </h2>
              <p className="mt-1 text-[11px] font-normal text-white/50">
                {subtitle}
              </p>
            </div>
          </div>

          {isStudentPortal ? (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="sr-only">Student profile</p>
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="mt-1 text-xs text-white/50">
                {user?.grade ?? "Grade not set"}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarSectionLabel>Navigation</SidebarSectionLabel>
          <nav className="mt-3 space-y-1">
            {visibleNav.map((item) => {
              const Icon = iconForNavigation(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={
                    item.to === "/student" ||
                    item.to === "/student/dashboard" ||
                    item.to === "/platform"
                  }
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    [
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                      isActive
                        ? "text-white"
                        : "text-white/72 hover:bg-white/7 hover:text-white",
                    ].join(" ")
                  }
                  style={({ isActive }) =>
                    isActive
                      ? {
                          backgroundColor: "rgba(255,255,255,0.12)",
                        }
                      : undefined
                  }
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          {!isStudentPortal ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="mt-1 text-sm text-white/60">{footerMeta}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className={`${isStudentPortal ? "" : "mt-4 "}inline-flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white`}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="workspace-topbar hidden min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-8 md:flex">
          <div className="flex min-w-0 items-center gap-3 text-xs text-slate-500">
            <span>Workspace</span>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate font-medium text-slate-800">
              {[...visibleNav]
                .sort((a, b) => b.to.length - a.to.length)
                .find(
                  (item) =>
                    location.pathname === item.to ||
                    location.pathname.startsWith(item.to + "/"),
                )?.label ?? "Overview"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-slate-500">
              {user?.grade ?? "Account"}
            </span>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
              title={user?.name}
            >
              {user?.name
                ?.trim()
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
          </div>
        </div>
        <main className="min-w-0 flex-1 p-4 md:p-8 lg:px-10">
          <Outlet />
        </main>
        {!isStudentPortal ? <Footer /> : null}
      </div>
    </div>
  );
}
