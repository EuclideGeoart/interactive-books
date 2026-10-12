# M11+M12 — Integrated Book II acceptance

**Passed. All 97 chapters are available; zero remain planned.** The single combined Linux milestone passed all 22 selected gates on its first execution. No selected failure or continuation remains. It includes 13,729 unit tests, 477 Python self-tests, all 38 oracle freshness gates, both production mounts and 2,958 browser/visual passes with 45 explicit viewport-specific skips.

The final executable source is **`46e97c1b752a80cbb79fd544bffe89b7bd055a18`**, on `feature/book-ii-m11m12-integration` in `/work/interactive-books-m11m12-integration`. This report/evidence commit changes documentation only. The delivery commit is the commit containing this file and is also reported in the final handoff.

## Exact revisions and preservation

| Boundary | Revision |
|---|---|
| Accepted common starting commit | `5c97622e5ef16b0f2a1d83d8adb906db7df04bbd` |
| Agent A committed clean Information Theory handoff | `d4012b70014f43927c70fd9a66fae6686635695e` |
| Agent B committed clean Numerical Computing handoff | `dc0fc9fb3a855d3003dab1cb6e2c4b40bd6ece59` |
| Real two-parent merge | `62798ff4730c7ca80b6925a72c7c78b8bf24e78b` |
| First merge parent, Part VIII | `dc0fc9fb3a855d3003dab1cb6e2c4b40bd6ece59` |
| Second merge parent, Part VII | `d4012b70014f43927c70fd9a66fae6686635695e` |
| Final source, including complete-publication copy and reviewed shared captures | `46e97c1b752a80cbb79fd544bffe89b7bd055a18` |

Both implementation branches and worktrees remain intact at their handoff HEADs and clean. The accepted M9/M10 branch remains at the common starting commit. All changes are confined to Book II. Book I, the master plan, Parts I–VI chapter source and mathematical models, package declarations and dependency lockfile are unchanged. Drift tests retain all authoritative titles, purposes, exits and the I.3 reference/VI.4 flagship roles.

Integration reconciled the shared curriculum, planner and publication tests while retaining both parts' registrations and actual dependency closures. Navigation now follows VI.10 → VII.1, VII.8 → VIII.1 and the rest of Part VIII; VIII.10 has no next-chapter element. These boundaries and reverse links passed on root and subpath, alongside the generic reading-order contract for every chapter.

Stale landing-page future-work copy was replaced with practice/connections text. Visual review also found a contents sentence saying remaining chapters were planned at 97/97; the source and metadata now state complete availability. Only the four publication-sensitive Linux contents/map images were changed during integration. The two affected contents images were refreshed and individually reviewed after that correction.

No push, deployment, main merge, dependency installation, clone, browser download, new Python environment or worktree removal was performed.

## All 18 new routes

Each root route also passed under the `/math-foundations/` prefix.

| Chapter | Root route |
|---|---|
| VII.1 Logarithms and log probabilities in computation | `/chapters/log-probabilities/` |
| VII.2 Self-information | `/chapters/self-information/` |
| VII.3 Entropy | `/chapters/entropy/` |
| VII.4 Cross entropy and negative log-likelihood | `/chapters/cross-entropy-nll/` |
| VII.5 KL divergence | `/chapters/kl-divergence/` |
| VII.6 Logits and softmax | `/chapters/logits-softmax/` |
| VII.7 Numerical stability: log-sum-exp and stable softmax | `/chapters/stable-logsumexp/` |
| VII.8 From token logits to language-model loss | `/chapters/token-logits-loss/` |
| VIII.1 Floating-point representation | `/chapters/floating-point-representation/` |
| VIII.2 Rounding and representation error | `/chapters/rounding-representation-error/` |
| VIII.3 Error propagation and conditioning | `/chapters/error-propagation-conditioning/` |
| VIII.4 Catastrophic cancellation | `/chapters/catastrophic-cancellation/` |
| VIII.5 Overflow and underflow | `/chapters/overflow-underflow/` |
| VIII.6 Stable algorithms | `/chapters/stable-algorithms/` |
| VIII.7 Numerical linear algebra realities | `/chapters/numerical-linear-algebra/` |
| VIII.8 Sparse matrices and sparse structure | `/chapters/sparse-matrices-structure/` |
| VIII.9 Vectorized computation | `/chapters/vectorized-computation/` |
| VIII.10 Reproducibility, random seeds, and nondeterminism | `/chapters/reproducibility-random-seeds/` |

Part VII delivers eight chapters, 40 exercises and 16 references; Part VIII delivers ten chapters, 50 exercises and 20 references. The combined additions are exactly **90 graded exercises and 36 runnable Python references**. Independent counts from the final production HTML give **534 graded exercise instances with 534 unique IDs, and 205 displayed Python references to 205 distinct files** across the 97 chapters. All 205 files exist in `code/python/`; reference execution is covered by the complete oracle self-tests. Counts above use rendered figures rather than a raw source-tag count.

Every new chapter retains the comprehensive structure: opening manipulation, intuition, definition, mechanics, derivation, worked immutable replay, pedagogical and NumPy code, exploration, mistakes/counterexamples, numerical considerations, connections, five graded exercises with corrective feedback/solutions, and summary.

## Mathematical and numerical contracts

Both parts retain one canonical state → pure authoritative model → derived scene, inspector, formula, contributions/error measurements, trace and accessible description. Models are in `src/math/information-theory/` and `src/math/numerical-computing/`; lesson adapters/stages are in the matching `src/lessons/` directories. Renderers do not independently calculate mathematical quantities. Accepted rationals, matrices, seeded utilities, plots, formatting and shared controls are reused.

Information Theory distinguishes exact support zero from numerical underflow. Surprises and losses use explicit extended infinities. Zero-weight entropy/KL terms are handled before evaluating undefined ratios or multiplying zero by infinity. Cross entropy fixes target P and evaluates prediction Q; directional KL, CE−H, signed terms, unequal support and a triangle counterexample are explicit. Softmax shows actual naive overflow and the stable max shift. Centered log-softmax preserves corrections for enormous equal finite scores and can retain a finite log probability after probability underflow. Empty/all-excluded vectors, NaN, +∞, finite subtraction overflow and excluded −∞ classes keep distinct policies. Token loss uses named vocabulary/positions, validated targets and masks, direct target log probabilities, contributing-count means and an undefined all-masked mean.

Numerical Computing compares binary64, binary32, FP16 and BF16 with their actual range/precision trade-offs. Direct exact-rational conversion uses nearest/ties-to-even with normal carries, subnormal boundaries, overflow, signed zero and special values; it avoids an intermediate-format rounding step. FP16/BF16 operations are clearly software emulation. Intended decimals, stored bits and formatted displays remain distinct. Conditioning, algorithmic stability, input representation effects, evaluation roundoff and answer error are separated. Cancellation and norm/small-function references use rational enclosures; actual intermediates and remaining range limits are visible. Compensated summation, shifted softmax/LSE and bounded loss scaling expose both improvements and failure states.

The bounded 2×2 solver compares pivoted solving with explicit inverse multiplication, intended/stored rank, numerical and exact intended residuals, known-reference forward error and exact condition estimates. Its small-residual counterexample has computed residual zero, exact intended residual 1e−16 and forward error 1e−4. Diagnostic tolerance does not redefine rank. Sparse COO duplicates are aggregated exactly; only exact zeros are removed; near-zero diagnostics retain entries; CSR pointers and multiplication use real zero-based indices, including empty rows. Packed byte estimates do not claim exact-rational storage costs or wall-clock speedups.

Broadcasting follows trailing axes and shows actual source index/value mappings, batched/scalar/empty arrays, reductions, invalid pairs and compatible outputs beyond the allocation bound. It is distinguished from geometric vectors and performance guarantees. The reproducibility explorer records a fixed LCG32 algorithm and every seed/state/sample, replays a saved suffix exactly, and contrasts specified binary64 associations against an explicit comparison budget. Discrete outcomes compare exactly; finite approximate comparisons cannot accept non-finite operands or overflowing budgets. A seed does not promise arbitrary RNG/version/hardware/parallel determinism. Mathematical rendering has no unseeded draws.

Exact bits, signs, classifications, support/rank decisions, rationals, shapes, indices, counts and discrete states have exact assertions. The Numerical Computing elementary-reference allowance remains four actual-value ULPs, with a worst observed value of two. Information logarithm/loss comparisons retain 2e−12 × max(1, |reference|), probabilities retain the separate absolute 2e−14 budget, and stable normalization retains 32 × Number.EPSILON × 6. These are bounded comparison allowances, not universal proofs. No accepted numerical, axe, screenshot or mathematical threshold was relaxed.

## Independent mathematics and freshness

| New oracle family | Independent reference method | Cases |
|---|---|---:|
| `information_probability` | Fraction masses/products and Decimal100 logs of exact quantities | 39 |
| `information_comparison` | Fraction sources, Decimal100 log differences and separate CE−H calculation | 44 |
| `information_logits` | Decimal400 raw exponential normalization; explicit analytic enormous-score cases | 23 |
| `numerical_floating` | Fraction ordered-code binary search, Decimal450 radicals, rational sensitivity | 245 |
| `numerical_algorithms` | Decimal1000 small-input/Decimal200 other references, Fraction sums/scaling, rational row reduction and inverse-column solves | 46 |
| `numerical_structure` | Coordinate dictionaries, Cartesian indexed values, arbitrary-precision modular RNG, specified native float associations; NumPy cross-checks | 36 |
| Total | Six fresh committed families | **433** |

The new families contain 33 independent Python self-tests and execute all 36 new references. Complete Book II acceptance passed **477 Python self-tests** and byte-for-byte freshness for **all 38 oracle families**. NumPy is an executed cross-check where appropriate; the primary exact structure fixtures remain standard-library-owned. FP16/BF16 tests include signed zero, all finite encoding round-trips, halfway ties, subnormal/normal transitions, overflow thresholds and special values. Numerical algorithm cases cover exact hand calculations, stability improvements, conditioning counterexamples and remaining limits; sparse/broadcasting expectations compare actual shapes, indices and values independently of diagrams.

The complete unit gate passed **13,729 tests across 140 files**, preserving all earlier mathematical tests. Astro checked 616 files with zero errors, zero warnings and five existing unrelated hints.

## Selected acceptance and actual execution

The full final dry-run manifest was inspected before this command was executed **once**:

```sh
npm run validate:milestone -- --base 5c97622e5ef16b0f2a1d83d8adb906db7df04bbd
```

The runner acquired `/tmp/imf-heavy.lock` itself. No outer lock was added. No standalone M12 milestone or exhaustive certification was run. The plan contains all 97 contracts; all 18 new interactions; all new models and six new oracle families; complete units/freshness; both production mounts; both-theme accessibility; root shell/navigation and all route hydration/assets; subpath prefix-dependent navigation; and the authoritative nine-spec Linux visual suite. Earlier deep regressions cover II.10 matrix composition, III.6 chain rule, IV.6 Bayes, V.2 spread and VI.4 gradient descent, alongside Part I cross-chapter controls and representative audits. Every new input has an owner. Unknown/deleted inputs retain conservative full coverage; no changed input caused an unintended unknown-file fallback.

| Selected responsibility | Actual result |
|---|---|
| Complete type/content, unit and oracle/freshness gates | Passed; totals above |
| Root production | 101 pages, eight stylesheets, 407 files checked — OK |
| `/math-foundations/` production | 101 pages, eight stylesheets, 407 files checked — OK |
| All chapter contracts and selected both-theme initial/feedback axe | 1,911 passed across desktop/tablet/mobile |
| Part VII deep interactions | 95 passed; 16 viewport-specific touch skips |
| Part VIII deep interactions | 92 passed; four viewport-specific touch skips |
| Earlier Parts II–VI deep regressions | 89 passed; two viewport-specific skips |
| Part I/shared keyboard, rejection, reset and announcement controls | 45 passed |
| Root shell, navigation, accessibility and deployment | 316 passed; five viewport-specific skips |
| Subpath navigation, assets, anchors, routes and hydration | 102 passed; three viewport-specific skips |
| Authoritative root visuals | 318 passed; 15 viewport-specific skips |
| Browser/visual total | **2,958 passed, 45 explicit skips, zero failures** |

The 22 selected gates produced 24 successful execution records because the runner also refreshed root and subpath production output. Actual accumulated gate wall time was 1,136.014 seconds, about 18 minutes 56 seconds. The original milestone manifest is `validation-results/milestone-2026-10-12T17-47-52-221Z/manifest.json`; its byte-for-byte committed copy is [M11M12_MILESTONE_MANIFEST.json](M11M12_MILESTONE_MANIFEST.json), SHA-256 `bf1b7dd769104b867a0324ff5716c6047ae6d17d520d99d8fd372ec952281440`.

The combined invocation passed on its first execution: **no failed combined manifest or scoped continuation exists**. Earlier focused implementation failures were corrected before integration and remain honestly recorded in the two implementation reports/logs. Agent A's original failed browser manifest and raw `partial: true` focused manifests were preserved unchanged through the merge. Integration preflight initially encountered unresolved merge markers; that failed guard log remains. After resolution, 178 focused guards passed, and the final planner change passed all 55 ownership tests. Publication capture history is also retained: four initial passes, then two changed contents-image passes after the real prose correction. No successful full mathematical or browser gate was repeated to erase history.

The raw final dry selection, full run log, annotated gate counts, build signatures, counts, inventory references, original-manifest hashes and preservation evidence are saved in [M11M12_ACCEPTANCE_EVIDENCE.json](M11M12_ACCEPTANCE_EVIDENCE.json), [M11M12_DRY_RUN_MANIFEST.json](M11M12_DRY_RUN_MANIFEST.json), [M11M12_MILESTONE_RUN.log](M11M12_MILESTONE_RUN.log) and the adjacent preflight logs. Original manifests were not edited to change their execution history.

## Linux visual review and resources

Agent A individually reviewed 48 new Information Theory images; Agent B reviewed 93 new Numerical Computing images and the four changed publication images at final pixels. Their SHA-256 inventories all match the final files. The complete authoritative root suite passed 318 comparison cases; its directories contain 780 Linux baseline files. This includes the 97/97 desktop/mobile contents/map captures, both new parts' canonical/failure states and accepted regression scenes. Exact tables/formulas remain labelled keyboard-scrollable regions on narrow screens. No earlier chapter or Windows image was overwritten during integration.

All heavy direct builds/captures and the final runner were serialized under the global lock, with `df -h /` checked first. The filesystem remained approximately **20 GiB free**. The existing installed Node packages and canonical Python environment were reused through individual links; local generated caches are independent. No cleanup of any worktree or another agent's outputs occurred.

At acceptance, the book worktree occupied about 231 MiB without following dependency links. Root/subpath output measured 30,832/31,020 KiB; local caches 2,224 KiB; the Node overlay 1,616 KiB; ignored validation evidence 712 KiB; source 4,876 KiB and executable code 900 KiB. The environment was Node 24.18.0, Python 3.12.3, NumPy 2.5.3, Linux x86_64/kernel 6.8.0-146/glibc 2.39, existing system Chrome and Playwright 1.63.0. These measurements describe this execution, not general hardware performance.

## Remaining limits and delivery

This is complete selected **Linux milestone acceptance**, not exhaustive release certification. New Windows visual baselines, physical-device checks and human screen-reader acceptance remain unperformed. Desktop/tablet/mobile viewports and touch events are emulated. FP16/BF16 execution is software emulation; bounded matrices, lists, shapes and simulations do not supply a LAPACK replacement, an unrestricted tensor engine or cross-environment bit-identical reproducibility. The enormous-logit oracle shortcuts retain their documented equal/dominant-case bounds.

Implementation, integration source, reviewed screenshots, original manifests and final authoritative evidence are committed. The integration worktree is left clean; both original implementations and the accepted baseline remain intact. Remote synchronization, deployment and main merging are left to the user. Work stops at this completed milestone.
