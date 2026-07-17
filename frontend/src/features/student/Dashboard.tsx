import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { useAuthStore } from '../../store/auth.store';

export function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['assignments', user?.schoolId],
    queryFn: () => assignmentsApi.findAll(),
  });

  const published = (assignments ?? []).filter((a) => a.isPublished);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-gray-500">Grade {user?.grade}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assignments" value={published.length} />
        <StatLink to="/student/pathways" label="Career Pathways" />
        <StatLink to="/student/stem-labs" label="STEM Labs & CSL" />
        <StatLink to="/student/reports" label="My Reports" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-sm">Your Assignments</h2>
        </div>
        {isLoading && <p className="p-4 text-sm text-gray-500">Loading…</p>}
        {error && <p className="p-4 text-sm text-red-600">Couldn't load assignments.</p>}
        {!isLoading && published.length === 0 && (
          <p className="p-4 text-sm text-gray-500">Nothing assigned yet.</p>
        )}
        <ul className="divide-y divide-gray-100">
          {published.map((a) => (
            <li key={a.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-gray-500">{a.subject} · {a.totalMarks} marks</p>
              </div>
              <button
                onClick={() => navigate(`/student/assignments/${a.id}`)}
                className="text-brand text-sm font-medium"
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-sm">
        <Link to="/student/support-needs" className="text-brand hover:underline">
          Need extra support? Visit the Support Needs guide →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-brand block">
      <p className="text-sm font-medium text-brand">{label}</p>
      <p className="text-xs text-gray-500 mt-1">Open →</p>
    </Link>
  );
}
