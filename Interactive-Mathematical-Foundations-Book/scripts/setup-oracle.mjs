// Creates .venv with NumPy for the oracle cross-check. Safe to re-run. Does not touch the system Python.
// Cross-platform replacement for the former setup-oracle.sh.
import { existsSync } from 'node:fs';
import { runOrExit, systemPython, venvPython } from './python-env.mjs';

if (!existsSync('.venv')) {
  const py = systemPython();
  if (!py) { console.error('No Python 3 found (tried python3/python; on Windows also the py launcher).'); process.exit(1); }
  runOrExit(py.cmd, [...py.pre, '-m', 'venv', '.venv']);
}
const python = venvPython();
if (!python) { console.error('.venv exists but has no interpreter; delete .venv and re-run.'); process.exit(1); }
runOrExit(python, ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', 'oracle/requirements.txt']);
runOrExit(python, ['-c', "import numpy; print('numpy', numpy.__version__, 'ready in .venv')"]);
