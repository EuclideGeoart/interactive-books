// Runs the Python oracle self-tests and the fixture freshness check.
// Uses the .venv interpreter (created by `npm run oracle:setup`) when present, else a system Python 3
// (the NumPy cross-check is then skipped).
import { readdirSync } from 'node:fs';
import { runOrExit, systemPython, venvPython } from './python-env.mjs';

let cmd = venvPython();
let pre = [];
if (!cmd) {
  const py = systemPython();
  if (!py) { console.error('No Python 3 found (tried python3/python; on Windows also the py launcher).'); process.exit(1); }
  ({ cmd, pre } = py);
}
console.log(`oracle interpreter: ${[cmd, ...pre].join(' ')}`);
const files = readdirSync('oracle').filter(f => f.endsWith('_oracle.py') && !f.startsWith('test_')).sort();
const requested = [...new Set(process.argv.slice(2))];
for (const family of requested) if (!files.includes(`${family}_oracle.py`)) throw new Error('Unknown oracle family: ' + family);
// -X utf8 keeps output encoding identical on Windows consoles (the oracle prints non-ASCII symbols).
for (const pattern of requested.length ? requested.map(family => `test_${family}_oracle.py`) : ['test_*.py'])
  runOrExit(cmd, [...pre, '-X', 'utf8', '-m', 'unittest', 'discover', '-s', 'oracle', '-p', pattern, '-v']);
// Every oracle (oracle/<family>_oracle.py) must support `--check`: it fails when its committed fixture is stale. Discovered, not listed,
// so a new chapter's oracle cannot be forgotten.
for (const file of files.filter(file => !requested.length || requested.includes(file.replace('_oracle.py', '')))) {
  runOrExit(cmd, [...pre, '-X', 'utf8', `oracle/${file}`, '--check']);
}
