# Book III Part I source handoff

B3-P01: III-01–III-06. Recommended classification: **ACCEPT WITH LIMITATIONS for source review**, pending independently allocated type/production/browser validation. Acceptance belongs to the integration owner.

Branch feature/book-iii-part-i-foundations. Synchronized base8157b7af7e209d94fffdf79001134b6e18744d34 (book-iii-wave-a-trace-keys-20261013). The handoff commit contains this report; its exact SHA is returned in the handoff chat. Initial worktree/common-dir/lock were verified, and only owned paths are staged and committed. The frozen foundation, other Parts, shared code/config and protected Books are unchanged.

## Chapter checklist

| Chapter | Opening mechanism and complete content | Code and independent checks | Exercises |
|---|---|---|---|
| III-01 What Machine Learning Actually Learns | Editable predictor/data/query; full training vs inference pipeline; old-state update derivation and before/after; five-frame semantic replay | pipeline.py reuses accepted affine NumPy; Fraction literals; actual execution and state parity | Five graded questions with misconception feedback |
| III-02 Samples, Features, Labels and Targets | Editable X/y cells, active n/d, type/units and category/no-target presets; column math and worked row/batch | samples_features.py; every supported shape, semantic/rectangular invalid cases; actual execution and parity | Five graded questions |
| III-03 Learning Problems | Six selectable semantic scenarios; numeric category/proportion and labels-ignored counterexamples; declared goal feedback | learning_problems.py; independent truth table, target use/shapes; actual execution and parity | Five graded questions |
| III-04 Training, Validation, Testing and Generalization | Seeded group/ID splits; pointer/keyboard/menu/numeric membership; duplicate/group and distribution warnings; preprocessing/target leakage literals; four-frame seed replay | split_generalization.py; closed-form LCG, partition/group sets, exact loss/mean, ordering; actual execution and golden replay | Five graded questions |
| III-05 Parameters, Hyperparameters, Loss and Optimization | Reused frozen RegressionStage; full analytical gradient/update derivation and hand before/after; overshoot/nonidentifiability; actual parameters/hyperparameter distinction | optimization_loop.py plus actual frozen raw Python; Fraction arithmetic; no competing optimizer | Five graded questions |
| III-06 Underfitting, Overfitting, Bias, Variance and Baselines | One flagship with editable memberships, degree/noise, actual training-only coefficients/baseline, train/validation residuals/curves, test reveal, invalid whole-target comparison, rank/empty reasons, degree replay | capacity_baselines.py two-pass QR; Fraction moment solve and SVD, near-rank fixture, seed0 overfit literal, selection/order, actual execution and parity | Five graded questions |

All chapters include provenance, types/shapes, numerical limits, literal worked examples, common misconceptions, investigations, connections, Book II prerequisites from the frozen inventory and actual imported Python sources. MDX raw-import paths are validated in focused units. Six declarative entries appear in the owned p01/manifest.json.

## Mathematical design and limits

NUMERICS.md documents exact APIs, equations, provenance, tolerances, rank policy, immutable replay and required unique scope rendering props. Data identity is preserved by membership edits. Training-only fitting and mean-baseline calculation use the same active training IDs. Validation-only selection cannot read test metrics.

Golden data include complete before/after/traces, typed schemas, tasks, group/individual/manual/shift splits, preprocessing leaks, ordinary/manual/seeded/shifted capacity fits, seed0 degree2/8 overfitting and the real near-rank rejection. --check fails missing/stale bytes. Fixtures have no timestamps and use installed NumPy only.

Bias/variance is explained with its stochastic assumptions and qualitative seeded realizations; the lab does not estimate population uncertainty. Detailed CV/calibration is outside scope. Monomial degree≤8 and bounded inputs are intentional. Repeated test inspection remains contamination even after hiding the result again. A revealed test is an educational convention, not a data-security boundary.

## Validation performed by this agent

- node node_modules/vitest/vitest.mjs run tests/unit/p01 --maxWorkers=1 — focused kernel and lesson suites; includes local strict-MDX compilation, strict-KaTeX formula precision, Preact server render, unique scoped IDs, all six code imports and exercise contracts.
- .venv/bin/python -B oracle/p01/arithmetic_oracle.py — independent literal self-test.
- .venv/bin/python -B oracle/p01/test_foundations.py — focused unittest suite, including subprocess execution of all six canonical lesson files, NumPy vs Fraction/SVD, seed/order, group/empty/near-rank, mutation, baseline and stale/missing fixture checks.
- .venv/bin/python -B oracle/p01/capacity_counterexample.py — independent seed0 quadratic vs degree8 overfitting check.
- .venv/bin/python -B oracle/p01/generate_fixtures.py — small owned fixture generation; same command with --check verifies freshness.

Final focused results (2026-10-13, provisioned Linux overlay): **34 TypeScript tests in two files passed** (21 kernel/parity, 13 lesson/source/render; reported duration1.12s); **14 Python unittest tests passed** (3.873s); **9 independent arithmetic literal assertions passed**; **4 seed0 overfitting counterexample assertions passed**; **golden --check passed**. The final TypeScript run followed the requested inference-scope/exercise wording correction; canonical Python and goldens were unchanged by that UI-only correction. All five direct commands exited0. No recurring tests assert whole-repository diffs or untracked paths; ownership is checked once for this source handoff. Earlier failures were an incorrect one-row test expectation (1.25→1.5), a test that treated the plan JSON array as an object, an unnecessarily long feedback-length expectation, and missing parameter details in spoken pipeline output. These were corrected. The user-supplied near-rank mismatch was corrected by one shared mathematical policy in both owned runtimes; it is not hidden with tolerance.

## Authored browser coverage — not executed here

tests/e2e/p01/foundations.spec.ts contains 13 test definitions, run by the accepted three viewport projects at both deployment roots when allocated. It has no bare JSON module imports and introduces no dependency.

It checks repeated numeric keyboard input without refocusing, Enter/Tab focus, fine precision, invalid entries, actual pipeline frame rows/controls, feature schemas, task grading, group keyboard focus/moves/leaks, seed replay, pointer/numeric coupled capacity fitting, empty/rank reasons, actual baseline/leak equations, validation-only selection, hidden-test behavior, every degree replay frame, reset during held drag, physical sample centers, ≥44px handles, measured physical plot font size, both themes and reduced motion. Low-degree browser fits use an independent normal-equation calculation; every displayed residual/loss is recomputed from real DOM values.

## Pending and observed performance

No full type check, production build, browser, screenshot, full oracle sweep or validate runner was executed by this agent. Rendered browser layout, responsive/accessibility and interaction results remain unverified until the integrator runs them. No baseline image changes exist.

Models are bounded (17 active capacity observations; degree0–8; at most64 API observations). Candidate selection fits nine small designs only on request. Focused unit wall time is recorded as verification evidence, not a browser-performance benchmark. No network/model API calls or autoplay timers occur.

## Changed file inventory

Only the following owned files are delivered:

- src/parts/p01/model/foundations.ts
- src/parts/p01/model/splits.ts
- src/parts/p01/model/capacity.ts
- src/parts/p01/lesson.ts
- src/parts/p01/experiment.tsx
- src/parts/p01/MembershipBoard.tsx
- src/parts/p01/PipelineStage.tsx
- src/parts/p01/FeatureStage.tsx
- src/parts/p01/TaskStage.tsx
- src/parts/p01/SplitStage.tsx
- src/parts/p01/CapacityStage.tsx
- src/parts/p01/p01.css
- src/parts/p01/exercises.ts
- src/parts/p01/FoundationExercises.tsx
- src/parts/p01/manifest.json
- src/parts/p01/chapters/what-machine-learning-learns.mdx
- src/parts/p01/chapters/samples-features-labels-targets.mdx
- src/parts/p01/chapters/learning-problems.mdx
- src/parts/p01/chapters/training-validation-testing.mdx
- src/parts/p01/chapters/parameters-loss-optimization.mdx
- src/parts/p01/chapters/underfitting-overfitting-baselines.mdx
- code/python/p01/seed.py
- code/python/p01/pipeline.py
- code/python/p01/samples_features.py
- code/python/p01/learning_problems.py
- code/python/p01/split_generalization.py
- code/python/p01/optimization_loop.py
- code/python/p01/capacity_baselines.py
- oracle/p01/arithmetic_oracle.py
- oracle/p01/test_foundations.py
- oracle/p01/capacity_counterexample.py
- oracle/p01/generate_fixtures.py
- oracle/p01/manifest.json
- fixtures/p01/foundations.json
- tests/unit/p01/foundations.test.ts
- tests/unit/p01/lesson.test.ts
- tests/e2e/p01/foundations.spec.ts
- documentation/parts/p01/NUMERICS.md
- documentation/parts/p01/INTEGRATION_REQUESTS.md
- documentation/parts/p01/HANDOFF.md

No data files or asset downloads were needed: the explicit toy rows and seeded-generation rules reside in their executable references.
