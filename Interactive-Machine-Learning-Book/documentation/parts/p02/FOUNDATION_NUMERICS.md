# III-07 foundation numerics

Numerical implementation, interactive stage and complete prose for the same foundation reference chapter only. Parent integration independently owns acceptance and freeze; Part II must exclude III-07 from future ownership until that freeze. No other Part implementation is included here.

## Model API and one numerical state

`src/parts/p02/model/linear-regression.ts` exports:

- `Sample`: `{ readonly id: string; readonly x: number; readonly y: number }`.
- `RegressionState`: `{ readonly samples: readonly Sample[]; readonly weight: number; readonly bias: number; readonly learningRate: number }`.
- `CANONICAL_REGRESSION`: deeply frozen initial state, with weight `0.5`, bias `0`, learning rate `0.1` and the five samples below.
- `predictRegression(x, weight, bias)`: the shared validated affine predictor used by model rows and lesson line endpoints. Invalid inputs or overflowing products/sums throw `RangeError`.
- `deriveRegression(state)`: fresh `rows` containing `{ id, x, y, prediction, residual, squaredError }`, scalar `mse`, `gradients: { weight, bias }`, prospective parameters `next: { weight, bias }`, and `shapes: { X: [n, 1], weights: [1, 1], targets: [n, 1] }`.
- `regressionStep(state)`: a new full state retaining samples and learning rate, with both parameters updated simultaneously from the same gradient. The proposed state must itself be derivable before the step returns.
- `regressionTrace(state, steps)`: `readonly TraceFrame<RegressionState>[]` through shared `src/platform/trace.ts`. Frame zero is the initial state; each subsequent frame is one accepted update. `steps` is an integer in `[0, 20]`; zero updates still validates and snapshots the initial state.

The UI can derive every equation, row, inspector number and accessible description from the currently selected state. Replay selects a historical snapshot; it does not reverse mutations. Each frame's derived `next` previews another update; it does not mean the frame has already applied that update.

## Foundation rendering contract

`src/parts/p02/RegressionStage.tsx` requires a stable `scope: string` prop. The reference chapter uses `<RegressionStage scope="iii07-reference" client:load />`. Every reuse, including a Part I preview, must supply a distinct scope within its page. The stage wraps its inner component in the parent-provided `IdScope`; `useScopedId` supplies the prefix for SVG title, description, clipping and help IDs. A fixed shared scope would collide across Astro islands, so there is no default scope.

`src/parts/p02/linear-regression-lesson.ts` is the pure numerical-to-view adapter. `deriveRegressionLesson(state, renderedWidth)` supplies all plot geometry, row/scalar text, shapes, formulas, provenance and spoken results from one numerical derivation. `editRegressionSample`, `moveRegressionSample` and `regressionPointer` produce input edits without mutating existing states. `RegressionStage` renders that output and owns only selection, replay cursor, DOM measurement, rejection and announcement UI state. It computes no predictor, loss, gradient or drawing coordinates.

The supported interactive domain is weight/bias `[−4, 4]`, sample x/y `[−5, 5]`, learning rate `[0.001, 1]`. These UI bounds do not narrow the general numerical model API. Numeric entry and unsupported updates are rejected visibly, preserving the previous valid state. Pointer movement snaps to 0.1 and stops at the sample-coordinate boundary; arrow movement adds 0.1, or 0.5 with Shift, to existing coordinates with only natural binary64 rounding. Keyboard movement does not quantize existing fine precision. The sample picker and numeric fields remain available when observations overlap.

The SVG has `viewBox="0 0 640 640"` and a square physical viewport. Its mathematical domain is `[−6, 6]` on each axis, with origin `(320, 320)` and one scale, 44 viewBox units per mathematical unit:

```text
cx = 320 + 44 x
cy = 320 − 44 y
plot clip rectangle = (56, 56, 528, 528)
```

Line endpoints come from `predictRegression`, with geometric clipping to the displayed plane. Each prediction marker's y coordinate projects the exact derived prediction; off-plane markers/segments are clipped but numerical values remain in the table. Observation circles, prediction diamonds, dashed residual segments, labels and signed values convey meaning without color. Hit radii are `max(11, 23 × 640 / renderedWidth)`, measured with `ResizeObserver`, ensuring at least 46 CSS pixels of diameter (above the required 44) at 390px and other viewport widths. Pointer conversion accounts for square-viewport scaling and possible letterboxing. Only handles have `touch-action: none`; no stage animation or autoplay is introduced.

Axes and ticks use `--muted`, whose calculated sRGB contrast against `--surface` is 5.80:1 in light mode (`#59666a` / `#fffcf5`) and 8.49:1 in dark mode (`#bac8c9` / `#1c2b2f`). Plot lines, paths and circles, including focus handles, use `vector-effect: non-scaling-stroke` so SVG resizing preserves physical stroke widths.

Replay captures the displayed state plus three updates with the shared immutable trace. Seeking sets the single lesson state to the selected frame; all controls, plot, table, formulas and inspector follow it. Editing begins with that frame and clears replay; entering an unchanged value does not discard history. Programmatic frame selection/reset remounts numeric drafts so rejected or unfinished input cannot survive into another frame. Reset returns canonical observations and parameters.

The polite atomic live region announces committed numeric edits, keyboard edits, updates, frame selection/reset, and drag completion. Pointer moves update geometry silently; drag end speaks the last accepted derived result, including selected sample coordinates, parameters and MSE. Rejections remain alerts. Speech, accessible names and formulas use the same derived data. Given x/y coordinates use full round-trip `String(number)` text in table rows, names and speech; computed values remain explicitly approximate. Formulas distinguish exact symbolic identities from approximate rounded substitutions; a strict KaTeX precision test preserves state weight `0.1234567` while displaying `w ≈ 0.1235`. Precision tests additionally use sample x `0.123456789123` and y beyond four decimal places, including keyboard additions without hidden rounding.

DOM inspection hooks:

| Hook | Meaning |
| --- | --- |
| `[data-regression]` with `data-weight`, `data-bias`, `data-learning-rate`, `data-mse`, `data-frame-index`, `data-updates` | Exact active numerical parameters/loss and current replay/update identity. |
| `svg[data-plane]` with `viewBox`, `data-origin`, `data-scale`, `data-domain-min`, `data-domain-max` | Documented equal-axis projection. |
| `[data-sample-id]` with `data-x`, `data-y`, actual `cx`, `cy`, `r`, accessible button name | Observation identity, exact mathematical data and projected hit geometry. |
| `[data-prediction-line]` with `data-x1`, `data-y1`, `data-x2`, `data-y2` and SVG endpoints | Shared-predictor line endpoints in both coordinate spaces. |
| `[data-row-id]` with `data-x`, `data-y`, `data-prediction`, `data-residual`, `data-squared-error` | Exact active row values alongside visible approximate calculations. |
| `[data-value]` values `mse`, `gradient-weight`, `gradient-bias`, `next-weight`, `next-bias`; `data-number` | Exact scalar values alongside visible approximate text. |
| `[data-provenance]`, `[data-current-frame]`, `[data-announcement]`, `[data-rejection]` | Provenance, frame/update label, committed-result announcement and visible rejection reason. |

`src/parts/p02/chapters/linear-regression.mdx` places the stage before prose, contains the full derivation, hand-worked before/after, shapes, toy-data provenance, counterexamples, numerical limits and six graded `ChoiceExercise` questions with misconception feedback. Its raw Python import is exactly `../../../../code/python/p02/linear_regression.py?raw`, resolved from the chapter directory. Prerequisites are frozen Book II IDs `II.9` (matrix × vector), `III.6` (chain rule), `III.7` (partial derivatives) and `III.8` (gradients). Part manifest changes and discovery ownership remain with the parent.

## Dataset and provenance

This is an explicit hand-authored toy dataset. It is not measured, downloaded, a benchmark or a claim about a real population. Stable sample IDs identify rows even when their order changes. The final target intentionally departs from the otherwise exact line `y = 2x + 1`.

| ID | x | target y |
| --- | ---: | ---: |
| s1 | -2 | -3 |
| s2 | -1 | -1 |
| s3 | 0 | 1 |
| s4 | 1 | 3 |
| s5 | 2 | 4 |

All additional golden cases are also explicitly hand-authored toy inputs. The seeded comparison cases in the self-tests are synthetic and deterministic, with seed `20261013`.

## Column convention, objective and gradient

Mathematical vectors are columns. A batch stores samples in rows of `X`, so the scalar-feature design has shape `n × 1`, the weight matrix has shape `1 × 1`, and targets, predictions and residuals have shape `n × 1`. The scalar bias broadcasts down the prediction column; there is no extra intercept column in `X`.

For sample `i`, `prediction_i = weight × x_i + bias` and `residual_i = prediction_i − y_i`. Positive residuals mean overprediction. The training objective is mean squared error:

```text
MSE = (1/n) Σ residual_i²
dw  = (2/n) Σ residual_i x_i
db  = (2/n) Σ residual_i
next.weight = weight − learningRate × dw
next.bias   = bias   − learningRate × db
```

There is no one-half factor, sum-only loss, RMSE or R² substitution. The parameter gradient is the mathematical column `(dw, db)ᵀ`; the API names its two entries explicitly.

The canonical predictions are `[-1, -0.5, 0, 0.5, 1]`, signed residuals `[2, 0.5, -1, -2.5, -3]`, and squared errors `[4, 0.25, 1, 6.25, 9]`. Their sum is `20.5`, hence MSE `4.1`. The weighted residual sum is `−13`, the residual sum is `−4`, and gradients are `dw = −5.2`, `db = −1.6`. The simultaneous update gives weight `1.02` and bias `0.16`. Its squared errors are `[1.2544, 0.0196, 0.7056, 3.3124, 3.24]`, yielding MSE `1.7064` and gradients `−3.12`, `−1.28`.

## Validation and numerical policy

States require 1–64 samples; IDs must be nonempty strings (whitespace-only IDs are invalid) and exactly unique. Parameters, sample coordinates and targets must be finite numbers. The learning rate is finite and strictly greater than zero, at most one. Invalid inputs and non-finite intermediate/output arithmetic raise an informative TypeScript `RangeError` or Python `ValueError`.

Prediction products, predictions, residuals, squares, reductions, gradients and prospective parameters must remain finite. Direct binary64 summation is intentional: an overflowing sum is rejected even if dividing an exact sum by `n` could produce a representable mean. No clipping, replacement with zero, rescaling or partial trace is returned on overflow. A step also rejects an updated state whose derived quantities overflow. Underflow and ordinary binary64 rounding remain finite; a positive subnormal learning rate is valid even when its update rounds to zero. Dedicated tests verify a representable subnormal MSE remains positive.

Constant-x data and one sample remain valid predictor data. No unique optimum is claimed: multiple weight/bias pairs can give the same predictions. An exact perfect fit has zero loss and gradients and remains unchanged. The allowed rate range is an input bound, not a convergence guarantee; the finite-divergence golden case increases loss from `1` to `81` in one update. Closed-form fitting, multivariate predictors and classification are outside this foundation scope.

TypeScript and NumPy use binary64. Numeric parity requires
`|actual − expected| ≤ 1e−12 + 1e−12 × |expected|`.
IDs, field names, row order, shapes, step counts and frame indices must match exactly. This tolerance is for verification; state values are never rounded to display precision. Very small values additionally have explicit scale-sensitive tests because an absolute tolerance alone would admit zero.

## Mutation and oracle independence

Model functions never mutate their arguments. Derived rows are new objects. A TypeScript step creates a new state and may share its unchanged readonly samples with its input; it does not freeze or mutate caller-owned data. Canonical TypeScript data is deeply frozen. `regressionTrace` uses `traceFrom` to create detached, deeply frozen frames, states, arrays and sample objects, so caller changes and replay cannot alter history.

Python steps and traces deep-copy samples; frames are detached dictionaries suitable for JSON, rather than runtime-frozen Python objects. Editing one returned Python frame cannot change its input or other frames.

`code/python/p02/linear_regression.py` is the runnable canonical NumPy reference. It constructs explicit column arrays, computes predictions with `X @ weights + bias`, then residual MSE and analytical gradients from scratch. It uses no fitting library, autodiff or solver. Direct execution prints canonical before/after derivations and an initial-plus-three-updates trace.

`oracle/p02/linear_regression_oracle.py` imports neither NumPy nor the reference. It independently expands the loss using exact rational data moments:

```text
Sx = Σx; Sy = Σy; Sxx = Σx²; Sxy = Σxy; Syy = Σy²
MSE = (w² Sxx + 2wb Sx + n b² − 2w Sxy − 2b Sy + Syy) / n
dw = 2(w Sxx + b Sx − Sxy) / n
db = 2(w Sx + n b − Sy) / n
```

Input decimals become `Fraction(str(value))`; subsequent oracle recurrence stays exact and converts to floats only for comparison. This checks the intended decimal mathematics, rather than claiming to reproduce every binary64 rounding step. Standalone literal assertions confirm the full canonical rows, gradients, first update and following loss (`2133/1250 = 1.7064`). Self-tests also verify the asymmetric literal gradient by exact rational differences and NumPy central finite differences.

## Fixtures and focused verification

`fixtures/p02/linear-regression.fixtures.json` contains seven cases: canonical, asymmetric, one sample, constant x, perfect fit, finite divergence and small scale. Each includes input state, update count, full before/after derivations, and initial-plus-update trace frames carrying actual full states.

`oracle/p02/generate_fixtures.py` checks every generated NumPy before/after/trace against the independent rational oracle before serializing. JSON uses UTF-8, stable ordering, indentation, a final newline and no non-finite values; there is no timestamp or random fixture generation. `--write` writes the repository fixture; `--check` compares bytes and exits 1 for a missing or stale file without rewriting it. Tests exercise both failure paths and successful regeneration. Files are ready for the integrator's commit; this agent creates no commit.

`oracle/p02/manifest.json` registers direct self-tests `linear_regression_oracle.py` and `test_linear_regression.py`, plus golden check `generate_fixtures.py`. All entries are relative Python basenames.

Focused commands run from `Interactive-Machine-Learning-Book` using the parent's read-only dependency overlay (Python resolves to `/work/interactive-books/Interactive-Mathematical-Foundations-Book/.venv/bin/python`; NumPy `2.5.3`):

| Exact command | Result, 2026-10-13 |
| --- | --- |
| `.venv/bin/python -B oracle/p02/generate_fixtures.py --write` | Exit 0; generated seven independently checked cases. |
| `.venv/bin/python -B oracle/p02/linear_regression_oracle.py` | Exit 0; independent rational literals passed. |
| `.venv/bin/python -B oracle/p02/test_linear_regression.py -v` | Exit 0; 15 tests passed, including 40 seeded NumPy/oracle comparisons and canonical Python subprocess execution. |
| `.venv/bin/python -B oracle/p02/generate_fixtures.py --check` | Exit 0; fixture fresh. |
| `node node_modules/vitest/vitest.mjs run tests/unit/p02 --maxWorkers=1` | Exit 0; 40 tests passed in two files, including nine pure lesson/predictor/strict-formula/coordinate-precision tests. |

The TypeScript tests cover independent-checked golden parity, hand-worked gradients and finite differences, invalid/duplicate/empty/constant/one-sample/perfect-fit data, the sample/rate/trace bounds, staged arithmetic overflow, large and subnormal numerical boundaries, pure steps and detached deeply frozen history. Pure lesson tests additionally cover the authoritative predictor, equal-scale projection, responsive target sizes, endpoint clipping, pointer conversion, immutable decimal keyboard edits, unsupported UI bounds and strict formula precision. Python tests additionally execute the canonical script and compare NumPy directly against the independent oracle.

`tests/e2e/p02/reference.spec.ts` authors eight focused browser cases: canonical mathematical/physical geometry in both themes, numeric precision/rejection/reset and announcements, keyboard/pointer parity and silent dragging, every replay frame and selected-frame edits, unsupported updates, reduced motion/local touch capture, plus prerequisites/Python/grading. These recompute expectations independently from real DOM observations and also check canonical replay against literal toy inputs. Navigation is relative to the configured base, so the same file targets root and subpath production. These browser cases have not been executed by this agent.

No package/config/shared/shell/manifest changes, dependency installation, commit/push/merge/deploy, heavy build, browser checks, full type check or full oracle sweep were performed. Visual/type/browser and independent acceptance remain with the parent; III-07 is not declared frozen.

Handoff record, 2026-10-13: the parent reported a passing full type check and all 53 current unit tests after architecture fixes, before the CSS contrast/stroke and subsequent coordinate-precision corrections. After the CSS correction, the agent reran the four focused check commands above: 39 TypeScript tests, 15 Python tests, independent rational literals and fixture freshness all passed with exit 0. After the coordinate-precision correction, 40 focused TypeScript tests and fixture freshness passed with exit 0. The latter changes affect only the lesson adapter, its unit/E2E tests, reference prose and this verification record. Source edits are complete for parent production/browser validation; no acceptance or freeze is claimed here.
