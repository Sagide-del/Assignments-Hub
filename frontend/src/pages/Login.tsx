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
    <main className="relative min-h-screen overflow-hidden bg-[#F8FAFC] text-[#101820]">
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#B5E61D]/15 blur-3xl" />
        <div className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-slate-200/80 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#101820] lg:flex lg:min-h-screen">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: "url('/classroom-environment.png')" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#101820]/60 via-[#101820]/85 to-[#101820]" />

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

            <div className="max-w-xl pb-10">
              <div className="mb-6 h-1 w-14 rounded-full bg-[#B5E61D]" />
              <h1 className="text-4xl font-semibold leading-tight text-white xl:text-5xl">
                Learn, practise and progress in one place.
              </h1>
              <div className="mt-9 grid grid-cols-3 gap-3 text-sm">
                {['Assignments', 'STEM Labs', 'Learning progress'].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-slate-200 backdrop-blur"
                  >
                    {label}
                  </div>
                ))}
              </div>
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

            <p className="mt-5 text-center text-xs text-slate-500">
              Secure access for students, teachers and school administrators.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
