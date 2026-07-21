import { useRef, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users.api';
import { paymentApi } from '../../api/subscriptions.api';
import { useAuthStore } from '../../store/auth.store';
import { apiErrorMessage } from '../../api/axios';
import { PageHeader } from '../../components/ui/Saas';

function StudentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4 9l8-4 8 4-8 4-8-4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 11.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="5" y="5" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 19h6M12 15v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

type PreviewSummary = {
  detected: number;
  valid: number;
  duplicates: number;
  missingRequiredFields: number;
};

type ImportErrorDetail = {
  row: number;
  name?: string;
  field?: string;
  message: string;
};

type ImportSectionProps = {
  title: string;
  icon: ReactNode;
  templateLabel: string;
  importLabel: string;
  onDownloadTemplate: () => Promise<void>;
  onPreviewFile: (file: File) => void;
  previewPending: boolean;
  importPending: boolean;
  preview: PreviewSummary | null;
  previewErrors: ImportErrorDetail[];
  previewStatus: string | null;
  importStatus: string | null;
  onConfirmImport: () => void;
  onCancelPreview: () => void;
  resultCards?: Array<{ label: string; value: string | number }>;
  errorTitle: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  footer?: ReactNode;
  inputRef: React.RefObject<HTMLInputElement>;
};

export function SchoolAdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const studentFileInput = useRef<HTMLInputElement>(null);
  const teacherFileInput = useRef<HTMLInputElement>(null);

  const [studentPreviewFile, setStudentPreviewFile] = useState<File | null>(null);
  const [teacherPreviewFile, setTeacherPreviewFile] = useState<File | null>(null);
  const [studentPreviewStatus, setStudentPreviewStatus] = useState<string | null>(null);
  const [teacherPreviewStatus, setTeacherPreviewStatus] = useState<string | null>(null);
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

  const studentPreviewMutation = useMutation({
    mutationFn: (file: File) => usersApi.previewStudentsExcel(file),
    onSuccess: (response) => {
      setStudentPreviewStatus(
        `Students detected: ${response.preview.detected}. Valid rows: ${response.preview.valid}.`,
      );
      setShowStudentErrors(response.errors.length > 0);
    },
    onError: (err) => setStudentPreviewStatus(apiErrorMessage(err, 'Student preview failed')),
  });

  const teacherPreviewMutation = useMutation({
    mutationFn: (file: File) => usersApi.previewTeachersExcel(file),
    onSuccess: (response) => {
      setTeacherPreviewStatus(
        `Teachers detected: ${response.preview.detected}. Valid rows: ${response.preview.valid}.`,
      );
      setShowTeacherErrors(response.errors.length > 0);
    },
    onError: (err) => setTeacherPreviewStatus(apiErrorMessage(err, 'Teacher preview failed')),
  });

  const studentImportMutation = useMutation({
    mutationFn: (file: File) => usersApi.importStudentsExcel(file),
    onSuccess: (response) => {
      setStudentImportStatus(
        `Import completed. ${response.summary.created} students created.` +
          (response.summary.failed ? ` ${response.summary.failed} rows failed.` : '') +
          (response.summary.duplicates ? ` ${response.summary.duplicates} duplicates detected.` : ''),
      );
      setStudentPreviewFile(null);
      setStudentPreviewStatus(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => setStudentImportStatus(apiErrorMessage(err, 'Student import failed')),
  });

  const teacherImportMutation = useMutation({
    mutationFn: (file: File) => usersApi.importTeachersExcel(file),
    onSuccess: (response) => {
      setTeacherImportStatus(
        `Import completed. ${response.summary.created} teachers created.` +
          (response.summary.failed ? ` ${response.summary.failed} rows failed.` : ''),
      );
      setTeacherPreviewFile(null);
      setTeacherPreviewStatus(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => setTeacherImportStatus(apiErrorMessage(err, 'Teacher import failed')),
  });

  const teachers = (staffAndStudents ?? []).filter((u) => u.role === 'TEACHER');
  const students = (staffAndStudents ?? []).filter((u) => u.role === 'STUDENT');

  async function downloadBlob(factory: () => Promise<Blob>, filename: string) {
    const blob = await factory();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resetStudentPreview() {
    setStudentPreviewFile(null);
    setStudentPreviewStatus(null);
    studentPreviewMutation.reset();
  }

  function resetTeacherPreview() {
    setTeacherPreviewFile(null);
    setTeacherPreviewStatus(null);
    teacherPreviewMutation.reset();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
        <div className="flex items-start gap-4">
          <div>
            <PageHeader title="People management" />
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              Manage school onboarding with isolated student and teacher imports. Every import is scoped to the
              authenticated school admin, so one school’s upload cannot affect another school’s data.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Teachers" value={teachers.length} />
        <StatCard label="Students" value={students.length} />
        <StatCard label="Plan" value={pricing?.tier.name ?? '-'} />
        <StatCard label="Monthly" value={pricing ? `KES ${pricing.amountKES.toLocaleString()}` : '-'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ImportSection
          title="Students"
          icon={<StudentIcon />}
          templateLabel="Download Student Template"
          importLabel="Import Students"
          onDownloadTemplate={() =>
            downloadBlob(usersApi.downloadStudentTemplate, 'assignments-hub-student-import-template.xlsx')
          }
          onPreviewFile={(file) => {
            setStudentPreviewFile(file);
            setStudentImportStatus(null);
            studentPreviewMutation.mutate(file);
          }}
          previewPending={studentPreviewMutation.isPending}
          importPending={studentImportMutation.isPending}
          preview={studentPreviewMutation.data?.preview ?? null}
          previewErrors={studentPreviewMutation.data?.errors ?? []}
          previewStatus={studentPreviewStatus}
          importStatus={studentImportStatus}
          onConfirmImport={() => {
            if (studentPreviewFile) studentImportMutation.mutate(studentPreviewFile);
          }}
          onCancelPreview={resetStudentPreview}
          resultCards={
            studentImportMutation.data
              ? [
                  { label: 'Created', value: studentImportMutation.data.summary.created },
                  { label: 'Failed', value: studentImportMutation.data.summary.failed },
                  { label: 'Duplicates', value: studentImportMutation.data.summary.duplicates },
                ]
              : undefined
          }
          errorTitle="Student validation details"
          expanded={showStudentErrors}
          onToggleExpanded={() => setShowStudentErrors((prev) => !prev)}
          inputRef={studentFileInput}
        />

        <ImportSection
          title="Teachers"
          icon={<TeacherIcon />}
          templateLabel="Download Teacher Template"
          importLabel="Import Teachers"
          onDownloadTemplate={() =>
            downloadBlob(usersApi.downloadTeacherTemplate, 'assignments-hub-teacher-import-template.xlsx')
          }
          onPreviewFile={(file) => {
            setTeacherPreviewFile(file);
            setTeacherImportStatus(null);
            teacherPreviewMutation.mutate(file);
          }}
          previewPending={teacherPreviewMutation.isPending}
          importPending={teacherImportMutation.isPending}
          preview={teacherPreviewMutation.data?.preview ?? null}
          previewErrors={teacherPreviewMutation.data?.errors ?? []}
          previewStatus={teacherPreviewStatus}
          importStatus={teacherImportStatus}
          onConfirmImport={() => {
            if (teacherPreviewFile) teacherImportMutation.mutate(teacherPreviewFile);
          }}
          onCancelPreview={resetTeacherPreview}
          resultCards={
            teacherImportMutation.data
              ? [
                  { label: 'Created', value: teacherImportMutation.data.summary.created },
                  { label: 'Failed', value: teacherImportMutation.data.summary.failed },
                ]
              : undefined
          }
          errorTitle="Teacher validation details"
          expanded={showTeacherErrors}
          onToggleExpanded={() => setShowTeacherErrors((prev) => !prev)}
          footer={
            teacherImportMutation.data?.generatedPasswords.length ? (
              <div className="text-xs rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="font-medium text-yellow-900">Generated teacher passwords (shown once):</p>
                <ul className="mt-2 space-y-1 text-yellow-800">
                  {teacherImportMutation.data.generatedPasswords.map((entry) => (
                    <li key={`${entry.row}-${entry.email}`}>
                      {entry.email}: <span className="font-mono">{entry.password}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          }
          inputRef={teacherFileInput}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-medium text-sm mb-2">Subscription</h2>
        {pricing ? (
          <p className="text-sm text-gray-600">
            {pricing.tier.name} plan · {pricing.studentCount} students · KES {pricing.ratePerStudent}/student/month
            ({pricing.schoolType.toLowerCase()}) = <span className="font-medium">KES {pricing.amountKES.toLocaleString()}/mo</span>
          </p>
        ) : (
          <p className="text-sm text-gray-500">Loading pricing...</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Payment checkout (IntaSend) is wired at the API layer (src/api/subscriptions.api.ts) - the
          checkout UI itself is a Phase 2 build, see ROADMAP.md.
        </p>
      </div>
    </div>
  );
}

function ImportSection({
  title,
  icon,
  templateLabel,
  importLabel,
  onDownloadTemplate,
  onPreviewFile,
  previewPending,
  importPending,
  preview,
  previewErrors,
  previewStatus,
  importStatus,
  onConfirmImport,
  onCancelPreview,
  resultCards,
  errorTitle,
  expanded,
  onToggleExpanded,
  footer,
  inputRef,
}: ImportSectionProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(16,24,32,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#101820] text-[#B5E61D]">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#101820]">{title}</h2>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            void onDownloadTemplate();
          }}
          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#101820]"
        >
          {templateLabel}
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={previewPending || importPending}
          className="rounded-2xl bg-[#101820] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {previewPending ? 'Validating...' : importLabel}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPreviewFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {previewStatus ? <p className="mt-4 text-sm text-slate-600">{previewStatus}</p> : null}
      {importStatus ? <p className="mt-2 text-sm text-slate-600">{importStatus}</p> : null}

      {preview ? (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-[#F8FAFC] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Validation preview</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Detected" value={preview.detected} />
            <StatCard label="Valid Rows" value={preview.valid} />
            <StatCard label="Duplicates" value={preview.duplicates} />
            <StatCard label="Missing Fields" value={preview.missingRequiredFields} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onConfirmImport}
              disabled={importPending}
              className="rounded-2xl bg-[#B5E61D] px-4 py-3 text-sm font-semibold text-[#101820] disabled:opacity-60"
            >
              {importPending ? 'Importing...' : 'Confirm Import'}
            </button>
            <button
              type="button"
              onClick={onCancelPreview}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-[#101820]"
            >
              Cancel Preview
            </button>
          </div>
        </div>
      ) : null}

      {previewErrors.length ? (
        <ErrorPanel
          title={errorTitle}
          expanded={expanded}
          onToggle={onToggleExpanded}
          errors={previewErrors}
        />
      ) : null}

      {resultCards?.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {resultCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      ) : null}

      {footer ? <div className="mt-5">{footer}</div> : null}
    </section>
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
  errors: ImportErrorDetail[];
}) {
  return (
    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-red-700">{title}</p>
        <button type="button" onClick={onToggle} className="text-red-700 underline">
          {expanded ? 'Hide details' : 'View error details'}
        </button>
      </div>
      {expanded ? (
        <ul className="mt-3 space-y-1 text-red-700">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-semibold text-[#101820]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
