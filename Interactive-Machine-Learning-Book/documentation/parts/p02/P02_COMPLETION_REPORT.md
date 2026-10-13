# P02 III-08–16 source handoff

2026-10-13 · Agent 2 · status **CORRECTION REQUIRED pending post-fix runtime and visual verification**. Publication acceptance and freeze remain the independent integrator's decision. All nine assigned chapters are authored and committed. The integrator focused rerun at `2cff99bd` passed all nine gates, but independent DPR1 captures exposed an overflowing III-10 fieldset and overlapping III-09 point labels. Part-owned layout, marker/legend and physical-viewport test corrections are committed for another independent rerun; no post-fix browser or visual pass is claimed.

## Integrator focused result and collection correction

The integration owner ran `npm run validate:focused -- --part p02` under the shared Linux flock. Manifest `validation-results/focused-2026-10-13T15-32-52-016Z/manifest.json` records seven passing gates with unchanged validation input signature `abbbe8a63d9361bc875db01ce37486e806b9909ca82834c4ed48054961688eb8`: type/content (56 files, zero errors/warnings/hints), 128 unit tests in nine files, five oracle commands, root and subpath production (22 pages each), and both production audits. These are integrator results for the pre-correction source, not author heavy runs.

Root browser validation failed at module collection with **zero browser cases executed**: Node 24/Playwright ESM required `type: json` for the remainder fixture import. The ninth gate (subpath browser validation) was not reached. The failed raw log `artifacts/integrator-browser-collection-failure.log` and failed manifest are preserved unchanged.

Correction: only `tests/e2e/p02/remainder.spec.ts` adds `with { type: 'json' }` to its fixture import. This report records the failure/correction; all mathematical source, fixtures, reference files and shared files remain untouched. A small native Node JSON-import smoke check passed; Playwright collection/browser execution and the complete focused rerun remain with the integrator. The correction commit SHA is returned in the accompanying handoff. No author heavy job was started.

## Recurring unit integration correction

Independent reviewer Avicenna identified a P1 integration blocker in `tests/unit/p02/remainder-lessons.test.ts`: the recurring test compared the entire repository Git diff and untracked files against `8157b7af`, then required every path to be p02-owned. An authorized P01 merge or integrator acceptance-document change would incorrectly fail a combined milestone. One-time exact branch-diff ownership verification belongs to the integrator handoff check, which already verified the 29 owned paths.

The correction removes only that unscoped history/untracked assertion and its now-unused `execFileSync` import. The recurring tests retain all 13 frozen source hashes, p02 manifest/reference registrations, required oracle entries and every numerical/MDX/SSR assertion. The previously accepted JSON import attribute from `c51809ffc5f39bb978e9094453672a217f00e51e` remains unchanged. No model, fixture, reference or shared file changed.

Actual lightweight validation after this correction: `node node_modules/vitest/vitest.mjs run tests/unit/p02/remainder-lessons.test.ts --maxWorkers=1` passed **24 tests in one file**. No author heavy job ran; the integrator focused rerun and browser results remain pending. The correction source SHA is returned in the accompanying handoff.

## Runtime pass at 2cff99bd and independent visual corrections

The inspected integrator manifest `validation-results/focused-2026-10-13T15-50-46-652Z/manifest.json` is complete: all nine gates passed with unchanged input signature `ffa46822448050bf3a0e68429320f69bfff5a53286cdb7b194fdfa3488dc56b3`. Results include 128 units in nine files, five oracle commands, both 22-page production mounts/audits, and **114 root + 114 subpath browser cases**, with zero unexpected/skipped/flaky cases in the browser JSON. These results are for `2cff99bd`, before the current visual corrections.

The integration owner then captured at DPR1. `overflow-failure.json` records III-10 at a configured width of 390 with document scroll width 524: its fieldset expanded to 500 pixels and legend to approximately 386 pixels. The desktop-dark controls also extended beyond their own root. The previous browser guard compared document width against `innerWidth`, which mobile layout could inflate to the same overflowing width, falsely passing. The supplied descent replay-frame image also shows current/next/optimum text colliding.

Corrections are confined to five owned paths: `src/parts/p02/remainder.css`, `src/parts/p02/FitStage.tsx`, `tests/e2e/p02/remainder.spec.ts`, `tests/unit/p02/remainder-lessons.test.ts` and this report.

- Controls fieldsets get `min-inline-size:0`; legends get bounded wrapping. The existing minimum-width tables and bounded `.table-scroll` wrappers remain intact, including their local horizontal scrolling. No page/body overflow hiding is introduced.
- Floating parameter labels move into a wrapping coordinate legend below the SVG. Current is a filled data-blue circle, next a filled update-green square, and optimum a hollow prediction-rust circle. Next's rectangle is centered at the exact same numerical point as before; matching legend glyphs and SVG description identify every role. Coincident values remain overlapped and are explicitly explained. The original SVG accessible name remains intact.
- Both-theme nine-chapter width checks use `testInfo.project.use.viewport.width` as the bound for document scroll width **and** `innerWidth`, retaining only the existing one-pixel rounding allowance. III-10 additionally checks fieldset/legend/wrapper bounds and actual internal table scrolling. Descent replay checks every coordinate legend and actual glyph center, including rectangle x/y plus half width/height.

Actual light check after the final distinct-glyph patch: `node node_modules/vitest/vitest.mjs run tests/unit/p02/remainder-lessons.test.ts --maxWorkers=1` passed **25 tests in one file**, including the new SSR marker/legend/center regression and all previous assertions. Mathematical models, adapters, canonical Python, fixtures, oracles, shared platform and frozen reference files were not changed. No author build, browser, capture or heavy job ran for these corrections. Post-fix physical bounds, both-theme layouts, actual replay glyph checks and visual acceptance await the owner rerun.

The integration owner separately reported the shared physical-viewport publication guard accepted at source `743cc26` / delivery `67514fe`, with all nine foundation gates and 48+48 browsers passing. This agent did not edit or merge that shared work; the Part ownership comparison base remains `8157b7af` as instructed.

Three supplied PNGs were inspected (mobile failure, desktop-dark multiple regression, desktop-light descent replay), together with the overflow JSON. They are pre-fix failure evidence, not post-fix images. Their unchanged SHA256 values are recorded below; no other capture is claimed as manually checked:

- `artifacts/integrator-visual-p02-2cff99bd/overflow-failure.json` — `b99f1843c6cfaf8e5ea880bf354274ffcd5f1b81cef98068f9df25187db6cedd`
- `artifacts/integrator-visual-p02-2cff99bd/overflow-failure.png` — `615ddf904bebe1945d6aadd7fc75ac9f1a810d56ff730b9a62bf62ecba011340`
- `artifacts/integrator-visual-p02-2cff99bd/multiple-linear-regression-desktop-dark-canonical.png` — `41e50228fb4241f667c310464c1f8a36a320b46fdee4600de0996e6fa7340e2b`
- `artifacts/integrator-visual-p02-2cff99bd/regression-gradient-descent-desktop-light-replay-frame-1.png` — `6b4d74c472ab2cfca1cf23701e975785e5cc5cebfe2ba3047e976874b512e88c`

## Identity and ownership

- Allocated locked D-volume worktree: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/book-iii-part-ii-regression-classification`.
- Branch: `feature/book-iii-part-ii-regression-classification`.
- Canonical common Git directory verified: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books/.git`.
- Initial HEAD: `cca73bfbae363715a8ede64e349b726803f1f16f`; initial status clean. The rejected old `325f7bdf` was not used as an implementation base.
- Integrator-synchronized Wave A base: `8157b7af7e209d94fffdf79001134b6e18744d34`, tag `book-iii-wave-a-trace-keys-20261013`. The integrator supplied the shared trace-key correction; this agent performed no merge or shared edit.
- Completed implementation source commit: `98ab531d67e6937cee8fe5d7630d3eed6236150c` (28 files). This report is a subsequent documentation-only commit, whose SHA is returned in the final handoff.
- All 13 frozen III-07 source hashes match `documentation/REFERENCE_FOOTPRINT.json`. Its manifest entry and all required oracle commands are preserved. Shared platform/shell/config/plan and protected Books I/II have no diff from the synchronized base.
- No installs, clones, push, deployment, merge, history rewrite, cleaning, snapshot update or other Part edits. Ignored integrator challenge/config/log artifacts were not staged.

## Chapter checklist

Every row below has complete prose, intuition/definition, derivation, literal worked example, actual raw Python import, opening interaction, numerical/undefined policy, column/batch shapes, explicit hand-authored provenance, connections and exactly five graded exercises with corrective feedback. “Authored” browser checks are not executed browser evidence.

| Chapter / route | Actual mechanism and edge cases | Independent check | Interactive checks |
| --- | --- | --- | --- |
| III-08 `least-squares` | Centered optimum, residual orthogonality, zero x-variance and one-sample ambiguity; horizontal representative is adopted only by Apply fit | Fraction pair-difference elimination | Current versus optimum, input precision/rejection, numeric/arrow controls and reset; authored browser case |
| III-09 `regression-gradient-descent` | Frozen public III-07 kernel, simultaneous gradients/steps, Hessian/eigenmode multipliers, actual MSE contours; convergence, damped/undamped oscillation and divergence | Literal quadratic and centered regression finite differences | Four updates/five frames, seek/edit, canonical rate presets, numeric/native rate slider and reset; authored browser case |
| III-10 `multiple-linear-regression` | Editable design, target and coefficient columns; rank-aware minimum norm one-sided Jacobi SVD, no inverse normal equations; wide/zero/duplicate/nearly dependent and scaled designs | Robust NumPy `lstsq` with explicit `rcond=1e-10` | Rowwise XW, singular values/cutoff/rank, explicit solve and duplicate-column challenge; authored browser case |
| III-11 `polynomial-features` | Actual power features degree 1–5, training-only coefficient solve, independent held-out rows/error; interpolation and repeated-input rank concerns | NumPy Vandermonde plus `lstsq` | Degree numeric/native slider, editable training rows, held-out table and curve; authored browser case |
| III-12 `regularization` | Full MSE plus explicit L2 or L1 penalty; intercept policy, Ridge augmentation, L1 soft-threshold coordinate solve/KKT; exact zero weights and lambda zero | Orthogonal analytic shrinkage, KKT and robust Ridge checks | Real predictions/objective/penalty comparison, intercept checkbox, lambda, convergence status; authored browser case |
| III-13 `logistic-regression` | Stable sigmoid and logit BCE, likelihood derivation, analytical gradients and simultaneous update; ±1000 extremes, finite loss despite probability endpoints | 80-digit Decimal likelihood, centered differences and NumPy `logaddexp` | Editable model/features/labels, loss/gradient/next column, three updates/four frames, rejection/reset; authored browser case |
| III-14 `thresholds-confusion` | Same saved scores as III-15, inclusive threshold, literal per-row TP/FP/TN/FN, ties and score endpoints; above-all null sentinel | Set-intersection confusion counts | Numeric/native threshold, score and label edits, five canonical sweep frames; +∞ hides finite controls and has explicit return action; authored score-1 sentinel/keyboard/touch cases |
| III-15 `precision-recall-roc` | Explicit zero-denominator reasons, count-based F1, exact distinct-score ROC with joint ties and above-all endpoint; one-class/imbalanced cases, pairwise tie-aware AUC | Literal counts plus independently enumerated cross-class ranking pairs | Active counts/metrics/ROC point/table, no fabricated missing-class chart, same immutable sweep; authored browser case |
| III-16 `softmax-regression` | Row-shifted normalization, stable CE, actual one-hot Y, d×k gradient and updates; extreme wrong-class CE, deterministic argmax ties and common-shift invariance | Unshifted 80-digit Decimal probabilities/likelihood and centered differences of every coefficient | W/features/labels, current shift in equation and logits, probability sums/gradient/next matrix, three updates/four frames; authored shifted-equation and extreme-loss browser case |

There are 45 new graded exercises. III-07 and its six exercises remain unchanged.

## Numerical methods, shapes and tolerances

Two Part-owned experiments reuse `useLesson`, `IdScope`/`useScopedId`, `NumberField`, `Formula`, `Inspector`, `TraceStepper` and shared detached `traceFrom`. There is one active numerical state per island; pure adapters derive the rows, scalars, shapes, equations, geometry and speech. Fit SVGs use equal x/y scales, while logistic and ROC axes explicitly represent different quantities. Numeric sample fields provide keyboard/touch equivalents; new plots do not introduce custom draggable handles.

Scalar descent imports `deriveRegression` and `regressionStep` from frozen `model/linear-regression.ts`; Python imports frozen `derive_regression`/`regression_trace`. No fork of the reference predictor, MSE, gradient or step exists. Augmented presentation uses intercept-first `[b,w]ᵀ`; the contour axes explicitly use `(w,b)`.

Public designs are 1–64 rows × 1–7 columns, with rectangular finite values. Mathematical W/y vectors are columns. Binary W is d×1; multiclass W and gradient are d×k, and logits/P/one-hot Y are n×k for 2–6 classes. Invalid labels, nonfinite input/intermediates, wrong shapes and unsupported updates fail with reasons. UI bounds are narrower and documented in each chapter.

The SVD scales the design, uses relative column-orthogonality tolerance `1e-14`, rejects nonconvergence after 100 sweeps, and retains singular values strictly above `1e-10 * largest`. Rank-deficient results select minimum norm in retained singular directions. Trusted Ridge rows may add up to seven rows after public original-input validation; the 64-original-row reproducer is a committed regression test (expected intercept 5, slope 2/3 at lambda 2).

L1 coordinate descent allows 3000 sweeps and stops on coefficient change below `1e-12`; final maximum KKT violation independently decides convergence at `1e-8`. An iteration-limited approximate result remains explicitly labeled. Intercept defaults to excluded, with an actual objective-changing checkbox.

`fixtures/p02/remainder.fixtures.json` has 34 deterministic cases: 4 scalar fits, 7 matrix solves, 3 polynomial fits, 6 penalties, 3 binary batches, 7 confusion/ROC fixtures and 4 multiclass batches. Binary and multiclass cases include every state of three-update traces. The generator checks actual canonical Python before serializing expectations established by independent methods. `--check` compares content and never rewrites.

- Scalar Fraction and Decimal binary/multiclass parity: absolute plus relative `1e-12`.
- Small-matrix SVD/polynomial/regularization parity: absolute plus relative `2e-9`, allowing different rotation/LAPACK rounding paths. Extreme scaling checks compare the meaningful coefficient/rank quantities; an absolute residual tolerance is not a certification of arbitrary huge ill-conditioned data.
- Centered finite differences: step `1e-5`, absolute plus relative gradient tolerance `2e-7`, chosen above cancellation/truncation error for the moderate-logit fixtures.
- Counts, IDs, shapes, labels, threshold ordering and trace identities are exact; rates/AUC are finite fractions or explicit null/reason objects.

Lesson datasets/goldens are hand-authored with no seed. Only additional oracle challenge data use NumPy seed `20261013`; it is not mislabeled as the lesson-data seed. Display rounding never changes updates or ties. Tiny nonzero computed scalars use scientific notation; inputs retain round-trip numeric text.

NumPy library semantics were checked against its primary documentation: [minimum norm and explicit lstsq cutoff](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html), [logaddexp](https://numpy.org/doc/stable/reference/generated/numpy.logaddexp.html). These are oracle comparisons, not runtime fitting wrappers in the lesson mechanisms.

## Tests actually run

Commands below ran from `Interactive-Machine-Learning-Book`, using the existing read-only Node/NumPy overlay and worktree-local cache. No full type/build/browser run was performed by this agent.

| Executor / exact command | Actual result |
| --- | --- |
| Agent 2: `node node_modules/vitest/vitest.mjs run tests/unit/p02/fit.test.ts --maxWorkers=1` | 7 tests passed; included exact 64-row Ridge boundary |
| Agent 2: `.venv/bin/python -B oracle/p02/generate_remainder_fixtures.py --write` | Generated 34 canonical-checked independent cases; no full oracle sweep |
| Agent 2: `node node_modules/vitest/vitest.mjs run tests/unit/p02/fit.test.ts tests/unit/p02/remainder-parity.test.ts --maxWorkers=1` | 47 tests passed in 2 files |
| Agent 2: `node node_modules/vitest/vitest.mjs run tests/unit/p02/remainder-lessons.test.ts --maxWorkers=1` | 24 tests passed; strict KaTeX, nine isolated MDX syntax/SSR renders, authoritative geometry and ownership/reference hashes |
| Agent 2 final light suite: `node node_modules/vitest/vitest.mjs run tests/unit/p02 --maxWorkers=1` | **111 tests passed in 5 files**: frozen 31+9, new 7+40+24; 1.29s total, 401ms test bodies in this run |
| Integration owner, allocated Linux flock: `node scripts/run-oracle.mjs p02` | **5 commands passed**: frozen rational literals, 15 reference NumPy tests, 9 remainder tests including real canonical subprocess execution, 7 fresh reference fixtures and 34 fresh remainder fixtures; raw ignored evidence `artifacts/integrator-oracle-review.log` inspected |
| Agent 2: `git diff --cached --check` before source commit | Passed after removing extra EOF blank lines from nine owned chapters |

The integration owner also reported 19 isolated mathematical challenges passing. That report is supplemental evidence; those ignored challenge/config files are not committed as authored Part tests. The synchronized platform's reported 57 units/96 browsers concern the shared patch, not these new chapters. Their results are not relabeled as Part browser acceptance.

## UI/browser inventory and pending heavy validation

`tests/e2e/p02/remainder.spec.ts` authors **13 tests**, selected by the existing three projects (39 cases per mount). The same relative routes work for root and `/machine-learning/`. Cases cover all nine current numerical mechanisms in both themes, physical equal-scale projections/readable plot text, exact inputs and approximate outputs, invalid entry/reset, editable rank-aware design, polynomial held-out integrity, L1/L2/intercept/objective numbers, selected-frame replay edits, real logistic/softmax gradients, extreme logits, tie/undefined ROC, numeric/range keyboard plus native pointer/touch operation, sentinel score-1 consistency and shifted softmax equation/logit/invariance consistency.

The shared publication suite already discovers all new routes and adds hydration, five-exercise, imported-code, ID, both-theme axe and overflow checks. The existing viewports remain 1440×900, 820×1180 and 390×844. New plot text sizes derive from measured width for at least 14 rendered pixels. The strengthened physical-viewport and legend/glyph checks are authored but have not been executed in a browser on this corrected source.

**Pending after the visual corrections:** integrator focused rerun with the strengthened viewport/glyph checks, new DPR1 rendered captures/manual visual review and independent acceptance. All nine gates passed at the earlier `2cff99bd` source; independent captures then exposed the defects recorded above. Three supplied pre-fix PNGs and the overflow JSON were inspected/hashed; no new capture or baseline was created or updated by this agent. All 13 frozen source hashes remain verified. Native Windows, physical touch hardware and human screen-reader checks remain unperformed.

The integrator can allocate the existing focused runner, from the book root:

```sh
flock /tmp/interactive-books-heavy-gate.lock -c 'npm run validate:focused -- --part p02'
```

It keeps global type/production/platform checks while selecting p02 numerical and browser suites; it does not acquire a second nested flock. Coordinate Windows separately. Source/type/browser failures require correction before publication acceptance.

## Limits and integration requests

Interactive fixtures are deliberately small: scalar observations, a fixed four-row/two-feature multivariate editor, polynomial degrees 1–5, scalar-feature regularization, binary toy batches and a three-row/three-class softmax editor. The pure kernels validate broader documented small-matrix shapes. This is not an arbitrary-size fitting service. SVD rank decisions near the cutoff and slow L1 convergence are explicit limitations; there are no ill-conditioned-data guarantees beyond supported checks.

No essential shared API change is requested, so no shared implementation or `INTEGRATION_REQUESTS.md` was needed. Both manifests only append p02 chapters/oracles and preserve III-07. The most material remaining risk is post-fix browser/render validation of physical bounds and parameter-marker legibility; the integrator owns the focused rerun and acceptance.

## Exact changed paths from synchronized base

Implementation commit paths (repository-relative), followed by this report only:

- `Interactive-Machine-Learning-Book/code/python/p02/classification_reference.py`
- `Interactive-Machine-Learning-Book/code/python/p02/fit_reference.py`
- `Interactive-Machine-Learning-Book/fixtures/p02/remainder.fixtures.json`
- `Interactive-Machine-Learning-Book/oracle/p02/generate_remainder_fixtures.py`
- `Interactive-Machine-Learning-Book/oracle/p02/manifest.json`
- `Interactive-Machine-Learning-Book/oracle/p02/remainder_math.py`
- `Interactive-Machine-Learning-Book/oracle/p02/test_remainder.py`
- `Interactive-Machine-Learning-Book/src/parts/p02/ClassificationStage.tsx`
- `Interactive-Machine-Learning-Book/src/parts/p02/FitStage.tsx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/least-squares.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/logistic-regression.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/multiple-linear-regression.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/polynomial-features.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/precision-recall-roc.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/regression-gradient-descent.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/regularization.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/softmax-regression.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/chapters/thresholds-confusion.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p02/classification-lesson.ts`
- `Interactive-Machine-Learning-Book/src/parts/p02/fit-lesson.ts`
- `Interactive-Machine-Learning-Book/src/parts/p02/manifest.json`
- `Interactive-Machine-Learning-Book/src/parts/p02/model/classification.ts`
- `Interactive-Machine-Learning-Book/src/parts/p02/model/fit.ts`
- `Interactive-Machine-Learning-Book/src/parts/p02/remainder.css`
- `Interactive-Machine-Learning-Book/tests/e2e/p02/remainder.spec.ts`
- `Interactive-Machine-Learning-Book/tests/unit/p02/fit.test.ts`
- `Interactive-Machine-Learning-Book/tests/unit/p02/remainder-lessons.test.ts`
- `Interactive-Machine-Learning-Book/tests/unit/p02/remainder-parity.test.ts`
- `Interactive-Machine-Learning-Book/documentation/parts/p02/P02_COMPLETION_REPORT.md`

Remainder fixture SHA256: `ca9f95bf914a14ea116f7c330c53632881ec00a5a5e4ff4aeb9ef23be1393d2f`. Final commit/status/ownership are verified in the accompanying handoff message; no freeze is claimed.
