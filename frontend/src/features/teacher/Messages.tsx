import { MessagesInbox } from '../student/Messages';

// Reuses the same inbox/thread UI as the student "News/Messages" tab — see
// features/student/Messages.tsx for the shared implementation and
// backend/src/messages for the API it talks to.
export function TeacherMessagesPage() {
  return <MessagesInbox viewerRole="TEACHER" />;
}
