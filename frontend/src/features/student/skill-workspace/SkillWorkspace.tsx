import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Check, Headphones } from 'lucide-react';
import { skillsApi } from '../../../api/skills.api';
import { EmptyState, PageHeader } from '../../../components/ui/Saas';
import type { SkillCourse } from '../../../types';
import {
  courseLessons,
  hasWorkspaceAccess,
  workspaceModeForCourse,
  type SkillLesson,
  type WorkspaceMode,
} from './workspace-mode';

const STARTERS: Record<WorkspaceMode, string> = {
  GUIDED: '',
  PYTHON: `name = "Learner"\nprint(f"Welcome, {name}")`,
  MACHINE_LEARNING: `import numpy as np\n\nscores = np.array([64, 72, 81, 76, 88])\nprint("Mean score:", scores.mean())`,
  ROBOTICS: `forward(2)\nturn_right()\nforward(3)`,
};

const MODE_LABELS: Record<WorkspaceMode, string> = {
  GUIDED: 'Guided lesson',
  PYTHON: 'Python lab',
  MACHINE_LEARNING: 'Machine learning lab',
  ROBOTICS: 'Robotics lab',
};

interface WorkerResponse {
  type: 'RESULT' | 'ERROR';
  requestId: number;
  output?: string;
  message?: string;
}

interface RobotState {
  x: number;
  y: number;
  direction: 0 | 1 | 2 | 3;
}

export function SkillWorkspacePage() {
  const courseId = Number(useParams<{ id: string }>().id);
  const courseQuery = useQuery({
    queryKey: ['skill-course', courseId],
    queryFn: () => skillsApi.getCourse(courseId),
    enabled: Number.isInteger(courseId),
  });
  const course = courseQuery.data;
  const mode = course ? workspaceModeForCourse(course) : null;
  const canAccess = Boolean(course && hasWorkspaceAccess(course));
  const progressQuery = useQuery({
    queryKey: ['skill-course-progress', courseId],
    queryFn: () => skillsApi.getCourseProgress(courseId),
    enabled: canAccess,
  });

  if (courseQuery.isLoading) return <EmptyState title="Loading workspace..." />;
  if (courseQuery.isError || !course) return <EmptyState title="Course not available." />;
  if (!mode) return <EmptyState title="Workspace not available." action={<BackToCourse id={course.id} />} />;
  if (!canAccess) return <EmptyState title="Activate your enrollment to open this workspace." action={<BackToCourse id={course.id} />} />;

  return (
    <Workspace
      course={course}
      mode={mode}
      completedKeys={new Set((progressQuery.data ?? []).filter((item) => item.completedAt).map((item) => item.lessonKey))}
    />
  );
}

function BackToCourse({ id }: { id: number }) {
  return <Link to={`/student/learn-skills/${id}`} className="font-semibold text-[#101820]">Back to course</Link>;
}

function Workspace({ course, mode, completedKeys }: { course: SkillCourse; mode: WorkspaceMode; completedKeys: Set<string> }) {
  const queryClient = useQueryClient();
  const lessons = courseLessons(course);
  const firstIncomplete = lessons.findIndex((lesson) => !completedKeys.has(lesson.key));
  const [activeIndex, setActiveIndex] = useState(firstIncomplete >= 0 ? firstIncomplete : 0);
  const [code, setCode] = useState(lessonStarter(mode, lessons[activeIndex]));
  const [output, setOutput] = useState('Select Run when you are ready.');
  const [running, setRunning] = useState(false);
  const [ranSuccessfully, setRanSuccessfully] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [robot, setRobot] = useState<RobotState>({ x: 2, y: 2, direction: 1 });
  const workerRef = useRef<Worker | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const activeLesson = lessons[activeIndex];
  const progressPercent = Math.round((completedKeys.size / lessons.length) * 100);
  const guidedLesson = mode === 'GUIDED';
  const readyToComplete = guidedLesson || ranSuccessfully;

  const completeMutation = useMutation({
    mutationFn: () => skillsApi.completeLesson(course.id, activeLesson.key),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['skill-course-progress', course.id] });
      if (activeIndex < lessons.length - 1) selectLesson(activeIndex + 1, false);
    },
  });

  useEffect(() => () => {
    workerRef.current?.terminate();
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  function ensureWorker() {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
    }
    return workerRef.current;
  }

  function selectLesson(index: number, withVoice = true) {
    const lesson = lessons[index];
    setActiveIndex(index);
    setCode(lessonStarter(mode, lesson));
    setOutput('Select Run when you are ready.');
    setRanSuccessfully(false);
    setRobot({ x: 2, y: 2, direction: 1 });
    stopVoice();
    if (withVoice) speakLesson(lesson);
  }

  function run() {
    const worker = ensureWorker();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setRunning(true);
    setRanSuccessfully(false);
    setOutput('Preparing the learning lab. The first run may take a moment...');
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.requestId !== requestId) return;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      setRunning(false);
      const result = [event.data.output, event.data.message].filter(Boolean).join('\n').trim();
      setOutput(result || 'Your program ran successfully.');
      setRanSuccessfully(event.data.type === 'RESULT');
      if (mode === 'ROBOTICS' && event.data.output) setRobot(applyRobotCommands(event.data.output));
    };
    worker.onerror = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
      setRunning(false);
      setOutput('The learning lab could not start. Check your connection and try again.');
    };
    worker.postMessage({ type: 'RUN', requestId, mode, code });
    timeoutRef.current = window.setTimeout(() => {
      worker.terminate();
      workerRef.current = null;
      setRunning(false);
      setOutput('This run took too long. Check your instructions for a repeating loop, then try again.');
    }, 45_000);
  }

  function speakLesson(lesson: SkillLesson) {
    stopVoice();
    setSpeaking(true);
    if (lesson.audioUrl) {
      const audio = new Audio(lesson.audioUrl);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      void audio.play().catch(() => setSpeaking(false));
      return;
    }
    if (!('speechSynthesis' in window)) {
      setSpeaking(false);
      return;
    }
    const guidance = new SpeechSynthesisUtterance(
      `${lesson.title}. ${lesson.description || course.shortDescription}. Read the task, try the example, then run your work.`,
    );
    guidance.lang = 'en-KE';
    guidance.rate = 0.92;
    guidance.onend = () => setSpeaking(false);
    guidance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(guidance);
  }

  function stopVoice() {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={course.title} meta={MODE_LABELS[mode]} />
        <Link to={`/student/learn-skills/${course.id}`} className="text-sm font-semibold text-slate-500">Exit lesson</Link>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#B5E61D]" style={{ width: `${progressPercent}%` }} /></div>
        <span className="shrink-0 text-xs font-semibold text-slate-500">{completedKeys.size}/{lessons.length} complete</span>
      </div>

      <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_34px_rgba(16,24,32,0.05)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-[#F8FAFC] p-3 xl:border-b-0 xl:border-r">
          <p className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Lessons</p>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:overflow-visible">
            {lessons.map((lesson, index) => {
              const active = index === activeIndex;
              const complete = completedKeys.has(lesson.key);
              return (
                <button key={lesson.key} type="button" onClick={() => selectLesson(index)} className={`flex min-h-12 min-w-[210px] items-center gap-3 rounded-xl px-3 text-left text-sm transition xl:min-w-0 xl:w-full ${active ? 'bg-[#101820] text-white' : 'text-slate-600 hover:bg-white'}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${active ? 'bg-[#B5E61D] text-[#101820]' : complete ? 'bg-[#E7F6B5] text-[#4D6310]' : 'border border-slate-200 bg-white text-slate-500'}`}>{complete ? <Check className="h-4 w-4" strokeWidth={2} /> : index + 1}</span>
                  <span className="line-clamp-2 font-medium">{lesson.title}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Lesson {activeIndex + 1} of {lessons.length}</p>
              <h1 className="mt-2 break-words text-xl font-semibold text-[#101820] sm:text-2xl">{activeLesson.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{activeLesson.description || course.shortDescription}</p>
            </div>
            <button type="button" onClick={() => speaking ? stopVoice() : speakLesson(activeLesson)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#101820]">
              <Headphones className="h-4 w-4" strokeWidth={1.8} /> {speaking ? 'Stop voice' : 'Listen'}
            </button>
          </div>

          {guidedLesson ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Lesson activity</p>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{activeLesson.description || course.shortDescription}</p>
              <button type="button" onClick={() => speaking ? stopVoice() : speakLesson(activeLesson)} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#101820] ring-1 ring-slate-200">
                <Headphones className="h-4 w-4" strokeWidth={1.8} /> {speaking ? 'Stop guidance' : 'Play guidance'}
              </button>
            </div>
          ) : (
          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
              <div className="flex min-h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
                <span className="text-sm font-semibold text-[#101820]">Practice</span>
                <button type="button" onClick={run} disabled={running} className="min-h-9 rounded-lg bg-[#B5E61D] px-4 text-sm font-semibold text-[#101820] disabled:opacity-50">{running ? 'Running...' : 'Run'}</button>
              </div>
              <textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} aria-label="Program editor" className="min-h-[330px] w-full resize-y bg-[#101820] p-4 font-mono text-base leading-7 text-slate-100 outline-none" />
            </div>

            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-[#F8FAFC]">
              {mode === 'ROBOTICS' ? <RobotGrid state={robot} /> : null}
              <div className="border-b border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#101820]">Result</div>
              <pre className="min-h-40 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-slate-700">{cleanOutput(output)}</pre>
            </div>
          </div>
          )}

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">{completedKeys.has(activeLesson.key) ? 'Lesson completed.' : guidedLesson ? 'Complete this lesson when you are ready.' : ranSuccessfully ? 'Your practice ran successfully.' : 'Run the practice before completing this lesson.'}</p>
            <button type="button" onClick={() => completeMutation.mutate()} disabled={!readyToComplete || completeMutation.isPending || completedKeys.has(activeLesson.key)} className="min-h-11 rounded-xl bg-[#101820] px-5 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500">
              {completedKeys.has(activeLesson.key) ? 'Completed' : completeMutation.isPending ? 'Saving...' : activeIndex < lessons.length - 1 ? 'Complete and continue' : 'Complete course'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function lessonStarter(mode: WorkspaceMode, lesson: SkillLesson) {
  return `# ${lesson.title}\n${STARTERS[mode]}`;
}

function RobotGrid({ state }: { state: RobotState }) {
  return (
    <div className="border-b border-slate-200 p-4">
      <div className="mx-auto grid aspect-square max-w-56 grid-cols-5 overflow-hidden rounded-xl border border-slate-300 bg-white">
        {Array.from({ length: 25 }, (_, index) => {
          const active = state.x === index % 5 && state.y === Math.floor(index / 5);
          return <div key={index} className="flex items-center justify-center border-b border-r border-slate-100">{active ? <span className="text-xl font-bold text-[#101820]" aria-label="Robot">{['↑', '→', '↓', '←'][state.direction]}</span> : null}</div>;
        })}
      </div>
    </div>
  );
}

function applyRobotCommands(output: string): RobotState {
  const commandLine = output.split('\n').find((line) => line.startsWith('__ROBOT_COMMANDS__'));
  if (!commandLine) return { x: 2, y: 2, direction: 1 };
  try {
    const commands = JSON.parse(commandLine.replace('__ROBOT_COMMANDS__', '')) as Array<{ command: string; value: number }>;
    return commands.reduce<RobotState>((state, command) => {
      if (command.command === 'turn_left') return { ...state, direction: ((state.direction + 3) % 4) as RobotState['direction'] };
      if (command.command === 'turn_right') return { ...state, direction: ((state.direction + 1) % 4) as RobotState['direction'] };
      const distance = Math.max(0, Math.min(Math.abs(command.value || 1), 20)) * (command.command === 'backward' ? -1 : 1);
      const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][state.direction];
      return { ...state, x: Math.max(0, Math.min(4, state.x + dx * distance)), y: Math.max(0, Math.min(4, state.y + dy * distance)) };
    }, { x: 2, y: 2, direction: 1 });
  } catch {
    return { x: 2, y: 2, direction: 1 };
  }
}

function cleanOutput(output: string) {
  return output.split('\n').filter((line) => !line.startsWith('__ROBOT_COMMANDS__')).join('\n').trim() || 'Your program ran successfully.';
}
