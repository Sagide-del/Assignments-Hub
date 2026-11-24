import { useEffect, useRef, useState } from "react";
import { Mic, Square, Download, Trash2 } from "lucide-react";
import {
  newVocals,
  validVocals,
  vocalWaveform,
  type VocalSettings,
  type VocalTake,
} from "./vocal-model";
import { storeVocal, readVocal, removeVocal } from "./vocal-store";
import { wavBytes } from "./instrument-audio";
import type { MasterProject } from "./master-model";
export interface RecordingClock {
  ctx: AudioContext;
  start: number;
  offset: number;
  duration: number;
  bpm: number;
}
export function VocalsPanel({
  scope,
  project,
  onChange,
  startBacking,
  unlockAudio,
  stopBacking,
  registerStop,
}: {
  scope: string;
  project: MasterProject;
  onChange: (v: VocalSettings, live?: boolean) => void;
  unlockAudio: () => Promise<void>;
  startBacking: (bar: number, countIn: boolean) => Promise<RecordingClock>;
  stopBacking: () => void;
  registerStop: (f: () => void) => void;
}) {
  const v = project.vocals ?? newVocals(),
    selected = v.takes.find((t) => t.id === v.selectedId),
    [status, setStatus] = useState(""),
    [recording, setRecording] = useState(false),
    [working, setWorking] = useState(false),
    [startBar, setStartBar] = useState(1),
    [countIn, setCountIn] = useState(true),
    [elapsed, setElapsed] = useState(0),
    [missing, setMissing] = useState(false);
  const context = useRef<AudioContext>(),
    recorder = useRef<MediaRecorder>(),
    stream = useRef<MediaStream>(),
    alive = useRef(true),
    timer = useRef<ReturnType<typeof setInterval>>(),
    limit = useRef<ReturnType<typeof setTimeout>>(),
    generation = useRef(0),
    latest = useRef(v);
  latest.current = v;
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = undefined;
    clearInterval(timer.current);
    clearTimeout(limit.current);
    setRecording(false);
  }
  useEffect(() => {
    alive.current = true;
    registerStop(stop);
    return () => {
      alive.current = false;
      generation.current++;
      if (recorder.current) {
        recorder.current.onstop = null;
        recorder.current.ondataavailable = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timer.current);
      clearTimeout(limit.current);
      void context.current?.close().catch(() => {});
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (!selected) {
      setMissing(false);
      return;
    }
    void readVocal(scope, selected.id)
      .then((b) => {
        if (active) setMissing(!b);
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [scope, selected?.id]);
  useEffect(() => {
    setStartBar((n) => Math.min(n, project.bars));
  }, [project.bars]);
  useEffect(() => {
    if (!recording) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recording]);
  async function audio() {
    context.current ??= new AudioContext();
    return context.current;
  }
  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function save(
    blob: Blob,
    options?: { trim: number; start: number; recordedBpm: number },
    reattach = false,
  ) {
    if (blob.size > 20 * 1024 * 1024)
      throw Error("Choose an audio file smaller than 20 MB.");
    if (!reattach && latest.current.takes.length >= 8)
      throw Error(
        "Keep up to eight takes. Download and remove a take before adding another.",
      );
    const ctx = await audio(),
      b = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (b.duration < 0.15 || b.duration > 300)
      throw Error("A vocal take must be between 0.15 seconds and 5 minutes.");
    const mono = new Float32Array(b.length);
    for (let c = 0; c < b.numberOfChannels; c++) {
      const s = b.getChannelData(c);
      for (let i = 0; i < s.length; i++) mono[i] += s[i] / b.numberOfChannels;
    }
    const rate = 22050,
      samples = new Float32Array(Math.floor(b.duration * rate));
    for (let i = 0; i < samples.length; i++) {
      const at = (i * b.sampleRate) / rate,
        lo = Math.floor(at),
        f = at - lo;
      samples[i] = (mono[lo] ?? 0) * (1 - f) + (mono[lo + 1] ?? 0) * f;
    }
    const id = reattach && selected ? selected.id : crypto.randomUUID(),
      trim = options?.trim ?? 0;
    if (samples.length / rate - trim < 0.1)
      throw Error(
        "No singing was captured after the count-in. Record a longer take.",
      );
    if (
      reattach &&
      selected &&
      Math.abs(selected.duration - samples.length / rate) > 0.1
    )
      throw Error(
        "The audio length does not match this take. Import it as a new take instead.",
      );
    const t: VocalTake =
      reattach && selected
        ? selected
        : {
            id,
            name: `Take ${latest.current.takes.length + 1}`,
            duration: samples.length / rate,
            trimStart: trim,
            trimEnd: samples.length / rate,
            startSeconds: options?.start ?? 0,
            waveform: vocalWaveform(samples),
            createdAt: new Date().toISOString(),
            ...(options ? { recordedBpm: options.recordedBpm } : {}),
          };
    const next = reattach
      ? { ...latest.current, selectedId: id }
      : {
          ...latest.current,
          selectedId: id,
          takes: [...latest.current.takes, t],
        };
    if (!validVocals(next))
      throw Error("Invalid recording timing. Try importing the take again.");
    const wav = new Blob([wavBytes(samples, rate)], { type: "audio/wav" });
    let stored = true;
    try {
      await storeVocal(scope, id, wav);
    } catch {
      stored = false;
    }
    if (!alive.current) return;
    onChange(next);
    setMissing(false);
    setStatus(
      stored
        ? "Take saved privately on this device. Download a backup to keep it."
        : "Audio is available for this session only. Download this take now; device storage is unavailable.",
    );
  }
  async function record() {
    if (working || recording) return;
    if (latest.current.takes.length >= 8) {
      setStatus("Keep up to eight takes. Download and remove one first.");
      return;
    }
    setWorking(true);
    setStatus("Requesting microphone access…");
    const ticket = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder)
        throw Error(
          "Recording is unavailable in this browser. Upload an audio recording instead.",
        );
      await unlockAudio();
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
        video: false,
      });
      if (!alive.current || ticket !== generation.current) {
        mic.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = mic;
      const clock = await startBacking(startBar, countIn);
      if (!alive.current || ticket !== generation.current) {
        stop();
        return;
      }
      const formats = [
          "audio/webm;codecs=opus",
          "audio/mp4",
          "audio/ogg;codecs=opus",
          "audio/webm",
        ],
        mime = formats.find((f) => MediaRecorder.isTypeSupported(f)),
        r = new MediaRecorder(mic, mime ? { mimeType: mime } : undefined),
        chunks: Blob[] = [];
      recorder.current = r;
      const capturedAt = clock.ctx.currentTime,
        preRoll = Math.max(0, clock.start - capturedAt),
        bpm = clock.bpm;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onerror = () => {
        setStatus(
          "Microphone recording failed. Please retry or upload a file.",
        );
        stop();
        stopBacking();
      };
      r.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        clearTimeout(limit.current);
        if (!alive.current) return;
        setRecording(false);
        setWorking(true);
        void save(new Blob(chunks, { type: r.mimeType }), {
          trim: preRoll,
          start: clock.offset,
          recordedBpm: bpm,
        })
          .catch((e) => {
            if (alive.current)
              setStatus(
                e instanceof Error
                  ? e.message
                  : "Could not decode the recording. Try uploading it.",
              );
          })
          .finally(() => {
            if (alive.current) setWorking(false);
          });
      };
      r.start(250);
      setRecording(true);
      setElapsed(0);
      setStatus(
        countIn
          ? "Count-in, then sing. Use headphones; the microphone is not played through the speakers."
          : "Recording. Use headphones to keep the backing out of your microphone.",
      );
      timer.current = setInterval(
        () => setElapsed(Math.max(0, clock.ctx.currentTime - clock.start)),
        200,
      );
      limit.current = setTimeout(
        () => {
          stop();
          stopBacking();
        },
        Math.min(
          299000,
          (clock.start - clock.ctx.currentTime + clock.duration) * 1000,
        ),
      );
    } catch (e) {
      stop();
      stopBacking();
      setStatus(
        e instanceof Error
          ? e.message
          : "Microphone access was denied. You can upload a recording instead.",
      );
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  function changeTake(fields: Partial<VocalTake>) {
    if (!selected) return;
    const next = {
      ...v,
      takes: v.takes.map((t) =>
        t.id === selected.id ? { ...t, ...fields } : t,
      ),
    };
    if (!validVocals(next)) {
      setStatus("Check the timing: the trim must fit inside this recording.");
      return;
    }
    onChange(next);
    setStatus(
      "Timing updated. Use a small start adjustment to correct microphone latency.",
    );
  }
  return (
    <section className="wb-vocals">
      <header>
        <h2>
          <Mic size={14} />
          Vocals
        </h2>
        <span>
          Private device recordings · one vocal track, up to eight takes
        </span>
      </header>
      <div className="wb-vocal-actions">
        <button
          disabled={working && !recording}
          aria-label={recording ? "Stop vocal recording" : "Record vocals"}
          onClick={() => (recording ? (stop(), stopBacking()) : void record())}
        >
          {recording ? <Square size={14} /> : <Mic size={14} />}
          {recording
            ? `Stop · ${elapsed.toFixed(1)}s`
            : working
              ? "Preparing…"
              : "Record take"}
        </button>
        <label>
          Start bar
          <select
            aria-label="Vocal recording start bar"
            disabled={recording || working}
            value={startBar}
            onChange={(e) => setStartBar(Number(e.target.value))}
          >
            {Array.from({ length: project.bars }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            aria-label="Vocal count-in"
            disabled={recording}
            type="checkbox"
            checked={countIn}
            onChange={(e) => setCountIn(e.target.checked)}
          />
          4-beat count-in
        </label>
        <label className="wb-audio-upload">
          Upload voice
          <input
            aria-label="Upload vocal audio"
            type="file"
            accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.webm"
            disabled={recording || working}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setWorking(true);
              try {
                await save(file);
              } catch (err) {
                setStatus(
                  err instanceof Error
                    ? err.message
                    : "This audio format could not be decoded. Try WAV or MP3.",
                );
              } finally {
                setWorking(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>
      {status && (
        <p role="status" className="wb-hint">
          {status}
        </p>
      )}
      {missing && (
        <p role="alert" className="wb-notice">
          Voice audio is missing on this device. Reattach the selected take
          below. JSON backups contain settings, not the recording.
        </p>
      )}
      <div className="wb-vocal-settings">
        <label>
          Take
          <select
            aria-label="Selected vocal take"
            value={v.selectedId ?? ""}
            disabled={recording}
            onChange={(e) =>
              onChange({ ...v, selectedId: e.target.value || null })
            }
          >
            <option value="">No vocal take</option>
            {v.takes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.duration.toFixed(1)}s
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <>
            <button
              onClick={async () => {
                try {
                  const b = await readVocal(scope, selected.id);
                  if (!b) throw Error("Audio missing. Reattach it first.");
                  download(
                    b,
                    `${selected.name.replace(/[^A-Za-z0-9-]/g, "-")}.wav`,
                  );
                } catch (e) {
                  setStatus(e instanceof Error ? e.message : "Download failed");
                }
              }}
            >
              <Download size={13} />
              Download take
            </button>
            <button
              disabled={recording}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Delete this take from this device? Download a backup first.",
                  )
                )
                  return;
                stopBacking();
                const next = {
                  ...v,
                  selectedId: null,
                  solo: false,
                  takes: v.takes.filter((t) => t.id !== selected.id),
                };
                onChange(next);
                try {
                  await removeVocal(scope, selected.id);
                  setStatus("Take removed from this device.");
                } catch {
                  setStatus(
                    "Take removed from the project; browser storage cleanup failed.",
                  );
                }
              }}
            >
              <Trash2 size={13} />
              Remove take
            </button>
          </>
        )}
      </div>
      {selected && (
        <>
          <svg
            className="wb-vocal-wave"
            viewBox="0 0 640 70"
            role="img"
            aria-label="Recorded vocal waveform"
          >
            {selected.waveform.map((n, i) => (
              <line
                key={i}
                x1={i * 10 + 5}
                x2={i * 10 + 5}
                y1={35 - n * 32}
                y2={35 + n * 32}
                stroke="currentColor"
                strokeWidth="5"
              />
            ))}
          </svg>
          <div className="wb-vocal-settings">
            <label>
              Name
              <input
                aria-label="Vocal take name"
                maxLength={80}
                key={selected.id + "name"}
                defaultValue={selected.name}
                onBlur={(e) =>
                  changeTake({ name: e.target.value.trim() || selected.name })
                }
              />
            </label>
            {[
              ["trimStart", "Trim in (s)"],
              ["trimEnd", "Trim out (s)"],
              ["startSeconds", "Song start (s)"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  aria-label={label}
                  key={
                    selected.id +
                    key +
                    selected[key as "trimStart" | "trimEnd" | "startSeconds"]
                  }
                  type="number"
                  step=".01"
                  defaultValue={selected[
                    key as "trimStart" | "trimEnd" | "startSeconds"
                  ].toFixed(2)}
                  onBlur={(e) => changeTake({ [key]: Number(e.target.value) })}
                />
              </label>
            ))}
            <button
              onClick={() =>
                changeTake({
                  startSeconds: Math.max(-10, selected.startSeconds - 0.05),
                })
              }
            >
              Earlier 50 ms
            </button>
            <button
              onClick={() =>
                changeTake({
                  startSeconds: Math.min(600, selected.startSeconds + 0.05),
                })
              }
            >
              Later 50 ms
            </button>
          </div>
          {selected.recordedBpm &&
            selected.recordedBpm !== project.mix.draft.bpm && (
              <p className="wb-hint">
                Tempo changed since recording ({selected.recordedBpm} BPM).
                Vocals keep their original speed; check alignment.
              </p>
            )}
          <div className="wb-vocal-settings">
            <label>
              Voice level
              <input
                aria-label="Vocal volume"
                type="range"
                min="0"
                max="1"
                step=".01"
                value={v.volume}
                onChange={(e) =>
                  onChange({ ...v, volume: Number(e.target.value) }, true)
                }
              />
            </label>
            <label>
              Pan
              <input
                aria-label="Vocal pan"
                type="range"
                min="-1"
                max="1"
                step=".05"
                value={v.pan}
                onChange={(e) =>
                  onChange({ ...v, pan: Number(e.target.value) }, true)
                }
              />
            </label>
            <label>
              Room reverb
              <input
                aria-label="Vocal reverb"
                type="range"
                min="0"
                max=".35"
                step=".01"
                value={v.reverb}
                onChange={(e) =>
                  onChange({ ...v, reverb: Number(e.target.value) }, true)
                }
              />
            </label>
            <button
              aria-label="Mute vocals"
              aria-pressed={v.muted}
              onClick={() => onChange({ ...v, muted: !v.muted }, true)}
            >
              Mute
            </button>
            <button
              aria-label="Solo vocals"
              aria-pressed={v.solo}
              onClick={() => onChange({ ...v, solo: !v.solo }, true)}
            >
              Solo
            </button>
          </div>
          {missing && (
            <label className="wb-audio-upload">
              Reattach selected audio
              <input
                aria-label="Reattach selected vocal audio"
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setWorking(true);
                  try {
                    await save(f, undefined, true);
                  } catch (err) {
                    setStatus(
                      err instanceof Error
                        ? err.message
                        : "Could not attach audio",
                    );
                  } finally {
                    setWorking(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          )}
        </>
      )}
      <p className="wb-hint">
        Use headphones. Microphone access starts only when you press Record.
        Audio stays in this browser, never uploaded or shared automatically.
        Download each take and the project JSON for backup; clearing browser
        data removes device recordings. Upload formats depend on your browser;
        WAV and MP3 are the safest options.
      </p>
    </section>
  );
}
