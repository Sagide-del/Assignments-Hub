import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  CodeXml,
  Download,
  ExternalLink,
  Headphones,
  Lightbulb,
  Play,
  RotateCcw,
  Save,
  ShieldPlus,
  Square,
  Terminal,
} from 'lucide-react';
import { FirstAidGuide, FirstAidScenarios } from './FirstAidGuide';
import { LessonMedia } from './LessonMedia';
import { skillsApi } from '../../../api/skills.api';
import { apiErrorMessage } from '../../../api/axios';
import type { SkillCourse } from '../../../types';
import type { SkillLesson, WorkspaceMode } from './workspace-mode';
import {
  applyRobotCommands,
  checkPractice,
  cleanOutput,
  draftKey,
  explainPythonError,
  type RobotState,
} from './workspace-tools';

const BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#607D00] focus-visible:ring-offset-2';
interface Draft {
  code: string;
  input: string;
  notes: string;
}
interface WorkerResponse {
  type: 'RESULT' | 'ERROR' | 'STARTED';
  requestId: number;
  output?: string;
  message?: string;
}
type RunState = 'idle' | 'loading' | 'running' | 'pass' | 'mismatch' | 'error' | 'stopped';
export function LessonWorkspace({
  course,
  lesson,
  mode,
  index,
  total,
  userId,
  completed,
  onPrevious,
  onNext,
  onComplete,
}: {
  course: SkillCourse;
  lesson: SkillLesson;
  mode: WorkspaceMode;
  index: number;
  total: number;
  userId: number;
  completed: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: (key: string) => void;
}) {
  const learning = lesson.learning;
  const coding = Boolean(learning?.starterCode !== undefined);
  const storageKey = draftKey(userId, course.id, lesson.key);
  const [draft, setDraft] = useState<Draft>(() => {
    const fallback = { code: learning?.starterCode ?? '', input: learning?.input ?? '', notes: '' };
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<Draft> | null;
      return parsed
        ? {
            code: typeof parsed.code === 'string' ? parsed.code : fallback.code,
            input: typeof parsed.input === 'string' ? parsed.input : fallback.input,
            notes: typeof parsed.notes === 'string' ? parsed.notes : '',
          }
        : fallback;
    } catch {
      return fallback;
    }
  });
  const [draftSaved, setDraftSaved] = useState(true);
  const [undo, setUndo] = useState<Draft | null>(null);
  const [panel, setPanel] = useState<'lesson' | 'practice'>('lesson');
  const [runState, setRunState] = useState<RunState>('idle');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [activities, setActivities] = useState<boolean[]>(
    () => learning?.activity.steps.map(() => false) ?? [],
  );
  const [speaking, setSpeaking] = useState(false);
  const [scenarioResults, setScenarioResults] = useState<Record<string, boolean>>({});
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const numbersRef = useRef<HTMLPreElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [robot, setRobot] = useState<RobotState>({ x: 2, y: 2, direction: 1 });
  const queryClient = useQueryClient();
  const busy = runState === 'running' || runState === 'loading';
  const correct = Boolean(learning && checked && answer === learning.check.answer);
  const scenariosReady =
    !learning?.firstAid || learning.firstAid.scenarios.every((scenario) => scenarioResults[scenario.id]);
  const ready = Boolean(
    learning && correct && scenariosReady && (coding ? runState === 'pass' : activities.every(Boolean)),
  );
  const completion = useMutation({
    mutationFn: () => skillsApi.completeLesson(course.id, lesson.key),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['skill-course-progress', course.id] }),
        queryClient.invalidateQueries({ queryKey: ['skill-enrollments'] }),
      ]);
      onComplete(lesson.key);
    },
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  }, [draft, storageKey]);
  useEffect(
    () => () => {
      workerRef.current?.terminate();
      if (timerRef.current) window.clearTimeout(timerRef.current);
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  function updateCode(code: string) {
    setDraft((current) => ({ ...current, code }));
    setRunState('idle');
    setError('');
  }
  function clearTimer() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
  function stop() {
    clearTimer();
    requestRef.current++;
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunState('stopped');
    setOutput('Run stopped. You can edit your program and try again.');
    setError('');
  }
  function replaceCode(code: string) {
    if (busy) stop();
    setUndo(draft);
    updateCode(code);
    setPanel('practice');
  }
  function run() {
    if (busy || !coding) return;
    setRunState('loading');
    setOutput('');
    setError('');
    const requestId = ++requestRef.current;
    try {
      const worker =
        workerRef.current ?? new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      const fail = (message: string) => {
        clearTimer();
        worker.terminate();
        workerRef.current = null;
        setRunState('error');
        setError(message);
      };
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.requestId !== requestRef.current) return;
        if (event.data.type === 'STARTED') {
          clearTimer();
          setRunState('running');
          timerRef.current = window.setTimeout(
            () =>
              fail('This program ran for too long. Check for a loop that never finishes, then try again.'),
            10_000,
          );
          return;
        }
        clearTimer();
        const result = event.data.output ?? '';
        setOutput(cleanOutput(result));
        if (event.data.type === 'ERROR') {
          setRunState('error');
          setError(event.data.message ?? 'The program could not run.');
          return;
        }
        if (mode === 'ROBOTICS') setRobot(applyRobotCommands(result));
        setRunState(
          checkPractice(result, learning?.expectedOutput, learning?.targetRobot) ? 'pass' : 'mismatch',
        );
      };
      worker.onerror = () =>
        fail('The Python workspace could not start. Check your connection and try again.');
      timerRef.current = window.setTimeout(
        () => fail('Python could not finish loading. Check your internet connection and try again.'),
        90_000,
      );
      worker.postMessage({ type: 'RUN', requestId, mode, code: draft.code, input: draft.input });
    } catch {
      clearTimer();
      setRunState('error');
      setError('Your browser could not start the code worker. Try an up-to-date browser.');
    }
  }
  function listen() {
    if (speaking) {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    if (lesson.audioUrl) {
      const audio = new Audio(lesson.audioUrl);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      setSpeaking(true);
      void audio.play().catch(() => setSpeaking(false));
      return;
    }
    if (!('speechSynthesis' in window)) return;
    const text = [
      lesson.title,
      learning?.objective ?? lesson.description,
      learning?.safety,
      ...(learning?.firstAid
        ? [
            learning.firstAid.summary,
            ...learning.firstAid.recognise,
            ...learning.firstAid.actions.map((step) => `${step.title}. ${step.text}. Why: ${step.why}`),
            ...learning.firstAid.avoid,
            ...learning.firstAid.urgent,
            learning.firstAid.remember,
          ]
        : (learning?.sections.map((section) => `${section.title}. ${section.text}`) ?? [])),
    ].join('. ');
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en-KE';
    speech.rate = 0.92;
    speech.onend = () => setSpeaking(false);
    speech.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(speech);
  }
  function download() {
    const blob = new Blob([draft.code], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lesson.key}.py`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="min-w-0 space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#526B00]">
            Lesson {index + 1} of {total}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {learning ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                About {learning.minutes} min
              </span>
            ) : null}
            <button type="button" onClick={listen} className={`${BUTTON} border border-slate-200`}>
              <Headphones className="h-4 w-4" aria-hidden="true" />
              {speaking ? 'Stop reading' : 'Listen'}
            </button>
          </div>
        </div>
        <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight text-[#101820]">
          {lesson.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {learning?.objective ?? lesson.description ?? course.shortDescription}
        </p>
      </header>
      {!learning ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-900">Lesson content is being prepared</h3>
          <p className="mt-2 text-sm leading-7 text-amber-900">
            This outline does not yet include a full lesson and practice check. Ask your instructor for the
            learning material. It cannot be marked complete from this outline alone.
          </p>
        </section>
      ) : (
        <>
          {learning.safety ? (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <ShieldPlus className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{learning.safety}</p>
            </div>
          ) : null}
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 xl:hidden"
            role="group"
            aria-label="Lesson panels"
          >
            {(['lesson', 'practice'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPanel(value)}
                aria-pressed={panel === value}
                className={`${BUTTON} ${panel === value ? 'bg-[#101820] text-white' : 'text-slate-600'}`}
              >
                {value === 'lesson' ? (
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <CodeXml className="h-4 w-4" aria-hidden="true" />
                )}
                {value === 'lesson' ? 'Learn' : 'Practise & check'}
              </button>
            ))}
          </div>
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
            <section
              aria-label="Lesson explanation"
              className={`min-w-0 space-y-4 ${panel === 'lesson' ? 'block' : 'hidden xl:block'}`}
            >
              {learning.image ? (
                <LessonMedia image={learning.image} images={learning.images} title={lesson.title} />
              ) : null}
              {learning.firstAid ? (
                <FirstAidGuide guide={learning.firstAid} />
              ) : (
                learning.sections.map((section, sectionIndex) => (
                  <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-50 text-xs font-semibold text-[#526B00]">
                        {sectionIndex + 1}
                      </span>
                      <h3 className="font-semibold leading-7 text-[#101820]">{section.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{section.text}</p>
                    {section.example ? (
                      <div className="mt-4 overflow-hidden rounded-xl bg-[#101820]">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
                          <span className="text-xs font-semibold text-slate-300">Worked example</span>
                          {coding ? (
                            <button
                              type="button"
                              onClick={() => replaceCode(section.example!)}
                              className="min-h-9 rounded-lg px-2 text-xs font-semibold text-[#B5E61D]"
                            >
                              Load example
                            </button>
                          ) : null}
                        </div>
                        <pre className="overflow-x-auto p-4 text-xs leading-7 text-slate-100">
                          {section.example}
                        </pre>
                      </div>
                    ) : null}
                  </section>
                ))
              )}
              {learning.sources ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-[#101820]">Further reading</h3>
                  <ul className="mt-2 space-y-2">
                    {learning.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#466000] underline"
                        >
                          {source.title}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <button
                type="button"
                onClick={() => setPanel('practice')}
                className={`${BUTTON} w-full bg-[#101820] text-white xl:hidden`}
              >
                Try the activity
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </section>
            <section
              aria-label="Practice workspace"
              className={`min-w-0 space-y-4 ${panel === 'practice' ? 'block' : 'hidden xl:block'}`}
            >
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="flex items-center gap-2 font-semibold text-[#101820]">
                  <Lightbulb className="h-5 w-5 text-[#607D00]" aria-hidden="true" />
                  {learning.activity.title}
                </h3>
                {coding ? (
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-600">
                    {learning.activity.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <div className="mt-3 space-y-3">
                    {learning.activity.steps.map((step, stepIndex) => (
                      <label
                        key={step}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-7 text-slate-600"
                      >
                        <input
                          type="checkbox"
                          checked={activities[stepIndex]}
                          onChange={(event) =>
                            setActivities((current) =>
                              current.map((value, i) => (i === stepIndex ? event.target.checked : value)),
                            )
                          }
                          className="mt-1 h-5 w-5 shrink-0 accent-[#607D00]"
                        />
                        <span>{step}</span>
                      </label>
                    ))}
                  </div>
                )}
                {learning.hint ? (
                  <details className="mt-3 rounded-xl bg-lime-50 p-3">
                    <summary className="min-h-9 cursor-pointer text-sm font-semibold text-[#466000]">
                      Need a hint?
                    </summary>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{learning.hint}</p>
                  </details>
                ) : null}
              </section>
              {coding ? (
                <>
                  <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-[#101820]">
                        <CodeXml className="h-4 w-4" aria-hidden="true" />
                        Your Python code
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {busy ? (
                          <button type="button" onClick={stop} className={`${BUTTON} bg-red-50 text-red-800`}>
                            <Square className="h-3.5 w-3.5" aria-hidden="true" />
                            Stop
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={run}
                            className={`${BUTTON} bg-[#B5E61D] text-[#101820]`}
                          >
                            <Play className="h-4 w-4" aria-hidden="true" />
                            Run code
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setUndo(draft);
                            setDraft((current) => ({
                              ...current,
                              code: learning.starterCode ?? '',
                              input: learning.input ?? '',
                            }));
                            setRunState('idle');
                            setError('');
                          }}
                          className={`${BUTTON} border border-slate-200 disabled:opacity-50`}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Reset
                        </button>
                      </div>
                    </div>
                    <div className="flex min-w-0 bg-[#101820]">
                      <pre
                        ref={numbersRef}
                        aria-hidden="true"
                        className="h-[330px] shrink-0 overflow-hidden border-r border-white/10 px-3 py-4 text-right font-mono text-sm leading-7 text-slate-500"
                      >
                        {draft.code
                          .split('\n')
                          .map((_, i) => i + 1)
                          .join('\n')}
                      </pre>
                      <textarea
                        ref={editorRef}
                        value={draft.code}
                        onChange={(event) => updateCode(event.target.value)}
                        onScroll={(event) => {
                          if (numbersRef.current)
                            numbersRef.current.scrollTop = event.currentTarget.scrollTop;
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            run();
                          }
                          if (event.key === 'Tab' && !event.shiftKey) {
                            event.preventDefault();
                            const start = event.currentTarget.selectionStart;
                            const end = event.currentTarget.selectionEnd;
                            updateCode(draft.code.slice(0, start) + '    ' + draft.code.slice(end));
                            requestAnimationFrame(() =>
                              editorRef.current?.setSelectionRange(start + 4, start + 4),
                            );
                          }
                        }}
                        disabled={busy}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        wrap="off"
                        aria-label="Program editor"
                        className="h-[330px] min-w-0 flex-1 resize-y bg-[#101820] p-4 font-mono text-sm leading-7 text-slate-100 outline-none focus:ring-2 focus:ring-inset focus:ring-lime-300 disabled:opacity-70"
                      />
                    </div>
                    <div className="space-y-3 border-t border-slate-200 p-3">
                      <p className="text-xs leading-6 text-slate-500">
                        Tab indents · Shift+Tab leaves the editor · Ctrl/⌘ + Enter runs · Each run uses fresh
                        variables. The first run downloads Python and needs internet.
                      </p>
                      <label className="block text-xs font-semibold text-slate-600" htmlFor="program-input">
                        Program input <span className="font-normal">(one line per input() call)</span>
                      </label>
                      <textarea
                        id="program-input"
                        value={draft.input}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, input: event.target.value }));
                          setRunState('idle');
                        }}
                        disabled={busy}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          role="status"
                          className={`inline-flex items-center gap-1.5 text-xs ${draftSaved ? 'text-slate-500' : 'text-amber-800'}`}
                        >
                          <Save className="h-3.5 w-3.5" aria-hidden="true" />
                          {draftSaved
                            ? 'Draft saved on this device'
                            : 'Draft could not be saved. Download your code.'}
                        </p>
                        <button
                          type="button"
                          onClick={download}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-slate-600"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          Download .py
                        </button>
                      </div>
                      {undo ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setDraft(undo);
                            setUndo(null);
                            setRunState('idle');
                          }}
                          className="min-h-11 rounded-lg text-sm font-semibold text-[#466000] underline"
                        >
                          Undo code replacement
                        </button>
                      ) : null}
                    </div>
                  </section>
                  <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <h3 className="flex items-center gap-2 border-b border-slate-200 p-4 text-sm font-semibold text-[#101820]">
                      <Terminal className="h-4 w-4" aria-hidden="true" />
                      Output & task check
                    </h3>
                    {mode === 'ROBOTICS' ? <RobotGrid state={robot} /> : null}
                    <div className="space-y-3 p-4">
                      <p
                        role="status"
                        className={`text-sm font-semibold ${runState === 'pass' ? 'text-[#466000]' : runState === 'error' || runState === 'mismatch' ? 'text-amber-800' : 'text-slate-600'}`}
                      >
                        {runState === 'loading'
                          ? 'Loading Python… The first run may take a moment.'
                          : runState === 'running'
                            ? 'Running your program…'
                            : runState === 'pass'
                              ? 'Practice check passed.'
                              : runState === 'mismatch'
                                ? 'Program ran. Compare the output with the task.'
                                : runState === 'error'
                                  ? 'Let’s fix this together.'
                                  : runState === 'stopped'
                                    ? 'Program stopped.'
                                    : 'Your output will appear here after you run the code.'}
                      </p>
                      {output ? (
                        <pre
                          aria-label="Program output"
                          className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-700"
                        >
                          {output}
                        </pre>
                      ) : runState === 'pass' ? (
                        <p className="text-xs text-slate-500">The program finished without printing text.</p>
                      ) : null}
                      {error ? (
                        <>
                          <p className="text-sm leading-7 text-amber-900">{explainPythonError(error)}</p>
                          <details>
                            <summary className="min-h-11 cursor-pointer text-xs font-semibold text-slate-600">
                              Show Python’s error message
                            </summary>
                            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-amber-50 p-3 text-xs leading-6">
                              {error}
                            </pre>
                          </details>
                        </>
                      ) : null}
                      {learning.expectedOutput !== undefined ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-500">
                            Expected output for this task
                          </p>
                          <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 p-3 text-sm leading-6">
                            {learning.expectedOutput || '(no printed output)'}
                          </pre>
                          {learning.targetRobot ? (
                            <p className="mt-2 text-xs text-slate-500">
                              Robot target: column {learning.targetRobot.x}, row {learning.targetRobot.y};
                              facing {['up', 'right', 'down', 'left'][learning.targetRobot.direction]}.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {learning.solution ? (
                        <details>
                          <summary className="min-h-11 cursor-pointer text-sm font-semibold text-[#466000]">
                            Show a worked solution
                          </summary>
                          <pre className="overflow-auto rounded-lg bg-[#101820] p-4 text-xs leading-7 text-white">
                            {learning.solution}
                          </pre>
                          <p className="mt-2 text-xs leading-6 text-slate-500">
                            Understand the steps, then try a variation. Matching the task output is a practice
                            check, not a full assessment.
                          </p>
                        </details>
                      ) : null}
                    </div>
                  </section>
                </>
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <label htmlFor="lesson-notes" className="text-sm font-semibold text-[#101820]">
                    Your plan or reflection
                  </label>
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    Describe what you would do and why. Notes stay on this device; they are not submitted to a
                    teacher. Do not include personal or medical information.
                  </p>
                  <textarea
                    id="lesson-notes"
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    rows={5}
                    placeholder="My steps, observations or design…"
                    className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm leading-7"
                  />
                  {!draftSaved ? (
                    <p role="status" className="mt-2 text-xs text-amber-800">
                      Notes could not be saved on this device. Copy them before leaving.
                    </p>
                  ) : null}
                </section>
              )}
              {learning.firstAid ? (
                <FirstAidScenarios
                  scenarios={learning.firstAid.scenarios}
                  onResult={(id, passed) => setScenarioResults((current) => ({ ...current, [id]: passed }))}
                />
              ) : null}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="flex items-center gap-2 font-semibold text-[#101820]">
                  <CircleHelp className="h-5 w-5 text-[#607D00]" aria-hidden="true" />
                  Quick understanding check
                </h3>
                <fieldset className="mt-4">
                  <legend className="text-sm font-semibold leading-7 text-slate-700">
                    {learning.check.question}
                  </legend>
                  <div className="mt-3 space-y-2">
                    {learning.check.options.map((option, optionIndex) => (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-7 ${answer === optionIndex ? 'border-lime-400 bg-lime-50' : 'border-slate-200'}`}
                      >
                        <input
                          type="radio"
                          name={`check-${lesson.key}`}
                          value={optionIndex}
                          checked={answer === optionIndex}
                          onChange={() => {
                            setAnswer(optionIndex);
                            setChecked(false);
                          }}
                          className="mt-1 h-5 w-5 shrink-0 accent-[#607D00]"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  type="button"
                  onClick={() => setChecked(true)}
                  disabled={answer === null}
                  className={`${BUTTON} mt-4 bg-[#101820] text-white disabled:opacity-40`}
                >
                  Check understanding
                </button>
                {checked ? (
                  <div
                    role="status"
                    className={`mt-4 rounded-xl p-4 text-sm leading-7 ${correct ? 'bg-lime-50 text-[#466000]' : 'bg-amber-50 text-amber-900'}`}
                  >
                    <p className="font-semibold">
                      {correct ? 'Correct.' : 'Not quite. Read the explanation and try again.'}
                    </p>
                    <p>{learning.check.explanation}</p>
                  </div>
                ) : null}
              </section>
            </section>
          </div>
        </>
      )}
      <footer className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-sm leading-6 text-slate-600">
            {completed ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#607D00]" aria-hidden="true" />
            ) : null}
            {completed
              ? 'Lesson completion saved.'
              : !learning
                ? 'Full lesson content is required before completion.'
                : ready
                  ? 'Practice and understanding checks complete. Save your progress.'
                  : coding
                    ? 'Pass the practice task and quick check before saving completion.'
                    : learning.firstAid
                      ? 'Complete the activity, both scenarios and the quick check before saving completion.'
                      : 'Complete the activity checklist and quick check before saving completion.'}
          </p>
          <button
            type="button"
            onClick={() => completion.mutate()}
            disabled={!ready || completed || completion.isPending}
            className={`${BUTTON} shrink-0 bg-[#101820] text-white disabled:bg-slate-100 disabled:text-slate-400`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {completed ? 'Completed' : completion.isPending ? 'Saving…' : 'Save completion'}
          </button>
        </div>
        {completion.isError ? (
          <p role="alert" className="mt-3 text-sm leading-7 text-red-700">
            {apiErrorMessage(
              completion.error,
              'Your progress could not be saved. Your draft is still on this device. Try saving again.',
            )}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={index === 0 || completion.isPending}
            className={`${BUTTON} border border-slate-200 disabled:opacity-30`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Previous lesson
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={index === total - 1 || completion.isPending}
            className={`${BUTTON} border border-slate-200 disabled:opacity-30`}
          >
            Next lesson
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
function RobotGrid({ state }: { state: RobotState }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-xs font-semibold text-slate-600">
        Simulation · column {state.x}, row {state.y} · facing{' '}
        {['up', 'right', 'down', 'left'][state.direction]}
      </p>
      <div
        aria-label="Robot simulation"
        className="mx-auto grid aspect-square max-w-56 grid-cols-5 overflow-hidden rounded-xl border border-slate-300 bg-white"
      >
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className="flex items-center justify-center border-b border-r border-slate-100">
            {state.x === i % 5 && state.y === Math.floor(i / 5) ? (
              <span className="text-2xl font-bold text-[#526B00]" aria-label="Robot">
                {['↑', '→', '↓', '←'][state.direction]}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
