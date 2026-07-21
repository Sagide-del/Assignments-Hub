import { PortalFoundation } from './PortalFoundation';

export function FutureSkillsPage() {
  return (
    <PortalFoundation
      eyebrow="Future Skills"
      title="A polished foundation for competencies, wellbeing support, and growth signals."
      description="Future Skills is positioned as the student’s professional development layer inside Assignment Hub. It can later unify support needs, learning habits, soft-skill milestones, and intervention guidance in one premium experience."
      highlights={['Competency growth', 'Support readiness', 'Personal development']}
      quickLinks={[
        {
          to: '/student/support-needs',
          label: 'Open Support Needs',
          description: 'Use the existing support-needs workflow that is already available today.',
        },
        {
          to: '/student/stem-labs',
          label: 'Open STEM Labs',
          description: 'Continue into hands-on work that can later feed future-skills signals.',
        },
      ]}
    />
  );
}
