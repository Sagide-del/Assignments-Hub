import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, PackageCheck, Store, X } from 'lucide-react';
import { apiErrorMessage } from '../../api/axios';
import { resourcesApi } from '../../api/resources.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ResourceMarketplaceAdminPage() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const purchasesQuery = useQuery({ queryKey: ['admin-resource-purchases'], queryFn: resourcesApi.adminPurchases });
  const summaryQuery = useQuery({ queryKey: ['platform-resource-summary'], queryFn: resourcesApi.sellerSummary });
  const reviewMutation = useMutation({
    mutationFn: ({ id, approved, rejectionReason }: { id: number; approved: boolean; rejectionReason?: string }) => resourcesApi.reviewPurchase(id, approved, rejectionReason),
    onSuccess: async () => {
      setStatus('Purchase review saved.');
      setRejectingId(null);
      setReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-resource-purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['platform-resource-summary'] }),
      ]);
    },
    onError: (error) => setStatus(apiErrorMessage(error, 'Purchase could not be reviewed')),
  });

  const purchases = purchasesQuery.data ?? [];
  const pending = purchases.filter((purchase) => purchase.status === 'AWAITING_VERIFICATION');
  const summary = summaryQuery.data;

  return (
    <div className="space-y-5 pb-12">
      <PageHeader title="Resource Marketplace" />
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard compact label="Pending verification" value={pending.length} />
        <MetricCard compact label="Confirmed sales" value={summary?.confirmedSales ?? 0} />
        <MetricCard compact label="Platform revenue" value={`KES ${(summary?.platformFeeKES ?? 0).toLocaleString()}`} />
      </section>
      {status ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{status}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><Store className="h-5 w-5" strokeWidth={1.75} /><h2 className="font-semibold text-[#101820]">Payment verification</h2></div>
        {purchasesQuery.isLoading ? <div className="p-5"><EmptyState title="Loading purchases..." /></div> : pending.length === 0 ? <div className="p-5"><EmptyState title="No payments awaiting verification." /></div> : (
          <div className="divide-y divide-slate-100">
            {pending.map((purchase) => (
              <div key={purchase.id} className="px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"><PackageCheck className="h-5 w-5" /></div><div className="min-w-0"><p className="font-semibold text-[#101820]">{purchase.resource.title}</p><p className="mt-1 text-sm text-slate-500">{purchase.student?.name} · {purchase.student?.school.name}</p><p className="mt-1 text-xs text-slate-400">KES {purchase.amountKES.toLocaleString()} · {purchase.paymentMethod ? label(purchase.paymentMethod) : 'No payment method'} · Ref {purchase.paymentReference ?? '—'}</p></div></div>
                  <div className="flex gap-2"><button type="button" onClick={() => reviewMutation.mutate({ id: purchase.id, approved: true })} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white"><Check className="h-4 w-4" />Approve</button><button type="button" onClick={() => setRejectingId(purchase.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-red-700"><X className="h-4 w-4" />Reject</button></div>
                </div>
                {rejectingId === purchase.id ? <div className="mt-4 flex flex-col gap-2 rounded-xl bg-red-50 p-3 sm:flex-row"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rejection" className="min-h-11 flex-1 rounded-xl border border-red-200 bg-white px-3 text-base outline-none" /><button type="button" disabled={!reason.trim() || reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: purchase.id, approved: false, rejectionReason: reason.trim() })} className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Confirm rejection</button></div> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-[#101820]">Recent marketplace payments</h2></div>
        <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400"><tr><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Student</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Seller share</th><th className="px-5 py-3">Platform fee</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{purchases.slice(0, 100).map((purchase) => <tr key={purchase.id}><td className="px-5 py-3 font-medium text-[#101820]">{purchase.resource.title}</td><td className="px-5 py-3 text-slate-600">{purchase.student?.name ?? '—'}</td><td className="px-5 py-3 text-slate-600">KES {purchase.amountKES.toLocaleString()}</td><td className="px-5 py-3 text-slate-600">KES {purchase.sellerShareKES.toLocaleString()}</td><td className="px-5 py-3 text-slate-600">KES {purchase.platformFeeKES.toLocaleString()}</td><td className="px-5 py-3"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{label(purchase.status)}</span></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
