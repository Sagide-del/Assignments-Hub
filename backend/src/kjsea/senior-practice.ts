/** Original Grade 11 practice. These topic sets are not official examination blueprints.
 * Questions are snapshotted and marked by the same private mock engine as bank papers. */
import {
  seededRandom,
  shuffle,
  type MockQuestion,
  type Random,
} from "./mathematics";
type Item = [
  topic: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
];
const question = (item: Item, r: Random, i: number): MockQuestion => {
  const [topic, prompt, correct, distractors, explanation] = item;
  const options = shuffle([correct, ...distractors], r);
  return {
    id: `q-${i + 1}`,
    topicId: topic.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    topic,
    area: topic,
    prompt,
    options,
    correctIndex: options.indexOf(correct),
    explanation,
    sourceGrade: "Grade 11",
  };
};
const int = (r: Random, min: number, max: number) =>
  min + Math.floor(r() * (max - min + 1));
const numeric = (
  topic: string,
  prompt: string,
  answer: number,
  explanation: string,
  unit = "",
): Item => {
  const fmt = (n: number) => `${Number(n.toFixed(4))}${unit ? ` ${unit}` : ""}`;
  const step = Math.max(1, Math.abs(answer) * 0.2);
  const r = seededRandom(
    [...prompt].reduce((sum, ch) => sum + ch.charCodeAt(0), 0),
  );
  const offsets = shuffle([-3, -2, -1, 1, 2, 3], r).slice(0, 3);
  return [
    topic,
    prompt,
    fmt(answer),
    offsets.map((offset) => fmt(answer + offset * step)) as [
      string,
      string,
      string,
    ],
    explanation,
  ];
};
type Template = { topic: string; make: (r: Random) => Item };
const MATHEMATICS: Template[] = [
  {
    topic: "Quadratic equations",
    make: (r) => {
      const a = int(r, 2, 12),
        b = int(r, 13, 24);
      return [
        "Quadratic equations",
        `Solve x² − ${a + b}x + ${a * b} = 0.`,
        `x = ${a} or ${b}`,
        [`x = −${a} or −${b}`, `x = ${a + b} only`, `x = ${a * b} only`],
        `Factorising gives (x − ${a})(x − ${b}) = 0. At least one factor must be zero, so x = ${a} or x = ${b}.`,
      ];
    },
  },
  {
    topic: "Simultaneous equations",
    make: (r) => {
      const x = int(r, 2, 20),
        y = int(r, 2, 20);
      return numeric(
        "Simultaneous equations",
        `Given 2x + y = ${2 * x + y} and x + y = ${x + y}, find x.`,
        x,
        `Subtract the second equation from the first: x = ${2 * x + y} − ${x + y} = ${x}.`,
      );
    },
  },
  {
    topic: "Arithmetic sequences",
    make: (r) => {
      const a = int(r, 2, 20),
        d = int(r, 2, 9),
        n = int(r, 8, 25);
      return numeric(
        "Arithmetic sequences",
        `An arithmetic sequence has first term ${a} and common difference ${d}. Find term ${n}.`,
        a + (n - 1) * d,
        `Use aₙ = a + (n − 1)d = ${a} + (${n} − 1) × ${d} = ${a + (n - 1) * d}.`,
      );
    },
  },
  {
    topic: "Geometric sequences",
    make: (r) => {
      const a = int(r, 2, 9),
        ratio = int(r, 2, 4),
        n = int(r, 3, 6);
      return numeric(
        "Geometric sequences",
        `A geometric sequence starts at ${a} and has common ratio ${ratio}. Find term ${n}.`,
        a * ratio ** (n - 1),
        `The nth term is ar^(n−1), so ${a} × ${ratio}^${n - 1} = ${a * ratio ** (n - 1)}.`,
      );
    },
  },
  {
    topic: "Indices and logarithms",
    make: (r) => {
      const a = int(r, 2, 6),
        b = int(r, 2, 6);
      return numeric(
        "Indices and logarithms",
        `For a positive number x, simplify log₁₀(x^${a}) + log₁₀(x^${b}). What is the coefficient of log₁₀(x)?`,
        a + b,
        `The power rule gives ${a}log₁₀(x) + ${b}log₁₀(x) = ${a + b}log₁₀(x), for x > 0.`,
      );
    },
  },
  {
    topic: "Coordinate geometry",
    make: (r) => {
      const x = int(r, 1, 8),
        y = int(r, 1, 12),
        dx = int(r, 2, 6),
        m = int(r, 2, 7);
      return numeric(
        "Coordinate geometry",
        `Find the gradient of the line through (${x}, ${y}) and (${x + dx}, ${y + m * dx}).`,
        m,
        `Gradient = change in y ÷ change in x = ${m * dx} ÷ ${dx} = ${m}.`,
      );
    },
  },
  {
    topic: "Trigonometry",
    make: (r) => {
      const k = int(r, 2, 15);
      return [
        "Trigonometry",
        `A right-angled triangle has opposite side ${3 * k} cm and hypotenuse ${5 * k} cm relative to angle θ. Find sin θ.`,
        "0.6",
        ["0.8", "0.75", "1.6667"],
        `sin θ = opposite ÷ hypotenuse = ${3 * k}/${5 * k} = 3/5 = 0.6.`,
      ];
    },
  },
  {
    topic: "Vectors",
    make: (r) => {
      const a = int(r, 2, 12),
        b = int(r, 2, 12),
        c = int(r, 2, 12),
        d = int(r, 2, 12);
      return [
        "Vectors",
        `If a = (${a}, ${b}) and b = (${c}, ${d}), find 2a + b.`,
        `(${2 * a + c}, ${2 * b + d})`,
        [
          `(${a + c}, ${b + d})`,
          `(${2 * a + c + 1}, ${2 * b + d})`,
          `(${2 * a + c}, ${2 * b + d + 1})`,
        ],
        `Double each component of a, then add matching components of b: (${2 * a} + ${c}, ${2 * b} + ${d}) = (${2 * a + c}, ${2 * b + d}).`,
      ];
    },
  },
  {
    topic: "Probability without replacement",
    make: (r) => {
      const red = int(r, 3, 10),
        blue = int(r, 3, 10);
      return [
        "Probability without replacement",
        `A bag holds ${red} red and ${blue} blue counters. Two are drawn without replacement. Which expression gives the probability that both are red?`,
        `${red}/${red + blue} × ${red - 1}/${red + blue - 1}`,
        [
          `${red}/${red + blue} × ${red}/${red + blue}`,
          `${blue}/${red + blue} × ${blue - 1}/${red + blue + 1}`,
          `${red - 1}/${red + blue} × ${red}/${red + blue + 1}`,
        ],
        `First-red probability is ${red}/${red + blue}. After one red is removed, ${red - 1} red counters remain among ${red + blue - 1}; multiply the conditional probabilities.`,
      ];
    },
  },
  {
    topic: "Compound interest",
    make: (r) => {
      const p = int(r, 10, 90) * 1000,
        rate = int(r, 2, 9);
      return numeric(
        "Compound interest",
        `KSh ${p} earns ${rate}% compound interest per year. Find its value after two years.`,
        p * (1 + rate / 100) ** 2,
        `Use A = P(1 + r)² = ${p}(1 + ${rate}/100)² = KSh ${Number((p * (1 + rate / 100) ** 2).toFixed(2))}.`,
        "KSh",
      );
    },
  },
  {
    topic: "Matrices",
    make: (r) => {
      const a = int(r, 2, 10),
        b = int(r, 2, 10),
        c = int(r, 2, 10),
        d = int(r, 2, 10);
      return numeric(
        "Matrices",
        `Find the determinant of the matrix with first row [${a}, ${b}] and second row [${c}, ${d}].`,
        a * d - b * c,
        `For a 2 × 2 matrix, determinant = ad − bc = ${a} × ${d} − ${b} × ${c} = ${a * d - b * c}.`,
      );
    },
  },
  {
    topic: "Variation",
    make: (r) => {
      const k = int(r, 2, 10),
        x = int(r, 2, 12),
        next = int(r, 13, 25);
      return numeric(
        "Variation",
        `y varies directly as x². If y = ${k * x * x} when x = ${x}, find y when x = ${next}.`,
        k * next * next,
        `Write y = kx². The constant is ${k * x * x}/${x * x} = ${k}. At x = ${next}, y = ${k} × ${next}² = ${k * next * next}.`,
      );
    },
  },
];
const PHYSICS: Template[] = [
  {
    topic: "Newton’s second law",
    make: (r) => {
      const m = int(r, 2, 20),
        a = int(r, 2, 10);
      return numeric(
        "Newton’s second law",
        `A ${m} kg object accelerates at ${a} m/s² under a constant resultant force. Find that force.`,
        m * a,
        `Resultant force F = ma = ${m} × ${a} = ${m * a} N.`,
        "N",
      );
    },
  },
  {
    topic: "Momentum",
    make: (r) => {
      const m = int(r, 2, 20),
        v = int(r, 2, 15);
      return numeric(
        "Momentum",
        `A ${m} kg trolley moves at ${v} m/s. What is the magnitude of its momentum?`,
        m * v,
        `Momentum p = mv = ${m} × ${v} = ${m * v} kg m/s.`,
        "kg m/s",
      );
    },
  },
  {
    topic: "Kinetic energy",
    make: (r) => {
      const m = int(r, 2, 15) * 2,
        v = int(r, 2, 15);
      return numeric(
        "Kinetic energy",
        `A ${m} kg object moves at ${v} m/s. Calculate its kinetic energy.`,
        0.5 * m * v * v,
        `Eₖ = ½mv² = ½ × ${m} × ${v}² = ${0.5 * m * v * v} J.`,
        "J",
      );
    },
  },
  {
    topic: "Electrical resistance",
    make: (r) => {
      const i = int(r, 2, 10),
        res = int(r, 2, 30);
      return numeric(
        "Electrical resistance",
        `A resistor carries ${i} A when the voltage across it is ${i * res} V. Find its resistance.`,
        res,
        `Ohm’s law gives R = V/I = ${i * res}/${i} = ${res} Ω, assuming constant temperature.`,
        "Ω",
      );
    },
  },
  {
    topic: "Electrical power",
    make: (r) => {
      const i = int(r, 2, 10),
        v = int(r, 10, 24);
      return numeric(
        "Electrical power",
        `An appliance draws ${i} A from a ${v} V supply. Find its electrical power.`,
        i * v,
        `P = VI = ${v} × ${i} = ${v * i} W.`,
        "W",
      );
    },
  },
  {
    topic: "Wave equation",
    make: (r) => {
      const f = int(r, 2, 30) * 10,
        w = int(r, 2, 15);
      return numeric(
        "Wave equation",
        `A wave has frequency ${f} Hz and wavelength ${w} m. Find its speed.`,
        f * w,
        `v = fλ = ${f} × ${w} = ${f * w} m/s.`,
        "m/s",
      );
    },
  },
  {
    topic: "Transformers",
    make: (r) => {
      const v = int(r, 10, 24) * 10,
        k = int(r, 2, 10);
      return numeric(
        "Transformers",
        `An ideal transformer has ${k * 100} primary turns and 100 secondary turns. Its primary voltage is ${v} V. Find the secondary voltage.`,
        v / k,
        `Vₛ/Vₚ = Nₛ/Nₚ, so Vₛ = ${v} × 100/${k * 100} = ${Number((v / k).toFixed(4))} V.`,
        "V",
      );
    },
  },
  {
    topic: "Heat energy",
    make: (r) => {
      const m = int(r, 2, 10),
        t = int(r, 2, 20);
      return numeric(
        "Heat energy",
        `Find the energy needed to raise ${m} kg of water by ${t} °C. Use c = 4200 J/(kg °C), with no heat loss.`,
        m * 4200 * t,
        `Q = mcΔT = ${m} × 4200 × ${t} = ${m * 4200 * t} J.`,
        "J",
      );
    },
  },
  {
    topic: "Density",
    make: (r) => {
      const volume = int(r, 2, 20) * 10,
        d = int(r, 2, 9);
      return numeric(
        "Density",
        `A solid has mass ${volume * d} g and volume ${volume} cm³. Find its density.`,
        d,
        `Density = mass ÷ volume = ${volume * d}/${volume} = ${d} g/cm³.`,
        "g/cm³",
      );
    },
  },
  {
    topic: "Pressure",
    make: (r) => {
      const area = int(r, 2, 10),
        p = int(r, 2, 20) * 100;
      return numeric(
        "Pressure",
        `A normal force of ${p * area} N acts over ${area} m². Calculate the pressure.`,
        p,
        `P = F/A = ${p * area}/${area} = ${p} Pa.`,
        "Pa",
      );
    },
  },
];
const CHEMISTRY: Template[] = [
  {
    topic: "Amount of substance",
    make: (r) => {
      const n = int(r, 2, 12);
      return numeric(
        "Amount of substance",
        `A pure sodium chloride sample has mass ${n * 58.5} g. Find its amount in moles. Use molar mass 58.5 g/mol.`,
        n,
        `n = mass/molar mass = ${n * 58.5}/58.5 = ${n} mol.`,
        "mol",
      );
    },
  },
  {
    topic: "Molar concentration",
    make: (r) => {
      const n = int(r, 2, 10),
        volume = int(r, 2, 8);
      return numeric(
        "Molar concentration",
        `${n} mol of solute is dissolved to make ${volume} dm³ of solution. Calculate concentration.`,
        n / volume,
        `c = n/V = ${n}/${volume} = ${Number((n / volume).toFixed(4))} mol/dm³.`,
        "mol/dm³",
      );
    },
  },
  {
    topic: "Gas volume",
    make: (r) => {
      const n = int(r, 2, 15);
      return numeric(
        "Gas volume",
        `At conditions where the molar gas volume is 24 dm³/mol, what volume is occupied by ${n} mol of an ideal gas?`,
        24 * n,
        `V = n × molar gas volume = ${n} × 24 = ${24 * n} dm³.`,
        "dm³",
      );
    },
  },
  {
    topic: "Reacting ratios",
    make: (r) => {
      const n = int(r, 2, 12);
      return numeric(
        "Reacting ratios",
        `In N₂ + 3H₂ → 2NH₃, how many moles of H₂ are needed to react completely with ${n} mol of N₂?`,
        3 * n,
        `The balanced equation gives 3 mol of H₂ per 1 mol of N₂. Therefore ${n} × 3 = ${3 * n} mol of H₂ is required.`,
        "mol",
      );
    },
  },
  {
    topic: "Dilution",
    make: (r) => {
      const c = int(r, 2, 10),
        v = int(r, 2, 10) * 10,
        k = int(r, 2, 5);
      return numeric(
        "Dilution",
        `${v} cm³ of a ${c} mol/dm³ solution is diluted to ${v * k} cm³. Find the new concentration.`,
        c / k,
        `Solute amount stays constant: c₁V₁ = c₂V₂. Thus c₂ = ${c} × ${v}/${v * k} = ${Number((c / k).toFixed(4))} mol/dm³.`,
        "mol/dm³",
      );
    },
  },
  {
    topic: "Percentage yield",
    make: (r) => {
      const theoretical = int(r, 5, 20) * 10,
        percent = int(r, 5, 9) * 10,
        actual = (theoretical * percent) / 100;
      return numeric(
        "Percentage yield",
        `A reaction has theoretical product mass ${theoretical} g but produces ${actual} g. Find the percentage yield.`,
        percent,
        `Percentage yield = actual/theoretical × 100 = ${actual}/${theoretical} × 100 = ${percent}%.`,
        "%",
      );
    },
  },
  {
    topic: "Relative formula mass",
    make: (r) => {
      const x = int(r, 2, 9),
        y = int(r, 2, 9);
      return numeric(
        "Relative formula mass",
        `A compound has formula X₂Y₃. Relative atomic masses are X = ${x * 10} and Y = ${y * 10}. Find its relative formula mass.`,
        2 * x * 10 + 3 * y * 10,
        `Add all relative atomic masses: 2(${x * 10}) + 3(${y * 10}) = ${2 * x * 10 + 3 * y * 10}. Relative formula mass has no unit.`,
      );
    },
  },
  {
    topic: "Isotopes",
    make: (r) => {
      const p = int(r, 6, 30),
        n = int(r, 15, 40);
      return numeric(
        "Isotopes",
        `An atom has ${p} protons and ${n} neutrons. What is its mass number?`,
        p + n,
        `Mass number is protons + neutrons = ${p} + ${n} = ${p + n}. Electrons are not counted.`,
      );
    },
  },
];
const FIXED: Record<string, Item[]> = {
  Biology: [
    [
      "Enzymes",
      "Why does a very high temperature often stop an enzyme-catalysed reaction?",
      "The active site changes shape",
      [
        "Substrate molecules disappear",
        "All enzymes become acids",
        "The enzyme becomes a carbohydrate",
      ],
      "High temperature can disrupt bonds maintaining the enzyme’s three-dimensional shape. Substrate no longer fits the active site, so activity decreases.",
    ],
    [
      "Osmosis",
      "Plant tissue gains mass in dilute solution. Which explanation best fits?",
      "Water enters cells through partially permeable membranes",
      [
        "Solute always moves out by active transport",
        "Cells manufacture water",
        "Cell walls dissolve",
      ],
      "Water moves by osmosis from higher water potential outside to lower water potential inside through partially permeable cell membranes.",
    ],
    [
      "Genetics",
      "Two heterozygous parents Aa × Aa produce offspring. What proportion is expected to be aa?",
      "1/4",
      ["1/2", "3/4", "All"],
      "The combinations AA, Aa, Aa and aa are equally likely under this simple Mendelian model. One of four is aa.",
    ],
    [
      "Gas exchange",
      "Why do alveoli have a thin lining and a rich capillary supply?",
      "They shorten diffusion distance and maintain concentration gradients",
      [
        "They prevent any water loss",
        "They actively pump oxygen into red blood cells",
        "They store undigested food",
      ],
      "Thin walls reduce the diffusion distance. Continuous blood flow maintains gradients for oxygen and carbon dioxide exchange.",
    ],
    [
      "Photosynthesis",
      "A destarched plant is partly covered with opaque foil and placed in light. Which result supports a role for light in starch production?",
      "Only the uncovered green part turns blue-black with iodine",
      [
        "All parts remain blue-black before iodine",
        "Only the foil turns blue-black",
        "Only the covered part turns blue-black",
      ],
      "Destarching removes stored starch. If the exposed green area alone forms starch, light availability is linked to photosynthesis in this controlled comparison.",
    ],
    [
      "Transport in plants",
      "Which tissue principally transports water and dissolved mineral ions from roots?",
      "Xylem",
      ["Phloem", "Epidermis", "Cambium"],
      "Xylem vessels conduct water and mineral ions. Phloem mainly transports assimilated organic substances such as sucrose.",
    ],
    [
      "Homeostasis",
      "Which response helps lower blood glucose after a carbohydrate-rich meal?",
      "Increased insulin secretion",
      [
        "Decreased insulin secretion",
        "Conversion of all glycogen to glucose",
        "Stopping cellular respiration",
      ],
      "Insulin promotes glucose uptake and storage, including glycogen formation, helping return blood glucose towards its regulated range.",
    ],
    [
      "Ecology",
      "Why is less energy normally available at each successive trophic level?",
      "Organisms use energy in respiration and lose energy in waste",
      [
        "Energy is created at each transfer",
        "Every organism is eaten completely",
        "Consumers stop releasing heat",
      ],
      "Not all biomass is consumed or assimilated, and organisms transfer energy to the surroundings through respiration. Only part reaches the next trophic level.",
    ],
    [
      "Cell division",
      "What separates during anaphase I of meiosis?",
      "Homologous chromosomes",
      [
        "Sister chromatids in every chromosome",
        "The nucleolus only",
        "Individual DNA bases",
      ],
      "In meiosis I, homologous chromosomes separate while sister chromatids generally remain joined at their centromeres until meiosis II.",
    ],
    [
      "Experimental design",
      "A learner compares seed germination at different temperatures. Which factor should be kept constant?",
      "Seed species and water availability",
      [
        "Only the final germination percentage",
        "The temperature in every treatment",
        "The conclusion reached",
      ],
      "A fair comparison changes temperature while controlling other influential factors such as seed species, water and sample size.",
    ],
    [
      "Natural selection",
      "Which statement best explains antibiotic resistance spreading in a bacterial population?",
      "Resistant variants survive treatment and reproduce",
      [
        "Antibiotics deliberately teach every bacterium to resist",
        "All bacteria become resistant because they need to",
        "Resistance prevents any reproduction",
      ],
      "Existing or newly arising heritable resistance can confer a survival advantage during treatment. Survivors reproduce, increasing resistance frequency.",
    ],
    [
      "Excretion",
      "Which process initially moves small dissolved substances from blood into the kidney capsule?",
      "Ultrafiltration",
      ["Transpiration", "Ingestion", "Pollination"],
      "High pressure in the glomerulus filters water and small solutes into the capsule. Blood cells and most large proteins normally remain in the blood.",
    ],
  ],
  English: [
    [
      "Subject–verb agreement",
      "Choose the sentence with correct agreement.",
      "Each of the learners has a notebook.",
      [
        "Each of the learners have a notebook.",
        "Each of the learners are a notebook.",
        "Each of the learners were a notebook.",
      ],
      "The subject is singular “each”; “of the learners” does not make it plural. Therefore the singular verb “has” is correct.",
    ],
    [
      "Reported speech",
      "Amina said, “I am preparing my presentation.” Which is the usual past-tense reported form?",
      "Amina said that she was preparing her presentation.",
      [
        "Amina said that I am preparing my presentation.",
        "Amina says that she were preparing her presentation.",
        "Amina said that she is prepare her presentation.",
      ],
      "With a past reporting verb, “am preparing” normally backshifts to “was preparing”; pronouns change to refer to Amina.",
    ],
    [
      "Conditional sentences",
      "Complete: If I had revised carefully, I ___ the error.",
      "would have noticed",
      ["will notice", "would noticing", "had notice"],
      "A third conditional uses if + past perfect and would have + past participle for an unreal past result.",
    ],
    [
      "Inference",
      "“Despite the empty stands, the team warmed up with the same discipline.” What is most strongly suggested?",
      "The team’s preparation does not depend on a crowd.",
      [
        "The team has cancelled the match.",
        "All supporters dislike the team.",
        "The players have never trained before.",
      ],
      "The contrast between empty stands and unchanged discipline supports consistent preparation. The other claims are not supported by the sentence.",
    ],
    [
      "Literary devices",
      "“The classroom was a beehive of activity” primarily uses which device?",
      "Metaphor",
      ["Simile", "Onomatopoeia", "Rhetorical question"],
      "The classroom is directly described as a beehive to suggest busy, coordinated activity, without using “like” or “as”.",
    ],
    [
      "Formal communication",
      "Which opening best suits a formal request for permission to use a laboratory?",
      "I am writing to request permission to use the laboratory.",
      [
        "Hey, unlock the lab for us now.",
        "You must let us in, obviously.",
        "Guess what, we want the lab!",
      ],
      "A formal request states its purpose clearly and respectfully, using an appropriate register for the recipient.",
    ],
    [
      "Cohesion",
      "Choose the best connector: The experiment was repeated; ___, the results remained inconsistent.",
      "however",
      ["therefore", "similarly", "for example"],
      "“However” marks contrast: repeating the experiment might be expected to improve consistency, but it did not.",
    ],
    [
      "Passive voice",
      "Choose the accurate passive form of “The technician repaired the microscope.”",
      "The microscope was repaired by the technician.",
      [
        "The technician was repaired by the microscope.",
        "The microscope has repair the technician.",
        "The microscope were repairing by the technician.",
      ],
      "The object becomes the passive subject. A singular past-tense passive uses “was” + past participle, “repaired”.",
    ],
    [
      "Punctuation",
      "Which sentence correctly uses an apostrophe for notebooks belonging to several learners?",
      "The learners’ notebooks were collected.",
      [
        "The learner’s notebooks were collected.",
        "The learners notebooks’ were collected.",
        "The learners’s notebooks were collected.",
      ],
      "For the regular plural “learners”, possession is marked by an apostrophe after the final s. The singular learner’s would refer to one learner.",
    ],
    [
      "Critical reading",
      "An article claims a study proves that every student learns best at night, but only surveys five volunteers. What is the main weakness?",
      "The sample is too small and unrepresentative for that universal claim.",
      [
        "Surveys can never collect any useful evidence.",
        "Volunteers cannot answer questions.",
        "Night study is always impossible.",
      ],
      "A tiny self-selected sample does not support a conclusion about every student. The issue is the strength and scope of the evidence.",
    ],
    [
      "Paragraph structure",
      "Which sentence is the strongest topic sentence for a paragraph about rainwater harvesting at school?",
      "Rainwater harvesting can reduce the school’s demand for piped water.",
      [
        "A blue bucket stood near the door.",
        "Yesterday was a Tuesday.",
        "Some learners prefer football.",
      ],
      "A topic sentence introduces the paragraph’s main idea, which supporting examples and explanations can then develop.",
    ],
    [
      "Word choice",
      "Complete: The two investigations reached ___ conclusions, so the group compared their methods.",
      "conflicting",
      ["identical", "unanimous", "equivalent"],
      "“Conflicting” means incompatible or contradictory, explaining why the methods needed comparison.",
    ],
  ],
  Kiswahili: [
    [
      "Upatanisho wa kisarufi",
      "Chagua sentensi yenye upatanisho sahihi.",
      "Vitabu hivi vimepangwa vizuri.",
      [
        "Vitabu hii imepangwa vizuri.",
        "Vitabu hawa wamepangwa vizuri.",
        "Vitabu hiki kimepangwa vizuri.",
      ],
      "“Vitabu” ni wingi wa “kitabu” katika ngeli ya KI–VI. Viambishi “hivi” na “vime-” vinapatana na wingi huo.",
    ],
    [
      "Usemi wa taarifa",
      "Badili katika usemi wa taarifa: Asha alisema, “Ninasoma.”",
      "Asha alisema kwamba alikuwa akisoma.",
      [
        "Asha alisema kwamba ninasoma.",
        "Asha alisema kwamba tulisoma.",
        "Asha alisema kwamba wanasoma.",
      ],
      "Kiambishi cha nafsi hubadilika kumrejelea Asha. Katika muktadha wa taarifa ya wakati uliopita, “alikuwa akisoma” huonyesha kitendo kilichokuwa kikiendelea.",
    ],
    [
      "Tamathali za usemi",
      "“Mwalimu ni taa ya jamii” ni mfano wa nini?",
      "Sitiari",
      ["Tashbihi", "Tanakali za sauti", "Swali la balagha"],
      "Sitiari hulinganisha vitu moja kwa moja bila kutumia “kama” au “mithili ya”. Mwalimu anafananishwa na taa inayoongoza jamii.",
    ],
    [
      "Viunganishi",
      "Kamilisha: Alijitayarisha vizuri, ___ hakushinda shindano.",
      "lakini",
      ["kwa sababu", "ili", "kwamba"],
      "“Lakini” huonyesha ukinzani kati ya maandalizi mazuri na matokeo ya kutoshinda.",
    ],
    [
      "Nyakati",
      "Sentensi “Wanafunzi walikuwa wakiandika” inaonyesha nini?",
      "Kitendo kilichokuwa kikiendelea wakati uliopita",
      [
        "Kitendo kitakachofanyika kesho",
        "Amri kwa wanafunzi",
        "Kitendo kisichowahi kufanyika",
      ],
      "Muundo “walikuwa waki-” huonyesha hali ya kuendelea kwa kitendo katika wakati uliopita.",
    ],
    [
      "Kauli za vitenzi",
      "Katika “Chakula kimepikwa”, kitenzi kiko katika kauli gani?",
      "Kutendwa",
      ["Kutenda", "Kutendana", "Kutendeka"],
      "Kiambishi cha kutendwa katika “pikwa” huonyesha kuwa chakula kimefanyiwa kitendo cha kupikwa.",
    ],
    [
      "Methali",
      "Methali “Haraka haraka haina baraka” inashauri nini?",
      "Kufanya kazi kwa makini badala ya pupa",
      [
        "Kuchelewesha kila kazi bila sababu",
        "Kukataa kufanya kazi",
        "Kushindana bila kufuata sheria",
      ],
      "Methali inakumbusha kuwa pupa inaweza kuleta makosa; umakini na maandalizi ni muhimu kwa matokeo bora.",
    ],
    [
      "Uandishi rasmi",
      "Ni kipengele gani muhimu katika barua rasmi ya kuomba ruhusa?",
      "Kueleza ombi kwa uwazi na heshima",
      [
        "Kutumia matusi ili kusisitiza",
        "Kuacha kutaja lengo la barua",
        "Kutumia lugha ya mzaha pekee",
      ],
      "Barua rasmi inahitaji lengo linaloeleweka na lugha inayomheshimu mpokeaji, pamoja na muundo unaofaa.",
    ],
    [
      "Ufahamu",
      "“Ingawa mvua ilinyesha, wakulima waliendelea kupanda.” Neno “ingawa” linaonyesha nini?",
      "Hali ya kukubali jambo kinyume na matarajio",
      ["Sababu pekee ya kupanda", "Muda ujao wa kupanda", "Orodha ya wakulima"],
      "“Ingawa” huanzisha hali ambayo ingeweza kuzuia kitendo, lakini kitendo bado kinaendelea.",
    ],
    [
      "Ukanushaji",
      "Kanusha sentensi “Mwanafunzi amefika.”",
      "Mwanafunzi hajafika.",
      ["Mwanafunzi hamefika.", "Mwanafunzi hakafika.", "Mwanafunzi hatufika."],
      "Ukanushaji wa hali timilifu “ame-” kwa nafsi hii hutumia “haja-”: hajafika.",
    ],
    [
      "Nomino dhahania",
      "Ni neno lipi linalotaja hali isiyoshikika kwa mikono?",
      "Uaminifu",
      ["Meza", "Kalamu", "Dirisha"],
      "“Uaminifu” ni nomino dhahania inayotaja sifa au hali. Meza, kalamu na dirisha ni vitu vinavyoshikika.",
    ],
    [
      "Hoja na ushahidi",
      "Ni njia gani bora ya kuimarisha hoja katika insha ya mjadala?",
      "Kutoa mifano inayohusiana na kueleza uhusiano wake na hoja",
      [
        "Kurudia dai bila maelezo",
        "Kuwatusi wanaopinga",
        "Kutumia takwimu zisizo na chanzo",
      ],
      "Mifano na maelezo yanayofaa husaidia msomaji kuona kwa nini hoja ina msingi. Kurudia dai pekee hakuongezi ushahidi.",
    ],
  ],
  "Computer Studies": [
    [
      "Algorithms",
      "A sorted list contains 1024 items. Which approach repeatedly halves the remaining search interval?",
      "Binary search",
      ["Linear search", "Bubble sort", "Sequential file copying"],
      "Binary search compares the target with the middle item and discards half of the ordered interval at each step. Sorting is a prerequisite.",
    ],
    [
      "Boolean logic",
      "For Boolean variables A = true and B = false, what is A AND NOT B?",
      "True",
      ["False", "Undefined for all inputs", "Equal to B"],
      "B is false, so NOT B is true. A is also true. An AND expression is true only when both operands are true; therefore the result is true.",
    ],
    [
      "Databases",
      "What is the main purpose of a primary key in a relational table?",
      "Uniquely identify each row",
      [
        "Encrypt every field",
        "Store only decimal values",
        "Automatically sort every query",
      ],
      "A primary key is unique and non-null, allowing a row to be identified reliably and referenced through relationships.",
    ],
    [
      "Database design",
      "A learner’s phone number is repeated in every borrowing record. Which design change best reduces update anomalies?",
      "Keep learner details in a separate table linked by learner ID",
      [
        "Repeat the phone number in more columns",
        "Remove all identifiers",
        "Store every record as an image",
      ],
      "Separating learner data from borrowing transactions avoids repeatedly storing the same fact. A foreign key links each transaction to its learner.",
    ],
    [
      "Networks",
      "Which device forwards packets between different IP networks?",
      "Router",
      ["Keyboard", "Scanner", "Display monitor"],
      "Routers use network addresses and routing information to forward packets between networks. A switch normally forwards frames within a local network.",
    ],
    [
      "Cybersecurity",
      "A message asks you to enter your school password on an unfamiliar login page. What is the safest response?",
      "Open the school’s known website independently and verify the request",
      [
        "Enter the password to check whether it works",
        "Forward your password to classmates",
        "Disable two-factor authentication",
      ],
      "Phishing imitates trusted services. Independently using the known address and confirming the request avoids relying on the suspicious link.",
    ],
    [
      "Programming",
      "What value is printed by Python code: total = 0; then for each n in [2, 4, 6], add n to total; finally print(total)?",
      "12",
      ["6", "3", "246"],
      "The accumulator starts at zero and adds 2, then 4, then 6: 0 + 2 + 4 + 6 = 12.",
    ],
    [
      "Testing",
      "An input must be an integer from 1 to 100 inclusive. Which set best tests the boundaries?",
      "0, 1, 100, 101",
      ["20, 30, 40, 50", "10, 10, 10, 10", "Only 50"],
      "Boundary tests include the smallest and largest valid values plus the immediately adjacent invalid values, helping detect off-by-one errors.",
    ],
    [
      "Data representation",
      "What is the decimal value of binary 101101?",
      "45",
      ["41", "44", "53"],
      "Using place values 32, 16, 8, 4, 2 and 1 gives 32 + 8 + 4 + 1 = 45.",
    ],
    [
      "SQL",
      "Which SQL clause restricts returned rows to those meeting a condition?",
      "WHERE",
      ["ORDER BY", "CREATE TABLE", "DROP DATABASE"],
      "WHERE filters rows using a condition. ORDER BY changes result order; it does not choose which rows qualify.",
    ],
    [
      "Data protection",
      "Which practice best limits access to sensitive learner records?",
      "Give each user only the permissions required for their role",
      [
        "Share one administrator password with everyone",
        "Publish all records on a public page",
        "Remove authentication to make access faster",
      ],
      "Least privilege limits unnecessary access. Separate accounts and role-based permissions also make changes easier to attribute and audit.",
    ],
    [
      "Backups",
      "Why should a backup restore be tested?",
      "A backup is useful only if the required data can actually be recovered",
      [
        "Testing guarantees that no hardware can ever fail",
        "Testing removes the need for future backups",
        "Every backup file is automatically complete",
      ],
      "A successful restore verifies that the backup is readable, sufficiently complete and usable in the recovery process. Merely creating a file does not establish this.",
    ],
  ],
  "Business Studies": [
    [
      "Break-even analysis",
      "A business has fixed costs of KSh 60,000, a selling price of KSh 500 per unit and variable cost of KSh 300 per unit. Find break-even output.",
      "300 units",
      ["120 units", "200 units", "600 units"],
      "Contribution per unit = 500 − 300 = KSh 200. Break-even output = fixed costs/contribution = 60,000/200 = 300 units.",
    ],
    [
      "Gross profit",
      "Goods costing KSh 80,000 are sold for KSh 110,000. What is gross profit before other expenses?",
      "KSh 30,000",
      ["KSh 190,000", "KSh 80,000", "KSh 110,000"],
      "Gross profit = sales revenue − cost of goods sold = 110,000 − 80,000 = KSh 30,000. Other operating expenses are deducted later to find net profit.",
    ],
    [
      "Working capital",
      "Current assets are KSh 150,000 and current liabilities are KSh 90,000. Find working capital.",
      "KSh 60,000",
      ["KSh 240,000", "KSh 90,000", "KSh −60,000"],
      "Working capital = current assets − current liabilities = 150,000 − 90,000 = KSh 60,000, a measure of short-term financial resources.",
    ],
    [
      "Demand",
      "Other factors held constant, what usually happens to quantity demanded when the price of a normal good rises?",
      "Quantity demanded falls",
      [
        "Quantity demanded must double",
        "Demand becomes unlimited",
        "Quantity supplied becomes zero",
      ],
      "The law of demand describes an inverse relationship between a good’s own price and quantity demanded, with other influences held constant.",
    ],
    [
      "Opportunity cost",
      "A school uses a room as a computer lab instead of renting it out. What is an opportunity cost of that choice?",
      "The rental income forgone",
      [
        "The value of every building in the county",
        "All income ever earned by the school",
        "Only the room’s wall colour",
      ],
      "Opportunity cost is the value of the next best alternative sacrificed. Here, using the room prevents earning the available rent.",
    ],
    [
      "Bookkeeping",
      "Equipment is bought for cash. Which double-entry treatment records the purchase?",
      "Debit equipment and credit cash",
      [
        "Debit cash and credit equipment",
        "Debit sales and credit purchases",
        "Credit both equipment and cash",
      ],
      "Equipment, an asset, increases and is debited. Cash, another asset, decreases and is credited. Total assets need not increase overall.",
    ],
    [
      "Insurance",
      "Why does a business insure valuable equipment against specified risks?",
      "To transfer specified financial risks in exchange for premiums",
      [
        "To guarantee that equipment can never break",
        "To avoid all safety measures",
        "To ensure sales always increase",
      ],
      "Insurance can compensate covered losses under policy terms. It does not eliminate the underlying hazard or guarantee business success.",
    ],
    [
      "Cash flow",
      "Why can a profitable business still struggle to pay bills?",
      "Revenue may be recorded before cash is collected",
      [
        "Profit and cash are always identical",
        "Credit sales never generate revenue",
        "Expenses are never paid in cash",
      ],
      "Credit sales can create accounting profit while cash remains tied up in receivables. Payment timing and working capital affect liquidity.",
    ],
    [
      "Market research",
      "Which method directly collects primary information from potential customers?",
      "A survey designed and conducted by the business",
      [
        "Reading an old newspaper report",
        "Copying last year’s national statistics",
        "Quoting another company’s published survey",
      ],
      "Primary data are collected firsthand for the current research purpose. Existing published sources are secondary data.",
    ],
    [
      "Productivity",
      "A workshop makes 480 items in 60 worker-hours. Find labour productivity.",
      "8 items per worker-hour",
      [
        "0.125 items per worker-hour",
        "420 items per worker-hour",
        "540 items per worker-hour",
      ],
      "Labour productivity = output/labour input = 480/60 = 8 items per worker-hour.",
    ],
    [
      "Consumer protection",
      "A product has a known serious defect. What is the most responsible business response?",
      "Inform customers and arrange an appropriate remedy",
      [
        "Hide the defect and increase advertising",
        "Blame every customer without investigation",
        "Remove all safety instructions",
      ],
      "Transparent information and a suitable repair, replacement, recall or refund process help protect consumers. The precise remedy depends on the defect and applicable requirements.",
    ],
    [
      "Entrepreneurship",
      "Why prepare a cash-flow forecast before starting a business?",
      "To estimate when cash shortages may occur",
      [
        "To guarantee a fixed profit",
        "To replace keeping financial records",
        "To prove that customers must buy",
      ],
      "A forecast estimates cash inflows and outflows over time, helping plan funding and payments. It is a planning tool, not a guarantee.",
    ],
  ],
  Geography: [
    [
      "Map scale",
      "On a 1:50,000 map, a road measures 6 cm. Find its ground length.",
      "3 km",
      ["0.3 km", "30 km", "300 km"],
      "1 cm represents 50,000 cm = 0.5 km. Therefore 6 cm represents 6 × 0.5 = 3 km.",
    ],
    [
      "Contour interpretation",
      "What do closely spaced contours usually indicate?",
      "A steep slope",
      [
        "A flat plain",
        "A guaranteed river channel",
        "A lower contour interval everywhere",
      ],
      "For a fixed contour interval, a large change in elevation over a short horizontal distance indicates a steep slope.",
    ],
    [
      "Rainfall formation",
      "Moist air rises over a mountain, cools and forms rain on the windward slope. Which process is described?",
      "Relief rainfall",
      ["A solar eclipse", "A tidal surge", "An earthquake"],
      "Orographic or relief rainfall occurs when a barrier forces moist air upward. Cooling causes condensation and potentially precipitation.",
    ],
    [
      "River processes",
      "Why can river deposition increase where a river enters a lake?",
      "Flow speed decreases and transport capacity falls",
      [
        "Water stops containing any sediment",
        "All particles become dissolved instantly",
        "Gravity stops acting",
      ],
      "Slower water has less energy to transport sediment, so some material is deposited. Repeated deposition may build a delta under suitable conditions.",
    ],
    [
      "Population",
      "A town has 12,000 births and 7,000 deaths in a year. Ignoring migration, what is its natural increase?",
      "5,000 people",
      ["19,000 people", "7,000 people", "−5,000 people"],
      "Natural increase is births minus deaths: 12,000 − 7,000 = 5,000. Migration must be considered separately for total population change.",
    ],
    [
      "Plate tectonics",
      "What commonly happens where an oceanic plate converges with a continental plate?",
      "The denser oceanic plate subducts",
      [
        "Both plates stop moving permanently",
        "The continent always sinks under the oceanic plate",
        "A mid-ocean ridge must form",
      ],
      "Oceanic lithosphere is generally denser and can descend beneath continental lithosphere, producing a subduction zone with associated seismic and volcanic activity.",
    ],
    [
      "Fieldwork",
      "Why should rainfall measurements be taken at the same time each day?",
      "To keep observation intervals comparable",
      [
        "To make every daily value identical",
        "To prevent any evaporation worldwide",
        "To ensure the forecast is always correct",
      ],
      "Consistent timing makes accumulation periods comparable and reduces differences caused by unequal measurement intervals.",
    ],
    [
      "Soil erosion",
      "Which practice most directly reduces runoff speed on a cultivated slope?",
      "Contour farming",
      [
        "Ploughing straight downhill",
        "Removing all ground cover",
        "Burning crop residues before every storm",
      ],
      "Cultivation along contour lines creates barriers across the slope, slowing surface runoff and helping reduce soil loss.",
    ],
    [
      "Climate data",
      "Why does a single unusually cold day not disprove a long-term warming trend?",
      "Climate trends use long-term patterns, whereas one day is weather",
      [
        "Weather and climate are unrelated in every way",
        "One day defines a whole century’s climate",
        "Temperature cannot be measured",
      ],
      "Weather varies over short periods. Climate trends describe patterns over many years and must be assessed using suitable long-term data.",
    ],
    [
      "Geographical information systems",
      "What is a major benefit of layering roads, flood zones and settlement data in a GIS?",
      "It helps analyse where transport and people may be exposed to flooding",
      [
        "It removes the need to check data quality",
        "It guarantees there will be no floods",
        "It converts all locations into the same point",
      ],
      "Spatial overlays reveal relationships between locations and features. Accuracy, scale, recency and interpretation still matter.",
    ],
    [
      "Sustainable resources",
      "Why can uncontrolled groundwater abstraction lower a water table?",
      "Withdrawal can exceed recharge",
      [
        "Pumping creates new rain immediately",
        "Aquifers cannot contain water",
        "All underground rocks dissolve at once",
      ],
      "If removal exceeds replenishment over time, groundwater storage decreases and the water table can fall.",
    ],
    [
      "Sampling",
      "Why might systematic sampling be useful along a river transect?",
      "Regularly spaced sites make coverage consistent",
      [
        "It always includes every possible location",
        "It eliminates all measurement error",
        "It guarantees a preferred result",
      ],
      "Sampling at defined intervals provides a repeatable coverage pattern, though periodic spatial patterns and access constraints still need consideration.",
    ],
  ],
  Agriculture: [
    [
      "Experimental design",
      "A class compares fertiliser treatments. Why include plots receiving no added fertiliser?",
      "To provide a baseline for comparison",
      [
        "To guarantee the highest yield",
        "To remove the need for replication",
        "To ensure all soils become identical",
      ],
      "A control treatment helps distinguish treatment effects from background growth. Comparable conditions and replication are also needed.",
    ],
    [
      "Soil pH",
      "Why should a farmer test soil before applying lime?",
      "Lime requirements depend on acidity and soil conditions",
      [
        "Lime always supplies all nutrients needed",
        "Every crop requires strongly alkaline soil",
        "Soil pH cannot affect plants",
      ],
      "A soil test helps establish whether acidity correction is needed and supports an appropriate application rate. Excess lime can create nutrient availability problems.",
    ],
    [
      "Crop rotation",
      "Why may including legumes in a rotation benefit subsequent crops?",
      "Symbiotic bacteria can fix atmospheric nitrogen",
      [
        "Legumes create phosphorus from sunlight",
        "All legumes remove every soil pest",
        "Crop rotation makes soil tests unnecessary",
      ],
      "Rhizobia in suitable legume root nodules fix nitrogen. Residues can contribute nitrogen after decomposition, though benefits depend on management and conditions.",
    ],
    [
      "Integrated pest management",
      "Which approach best represents integrated pest management?",
      "Monitor pests and combine suitable biological, cultural and targeted controls",
      [
        "Spray the same pesticide daily regardless of need",
        "Use the highest possible chemical dose",
        "Ignore pest identification",
      ],
      "IPM uses monitoring and several compatible methods to manage pests while reducing unnecessary pesticide use and resistance pressure.",
    ],
    [
      "Irrigation",
      "A drip system applies water near the root zone. What is a common advantage?",
      "Reduced water loss compared with broad surface wetting",
      [
        "No maintenance is ever required",
        "Water quality never affects emitters",
        "Plants no longer need mineral nutrients",
      ],
      "Targeted application can reduce evaporation and runoff. System design, filtration, maintenance and scheduling remain important.",
    ],
    [
      "Livestock biosecurity",
      "Why isolate newly introduced animals before mixing them with a herd?",
      "To observe for disease and reduce transmission risk",
      [
        "To guarantee they will never need veterinary care",
        "To make vaccination unnecessary",
        "To increase contact with every other animal",
      ],
      "Quarantine and observation reduce the chance of introducing disease. They complement suitable veterinary advice and other biosecurity measures.",
    ],
    [
      "Farm records",
      "Which record best supports calculating gross margin for a crop enterprise?",
      "Enterprise revenue and variable costs",
      [
        "Only the farmer’s name",
        "Only rainfall totals",
        "Only the colour of the store",
      ],
      "Gross margin is enterprise revenue minus variable costs. Accurate records allow comparisons and support management decisions.",
    ],
    [
      "Soil structure",
      "How can adding well-decomposed organic matter benefit many cultivated soils?",
      "Improve aggregation and water-holding characteristics",
      [
        "Permanently eliminate every weed",
        "Replace all essential plant nutrients in every soil",
        "Make drainage unnecessary everywhere",
      ],
      "Organic matter can support stable aggregates, water retention and biological activity. Effects depend on soil type, material and management.",
    ],
    [
      "Seed quality",
      "Why test germination before sowing stored seed?",
      "To estimate the proportion likely to produce seedlings under test conditions",
      [
        "To guarantee every seed survives in the field",
        "To determine the market price of every crop",
        "To change the seed’s species",
      ],
      "A germination test estimates viability under controlled conditions and helps plan sowing. Field emergence can still differ.",
    ],
    [
      "Animal nutrition",
      "Why must a balanced ration match an animal’s age and production stage?",
      "Nutrient requirements change with growth and production",
      [
        "All animals require identical quantities forever",
        "Water replaces the need for every nutrient",
        "Only feed colour determines nutrition",
      ],
      "Growth, pregnancy, lactation and maintenance place different demands on energy, protein, minerals and other nutrients.",
    ],
    [
      "Erosion control",
      "Why retain ground cover between crop rows on erosion-prone land?",
      "It protects soil from raindrop impact and slows runoff",
      [
        "It guarantees that no water enters the soil",
        "It makes every pest disappear",
        "It removes the need to manage competition",
      ],
      "Cover can reduce soil detachment and runoff while improving infiltration. Species choice and competition with the crop still require management.",
    ],
    [
      "Post-harvest handling",
      "Why dry grain adequately before safe storage?",
      "To reduce conditions favouring mould growth and deterioration",
      [
        "To increase its moisture content",
        "To guarantee that all toxins already present disappear",
        "To replace cleaning and pest control",
      ],
      "Appropriate drying and storage conditions reduce spoilage risk. Drying does not reliably remove toxins already formed, and monitoring remains necessary.",
    ],
  ],
  "History and Government": [
    [
      "Historical evidence",
      "Which is a primary source for studying a public meeting held in 1963?",
      "A diary written by a participant at the time",
      [
        "A fictional novel written about the event fifty years later",
        "A modern textbook summary",
        "An unsourced social media post",
      ],
      "A contemporary participant’s diary is firsthand evidence. It still needs evaluation for perspective, reliability and corroboration.",
    ],
    [
      "Source evaluation",
      "Two eyewitness accounts disagree about an event. What should a historian do first?",
      "Compare their context, perspective and other available evidence",
      [
        "Assume the longer account must be correct",
        "Discard every source without reading it",
        "Choose whichever account supports a preferred conclusion",
      ],
      "Historical interpretation considers provenance, purpose, perspective and corroboration rather than accepting an account solely because it is detailed.",
    ],
    [
      "Constitutionalism",
      "What does constitutionalism require?",
      "Government power is exercised within constitutional limits",
      [
        "Leaders may ignore all legal limits",
        "Only private citizens must follow the constitution",
        "Elections remove the need for checks and balances",
      ],
      "Constitutionalism places legal limits on power and supports accountability. Holding office does not exempt a leader from the constitution.",
    ],
    [
      "Separation of powers",
      "Why separate legislative, executive and judicial functions?",
      "To limit concentration of power and support checks and balances",
      [
        "To prevent any cooperation between institutions",
        "To place all power in one office",
        "To remove judicial independence",
      ],
      "Distinct functions and institutional oversight can reduce abuse of power while preserving lawful cooperation.",
    ],
    [
      "Devolution",
      "A key purpose of devolution in Kenya is to do what?",
      "Bring specified governance functions and services closer to communities",
      [
        "Replace the Constitution with county rules",
        "Abolish national government entirely",
        "Remove all public accountability",
      ],
      "Devolution distributes constitutionally assigned functions and resources between levels of government, supporting participation and local service delivery.",
    ],
    [
      "Public participation",
      "Which action best supports meaningful public participation in a proposed county project?",
      "Provide accessible information and a real opportunity to submit views",
      [
        "Announce a decision only after construction finishes",
        "Invite only people guaranteed to agree",
        "Hide the project budget from all residents",
      ],
      "Participation requires timely, accessible information and an opportunity for affected people to contribute before decisions are finalised.",
    ],
    [
      "Chronology",
      "Why is establishing the sequence of historical events useful?",
      "It helps assess possible relationships between causes and consequences",
      [
        "It proves that every earlier event caused every later event",
        "It removes the need for evidence",
        "It makes every historical account unbiased",
      ],
      "Chronology helps test whether a proposed cause preceded an outcome, but timing alone does not establish causation.",
    ],
    [
      "Trade and society",
      "Why can archaeological finds of non-local goods suggest long-distance exchange?",
      "The objects or materials originated outside the local area",
      [
        "Every object was manufactured where it was found",
        "Trade leaves no material evidence",
        "All distant communities used identical resources",
      ],
      "Provenance and distribution of non-local materials can support an interpretation of exchange, considered alongside dating and other evidence.",
    ],
    [
      "Citizenship",
      "Which is an example of responsible civic action?",
      "Using lawful channels to raise concerns about public services",
      [
        "Destroying public records to hide concerns",
        "Spreading a claim known to be false",
        "Preventing others from expressing lawful views",
      ],
      "Responsible participation combines engagement with respect for the law, evidence and the rights of others.",
    ],
    [
      "Democracy",
      "Why are regular competitive elections important in a representative democracy?",
      "They allow citizens to choose representatives and hold them accountable",
      [
        "They guarantee every elected official is always correct",
        "They replace all constitutional rights",
        "They make an independent judiciary unnecessary",
      ],
      "Elections provide a mechanism for representation and accountability, alongside other institutions and protections needed for democracy.",
    ],
    [
      "Oral traditions",
      "What is a sound method when using oral testimony as historical evidence?",
      "Compare accounts and consider transmission and context",
      [
        "Treat every detail as automatically exact",
        "Assume no oral account can ever be useful",
        "Ignore when and why the account was recorded",
      ],
      "Oral testimony can preserve valuable knowledge. Critical evaluation and corroboration help distinguish consistent evidence from later changes or interpretation.",
    ],
    [
      "Causation",
      "Which explanation best recognises multiple causes of a historical change?",
      "It considers economic, political and social influences together",
      [
        "It assumes every change has one identical cause",
        "It ignores evidence that complicates a story",
        "It treats a later consequence as the only earlier cause",
      ],
      "Complex historical developments often involve interacting causes. An explanation should weigh relevant evidence rather than force a single unsupported cause.",
    ],
  ],
};
const NUMERIC: Record<string, Template[]> = {
  Mathematics: MATHEMATICS,
  Physics: PHYSICS,
  Chemistry: CHEMISTRY,
};
export function seniorSubjects(grade: string) {
  if (grade !== "Grade 11") return [];
  return [
    ...Object.entries(NUMERIC).map(([subject, templates]) => ({
      subject,
      questionCount: 40,
      topicCount: templates.length,
      varied: true,
    })),
    ...Object.entries(FIXED).map(([subject, items]) => ({
      subject,
      questionCount: items.length,
      topicCount: new Set(items.map((i) => i[0])).size,
      varied: false,
    })),
  ];
}
export function seniorPaper(subject: string, seed: number): MockQuestion[] {
  const canonical = seniorSubjects("Grade 11").find(
    (s) => s.subject.toLowerCase() === subject.trim().toLowerCase(),
  )?.subject;
  if (!canonical) throw new Error("Unsupported senior practice subject");
  const r = seededRandom(seed);
  const templates = NUMERIC[canonical];
  if (!templates)
    return shuffle(FIXED[canonical], r).map((item, i) => question(item, r, i));
  const seen = new Set<string>();
  const selected = shuffle(
    Array.from({ length: 40 }, (_, i) => templates[i % templates.length]),
    r,
  );
  return selected.map((template, i) => {
    let item = template.make(r),
      tries = 0;
    while (seen.has(item[1]) && tries++ < 200) item = template.make(r);
    if (seen.has(item[1]))
      throw new Error("Could not generate distinct senior questions");
    seen.add(item[1]);
    return question(item, r, i);
  });
}
