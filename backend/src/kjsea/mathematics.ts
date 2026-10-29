/** Original, parameterised revision questions. Topic groups are a practice blueprint,
 * not a verified transcription of the current KICD Grade 9 subject design. */
export type Visual =
  | { kind: "table"; caption: string; headings: string[]; rows: string[][] }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number }
  | { kind: "circle"; radius: number }
  | { kind: "angles"; known: number }
  | { kind: "point"; x: number; y: number }
  | { kind: "bars"; labels: string[]; values: number[] };
export interface MockQuestion {
  manualSelfReview?: boolean;
  section?: string;
  marks?: number;
  responseType?: "CHOICE" | "STRUCTURED";
  parts?: import("./exam-paper").StructuredPart[];
  passage?: { title: string; text: string };
  contentHtml?: string;
  diagramUrl?: string;
  diagramAlt?: string;
  sourceQuestionId?: number;
  sourceGrade?: string;
  id: string;
  topicId: string;
  topic: string;
  area: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  visual?: Visual;
}
export interface Topic {
  id: string;
  name: string;
  area: string;
  visual: boolean;
  make: (r: Random) => Omit<MockQuestion, "id" | "topicId" | "topic" | "area">;
}
export type Random = () => number;
export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function int(r: Random, min: number, max: number) {
  return Math.floor(r() * (max - min + 1)) + min;
}
export function shuffle<T>(items: T[], r: Random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = int(r, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function show(n: number) {
  return String(Number(n.toFixed(3)));
}
function question(
  r: Random,
  prompt: string,
  correct: number,
  explanation: string,
  visual?: Visual,
  unit = "",
) {
  const rounded = Number(correct.toFixed(3));
  const choices = new Set([rounded]);
  const offsets = shuffle([1, -1, 2, -2, 5, -5, 10, -10], r);
  for (const n of offsets) {
    choices.add(Number((rounded + n).toFixed(3)));
    if (choices.size === 4) break;
  }
  const values = shuffle([...choices], r);
  return {
    prompt,
    options: values.map((n) => `${show(n)}${unit}`),
    correctIndex: values.indexOf(rounded),
    explanation,
    ...(visual ? { visual } : {}),
  };
}
const table = (
  caption: string,
  headings: string[],
  rows: (string | number)[][],
): Visual => ({
  kind: "table",
  caption,
  headings,
  rows: rows.map((row) => row.map(String)),
});
const N = "Number",
  A = "Algebra",
  G = "Geometry",
  M = "Measurement",
  D = "Data and probability";
export const TOPICS: Topic[] = [
  {
    id: "integers",
    name: "Integer operations",
    area: N,
    visual: false,
    make: (r) => {
      const a = int(r, 5, 45),
        b = int(r, 2, 20);
      return question(
        r,
        `Calculate −${a} + ${b}.`,
        b - a,
        `Start at −${a} and move ${b} units to the right: −${a} + ${b} = ${b - a}.`,
      );
    },
  },
  {
    id: "fractions",
    name: "Fractions of quantities",
    area: N,
    visual: false,
    make: (r) => {
      const denominator = int(r, 3, 9),
        numerator = int(r, 1, denominator - 1),
        k = int(r, 3, 15);
      return question(
        r,
        `Find ${numerator}/${denominator} of ${denominator * k} books.`,
        numerator * k,
        `Divide ${denominator * k} by ${denominator}, then multiply by ${numerator}: ${numerator * k} books.`,
      );
    },
  },
  {
    id: "decimals",
    name: "Decimal calculations",
    area: N,
    visual: false,
    make: (r) => {
      const a = int(r, 12, 98),
        b = int(r, 2, 9);
      return question(
        r,
        `Calculate ${show(a / 10)} × ${b}.`,
        (a * b) / 10,
        `${a} × ${b} = ${a * b}; place the decimal to get ${show((a * b) / 10)}.`,
      );
    },
  },
  {
    id: "percentage",
    name: "Percentage change",
    area: N,
    visual: false,
    make: (r) => {
      const cost = int(r, 4, 25) * 100,
        percent = int(r, 1, 5) * 5;
      return question(
        r,
        `A bag costs KES ${cost}. Its price increases by ${percent}%. What is the new price?`,
        (cost * (100 + percent)) / 100,
        `Increase = ${percent}/100 × ${cost} = ${(cost * percent) / 100}. Add this to ${cost} to get KES ${(cost * (100 + percent)) / 100}.`,
        undefined,
        " KES",
      );
    },
  },
  {
    id: "ratio",
    name: "Sharing in a ratio",
    area: N,
    visual: true,
    make: (r) => {
      const a = int(r, 2, 5),
        b = int(r, 6, 9),
        k = int(r, 5, 20);
      return question(
        r,
        "A club shares the total shown in the ratio A:B. How much does group A receive?",
        a * k,
        `There are ${a + b} parts. Each part is ${k}; group A receives ${a} × ${k} = ${a * k}.`,
        table(
          "Club sharing plan",
          ["Total tokens", "A:B"],
          [[(a + b) * k, `${a}:${b}`]],
        ),
      );
    },
  },
  {
    id: "interest",
    name: "Simple interest",
    area: N,
    visual: true,
    make: (r) => {
      const p = int(r, 2, 12) * 1000,
        rate = int(r, 2, 8),
        years = int(r, 2, 5);
      return question(
        r,
        "Calculate the simple interest for the savings shown.",
        (p * rate * years) / 100,
        `Simple interest = P × R × T / 100 = ${p} × ${rate} × ${years}/100 = KES ${(p * rate * years) / 100}.`,
        table(
          "Savings terms (simple interest)",
          ["Principal (KES)", "Annual rate (%)", "Years"],
          [[p, rate, years]],
        ),
        " KES",
      );
    },
  },
  {
    id: "exchange",
    name: "Currency conversion",
    area: N,
    visual: true,
    make: (r) => {
      const rate = int(r, 12, 15) * 10,
        dollars = int(r, 2, 12);
      return question(
        r,
        `Using the illustrative exchange rate, how many Kenya shillings equal USD ${dollars}?`,
        rate * dollars,
        `Multiply ${dollars} by ${rate} KES per USD: KES ${rate * dollars}. No fees are included.`,
        table(
          "Illustrative rate, not a current market quote",
          ["Currency", "Value in KES"],
          [["1 USD", rate]],
        ),
        " KES",
      );
    },
  },
  {
    id: "unit-price",
    name: "Unit price",
    area: N,
    visual: true,
    make: (r) => {
      const count = int(r, 3, 9),
        price = int(r, 5, 25) * 5;
      return question(
        r,
        "What is the cost of one notebook in this purchase?",
        price,
        `Unit price = total cost ÷ number of notebooks = ${count * price} ÷ ${count} = KES ${price}.`,
        table(
          "Stationery purchase",
          ["Notebooks", "Total cost (KES)"],
          [[count, count * price]],
        ),
        " KES",
      );
    },
  },
  {
    id: "substitution",
    name: "Substitution",
    area: A,
    visual: false,
    make: (r) => {
      const x = int(r, 2, 9),
        a = int(r, 2, 7),
        b = int(r, 1, 12);
      return question(
        r,
        `Find ${a}x + ${b} when x = ${x}.`,
        a * x + b,
        `Substitute x = ${x}: ${a} × ${x} + ${b} = ${a * x + b}.`,
      );
    },
  },
  {
    id: "linear-equation",
    name: "Linear equations",
    area: A,
    visual: false,
    make: (r) => {
      const x = int(r, 2, 15),
        a = int(r, 2, 8),
        b = int(r, 1, 15);
      return question(
        r,
        `Solve ${a}x + ${b} = ${a * x + b}.`,
        x,
        `Subtract ${b}: ${a}x = ${a * x}. Divide by ${a}: x = ${x}.`,
      );
    },
  },
  {
    id: "expand",
    name: "Expanding expressions",
    area: A,
    visual: false,
    make: (r) => {
      const a = int(r, 2, 9),
        b = int(r, 2, 8);
      return question(
        r,
        `In the expansion of ${a}(x + ${b}), what is the constant term?`,
        a * b,
        `${a}(x + ${b}) = ${a}x + ${a * b}. The constant term is ${a * b}.`,
      );
    },
  },
  {
    id: "sequence",
    name: "Number patterns",
    area: A,
    visual: false,
    make: (r) => {
      const start = int(r, 2, 15),
        step = int(r, 2, 9);
      return question(
        r,
        `Find the next term: ${start}, ${start + step}, ${start + 2 * step}, ${start + 3 * step}, …`,
        start + 4 * step,
        `Each term increases by ${step}. The next is ${start + 3 * step} + ${step} = ${start + 4 * step}.`,
      );
    },
  },
  {
    id: "linear-table",
    name: "Linear relationships",
    area: A,
    visual: true,
    make: (r) => {
      const m = int(r, 2, 7),
        b = int(r, 1, 9);
      return question(
        r,
        "The table follows y = mx + c. Find m.",
        m,
        `When x increases by 1, y increases by ${m}; therefore the coefficient m is ${m}.`,
        table(
          "Values of a linear relationship",
          ["x", "y"],
          [
            [0, b],
            [1, m + b],
            [2, 2 * m + b],
          ],
        ),
      );
    },
  },
  {
    id: "direct-proportion",
    name: "Direct proportion",
    area: A,
    visual: true,
    make: (r) => {
      const k = int(r, 4, 18),
        a = int(r, 2, 5),
        b = int(r, 6, 10);
      return question(
        r,
        `Paint cost is directly proportional to litres. What is the cost of ${b} litres?`,
        b * k,
        `Cost per litre is ${a * k} ÷ ${a} = ${k}. For ${b} litres: ${b} × ${k} = KES ${b * k}.`,
        table(
          "Paint cost (no fixed fee)",
          ["Litres", "Cost (KES)"],
          [[a, a * k]],
        ),
        " KES",
      );
    },
  },
  {
    id: "straight-angle",
    name: "Angles on a straight line",
    area: G,
    visual: true,
    make: (r) => {
      const angle = int(r, 3, 15) * 10;
      return question(
        r,
        "The two adjacent angles form a straight line. Find x.",
        180 - angle,
        `Angles on a straight line add to 180°. Therefore x = 180° − ${angle}° = ${180 - angle}°.`,
        { kind: "angles", known: angle },
        "°",
      );
    },
  },
  {
    id: "triangle-angles",
    name: "Angles in a triangle",
    area: G,
    visual: false,
    make: (r) => {
      const a = int(r, 3, 7) * 10,
        b = int(r, 3, 7) * 10;
      return question(
        r,
        `Two interior angles of a triangle are ${a}° and ${b}°. Find the third angle.`,
        180 - a - b,
        `Interior angles total 180°: 180 − ${a} − ${b} = ${180 - a - b}°.`,
        undefined,
        "°",
      );
    },
  },
  {
    id: "polygon-angles",
    name: "Interior angle sums",
    area: G,
    visual: false,
    make: (r) => {
      const n = int(r, 4, 9);
      return question(
        r,
        `Find the sum of the interior angles of a ${n}-sided simple polygon.`,
        (n - 2) * 180,
        `The angle sum is (n − 2) × 180° = (${n} − 2) × 180° = ${(n - 2) * 180}°.`,
        undefined,
        "°",
      );
    },
  },
  {
    id: "coordinates",
    name: "Cartesian coordinates",
    area: G,
    visual: true,
    make: (r) => {
      const x = int(r, 1, 5),
        y = int(r, 1, 5);
      return question(
        r,
        "Point P is shown on the coordinate grid. What is its x-coordinate?",
        x,
        `The x-coordinate is the horizontal position: ${x}. P = (${x}, ${y}).`,
        { kind: "point", x, y },
      );
    },
  },
  {
    id: "pythagoras",
    name: "Right-angled triangles",
    area: G,
    visual: false,
    make: (r) => {
      const k = int(r, 2, 7);
      return question(
        r,
        `A right-angled triangle has perpendicular sides ${3 * k} cm and ${4 * k} cm. Find its hypotenuse.`,
        5 * k,
        `c² = (${3 * k})² + (${4 * k})² = ${25 * k * k}; c = ${5 * k} cm.`,
        undefined,
        " cm",
      );
    },
  },
  {
    id: "reflection",
    name: "Reflection in an axis",
    area: G,
    visual: true,
    make: (r) => {
      const x = int(r, 1, 5),
        y = int(r, 1, 5);
      return question(
        r,
        "Point P is reflected in the y-axis. What is the x-coordinate of its image?",
        -x,
        `Reflection in the y-axis maps (x, y) to (−x, y). The image is (−${x}, ${y}).`,
        { kind: "point", x, y },
      );
    },
  },
  {
    id: "rectangle-area",
    name: "Area of a rectangle",
    area: M,
    visual: true,
    make: (r) => {
      const w = int(r, 4, 18),
        h = int(r, 2, 9);
      return question(
        r,
        "Calculate the area of the rectangle. The diagram is not drawn to scale.",
        w * h,
        `Area = length × width = ${w} × ${h} = ${w * h} cm².`,
        { kind: "rectangle", width: w, height: h },
        " cm²",
      );
    },
  },
  {
    id: "triangle-area",
    name: "Area of a triangle",
    area: M,
    visual: true,
    make: (r) => {
      const b = int(r, 4, 12) * 2,
        h = int(r, 3, 12);
      return question(
        r,
        "Find the area of the triangle using the perpendicular height shown. Diagram not to scale.",
        (b * h) / 2,
        `Area = ½ × base × perpendicular height = ½ × ${b} × ${h} = ${(b * h) / 2} cm².`,
        { kind: "triangle", base: b, height: h },
        " cm²",
      );
    },
  },
  {
    id: "circumference",
    name: "Circumference of a circle",
    area: M,
    visual: true,
    make: (r) => {
      const radius = int(r, 1, 6) * 7;
      return question(
        r,
        "Find the circumference of this circle. Use π = 22/7; diagram not to scale.",
        (44 * radius) / 7,
        `Circumference = 2πr = 2 × 22/7 × ${radius} = ${(44 * radius) / 7} cm.`,
        { kind: "circle", radius },
        " cm",
      );
    },
  },
  {
    id: "cuboid-volume",
    name: "Volume of a cuboid",
    area: M,
    visual: true,
    make: (r) => {
      const l = int(r, 3, 12),
        w = int(r, 2, 8),
        h = int(r, 2, 7);
      return question(
        r,
        "Find the volume of the cuboid described in the table.",
        l * w * h,
        `Volume = length × width × height = ${l} × ${w} × ${h} = ${l * w * h} cm³.`,
        table(
          "Cuboid dimensions",
          ["Length (cm)", "Width (cm)", "Height (cm)"],
          [[l, w, h]],
        ),
        " cm³",
      );
    },
  },
  {
    id: "capacity",
    name: "Capacity conversions",
    area: M,
    visual: false,
    make: (r) => {
      const ml = int(r, 2, 15) * 250;
      return question(
        r,
        `Convert ${ml} millilitres to litres.`,
        ml / 1000,
        `1 litre = 1000 millilitres. ${ml} ÷ 1000 = ${show(ml / 1000)} litres.`,
        undefined,
        " L",
      );
    },
  },
  {
    id: "speed",
    name: "Speed, distance and time",
    area: M,
    visual: false,
    make: (r) => {
      const t = int(r, 2, 5),
        speed = int(r, 3, 12) * 5;
      return question(
        r,
        `A vehicle travels ${speed * t} km in ${t} hours at constant speed. Find the speed.`,
        speed,
        `Speed = distance ÷ time = ${speed * t} ÷ ${t} = ${speed} km/h.`,
        undefined,
        " km/h",
      );
    },
  },
  {
    id: "mean",
    name: "Arithmetic mean",
    area: D,
    visual: false,
    make: (r) => {
      const n = int(r, 5, 25),
        d = int(r, 1, 5);
      return question(
        r,
        `Find the mean of ${n - d}, ${n}, ${n + d}.`,
        n,
        `The sum is ${3 * n}; divide by 3 to get ${n}.`,
      );
    },
  },
  {
    id: "median",
    name: "Median",
    area: D,
    visual: false,
    make: (r) => {
      const n = int(r, 10, 35);
      return question(
        r,
        `Find the median of ${n + 5}, ${n - 3}, ${n + 2}, ${n}, ${n - 7}.`,
        n,
        `In order: ${n - 7}, ${n - 3}, ${n}, ${n + 2}, ${n + 5}. The middle value is ${n}.`,
      );
    },
  },
  {
    id: "mode",
    name: "Mode",
    area: D,
    visual: true,
    make: (r) => {
      const n = int(r, 3, 25);
      return question(
        r,
        "Find the mode of the data in this frequency table.",
        n,
        `${n} appears three times, more often than any other value, so it is the mode.`,
        table(
          "Observed values",
          ["Value", "Frequency"],
          [
            [n, 3],
            [n + 2, 2],
            [n + 4, 1],
          ],
        ),
      );
    },
  },
  {
    id: "probability",
    name: "Simple probability",
    area: D,
    visual: false,
    make: (r) => {
      const red = int(r, 2, 8);
      return question(
        r,
        `A bag contains ${red} red beads and ${10 - red} blue beads. A bead is drawn at random. Express the probability of drawing red as a percentage.`,
        red * 10,
        `There are 10 equally likely beads. P(red) = ${red}/10 = ${red * 10}%.`,
        undefined,
        "%",
      );
    },
  },
  {
    id: "frequency",
    name: "Frequency tables",
    area: D,
    visual: true,
    make: (r) => {
      const a = int(r, 3, 12),
        b = int(r, 3, 12),
        c = int(r, 3, 12);
      return question(
        r,
        "How many learners are represented in the frequency table?",
        a + b + c,
        `Add the frequencies: ${a} + ${b} + ${c} = ${a + b + c} learners.`,
        table(
          "Books read last month",
          ["Books", "Number of learners"],
          [
            [0, a],
            [1, b],
            [2, c],
          ],
        ),
      );
    },
  },
  {
    id: "bar-chart",
    name: "Reading bar charts",
    area: D,
    visual: true,
    make: (r) => {
      const a = int(r, 2, 9),
        b = int(r, 2, 9),
        c = int(r, 2, 9);
      return question(
        r,
        "How many seedlings were planted by group B?",
        b,
        `Read the height of the bar labelled B: ${b} seedlings.`,
        { kind: "bars", labels: ["A", "B", "C"], values: [a, b, c] },
      );
    },
  },
];
// 16 visual and 16 nonvisual templates. Every paper covers all 32 and repeats
// four distinct templates from each half with fresh values: 20/40 visual.
export function generatePaper(seed: number): MockQuestion[] {
  const r = seededRandom(seed);
  const visual = TOPICS.filter((t) => t.visual),
    plain = TOPICS.filter((t) => !t.visual);
  if (visual.length !== 16 || plain.length !== 16)
    throw new Error("Invalid mathematics blueprint");
  const selected = shuffle(
    [
      ...TOPICS,
      ...shuffle(visual, r).slice(0, 4),
      ...shuffle(plain, r).slice(0, 4),
    ],
    r,
  );
  const seen = new Set<string>();
  return selected.map((topic, i) => {
    let item = topic.make(r),
      tries = 0;
    while (
      seen.has(item.prompt + JSON.stringify(item.visual ?? null)) &&
      tries++ < 100
    )
      item = topic.make(r);
    const signature = item.prompt + JSON.stringify(item.visual ?? null);
    if (seen.has(signature))
      throw new Error("Could not generate distinct questions");
    seen.add(signature);
    return {
      id: `q-${i + 1}`,
      topicId: topic.id,
      topic: topic.name,
      area: topic.area,
      ...item,
    };
  });
}
export const MOCK_BLUEPRINT = {
  version: "kjsea-maths-v1",
  subject: "Mathematics",
  level: "Grade 9 preparation",
  questionCount: 40,
  topicCount: 32,
  areaCount: 5,
  visualCount: 20,
  areas: [N, A, G, M, D],
  topics: TOPICS.map(({ id, name, area, visual }) => ({
    id,
    name,
    area,
    visual,
  })),
  sourceNote:
    "Original Assignment Hub junior-school revision questions. Coverage has not been verified against the current KICD Grade 9 Mathematics subject design. This is not an official KNEC paper. Values and order vary between papers; topic templates can recur.",
};

// Platform practice progression, pending subject-teacher verification against current designs.
const FOUNDATION_TOPICS = new Set([
  "integers",
  "fractions",
  "decimals",
  "ratio",
  "unit-price",
  "substitution",
  "linear-equation",
  "sequence",
  "straight-angle",
  "triangle-angles",
  "coordinates",
  "rectangle-area",
  "triangle-area",
  "cuboid-volume",
  "capacity",
  "mean",
  "median",
  "mode",
  "frequency",
  "bar-chart",
]);
const EXTENSION_TOPICS = new Set([
  ...FOUNDATION_TOPICS,
  "percentage",
  "interest",
  "exchange",
  "expand",
  "linear-table",
  "direct-proportion",
  "circumference",
  "speed",
  "probability",
]);
export function gradeTopics(grade: string) {
  return TOPICS.filter(
    (t) =>
      grade === "Grade 9" ||
      (grade === "Grade 6" || grade === "Grade 7"
        ? FOUNDATION_TOPICS
        : EXTENSION_TOPICS
      ).has(t.id),
  );
}
export function generateGradePaper(
  seed: number,
  grade: string,
): MockQuestion[] {
  const r = seededRandom(seed);
  const topics = gradeTopics(grade);
  const selected = shuffle(
    Array.from({ length: 40 }, (_, i) => topics[i % topics.length]),
    r,
  );
  const seen = new Set<string>();
  return selected.map((topic, i) => {
    let item = topic.make(r);
    let tries = 0;
    while (
      seen.has(item.prompt + JSON.stringify(item.visual ?? null)) &&
      tries++ < 100
    )
      item = topic.make(r);
    const signature = item.prompt + JSON.stringify(item.visual ?? null);
    if (seen.has(signature))
      throw new Error("Could not generate distinct questions");
    seen.add(signature);
    return {
      ...item,
      id: `q-${i + 1}`,
      topicId: topic.id,
      topic: topic.name,
      area: topic.area,
      sourceGrade: grade,
    };
  });
}
