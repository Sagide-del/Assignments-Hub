import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthFrame } from "../components/auth/AuthFrame";
import { authApi } from "../api/auth.api";
import { apiErrorMessage } from "../api/axios";
import { useAuthStore } from "../store/auth.store";
import { dashboardPathForRole } from "../services/authService";
import { productReturnPath } from "../utils/product-return";

export default function Login() {
  const { schoolCode: fixedSchoolCode } = useParams<{ schoolCode?: string }>();
  const navigate = useNavigate(),
    location = useLocation();
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [schoolCode, setSchoolCode] = useState(fixedSchoolCode ?? "");
  const [visible, setVisible] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setSchoolCode(fixedSchoolCode ?? "");
  }, [fixedSchoolCode]);
  const input =
    "mt-2 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-[#647f42] focus:ring-2 focus:ring-[#647f42]/10";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const pair = await authApi.login(
        identifier.trim(),
        password,
        schoolCode.trim().toUpperCase() || undefined,
      );
      useAuthStore.getState().setSession(pair);
      navigate(
        productReturnPath(location.state?.from, pair.user.role) ??
          dashboardPathForRole(pair.user.role),
        { replace: true },
      );
    } catch (e) {
      setError(apiErrorMessage(e, "Check your login details and school code."));
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthFrame
      account="independent"
      mode="login"
      fixedSchoolCode={fixedSchoolCode}
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-medium text-slate-700">
          Email, username or admission number
          <input
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={input}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password or learner PIN
          <div className="relative">
            <input
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${input} pr-12`}
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
              className="absolute bottom-0 right-0 flex h-12 w-12 items-center justify-center text-slate-400"
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          School code{" "}
          <span className="font-normal text-slate-400">(school accounts)</span>
          <input
            name="schoolCode"
            autoComplete="organization"
            autoCapitalize="characters"
            value={schoolCode}
            readOnly={!!fixedSchoolCode}
            onChange={(e) => setSchoolCode(e.target.value)}
            className={input}
          />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            Independent learners can leave this blank.
          </span>
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#203e30] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
          <ArrowRight size={16} />
        </button>
        <p className="text-center text-xs text-slate-500">
          Need help signing in? Contact your school or Assignment Hub support.
        </p>
      </form>
    </AuthFrame>
  );
}
