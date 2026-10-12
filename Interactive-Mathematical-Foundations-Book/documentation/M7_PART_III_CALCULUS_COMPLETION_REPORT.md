# M7 — Complete Book II Part III: Interactive Calculus

Date: 2026-10-12. Production source validated: `60561e6`. Worktree: `/work/interactive-books-part-iii`. Branch: `feature/book-ii-part-iii`. Common starting commit: `9b0149902ab67a0f6b0dcfd9e7de90c88491808a`.

All fifteen Part III chapters (III.1–III.15) are implemented, published and integrated on this branch. Branch-local curriculum: **Part I 9/9, Part II 19/19, Part III 15/15, Part IV planned — 43/97 available, 54 planned.** No Probability (Part IV) content was created or imported; Book I, the canonical checkout, the Part IV worktree, the shared `node_modules` and `.venv` were not written to. Nothing was pushed, merged or deployed. Work stops here for independent review.

## 1. Branch history

| Commit | Content |
| --- | --- |
| `71144b4` | Block A: limits, continuity, secant → tangent, rate/linear model, derivative rules, chain rule (III.1–III.6); shared calculus stage; limits and derivatives oracles; T0 registration |
| `46c3988` | Block B: partial derivatives, gradient, Jacobian, computational graphs/AD, Hessian (III.7–III.11); multivariable and autodiff oracles |
| `827199f` | Block C: integrals as accumulation, fundamental theorem, numerical differentiation, numerical integration (III.12–III.15); integration oracle; Part III 15/15 |
| `3300766` | 43/97 publication captures, lighter Hessian model contours, drag-timing evidence |
| `fd91943` | First individual screenshot review: defects corrected (see §8) |
| `bdef68b` | Second review: removable hole in the quotient preset, phone-visible results |
| `60561e6` | Final review polish — the production source submitted to the milestone gate |
| (this report) | Evidence commit: this report and the saved milestone manifest (documentation only) |

`git log --oneline 9b0149902ab67a0f6b0dcfd9e7de90c88491808a..HEAD` reproduces the list.

## 2. Chapters, routes and interactions

Every chapter opens with a manipulable stage before any long text, then intuition → definition → mechanics → derivation → worked example (with an immutable replay stage) → exceptional cases → executable Python and NumPy → explore → common mistakes → numerical considerations → engineering/ML connections → five graded exercises → summary with the next chapter. Totals: **15 MDX chapters, 75 graded exercises, 30 executable Python reference files** (15 pedagogical + 15 NumPy).

| Chapter and route | Principal interaction and exceptional states |
| --- | --- |
| III.1 `/chapters/limits/` | Draggable sample point riding on the graph; blue left / green right samples at a ∓ δ; dashed limit line. Hole (0/0), value ≠ limit, jump, 1/x², 1/x, sin(1/x) (aliasing flagged as non-evidence), x·sin(1/x) squeeze. f(a) is never replaced by the limit. |
| III.2 `/chapters/continuity/` | Pieces x² + c and m·x with c, m, a and the value at 1 (left/right piece, custom v, none); the three conditions as exact yes/no rows; removable, jump, infinite, endpoint (√x, right-continuous) and local-versus-global. |
| III.3 `/chapters/derivative-secant-tangent/` | P and Q ride on the graph; secant, slope triangle, exact difference quotient and its polynomial in h; separately derived tangent. h = 0 is accepted and reported as division by zero. Corner (two one-sided rays), vertical tangent, jump, endpoint, binary64 sin. |
| III.4 `/chapters/derivative-rate-linear-model/` | Tangent model L(Δx), exact error segment, error-versus-Δx plane with ½f″Δx² parabola, halving table (e, e/Δx, e/Δx²). Far displacement, inflection, corner (no model). |
| III.5 `/chapters/derivative-rules/` | u = ax + b, v = x² + c; sum/product/quotient; product as area (vΔu, uΔv, ΔuΔv strips with exact increment identity); each rule checked by an independent route (expansion; u = q·v). Zero denominator: poles drawn dashed, a removable hole drawn as an open dot. |
| III.6 `/chapters/chain-rule/` | Three linked planes (inner, outer, composite) with actual Δu, Δy and local factors; exact composed-polynomial check; flat inner stage; large step; bridge to backward products. |
| III.7 `/chapters/partial-derivatives/` | Two-axis point on a contour map; x- and y-slice planes with exact tangent slopes; exact axis secants. |
| III.8 `/chapters/gradient-directional-derivatives/` | Point and relative direction handle; gradient arrow at a declared drawing scale; level tangent (∇f·t = 0 exact); D_u f = ∇f·u (exact when ‖d‖ is rational); profile of D_u f against angle. Stationary point and zero direction are undefined, never fabricated. |
| III.9 `/chapters/jacobian/` | Input square and δ; output local window with true curved image, Jacobian parallelogram, columns, actual and predicted changes; exact squared error against independent evaluation; shape row (m × n) and a rejected wrong-shape product; singular (det J = 0) and ℝ² → ℝ³ (3 × 2). |
| III.10 `/chapters/automatic-differentiation/` | **Principal algorithmic interaction.** Editable inputs; DAG of operation nodes with directed edges, local derivatives on edges, forward values, forward-mode tangents (one pass per seeded input) and reverse-mode adjoint accumulation (one pass per output); a cursor-bound trace drives the graph view frame by frame. Mandatory reference z = (x + y)·x: x receives 5 (direct) + 2 (via u) = 7 = 2x + y, y receives 2 = x. Also x·y + sin x, 3-input scalar loss, 1-input/3-output map (cost table), x·x (two edges into one node), division by zero (undefined propagates; no finite difference across it). |
| III.11 `/chapters/hessian-curvature/` | Exact Hessian with both mixed orders, determinant/trace classification, principal directions, curvature uᵀHu, contours of f versus its quadratic model. Minimum, maximum, saddle, double-well (min and saddle), monkey saddle, x⁴ + y⁴, x² + y³ (inconclusive), non-critical point. |
| III.12 `/chapters/integrals-accumulation/` | Limits a, b on the axis; n panels; left/right/midpoint/trapezoid; exact sums and integral; panels coloured by the sign of each contribution; positive/negative parts and geometric area split at exact roots; reversed limits; convergence table. |
| III.13 `/chapters/fundamental-theorem/` | f with accumulated positive/negative area from a to x and a strip [x, x + Δx]; exact piecewise F(x), ΔF versus f(x)Δx; F′ derived from F's own pieces; moving lower limit; x < a; a jump in f gives a corner in F. |
| III.14 `/chapters/numerical-differentiation/` | Forward, backward and centered binary64 quotients for h = 10⁻¹ … 10⁻¹⁶ on a log–log error plane against independent analytic references, with documented truncation + rounding budgets and best-step estimates. |
| III.15 `/chapters/numerical-integration/` | Four rules for n = 2⁰ … 2¹⁰; exact errors for x², x³ − x, |x − 1/3|; binary64 for sin and √x; log-error convergence plane; observed orders (1 and 2 for smooth integrands, ≈ 1.5 for √x). |

Navigation, contents, map and previous/next follow the curriculum: II.19 → III.1 → … → III.15 → IV.1 (planned).

## 3. Architecture and mathematical models

Canonical state → pure derivation (`src/math/calculus/`) → presentation (`src/lessons/calculus/`). Components draw only what `derive` returns; there is no mathematics in presentation components, no `eval`, no expression parser and no unbounded CAS.

* `polynomial.ts` — exact rational polynomials (evaluation, derivative, antiderivative, exact integrals, Taylor shift, composition, root division and multiplicity, rational roots for small lesson polynomials).
* `univariate.ts` — piecewise rational functions with **analytic** values, one-sided limits (common factors divided out; pole signs from root multiplicity), one-sided slopes and corners; a fixed set of transcendental functions (sin, eˣ, √x, ∛x, sin(1/x), x·sin(1/x)) with stated limits/derivatives.
* `limits.ts` (classification, approach tables at x ≠ a), `difference.ts` (exact secants; binary64 forward/backward/centered differences with budgets), `rules.ts`, `chain.ts`.
* `bivariate.ts` (exact two-variable polynomials, gradients, Hessians, slices, exact second-derivative test; marching-squares contours as a drawing aid only), `jacobian.ts` (shape-checked products, local linear model), `surfaces.ts`.
* `autodiff.ts` — operation graph, deterministic topological order (Kahn, ties by declaration), per-edge local derivatives, forward tangents, reverse adjoint accumulation with recorded contributions, undefined propagation, independent central-difference check.
* `integration.ts` — piecewise-polynomial integrands, oriented sums, exact integrals, signed parts split at exact roots, exact continuous accumulation function.

**Exact versus binary64.** Inputs are learner decimals with at most two places, converted exactly to rationals. Polynomial and piecewise-rational quantities are exact and shown with “=”; transcendental quantities are binary64 and shown with “≈”. Every undefined value states its reason. Plots are drawings: curves are sampled, contours are marching squares, and the text says that a picture (e.g. aliased sin(1/x)) is not evidence.

**Error policies.** Finite differences: truncation ≈ |f″|h/2 (one-sided) or |f‴|h²/6 (centered), rounding ≈ ε(|f(x±h)| + |f(x)|)/h plus step-representation error; budget = 4 × (truncation + rounding) + 4ε|estimate| (for these smooth functions; not a universal guarantee). Binary64 Riemann sums: within 4(n + 2) ε max|f| |b − a| of 60-digit sums. Plot sampling: 480 samples (1600 for sin(1/x)); curves are broken at poles, jumps and isolated point values.

## 4. Independent oracles and fixtures

| Family | Fixture cases | Independent method |
| --- | ---: | --- |
| limits | 133 | Exact l'Hôpital on polynomial pieces; pole sign at a ∓ 10⁻³⁰; explicit 60-digit sequences for sin(1/x); squeeze for x·sin(1/x) |
| derivatives | 445 (105 secants, 43 linear models, 240 rule cases, 45 chain cases, 12 finite-difference sweeps × 16 steps) | Fraction secants; derivatives by exact Lagrange interpolation of m(h) at h = 0 (not the power rule); 60-digit Decimal Taylor series; quotient derivative from N(h)/h interpolation |
| multivariable | 168 (132 surface points, 36 Jacobian cases) | Partial, mixed and directional derivatives by interpolated secants (both mixed orders); Decimal eigenvalues |
| autodiff | 30 graph cases + 3 tapes | Forward-mode dual numbers over Fraction/Decimal (the browser uses reverse mode); explicit tape for the shared-input contributions |
| integration | 256 exact sums, 60 Decimal sums, 176 convergence errors, 48 accumulation cases | Faulhaber closed-form power sums; Simpson's rule (exact to degree 3); interpolated one-sided slopes of F |

Each oracle has literal hand-worked self-tests, executes its chapters' Python files with `runpy`, and supports `--check`. 24 new Python self-tests (306 total, all passing); all 21 oracle families fresh. Worst observed disagreements: secant 3.0% of budget, derivatives 0.60 ulp, Hessian eigenvalues 0.74 scaled ulp, autodiff 0 ulp, binary64 sums 1.5% of budget. TypeScript never writes fixtures.

New/updated TypeScript tests: limits (3 model, 133 parity, 19 lesson), derivatives (10, 446, 39), multivariable (5, 169, 31), autodiff (6, 34, 16), integration (5, 65, 22), calculus exercises (76), validation planner (28, of which 9 new for Part III), curriculum guard. Full unit suite: **11,571 tests in 90 files**.

## 5. T0 registration

`scripts/validation-plan.mjs` registers five calculus families — limits, derivatives, multivariable, autodiff, integration — keyed by the chapter's wrapper stage (`LimitStage`, `SecantStage`, …), which also gives each chapter its visual kind. Shared calculus presentation (`CalculusStage`, `calculus-view`, `exercises`, CSS) and `tests/unit/calculus-*.test.ts`, `tests/e2e/calculus-helpers.ts` select all calculus chapters without a full-suite fallback; screenshots `iii-calculus-<kind>…` select exactly their chapter; `visual-calculus.spec.ts` joins the authoritative visual lists. Regression tests prove that a calculus model edit selects its literal consumers, units, oracles and visuals and **no Probability chapter** (synthetic IV.1/IV.6 entries injected through the `catalog` option).

One planner fix was necessary: in a linked worktree the dependency **symlinks** `node_modules` and `.venv` are untracked (the `.gitignore` patterns `node_modules/` and `.venv/` match directories only), so the planner treated them as unknown inputs and escalated to a complete browser sweep. `environmentLink()` now skips exactly those two paths when they are symbolic links; a regression test covers it. The Part IV agent will meet the same issue.

## 6. Validation

### Focused and direct runs during development
* Per block: complete math gates (units + oracles + freshness) — passed at every block.
* Desktop focused browser gates per block (all read-only chapter contracts + affected interactions); direct lock-held Playwright runs of the calculus specs on all three projects. Final calculus interaction run: **283 passed, 8 declared touch-only skips**; visual-calculus: **45/45** stable on rerun.
* Failed-then-corrected cases during development: a stale trace cursor crashed the III.10 stage when switching to a graph with fewer frames (fixed by binding the cursor to its derivation); duplicate landmark names on the two III.10 graph regions; test-side issues (typographic minus, radio controls overlaid by labels, exact decimal 0.5 for 1/2); a mobile axe flake traced to a prose equation overflowing its column before the math font loaded — every Part III prose display equation was then kept within a phone column (the shared shell race itself was not modified).

### Milestone gate
The required command was run **exactly once**, on production source `60561e6`:

```sh
npm run validate:milestone -- --base 9b0149902ab67a0f6b0dcfd9e7de90c88491808a
```

Manifest: `validation-results/milestone-2026-10-12T09-19-35-054Z/manifest.json` (saved verbatim as `documentation/M7_VALIDATION_MANIFEST.json`). Inspected before running (dry run): milestone mode, `partial: false`, 43 published chapters, all 15 Part III chapters as interaction chapters, all 21 oracle families, 90 unit files, 15 gates; `conservativeExpansion`/`sharedExpansion` true only because the curriculum and planner (known shared files) changed; **no unknown or deleted inputs, no complete-browser fallback**.

**Result: all 15 selected gates passed on the first run; no gate was retried; nothing was corrected after the run.**

| Gate | Result | Wall time (s) |
| --- | --- | ---: |
| complete type/content check | passed (447 files, 0 errors, 0 warnings, 4 pre-existing hints) | 10.8 |
| complete units | passed: 11,571 tests / 90 files | 10.9 |
| complete oracle + freshness | passed: 306 Python tests, 21 fresh families | 35.6 |
| root production verification | passed (source-matched root output reused) | 0.1 |
| subpath production (refresh + verification) | passed | 14.0 |
| all read-only chapter contracts + representative both-theme axe | 897 passed | 346.9 |
| interactions: autodiff (III.10) | 24 passed | 19.3 |
| interactions: derivatives (III.3–III.6, III.14) | 94 passed, 2 declared touch skips | 89.8 |
| interactions: limits (III.1–III.2) | 43 passed, 2 skips | 36.1 |
| interactions: integration (III.12, III.13, III.15) | 55 passed, 2 skips | 52.7 |
| interactions: multivariable (III.7–III.9, III.11) | 67 passed, 2 skips | 65.2 |
| shared cross-chapter controls | 45 passed | 13.0 |
| root shared shell, navigation, accessibility and deployment | 289 passed, 5 skips | 123.4 |
| subpath prefix-dependent navigation, assets, anchors, routes, hydration | 75 passed, 3 skips | 35.0 |
| authoritative root visuals (Parts I–III, publication) | 156 passed, 15 skips | 60.9 |

Browser totals: **1,745 passed, 31 declared project-specific skips, 0 failed.** Skips are the established touch-only cases on desktop/tablet and the existing responsive/project-specific skips; none was added to hide a failure. The manifest's `status` is `passed`; its `partial: false`.

## 7. Accessibility, responsiveness and performance

Every stage uses the frozen platform controls: one canonical state; Reset; pointer, keyboard (arrows, Shift = coarse) and numeric entry write the same state; invalid input is rejected with a message, never clamped; handles have 48 px hit targets and model-built labels; drawings have model-built text alternatives; commits are announced in a polite live region; colour is never the only cue (line style, fills, open/filled markers, labels, a text “Exceptional case:” cue). Browser tests cover keyboard, pointer, CDP touch, rejection, reset, announcements, model-to-SVG geometry identity, replay, exercises (wrong answer → feedback → worked solution → correct), and axe in both themes in exceptional and invalid states. The III.10 graph is a labelled, focusable horizontal scroll region on narrow screens; live formulas and tables keep the established focusable scroll-region contract, and long formulas were split so results stay visible on phones.

Pointer-to-next-frame timing (`M7_DRAG_MEASUREMENTS.json`, measured at `3300766`; Linux, Intel i5-12600, Chrome 155.0.8059.39, 1440×900, 80 moves per stage, established M6 methodology): p95 between 8.3 and 14.9 ms for all fourteen draggable stages; two single samples above 16.7 ms (rules 17.7 ms, Riemann 19.8 ms) are retained. The Hessian stage had 5/76 overruns before its local-model contour grid was reduced from 48 to 32 cells, and 0/76 after. Medians near 0.2 ms reflect moves that do not cross a 0.25 lattice cell. These are synthetic scheduling measurements, not physical-device latency.

## 8. Linux screenshot inventory and individual review

168 new Linux baselines in `tests/e2e/__screenshots__/visual-calculus.spec.ts/` (15 stages × opening and 2–4 exceptional states × desktop/tablet/mobile) and 4 refreshed publication captures (`desktop-contents-fold`, `desktop-map`, `mobile-contents-fold`, `mobile-map`, now showing 43 of 97; the home folds were byte-identical and unchanged). No other existing baseline and no Windows baseline was modified; screenshot tolerances and axe rules are unchanged.

Every image was opened individually by reviewers (four parallel review agents, then two verification passes after fixes), plus my own spot checks. Defects found and corrected: wrong forward-mode node labels in III.10; “undefined” overflowing graph nodes; a removable hole drawn as an asymptote (III.5); a false vertical connector through a moved value (III.2); the “far” linear-model preset and a large Jacobian displacement placing their evidence outside the view; Riemann panel colours following the sign of f instead of the contribution when b < a; missing endpoint dot; “= does not exist” phrasing; “=” used for binary64 values; ≠ glyph and raw TeX/caret/e-notation in UI text; table captions scrolling with their tables; long phone formulas hiding results. Remaining known low-severity items: the platform's fixed axis names “x”/“y” on planes whose variables are t, u, θ, k or log₁₀ h (explained in titles); occasional label/tick or arrow/label overlaps; jagged contour detail at degenerate points; some tables scroll on phones by design.

## 9. Resources

Disk: 26 GiB free at the start, 25 GiB at the milestone (never below the 15 GiB guard). No dependency installs, browser downloads, clones or extra environments. All heavy builds and browser jobs ran under `/tmp/imf-heavy.lock` (T0 runners acquire it themselves; direct runs used `flock`). Routine Playwright runs used `--trace off`; failure screenshots were retained under `validation-results/` and scratch directories. Apparent sizes (`du -sb`): root output 15.4 MiB; subpath output 15.5 MiB; Part III screenshot baselines 30.9 MiB; retained validation evidence 1.6 MiB; Book II working directory 43.1 MiB excluding the shared dependency symlinks (111.3 MiB allocated by `du -sk`, including ignored build outputs). 25 GiB free on `/` after the milestone.

## 10. Deferred verification

Windows rendering and baselines, physical desktop/tablet/phone input, and human screen-reader acceptance are deferred. Exhaustive release certification (`validate:exhaustive`) was not run.

## 11. Shared-file integration touchpoints

Only eight pre-existing files were modified; everything else is new and Part III-specific.

| File | Change | Expected conflict with the Part IV branch |
| --- | --- | --- |
| `src/curriculum/curriculum.ts` | III.1–III.15 flipped to `available` | Low: different lines (Part III versus Part IV block) |
| `scripts/validation-plan.mjs` | five calculus families, `calculusStage()`, `idScoped`, calculus screenshot/visual mapping, calculus test-support rule, `environmentLink()` | **High**: Part IV will add families, screenshot mappings and visual-file lists in the same places and probably its own symlink fix — merge by hand, keep both family sets |
| `tests/unit/validation-plan.test.ts` | `III.1` → `IV.1` in the unpublished-selector check; new Part III describe block with synthetic IV entries | Medium: Part IV will change the same selector line (to a later planned chapter) |
| `tests/unit/curriculum.test.ts` | guard now expects Parts I–III published, 43/54 | **High**: Part IV changes the same assertion; after integration it should be 59/38 |
| `tests/e2e/__screenshots__/visual.spec.ts/{desktop,mobile}-{contents-fold,map}.png` | 43/97 captures | **High (binary)**: must be regenerated once after both branches merge |

New shared-looking but Part III-owned paths: `src/lessons/calculus/**`, `src/math/calculus/**`, `oracle/{limits,derivatives,multivariable,autodiff,integration}_oracle.py` (+ tests), five fixtures, `code/python/calculus_*.py`, `tests/unit/{limits,derivatives,multivariable,autodiff,integration,calculus-exercises}*.test.ts`, `tests/e2e/{limits,derivatives,multivariable,autodiff,integration,visual-calculus}.spec.ts`, `tests/e2e/calculus-helpers.ts`.

## 12. Curriculum state

Branch-local: 43/97 available, 54 planned. Part III → Part IV connection (III.15's “next” is IV.1, planned here) is left to controlled integration.
