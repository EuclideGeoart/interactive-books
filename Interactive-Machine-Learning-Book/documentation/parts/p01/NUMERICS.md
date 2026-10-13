# Part I numerical contract

Agent B3-P01. Scope III-01–III-06. Handoff base: 8157b7af7e209d94fffdf79001134b6e18744d34, tag book-iii-wave-a-trace-keys-20261013. No frozen III-07, shared, protected-book or other Part source is changed.

## Models and canonical code

- model/foundations.ts: PipelineState/derivePipeline/pipelineUpdate/pipelineTrace; FeatureState/deriveFeatures/featureTargetKind; TaskState/deriveTask and declared scenarios.
- model/splits.ts: SplitState, seedSplit/assignSplit/shiftSplit/deriveSplit/splitTrace, pointer destination adapter splitDrop, leakageExample.
- model/capacity.ts: CapacityState, capacitySplit/capacityData/assignCapacity/presetCapacitySplit, fitCapacity/polynomialPrediction/deriveCapacity/capacityCandidates/capacityTrace.
- lesson.ts projects the authoritative numerical objects into formulas, inspectors, speech and SVG geometry. Capacity label size receives the measured SVG width.
- Canonical Python files mirror those mechanisms in code/python/p01. pipeline.py and optimization_loop.py import the accepted p02 affine reference; no competing affine optimizer exists.
- numeric.py supplies one Part-local finite primitive-number predicate to the Python references: ordinary int/float quantities are valid; bool, strings, containers, nonfinite values and integers beyond finite binary64 range are rejected. Integer-only dimensions/seeds keep their existing integer contract.
- Python seed.py and shared platform/seed.ts reproduce the same unsigned 32-bit LCG. Noise and membership seeds are independent choices.

CapacityState retains compatibility with {seed, degree, noise}; absent memberships mean the documented interleaved grid. Optional assignments map every ID to train/validation/test; splitSeed defaults to 42; source records interleaved/seeded/manual/distribution-shift. UI mutations use assignCapacity/presetCapacitySplit, which reuse Part-local assignSplit/seedSplit and preserve IDs and observations.

All models return new values and do not mutate their input. Traces use accepted traceFrom to detach and deeply freeze full states, including maps whose IDs are __proto__. Editing replay starts with the exact displayed state; it clears frames. Explicit reset/replay/seek increments the control revision. Manual numeric edits keep field keys stable and preserve focus.

## Shapes, units and provenance

Mathematical feature, target and parameter vectors are columns. A batch stores sample vectors transposed in rows: X is n×d, W d×1, and scalar targets n×1. The affine predictor broadcasts bias separately. The polynomial design explicitly includes column 1 for its intercept; degree d gives X n_train×(d+1) and θ (d+1)×1.

The pipeline's five observations are the accepted hand-authored toy batch. The feature inspector's six records are hand-authored and illustrate study/sleep hours, integer task counts and score/category targets. Task decisions use six literal semantic examples, not model predictions. The split experiment uses six hand-authored x values [0,1,2,3,4,10], paired observations at each, and y=2x+1. Different IDs in one group are repeated observations, not independent evidence.

The capacity experiment's seventeen dyadic grid inputs and signal 1+2x−x² are hand-authored. Bounded synthetic noise is generated from the displayed noise seed, with amplitude times one of −1, −.5, 0, .5, 1. Default even zero-based grid indices train (IDs p1,p3,…); odd indices validate (p2,p4,…). Seeded partitioning uses a separate split seed. No seed is claimed for original observed values in the group experiment.

Seeded split units are sorted by UTF-16 code-unit order, shuffled with descending Fisher–Yates, and assigned floor(.6m) training and floor(.2m) validation units, each at least one, with remaining units testing. At least three units are required. Returned samples and assignment keys have deterministic sorted ID order. Duplicate identity uses numeric (x,y) pair equality in Python, so (1,2) and (1.0,2.0) are the same observation values. Warning text is formatted separately (including signed zero and small exponent notation) to match the browser’s bounded numeric presentation. Group-preserving moves are atomic. Every ID belongs to exactly one partition; duplicate-value and group leakage are reported separately.

## Mathematics and independence

Affine residual is prediction−target. MSE is the average squared residual without one-half. Analytical gradients are dw=(2/n)Σr_i x_i and db=(2/n)Σr_i. The simultaneous update uses both old-state derivatives and calls the frozen predictor/step API.

Arithmetic literals: canonical MSE 4.1, gradients −5.2/−1.6, new w/b 1.02/.16, and new MSE 1.7064. The separate Fraction oracle derives these values rather than copying Python outputs.

Baseline is the training-target mean, derived by minimizing Σ(c−y_i)². It is evaluated unchanged on each partition. Empty training means no baseline. Empty evaluation means no MSE. Numeric zero is never substituted for absence.

The seeded feature-centering counterexample has seed42 training x=[1,3], y=[−1,1], held-out x=11,y=9. Fixed predictor x−mean gives honest MSE0 and whole-feature-centering MSE9. Whole-target baseline mean0→3 makes held-out MSE81→36. Both leaked computations are invalid regardless of the direction of change. Capacity's optional invalid whole-target baseline uses its own actual seventeen rows; it never affects fitting or selection.

Polynomial fitting in both canonical runtimes uses two-pass modified Gram–Schmidt QR and triangular back substitution. Before fitting, insufficient distinct inputs returns a uniqueness reason. After projection, a column norm ≤1e−12×||X||_F returns CAPACITY_RANK_REASON. This is one explicit bounded QR decision, not NumPy SVD's relative rcond rule.

The independent Fraction oracle solves exact moment/normal equations by Gaussian elimination, evaluates polynomials as explicit power sums, and checks the rank criterion with exact unnormalized orthogonal projections. NumPy SVD/lstsq is a second independent check on all ordinary fixture fits. The supplied near-rank case x=.5±1.3e−12,.5 and y=2x+1 is an actual fixture: both canonical/browser QR paths reject it, exact projected norm also falls below cutoff, and SVD singular values are independently recorded. No wide numeric tolerance converts rejection into acceptance.

Seed/order reproduction uses an independent closed-form LCG recurrence, not another copy of the iterative update. Membership invariants are independently checked as disjoint sets whose union preserves all units. Semantic-task expectations use a literal truth table; shapes use exact dimensional checks.

Degree candidates are 0–8, using fixed active observations and memberships. Selection considers validation MSE only; a candidate must improve by more than 1e−12, so the smaller degree wins a tie. No defined validation loss yields no chosen degree. Test targets/results are initially hidden, and every mathematical edit hides them again. Reveal is a teaching convention, not a security boundary or a way to erase prior test inspection.

## Bounds, failure reasons and tolerance

The pipeline sheet uses |w|,|b|≤4, |x|,|y|≤5, .001≤η≤1. Frozen arithmetic also validates 1–64 rows, IDs, finite inputs and intermediate arithmetic. Inference has prediction but no observed query residual/loss/update.

Feature state stores six rectangular three-value rows, chooses n=1–6 and d=1–3, and validates units/integer counts and target semantics. A schema switch loads that target type's declared preset. Unlabelled y is absent.

Split state has 3–64 rows, unique nonempty IDs/groups, finite |x|≤20 and |y|≤50, an unsigned seed, and complete memberships. Capacity fit has degree0–8, at most64 rows, finite |x|≤1, |y|≤10 and unique IDs; noise amplitude is0–2. Empty/rank-deficient fits have explicit reasons. Constant/one-row degree0 remains valid.

Ordinary arithmetic comparisons use 1e−11(1+|expected|). Capacity uses 1e−8(1+|expected|), checked against exact Fractions and SVD, accommodating monomial conditioning and extrapolation on the shifted half-grid. Canonical reference's own tolerance remains unchanged. Rank decisions, IDs, shapes and seed/order checks are exact.

State is binary64. Given numbers use round-trip String(number). Computed outputs use an approximation sign and display rounding only. Symbolic identities remain exact; rounded parameter substitutions use approximately. Keyboard numeric increments retain ordinary binary64 precision, and no Part-local decimal quantization is added. Invalid edits preserve valid state with an input error or visible action reason.

## Rendering and interaction contract

Every stage requires a stable scope:string unique within its page; it wraps IdScope and derives internal IDs with useScopedId. MDX uses distinct p01 scopes; reused RegressionStage uses p01-optimization-reference. A duplicate reuse must provide a different scope.

Capacity viewBox is 0 0 640 400. Projection is cx=48+(x+1.1)×544/2.2 and cy=352−(y+3)×304/7. Axes have deliberately different scales, disclosed alongside the graphic. Display y range is [−3,4]. Clipping never changes table values. Numeric geometry and responsive font size max(16,14×640/renderedWidth) come from the pure adapter.

Training markers are squares, validation circles, test triangles. Solid fit, dashed known signal and dotted baseline identify roles without color. Meaningful axes/ticks use the accepted muted token; strokes are non-scaling. Membership columns stay adjacent on mobile to permit nearby pointer destinations. Buttons have ≥44px target dimensions; only ID handles set touch-action:none. Arrow moves restore handle focus. Reset or state replacement cancels a held membership drag; pointermove does not announce mathematical updates because assignments commit at drag end.

data-pipeline/data-features/data-task/data-split/data-capacity identify stages. State seeds, degree, coefficient JSON, training ID JSON and baseline are exposed on capacity root. Rows expose ID, partition, x/y, prediction, residual and squared error; scalars expose data-value/data-number. Undefined and deliberately hidden outcomes use explicit strings, never NaN. SVG data-point-id and cx/cy or data-cx/data-cy allow independent physical projection tests. Formula MathML/annotations, table, inspector, speech and controls come from the active derived state.

No motion or timers are introduced. Reduced motion leaves replay manually operable.
