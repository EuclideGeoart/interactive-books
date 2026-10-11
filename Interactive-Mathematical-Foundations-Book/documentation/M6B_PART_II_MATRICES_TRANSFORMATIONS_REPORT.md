# M6-B — Matrices, transformations, and linear constraints

M6-B implements and publishes II.8–II.13 on `feature/book-ii-m6b`, starting from the required accepted M6-A commit `e6fca3772b35b7f27654d42cc85c102d1cb08196`. Part I retains nine available chapters and Part II now has 13 available with six planned. The curriculum has **22 available chapters out of 97, with 75 planned**. I.3 remains the reference chapter and VI.4 the flagship. II.14–II.19 remain planned; Gaussian elimination was not implemented.

The milestone adds six chapters, one exact small-matrix domain, a shared matrix lesson family, 30 exercises, 12 executable Python references, an independent oracle fixture, dedicated browser coverage, and 36 reviewed Linux captures. No dependency, generic tensor library, computer algebra system, universal numerical solver, Windows baseline, or speculative 3D engine was added.

## Chapters and learning experience

| Chapter and route | Principal interaction and mathematics |
|---|---|
| II.8 `chapters/matrix-transformations/` | Drag the two basis images and an input vector while the full grid, unit square, output and formulas move from the same state. Presets cover rotation, reflection, shear, scaling, singular collapse, orientation, and the distinction between linear `Ax` and affine `Ax+b`. |
| II.9 `chapters/matrix-vector/` | Read one exact product as row dot-products and as a weighted column combination. Square, wide, tall and incompatible shapes make input/output dimensions explicit. |
| II.10 `chapters/matrix-composition/` | Apply A and then B with the middle vector visible, derive BA, reverse the order to expose noncommutativity, validate rectangular shapes, and bridge to `B(Ax+b)+c=(BA)x+(Bb+c)`. |
| II.11 `chapters/matrix-transpose-orthogonality/` | Transpose rows into columns, inspect `QᵀQ`, and compare a rotation, reflection, shear, and singular map. Length/angle preservation and the special inverse identity `Q⁻¹=Qᵀ` remain distinct from a general inverse algorithm. |
| II.12 `chapters/matrix-determinant/` | Transform a unit square and inspect exact signed area. Positive, negative and zero determinants distinguish orientation preservation, reversal and collapse; higher-dimensional volume scaling is introduced without a 3D engine. |
| II.13 `chapters/linear-systems/` | Edit two exact constraints and classify their geometry as one, no, or infinitely many solutions. Vertical, parallel, coincident and degenerate zero-row systems connect directly to `Ax=b` and stop before II.14 elimination. |

Every chapter leads with a manipulable stage, then includes definitions, mechanics/derivation, an immutable worked trace, executable pedagogical Python and NumPy, exploration prompts, misconceptions, numerical considerations, engineering/ML connections, five graded exercises, and summary checkpoints. The six pages contain 12 stage instances and 30 uniquely named exercises with corrective feedback and worked solutions.

## Exact models and shared lesson architecture

`src/math/linear-algebra/matrices.ts` extends the accepted rational domain with validated 1–4 dimensional matrices and vectors. Public constructors accept finite values with at most two decimal places and magnitude at most 1,000,000, reject empty/ragged/oversized inputs, and convert accepted decimals to exact BigInt rationals.

The domain implements exact shape, column access, addition, scaling, matrix-vector action, matrix multiplication, transpose, identity, 2×2 determinant, orthogonality, affine action, and 2×2 system classification. Incompatible products return explicit shape failures. Determinant zero, orthogonality and system class are exact decisions; plotting doubles and formatted strings never redefine rank, singularity or equality.

`src/lessons/linear-algebra/matrix-lesson.ts` is the single derivation boundary for canonical state, presets, fields, inspector rows, formulas, accessible descriptions, scene geometry and worked frames. `MatrixStage.tsx` and `MatrixWorkedStage.tsx` reuse the existing lesson hook, coordinate plane, exact parameter input, inspector, formula scroll, trace and scoped-ID contracts. Pointer drags freeze the active world window for the gesture, so pointer and keyboard input land on the same exact half-unit state even when a scene refits.

The lesson family handles three presentation modes without inventing mathematics:

- A 2D geometric scene when the current state has meaningful planar geometry.
- An exact shape/formula board for rectangular or incompatible products.
- Exact coefficient fields and constraint lines for systems; II.13 intentionally has no draggable handle.

Existing shared changes are narrow: six curriculum entries, the Part II reading-order expectation, M6-B visual cases, and `test.slow()` on the already-heavy generic chapter axe test so its 30-second worker timeout does not misclassify valid 20–32 second mobile checks under a complete run. No assertion, screenshot tolerance, failure capture, or accessibility rule was removed or weakened.

## Independent mathematical evidence

`oracle/matrices_oracle.py` deterministically generates **36 matrix cases and eight system cases** with seed 61313. Expected values are independent of the TypeScript implementation:

- matrix-vector and matrix-matrix products use explicit row/column pairing;
- determinants use the signed shoelace area of the transformed unit square;
- systems use exact Fraction row elimination rather than the browser model's Cramer numerators.

The fixture stores every scalar as an exact Fraction string. Cases include square, wide, tall, incompatible, rotation, reflection, singular, affine, unique, parallel, coincident, vertical and contradictory/redundant zero-row states. Fixture freshness is checked without regeneration during acceptance.

The 12 displayed Python files—one pedagogical implementation and one NumPy companion per chapter—run with their assertions enabled. The four new unit files contribute **99 tests**: nine trust-boundary/identity tests, 44 fixture parity cases, 44 lesson/formula/geometry/worked-trace cases, and two exercise-registry tests. The complete unit suite now contains 10,091 tests.

## Incremental validation record

Heavy builds and browser runs were serialized with `/tmp/imf-heavy.lock`. Final browser invocations and focused corrective reruns used the Playwright CLI `--trace off`; screenshot-on-failure and the established visual tolerance remained enabled. No duplicate dependency tree or temporary full checkout was created.

### Focused validation

- Changed matrix model, fixture parity, lesson derivation and exercise tests passed before integration. The final complete unit gate independently includes all 99 new tests.
- The matrix oracle fixture reported **36 matrix cases + eight exact systems fresh**; all 12 Python/NumPy references executed in the complete oracle gate.
- Dedicated M6-B browser checks exercised exact input, pointer/keyboard/touch equivalence, reset/announcements, rectangular and rejected states, all 30 exercises, worked traces, and four axe states per theme.
- The M6-B visual comparison passed **18 tests**, covering opening and exceptional states for six chapters at desktop, tablet and mobile and comparing **36 PNGs**.
- A mobile II.10 equation that became a 19 px unfocusable scroller after feedback was split into aligned rows. The focused mobile light/dark axe regression passed **2/2**.
- The first subpath acceptance run exposed the analogous II.9 derivation at mobile light. An unchanged focused run reproduced light failure while dark passed; after splitting the derivation into three aligned rows, focused subpath and root mobile light/dark regressions each passed **2/2**.

### Narrow cross-chapter regression validation

- Two existing desktop I.9 accessibility checks that timed out only under the first complete root run passed in isolation without a product change.
- One existing mobile I.4 accessibility check later exceeded the generic 30-second timeout while its assertions were still progressing. After marking the already-heavy per-chapter axe test slow, the focused grep covering I.4 and II.4 passed **4/4**.
- Final root/subpath production builds and deployment verification were refreshed after the II.9 line wrap. The output checker again found 26 pages, seven stylesheets and 248 files at both mounts.

### Final complete acceptance

Linux milestone acceptance completed on 2026-10-11. Platform: Node 24.18.0, npm 11.16.0, Python 3 with NumPy, and system Chrome 154.0.8037.92. Browser projects use 1440×900 desktop, 820×1180 tablet and 390×844 touch-emulated mobile.

| Gate | Outcome |
|---|---|
| `npm run check` | **339 files; 0 errors, 0 warnings**, four existing Part I hints. |
| `npm test` | **58 files, 10,091 tests passed**. |
| `npm run test:oracle` | **270 tests passed**; matrix fixture fresh, NumPy enabled, all 12 new references executed. |
| Root production build | **26 pages built**. |
| `/math-foundations/` production build | **26 pages built**. |
| Final `npm run check:dist` | Root and subpath each: **26 pages, seven stylesheets, 248 files checked — OK**. |
| Complete root browser suite, `--trace off` | **2,314 passed, 50 intentionally skipped, 0 failed** in 34.2 minutes. |
| Complete subpath browser suite on the corrected final source, `--trace off` | **2,287 passed, 35 intentionally skipped, 0 failed** in 21.8 minutes. |
| Explicit M6-B visual comparison | **18 passed**, comparing 36 accepted Linux PNGs. |

The first complete root run found two pre-existing slow I.9 axe cases and the real II.10 mobile overflow. Focused regressions separated timing from product behavior before the root gate was repeated. A later root run then exposed the I.4 timeout ceiling; the focused cross-chapter check passed before the final root run above.

The first complete subpath run had **2,286 passed, 35 skipped and one failed** at II.9 mobile light. The issue reproduced in a focused run, was fixed in chapter content, and passed focused checks in both mounts before the affected complete subpath gate was repeated. The already-successful complete root gate was not repeated after this isolated MDX line-wrap correction; instead the root build was refreshed and the affected root II.9 mobile light/dark checks passed 2/2, following the milestone's incremental-validation addendum.

## Browser and visual evidence

M6-B adds **324 browser cases** to each deployment matrix: 144 generic chapter-contract cases, 162 dedicated matrix-family cases, and 18 visual cases. Generic checks cover metadata, structure, hydration, duplicate IDs, page overflow, MathML, reading order, target sizes, reduced motion and both-theme accessibility. Dedicated checks independently compare screen geometry with exact model outputs and exercise real mouse, keyboard and touch input.

All 36 new Linux captures were regenerated selectively and inspected individually after the final visual refinements. Review covered equal-aspect axes, complete controls, label/arrow separation, transformed grids, middle composition geometry, signed-area orientation, singular collapse, vertical/coincident/parallel constraints, exact readouts, wrapping and local scrolling. Windows captures were not touched.

| Chapter | Desktop | Tablet | Mobile |
|---|---|---|---|
| II.8 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-transform.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-transform-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-transform.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-transform-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-transform.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-transform-exception.png) |
| II.9 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-matvec.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-matvec-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-matvec.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-matvec-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-matvec.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-matvec-exception.png) |
| II.10 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-composition.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-composition-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-composition.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-composition-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-composition.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-composition-exception.png) |
| II.11 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-orthogonality.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-orthogonality-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-orthogonality.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-orthogonality-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-orthogonality.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-orthogonality-exception.png) |
| II.12 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-determinant.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-determinant-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-determinant.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-determinant-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-determinant.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-determinant-exception.png) |
| II.13 | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-systems.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/desktop-ii-matrix-systems-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-systems.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/tablet-ii-matrix-systems-exception.png) | [opening](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-systems.png) · [exception](../tests/e2e/__screenshots__/visual-linear-algebra.spec.ts/mobile-ii-matrix-systems-exception.png) |

## Performance and disk

`scripts/measure-linear-drag.mjs` measures real pointer moves on the five M6-B routes with draggable geometry. It discards five warm-up samples, asserts at least 60 finite samples, and records 76 samples per route in [M6B_DRAG_MEASUREMENTS.json](M6B_DRAG_MEASUREMENTS.json). The metric includes pointer event handling through the next animation-frame/message-channel opportunity; it is not physical display scanout.

| Chapter | p50 ms | p95 ms | Maximum ms | Samples over 16.7 ms |
|---|---:|---:|---:|---:|
| II.8 Transformations | 3.6 | 4.3 | 4.5 | 0 |
| II.9 Matrix × vector | 5.1 | 6.2 | 7.3 | 0 |
| II.10 Composition | 3.9 | 6.8 | 7.3 | 0 |
| II.11 Orthogonality | 5.7 | 7.7 | 8.4 | 0 |
| II.12 Determinant | 3.0 | 4.3 | 5.3 | 0 |

The experiment used Chrome 154.0.8037.92 on a 12th Gen Intel Core i5-12600 at 1× CPU, desktop size, 80 real pointer moves and the production root build. II.13 uses exact coefficient fields and is intentionally absent from a drag benchmark.

Repository usage measured with `du -sh .` increased from **399M to 406M** (+7M). Final root and subpath outputs are about 11M each, the HTML report is 3.5M, and failure-output residue is 8K. Existing `node_modules` and `.venv` were reused; no duplicate checkout or dependency tree was created.

## Limits and remaining review

- The exact public domain is intentionally small: 1–4 dimensional matrices, 2×2 geometric determinant/orthogonality and 2×2 system classification. It is not a tensor library or a general elimination engine.
- Higher-dimensional determinant volume scaling is explanatory only. There is no speculative 3D interaction.
- Screen geometry and performance timing are numerical companions to exact algebra. The benchmark is synthetic desktop Chrome, not a physical touch-device or throttled-device measurement.
- Real Windows rendering, Windows baselines, physical assistive technology and physical touch hardware were not checked.
- Independent milestone review remains. Do not begin II.14–II.19 from this delivery; the branch intentionally stops after II.13.

## Commits and final state

- `4566581` — exact matrix domain, independent fixture/oracle, 12 Python references and focused tests.
- `603ba03` — six published chapters, shared lesson UI, curriculum, browser coverage, accepted Linux captures and benchmark runner.
- The final documentation commit contains this report and the benchmark JSON.

The feature branch is not pushed, deployed or merged into `main`. After the documentation commit, `git status --short --branch` is expected to show a clean `feature/book-ii-m6b`; delivery verifies that state. Work stops at M6-B for independent architectural and mathematical acceptance.
