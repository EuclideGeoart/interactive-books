# Book III Part I source handoff

B3-P01: III-01–III-06. Recommended classification: **CORRECTION REQUIRED pending integrator rerun**, following the failed type/content gate at the initial handoff; the scoped source corrections below pass focused units but have not received a heavy rerun. Acceptance belongs to the integration owner.

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
- code/python/p01/numeric.py
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
- documentation/parts/p01/validation/boundaries-before-c588aa2-fix.log
- documentation/parts/p01/validation/root-browser-failure-68e0212/browser-root.json
- documentation/parts/p01/validation/root-browser-failure-68e0212/integrator-focused-validation-68e0212.log
- documentation/parts/p01/validation/root-browser-failure-68e0212/manifest.json
- documentation/parts/p01/validation/root-browser-failure-68e0212/evidence.json

No data files or asset downloads were needed: the explicit toy rows and seeded-generation rules reside in their executable references.

## Follow-up correction after the 59de0fa type/content failure

Initial source handoff commit: 59de0faec704a6599a74a3b3fb9cc6195de002a4. Integrator focused run focused-2026-10-13T16-05-58-122Z stopped at the type/content gate with six errors. Its failed manifest and artifacts/integrator-focused-validation.log are preserved; no validation runner was invoked for this correction. The raw log SHA256 remains 1553e04f7fe3be214862c2fcf4da1c6f4392e3e0cbaa79a28095ef00108a44fd.

The correction commit changes only four P01-owned files:

- src/parts/p01/model/foundations.ts: after the runtime array guard, restore the declared readonly FeatureSample[] container. Validation values/indices and derived X rows retain numeric inference; this also fixes FeatureStage.tsx's implicit-any rendering callback without annotating or asserting its values.
- src/parts/p01/model/capacity.ts: type the SplitState container, [string, Partition] entry tuples, assignment record and returned CapacityState. Partition literals no longer widen to arbitrary strings. No loose any, callback assertions or strictness relaxation is added.
- tests/e2e/p01/foundations.spec.ts: bound document.documentElement.scrollWidth and innerWidth independently against page.viewportSize().width. An expanded mobile layout viewport can no longer make the old overflow assertion pass.
- documentation/parts/p01/HANDOFF.md: record the failed gate, corrections, exact light verification and pending rerun.

Verification for this correction: node node_modules/vitest/vitest.mjs run tests/unit/p01 --maxWorkers=1 — **34 tests passed in two files**, duration1.03s (2026-10-13, start18:09:58); git diff --check passed. Existing fixture parity is unchanged. Canonical Python and goldens were not modified, so their prior checks were not repeated.

Full type/content, build and browser gates have NOT been rerun by this agent; the revised physical-width assertion remains unexecuted. No shared/platform/reference/config or failed-evidence file is edited. The exact correction SHA is returned in chat so the integration owner can synchronize the independent reviewer working at 59de0fa. Hold for owner allocation and independent review; no acceptance or freeze is claimed.

## Avicenna boundary/parity corrections after c588aa2

The independent source review at 59de0fa identified three P2 defects. The owned corrections are:

1. TypeScript categorical targets require typeof target === string before membership testing. Arrays such as ["ready"] and objects cannot become a nested cell disguised by the n×1 target shape. Python uses the same explicit string boundary.
2. A small Part-local Python numeric.py predicate rejects bool/nonnumeric inputs before isfinite, comparisons or NumPy conversion. It is applied to pipeline queries, capacity noise, fit x/y, polynomial inputs and coefficients, split x/y and the preprocessing distance, and reused by the feature inspector. Ordinary int/float quantities remain valid; huge-int conversion overflow yields rejection. Frozen III-07 numeric/trace validation continues to supply its existing strict parameter/sample/step checks without changes.
3. Python duplicate detection groups numeric (x,y) pairs, independently of textual spelling. Thus training (1,2) and validation (1.0,2.0) report ['1|2']. Display formatting is a separate bounded number formatter; signed zero, 1e−7 and 1e−6 presentation also have matching regressions.

Matching regressions were added to tests/unit/p01/foundations.test.ts and oracle/p01/test_foundations.py. Three new TypeScript tests cover category array/object inputs, numeric JSON rejection and int/float duplicate identity. Three new Python methods cover the same boundaries, including 135 invalid-input subcases across 15 entry/helper paths and positive ordinary-number cases.

Before fixing source, the focused TypeScript run failed the categorical-array regression. The focused three-method Python run reproduced the bool/coercion/overflow and duplicate defects (29 failed subcases and 75 errored subcases). Complete original output is preserved at documentation/parts/p01/validation/boundaries-before-c588aa2-fix.log; no prior integrator evidence was overwritten.

After correction, node node_modules/vitest/vitest.mjs run tests/unit/p01 --maxWorkers=1 passed **37 tests in two files** (24 kernel/boundary/parity,13 lesson/source/render; duration3.24s, start18:20:01). .venv/bin/python -B oracle/p01/test_foundations.py passed **17 tests** in3.853s. .venv/bin/python -B oracle/p01/generate_fixtures.py --check passed; normal golden outputs are unchanged. git diff --check passed.

This follow-up changes only the owned feature model, four canonical Python references plus numeric.py, the two focused regression files, NUMERICS.md/HANDOFF.md and the new owned failing-evidence log. No frozen/shared/config/other-Part source or golden file is changed. Full type/content, production and browser acceptance remains pending; no heavy job was run. The correction SHA is reported in chat for integrator/reviewer synchronization.

## Root-browser corrections after 68e0212

The integration owner ran the full focused pipeline at 68e02120dcdf8b5436e55871aba913a07c6ac6c6. Its first seven gates passed, including type/content with zero diagnostics,54 units, the oracles, production builds and audits. Root browser results were69 passed/9 failed; subpath browser validation did not run. Six failures were the definition-list rule in III-04/III-06 across three viewports; three were excessive world-unit precision applied to CSS bounding-box measurements.

Original evidence is preserved byte-for-byte under documentation/parts/p01/validation/root-browser-failure-68e0212/: browser-root.json, integrator-focused-validation-68e0212.log and the failed focused-2026-10-13T16-28-46-181Z manifest.json. evidence.json records original paths, byte counts and SHA256 hashes. The original files also remain unchanged.

Owned source/test corrections:

- SplitStage.tsx and CapacityStage.tsx wrap helper paragraphs in separate dd descriptions. Scalar dd text and data-value/data-number selectors remain unchanged. No Axe rule is disabled.
- lesson.test.ts adds a meaningful rendered-HTML definition-list regression using the installed parse5 parser, including the requirement that scalar definitions remain plain text.
- foundations.spec.ts reads actual SVG coordinate attrs and compares them independently with expected row-data projections at1e−9 absolute world-unit tolerance. Painted marker centers are compared in CSS pixels with0.02 absolute tolerance, accounting for browser BBox quantization; numerical/golden tolerances are unchanged.
- NUMERICS.md/HANDOFF.md document semantics, tolerance rationale, failed evidence and exact verification.

This agent ran only node node_modules/vitest/vitest.mjs run tests/unit/p01 --maxWorkers=1: **38 tests passed in two files** (24 kernel/boundary/parity and14 lesson/source/render), duration1.07s, start18:36:20. No mathematical/Python/fixture source changed, so its previously passed checks were not repeated. Full type/build/browser reruns have NOT been run for this correction. git diff --check passed. Hold for integration-owner allocation and acceptance; the correction SHA is returned in chat.
