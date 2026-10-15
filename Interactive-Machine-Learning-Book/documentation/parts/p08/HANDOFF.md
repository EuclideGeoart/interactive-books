# Book III Wave D Part VIII — source-ready owner handoff

Original implementation source commit: **02d8c5d3409d775ed52b9144be4955bd26cfcc77**. Original handoff commit: **4858f37611e30bf0199b8cc2fea0b9cda147e4ef**.

Source correction commit: **96b5dd2652ab9bcabfa04e7f2b0a3cd91ac24a69**. The complete provenance JSON now includes `board: n.board`, exposing actual u32 draws, group order and development/fold/test memberships. The authored expanded-provenance browser test asserts `record.board` equals the actual numerical board. This correction changes only `src/parts/p08/EvaluationStage.tsx` and `tests/e2e/p08/evaluation.spec.ts`; this updated record is delivered in the following documentation-only commit, whose exact SHA is supplied in the final author message. No validation was executed; status remains UNVALIDATED.

Visual correction: validation rectangle markers now have a scoped transparent fill (`.p08-lab rect.p08-validation-dot { fill:none; }`) so coincident constant-data training dots remain visible. Workflow circle styling, numerical state and geometry bounds are unchanged. This correction is delivered with this handoff update; its exact commit SHA is supplied in the final author message. No tests, checks or captures were executed; actual constant-data pixels remain for owner inspection. Status remains UNVALIDATED.

Node ESM discovery correction: the model data import now explicitly uses `with { type: 'json' }` for `data/p08/experiments.json`. Source inspection of the Part VIII Playwright dependency path found this as its only JSON import; the separate unit fixture/manifest imports are not reached by native Playwright discovery. This addresses the owner-reported attempt4 discovery error without changing algorithms, fixtures, tolerances, baselines, packages or shared source. No author validation was executed; the correction remains UNVALIDATED pending the combined owner run. This correction and note are delivered together, with exact SHA supplied in the final author message.

Owner attempt5 browser corrections: parsed `data-numerical` is compared to the exact JSON representation of `experiment(s)`; initial/reset expectations also use their JSON representation, preserving signed-zero normalization without changing model outputs or tolerances. Exact replay, memberships and board equality remain. The native details disclosure is unchanged: source/failure review established it was open, while the frozen horizontal-overflow helper removed the vertically scrolling pre landmark. Provenance now uses a labeled focusable `div[data-experiment-record]` scrolling wrapper around a plain intrinsic-width, overflow-visible pre. Scoped max-height/overflow stay on the wrapper, preventing duplicate inner scroll landmarks. Authored SSR expectations target the wrapper; browser Enter/focus/ArrowDown/optional ArrowRight and full JSON/board assertions remain, with an added no-nested-region assertion. No author validation was executed; this correction remains UNVALIDATED and is delivered with this note, exact SHA supplied in the final author message.

Allocated worktree: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/book-iii-part-viii-evaluation`.
Branch: `feature/book-iii-part-viii-evaluation`.
Initial HEAD and resolved annotated freeze tag: `e26a8ba88e949168e9c1f3213099b86c8cc8cfa8`.
Initial status was clean. Common Git database: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books/.git`.

The author worked only in the allocated linked worktree and eight owned prefixes. No shared registries/config/styles/dependencies, frozen Parts/III-01–31, protected books, baselines, evidence or reference footprint were changed. No push, merge, deployment, reset, clean, history rewrite, nested agent or new chat occurred.

## Authored chapter inventory — not acceptance

- III-35 Cross-Validation and Hyperparameter Tuning: exact group memberships; actual per-fold preprocessing and ridge fits; six-candidate ordered grid; training objective versus held-out MSE; exact tie selection; development refit and final test presentation.
- III-36 Learning Curves and Model Selection: actual fits on nested whole-group prefixes; fixed held-out membership; fitted transform/parameters; training MSE and penalized objective separately; explicit reused-tuning-validation limitation.
- III-37 Class Imbalance, Calibration and Metric Choice: >= threshold; confusion counts; accuracy, balanced accuracy, precision, recall and F1 with undefined cases; cutoff PR tradeoff; Brier and natural-log scores; documented fixed reliability bins.
- III-38 Preprocessing, Feature Engineering and Pipelines: actual training-only mean imputation, population scaling, feature power and ridge fit; identical-row proper/leaked comparison; all fit IDs/state, transforms, predictions and held-out numerical difference; exact separate four-row leakage example.
- III-39 Reproducibility and Numerical Reliability: u32 split replay, complete edited-state provenance and fitted procedure; actual binary64 nonassociativity, stable/fragile root calculation and input conditioning; labeled keyboard-scrollable expanded provenance.

Each chapter has an opening Stage, intuition, definitions, derivation, literal worked example, actual canonical Python ?raw import, explorer, common mistakes, numerical limitations, connections, five graded exercises with corrective feedback and summary. Book II prerequisites use known IDs through the existing shell resolver. Every opening Stage contains one readable JSON data-state marker, data-numerical output and workflow SVG; scoped IDs and measured font-size projection support owner captures.

## Contracts and oracle independence

See `NUMERICAL_CONTRACT.md` for exact shapes, memberships, objective/metric normalization, seed/draw order, tie-breaking, transform order, missing values and arithmetic limits. Python+NumPy is canonical; TS implements the same pure bounded procedure. One derived numerical state drives tables, SVG projections, equations, inspector and speech. House Stage/CodeFile/Callout and NumberField/Formula/Inspector/TraceStepper/ChoiceExercise are reused. No dragging is needed; native page scrolling is preserved.

Oracles are distinct from canonical/browser closed-form arithmetic: Fraction metric/bin and preprocessing statistics; augmented NumPy least squares with SSE+nλw²; closed-form integer LCG draw reconstruction and fold/group invariants; Decimal rationalization and Fraction binary64 rounding. Authored tests exercise actual canonical Python CLI, full TS parity (including Unicode groups), held-out mutation independence, nested fits/objectives, degeneracies, boundary rejection and immutable snapshots when the OWNER executes them.

Owner source-only corrections incorporated: labeled focusable provenance scroll region plus open/keyboard-scroll coverage; sparse-coordinate test uses a normal array cast rather than deleting a required tuple property; Python and independent oracle use explicit UTF-16 code-unit group order, with U+10000/U+E000 parity coverage. Original ASCII fixtures and learning-curve selection-reuse warning are preserved.

## Exact changed paths

All paths below are relative to `Interactive-Machine-Learning-Book/`:

- `src/parts/p08/manifest.json`
- `src/parts/p08/model/evaluation.ts`
- `src/parts/p08/lesson.ts`
- `src/parts/p08/EvaluationStage.tsx`
- `src/parts/p08/stage.css`
- `src/parts/p08/chapters/cross-validation-hyperparameter-tuning.mdx`
- `src/parts/p08/chapters/learning-curves-model-selection.mdx`
- `src/parts/p08/chapters/imbalance-calibration-metrics.mdx`
- `src/parts/p08/chapters/preprocessing-feature-pipelines.mdx`
- `src/parts/p08/chapters/reproducibility-numerical-reliability.mdx`
- `code/python/p08/evaluation.py`
- `data/p08/experiments.json`
- `fixtures/p08/evaluation.fixtures.json`
- `oracle/p08/manifest.json`
- `oracle/p08/independent.py`
- `oracle/p08/check_fixtures.py`
- `oracle/p08/test_evaluation.py`
- `tests/unit/p08/evaluation.test.ts`
- `tests/unit/p08/parity.test.ts`
- `tests/unit/p08/lessons.test.ts`
- `tests/e2e/p08/evaluation.spec.ts`
- `documentation/parts/p08/NUMERICAL_CONTRACT.md`
- `documentation/parts/p08/OWNER_VALIDATION.md`
- `documentation/parts/p08/HANDOFF.md`

## Validation, fixture activation and remaining limits

**No validation was executed.** No unit/Python/oracle/fixture-generator/type/content/lint/build/compiler/browser/capture/benchmark/validation/exploratory correctness runtime ran. Only source reading, mathematical reasoning, authoring and Git inspection/staging/commits were performed. Passing counts, screenshot evidence, hashes and acceptance claims are absent. `OWNER_VALIDATION.md` records authored suite coverage and actual owner-only script entry points; it is not a run report.

Fixtures are hand-authored literals explicitly flagged UNVALIDATED. **No generator or activation is pending**, and no shared integration extension is requested. Owner must execute the registered self-tests and golden `--check`, actual canonical parity, content/type/build and browser/capture gates before accepting anything. All runtime correctness, hydration, layouts, themes, both mounts and physical font/target measurements remain unverified by this author.

Known scope limits: one raw/engineered scalar feature and transparent ridge; group allocation without stratification/time boundaries; one reused tuning-validation learning curve, no confidence bands/nested CV; separate hand-authored forecasts, no learned calibration or resampling trainer; one synthetic test group; eager local computation with final-test reveal as teaching presentation rather than an information-security boundary; no arbitrary-scale numerical guarantee, environment capture, native Windows/device/assistive-technology verification or production generalization claim. No known source-level shared blocker is outstanding; owner validation can reveal corrections.

Author stops after the clean committed handoff and remains available for precise owner corrections, always implementation-only.

IMPLEMENTATION COMPLETE — UNVALIDATED — OWNER VALIDATION REQUIRED
