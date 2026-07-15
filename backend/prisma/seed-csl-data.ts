export interface CslActivitySeed {
  key: string;
  title: string;
  description: string;
  grade: string;
  competency?: string;
  isRequired: boolean;
  targetHours?: number;
}

// Community Service Learning catalog, grade-scoped, mirroring the STEM Labs
// catalog approach. One required activity per grade is the "must complete"
// item a report card flags if not yet APPROVED (see
// ReportsService.studentReportCard); each grade also gets one optional
// activity so students have a choice beyond the required one.
//
// grade7-environmental-cleaning is the fully-worked example from the
// original request: student does a cleanup, photographs it as evidence,
// writes a short reflection, and a tutor reviews/scores it. Grade 7 also
// matches seed.ts's demo student for easy end-to-end testing.
export const CSL_ACTIVITY_CATALOG: CslActivitySeed[] = [
  {
    key: 'grade7-environmental-cleaning',
    title: 'Environmental Cleaning Drive',
    description:
      'Organize or join a cleanup of a public space near your home or school (a street, market, riverbank, or school compound). ' +
      'Pick up litter, sort recyclables from waste, and leave the area visibly cleaner. Take a clear "before" and "after" photo as your ' +
      'evidence, and write a short reflection on what you noticed about waste in your community and what could be done to prevent it.',
    grade: 'Grade 7',
    competency: 'Environmental Awareness',
    isRequired: true,
    targetHours: 3,
  },
  {
    key: 'grade7-peer-tutoring',
    title: 'Peer Tutoring Session',
    description: 'Spend at least 2 hours helping a younger student or classmate with a subject you\'re strong in. Photograph the session (with consent) and describe what you taught and how it went.',
    grade: 'Grade 7',
    competency: 'Communication & Collaboration',
    isRequired: false,
    targetHours: 2,
  },
  {
    key: 'grade8-community-health-awareness',
    title: 'Community Health Awareness Campaign',
    description: 'Create and share simple health/hygiene awareness materials (posters, a short talk, or a demonstration) with your community or school. Upload a photo of your materials or the session, plus a reflection on the health issue you addressed.',
    grade: 'Grade 8',
    competency: 'Health Literacy',
    isRequired: true,
    targetHours: 4,
  },
  {
    key: 'grade8-tree-planting',
    title: 'Tree Planting',
    description: 'Plant at least one tree or seedling on your school compound or at home, and commit to watering it. Photograph the planting and describe the species chosen and why.',
    grade: 'Grade 8',
    competency: 'Environmental Awareness',
    isRequired: false,
    targetHours: 2,
  },
  {
    key: 'grade9-water-conservation-project',
    title: 'Water Conservation Project',
    description: 'Identify a water wastage problem at home or school (e.g. a leaking tap, poor storage) and implement or propose a fix. Document the before/after with photos and explain the water saved.',
    grade: 'Grade 9',
    competency: 'Problem Solving',
    isRequired: true,
    targetHours: 4,
  },
  {
    key: 'grade9-elderly-support-visit',
    title: 'Elderly Support Visit',
    description: 'Spend time assisting an elderly member of your community (errands, conversation, light chores). Photograph the visit (with consent) and reflect on what you learned.',
    grade: 'Grade 9',
    competency: 'Empathy',
    isRequired: false,
    targetHours: 3,
  },
  {
    key: 'grade10-mentorship-project',
    title: 'Junior School Mentorship Project',
    description: 'Mentor a Junior School student for at least 3 sessions on study skills or a subject of strength. Document each session briefly and upload a summary photo/reflection.',
    grade: 'Grade 10',
    competency: 'Leadership',
    isRequired: true,
    targetHours: 5,
  },
  {
    key: 'grade10-community-fundraiser',
    title: 'Community Fundraiser or Donation Drive',
    description: 'Organize or participate in a small fundraiser or donation drive (food, clothing, books) for a community cause. Photograph the activity and summarize the outcome/impact.',
    grade: 'Grade 10',
    competency: 'Collaboration',
    isRequired: false,
    targetHours: 4,
  },
];
