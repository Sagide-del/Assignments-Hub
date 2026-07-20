import { useQuery } from '@tanstack/react-query';
import { schoolsApi } from '../../api/schools.api';


export function PlatformOverview() {

  const {
    data: schools = [],
    isLoading,
  } = useQuery({

    queryKey: ['schools'],

    queryFn: schoolsApi.findAll,

  });



  const totalSchools = schools.length;


  const daySchools =
    schools.filter(
      (school) => school.type === 'DAY'
    ).length;


  const boardingSchools =
    schools.filter(
      (school) => school.type === 'BOARDING'
    ).length;



  return (

    <div className="space-y-8">


      <div>

        <h1 className="
          text-3xl
          font-bold
          text-[#101820]
        ">

          Platform Overview

        </h1>


        <p className="
          mt-2
          text-gray-500
        ">

          Monitor Assignment Hub growth,
          schools, and platform activity.

        </p>


      </div>





      <div className="
        grid
        grid-cols-1
        md:grid-cols-2
        lg:grid-cols-4
        gap-5
      ">


        <MetricCard
          title="Total Schools"
          value={totalSchools}
        />


        <MetricCard
          title="Day Schools"
          value={daySchools}
        />


        <MetricCard
          title="Boarding Schools"
          value={boardingSchools}
        />


        <MetricCard
          title="Platform Status"
          value="Active"
        />


      </div>






      <div className="
        bg-white
        rounded-2xl
        border
        p-6
      ">


        <h2 className="
          text-xl
          font-bold
          text-[#101820]
        ">

          Platform Health

        </h2>


        <div className="
          mt-5
          grid
          md:grid-cols-3
          gap-5
        ">


          <HealthCard title="Authentication" />

          <HealthCard title="School Management" />

          <HealthCard title="Learning Platform" />


        </div>


      </div>






      <div className="
        bg-white
        rounded-2xl
        border
        p-6
      ">


        <h2 className="
          text-xl
          font-bold
          text-[#101820]
        ">

          Recent Schools

        </h2>



        {isLoading ? (

          <p className="mt-5 text-gray-500">

            Loading schools...

          </p>


        ) : (


          <div className="
            mt-5
            space-y-3
          ">


            {schools.slice(0,5).map((school) => (

              <div
                key={school.id}
                className="
                  flex
                  justify-between
                  items-center
                  bg-gray-50
                  rounded-xl
                  p-4
                "
              >

                <div>

                  <p className="font-semibold">

                    {school.name}

                  </p>


                  <p className="text-sm text-gray-500">

                    {school.code}

                  </p>


                </div>



                <span className="
                  bg-[#B5E61D]
                  text-[#101820]
                  px-3
                  py-1
                  rounded-full
                  text-xs
                  font-semibold
                ">

                  {school.type}

                </span>


              </div>

            ))}


          </div>


        )}


      </div>


    </div>

  );

}





function MetricCard({

  title,

  value,

}: {

  title: string;

  value: number | string;

}) {


  return (

    <div className="
      bg-white
      rounded-2xl
      border
      shadow-sm
      p-6
      relative
      overflow-hidden
    ">


      <div className="
        absolute
        top-0
        left-0
        h-1
        w-full
        bg-[#B5E61D]
      "/>


      <p className="text-sm text-gray-500">

        {title}

      </p>


      <p className="
        mt-3
        text-3xl
        font-bold
        text-[#101820]
      ">

        {value}

      </p>


    </div>

  );

}





function HealthCard({

  title,

}: {

  title: string;

}) {


  return (

    <div className="
      bg-gray-50
      rounded-xl
      p-4
      flex
      justify-between
      items-center
    ">


      <span className="text-sm font-medium">

        {title}

      </span>


      <span className="
        bg-[#101820]
        text-[#B5E61D]
        text-xs
        px-3
        py-1
        rounded-full
      ">

        Operational

      </span>


    </div>

  );

}