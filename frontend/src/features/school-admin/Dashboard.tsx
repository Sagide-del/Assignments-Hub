import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users.api';
import { paymentApi } from '../../api/subscriptions.api';
import { useAuthStore } from '../../store/auth.store';
import { apiErrorMessage } from '../../api/axios';

export function SchoolAdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const studentFileInput = useRef<HTMLInputElement>(null);
  const teacherFileInput = useRef<HTMLInputElement>(null);
  const [studentImportStatus, setStudentImportStatus] = useState<string | null>(null);
  const [teacherImportStatus, setTeacherImportStatus] = useState<string | null>(null);
  const [showStudentErrors, setShowStudentErrors] = useState(false);
  const [showTeacherErrors, setShowTeacherErrors] = useState(false);

  const { data: staffAndStudents } = useQuery({
    queryKey: ['users', user?.schoolId],
    queryFn: () => usersApi.findAll(user?.schoolId),
  });

  const { data: pricing } = useQuery({
    queryKey: ['pricing', user?.schoolId],
    queryFn: () => paymentApi.getPricing(user?.schoolId),
    enabled: !!user,
  });

  const studentImportMutation = useMutation({
    mutationFn: (file: File) => usersApi.importStudentsExcel(file),
    onSuccess: (response) => {
      setStudentImportStatus(
        `Student import completed. ${response.summary.created} created.` +
          (response.summary.failed ? ` ${response.summary.failed} failed.` : '') +
          (response.summary.duplicates ? ` ${response.summary.duplicates} duplicates detected.` : ''),
      );
      setShowStudentErrors(response.errors.length > 0);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => setStudentImportStatus(apiErrorMessage(err, 'Student import failed')),
  });

  const teacherImportMutation = useMutation({
    mutationFn: (file: File) => usersApi.importTeachersExcel(file),
    onSuccess: (response) => {
      setTeacherImportStatus(
        `Teacher import completed. ${response.summary.created} created.` +
          (response.summary.failed ? ` ${response.summary.failed} failed.` : ''),
      );
      setShowTeacherErrors(response.errors.length > 0);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => setTeacherImportStatus(apiErrorMessage(err, 'Teacher import failed')),
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Teachers" value={teachers.length} />
        <StatCard label="Students" value={students.length} />
        <StatCard label="Plan" value={pricing?.tier.name ?? '-'} />
        <StatCard label="Monthly" value={pricing ? `KES ${pricing.amountKES.toLocaleString()}` : '-'} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-5">
        <h2 className="font-medium text-sm">People Management</h2>
        <p className="text-xs text-gray-500">
          Student and teacher imports are isolated by school. The backend always derives the tenant from the
          authenticated school admin, so one school's import cannot target another school's data.
        </p>

        <button onClick={handleDownloadTemplate} className="px-3 py-2 text-sm rounded border border-gray-300">
          Download template
        </button>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="font-medium text-sm">Students</h3>
            <p className="text-xs text-gray-500">
              Import student records only. Supported fields remain name, admission number, grade, and parent phone.
            </p>
            <button
              onClick={() => studentFileInput.current?.click()}
              disabled={studentImportMutation.isPending}
              className="px-3 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
            >
              {studentImportMutation.isPending ? 'Importing…' : 'Import Students'}
            </button>
            <input
              ref={studentFileInput}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) studentImportMutation.mutate(file);
                e.target.value = '';
              }}
            />
            {studentImportStatus ? <p className="text-sm text-gray-600">{studentImportStatus}</p> : null}
            {studentImportMutation.data ? (
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Created" value={studentImportMutation.data.summary.created} />
                <StatCard label="Failed" value={studentImportMutation.data.summary.failed} />
                <StatCard label="Duplicates" value={studentImportMutation.data.summary.duplicates} />
              </div>
            ) : null}
            {studentImportMutation.data?.errors.length ? (
              <ErrorPanel
                title="Student import errors"
                expanded={showStudentErrors}
                onToggle={() => setShowStudentErrors((prev) => !prev)}
                errors={studentImportMutation.data.errors}
              />
            ) : null}
          </section>

          <section className="rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="font-medium text-sm">Teachers</h3>
            <p className="text-xs text-gray-500">
              Import teacher records only. Blank teacher passwords still trigger secure auto-generation.
            </p>
            <button
              onClick={() => teacherFileInput.current?.click()}
              disabled={teacherImportMutation.isPending}
              className="px-3 py-2 text-sm rounded bg-brand text-white disabled:opacity-60"
            >
              {teacherImportMutation.isPending ? 'Importing…' : 'Import Teachers'}
            </button>
            <input
              ref={teacherFileInput}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) teacherImportMutation.mutate(file);
                e.target.value = '';
              }}
            />
            {teacherImportStatus ? <p className="text-sm text-gray-600">{teacherImportStatus}</p> : null}
            {teacherImportMutation.data ? (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Created" value={teacherImportMutation.data.summary.created} />
                <StatCard label="Failed" value={teacherImportMutation.data.summary.failed} />
              </div>
            ) : null}
            {teacherImportMutation.data?.errors.length ? (
              <ErrorPanel
                title="Teacher import errors"
                expanded={showTeacherErrors}
                onToggle={() => setShowTeacherErrors((prev) => !prev)}
                errors={teacherImportMutation.data.errors}
              />
            ) : null}
            {teacherImportMutation.data?.generatedPasswords.length ? (
              <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                <p className="font-medium mb-1">Generated teacher passwords (shown once):</p>
                <ul className="space-y-0.5">
                  {teacherImportMutation.data.generatedPasswords.map((entry) => (
                    <li key={`${entry.row}-${entry.email}`}>
                      {entry.email}: <span className="font-mono">{entry.password}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
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

function ErrorPanel({
  title,
  expanded,
  onToggle,
  errors,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  errors: { row: number; name?: string; field?: string; message: string }[];
}) {
  return (
    <div className="text-xs bg-red-50 border border-red-200 rounded p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-red-700">{title}</p>
        <button type="button" onClick={onToggle} className="text-red-700 underline">
          {expanded ? 'Hide details' : 'View error details'}
        </button>
      </div>
      {expanded ? (
        <ul className="mt-2 space-y-1 text-red-700">
          {errors.map((error) => (
            <li key={`${error.row}-${error.field ?? 'general'}-${error.message}`}>
              Row {error.row}
              {error.name ? ` (${error.name})` : ''}
              {error.field ? ` - ${error.field}` : ''}: {error.message}
            </li>
          ))}
        </ul>
      ) : null}
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
