import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { apiErrorMessage } from '../api/axios';
import { independentStudentsApi } from '../api/independent-students.api';
import { Logo } from '../components/ui/Logo';
import type { IndependentRegistrationResult } from '../types';

type Interval = 'MONTHLY' | 'ANNUAL';

export default function IndependentRegister() {
  const [account, setAccount] = useState<IndependentRegistrationResult | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    grade: 'Grade 7',
    parentPhone: '',
  });
  const [interval, setInterval] = useState<Interval>('MONTHLY');
  const [mpesaCode, setMpesaCode] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  const { data: paymentInfo, isLoading: paymentInfoLoading } = useQuery({
    queryKey: ['independent-public-payment-info'],
    queryFn: () => independentStudentsApi.getPublicPaymentInfo(),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.registerIndependent({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase() || undefined,
        password: form.password,
        grade: form.grade,
        parentPhone: form.parentPhone.trim() || undefined,
      }),
    onSuccess: (result) => {
      setAccount(result);
      setPayerPhone(form.parentPhone);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not create your account')),
  });

  const claimMutation = useMutation({
    mutationFn: () =>
      independentStudentsApi.submitPaymentClaim({
        identifier: account!.admissionNumber,
        interval,
        mpesaCode: mpesaCode.trim(),
        payerPhone: payerPhone.trim() || undefined,
      }),
    onSuccess: () => {
      setClaimSubmitted(true);
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not submit payment details')),
  });

  function submitRegistration(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    registerMutation.mutate();
  }

  function submitClaim(event: FormEvent) {
    event.preventDefault();
    setError(null);
    claimMutation.mutate();
  }

  const amount =
    interval === 'ANNUAL'
      ? paymentInfo?.annualAmountKES ?? 0
      : paymentInfo?.monthlyAmountKES ?? 0;

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Logo src="/logo.png" name="Assignment Hub" size="lg" />
          <Link to="/login" className="text-sm font-semibold text-[#101820] hover:underline">
            Sign in
          </Link>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(16,24,32,0.08)]">
          <div className="border-b border-slate-100 bg-[#101820] px-6 py-7 text-white sm:px-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B5E61D]">
              Individual learner
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              {account ? 'Activate your account' : 'Create your student account'}
            </h1>
          </div>

          {!account ? (
            <form onSubmit={submitRegistration} className="space-y-4 p-6 sm:p-9">
              <Field
                label="Student name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                autoComplete="name"
              />
              <Field
                label="Email address (optional)"
                type="email"
                value={form.email}
                onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                autoComplete="email"
                required={false}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Grade</label>
                <select
                  value={form.grade}
                  onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#8CB500]"
                >
                  {[7, 8, 9, 10, 11, 12].map((grade) => (
                    <option key={grade} value={`Grade ${grade}`}>Grade {grade}</option>
                  ))}
                </select>
              </div>
              <Field
                label="Parent or guardian phone (optional)"
                type="tel"
                value={form.parentPhone}
                onChange={(value) => setForm((current) => ({ ...current, parentPhone: value }))}
                autoComplete="tel"
                required={false}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(value) => setForm((current) => ({ ...current, password: value }))}
                  autoComplete="new-password"
                  minLength={8}
                />
                <Field
                  label="Confirm password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              {error ? <ErrorMessage message={error} /> : null}
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full rounded-xl bg-[#B5E61D] px-5 py-3.5 text-sm font-semibold text-[#101820] transition hover:bg-[#A6D417] disabled:opacity-60"
              >
                {registerMutation.isPending ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          ) : claimSubmitted ? (
            <div className="p-6 sm:p-9">
              <div className="rounded-2xl border border-[#D9ED9A] bg-[#F8FCEB] p-5">
                <p className="font-semibold text-[#101820]">Payment submitted for verification</p>
                <p className="mt-2 text-sm text-slate-600">
                  Your account will become available after the platform team confirms the payment.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-5 inline-flex rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white"
              >
                Return to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submitClaim} className="space-y-5 p-6 sm:p-9">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-[#101820]">{account.name}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Your Student ID
                </p>
                <p className="mt-1 text-xl font-semibold tracking-wide text-[#101820]">
                  {account.admissionNumber}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {account.grade}{account.email ? ` · ${account.email}` : ''}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Use this Student ID and your password to sign in.
                </p>
              </div>

              {paymentInfoLoading ? (
                <p className="text-sm text-slate-500">Loading payment details...</p>
              ) : paymentInfo?.enabled ? (
                <>
                  <div className="rounded-2xl border border-[#D9ED9A] bg-[#FAFDEB] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5E7900]">
                      M-Pesa Buy Goods
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <PaymentDetail label="Till number" value={paymentInfo.tillNumber} />
                      {paymentInfo.storeNumber ? (
                        <PaymentDetail label="Store number" value={paymentInfo.storeNumber} />
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{paymentInfo.instructions}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {([
                      'MONTHLY',
                      ...(paymentInfo.annualAmountKES > 0 ? (['ANNUAL'] as const) : []),
                    ] as const).map((option) => {
                      const optionAmount =
                        option === 'ANNUAL'
                          ? paymentInfo.annualAmountKES
                          : paymentInfo.monthlyAmountKES;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setInterval(option)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            interval === option
                              ? 'border-[#8CB500] bg-[#FAFDEB]'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {option === 'ANNUAL' ? 'Annual' : 'Monthly'}
                          </span>
                          <span className="mt-1 block font-semibold text-[#101820]">
                            KES {optionAmount.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl bg-[#101820] p-4 text-white">
                    <span className="text-xs text-slate-300">Amount due</span>
                    <p className="mt-1 text-xl font-semibold">KES {amount.toLocaleString()}</p>
                  </div>
                  <Field
                    label="M-Pesa confirmation code"
                    value={mpesaCode}
                    onChange={setMpesaCode}
                    autoComplete="off"
                    minLength={5}
                  />
                  <Field
                    label="Phone used for payment (optional)"
                    type="tel"
                    value={payerPhone}
                    onChange={setPayerPhone}
                    autoComplete="tel"
                    required={false}
                  />
                  {error ? <ErrorMessage message={error} /> : null}
                  <button
                    type="submit"
                    disabled={claimMutation.isPending || mpesaCode.trim().length < 5}
                    className="w-full rounded-xl bg-[#B5E61D] px-5 py-3.5 text-sm font-semibold text-[#101820] transition hover:bg-[#A6D417] disabled:opacity-60"
                  >
                    {claimMutation.isPending ? 'Submitting...' : 'Submit payment for verification'}
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  Online registration is available, but individual payment details have not been configured yet.
                </div>
              )}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required = true,
  minLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#8CB500]"
      />
    </div>
  );
}

function PaymentDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tracking-wide text-[#101820]">{value}</p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>;
}
