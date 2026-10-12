import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { LoginCard } from '../components/auth/LoginCard';
import type { LoginType } from '../components/auth/LoginTabs';

export default function Login() {
  const { schoolCode } = useParams<{ schoolCode?: string }>();
  const fixedSchoolCode = schoolCode?.trim().toUpperCase();
  const [loginType, setLoginType] = useState<LoginType>('student');
  const activeLoginType = fixedSchoolCode ? 'student' : loginType;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#101820]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#101820] lg:flex lg:min-h-screen">
          <div
            className="absolute inset-0 bg-cover bg-[68%_center]"
            style={{ backgroundImage: "url('/classroom-environment.png')" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#101820]/85 via-[#101820]/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101820]/55 via-transparent to-[#101820]/15" />

          <div className="relative z-10 flex w-full flex-col justify-between px-12 py-14 xl:px-16">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B5E61D] text-lg font-black text-[#101820]">
                AH
              </span>
              <div>
                <p className="font-semibold tracking-wide text-white">Assignment Hub</p>
                <p className="text-sm text-slate-400">School learning workspace</p>
              </div>
            </div>

            <div className="max-w-md pb-10">
              <div className="mb-5 h-1 w-12 rounded-full bg-[#B5E61D]" />
              <h1 className="text-3xl font-semibold leading-tight text-white xl:text-4xl">
                Assignments, resources and practical skills in one workspace.
              </h1>
              <p className="mt-4 text-base text-slate-200">
                Complete school work on any device, receive feedback and continue learning without relying on hard-copy assignments.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-14">
          <div className="w-full max-w-[540px]">
            <div className="mb-5 flex items-center gap-3 px-2 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#101820] text-sm font-black text-[#B5E61D]">
                AH
              </span>
              <div>
                <p className="font-semibold">Assignment Hub</p>
                <p className="text-xs text-slate-500">School learning workspace</p>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(16,24,32,0.10)] sm:p-10">
              <LoginCard
                loginType={activeLoginType}
                setLoginType={setLoginType}
                fixedSchoolCode={fixedSchoolCode}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
