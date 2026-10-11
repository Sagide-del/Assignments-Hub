import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { skillsApi } from '../../../api/skills.api';
import { EmptyState, PageHeader } from '../../../components/ui/Saas';
import {
  hasWorkspaceAccess,
  workspaceModeForCourse,
  type WorkspaceMode,
} from './workspace-mode';

const STARTERS: Record<WorkspaceMode, string> = {
  PYTHON: `# Write Python, then select Run\nname = "Learner"\nprint(f"Welcome, {name}")`,
  MACHINE_LEARNING: `import numpy as np\n\nscores = np.array([64, 72, 81, 76, 88])\nprint("Mean score:", scores.mean())`,
  ROBOTICS: `# Available: forward, backward, turn_left, turn_right\nforward(2)\nturn_right()\nforward(3)`,
};

const MODE_LABELS: Record<WorkspaceMode, string> = {
  PYTHON: 'Python workspace',
  MACHINE_LEARNING: 'Machine learning workspace',
  ROBOTICS: 'Robotics simulator',
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

  if (courseQuery.isLoading) return <EmptyState title="Loading workspace..." />;
  if (courseQuery.isError || !courseQuery.data) return <EmptyState title="Course not available." />;

  const course = courseQuery.data;
  const mode = workspaceModeForCourse(course);
  if (!mode) {
    return (
      <EmptyState
        title="This course does not use a coding workspace."
        action={<Link to={`/student/learn-skills/${course.id}`} className="font-semibold text-[#101820]">Back to course</Link>}
      />
    );
  }
  if (!hasWorkspaceAccess(course)) {
    return (
      <EmptyState
        title="Activate your enrollment to open this workspace."
        action={<Link to={`/student/learn-skills/${course.id}`} className="font-semibold text-[#101820]">View enrollment</Link>}
      />
    );
  }

  return <Workspace courseId={course.id} courseTitle={course.title} mode={mode} />;
}

function Workspace({
  courseId,
  courseTitle,
  mode,
}: {
  courseId: number;
  courseTitle: string;
  mode: WorkspaceMode;
}) {
  const [code, setCode] = useState(STARTERS[mode]);
  const [output, setOutput] = useState('Ready.');
  const [running, setRunning] = useState(false);
  const [robot, setRobot] = useState<RobotState>({ x: 2, y: 2, direction: 1 });
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    workerRef.current?.terminate();
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  function resetWorker() {
    workerRef.current?.terminate();
    workerRef.current = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
    return workerRef.current;
  }

  function run() {
    const worker = resetWorker();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setRunning(true);
    setOutput('Starting secure workspace...');
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.requestId !== requestId) return;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      setRunning(false);
      const result = [event.data.output, event.data.message].filter(Boolean).join('\n').trim();
      setOutput(result || 'Program completed with no output.');
      if (mode === 'ROBOTICS' && event.data.output) {
        setRobot(applyRobotCommands(event.data.output));
      }
    };
    worker.onerror = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      setRunning(false);
      setOutput('The workspace could not start. Check your connection and try again.');
    };
    worker.postMessage({ type: 'RUN', requestId, mode, code });
    timeoutRef.current = window.setTimeout(() => {
      worker.terminate();
      setRunning(false);
      setOutput('Program stopped after 12 seconds. Check for an infinite loop.');
    }, 12_000);
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={MODE_LABELS[mode]} meta={courseTitle} />
        <Link to={`/student/learn-skills/${courseId}`} className="text-sm font-semibold text-slate-600">Back to course</Link>
      </div>

      <section className="grid min-h-[620px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(16,24,32,0.06)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex min-w-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex min-h-14 items-center justify-between border-b border-slate-200 px-4">
            <span className="text-sm font-semibold text-[#101820]">main.py</span>
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="min-h-11 rounded-xl bg-[#B5E61D] px-5 text-sm font-semibold text-[#101820] disabled:opacity-50"
            >
              {running ? 'Running...' : 'Run'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            aria-label="Program editor"
            className="min-h-[360px] flex-1 resize-none bg-[#101820] p-5 font-mono text-base leading-7 text-slate-100 outline-none"
          />
        </div>

        <div className="flex min-w-0 flex-col bg-slate-50">
          {mode === 'ROBOTICS' ? <RobotGrid state={robot} /> : null}
          <div className="flex min-h-14 items-center border-b border-slate-200 px-4 text-sm font-semibold text-[#101820]">Output</div>
          <pre className="min-h-56 flex-1 overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-sm leading-6 text-slate-700">{cleanOutput(output)}</pre>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Code runs in an isolated browser worker and stops automatically after 12 seconds.
      </p>
    </div>
  );
}

function RobotGrid({ state }: { state: RobotState }) {
  return (
    <div className="border-b border-slate-200 p-4">
      <div className="mx-auto grid aspect-square max-w-72 grid-cols-5 overflow-hidden rounded-xl border border-slate-300 bg-white">
        {Array.from({ length: 25 }, (_, index) => {
          const x = index % 5;
          const y = Math.floor(index / 5);
          const active = state.x === x && state.y === y;
          return (
            <div key={index} className="flex items-center justify-center border-b border-r border-slate-100">
              {active ? <span className="text-2xl font-bold text-[#101820]" aria-label="Robot">{['↑', '→', '↓', '←'][state.direction]}</span> : null}
            </div>
          );
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
      const sign = command.command === 'backward' ? -1 : 1;
      const distance = Math.max(0, Math.min(Math.abs(command.value || 1), 20)) * sign;
      const movements = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const [dx, dy] = movements[state.direction];
      return {
        ...state,
        x: Math.max(0, Math.min(4, state.x + (dx * distance))),
        y: Math.max(0, Math.min(4, state.y + (dy * distance))),
      };
    }, { x: 2, y: 2, direction: 1 });
  } catch {
    return { x: 2, y: 2, direction: 1 };
  }
}

function cleanOutput(output: string) {
  return output
    .split('\n')
    .filter((line) => !line.startsWith('__ROBOT_COMMANDS__'))
    .join('\n')
    .trim() || 'Program completed with no output.';
}
