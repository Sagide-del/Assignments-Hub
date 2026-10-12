import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, TrendingDown, Users } from 'lucide-react';
import { academicResultsApi } from '../../api/academic-results.api';
import { EmptyState, PageHeader } from '../../components/ui/Saas';

export function AcademicReports() {
  const batches = useQuery({ queryKey: ['academic-results', 'batches'], queryFn: academicResultsApi.batches });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => { if (!selectedId && batches.data?.[0]) setSelectedId(batches.data[0].id); }, [batches.data, selectedId]);
  const analysis = useQuery({ queryKey: ['academic-results', selectedId, 'analysis'], queryFn: () => academicResultsApi.analysis(selectedId!), enabled: Boolean(selectedId) });
  const selected = batches.data?.find((batch) => batch.id === selectedId);

  return (
    <div className="space-y-5 pb-12">
      <PageHeader title="Academic Reports" meta={selected ? `${selected.grade} · ${selected.term}` : 'Performance reports'} />
      {!batches.data?.length && !batches.isLoading ? <EmptyState title="No academic results are available for your class." /> : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <select value={selectedId ?? ''} onChange={(event) => setSelectedId(Number(event.target.value))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-[#101820]">
              {(batches.data ?? []).map((batch) => <option key={batch.id} value={batch.id}>{batch.name} · {batch.grade}</option>)}
            </select>
            {selected ? <button type="button" onClick={() => void academicResultsApi.downloadReport(selected.id, selected.name)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"><Download className="h-4 w-4" />Download PDF</button> : null}
          </div>
          {analysis.isLoading ? <EmptyState title="Loading report..." /> : analysis.data ? (
            <>
              <section className="grid gap-3 sm:grid-cols-3">
                <Metric icon={Users} label="Learners" value={analysis.data.overview.studentCount} />
                <Metric icon={TrendingDown} label="Average" value={`${analysis.data.overview.averagePercentage}%`} />
                <Metric icon={TrendingDown} label="Need support" value={analysis.data.overview.belowThreshold} />
              </section>
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-[#101820]">Subject performance</h2><div className="divide-y divide-slate-100">{analysis.data.subjectPerformance.map((row) => <div key={row.subject} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-semibold text-[#101820]">{row.subject}</p><p className="mt-1 text-xs text-slate-500">{row.belowThreshold} below target</p></div><span className="text-lg font-semibold tabular-nums text-[#101820]">{row.averagePercentage}%</span></div>)}</div></div>
                <div className="rounded-2xl border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-[#101820]">Teaching actions</h2><div className="space-y-3 p-5">{analysis.data.teachingActions.map((action) => <p key={action} className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{action}</p>)}</div></div>
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><Icon className="h-4 w-4 text-slate-400" /></div><p className="mt-3 text-2xl font-semibold text-[#101820]">{value}</p></div>;
}
