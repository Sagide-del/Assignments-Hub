import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { messagesApi } from '../../api/messages.api';
import { ActionCard, EmptyState, PageHeader } from '../../components/ui/Saas';
import type { MessageConversationSummary } from '../../types';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Read-only oversight of every student<->teacher conversation at the school
// — same transparency precedent as Parent Corner. School admins can view but
// never send: the backend only grants SCHOOL_ADMIN/PLATFORM_ADMIN the two
// GET /messages/admin/* routes (see backend/src/messages/messages.controller.ts).
export function MessagesOversight() {
  const [viewing, setViewing] = useState<MessageConversationSummary | null>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['admin-message-conversations'],
    queryFn: () => messagesApi.findAdminConversations(),
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" meta="Read-only view of every conversation between students and teachers at your school" />

      <ActionCard title="Conversations" meta={isLoading ? undefined : `${conversations.length}`}>
        {isLoading ? (
          <EmptyState title="Loading..." />
        ) : conversations.length === 0 ? (
          <EmptyState title="No messages have been sent at your school yet." />
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <button
                key={`${c.student.id}-${c.teacher.id}`}
                type="button"
                onClick={() => setViewing(c)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#101820]">
                    {c.student.name} <span className="font-normal text-slate-400">with</span> {c.teacher.name}
                  </p>
                  <span className="text-xs text-slate-400">{formatDateTime(c.lastMessage.createdAt)}</span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-500">{c.lastMessage.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {c.messageCount} message{c.messageCount === 1 ? '' : 's'}
                </p>
              </button>
            ))}
          </div>
        )}
      </ActionCard>

      {viewing ? <ThreadModal conversation={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}

function ThreadModal({ conversation, onClose }: { conversation: MessageConversationSummary; onClose: () => void }) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-message-thread', conversation.student.id, conversation.teacher.id],
    queryFn: () => messagesApi.findAdminThread(conversation.student.id, conversation.teacher.id),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#101820]">
            {conversation.student.name} &amp; {conversation.teacher.name}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <EmptyState title="Loading..." />
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                  {m.sender?.name ?? 'Unknown'} · {formatDateTime(m.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{m.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
