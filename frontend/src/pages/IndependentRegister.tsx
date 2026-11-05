import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, School, ShieldCheck, Eye, EyeOff } from "lucide-react";
import {
  SubjectSelectionFields,
  type SubjectChoice,
} from "../features/student/SubjectSelection";
import { AuthFrame } from "../components/auth/AuthFrame";
import { api, apiErrorMessage } from "../api/axios";
import { authApi } from "../api/auth.api";
import { loginIndependent } from "../services/authService";
import type { IndependentRegistrationResult } from "../types";
export default function IndependentRegister() {
  const [params] = useSearchParams();
  const account =
    params.get("account") === "staff"
      ? "staff"
      : params.get("account") === "student"
        ? "student"
        : "independent";
  return (
    <AuthFrame account={account} mode="register">
      {account === "independent" ? (
        <IndependentRegistrationForm />
      ) : (
        <div className="space-y-4 rounded-xl bg-slate-50 p-5">
          <div className="flex items-center gap-2 font-semibold">
            {account === "staff" ? (
              <ShieldCheck size={20} />
            ) : (
              <School size={20} />
            )}
            Your school provides this account
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {account === "staff"
              ? "Ask your School Admin for a staff account. School administrators are onboarded by Assignment Hub."
              : "Ask your school for its school code, your admission number and learner PIN."}
          </p>
          <Link
            to={`/login?account=${account}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#101820] px-4 text-sm font-semibold text-white"
          >
            Log in with school details
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/register?account=independent"
            className="block text-sm font-semibold text-[#536d00] underline underline-offset-4"
          >
            Create an independent learner account instead
          </Link>
        </div>
      )}
    </AuthFrame>
  );
}
export function IndependentRegistrationForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    grade: "Grade 7",
    pathway: "",
    parentPhone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [usernameEdited, setUsernameEdited] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const [subjects, setSubjects] = useState<SubjectChoice>({
    elective_subjects: [],
  });
  const [account, setAccount] = useState<IndependentRegistrationResult | null>(
      null,
    ),
    [error, setError] = useState<string | null>(null);
  const senior = /^Grade (10|11|12)$/.test(form.grade);
  const phone = form.parentPhone.replace(/[\s()-]/g, "");
  async function continueToPayment(result: IndependentRegistrationResult) {
    await loginIndependent(
      result.username ?? result.admissionNumber,
      form.password,
    );
    if (senior) await api.post("/student/subjects", subjects);
    // Navigation state avoids placing a payer's phone in the URL or localStorage.
    // The existing activation page requires confirmation before sending any STK.
    navigate("/student/activate", { state: { payerPhone: phone } });
  }
  const register = useMutation({
    mutationFn: async () => {
      const result = await authApi.registerIndependent({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        grade: form.grade,
        pathway: form.pathway || undefined,
        parentPhone: phone,
        email: form.email.trim().toLowerCase() || undefined,
        password: form.password,
      });
      setAccount(result);
      await continueToPayment(result);
    },
    onError: (err) =>
      setError(
        apiErrorMessage(
          err,
          "Could not finish account setup. Please try again.",
        ),
      ),
  });
  const resume = useMutation({
    mutationFn: () => continueToPayment(account!),
    onError: (err) =>
      setError(
        apiErrorMessage(
          err,
          "Your account is saved. Retry continuing to payment, or sign in later.",
        ),
      ),
  });
  const busy = register.isPending || resume.isPending;
  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (busy) return;
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!/^(?:\+?254|0)[17]\d{8}$/.test(phone)) {
      setError(
        "Enter a Kenyan M-Pesa number, such as 0712345678 or +254712345678.",
      );
      return;
    }
    if (
      senior &&
      (!form.pathway ||
        !subjects.track_id ||
        subjects.elective_subjects.length !== 3)
    ) {
      setError("Choose a pathway, track and exactly three electives.");
      return;
    }
    if (account) resume.mutate();
    else register.mutate();
  }
  if (account)
    return (
      <div className="space-y-4">
        <div role="status" className="rounded-xl bg-[#f1f5e5] p-4 text-sm">
          <p className="font-semibold">Account saved</p>
          <p className="mt-1 text-slate-600">
            Username:{" "}
            <strong>{account.username ?? account.admissionNumber}</strong>
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
          >
            {error}
          </p>
        )}
        <button
          disabled={busy}
          onClick={() => {
            setError(null);
            resume.mutate();
          }}
          className="min-h-12 w-full rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Preparing payment…" : "Continue to M-Pesa confirmation"}
        </button>
        <Link
          to="/login?account=independent"
          className="block text-center text-sm font-semibold text-[#536d00]"
        >
          Sign in later
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Full name"
        value={form.name}
        onChange={(name) =>
          setForm((f) => ({
            ...f,
            name,
            username: usernameEdited ? f.username : suggestUsername(name),
          }))
        }
        placeholder="e.g., Victor Halisi"
        autoComplete="name"
        minLength={2}
        maxLength={200}
      />
      <Field
        label="Username"
        value={form.username}
        onChange={(username) => {
          setUsernameEdited(true);
          setForm((f) => ({ ...f, username: username.toLowerCase() }));
        }}
        placeholder="e.g., victor.halisi"
        autoComplete="username"
        minLength={3}
        maxLength={30}
        pattern="[a-zA-Z][a-zA-Z0-9._]{2,29}"
        title="Start with a letter. Use 3–30 letters, numbers, dots or underscores."
      />
      <div>
        <label
          htmlFor="registration-grade"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Grade
        </label>
        <select
          id="registration-grade"
          value={form.grade}
          onChange={(e) => {
            setSubjects({ elective_subjects: [] });
            setForm((f) => ({ ...f, grade: e.target.value, pathway: "" }));
          }}
          className={inputClass}
        >
          {[
            "PP1",
            "PP2",
            ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
          ].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>
      {senior && (
        <div>
          <label
            htmlFor="registration-pathway"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Pathway
          </label>
          <select
            id="registration-pathway"
            required
            value={form.pathway}
            onChange={(e) => {
              setSubjects({ elective_subjects: [] });
              setForm((f) => ({ ...f, pathway: e.target.value }));
            }}
            className={inputClass}
          >
            <option value="">Choose a pathway</option>
            {["STEM", "Social Sciences", "Arts and Sports Science"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      )}
      {senior && form.pathway && (
        <SubjectSelectionFields
          compact
          grade={Number(form.grade.split(" ")[1])}
          pathway={form.pathway}
          value={subjects}
          onChange={setSubjects}
        />
      )}
      <Field
        label="Phone for M-Pesa"
        type="tel"
        value={form.parentPhone}
        onChange={(parentPhone) => setForm((f) => ({ ...f, parentPhone }))}
        placeholder="+254 7XX XXX XXX"
        autoComplete="tel"
        maxLength={30}
      />
      <p className="!mt-1.5 text-xs text-slate-500">
        Use your own or a parent/guardian’s M-Pesa number.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Password"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={(password) => setForm((f) => ({ ...f, password }))}
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
        />
        <Field
          label="Confirm password"
          type={showPassword ? "text" : "password"}
          value={form.confirmPassword}
          onChange={(confirmPassword) =>
            setForm((f) => ({ ...f, confirmPassword }))
          }
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
        />
      </div>
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        aria-pressed={showPassword}
        className="inline-flex min-h-9 items-center gap-2 text-xs font-medium text-slate-500"
      >
        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}{" "}
        {showPassword ? "Hide passwords" : "Show passwords"}
      </button>
      <details className="rounded-lg border border-slate-200 px-3 py-2">
        <summary className="cursor-pointer py-1 text-sm text-slate-500">
          Receipt email (optional)
        </summary>
        <div className="py-2">
          <Field
            label="Email address for receipts"
            type="email"
            required={false}
            value={form.email}
            onChange={(email) => setForm((f) => ({ ...f, email }))}
            autoComplete="email"
          />
        </div>
      </details>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
        >
          {error}
        </p>
      )}
      <button
        disabled={busy}
        type="submit"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {busy ? "Creating account…" : "Create account & pay KES 300"}
        <ArrowRight size={17} />
      </button>
      <p className="text-center text-xs leading-5 text-slate-500">
        KES 300 per month. Next, confirm your M-Pesa request.
        <br />
        Payment activates access after confirmation.
      </p>
      <p className="text-center text-xs leading-5 text-slate-400">
        Continue with permission from the learner or their parent/guardian.
      </p>
    </form>
  );
}
const inputClass =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-[#101820] outline-none transition placeholder:text-slate-400 focus:border-[#8cb500] focus:ring-2 focus:ring-[#b5e61d]/15";
function Field({
  label,
  value,
  onChange,
  autoComplete,
  required = true,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  title?: string;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <input
        {...rest}
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoCapitalize={autoComplete === "username" ? "none" : undefined}
        spellCheck={autoComplete === "username" ? false : undefined}
        required={required}
        className={inputClass}
      />
    </div>
  );
}
function suggestUsername(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s._]/g, "")
    .replace(/\s+/g, ".")
    .replace(/^[^a-z]+/, "")
    .slice(0, 30);
}
