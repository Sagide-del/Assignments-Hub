import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Eye, EyeOff, HelpCircle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../api/axios';
import { dashboardPathForRole, loginIndependent, loginStaff, loginStudent } from '../../services/authService';
import { AssignmentHubWordmark } from '../ui/Logo';
import { LoginTabs, type LoginType } from './LoginTabs';

interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
  fixedSchoolCode?: string;
}

interface FormState {
  schoolCode: string;
  email: string;
  independentIdentifier: string;
  password: string;
  admissionNumber: string;
  studentPin: string;
}

const INPUT_CLASS = 'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-[#101820] outline-none transition placeholder:text-slate-400 focus:border-[#8CB400] focus:ring-4 focus:ring-[#B5E61D]/15';

export function LoginCard({ loginType, setLoginType, fixedSchoolCode }: Props) {
  const navigate = useNavigate();
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState<FormState>({
    schoolCode: fixedSchoolCode ?? '',
    email: '',
    independentIdentifier: '',
    password: '',
    admissionNumber: '',
    studentPin: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = loginType === 'student'
        ? await loginStudent(fixedSchoolCode ?? form.schoolCode, form.admissionNumber, form.studentPin || undefined)
        : loginType === 'independent'
          ? await loginIndependent(form.independentIdentifier, form.password)
          : await loginStaff(form.schoolCode, form.email, form.password);
      navigate(dashboardPathForRole(user.role), { replace: true });
    } catch (caught) {
      setError(apiErrorMessage(
        caught,
        loginType === 'student'
          ? 'We could not verify those school login details.'
          : 'We could not verify those account details.',
      ));
    } finally {
      setLoading(false);
    }
  }

  const helpText = loginType === 'independent'
    ? 'Use the Student ID or email linked to your individual account.'
    : 'Forgot your credentials? Contact your school administrator.';

  return (
    <div className="w-full">
      <div className="flex justify-center lg:hidden">
        <AssignmentHubWordmark size="md" />
      </div>

      <header className="mt-7 text-center lg:mt-0 lg:text-left">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#657d12]">Secure learning access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#101820] sm:text-4xl">Sign in to continue</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Choose your account type, then enter the details provided by your school or account setup.</p>
      </header>

      {!fixedSchoolCode ? (
        <div className="mt-7">
          <LoginTabs loginType={loginType} setLoginType={(type) => { setLoginType(type); setError(null); setShowSecret(false); }} />
        </div>
      ) : (
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-lime-200 bg-lime-50 px-3 py-2">
          <SchoolIcon />
          <span className="text-sm font-semibold tracking-wide text-[#101820]">School {fixedSchoolCode}</span>
        </div>
      )}

      <form onSubmit={submitLogin} className="mt-7 space-y-4">
        {loginType !== 'independent' && !fixedSchoolCode ? (
          <Field label="School code" hint="The code provided by your school.">
            <input
              name="schoolCode"
              placeholder="Enter school code"
              value={form.schoolCode}
              onChange={handleChange}
              required
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              className={INPUT_CLASS}
            />
          </Field>
        ) : null}

        {loginType === 'student' ? (
          <>
            <Field label="Admission number">
              <input
                name="admissionNumber"
                placeholder="Enter admission number"
                value={form.admissionNumber}
                onChange={handleChange}
                required
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Learner PIN" hint="Use the PIN issued by your school.">
              <SecretInput
                name="studentPin"
                value={form.studentPin}
                placeholder="Enter learner PIN"
                visible={showSecret}
                onToggle={() => setShowSecret((visible) => !visible)}
                onChange={(event) => setForm((current) => ({ ...current, studentPin: event.target.value.replace(/\D/g, '').slice(0, 8) }))}
                required={Boolean(fixedSchoolCode)}
                inputMode="numeric"
              />
            </Field>
          </>
        ) : (
          <>
            <Field label={loginType === 'independent' ? 'Student ID or email' : 'Email address'}>
              <input
                type={loginType === 'independent' ? 'text' : 'email'}
                name={loginType === 'independent' ? 'independentIdentifier' : 'email'}
                placeholder={loginType === 'independent' ? 'Enter Student ID or email' : 'Enter email address'}
                value={loginType === 'independent' ? form.independentIdentifier : form.email}
                onChange={handleChange}
                required
                autoCapitalize={loginType === 'independent' ? 'characters' : 'none'}
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Password">
              <SecretInput
                name="password"
                value={form.password}
                placeholder="Enter password"
                visible={showSecret}
                onToggle={() => setShowSecret((visible) => !visible)}
                onChange={handleChange}
                required
              />
            </Field>
          </>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>{helpText}</span>
        </div>

        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#B5E61D] px-5 text-sm font-bold text-[#101820] transition hover:bg-[#A5D414] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B5E61D]/35 disabled:cursor-wait disabled:bg-slate-200 disabled:text-slate-500"
        >
          <span>{loading ? 'Signing in...' : 'Sign in'}</span>
          {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
        </button>
      </form>

      <div className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
        {fixedSchoolCode ? (
          <Link to="/login" className="font-semibold text-[#536D00] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5E61D]">Use another school or account type</Link>
        ) : loginType === 'independent' ? (
          <>New individual learner?<Link to="/register" className="ml-1 font-semibold text-[#536D00] hover:underline">Create an account</Link></>
        ) : (
          <>Need individual access?<Link to="/register" className="ml-1 font-semibold text-[#536D00] hover:underline">Create an account</Link></>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400 lg:justify-start">
        <ShieldCheck className="h-4 w-4 text-[#6c8615]" />
        Your account details are protected.
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function SecretInput({ name, value, placeholder, visible, onToggle, onChange, required, inputMode }: {
  name: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  required: boolean;
  inputMode?: 'numeric';
}) {
  return (
    <span className="relative block">
      <input
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        required={required}
        inputMode={inputMode}
        pattern={inputMode === 'numeric' ? '[0-9]*' : undefined}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete={inputMode === 'numeric' ? 'off' : 'current-password'}
        className={`${INPUT_CLASS} pr-14 ${inputMode === 'numeric' ? 'tracking-[0.2em]' : ''}`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-[#101820] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5E61D]"
        aria-label={visible ? `Hide ${name}` : `Show ${name}`}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-5 w-5" strokeWidth={1.8} /> : <Eye className="h-5 w-5" strokeWidth={1.8} />}
      </button>
    </span>
  );
}

function SchoolIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#536D00]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m3 10 9-6 9 6-9 6-9-6Z" strokeLinejoin="round" />
      <path d="M7 13.3V18c2.8 2 7.2 2 10 0v-4.7" strokeLinecap="round" />
    </svg>
  );
}
