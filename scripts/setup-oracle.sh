#!/bin/sh
# Creates .venv with NumPy for the oracle cross-check. Safe to re-run. Does not touch the system Python.
set -eu
cd "$(dirname "$0")/.."
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install --quiet --disable-pip-version-check -r oracle/requirements.txt
.venv/bin/python -c "import numpy; print('numpy', numpy.__version__, 'ready in .venv')"
