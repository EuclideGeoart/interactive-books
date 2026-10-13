# Book III ownership and acceptance

The integrator owns shared platform, curriculum plan, registration validation, shell, styles, package/config files, validation scripts and acceptance. Books I/II and their baselines are read-only. No push or deployment is authorized.

Part agents own only `src/parts/pNN/`, `code/python/pNN/`, `oracle/pNN/`, `fixtures/pNN/`, `data/pNN/`, `tests/unit/pNN/`, `tests/e2e/pNN/`, and `documentation/parts/pNN/` for their assigned Part. A Part manifest registers only its own chapter IDs. Central plan and shared APIs are read-only. Requests belong in the Part's `documentation/parts/pNN/INTEGRATION_REQUESTS.md` with a failing fixture.

III-07 is owned by the foundation phase until independently accepted, then read-only for Part II. No Part implementation starts before M0/M1 and III-07 acceptance and freeze.

Use Python + NumPy canonical reference code, committed deterministic traces, and mathematically independent oracles. Browser drawings, inspector, formulas and accessible descriptions derive from one numerical state. State/trace contracts, dimensions, provenance, loss versus metric, tolerances and undefined cases must be explicit.

Only the integrator allocates expensive validation. On Linux use `flock /tmp/interactive-books-heavy-gate.lock -c 'the exact authorized command'`. Coordinate Windows separately. Do not update unrelated snapshots or dependencies, clone repositories, rewrite history, clean/reset worktrees or modify agent histories. Return exact commands, outcomes, files, commits and limitations; do not self-declare frozen.
