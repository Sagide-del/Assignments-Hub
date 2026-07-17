import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolsApi } from '../../api/schools.api';
import { apiErrorMessage } from '../../api/axios';

// The only place a new school can be created (POST /schools is
// PLATFORM_ADMIN-only on the backend). Real, functional "school
// registration" flow today — but note `code` is NOT server-generated: the
// backend requires it as input (unique, /^[A-Z0-9]+$/, 3-20 chars — see
// backend/src/schools/dto/create-school.dto.ts). The suggestion below is a
// client-side convenience, editable before submit, not a real backend
// feature (see ROADMAP.md's "Automatic school code generation" gap).
function suggestCode(name: string): string {
  const initials = name
    .replace(/[^a-zA-Z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4) || 'SCH';
  const digits = Math.floor(10000 + Math.random() * 89999);
  return `${initials}${digits}`;
}

export function PlatformAdminDashboard() {
  const queryClient = useQueryClient();
  const { data: schools, isLoading } = useQuery({ queryKey: ['schools'], queryFn: schoolsApi.findAll });

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'DAY' | 'BOARDING'>('DAY');
  const [status, setStatus] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const codeValid = /^[A-Z0-9]{3,20}$/.test(code);

  const createMutation = useMutation({
    mutationFn: () => schoolsApi.create({ name, code, type }),
    onSuccess: (school) => {
      setCreated(school.code);
      setStatus(null);
      setName('');
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not create school — code may already be taken')),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Platform Console</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="font-medium text-sm">Register a School</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!code) setCode(suggestCode(e.target.value));
            }}
            placeholder="School name"
            className="flex-1 min-w-[200px] border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code (A-Z, 0-9)"
            className="w-40 border border-gray-300 rounded px-3 py-2 text-sm font-mono"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'DAY' | 'BOARDING')}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="DAY">Day School</option>
            <option value="BOARDING">Boarding School</option>
          </select>
          <button
            onClick={() => name.trim() && codeValid && createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim() || !codeValid}
            className="px-4 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
        {code && !codeValid && <p className="text-xs text-red-600">Code must be 3-20 uppercase letters/numbers.</p>}
        {created && (
          <p className="text-sm text-green-700">
            School created — code: <span className="font-mono font-medium">{created}</span>
          </p>
        )}
        {status && <p className="text-sm text-red-600">{status}</p>}
        <p className="text-xs text-gray-400">
          Next step (not built yet): creating that school's first School Admin user via POST /users.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-sm">Schools ({schools?.length ?? 0})</h2>
        </div>
        {isLoading && <p className="p-4 text-sm text-gray-500">Loading…</p>}
        <ul className="divide-y divide-gray-100">
          {(schools ?? []).map((s) => (
            <li key={s.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-gray-500 font-mono">{s.code}</p>
              </div>
              <span className="text-xs text-gray-500">{s.type}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
