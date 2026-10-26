export interface RobotState {
  x: number;
  y: number;
  direction: number;
}
export function applyRobotCommands(output: string): RobotState {
  const line = output.split('\n').find((item) => item.startsWith('__ROBOT_COMMANDS__'));
  const initial = { x: 2, y: 2, direction: 1 };
  if (!line) return initial;
  try {
    const parsed: unknown = JSON.parse(line.slice('__ROBOT_COMMANDS__'.length));
    if (!Array.isArray(parsed)) return initial;
    return parsed.reduce<RobotState>((state, item) => {
      if (!item || typeof item !== 'object') return state;
      const command = item as { command?: string; value?: number };
      if (command.command === 'turn_left') return { ...state, direction: (state.direction + 3) % 4 };
      if (command.command === 'turn_right') return { ...state, direction: (state.direction + 1) % 4 };
      if (!['forward', 'backward'].includes(command.command ?? '')) return state;
      const value = Number(command.value ?? 1);
      if (!Number.isFinite(value)) return state;
      const distance =
        Math.max(0, Math.min(Math.trunc(value), 20)) * (command.command === 'backward' ? -1 : 1);
      const [dx, dy] = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ][state.direction];
      return {
        ...state,
        x: Math.max(0, Math.min(4, state.x + dx * distance)),
        y: Math.max(0, Math.min(4, state.y + dy * distance)),
      };
    }, initial);
  } catch {
    return initial;
  }
}
export function cleanOutput(output: string) {
  return output
    .split('\n')
    .filter((line) => !line.startsWith('__ROBOT_COMMANDS__'))
    .join('\n')
    .replace(/\r\n/g, '\n')
    .trim();
}
export function checkPractice(output: string, expected?: string, target?: RobotState) {
  const matchesOutput = expected === undefined || cleanOutput(output) === expected.trim();
  const robot = applyRobotCommands(output);
  return (
    matchesOutput &&
    (!target || (robot.x === target.x && robot.y === target.y && robot.direction === target.direction))
  );
}
export function explainPythonError(message: string) {
  if (/fetch is not available/.test(message))
    return 'Learner programs cannot use fetch. Use the local practice data in this lesson.';
  if (/failed to fetch|network|download|loadpyodide|failed to load/i.test(message))
    return 'The Python runtime could not finish loading. Check your internet connection, then try Run code again.';
  if (/SyntaxError/.test(message))
    return 'Check matching quotation marks, parentheses and the colon after if, for or def.';
  if (/IndentationError|TabError/.test(message))
    return 'Check the spaces at the start of each line. Use four spaces inside a block.';
  if (/NameError/.test(message))
    return 'A name was used before it had a value. Check its spelling and define it before using it.';
  if (/EOFError/.test(message))
    return 'The program asked for more input. Add one line per input() call in Program input.';
  if (/ValueError/.test(message))
    return 'A value could not be converted. If using int(), supply digits such as 12, not words.';
  if (/TypeError/.test(message))
    return 'Check the types you are combining. Convert numbers to strings when joining text, or use commas in print().';
  if (/ZeroDivisionError/.test(message)) return 'The program tried to divide by zero. Check the denominator.';
  return 'Read the last line of the message, compare your code with the example, then try a smaller change.';
}
export function draftKey(userId: number, courseId: number, lessonKey: string) {
  return `assignmenthub:skill-draft:${userId}:${courseId}:${lessonKey}`;
}
