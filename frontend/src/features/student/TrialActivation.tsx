import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, MessageCircle, Smartphone } from 'lucide-react';
import { apiErrorMessage } from '../../api/axios';
import { independentStudentsApi } from '../../api/independent-students.api';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/auth.store';

type PaymentPath = 'PAYSTACK' | 'LIPA';
type Interval = 'MONTHLY' | 'ANNUAL';

export function TrialActivationPage() {
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentPath>('PAYSTACK');
  const [interval, setInterval] = useState<Interval>('MONTHLY');
  const [mpesaCode, setMpesaCode] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: paymentInfo, isLoading } = useQuery({
    queryKey: ['independent-public-payment-info'],
    queryFn: () => independentStudentsApi.getPublicPaymentInfo(),
  });

  const claimMutation = useMutation({
    mutationFn: () => independentStudentsApi.submitPaymentClaim({
      identifier: user?.admissionNumber ?? '',
      interval,
      mpesaCode: mpesaCode.trim(),
      payerPhone: payerPhone.trim() || undefined,
    }),
    onSuccess: () => {
      setRequested(true);
      setError(null);
    },
    onError: (requestError) => setError(apiErrorMessage(requestError, 'We could not submit your activation request.')),
  });

  const paystackMutation = useMutation({
    mutationFn: () => independentStudentsApi.startPaystackCheckout(interval),
    onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
    onError: (requestError) => setError(apiErrorMessage(requestError, 'We could not start secure checkout. Please try again.')),
  });

  const amount = interval === 'ANNUAL' ? paymentInfo?.annualAmountKES : paymentInfo?.monthlyAmountKES;

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (!reference || !refreshToken) return;

    let attempts = 0;
    const refreshAccess = async () => {
      try {
        const pair = await authApi.refresh(refreshToken);
        setSession(pair);
        if (!pair.user.isIndependentTrial) {
          navigate('/student', { replace: true });
          return;
        }
      } catch {
        // Keep the learner on the activation page; a later retry or sign-in
        // will receive the updated access once the payment is confirmed.
      }
      attempts += 1;
      if (attempts < 15) window.setTimeout(() => void refreshAccess(), 2000);
    };

    void refreshAccess();
  }, [navigate, refreshToken, setSession]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    claimMutation.mutate();
  }

  if (requested) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="rounded-[28px] border border-[#d9ed9a] bg-white p-6 shadow-[0_16px_44px_rgba(16,24,32,0.06)] sm:p-9">
          <CheckCircle2 className="h-10 w-10 text-[#607b00]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#607b00]">Activation requested</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#101820]">We are verifying your payment.</h1>
          <p className="mt-4 max-w-xl leading-7 text-slate-600">Your starter assignment remains available while the team checks the M-Pesa confirmation. We will unlock the full learning workspace once the payment is approved.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#657d12]">Starter access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#101820]">Unlock your full learning workspace</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">Your trial includes one starter assignment. Activate to access all assignments, study resources, STEM Labs, skills and your personalised learning plan.</p>
      </header>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_44px_rgba(16,24,32,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="font-semibold text-[#101820]">Choose how to activate</h2>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
          <button type="button" onClick={() => setMethod('PAYSTACK')} className={`rounded-2xl border p-5 text-left transition ${method === 'PAYSTACK' ? 'border-[#8cb500] bg-[#faffeb] ring-1 ring-[#b5e61d]' : 'border-slate-200 hover:border-slate-300'}`}>
            <Smartphone className="h-5 w-5 text-[#607b00]" />
            <p className="mt-4 font-semibold text-[#101820]">Pay online</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Use secure Paystack checkout with available M-Pesa or card options.</p>
            <span className="mt-3 inline-flex rounded-full bg-[#101820] px-2.5 py-1 text-xs font-semibold text-white">Recommended</span>
          </button>
          <button type="button" onClick={() => setMethod('LIPA')} className={`rounded-2xl border p-5 text-left transition ${method === 'LIPA' ? 'border-[#8cb500] bg-[#faffeb] ring-1 ring-[#b5e61d]' : 'border-slate-200 hover:border-slate-300'}`}>
            <CreditCard className="h-5 w-5 text-[#607b00]" />
            <p className="mt-4 font-semibold text-[#101820]">Lipa na M-Pesa</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Pay to the Till number, then enter the M-Pesa confirmation code.</p>
            <span className="mt-3 inline-flex rounded-full bg-[#101820] px-2.5 py-1 text-xs font-semibold text-white">Available now</span>
          </button>
        </div>

        {method === 'PAYSTACK' ? (
          <div className="space-y-5 border-t border-slate-100 px-6 py-6 sm:px-8">
            <div className="grid grid-cols-2 gap-3">
              {(['MONTHLY', 'ANNUAL'] as const).map((option) => (
                <button key={option} type="button" onClick={() => setInterval(option)} className={`rounded-xl border p-4 text-left ${interval === option ? 'border-[#8cb500] bg-[#faffeb]' : 'border-slate-200'}`}>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{option === 'ANNUAL' ? 'Annual' : 'Monthly'}</span>
                  <span className="mt-1 block font-semibold text-[#101820]">KES {(option === 'ANNUAL' ? paymentInfo?.annualAmountKES : paymentInfo?.monthlyAmountKES)?.toLocaleString() ?? '...'}</span>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-slate-600">You will complete payment on Paystack. Your full workspace opens automatically after Paystack confirms the payment.</div>
            {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <button type="button" onClick={() => { setError(null); paystackMutation.mutate(); }} disabled={paystackMutation.isPending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#101820] px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">{paystackMutation.isPending ? 'Opening secure checkout...' : 'Continue to secure payment'}</button>
          </div>
        ) : isLoading ? (
          <div className="border-t border-slate-100 px-6 py-6 text-sm text-slate-500 sm:px-8">Loading activation details...</div>
        ) : paymentInfo?.enabled ? (
          <form onSubmit={submit} className="space-y-5 border-t border-slate-100 px-6 py-6 sm:px-8">
            <div className="rounded-2xl border border-[#d9ed9a] bg-[#faffeb] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#607b00]">Lipa na M-Pesa</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <PaymentDetail label="Till number" value={paymentInfo.tillNumber} />
                {paymentInfo.storeNumber ? <PaymentDetail label="Store number" value={paymentInfo.storeNumber} /> : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{paymentInfo.instructions}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['MONTHLY', ...(paymentInfo.annualAmountKES > 0 ? (['ANNUAL'] as const) : [])] as const).map((option) => (
                <button key={option} type="button" onClick={() => setInterval(option)} className={`rounded-xl border p-4 text-left ${interval === option ? 'border-[#8cb500] bg-[#faffeb]' : 'border-slate-200'}`}>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{option === 'ANNUAL' ? 'Annual' : 'Monthly'}</span>
                  <span className="mt-1 block font-semibold text-[#101820]">KES {(option === 'ANNUAL' ? paymentInfo.annualAmountKES : paymentInfo.monthlyAmountKES).toLocaleString()}</span>
                </button>
              ))}
            </div>
            <p className="rounded-xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white">Amount due: KES {(amount ?? 0).toLocaleString()}</p>
            <Field label="M-Pesa confirmation code" value={mpesaCode} onChange={setMpesaCode} autoComplete="off" />
            <Field label="Phone used for payment" value={payerPhone} onChange={setPayerPhone} type="tel" autoComplete="tel" required={false} />
            {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <button type="submit" disabled={claimMutation.isPending || mpesaCode.trim().length < 5} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#b5e61d] px-5 text-sm font-bold text-[#101820] transition hover:bg-[#a5d414] disabled:opacity-50">{claimMutation.isPending ? 'Requesting activation...' : 'Request activation'}</button>
          </form>
        ) : (
          <div className="border-t border-slate-100 px-6 py-6 text-sm leading-6 text-slate-600 sm:px-8">Activation payment details are being updated. Please try again shortly or contact the Assignment Hub team.</div>
        )}
      </section>

      <div className="flex items-center gap-2 text-sm text-slate-500"><MessageCircle className="h-4 w-4" /> Need help? Contact the Assignment Hub team on WhatsApp.</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', autoComplete, required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete: string; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none transition focus:border-[#8cb500] focus:ring-4 focus:ring-[#b5e61d]/15" /></label>;
}

function PaymentDetail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold tracking-wide text-[#101820]">{value}</p></div>;
}
