import { approvedChoices, BankItem } from "../kjsea/question-pool";
import { MockQuestion, seededRandom, shuffle } from "../kjsea/mathematics";
type PracticeItem = BankItem & { points?: number; config?: any };
export function approvedPractice(rows: PracticeItem[]) {
  const choices = new Map(approvedChoices(rows).map((q) => [q.id, q]));
  return rows.filter(
    (q) =>
      q.questionText.trim() &&
      q.correctAnswer?.trim() &&
      q.explanation?.trim() &&
      (q.questionType === "MULTIPLE_CHOICE"
        ? choices.has(q.id)
        : ["NUMERIC", "SHORT_ANSWER", "ESSAY", "TRUE_FALSE"].includes(
            q.questionType,
          )),
  );
}
export function practicePaper(
  rows: PracticeItem[],
  seed: number,
): MockQuestion[] {
  const r = seededRandom(seed);
  return rows.map((q, i) => {
    const base = {
      id: `q-${i + 1}`,
      topicId: `bank-topic:${q.topic}`,
      topic: q.topic,
      area: q.topic,
      prompt: q.questionText,
      sourceQuestionId: q.id,
      sourceGrade: q.grade,
      explanation: q.explanation!,
      marks: q.points ?? 1,
      ...(q.contentHtml ? { contentHtml: q.contentHtml } : {}),
      ...(q.diagramUrl
        ? {
            diagramUrl: q.diagramUrl,
            diagramAlt: q.diagramAlt ?? "Question illustration",
          }
        : {}),
    };
    if (
      q.questionType === "MULTIPLE_CHOICE" ||
      q.questionType === "TRUE_FALSE"
    ) {
      const options = shuffle(
        q.questionType === "TRUE_FALSE"
          ? ["True", "False"]
          : (q.options as string[]),
        r,
      );
      return {
        ...base,
        options,
        correctIndex: options.findIndex(
          (o) =>
            o.trim().toLowerCase() === q.correctAnswer!.trim().toLowerCase(),
        ),
      };
    }
    const short = q.config?.shortAnswer;
    return {
      ...base,
      options: [],
      correctIndex: -1,
      responseType: "STRUCTURED",
      manualSelfReview: q.questionType === "ESSAY",
      parts: [
        {
          id: "answer",
          prompt: "Your response",
          answer: q.questionType==='NUMERIC' && Number.isFinite(q.config?.numeric?.acceptedValue) ? String(q.config.numeric.acceptedValue) : q.correctAnswer!,
          answerType: q.questionType === "NUMERIC" ? "NUMERIC" : "TEXT",
          marks: q.points ?? 1,
          ...(short?.keywords?.length
            ? {
                match: {
                  keywords: short.keywords,
                  threshold: short.passThreshold ?? 0.6,
                },
              }
            : {}),
        },
      ],
    } as MockQuestion;
  });
}
