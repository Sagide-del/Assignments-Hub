import { useState } from 'react';
import { LoginCard } from '../components/auth/LoginCard';
import type { LoginType } from '../components/auth/LoginTabs';

export default function Login() {
  const [loginType, setLoginType] = useState<LoginType>('student');

  return (
    <div className="min-h-screen flex bg-white">

      {/* LEFT BRAND PANEL */}
      <section
        className="hidden lg:flex w-1/2 relative text-white overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(10,15,20,0.96) 0%, rgba(10,15,20,0.82) 45%, rgba(10,15,20,0.45) 100%), url('/learners-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >

        <div className="relative z-10 px-16 py-14 flex flex-col justify-between w-full">

          {/* BRAND */}
          <div>

            <div className="flex items-center gap-5">

              <img
                src="/logo.png"
                alt="Assignment Hub"
                className="h-28 w-28 object-contain drop-shadow-xl"
              />

              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Assignment Hub
                </h2>

                <p className="text-gray-300 mt-1">
                  Smart Learning Platform
                </p>
              </div>

            </div>


            <h1 className="mt-20 text-5xl font-bold leading-tight">
              Smarter Assignments.
              <br />

              <span className="text-[#B5E61D]">
                Stronger Learning.
              </span>
            </h1>


            <p className="mt-8 text-lg text-gray-200 leading-relaxed max-w-lg">
              Connect schools, teachers, students and parents through one
              intelligent platform built for modern CBC education.
            </p>


            <div className="mt-12 space-y-6">

              <Feature text="Smart digital assignment workflows" />

              <Feature text="Real-time student progress insights" />

              <Feature text="Secure school learning management" />

            </div>

          </div>


          {/* TRUST CARD */}
          <div
            className="
            bg-black/40
            backdrop-blur-md
            border
            border-white/10
            rounded-2xl
            p-6
            max-w-md
            "
          >

            <p className="text-xl font-semibold">
              Empowering teachers.
            </p>

            <p className="text-xl font-semibold">
              Inspiring students.
            </p>

            <p className="text-xl font-semibold text-[#B5E61D]">
              Elevating schools.
            </p>

          </div>


        </div>

      </section>



      {/* LOGIN PANEL */}
      <section className="w-full lg:w-1/2 flex items-center justify-center px-8">

        <div className="w-full max-w-md">

          <div className="text-center mb-10">

            <img
              src="/logo.png"
              alt="Assignment Hub"
              className="h-24 w-24 mx-auto object-contain mb-6"
            />

            <h1 className="text-4xl font-bold text-gray-900">
              Welcome back!
            </h1>

            <p className="text-gray-500 mt-3">
              Sign in to your Assignment Hub account
            </p>

          </div>


          <LoginCard
            loginType={loginType}
            setLoginType={setLoginType}
          />


        </div>

      </section>


    </div>
  );
}


function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4">

      <div className="
        w-3
        h-3
        rounded-full
        bg-[#B5E61D]
        shadow-[0_0_12px_#B5E61D]
      " />

      <p className="text-gray-200 text-base">
        {text}
      </p>

    </div>
  );
}