import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../store/auth.store';
import { schoolsApi } from '../api/schools.api';
import { authApi } from '../api/auth.api';
import { applySchoolTheme } from '../themes/schoolTheme';


interface NavItem {
  to: string;
  label: string;
}


export function DashboardLayout({ nav }: { nav: NavItem[] }) {

  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const navigate = useNavigate();

  const [mobileNavOpen, setMobileNavOpen] =
    useState(false);


  const isPlatformAdmin =
    user?.role === 'PLATFORM_ADMIN';



  const { data: school } = useQuery({

    queryKey: ['school', user?.schoolId],

    queryFn: () =>
      schoolsApi.findOne(user!.schoolId),

    enabled:
      !!user &&
      !isPlatformAdmin &&
      !!user.schoolId,

  });





  useEffect(() => {

    applySchoolTheme(
      school ?? null
    );

    return () => {
      applySchoolTheme(null);
    };

  }, [school]);






  async function handleLogout() {

    if (refreshToken) {

      try {

        await authApi.logout(refreshToken);

      } catch {

      }

    }


    clearSession();

    navigate('/login', {
      replace: true,
    });

  }






  const brandTitle =
    isPlatformAdmin
      ? 'Assignment Hub'
      : school?.name ?? 'Assignment Hub';



  const subtitle =
    isPlatformAdmin
      ? 'Platform Console'
      : school?.code ?? '';






  return (

    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">





      {/* MOBILE HEADER */}

      <div className="
        md:hidden
        flex
        items-center
        justify-between
        bg-[#101820]
        px-5
        py-4
      ">


        <div className="flex items-center gap-3">


          <div className="
            h-10
            w-10
            rounded-xl
            bg-white
            flex
            items-center
            justify-center
            shadow-lg
          ">

            <img
              src="/logo.png"
              alt="Assignment Hub"
              className="
                h-8
                w-8
                object-contain
              "
            />

          </div>



          <div>

            <p className="
              text-white
              font-semibold
              text-sm
            ">

              {brandTitle}

            </p>


            <p className="
              text-gray-400
              text-xs
            ">

              {subtitle}

            </p>

          </div>


        </div>





        <button

          onClick={() =>
            setMobileNavOpen(
              !mobileNavOpen
            )
          }

          className="
            text-[#B5E61D]
            text-xl
          "

        >

          {mobileNavOpen ? '✕' : '☰'}

        </button>


      </div>








      {/* SIDEBAR */}

      <aside

        className={`
          md:w-72
          bg-[#101820]
          text-white
          md:flex
          md:flex-col

          ${
            mobileNavOpen
              ? 'flex flex-col'
              : 'hidden'
          }
        `}

      >






        {/* PREMIUM BRAND AREA */}

        <div className="
          p-6
          border-b
          border-white/10
        ">


          <div className="
            flex
            items-center
            gap-4
          ">



            <div className="
              h-16
              w-16
              rounded-2xl
              bg-white
              flex
              items-center
              justify-center
              shadow-xl
            ">


              <img

                src="/logo.png"

                alt="Assignment Hub"

                className="
                  h-12
                  w-12
                  object-contain
                "

              />


            </div>






            <div className="min-w-0">


              <h2 className="
                text-lg
                font-bold
                tracking-tight
              ">

                {brandTitle}

              </h2>



              <p className="
                text-sm
                text-gray-400
                mt-1
              ">

                {subtitle}

              </p>



            </div>


          </div>



        </div>









        {/* NAVIGATION */}

        <nav className="
          flex-1
          p-4
          space-y-2
        ">


          {nav.map((item) => (


            <NavLink

              key={item.to}

              to={item.to}

              end

              onClick={() =>
                setMobileNavOpen(false)
              }


              className={({isActive}) =>

                `

                flex
                items-center
                px-4
                py-3
                rounded-xl
                text-sm
                transition-all


                ${
                  isActive

                  ?

                  'bg-[#B5E61D] text-[#101820] font-semibold shadow-lg'

                  :

                  'text-gray-300 hover:bg-white/10 hover:text-white'

                }

                `

              }

            >

              {item.label}


            </NavLink>


          ))}



        </nav>










        {/* USER FOOTER */}

        <div className="
          p-6
          border-t
          border-white/10
        ">


          <p className="
            font-semibold
            truncate
          ">

            {user?.name}

          </p>



          <p className="
            text-xs
            text-gray-400
            mt-1
          ">

            {user?.role.replace('_',' ')}

          </p>





          <button

            onClick={handleLogout}

            className="
              mt-5
              w-full
              bg-[#B5E61D]
              text-[#101820]
              font-semibold
              py-3
              rounded-xl
              hover:bg-white
              transition
            "

          >

            Log out

          </button>



        </div>



      </aside>









      {/* MAIN CONTENT */}

      <main className="
        flex-1
        p-4
        md:p-8
      ">

        <Outlet />

      </main>



    </div>

  );

}