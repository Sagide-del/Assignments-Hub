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
            "linear-gradient(90deg, rgba(10,15,20,0.78) 0%, rgba(10,15,20,0.65) 55%, rgba(10,15,20,0.45) 100%), url('/learners-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >

        <div className="relative z-10 px-16 py-14 flex flex-col justify-between w-full">

          <div>

            {/* TEXT BRAND ONLY - NO LOGO */}
            <div>
              <h2 className="text-4xl font-bold tracking-tight">
                Assignment Hub
              </h2>

              <p className="text-gray-300 mt-2 text-lg">
                Smart Learning Platform
              </p>
            </div>


            <h1 className="mt-16 text-5xl font-bold leading-[1.15] max-w-xl">

              Smarter Assignments.
              <br />

              <span className="text-[#B5E61D]">
                Stronger Learning.
              </span>

            </h1>


            <p className="mt-8 text-lg text-gray-200 leading-relaxed max-w-lg">

              Connect schools, teachers, students and parents
              through one intelligent platform built for
              modern CBC education.

            </p>


            <div className="mt-12 space-y-6">

              <Feature text="Smart digital assignment workflows" />

              <Feature text="Real-time student progress insights" />

              <Feature text="Secure school learning management" />

            </div>

          </div>



          {/* TRUST MESSAGE */}

          <div
            className="
            bg-black/35
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




      {/* LOGIN AREA */}

      <section className="w-full lg:w-1/2 flex items-center justify-center px-8 bg-white">


        <div
          className="
          w-full
          max-w-md
          bg-white
          rounded-3xl
          shadow-xl
          border
          border-gray-100
          p-10
          "
        >

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

      <div
        className="
        w-3
        h-3
        rounded-full
        bg-[#B5E61D]
        shadow-[0_0_12px_#B5E61D]
        "
      />

      <p className="text-gray-100 text-base">
        {text}
      </p>


    </div>

  );

}