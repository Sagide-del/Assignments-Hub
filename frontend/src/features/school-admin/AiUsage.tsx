import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/reports.api';

export function AiUsage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => reportsApi.aiUsage(),
  });

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Loading AI usage...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load AI usage data.
      </div>
    );
  }

  const quotaLimit = data?.quotaLimit ?? 0;
  const used = data?.successfulGenerations ?? data?.currentMonthUsage ?? 0;
  const remaining = data?.remaining ?? Math.max(quotaLimit - used, 0);

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-semibold">
          AI Usage Dashboard
        </h1>

        <p className="text-sm text-gray-500">
          Monitor AI assignment generation usage for your school.
        </p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">
            Monthly Limit
          </p>
          <p className="text-2xl font-semibold">
            {quotaLimit === null ? 'Unlimited' : quotaLimit}
          </p>
        </div>


        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">
            Used
          </p>
          <p className="text-2xl font-semibold">
            {used}
          </p>
        </div>


        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">
            Remaining
          </p>
          <p className="text-2xl font-semibold">
            {remaining}
          </p>
        </div>

      </div>


      <div className="bg-white border rounded-lg p-4">

        <h2 className="font-medium mb-3">
          Provider Breakdown
        </h2>


        {data?.providerBreakdown &&
        data.providerBreakdown.length > 0 ? (

          <ul className="space-y-2">

            {data.providerBreakdown.map((item) => (
              <li
                key={item.provider}
                className="flex justify-between text-sm border-b pb-2"
              >
                <span>
                  {item.provider}
                </span>

                <span>
                  {item.count}
                </span>

              </li>
            ))}

          </ul>

        ) : (

          <p className="text-sm text-gray-500">
            No AI usage recorded yet.
          </p>

        )}

      </div>


    </div>
  );
}