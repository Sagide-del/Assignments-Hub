import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Target, CheckCircle2 } from "lucide-react";
import { timetableApi, type RecallResult } from "../../api/timetable.api";
import { useAuthStore } from "../../store/auth.store";
import { apiErrorMessage } from "../../api/axios";
import { MathText } from "../../components/ExamDiagrams/MathText";
import { DiagramRenderer } from "../../components/ExamDiagrams/DiagramRenderer";
export default function TimetableRecall() {
  const { id, blockId } = useParams(),
    actor = useAuthStore((s) => s.user),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ["timetable-quiz", actor?.id, id, blockId],
    queryFn: () => timetableApi.quiz(id!, blockId!),
    enabled: !!id && !!blockId,
    retry: false,
  });
  const [answers, setAnswers] = useState<Record<number, string>>({}),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<RecallResult | null>(null),
    [error, setError] = useState("");
  async function submit() {
    if (!query.data) return;
    setBusy(true);
    setError("");
    try {
      setResult(
        await timetableApi.submitQuiz(
          id!,
          blockId!,
          query.data.revision,
          query.data.questions.map((q) => ({
            question_index: q.question_index,
            answer: answers[q.question_index],
          })),
        ),
      );
      await cache.invalidateQueries({ queryKey: ["weekly-timetable"] });
    } catch (e) {
      setError(apiErrorMessage(e, "Could not check your answers."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to={`/student/study-hub/timetable?plan=${id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft size={16} />
        Back to study plan
      </Link>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Target size={24} className="text-pink-700" />
          Quick recall
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {query.data?.subject} · {query.data?.topic}
        </p>
      </header>
      {query.isLoading ? (
        <p role="status">Loading published questions…</p>
      ) : query.error ? (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          {apiErrorMessage(
            query.error,
            "This published quiz is unavailable. Return to your plan for self-recall practice.",
          )}
        </p>
      ) : (
        query.data?.questions.map((q, i) => {
          const feedback = result?.results.find(
            (r) => r.question_index === q.question_index,
          );
          return (
            <article
              key={q.question_index}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <p className="mb-3 text-xs text-slate-400">
                Question {i + 1} of {query.data.questions.length}
              </p>
              <DiagramRenderer illustration={q.illustration} />
              <div className="text-base font-medium">
                <MathText text={q.question_text} />
              </div>
              <div className="mt-4 space-y-2">
                {q.options.map((option) => (
                  <label
                    key={option}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${feedback?.correct_answer === option ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.question_index}`}
                      value={option}
                      disabled={!!result || busy}
                      checked={answers[q.question_index] === option}
                      onChange={() =>
                        setAnswers({ ...answers, [q.question_index]: option })
                      }
                      className="mt-1"
                    />
                    <MathText text={option} />
                  </label>
                ))}
              </div>
              {feedback && (
                <div className="mt-4 rounded-lg bg-sky-50 p-4 text-sm leading-6">
                  <p className="font-medium">
                    {feedback.correct ? "Correct" : "A useful correction"}
                  </p>
                  <p className="mt-1">{feedback.explanation}</p>
                </div>
              )}
            </article>
          );
        })
      )}
      {error && (
        <p role="alert" className="text-sm text-amber-900">
          {error}
        </p>
      )}
      {result ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <CheckCircle2 size={19} />
          {result.score}/{result.total} correct. This study session is marked
          complete.
        </div>
      ) : (
        query.data && (
          <button
            disabled={
              busy ||
              query.data.questions.some((q) => !answers[q.question_index])
            }
            onClick={() => void submit()}
            className="rounded-lg bg-[#101820] px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? "Checking…" : "Check my answers"}
          </button>
        )
      )}
    </div>
  );
}
