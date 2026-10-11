interface RunRequest {
  type: 'RUN';
  requestId: number;
  mode: 'PYTHON' | 'MACHINE_LEARNING' | 'ROBOTICS';
  code: string;
}

interface PyodideRuntime {
  loadPackage(packages: string[]): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(options: { batched: (message: string) => void }): void;
  setStderr(options: { batched: (message: string) => void }): void;
}

interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<PyodideRuntime>;
}

const PYODIDE_VERSION = '0.27.7';
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
let runtimePromise: Promise<PyodideRuntime> | null = null;
let machineLearningReady = false;

async function runtimeFor(mode: RunRequest['mode']) {
  if (!runtimePromise) {
    runtimePromise = import(/* @vite-ignore */ `${PYODIDE_BASE_URL}pyodide.mjs`)
      .then((module) => (module as unknown as PyodideModule).loadPyodide({
        indexURL: PYODIDE_BASE_URL,
      }));
  }
  const runtime = await runtimePromise;
  if (mode === 'MACHINE_LEARNING' && !machineLearningReady) {
    await runtime.loadPackage(['numpy']);
    machineLearningReady = true;
  }
  Object.defineProperty(self, 'fetch', {
    configurable: false,
    value: () => Promise.reject(new Error('Network access is disabled in this workspace')),
  });
  return runtime;
}

function roboticsProgram(code: string) {
  return `
import json
_robot_commands = []

def forward(steps=1):
    _robot_commands.append({"command": "forward", "value": int(steps)})

def backward(steps=1):
    _robot_commands.append({"command": "backward", "value": int(steps)})

def turn_left():
    _robot_commands.append({"command": "turn_left", "value": 1})

def turn_right():
    _robot_commands.append({"command": "turn_right", "value": 1})

${code}
print("__ROBOT_COMMANDS__" + json.dumps(_robot_commands))
`;
}

self.addEventListener('message', async (event: MessageEvent<RunRequest>) => {
  if (event.data.type !== 'RUN') return;
  const { requestId, mode, code } = event.data;
  const output: string[] = [];
  try {
    const runtime = await runtimeFor(mode);
    runtime.setStdout({ batched: (message) => output.push(message) });
    runtime.setStderr({ batched: (message) => output.push(message) });
    await runtime.runPythonAsync(mode === 'ROBOTICS' ? roboticsProgram(code) : code);
    self.postMessage({ type: 'RESULT', requestId, output: output.join('\n') });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      requestId,
      message: error instanceof Error ? error.message : String(error),
      output: output.join('\n'),
    });
  }
});
