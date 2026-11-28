import {
  juniorDesign,
  juniorReady,
  replayJunior,
  type JuniorEvent,
  type JuniorKind,
} from "./junior-science";
const answers: Record<JuniorKind, number[]> = {
  filtration: [1, 2],
  microscope: [0, 1],
  waves: [1, 2],
};
export function assessJunior(
  key: string,
  e: { version: string; events: unknown[]; conclusion: string },
) {
  const design = juniorDesign(key);
  if (!design || e.version !== "junior-science-v1")
    throw Error("Use the correct investigation for this activity.");
  const state = replayJunior(design.kind, e.events as JuniorEvent[]);
  if (!juniorReady(design.kind, state, e.conclusion))
    throw Error(
      "Predict, record a controlled comparison, answer both checks and explain your evidence.",
    );
  const marks = answers[design.kind].map((choice, i) => ({
    question: i,
    correct: state.answers[i] === choice,
  }));
  return {
    version: e.version,
    topic: design.topic,
    prediction: state.prediction,
    events: e.events,
    trials: state.trials,
    conclusion: e.conclusion,
    knowledgeCheck: {
      score: marks.filter((m) => m.correct).length,
      maxScore: 2,
      marks,
    },
    reasoningStatus: "RECORDED_NOT_TEACHER_ASSESSED",
  };
}
