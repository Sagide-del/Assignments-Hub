import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/reports.api';
import { useAuthStore } from '../../store/auth.store';

const REPORT_TYPES = ['users', 'assignments', 'labs', 'financial'] as const;
type ReportType = (typeof REPORT_TYPES)[number];

// GET /reports/users|assignments|labs|financial — school-scoped aggregate
// reports. `financial` is SCHOOL_ADMIN/PLATFORM_ADMIN only on the backend;
// hidden here for TEACHER via the calling dashboard's nav, not re-checked
// client-side (the backend's RolesGuard is the real gate).
export function SchoolAdminReports({ availableTypes = REPORT_TYPES }: { availableTypes?: readonly ReportType[] }) {
  const user = useAuthStore((s) => s.user);
  const [type, setType] = useState<ReportType>(availableTypes[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['report', type, user?.schoolId],
    queryFn: () => {
      switch (type) {
        case 'users': return reportsApi.users(user?.schoolId);
        case 'assignments': return reportsApi.assignments(user?.schoolId);
        case 'labs': return reportsApi.labs(user?.schoolId);
        case 'financial': return reportsApi.financial(user?.schoolId);
      }
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className="flex gap-2">
        {availableTypes.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1.5 text-sm rounded capitalize ${type === t ? 'bg-brand text-white' : 'border border-gray-300 text-gray-600'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <pre className="bg-white rounded-lg border border-gray-200 p-4 text-xs overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
