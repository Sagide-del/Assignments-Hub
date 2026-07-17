import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

// Matches POST /auth/staff/login: school code + email + password. Used by
// both TEACHER and SCHOOL_ADMIN — the backend response's `user.role` decides
// where we route after login (see the redirect map below). PLATFORM_ADMIN
// deliberately cannot reach this endpoint successfully here — that role logs
// in via the hidden /platform-console route (PlatformLogin.tsx), per the
// requirement that Platform Owner login not be advertised on the public page.
export function StaffLogin() {
  const [schoolCode, setSchoolCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const pair = await authApi.loginStaff(schoolCode.trim().toUpperCase(), email.trim(), password);
      setSession(pair);
      const dest = pair.user.role === 'SCHOOL_ADMIN' ? '/school-admin' : '/teacher';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-medium">Teacher / School Admin Login</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">School Code</label>
        <input
          value={schoolCode}
          onChange={(e) => setSchoolCode(e.target.value)}
          required
          className="w-full rounded border-gray-300 focus:border-brand focus:ring-brand text-sm py-2 px-3 border"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border-gray-300 focus:border-brand focus:ring-brand text-sm py-2 px-3 border"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border-gray-300 focus:border-brand focus:ring-brand text-sm py-2 px-3 border"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-white rounded py-2 text-sm font-medium disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="text-center text-sm text-gray-500">
        <Link to="/login" className="hover:text-brand">Student login</Link>
      </div>
    </form>
  );
}
