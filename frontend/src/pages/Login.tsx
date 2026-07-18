import { useState } from 'react';
import { LoginCard } from '../components/auth/LoginCard';
import type { LoginType } from '../components/auth/LoginTabs';

export default function Login() {
  const [loginType, setLoginType] = useState<LoginType>('student');

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT BRAND PANEL — hidden below lg, matches the mobile layout in the brief */}
      <section className="hidden lg:flex w-1/2 bg-[#151A1F] text-white flex-col justify-center px-16">
        <img src="/logo.png" alt="Assignment Hub" className="w-56 mb-12" />

        <h1 className="text-5xl font-bold leading-tight">
          Transform Learning.
          <br />
          <span className="text-[#B5E61D]">Empower Futures.</span>
        </h1>

        <p className="mt-6 text-gray-300 text-lg max-w-md">
          Assignment Hub connects schools, teachers, students, and parents through one intelligent learning
          platform.
        </p>

        <div className="mt-10 space-y-5">
          <Benefit text="Smart digital assignments" />
          <Benefit text="CBC learning intelligence" />
          <Benefit text="Student progress insights" />
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
    <div className="flex items-center gap-3">
      <div className="w-3 h-3 rounded-full bg-[#B5E61D]" />
      <p>{text}</p>
    </div>
  );
}
