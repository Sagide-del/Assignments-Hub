import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/reports.api';
import { useAuthStore } from '../../store/auth.store';

// GET /reports/student/:studentId — the actual "report card" endpoint.
// Shape isn't strictly documented on the backend, so this renders
// defensively (raw JSON) rather than assuming field names that might not
// match — safer than presenting invented numbers as if they were real.
export function StudentReports() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useQuery({
    queryKey: ['report-card', user?.id],
    queryFn: () => reportsApi.studentReportCard(user!.id),
    enabled: !!user,
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">My Report</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">Couldn't load your report.</p>}
      {data ? (
        <pre className="bg-white rounded-lg border border-gray-200 p-4 text-xs overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
