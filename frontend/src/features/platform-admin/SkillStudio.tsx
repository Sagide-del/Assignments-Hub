import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axios';
import { paymentApi } from '../../api/subscriptions.api';
import { skillsApi, type SkillCourseInput } from '../../api/skills.api';
import { uploadsApi } from '../../api/uploads.api';
import { EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';
import type { PaymentMethod, PaymentStatus, SkillContentStatus, SkillCourse, SkillLevel } from '../../types';

type StudioTab = 'courses' | 'categories' | 'providers' | 'enrollments' | 'payments';

type CourseDraft = {
  categoryId: number | '';
  providerId: number | '';
  title: string;
  shortDescription: string;
  fullDescription: string;
  durationWeeks: string;
  level: SkillLevel;
  costKES: string;
  certificateAvailable: boolean;
  thumbnailUrl: string;
  learningOutcomes: string;
  courseStructure: string;
  status: SkillContentStatus;
};

const emptyCourse: CourseDraft = {
  categoryId: '',
  providerId: '',
  title: '',
  shortDescription: '',
  fullDescription: '',
  durationWeeks: '',
  level: 'BEGINNER',
  costKES: '',
  certificateAvailable: false,
  thumbnailUrl: '',
  learningOutcomes: '',
  courseStructure: '',
  status: 'DRAFT',
};

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-[#101820] focus:border-[#101820] focus:outline-none';

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCurrency(value: number) {
  return `KES ${value.toLocaleString()}`;
}

export function SkillStudio() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<StudioTab>('courses');
  const [notice, setNotice] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [course, setCourse] = useState<CourseDraft>(emptyCourse);
  const [category, setCategory] = useState({ name: '', description: '', icon: '', imageUrl: '', displayOrder: '0', status: 'DRAFT' as SkillContentStatus });
  const [provider, setProvider] = useState({ name: '', description: '', logoUrl: '', website: '', contactEmail: '', verified: false, status: 'DRAFT' as SkillContentStatus });
  const [paymentDraft, setPaymentDraft] = useState({ enrollmentId: '', paymentMethod: '' as PaymentMethod | '', transactionReference: '', status: 'AWAITING_VERIFICATION' as PaymentStatus });

  const summaryQuery = useQuery({ queryKey: ['skill-studio', 'summary'], queryFn: skillsApi.getAdminSummary });
  const categoriesQuery = useQuery({ queryKey: ['skill-studio', 'categories'], queryFn: skillsApi.getCategories });
  const providersQuery = useQuery({ queryKey: ['skill-studio', 'providers'], queryFn: skillsApi.getProviders });
  const coursesQuery = useQuery({ queryKey: ['skill-studio', 'courses'], queryFn: () => skillsApi.getCourses() });
  const enrollmentsQuery = useQuery({ queryKey: ['skill-studio', 'enrollments'], queryFn: skillsApi.getEnrollments });
  const paymentsQuery = useQuery({ queryKey: ['skill-studio', 'payments'], queryFn: skillsApi.getPayments });
  const paymentProvidersQuery = useQuery({ queryKey: ['billing-providers'], queryFn: paymentApi.getProviders });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['skill-studio'] });
  const mutationError = (error: unknown) => setNotice(apiErrorMessage(error, 'The operation could not be completed'));

  const categoryMutation = useMutation({
    mutationFn: () => skillsApi.createCategory({ ...category, displayOrder: Number(category.displayOrder) || 0 }),
    onSuccess: async () => {
      setCategory({ name: '', description: '', icon: '', imageUrl: '', displayOrder: '0', status: 'DRAFT' });
      setNotice('Category created.');
      await refresh();
    },
    onError: mutationError,
  });

  const providerMutation = useMutation({
    mutationFn: () => skillsApi.createProvider(provider),
    onSuccess: async () => {
      setProvider({ name: '', description: '', logoUrl: '', website: '', contactEmail: '', verified: false, status: 'DRAFT' });
      setNotice('Provider created.');
      await refresh();
    },
    onError: mutationError,
  });

  const courseMutation = useMutation({
    mutationFn: () => {
      const payload: SkillCourseInput = {
        categoryId: Number(course.categoryId),
        providerId: Number(course.providerId),
        title: course.title,
        shortDescription: course.shortDescription,
        fullDescription: course.fullDescription,
        durationWeeks: Number(course.durationWeeks),
        level: course.level,
        costKES: Number(course.costKES),
        certificateAvailable: course.certificateAvailable,
        thumbnailUrl: course.thumbnailUrl || undefined,
        learningOutcomes: lines(course.learningOutcomes),
        courseStructure: lines(course.courseStructure),
        status: course.status,
      };
      return editingCourseId ? skillsApi.updateCourse(editingCourseId, payload) : skillsApi.createCourse(payload);
    },
    onSuccess: async () => {
      setCourse(emptyCourse);
      setEditingCourseId(null);
      setNotice('Course saved.');
      await refresh();
    },
    onError: mutationError,
  });

  const courseStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: SkillContentStatus }) => skillsApi.updateCourse(id, { status }),
    onSuccess: refresh,
    onError: mutationError,
  });

  const categoryStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: SkillContentStatus }) => skillsApi.updateCategory(id, { status }),
    onSuccess: refresh,
    onError: mutationError,
  });

  const providerStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: SkillContentStatus }) => skillsApi.updateProvider(id, { status }),
    onSuccess: refresh,
    onError: mutationError,
  });

  const enrollmentMutation = useMutation({
    mutationFn: ({ id, status, paymentStatus }: { id: number; status: Parameters<typeof skillsApi.updateEnrollment>[1]['status']; paymentStatus?: PaymentStatus }) =>
      skillsApi.updateEnrollment(id, { status, paymentStatus }),
    onSuccess: refresh,
    onError: mutationError,
  });

  const paymentMutation = useMutation({
    mutationFn: () => {
      const enrollment = (enrollmentsQuery.data ?? []).find((item) => item.id === Number(paymentDraft.enrollmentId));
      if (!enrollment || !paymentDraft.paymentMethod) throw new Error('Select an enrollment and payment method');
      return skillsApi.createPayment({
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        paymentMethod: paymentDraft.paymentMethod,
        transactionReference: paymentDraft.transactionReference || undefined,
        status: paymentDraft.status,
      });
    },
    onSuccess: async () => {
      setPaymentDraft({ enrollmentId: '', paymentMethod: '', transactionReference: '', status: 'AWAITING_VERIFICATION' });
      setNotice('Payment record created.');
      await refresh();
    },
    onError: mutationError,
  });

  const paymentStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: PaymentStatus }) => skillsApi.updatePayment(id, { status }),
    onSuccess: async () => {
      setNotice('Payment status updated.');
      await refresh();
    },
    onError: mutationError,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadsApi.uploadSingle,
    onSuccess: (result) => setCourse((current) => ({ ...current, thumbnailUrl: result.url })),
    onError: mutationError,
  });

  function editCourse(item: SkillCourse) {
    setEditingCourseId(item.id);
    setCourse({
      categoryId: item.categoryId,
      providerId: item.providerId,
      title: item.title,
      shortDescription: item.shortDescription,
      fullDescription: item.fullDescription,
      durationWeeks: String(item.durationWeeks),
      level: item.level,
      costKES: String(item.costKES),
      certificateAvailable: item.certificateAvailable,
      thumbnailUrl: item.thumbnailUrl ?? '',
      learningOutcomes: (item.learningOutcomes ?? []).join('\n'),
      courseStructure: (item.courseStructure ?? []).join('\n'),
      status: item.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const summary = summaryQuery.data;
  const categories = categoriesQuery.data ?? [];
  const providers = providersQuery.data ?? [];
  const courses = coursesQuery.data ?? [];
  const enrollments = enrollmentsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Learn Skill Studio" meta="Platform-owned skills catalogue" />

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Courses" value={summary?.totalCourses ?? '-'} compact />
        <MetricCard label="Draft" value={summary?.draftCourses ?? '-'} compact />
        <MetricCard label="Published" value={summary?.publishedCourses ?? '-'} compact />
        <MetricCard label="Categories" value={summary?.categories ?? '-'} compact />
        <MetricCard label="Providers" value={summary?.providers ?? '-'} compact />
        <MetricCard label="Requests" value={summary?.pendingEnrollments ?? '-'} compact />
      </section>

      {notice ? <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{notice}</div> : null}

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
        {(['courses', 'categories', 'providers', 'enrollments', 'payments'] as StudioTab[]).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${tab === item ? 'bg-[#101820] text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {label(item)}
          </button>
        ))}
      </nav>

      {tab === 'courses' ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#101820]">{editingCourseId ? 'Edit course' : 'Create course'}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input value={course.title} onChange={(event) => setCourse({ ...course, title: event.target.value })} placeholder="Course title" className={`${inputClass} sm:col-span-2`} />
              <select value={course.categoryId} onChange={(event) => setCourse({ ...course, categoryId: Number(event.target.value) || '' })} className={inputClass}>
                <option value="">Category</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select value={course.providerId} onChange={(event) => setCourse({ ...course, providerId: Number(event.target.value) || '' })} className={inputClass}>
                <option value="">Provider</option>
                {providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input value={course.shortDescription} onChange={(event) => setCourse({ ...course, shortDescription: event.target.value })} placeholder="Short description" maxLength={280} className={`${inputClass} sm:col-span-2`} />
              <textarea value={course.fullDescription} onChange={(event) => setCourse({ ...course, fullDescription: event.target.value })} placeholder="Full description" rows={3} className={`${inputClass} sm:col-span-2`} />
              <input value={course.durationWeeks} onChange={(event) => setCourse({ ...course, durationWeeks: event.target.value })} type="number" min="1" placeholder="Duration in weeks" className={inputClass} />
              <input value={course.costKES} onChange={(event) => setCourse({ ...course, costKES: event.target.value })} type="number" min="0" placeholder="Cost in KES" className={inputClass} />
              <select value={course.level} onChange={(event) => setCourse({ ...course, level: event.target.value as SkillLevel })} className={inputClass}>
                <option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option>
              </select>
              <select value={course.status} onChange={(event) => setCourse({ ...course, status: event.target.value as SkillContentStatus })} className={inputClass}>
                <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option>
              </select>
              <textarea value={course.learningOutcomes} onChange={(event) => setCourse({ ...course, learningOutcomes: event.target.value })} placeholder="Learning outcomes, one per line" rows={4} className={inputClass} />
              <textarea value={course.courseStructure} onChange={(event) => setCourse({ ...course, courseStructure: event.target.value })} placeholder="Course structure, one item per line" rows={4} className={inputClass} />
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {uploadMutation.isPending ? 'Uploading...' : course.thumbnailUrl ? 'Replace thumbnail' : 'Upload thumbnail'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadMutation.mutate(file); }} />
                </label>
                {course.thumbnailUrl ? <p className="mt-2 truncate text-xs text-slate-500">{course.thumbnailUrl}</p> : null}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                <input type="checkbox" checked={course.certificateAvailable} onChange={(event) => setCourse({ ...course, certificateAvailable: event.target.checked })} /> Certificate available
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={!course.title || !course.categoryId || !course.providerId || courseMutation.isPending} onClick={() => courseMutation.mutate()} className="rounded-xl bg-[#101820] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{courseMutation.isPending ? 'Saving...' : 'Save course'}</button>
              {editingCourseId ? <button type="button" onClick={() => { setEditingCourseId(null); setCourse(emptyCourse); }} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold">Cancel</button> : null}
            </div>
          </section>

          <section className="space-y-3">
            {courses.length === 0 ? <EmptyState title="No skill courses yet." /> : courses.map((item) => (
              <article key={item.id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#101820]">{item.title}</h3><Status status={item.status} /></div>
                    <p className="mt-1 text-sm text-slate-500">{item.category.name} · {item.provider.name}</p>
                    <p className="mt-2 text-sm font-semibold text-[#101820]">{formatCurrency(item.costKES)} · {item.durationWeeks} weeks</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => editCourse(item)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Edit</button>
                    <button type="button" onClick={() => courseStatusMutation.mutate({ id: item.id, status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })} className="rounded-lg bg-[#B5E61D] px-3 py-1.5 text-xs font-semibold text-[#101820]">{item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      ) : null}

      {tab === 'categories' ? (
        <SimpleManager title="Create category" onSave={() => categoryMutation.mutate()} pending={categoryMutation.isPending} disabled={!category.name} form={
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={category.name} onChange={(event) => setCategory({ ...category, name: event.target.value })} placeholder="Category name" className={inputClass} />
            <input value={category.icon} onChange={(event) => setCategory({ ...category, icon: event.target.value })} placeholder="Icon key" className={inputClass} />
            <input value={category.imageUrl} onChange={(event) => setCategory({ ...category, imageUrl: event.target.value })} placeholder="Image URL" className={inputClass} />
            <input value={category.displayOrder} onChange={(event) => setCategory({ ...category, displayOrder: event.target.value })} type="number" placeholder="Display order" className={inputClass} />
            <input value={category.description} onChange={(event) => setCategory({ ...category, description: event.target.value })} placeholder="Short description" className={`${inputClass} sm:col-span-2`} />
          </div>
        } items={categories.map((item) => ({ id: item.id, title: item.name, meta: `${item._count?.courses ?? 0} courses`, status: item.status, onToggle: () => categoryStatusMutation.mutate({ id: item.id, status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }) }))} />
      ) : null}

      {tab === 'providers' ? (
        <SimpleManager title="Create provider" onSave={() => providerMutation.mutate()} pending={providerMutation.isPending} disabled={!provider.name} form={
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={provider.name} onChange={(event) => setProvider({ ...provider, name: event.target.value })} placeholder="Provider name" className={inputClass} />
            <input value={provider.contactEmail} onChange={(event) => setProvider({ ...provider, contactEmail: event.target.value })} placeholder="Contact email" className={inputClass} />
            <input value={provider.website} onChange={(event) => setProvider({ ...provider, website: event.target.value })} placeholder="Website" className={inputClass} />
            <input value={provider.logoUrl} onChange={(event) => setProvider({ ...provider, logoUrl: event.target.value })} placeholder="Logo URL" className={inputClass} />
            <input value={provider.description} onChange={(event) => setProvider({ ...provider, description: event.target.value })} placeholder="Short description" className={`${inputClass} sm:col-span-2`} />
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={provider.verified} onChange={(event) => setProvider({ ...provider, verified: event.target.checked })} /> Verified provider</label>
          </div>
        } items={providers.map((item) => ({ id: item.id, title: item.name, meta: `${item._count?.courses ?? 0} courses${item.verified ? ' · Verified' : ''}`, status: item.status, onToggle: () => providerStatusMutation.mutate({ id: item.id, status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }) }))} />
      ) : null}

      {tab === 'enrollments' ? (
        <DataTable headings={['Student', 'School', 'Course', 'Requested', 'Status', 'Actions']} empty="No enrollment requests.">
          {enrollments.map((item) => (
            <tr key={item.id} className="border-t border-slate-100 text-sm">
              <Cell strong>{item.student?.name ?? `Student ${item.studentId}`}</Cell><Cell>{item.student?.school?.name ?? '-'}</Cell><Cell>{item.course?.title ?? `Course ${item.courseId}`}</Cell><Cell>{new Date(item.requestedAt).toLocaleDateString()}</Cell><Cell><Status status={item.status} /></Cell>
              <Cell><div className="flex gap-1"><TinyButton onClick={() => enrollmentMutation.mutate({ id: item.id, status: 'AWAITING_PAYMENT' })}>Approve</TinyButton><TinyButton onClick={() => enrollmentMutation.mutate({ id: item.id, status: 'REJECTED' })}>Reject</TinyButton><TinyButton onClick={() => enrollmentMutation.mutate({ id: item.id, status: 'COMPLETED' })}>Complete</TinyButton></div></Cell>
            </tr>
          ))}
        </DataTable>
      ) : null}

      {tab === 'payments' ? (
        <div className="space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-[#101820]">Record parent payment</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <select value={paymentDraft.enrollmentId} onChange={(event) => setPaymentDraft({ ...paymentDraft, enrollmentId: event.target.value })} className={inputClass}><option value="">Enrollment</option>{enrollments.map((item) => <option key={item.id} value={item.id}>{item.student?.name} · {item.course?.title}</option>)}</select>
              <select value={paymentDraft.paymentMethod} onChange={(event) => setPaymentDraft({ ...paymentDraft, paymentMethod: event.target.value as PaymentMethod })} className={inputClass}><option value="">Payment method</option>{(paymentProvidersQuery.data ?? []).map((item) => <option key={item.method} value={item.method}>{item.displayName}{item.isActive ? '' : ' (Disabled)'}</option>)}</select>
              <input value={paymentDraft.transactionReference} onChange={(event) => setPaymentDraft({ ...paymentDraft, transactionReference: event.target.value })} placeholder="Transaction reference" className={inputClass} />
              <button type="button" disabled={!paymentDraft.enrollmentId || !paymentDraft.paymentMethod || paymentMutation.isPending} onClick={() => paymentMutation.mutate()} className="rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Record payment</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">{(paymentProvidersQuery.data ?? []).map((item) => <div key={item.method} className="flex items-center gap-2 text-xs text-slate-500">{item.logoUrl ? <img src={item.logoUrl} alt={item.displayName} className="h-7 w-12 rounded object-cover" /> : null}{item.displayName}</div>)}</div>
          </section>
          <DataTable headings={['Student', 'School', 'Course', 'Method', 'Amount', 'Reference', 'Status', 'Actions']} empty="No skill payments recorded.">
            {payments.map((item) => <tr key={item.id} className="border-t border-slate-100 text-sm"><Cell strong>{item.student?.name ?? item.studentId}</Cell><Cell>{item.student?.school?.name ?? '-'}</Cell><Cell>{item.course?.title ?? item.courseId}</Cell><Cell>{label(item.paymentMethod)}</Cell><Cell>{formatCurrency(item.amountKES)}</Cell><Cell>{item.transactionReference ?? '-'}</Cell><Cell><Status status={item.status} /></Cell><Cell><div className="flex gap-1"><TinyButton onClick={() => paymentStatusMutation.mutate({ id: item.id, status: 'CONFIRMED' })}>Confirm</TinyButton><TinyButton onClick={() => paymentStatusMutation.mutate({ id: item.id, status: 'REJECTED' })}>Reject</TinyButton></div></Cell></tr>)}
          </DataTable>
        </div>
      ) : null}
    </div>
  );
}

function Status({ status }: { status: string }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{label(status)}</span>;
}

function SimpleManager({ title, form, onSave, pending, disabled, items }: { title: string; form: React.ReactNode; onSave: () => void; pending: boolean; disabled: boolean; items: Array<{ id: number; title: string; meta: string; status: SkillContentStatus; onToggle: () => void }> }) {
  return <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]"><section className="rounded-[24px] border border-slate-200 bg-white p-5"><h2 className="font-semibold text-[#101820]">{title}</h2><div className="mt-4">{form}</div><button type="button" disabled={disabled || pending} onClick={onSave} className="mt-4 rounded-xl bg-[#101820] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Saving...' : 'Save'}</button></section><section className="space-y-3">{items.length === 0 ? <EmptyState title="No records yet." /> : items.map((item) => <article key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div><p className="font-semibold text-[#101820]">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.meta}</p></div><div className="flex items-center gap-2"><Status status={item.status} /><TinyButton onClick={item.onToggle}>{item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</TinyButton></div></article>)}</section></div>;
}

function DataTable({ headings, empty, children }: { headings: string[]; empty: string; children: React.ReactNode }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white"><table className="min-w-full text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr>{headings.map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody>{hasRows ? children : <tr><td colSpan={headings.length} className="px-4 py-10 text-center text-sm text-slate-500">{empty}</td></tr>}</tbody></table></section>;
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`px-4 py-3 ${strong ? 'font-semibold text-[#101820]' : 'text-slate-600'}`}>{children}</td>;
}

function TinyButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-[#101820] hover:bg-slate-50">{children}</button>;
}
