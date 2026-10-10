// Runs the Python oracle self-tests and the fixture freshness check.
// Uses .venv/bin/python (created by `npm run oracle:setup`) when present, else python3 (NumPy cross-check then skipped).
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const python = existsSync('.venv/bin/python') ? '.venv/bin/python' : 'python3';
const run = (args) => {
  const r = spawnSync(python, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
console.log(`oracle interpreter: ${python}`);
run(['-m', 'unittest', 'discover', '-s', 'oracle', '-p', 'test_*.py', '-v']);
run(['oracle/vector2_oracle.py', '--check']);
