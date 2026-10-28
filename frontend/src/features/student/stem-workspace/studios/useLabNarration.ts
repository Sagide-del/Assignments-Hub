import { useCallback, useEffect, useRef, useState } from "react";
export function useLabNarration() {
  const available =
    typeof window !== "undefined" &&
    typeof window.speechSynthesis?.speak === "function" &&
    typeof window.SpeechSynthesisUtterance === "function";
  const [speaking, setSpeaking] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<(() => void) | null>(null),
    alive = useRef(true);
  const stop = useCallback(() => {
    pending.current?.();
    pending.current = null;
    if (available) window.speechSynthesis.cancel();
    if (alive.current) setSpeaking(false);
  }, [available]);
  const speak = useCallback(
    (text: string) => {
      stop();
      if (!available) return Promise.resolve();
      setError("");
      return new Promise<void>((resolve) => {
        let finished = false;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-GB";
        utterance.rate = 0.98;
        const voices = window.speechSynthesis.getVoices();
        const voice =
          voices.find((v) => v.lang === "en-KE") ??
          voices.find((v) => v.lang === "en-GB" && v.localService) ??
          voices.find((v) => v.lang.startsWith("en"));
        if (voice) utterance.voice = voice;
        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          if (pending.current === finish) pending.current = null;
          if (alive.current) setSpeaking(false);
          resolve();
        };
        const timeout = window.setTimeout(
          () => {
            if (alive.current)
              setError(
                "Voice playback did not finish. Follow the on-screen narration or replay the step.",
              );
            finish();
            window.speechSynthesis.cancel();
          },
          Math.max(15000, text.split(/\s+/).length * 900),
        );
        pending.current = finish;
        utterance.onend = finish;
        utterance.onerror = () => {
          if (finished) return;
          if (alive.current)
            setError(
              "Voice playback is unavailable. The full narration remains on screen.",
            );
          finish();
        };
        try {
          setSpeaking(true);
          window.speechSynthesis.speak(utterance);
        } catch {
          if (alive.current)
            setError(
              "Voice playback is unavailable. Read the captions to continue.",
            );
          finish();
        }
      });
    },
    [available, stop],
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stop();
    };
  }, [stop]);
  return { available, speaking, error, speak, stop };
}
