import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/ui/Saas';
import { api } from '../../../api/axios';
type Summary = { since: string; stages: { stage: string; sessions: number }[]; confirmedPayingLearners: number };
const labels: Record<string,string> = { practice_start: 'Started free practice', practice_complete: 'Completed free practice', registration_open: 'Opened registration', registration_complete: 'Created an account', payment_attempt: 'Attempted payment' };
export default function CmsAnalyticsPage() {
  const report = useQuery({ queryKey: ['acquisition-summary'], queryFn: () => api.get<Summary>('/analytics/acquisition').then(r=>r.data) });
  return <div className="mx-auto max-w-5xl space-y-5"><PageHeader title="Global Analytics" />
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-slate-900">Practice to subscription</h2><p className="mt-1 text-sm text-slate-500">Last 30 days · New tracking starts with this release</p></div><button type="button" onClick={()=>void report.refetch()} aria-label="Refresh acquisition report" className="rounded-lg p-3 hover:bg-slate-100"><RefreshCw size={18} /></button></div>
      {report.isPending ? <p className="py-8 text-sm text-slate-500">Loading journey counts…</p> : report.isError ? <p role="alert" className="py-8 text-sm text-amber-800">Journey reporting is unavailable. Try refreshing shortly.</p> : <><ol className="mt-6 divide-y divide-slate-100">{report.data.stages.map(item=><li key={item.stage} className="flex items-center justify-between gap-4 py-4"><span className="text-sm text-slate-700">{labels[item.stage]}</span><strong className="text-xl tabular-nums text-slate-900">{item.sessions}</strong></li>)}</ol><div className="mt-5 flex items-center justify-between gap-4 rounded-lg bg-[#f1f5e5] p-4"><span className="text-sm font-medium">Confirmed paying learners · all traffic</span><strong className="text-xl tabular-nums">{report.data.confirmedPayingLearners}</strong></div></>}
      <p className="mt-5 text-xs leading-6 text-slate-500">Journey rows count anonymous browser sessions reaching each step; direct visitors may skip steps. Storage restrictions, privacy preferences and network failures can reduce counts. Confirmed paying learners come from successful Tuma/Jenga payment records and are not attributed to the anonymous sessions. These are not unique-person counts or conversion rates.</p>
    </section><Link to="/platform/cms" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">Back to content library →</Link></div>;
}
