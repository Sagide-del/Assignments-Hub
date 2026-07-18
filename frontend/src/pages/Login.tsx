import { useState } from 'react';
import { LoginCard } from '../components/auth/LoginCard';
import type { LoginType } from '../components/auth/LoginTabs';

export default function Login() {
  const [loginType, setLoginType] = useState<LoginType>('student');

  return (
    <div className="min-h-screen flex bg-white">
      {/* PREMIUM BRAND PANEL */}
      <section
        className="hidden lg:flex w-1/2 text-white flex-col justify-center px-20 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #101820 0%, #151A1F 55%, #1c2732 100%)',
        }}
      >
        {/* subtle glow effects */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#B5E61D] opacity-10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#B5E61D] opacity-5 blur-3xl" />

        <div className="relative z-10 max-w-xl">

          {/* Brand Logo */}
          <div className="flex items-center gap-5 mb-12">
            <img
              src="/logo.png"
              alt="Assignment Hub"
              className="h-20 w-20 object-contain"
            />

            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Assignment Hub
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Smart Learning Platform
              </p>
            </div>
          </div>

          {/* Main message */}
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Transform Learning.
            <br />
            <span className="text-[#B5E61D]">
              Empower Futures.
            </span>
          </h1>

          <p className="mt-7 text-gray-300 text-lg leading-relaxed max-w-lg">
            Assignment Hub connects schools, teachers, students, and parents
            through one intelligent learning platform built for modern CBC
            education.
          </p>

          {/* Benefits */}
          <div className="mt-12 space-y-6">
            <Benefit text="Smart digital assignment workflows" />
            <Benefit text="CBC curriculum intelligence" />
            <Benefit text="Real-time student progress insights" />
          </div>

          {/* Trust line */}
          <p className="mt-14 text-sm text-gray-400">
            Built for schools, educators, and learners across Kenya.
          </p>

        </div>
      </section>

      {/* LOGIN PANEL */}
      <section className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <LoginCard loginType={loginType} setLoginType={setLoginType} />
      </section>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-3 h-3 rounded-full bg-[#B5E61D] shadow-[0_0_12px_#B5E61D]" />
      <p className="text-gray-200 text-base">
        {text}
      </p>
    </div>
  );
}