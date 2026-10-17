import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { LoginCard } from '../components/auth/LoginCard';
import type { LoginType } from '../components/auth/LoginTabs';
import { AssignmentHubWordmark } from '../components/ui/Logo';

export default function Login() {
  const { schoolCode } = useParams<{ schoolCode?: string }>();
  const [searchParams] = useSearchParams();
  const fixedSchoolCode = schoolCode?.trim().toUpperCase();
  const requestedAccountType = searchParams.get('account') === 'staff' ? 'staff' : 'student';
  const [loginType, setLoginType] = useState<LoginType>(requestedAccountType);
  const activeLoginType = fixedSchoolCode ? 'student' : loginType;

  return (
    <main className="min-h-screen bg-[#edf1ed] p-3 text-[#101820] sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1540px] overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(16,24,32,0.10)] sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[36px] lg:grid-cols-[0.96fr_1.04fr]">
        <section className="relative hidden overflow-hidden bg-[#101820] lg:flex lg:min-h-full">
          <div
            className="absolute inset-0 bg-cover bg-[68%_center]"
            style={{ backgroundImage: "url('/classroom-environment.png')" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#101820]/78 via-[#101820]/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101820]/62 via-transparent to-[#101820]/10" />

          <div className="relative z-10 flex w-full flex-col justify-between px-12 py-12 xl:px-16 xl:py-14">
            <AssignmentHubWordmark size="md" className="rounded-xl bg-white/95 shadow-[0_12px_28px_rgba(0,0,0,0.18)]" />
            <div className="max-w-lg">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#B5E61D]">A clearer way to learn</p>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white xl:text-5xl">
                Schoolwork, without the paper trail.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-200">
                Complete assignments, see feedback and keep learning in one reliable workspace that works on the devices students already use.
              </p>
              <div className="mt-8 grid max-w-md grid-cols-3 gap-3 border-t border-white/15 pt-6 text-xs text-slate-200">
                <span><strong className="mb-1 block text-sm text-white">Any device</strong>Browser based</span>
                <span><strong className="mb-1 block text-sm text-white">Clear work</strong>One workspace</span>
                <span><strong className="mb-1 block text-sm text-white">Guided next steps</strong>Feedback ready</span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-full items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[470px]">
            <div className="rounded-[24px] bg-white p-1 sm:p-3">
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
