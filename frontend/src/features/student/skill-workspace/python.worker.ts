interface RunRequest {
  type: 'RUN';
  requestId: number;
  mode: 'PYTHON' | 'MACHINE_LEARNING' | 'ROBOTICS';
  code: string;
  input?: string;
}
interface PyodideRuntime {
  loadPackage(packages: string[]): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(options: { batched: (message: string) => void }): void;
  setStderr(options: { batched: (message: string) => void }): void;
  setStdin(options: { stdin: () => string | null }): void;
  globals: { set(key: string, value: unknown): void; delete(key: string): void };
}
interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<PyodideRuntime>;
}
const PYODIDE_BASE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
let runtimePromise: Promise<PyodideRuntime> | null = null;
let machineLearningReady = false;
let busy = false;
// Install once, rather than redefining a non-configurable property on every run.
// Runtime downloads are allowed only while preparing the interpreter/packages.
const runtimeFetch = self.fetch.bind(self);
let downloadingRuntime = false;
Object.defineProperty(self, 'fetch', {
  configurable: false,
  writable: false,
  value: (input: RequestInfo | URL, init?: RequestInit) =>
    downloadingRuntime
      ? runtimeFetch(input, init)
      : Promise.reject(new Error('fetch is not available to learner programs')),
});
async function runtimeFor(mode: RunRequest['mode']) {
  downloadingRuntime = true;
  try {
    if (!runtimePromise)
      runtimePromise = import(/* @vite-ignore */ `${PYODIDE_BASE_URL}pyodide.mjs`).then((module) =>
        (module as unknown as PyodideModule).loadPyodide({ indexURL: PYODIDE_BASE_URL }),
      );
    const runtime = await runtimePromise;
    if (mode === 'MACHINE_LEARNING' && !machineLearningReady) {
      await runtime.loadPackage(['numpy']);
      machineLearningReady = true;
    }
    return runtime;
  } catch (error) {
    runtimePromise = null;
    machineLearningReady = false;
    throw error;
  } finally {
    downloadingRuntime = false;
  }
}
function roboticsProgram(code: string) {
  return `import json
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
print("__ROBOT_COMMANDS__" + json.dumps(_robot_commands))`;
}
self.addEventListener('message', async (event: MessageEvent<RunRequest>) => {
  if (event.data.type !== 'RUN' || busy) return;
  busy = true;
  const { requestId, mode, code, input = '' } = event.data;
  const output: string[] = [];
  let runtime: PyodideRuntime | undefined;
  const append = (message: string) => {
    if (output.join('\n').length > 30_000) throw new Error('Too much output. Try a smaller loop.');
    output.push(message);
  };
  try {
    runtime = await runtimeFor(mode);
    self.postMessage({ type: 'STARTED', requestId });
    runtime.setStdout({ batched: append });
    runtime.setStderr({ batched: append });
    const lines = input ? input.replace(/\r\n/g, '\n').split('\n') : [];
    runtime.setStdin({ stdin: () => lines.shift() ?? null });
    runtime.globals.set('__learner_code', mode === 'ROBOTICS' ? roboticsProgram(code) : code);
    // Each run has a fresh namespace, so a previous lesson's variables cannot
    // accidentally make an incomplete program pass.
    await runtime.runPythonAsync(
      '__learner_namespace = {"__name__": "__main__"}\nexec(compile(__learner_code, "<learner>", "exec"), __learner_namespace)',
    );
    self.postMessage({ type: 'RESULT', requestId, output: output.join('\n') });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      requestId,
      message: error instanceof Error ? error.message : String(error),
      output: output.join('\n'),
    });
  } finally {
    runtime?.globals.delete('__learner_code');
    runtime?.globals.delete('__learner_namespace');
    busy = false;
  }
});
