import { useQuery } from '@tanstack/react-query';
import { schoolsApi } from '../../api/schools.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

export function PlatformOverview() {
  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: schoolsApi.findAll,
  });

  const daySchools = schools.filter((school) => school.type === 'DAY').length;
  const boardingSchools = schools.filter((school) => school.type === 'BOARDING').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Schools" value={isLoading ? '-' : schools.length} />
        <MetricCard label="Day schools" value={isLoading ? '-' : daySchools} />
        <MetricCard label="Boarding schools" value={isLoading ? '-' : boardingSchools} />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-[#101820]">Recent schools</h2>
        </div>
        {isLoading ? (
          <div className="p-5"><EmptyState title="Loading schools..." /></div>
        ) : schools.length === 0 ? (
          <div className="p-5"><EmptyState title="No schools registered yet." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {schools.slice(0, 5).map((school) => (
              <div key={school.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-semibold text-[#101820]">{school.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{school.code}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {school.type === 'DAY' ? 'Day' : 'Boarding'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
