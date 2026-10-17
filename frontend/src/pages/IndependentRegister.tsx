import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { apiErrorMessage } from '../api/axios';
import { independentStudentsApi } from '../api/independent-students.api';
import { AssignmentHubWordmark } from '../components/ui/Logo';
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
  const [activationStarted, setActivationStarted] = useState(false);

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
    <main className="min-h-screen bg-[#f6f8f4] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <AssignmentHubWordmark size="sm" />
          <Link to="/login" className="text-sm font-semibold text-[#101820] hover:underline">
            Already have an account? Sign in
          </Link>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(16,24,32,0.08)]">
          <div className="border-b border-slate-100 bg-[#101820] px-6 py-7 text-white sm:px-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B5E61D]">Individual learner</p>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                  {account ? 'Your account is ready' : 'Create your learning account'}
                </h1>
              </div>
              <Sparkles className="h-7 w-7 shrink-0 text-[#B5E61D]" aria-hidden="true" />
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              {account ? 'Request activation whenever you are ready to begin.' : 'One account for assignments, feedback, revision resources and practical skills.'}
            </p>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-100 bg-white text-sm">
            <div className={`flex items-center gap-3 px-6 py-4 sm:px-9 ${account ? 'text-slate-400' : 'font-semibold text-[#101820]'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${account ? 'bg-[#eaf7bb] text-[#526b00]' : 'bg-[#101820] text-[#B5E61D]'}`}>{account ? '✓' : '1'}</span>
              Account details
            </div>
            <div className={`flex items-center gap-3 border-l border-slate-100 px-6 py-4 sm:px-9 ${account ? 'font-semibold text-[#101820]' : 'text-slate-400'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${account ? 'bg-[#101820] text-[#B5E61D]' : 'bg-slate-100 text-slate-400'}`}>2</span>
              Activate
            </div>
          </div>

          {!account ? (
            <form onSubmit={submitRegistration} className="space-y-4 p-6 sm:p-9">
              <div className="flex items-center gap-3 rounded-2xl bg-[#f6f8f4] px-4 py-3 text-sm text-slate-600">
                <LockKeyhole className="h-4 w-4 shrink-0 text-[#607b00]" />
                Your account is created first. Activation is requested separately, so there is no payment pressure on this step.
              </div>
              <Field
                label="Learner's full name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                autoComplete="name"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Current grade</label>
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
                label="Parent or guardian phone"
                type="tel"
                value={form.parentPhone}
                onChange={(value) => setForm((current) => ({ ...current, parentPhone: value }))}
                autoComplete="tel"
                required
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

              <details className="group rounded-xl border border-slate-200 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-600 marker:hidden">
                  Add an email address <span className="ml-1 text-xs text-slate-400">Optional</span>
                </summary>
                <div className="pt-4">
                  <Field
                    label="Email address"
                    type="email"
                    value={form.email}
                    onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                    autoComplete="email"
                    required={false}
                  />
                </div>
              </details>

              {error ? <ErrorMessage message={error} /> : null}
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full rounded-xl bg-[#B5E61D] px-5 py-3.5 text-sm font-semibold text-[#101820] transition hover:bg-[#A6D417] disabled:opacity-60"
              >
                {registerMutation.isPending ? 'Creating account...' : 'Create account'}
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">By continuing, you confirm that the learner or parent has permission to create this account.</p>
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
          ) : !activationStarted ? (
            <div className="p-6 sm:p-9">
              <div className="rounded-2xl border border-[#D9ED9A] bg-[#F8FCEB] p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#607b00]" />
                  <div>
                    <p className="font-semibold text-[#101820]">Account created for {account.name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Keep this Student ID. It will be used to sign in after activation.</p>
                  </div>
                </div>
                <p className="mt-4 rounded-xl bg-white px-4 py-3 font-mono text-lg font-semibold tracking-wide text-[#101820]">{account.admissionNumber}</p>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">What happens next</p>
                {['Choose a plan and make your M-Pesa payment.', 'Enter the confirmation code to request activation.', 'We verify your payment, then your learning workspace opens.'].map((step, index) => (
                  <div key={step} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#101820] text-xs font-bold text-[#B5E61D]">{index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setActivationStarted(true)} className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] transition hover:bg-[#A6D417]">
                Request activation <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <Link to="/login" className="mt-4 flex min-h-11 items-center justify-center text-sm font-semibold text-[#536D00] hover:underline">I will activate later</Link>
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
                    {claimMutation.isPending ? 'Submitting...' : 'Request activation'}
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  Your account is created. Activation payment details are being updated; please return shortly or contact the Assignment Hub team.
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
