// Original supplementary practice. Changes require a subject teacher's review;
// these resources do not claim KICD approval or reproduce official exam papers.
export const resources = [
  {
    slug: 'grade-7-mathematics-fractions', subject: 'Mathematics', topic: 'Fractions',
    title: 'Grade 7 Mathematics: Fractions Revision Questions',
    description: 'Practise Grade 7 fractions with five free questions, worked answers and an instant quiz score. CBC/CBE revision support for Kenyan junior school learners.',
    introduction: 'Build confidence with equivalent fractions, addition, subtraction and fractions of a quantity. Use a pencil and paper, then check each step against the worked answers.',
    tips: ['Use a common denominator before adding or subtracting fractions.', 'Simplify by dividing the numerator and denominator by the same factor.', 'To find a fraction of a quantity, divide by the denominator, then multiply by the numerator.'],
    questions: [
      { prompt: 'Which fraction is equivalent to 3/4?', options: ['3/8', '6/8', '4/6', '9/16'], answer: 1, explanation: 'Multiply both the numerator and denominator by 2: 3/4 = 6/8. The value stays the same.' },
      { prompt: 'What is 1/3 + 1/6 in its simplest form?', options: ['2/9', '1/6', '1/2', '2/3'], answer: 2, explanation: 'Use denominator 6. 1/3 = 2/6, so 2/6 + 1/6 = 3/6 = 1/2.' },
      { prompt: 'A learner reads 3/5 of a 40-page booklet. How many pages have they read?', options: ['8', '15', '24', '32'], answer: 2, explanation: 'One fifth of 40 is 8. Three fifths is 3 × 8 = 24 pages.' },
      { prompt: 'What is 5/6 − 1/4 in its simplest form?', options: ['4/2', '7/12', '2/3', '1/2'], answer: 1, explanation: 'Use denominator 12: 5/6 = 10/12 and 1/4 = 3/12. Subtract to get 7/12.' },
      { prompt: 'Which fraction is the largest?', options: ['2/3', '3/4', '5/8', '1/2'], answer: 1, explanation: 'With denominator 24 the fractions are 16/24, 18/24, 15/24 and 12/24. Therefore 3/4 is largest.' },
    ],
  },
  {
    slug: 'grade-7-mathematics-algebra', subject: 'Mathematics', topic: 'Introduction to algebra',
    title: 'Grade 7 Mathematics: Algebra Revision Questions',
    description: 'Try five free Grade 7 algebra questions with worked answers. Practise expressions, substitution and simple equations for junior school CBC/CBE revision in Kenya.',
    introduction: 'A letter can stand for a number. Practise turning everyday situations into expressions, collecting like terms and solving simple equations, one step at a time.',
    tips: ['Only collect like terms: 2x + 3x = 5x, but 2x + 3 cannot be combined.', 'When substituting, replace the letter with its value before calculating.', 'Keep an equation balanced by doing the same operation to both sides.'],
    questions: [
      { prompt: 'Simplify 3x + 2x.', options: ['5x', '6x', '5x²', 'x'], answer: 0, explanation: 'Both terms contain x. Add their coefficients: (3 + 2)x = 5x.' },
      { prompt: 'Find 2a + 3 when a = 4.', options: ['9', '11', '14', '20'], answer: 1, explanation: 'Substitute a = 4: 2 × 4 + 3 = 8 + 3 = 11. Multiply before adding.' },
      { prompt: 'Solve x + 7 = 15.', options: ['22', '7', '8', '15'], answer: 2, explanation: 'Subtract 7 from both sides: x = 15 − 7 = 8. Check: 8 + 7 = 15.' },
      { prompt: 'One exercise book costs b shillings. Which expression gives the cost of four books?', options: ['b + 4', 'b/4', '4b', 'b − 4'], answer: 2, explanation: 'Four books cost b + b + b + b = 4b shillings. Multiplication represents four equal costs.' },
      { prompt: 'Solve 3y = 18.', options: ['15', '21', '54', '6'], answer: 3, explanation: 'Divide both sides by 3: y = 18 ÷ 3 = 6. Check: 3 × 6 = 18.' },
    ],
  },
  {
    slug: 'grade-7-integrated-science-laboratory-safety', subject: 'Integrated Science', topic: 'Laboratory safety',
    title: 'Grade 7 Integrated Science: Laboratory Safety Questions',
    description: 'Revise laboratory safety with five free Grade 7 Integrated Science questions and explained answers. Junior school CBC/CBE practice for learners in Kenya.',
    introduction: 'Science starts with careful observation and safe habits. Review how to protect yourself and others, choose equipment and respond to a problem in a school laboratory.',
    tips: ['Follow the teacher’s instructions and read labels before using equipment.', 'Report spills, injuries and broken equipment immediately.', 'Never taste laboratory substances or carry out experiments without supervision.'],
    questions: [
      { prompt: 'A bottle contains an unknown liquid. What should a learner do?', options: ['Taste a drop', 'Smell it closely', 'Ask the teacher before handling it', 'Mix it with another liquid'], answer: 2, explanation: 'Ask the teacher and wait for instructions. Never taste, directly smell or mix unknown substances.' },
      { prompt: 'Which item helps protect the eyes from splashes?', options: ['Safety goggles', 'A notebook', 'Ordinary gloves', 'A measuring cylinder'], answer: 0, explanation: 'Safety goggles help protect the eyes. Use the protective equipment specified by the teacher for the activity.' },
      { prompt: 'A glass beaker breaks on the floor. What is the safest response?', options: ['Pick it up with bare hands', 'Tell the teacher and keep others away', 'Hide the pieces', 'Continue working beside it'], answer: 1, explanation: 'Alert the teacher immediately and keep clear. Broken glass must be handled using the school’s safe clean-up procedure, never with bare hands.' },
      { prompt: 'Which apparatus is designed to measure the volume of a liquid?', options: ['Thermometer', 'Beam balance', 'Measuring cylinder', 'Stopwatch'], answer: 2, explanation: 'A measuring cylinder measures liquid volume, commonly in millilitres. A thermometer measures temperature; a balance measures mass; a stopwatch measures time.' },
      { prompt: 'Why should long hair be tied back before a supervised heating activity?', options: ['To read a thermometer faster', 'To increase the flame size', 'To prevent water evaporating', 'To keep it away from flames and equipment'], answer: 3, explanation: 'Loose hair can catch fire or get caught in equipment. Tie it back and follow the teacher’s safety instructions before starting.' },
    ],
  },
];
