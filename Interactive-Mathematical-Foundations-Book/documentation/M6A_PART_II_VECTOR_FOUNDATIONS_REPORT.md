# M6-A — Geometric foundations of linear algebra

M6-A implements and publishes II.1–II.7 on `feature/book-ii-m6a`, starting at `489c87cec473f8fb24f135535d186555edc89556`. Part I retains its nine available chapters; Part II now has seven. The curriculum has **16 available chapters out of 97, with 81 planned**. I.3 remains the only reference chapter and VI.4 the only flagship. II.8–II.19 remain planned; Part II is not complete.

The user paused tests and builds because the host was short of free space, authorized consolidating the temporary checkout into the canonical directory, then resumed validation there. The interrupted run's disposable trace artifacts and the redundant temporary clone were removed after source preservation checks. Final browser runs disable trace recording and use the shared host lock; assertions, screenshot tolerances and failure screenshots remain enabled. Post-integration validation and individual Linux visual acceptance are recorded below.

## Checkout consolidation and scope

Implementation and the earlier validation used the independent clone `/tmp/book-ii-m6a`, its own dependencies and build outputs, and the required starting commit. Heavy builds, browser runs, and the drag benchmark used `flock /tmp/imf-heavy.lock`; isolated ports were 4471, 4472, and 4473.

Work now continues in `/work/interactive-books/Interactive-Mathematical-Foundations-Book` on `feature/book-ii-m6a`, reusing that directory's existing `node_modules` and `.venv`. Consolidation commit `57c5d8fb0564730590ed433fa9f3c0161c8cd6aa` merges main's M5-P1 commit `2a81b54d958bc830c6ab96c5f7ac8a36d17fae0e` into the saved M6-A history. The merge had no conflicts. Before deleting the temporary clone, all 83 M6-A files were verified byte for byte against it and all 11 M5-P1 files against main; there were no overlapping changed paths. The older clean `/work/interactive-books-m6a` worktree remains intact at its original commit with a detached HEAD. The `main` branch still points to the M5-P1 commit.

M6-A's changes relative to main do not modify Book I, existing Part I domain/lesson code, the protected summation/quantities surfaces, or Windows baselines. The independently authored M5-P1 corrections are retained in full. Before consolidation, all ten existing chapter files, including I.3 and the earlier draft, were checked byte for byte against the starting commit. No cherry-pick, reset of another agent's work, push, or deployment was performed.

## Chapters and learning experience

| Block | Chapter and route | Principal interaction and mathematics |
|---|---|---|
| A | II.1 `chapters/vector-addition/` | Two independently draggable vectors, both head-to-tail orders, parallelogram, sum, endpoint difference, swap, opposites, and zero. Component derivation, translation invariance, commutativity and subtraction order. |
| A | II.2 `chapters/vector-scaling/` | Change the scalar and vector; compare original/scaled arrows, lengths and direction. Positive, negative and zero factors; derive `‖kv‖ = |k|‖v‖` and distributivity. |
| A | II.3 `chapters/vector-norms/` | Drag a vector and inspect its Euclidean unit direction beside the L₁ diamond, L₂ circle and L∞ square. Zero normalization is explicitly undefined; derive unit length and compare norms. |
| B | II.4 `chapters/vector-dot-product/` | Move either vector or apply a quarter-turn; inspect component products, dot-product sign, smaller angle, signed component, parallel part, and right-angle state. Derive the geometric identity with the cosine rule. |
| B | II.5 `chapters/vector-projection/` | Move direction/data independently; inspect exact coefficient, projected arrow, perpendicular residual, reconstruction and distance. Distinguish signed scalar projection; derive orthogonality and the closest-line property. |
| C | II.6 `chapters/vector-span/` | Vary both weights and directions. The coefficient square maps to the actual parallelogram/grid, collapses to a segment for dependent directions and to the origin for two zeros. Distinguish the bounded control region from unrestricted span. |
| C | II.7 `chapters/vector-basis/` | Move two basis vectors around a fixed target or move the target independently. Solve and reconstruct exact coordinates; distinguish unreachable/nonunique singular targets and show near-dependence sensitivity. Derive the two-coordinate elimination formulas. |

Each chapter starts with manipulation before the definitions and derivation. It includes an immutable worked calculation, further examples and exploration prompts, misconceptions, numerical considerations, computing/engineering/ML connections, summary checkpoints, and five graded exercises with corrective feedback and worked solutions. There are **14 lesson stages, 35 exercises, seven pedagogical Python sources, and seven practical NumPy sources**. The last chapter prepares the basis-image interpretation of matrices without implementing II.8 or the full determinant chapter.

## Models and infrastructure

`src/math/linear-algebra/vectors.ts` owns the seven domain families. It reuses the established BigInt rational and exact-root code. Entered decimals are interpreted exactly; public vector/coefficient constructors reject nonfinite values, excess decimal precision, and components outside ±1,000,000. The exploration controls have a smaller declared domain: vector/target components ±4 with at most two decimal places, coefficients ±2, pointer steps 0.5 and coefficient steps 0.25. Rejected numeric entry leaves the mathematical state intact.

Addition, scaling, component products, determinant, combination, projection coefficient/residual, and basis coordinates use exact rationals. Norms and distances retain exact radical expressions where supported. Exact readouts use `=`; numeric companions and angles use `≈`. Neither rounded strings nor a hidden epsilon determine orthogonality or singularity.

Zero vectors have no invented direction, normalization or angle. Projection requires a nonzero direction but permits zero data. Singular bases omit coordinate values and distinguish existence from uniqueness. Span rank and displayed reachable geometry come from the current vectors. Near dependence remains an independent basis when its exact determinant is nonzero; the separate relative separation warning does not change that decision.

The numeric companion normalizes by the maximum component before taking a bounded norm, preserving representable directions even at overflow/subnormal extremes. Cosine correction permits only eight epsilon units beyond ±1 and rejects nonfinite or substantially invalid computations. The bounded exact dot model uses `atan2(|cross|, dot)` to preserve small angles before binary64 cancellation. Numerical limitations and measurement uncertainty are taught explicitly.

`src/lessons/linear-algebra/` derives one scene/readout/formula/verdict object from canonical inputs. Rendering reuses `useLesson`, `IdScope`, `CoordinatePlane`, `DragPoint`, existing SVG primitives, `Inspector`, `ParameterInput`, `FormulaScroll`, `TraceStepper`, and the shared exercise island. Pointer announcements occur at gesture commit; keyboard, typed entry, presets, and reset use the same state. Worked traces support previous/next, scrub, opt-in play, speed and reset. A small chapter-scoped stylesheet wraps long exact pairs and preserves direction colours on handles; coincident handles retain keyboard and numeric access.

Existing shared changes are limited to the curriculum's seven publication entries and one effect timing fix in `src/ui/ParameterInput.tsx`. The resumed complete browser run exposed a tablet case where a deferred draft reset erased decimal text entered immediately after a keyboard move. Resetting the stale draft in a layout effect before paint prevents that race without changing the component API, parsing, error handling or commit rules. The keyboard/decimal-entry test that exposed the failure remains unchanged and is the regression check. The publication unit guard was extended accordingly. Navigation, contents, map, footer, total counts and roles continue to derive from the established curriculum contract. No new rendering engine, platform API, global stylesheet, dependency or test configuration was introduced.

## Independent mathematical evidence

`oracle/linear_algebra_oracle.py` generates **130 exact cases plus six numeric extreme cases**, deterministically seeded with 60107. Its expected dot products use polarization, determinant uses shoelace area, and basis coordinates use exact row elimination rather than the TypeScript Cramer quotients. Norms, normalization, cosine and signed projection use 160-digit Decimal calculations in local contexts. NumPy is not used to generate expected fixtures.

The fixture covers canonical, zero, collinear, perpendicular, opposite, fractional, near-dependent, randomly sampled decimal configurations, and overflow/underflow/subnormal numeric inputs. Literal hand-worked Python checks validate the oracle itself. All 14 displayed reference files are executed, with their assertions enabled and NumPy installed.

The TypeScript parity test compares exact rationals exactly. Numeric comparisons allow 16 epsilon units relative to the expected value, with a 10⁻¹⁵ absolute floor for angle/cosine comparisons and a subnormal representability floor. The observed worst relative error was **1.6816220103055728 epsilon units**. Display formatting is not used as the mathematical oracle.

The three new unit files contain **228 tests**: 13 domain/identity/boundary tests, 137 parity tests, and 78 lesson/formula/trace/exercise tests. Seven new content-contract cases raise the complete unit suite by 235 tests. Coverage includes translation invariance, associativity/distributivity, norm properties, symmetry, exact orthogonality/cancellation, projection reconstruction and direction-scale invariance, real rank/collapsed geometry, singular reachability, reconstruction, strict KaTeX sweeps, and exercise acceptance/rejection/missing input.

## Native validation

Linux milestone acceptance completed on 2026-10-11.

These are completed post-integration checks from the canonical working directory, using the final production source. Platform: Linux, Node 24.18.0, npm 11.16.0, Python 3 with NumPy 2.5.3, system Chrome 154.0.8037.92. Browser projects use 1440×900 desktop, 820×1180 tablet and 390×844 touch-emulated mobile. Mathematical and screenshot tolerances were not loosened. Each validation gate was executed separately; the aggregate `npm run validate` wrapper was not used because its default trace recording had consumed substantial disk space.

| Command / check | Outcome |
|---|---|
| `npm run check` | 328 files; **0 errors, 0 warnings**, four existing Part I unused-variable hints. |
| `npm test` | **54 files, 9,992 tests passed**. |
| `npm run test:oracle` | **266 tests passed**; all **11** standalone oracle fixture checks fresh, NumPy cross-check enabled. Includes six M6-A self-tests executing all 14 Python/NumPy examples. |
| Root and `/math-foundations/` production builds | **20 pages each**; strict MDX/KaTeX rendering succeeded. |
| `npm run check:dist` | Both mounts passed: **20 pages, seven stylesheets, 236 files each**. |
| Complete root browser suite, `--trace off` | **2,006 passed, 34 intentionally skipped, 0 failed** (2,040 scheduled; 17.4 minutes). |
| Complete subpath browser suite, `--trace off` | **1,979 passed, 19 intentionally skipped, 0 failed** (1,998 scheduled; 17.3 minutes). |
| Numeric-control race regression | **10 repetitions passed** of the unchanged tablet span keyboard/decimal/rejection/reset test after the fix. |
| Explicit Linux M6-A capture refresh | **21 tests passed**, producing 42 chapter captures, all individually reviewed. |
| Affected publication capture refresh | **4 passed, 2 intentionally skipped**; all four affected Linux contents/map captures individually reviewed. |
| Scope / preservation checks | Both commit histories retained; all 83 M6-A files preserved at consolidation, all 11 M5-P1 files match main. M6-A leaves Book I, protected Part I surfaces and Windows captures untouched; the shared numeric-control timing fix is documented above. |

The first complete resumed root run had **2,005 passed, 34 skipped and one failed**: the tablet span keyboard/decimal-entry test. Its saved state showed the fresh decimal draft replaced by the prior model value. The shared numeric-control timing fix is described above; ten repetitions of that unchanged test then passed, followed by complete root/subpath validation. The final runs include the strengthened M6-A formula, exact-readout and world-geometry assertions. The partial browser run stopped during the disk-space pause is not counted as final evidence. Skips are explicitly scoped by the existing viewport contracts: touch emulation runs on mobile, certain navigation elements only appear at wider widths, and selected original visual cases run on their designated viewports. Heavy checks were serialized with `flock /tmp/imf-heavy.lock`.

The pre-integration Python discovery run had 13 failures in the existing family oracle, also reproduced at the required starting commit. M5-P1 independently fixed the global Decimal-context interference in `2a81b54`; its correction is included unchanged. The combined suite now passes all 266 tests, so no Python integration failure remains.

## Browser and visual evidence

`tests/e2e/linear-algebra.spec.ts` adds 234 test cases across the three viewports (14 touch cases intentionally skip outside mobile). It checks each real route and chapter contract, independent world-to-screen arrow endpoints, exact inspector values, live formulas, mouse/keyboard/touch input, precise and rejected numeric entry, reset/commit announcements, both coefficients, both directions, the basis target, swap and quarter-turn, zero/singular states, trace navigation/play, and all 35 exercises. Four axe states per theme cover canonical, unusual, invalid-entry and feedback/solution states. The generic chapter suite independently checks each new page, headings, MathML, target sizes, reduced motion, and both-theme accessibility. Publication navigation is checked from I.9 to II.1 and from II.7 to the disabled planned II.8 destination.

`tests/e2e/visual-linear-algebra.spec.ts` captures two states for each chapter at all three sizes: **42 Linux baseline PNGs**. The exceptional states are opposite moves, scalar zero, zero normalization, perpendicular dot, zero projection direction, collinear span and singular basis. Existing screenshots are updated only where publication counts/statuses legitimately change. Windows captures remain untouched and require separate acceptance.

All **42 chapter captures and four affected publication captures were individually inspected** after explicit Linux refresh with `--update-snapshots=all`. This avoids retaining stale captures merely because a label change falls within the unchanged matcher tolerance. Review covered equal-aspect axes, label/handle separation, zero and singular geometry, exact/approximate readouts, controls, wrapping, local formula scrolling and page overflow at all three sizes. Capture generation alone was not treated as acceptance.

Review corrected labels crowded against arrowheads/input handles in addition, projection, span and basis. Coincident weighted-u labels are omitted when they duplicate u; actual arrows and values remain intact. The M6-A snapshot harness removes scroll padding used by the normal sticky header and explicitly aligns the stage before capture, so tall stages include their complete controls. Production global styles and existing Part I baselines were not changed. Twenty-four previously reviewed captures remained byte-identical through the later fixes; all changed captures were reviewed again.

Screenshot index (accepted Linux captures):

| Chapter | Desktop | Tablet | Mobile |
|---|---|---|---|
| II.1 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-addition.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-addition-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-addition.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-addition-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-addition.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-addition-exception.png) |
| II.2 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-scaling.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-scaling-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-scaling.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-scaling-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-scaling.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-scaling-exception.png) |
| II.3 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-norms.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-norms-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-norms.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-norms-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-norms.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-norms-exception.png) |
| II.4 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-dot.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-dot-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-dot.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-dot-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-dot.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-dot-exception.png) |
| II.5 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-projection.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-projection-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-projection.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-projection-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-projection.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-projection-exception.png) |
| II.6 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-span.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-span-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-span.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-span-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-span.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-span-exception.png) |
| II.7 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-basis.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-basis-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-basis.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-basis-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-basis.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-basis-exception.png) |

## Performance

`scripts/measure-linear-drag.mjs` measures real pointer moves on all seven production routes. It asserts hydrated geometry and at least 60 finite timing samples per chapter, saves [M6A_DRAG_MEASUREMENTS.json](M6A_DRAG_MEASUREMENTS.json), and cleans up its browser/server. Each chapter has 76 samples after five warm-up samples are discarded. This is the pointer event to the next animation-frame/message-channel paint opportunity, including scheduling; it is not a physical display scanout measurement.

| Chapter | p50 ms | p95 ms | Maximum ms | Samples over 16.7 ms |
|---|---:|---:|---:|---:|
| II.1 Addition | 6.4 | 7.7 | 8.9 | 0 |
| II.2 Scaling | 4.2 | 5.4 | 5.7 | 0 |
| II.3 Norms | 7.7 | 9.2 | 13.6 | 0 |
| II.4 Dot | 3.6 | 7.3 | 9.2 | 0 |
| II.5 Projection | 5.3 | 8.0 | 11.0 | 0 |
| II.6 Span | 4.3 | 5.9 | 6.5 | 0 |
| II.7 Basis | 7.5 | 10.4 | 11.5 | 0 |

The final-source experiment on 2026-10-11 used a 12th Gen Intel Core i5-12600 at 1× CPU, Chrome 154.0.8037.92, desktop size, half-unit snapping and 80 moves per chapter. These observations do not establish mobile-device or throttled performance. The `_astro` files total about 3.11 MiB of content (about 3.6 MiB allocated on disk); no new libraries were added. Existing formula rendering and `client:load` hydration contracts are reused.

## Limits and remaining review

- The interactive stages intentionally explore two-dimensional vectors and bounded decimal inputs. Their control domains do not restrict the real-number definitions. The shaded span region is a bounded coefficient image, not the full span.
- Near-singular basis coordinates can be very large. Fitting the actual weighted arrows preserves their relative geometry but crowds the target and input handles near the origin; numeric entry, keyboard and reset remain available. Exact decimal reconstruction cannot repair measurement errors.
- Cosines/angles, screen coordinates and normalized-arrow geometry are numerical companions to exact algebra. The unit circle is sampled into 64 segments. The sensitivity threshold is a teaching cue, not a universal rank tolerance.
- Real Windows rendering, physical assistive technology, physical touch hardware and CPU-throttled M6-A performance were not checked. Windows needs 42 new chapter captures and refreshed affected count/status captures in its own acceptance pass.
- M5-P1 is integrated unchanged. All required Linux validation has been rerun on the combined branch, including root/subpath production mounts. Independent milestone review and Windows acceptance remain; no additional M5-P1 source integration is required.
- Do not begin II.8–II.19 until independent M6-A review. The milestone provides their geometric prerequisites; it does not certify Part II completion.

## Commit history and reproduction

Progress was committed by domain foundation, then blocks A, B and C:

- `0e50bfd`: exact vector models, lesson stages, independent fixture/oracle and focused tests.
- `b2d8a0c`: II.1–II.3 prose, code and exercises.
- `e9b1256`: II.4–II.5 prose, code and exercises.
- `ba7a01d`: II.6–II.7, publication and curriculum guard.
- `5b1d9c2`: checkpoint of layout refinements, browser tests, provisional captures, performance evidence and the initial checkpoint report before the disk-space pause.
- `57c5d8f`: merge M5-P1 into the M6-A history in the canonical directory at the user's request.
- `7387fb0`: preserve the consolidation and pause record before validation resumed.

The final acceptance commit contains the label refinements, numeric-control timing correction, complete Linux captures, final performance measurements and this report. Its full hash and clean Git status are reported in the delivery response; `main` remains at the M5-P1 commit.

Reproduce from `/work/interactive-books/Interactive-Mathematical-Foundations-Book` using its existing dependencies. Run these commands sequentially; keep tracing disabled for browser validation to limit transient disk usage:

```sh
flock /tmp/imf-heavy.lock npm run check
flock /tmp/imf-heavy.lock npm test
flock /tmp/imf-heavy.lock npm run test:oracle
flock /tmp/imf-heavy.lock npm run build
flock /tmp/imf-heavy.lock npm run build:subpath
flock /tmp/imf-heavy.lock npm run check:dist
flock /tmp/imf-heavy.lock env BOOK_TEST_PORT=4471 npx playwright test --trace off
flock /tmp/imf-heavy.lock env BOOK_TEST_PORT=4472 npx playwright test --config playwright.subpath.config.ts --trace off
flock /tmp/imf-heavy.lock env BOOK_TEST_PORT=4473 node scripts/measure-linear-drag.mjs
```

The feature branch has not been pushed, deployed or merged into `main`. Work stops at M6-A for independent review; II.8–II.19 remain planned.
