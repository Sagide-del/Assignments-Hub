import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiErrorMessage } from '../../api/axios';
import { paymentApi } from '../../api/subscriptions.api';
import type {
  BillingPaymentTransaction,
  InvoiceStatus,
  PaymentStatus,
  PlatformAiBillingVisibility,
} from '../../types';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return 'KES 0';
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RevenueIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M4 18V9m5 9V5m5 13v-7m5 7V3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SubscriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-9Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 10h16M7.5 14.5h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M12 4 3.7 18.4A1.1 1.1 0 0 0 4.65 20h14.7a1.1 1.1 0 0 0 .95-1.6L12 4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4m0 3.2v.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PlatformBilling() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ['platform-billing-dashboard'],
    queryFn: paymentApi.getDashboard,
  });

  const reconciliationQuery = useQuery({
    queryKey: ['platform-billing-reconciliation'],
    queryFn: paymentApi.getReconciliation,
  });

  const transactionsQuery = useQuery({
    queryKey: ['platform-billing-transactions'],
    queryFn: () => paymentApi.getTransactions(),
  });

  const invoicesQuery = useQuery({
    queryKey: ['platform-billing-invoices'],
    queryFn: () => paymentApi.getInvoices(),
  });

  const aiUsageQuery = useQuery({
    queryKey: ['platform-billing-ai-usage'],
    queryFn: () => paymentApi.getAiUsageVisibility(),
  });

  async function refreshBillingData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform-billing-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-billing-reconciliation'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-billing-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-billing-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-billing-ai-usage'] }),
    ]);
  }

  const approveMutation = useMutation({
    mutationFn: (transactionId: number) => paymentApi.approveTransaction(transactionId),
    onSuccess: async () => {
      setNotice('Payment approved and the related billing records have been refreshed.');
      await refreshBillingData();
    },
    onError: (error) => setNotice(apiErrorMessage(error, 'Unable to approve this payment')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: number; reason?: string }) =>
      paymentApi.rejectTransaction(transactionId, reason),
    onSuccess: async () => {
      setNotice('Payment rejected and removed from the verification queue.');
      await refreshBillingData();
    },
    onError: (error) => setNotice(apiErrorMessage(error, 'Unable to reject this payment')),
  });

  function rejectTransaction(transaction: BillingPaymentTransaction) {
    const reason = window.prompt('Enter a rejection reason for the school billing record:');
    if (reason === null) return;
    rejectMutation.mutate({ transactionId: transaction.id, reason: reason.trim() || undefined });
  }

  async function downloadInvoice(invoiceId: number, invoiceNumber: string) {
    setDownloadingInvoiceId(invoiceId);
    setNotice(null);
    try {
      const blob = await paymentApi.downloadInvoice(invoiceId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(apiErrorMessage(error, 'Unable to download the invoice PDF'));
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  const dashboard = dashboardQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const pendingTransactions = transactions.filter((transaction) => transaction.status === 'AWAITING_VERIFICATION');
  const aiUsageResult = aiUsageQuery.data;
  const aiUsage: PlatformAiBillingVisibility | undefined =
    aiUsageResult?.scope === 'platform' ? aiUsageResult : undefined;
  const isReviewing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-[30px] bg-[#101820] px-6 py-8 text-white shadow-[0_24px_60px_rgba(16,24,32,0.16)] lg:px-9">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-[#B5E61D]/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B5E61D]">Platform Administration</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Billing command centre</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Monitor subscription revenue, verify manual payments, reconcile invoices, and review AI usage across schools.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Verification queue</p>
            <p className="mt-1 text-2xl font-semibold text-[#B5E61D]">{pendingTransactions.length}</p>
          </div>
        </div>
      </section>

      {notice ? (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-semibold text-[#101820] hover:underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Confirmed revenue" value={formatCurrency(dashboard?.totalRevenueKES)} icon={<RevenueIcon />} />
        <SummaryCard label="Active subscriptions" value={dashboard?.activeSubscriptions ?? 0} icon={<SubscriptionIcon />} />
        <SummaryCard label="Pending payments" value={dashboard?.pendingPayments ?? 0} icon={<PaymentIcon />} />
        <SummaryCard label="Overdue accounts" value={dashboard?.overdueAccounts ?? 0} icon={<AlertIcon />} tone="attention" />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white shadow-[0_16px_46px_rgba(16,24,32,0.05)]">
        <SectionHeader
          eyebrow="Manual payments"
          title="Payment verification queue"
          description="Review Equity Paybill references submitted by schools before activating subscriptions."
          count={pendingTransactions.length}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <TableHeading>School</TableHeading>
                <TableHeading>Amount</TableHeading>
                <TableHeading>Method</TableHeading>
                <TableHeading>Reference</TableHeading>
                <TableHeading>Date</TableHeading>
                <TableHeading align="right">Action</TableHeading>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionsQuery.isLoading ? (
                <EmptyTableRow columns={6} message="Loading payments awaiting verification..." />
              ) : pendingTransactions.length === 0 ? (
                <EmptyTableRow columns={6} message="No payments are awaiting verification." />
              ) : (
                pendingTransactions.map((transaction) => (
                  <tr key={transaction.id} className="text-slate-600">
                    <TableCell>
                      <p className="font-semibold text-[#101820]">{transaction.school?.name ?? 'School unavailable'}</p>
                      <p className="mt-1 text-xs text-slate-400">{transaction.school?.code ?? `School ${transaction.schoolId}`}</p>
                    </TableCell>
                    <TableCell strong>{formatCurrency(transaction.amountKES)}</TableCell>
                    <TableCell>{formatLabel(transaction.method)}</TableCell>
                    <TableCell>{transaction.paymentReference ?? transaction.providerReference ?? 'Not supplied'}</TableCell>
                    <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => approveMutation.mutate(transaction.id)}
                          className="rounded-xl bg-[#B5E61D] px-4 py-2 text-xs font-semibold text-[#101820] transition hover:bg-[#a8d51b] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isReviewing}
                          onClick={() => rejectTransaction(transaction)}
                          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-[0_16px_46px_rgba(16,24,32,0.05)]">
          <SectionHeader
            eyebrow="Transactions"
            title="Payment history"
            description="A platform-wide record of initiated and confirmed school payments."
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <TableHeading>School</TableHeading>
                  <TableHeading>Payment</TableHeading>
                  <TableHeading>Amount</TableHeading>
                  <TableHeading>Status</TableHeading>
                  <TableHeading>Date</TableHeading>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactionsQuery.isLoading ? (
                  <EmptyTableRow columns={5} message="Loading payment history..." />
                ) : transactions.length === 0 ? (
                  <EmptyTableRow columns={5} message="No payment transactions are available yet." />
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="text-slate-600">
                      <TableCell>
                        <p className="font-semibold text-[#101820]">{transaction.school?.name ?? 'School unavailable'}</p>
                        <p className="mt-1 text-xs text-slate-400">{transaction.school?.code ?? `School ${transaction.schoolId}`}</p>
                      </TableCell>
                      <TableCell>
                        <p>{formatLabel(transaction.method)}</p>
                        <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                          {transaction.paymentReference ?? transaction.providerReference ?? 'No provider reference'}
                        </p>
                      </TableCell>
                      <TableCell strong>{formatCurrency(transaction.amountKES)}</TableCell>
                      <TableCell><PaymentStatusBadge status={transaction.status} /></TableCell>
                      <TableCell>{formatDate(transaction.confirmedAt ?? transaction.createdAt)}</TableCell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_16px_46px_rgba(16,24,32,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reconciliation</p>
          <h2 className="mt-2 text-xl font-semibold text-[#101820]">Billing alignment</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Compare billing states across invoices, payments, and subscriptions.</p>
          {reconciliationQuery.isLoading ? (
            <p className="mt-6 text-sm text-slate-500">Loading reconciliation data...</p>
          ) : (
            <div className="mt-6 space-y-5">
              <ReconciliationGroup title="Invoices" rows={reconciliationQuery.data?.invoices ?? []} showAmount />
              <ReconciliationGroup title="Payments" rows={reconciliationQuery.data?.payments ?? []} showAmount />
              <ReconciliationGroup title="Subscriptions" rows={reconciliationQuery.data?.subscriptions ?? []} />
              <div className="flex items-center justify-between rounded-2xl bg-[#101820] px-4 py-4 text-white">
                <span className="text-sm text-slate-300">Unreconciled invoices</span>
                <span className="text-xl font-semibold text-[#B5E61D]">
                  {reconciliationQuery.data?.unreconciledInvoices.length ?? 0}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white shadow-[0_16px_46px_rgba(16,24,32,0.05)]">
        <SectionHeader
          eyebrow="Invoices"
          title="Invoice management"
          description="Review issued invoices and download official PDF records."
          count={invoices.length}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <TableHeading>Invoice</TableHeading>
                <TableHeading>School</TableHeading>
                <TableHeading>Plan</TableHeading>
                <TableHeading>Amount</TableHeading>
                <TableHeading>Status</TableHeading>
                <TableHeading>Due date</TableHeading>
                <TableHeading align="right">Document</TableHeading>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoicesQuery.isLoading ? (
                <EmptyTableRow columns={7} message="Loading invoices..." />
              ) : invoices.length === 0 ? (
                <EmptyTableRow columns={7} message="No invoices have been generated yet." />
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="text-slate-600">
                    <TableCell strong>{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-[#101820]">{invoice.school?.name ?? 'School unavailable'}</p>
                      <p className="mt-1 text-xs text-slate-400">{invoice.school?.code ?? `School ${invoice.schoolId}`}</p>
                    </TableCell>
                    <TableCell>{invoice.planSnapshot ? formatLabel(invoice.planSnapshot) : 'Not assigned'}</TableCell>
                    <TableCell strong>{formatCurrency(invoice.amountKES)}</TableCell>
                    <TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell>
                    <TableCell>{formatDate(invoice.dueAt)}</TableCell>
                    <TableCell align="right">
                      <button
                        type="button"
                        disabled={downloadingInvoiceId === invoice.id}
                        onClick={() => void downloadInvoice(invoice.id, invoice.invoiceNumber)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-[#101820] transition hover:border-[#101820] disabled:cursor-wait disabled:opacity-50"
                      >
                        {downloadingInvoiceId === invoice.id ? 'Preparing...' : 'Download PDF'}
                      </button>
                    </TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white shadow-[0_16px_46px_rgba(16,24,32,0.05)]">
        <SectionHeader
          eyebrow="AI billing visibility"
          title="Usage by school"
          description="Monitor recorded token consumption without applying AI charges."
        />
        <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr_0.75fr]">
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <TableHeading>School</TableHeading>
                  <TableHeading>School code</TableHeading>
                  <TableHeading align="right">Tokens used</TableHeading>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aiUsageQuery.isLoading ? (
                  <EmptyTableRow columns={3} message="Loading AI usage..." />
                ) : (aiUsage?.usageBySchool.length ?? 0) === 0 ? (
                  <EmptyTableRow columns={3} message="No AI token usage has been recorded yet." />
                ) : (
                  aiUsage?.usageBySchool.map((usage) => {
                    const ledgerSchool = aiUsage.ledger.find((entry) => entry.schoolId === usage.schoolId)?.school;
                    return (
                      <tr key={usage.schoolId} className="text-slate-600">
                        <TableCell strong>{usage.schoolName}</TableCell>
                        <TableCell>{ledgerSchool?.code ?? `School ${usage.schoolId}`}</TableCell>
                        <TableCell align="right" strong>{usage.tokensUsed.toLocaleString()}</TableCell>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl bg-[#101820] p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B5E61D]">Platform total</p>
            <p className="mt-3 text-3xl font-semibold">{(aiUsage?.totalTokensUsed ?? 0).toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-400">tokens recorded</p>
            <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Usage by feature</p>
              {(aiUsage?.usageByFeature.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-400">No feature usage available.</p>
              ) : (
                aiUsage?.usageByFeature.map((usage) => (
                  <div key={usage.feature} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-300">{formatLabel(usage.feature)}</span>
                    <span className="font-semibold text-white">{usage.tokensUsed.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'default' | 'attention';
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(16,24,32,0.05)]">
      <div className={`absolute inset-x-0 top-0 h-1 ${tone === 'attention' ? 'bg-amber-400' : 'bg-[#B5E61D]'}`} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[#101820]">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone === 'attention' ? 'bg-amber-50 text-amber-700' : 'bg-[#101820] text-[#B5E61D]'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-[#101820]">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      {count !== undefined ? (
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{count} records</span>
      ) : null}
    </div>
  );
}

function TableHeading({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-5 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function TableCell({
  children,
  align = 'left',
  strong = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  strong?: boolean;
}) {
  return <td className={`px-5 py-4 ${align === 'right' ? 'text-right' : 'text-left'} ${strong ? 'font-semibold text-[#101820]' : ''}`}>{children}</td>;
}

function EmptyTableRow({ columns, message }: { columns: number; message: string }) {
  return (
    <tr>
      <td colSpan={columns} className="px-5 py-10 text-center text-sm text-slate-500">{message}</td>
    </tr>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    PROCESSING: 'bg-blue-50 text-blue-700',
    AWAITING_VERIFICATION: 'bg-amber-50 text-amber-700',
    CONFIRMED: 'bg-emerald-50 text-emerald-700',
    FAILED: 'bg-red-50 text-red-700',
    REJECTED: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-600',
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{formatLabel(status)}</span>;
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    ISSUED: 'bg-blue-50 text-blue-700',
    PAID: 'bg-emerald-50 text-emerald-700',
    VOID: 'bg-slate-100 text-slate-600',
    OVERDUE: 'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{formatLabel(status)}</span>;
}

function ReconciliationGroup({
  title,
  rows,
  showAmount = false,
}: {
  title: string;
  rows: Array<{ status: string; _count: { status: number }; _sum?: { amountKES: number | null } }>;
  showAmount?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <div className="mt-2 space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">No records available.</p>
        ) : (
          rows.map((row) => (
            <div key={row.status} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm">
              <span className="text-slate-600">{formatLabel(row.status)}</span>
              <span className="text-right font-semibold text-[#101820]">
                {row._count.status}{showAmount && row._sum ? ` · ${formatCurrency(row._sum.amountKES)}` : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
