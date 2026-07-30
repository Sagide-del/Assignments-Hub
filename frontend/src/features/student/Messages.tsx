import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../api/axios';
import { messagesApi } from '../../api/messages.api';
import { ActionCard, EmptyState, PageHeader } from '../../components/ui/Saas';
import { useAuthStore } from '../../store/auth.store';
import type { MessageContact } from '../../types';

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Shared by the student "News/Messages" tab (this file's default export) and
// the teacher "Messages" tab (features/teacher/Messages.tsx) — `viewerRole`
// only changes who the contact list shows (teachers for a student, students
// for a teacher) and a couple of labels. Any student can message any teacher
// at their school and vice versa (see backend/src/messages) — school admins
// get a separate read-only oversight view (features/school-admin/MessagesOversight.tsx).
export function MessagesInbox({
  viewerRole,
}: {
  viewerRole: 'STUDENT' | 'TEACHER' | 'PLATFORM_ADMIN';
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [activeContactId, setActiveContactId] = useState<number | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['message-contacts'],
    queryFn: () => messagesApi.findContacts(),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (activeContactId === null && contacts.length > 0) {
      setActiveContactId(contacts[0].id);
    }
  }, [contacts, activeContactId]);

  const activeContact = contacts.find((c) => c.id === activeContactId) ?? null;
  const counterpartLabel =
    viewerRole === 'PLATFORM_ADMIN'
      ? 'independent students'
      : viewerRole === 'STUDENT'
        ? 'teachers'
        : 'students';
  const totalUnread = contacts.reduce((sum, c) => sum + c.unreadCount, 0);
  const pageMeta =
    viewerRole === 'PLATFORM_ADMIN'
      ? 'Private tutor conversations'
      : viewerRole === 'STUDENT'
        ? 'Contact your teacher'
        : 'Student conversations';

  return (
    <div className="space-y-6">
      <PageHeader
        title="News/Messages"
        meta={pageMeta}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <ActionCard title="Conversations" meta={totalUnread > 0 ? `${totalUnread} unread` : undefined}>
          {isLoading ? (
            <EmptyState title="Loading..." />
          ) : contacts.length === 0 ? (
            <EmptyState title={`No ${counterpartLabel} available yet.`} />
          ) : (
            <div className="-mx-2 max-h-[520px] space-y-1 overflow-y-auto">
              {contacts.map((contact) => (
                <ContactRow key={contact.id} contact={contact} active={contact.id === activeContactId} onClick={() => setActiveContactId(contact.id)} />
              ))}
            </div>
          )}
        </ActionCard>

        <ActionCard
          title={activeContact ? activeContact.name : 'Select a conversation'}
          meta={activeContact?.relationshipLabel}
        >
          {activeContact ? (
            <ThreadView
              key={activeContact.id}
              contact={activeContact}
              currentUserId={user?.id ?? 0}
              onSent={() => queryClient.invalidateQueries({ queryKey: ['message-contacts'] })}
            />
          ) : (
            <EmptyState title="Pick someone from the left to start messaging." />
          )}
        </ActionCard>
      </div>
    </div>
  );
}

function ContactRow({ contact, active, onClick }: { contact: MessageContact; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl px-3 py-2.5 text-left transition ${active ? 'bg-[#101820] text-white' : 'hover:bg-slate-50'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`truncate text-sm font-semibold ${active ? 'text-white' : 'text-[#101820]'}`}>{contact.name}</p>
        {contact.unreadCount > 0 ? (
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
              active ? 'bg-[#B5E61D] text-[#101820]' : 'bg-[#101820] text-white'
            }`}
          >
            {contact.unreadCount}
          </span>
        ) : null}
      </div>
      <p className={`mt-0.5 truncate text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>
        {contact.relationshipLabel}
      </p>
      {contact.lastMessage ? (
        <p className={`mt-1 truncate text-xs ${active ? 'text-white/60' : 'text-slate-500'}`}>{contact.lastMessage.body}</p>
      ) : (
        <p className={`mt-1 truncate text-xs italic ${active ? 'text-white/50' : 'text-slate-400'}`}>No messages yet</p>
      )}
    </button>
  );
}

function ThreadView({ contact, currentUserId, onSent }: { contact: MessageContact; currentUserId: number; onSent: () => void }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['message-thread', contact.id],
    queryFn: () => messagesApi.findThread(contact.id),
    refetchInterval: 8000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: () => messagesApi.sendMessage({ recipientId: contact.id, body: body.trim() }),
    onSuccess: () => {
      setBody('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['message-thread', contact.id] });
      onSent();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not send message')),
  });

  return (
    <div className="flex flex-col">
      <div className="max-h-[420px] min-h-[240px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {isLoading ? (
          <EmptyState title="Loading..." />
        ) : messages.length === 0 ? (
          <EmptyState title={`Say hello to ${contact.name} to start the conversation.`} />
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-[#101820] text-white' : 'border border-slate-200 bg-white text-[#101820]'}`}>
                  <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-slate-400'}`}>{formatWhen(m.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && body.trim()) {
              e.preventDefault();
              sendMutation.mutate();
            }
          }}
          placeholder={`Message ${contact.name}...`}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#B5E61D]"
        />
        <button
          type="button"
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending || !body.trim()}
          className="rounded-xl bg-[#101820] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
        >
          {sendMutation.isPending ? 'Sending...' : 'Send'}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function MessagesPage() {
  return <MessagesInbox viewerRole="STUDENT" />;
}
