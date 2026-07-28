import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axios';
import { independentStudentsApi } from '../../api/independent-students.api';
import { ActionCard, EmptyState, PageHeader } from '../../components/ui/Saas';
import type { IndependentPaymentClaim, IndependentStudent, IndependentStudentStatus } from '../../types';

function formatDate(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadgeClass(status: IndependentStudentStatus) {
  if (status === 'ACTIVE') return 'bg-[#EAF7C8] text-[#3F5B00]';
  if (status === 'EXPIRED') return 'bg-red-50 text-red-600';
  return 'bg-slate-100 text-slate-500';
}

function statusLabel(student: IndependentStudent) {
  if (student.status === 'ACTIVE') return `Active until ${formatDate(student.subscriptionExpiresAt)}`;
  if (student.status === 'EXPIRED') return `Expired ${formatDate(student.subscriptionExpiresAt)}`;
  return 'Never paid';
}

// Students enrolled directly by a platform admin rather than through a
// paying school — they pay for their own access individually via M-Pesa
// Till Number, recorded here as an invoice against their confirmation code.
// See backend/src/independent-students for the full design.
export function IndependentStudentsPage() {
  const [addingStudent, setAddingStudent] = useState(false);
  const [invoicingStudent, setInvoicingStudent] = useState<IndependentStudent | null>(null);
  const [viewingInvoicesFor, setViewingInvoicesFor] = useState<IndependentStudent | null>(null);

  const { data: paymentInfo } = useQuery({
    queryKey: ['independent-students-payment-info'],
    queryFn: () => independentStudentsApi.getPaymentInfo(),
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['independent-students'],
    queryFn: () => independentStudentsApi.findStudents(),
  });

  const activeCount = students.filter((s) => s.status === 'ACTIVE').length;
  const expiredCount = students.filter((s) => s.status === 'EXPIRED').length;
  const neverPaidCount = students.filter((s) => s.status === 'NEVER_PAID').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Independent Students"
        meta="Students enrolled without a school — they pay individually via M-Pesa to activate their account"
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

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Active</p>
          <p className="mt-2 text-2xl font-semibold text-[#101820]">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Expired</p>
          <p className="mt-2 text-2xl font-semibold text-[#101820]">{expiredCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Never paid</p>
          <p className="mt-2 text-2xl font-semibold text-[#101820]">{neverPaidCount}</p>
        </div>
      </section>

      {paymentInfo?.enabled ? (
        <div className="rounded-[24px] border border-slate-200 bg-[#FAFDEB] p-5 text-sm leading-6 text-slate-600">
          <p className="font-semibold text-[#101820]">M-Pesa Buy Goods (Till)</p>
          <p className="mt-1">
            Till Number <span className="font-semibold text-[#101820]">{paymentInfo.tillNumber}</span> · Store Number{' '}
            <span className="font-semibold text-[#101820]">{paymentInfo.storeNumber}</span>
          </p>
          <p className="mt-2">{paymentInfo.instructions}</p>
        </div>
      ) : paymentInfo ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Individual student Till details and prices are not fully configured.
        </div>
      ) : null}

      <PaymentClaimsCard />

      <ActionCard title="Students" meta={isLoading ? undefined : `${students.length}`}>
        {isLoading ? (
          <EmptyState title="Loading..." />
        ) : students.length === 0 ? (
          <EmptyState title="No independent students yet." action={
            <button type="button" onClick={() => setAddingStudent(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-white">
              Add the first one
            </button>
          } />
        ) : (
          <div className="space-y-2">
            {students.map((student) => (
              <div key={student.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#101820]">{student.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {student.admissionNumber ?? 'No admission number'} {student.grade ? `· ${student.grade}` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(student.status)}`}>{statusLabel(student)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoicingStudent(student)}
                    className="rounded-xl bg-[#101820] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
                  >
                    Record payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingInvoicesFor(student)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-[#101820] hover:bg-slate-50"
                  >
                    View invoices
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ActionCard>

      {addingStudent ? <AddStudentModal onClose={() => setAddingStudent(false)} /> : null}
      {invoicingStudent ? (
        <RecordInvoiceModal
          student={invoicingStudent}
          onClose={() => setInvoicingStudent(null)}
          paymentInfo={paymentInfo}
        />
      ) : null}
      {viewingInvoicesFor ? <InvoiceHistoryModal student={viewingInvoicesFor} onClose={() => setViewingInvoicesFor(null)} /> : null}
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
    mutationFn: ({ claim, action, reason }: {
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
      queryClient.invalidateQueries({ queryKey: ['independent-student-invoices'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not review payment')),
  });

  const pending = claims.filter((claim) => claim.status === 'AWAITING_VERIFICATION');

  return (
    <ActionCard title="Payment verification" meta={isLoading ? undefined : `${pending.length} pending`}>
      {isLoading ? (
        <EmptyState title="Loading..." />
      ) : pending.length === 0 ? (
        <EmptyState title="No payments awaiting verification." />
      ) : (
        <div className="space-y-3">
          {pending.map((claim) => (
            <div key={claim.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-[#101820]">{claim.student?.name ?? 'Individual student'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {claim.student?.email ?? 'No email'} · {claim.student?.grade ?? 'Grade not set'}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    KES {claim.amountKES.toLocaleString()} · {claim.interval === 'ANNUAL' ? 'Annual' : 'Monthly'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    M-Pesa code {claim.mpesaCode}
                    {claim.payerPhone ? ` · ${claim.payerPhone}` : ''}
                    {` · ${formatDate(claim.createdAt)}`}
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
                      const reason = response || undefined;
                      reviewMutation.mutate({ claim, action: 'reject', reason });
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
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not add student')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#101820]">Add an independent student</h3>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student name (required)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
          <input
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="Admission number (optional — auto-generated if left blank)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Grade (optional, e.g. Grade 9)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
          <input
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
            placeholder="Parent/guardian phone (optional)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          The account is created inactive until you record their first payment (see "Record payment" once added).
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Adding...' : 'Add student'}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-[#101820] hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordInvoiceModal({
  student,
  onClose,
  paymentInfo,
}: {
  student: IndependentStudent;
  onClose: () => void;
  paymentInfo: { tillNumber: string; storeNumber: string } | undefined;
}) {
  const queryClient = useQueryClient();
  const [studentName, setStudentName] = useState(student.name);
  const [amountKES, setAmountKES] = useState('');
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [mpesaCode, setMpesaCode] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recordMutation = useMutation({
    mutationFn: () =>
      independentStudentsApi.recordInvoice({
        studentId: student.id,
        studentName: studentName.trim() || undefined,
        amountKES: Number(amountKES),
        interval,
        mpesaCode: mpesaCode.trim(),
        payerPhone: payerPhone.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['independent-students'] });
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not record payment')),
  });

  const canSubmit = Number(amountKES) > 0 && mpesaCode.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#101820]">Record a payment for {student.name}</h3>
        {paymentInfo ? (
          <p className="mt-1 text-xs text-slate-500">
            Verify the M-Pesa confirmation code against Till {paymentInfo.tillNumber} / Store {paymentInfo.storeNumber} before recording it.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Student name on the invoice"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
          <input
            value={amountKES}
            onChange={(e) => setAmountKES(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Amount paid (KES)"
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as 'monthly' | 'annual')}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          >
            <option value="monthly">Monthly plan</option>
            <option value="annual">Annual plan</option>
          </select>
          <input
            value={mpesaCode}
            onChange={(e) => setMpesaCode(e.target.value)}
            placeholder="M-Pesa confirmation code (required)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
          <input
            value={payerPhone}
            onChange={(e) => setPayerPhone(e.target.value)}
            placeholder="Payer phone number (optional)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
        </div>
        {student.subscriptionExpiresAt ? (
          <p className="mt-3 text-xs text-slate-400">
            {student.status === 'ACTIVE'
              ? `Recording this extends their access from ${formatDate(student.subscriptionExpiresAt)}.`
              : `Their access expired on ${formatDate(student.subscriptionExpiresAt)} — recording this reactivates them.`}
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-400">This is their first payment — recording it activates their account.</p>
        )}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => recordMutation.mutate()}
            disabled={recordMutation.isPending || !canSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
          >
            {recordMutation.isPending ? 'Recording...' : 'Record payment & activate'}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-[#101820] hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceHistoryModal({ student, onClose }: { student: IndependentStudent; onClose: () => void }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['independent-student-invoices', student.id],
    queryFn: () => independentStudentsApi.findInvoices(student.id),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#101820]">Invoices for {student.name}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <EmptyState title="Loading..." />
          ) : invoices.length === 0 ? (
            <EmptyState title="No payments recorded yet." />
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#101820]">{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-400">{formatDate(inv.createdAt)}</p>
                </div>
                <p className="mt-1 text-slate-600">
                  KES {inv.amountKES.toLocaleString()} · {inv.interval === 'ANNUAL' ? 'Annual' : 'Monthly'} · {formatDate(inv.periodStart)} –{' '}
                  {formatDate(inv.periodEnd)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  M-Pesa code: {inv.mpesaCode} {inv.payerPhone ? `· Paid by ${inv.payerPhone}` : ''}
                </p>
                {inv.recordedBy ? <p className="mt-1 text-xs text-slate-400">Recorded by {inv.recordedBy.name}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
