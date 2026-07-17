import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

// Deliberately unlinked from anywhere in the public UI — reachable only by
// knowing the URL (/platform-console). Uses the same POST /auth/staff/login
// endpoint as StaffLogin; a non-PLATFORM_ADMIN account that authenticates
// successfully here still gets bounced by ProtectedRoute on /platform, since
// route-level role checks are enforced independently of which login form
// was used to obtain the token.
export function PlatformLogin() {
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
      if (pair.user.role !== 'PLATFORM_ADMIN') {
        setError('This console is for Platform Admin accounts only.');
        return;
      }
      setSession(pair);
      navigate('/platform', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-medium text-white">Platform Console</h2>

        <div>
          <label className="block text-sm text-gray-300 mb-1">School Code</label>
          <input
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value)}
            required
            className="w-full rounded bg-gray-700 text-white text-sm py-2 px-3 border border-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Platform Admin accounts belong to a school record too — use the platform's own school code.
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded bg-gray-700 text-white text-sm py-2 px-3 border border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded bg-gray-700 text-white text-sm py-2 px-3 border border-gray-600"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-gray-900 rounded py-2 text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Enter Console'}
        </button>
      </form>
    </div>
  );
}
