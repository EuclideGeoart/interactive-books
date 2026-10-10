# M5 — Part I "Mathematical Language": completion report

Starting HEAD `775c046` (curriculum v1.1, 97 chapters). All nine Part I chapters are now `available`; the other 88 are `planned`. I.3 Vectors is unchanged and remains the reference chapter; VI.4 remains the flagship. Reading order I.1–I.9 is unchanged. Part II was not started. Nothing was pushed.

## 1. The eight new chapters

| ID | Slug | Core interactive mechanism |
|---|---|---|
| I.1 | `quantities` | units and dimensions, powers and roots on exact/decimal arithmetic, strict `=` versus `≈` |
| I.2 | `coordinates` | points on the shared plane, draggable and typed entry, quadrants, distance and midpoint |
| I.4 | `algebra` | balance scale with "do the same to both sides" history, solution set on a number line, inequality sign reversal, extraneous solutions, the division-by-zero fallacy |
| I.5 | `functions` | synchronized pipeline, graph, table and algebra; input versus parameter; domain/image; composition in both orders; inverse and restriction |
| I.6 | `function-families` | power, exponential, log and trig families, inverses, rotating unit vector (radians, periodicity) |
| I.7 | `sets-and-relations` | sets, intervals and endpoints, complement relative to an explicit universe, relations |
| I.8 | `summation` | the sum as a loop: immutable `TraceStepper` with opt-in autoplay, exact accumulator, equivalent Python loop, bounds and off-by-one, empty sums |
| I.9 | `notation-map` | bridge and reference chapter: notation table, indexing and shape conventions for ML, six small stages |

Each chapter has definitions, worked examples, misconceptions, executable Python (`code/python/*`, executed by `oracle/test_*.py`), exercises with feedback, engineering/ML connections and a summary.

## 2. Architecture

State → pure domain model (`src/math/<family>/`) → derived object → views (`src/lessons/<chapter>/`). No universal CAS or graphing engine. Shared additions (commit `0a78bc3`, `ed36ab1`):

- `sampleCurve` / `definedFraction` (`src/platform/geometry/curve.ts`) and `Curve`/`PointMarker` (`src/ui/plane/Curve.tsx`), with samples memoised on parameters and never on a dragged input.
- Shared exercise kit (`src/platform/exercise.ts`, `src/ui/ExerciseForm.tsx`), opt-in `TraceStepper` autoplay, `FormulaScroll` moved to `src/ui`, a `decimalsOf` fix in `params.ts`, and `firstAvailable`.
- Pager, footer, landing page and deployment seed are derived from the curriculum; no slug is hard-coded.

Exact arithmetic is used wherever feasible (BigInt rationals, scaled decimals, exact radicals, multiples of π); doubles are shown with `≈`.

## 3. Independent validation

Every family has a Python oracle that uses a different algorithm from the TypeScript model, a fixture JSON, a TypeScript parity test with a stated tolerance, a `--check` staleness gate, and literal-value self-tests. `scripts/run-oracle.mjs` discovers oracles by glob (20 oracle files incl. earlier chapters). Mathematical and visual tolerances were not changed. Examples of defects caught by these checks: wrong 0.1+0.2 sentences (I.7), an unverified `np.linalg.norm` overflow claim (I.9), a wrong division-fallacy example in the brief (I.5), preset/state label mismatches (I.1, I.7).

## 4. Test totals (native Linux)

| Command | Result |
|---|---|
| `npx astro check` | 0 errors, 0 warnings, 4 hints |
| `npx vitest run` | 50 files, 9694 tests passed |
| `npm run test:oracle` | all oracles fresh and passing (NumPy cross-check on) |
| `npm run build` / `build:subpath` | 13 pages each |
| `npm run check:dist` | root and subpath OK (223 files each) |
| `npm run test:e2e` (root; desktop/tablet/mobile) | 1569 passed, 20 skipped, 4 failed — the 4 were the expected `contents-fold` and `map` screenshots (desktop, mobile), then re-baselined; `visual-part-i.spec.ts` (24 shots) added afterwards and passing, stable on `--repeat-each=2` |
| `npm run test:e2e:subpath` | 1570 passed, 5 skipped, 0 failed |

Note: the root run and the re-baselining/new spec were separate invocations; I did not re-run the whole root suite as one `npm run validate` after accepting baselines.

Reproduce: `npm run validate` (or each command above). Heavy runs were serialised with `flock /tmp/imf-heavy.lock`.

## 5. Screenshot-review evidence

Inspected before acceptance: desktop `contents-fold` and mobile `map` (now "9 of 97 chapters written", Part I "9 of 9 chapters written", all nine rows available, I.3 flagged reference) and desktop I.4, mobile I.5 and tablet I.8 opening stages (layout intact, no clipping or overflow). The remaining new shots were produced by the same deterministic path and passed twice, but were not each viewed. New Linux baselines: 4 updated (`desktop|mobile-contents-fold`, `desktop|mobile-map`) and 24 added (`{desktop,tablet,mobile}-part-i-<slug>.png`, eight chapters). The chapter specs also run axe in both themes, keyboard, touch-target, reduced-motion and overflow checks.

## 6. Performance observations

- `dist/_astro` is 3.6 MB total; largest chunk is the Formula/KaTeX chunk (≈262 KB), chapter chunks ≈15 KB each. No new libraries.
- `npm run measure:drag` on foundation demo (i5-12600, Chromium): whole-snap 1×: p50 0.2 ms, p95 8.2 ms, 0 moves over 16.7 ms; free 1×: p50 6.8 ms, p95 7.9 ms, 0 over. Under 4×/6× CPU throttling (a rough stand-in only) free-snap exceeds a frame on every move (p50 28/42 ms). That worst case is formula re-rendering on every pixel; it predates M5 and was not optimised here.
- Memoisation: curve samples depend on parameters only; stages subscribe to derived views so an unrelated state change does not rerender other stages.
- Deferred hydration (`client:visible`) was evaluated and **not implemented**: all islands stay `client:load`, because the e2e and accessibility contracts rely on `data-hydrated` being set without scrolling, and gains were not demonstrated.

## 7. M4 contracts preserved

`useLesson`, plane, `DragPoint`, `ParameterInput`, `Inspector`, `Formula`, `TraceStepper`, `IdScope`, the MDX/layout/navigation shell and the oracle/fixture workflow are reused. I.3's specs and baselines pass unchanged. A suspected `DragPoint` keyboard-commit bug was checked: `apply` already returns the committed point, so no change was made.

## 8. Windows status (deferred)

`tests/e2e/__screenshots__/win32/` is untouched. For the next Windows session: **stale** — `desktop-contents-fold`, `mobile-contents-fold`, `desktop-map`, `mobile-map`; **missing** — all 24 `part-i-*` shots. Windows validation was not run in M5.

## 9. Remaining limitations

- Free-drag formula rendering under heavy CPU throttling exceeds one frame (see §6).
- The full pipeline was run as separate commands rather than a single final `npm run validate`.
- Not every new baseline was individually viewed (see §5).
- Platform wishes not done: ellipsis after unit, `nowrap`/`sym`, right-aligned `aligned` blocks.
- Part I numerals/chapter titles are unchanged; later Parts remain planned.

## 10. Commits

See `git log 775c046..HEAD`; the integration commits are the groundwork `0a78bc3`, platform `ed36ab1`, the two chapter-block merges (the last is `e32f41f`), the curriculum test tightening, and the final commit that adds this report, the new visual spec and the baselines.
