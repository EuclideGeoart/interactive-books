# B3-P04 source handoff · III-20–25

Status: all six lessons implemented and locally committed. The owner completed all nine focused gates at cccfd3f (actual CLI 0, root 162 and subpath 162 all passed, source unchanged). Subsequent independent sparse-input failures are corrected in source; fresh owner nine-gate validation and captures remain pending for this correction. Status remains **CORRECTION REQUIRED** until owner acceptance. No acceptance or freeze is claimed.

## Identity and boundary

- Worktree: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/book-iii-part-iv-trees-ensembles`
- Book root: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/book-iii-part-iv-trees-ensembles/Interactive-Machine-Learning-Book`
- Branch: `feature/book-iii-part-iv-trees-ensembles`
- Initial clean HEAD and approved Wave B base: `911539e3d0b3600addfec6f78dcdda7c834ce7df`, tag `book-iii-wave-a-freeze-20261013`.
- Accepted owner-only compatibility base: `d2be911c407dde5949ad71757da8853128d3d8b5`, tag `book-iii-wave-b-publication-budget-20261013`. Owner merged it with b6fba73 into `cccfd3fdf2961e6105fa2bff94e0bff2d178ee2b` and passed the 31-owned-path/reference/protected-tree preflight. Author performed no synchronization. Current cumulative delivery diff is audited against d2be911.
- Original foundation/reference freeze remains `cca73bfbae363715a8ede64e349b726803f1f16f`.
- Source payload HEAD: **`d98ca403fb1381559bbf28d855cce3eb8bd336bf`** (sparse-input correction on owner-synchronized cccfd3f).
- Initial implementation: `63db5c26919fd77e24a40be7fc4ee6e6d86ff8b1`; final numerical/CLI correction: `dfdbc4d2657dd743325d5323d510a3595f04ef2b`; routine type/import correction: `191060d20d987d584339139d2846086b9d63f960`; native-scroll assertion correction: `b0b3dd000667e89790ce931d20f757100492872f`; prose containment correction: `3e30f7af2c5f17af850bef5223e882dac0c04883`; sparse-input correction: `d98ca403fb1381559bbf28d855cce3eb8bd336bf`.
- This report and raw light-check logs form a subsequent documentation-only delivery commit. The source payload is unchanged by it.
- Canonical common Git directory verified: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books/.git`. Allocated worktree remains locked on the D volume.
- One-time diff/untracked audit uses the worktree-root path base consistently. All changes are within the eight P04 prefixes. All 13 `REFERENCE_FOOTPRINT.json` SHA256 values are unchanged; the light lesson unit also checks them. No recurring whole-repository ownership/history assertion was added.
- No shared, reference, other-Part or protected-Book edits; no package/config/script changes, installs, merges, push, deployment, history rewrite, cleaning, snapshot update or publication-audit worktree contact. Read-only dependency links were reused.

## Per-chapter completion

Every row below includes an opening hydrated mechanism, intuition/definition, derivation, literal worked example, imported runnable Python+NumPy, state-driven equations/inspector/descriptions, assumptions/limits/connections and five uniquely identified graded feedback exercises. All six MDX documents compile in light units; all active equations and displayed derivations pass strict KaTeX in those units.

| Chapter / route | Actual mechanism and worked example | Canonical functions | Exercises / source checks |
| --- | --- | --- | --- |
| III-20 · `chapters/decision-trees/` | Recursive binary CART; legal candidate microscope; exact memberships/counts; root x1≤2.5 gives Gini gain 1/4; depth-1 error 1/6 versus depth-3 fit. Actual query leaf is named/highlighted. | `train_tree`, `candidates`, `evaluate_split`, `predict` | 5 graded; MDX/SSR/equation/shape/golden units pass |
| III-21 · `chapters/entropy-gini-gain/` | Gini/entropy switch; weighted child impurity and legal gain; literal entropy gain ≈0.459147917027; pure 0·log0 convention and unbalanced-child counterexample. | `stats`, `evaluate_split` | 5 graded; exact counts/Fraction Gini/Decimal entropy checks pass |
| III-22 · `chapters/regression-trees-pruning/` | Regression leaf means/SSE, depth/min-leaf limits; actual cost-complexity subtree dynamic program; 4→2→1 leaves at α=0,.25,.5; exact rational 3.84 breakpoint. | `finite_mean`, `train_tree`, `prune_tree` | 5 graded; exhaustive subtree/risk/tie/constant tests pass |
| III-23 · `chapters/bagging-bootstrap/` | Actual separately bootstrapped trees; draw/source IDs, multiplicity/unique/OOB ledgers; hard votes; OOB accuracy only over eligible sources. First ledger [1,5,3,5,0,5]; original OOB accuracy 1/5. | `bootstrap`, `bagging`, `aggregate` | 5 graded; exact LCG/counts/OOB/aggregation checks pass |
| III-24 · `chapters/random-forests/` | Bootstrap trees with genuine per-eligible-node feature subsets; seed-7 tree2 root feature [1], descendant rootR feature [0]; actual majority/OOB outputs. | `train_tree`, `bagging` | 5 graded; seed/segment/per-node-subset/branch/vote goldens pass |
| III-25 · `chapters/gradient-boosting/` | Squared-error regression only; mean baseline; actual residual trees, learning-rate updates and half-MSE at each stage. Tiny losses .5→.125→.03125→.0078125 at η=.5. | `boosting`, `train_tree`, `finite_mean` | 5 graded; exact Fraction residual/update/loss checks pass |

Part-local chapter and oracle manifests use the accepted discovery contract. Book II prerequisite IDs are real frozen registry IDs; the existing shell resolves them. There are 30 exercises with correct/incorrect feedback. No extra shared registration pipeline was introduced.

## Model, shapes and provenance

Public tree inputs are 0–32 uniquely identified rows, 1–4 declared features, depth 0–5, minimum leaf 1–32 and unsigned 32-bit seed. The sheet uses two feature columns. X stores sample rows (`n×d`); targets, residuals and predictions are conceptual `n×1` columns. Queries must have exactly d finite numeric entries even for empty, pure or feature-zero-only trees. Python rejects bool/string numbers, normalizes accepted observations to detached binary64 before identity/masks/recursion, and normalizes validated integer-valued options to integer indices. Inputs remain unchanged.

Classification supports labels 0/1, Gini or base-2 entropy, hard majority leaves and class-zero label/vote ties. Legal thresholds represent adjacent distinct values; equality goes left. Duplicate values stay together. A noninterior rounded midpoint falls back to the lower endpoint. Training considers legal candidates only and accepts strictly positive computed gain. Exact computed-gain ties use feature index then threshold order.

Regression uses squared centered deviations and terminal means. Exact identical binary64 targets retain their identical mean and zero SSE; this same Part-local mean policy is used for boosting initialization and regression ensemble aggregation. It does not epsilon-zero distinct targets. The [.1,.10000000000000006] counterexample has positive exact representable SSE and an actual split. Constant fast paths need no accumulating sum; genuinely varying overflowing sums/SSE still reject.

Pruning minimizes root-normalized SSE plus α times leaf count among subtrees of the grown tree. Eight binary64 epsilons at the compared cost scale resolve only cost-selection ties, preserving all reported costs. 3.84±10^-10 counterchecks remain distinct. Empty normalized costs/predictions are nullable with reasons.

All source observations are explicitly hand-authored educational examples. Seeds describe deterministic pseudorandom experiments. Each ensemble tree reserves a disjoint segment of n bootstrap outputs followed by a feature budget `(2^depth−1)·mtry` when mtry<d; otherwise the feature budget is zero. Unused feature draws remain reserved. Preorder feature consumption cannot overlap a later tree's allocation. Segment offsets, seeds and actual node features are visible. This avoids structurally overlapping LCG windows without claiming a proof of statistical independence.

Bagging/forest source predictions and queries aggregate actual fitted trees. OOB eligibility excludes the source ID from each eligible tree's own sample. Sources with no eligible predictions are excluded from the metric; no eligible source or query prediction is explicitly undefined. The learner ensemble sheets use binary classification; the canonical kernels also support scalar-regression averages/OOB MSE.

Boosting is squared-error regression on all original rows and all features, with η in (0,1] and at most six stages. It fits y−F, predicts a new residual tree, then adds ηh. Objective is half MSE, distinguished from full MSE evaluation. The source does not claim that all boosting variants fit ordinary residuals.

## Independent oracle and tolerances

The committed file has **23** small independent expectations. Generation runs the real canonical module freshly and verifies it against:

- Exhaustive row-subset enumeration: retain only subsets geometrically separable by a feature, instead of using the runtime's adjacent-coordinate search.
- Exact Fraction means/SSE/Gini and literal class counts; 80-digit Decimal logarithms for entropy.
- Enumeration of every pruned subtree, distinct from runtime dynamic programming.
- Closed-form integer LCG state `a^k·seed+c(a^k−1)/(a−1) mod 2^32`, multiset counts and exact OOB sets.
- Independently enumerated bootstrap trees and rational vote/mean aggregation; per-node feature slots use closed-form stream states.
- Exact Fraction residual targets, leaf averages, stage predictions and half-MSE. Literal four-row stages and decimal-constant zero-loss stages are separately asserted.
- Real canonical subprocess execution for normal piped JSON, malformed prediction shape, Python arbitrary-int binary64 normalization/integer-float arguments, and a POSIX terminal with its PTY master kept open: the advertised bare command completes without EOF.

Golden math comparison is `|actual−expected| ≤ 2e−12 + 2e−12·|expected|`. IDs, counts, dimensions, seeds, draw indices, feature subsets, thresholds/partitions and nullability are checked exactly in owned parity cases. No numerical tolerance was widened for the owner challenges. Tiny close-target SSE is directly asserted exactly and stays positive.

SVG numeric attributes use the same mathematical state and scales. Painted SVG BBox/path centers allow **0.001 viewBox unit**, justified by native float32 geometry quantization and well below a CSS pixel at these bounded plot widths. This is separate from math tolerance. Plot labels target 14.1 CSS px to remain ≥14 after browser font/matrix quantization. Responsive geometry remains a pending real-browser claim.

## Trace and interaction inventory

Shared `traceFrom`, `TraceStepper`, scoped IDs, `useLesson`, `NumberField`, `Formula`, `Inspector` and `ChoiceExercise` are reused.

- Split/impurity: replay maximum-depth bounds 0,1,2,3, with actual fresh recursive fits.
- Regression: replay α=0,.25,.5,1 on the same grown tree.
- Bagging/forest: replay actual ensemble prefixes 0,1,2,3 with fixed data/seed/stream allocations.
- Boosting: replay 0,1,2,3 fitted stages; frame 0 is the mean baseline.
- Frames are detached frozen plain-data snapshots. Seek selects a frame; edits use its displayed values, exit playback and leave history unchanged.
- Ordinary numeric commits retain stable NumberField keys and focus. Reset, replay, seek, row selection and data replacement advance the local revision. The native threshold range is also keyed by that revision, cancelling a held UA gesture across reset/seek/replacement; ordinary slider updates do not remount it.
- Native controls supply keyboard and touch alternatives. No custom drag engine or autoplay timer was added.
- Data-blue circles/squares distinguish class labels without relying on color. Regression predictions use hollow rust diamonds and purple residual segments. Query/inspection markers use green and distinct cross/dashed-line shapes. Node/coordinate labels live in readable tables or nested HTML rather than crowded floating SVG text.
- Owned fieldsets use min-inline-size:0; legends and inspector reasons wrap; tables scroll in bounded focusable wrappers. No body overflow hiding or weakened physical-viewport guard.

## Actual author validation

All commands below ran in the allocated Book root using the provisioned read-only-linked environment. Only light owned checks/small fixture generation were run.

| Command | Actual result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run tests/unit/p04 --maxWorkers=1` | **57 tests, 3 files PASS**, final run 20:27:53 local. Kernel 13, parity 26, lessons 18. |
| `.venv/bin/python -B oracle/p04/test_trees.py` | **12 tests PASS**, including real CLI and no-EOF PTY test. Final log retained. |
| `.venv/bin/python -B oracle/p04/generate_fixtures.py --write` | **23** fresh independent/canonical cases generated and committed. |
| `.venv/bin/python -B oracle/p04/generate_fixtures.py --check` | **23** fresh cases match the committed file, exit 0. |
| `git diff --check` and staged equivalent | PASS for source handoff. |
| One-time ownership/reference/common-dir/lock audit | P04-only changed paths and 13 immutable hashes verified; no recurring repo-diff guard. |

Raw final author outputs: [light-unit.log](./light-unit.log), [light-python.log](./light-python.log). Earlier light MDX parse defects caused by bare comparisons were corrected and rechecked. After adding fixtures, the CLI error regression's first-case dimension assumption was replaced with declared-dimension+1. The first one-time ownership script mixed book-relative/untracked and repository-relative prefixes; the root-normalized audit then passed. These were author check corrections, not shared contract changes.

Owner/peer source challenges were corrected in P04: exact query dimensions; disjoint bootstrap/feature streams; pruning tie roundoff; Python binary64 partition agreement/integer indices; empty query nullability; revision-keyed native slider; exact decimal constants across stats/boosting/regression averages; terminal-default startup. Owner challenge logs/tests remain read-only in the foundation artifacts directory. No owner artifact or failure capture was edited or committed.

## Current sparse-input correction and owner validation

The owner completed all nine focused gates at held source `cccfd3fdf2961e6105fa2bff94e0bff2d178ee2b`: actual CLI 0, 75 units, 12 Python tests, two oracle commands/23 fresh cases, root **162 passed** and subpath **162 passed**, zero failures/skips/flakes and source unchanged. The successful archive remains read-only in the foundation Book at `documentation/validation/wave-b/p04/review-cccfd3f/`. Those results confirm the earlier scroll/prose containment corrections and apply only to that source.

A subsequent owner boundary review proved three sparse-array acceptance defects. `validateRows`, `predict` and `finiteMean` now validate every indexed component before terminal stopping, branch traversal or the exact-constant mean shortcut. All callers were searched: tree stats/splits/growth, bootstrap/bagging/forest, boosting baseline/fits, regression aggregates/OOB and lesson row/query projections. Dense arithmetic, costs, tolerances, API, state, fixtures, canonical Python and chapter/browser source are unchanged.

Three new owned TS regressions first reproduced **3 failures**; retained proof is [sparse-guard-before.log](./sparse-guard-before.log). After correction, the exact commands in [light-sparse-guards.log](./light-sparse-guards.log) passed **42 TS tests / 2 files** and **4 actual canonical Python checks** (three missing-entry contracts plus dense decimal means/SSE/boosting/ensemble/OOB). Row/query checks also exercise the real canonical piped CLI with JSON null and require exit 2/error-only output. Mean checks call the actual canonical helper on JSON-decoded null observations. No full Python/oracle sweep or heavy author job was run.

[SPARSE_INPUT_CORRECTION.md](./SPARSE_INPUT_CORRECTION.md) records exact source paths/SHA, original owner failure-log hash, preserved successful archive hashes, all caller boundaries, commands/counts and limitations. Fresh owner full nine-gate validation and captures remain required for the corrected source. No new integration request is needed.

## Owner focused type-gate correction

The owner run at `45d43131651c7c26e8e42cf790b595d0b01e5782` stopped at type/content, exit 1, before units/build/browser: 80 files, 1 error, 0 warnings, 2 hints. The correction at 191060d annotated `row.x.forEach((x: number) => ...)` and removed unused `CLASS_ROWS` / `bestSplit` imports. The latest sparse-input fix replaces that callback with indexed validation. Mathematical behavior, state and fixtures are unchanged. Compiler settings remain strict.

[TYPE_GATE_CORRECTION.md](./TYPE_GATE_CORRECTION.md) records the exact diagnostic, preserved owner-artifact hashes and source commit. Author inspected the minimal diff and passed whitespace checks; the historical 57-unit/12-Python/23-fixture evidence above was not rerun for this type-only correction. No author heavy job ran for that correction. Owner type/preflight and all nine focused gates subsequently passed at cccfd3f; the new sparse-input correction awaits a fresh owner run.

## Owner root-browser result and native-scroll correction

The owner run at `6312c583b81f2ccbbe0df63b21f6281ec416aa4f` passed its first seven gates (74 units, 12 Python tests, 23 fresh cases), then root browser returned actual CLI exit 1: **121 passed / 23 failed of 144**. Subpath browser was not run. The outer cleanup status 143 is a separate tool result, not the recorded CLI exit.

Owner production diagnosis measured a focused overflowing table at immediate scrollLeft 0 and scrollLeft 40 after 250 ms. The owned layout() test now uses `await expect.poll(actual native scrollLeft).toBeGreaterThan(0)` after the same focus/ArrowRight actions. All overflow, physical-viewport, mobile and geometry checks remain strict; no product handler or fixed delay was added. [BROWSER_SCROLL_CORRECTION.md](./BROWSER_SCROLL_CORRECTION.md) preserves the failed-run summary, evidence hashes and exact correction.

The retained root JSON has seven shared publication timeouts and a distinct III-25 mobile failure at the shared physical-width guard, book.spec.ts:58. The width observation led to the owned prose containment correction documented below; owner root/subpath browser subsequently passed at cccfd3f. Measured single-worker Axe scans of the profiled production page were 6.675/6.412 seconds, zero violations; owner handles shared concurrent validation timing separately. [INTEGRATION_REQUESTS.md](./INTEGRATION_REQUESTS.md) records WB-P04-01. No shared file/config changed; no new heavy job was run. The owner merged accepted d2be911 into this branch as cccfd3f and completed validation; the author performed no synchronization.

## Prose-table containment correction

Owner source/failure-image inspection identifies III-25's unwrapped five-column worked-stage table as the retained physical-width root cause. All five P04 prose tables (III-20/21/22/24/25) now use the shared labelled `.table-scroll` wrapper. Every original table line, number, header and alignment is unchanged. Stable unique `data-scrollable` names allow BaseLayout to synchronize region/tab-stop semantics only for actual overflow; fitting wrappers use tabindex=-1 with no landmark/name.

[PROSE_TABLE_CORRECTION.md](./PROSE_TABLE_CORRECTION.md) records exact scope, shared runtime semantics and evidence. The author light lesson file passed **19 tests**; the new case renders real MDX/GFM tables and verifies semantic header/cell counts and exact worked values. The initial alignment-serialization assertion failure is retained alongside the final passing log. No heavy job ran.

Six bounded independent full-chapter browser cases are added, one per chapter, both themes/all existing viewport projects. They wait for fonts; check document scrollWidth AND innerWidth versus the physical page viewport; visit and bound all prose tables; retain exact table counts/literals; poll native keyboard scrolling only for overflow; and verify the accepted fitting non-scroll state. The owner subsequently passed all 78 owned cases on root and again on subpath at cccfd3f. Fresh validation/captures remain required for the later sparse-input correction. The earlier native-slider reset and async-scroll policy are unchanged.

Owner-only publication-budget compatibility d2be911 is accepted/frozen after the existing 16-chapter regression. Owner merged it and verified the exact owned diff before the successful cccfd3f run; author performed no merge.

## Pending owner gates and capture inventory

**Not run by author:** full type/diagnostic check, repository/full oracle runner, production root/subpath builds, audits, Playwright collection/execution, captures or focused validation. The failed 6312c58 and successful cccfd3f owner results above are historical evidence; no browser/capture/overall acceptance pass is claimed for the sparse-input correction. The P04 e2e file declares 26 cases (12 theme/mechanism combinations, 8 mechanism/interaction cases, 6 independent full-chapter prose cases), intended for the existing 1440/820/390 projects and both production bases; the earlier 6312c58 root run collected 144 total scoped cases, and the complete cccfd3f run passed 162 total cases on each base; the latest corrected source awaits owner execution. Width checks compare BOTH document scrollWidth and innerWidth against `page.viewportSize().width`.

Owner's focused command after allocation, serialized under the shared Linux gate:

```bash
flock /tmp/interactive-books-heavy-gate.lock -c 'npm run validate:focused -- --part p04'
```

Oracle manifest registers `test_trees.py` and `generate_fixtures.py --check`; the canonical runner should report two actual commands when p04 is selected. No Windows job has been run.

Stage roots and useful production capture states:

| Route | Stage selector | Suggested meaningful state / controls |
| --- | --- | --- |
| decision-trees | `[data-tree-lab="splits"]` | Canonical root; Inspection threshold 3.5 vs 2.5; Inspect node rootR; Maximum depth 0/1/3; Query feature 1=2.5; constant features or empty data. |
| entropy-gini-gain | `[data-tree-lab="impurity"]` | Impurity criterion entropy; threshold 1.5 then 2.5; Minimum leaf count 3; pure class 0; selected child counts/gain. |
| regression-trees-pruning | `[data-tree-lab="regression"]` | α=.25 (2 leaves) and .5 (1 leaf); depth 1 vs 3; constant features; target edits; empty-data cost reason. |
| bagging-bootstrap | `[data-tree-lab="bagging"]` | Bootstrap tree 0/1/2 (values are zero based); Ensemble seed 0 or 7; ledger/multiplicity/OOB tables; Keep one source row; Use empty data and undefined query. |
| random-forests | `[data-tree-lab="forest"]` | Bootstrap tree value 1; inspect root then rootR, features [1] then [0]; Features per split 2 to reproduce bagging; zero trees/empty data. |
| gradient-boosting | `[data-tree-lab="boosting"]` | Replay 0–3 stages and frame 1; residual ledger; rate .5 vs 1; Maximum depth 0 for zero correction; one-more-stage; constant/empty targets. |

Stable inspection selectors include `[data-plot]`, `[data-plot-point]`, `[data-threshold-line]`, `[data-candidate]`, `[data-tree-node]`, `[data-node-row]`, `[data-seed-row]`, `[data-bootstrap-draw]`, `[data-multiplicity]`, `[data-oob-row]`, `[data-query-vote]`, `[data-stage-row]`, `[data-residual-row]`, `[data-source-row]` and named `[data-scalar]` spans. Scalar names include query, evaluation, weighted, gain, leaves, risk, cost and baseline as appropriate. Buttons use visible Reset experiment / replay / edge-case labels. Browser focus/held-slider-reset, keyboard/touch, stage parity, physical widths, glyph paint and exercise feedback cases are authored.

## Limits and requests

Educational binary CART/scalar regression only; numeric features, no missing values or categorical splits; at most depth five/six trees or stages. Forest can stop when its sampled features have no useful split; no hidden retries. Small ensembles do not guarantee OOB coverage or generalization. Boosting implements squared-error residual fitting only. No causal or calibrated-probability claim is made.

Very small regression deviations may underflow to zero; nonconstant targets then receive an explicit unresolved-variation stop reason. Binary64 exact-gain ties and finite arithmetic are the documented runtime policy, not arbitrary-precision optimization. Pruning's cost-selection tolerance is narrow and separate from data/model math. Owner profiled a current-production page as described above; no author browser job or all-chapter performance claim is made. Bounded models and light runtime checks are small, with final owned Vitest duration 3.46 s and Python 0.724 s on this host.

WB-P04-01 is addressed by the owner-approved and merged d2be911 validation-budget compatibility. The III-25 prose containment correction passed owner root/subpath browser at cccfd3f. Sparse-input guards are now corrected; fresh owner validation/captures remain pending. [INTEGRATION_REQUESTS.md](./INTEGRATION_REQUESTS.md) records both distinctly. Full runtime and visual decisions belong to the owner.

## Exact delivered paths versus accepted compatibility base d2be911

- `Interactive-Machine-Learning-Book/code/python/p04/trees_ensembles.py`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/BROWSER_SCROLL_CORRECTION.md`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/HANDOFF.md`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/INTEGRATION_REQUESTS.md`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/PROSE_TABLE_CORRECTION.md`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/TYPE_GATE_CORRECTION.md`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/SPARSE_INPUT_CORRECTION.md`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/sparse-guard-before.log`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/light-sparse-guards.log`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/light-prose-tables-initial-failure.log`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/light-prose-tables.log`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/light-python.log`
- `Interactive-Machine-Learning-Book/documentation/parts/p04/light-unit.log`
- `Interactive-Machine-Learning-Book/fixtures/p04/trees.fixtures.json`
- `Interactive-Machine-Learning-Book/oracle/p04/generate_fixtures.py`
- `Interactive-Machine-Learning-Book/oracle/p04/independent.py`
- `Interactive-Machine-Learning-Book/oracle/p04/manifest.json`
- `Interactive-Machine-Learning-Book/oracle/p04/test_trees.py`
- `Interactive-Machine-Learning-Book/src/parts/p04/TreeStage.tsx`
- `Interactive-Machine-Learning-Book/src/parts/p04/chapters/bagging-bootstrap.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p04/chapters/decision-trees.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p04/chapters/entropy-gini-gain.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p04/chapters/gradient-boosting.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p04/chapters/random-forests.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p04/chapters/regression-trees-pruning.mdx`
- `Interactive-Machine-Learning-Book/src/parts/p04/lesson.ts`
- `Interactive-Machine-Learning-Book/src/parts/p04/manifest.json`
- `Interactive-Machine-Learning-Book/src/parts/p04/model/ensemble.ts`
- `Interactive-Machine-Learning-Book/src/parts/p04/model/tree.ts`
- `Interactive-Machine-Learning-Book/src/parts/p04/stage.css`
- `Interactive-Machine-Learning-Book/tests/e2e/p04/trees.spec.ts`
- `Interactive-Machine-Learning-Book/tests/unit/p04/lessons.test.ts`
- `Interactive-Machine-Learning-Book/tests/unit/p04/parity.test.ts`
- `Interactive-Machine-Learning-Book/tests/unit/p04/tree.test.ts`

34 owned paths total: 22 source/fixture/test/oracle files and twelve report/evidence files, versus d2be911. The latest correction changes three existing source/test paths plus HANDOFF.md and adds three owned report/evidence files. Owner compatibility synchronization is already complete. Final documentation commit should leave git status clean; its SHA is supplied in the accompanying handoff message.
