// Shared by oracle:setup and test:oracle: where the project's virtual environment lives and which system
// Python can create it. Works on Windows (PowerShell/cmd, no Git Bash needed), Linux and macOS.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

/** Interpreter inside .venv (Scripts\python.exe on Windows, bin/python elsewhere), or null when it does not exist. */
export const venvPython = () => {
  const path = isWindows ? '.venv/Scripts/python.exe' : '.venv/bin/python';
  return existsSync(path) ? path : null;
};

/** First system interpreter that runs and is Python 3. Linux/macOS: python3, python. Windows: py -3, python, python3. */
export const systemPython = () => {
  const candidates = isWindows ? [['py', '-3'], ['python'], ['python3']] : [['python3'], ['python']];
  for (const [cmd, ...pre] of candidates) {
    const r = spawnSync(cmd, [...pre, '-c', 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)'], { stdio: 'ignore' });
    if (r.status === 0) return { cmd, pre };
  }
  return null;
};

/** Run to completion with inherited stdio; exits this process on failure. */
export const runOrExit = (cmd, args, options = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (r.error) { console.error(`failed to run ${cmd}: ${r.error.message}`); process.exit(1); }
  if (r.status !== 0) process.exit(r.status ?? 1);
};
