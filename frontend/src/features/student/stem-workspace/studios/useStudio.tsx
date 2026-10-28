import type { StarchEvent } from "../../../../../../backend/src/labs/starch-engine";
import type { MolecularEvent } from "../../../../../../backend/src/labs/molecular-engine";
import type { RespiratoryEvent } from "../../../../../../backend/src/labs/respiratory-engine";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, LoaderCircle, Save } from "lucide-react";
import type { Lab } from "../../../../types";
import { labSessionsApi } from "../../../../api/labs.api";
import { apiErrorMessage } from "../../../../api/axios";
import type {
  CyberEvent,
  PendulumEvent,
} from "../../../../../../backend/src/labs/studio-engine";
interface Draft<E> {
  events: E[];
  conclusion: string;
  answers: Record<number, string>;
}
export function useStudio<
  E extends
    | CyberEvent
    | PendulumEvent
    | RespiratoryEvent
    | StarchEvent
    | MolecularEvent,
  S,
>({
  lab,
  userId,
  version,
  replay,
}: {
  lab: Lab;
  userId: number;
  version: string;
  replay: (events: E[]) => S;
}) {
  const key = `${version}:${userId}:${lab.id}`;
  const [draft, setDraft] = useState<Draft<E>>(() => {
    try {
      const d = JSON.parse(localStorage.getItem(key) ?? "null");
      if (d?.version !== version) throw Error();
      replay(d.events);
      return {
        events: d.events,
        conclusion:
          typeof d.conclusion === "string" ? d.conclusion.slice(0, 5000) : "",
        answers:
          d.answers && typeof d.answers === "object"
            ? Object.fromEntries(
                Object.entries(d.answers).filter(
                  ([, v]) => typeof v === "string",
                ),
              )
            : {},
      } as Draft<E>;
    } catch {
      return { events: [], conclusion: "", answers: {} };
    }
  });
  const latest = useRef(draft);
  latest.current = draft;
  const [message, setMessage] = useState(""),
    [storageError, setStorageError] = useState(false),
    [saved, setSaved] = useState(false),
    submitted = useRef(""),
    client = useQueryClient();
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ version, ...draft }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [key, draft, version]);
  const update = (change: Partial<Draft<E>>) => {
    setDraft((d) => ({ ...d, ...change }));
    setSaved(false);
  };
  const dispatch = (event: E) => {
    try {
      const events = [...latest.current.events, event];
      replay(events);
      latest.current = { ...latest.current, events };
      update({ events });
      setMessage("");
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "This action could not be completed.",
      );
      return false;
    }
  };
  const payload = () => ({
    labKey: lab.key,
    answers: (lab.questions ?? []).map((q) => ({
      questionId: q.id,
      answer: latest.current.answers[q.id] ?? "",
    })),
    studio: {
      version,
      events: latest.current.events,
      conclusion: latest.current.conclusion,
    },
  });
  const save = useMutation({
    mutationFn: () => {
      const p = payload();
      submitted.current = JSON.stringify(p);
      return labSessionsApi.create(p);
    },
    onSuccess: () => {
      setSaved(submitted.current === JSON.stringify(payload()));
      void client.invalidateQueries({ queryKey: ["lab-sessions"] });
    },
  });
  const exportReport = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { activity: lab.title, grade: lab.grade, ...payload() },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lab.key}-notebook.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const account = useQuery({
    queryKey: ["lab-sessions", "studio-history", userId, version],
    queryFn: () => labSessionsApi.findAll(),
  });
  const savedSession = account.data?.find(
    (r) => r.labKey === lab.key && r.completionSummary?.version === version,
  );
  const stored = savedSession?.completionSummary;
  const restore =
    stored && draft.events.length === 0
      ? () => {
          try {
            const events = stored.events as E[];
            replay(events);
            setDraft({
              events,
              conclusion: String(stored.conclusion ?? ""),
              answers: Object.fromEntries(
                (savedSession?.answers ?? [])
                  .filter(
                    (a) =>
                      Number.isInteger(a.questionId) &&
                      typeof a.answer === "string",
                  )
                  .map((a) => [a.questionId, a.answer]),
              ),
            });
            setSaved(true);
            setMessage("Saved account notebook loaded.");
          } catch {
            setMessage("This account report cannot be loaded in this studio.");
          }
        }
      : undefined;
  return {
    restore,
    draft,
    state: replay(draft.events),
    dispatch,
    update,
    message,
    storageError,
    saved,
    save,
    exportReport,
  };
}
export function StudioReport({
  lab,
  conclusion,
  answers,
  onChange,
  onAnswers,
  ready,
  saved,
  pending,
  error,
  onSave,
  onExport,
  children,
  restore,
}: {
  lab: Lab;
  conclusion: string;
  answers: Record<number, string>;
  onChange: (s: string) => void;
  onAnswers: (a: Record<number, string>) => void;
  ready: boolean;
  saved: boolean;
  pending: boolean;
  error: unknown;
  onSave: () => void;
  onExport: () => void;
  children: React.ReactNode;
  restore?: () => void;
}) {
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Practical notebook
        </h2>
        <button
          onClick={onExport}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>
      {restore && (
        <button
          onClick={restore}
          className="min-h-10 w-fit rounded-lg border px-4 text-xs font-medium"
        >
          Load saved account notebook
        </button>
      )}
      {children}
      <label className="block text-sm font-medium">
        Evidence & conclusion
        <textarea
          aria-label="Studio conclusion"
          rows={5}
          maxLength={5000}
          value={conclusion}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Compare your results, explain why they changed and describe a limitation or improvement."
          className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm leading-7 focus:border-blue-500 focus:outline-none"
        />
      </label>
      {lab.questions?.map((q) => (
        <label key={q.id} className="block text-sm">
          {q.questionText}
          <textarea
            aria-label={`Lab question ${q.id}`}
            rows={2}
            value={answers[q.id] ?? ""}
            onChange={(e) => onAnswers({ ...answers, [q.id]: e.target.value })}
            className="mt-2 w-full rounded-lg border p-3"
          />
        </label>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-slate-500">
          Your account report is confirmed only after the server accepts it.
        </p>
        <button
          disabled={
            !ready ||
            pending ||
            saved ||
            (lab.questions ?? []).some((q) => !answers[q.id]?.trim())
          }
          onClick={onSave}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Report saved" : "Save practical report"}
        </button>
      </div>
      {!!error && (
        <p role="alert" className="text-sm text-red-700">
          {apiErrorMessage(
            error,
            "Account save failed. Your browser draft is kept. Retry or export your notebook.",
          )}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-emerald-700">
          Practical report saved to your account.
        </p>
      )}
    </section>
  );
}

export function StudioBrief({ lab }: { lab: Lab }) {
  return (
    <details className="rounded-xl border bg-white p-5">
      <summary className="cursor-pointer text-xs font-semibold">
        Teacher’s practical brief & resources
      </summary>
      <div className="mt-4 max-w-3xl space-y-3 text-xs leading-7 text-slate-600">
        <p>
          {lab.grade} · {lab.subject}
        </p>
        {lab.description && <p>{lab.description}</p>}
        {[...(lab.steps ?? [])]
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <p key={step.id}>
              <strong>{step.title}</strong> — {step.instruction}
            </p>
          ))}
        {lab.safetyChecklist?.map((s) => (
          <p key={s}>{s}</p>
        ))}
        {lab.reflectionPrompts?.map((p) => (
          <p key={p.id}>{p.prompt}</p>
        ))}
        {[
          lab.resourceUrl,
          lab.introVideoUrl,
          ...(lab.media ?? []).map((m) => m.url),
        ]
          .filter((u): u is string => !!u && /^https?:\/\//.test(u))
          .map((url, i) => (
            <a
              key={`${i}:${url}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block text-blue-700 underline"
            >
              Open teacher resource {i + 1}
            </a>
          ))}
      </div>
    </details>
  );
}
