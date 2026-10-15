# Part VIII numerical and presentation contract — unvalidated source

## Input and fitted procedure

`State` contains complete hand-authored regression rows and forecast rows, unsigned integral seed, 2–4 folds, threshold in [0,1], workflow phase 0–4, cancellation parameter t in [1,10¹²] and separation δ in [10⁻¹²,.1]. Experiment regression input has 8–64 uniquely identified rows; each raw feature batch row has exactly one real finite number or explicit null, one finite target and a nonempty group. Forecast input has 1–64 unique rows, binary real labels and probabilities in [0,1]. Boolean numbers are rejected. TypeScript rejects sparse holes. Canonical Python normalizes real numeric scalars to binary64 before computation; complex and nonrepresentable numbers are rejected.

Mathematical xᵢ and w are 1×1 columns; batches X and y store n×1 rows. Imputation uses observed training mean. Scaling uses mean and population RMS deviation of imputed training rows, scale 1 for exact constant data. All-missing training input is unavailable. Engineering uses one φ=zᵖ for p=1 or 2. Intercept is unpenalized, objective is MSE+λw². The zero-variance λ=0 convention chooses w=0, b=mean(y). No arbitrary polynomial dimension, AutoML or learned calibration layer is added.

## Splitting, selection and final evaluation

Sort unique group strings in UTF-16 code-unit order (JS default sort, explicit Python encoding), then descending Fisher–Yates using frozen u32 LCG draws. One draw per swap. First shuffled group is test; remaining groups assign to validation by round-robin. Within every membership, preserve input row order. All rows of a group remain together. This is not stratification, chronological splitting or nested CV.

Six grid candidates: p ascending [1,2], λ ascending [0,1,4]. Every candidate/fold refits all preprocessing only on fold training IDs. Select strict minimum equal-weight mean fold validation MSE; first exact tie wins. Refit the selected p and λ with training-only preprocessing on all development rows. Test values do not influence selection, preprocessing fit, final model parameters or curves. Test evaluation occurs after selection/refit; its MSE is descriptive for one held-out synthetic group.

Learning curves use whole-group nested prefixes of fold 1 training groups, ordered by the shuffled group order. Fixed fold 1 validation; each point refits the selected p and λ and stores preprocessing fit IDs, model, training MSE, objective and held-out predictions. Curves reuse tuning validation and explicitly do not claim unbiased final risk. There are no artificial confidence bands.

The leakage board always compares fold 1 at p=1, λ=1. Proper preprocessing fits on T; leaked preprocessing fits on T∪V. Both models fit labels only on T and evaluate exactly V. The independent literal example (training 0,2; held-out missing,10; targets 0,2,0,10) has proper MSE 85/8 and leaked MSE 36, difference 203/8. Contamination can worsen, improve or leave unchanged a displayed score; membership is the rule.

## Metrics and arithmetic

Positive iff p≥threshold. Precision, recall, balanced accuracy and F1 are null when their specified denominators vanish. F1 uses 2TP/(2TP+FP+FN). Balanced accuracy requires both actual classes. Brier is the mean probability squared error. Natural-log loss evaluates true-class probabilities; true-class probability zero is null with an unbounded-loss reason, without clipping. Reliability bins are [0,.2), [.2,.4), [.4,.6), [.6,.8), [.8,1]. Empty means/frequencies are null. Threshold cutoffs include all observed probabilities plus 0 and 1. Original Brier is 39/200; bin counts 1,2,2,1,2.

Model arithmetic is binary64. Means preserve exact constants; otherwise sum divided terms sequentially. Intermediate nonfinite results and nonzero products/quotients rounding to zero reject edits. No tolerance is used for selection. Oracle/parity comparisons use fixed absolute 2e-12 plus relative 2e-12 for bounded quantities; tiny nonzero numerical counterexample/parity quantities use relative comparison with zero absolute tolerance. These tolerances are authored, unexecuted and subject to owner review; they are not acceptance evidence.

Numerics computes actual binary64 nonassociativity, fragile root subtraction, stable rationalization, represented input spacing, its reciprocal and subtraction condition estimate. Stable arithmetic cannot correct ill-conditioned input uncertainty or represent information lost before input.

## UI and provenance

`useLesson` holds the authoritative input state; `derive` returns one numerical experiment and its geometry, inspector and speech. Forecast row error cells also come from that result. Scoped SVG IDs prevent collisions. The first Stage contains exactly one `data-state` JSON marker and a `data-numerical` result marker. Workflow, curve and reliability SVGs project that result; no renderer fits a separate model. Numeric controls, selectors, presets, reset and immutable replay are synchronous. There are no drag handles or pointer/touch interception; native surrounding scrolling remains available.

The provenance JSON includes complete edited inputs, data version, exact split draws, hyperparameters, transform memberships/state and development fit. It is a labeled tabindex=0 scroll region within an expandable details element. It does not invent actual machine/environment versions. Model arithmetic is eager; the final-test button reveals its presentation and is not a security boundary. Users can intentionally inspect test rows in this educational board; after-test tuning invalidates the final-test interpretation.

SVG font sizes are derived from measured rendered width for >=14 CSS px, and controls have >=44px targets. Tables use house bounded labeled scroll conventions. Both themes use existing role tokens. Physical layout, hydration, accessibility, browser behavior and production mounts have not been checked by the implementer.
