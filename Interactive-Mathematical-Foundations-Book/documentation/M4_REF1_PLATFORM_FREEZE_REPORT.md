# M4 — REF-1 final acceptance and platform freeze

Starting HEAD `ec60963`. Scope: one numerical fix, one maintainability fix, final Linux validation, freeze documentation. Not pushed. No other chapter started.

## M4-A — `sameRatio` numerical defect (closed)
`2x+3y` overflowed for finite components (`1e308, 1e308` → residual and tolerance both `Infinity`, `Infinity ≤ Infinity` accepted). The predicate now works on the vector scaled by its larger component (`xn = x/m`, `yn = y/m`, all |·| ≤ 1), so no intermediate can overflow, and returns `false` for non-finite input or the zero vector. The relative tolerance (1e-12) is unchanged, so ordinary inputs behave exactly as before; misconception feedback is unchanged.
Regression tests (unit): `(1e308,1e308)`, `(1e308,−1e308)`, `(1.7e308,1.7e308)`, `±Infinity`, `NaN`, zero vector, vertical and horizontal extremes → rejected; `(3e307,−2e307)`, `(1.5e308,−1e308)`, `(3e-300,−2e-300)`, subnormal `(3e-320,−2e-320)` → ratio accepted; `(3e-320, 2e-320)` rejected; through `grade`, a 309-digit `(1e308,1e308)` is rejected with the ratio message, `(3e307,−2e307)` accepted, `(−3e307, 2e307)` reports "same way".

## M4-C — publishing maintainability (closed)
`scripts/check-dist.mjs` no longer hardcodes a slug list. The published chapters are the chapter links on the generated contents page (rendered from the curriculum). The check requires: at least one link; every link resolves to a built chapter page; every built `chapters/<dir>` is linked. Planned chapters have no link, so they cannot have a page. Adding a chapter needs no script edit. No dependencies; plain Node, path-separator independent. Verified both ways: an unlinked `chapters/bogus/` and a link to a non-built `ghost` are reported as failures.

## Accepted architectural contracts (frozen, because I.3 exercises them)
- **Canonical state + `useLesson`**: flat, immutable state; `isCanonical` by top-level `Object.is`; `reset` returns to canonical. Island props are serializable.
- **Pure derivation**: `state → derived → views`; no view keeps a derived copy. Domain mathematics (`vector2`, `direction`, `placement`) stays owned by its chapter family and is not generalized.
- **World↔screen**: one place converts (`platform/geometry/viewport`); world y up; plane primitives take world coordinates.
- **`DragPoint`**: pointer, arrow keys (Shift ×5) and numeric entry are equivalent; named, with a hint.
- **Inspector + formula synchronisation**: rows are `ValueDescription`s; `=` exact, `≈` approximate, undefined carries a reason.
- **Exact/approximate values** (`describeValue`, `formatGiven/Approx`) and strict KaTeX with shared macros.
- **Immutable traces** (`traceFrom`, `cursorAt`, `TraceStepper`).
- **Parameters**: `ParamSpec` with reject-on-invalid; **new frozen field `maxDecimals`** for a declared numeric precision (reject, never round).
- **Cross-island ids**: `IdScope` + `useScopedId` (Preact `useId` collides across islands); every stage wraps itself in an `IdScope`.
- **Accessibility/responsive**: polite live regions, labelled scroll regions only when overflowing, 44 px targets, tested at 1440/820/390 and in both themes with axe.
- **Oracle parity**: independent Python algorithm → fixture with inputs and expectations → TS parity test with stated ulp tolerance, `--check` for staleness, literal-value self-test; reference code files are executed by the oracle.
- **Publishing**: `available(n, title, slug, role?)`; contents/landing/footer/pager text derive from the curriculum; `check-dist` derives the published set from the generated contents page.

## Mathematical evidence
Direction: 199 oracle cases; placement: 107 (all inputs ≤ 6 decimals); parity tests with worst-ulp report; quadrant, axis and zero policies; correction exactly {0, π, −π}; placement exactness contract (≤ 6 decimals, rejected beyond); `sameRatio` extremes. Python reference files are run by the oracle suite.

## Chapter quality assessment
Strengths: every layer in the plan is present; three synchronized mechanisms; nine exercises that predict, calculate, construct or choose explanations, each with misconception-specific feedback; all numbers computed by the model. Weaker points: prose is dense in the direction section; exercise grading is by hand-written rules (appropriate here, not a general framework); ML connections are short; no stage has an animation or a step-wise "play" mode.

## Validation (native Linux, this session, sequential)
| Check | Result |
| --- | --- |
| `astro check` | 0 errors, 0 warnings, 0 hints |
| Unit (vitest) | 777 passed, 14 files |
| Python oracle | 35 tests OK; direction fixture fresh |
| `build`, `build:subpath` | OK, 5 pages each |
| `check:dist` (root, subpath) | OK; negative cases fail as intended |
| **Full root e2e** | **403 passed, 20 skipped, 0 failed** |
| **Full subpath e2e** | **376 passed, 5 skipped, 0 failed** |
No snapshot changed in M4; tolerances and fixtures untouched; Windows baselines untouched. The M3-P1 report now distinguishes its earlier visual reruns from the full root run (which this run supplies after the snapshot update).

## Platform status
- **Linux development and validation: accepted.**
- **Windows foundation (through M2/WIN-0): previously validated.**
- **Windows M3+ validation: deferred** to the next planned Windows session. Windows contents/map/home baselines are stale and chapter baselines are missing. The cross-platform M3 release is **not** claimed validated.

## Known limitations and deferred items
- Windows M3+ run (above).
- All islands hydrate with `client:load`; `client:visible` would cut initial JS (shared KaTeX bundle 271 KB, 82 KB gzip).
- Stage screenshots shift ~1 px when text above them changes; consider isolating them from page layout.
- Tip dragging clamps v to ±4 per component.
- Pager neighbours I.2 and I.4 are planned (text only).

## Commit
Given in the final message (a commit cannot contain its own hash).
