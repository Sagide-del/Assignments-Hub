import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../../api/assignments.api';
import { apiErrorMessage } from '../../api/axios';
import { smsApi } from '../../api/sms.api';
import { ActionCard, EmptyState, MetricCard, PageHeader } from '../../components/ui/Saas';

export function TeacherDashboard() {
  const queryClient = useQueryClient();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.findAll(),
  });
  const [jsonText, setJsonText] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [parentMessage, setParentMessage] = useState('');
  const [messageGrade, setMessageGrade] = useState('');

  const { data: smsLogs = [] } = useQuery({
    queryKey: ['teacher-parent-messages'],
    queryFn: smsApi.getLogs,
  });

  const validateMutation = useMutation({
    mutationFn: (json: unknown) => assignmentsApi.validateJson(json),
    onSuccess: (response) => setValidation(response),
    onError: (error) => setStatus(apiErrorMessage(error, 'Validation failed')),
  });

  const createMutation = useMutation({
    mutationFn: (json: unknown) => assignmentsApi.createFromJson(json),
    onSuccess: () => {
      setStatus('Assignment created.');
      setJsonText('');
      setValidation(null);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (error) => setStatus(apiErrorMessage(error, 'Could not create assignment')),
  });

  const notifyAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => smsApi.notifyAssignment(assignmentId),
    onSuccess: (response) => {
      setStatus(`Parent notification complete: ${response.sent} sent, ${response.failed} failed.`);
      queryClient.invalidateQueries({ queryKey: ['teacher-parent-messages'] });
    },
    onError: (error) => setStatus(apiErrorMessage(error, 'Could not notify parents')),
  });

  const broadcastMutation = useMutation({
    mutationFn: () => smsApi.broadcast({ message: parentMessage.trim(), grade: messageGrade.trim() || undefined }),
    onSuccess: (response) => {
      setStatus(`Parent message complete: ${response.sent} sent, ${response.failed} failed.`);
      setParentMessage('');
      queryClient.invalidateQueries({ queryKey: ['teacher-parent-messages'] });
    },
    onError: (error) => setStatus(apiErrorMessage(error, 'Could not send the parent message')),
  });

  function parsedOrNull(): unknown | null {
    try {
      return JSON.parse(jsonText);
    } catch {
      setStatus('That is not valid JSON.');
      return null;
    }
  }

  const publishedCount = (assignments ?? []).filter((assignment) => assignment.isPublished).length;
  const draftCount = (assignments ?? []).length - publishedCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teaching workspace"
        actions={
          <>
            <Link to="/teacher/assignments/new" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-[#101820]">New assignment</Link>
            <Link to="/teacher/assignments/generate" className="rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white">AI generator</Link>
            <Link to="/teacher/marking" className="rounded-xl bg-[#B5E61D] px-4 py-2 text-sm font-semibold text-[#101820]">Marking</Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Assignments" value={isLoading ? '-' : assignments?.length ?? 0} />
        <MetricCard label="Published" value={isLoading ? '-' : publishedCount} />
        <MetricCard label="Drafts" value={isLoading ? '-' : draftCount} />
      </section>

      <ActionCard title="JSON import" meta="Validate and publish an assignment payload">
        <textarea
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          rows={7}
          placeholder="Paste assignment JSON"
          className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs focus:border-[#101820] focus:outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              const parsed = parsedOrNull();
              if (parsed) validateMutation.mutate(parsed);
            }}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-[#101820]"
          >
            Validate
          </button>
          <button
            type="button"
            onClick={() => {
              const parsed = parsedOrNull();
              if (parsed) createMutation.mutate(parsed);
            }}
            disabled={createMutation.isPending}
            className="rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createMutation.isPending ? 'Publishing...' : 'Publish'}
          </button>
        </div>
        {validation ? (
          <div className={`mt-3 text-sm ${validation.valid ? 'text-emerald-700' : 'text-red-700'}`}>
            {validation.valid ? 'Valid. Ready to publish.' : (
              <ul className="list-disc pl-5">
                {validation.errors.map((validationError, index) => <li key={index}>{validationError}</li>)}
              </ul>
            )}
          </div>
        ) : null}
        {status ? <p className="mt-3 text-sm text-slate-600">{status}</p> : null}
      </ActionCard>

      <ActionCard title="Parent communication" meta="Assignment alerts and grade messages">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <input
            value={messageGrade}
            onChange={(event) => setMessageGrade(event.target.value)}
            placeholder="Grade (optional)"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={parentMessage}
            onChange={(event) => setParentMessage(event.target.value)}
            maxLength={480}
            placeholder="Message to parents"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!parentMessage.trim() || broadcastMutation.isPending}
            onClick={() => broadcastMutation.mutate()}
            className="rounded-xl bg-[#101820] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {broadcastMutation.isPending ? 'Sending...' : 'Send message'}
          </button>
        </div>
        {smsLogs.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {smsLogs.slice(0, 4).map((log) => (
              <span key={log.id} className={`rounded-full px-3 py-1 text-xs font-medium ${log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {log.type.replace(/_/g, ' ')} · {log.status}
              </span>
            ))}
          </div>
        ) : null}
      </ActionCard>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(16,24,32,0.05)]">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-[#101820]">Assignments</h2></div>
        {isLoading ? (
          <div className="p-5"><EmptyState title="Loading assignments..." /></div>
        ) : (assignments ?? []).length === 0 ? (
          <div className="p-5"><EmptyState title="No assignments created yet." /></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(assignments ?? []).map((assignment) => (
              <li key={assignment.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <div>
                  <p className="font-semibold text-[#101820]">{assignment.title}</p>
                  <p className="mt-1 text-slate-500">{assignment.subject} · Grade {assignment.grade}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${assignment.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {assignment.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <button
                    type="button"
                    disabled={!assignment.isPublished || notifyAssignmentMutation.isPending}
                    onClick={() => notifyAssignmentMutation.mutate(assignment.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-[#101820] disabled:opacity-40"
                  >
                    Notify parents
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
