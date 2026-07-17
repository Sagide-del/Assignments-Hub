import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { apiErrorMessage } from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

// Matches POST /auth/student/login exactly: school code + admission number,
// no password (see backend/src/auth/auth.service.ts loginStudent).
export function StudentLogin() {
  const [schoolCode, setSchoolCode] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const pair = await authApi.loginStudent(schoolCode.trim().toUpperCase(), admissionNumber.trim());
      setSession(pair);
      navigate('/student', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid school code or admission number'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-medium">Student Login</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">School Code</label>
        <input
          value={schoolCode}
          onChange={(e) => setSchoolCode(e.target.value)}
          placeholder="e.g. MBH-74291"
          required
          className="w-full rounded border-gray-300 focus:border-brand focus:ring-brand text-sm py-2 px-3 border"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number</label>
        <input
          value={admissionNumber}
          onChange={(e) => setAdmissionNumber(e.target.value)}
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

      <div className="text-center text-sm text-gray-500 space-x-3">
        <Link to="/login/staff" className="hover:text-brand">Teacher / School Admin login</Link>
      </div>
    </form>
  );
}
