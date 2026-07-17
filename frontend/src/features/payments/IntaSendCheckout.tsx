import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../api/subscriptions.api';
import { apiErrorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

// POST /payment/subscription — starts an IntaSend checkout for the current
// school's live-computed pricing (see backend/src/payment/payment.service.ts
// createSubscription). The backend returns whatever IntaSend's API gives it
// (typically a checkout URL) — this redirects the browser there rather than
// trying to embed IntaSend's own hosted checkout UI, since there is no
// IntaSend JS SDK wired into this frontend.
export function IntaSendCheckout() {
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState(user?.email ?? '');
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [status, setStatus] = useState<string | null>(null);

  const { data: pricing } = useQuery({
    queryKey: ['pricing', user?.schoolId],
    queryFn: () => paymentApi.getPricing(user?.schoolId),
    enabled: !!user,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => paymentApi.createSubscriptionCheckout(email, user!.schoolId, interval),
    onSuccess: (res: unknown) => {
      const url = (res as { checkoutUrl?: string; url?: string })?.checkoutUrl ?? (res as { url?: string })?.url;
      if (url) {
        window.location.assign(url);
      } else {
        setStatus('Checkout started — check your email/phone from IntaSend to complete payment.');
      }
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not start checkout')),
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 max-w-md">
      <h2 className="font-medium text-sm">Pay for Subscription (IntaSend)</h2>
      {pricing && (
        <p className="text-sm text-gray-600">
          {pricing.tier.name} plan · KES {pricing.amountKES.toLocaleString()}/month for {pricing.studentCount} students
        </p>
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Billing email"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      />
      <select value={interval} onChange={(e) => setInterval(e.target.value as 'monthly' | 'annual')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
        <option value="monthly">Monthly</option>
        <option value="annual">Annual</option>
      </select>
      {status && <p className="text-sm text-gray-600">{status}</p>}
      <button
        onClick={() => checkoutMutation.mutate()}
        disabled={checkoutMutation.isPending || !email}
        className="w-full px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
      >
        {checkoutMutation.isPending ? 'Starting checkout…' : 'Pay Now'}
      </button>
    </div>
  );
}
