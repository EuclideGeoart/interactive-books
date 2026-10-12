# M10 — Part VI Optimization implementation and focused evidence

Date: 2026-10-12 (Europe/Berlin). Branch: `feature/book-ii-part-vi-optimization`.
Worktree: `/work/interactive-books-part-vi/Interactive-Mathematical-Foundations-Book`.

## Provenance and delivered curriculum

Common accepted M7/M8 baseline: `cdf2ebd5428d80999dcf52f93a8e3c0eee0ac167`.
Block A: `37f2e8c8938a37307755aa7eb7276110343ca1a2`.
Block B: `4cb4500369e24d26107bb5842654477d50139022`.
Block C and complete implementation source: `0be17217f6f9ee6e5dcd35aca9f29c5a5a8e4f60`.
Each block was committed before the next began. This report is a subsequent documentation commit; the integration report records its resulting branch HEAD.

Part VI is 10/10 complete, with **50 graded exercises**, worked corrective feedback and solutions, **20 runnable standalone Python references** (one pedagogical and one NumPy per chapter), and **63 new Linux screenshot images**. Branch-local publication is **69/97 available, 28 planned**; Part V remains planned here. VI.4 retains the authoritative FLAGSHIP role. Every chapter has the established opening explorer, narrative sections, immutable worked example, reference code and five exercises.

| Chapter | Route | Main interaction |
| --- | --- | --- |
| VI.1 | `/chapters/objective-landscapes/` | Objective parameters, candidate point, actual gradient/Hessian and nonsmooth/domain examples |
| VI.2 | `/chapters/local-global-optima/` | Analytic stationary sets, local/global distinctions, saddles and degenerate points |
| VI.3 | `/chapters/convexity/` | Manipulable chord and epigraph with counterexample gap |
| VI.4 | `/chapters/gradient-descent/` | FLAGSHIP: immutable step replay, contour path, evaluated table and consistent inspector/alternative |
| VI.5 | `/chapters/learning-rate-convergence/` | Quadratic eigenmode stability and actual slow/oscillating/divergent histories |
| VI.6 | `/chapters/momentum/` | Explicit previous/new velocity and unnormalized momentum convention |
| VI.7 | `/chapters/stochastic-mini-batch-descent/` | Fixed per-example losses, selected indices, averaged gradient and uint32 seed replay |
| VI.8 | `/chapters/adam/` | Raw moments, t=1 bias correction, epsilon outside root and signed-history probes |
| VI.9 | `/chapters/constraints-regularization/` | Explicit feasible initialization, box/disk proposal/projection and separate L2 objective |
| VI.10 | `/chapters/optimization-diagnostics/` | Raw-gradient/loss-change/budget/failure stops and visible unclipped/clipped update comparison |

## Mathematical and presentation architecture

Canonical settings feed pure models in `src/math/optimization/`, pure transitions, deeply copied/frozen evaluated traces, and the reusable adapter/stage. The rendering component contains control wiring and house UI primitives, without its own derivative or optimizer calculations. House Calculus polynomial differentiation, plane/contour/curve presentation, rational quantities, range-safe vector normalization and Probability seeded sampling are reused. One stored run feeds replay, formulas, arrows, table, inspector and model-built descriptions. A failed next evaluation remains explicit; no path is adjusted to look favorable.

The scope is deliberately one or two parameters and 1–40 iterations. Supported objectives include a shifted positive-curvature quadratic, double well, cubic, saddle/peak, quartic degeneracy, absolute-value kink, logarithmic domain and fixed four-example regression. Classical derivatives at the kink and values outside the log domain are undefined, without a substituted subgradient. Stationary classifications and whole-domain convexity are analytic for these examples.

Exact rational calculations and binary64 trajectories remain separate. The canonical quadratic's first step has exact next point `(3/2,0)` and loss `9/8`. Stable shifted/weighted quadratic evaluation avoids an unnecessary unweighted-square overflow. Other finite evaluations guard loss, gradient and Hessian. The parameter-norm divergence sentinel is explicit: normally 1,000,000; the quartic non-finite diagnostic preset declares `10^300` so its real failed evaluation can be inspected.

Momentum uses `v_next = beta*v_previous + gradient`, then `theta_next = theta - eta*v_next`. Mini-batches sample ordered slots with replacement from the fixed four observations, retain repeated indices and before/after uint32 LCG state, and evaluate full-data losses separately from the sampled update gradient. Unbiasedness is stated under ideal conditional iid uniform sampling, not inferred from the deterministic seed.

Adam follows Algorithm 1, first time 1, zero initial moments, componentwise square-root scaling, and positive epsilon outside the root. Its bias denominators use `expm1` to avoid cancellation in `1-beta^t`. Non-finite moment transitions are rejected before accepting an update. Zero current gradients can retain a movement through nonzero history; the adaptive rule supplies no global-optimality claim.

Projection supports the fixed box `[-1,1]^2` and unit disk. An infeasible requested start is visibly recorded and projected before evaluation. Each constrained step retains the unconstrained proposal, projection correction and actual displacement. The separate L2 penalty adds `lambda*||theta||^2` to the objective, `2*lambda*theta` to its gradient and `2*lambda*I` to its Hessian. A finite penalty does not guarantee hard feasibility.

Diagnostics check valid objective/gradient, enabled raw-gradient threshold, exact zero gradient, finite transition, finite next evaluation, divergence boundary, enabled absolute loss-change threshold, then budget. Zero disables the two thresholds and clipping. Clipping retains the raw gradient, norm, scale, applied gradient, unclipped comparison displacement/arrow and actual update. Raw gradient, small loss change, clipping and budget exhaustion are not global-minimum certificates. Optional user interruption was omitted; immutable replay controls are present.

## Independent mathematical evidence

Python owns all three deterministic fixtures and exact-byte `--check` freshness. Expectations are not generated from TypeScript.

| Family | Independent methods | Cases / self-tests | Observed TS error / allowance |
| --- | --- | --- | --- |
| `optimization_landscapes` | Independent polynomial/analytic derivatives and dyadic exact descent | 110 landscape cases plus exact descent; 13 tests | 1 scaled ulp / 8 |
| `optimization_dynamics` | Fraction closed-form GD, unrolled weighted momentum, integer LCG, Fraction Adam histories with Decimal80 roots/updates | 66 cases; 18 tests | 16 scaled ulps / 128 |
| `optimization_constraints` | Fraction histories and completed squares; separate Decimal80 expanded affine recurrence/radial projection; KKT and finite-policy checks | 77 cases; 29 tests | Evaluations 1 / 8; trajectories 3 / 128 |

All **60 Python self-tests** pass and execute all 20 references. Statuses, counts, seeds/indices, zero outputs and applicable null policies are checked exactly. Scaled ulps use `ulp(max(1,abs(expected)))`. Existing numerical and 0.004 visual tolerances were preserved.

For zero-decay Adam near zero, an ideal-arithmetic trajectory is sensitive to rounding of earlier iterates. Every ideal fixture transition is checked, and each actual binary64 transition in this sensitive probe is independently checked at its actual inputs with Fraction/Decimal80 using the same 128-ulp bound. This is a local transition check, not a blanket trajectory accuracy guarantee for arbitrary hyperparameters.

## Actual focused verification

Machine-readable evidence: `M10_BLOCK_A_FOCUSED_EVIDENCE.json`, `M10_BLOCK_B_FOCUSED_EVIDENCE.json`, `M10_BLOCK_C_FOCUSED_EVIDENCE.json`. Original logs and failed screenshots remain in this worktree's ignored `validation-results/` directories; failures were not rewritten as uninterrupted passes.

- Block A: 290 focused checks, subsequent stored-trace/window checks, 64 desktop/mobile chapter contracts and both-theme axe checks, all interaction/exercise/replay cases covered by the documented repaired continuations, and 24 reviewed images.
- Block B: 214 mathematical/parity checks and 182 lesson/exercise/curriculum/planner checks; 78/80 browser checks initially passed, and the two stochastic reset canaries passed after their precondition was fixed. 24 additional images were reviewed. Its 24-case visual comparison also preserved Block A images.
- Block C: 252 prior-model/view regression checks; 147 constraint/parity/all-exercise checks; 133 content/curriculum/planner checks. 38/40 browser checks initially passed, and both failed desktop feedback axe cases passed after resetting scroll before the full-page audit. 15 additional images were reviewed and their six visual cases compared successfully.
- Final focused Astro check: **0 errors, 0 warnings**, five existing unrelated hints. Complete root production build: 73 pages.

Counts above are per actual focused invocation and overlap; they are not summed into a fictitious unique-test total. Linux desktop, tablet and mobile screenshot images were individually inspected, including undefined, clipped and failed-history states. Desktop/mobile browser coverage includes keyboard, touch/pointer, rejected numeric input, reset, immutable replay, reduced motion, MathML, model-built alternatives, 44px controls, feedback and both-theme axe.

Failed-then-fixed cases include negative-zero normalization and immutable summary handling; duplicate explorer/worked table/formula region names; domain explanations; the test's arrowhead endpoint convention; stored-run replay; loss-slice range/axis labels; large quadratic intermediate overflow; Adam bias subtraction cancellation; a stochastic reset test clicking an already disabled canonical Reset; and a feedback axe scan partly occluded by its final sticky-header scroll position. The latter now starts at the top, consistent with the initial audit and existing stage helpers; no axe rule or size assertion was relaxed.

## Visual inventory and performance

New images in `tests/e2e/__screenshots__/visual-optimization.spec.ts/`: VI.1–VI.8 each have opening/exceptional images on desktop/tablet/mobile (48); VI.9 has box/disk images (6); VI.10 has opening/clipped/non-finite images (9). Total **63**, all reviewed. Only new Optimization baselines were generated. Publication-sensitive contents/map images remain at the accepted 59-chapter baseline for the integration owner to refresh once, at 79/97.

Reproduce the saved model/adapter measurement from the book root with `node documentation/M10_OPTIMIZATION_PERFORMANCE.mjs`. Node v24.18.0, 200 varied starts per optimizer, 40-step budget and warmed fixed-landscape caches gave medians 0.148–0.861 ms and p95 0.212–1.235 ms. Maximum observed 2.651 ms. These are pure trace/adapter timings, excluding browser layout, paint and physical input latency; detailed results are retained in Block C evidence.

## Resource boundaries and remaining combined acceptance

Heavy direct builds, tests and browsers used `/tmp/imf-heavy.lock`; T0 acquires its own lock and is never double-wrapped. Approximately 23 GiB remains free on `/`, above the 15 GiB heavy-work threshold. Existing Node package links and Python environment were reused with local caches. No installations, clones or automatic cleanup were used.

No isolated `validate:milestone` or `validate:exhaustive` was run. This is complete implementation and focused evidence, ready for the commissioned **single combined M9+M10 milestone**. Statistics is independently approved at `218ab4df627f3231c9fe6e9808adb419197c524b`; it was never edited. The next work occurs solely in `/work/interactive-books-m9m10-integration`, beginning at the complete Optimization HEAD and merging that Statistics revision with two parents.

Root/subpath combined acceptance, integrated navigation boundaries and the 79/97 publication images are the next phase. Windows rendering, physical devices, manual screen-reader use and exhaustive release certification remain deferred. Book I, canonical checkout, main, original accepted M7/M8 branches and Git history remain intact. No push/deployment, worktree removal or Part VII implementation is included.
