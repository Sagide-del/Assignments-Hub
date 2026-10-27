// Framework facts checked against the user-supplied KICD BECF (2017).
// Activity designs below are Assignment Hub adaptations, not official subject-design outcomes.
export const FRAMEWORK = {
  title: 'Basic Education Curriculum Framework',
  publisher: 'Kenya Institute of Curriculum Development',
  year: 2017,
  pages: {
    competencies: 21,
    middleSchool: 35,
    seniorSchool: 52,
    contemporaryIssues: 110,
    assessment: 113,
    principles: 116,
    reflection: 118,
    instruments: 119,
    portfolios: 121,
  },
};
export const COMPETENCIES = [
  {
    id: 'communication',
    title: 'Communication and collaboration',
    practice:
      'Explain your thinking clearly. Listen to another view and acknowledge help.',
  },
  {
    id: 'self-efficacy',
    title: 'Self-efficacy',
    practice: 'Set a manageable goal, try it and describe what you can now do.',
  },
  {
    id: 'thinking',
    title: 'Critical thinking and problem solving',
    practice: 'Compare evidence, test a solution and explain why it works.',
  },
  {
    id: 'creativity',
    title: 'Creativity and imagination',
    practice: 'Develop an idea, make a prototype or try another approach.',
  },
  {
    id: 'citizenship',
    title: 'Citizenship',
    practice: 'Consider who is affected by your choices and act responsibly.',
  },
  {
    id: 'digital',
    title: 'Digital literacy',
    practice:
      'Use digital tools purposefully, protect private information and credit sources.',
  },
  {
    id: 'learning',
    title: 'Learning to learn',
    practice:
      'Use feedback to identify a gap, revise your work and plan the next attempt.',
  },
] as const;
export type CompetencyId = (typeof COMPETENCIES)[number]['id'];
export type LearningArea = 'assignments' | 'stem' | 'skills';
export interface LearningOutcome {
  id: string;
  statement: string;
  evidence: string;
  criteria: string[];
  competencies: CompetencyId[];
}
export interface LearningDesign {
  id: string;
  title: string;
  area: LearningArea;
  href: string;
  outcomes: LearningOutcome[];
  teacherAuthored?: boolean;
  connection: string;
  values: string[];
  access: string;
}
export const LEARNING_CYCLE = [
  {
    title: 'Understand',
    instruction:
      'Read the outcome and an example. Ask what success would look like.',
  },
  {
    title: 'Apply',
    instruction:
      'Attempt the task, investigate or create something of your own.',
  },
  {
    title: 'Show evidence',
    instruction: 'Keep your method, result, explanation or practical decision.',
  },
  {
    title: 'Reflect and improve',
    instruction:
      'Compare your work with the criteria. Use feedback to try again.',
  },
];
const BASE = 'https://kicd.ac.ke/cbc-materials/';
const gradeSlugs: Record<number, string> = {
  4: 'grade-four-designs',
  5: 'grade-five-designs',
  6: 'grade-six-designs',
  7: 'grade-seven-designs',
  8: 'grade-eight-designs',
  9: 'grade-nine-designs',
  10: 'grade-ten',
  11: 'grade-eleven',
  12: 'grade-twelve',
};
export function gradeDesignLink(grade?: string | null) {
  const match = grade?.match(/^\s*grade\s*(\d{1,2})\s*$/i);
  const number = match ? Number(match[1]) : undefined;
  if (number && gradeSlugs[number])
    return {
      title: `Grade ${number} curriculum designs`,
      url: `${BASE}curriculum-designs/${gradeSlugs[number]}/`,
    };
  if (number && number <= 3 && number >= 1)
    return { title: 'Lower-primary resources', url: `${BASE}lower-primary/` };
  if (/^\s*pp\s*[12]\s*$/i.test(grade ?? ''))
    return {
      title: 'Pre-primary curriculum designs',
      url: `${BASE}pre-primary/`,
    };
  return {
    title: 'Curriculum designs by level',
    url: `${BASE}curriculum-designs/`,
  };
}
export function levelContext(grade?: string | null) {
  const number = Number(grade?.match(/^\s*grade\s*(\d{1,2})\s*$/i)?.[1]);
  if (number >= 4 && number <= 9)
    return {
      page: 35,
      text: 'The framework’s middle-school outcomes include communication, logical thinking, environmental care, health, ethical behaviour and appropriate digital literacy.',
    };
  if (number >= 10 && number <= 12)
    return {
      page: 52,
      text: 'The framework’s senior-school outcomes include communication and ICT, mathematical reasoning, research, talents, health, sustainability and responsible citizenship.',
    };
  if ((number >= 1 && number <= 3) || /^\s*pp\s*[12]\s*$/i.test(grade ?? ''))
    return {
      page: 29,
      text: 'The framework’s early-years outcomes integrate communication, number, exploration, relationships, health and care for the environment. Activities need age-appropriate support.',
    };
  return {
    page: 21,
    text: 'The framework develops seven core competencies through subject learning and practical application. Select and adapt activities with your teacher.',
  };
}
export const OFFICIAL_RESOURCES = [
  {
    title: 'Curriculum designs',
    url: `${BASE}curriculum-designs/`,
    purpose:
      'Check subject strands, sub-strands and specific outcomes with your teacher.',
  },
  {
    title: 'Approved course materials',
    url: `${BASE}approved-cbc-course-materials/`,
    purpose: 'Check KICD’s published lists before choosing course materials.',
  },
  {
    title: 'Special-needs curriculum designs',
    url: `${BASE}curriculum-designs/sne-curriculum-designs/`,
    purpose:
      'Find the HI, PI, VI, prevocational and vocational design categories listed by KICD.',
  },
  {
    title: 'Parental empowerment and engagement',
    url: `${BASE}guidelines-on-parental-empowerment-and-engagement/`,
    purpose: 'Plan supported learning beyond the classroom.',
  },
  {
    title: 'Kenya Education Cloud',
    url: 'https://kec.ac.ke/',
    purpose: 'Explore curriculum-related learning content.',
  },
  {
    title: 'OER Portal',
    url: 'https://oer.kec.ac.ke/',
    purpose: 'Explore open educational resource listings.',
  },
];

// The broad areas are named in BECF p. 110; examples here are product adaptations.
export const CONTEXT_THEMES = [
  {
    title: 'Global citizenship',
    example:
      'Consider fairness, rights and the effect of a decision on others.',
  },
  {
    title: 'Health education',
    example: 'Use safe practices and recognise when to seek trained help.',
  },
  {
    title: 'Life skills and values education',
    example: 'Take responsibility, show respect and explain an ethical choice.',
  },
  {
    title: 'Education for sustainable development',
    example:
      'Investigate resources, environmental care and sustainable choices.',
  },
  {
    title: 'Learner support programmes',
    example:
      'Identify a learning need and seek guidance, mentoring or support.',
  },
  {
    title: 'Community service learning and parental engagement',
    example:
      'Apply learning to an appropriate community task with agreed support.',
  },
] as const;
