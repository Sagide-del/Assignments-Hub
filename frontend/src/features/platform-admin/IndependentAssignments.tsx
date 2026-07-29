import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assignmentsApi } from '../../api/assignments.api';
import { apiErrorMessage } from '../../api/axios';
import { EmptyState, PageHeader } from '../../components/ui/Saas';

export function IndependentAssignmentsPage() {
  const queryClient = useQueryClient();
  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['independent-assignments'],
    queryFn: () => assignmentsApi.findIndependent(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => assignmentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['independent-assignments'] }),
  });

  const published = assignments.filter((assignment) => assignment.isPublished).length;
  const drafts = assignments.length - published;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Independent Assignments"
        actions={
          <Link
            to="/platform/independent-assignments/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            <PlusIcon />
            New assignment
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total assignments" value={assignments.length} />
        <Metric label="Published" value={published} />
        <Metric label="Drafts" value={drafts} />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-[#101820]">Assignment library</h2>
        </div>

        {isLoading ? (
          <div className="p-6"><EmptyState title="Loading assignments..." /></div>
        ) : error ? (
          <div className="p-6">
            <EmptyState title={apiErrorMessage(error, 'Could not load assignments')} />
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No independent assignments yet"
              action={
                <Link
                  to="/platform/independent-assignments/new"
                  className="rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white"
                >
                  Create assignment
                </Link>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map((assignment) => (
              <article
                key={assignment.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-[#101820]">{assignment.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        assignment.isPublished
                          ? 'bg-[#EAF7C8] text-[#3F5B00]'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {assignment.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {assignment.subject} · {assignment.grade} · {assignment._count?.questions ?? 0} questions
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Link
                    to={`/platform/independent-assignments/${assignment.id}/edit`}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-[#101820] hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={
                      Boolean(assignment._count?.submissions) ||
                      removeMutation.isPending
                    }
                    title={
                      assignment._count?.submissions
                        ? 'Assignments with student submissions cannot be deleted'
                        : 'Delete assignment'
                    }
                    onClick={() => {
                      if (window.confirm(`Delete "${assignment.title}"?`)) {
                        removeMutation.mutate(assignment.id);
                      }
                    }}
                    className="rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#101820]">{value}</p>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
