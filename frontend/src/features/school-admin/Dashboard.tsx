import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users.api';
import { paymentApi } from '../../api/subscriptions.api';
import { useAuthStore } from '../../store/auth.store';
import { apiErrorMessage } from '../../api/axios';

export function SchoolAdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const { data: staffAndStudents } = useQuery({
    queryKey: ['users', user?.schoolId],
    queryFn: () => usersApi.findAll(user?.schoolId),
  });

  const { data: pricing } = useQuery({
    queryKey: ['pricing', user?.schoolId],
    queryFn: () => paymentApi.getPricing(user?.schoolId),
    enabled: !!user,
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => usersApi.importExcel(file),
    onSuccess: (summary) => {
      setImportStatus(
        `${summary.createdStudents} students, ${summary.createdTeachers} teachers imported.` +
          (summary.errors.length ? ` ${summary.errors.length} rows skipped.` : ''),
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => setImportStatus(apiErrorMessage(err, 'Import failed')),
  });

  const teachers = (staffAndStudents ?? []).filter((u) => u.role === 'TEACHER');
  const students = (staffAndStudents ?? []).filter((u) => u.role === 'STUDENT');

  async function handleDownloadTemplate() {
    const blob = await usersApi.downloadTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assignments-hub-user-import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">School Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Teachers" value={teachers.length} />
        <StatCard label="Students" value={students.length} />
        <StatCard label="Plan" value={pricing?.tier.name ?? '—'} />
        <StatCard label="Monthly" value={pricing ? `KES ${pricing.amountKES.toLocaleString()}` : '—'} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="font-medium text-sm">Bulk Import Teachers &amp; Students</h2>
        <p className="text-xs text-gray-500">
          Upload the standard .xlsx template — see backend/src/users/users-import.service.ts for the exact
          columns it expects. Teachers without a password in the sheet get one auto-generated.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDownloadTemplate} className="px-3 py-2 text-sm rounded border border-gray-300">
            Download template
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={importMutation.isPending}
            className="px-3 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
          >
            {importMutation.isPending ? 'Importing…' : 'Upload .xlsx'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importMutation.mutate(file);
              e.target.value = '';
            }}
          />
        </div>
        {importStatus && <p className="text-sm text-gray-600">{importStatus}</p>}
        {importMutation.data?.generatedPasswords?.length ? (
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
            <p className="font-medium mb-1">Generated teacher passwords (shown once):</p>
            <ul className="space-y-0.5">
              {importMutation.data.generatedPasswords.map((p) => (
                <li key={p.email}>{p.email}: <span className="font-mono">{p.password}</span></li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-medium text-sm mb-2">Subscription</h2>
        {pricing ? (
          <p className="text-sm text-gray-600">
            {pricing.tier.name} plan · {pricing.studentCount} students · KES {pricing.ratePerStudent}/student/month
            ({pricing.schoolType.toLowerCase()}) = <span className="font-medium">KES {pricing.amountKES.toLocaleString()}/mo</span>
          </p>
        ) : (
          <p className="text-sm text-gray-500">Loading pricing…</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Payment checkout (IntaSend) is wired at the API layer (src/api/subscriptions.api.ts) — the
          checkout UI itself is a Phase 2 build, see ROADMAP.md.
        </p>
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
