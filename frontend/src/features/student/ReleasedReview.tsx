import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import type { Answer } from "../../types";
import { RichContent } from "../../components/ui/RichContent";
import {
  expectedAnswer,
  explanationParts,
  explanationParagraphs,
  meaningfulFeedback,
  optionMatches,
  resultBadge,
} from "./review-presentation";

function Response({ value }: { value: string }) {
  if (/^https?:\/\//i.test(value))
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-sky-700 underline"
      >
        Open submitted file
      </a>
    );
  return /<[a-z][\s\S]*>/i.test(value) ? (
    <RichContent html={value} className="assessment-question-copy" />
  ) : (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">
      {value || "No answer provided"}
    </p>
  );
}
function ExplanationText({ text }: { text: string }) {
  const paragraphs = explanationParagraphs(text);
  return (
    <div className="space-y-3 text-sm leading-7 text-slate-700">
      {paragraphs.map((part, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
        >
          {part.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith("**") && chunk.endsWith("**") ? (
              <strong key={j} className="font-semibold text-slate-900">
                {chunk.slice(2, -2)}
              </strong>
            ) : (
              chunk
            ),
          )}
        </p>
      ))}
    </div>
  );
}
function TransferPractice({
  prompt,
  answer,
  guide,
}: {
  prompt: string;
  answer: string;
  guide: string;
}) {
  const [response, setResponse] = useState(""),
    [reveal, setReveal] = useState(false);
  return (
    <section
      aria-label="Check your understanding"
      className="rounded-xl bg-[#f1f6e5] p-4 sm:p-5"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#405615]">
        <RotateCcw size={16} aria-hidden="true" />
        Check your understanding
      </h3>
      <p className="mt-1 text-xs leading-6 text-slate-500">
        Try this before looking back at the explanation.
      </p>
      <div className="mt-3">
        <ExplanationText text={prompt} />
      </div>
      <label className="mt-3 block text-xs font-medium text-slate-600">
        Your practice response
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#607d00]"
        />
      </label>
      <button
        type="button"
        onClick={() => setReveal(!reveal)}
        className="mt-2 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[#405615] underline underline-offset-4"
      >
        {reveal
          ? "Hide guidance"
          : answer
            ? "Reveal practice answer"
            : "Review guidance"}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {reveal && (
        <div className="mt-2 rounded-lg bg-white/80 p-3" role="status">
          {answer ? (
            <ExplanationText text={answer} />
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold text-slate-600">
                Use this explanation to check your reasoning. A separate answer
                to this practice prompt was not supplied.
              </p>
              <ExplanationText text={guide} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
function AnswerReview({
  answer,
  index,
  total,
}: {
  answer: Answer;
  index: number;
  total: number;
}) {
  const [retry, setRetry] = useState(false),
    [practice, setPractice] = useState(""),
    [reason, setReason] = useState("");
  const q = answer.question,
    expected = expectedAnswer(q),
    badge = resultBadge(answer, q?.points),
    feedback = meaningfulFeedback(answer.feedback),
    explanation = explanationParts(q?.explanation);
  const options =
    q?.questionType === "MULTIPLE_CHOICE" && Array.isArray(q.options)
      ? q.options.filter((o): o is string => typeof o === "string")
      : q?.questionType === "TRUE_FALSE"
        ? ["True", "False"]
        : [];
  const matched = options.some((o, i) =>
    optionMatches(q?.correctAnswer, o, i, options),
  );
  return (
    <article
      aria-label={`Review of question ${index + 1}`}
      className="min-w-0 rounded-2xl bg-white px-4 py-5 sm:px-7 sm:py-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          Question {index + 1} of {total}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <span
            className={
              badge.label === "Correct"
                ? "text-emerald-700"
                : badge.label === "Incorrect"
                  ? "text-amber-800"
                  : "text-slate-600"
            }
          >
            {badge.label}
          </span>
        </p>
        <span>
          {answer.pointsAwarded != null && q
            ? `${answer.pointsAwarded} / ${q.points} marks`
            : "Awaiting review"}
        </span>
      </div>
      <div className="mt-5">
        {q?.contentHtml ? (
          <RichContent
            html={q.contentHtml}
            className="assessment-question-copy"
          />
        ) : (
          <p className="break-words text-lg font-semibold leading-8 text-slate-900 [overflow-wrap:anywhere]">
            {q?.questionText ?? "Question text unavailable"}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setRetry(!retry)}
          aria-pressed={retry}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
        >
          {retry ? (
            <Eye size={15} aria-hidden="true" />
          ) : (
            <EyeOff size={15} aria-hidden="true" />
          )}
          {retry ? "Reveal & compare" : "Hide answers & retry"}
        </button>
        {retry && (
          <span className="text-xs text-slate-500">
            Practice only · your submitted score stays the same
          </span>
        )}
      </div>
      {retry ? (
        <div className="mt-4 space-y-4">
          {options.length ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-slate-700">
                Try the question again
              </legend>
              {options.map((option, i) => (
                <label
                  key={i}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg bg-slate-50 px-4 py-3"
                >
                  <input
                    type="radio"
                    name={`retry-${answer.id}`}
                    value={option}
                    checked={practice === option}
                    onChange={() => setPractice(option)}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <Response value={option} />
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <label className="block text-sm font-medium text-slate-700">
              Your practice answer
              <textarea
                value={practice}
                onChange={(e) => setPractice(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-7"
              />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Explain your reasoning
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-7"
            />
          </label>
          <button
            type="button"
            onClick={() => setRetry(false)}
            className="min-h-11 rounded-lg bg-[#101820] px-4 text-xs font-semibold text-white"
          >
            Reveal & compare
          </button>
        </div>
      ) : (
        <>
          {practice && (
            <section className="mt-4 border-l-2 border-blue-300 bg-blue-50/50 px-4 py-3">
              <h3 className="mb-1 text-xs font-semibold text-slate-600">
                Your practice response · not graded
              </h3>
              <Response value={practice} />
              {reason && (
                <div className="mt-2">
                  <Response value={reason} />
                </div>
              )}
            </section>
          )}
          {options.length ? (
            <ol
              aria-label="Answer choices"
              className="mt-4 divide-y divide-slate-100"
            >
              {options.map((option, i) => {
                const chosen = optionMatches(
                    answer.studentAnswer,
                    option,
                    i,
                    options,
                  ),
                  correct = optionMatches(q?.correctAnswer, option, i, options);
                return (
                  <li
                    key={i}
                    className={`flex min-h-14 items-start gap-3 border-l-2 px-3 py-3 ${correct ? "border-emerald-400 bg-emerald-50/30" : chosen ? "border-slate-400 bg-slate-50" : "border-transparent"}`}
                  >
                    <span className="mt-0.5 text-xs font-medium text-slate-400">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Response value={option} />
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
                        {chosen && (
                          <span className="text-slate-500">
                            Your submitted answer
                          </span>
                        )}
                        {correct && (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <Check size={12} aria-hidden="true" />
                            Correct answer
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              <section className="border-l-2 border-slate-300 bg-slate-50/70 px-4 py-3">
                <h3 className="mb-1 text-xs font-semibold text-slate-500">
                  Your submitted answer
                </h3>
                <Response value={answer.studentAnswer} />
              </section>
            </div>
          )}
          {(!options.length || !matched) && (
            <section className="mt-3 border-l-2 border-emerald-300 px-4 py-3">
              <h3 className="mb-1 text-xs font-semibold text-emerald-700">
                {expected ? "Expected answer" : "Review guidance"}
              </h3>
              <Response
                value={
                  expected ??
                  "This response is reviewed manually. Use the feedback and awarded marks to guide your review."
                }
              />
            </section>
          )}
          {options.length > 0 &&
            !options.some((o, i) =>
              optionMatches(answer.studentAnswer, o, i, options),
            ) && (
              <section className="mt-3 border-l-2 border-slate-300 px-4 py-3">
                <h3 className="mb-1 text-xs font-semibold text-slate-500">
                  Your submitted answer
                </h3>
                <Response value={answer.studentAnswer} />
              </section>
            )}
          {feedback && (
            <section className="mt-5">
              <h3 className="mb-2 text-xs font-semibold text-slate-500">
                Feedback
              </h3>
              <ExplanationText text={feedback} />
            </section>
          )}
          {explanation.body && (
            <section className="mt-6 rounded-xl bg-sky-50/70 p-4 sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Lightbulb
                  size={16}
                  className="text-sky-700"
                  aria-hidden="true"
                />
                Why this works
              </h3>
              <ExplanationText text={explanation.body} />
            </section>
          )}
          {explanation.practice && (
            <div className="mt-5">
              <TransferPractice
                prompt={explanation.practice}
                answer={explanation.answer}
                guide={explanation.body}
              />
            </div>
          )}
        </>
      )}
    </article>
  );
}
export function ReleasedReview({
  answers,
  index,
  onSelect,
  summary,
  feedback,
}: {
  answers: Answer[];
  index: number;
  onSelect: (i: number) => void;
  summary: React.ReactNode;
  feedback?: string | null;
}) {
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const active = answers[index];
  return (
    <div className="min-w-0 space-y-5 rounded-2xl bg-[#F9FAFB] p-1 sm:p-3">
      {summary}
      {meaningfulFeedback(feedback) && (
        <section className="rounded-xl bg-sky-50 px-4 py-3">
          <h2 className="mb-1 text-xs font-semibold text-sky-800">
            Overall feedback
          </h2>
          <ExplanationText text={feedback!} />
        </section>
      )}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
        <aside className="min-w-0 xl:order-last">
          <button
            type="button"
            onClick={() => setNavigatorOpen(!navigatorOpen)}
            aria-expanded={navigatorOpen}
            aria-controls="review-question-grid"
            className="flex min-h-11 w-full items-center justify-between rounded-lg bg-white px-3 text-xs font-semibold text-slate-600 xl:hidden"
          >
            Question navigator · {index + 1}/{answers.length}
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          <div className="xl:sticky xl:top-6 xl:px-2">
            <h2 className="hidden text-sm font-semibold text-slate-700 xl:block">
              Question navigator
            </h2>
            <nav
              id="review-question-grid"
              aria-label="Review question navigator"
              className={`${navigatorOpen ? "grid" : "hidden"} mt-3 grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-2 xl:grid`}
            >
              {answers.map((a, i) => {
                const status = resultBadge(a, a.question?.points).label;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onSelect(i);
                      setNavigatorOpen(false);
                    }}
                    aria-label={`Review question ${i + 1}: ${status}`}
                    aria-current={i === index ? "step" : undefined}
                    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${i === index ? "bg-[#101820] text-white" : status === "Correct" ? "bg-emerald-50 text-emerald-800" : status === "Partial" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </nav>
            <p
              className={`${navigatorOpen ? "block" : "hidden"} mt-3 text-[11px] leading-5 text-slate-500 xl:block`}
            >
              Dark: current · Green: correct
              <br />
              Amber: partial · Grey: review
            </p>
          </div>
        </aside>
        <div className="min-w-0 xl:order-first">
          {active && (
            <AnswerReview
              key={active.id}
              answer={active}
              index={index}
              total={answers.length}
            />
          )}
          <nav
            aria-label="Move through review"
            className="mt-4 flex items-center justify-between gap-3 px-1"
          >
            <button
              type="button"
              onClick={() => onSelect(index - 1)}
              disabled={index === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-30"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Previous
            </button>
            <span className="text-xs text-slate-400">
              {index + 1} / {answers.length}
            </span>
            <button
              type="button"
              onClick={() => onSelect(index + 1)}
              disabled={index === answers.length - 1}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-30"
            >
              Next
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
