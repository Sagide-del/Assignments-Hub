import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axios';
import { independentStudentsApi } from '../../api/independent-students.api';
import { ActionCard, EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import type {
  IndependentPaymentClaim,
  IndependentStudent,
  IndependentStudentPaymentInfo,
  IndependentStudentStatus,
  IndependentWelcomeResult,
} from '../../types';

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

function statusBadgeClass(status: IndependentStudentStatus) {
  if (status === 'ACTIVE') return 'bg-[#EAF7C8] text-[#3F5B00]';
  if (status === 'EXPIRED') return 'bg-red-50 text-red-600';
  return 'bg-slate-100 text-slate-500';
}

export function IndependentStudentsPage() {
  const queryClient = useQueryClient();
  const [addingStudent, setAddingStudent] = useState(false);
  const [invoicingStudent, setInvoicingStudent] = useState<IndependentStudent | null>(null);
  const [viewingInvoicesFor, setViewingInvoicesFor] = useState<IndependentStudent | null>(null);
  const [welcomingStudent, setWelcomingStudent] = useState<IndependentStudent | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IndependentStudentStatus>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const { data: paymentInfo } = useQuery({
    queryKey: ['independent-students-payment-info'],
    queryFn: () => independentStudentsApi.getPaymentInfo(),
  });
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['independent-students'],
    queryFn: () => independentStudentsApi.findStudents(),
  });
  const { data: summary } = useQuery({
    queryKey: ['independent-students-summary'],
    queryFn: () => independentStudentsApi.getSummary(),
  });
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['independent-student-invoices'],
    queryFn: () => independentStudentsApi.findInvoices(),
  });

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;
      const matchesSearch =
        !term ||
        student.name.toLowerCase().includes(term) ||
        student.admissionNumber?.toLowerCase().includes(term) ||
        student.parentPhone?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term);
      return matchesStatus && Boolean(matchesSearch);
    });
  }, [search, statusFilter, students]);
  const filteredStudentIds = filteredStudents.map((student) => student.id);
  const selectableFilteredIds = filteredStudentIds.slice(0, 100);
  const allFilteredSelected =
    selectableFilteredIds.length > 0 &&
    selectableFilteredIds.every((id) => selectedStudentIds.includes(id));

  const deleteStudentsMutation = useMutation({
    mutationFn: (ids: number[]) => independentStudentsApi.deleteStudents(ids),
    onSuccess: () => {
      setSelectedStudentIds([]);
      queryClient.invalidateQueries({ queryKey: ['independent-students'] });
      queryClient.invalidateQueries({ queryKey: ['independent-students-summary'] });
      queryClient.invalidateQueries({ queryKey: ['independent-student-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['independent-payment-claims'] });
      queryClient.invalidateQueries({ queryKey: ['private-tutor-overview'] });
      queryClient.invalidateQueries({ queryKey: ['private-tutor-submissions'] });
    },
    onError: (error) => {
      window.alert(apiErrorMessage(error, 'Could not delete the selected student accounts'));
    },
  });

  function toggleStudent(studentId: number) {
    setSelectedStudentIds((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId);
      }
      if (current.length >= 100) {
        window.alert('You can delete up to 100 student accounts at a time.');
        return current;
      }
      return [...current, studentId];
    });
  }

  function toggleAllFiltered() {
    setSelectedStudentIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !selectableFilteredIds.includes(id));
      }
      return Array.from(new Set([...current, ...selectableFilteredIds])).slice(0, 100);
    });
  }

  function confirmBulkDelete() {
    if (!selectedStudentIds.length) return;
    const confirmed = window.confirm(
      `Permanently delete ${selectedStudentIds.length} student account${selectedStudentIds.length === 1 ? '' : 's'}? Their submissions, STEM sessions, payment records and login access will also be deleted. This cannot be undone.`,
    );
    if (confirmed) deleteStudentsMutation.mutate(selectedStudentIds);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Direct subscriptions"
        title="Independent student billing"
        meta="Accounts, payments and access"
        actions={
          <button
            type="button"
            onClick={() => setAddingStudent(true)}
            className="rounded-xl bg-[#101820] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            Add student
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total students" value={summary?.totalPopulation ?? students.length} compact />
        <MetricCard label="Active access" value={summary?.activeStudents ?? 0} compact />
        <MetricCard label="Payments made" value={summary?.paymentsMade ?? invoices.length} compact />
        <MetricCard label="Revenue" value={formatCurrency(summary?.totalRevenueKES ?? 0)} compact />
        <MetricCard label="Pending review" value={summary?.pendingPayments ?? 0} compact />
      </section>

      {paymentInfo?.enabled ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#DDECB0] bg-[#FAFDEB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5E7900]">M-Pesa collection</p>
            <p className="mt-1 text-sm font-semibold text-[#101820]">
              Till {paymentInfo.tillNumber}
              {paymentInfo.storeNumber ? ` / Store ${paymentInfo.storeNumber}` : ''}
            </p>
          </div>
          <p className="text-sm font-semibold text-[#101820]">
            {formatCurrency(paymentInfo.monthlyAmountKES)} monthly
          </p>
        </div>
      ) : paymentInfo ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Individual student payment details are not fully configured.
        </div>
      ) : null}

      <PaymentClaimsCard />

      <ActionCard
        title="Student accounts"
        meta={isLoading ? undefined : `${filteredStudents.length} of ${students.length}`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {selectedStudentIds.length
                ? `${selectedStudentIds.length} selected`
                : `${summary?.studentsWithPhone ?? 0} with phone`}
            </span>
            {selectedStudentIds.length ? (
              <button
                type="button"
                onClick={confirmBulkDelete}
                disabled={deleteStudentsMutation.isPending}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleteStudentsMutation.isPending ? 'Deleting...' : 'Delete selected'}
              </button>
            ) : null}
          </div>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative">
            <span className="sr-only">Search students</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, ID or phone"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#8CB500]"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | IndependentStudentStatus)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#101820] outline-none focus:border-[#8CB500]"
          >
            <option value="ALL">All access states</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="NEVER_PAID">Never paid</option>
          </select>
        </div>

        {isLoading ? (
          <EmptyState title="Loading students..." />
        ) : students.length === 0 ? (
          <EmptyState
            title="No independent students yet."
            action={
              <button
                type="button"
                onClick={() => setAddingStudent(true)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820]"
              >
                Add the first student
              </button>
            }
          />
        ) : filteredStudents.length === 0 ? (
          <EmptyState title="No students match these filters." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      className="h-4 w-4 rounded border-slate-300 accent-[#101820]"
                      aria-label="Select all filtered students"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Access</th>
                  <th className="px-4 py-3 font-semibold">Payments</th>
                  <th className="px-4 py-3 font-semibold">Last payment</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#101820]"
                        aria-label={`Select ${student.name}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#101820]">{student.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {student.admissionNumber ?? 'No login ID'}
                        {student.grade ? ` / ${student.grade}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-700">{student.parentPhone ?? 'Not provided'}</p>
                      {student.email ? (
                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">{student.email}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(student.status)}`}>
                        {student.status === 'ACTIVE' ? 'Active' : student.status === 'EXPIRED' ? 'Expired' : 'Never paid'}
                      </span>
                      <p className="mt-2 text-xs text-slate-400">
                        {student.hasPassword ? 'Login ready' : 'Credentials not set'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#101820]">{formatCurrency(student.totalPaidKES)}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {student.paymentCount} payment{student.paymentCount === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(student.lastPaymentAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setWelcomingStudent(student)}
                          disabled={student.status !== 'ACTIVE'}
                          title={
                            student.status === 'ACTIVE'
                              ? 'Reset and send login credentials'
                              : 'Activate payment before sending credentials'
                          }
                          className="rounded-lg border border-[#CFE481] px-3 py-2 text-xs font-semibold text-[#4B6500] hover:bg-[#FAFDEB] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        >
                          Send welcome
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoicingStudent(student)}
                          className="rounded-lg bg-[#101820] px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
                        >
                          Record payment
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingInvoicesFor(student)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#101820] hover:bg-white"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ActionCard>

      <PaymentHistory invoices={invoices} isLoading={invoicesLoading} />

      {addingStudent ? <AddStudentModal onClose={() => setAddingStudent(false)} /> : null}
      {invoicingStudent ? (
        <RecordInvoiceModal
          student={invoicingStudent}
          onClose={() => setInvoicingStudent(null)}
          paymentInfo={paymentInfo}
        />
      ) : null}
      {viewingInvoicesFor ? (
        <InvoiceHistoryModal
          student={viewingInvoicesFor}
          onClose={() => setViewingInvoicesFor(null)}
        />
      ) : null}
      {welcomingStudent ? (
        <WelcomeStudentModal student={welcomingStudent} onClose={() => setWelcomingStudent(null)} />
      ) : null}
    </div>
  );
}

function PaymentClaimsCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['independent-payment-claims'],
    queryFn: () => independentStudentsApi.findPaymentClaims(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      claim,
      action,
      reason,
    }: {
      claim: IndependentPaymentClaim;
      action: 'approve' | 'reject';
      reason?: string;
    }) =>
      action === 'approve'
        ? independentStudentsApi.approvePaymentClaim(claim.id)
        : independentStudentsApi.rejectPaymentClaim(claim.id, reason),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['independent-payment-claims'] });
      queryClient.invalidateQueries({ queryKey: ['independent-students'] });
      queryClient.invalidateQueries({ queryKey: ['independent-students-summary'] });
      queryClient.invalidateQueries({ queryKey: ['independent-student-invoices'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not review payment')),
  });

  const pending = claims.filter((claim) => claim.status === 'AWAITING_VERIFICATION');

  return (
    <ActionCard title="Payment verification" meta={`${pending.length} pending`}>
      {isLoading ? (
        <EmptyState title="Loading payments..." />
      ) : pending.length === 0 ? (
        <EmptyState title="No payments awaiting verification." />
      ) : (
        <div className="space-y-3">
          {pending.map((claim) => (
            <div key={claim.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-[#101820]">{claim.student?.name ?? 'Independent student'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {claim.student?.grade ?? 'Grade not set'}
                    {claim.payerPhone ? ` / ${claim.payerPhone}` : ''}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatCurrency(claim.amountKES)} / {claim.interval === 'ANNUAL' ? 'Annual' : 'Monthly'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    M-Pesa {claim.mpesaCode} / {formatDate(claim.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ claim, action: 'approve' })}
                    className="rounded-xl bg-[#B5E61D] px-4 py-2 text-xs font-semibold text-[#101820] disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      const response = window.prompt('Reason for rejection (optional)');
                      if (response === null) return;
                      reviewMutation.mutate({ claim, action: 'reject', reason: response || undefined });
                    }}
                    className="rounded-xl border border-red-100 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </ActionCard>
  );
}

function PaymentHistory({
  invoices,
  isLoading,
}: {
  invoices: Awaited<ReturnType<typeof independentStudentsApi.findInvoices>>;
  isLoading: boolean;
}) {
  return (
    <ActionCard title="Payment history" meta={`${invoices.length} records`}>
      {isLoading ? (
        <EmptyState title="Loading payment history..." />
      ) : invoices.length === 0 ? (
        <EmptyState title="No independent student payments recorded." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">M-Pesa reference</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-semibold text-[#101820]">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{invoice.studentName}</td>
                  <td className="px-4 py-3 text-slate-600">{invoice.payerPhone ?? 'Not provided'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{invoice.mpesaCode}</td>
                  <td className="px-4 py-3 font-semibold text-[#101820]">{formatCurrency(invoice.amountKES)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(invoice.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <DeletePaymentButton invoice={invoice} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ActionCard>
  );
}

function AddStudentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [grade, setGrade] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      independentStudentsApi.createStudent({
        name: name.trim(),
        admissionNumber: admissionNumber.trim() || undefined,
        grade: grade.trim() || undefined,
        parentPhone: parentPhone.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-students'] });
      queryClient.invalidateQueries({ queryKey: ['independent-students-summary'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not add student')),
  });

  return (
    <Modal title="Add independent student" onClose={onClose}>
      <div className="space-y-3">
        <Input value={name} onChange={setName} placeholder="Student name" />
        <Input
          value={admissionNumber}
          onChange={setAdmissionNumber}
          placeholder="Login ID (optional - generated if blank)"
        />
        <Input value={grade} onChange={setGrade} placeholder="Grade, e.g. Grade 9" />
        <Input value={parentPhone} onChange={setParentPhone} placeholder="Parent or guardian phone" />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Record the first payment to activate access, then use Send welcome to issue login credentials.
      </p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <ModalActions
        primaryLabel={createMutation.isPending ? 'Adding...' : 'Add student'}
        primaryDisabled={createMutation.isPending || !name.trim()}
        onPrimary={() => createMutation.mutate()}
        onClose={onClose}
      />
    </Modal>
  );
}

function RecordInvoiceModal({
  student,
  onClose,
  paymentInfo,
}: {
  student: IndependentStudent;
  onClose: () => void;
  paymentInfo: IndependentStudentPaymentInfo | undefined;
}) {
  const queryClient = useQueryClient();
  const [amountKES, setAmountKES] = useState(
    paymentInfo?.monthlyAmountKES ? String(paymentInfo.monthlyAmountKES) : '',
  );
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [mpesaCode, setMpesaCode] = useState('');
  const [payerPhone, setPayerPhone] = useState(student.parentPhone ?? '');
  const [error, setError] = useState<string | null>(null);

  const recordMutation = useMutation({
    mutationFn: () =>
      independentStudentsApi.recordInvoice({
        studentId: student.id,
        amountKES: Number(amountKES),
        interval,
        mpesaCode: mpesaCode.trim(),
        payerPhone: payerPhone.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-students'] });
      queryClient.invalidateQueries({ queryKey: ['independent-students-summary'] });
      queryClient.invalidateQueries({ queryKey: ['independent-student-invoices'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not record payment')),
  });

  return (
    <Modal title={`Record payment - ${student.name}`} onClose={onClose}>
      <div className="space-y-3">
        <Input
          value={amountKES}
          onChange={(value) => setAmountKES(value.replace(/[^0-9]/g, ''))}
          placeholder="Amount paid (KES)"
          inputMode="numeric"
        />
        <select
          value={interval}
          onChange={(event) => {
            const nextInterval = event.target.value as 'monthly' | 'annual';
            setInterval(nextInterval);
            const configuredAmount =
              nextInterval === 'annual'
                ? paymentInfo?.annualAmountKES
                : paymentInfo?.monthlyAmountKES;
            if (configuredAmount) setAmountKES(String(configuredAmount));
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8CB500]"
        >
          <option value="monthly">Monthly plan</option>
          <option value="annual">Annual plan</option>
        </select>
        <Input value={mpesaCode} onChange={setMpesaCode} placeholder="M-Pesa confirmation code" />
        <Input value={payerPhone} onChange={setPayerPhone} placeholder="Payer phone number" />
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <ModalActions
        primaryLabel={recordMutation.isPending ? 'Recording...' : 'Record payment and activate'}
        primaryDisabled={recordMutation.isPending || Number(amountKES) <= 0 || !mpesaCode.trim()}
        onPrimary={() => recordMutation.mutate()}
        onClose={onClose}
      />
    </Modal>
  );
}

function InvoiceHistoryModal({
  student,
  onClose,
}: {
  student: IndependentStudent;
  onClose: () => void;
}) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['independent-student-invoices', student.id],
    queryFn: () => independentStudentsApi.findInvoices(student.id),
  });

  return (
    <Modal title={`Payment history - ${student.name}`} onClose={onClose} wide>
      {isLoading ? (
        <EmptyState title="Loading payment history..." />
      ) : invoices.length === 0 ? (
        <EmptyState title="No payments recorded yet." />
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[#101820]">{invoice.invoiceNumber}</p>
                <p className="text-xs text-slate-400">{formatDate(invoice.createdAt)}</p>
              </div>
              <p className="mt-2 font-medium text-slate-700">
                {formatCurrency(invoice.amountKES)} / {invoice.interval === 'ANNUAL' ? 'Annual' : 'Monthly'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                M-Pesa {invoice.mpesaCode}
                {invoice.payerPhone ? ` / ${invoice.payerPhone}` : ''}
              </p>
              <div className="mt-3">
                <DeletePaymentButton invoice={invoice} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function DeletePaymentButton({
  invoice,
}: {
  invoice: Awaited<ReturnType<typeof independentStudentsApi.findInvoices>>[number];
}) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => independentStudentsApi.deleteInvoice(invoice.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-student-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['independent-students'] });
      queryClient.invalidateQueries({ queryKey: ['independent-students-summary'] });
    },
    onError: (error) => {
      window.alert(apiErrorMessage(error, 'Could not delete this payment'));
    },
  });

  function confirmDelete() {
    const confirmed = window.confirm(
      `Delete payment ${invoice.invoiceNumber} for ${invoice.studentName}? The student's access period will be recalculated.`,
    );
    if (confirmed) deleteMutation.mutate();
  }

  return (
    <button
      type="button"
      onClick={confirmDelete}
      disabled={deleteMutation.isPending}
      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}

function WelcomeStudentModal({
  student,
  onClose,
}: {
  student: IndependentStudent;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(student.parentPhone ?? '');
  const [message, setMessage] = useState(
    `Welcome to Assignment Hub, ${student.name}. Your learning account is ready.`,
  );
  const [result, setResult] = useState<IndependentWelcomeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: () =>
      independentStudentsApi.sendWelcome(student.id, {
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      }),
    onSuccess: (welcomeResult) => {
      setResult(welcomeResult);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['independent-students'] });
      queryClient.invalidateQueries({ queryKey: ['independent-students-summary'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not send welcome message')),
  });

  if (result) {
    const deliverySucceeded = result.delivery.sent > 0;
    const credentialText = [
      message.trim(),
      `Login ID: ${result.loginId}`,
      `Temporary password: ${result.temporaryPassword}`,
      'Sign in: https://assignmenthub.co.ke/login',
    ].join('\n');

    return (
      <Modal title="Welcome credentials created" onClose={onClose}>
        <div
          className={`rounded-2xl border p-4 text-sm ${
            deliverySucceeded
              ? 'border-[#DDECB0] bg-[#FAFDEB] text-[#405500]'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {deliverySucceeded
            ? `SMS sent to ${result.phone}.`
            : 'SMS was not delivered. Share the credentials below securely.'}
        </div>
        <div className="mt-4 space-y-3 rounded-2xl bg-[#101820] p-5 text-white">
          <CredentialRow label="Student" value={result.name} />
          <CredentialRow label="Login ID" value={result.loginId} />
          <CredentialRow label="Temporary password" value={result.temporaryPassword} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          The temporary password is shown only now. It is redacted from system SMS logs.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(credentialText)}
            className="rounded-xl bg-[#B5E61D] px-5 py-3 text-sm font-semibold text-[#101820]"
          >
            Copy welcome message
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-[#101820]"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Send welcome - ${student.name}`} onClose={onClose}>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        This action resets the student's password and sends a new temporary password. Use it only when
        issuing credentials or helping a student regain access.
      </div>
      <div className="mt-4 space-y-3">
        <Input value={phone} onChange={setPhone} placeholder="Parent or guardian phone" />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Welcome message
          </span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={240}
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#8CB500]"
          />
          <span className="mt-1 block text-right text-xs text-slate-400">{message.length}/240</span>
        </label>
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        Login ID: <span className="font-semibold text-[#101820]">{student.admissionNumber}</span>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <ModalActions
        primaryLabel={sendMutation.isPending ? 'Sending...' : 'Reset password and send'}
        primaryDisabled={sendMutation.isPending || !phone.trim() || !message.trim()}
        onPrimary={() => sendMutation.mutate()}
        onClose={onClose}
      />
    </Modal>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <span className="font-mono text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: 'text' | 'numeric';
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#8CB500]"
    />
  );
}

function Modal({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101820]/55 p-4" onClick={onClose}>
      <section
        className={`max-h-[90vh] w-full overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl ${
          wide ? 'max-w-xl' : 'max-w-md'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-[#101820]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-[#101820]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ModalActions({
  primaryLabel,
  primaryDisabled,
  onPrimary,
  onClose,
}: {
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        className="rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
      >
        {primaryLabel}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-[#101820] hover:bg-slate-50"
      >
        Cancel
      </button>
    </div>
  );
}
