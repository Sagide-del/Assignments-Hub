import { useEffect, useRef, useState } from "react";
import { assignmentsApi } from "../../../api/assignments.api";
import { apiErrorMessage } from "../../../api/axios";
import type { Submission } from "../../../types";
export function useAssignmentDraft({
  userId,
  assignmentId,
  questionIds,
  loaded,
  existing,
  timeAllowedMinutes,
  onResult,
}: {
  userId: number;
  assignmentId: number;
  questionIds: number[];
  loaded: boolean;
  existing?: Submission;
  timeAllowedMinutes?: number | null;
  onResult: (result: Submission) => void;
}) {
  const key = `assignment-answer-backup-v2:${userId}:${assignmentId}`;
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const current = useRef(answers);
  const [hydrated, setHydrated] = useState(false);
  const initialized = useRef(false);
  const [saveState, setSaveState] = useState<
    "unsaved" | "saving" | "saved" | "offline" | "error"
  >("unsaved");
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [submitting, setSubmitting] = useState(false);
  const finalizing = useRef(false);
  const final = useRef(false);
  const expiredRef = useRef(false);
  const lastSaved = useRef("");
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const server = useRef(existing);
  const callback = useRef(onResult);
  callback.current = onResult;
  const [tick, setTick] = useState(Date.now());
  const clockOffset = useRef(0);
  const localStart = useRef(Date.now());
  const [, refresh] = useState(0);
  function remember(value: Record<number, string>) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      setStorageError(true);
    }
  }
  function acceptClock(value?: Submission) {
    if (value?.serverNow)
      clockOffset.current = Date.parse(value.serverNow) - Date.now();
  }
  useEffect(() => {
    if (!loaded || initialized.current) return;
    initialized.current = true;
    server.current = existing;
    final.current = Boolean(existing && existing.status !== "DRAFT");
    acceptClock(existing);
    const initial: Record<number, string> = {};
    for (const a of existing?.answers ?? [])
      if (questionIds.includes(a.questionId))
        initial[a.questionId] = a.studentAnswer;
    lastSaved.current = JSON.stringify(initial);
    let restored = { ...initial };
    if (!final.current) {
      try {
        const raw = JSON.parse(localStorage.getItem(key) ?? "null");
        if (raw && typeof raw === "object" && !Array.isArray(raw))
          for (const [id, value] of Object.entries(raw))
            if (questionIds.includes(Number(id)) && typeof value === "string")
              restored[Number(id)] = value;
      } catch {
        setStorageError(true);
      }
    }
    current.current = restored;
    setAnswers(restored);
    setSaveState(
      existing && JSON.stringify(restored) === lastSaved.current
        ? "saved"
        : "unsaved",
    );
    setHydrated(true);
  }, [loaded, existing, questionIds, key]);
  function change(questionId: number, value: string) {
    if (final.current || finalizing.current) return;
    const next = { ...current.current, [questionId]: value };
    current.current = next;
    setAnswers(next);
    remember(next);
    setSaveState(navigator.onLine ? "unsaved" : "offline");
  }
  async function persist(isFinal = false): Promise<Submission | undefined> {
    if (final.current) return server.current;
    if (isFinal) {
      finalizing.current = true;
      setSubmitting(true);
    }
    const task = queue.current
      .catch(() => undefined)
      .then(async () => {
        if (final.current) return server.current;
        if (!navigator.onLine)
          throw new Error("You are offline. Reconnect to save your answers.");
        const snapshot = { ...current.current };
        setSaveState("saving");
        setError(null);
        const start = server.current?.startedAt
          ? Date.parse(server.current.startedAt)
          : localStart.current;
        const result = await assignmentsApi.submit(assignmentId, {
          answers: Object.entries(snapshot).map(([questionId, answer]) => ({
            questionId: Number(questionId),
            answer,
          })),
          isDraft: !isFinal,
          timeSpentSeconds: Math.max(
            0,
            Math.floor((Date.now() + clockOffset.current - start) / 1000),
          ),
        });
        if (!isFinal && result.status === "DRAFT") {
          const confirmed = new Map(
            (result.answers ?? []).map((a) => [a.questionId, a.studentAnswer]),
          );
          if (
            Object.entries(snapshot).some(
              ([id, value]) => confirmed.get(Number(id)) !== value,
            )
          )
            throw new Error(
              "The server did not confirm all answers. Please retry saving.",
            );
        }
        server.current = result;
        acceptClock(result);
        lastSaved.current = JSON.stringify(snapshot);
        final.current = result.status !== "DRAFT";
        if (
          final.current ||
          JSON.stringify(current.current) === lastSaved.current
        ) {
          setSaveState("saved");
          try {
            localStorage.removeItem(key);
          } catch {
            setStorageError(true);
          }
        } else setSaveState("unsaved");
        callback.current(result);
        refresh((n) => n + 1);
        return result;
      });
    queue.current = task;
    try {
      return await task;
    } catch (err) {
      remember(current.current);
      setSaveState(navigator.onLine ? "error" : "offline");
      setError(
        apiErrorMessage(
          err,
          err instanceof Error ? err.message : "Could not save answers.",
        ),
      );
      throw err;
    } finally {
      if (isFinal) {
        finalizing.current = false;
        setSubmitting(false);
      }
    }
  }
  const persistRef = useRef(persist);
  persistRef.current = persist;
  useEffect(() => {
    if (!hydrated || final.current || finalizing.current || !online) return;
    const needsStart = !!timeAllowedMinutes && !server.current;
    if (!needsStart && JSON.stringify(answers) === lastSaved.current) return;
    const timer = window.setTimeout(
      () => {
        void persistRef.current().catch(() => undefined);
      },
      needsStart ? 0 : 800,
    );
    return () => clearTimeout(timer);
  }, [answers, hydrated, online, timeAllowedMinutes]);
  useEffect(() => {
    const connected = () => {
      setOnline(true);
      if (initialized.current && !final.current)
        void persistRef.current(expiredRef.current).catch(() => undefined);
    };
    const disconnected = () => {
      setOnline(false);
      setSaveState("offline");
    };
    const guard = (e: BeforeUnloadEvent) => {
      if (
        !final.current &&
        (finalizing.current ||
          JSON.stringify(current.current) !== lastSaved.current)
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    window.addEventListener("beforeunload", guard);
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
      window.removeEventListener("beforeunload", guard);
      clearInterval(timer);
    };
  }, []);
  const started = server.current?.startedAt
    ? Date.parse(server.current.startedAt)
    : null;
  const elapsed = Math.max(
    0,
    Math.floor(
      (tick + clockOffset.current - (started ?? localStart.current)) / 1000,
    ),
  );
  const remaining =
    timeAllowedMinutes && started
      ? Math.max(
          0,
          Math.ceil(
            (started +
              timeAllowedMinutes * 60000 -
              tick -
              clockOffset.current) /
              1000,
          ),
        )
      : null;
  expiredRef.current = remaining === 0;
  return {
    answers,
    change,
    hydrated,
    saveState,
    error,
    storageError,
    submitting,
    persist,
    elapsed,
    remaining,
    expired: remaining === 0,
    timerReady: !timeAllowedMinutes || !!started,
  };
}
