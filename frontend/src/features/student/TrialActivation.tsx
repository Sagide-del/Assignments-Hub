import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MessageCircle, Smartphone } from 'lucide-react';
import { apiErrorMessage } from '../../api/axios';
import { independentStudentsApi } from '../../api/independent-students.api';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/auth.store';

type Interval = 'MONTHLY' | 'ANNUAL';

export function TrialActivationPage() {
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const [interval, setInterval] = useState<Interval>('MONTHLY');
  const [error, setError] = useState<string | null>(null);

  const { data: paymentInfo } = useQuery({
    queryKey: ['independent-public-payment-info'],
    queryFn: () => independentStudentsApi.getPublicPaymentInfo(),
  });

  const paystackMutation = useMutation({
    mutationFn: () => independentStudentsApi.startPaystackCheckout(interval),
    onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
    onError: (requestError) => setError(apiErrorMessage(requestError, 'We could not start secure checkout. Please try again.')),
  });

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#657d12]">Starter access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#101820]">Unlock your full learning workspace</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">Your trial includes one starter assignment. Activate to access all assignments, study resources, STEM Labs, skills and your personalised learning plan.</p>
      </header>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_44px_rgba(16,24,32,0.06)]">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="font-semibold text-[#101820]">Secure payment</h2>
        </div>
        <div className="p-5 sm:p-7">
          <div className="rounded-2xl border border-[#8cb500] bg-[#faffeb] p-5">
            <Smartphone className="h-5 w-5 text-[#607b00]" />
            <p className="mt-4 font-semibold text-[#101820]">Pay online</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Use secure Paystack checkout with available M-Pesa or card options.</p>
            <span className="mt-3 inline-flex rounded-full bg-[#101820] px-2.5 py-1 text-xs font-semibold text-white">Automatic activation</span>
          </div>
        </div>

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
      </section>

      <div className="flex items-center gap-2 text-sm text-slate-500"><MessageCircle className="h-4 w-4" /> Need help? Contact the Assignment Hub team on WhatsApp.</div>
    </div>
  );
}

