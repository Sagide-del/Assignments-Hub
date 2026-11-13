export const SPORTS_IDS = [
  "skeletal",
  "muscle",
  "energy",
  "respiratory",
  "reflex",
] as const;
export type SportsId = (typeof SPORTS_IDS)[number];
export const isSportsId = (s: string): s is SportsId =>
  (SPORTS_IDS as readonly string[]).includes(s);
export const BONE_GUIDE: Record<
  string,
  { name: string; type: string; division: string; function: string }
> = {
  femur: {
    name: "Femur",
    type: "Long",
    division: "Appendicular",
    function:
      "Transfers body weight and provides muscle attachment for hip and knee movement.",
  },
  tibia: {
    name: "Tibia",
    type: "Long",
    division: "Appendicular",
    function: "The main weight-bearing bone of the lower leg.",
  },
  fibula: {
    name: "Fibula",
    type: "Long",
    division: "Appendicular",
    function: "Provides muscle attachment and contributes to ankle stability.",
  },
  humerus: {
    name: "Humerus",
    type: "Long",
    division: "Appendicular",
    function: "Forms the upper arm and acts as a lever for movement.",
  },
  radius: {
    name: "Radius",
    type: "Long",
    division: "Appendicular",
    function:
      "Works with the ulna in forearm rotation and transmits load from the wrist.",
  },
  ulna: {
    name: "Ulna",
    type: "Long",
    division: "Appendicular",
    function: "Forms the main hinge with the humerus at the elbow.",
  },
  scapula: {
    name: "Scapula",
    type: "Flat",
    division: "Appendicular",
    function:
      "Provides a shoulder socket and broad muscle attachment surfaces.",
  },
  clavicle: {
    name: "Clavicle",
    type: "Long",
    division: "Appendicular",
    function: "Supports shoulder position and transfers forces to the trunk.",
  },
  patella: {
    name: "Patella",
    type: "Sesamoid",
    division: "Appendicular",
    function:
      "Develops within the quadriceps tendon and improves its mechanical leverage.",
  },
  sacrum: {
    name: "Sacrum",
    type: "Irregular",
    division: "Axial",
    function: "Transfers load from the spine to the pelvic girdle.",
  },
  "hip-bone": {
    name: "Hip bone",
    type: "Irregular",
    division: "Appendicular",
    function: "Supports the trunk and forms the hip socket.",
  },
  talus: {
    name: "Talus",
    type: "Short",
    division: "Appendicular",
    function: "Transfers load through the ankle joint.",
  },
  calcaneus: {
    name: "Calcaneus",
    type: "Short",
    division: "Appendicular",
    function: "Forms the heel and provides attachment for the Achilles tendon.",
  },
  skull: {
    name: "Skull",
    type: "Several bone types",
    division: "Axial",
    function:
      "Protects the brain and supports the face; cranial bones are mainly flat.",
  },
  ribs: {
    name: "Ribs",
    type: "Flat",
    division: "Axial",
    function: "Protect the thoracic organs and assist changes in chest volume.",
  },
  sternum: {
    name: "Sternum",
    type: "Flat",
    division: "Axial",
    function: "Protects the front of the chest and anchors costal cartilages.",
  },
  vertebra: {
    name: "Vertebra",
    type: "Irregular",
    division: "Axial",
    function:
      "Protects the spinal cord and supports controlled trunk movement.",
  },
};
export const SPORTS_LESSONS = {
  skeletal: {
    title: "Skeletal explorer",
    subtitle: "Structure, support & movement",
    objective:
      "Identify axial and appendicular bones and explain their roles in movement.",
    focus: [
      "Locate and classify bones",
      "Connect joint position to leverage",
      "Evaluate the limits of a simplified lever model",
    ],
    limits:
      "Atlas anatomy with an idealized 0.30 m forearm lever. Joint angle is measured from vertical; moment excludes the arm’s own weight and muscle forces.",
  },
  muscle: {
    title: "Inside a muscle",
    subtitle: "The sliding-filament mechanism",
    objective:
      "Relate calcium activation and ATP availability to cross-bridge cycling.",
    focus: [
      "Observe actin sliding past myosin",
      "Explain ATP’s role in detachment",
      "Distinguish activation from measured muscle force",
    ],
    limits:
      "An illustrative sarcomere under a fixed modeled load. Values are relative, not a physiological force measurement. Severe ATP depletion can prevent cross-bridge detachment; exercise fatigue has multiple causes.",
  },
  energy: {
    title: "Fuel the movement",
    subtitle: "ATP supply during exercise",
    objective:
      "Compare overlapping phosphagen, glycolytic and aerobic contributions.",
    focus: [
      "Identify early phosphagen contribution",
      "Compare intensity and duration",
      "Explain why systems do not switch on at fixed time boundaries",
    ],
    limits:
      "Relative teaching estimates, not athlete measurements. All three systems contribute concurrently. Lactate is not simply a waste product or the sole cause of fatigue.",
  },
  respiratory: {
    title: "Heart, lungs & movement",
    subtitle: "Pulmonary and systemic circulation",
    objective:
      "Trace circulation and relate heart rate, stroke volume and oxygen extraction.",
    focus: [
      "Trace the two circulation circuits",
      "Calculate cardiac output",
      "Separate oxygen delivery from oxygen uptake",
    ],
    limits:
      "Cardiac output = heart rate × stroke volume. Oxygen delivery assumes arterial oxygen content of 200 mL/L; uptake uses the chosen arterial–venous difference. No clinical assessment or modeled CO₂-removal percentage.",
  },
  reflex: {
    title: "The protective response",
    subtitle: "Sensory input to motor output",
    objective:
      "Trace a withdrawal reflex and distinguish spinal processing from conscious awareness.",
    focus: [
      "Sequence the reflex pathway",
      "Explore conduction distance and speed",
      "Explain the role of the spinal cord and brain",
    ],
    limits:
      "Illustrative conduction timing with a chosen total sensory-plus-motor path and 2 ms synaptic delay. The animation is slowed for observation. It does not measure your reflex or predict an injury response.",
  },
} as const;
export const SPORTS_CONTROLS: Record<
  SportsId,
  {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    initial: number;
    unit: string;
  }[]
> = {
  skeletal: [
    {
      key: "angle",
      label: "Forearm angle from vertical",
      min: 0,
      max: 120,
      step: 5,
      initial: 45,
      unit: "°",
    },
    {
      key: "load",
      label: "External load",
      min: 0,
      max: 20,
      step: 1,
      initial: 5,
      unit: "kg",
    },
  ],
  muscle: [
    {
      key: "calcium",
      label: "Calcium activation",
      min: 0,
      max: 100,
      step: 5,
      initial: 30,
      unit: "relative units",
    },
    {
      key: "atp",
      label: "ATP availability",
      min: 0,
      max: 100,
      step: 5,
      initial: 80,
      unit: "relative units",
    },
  ],
  energy: [
    {
      key: "intensity",
      label: "Exercise intensity",
      min: 10,
      max: 100,
      step: 5,
      initial: 80,
      unit: "%",
    },
    {
      key: "duration",
      label: "Exercise duration",
      min: 0,
      max: 180,
      step: 5,
      initial: 5,
      unit: "s",
    },
  ],
  respiratory: [
    {
      key: "heartRate",
      label: "Heart rate",
      min: 60,
      max: 180,
      step: 5,
      initial: 75,
      unit: "beats/min",
    },
    {
      key: "strokeVolume",
      label: "Stroke volume",
      min: 40,
      max: 140,
      step: 5,
      initial: 80,
      unit: "mL/beat",
    },
    {
      key: "extraction",
      label: "Arterial–venous oxygen difference",
      min: 30,
      max: 150,
      step: 10,
      initial: 50,
      unit: "mL/L",
    },
  ],
  reflex: [
    {
      key: "speed",
      label: "Conduction speed",
      min: 10,
      max: 120,
      step: 5,
      initial: 60,
      unit: "m/s",
    },
    {
      key: "path",
      label: "Total sensory + motor path",
      min: 0.4,
      max: 2,
      step: 0.1,
      initial: 1.2,
      unit: "m",
    },
  ],
};
export const defaultSportsConfig = (id: SportsId): Record<string, number> =>
  Object.fromEntries(SPORTS_CONTROLS[id].map((c) => [c.key, c.initial]));
export function validSportsConfig(
  id: SportsId,
  value: unknown,
): value is Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, number>;
  return (
    Object.keys(c).length === SPORTS_CONTROLS[id].length &&
    SPORTS_CONTROLS[id].every(
      (k) =>
        Number.isFinite(c[k.key]) && c[k.key] >= k.min && c[k.key] <= k.max,
    )
  );
}
export function sportsResult(
  id: SportsId,
  c: Record<string, number>,
): { label: string; value: number; unit: string }[] {
  if (!validSportsConfig(id, c))
    throw Error("Choose values within the activity limits.");
  if (id === "skeletal")
    return [
      {
        label: "External-load moment",
        value: c.load * 9.81 * 0.3 * Math.sin((c.angle * Math.PI) / 180),
        unit: "N·m",
      },
    ];
  if (id === "muscle") {
    const activation = c.calcium / (c.calcium + 30),
      cycling = c.atp / (c.atp + 15);
    return [
      {
        label: "Relative active force",
        value: 100 * activation * cycling,
        unit: "units",
      },
      {
        label: "Illustrated shortening",
        value: 30 * activation * cycling,
        unit: "%",
      },
    ];
  }
  if (id === "energy") {
    const i = c.intensity / 100,
      t = c.duration,
      raw = [
        Math.pow(i, 0.8) * Math.exp(-t / 16) + 0.015,
        Math.pow(i, 1.6) * (1 - Math.exp(-t / 5)) * Math.exp(-t / 100) * 0.9 +
          0.015,
        (0.35 + 0.55 * (1 - i)) * (1 - Math.exp(-t / 38)) + 0.04,
      ],
      total = raw.reduce((a, b) => a + b, 0);
    return ["ATP-PC", "Glycolytic", "Aerobic"].map((label, n) => ({
      label,
      value: (raw[n] / total) * 100,
      unit: "relative %",
    }));
  }
  if (id === "respiratory") {
    const co = (c.heartRate * c.strokeVolume) / 1000;
    return [
      { label: "Cardiac output", value: co, unit: "L/min" },
      { label: "Modeled oxygen delivery", value: co * 200, unit: "mL/min" },
      {
        label: "Modeled oxygen uptake",
        value: co * c.extraction,
        unit: "mL/min",
      },
    ];
  }
  return [
    {
      label: "Illustrative reflex pathway time",
      value: (1000 * c.path) / c.speed + 2,
      unit: "ms",
    },
  ];
}
type Question = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};
export function sportsQuestions(id: SportsId, grade: number): Question[] {
  const bank: Record<SportsId, Question[]> = {
    skeletal: [
      {
        prompt: "Which is the longest bone in the human body?",
        options: ["Femur", "Ulna", "Clavicle", "Fibula"],
        answer: 0,
        explanation:
          "The femur is the longest bone and transfers load through the thigh.",
      },
      {
        prompt: "Which structure belongs to the axial skeleton?",
        options: ["Scapula", "Rib", "Femur", "Hip bone"],
        answer: 1,
        explanation:
          "The axial skeleton includes the skull, vertebral column and thoracic cage.",
      },
      {
        prompt:
          grade >= 11
            ? "Why is external-load moment largest when the forearm is horizontal?"
            : "What is one function of a flat bone such as the scapula?",
        options:
          grade >= 11
            ? [
                "The perpendicular lever arm is greatest",
                "Gravity disappears",
                "The load gains mass",
                "The radius becomes longer",
              ]
            : [
                "It produces ATP",
                "It offers a broad muscle-attachment surface",
                "It carries nerve impulses",
                "It pumps blood",
              ],
        answer: grade >= 11 ? 0 : 1,
        explanation:
          grade >= 11
            ? "Moment depends on perpendicular distance from the joint to the load’s line of action."
            : "The scapula offers broad attachment surfaces and supports the shoulder joint.",
      },
    ],
    muscle: [
      {
        prompt:
          "What happens to filament length during ordinary sarcomere shortening?",
        options: [
          "Actin disappears",
          "Myosin doubles in length",
          "Filaments slide without shortening themselves",
          "Both filaments contract like elastic bands",
        ],
        answer: 2,
        explanation:
          "Thin and thick filaments retain their length while their overlap changes.",
      },
      {
        prompt: "What does calcium enable in this mechanism?",
        options: [
          "Access to actin binding sites",
          "Oxygen transport in blood",
          "A bone to lengthen",
          "ATP to become a muscle fibre",
        ],
        answer: 0,
        explanation:
          "Calcium binding to troponin allows tropomyosin to move away from actin binding sites.",
      },
      {
        prompt:
          grade >= 11
            ? "What can severe ATP depletion prevent?"
            : "Which statement about exercise fatigue is most accurate?",
        options:
          grade >= 11
            ? [
                "Blood entering the lungs",
                "Myosin detaching from actin",
                "Bone growth only",
                "All nerve impulses instantly",
              ]
            : [
                "Only lactate causes fatigue",
                "All muscles run out of ATP during every exercise",
                "Fatigue has several interacting causes",
                "Fatigue cannot occur with oxygen present",
              ],
        answer: grade >= 11 ? 1 : 2,
        explanation:
          "ATP supports cross-bridge detachment and cycling. Severe depletion can cause rigidity; normal exercise fatigue is more complex.",
      },
    ],
    energy: [
      {
        prompt:
          "Which system is especially important at the start of a brief maximal effort?",
        options: ["Aerobic only", "ATP-PC", "Digestion only", "None"],
        answer: 1,
        explanation:
          "Stored ATP and phosphocreatine rapidly supply ATP during an initial high-power effort.",
      },
      {
        prompt: "How do the energy systems operate during exercise?",
        options: [
          "In overlapping contributions",
          "One switches off before another starts",
          "Aerobic metabolism begins exactly at 90 seconds",
          "Only duration matters",
        ],
        answer: 0,
        explanation:
          "Contributions overlap and vary with exercise intensity, duration, recovery and training.",
      },
      {
        prompt:
          grade >= 11
            ? "Why should this chart not be used as a laboratory measurement of an athlete?"
            : "Which statement about lactate is accurate?",
        options:
          grade >= 11
            ? [
                "Its bars are coloured",
                "Its values use simplified assumptions rather than individual measurements",
                "It includes three systems",
                "Its percentages sum to 100",
              ]
            : [
                "It is always a useless waste product",
                "It is the only cause of fatigue",
                "It appears only without any oxygen",
                "It can be transported and used as fuel",
              ],
        answer: grade >= 11 ? 1 : 3,
        explanation:
          "These are teaching estimates. Lactate can be reused as fuel and is not the sole cause of fatigue.",
      },
    ],
    respiratory: [
      {
        prompt: "Where does blood go after leaving the right ventricle?",
        options: [
          "Directly to the leg muscles",
          "To the brain only",
          "To the lungs through pulmonary arteries",
          "To the left atrium through the aorta",
        ],
        answer: 2,
        explanation:
          "The right ventricle pumps deoxygenated blood through the pulmonary arteries to the lungs.",
      },
      {
        prompt: "At 100 beats/min and 80 mL/beat, what is cardiac output?",
        options: ["8 L/min", "80 L/min", "0.8 L/min", "180 L/min"],
        answer: 0,
        explanation: "100 × 80 = 8,000 mL/min, or 8 L/min.",
      },
      {
        prompt:
          grade >= 11
            ? "What else is required to estimate tissue oxygen uptake from cardiac output?"
            : "Which statement correctly describes pulmonary veins?",
        options:
          grade >= 11
            ? [
                "Only breathing rate",
                "Arterial–venous oxygen-content difference",
                "The person’s name",
                "Bone length",
              ]
            : [
                "They carry blood away from the lungs to the left atrium",
                "They always carry deoxygenated blood",
                "They connect the right ventricle to the lungs",
                "They bypass the heart",
              ],
        answer: grade >= 11 ? 1 : 0,
        explanation:
          grade >= 11
            ? "The Fick relationship uses cardiac output and the arterial–venous oxygen-content difference."
            : "Pulmonary veins return oxygenated blood from the lungs to the left atrium.",
      },
    ],
    reflex: [
      {
        prompt: "Which sequence describes a withdrawal reflex?",
        options: [
          "Muscle → skin → brain only",
          "Receptor → sensory neurone → spinal interneurone → motor neurone → effector",
          "Brain → bone → receptor",
          "Receptor → artery → tendon",
        ],
        answer: 1,
        explanation:
          "A spinal circuit links sensory input to motor output through interneurones.",
      },
      {
        prompt: "What is the brain’s role during a withdrawal reflex?",
        options: [
          "It receives no information",
          "It must consciously decide before withdrawal begins",
          "It receives ascending information while spinal circuits can initiate withdrawal",
          "It becomes inactive",
        ],
        answer: 2,
        explanation:
          "Spinal processing can initiate a response before conscious awareness, while signals also ascend to the brain.",
      },
      {
        prompt:
          grade >= 11
            ? "With a fixed speed, what happens when the modeled conduction path doubles?"
            : "Does the animation measure your own reflex speed?",
        options:
          grade >= 11
            ? [
                "The conduction component doubles",
                "The synaptic delay disappears",
                "The conduction component halves",
                "Nothing changes",
              ]
            : [
                "Yes, it is a clinical test",
                "Yes, if you click quickly",
                "Only on a phone",
                "No; it shows an illustrative pathway",
              ],
        answer: grade >= 11 ? 0 : 3,
        explanation:
          "Time depends on conduction distance, speed and synaptic delays; an illustrative animation is not a human reflex measurement.",
      },
    ],
  };
  return bank[id];
}
export interface SportsSubmission {
  simulation: SportsId;
  prediction: string;
  conclusion: string;
  observations: { config: Record<string, number>; note: string }[];
  answers: number[];
  inspected?: string[];
}
export function assessSports(p: SportsSubmission, grade: number) {
  if (
    !p ||
    !isSportsId(p.simulation) ||
    typeof p.prediction !== "string" ||
    p.prediction.trim().length < 12 ||
    p.prediction.length > 600 ||
    typeof p.conclusion !== "string" ||
    p.conclusion.trim().length < 30 ||
    p.conclusion.length > 2000
  )
    throw Error("Add a prediction and an evidence-based conclusion.");
  if (
    !Array.isArray(p.observations) ||
    p.observations.length < 2 ||
    p.observations.length > 6 ||
    p.observations.some(
      (o) =>
        !o ||
        !validSportsConfig(p.simulation, o.config) ||
        typeof o.note !== "string" ||
        o.note.trim().length < 12 ||
        o.note.length > 600,
    )
  )
    throw Error("Record two to six observations with notes.");
  const configs = new Set(
    p.observations.map((o) =>
      JSON.stringify(SPORTS_CONTROLS[p.simulation].map((k) => o.config[k.key])),
    ),
  );
  if (configs.size < 2)
    throw Error("Compare at least two different conditions.");
  if (
    p.simulation === "skeletal" &&
    (!Array.isArray(p.inspected) ||
      p.inspected.length > 30 ||
      p.inspected.some((k) => !BONE_GUIDE[k]) ||
      new Set(p.inspected).size < 3 ||
      !p.inspected.includes("femur"))
  )
    throw Error("Inspect the femur and at least two other bone groups.");
  const questions = sportsQuestions(p.simulation, grade);
  if (
    !Array.isArray(p.answers) ||
    p.answers.length !== questions.length ||
    p.answers.some((n) => !Number.isInteger(n) || n < 0 || n > 3)
  )
    throw Error("Answer all three understanding checks.");
  const feedback = questions.map((q, i) => ({
      correct: p.answers[i] === q.answer,
      correct_answer: q.answer,
      explanation: q.explanation,
    })),
    score = Math.round(
      (feedback.filter((f) => f.correct).length / questions.length) * 100,
    );
  return {
    score,
    completed: score >= 67,
    feedback,
    observations: p.observations.map((o) => ({
      ...o,
      results: sportsResult(p.simulation, o.config),
    })),
  };
}
