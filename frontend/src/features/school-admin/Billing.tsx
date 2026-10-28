import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axios';
import { paymentApi } from '../../api/subscriptions.api';
import { useAuthStore } from '../../store/auth.store';
import type { BillingProviderConfig } from '../../types';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return 'Not available';
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleDateString();
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5H14v15M9 20v-4h3v4M8 9h2m-2 3h2m4-3h2m-2 3h2M14 8l3-2 3 2v12h-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M7 4h7l4 4v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 4v4h4M9 12h6M9 16h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.5 12H14.5M12 9.5V14.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SchoolAdminBilling() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const [billingEmail, setBillingEmail] = useState(user?.email ?? '');
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [payerName, setPayerName] = useState(user?.name ?? '');
  const [payerPhone, setPayerPhone] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const currentQuery = useQuery({
    queryKey: ['billing-current', user?.schoolId],
    queryFn: () => paymentApi.getCurrentSubscription(user?.schoolId),
    enabled: !!user,
  });

  const providersQuery = useQuery({
    queryKey: ['billing-providers'],
    queryFn: paymentApi.getProviders,
  });

  const invoicesQuery = useQuery({
    queryKey: ['billing-invoices', user?.schoolId],
    queryFn: () => paymentApi.getInvoices(user?.schoolId),
    enabled: !!user,
  });

  const transactionsQuery = useQuery({
    queryKey: ['billing-transactions', user?.schoolId],
    queryFn: () => paymentApi.getTransactions({ schoolId: user?.schoolId }),
    enabled: !!user,
  });

  const intasendMutation = useMutation({
    mutationFn: () => paymentApi.createSubscriptionCheckout(billingEmail, user!.schoolId, interval),
    onSuccess: (response: unknown) => {
      const url =
        (response as { checkoutUrl?: string; url?: string }).checkoutUrl ??
        (response as { url?: string }).url;
      if (url) {
        window.location.assign(url);
        return;
      }
      setStatus('Checkout has started. Complete the hosted IntaSend payment to activate the subscription.');
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['billing-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['billing-transactions'] }),
      ]);
    },
    onError: (error) => setStatus(apiErrorMessage(error, 'Unable to start IntaSend checkout')),
  });

  const equityMutation = useMutation({
    mutationFn: () =>
      paymentApi.createEquityPaybillPayment({
        schoolId: user?.schoolId,
        paymentReference,
        payerName,
        payerPhone,
        interval,
      }),
    onSuccess: () => {
      setStatus('Equity Paybill payment reference submitted. It is now awaiting platform verification.');
      setPaymentReference('');
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['billing-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['billing-transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['billing-current'] }),
      ]);
    },
    onError: (error) => setStatus(apiErrorMessage(error, 'Unable to submit the Equity payment reference')),
  });

  const mpesaMutation = useMutation({
    mutationFn: () =>
      paymentApi.createMpesaPayment({
        schoolId: user?.schoolId,
        payerName,
        payerPhone,
        interval,
      }),
    onSuccess: (response: unknown) => {
      const message =
        (response as { providerResponse?: { message?: string } }).providerResponse?.message ??
        'M-Pesa billing has been prepared and is waiting for a live provider connection.';
      setStatus(message);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['billing-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['billing-transactions'] }),
      ]);
    },
    onError: (error) => setStatus(apiErrorMessage(error, 'Unable to start the M-Pesa billing flow')),
  });

  const providerByMethod = useMemo(() => {
    return new Map((providersQuery.data ?? []).map((provider) => [provider.method, provider]));
  }, [providersQuery.data]);

  const orderedProviders = useMemo(() => {
    const order = ['INTASEND', 'EQUITY_PAYBILL', 'MPESA'];
    return [...(providersQuery.data ?? [])].sort(
      (left, right) => order.indexOf(left.method) - order.indexOf(right.method),
    );
  }, [providersQuery.data]);

  async function downloadInvoice(invoiceId: number, invoiceNumber: string) {
    try {
      const blob = await paymentApi.downloadInvoice(invoiceId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setStatus(apiErrorMessage(error, 'Unable to download the invoice PDF'));
    }
  }

  const current = currentQuery.data;
  const invoices = invoicesQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(16,24,32,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
              <BuildingIcon />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">School Billing</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#101820]">
                Billing and subscription management
              </h1>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5 lg:w-[340px]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current subscription</p>
            <p className="mt-3 text-2xl font-semibold text-[#101820]">
              {current?.pricing.tier.name ?? 'Loading plan...'}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {current?.school.name ?? 'School'} • {current?.pricing.studentCount ?? 0} learners
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <SummaryTile label="Monthly amount" value={formatCurrency(current?.pricing.amountKES)} />
              <SummaryTile
                label="Renewal"
                value={formatDate(current?.subscription?.currentPeriodEnd ?? current?.subscription?.expiresAt)}
              />
            </div>
          </div>
        </div>
      </section>

      {status ? (
        <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-slate-600">
          {status}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Plan" value={current?.pricing.tier.name ?? 'Loading'} icon={<InvoiceIcon />} />
        <MetricCard
          label="Student Count"
          value={current ? `${current.pricing.studentCount}` : 'Loading'}
          icon={<BuildingIcon />}
        />
        <MetricCard
          label="Monthly Due"
          value={formatCurrency(current?.pricing.amountKES)}
          icon={<InvoiceIcon />}
        />
        <MetricCard
          label="AI Tokens Used"
          value={`${current?.aiUsage.usedTokens ?? 0}`}
          icon={<TokenIcon />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#101820]">Payment methods</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-500">
              Due now: <span className="font-semibold text-[#101820]">{formatCurrency(current?.pricing.amountKES)}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {providersQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading payment methods...</p>
            ) : providersQuery.isError ? (
              <p className="text-sm text-red-700">Payment methods are temporarily unavailable.</p>
            ) : orderedProviders.length === 0 ? (
              <p className="text-sm text-slate-500">No payment methods are configured.</p>
            ) : orderedProviders.map((provider) => (
              <ProviderCard
                key={provider.method}
                provider={provider}
                interval={interval}
                setInterval={setInterval}
                billingEmail={billingEmail}
                setBillingEmail={setBillingEmail}
                payerName={payerName}
                setPayerName={setPayerName}
                payerPhone={payerPhone}
                setPayerPhone={setPayerPhone}
                paymentReference={paymentReference}
                setPaymentReference={setPaymentReference}
                onIntaSend={() => intasendMutation.mutate()}
                onEquity={() => equityMutation.mutate()}
                onMpesa={() => mpesaMutation.mutate()}
                intasendPending={intasendMutation.isPending}
                equityPending={equityMutation.isPending}
                mpesaPending={mpesaMutation.isPending}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.05)]">
          <h2 className="text-xl font-semibold text-[#101820]">AI usage billing visibility</h2>
          <p className="mt-2 text-sm text-slate-500">
            Charging is not enabled yet. This view shows token usage and allocation readiness for school billing.
          </p>

          <div className="mt-6 space-y-4">
            <AiUsageRow
              label="Allocated tokens"
              value={current?.aiUsage.allocatedTokens == null ? 'Not configured' : `${current?.aiUsage.allocatedTokens}`}
            />
            <AiUsageRow label="Tokens used" value={`${current?.aiUsage.usedTokens ?? 0}`} />
            <AiUsageRow
              label="Remaining balance"
              value={current?.aiUsage.remainingTokens == null ? 'Awaiting allocation' : `${current?.aiUsage.remainingTokens}`}
            />
            <AiUsageRow
              label="Billing period"
              value={
                current?.aiUsage.billingPeriodStart
                  ? `${formatDate(current.aiUsage.billingPeriodStart)} to ${formatDate(current.aiUsage.billingPeriodEnd)}`
                  : 'Current ledger period not configured'
              }
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#101820]">Invoice history</h2>
              <p className="mt-2 text-sm text-slate-500">Track issued invoices and download PDF records for finance operations.</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-4">
                      <p className="font-semibold text-[#101820]">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-slate-400">{invoice.planSnapshot ?? 'Subscription'}</p>
                    </td>
                    <td className="py-4">{formatDate(invoice.issuedAt)}</td>
                    <td className="py-4">{formatCurrency(invoice.amountKES)}</td>
                    <td className="py-4">
                      <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-semibold text-[#101820]">
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          void downloadInvoice(invoice.id, invoice.invoiceNumber);
                        }}
                        className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-[#101820]"
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 ? (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={5}>
                      No invoices have been generated yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.05)]">
          <h2 className="text-xl font-semibold text-[#101820]">Payment history</h2>
          <p className="mt-2 text-sm text-slate-500">
            Review every school-scoped payment event, including manual verification states.
          </p>
          <div className="mt-5 space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#101820]">{providerByMethod.get(transaction.method)?.displayName ?? transaction.method}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(transaction.createdAt)} • Reference:{' '}
                      {transaction.paymentReference ?? transaction.providerReference ?? 'Pending'}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#101820]">
                    {transaction.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <InfoPair label="Amount" value={formatCurrency(transaction.amountKES)} />
                  <InfoPair label="Payer" value={transaction.payerName ?? 'Not recorded'} />
                </div>
              </div>
            ))}
            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-[#F8FAFC] p-5 text-sm text-slate-500">
                No payment transactions recorded yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProviderCard(props: {
  provider: BillingProviderConfig;
  interval: 'monthly' | 'annual';
  setInterval: (value: 'monthly' | 'annual') => void;
  billingEmail: string;
  setBillingEmail: (value: string) => void;
  payerName: string;
  setPayerName: (value: string) => void;
  payerPhone: string;
  setPayerPhone: (value: string) => void;
  paymentReference: string;
  setPaymentReference: (value: string) => void;
  onIntaSend: () => void;
  onEquity: () => void;
  onMpesa: () => void;
  intasendPending: boolean;
  equityPending: boolean;
  mpesaPending: boolean;
}) {
  const { provider } = props;
  const paybillNumber =
    typeof provider.paymentDetails?.paybillNumber === 'string' ? provider.paymentDetails.paybillNumber : null;
  const shortCode =
    typeof provider.paymentDetails?.shortCode === 'string' ? provider.paymentDetails.shortCode : null;

  return (
    <article className="rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-5">
      <div className="flex items-center gap-3">
        {provider.logoUrl ? (
          <img src={provider.logoUrl} alt={provider.displayName} className="h-12 w-20 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-12 w-20 items-center justify-center rounded-2xl bg-white text-xs font-semibold text-[#101820]">
            {provider.displayName}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-[#101820]">{provider.displayName}</h3>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{provider.method}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-500">{provider.instructions ?? 'Provider instructions pending.'}</p>

      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Billing interval</label>
          <select
            value={props.interval}
            onChange={(event) => props.setInterval(event.target.value as 'monthly' | 'annual')}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#101820]"
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>

        {provider.method === 'INTASEND' ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Billing email</label>
              <input
                value={props.billingEmail}
                onChange={(event) => props.setBillingEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#101820]"
                placeholder="finance@school.com"
              />
            </div>
            <button
              type="button"
              onClick={props.onIntaSend}
              disabled={props.intasendPending || !provider.isActive || !props.billingEmail}
              className="w-full rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {props.intasendPending ? 'Starting checkout...' : 'Pay online'}
            </button>
          </>
        ) : null}

        {provider.method === 'EQUITY_PAYBILL' ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-[#101820]">Paybill number</p>
              <p className="mt-1">{paybillNumber ?? 'Not configured'}</p>
              <p className="mt-3 text-xs text-slate-500">
                {typeof provider.paymentDetails?.accountReferenceLabel === 'string'
                  ? provider.paymentDetails.accountReferenceLabel
                  : 'Use the invoice number as your payment account reference.'}
              </p>
            </div>
            <input
              value={props.payerName}
              onChange={(event) => props.setPayerName(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#101820]"
              placeholder="Payer name"
            />
            <input
              value={props.payerPhone}
              onChange={(event) => props.setPayerPhone(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#101820]"
              placeholder="Payer phone"
            />
            <input
              value={props.paymentReference}
              onChange={(event) => props.setPaymentReference(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#101820]"
              placeholder="Payment reference"
            />
            <button
              type="button"
              onClick={props.onEquity}
              disabled={props.equityPending || !provider.isActive || !props.payerName || !props.payerPhone || !props.paymentReference}
              className="w-full rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {props.equityPending ? 'Submitting...' : 'Submit paybill reference'}
            </button>
          </>
        ) : null}

        {provider.method === 'MPESA' ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-[#101820]">Short code</p>
              <p className="mt-1">{shortCode ?? 'Not configured'}</p>
            </div>
            <input
              value={props.payerName}
              onChange={(event) => props.setPayerName(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#101820]"
              placeholder="Payer name"
            />
            <input
              value={props.payerPhone}
              onChange={(event) => props.setPayerPhone(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#101820]"
              placeholder="M-Pesa phone number"
            />
            <button
              type="button"
              onClick={props.onMpesa}
              disabled={props.mpesaPending || !provider.isActive || !props.payerName || !props.payerPhone}
              className="w-full rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {provider.isActive
                ? props.mpesaPending
                  ? 'Preparing...'
                  : 'Start mobile payment'
                : 'Provider not yet enabled'}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#101820]">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(16,24,32,0.05)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <div className="text-[#101820]">{icon}</div>
      </div>
      <p className="mt-4 text-2xl font-semibold text-[#101820]">{value}</p>
    </div>
  );
}

function AiUsageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-[#101820]">{value}</span>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-[#101820]">{value}</p>
    </div>
  );
}
