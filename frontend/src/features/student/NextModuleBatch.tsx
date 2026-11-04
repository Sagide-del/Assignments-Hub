import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api, apiErrorMessage } from "../../api/axios";
export function NextModuleBatch({
  subject,
  topic,
}: {
  subject: string;
  topic: string;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [suggestion, setSuggestion] = useState<string | null>(null),
    [empty, setEmpty] = useState(false);
  async function next() {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get<{
        mastered: boolean;
        unavailable?: boolean;
        module?: { id: string; batch_number: number };
        next_topic_suggestion: string | null;
      }>(
        `/student/next-batch/${encodeURIComponent(subject)}/${encodeURIComponent(topic)}`,
      );
      if (data.mastered) {
        setDone(true);
        setSuggestion(data.next_topic_suggestion);
        return;
      }
      if (!data.module) {
        setEmpty(true);
        return;
      }
      const opened = await api.post<{ id: number }>(
        `/cms/learning/${data.module.id}/start`,
      );
      navigate(`/student/assignments/${opened.data.id}`);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not open the next batch."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Next learning batch"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div>
        <p className="text-sm font-semibold">{topic}</p>
        <p className="mt-1 text-xs text-slate-500">
          {done
            ? "All published batches completed."
            : empty
              ? "No new published batch is available yet."
              : "Your completed batch stays saved."}
        </p>
        {done && suggestion && (
          <Link
            className="mt-2 inline-block text-xs font-medium underline"
            to={`/student/my-assignments?q=${encodeURIComponent(suggestion)}`}
          >
            Next topic: {suggestion}
          </Link>
        )}
      </div>
      {!done && !empty && (
        <button
          disabled={busy}
          onClick={() => void next()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Opening…" : "Continue to Next Batch"}
          <ArrowRight size={15} />
        </button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-amber-900">
          {error}
        </p>
      )}
    </section>
  );
}
