// Runs the Python oracle self-tests and the fixture freshness check.
// Uses the .venv interpreter (created by `npm run oracle:setup`) when present, else a system Python 3
// (the NumPy cross-check is then skipped).
import { runOrExit, systemPython, venvPython } from './python-env.mjs';

let cmd = venvPython();
let pre = [];
if (!cmd) {
  const py = systemPython();
  if (!py) { console.error('No Python 3 found (tried python3/python; on Windows also the py launcher).'); process.exit(1); }
  ({ cmd, pre } = py);
}
console.log(`oracle interpreter: ${[cmd, ...pre].join(' ')}`);
// -X utf8 keeps output encoding identical on Windows consoles (the oracle prints non-ASCII symbols).
runOrExit(cmd, [...pre, '-X', 'utf8', '-m', 'unittest', 'discover', '-s', 'oracle', '-p', 'test_*.py', '-v']);
runOrExit(cmd, [...pre, '-X', 'utf8', 'oracle/vector2_oracle.py', '--check']);
