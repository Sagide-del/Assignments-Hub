import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../../api/axios';
import { mentorshipApi } from '../../../api/mentorship.api';
import { ActionCard, EmptyState } from '../../../components/ui/Saas';
import type { MentorDirectoryEntry, MentorshipRequest } from '../../../types';
import { ArrowIcon, MentorIcon, statusBadgeClass } from './icons';

export function MentorshipTab() {
  const [requestingMentor, setRequestingMentor] = useState<MentorDirectoryEntry | null>(null);
  const queryClient = useQueryClient();

  const { data: mentors = [], isLoading: mentorsLoading } = useQuery({
    queryKey: ['mentorship-directory'],
    queryFn: () => mentorshipApi.findMentors(),
  });
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['my-pathway-mentorship-requests'],
    queryFn: () => mentorshipApi.findRequests(),
  });

  return (
    <div className="space-y-6">
      <p className="rounded-[24px] border border-slate-200 bg-[#FAFDEB] p-5 text-sm leading-6 text-slate-600">
        Teachers at your school can mentor you on a subject, a pathway, or just growing a talent. Send a request explaining what
        you'd like help with — once they accept, you can keep a running log of your conversations here.
      </p>

      <ActionCard title="Find a mentor" meta={mentorsLoading ? undefined : `${mentors.length} teachers available`} icon={<MentorIcon />}>
        {mentorsLoading ? (
          <EmptyState title="Loading mentors..." />
        ) : mentors.length === 0 ? (
          <EmptyState title="No teachers are listed as mentors at your school yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mentors.map((mentor) => (
              <div key={mentor.teacherId} className="rounded-[20px] border border-slate-200 bg-[#FCFDFE] p-4">
                <p className="text-sm font-semibold text-[#101820]">{mentor.name}</p>
                {mentor.subject ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{mentor.subject}</p> : null}
                {mentor.bio ? <p className="mt-2 text-sm leading-6 text-slate-500">{mentor.bio}</p> : null}
                {mentor.expertiseAreas.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {mentor.expertiseAreas.map((area) => (
                      <span key={area} className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-slate-500">
                        {area}
                      </span>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setRequestingMentor(mentor)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-white"
                >
                  Request mentorship
                  <ArrowIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </ActionCard>

      <ActionCard title="My mentorship log" meta={requestsLoading ? undefined : `${requests.length} requests`}>
        {requestsLoading ? (
          <EmptyState title="Loading..." />
        ) : requests.length === 0 ? (
          <EmptyState title="You haven't requested a mentor yet." />
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <MentorshipRequestCard key={request.id} request={request} viewer="STUDENT" />
            ))}
          </div>
        )}
      </ActionCard>

      {requestingMentor ? (
        <RequestMentorshipModal
          mentor={requestingMentor}
          onClose={() => setRequestingMentor(null)}
          onSuccess={() => {
            setRequestingMentor(null);
            queryClient.invalidateQueries({ queryKey: ['my-pathway-mentorship-requests'] });
          }}
        />
      ) : null}
    </div>
  );
}

function RequestMentorshipModal({ mentor, onClose, onSuccess }: { mentor: MentorDirectoryEntry; onClose: () => void; onSuccess: () => void }) {
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: () => mentorshipApi.createRequest({ teacherId: mentor.teacherId, topic, message: message || undefined }),
    onSuccess,
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not send request')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#101820]">Request mentorship from {mentor.name}</h3>
        <div className="mt-4 space-y-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What would you like help with? (required)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Anything else you'd like them to know? (optional)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
        </div>
        {status ? <p className="mt-3 text-sm text-slate-600">{status}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending || !topic.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#101820] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
          >
            {requestMutation.isPending ? 'Sending...' : 'Send request'}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-[#101820] hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Shared by the student-facing log (this file) and the teacher inbox
// (Teacher/MentorshipInbox.tsx) — `viewer` only changes whose name is shown
// as the counterpart and whether the status-change actions render.
export function MentorshipRequestCard({
  request,
  viewer,
  onStatusChange,
}: {
  request: MentorshipRequest;
  viewer: 'STUDENT' | 'TEACHER';
  onStatusChange?: (id: number, status: 'ACCEPTED' | 'DECLINED' | 'COMPLETED') => void;
}) {
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);

  const logMutation = useMutation({
    mutationFn: () => mentorshipApi.addLogEntry(request.id, note),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['my-pathway-mentorship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-mentorship-requests'] });
    },
    onError: (err) => setStatus(apiErrorMessage(err, 'Could not add note')),
  });

  const counterpart = viewer === 'STUDENT' ? request.mentorProfile?.teacher?.name ?? 'Mentor' : request.student?.name ?? 'Student';
  const canLog = request.status === 'ACCEPTED' || request.status === 'COMPLETED';

  return (
    <div className="rounded-[20px] border border-slate-200 bg-[#FCFDFE] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#101820]">{request.topic}</p>
          <p className="mt-1 text-xs text-slate-500">
            {viewer === 'STUDENT' ? 'with' : 'from'} {counterpart} · {new Date(request.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(request.status)}`}>{request.status}</span>
      </div>
      {request.message ? <p className="mt-2 text-sm leading-6 text-slate-600">{request.message}</p> : null}

      {viewer === 'TEACHER' && request.status === 'PENDING' && onStatusChange ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStatusChange(request.id, 'ACCEPTED')}
            className="rounded-xl bg-[#101820] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => onStatusChange(request.id, 'DECLINED')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-white"
          >
            Decline
          </button>
        </div>
      ) : null}

      {viewer === 'TEACHER' && request.status === 'ACCEPTED' && onStatusChange ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onStatusChange(request.id, 'COMPLETED')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-white"
          >
            Mark as completed
          </button>
        </div>
      ) : null}

      {(request.logEntries?.length ?? 0) > 0 ? (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          {request.logEntries?.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-white p-3 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                {entry.author?.name ?? 'Someone'} · {new Date(entry.createdAt).toLocaleDateString()}
              </p>
              <p className="mt-1">{entry.note}</p>
            </div>
          ))}
        </div>
      ) : null}

      {canLog ? (
        <div className="mt-3 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note to the log"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
          />
          <button
            type="button"
            onClick={() => logMutation.mutate()}
            disabled={logMutation.isPending || !note.trim()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#101820] hover:bg-white disabled:opacity-60"
          >
            Add
          </button>
        </div>
      ) : null}
      {status ? <p className="mt-2 text-xs text-slate-500">{status}</p> : null}
    </div>
  );
}
