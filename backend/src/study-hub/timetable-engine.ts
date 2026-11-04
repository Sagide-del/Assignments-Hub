import { createHash, randomUUID } from "crypto";
import {
  DAYS,
  FocusSubject,
  ReviewDue,
  SchoolBlock,
  StudyBlock,
  StudyDay,
  WeeklyPlan,
  AiDays,
  Topic,
} from "./timetable.types";
export const QUOTES = [
  "Success is the sum of small efforts, repeated.",
  "Small steps, taken consistently, build strong habits.",
  "Learn a little. Recall it. Build on it.",
  "Progress grows from practice, patience and curiosity.",
];
export function kenyaDate(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}
export function addDays(key: string, n: number) {
  const d = new Date(key + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function monday(date = new Date()) {
  const key = kenyaDate(date),
    d = new Date(key + "T00:00:00.000Z");
  return addDays(key, -((d.getUTCDay() + 6) % 7));
}
export const minutes = (s: string) => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)) throw Error("Invalid clock time");
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
};
export const clock = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
const id = (...p: unknown[]) =>
  createHash("sha256").update(JSON.stringify(p)).digest("hex").slice(0, 24);
export function validateSchoolBlocks(input: unknown): SchoolBlock[] {
  if (!Array.isArray(input) || input.length > 70)
    throw Error("Provide up to 70 school time blocks.");
  for (const day of DAYS)
    if (input.filter((r: any) => r?.day === day).length > 10)
      throw Error("Provide up to 10 school time blocks per day.");
  return input.map((r: any) => {
    if (
      !r ||
      Object.keys(r).sort().join(",") !== "day,end,label,start" ||
      !DAYS.includes(r.day) ||
      typeof r.label !== "string" ||
      !r.label.trim() ||
      r.label.length > 100 ||
      minutes(r.start) >= minutes(r.end)
    )
      throw Error("Invalid school time block.");
    return { day: r.day, start: r.start, end: r.end, label: r.label.trim() };
  });
}
export function recallPrompts(subject: string, topic: string) {
  return /math/i.test(subject)
    ? [
        `State a useful rule for ${topic} without notes.`,
        `Solve one fresh example on ${topic} and show each step.`,
        `How can you check your answer and spot a common mistake?`,
      ]
    : /english|kiswahili|arabic|french|language/i.test(subject)
      ? [
          `Explain the main idea or rule in ${topic} from memory.`,
          `Write your own example using what you have learned.`,
          `Identify a common mistake and explain how to correct it.`,
        ]
      : [
          `Explain ${topic} in your own words without looking at notes.`,
          `Draw, describe or demonstrate one example from memory.`,
          `How would you apply this idea in a different situation?`,
        ];
}
function slots(day: number, blocked: SchoolBlock[]) {
  const window = day < 5 ? [960, 1260] : [540, 1020],
    target = day < 5 ? 3 : 6,
    result: { start: number; rest: number }[] = [];
  let cursor = window[0];
  const occupied = blocked
    .filter((b) => b.day === DAYS[day])
    .map((b) => ({ start: minutes(b.start), end: minutes(b.end) }))
    .sort((a, b) => a.start - b.start);
  for (let n = 0; n < target; n++) {
    if (day >= 5 && n === 3) cursor = Math.max(cursor, 840);
    const rest = (n + 1) % 3 === 0 ? 15 : (n + 1) % 2 === 0 ? 15 : 5;
    let placed = false;
    while (cursor + 25 + rest <= window[1]) {
      const clash = occupied.find(
        (b) => cursor < b.end && cursor + 25 + rest > b.start,
      );
      if (clash) {
        cursor = Math.max(cursor + 1, clash.end);
        continue;
      }
      result.push({ start: cursor, rest });
      cursor += 25 + rest;
      placed = true;
      break;
    }
    if (!placed) break;
  }
  return { window, result };
}
export function buildTemplate(input: {
  planId: string;
  week: string;
  today: string;
  subjects: FocusSubject[];
  school: SchoolBlock[];
  prior?: WeeklyPlan | null;
  previous?: WeeklyPlan | null;
  reportFiles: number;
  warnings: string[];
}): WeeklyPlan {
  const days: StudyDay[] = [],
    uses = new Map<string, number>(),
    topicUses = new Map<string, number>();
  const active = input.subjects.length
    ? input.subjects
    : [
        {
          subject: "Study skills",
          percentage: null,
          weak: false,
          sources: [],
          topics: [
            {
              subject: "Study skills",
              topic: "Recall and explain a recent lesson",
              weak: false,
              percentage: null,
            },
          ],
        },
      ];
  const queue: ReviewDue[] = [
    ...(input.previous?.next_week_reviews ?? []),
    ...(input.prior?.review_schedule.filter(
      (r) => r.learning_date < input.today && r.due_date >= input.today,
    ) ?? []),
  ];
  const uniqueQueue = [
    ...new Map(queue.map((r) => [JSON.stringify(r), r])).values(),
  ];
  const reviews: ReviewDue[] = [...uniqueQueue];
  const anchored = new Set(reviews.map((r) => r.subject + "|" + r.topic));
  const primary = active
    .filter((s) => s.weak)
    .slice(0, 2)
    .map((s) => s.subject);
  if (!primary.length) primary.push(active[0].subject);
  const capacities = DAYS.map((_, d) => slots(d, input.school).result.length);
  let previousSubject = "",
    subjectStreak = 0;
  const warnings = [...input.warnings];
  for (let d = 0; d < 7; d++) {
    const date = addDays(input.week, d),
      available = slots(d, input.school);
    const priorDay =
      date < input.today
        ? input.prior?.days.find((x) => x.date === date)
        : undefined;
    if (priorDay) {
      days.push(priorDay);
      for (const b of priorDay.blocks.filter(
        (b) => b.activity_type === "STUDY",
      ))
        uses.set(b.subject, (uses.get(b.subject) ?? 0) + 1);
      continue;
    }
    const blocks: StudyBlock[] = [];
    if (date >= input.today)
      for (let n = 0; n < available.result.length; n++) {
        const due = uniqueQueue
          .filter(
            (r) => r.due_date <= date && r.due_date <= addDays(input.week, 6),
          )
          .sort(
            (a, b) =>
              a.due_date.localeCompare(b.due_date) ||
              (a.subject === previousSubject ? 1 : 0) -
                (b.subject === previousSubject ? 1 : 0),
          )[0];
        let topic: Topic, review: ReviewDue | undefined;
        if (due) {
          const index = uniqueQueue.indexOf(due);
          uniqueQueue.splice(index, 1);
          const subject = active.find((s) => s.subject === due.subject);
          topic = {
            subject: due.subject,
            topic: due.topic,
            weak: subject?.weak ?? false,
            percentage: subject?.percentage ?? null,
            ...(due.module_id ? { module_id: due.module_id } : {}),
          };
          review = due;
          if (due.due_date < date)
            warnings.push(
              `A ${due.subject} review due ${due.due_date} was moved to ${date}.`,
            );
        } else {
          const uncovered = active.filter(
            (s) => s.weak && !uses.has(s.subject),
          );
          const candidates = (uncovered.length ? uncovered : active)
            .slice()
            .sort((a, b) => {
              const priority = (s: FocusSubject) =>
                (s.weak ? 4 + (60 - (s.percentage ?? 60)) / 20 : 1) /
                ((uses.get(s.subject) ?? 0) + 1);
              return (
                priority(b) - priority(a) || a.subject.localeCompare(b.subject)
              );
            });
          const chosen =
            subjectStreak >= 2
              ? (candidates.find((s) => s.subject !== previousSubject) ??
                candidates[0])
              : candidates[0];
          topic = chosen.topics
            .slice()
            .sort(
              (a, b) =>
                (topicUses.get(a.subject + "|" + a.topic) ?? 0) -
                (topicUses.get(b.subject + "|" + b.topic) ?? 0),
            )[0] ?? {
            subject: chosen.subject,
            topic: "Core concepts",
            weak: chosen.weak,
            percentage: chosen.percentage,
          };
        }
        const start = available.result[n].start,
          rest = available.result[n].rest;
        const studyId = id(date, start, topic.subject, topic.topic, "STUDY"),
          session = id(date, n, topic.subject, topic.topic);
        const recallId = id(
          date,
          start + 20,
          topic.subject,
          topic.topic,
          "RECALL",
        );
        const key = topic.subject + "|" + topic.topic;
        if (!review && !anchored.has(key) && primary.includes(topic.subject)) {
          const prospective = ([1, 3, 7] as const).map((offset) => ({
            subject: topic.subject,
            topic: topic.topic,
            learning_date: date,
            due_date: addDays(date, offset),
            offset_days: offset,
            ...(topic.module_id ? { module_id: topic.module_id } : {}),
          }));
          if (
            prospective.every((r) => {
              const index =
                (new Date(r.due_date + "T00:00:00Z").getUTCDay() + 6) % 7;
              const cap =
                r.due_date <= addDays(input.week, 6)
                  ? capacities[index]
                  : index < 5
                    ? 3
                    : 6;
              return (
                uniqueQueue.filter((q) => q.due_date === r.due_date).length <
                cap
              );
            })
          ) {
            uniqueQueue.push(...prospective);
            reviews.push(...prospective);
            anchored.add(key);
          }
        }
        const technique = review
          ? "Spaced Repetition"
          : n === 0
            ? "Pomodoro"
            : "Interleaving";
        blocks.push({
          id: studyId,
          session_id: session,
          start: clock(start),
          end: clock(start + 20),
          subject: topic.subject,
          topic: topic.topic,
          technique,
          activity_type: "STUDY",
          quiz_link: null,
          activity: `Study ${topic.topic} for 20 minutes, then close your notes for a five-minute recall check.`,
          focus_zone: topic.weak,
          ...(review ? { review } : {}),
          ...(topic.module_id ? { module_id: topic.module_id } : {}),
        });
        blocks.push({
          id: recallId,
          session_id: session,
          study_block_id: studyId,
          start: clock(start + 20),
          end: clock(start + 25),
          subject: topic.subject,
          topic: topic.topic,
          technique: "Active Recall",
          activity_type: "RECALL",
          quiz_link: topic.module_id
            ? `/student/study-hub/timetable/${input.planId}/recall/${recallId}`
            : null,
          activity:
            "Answer 3–5 quick questions without notes, then check and explain any corrections.",
          focus_zone: topic.weak,
          recall_prompts: recallPrompts(topic.subject, topic.topic),
          ...(topic.module_id ? { module_id: topic.module_id } : {}),
        });
        const reward = (n + 1) % 3 === 0;
        blocks.push({
          id: id(date, start + 25, "REST"),
          start: clock(start + 25),
          end: clock(start + 25 + rest),
          subject: reward ? "Reward" : "Break",
          topic: reward
            ? "Enjoy music, a short walk or a favourite video."
            : rest === 15
              ? "Long rest"
              : "Short rest",
          technique: reward ? "Reward" : "Rest",
          activity_type: reward ? "REWARD" : "BREAK",
          quiz_link: null,
          activity: reward
            ? "Your third Pomodoro is complete. Enjoy a 15-minute reward and rest."
            : `Take ${rest} minutes away from focused study.`,
          focus_zone: false,
        });
        uses.set(topic.subject, (uses.get(topic.subject) ?? 0) + 1);
        topicUses.set(key, (topicUses.get(key) ?? 0) + 1);
        subjectStreak =
          previousSubject === topic.subject ? subjectStreak + 1 : 1;
        previousSubject = topic.subject;
      }
    const full: StudyBlock[] = [];
    let cursor = available.window[0];
    function gap(until: number) {
      if (until <= cursor) return;
      const boundaries = new Set([cursor, until]);
      const school = input.school.filter(
        (s) =>
          s.day === DAYS[d] &&
          minutes(s.start) < until &&
          minutes(s.end) > cursor,
      );
      for (const b of school) {
        boundaries.add(Math.max(cursor, minutes(b.start)));
        boundaries.add(Math.min(until, minutes(b.end)));
      }
      const times = [...boundaries].sort((a, b) => a - b);
      for (let i = 0; i < times.length - 1; i++) {
        const start = times[i],
          end = times[i + 1];
        if (start === end) continue;
        const occupied = school.find(
          (s) => minutes(s.start) < end && minutes(s.end) > start,
        );
        full.push({
          id: id(date, start, end, "FREE"),
          start: clock(start),
          end: clock(end),
          subject: occupied ? "School commitment" : "Break",
          topic:
            date < input.today
              ? "Earlier this week"
              : (occupied?.label ?? "Personal time / meals"),
          technique: "Rest",
          activity_type: "BREAK",
          quiz_link: null,
          activity:
            date < input.today
              ? "No new study sessions are backdated."
              : occupied
                ? "Reserved for your school timetable."
                : "Rest, eat, move or spend time with family.",
          focus_zone: false,
          ...(occupied ? { school_commitment: true } : {}),
        });
      }
      cursor = until;
    }
    for (const b of blocks) {
      gap(minutes(b.start));
      full.push(b);
      cursor = minutes(b.end);
    }
    gap(available.window[1]);
    days.push({
      day: DAYS[d],
      date,
      window: {
        start: clock(available.window[0]),
        end: clock(available.window[1]),
      },
      blocks: full,
    });
  }
  for (const s of active.filter((s) => s.weak))
    if (
      !days.some((d) =>
        d.blocks.some(
          (b) => b.activity_type === "RECALL" && b.subject === s.subject,
        ),
      )
    )
      warnings.push(
        `No free session was available for ${s.subject}; adjust school commitments or practise it next week.`,
      );
  const studyIds = new Set(
    days.flatMap((d) =>
      d.blocks.filter((b) => b.activity_type === "STUDY").map((b) => b.id),
    ),
  );
  const next = [
    ...uniqueQueue.filter((r) => r.due_date > addDays(input.week, 6)),
  ];
  for (const r of uniqueQueue.filter(
    (r) => r.due_date <= addDays(input.week, 6),
  ))
    next.push({ ...r, due_date: addDays(input.week, 7) });
  const plan: WeeklyPlan = {
    version: 1,
    status: "READY",
    revision: randomUUID(),
    week_start: input.week,
    timezone: "Africa/Nairobi",
    days,
    focus_subjects: active,
    source: "TEMPLATE",
    warnings: [...new Set(warnings)],
    completed_block_ids: (input.prior?.completed_block_ids ?? []).filter((id) =>
      studyIds.has(id),
    ),
    quiz_results: {},
    review_schedule: reviews,
    next_week_reviews: next,
    school_schedule_applied: input.school.length > 0,
    report_card_files: input.reportFiles,
    quote: QUOTES[Number(input.week.replace(/-/g, "")) % QUOTES.length],
  };
  validateSchedule(plan, input.school, input.today);
  return plan;
}
export function aiShape(plan: WeeklyPlan): AiDays {
  return {
    days: plan.days.map((d) => ({
      day: d.day,
      blocks: d.blocks.map(
        ({
          start,
          end,
          subject,
          topic,
          technique,
          activity_type,
          quiz_link,
          activity,
        }) => ({
          start,
          end,
          subject,
          topic,
          technique,
          activity_type,
          quiz_link,
          activity,
        }),
      ),
    })),
  };
}
export function validateAiDays(
  value: unknown,
  template: WeeklyPlan,
): WeeklyPlan {
  const data = typeof value === "string" ? JSON.parse(value) : value;
  const obj = (v: any, keys: string[]) => {
    if (
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).sort().join(",") !== keys.sort().join(",")
    )
      throw Error("Unexpected timetable fields");
  };
  obj(data, ["days"]);
  const raw = (data as any).days;
  if (!Array.isArray(raw) || raw.length !== 7)
    throw Error("Exactly seven days required");
  const expected = aiShape(template);
  for (let d = 0; d < 7; d++) {
    obj(raw[d], ["day", "blocks"]);
    if (
      raw[d].day !== DAYS[d] ||
      !Array.isArray(raw[d].blocks) ||
      raw[d].blocks.length !== expected.days[d].blocks.length
    )
      throw Error("Day or block count changed");
    for (let i = 0; i < raw[d].blocks.length; i++) {
      const block = raw[d].blocks[i],
        fixed = expected.days[d].blocks[i];
      obj(block, [
        "start",
        "end",
        "subject",
        "topic",
        "technique",
        "activity_type",
        "quiz_link",
        "activity",
      ]);
      for (const key of [
        "start",
        "end",
        "subject",
        "topic",
        "technique",
        "activity_type",
        "quiz_link",
      ] as const)
        if (block[key] !== fixed[key])
          throw Error(`Invalid ${key}: preserve validated study structure`);
      if (
        typeof block.activity !== "string" ||
        !block.activity.trim() ||
        block.activity.length > 240
      )
        throw Error("Activity guidance must be 1–240 characters");
    }
  }
  return {
    ...template,
    source: "AI",
    days: template.days.map((d, index) => ({
      ...d,
      blocks: d.blocks.map((b, i) => ({
        ...b,
        activity: raw[index].blocks[i].activity.trim(),
      })),
    })),
  };
}
export function validateSchedule(
  plan: WeeklyPlan,
  school: SchoolBlock[] = [],
  preserveBefore?: string,
) {
  if (plan.version !== 1 || plan.days.length !== 7)
    throw Error("Invalid saved timetable");
  const ids = new Set<string>();
  for (let d = 0; d < 7; d++) {
    const day = plan.days[d];
    if (
      day.day !== DAYS[d] ||
      day.date !== addDays(plan.week_start, d) ||
      day.blocks.length > 40
    )
      throw Error("Invalid timetable day");
    const start = d < 5 ? 960 : 540,
      end = d < 5 ? 1260 : 1020;
    let cursor = start,
      count = 0;
    for (let i = 0; i < day.blocks.length; i++) {
      const b = day.blocks[i],
        a = minutes(b.start),
        z = minutes(b.end);
      if (ids.has(b.id) || a !== cursor || z <= a || z > end)
        throw Error("Overlapping or out-of-window blocks");
      ids.add(b.id);
      cursor = z;
      if (b.activity_type === "STUDY") {
        count++;
        const recall = day.blocks[i + 1],
          rest = day.blocks[i + 2];
        if (
          z - a !== 20 ||
          recall?.activity_type !== "RECALL" ||
          minutes(recall.end) - minutes(recall.start) !== 5 ||
          recall.study_block_id !== b.id ||
          rest?.activity_type !== (count % 3 === 0 ? "REWARD" : "BREAK") ||
          minutes(rest.end) - minutes(rest.start) <
            (count % 2 === 0 || count % 3 === 0 ? 15 : 5)
        )
          throw Error("Invalid focus/recall/rest cycle");
        if (
          (!preserveBefore || day.date >= preserveBefore) &&
          school.some(
            (s) =>
              s.day === day.day &&
              a < minutes(s.end) &&
              minutes(rest.end) > minutes(s.start),
          )
        )
          throw Error("Study overlaps school timetable");
      }
      if (
        b.activity_type === "RECALL" &&
        (!b.recall_prompts ||
          b.recall_prompts.length < 3 ||
          b.recall_prompts.length > 5)
      )
        throw Error("Recall requires 3–5 prompts");
      if (
        b.quiz_link &&
        (!b.module_id ||
          b.activity_type !== "RECALL" ||
          !/^\/student\/study-hub\/timetable\/[a-f0-9-]+\/recall\/[a-f0-9]+$/.test(
            b.quiz_link,
          ))
      )
        throw Error("Invalid quiz link");
    }
    if (cursor !== end)
      throw Error("Every day must cover its availability window");
  }
}
