import { PortalFoundation } from './PortalFoundation';

export function MyActivitiesPage() {
  return (
    <PortalFoundation
      eyebrow="My Activities"
      title="A clean activity center for practical work, participation, and evidence of learning."
      description="My Activities creates room for a richer student timeline across labs, community activities, uploads, and engagement records. The foundation is intentionally school-aware and ready for broader activity aggregation in later phases."
      highlights={['Practical learning', 'Activity timeline', 'Evidence records']}
      quickLinks={[
        {
          to: '/student/stem-labs',
          label: 'Open STEM Labs',
          description: 'Launch the current labs and CSL experience already available in the portal.',
        },
        {
          to: '/student',
          label: 'Return Home',
          description: 'Go back to the main student landing experience.',
        },
      ]}
    />
  );
}
