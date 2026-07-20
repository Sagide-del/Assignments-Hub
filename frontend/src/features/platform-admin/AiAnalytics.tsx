import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/reports.api';


export function AiAnalytics() {

  const {
    data,
    isLoading,
    error,
  } = useQuery({

    queryKey: ['ai-usage-report'],

    queryFn: () => reportsApi.aiUsage(),

  });



  return (

    <div className="space-y-8">


      <div>

        <h1 className="
          text-3xl
          font-bold
          text-[#101820]
        ">

          AI Usage Analytics

        </h1>


        <p className="
          mt-2
          text-gray-500
        ">

          Monitor AI assignment generation activity across the platform.

        </p>


      </div>





      {isLoading && (

        <div className="
          bg-white
          rounded-2xl
          border
          p-6
          text-gray-500
        ">

          Loading AI analytics...

        </div>

      )}






      {error && (

        <div className="
          bg-red-50
          border
          border-red-200
          rounded-2xl
          p-6
          text-red-600
        ">

          Unable to load AI analytics.

        </div>

      )}







      {data && (

        <div className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
        ">


          <MetricCard
            title="Total AI Requests"
            value={data.totalRequests ?? 0}
          />


          <MetricCard
            title="Successful Generations"
            value={data.successfulRequests ?? 0}
          />


          <MetricCard
            title="Failed Requests"
            value={data.failedRequests ?? 0}
          />


        </div>

      )}






      {data && (

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

            Usage Summary

          </h2>



          <pre className="
            mt-5
            bg-gray-50
            rounded-xl
            p-4
            text-xs
            overflow-auto
          ">

            {JSON.stringify(data, null, 2)}

          </pre>


        </div>

      )}



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



      <p className="
        text-sm
        text-gray-500
      ">

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