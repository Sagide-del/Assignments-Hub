export interface StemSubjectSeed {
  key: string;
  name: string;
  description: string;
}

export interface StemCategorySeed {
  key: string;
  name: string;
  description: string;
  subjects: StemSubjectSeed[];
}

// Categories/subjects for the STEM Labs catalog. Subject names are chosen
// to exactly match the free-text `subject` values already used in
// seed-labs-data.ts (Physics, Chemistry, Biology, Agriculture, "Computer
// Studies", "Technical Studies", "Integrated Science") — the student-facing
// StemLabs page falls back to matching a lab's `subject` string against a
// subject's `name` when a lab has no explicit `stemSubjectId`, so seeding
// these makes the existing Grade 7-10 lab catalog browsable immediately,
// not just new content.
export const STEM_CATEGORY_CATALOG: StemCategorySeed[] = [
  {
    key: 'physical-sciences',
    name: 'Physical Sciences',
    description: 'The study of matter, energy, and the physical forces that shape our world.',
    subjects: [
      { key: 'physics', name: 'Physics', description: 'Motion, forces, energy, electricity, and waves.' },
      { key: 'chemistry', name: 'Chemistry', description: 'The composition, properties, and reactions of matter.' },
      {
        key: 'technical-studies',
        name: 'Technical Studies',
        description: 'Practical design, construction, and engineering skills.',
      },
    ],
  },
  {
    key: 'life-sciences',
    name: 'Life Sciences',
    description: 'The study of living organisms and the natural world around us.',
    subjects: [
      { key: 'biology', name: 'Biology', description: 'Living organisms, ecosystems, and life processes.' },
      { key: 'agriculture', name: 'Agriculture', description: 'Crop and livestock production, and sustainable farming.' },
      {
        key: 'integrated-science',
        name: 'Integrated Science',
        description: 'A combined introduction to biology, chemistry, and physics for junior learners.',
      },
    ],
  },
  {
    key: 'technology-engineering',
    name: 'Technology & Engineering',
    description: 'Computing, digital literacy, and applied engineering skills.',
    subjects: [
      {
        key: 'computer-studies',
        name: 'Computer Studies',
        description: 'Computer literacy, software, and the fundamentals of computing.',
      },
    ],
  },
];
