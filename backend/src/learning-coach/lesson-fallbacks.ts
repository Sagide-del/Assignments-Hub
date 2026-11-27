import type { LessonStep } from "./lesson.service";

type Seed = {
  subject: string;
  topic: string;
  min: number;
  max: number;
  explanation: string;
  question: string;
  options: string[];
  answer: string;
};
// Small, explicit offline lessons. Never substitute a generic statement for subject teaching.
const seeds: Seed[] = [
  {
    subject: "Mathematics",
    topic: "Counting and addition",
    min: 1,
    max: 3,
    explanation:
      "Addition joins groups. If you have 3 counters and add 2 more, count all the counters: 1, 2, 3, 4, 5. So 3 + 2 = 5.",
    question:
      "You have 4 pencils and receive 2 more. How many pencils do you have?",
    options: ["6", "2", "8"],
    answer: "6",
  },
  {
    subject: "Mathematics",
    topic: "Equivalent fractions",
    min: 4,
    max: 6,
    explanation:
      "Equivalent fractions name the same amount. Multiply both the numerator and denominator by the same non-zero number: 1/2 = 2/4 = 3/6. Multiplying only the numerator changes the amount.",
    question: "Which fraction is equivalent to 2/3?",
    options: ["4/6", "2/6", "4/3"],
    answer: "4/6",
  },
  {
    subject: "Mathematics",
    topic: "Linear equations",
    min: 7,
    max: 9,
    explanation:
      "An equation is like a balanced scale. Do the same operation to both sides. To solve 2x + 3 = 11, subtract 3 from both sides to get 2x = 8, then divide both sides by 2: x = 4. Check: 2(4) + 3 = 11.",
    question: "Solve 3x + 2 = 14. What is x?",
    options: ["4", "6", "12"],
    answer: "4",
  },
  {
    subject: "Core Mathematics",
    topic: "Surds",
    min: 10,
    max: 12,
    explanation:
      "To simplify a square root, find a square factor. Since 72 = 36 × 2, √72 = √36 × √2 = 6√2. You cannot split √(a + b) into √a + √b.",
    question: "What is the simplest form of √50?",
    options: ["5√2", "25√2", "10√5"],
    answer: "5√2",
  },
  {
    subject: "Chemistry",
    topic: "Atomic structure",
    min: 10,
    max: 12,
    explanation:
      "An atom has protons and neutrons in its nucleus, with electrons around the nucleus. Atomic number counts protons. A neutral atom has the same number of electrons as protons. An ion has gained or lost electrons; its proton number stays the same.",
    question:
      "A neutral sodium atom has 11 protons. How many electrons does it have?",
    options: ["11", "12", "22"],
    answer: "11",
  },
  {
    subject: "Physics",
    topic: "Forces and motion",
    min: 10,
    max: 12,
    explanation:
      "A resultant force changes an object’s velocity. Newton’s second law is F = ma: force in newtons equals mass in kilograms times acceleration in metres per second squared. A 2 kg trolley with resultant force 6 N accelerates at 6 ÷ 2 = 3 m/s².",
    question:
      "A resultant force of 20 N acts on a 5 kg trolley. What is its acceleration?",
    options: ["4 m/s²", "25 m/s²", "100 m/s²"],
    answer: "4 m/s²",
  },
  {
    subject: "Biology",
    topic: "Inheritance",
    min: 10,
    max: 12,
    explanation:
      "In a simple model with complete dominance, A is dominant and a is recessive. Each parent passes on one allele. Crossing Aa with Aa gives AA, Aa, aA and aa as equally likely combinations. Only aa shows the recessive trait: one outcome out of four. This model does not describe every inherited trait.",
    question:
      "In the simple Aa × Aa cross, what is the chance of an aa offspring?",
    options: ["25%", "50%", "75%"],
    answer: "25%",
  },
  {
    subject: "Integrated Science",
    topic: "Electric circuits",
    min: 7,
    max: 9,
    explanation:
      "A bulb lights when a cell, wires and bulb form a complete conducting loop. Opening a switch breaks the loop, stopping the current. Never connect cell terminals directly with a wire: this short circuit can cause overheating. Use classroom cells with teacher supervision, never mains electricity.",
    question:
      "What happens to the bulb when a switch opens in a simple series circuit?",
    options: [
      "It goes out because the loop is broken.",
      "It becomes brighter.",
      "The cell produces more current.",
    ],
    answer: "It goes out because the loop is broken.",
  },
];
export function offlineTopics(grade: number) {
  return seeds.filter((s) => grade >= s.min && grade <= s.max);
}
export function offlineLesson(
  subject: string,
  topic: string,
  grade: number,
  canonical: (v: string) => string,
): LessonStep[] | null {
  const seed = offlineTopics(grade).find(
    (s) =>
      canonical(s.subject) === canonical(subject) &&
      s.topic.toLowerCase() === topic.toLowerCase(),
  );
  if (!seed) return null;
  return [
    {
      step: 1,
      type: "GREETING",
      text: `Let’s work through ${seed.topic} in ${subject}. Think about each step before checking your answer.`,
      voiceoverText: `Let’s work through ${seed.topic}.`,
    },
    {
      step: 2,
      type: "EXPLANATION",
      text: seed.explanation,
      voiceoverText: seed.explanation,
    },
    {
      step: 3,
      type: "QUESTION",
      text: seed.question,
      voiceoverText: seed.question,
      questionOptions: seed.options,
      correctAnswer: seed.answer,
    },
    {
      step: 4,
      type: "FEEDBACK",
      text: `Explain why “${seed.answer}” works. Then try a different example in your notes. A guided check prepares you for practice; it is not proof of mastery.`,
      voiceoverText: `Explain why your answer works, then try another example.`,
    },
  ];
}
