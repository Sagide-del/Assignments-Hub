import type { Answer, Question } from "../../types";
export function expectedAnswer(question: Question | undefined): string | null {
  if (!question) return null;
  if (question.questionType === "NUMERIC") {
    const numeric = question.config?.numeric;
    if (numeric && typeof numeric === "object") {
      const config = numeric as Record<string, unknown>;
      if (config.acceptedValue !== undefined) {
        return `${String(config.acceptedValue)}${typeof config.unit === "string" && config.unit ? ` ${config.unit}` : ""}`;
      }
    }
  }
  if (question.questionType === "SHORT_ANSWER") {
    const shortAnswer = question.config?.shortAnswer;
    if (shortAnswer && typeof shortAnswer === "object") {
      const keywords = (shortAnswer as Record<string, unknown>).keywords;
      if (Array.isArray(keywords) && keywords.length) {
        return `Expected concepts: ${keywords.map(String).join(", ")}`;
      }
    }
  }

  const answer = question.correctAnswer?.trim();
  if (!answer) return null;
  if (question.questionType === "ORDERING") {
    try {
      const order = JSON.parse(answer);
      if (Array.isArray(order)) return order.map(String).join(" → ");
    } catch {
      return answer;
    }
  }
  if (question.questionType === "MATCHING") {
    try {
      const matches = JSON.parse(answer) as Record<string, string>;
      const options = question.options as {
        left?: string[];
        right?: string[];
      } | null;
      if (options?.left && options.right) {
        return Object.entries(matches)
          .map(
            ([leftIndex, rightIndex]) =>
              `${options.left?.[Number(leftIndex)]} → ${options.right?.[Number(rightIndex)]}`,
          )
          .join("; ");
      }
    } catch {
      return answer;
    }
  }
  return answer;
}

export function resultBadge(answer: Answer, maxPoints: number | undefined) {
  if (answer.pointsAwarded == null || maxPoints == null) {
    return {
      label: "Awaiting review",
      className: "bg-slate-100 text-slate-600",
    };
  }
  if (answer.pointsAwarded <= 0) {
    return { label: "Incorrect", className: "bg-amber-50 text-amber-800" };
  }
  if (answer.pointsAwarded >= maxPoints) {
    return { label: "Correct", className: "bg-emerald-50 text-emerald-700" };
  }
  return { label: "Partial", className: "bg-amber-50 text-amber-700" };
}

const GENERIC_FEEDBACK = new Set([
  "the answer does not match the expected response",
  "correct",
  "incorrect",
  "correct answer",
  "incorrect answer",
  "your answer is correct",
  "your answer is incorrect",
]);
export function meaningfulFeedback(value?: string | null) {
  const text = value?.trim();
  return text && !GENERIC_FEEDBACK.has(text.toLowerCase().replace(/[.!]+$/, ""))
    ? text
    : null;
}
export function explanationParts(value?: string | null) {
  const text = value?.trim() ?? "";
  const marker =
    /(?:^|\s)(?:transfer check|check your understanding|try this|retrieval cue)\s*[:–—-]\s*/i.exec(
      text,
    );
  if (!marker) return { body: text, practice: "", answer: "" };
  const tail = text.slice(marker.index + marker[0].length).trim();
  const answerMarker = /(?:^|\n)\s*(?:answer|expected answer)\s*:\s*/i.exec(
    tail,
  );
  return {
    body: text.slice(0, marker.index).trim(),
    practice: answerMarker ? tail.slice(0, answerMarker.index).trim() : tail,
    answer: answerMarker
      ? tail.slice(answerMarker.index + answerMarker[0].length).trim()
      : "",
  };
}
export function optionMatches(
  value: string | undefined | null,
  option: string,
  index: number,
  options: string[],
) {
  const normalized = (value ?? "").trim().toLocaleLowerCase();
  if (!normalized) return false;
  if (options.some((o) => o.trim().toLocaleLowerCase() === normalized))
    return option.trim().toLocaleLowerCase() === normalized;
  return /^[a-z]$/.test(normalized) && normalized.charCodeAt(0) - 97 === index;
}

export function explanationParagraphs(text: string) {
  return text
    .split(/\n\s*\n|\n(?=\d+[.)]\s)/)
    .filter(Boolean)
    .flatMap((part) => {
      if (part.length < 360) return [part];
      const sentences = part.split(/(?<=[.!?])\s+(?=[A-Z])/);
      const chunks: string[] = [];
      for (let i = 0; i < sentences.length; i += 2)
        chunks.push(sentences.slice(i, i + 2).join(" "));
      return chunks;
    });
}
