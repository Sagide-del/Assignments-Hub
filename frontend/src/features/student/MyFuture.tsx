import { PortalFoundation } from './PortalFoundation';

export function MyFuturePage() {
  return (
    <PortalFoundation
      eyebrow="My Future"
      title="A strategic destination for pathways, ambitions, and long-term student planning."
      description="My Future is the student-facing space for school-guided aspiration planning. It sets up a lasting information architecture for pathway recommendations, selected tracks, and future-facing academic decisions."
      highlights={['Pathway planning', 'Guided decisions', 'Student goals']}
      quickLinks={[
        {
          to: '/student/pathways',
          label: 'Open Career Pathways',
          description: 'Use the current pathways engine while the new experience takes shape.',
        },
        {
          to: '/student/reports',
          label: 'Open My Reports',
          description: 'Review performance data that can later inform future-planning recommendations.',
        },
      ]}
    />
  );
}
