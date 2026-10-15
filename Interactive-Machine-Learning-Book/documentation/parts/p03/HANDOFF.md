# Book III Part III source handoff

B3-P03 / III-17–III-19. Recommendation: source-ready for independent review, with ACCEPT WITH LIMITATIONS pending owner heavy/type/browser/visual gates. Only the integration owner decides acceptance/freeze.

Allocated worktree: /media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/book-iii-part-iii-instance-probabilistic. Book root: /media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/book-iii-part-iii-instance-probabilistic/Interactive-Machine-Learning-Book; branch feature/book-iii-part-iii-instance-probabilistic. Initial HEAD and Wave A tag both resolved to911539e3d0b3600addfec6f78dcdda7c834ce7df, with clean status and a locked Linux D-volume linked worktree. Canonical common Git directory is /media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books/.git. The original foundation freeze cca73bfbae363715a8ede64e349b726803f1f16f stays immutable; all13 reference hashes match before writing and at handoff.

Exact corrected source-ready SHA: 166c91a1aee9a4c4427f62d03a801aa6854f60bd, following owner-reviewed delivery c0962c9f36bda65acc8bf05588f288e0496996a2. Previous test correction source: 8386abc5946f92858a3ad6b6815c7e4e79c2aaf2, following the owner-held post-compatibility validation HEAD ee1d9e1b20f826bbc910734b93060a97761ddbd2. Previous numerical correction source: fd75b665cf4a79145daa1c0772a05702260513cb, following delivery7c37db9a0725c42fcaa84195c026ff6dac41a3c4. Earlier source-ready SHA: d6ad593853bc57182a22aab718bb2ba54aca910d. Initial complete implementation: 544de138d69b38944ac457b02988c46aaef677aa. Browser expectation follow-up: 22c8788ec0d95afabfaa5afb4e5b7027865524ae. Explicit Python None scales remain invalid, matching TypeScript null; omitted scales alone default to units. The numerical correction commit contains11 owned paths. The post-compatibility test correction contains only the owned model test and one lossless failure-evidence record; a following report-only commit updates this handoff, and its clean delivery SHA is returned in chat. Initial one-time staged ownership check passed for35 paths; the numerical correction's exact11-path check, test correction's exact2-path check and latest sparse-row correction's exact11-path check all passed, as did git diff --cached --check. No other Part, shared/platform/shell/style/package/config/curriculum or protected book source was edited.

## Sparse observation and undefined-description correction

The owner reported all9 gates passed at c0962c9:59 units,21 Python cases and102 root plus102 subpath browser cases, with38 retained production captures. A peer reviewed14 actual images without a geometry blocker and flagged two undefined-description issues. A subsequent independent owner trust-boundary test failed: extending the six-row sample array to length7 left a hole that map skipped, allowing a fabricated n7/k7 selection and average. Those prior green gates and captures do not validate this new correction.

The neighbor kernel now uses Array.from so every sample index is visited. Each position must contain a record with its own id/x/y/category/target fields; holes, null, primitives, arrays, incomplete and inherited-only records raise an informative indexed RangeError. Tests cover the actual length7/k7 reproducer, first/middle/last holes, JSON null-row serialization and invalid records, including rejection through neighborTrace. Canonical Python already rejected serialized null rows incidentally; it now deliberately validates each record and raises indexed ValueError through derive and trace. Dense valid binary64 arithmetic, IDs, ordering, shapes, selections and immutable history retain their previous behavior.

Neighbor voteExplanation now reports no selected neighbors plus the k>n reason. Bayes decisionExplanation reports no class decision plus the active reason whenever posterior/order is undefined. Both strings derive from the same active lesson object. Unit regressions cover k>n, impossible evidence, absent likelihood estimates and zero priors, plus valid/tie wording. Existing browser tests now assert those visible texts; their new assertions remain unexecuted by this author.

validation/sparse-observations-before-fix.json losslessly retains the owner log and reproducer and the new author red output:2 TS failures/29 skipped and1 Python method with7 malformed-row errors on unchanged model source. The owner artifacts, prior failure records and38 captures remain untouched. Current author checks pass45 units,22 Python cases, all6 independent literal groups and the unchanged402108-byte goldens. All13 frozen reference hashes match. Hold the clean owned correction/report delivery for the owner's fresh9 gates and fresh captures; P04 owns the heavy slot, and no heavy job ran here.

## Post-compatibility type fixture correction

The owner's first focused9-gate run at ee1d9e1b20f826bbc910734b93060a97761ddbd2 stopped at type/content validation:87 files,1 TS2540 error,0 warnings and0 hints. The test attempted initial.query.x=2 on a clone whose inferred public query type remained readonly. No units/build/browser gates ran in that owner attempt; the actual exit was1.

The test now creates an explicitly mutable cloned query fixture {x:number;y:number} and inserts it into the cloned initial state. It still mutates the actual input after creating the trace, explicitly checks input x==2, checks frozen frame0 x==0, rejects mutation of the frozen frame, and derives the final replay prediction. Public readonly model interfaces, mathematics, fixtures and shared files are unchanged; no type assertions, any, suppressions or compiler relaxation were added.

validation/post-compat-type-failure.json retains the original owner logText and exitText losslessly, including terminal escapes and whitespace. The original artifacts/integrator-focused-validation-post-compat.log and artifacts/integrator-focused-post-compat-exit.txt remain untouched. The focused author unit command passed42 tests after that test-only correction. The owner's later c0962c9 run passed all9 gates; its evidence is retained. The sparse-row correction above has new light checks, while its fresh heavy/type/browser/capture validation remains pending.

## Final checkpoint correction and hold

The authorized correction to Avicenna's final source checkpoint at7c37db9 is complete:

- Summaries sum normalized values before dividing by n, and sum squared deviations before dividing by n. Six equal1e308 observations and nine equal Number.MAX_VALUE observations retain the exact finite mean, SD0, CV0 and no reason. Final summary outputs are checked for finiteness. Distinct nearby large observations retain positive SD; no epsilon or wider tolerance is used.
- Every required Bayes query, evidence and positive-count tuple position is validated by index. Both positions, both class count tuples and derive/trace entry points reject sparse input before replay creation. Python null/short-tuple equivalents also reject. Supplied-scale validation and exact score decisions remain intact.
- The learner ledger describes displayed mathematical −∞ and Undefined with their reasons. BigInt/Fraction storage details are confined to NUMERICS.md; the exact-score and approximate-posterior explanations remain in the chapter.

Original red output is retained in validation/final-checkpoint-before-fix.log:3 focused TS failures and1 pass on unchanged model source;2 new canonical Python regressions already passed. The older reviewer failure log is preserved. One unprivileged full focused Vitest startup attempt stopped with EROFS while writing the provisioned worktree Vite cache, before executing tests; rerunning the same command through the authorized scoped escalation passed all42 units.

The integration owner merged only accepted compatibility commit d2be911c407dde5949ad71757da8853128d3d8b5 into delivery8e982571814f0ea71c4c94389d350645fda5b1f4, producing held validation HEAD ee1d9e1b20f826bbc910734b93060a97761ddbd2. The owner reported the preflight36-owned-path/ref13/protected-tree check passed against d2be911; that compatibility commit remains an ancestor. This agent performed no merge or sync. Its immutable book-iii-wave-b-publication-budget-20261013 tag remains accepted, and the original Wave A tag still peels to911539e3d0b3600addfec6f78dcdda7c834ce7df. Hold this clean delivery after the owned test/report commits. No heavy slot or new Part assignment is authorized.

## Chapter completion

| Chapter | Mechanism, content and equations | Canonical and independent proof | Exercises |
| --- | --- | --- | --- |
| III-17 k-Nearest Neighbors | Genuine pointer/keyboard/numeric query; exact ordered distance table, selected markers/links, classification votes and target mean. Definition, local squared-loss minimizer derivation, literal before/after, duplicates, ties and k>n. | nearest_neighbors.py plus common.py; exhaustive neighbor subsets, Decimal/Fraction distances and target average; full before/after/query trace. | Five graded questions with misconception feedback. |
| III-18 Distance Metrics and Curse of Dimensionality | Draggable two-point L1/L2/Lp metric, feature units/scales and unit contour. Seeded dimension/prefix experiment, cube/embedded-line distributions, raw/per-coordinate normalization, actual row distances and summaries. Derives distribution-specific squared-norm moments; worked seed42 results and line counterexample. | distance_metrics.py plus common.py; closed-form modular seed oracle, high-precision norms and exact tiny summaries; five-frame dimension trace. | Five graded questions. |
| III-19 Naive Bayes | Editable class priors/counts, binary query/mask and smoothing. Likelihood/log-score/normalization/posterior ledger with zero-prior, empty-estimate, impossible, positive-underflow and exact-tie controls. Full rational worked example and empirical-dependence counterexample. | naive_bayes.py; direct exact rational mass oracle vs actual NumPy log-sum-exp; private exact binary64 decision comparison and four-frame evidence trace. | Five graded questions. |

All chapters open with their working Stage, then include intuition/definition/derivation/worked examples, actual raw Python imports, exploratory tasks, shapes/units/provenance, numerical limits, assumptions/connections and complete exercises. Frontmatter uses the exact plan titles and verified real Book II IDs. Three owned JSON manifest entries discover automatically. No generic title scaffold or substitute chapter mechanism is delivered.

## APIs and numerical decisions

NUMERICS.md specifies each exported model/state API, shapes, limits, pure adapters, exact ordering, seed contract, rendering IDs and failure semantics.

The canonical neighbor query selects s4/s2/s3, votes A:2/B:1 and averages6; query(1.5,0) selects s4/s5/s6 and averages10. k>n is explicitly undefined, not silently clamped. Coincident rows retain identities, and distance/vote ties are deterministic.

The dimension experiment preserves24 IDs and32-coordinate prefixes. The line counterexample leaves raw distances unchanged as ambient dimension grows. Max-rescaled summary arithmetic handles tiny variance and subnormals, with explicit absolute-result underflow flags. The chapter's statistical claim names independent uniform-coordinate assumptions and squared distance; it makes no universal concentration claim.

Bayes normalization remains from-scratch log-sum-exp. Decision comparison is private exact rational arithmetic on accepted binary64 INPUTS, including alpha/prior weights, rather than decimal-string interpretation or a posterior epsilon. Proved ties use a common finite log representation and exact posterior[.5,.5]; unequal scores can have coincident displayed approximate values. Impossible evidence, absent estimates and numerical underflow remain distinct. Private BigInt/Fraction temporaries never enter state, traces or output.

Original toy records are explicit data/p03/bernoulli-toy.json; the claimed counts and empirical dependence are checked. Edited-count provenance is visible. All plots, controls, tables, equations, inspectors and spoken values use the same active derived numerical object.

## Trace and interaction inventory

- Neighbor replay:4 complete frames, current query then x−1.5/0/1.5, with the current rows/k/metric/scales retained.
- Metric replay:5 complete frames, current experiment then dimensions1/2/8/32, preserving seed/distribution/normalization/metric.
- Bayes replay:4 complete frames, current mask, prior only, feature1 only, both features, preserving all counts/priors/alpha/query values.
- Shared traceFrom supplies deep detached frozen history. Seek replaces the entire displayed state; edits begin there and end replay; reset returns canonical.
- Manual NumberField commits retain input identity/focus. Replacement/replay/seek/reset revise control identity deliberately. A separate synchronous drag epoch invalidates held capture/speech on every successful non-pointer mutation. Pointer changes are silent until drag end; keyboard/committed numeric changes announce the already-derived result.
- Query keys preserve fine decimal precision. Pointer moves use the declared0.1 lattice. Both query stages support numeric equivalents and ≥44px physical touch targets; only the handles disable touch scrolling.
- Part-local fieldset/legend, inspector wrapping and plot-font rules address narrow physical viewports; no shared style fork was made.

## Exact validation executed here

All commands ran from the allocated Part III book using the provisioned read-only native dependencies. No installation or environment change occurred.

| Command | Actual result |
| --- | --- |
| node node_modules/vitest/vitest.mjs run tests/unit/p03 --maxWorkers=1 | 45 tests passed in 2 files:31 numerical/kernel and14 projection/source/render tests. Latest run start22:03:02, duration5.49s on2026-10-13; scoped escalation used the provisioned worktree cache. Includes strict local MDX math compilation and Preact stage rendering; duplicate markers remain truly coincident while their identity labels are separated. |
| .venv/bin/python -B oracle/p03/test_instance_methods.py | 22 unittest tests passed in4.915s, including serialized invalid-row derive/trace rejection. Actual execution of all three canonical files, exact-score ties, numeric/mask/shape/seed boundaries, binary64 large-integer distance/duplicates, underflow and freshness failures are covered. |
| .venv/bin/python -B oracle/p03/independent.py | Six literal assertion groups /10 conditions passed. Includes exact rational posterior using integer weights3,2 and literal nearest-neighbor/norm/seed checks. |
| .venv/bin/python -B oracle/p03/generate_fixtures.py --check | Passed;402108 committed bytes match the independent generator. Missing/stale files fail. |
| Read-only foundation footprint check | 13/13 SHA256 hashes unchanged. |
| Initial/final base/tag identity reads | HEAD remained911539e3 before the local owned commit; the Wave A tag resolves to the same exact base. |

The current fixtures contain 15 neighbor cases, 11 metric cases and 19 Bayes cases, 7 exact summary boundaries, complete before/after records and13 replay frames. Arithmetic tolerance is2e−12+1e−12×abs(expected); IDs/decisions/tie/undefined flags are exact. Tiny representable mean/SD and large constant mean/SD tests use equality. SVG attribute parity uses1e−9 absolute SVG units; painted geometry has a distinct.02 CSSpx tolerance. No blanket numerical tolerance loosening was used.

Owner and Avicenna draft checkpoints were independent READ-ONLY review, not acceptance. Their binary64, supplied-scale, tiny-summary, exact-ratio and distinct-factor tie reproducers are fixed with focused regressions. The original red output for the first three peer reproducers is preserved in validation/reviewer-boundaries-before-fix.log. A local strict-MDX failure from a denominator line beginning with a brace was corrected by joining the formula line; the strict compiler then passed. Writer quoting errors stopped before writing and were corrected; passing old-source checks were not represented as proof of the later exact-score implementation.

## Authored browser coverage and capture selectors

tests/e2e/p03/instance-methods.spec.ts contains9 tests, authored for the accepted1440/820/390 viewport projects at both production mounts. They have NOT been executed by this agent. The owner passed their prior version at c0962c9 within102 root and102 subpath cases; the added undefined-description assertions await the corrected-source rerun. JSON expectations are loaded with readFileSync/JSON.parse, compatible with Node24 ESM.

Coverage: actual ordered distances/votes/mean; repeated ArrowUp without refocusing, Enter/Tab and fine query precision; real pointer lattice/drag-end-only speech; held drag→numeric commit→release/cancel invalidation; pending-drag reset; duplicate/vote/k>n states; all replay frames and unchanged blur; metric scaling and coordinate-prefix/embedded-line invariants; Bayes posterior/tie/zero/undefined/underflow/count rejection; actual query attr/BBox projection, ≥44px target, ≥14 CSSpx plot labels, both themes, reduced motion, and BOTH document scrollWidth and innerWidth bounded by page.viewportSize().width.

| Route and stage | Main capture selectors | Meaningful edge controls |
| --- | --- | --- |
| chapters/k-nearest-neighbors/ — [data-neighbors] | [data-query-plane], [data-query-handle] actual cx/cy; [data-sample-id] projected cx/cy metadata; [data-row-id] distance/rank/selection/x/y/class/target; root data-query-x/y,k,selected-ids,classification,regression; [data-votes], [data-value], [data-current-frame] | Conflicting duplicates; Distance and vote ties; Neighbor count k=7 on original six rows; Query x=1.5; L1/Lp/scales; Replay query path and seek/edit/reset. |
| chapters/distance-metrics-dimensionality/ — [data-metrics] | [data-query-plane], [data-query-handle], [data-distance-strip], [data-distance-id], [data-dimension-row] full features/raw/displayed distances; root dimension/seed/distribution/normalization/pair-distance; [data-value] summaries | L1/L2/Lp; scales2/.5; Dimension d=32, Distribution=line vs cube; raw/per-coordinate; seed0/42/max; Replay dimensions and seek/edit/reset. |
| chapters/naive-bayes/ — [data-bayes] | [data-class-id] prior/score/log-score/shifted/posterior; [data-feature-index] likelihood/log/mask; [data-value=posterior-A/B]; root alpha,query,observed,prediction,exact-tie,score-order; [data-undefined-reason], [data-underflow] | Zero class A prior; set B prior0 for all-zero priors; All-impossible evidence; Empty class without smoothing; Tiny positive likelihoods; Exact-score tie; observed checkboxes; alpha0/1; Replay evidence ledger and seek/edit/reset. |

Root [data-p03] also scopes owned CSS. All numeric attr values are full ordinary numbers or the explicit undefined marker; visible computed values have approximation signs. Provided coordinates/targets retain full round-trip text. Stable unique scope props are required if stages are reused on one page.

## Known limits and pending owner validation

This agent has executed only the listed light owned checks, with no full type/content check, full oracle runner/sweep, production build/audit, browser, screenshot/capture, accessibility-browser run or validate runner. The owner executed all9 gates and38 captures on prior c0962c9 source; the current correction needs fresh owner gates/captures. Prior artifacts remain retained. No snapshot or baseline image was changed; no source-ready claim implies green unexecuted gates.

The mechanisms are deliberately bounded: exact unweighted2D neighbors with A/B classes; finite Lp powers1–8;24 simulated rows up to32 dimensions; two-class/two-binary-feature Bernoulli Bayes. No approximate search, Gaussian/multinomial Bayes, empirical calibration or universal dimension theorem is claimed. Contours are96-segment illustrations, and duplicate markers remain truly coincident, with separated identity labels and a complete table. Native supported browser BigInt is used only for a bounded private decision calculation.

Focused run timings above are verification evidence, not production performance benchmarks. No network/model service, autoplay or heavyweight dependency was introduced. Source-only responsive/accessibility constraints and render tests passed. The owner verified prior-source browser behavior and captures; corrected-source viewport/theme/readability/accessibility results await the parent browser/capture slot.

INTEGRATION_REQUESTS.md reports no required shared changes. Request only independent source review and allocated heavy validation. Stop after this owned local commit; previous Part I and all other scopes remain read-only.

## Changed paths

Paths below are relative to the exact book root stated above; all lie in the eight p03 ownership prefixes.

- code/python/p03/common.py
- code/python/p03/distance_metrics.py
- code/python/p03/naive_bayes.py
- code/python/p03/nearest_neighbors.py
- data/p03/bernoulli-toy.json
- documentation/parts/p03/HANDOFF.md
- documentation/parts/p03/INTEGRATION_REQUESTS.md
- documentation/parts/p03/NUMERICS.md
- documentation/parts/p03/validation/reviewer-boundaries-before-fix.log
- documentation/parts/p03/validation/final-checkpoint-before-fix.log
- documentation/parts/p03/validation/post-compat-type-failure.json
- documentation/parts/p03/validation/sparse-observations-before-fix.json
- fixtures/p03/instance-probabilistic.json
- oracle/p03/cases.py
- oracle/p03/generate_fixtures.py
- oracle/p03/independent.py
- oracle/p03/manifest.json
- oracle/p03/test_instance_methods.py
- src/parts/p03/BayesStage.tsx
- src/parts/p03/MetricStage.tsx
- src/parts/p03/NeighborStage.tsx
- src/parts/p03/PartExercises.tsx
- src/parts/p03/QueryPlane.tsx
- src/parts/p03/chapters/distance-metrics-dimensionality.mdx
- src/parts/p03/chapters/k-nearest-neighbors.mdx
- src/parts/p03/chapters/naive-bayes.mdx
- src/parts/p03/exercises.ts
- src/parts/p03/experiment.tsx
- src/parts/p03/lesson.ts
- src/parts/p03/manifest.json
- src/parts/p03/model/bayes.ts
- src/parts/p03/model/distance.ts
- src/parts/p03/model/metrics.ts
- src/parts/p03/model/neighbors.ts
- src/parts/p03/p03.css
- tests/e2e/p03/instance-methods.spec.ts
- tests/unit/p03/lesson.test.ts
- tests/unit/p03/models.test.ts
