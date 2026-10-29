import {
  gradeTopics,
  seededRandom,
  shuffle,
  MockQuestion,
  Visual,
} from "./mathematics";
export interface StructuredPart {
  id: string;
  prompt: string;
  answer?: string;
  marks: number;
  answerType?: "NUMERIC" | "TEXT";
  match?: { keywords: string[]; threshold: number };
}
export type StructuredAnswer = {
  responses: Record<string, string>;
  working: string;
};
export type ExamAnswer = number | StructuredAnswer;
export const MATH_ALLOCATION = [
  { area: "Measurement", marks: 32, a: 4, b: 7 },
  { area: "Geometry", marks: 24, a: 4, b: 5 },
  { area: "Number", marks: 21, a: 5, b: 4 },
  { area: "Algebra", marks: 14, a: 2, b: 3 },
  { area: "Data", marks: 9, a: 5, b: 1 },
];
const areaKey = (s: string) =>
  /measur/i.test(s)
    ? "Measurement"
    : /geometr/i.test(s)
      ? "Geometry"
      : /algebra/i.test(s)
        ? "Algebra"
        : /data|statist|probab/i.test(s)
          ? "Data"
          : "Number";
export function totalMarks(questions: MockQuestion[]) {
  return questions.reduce((n, q) => n + (q.marks ?? 1), 0);
}
export function numericEqual(value: string, correct: string) {
  const parse = (s: string) => {
    const clean = s.trim().replace(/,/g, "").replace(/\s+/g, "");
    if (
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(
        clean,
      )
    )
      return NaN;
    const [a, b] = clean.split("/").map(Number);
    return b === undefined ? a : b === 0 ? NaN : a / b;
  };
  const a = parse(value),
    b = parse(correct);
  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    Math.abs(a - b) <= Math.max(0.00051, Math.abs(b) * 0.00001)
  );
}
export function questionMarks(q: MockQuestion, answer: ExamAnswer | undefined) {
  if (q.responseType !== "STRUCTURED")
    return answer === q.correctIndex ? (q.marks ?? 1) : 0;
  if (!answer || typeof answer !== "object") return 0;
  if (q.manualSelfReview) return 0;
  const normal = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const matches = (part: StructuredPart) => {
    const value = answer.responses[part.id] ?? "";
    if (part.answer === undefined) return false;
    if (part.answerType !== "TEXT") return numericEqual(value, part.answer);
    if (normal(value) === normal(part.answer)) return true;
    const keys = part.match?.keywords.filter((k) => normal(k)) ?? [];
    return (
      keys.length > 0 &&
      keys.filter((k) => normal(value).includes(normal(k))).length /
        keys.length >=
        (part.match?.threshold ?? 1)
    );
  };
  return (q.parts ?? []).reduce((n, p) => n + (matches(p) ? p.marks : 0), 0);
}
export function performanceLevel(score: number, maximum: number) {
  const percent = maximum ? Math.round((score / maximum) * 10000) / 100 : 0;
  const levels = [
    [90, "EE1", "Exceeding expectations", 8],
    [75, "EE2", "Exceeding expectations", 7],
    [58, "ME1", "Meeting expectations", 6],
    [41, "ME2", "Meeting expectations", 5],
    [31, "AE1", "Approaching expectations", 4],
    [21, "AE2", "Approaching expectations", 3],
    [11, "BE1", "Below expectations", 2],
    [0, "BE2", "Below expectations", 1],
  ] as const;
  const [, code, label, points] = levels.find(([min]) => percent >= min)!;
  return { code, label, points, percent, practiceEstimate: true };
}
function structured(
  area: string,
  grade: string,
  n: number,
  r: () => number,
): MockQuestion {
  const a = 3 + Math.floor(r() * 12),
    b = 2 + Math.floor(r() * 7),
    c = 2 + Math.floor(r() * 5);
  let prompt = "",
    rows: [string, number][] = [],
    explanation = "";
  if (area === "Measurement") {
    prompt = `A rectangular water tank has internal length ${a} m, width ${b} m and depth ${c} m. It is initially full. A household uses 1,000 litres each day. Use 1 m³ = 1,000 litres.`;
    rows = [
      ["Find the area of the base in m².", a * b],
      ["Find the volume of the tank in m³.", a * b * c],
      ["Find its capacity in litres.", a * b * c * 1000],
      [
        "For how many complete days can this full tank supply the household?",
        a * b * c,
      ],
    ];
    explanation = `Base area = ${a} × ${b} = ${a * b} m². Volume = ${a * b} × ${c} = ${a * b * c} m³. Capacity = ${a * b * c} × 1,000 = ${a * b * c * 1000} litres. Days = ${a * b * c * 1000} ÷ 1,000 = ${a * b * c}.`;
  } else if (area === "Geometry") {
    const x = 20 + a,
      y = 40 + b;
    prompt = `Triangle ABC has angle A = ${x}° and angle B = ${y}°. Side BC is extended beyond C to D. The triangle is part of a scale drawing.`;
    rows = [
      ["State the sum of the interior angles of a triangle, in degrees.", 180],
      ["Calculate angle ACB in degrees.", 180 - x - y],
      ["Calculate exterior angle ACD in degrees.", x + y],
      [
        "A second triangle is similar to ABC with every side doubled. Find its angle corresponding to A, in degrees.",
        x,
      ],
    ];
    explanation = `A triangle's angles total 180°. C = 180 − ${x} − ${y} = ${180 - x - y}°. Exterior C = 180 − ${180 - x - y} = ${x + y}°. Similar triangles keep corresponding angles, so A remains ${x}°.`;
  } else if (area === "Number") {
    const price = a * 10,
      count = b,
      budget = price * count + 100;
    prompt = `A class buys ${count} exercise books at KSh ${price} each and pays with KSh ${budget}. Later, each book is discounted by KSh 10.`;
    rows = [
      ["Calculate the original total cost in shillings.", price * count],
      ["Calculate the change from the original purchase in shillings.", 100],
      ["Calculate the new price of one book in shillings.", price - 10],
      [
        "Calculate the total saving on the same number of books in shillings.",
        count * 10,
      ],
    ];
    explanation = `Original cost = ${count} × ${price} = ${price * count}. Change = ${budget} − ${price * count} = 100. Discounted price = ${price} − 10 = ${price - 10}. Saving = ${count} × 10 = ${count * 10}.`;
  } else if (area === "Algebra") {
    const rate = a * 10,
      fixed = b * 10,
      target = c + 3;
    prompt = `A bicycle hire shop charges a fixed fee of KSh ${fixed} plus KSh ${rate} for each hour. The cost for h hours is C = ${rate}h + ${fixed}.`;
    rows = [
      ["Find the cost for 1 hour, in shillings.", rate + fixed],
      ["Find the cost for 3 hours, in shillings.", rate * 3 + fixed],
      [`If C = KSh ${rate * target + fixed}, calculate h.`, target],
      [
        "Find the increase in cost when the hire time increases by 2 hours, in shillings.",
        rate * 2,
      ],
    ];
    explanation = `Substitute h = 1: C = ${rate + fixed}. Substitute h = 3: C = ${rate * 3 + fixed}. Solve ${rate}h + ${fixed} = ${rate * target + fixed}: h = ${target}. Two extra hours cost 2 × ${rate} = ${rate * 2}.`;
  } else {
    const values = [a, a + 2, a + 4, a + 6];
    prompt = `Four learners recorded the following numbers of seedlings planted: ${values.join(", ")}. A learner is selected at random from these four learners.`;
    rows = [
      ["Find the total number of seedlings planted.", 4 * a + 12],
      ["Calculate the mean number of seedlings.", a + 3],
      ["Find the range of these data.", 6],
      [
        `Find the probability that the selected learner planted more than ${a + 2} seedlings. Give a decimal or fraction.`,
        0.5,
      ],
    ];
    explanation = `Total = ${4 * a + 12}. Mean = ${4 * a + 12} ÷ 4 = ${a + 3}. Range = ${a + 6} − ${a} = 6. Two of four values exceed ${a + 2}, so the probability is 2/4 = 1/2.`;
  }
  // Rotate contexts within a strand rather than repeating one question stem.
  const v = n % 7;
  if (area === "Measurement" && v === 1) {
    prompt = `A rectangular garden measures ${a + 10} m by ${b + 5} m. A gate ${c} m wide is left in the boundary. Fencing costs KSh 100 per metre.`;
    const perimeter = 2 * (a + b + 15),
      length = perimeter - c;
    rows = [
      ["Find the perimeter of the garden, in metres.", perimeter],
      ["Find the length of fencing required, in metres.", length],
      ["Find the fencing cost, in shillings.", length * 100],
      ["Convert the full perimeter to centimetres.", perimeter * 100],
    ];
    explanation = `Perimeter = 2 × (${a + 10} + ${b + 5}) = ${perimeter} m. Subtract the ${c} m gate to obtain ${length} m. Cost = ${length} × 100 = ${length * 100}. One metre is 100 centimetres.`;
  } else if (area === "Measurement" && v === 2) {
    const speed = a * 10,
      hours = b,
      km = speed * hours;
    prompt = `A bus travels at a constant ${speed} km/h for ${hours} hours without stopping.`;
    rows = [
      ["Find the distance travelled, in kilometres.", km],
      ["Convert this distance to metres.", km * 1000],
      ["Convert the travel time to minutes.", hours * 60],
      [
        "How long, in hours, would the same distance take at half the speed?",
        hours * 2,
      ],
    ];
    explanation = `Distance = speed × time = ${speed} × ${hours} = ${km} km. Multiply by 1,000 for metres and by 60 to convert hours to minutes. Half the speed doubles the time to ${hours * 2} h.`;
  } else if (area === "Measurement" && v === 3) {
    const side = a * 2,
      tile = 2,
      area = side * side;
    prompt = `A square floor has side ${side} m. It is covered with square mats of side ${tile} m, with no gaps or overlaps.`;
    rows = [
      ["Find the floor area in square metres.", area],
      ["Find the area of one mat in square metres.", 4],
      ["How many mats are needed?", area / 4],
      ["Find the floor perimeter in metres.", side * 4],
    ];
    explanation = `Floor area = ${side}² = ${area} m². Each mat covers 2² = 4 m². Number of mats = ${area} ÷ 4 = ${area / 4}. Perimeter = 4 × ${side} = ${side * 4} m.`;
  } else if (area === "Measurement" && v === 4) {
    const length = a,
      actual = length * 100;
    prompt = `A map uses a scale of 1:10,000. A straight path measures ${length} cm on the map.`;
    rows = [
      ["How many real centimetres are represented by 1 cm on the map?", 10000],
      ["Find the actual path length in centimetres.", length * 10000],
      ["Convert the actual path length to metres.", actual],
      [
        "A walker covers 100 metres each minute. Find the walking time in minutes.",
        length,
      ],
    ];
    explanation = `At 1:10,000, ${length} cm represents ${length * 10000} cm, or ${actual} m. At 100 m/minute the walk takes ${actual} ÷ 100 = ${length} minutes.`;
  } else if (area === "Measurement" && v === 5) {
    const litres = a * b,
      small = b * 100;
    prompt = `A container holds ${litres} litres of juice. Cups each hold ${small} millilitres. Juice is sold at KSh 20 per filled cup.`;
    rows = [
      ["Convert the container capacity to millilitres.", litres * 1000],
      ["How many full cups can be filled?", a * 10],
      ["How much money is collected if every cup is sold?", a * 200],
      ["How many litres remain after half the juice is used?", litres / 2],
    ];
    explanation = `Capacity = ${litres * 1000} ml. Divide by ${small} ml to obtain ${a * 10} cups. Revenue = ${a * 10} × 20 = ${a * 200}. Half of ${litres} litres is ${litres / 2} litres.`;
  } else if (area === "Measurement" && v === 6) {
    const length = 2 * a,
      width = 2 * b;
    prompt = `A triangular plot has base ${length} m and perpendicular height ${width} m. Seed costs KSh 10 for each square metre.`;
    rows = [
      ["Calculate base × perpendicular height.", length * width],
      ["Find the area of the triangle in square metres.", (length * width) / 2],
      ["Calculate the seed cost in shillings.", length * width * 5],
      [
        "How many such plots have the same area as a rectangle with this base and height?",
        2,
      ],
    ];
    explanation = `A triangle has half the area of the corresponding rectangle. Area = ½ × ${length} × ${width} = ${(length * width) / 2} m². Multiply by KSh 10 for the cost. Two identical triangles make that rectangle.`;
  }
  if (area === "Geometry" && n % 5 === 1) {
    prompt = `Point P has coordinates (${a}, ${b}) on a Cartesian grid. It is reflected in the y-axis to point Q, then Q is translated ${c} units upwards to point R.`;
    rows = [
      ["Give the x-coordinate of Q.", -a],
      ["Give the y-coordinate of Q.", b],
      ["Give the x-coordinate of R.", -a],
      ["Give the y-coordinate of R.", b + c],
    ];
    explanation = `Reflection in the y-axis changes x to −x and keeps y unchanged: Q = (−${a}, ${b}). Moving up ${c} units changes only y, giving R = (−${a}, ${b + c}).`;
  } else if (area === "Geometry" && n % 5 === 2) {
    const angle = 30 + a;
    prompt = `Two parallel lines are crossed by a transversal. One acute angle is ${angle}°. Use the corresponding, vertically opposite and supplementary angle rules.`;
    rows = [
      [
        "Find the angle vertically opposite this acute angle, in degrees.",
        angle,
      ],
      ["Find its adjacent angle on a straight line, in degrees.", 180 - angle],
      [
        "Find the corresponding acute angle at the other intersection, in degrees.",
        angle,
      ],
      [
        "Find the sum of the four angles around one intersection, in degrees.",
        360,
      ],
    ];
    explanation = `Vertically opposite and corresponding angles are equal to ${angle}°. Adjacent angles on a straight line sum to 180°, giving ${180 - angle}°. Angles around a point sum to 360°.`;
  } else if (area === "Geometry" && n % 5 === 3) {
    const x = a + 10,
      y = b + 10;
    prompt = `An isosceles triangle has two equal base angles of ${x}°. A different quadrilateral has angles 90°, 90°, ${y}° and z°.`;
    rows = [
      ["Find the total of the two base angles, in degrees.", 2 * x],
      ["Find the vertex angle of the triangle, in degrees.", 180 - 2 * x],
      [
        "State the sum of the interior angles of a quadrilateral, in degrees.",
        360,
      ],
      ["Calculate z, in degrees.", 180 - y],
    ];
    explanation = `The equal base angles total ${2 * x}°. Subtract this from 180° to obtain ${180 - 2 * x}°. A quadrilateral totals 360°, so z = 360 − 90 − 90 − ${y} = ${180 - y}°.`;
  } else if (area === "Geometry" && n % 5 === 4) {
    prompt = `A rectangle has vertices A(0,0), B(${a},0), C(${a},${b}) and D(0,${b}). The grid units represent metres.`;
    rows = [
      ["Find the length AB in metres.", a],
      ["Find the length BC in metres.", b],
      ["Find the perimeter ABCD in metres.", 2 * (a + b)],
      ["Find the area ABCD in square metres.", a * b],
    ];
    explanation = `Horizontal length AB = ${a} m and vertical length BC = ${b} m. The perimeter is 2(${a} + ${b}) = ${2 * (a + b)} m. Area = ${a} × ${b} = ${a * b} m².`;
  }
  if (area === "Number" && n % 4 === 1) {
    const red = 2 * a,
      blue = 3 * a;
    prompt = `A box contains ${red} red counters and ${blue} blue counters. Five red counters are then removed.`;
    rows = [
      ["Find the initial total number of counters.", 5 * a],
      [
        "What fraction of the original counters are red? Give a fraction or decimal.",
        0.4,
      ],
      ["Find the number of red counters remaining.", red - 5],
      ["Find the new total number of counters.", 5 * a - 5],
    ];
    explanation = `Total = ${red} + ${blue} = ${5 * a}. Red fraction = ${red}/${5 * a} = 2/5. Removing five red counters leaves ${red - 5} red counters and ${5 * a - 5} counters altogether.`;
  } else if (area === "Number" && n % 4 === 2) {
    prompt = `A learner earns KSh ${a * 100}, saves half of it and shares the rest equally among ${b} friends. Use exact values or fractions where necessary.`;
    rows = [
      ["Find the amount saved in shillings.", a * 50],
      ["Find the amount available for sharing in shillings.", a * 50],
      ["Find the amount each friend receives in shillings.", (a * 50) / b],
      [
        "What fraction of the original amount was saved? Give a fraction or decimal.",
        0.5,
      ],
    ];
    rows[2][1] = Number(((a * 50) / b).toFixed(3));
    explanation = `Half of ${a * 100} is ${a * 50}. The same amount remains. Each friend receives ${a * 50} ÷ ${b} ≈ ${rows[2][1]}. The saved fraction is 1/2. For the shared amount, round to three decimal places if necessary.`;
    prompt +=
      " Round money shared per friend to three decimal places if needed.";
  } else if (area === "Number" && n % 4 === 3) {
    const start = -a;
    prompt = `At dawn the temperature was ${start}°C. It rose by ${b}°C, then rose by a further ${c}°C.`;
    rows = [
      ["Find the temperature after the first rise, in °C.", start + b],
      ["Find the total temperature rise, in °C.", b + c],
      ["Find the final temperature, in °C.", start + b + c],
      ["Find the difference between the dawn temperature and 0°C.", a],
    ];
    explanation = `Add signed numbers: first temperature = −${a} + ${b} = ${start + b}. Total rise = ${b + c}. Final temperature = −${a} + ${b + c} = ${start + b + c}. The distance from −${a} to 0 is ${a}.`;
  }
  if (area === "Algebra" && n % 3 === 1) {
    prompt = `A number pattern starts at ${a} and increases by ${b} each time. Its first term is term 1.`;
    rows = [
      ["Find term 2.", a + b],
      ["Find term 4.", a + 3 * b],
      ["Find the difference between term 8 and term 4.", 4 * b],
      ["Find term 10.", a + 9 * b],
    ];
    explanation = `Each term adds ${b}. Term n = ${a} + (n − 1) × ${b}. Substitution gives the requested values; four steps between terms 4 and 8 add ${4 * b}.`;
  } else if (area === "Algebra" && n % 3 === 2) {
    const x = a,
      coeff = b,
      total = coeff * x + c;
    prompt = `Consider the equation ${coeff}x + ${c} = ${total}.`;
    rows = [
      [
        "Subtract the constant from both sides. What is the resulting right-hand side?",
        coeff * x,
      ],
      ["Solve for x.", x],
      ["Calculate 2x + 1 using your value of x.", 2 * x + 1],
      [
        "Calculate the left-hand side of the original equation to check your solution.",
        total,
      ],
    ];
    explanation = `Subtract ${c}: ${coeff}x = ${coeff * x}. Divide by ${coeff}: x = ${x}. Then 2x + 1 = ${2 * x + 1}. Substitution in the original left-hand side gives ${total}, matching the right-hand side.`;
  }
  let visual: Visual | undefined;
  const table = (
    caption: string,
    headings: string[],
    data: (string | number)[][],
  ): Visual => ({
    kind: "table",
    caption,
    headings,
    rows: data.map((row) => row.map(String)),
  });
  if (area === "Measurement") {
    const data: (string | number)[][] =
      v === 0
        ? [
            ["Length", a],
            ["Width", b],
            ["Depth", c],
          ]
        : v === 1
          ? [
              ["Garden length (m)", a + 10],
              ["Garden width (m)", b + 5],
              ["Gate width (m)", c],
            ]
          : v === 2
            ? [
                ["Speed (km/h)", a * 10],
                ["Time (hours)", b],
              ]
            : v === 3
              ? [
                  ["Floor side (m)", a * 2],
                  ["Mat side (m)", 2],
                ]
              : v === 4
                ? [
                    ["Scale", "1:10,000"],
                    ["Map path (cm)", a],
                  ]
                : v === 5
                  ? [
                      ["Container (litres)", a * b],
                      ["Cup (millilitres)", b * 100],
                    ]
                  : [
                      ["Triangle base (m)", 2 * a],
                      ["Perpendicular height (m)", 2 * b],
                    ];
    visual = table(
      v === 0 ? "Internal tank dimensions (metres)" : "Measurements supplied",
      ["Quantity", "Value"],
      data,
    );
  } else if (area === "Geometry" && n % 5 === 1)
    visual = { kind: "point", x: a, y: b };
  else if (area === "Geometry" && n % 5 === 4)
    visual = table(
      "Rectangle vertices",
      ["Vertex", "x", "y"],
      [
        ["A", 0, 0],
        ["B", a, 0],
        ["C", a, b],
        ["D", 0, b],
      ],
    );
  else if (area === "Data")
    visual = table(
      "Seedlings planted",
      ["Learner", "Seedlings"],
      [
        ["A", a],
        ["B", a + 2],
        ["C", a + 4],
        ["D", a + 6],
      ],
    );
  return {
    id: `q-${n}`,
    topicId: `structured:${area}:${n}`,
    topic: area,
    area,
    prompt,
    options: [],
    correctIndex: -1,
    explanation,
    sourceGrade: grade,
    ...(visual ? { visual } : {}),
    section: "Section B · Structured questions",
    responseType: "STRUCTURED",
    marks: 4,
    parts: rows.map(([prompt, answer], i) => ({
      id: String.fromCharCode(97 + i),
      prompt,
      answer: String(answer),
      marks: 1,
    })),
  };
}
export function mathematicsExam(seed: number, grade: string): MockQuestion[] {
  const r = seededRandom(seed),
    result: MockQuestion[] = [],
    seen = new Set<string>();
  const quotasA = [2, 4, 14],
    quotasB = [4, 7, 9];
  const nextGrade = (quotas: number[]) => {
    if (grade !== "Grade 9") return grade;
    const choices = quotas.flatMap((left, i) => (left ? [i] : []));
    const i = choices[Math.floor(r() * choices.length)];
    quotas[i]--;
    return `Grade ${7 + i}`;
  };
  for (const spec of MATH_ALLOCATION)
    for (let n = 0; n < spec.a; n++) {
      const sourceGrade = nextGrade(quotasA);
      const topics = gradeTopics(sourceGrade).filter(
        (t) => areaKey(t.area) === spec.area,
      );
      const topic = shuffle(topics, r)[0];
      if (!topic)
        throw Error(`No ${sourceGrade} ${spec.area} templates available`);
      let q = topic.make(r),
        tries = 0;
      while (
        seen.has(q.prompt + JSON.stringify(q.visual ?? null)) &&
        tries++ < 100
      )
        q = topic.make(r);
      if (seen.has(q.prompt + JSON.stringify(q.visual ?? null)))
        throw Error("Could not vary paper questions");
      seen.add(q.prompt + JSON.stringify(q.visual ?? null));
      result.push({
        ...q,
        id: `q-${result.length + 1}`,
        topicId: topic.id,
        topic: topic.name,
        area: spec.area,
        sourceGrade,
        section: "Section A · Multiple choice",
        responseType: "CHOICE",
        marks: 1,
      });
    }
  for (const spec of MATH_ALLOCATION)
    for (let n = 0; n < spec.b; n++) {
      const sourceGrade = nextGrade(quotasB);
      let q = structured(spec.area, sourceGrade, result.length + 1, r),
        tries = 0;
      while (seen.has(q.prompt) && tries++ < 100)
        q = structured(spec.area, sourceGrade, result.length + 1, r);
      if (seen.has(q.prompt))
        throw Error("Could not vary structured questions");
      seen.add(q.prompt);
      result.push(q);
    }
  return result;
}
