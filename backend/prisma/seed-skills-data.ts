export const CBC_SKILL_CATALOG = [
  {
    category: 'First Aid & Safety',
    description: 'Practical safety, emergency response and wellbeing skills.',
    courses: [
      {
        title: 'First Aid Foundations',
        shortDescription: 'Respond safely to common injuries and emergencies.',
        durationWeeks: 4,
        outcomes: ['Assess an emergency scene', 'Provide basic first aid', 'Know when and how to seek professional help'],
      },
    ],
  },
  {
    category: 'Robotics & Automation',
    description: 'Build, control and troubleshoot physical computing projects.',
    courses: [
      {
        title: 'Robotics with Sensors and Arduino',
        shortDescription: 'Build sensor-driven robotics projects using Arduino.',
        durationWeeks: 8,
        outcomes: ['Connect sensors and actuators', 'Program robot behaviour', 'Test and improve a working prototype'],
      },
    ],
  },
  {
    category: 'AI & Machine Learning',
    description: 'Understand data, responsible AI and introductory machine learning.',
    courses: [
      {
        title: 'Machine Learning Foundations',
        shortDescription: 'Learn how data is used to train and evaluate simple models.',
        durationWeeks: 6,
        outcomes: ['Prepare a small dataset', 'Explain training and testing', 'Evaluate bias and model accuracy'],
      },
    ],
  },
  {
    category: 'Research & Innovation',
    description: 'Investigate real problems and communicate evidence-based findings.',
    courses: [
      {
        title: 'Research Skills for Student Projects',
        shortDescription: 'Plan investigations, collect evidence and present findings.',
        durationWeeks: 5,
        outcomes: ['Write a research question', 'Collect and analyse evidence', 'Reference sources and present conclusions'],
      },
    ],
  },
  {
    category: 'Coding & Digital Technology',
    description: 'Create software and understand the technology behind connected systems.',
    courses: [
      {
        title: 'Python Programming Foundations',
        shortDescription: 'Build practical programs with Python fundamentals.',
        durationWeeks: 8,
        outcomes: ['Use variables and control flow', 'Write reusable functions', 'Build and test a small Python project'],
      },
      {
        title: 'Cyber Safety and Networking',
        shortDescription: 'Use digital systems safely and understand basic networks.',
        durationWeeks: 5,
        outcomes: ['Protect accounts and devices', 'Explain how networks move data', 'Identify common online risks'],
      },
    ],
  },
  {
    category: 'Design, Media & Fabrication',
    description: 'Design, communicate and manufacture practical solutions.',
    courses: [
      {
        title: 'CAD and Digital Fabrication',
        shortDescription: 'Turn measured ideas into precise digital designs and prototypes.',
        durationWeeks: 6,
        outcomes: ['Create a dimensioned CAD model', 'Prepare a fabrication file', 'Evaluate a prototype against its brief'],
      },
      {
        title: 'Video Production and Editing',
        shortDescription: 'Plan, record and edit clear digital stories.',
        durationWeeks: 5,
        outcomes: ['Plan a storyboard', 'Capture usable audio and video', 'Edit and export a finished production'],
      },
    ],
  },
  {
    category: 'Applied Technology',
    description: 'Apply STEM knowledge to agriculture, energy and everyday systems.',
    courses: [
      {
        title: 'Smart Agriculture and Climate Technology',
        shortDescription: 'Use data and simple technology to improve sustainable farming.',
        durationWeeks: 6,
        outcomes: ['Measure farm conditions', 'Design a simple monitoring system', 'Recommend a climate-smart intervention'],
      },
      {
        title: 'Solar Energy Systems Foundations',
        shortDescription: 'Understand and safely plan a small solar energy system.',
        durationWeeks: 6,
        outcomes: ['Explain solar system components', 'Estimate a simple energy load', 'Apply basic electrical safety'],
      },
    ],
  },
] as const;
