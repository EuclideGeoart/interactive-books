# M9+M10 — Integrated Statistics and Optimization Linux acceptance

Date: 2026-10-12 (Europe/Berlin). Integration branch: `feature/book-ii-m9m10-integration`.
Worktree: `/work/interactive-books-m9m10-integration/Interactive-Mathematical-Foundations-Book`.

The commissioned selected combined milestone is complete: **79/97 chapters available, 18 planned**, with **20 new chapters, 100 graded exercises and 40 runnable Python references**. All 18 originally selected gate responsibilities are satisfied through the initial run and documented source-matched continuations. This was **not an uninterrupted pass**. Both failed manifests and their evidence are retained; the final raw scoped manifest honestly keeps `partial: true`.

## Exact provenance and preserved ownership

- Common accepted baseline: `cdf2ebd5428d80999dcf52f93a8e3c0eee0ac167`.
- Independently approved Statistics HEAD: `218ab4df627f3231c9fe6e9808adb419197c524b`.
- Complete Optimization HEAD: `8b5ed1c359887d3f92c23f75f1cff4ab796077fb` (implementation blocks A `37f2e8c8938a37307755aa7eb7276110343ca1a2`, B `4cb4500369e24d26107bb5842654477d50139022`, C `0be1721`; implementation report is a following documentation commit).
- Real two-parent integration merge: `8d03aa8adc7f1a407199c8af9f9fe653d89d6f36`, parents exactly the two implementation HEADs above.
- Committed source used for final corrected production/browser/visual checks: `eb19ee047fcc17e283d0f85a590f8d3838525135`. This acceptance report/evidence is a subsequent documentation-only commit; Git HEAD records its final revision without rewriting the merge.

Both original implementation branches remain clean and at their recorded HEADs. Statistics mathematical models, pure lesson derivations, oracles, fixtures, Python references, existing unit/browser tests, screenshot bytes and T0 ownership are preserved. Two integration-only Statistics JSX accessibility details were corrected, described below. Optimization mathematical models, oracles, fixtures, references, exercises and chapter screenshot bytes also remain unchanged from its implementation. Its ten MDX files use corrected deployment-safe cross references in this integration branch.

All changes relative to the baseline are inside Book II. Book I, canonical checkout, accepted M7/M8 branches, Git history and main were preserved. No installation, clone, cleanup, push, deployment, worktree removal or Part VII implementation was performed.

## Curriculum and reading order

Part I 9/9, Part II 19/19, Part III 15/15, Part IV 16/16, Part V 10/10 and Part VI 10/10 total **79 available**; Parts VII–VIII retain all 18 planned chapters. VI.4 retains the authoritative FLAGSHIP role. Each new chapter has two interactive/worked stages, its established narrative contract, five exercises with feedback/solutions and two executed Python references.

| Chapter | Route | Main interaction |
| --- | --- | --- |
| V.1 | `/chapters/data-summaries/` | Observed dataset, ordered values, mean/median/modes |
| V.2 | `/chapters/data-spread/` | Exact centered variance, sample variance, standard deviation/MAD and singleton behavior |
| V.3 | `/chapters/population-sampling/` | Explicit seed, actual samples, variability and selection bias |
| V.4 | `/chapters/estimators-estimation/` | Estimator shift, empirical/theoretical bias–variance–MSE |
| V.5 | `/chapters/confidence-intervals/` | Known-sigma Normal intervals, actual containment and analytic coverage |
| V.6 | `/chapters/covariance-matrices/` | Weighted centered covariance, rank/PSD and ellipse geometry |
| V.7 | `/chapters/regression-fundamentals/` | Least-squares fit, actual signed residuals and identifiability |
| V.8 | `/chapters/likelihood/` | Ordered Bernoulli likelihood and extended log behavior |
| V.9 | `/chapters/maximum-likelihood/` | Exact MLE, empty data and boundary maximizers |
| V.10 | `/chapters/maximum-a-posteriori/` | Beta–Bernoulli posterior, normalizer and interior/boundary modes |
| VI.1 | `/chapters/objective-landscapes/` | Parameter landscape and actual value/gradient/Hessian |
| VI.2 | `/chapters/local-global-optima/` | Analytic local/global/stationary classification |
| VI.3 | `/chapters/convexity/` | Chord, epigraph and counterexample gap |
| VI.4 | `/chapters/gradient-descent/` | FLAGSHIP immutable optimizer replay, path, table and inspector |
| VI.5 | `/chapters/learning-rate-convergence/` | Quadratic stability and actual rate histories |
| VI.6 | `/chapters/momentum/` | Previous/new velocity and its actual update |
| VI.7 | `/chapters/stochastic-mini-batch-descent/` | Selected examples, averaged gradient and seed state |
| VI.8 | `/chapters/adam/` | Moments, t=1 bias correction, epsilon outside root |
| VI.9 | `/chapters/constraints-regularization/` | Proposal/projection and separate L2 objective |
| VI.10 | `/chapters/optimization-diagnostics/` | Real stop reasons and visible unclipped/clipped updates |

Integration unit and real-browser regressions cover IV.16 → V.1, V.10 → VI.1 and VI.10 → planned VII.1. Root and subpath navigation both test these boundaries. Sampling tables also have a real keyboard-scroll regression for explorer and worked contexts on all three emulated viewports.

## Conflict resolution and inspected T0 scope

Three shared files required manual resolution: `scripts/validation-plan.mjs`, `tests/unit/curriculum.test.ts`, `tests/unit/validation-plan.test.ts`. Curriculum data merged automatically. Both parts' family discovery, stage kinds, all owners of shared unit/oracle/browser files, ID-bounded interaction selectors, V/VI screenshot ownership and visual support were retained.

All **28 accepted baseline families** remain, with four Statistics and four Optimization families added (36 total). Tests prove Statistics estimator edits select V.1–V.4 without Optimization; Optimization transition edits select their actual VI consumers without Statistics. Original Statistics ownership tests and legitimate transitive Probability/eigenvalue consumers remain. Unknown/deleted files still expand conservatively.

The first dry run found the new navigation regression file taking unknown-file exhaustive fallback. It was registered as known shared-shell support and regression-tested. The corrected exact plan, saved as `M9M10_VALIDATION_PLAN.json`, has 79 chapter contracts, all 20 new chapters as affected interactions, 121 unit files, 32 oracle families, both production mounts, representative I.1/I.3/I.9/II.1/II.10 checks, both-theme axe and all authoritative Linux visual families. No complete/exhaustive root browser fallback was launched.

## Mathematical policy and independent verification

Statistics retains exact finite-data fractions, means/variance/covariance and regressions; explicitly numerical sampling/Normal intervals/coverage and eigenpairs; ordered Bernoulli likelihood with exact MLE; proper half-integer Beta priors and explicit posterior boundary-mode behavior. Singleton sample variance, zero likelihood/log minus infinity, rank deficiency, undefined correlations and divergent endpoint densities keep their original policies. Its binary64 comparison allowance remains `2e-12*max(1,abs(expected))`, with analytic Normal coverage's separate `2e-9` bound.

Optimization is bounded to one/two parameters and 1–40 updates. Pure objective/gradient evaluation and optimizer transitions feed immutable traces and all views. Analytic stationary/convexity classification, exact rational hand probes and binary64 trajectories remain separate. Momentum convention, sampled indices/LCG state, Adam time/bias/epsilon, explicit feasible initialization/projection, changed L2 objective and visible clipping retain their evaluated states. Finite/domain guards and ordered stopping reasons are explicit; no small gradient, clipped step, heuristic stop or optimizer name supplies a general global-minimum certificate.

Python owns all fixtures. Independent methods include pairwise variance/covariance and normal equations, exact likelihood products and Beta integrals, closed-form/unrolled optimizer recurrences, arbitrary-precision integer sampling, Fraction histories and Decimal80 radicals/KKT checks. All **32 oracle families are fresh** and **444 Python self-tests pass**, including execution of the 40 new references. Full TypeScript mathematics: **13,247 tests in 121 files** pass. Optimization observed scaled-ulp errors remain 1/8 for landscapes, 16/128 for dynamics, and 1/8 evaluations plus 3/128 trajectories for constraints. The sensitive zero-decay Adam probe uses independently checked transitions at actual binary64 inputs with the unchanged bound, rather than claiming unconditional ideal-trajectory accuracy.

## One commissioned milestone, honest focused continuations

Initial full invocation:

```sh
npm run validate:milestone -- --base cdf2ebd5428d80999dcf52f93a8e3c0eee0ac167
```

Initial manifest: `validation-results/milestone-2026-10-12T13-33-26-308Z/manifest.json`, preserved byte-for-byte as `M9M10_INITIAL_FAILED_MANIFEST.json`. Complete type/content, units and oracle/freshness gates passed. Root production then failed on 37 relative Optimization prose links and one external paper link forbidden by this book's deployment contract.

The ten MDX files now use house `Xref` links, and the Adam source keeps a plain bibliographic Algorithm 1 citation. Equations, settings and mathematical code were unchanged; 725 inputs were verified identical before/after. The affected 92 content checks and type check passed again. The continuation with `--only production,browser,visual` verified both mounts, then ran the full contract selection: **1,563 passed, 12 failed**.

Those 12 failures were V.3/V.4 both-theme axe cases across desktop/tablet/mobile. The sample-table wrappers lacked keyboard focus, and narrow replay formula regions shared the name “Replay equation.” Integration-only `DataStage.tsx` now makes each labelled table region focusable; `StageFrame.tsx` gives the selected equation its explorer/worked title. No statistical mathematics, sample sequence, grading, tolerance, oracle, fixture, original test or ownership rule changed. A further 474 mathematical inputs were verified unchanged. Focused affected checks: **112 passed**; type/content check: **0 errors, 0 warnings**, five existing unrelated hints.

Only source-affected production outputs were refreshed/reverified. Then the scoped continuation runner retried exactly the 12 failed audits and executed the originally pending gates. It preserved the 1,563 successful chapter results and never repeated the complete mathematical suites. All 12 repaired audits passed. The runner is saved for reproduction as `M9M10_CONTINUATION_RUNNER.mjs`; raw results/logs and failed screenshots remain in `validation-results/`.

`M9M10_VALIDATION_MANIFEST.json` is copied byte-for-byte from `validation-results/m9m10-remaining-2026-10-12T13-58-51-765Z/manifest.json`. It is an actual successful **scoped partial** run, not a doctored full-run manifest. `M9M10_PRODUCTION_VALIDATION_MANIFEST.json` is the actual successful production continuation. `M9M10_ACCEPTANCE_EVIDENCE.json` maps all 18 original gate responsibilities to these actual results and preserved first-run mathematics. The two continuation provenance files provide source hashes and exact changes.

## Final Linux results

| Selected responsibility | Actual result |
| --- | --- |
| Type/content | 0 errors, 0 warnings; five existing unrelated hints |
| Complete units | 13,247 passed / 121 files |
| Independent Python and freshness | 444 tests passed / 32 families fresh |
| Root and `/math-foundations/` production | Each 83 pages, 8 stylesheets, 373 files verified |
| 79-chapter contracts and selected both-theme axe | 1,563 original passes plus 12 repaired cases; no unresolved failures |
| Eight new interaction families | 165 passed |
| Shared keyboard/input/reset/announcement controls | 45 passed |
| Root shell/navigation/accessibility/deployment | 310 passed, 5 existing viewport-specific skips |
| Subpath navigation/assets/anchors/routes/hydration | 96 passed, 3 existing viewport-specific skips |
| Authoritative root visual comparisons | 264 passed, 15 existing viewport-specific skips |

| Interaction family | Passed cases (all three projects) |
| --- | --- |
| optimization_dynamics | 18 |
| statistics_intervals | 12 |
| optimization_constraints | 12 |
| optimization_landscapes | 21 |
| statistics_scatter | 24 |
| statistics_data | 27 |
| optimization_descent | 15 |
| statistics_likelihood | 36 |

Keyboard, touch/pointer, reduced motion, rejected input, replay/reset, MathML, model-built alternatives, exercise feedback and both-theme axe are covered within the selected scope. The root/subpath static and browser checks confirm base-safe links, hashed assets, route recovery, planned chapters and live hydration.

## Visual inventory, performance and resources

New chapter inventory: **54 Statistics images** individually reviewed by Agent A and independently accepted at handoff; **63 Optimization images** individually reviewed by Agent B; **four combined publication images** (desktop/mobile contents and map) regenerated and individually reviewed at 79/97. Total **121** images in `M9M10_SCREENSHOT_INVENTORY.json`, with dimensions, SHA256 and review provenance. Final authoritative comparison passed their integrated rendering and historical baselines without changing the 0.004 tolerance. Only the four verified publication images were refreshed from historical baselines; all V/VI chapter image bytes are preserved.

The reproducible warmed model/adapter benchmark (`M10_OPTIMIZATION_PERFORMANCE.mjs`, Block C evidence) uses Node v24.18.0, 200 varied starts per optimizer and a 40-step budget. Observed medians 0.148–0.861 ms and p95 0.212–1.235 ms, max 2.651 ms, excluding browser layout/paint and physical input. Actual gates retain wall times: the contract run 561.4 seconds; repaired audits 24.6 seconds; authoritative visual comparison 117.1 seconds. These are observations, not performance guarantees.

The integration book directory uses approximately 206 MiB; local dependency overlay 1.6 MiB, each production mount 27 MiB. Approximately **23 GiB** remains free on `/`, above the 15 GiB heavy-work threshold. 396 Node package links and the canonical Python environment were reused, with local Vite/Astro caches and no installs. All heavy work was serialized through `/tmp/imf-heavy.lock`: T0 self-locks, direct builds/browsers and the scoped runner acquire it explicitly; no runner was double-wrapped.

## Deliberate limits and completion

The final scope is the selected Linux combined milestone, including all available contracts and both new parts' interactions. No separate final M10 milestone or exhaustive certification was run. Existing project-specific skipped cases are recorded above; no new unexplained skip was introduced. Windows rendering, physical tablets/phones, manual screen-reader acceptance and exhaustive release certification remain deferred. Optimization's optional user-interruption feature was omitted; bounded immutable replay is implemented.

No mathematical, interaction, accessibility, production or visual failure remains within the commissioned selected scope. The report records the actual failures and focused fixes, rather than presenting them as an uninterrupted pass. Implementation, integration, evidence and report are committed, and the integration branch is left clean. Work stops here as commissioned.
