import { useQuery } from '@tanstack/react-query';
import { pathwaysApi } from '../../api/pathways.api';

// GET /pathways/selections/stats — aggregated counts by pathway/track,
// shown to TEACHER/SCHOOL_ADMIN/PLATFORM_ADMIN. Shape isn't strictly typed
// on the backend (see api/pathways.api.ts), so this renders defensively.
export function PathwaysStats() {
  const { data, isLoading } = useQuery({ queryKey: ['pathway-stats'], queryFn: () => pathwaysApi.getStats() });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Career Pathways — School Overview</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <pre className="bg-white rounded-lg border border-gray-200 p-4 text-xs overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
      <p className="text-xs text-gray-400">
        Raw stats shown as-is until a dedicated chart view is built (see ROADMAP.md) — the data here is real,
        just not yet visualized.
      </p>
    </div>
  );
}
