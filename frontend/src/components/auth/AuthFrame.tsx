import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, School } from "lucide-react";
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
    <main className="min-h-screen bg-[#f3f5f4] px-3 py-5 text-[#101820] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-xl">
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
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(16,24,32,0.04)] sm:p-8">
          <LoginTabs
            loginType={account}
            setLoginType={(type) => {
              if (type !== account) navigate(path(mode, type));
            }}
          />
          <nav
            aria-label="Account access"
            className="mt-5 grid grid-cols-2 border-b border-slate-200"
          >
            {(
              [
                { key: "login", label: "Log In" },
                { key: "register", label: "Create Account" },
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
          <header className="mb-6 mt-6 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "register"
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
          {children}
        </section>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <LockKeyhole size={13} />
          Secure account access · Assignment Hub
        </p>
      </div>
    </main>
  );
}
