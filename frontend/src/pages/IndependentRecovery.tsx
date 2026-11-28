import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, KeyRound, MessageSquareText } from "lucide-react";
import { authApi } from "../api/auth.api";
import { apiErrorMessage } from "../api/axios";
import { AuthFrame } from "../components/auth/AuthFrame";

const inputClass = "mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#647f42] focus:ring-2 focus:ring-[#647f42]/10";

export default function IndependentRecovery() {
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await authApi.requestIndependentRecovery(identifier.trim());
      setMessage(result.message); setRequested(true);
    } catch (caught) { setError(apiErrorMessage(caught, "We could not request a recovery code. Try again shortly.")); }
    finally { setBusy(false); }
  }
  async function resetPassword(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await authApi.resetIndependentPassword({ identifier: identifier.trim(), code, password });
      setMessage(result.message);
    } catch (caught) { setError(apiErrorMessage(caught, "We could not update your password. Check the code and try again.")); }
    finally { setBusy(false); }
  }

  return <AuthFrame account="independent" mode="login">
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#657d12]">Account recovery</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#101820]">Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Use the username or email on your individual learner account. We will send a six-digit code to the M-Pesa or guardian phone saved during registration.</p>
      </header>
      {!requested ? <form onSubmit={requestCode} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Username or email<input required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className={inputClass} /></label>
        {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#203e30] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sending code…" : "Send recovery code"}<MessageSquareText size={16} /></button>
      </form> : <form onSubmit={resetPassword} className="space-y-4">
        <p role="status" className="rounded-xl border border-lime-200 bg-lime-50 p-3 text-sm leading-6 text-[#3e5515]">{message}</p>
        <label className="block text-sm font-medium text-slate-700">Six-digit code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={inputClass} /></label>
        <label className="block text-sm font-medium text-slate-700">New password<input required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></label>
        {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#203e30] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Updating password…" : "Update password"}<KeyRound size={16} /></button>
      </form>}
      <Link to="/login?account=independent" className="inline-flex items-center gap-1 text-sm font-semibold text-[#536d00] hover:underline">Back to sign in <ArrowRight size={15} /></Link>
    </div>
  </AuthFrame>;
}
