import type { Assignment, Lab, SkillCourse } from '../../../types';
import type { RichSkillLesson } from '../skill-workspace/content/types';
import { investigationFor } from '../stem-workspace/investigations';
import { readAssignmentBrief } from './assignment-brief';
import type {
  CompetencyId,
  LearningDesign,
  LearningOutcome,
} from './framework';

export function assignmentDesign(
  assignment: Pick<Assignment, 'id' | 'title' | 'subject' | 'description'>,
): LearningDesign {
  const brief = readAssignmentBrief(assignment.description);
  if (brief)
    return {
      id: `assignment:${assignment.id}`,
      title: assignment.title,
      area: 'assignments',
      href: `/student/assignments/${assignment.id}`,
      teacherAuthored: true,
      connection:
        brief.connection ||
        'Discuss a practical application with your teacher.',
      values: ['Responsibility: submit your own work'],
      access:
        brief.support ||
        'Ask your teacher about appropriate support or an accessible format.',
      outcomes: [
        {
          id: 'teacher-outcome',
          statement: brief.outcome,
          evidence: brief.evidence,
          criteria: brief.criteria,
          competencies: ['thinking', 'learning'],
        },
        ...(brief.feedback
          ? [
              {
                id: 'feedback',
                statement:
                  'Use the planned feedback to decide what to improve.',
                evidence: brief.feedback,
                criteria: [
                  'Identify a learning gap.',
                  'Explain a correction or next attempt.',
                ],
                competencies: ['learning'] as CompetencyId[],
              },
            ]
          : []),
      ],
    };
  return {
    id: `assignment:${assignment.id}`,
    title: assignment.title,
    area: 'assignments',
    href: `/student/assignments/${assignment.id}`,
    connection:
      'Explain where one idea from this task could be useful at school, at home or in the community.',
    values: [
      'Responsibility: submit your own work',
      'Respect: acknowledge any help or sources',
    ],
    access:
      'Follow your teacher’s task and assessment arrangements. Ask for an accessible format or an agreed alternative before the assessment.',
    outcomes: [
      {
        id: 'apply',
        statement: `Apply ${assignment.subject || 'subject'} knowledge to the tasks in “${assignment.title}”.`,
        evidence:
          'Your submitted responses, with working, examples or reasons where the question requests them.',
        criteria: [
          'Address the question that was asked.',
          'Use an appropriate method and check your answer.',
          'Follow the teacher’s instructions and marking criteria.',
        ],
        competencies: ['thinking', 'self-efficacy'],
      },
      {
        id: 'improve',
        statement:
          'Use feedback to explain one correction and plan another attempt.',
        evidence:
          'A corrected example and a brief note explaining what changed and why.',
        criteria: [
          'Identify a specific gap using released feedback.',
          'Explain the correction rather than copying an answer.',
          'Choose one focused revision task.',
        ],
        competencies: ['learning', 'communication'],
      },
    ],
  };
}
const STEM_OUTCOMES: Record<string, [string, string]> = {
  circuit: [
    'Use a fixed-resistance circuit model to compare current at different voltages and explain an open circuit.',
    'At least three labelled voltage/resistance/switch trials, with currents and a comparison.',
  ],
  filter: [
    'Compare model filtration results and explain why clear water is not evidence that it is safe to drink.',
    'A baseline and treatment trials, plus a statement about microbes and dissolved contaminants.',
  ],
  plant: [
    'Plan a fair comparison of light or water and explain the limits of the model’s growth index.',
    'Trials isolating one factor, controlled conditions and a proposed real-seedling investigation.',
  ],
  pendulum: [
    'Compare pendulum periods at different lengths and test whether mass changes the ideal-model period.',
    'Recorded lengths, masses and periods; explain the 0.25 m versus 1 m comparison.',
  ],
  hydroponics: [
    'Compare pH settings in an illustrative nutrient-availability model and propose a crop-specific monitoring plan.',
    'A pH/results table, an interpretation and a statement that the curve is not a crop recommendation.',
  ],
  photoelectric: [
    'Use photon energy and work function to explain the emission threshold and the effect of intensity.',
    'Below- and above-threshold trials, an intensity comparison and an explanation using E = hf.',
  ],
};
export function stemDesign(
  lab: Pick<
    Lab,
    | 'id'
    | 'key'
    | 'title'
    | 'learningOutcomes'
    | 'portfolioPrompt'
    | 'communityLink'
  >,
): LearningDesign {
  const pack = investigationFor(lab);
  const specific = pack ? STEM_OUTCOMES[pack.model] : undefined;
  const statements = lab.learningOutcomes?.filter((s) => s.trim()) ?? [];
  const outcomes: LearningOutcome[] = specific
    ? [
        {
          id: 'investigate',
          statement: specific[0],
          evidence: specific[1],
          criteria: [
            'Change one factor and identify what you keep the same.',
            'Record settings and results accurately, including units where relevant.',
            'Use the evidence to explain a pattern and a limitation.',
          ],
          competencies: ['thinking', 'learning'],
        },
      ]
    : statements.length
      ? statements.map((statement, i) => ({
          id: `teacher-${i}`,
          statement,
          evidence:
            lab.portfolioPrompt ||
            'Your method, observations and explanation from the teacher-provided investigation.',
          criteria: [
            'Follow the practical instructions and safety arrangements.',
            'Record what you actually observe.',
            'Explain what your evidence supports and what it does not.',
          ],
          competencies: ['thinking', 'communication'],
        }))
      : [
          {
            id: 'inquiry',
            statement:
              'Form a testable question and use observations to support an explanation.',
            evidence:
              'A prediction, a method, observations and a conclusion in your lab notebook.',
            criteria: [
              'Identify a question that can be investigated.',
              'Record evidence using the teacher’s method.',
              'Explain the result and a possible improvement.',
            ],
            competencies: ['thinking', 'learning'],
          },
        ];
  return {
    id: `stem:${lab.id}`,
    title: lab.title,
    area: 'stem',
    href: `/student/stem-labs/${lab.id}`,
    outcomes,
    connection:
      pack?.transfer ??
      lab.communityLink ??
      'Explain how the investigation could help solve a problem in your school or community.',
    values: [
      'Responsibility: record results honestly',
      'Respect: care for equipment and living things',
    ],
    access:
      'Use the written explanation alongside the diagram. Explain findings in writing or discuss an agreed alternative with your teacher. Physical extensions need appropriate supervision.',
  };
}
const courseEvidence: Record<
  string,
  {
    evidence: string;
    criteria: string[];
    competencies: CompetencyId[];
    connection: string;
  }
> = {
  'Python Programming Foundations': {
    evidence:
      'Your edited Python code, a test input where relevant, the actual output and an explanation of one change.',
    criteria: [
      'Predict an output before running.',
      'Run and compare actual output with the lesson target.',
      'Explain or fix one part of the code.',
    ],
    competencies: ['digital', 'thinking', 'learning'],
    connection:
      'Adapt a program to a small school or household calculation using invented data.',
  },
  'First Aid Foundations': {
    evidence:
      'Your decisions in the lesson scenarios, with reasons, actions to avoid and when to seek help.',
    criteria: [
      'Recognise hazards and the key signs in the scenario.',
      'Choose a safe response and explain why.',
      'Know when trained or emergency help is needed.',
    ],
    competencies: ['thinking', 'citizenship', 'communication'],
    connection:
      'Explain how to get a responsible adult’s help in a school emergency. Do not practise physical techniques without a qualified instructor.',
  },
  'Robotics with Sensors and Arduino': {
    evidence:
      'Your command sequence, the simulator’s final position and an explanation of a corrected route.',
    criteria: [
      'Predict the route before testing.',
      'Compare the result with the target.',
      'Explain the difference between the simulator and physical hardware.',
    ],
    competencies: ['digital', 'thinking', 'creativity'],
    connection:
      'Plan a simple route or sensing task for a school project; use supervision for any physical hardware.',
  },
  'Machine Learning Foundations': {
    evidence:
      'Your code, inspected data or model results, and a note about mistakes and limits.',
    criteria: [
      'Inspect data before using it.',
      'Test on appropriate examples without leaking answers.',
      'Explain an error, a limitation and a privacy consideration.',
    ],
    competencies: ['digital', 'thinking', 'citizenship'],
    connection:
      'Describe a useful school-data question using invented or non-personal data.',
  },
  'Research Skills for Student Projects': {
    evidence:
      'A focused research question, a fair method, a results table and a referenced conclusion.',
    criteria: [
      'Make the question specific and feasible.',
      'Separate observations from interpretations.',
      'Credit sources and state limits.',
    ],
    competencies: ['thinking', 'communication', 'learning'],
    connection:
      'Plan a manageable investigation about a school or community question, with consent where people are involved.',
  },
  'Cyber Safety and Networking': {
    evidence:
      'A safe-response checklist or network sketch with an explanation of the decisions.',
    criteria: [
      'Identify the risk without sharing passwords or personal data.',
      'Verify suspicious requests through a trusted route.',
      'Explain who to contact for help.',
    ],
    competencies: ['digital', 'citizenship', 'thinking'],
    connection:
      'Create a privacy-safe advice note for a family member using fictional examples.',
  },
  'CAD and Digital Fabrication': {
    evidence:
      'A labelled sketch, dimensions, a design decision and a proposed prototype test.',
    criteria: [
      'State a user need and a measurable constraint.',
      'Label dimensions and materials.',
      'Explain a revision after a test or review.',
    ],
    competencies: ['creativity', 'thinking', 'communication'],
    connection:
      'Design a small item that addresses a school need. A sketch is evidence of planning, not proof that it can be safely manufactured.',
  },
  'Video Production and Editing': {
    evidence:
      'A storyboard, shot or editing plan and a note about permissions and sources.',
    criteria: [
      'Communicate a clear message for an audience.',
      'Sequence the story coherently.',
      'Respect consent, privacy and copyright.',
    ],
    competencies: ['creativity', 'communication', 'digital'],
    connection:
      'Plan a short school-information video without identifying people who have not consented.',
  },
  'Smart Agriculture and Climate Technology': {
    evidence:
      'An observation or monitoring table and a reasoned crop-management proposal.',
    criteria: [
      'Identify the observation and its units.',
      'Separate a sensor reading from a management decision.',
      'Consider local conditions and uncertainty.',
    ],
    competencies: ['thinking', 'citizenship', 'digital'],
    connection:
      'Plan an observation log for a school garden and discuss it with a knowledgeable adult.',
  },
  'Solar Energy Systems Foundations': {
    evidence:
      'A labelled system sketch, a basic energy calculation and a safety-aware plan.',
    criteria: [
      'Distinguish the roles of the main components.',
      'Show units and assumptions in calculations.',
      'Identify work that requires a trained installer.',
    ],
    competencies: ['thinking', 'citizenship', 'learning'],
    connection:
      'Estimate a small lighting need as a paper exercise. Electrical installation requires qualified supervision.',
  },
};
export function skillDesign(
  course: Pick<SkillCourse, 'id' | 'title' | 'learningOutcomes'>,
  lesson?: RichSkillLesson,
): LearningDesign {
  const profile = courseEvidence[course.title];
  const suppliedOutcomes = Array.isArray(course.learningOutcomes)
    ? course.learningOutcomes.filter(
        (s): s is string => typeof s === 'string' && !!s.trim(),
      )
    : [];
  const outcomes = (lesson ? [lesson.objective] : suppliedOutcomes).map(
    (statement, i) => ({
      id: lesson ? 'lesson-objective' : `course-${i}`,
      statement,
      evidence:
        profile?.evidence ??
        'The work produced by the lesson activity, with a short explanation of your choices.',
      criteria: profile?.criteria ?? [
        'Follow the activity instructions.',
        'Show your method or decisions.',
        'Explain a result and one improvement.',
      ],
      competencies:
        profile?.competencies ??
        (['learning', 'self-efficacy'] as CompetencyId[]),
    }),
  );
  if (!outcomes.length)
    outcomes.push({
      id: 'practice',
      statement: `Produce and explain a practical piece of work from ${course.title}.`,
      evidence:
        profile?.evidence ??
        'A completed activity and a reflection on what you learned.',
      criteria: profile?.criteria ?? [
        'Complete a practical activity.',
        'Explain your approach.',
        'Use feedback to improve.',
      ],
      competencies: profile?.competencies ?? ['learning', 'self-efficacy'],
    });
  return {
    id: `skill:${course.id}${lesson ? `:${lesson.key}` : ''}`,
    title: lesson ? `${course.title}: ${lesson.title}` : course.title,
    area: 'skills',
    href: `/student/learn-skills/${course.id}${lesson ? `/workspace?lesson=${encodeURIComponent(lesson.key)}` : ''}`,
    outcomes,
    connection:
      profile?.connection ??
      'Identify a safe, manageable application of this skill in your everyday life.',
    values: [
      'Responsibility: practise safely and report your own work',
      'Respect: protect people and credit their contributions',
    ],
    access:
      'Use the text explanations, examples and available illustrations. Work at your own pace and ask your teacher for an alternative way to demonstrate the skill.',
  };
}
