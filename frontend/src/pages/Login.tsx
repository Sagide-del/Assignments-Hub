import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { LoginCard } from '../components/auth/LoginCard';
import type { LoginType } from '../components/auth/LoginTabs';
import { Logo } from '../components/ui/Logo';

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
          <div className="absolute inset-0 bg-gradient-to-r from-[#101820]/78 via-[#101820]/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101820]/62 via-transparent to-[#101820]/10" />

          <div className="relative z-10 flex w-full flex-col justify-between px-12 py-14 xl:px-16">
            <div className="flex items-center gap-3">
              <Logo name="Assignment Hub" size="sm" />
              <div>
                <p className="font-semibold tracking-wide text-white">Assignment Hub</p>
                <p className="text-sm text-slate-400">School learning workspace</p>
              </div>
            </div>

            <div className="max-w-lg pb-8">
              <div className="mb-5 h-1 w-12 rounded-full bg-[#B5E61D]" />
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#B5E61D]">Learn. Practise. Improve.</p>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white xl:text-5xl">
                Your learning, all in one place.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-200">
                Access assignments, resources, practical activities and feedback in one connected workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-14">
          <div className="w-full max-w-[540px]">
            <div className="mb-5 flex items-center gap-3 px-2 lg:hidden">
              <Logo name="Assignment Hub" size="sm" />
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
