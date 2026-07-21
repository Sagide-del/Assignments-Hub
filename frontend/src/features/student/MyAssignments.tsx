import { PortalFoundation } from './PortalFoundation';

export function MyAssignmentsPage() {
  return (
    <PortalFoundation
      eyebrow="Assignments"
      title="A dedicated workspace for coursework, deadlines, and submission flow."
      description="This section establishes the permanent Assignment Hub structure for student assignment management. It is designed to evolve into a school-aware workspace for active tasks, submitted work, grading feedback, and revision history."
      highlights={['Active coursework', 'Draft tracking', 'Submission history']}
      quickLinks={[
        {
          to: '/student',
          label: 'Open Home',
          description: 'Return to the student home dashboard and overall progress view.',
        },
        {
          to: '/student/reports',
          label: 'View My Reports',
          description: 'Access the current reporting screen while the assignment workspace expands.',
        },
      ]}
    />
  );
}
