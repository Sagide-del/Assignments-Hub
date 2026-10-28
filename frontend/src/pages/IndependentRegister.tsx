import { useId, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { apiErrorMessage } from '../api/axios';
import { AssignmentHubWordmark } from '../components/ui/Logo';
import type { IndependentRegistrationResult } from '../types';
import { loginIndependent } from '../services/authService';

export default function IndependentRegister() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<IndependentRegistrationResult | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    grade: 'Grade 7',
    parentPhone: '',
  });
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not create your account')),
  });

  const continueMutation = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('Create an account before continuing');
      await loginIndependent(account.admissionNumber, form.password);
    },
    onSuccess: () => navigate('/student/activate'),
    onError: (err) => setError(apiErrorMessage(err, 'Your account was created, but we could not sign you in automatically. Please sign in to continue.')),
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

  if (account) {
    return (
      <main className="min-h-screen bg-[#f6f8f4] px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-7 flex items-center justify-between gap-4"><AssignmentHubWordmark size="sm" /></div>
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(16,24,32,0.08)]">
            <div className="bg-[#101820] px-6 py-7 text-white sm:px-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B5E61D]">Account created</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Continue to secure payment</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">Your starter account is ready. Sign in securely and choose an M-Pesa payment plan to unlock the full workspace.</p>
            </div>
            <div className="space-y-6 p-6 sm:p-9">
              <div className="rounded-2xl border border-[#D9ED9A] bg-[#F8FCEB] p-5">
                <p className="font-semibold text-[#101820]">Keep this Student ID</p>
                <p className="mt-3 rounded-xl bg-white px-4 py-3 font-mono text-lg font-semibold tracking-wide text-[#101820]">{account.admissionNumber}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Your account activates automatically after your M-Pesa payment is confirmed. No Platform Admin approval is needed.</p>
              </div>
              {error ? <ErrorMessage message={error} /> : null}
              <button type="button" onClick={() => continueMutation.mutate()} disabled={continueMutation.isPending} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] transition hover:bg-[#A6D417] disabled:opacity-60">
                {continueMutation.isPending ? 'Signing you in...' : 'Continue to payment'} <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <Link to="/login" className="flex min-h-11 items-center justify-center text-sm font-semibold text-[#536D00] hover:underline">Sign in later</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

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
                  Create your learning account
                </h1>
              </div>
              <Sparkles className="h-7 w-7 shrink-0 text-[#B5E61D]" aria-hidden="true" />
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              One account for assignments, feedback, revision resources and practical skills.
            </p>
          </div>

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
                <label htmlFor="registration-grade" className="mb-1.5 block text-sm font-medium text-slate-700">Current grade</label>
                <select
                  id="registration-grade"
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

              <Field
                label="Email address for receipts (optional)"
                type="email"
                value={form.email}
                onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                autoComplete="email"
                required={false}
              />
              <p className="-mt-2 text-xs leading-5 text-slate-500">A parent or guardian email can receive payment receipts. Learners without email can still pay and activate normally.</p>

              {error ? <ErrorMessage message={error} /> : null}
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full rounded-xl bg-[#B5E61D] px-5 py-3.5 text-sm font-semibold text-[#101820] transition hover:bg-[#A6D417] disabled:opacity-60"
              >
                {registerMutation.isPending ? 'Creating account...' : 'Create account'}
              </button>
              <p className="text-center text-sm"><a href="/revision/" className="font-semibold text-[#536D00] underline">Try free Grade 7 revision before registering</a></p>
              <p className="text-center text-xs leading-5 text-slate-500">By continuing, you confirm that the learner or parent has permission to create this account.</p>
            </form>

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
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        id={id}
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

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>;
}
