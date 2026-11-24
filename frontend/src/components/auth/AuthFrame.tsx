import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LockKeyhole,
  School,
  Sparkles,
  BookOpen,
  Compass,
} from "lucide-react";
import { AssignmentHubWordmark } from "../ui/Logo";
import { LoginTabs, type LoginType } from "./LoginTabs";
export function AuthFrame({
  account,
  mode,
  fixedSchoolCode,
  children,
}: {
  account: LoginType;
  mode: "login" | "register";
  fixedSchoolCode?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const path = (nextMode: "login" | "register", type: LoginType) =>
    `${nextMode === "register" ? "/register" : "/login"}?account=${type}`;
  return (
    <main className="min-h-screen bg-[#f5f7f3] px-3 py-5 text-[#101820] sm:px-6 sm:py-8 lg:flex lg:items-center">
      <div className="mx-auto w-full max-w-lg lg:grid lg:max-w-5xl lg:grid-cols-[.9fr_1fr] lg:items-start lg:gap-16">
        <aside className="relative hidden overflow-hidden rounded-[2rem] bg-[#163b30] px-9 py-12 text-white lg:block lg:self-stretch">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
            <Sparkles size={23} className="text-[#c4e86b]" />
          </span>
          <p className="mt-12 text-xs font-semibold uppercase tracking-[.2em] text-[#c4e86b]">
            Assignment Hub
          </p>
          <h2 className="mt-4 max-w-xs text-4xl font-semibold leading-tight tracking-tight">
            Small steps.
            <br />
            Brighter futures.
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-6 text-emerald-100/75">
            Your space to practise, discover and grow.
          </p>
          <div aria-hidden="true" className="relative mt-12 h-40">
            <div className="absolute bottom-0 left-0 h-16 w-16 rounded-2xl border border-white/10 bg-white/5" />
            <div className="absolute bottom-0 left-20 h-24 w-16 rounded-2xl border border-[#c4e86b]/25 bg-[#c4e86b]/10" />
            <div className="absolute bottom-0 left-40 flex h-32 w-16 items-start justify-center rounded-2xl bg-[#c4e86b] pt-4 text-[#163b30]">
              <BookOpen size={24} />
            </div>
            <div className="absolute bottom-16 right-0 flex h-12 w-12 rotate-12 items-center justify-center rounded-2xl border border-white/15 bg-[#255344]">
              <Compass size={24} />
            </div>
          </div>
          <p className="mt-10 border-t border-white/10 pt-5 text-xs text-emerald-100/65">
            Made for Kenyan learners.
          </p>
        </aside>
        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link to="/" aria-label="Assignment Hub home">
              <AssignmentHubWordmark size="sm" />
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-slate-500"
            >
              <ArrowLeft size={14} />
              Home
            </Link>
          </div>
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_32px_rgba(16,24,32,0.035)] sm:p-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Choose your account
            </p>
            <LoginTabs
              loginType={account}
              setLoginType={(type) => {
                if (type !== account)
                  navigate(path(type === "independent" ? mode : "login", type));
              }}
            />
            {account === "independent" && (
              <nav
                aria-label="Account access"
                className="mt-5 grid grid-cols-2 border-b border-slate-200"
              >
                {(
                  [
                    { key: "login", label: "Log In" },
                    {
                      key: "register",
                      label: "Create Account",
                    },
                  ] as const
                ).map((tab) => (
                  <Link
                    key={tab.key}
                    to={
                      tab.key === "login" && fixedSchoolCode
                        ? `/school/${encodeURIComponent(fixedSchoolCode)}/login`
                        : path(tab.key, account)
                    }
                    aria-current={mode === tab.key ? "page" : undefined}
                    className={`flex min-h-12 items-center justify-center border-b-2 text-sm font-semibold ${mode === tab.key ? "border-[#607d00] text-[#405615]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
            )}
            <header className="mb-6 mt-6 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {mode === "register" && account === "independent"
                  ? "Create your account"
                  : account === "staff"
                    ? "Staff log in"
                    : account === "independent"
                      ? "Independent learner log in"
                      : "School learner log in"}
              </h1>
              {mode === "register" && account === "independent" && (
                <span className="rounded-full bg-[#f1f5e5] px-3 py-1.5 text-xs font-semibold text-[#405615]">
                  KES 300 / month
                </span>
              )}
              {fixedSchoolCode && (
                <p className="flex w-full items-center gap-2 text-sm text-slate-500">
                  <School size={16} />
                  {fixedSchoolCode}
                </p>
              )}
            </header>
            <p className="-mt-3 mb-6 text-sm leading-5 text-slate-500">
              {account === "student"
                ? "Use your school code, admission number and learner PIN."
                : account === "staff"
                  ? "Use the account provided by your administrator."
                  : mode === "register"
                    ? "Set up your personal learning workspace."
                    : "Use your username or email and password."}
            </p>
            {children}
          </section>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <LockKeyhole size={13} />
            Your learning. Securely connected.
          </p>
        </div>
      </div>
    </main>
  );
}
