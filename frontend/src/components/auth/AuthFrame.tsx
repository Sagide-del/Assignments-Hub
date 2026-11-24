import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { AssignmentHubWordmark } from "../ui/Logo";
import type { LoginType } from "./LoginTabs";

export function AuthFrame({
  account,
  mode,
  children,
}: {
  account: LoginType;
  mode: "login" | "register";
  fixedSchoolCode?: string;
  children: ReactNode;
}) {
  const registration = mode === "register";
  return (
    <main className="min-h-screen bg-[#f6f8f5] px-4 py-6 text-[#101820] sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link to="/" aria-label="Assignment Hub home">
            <AssignmentHubWordmark size="sm" />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-10 items-center gap-1 text-xs text-slate-500"
          >
            <ArrowLeft size={14} />
            Home
          </Link>
        </div>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_28px_rgba(16,24,32,0.025)] sm:p-8">
          <header className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight">
              {registration
                ? account === "independent"
                  ? "Create your account"
                  : "School-provided account"
                : "Sign in"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {registration
                ? "Independent learner registration."
                : "One account. Your learning workspace."}
            </p>
          </header>
          {children}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm">
            {registration ? (
              <Link to="/login" className="font-medium text-[#496d35]">
                Already have an account? Sign in
              </Link>
            ) : (
              <Link
                to="/register?account=independent"
                className="font-medium text-[#496d35]"
              >
                Create an independent learner account
              </Link>
            )}
          </div>
        </section>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <LockKeyhole size={12} />
          Secure access
        </p>
      </div>
    </main>
  );
}
