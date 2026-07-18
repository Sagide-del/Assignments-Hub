import { useState } from 'react';
import { LoginCard } from '../components/auth/LoginCard';
import type { LoginType } from '../components/auth/LoginTabs';

export default function Login() {
  const [loginType, setLoginType] = useState<LoginType>('student');

  return (
    <div className="min-h-screen flex bg-white">

      {/* LEFT BRAND PANEL */}
      <section
        className="
          hidden
          lg:flex
          lg:w-1/2
          relative
          overflow-hidden
          text-white
        "
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(10,15,20,0.92) 0%, rgba(10,15,20,0.72) 45%, rgba(10,15,20,0.40) 100%), url('/classroom-environment.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
        }}
      >

        <div
          className="
            relative
            z-10
            w-full
            px-10
            xl:px-16
            py-14
            flex
            flex-col
            justify-between
          "
        >

          {/* LEFT BRANDING */}
          <div>

            <h2
              className="
                text-3xl
                xl:text-4xl
                font-bold
                tracking-tight
              "
            >
              Assignment Hub
            </h2>


            <p className="mt-2 text-gray-300 text-lg">
              Smart Learning Platform
            </p>



            <h1
              className="
                mt-16
                text-4xl
                xl:text-5xl
                font-bold
                leading-tight
                max-w-xl
              "
            >
              Smarter Assignments.
              <br />

              <span className="text-[#B5E61D]">
                Stronger Learning.
              </span>

            </h1>



            <p
              className="
                mt-8
                text-lg
                text-gray-200
                leading-relaxed
                max-w-lg
              "
            >
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



          {/* TRUST CARD */}

          <div
            className="
              bg-black/40
              backdrop-blur-md
              border
              border-white/10
              rounded-2xl
              p-5
              max-w-md
            "
          >

            <p className="text-lg font-semibold">
              Empowering teachers.
            </p>

            <p className="text-lg font-semibold">
              Inspiring students.
            </p>

            <p className="text-lg font-semibold text-[#B5E61D]">
              Elevating schools.
            </p>

          </div>


        </div>


      </section>




      {/* RIGHT LOGIN PANEL */}

      <section
        className="
          w-full
          lg:w-1/2
          flex
          items-center
          justify-center
          px-6
          sm:px-10
          bg-white
        "
      >

        <div
          className="
            w-full
            max-w-md
            bg-white
            rounded-3xl
            shadow-xl
            border
            border-gray-100
            p-8
            sm:p-10
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