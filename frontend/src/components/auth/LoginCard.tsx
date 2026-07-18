import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginTabs, type LoginType } from './LoginTabs';
import { loginStudent, loginStaff, dashboardPathForRole } from '../../services/authService';
import { apiErrorMessage } from '../../api/axios';

interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
}

interface FormState {
  schoolCode: string;
  email: string;
  password: string;
  admissionNumber: string;
}

export function LoginCard({ loginType, setLoginType }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({ schoolCode: '', email: '', password: '', admissionNumber: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user =
        loginType === 'student'
          ? await loginStudent(form.schoolCode, form.admissionNumber)
          : await loginStaff(form.schoolCode, form.email, form.password);
      navigate(dashboardPathForRole(user.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, loginType === 'student' ? 'Invalid school code or admission number' : 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <img src="/logo.png" alt="Assignment Hub" className="w-20 mx-auto mb-8" />

      <h2 className="text-3xl font-bold text-center">Welcome Back</h2>
      <p className="text-center text-gray-500 mt-2">Sign in to your account</p>

      <LoginTabs loginType={loginType} setLoginType={setLoginType} />

      <form onSubmit={submitLogin} className="mt-8 space-y-5">
        <input
          name="schoolCode"
          placeholder="School Code"
          value={form.schoolCode}
          onChange={handleChange}
          required
          className="w-full border rounded-xl px-4 py-3"
        />

        {loginType === 'student' ? (
          <input
            name="admissionNumber"
            placeholder="Admission Number"
            value={form.admissionNumber}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3"
          />
        ) : (
          <>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border rounded-xl px-4 py-3"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border rounded-xl px-4 py-3"
            />
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#B5E61D] text-black font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {/* Not a real link: there is no self-service school registration
          endpoint on the backend (POST /schools is Platform-Admin-only —
          see frontend/ROADMAP.md). Left as plain text rather than a button
          that would go nowhere. */}
      <p className="text-center text-sm text-gray-500 mt-8">
        New school? <span className="text-[#8BB800] font-semibold">Contact your Platform Admin to get set up.</span>
      </p>
    </div>
  );
}
