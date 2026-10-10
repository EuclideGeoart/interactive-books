# M3 / REF-1 — Vectors chapter (I.3): implementation report

Base: accepted Linux foundation commit `0ba0628`. Scope: M3 only (no M4). Not pushed.

## Architecture
`state → derived (pure model) → views`, one flat state per stage, no competing copies of derived values.
- Math (new, shared, pure): `src/math/vector2/direction.ts` (`compareDirections`: location, ratio, `atan`, `atan2`, exact correction ∈ {0, π, −π}), `placement.ts` (`derivePlacement`, `withTail`, `withTip`; 9-decimal exact decimal sums).
- Lesson views: `src/lessons/vectors/{pythagoras,placement,direction}-lesson.ts`, `exercises.ts` (pure, graded by id).
- Stages (Preact islands): the existing `VectorStage` (reused unchanged), `PythagorasStage`, `PlacementStage`, `DirectionStage`, `WorkedExampleStage`, `Exercise`; static `ProbeTable`/`NumericsTable` computed at build time from the model.
- Platform additions: `ui/ids.tsx` (`IdScope`/`useScopedId`) — Preact `useId` collided across islands (`P0-0`, which also broke label→input association); `Polygon` primitive; `'ink'` role; `styles/chapter.css`; `Xref.astro`.
- Publishing: `available(n, title, slug, role?)` helper; only I.3 flipped; `check-dist` requires exactly the published slugs; contents, landing, footer and pager text derive from the curriculum. `/foundation/` stays a separate labelled demo.

## Educational content
Hero + immediate stage; intuition; points vs displacements; definition; Pythagoras magnitude (squares as areas); direction; why `atan(y/x)` fails; worked examples; five executable Python files (incl. NumPy batch); explore prompts; misconceptions; numerical considerations; ML/engineering connections; nine exercises (calculation, prediction, explanation, construction) with misconception-specific feedback and revealable worked solutions; summary and checkpoints.

## Interactions
A draggable vector (shared stage); B point vs displacement (drag P slides the arrow, drag Q changes v; ghost arrow from origin); C `atan` vs `atan2` with presets for each quadrant, axes and zero, the line through the origin holding v and −v, the naive arrow shown only when it disagrees, a verdict sentence. All support pointer, keyboard, numeric entry and Reset, with polite live regions.

## Math evidence
Independent Python oracle (`oracle/direction_oracle.py`: sign table, `Fraction` ratio, numeric correction cross-checked against the sign rule, `Decimal` placement) → `fixtures/vector2-direction.fixtures.json` (199 direction + 107 placement cases) → `direction.parity.test.ts` (worst-ulp report). Policies: zero vector direction undefined, x=0 ratio undefined (never ±∞), −0 → +0, exact radicals with `=`/`≈`. Python reference files are executed by the oracle tests.

## Tests (native Linux)
- `npm run check`: 0 errors/warnings/hints.
- Unit: 767 passing (14 files), incl. `direction`, `direction.parity`, `vectors-lesson` (square areas = side², outward placement, translation invariance, strict-KaTeX sweeps, exercise grading).
- Oracle: all passing; fixtures fresh.
- Build + `build:subpath` + `check:dist`: OK (5 pages each).
- E2E root: 397 passed, 20 skipped (by design). Subpath: 370 passed, 5 skipped. Includes new `vectors.spec.ts` (publication, nav, pager, hydration, duplicate ids, each stage's interactions, translation invariance read from inspector rows and drawn handle pixels, quadrant/axis/zero counterexamples, exercise feedback, overflow) and axe (light+dark) over the chapter in unusual states.
- Tolerances unchanged (`maxDiffPixelRatio 0.004`).

## Screenshots
Updated Linux baselines, each inspected: `desktop-home-fold(-dark)`, `mobile-contents-fold`, `mobile-map` (intended text/link changes). `mobile-equation-overflow` (foundation page) also changed: ~3% anti-aliasing differences with no positional offset, deterministic, and passing at `0ba0628`; the cause is the rewritten scope callout above it shifting the sub-pixel position — accepted as an effect of intended content, not a regression. Foundation stage baselines are unchanged. New: `{desktop,tablet,mobile}-chapter-{placement,pythagoras,direction}`, `desktop-chapter-direction-zero`. `__screenshots__/win32/` untouched.

## Performance
Chapter HTML 332 KB (42 KB gzip). Largest script chunk is the shared KaTeX/vector-lesson bundle (271 KB, 82 KB gzip); stage chunks are 7–13 KB. Hydration is `client:load` for every stage; no jank observed in tests.

## Limitations
- **Windows post-M3 validation is pending**; Windows contents/map/home baselines are now stale and chapter baselines are missing.
- Pager neighbours I.2/I.4 are planned (text only).
- All stages hydrate eagerly; `client:visible` could cut initial JS.
- Dragging the tip clamps v to ±4 per component.

## Commit and status
Recorded in the final message and `git log` (the hash cannot appear inside its own commit).
