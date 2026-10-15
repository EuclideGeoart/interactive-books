# P04 focused type-gate correction

The owner's focused run at `45d43131651c7c26e8e42cf790b595d0b01e5782` exited **1** at the type/content gate before units, production builds or browser gates. Astro reported **80 files, 1 error, 0 warnings, 2 hints**. This is a recorded failed run, not acceptance.

Retained owner evidence (read-only, not copied over or committed):
- `artifacts/integrator-focused-validation-45d4313.log`
  SHA256 `4fc72eff66b669d09f395ca407221908255f324cb3214fd27f97529e3d383275`
- `artifacts/integrator-focused-45d4313-exit.txt` (content: `1`)
  SHA256 `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`

Scoped diagnostics from that log:

```text
src/parts/p04/model/tree.ts:33:19 - ts(7006):
Parameter 'x' implicitly has an 'any' type.

tests/unit/p04/parity.test.ts:4 - ts(6133):
'bestSplit' is declared but its value is never read.
'CLASS_ROWS' is declared but its value is never read.

Result (80 files):
- 1 error
- 0 warnings
- 2 hints
```

Correction source commit: `191060d20d987d584339139d2846086b9d63f960`.
- Annotate the feature-validation callback `(x: number)`, matching `Row.x`'s declared element type after array checks.
- Remove the unused `CLASS_ROWS` and `bestSplit` imports.

Only those two source lines changed. Runtime validation, mathematical algorithms, state, numerical tolerances, Python, fixtures and browser tests are unchanged. No compiler setting or shared file changed; no loose-any workaround.

Author verification for this routine correction: exact two-file/two-line diff inspection and `git diff --check` passed. Existing light-test evidence is retained; no new unit, full type check, build, oracle sweep or browser job was run. The owner will rerun all nine focused gates after clean preflight. No corrected type-gate pass is claimed.

The handoff report includes this evidence. No shared integration request or architecture change is needed.
