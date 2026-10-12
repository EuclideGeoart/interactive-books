# M8 — Book II Part IV Probability completion report

Date: 2026-10-12 (Europe/Berlin). Worktree: `/work/interactive-books-part-iv`. Book: `Interactive-Mathematical-Foundations-Book`. Branch: `feature/book-ii-part-iv`.

All sixteen Probability chapters, IV.1–IV.16, are implemented, with 80 graded exercises and worked solutions, 32 executable Python/NumPy references, shared interactive stages, independent oracle fixtures and Linux visual baselines. Branch-local publication is **44/97 available and 53/97 planned**: Part I 9/9, Part II 19/19, Part IV 16/16; Part III remains planned. The separate Calculus branch is not a dependency.

Final acceptance status: **all 18 selected milestone gates have successful final results; all 143 reviewed images match current bytes; final response measurements are source-matched**. Work ends at this milestone for independent review. No push, merge, deployment or Part V work is performed.

## Revisions and boundaries

| Revision | Purpose |
| --- | --- |
| `9b0149902ab67a0f6b0dcfd9e7de90c88491808a` | Exact common starting revision |
| `c76b249465e974c6f61b3e42a4926d748c7dfc3d` | Block A: IV.1–IV.6, finite mass, counting, conditioning and Bayes |
| `8403ca3768b8cca23f2bf908640f0da01334b1e5` | Block B: IV.7–IV.12, random variables, distributions and moments |
| `80b6125f468e4f63dc8a386e984e51e871f607c9` | Block C: IV.13–IV.16, joint models and reproducible LLN/CLT |
| `831306d00cc9f5776901541fd81cf51ad533b4b1` | Final production source, numerical/visual refinements and reviewed baselines |
| `2f557e4313085e4327d6d15bb35272aa5640aedd` | Tested, minimal publication-contract selection correction in T0 |
| `dca3cc1a3887448ea475ab79b49c7096c1df1a0f` | Tested initial axe viewport calibration after hydration scrolling |

The two final revisions change only validation tests/planning; production source, Python references, fixtures and screenshot bytes remain those of `831306d`. A subsequent documentation-only commit contains this report and its saved evidence. Its exact identity is available with `git log -1 --format=%H -- Interactive-Mathematical-Foundations-Book/documentation/M8_PART_IV_PROBABILITY_COMPLETION_REPORT.md` from the repository root, and is reported in the delivery message. The milestone baseline is explicit throughout the manifests.

The initial checkout, branch, base and dependency symlinks were inspected before implementation. All source work is in this worktree. Book I, the other worktree's Part III content/models and the curriculum master plan were not edited. Existing dependency symlinks were reused; no dependency, Python environment, browser, clone or worktree was installed. An early tooling mistake allowed generated Astro/Vitest caches through the shared `node_modules` symlink. That transient cache write was disclosed and corrected by assigning local `.cache/astro`, `.cache/vite` and `.cache/vitest` directories. It is not represented as strict read-only compliance from the first command. Shared dependency declarations/source were not changed and no shared cache or existing data was deleted.

## Chapters and learner experiences

Every chapter contains a manipulable opening stage and a separate worked-example stage, intuition, definitions, mechanics, a derivation, exceptional examples, mistakes, executable references, exploration prompts, numerical policy, engineering/ML connections, five graded exercises and checkpoints. The established chapter contract supplies the fourteen authoring layers; twelve explicit section headings sit alongside the front matter and opening interaction.

The 80 exercise IDs are unique. Exact/numeric and choice graders use the existing exercise kit, corrective feedback and worked-solution controls. Independent literal unit expectations exercise all eighty answers, and browser contracts check the exercises and exposed feedback in both themes for every new chapter.

| Chapter and route | Principal interaction | Reviewed opening/exception states per viewport |
| --- | --- | --- |
| IV.1 Random experiments, outcomes, and sample spaces — `random-experiments` | Explicit fair die/coins or weighted outcomes; event selection; seeded observations distinct from model mass | Default, weighted (2) |
| IV.2 Events and probability mass — `events-probability` | Toggle A/B membership and edit weights; linked union, intersection, complement, inclusion-exclusion | Default, disjoint (2) |
| IV.3 Counting and finite probability where needed — `counting-probability` | Ordered/unordered choices, replacement, exact counts and arrangement-weighted examples | Default, replacement, impossible (3) |
| IV.4 Conditional probability as restricted sample space — `conditional-probability` | Retain B, display its denominator, normalize retained mass and expose an empty-conditioning exception | Default, empty B (2) |
| IV.5 Independence — `independence` | Compare exact joint mass with the product, including disjoint and zero-mass events | Default, disjoint, zero A (3) |
| IV.6 Bayes' theorem as probability-mass update — `bayes-theorem` | Prior/likelihood/evidence/posterior update, sliders, conserved mass bars and a population-count view | Default, common prior, impossible evidence (3) |
| IV.7 Random variables — `random-variables` | Change outcome-to-value mappings; group equal values while retaining source mass | Default, constant map (2) |
| IV.8 PMF, PDF, and CDF — `pmf-pdf-cdf` | Switch Binomial/Uniform/Gaussian representations and select an interval; distinguish jumps, density and accumulated mass | Default, Uniform, point interval (3) |
| IV.9 Bernoulli and Binomial distributions — `bernoulli-binomial` | Change n, p, k and interval bounds; exact normalized PMF and right-continuous CDF | Default, p=0, n=0 (3) |
| IV.10 Uniform and Gaussian distributions — `uniform-gaussian` | Support/mean/spread edits; density and CDF; shaded exact or approximate interval probability | Default, Uniform, narrow support (3) |
| IV.11 Expectation — `expectation` | Weighted mean/balance point, affine shifts and linearity with a dependent second variable | Default, shifted (2) |
| IV.12 Variance and standard deviation — `variance-standard-deviation` | Squared-distance contributions, second-moment identity and affine spread scaling | Default, constant, reversed scale (3) |
| IV.13 Joint, marginal, and conditional distributions — `joint-distributions` | Edit a 3×3 table and select cells/rows/columns; exact marginal and conditional updates | Default, independent, empty row (3) |
| IV.14 Covariance and correlation — `covariance-correlation` | Weighted scatter/table edits and affine transformations; nonlinear dependence and undefined correlation | Default, nonlinear, collapsed (3) |
| IV.15 Law of Large Numbers — `law-of-large-numbers` | Choose source, seed and count; inspect actual observations, running means, outward steps and true standard error | Default, short run, degenerate (3) |
| IV.16 Central Limit Theorem — `central-limit-theorem` | Repeated actual sample blocks, means/sums, standardization and histogram/normal comparison; size effects and assumption failures | Default, short, maximum, dependent, degenerate (5) |

Bayes and CLT are the principal interactions of Blocks A and C. Curriculum roles still follow the master plan: the existing I.3 reference role and later planned flagship roles are preserved.

## State, derivation and mathematical contracts

The implementation follows **canonical state → pure probability derivation → geometry, equations, interpretation, trace and accessible description**. Mathematical models live in `src/math/probability`; lesson adapters assemble all displayed values in `src/lessons/probability`. Preact renders those derived values through the frozen `ParameterInput`, inspector, formula scrolling, trace stepper, ID scope and lesson-state interfaces. Components contain no separate authoritative probability calculations. The shared stages cover eight related lesson families rather than sixteen separate frameworks.

Inputs are bounded and validated before committing state. Rejected numeric edits retain the accepted state and announce the error. Reset and replay use immutable trace frames; opening and worked-stage labels are distinct. Percentage inputs represent exact decimal percentages with at most two decimal places. Finite decimal values/affine coefficients similarly use the existing rational parser, with supported magnitude at most one million and at most two decimal places. Raw weights are nonnegative integers up to one million and must have a positive total; supported finite spaces have at most twelve labels.

| Model | Exact invariants and exceptional policies |
| --- | --- |
| Finite spaces/events | Normalize one raw-weight vector to exact rational mass. Event, union, intersection and complement sums use the same masses; total mass is exactly one. A zero-weight label contributes no mass. Conditional mass is undefined when P(B)=0. Independence uses P(A∩B)=P(A)P(B), including zero-event cases. |
| Counting | Enumerate selections independently of the count formula; n=2…8, k=0…4. Empty selection has count one. Impossible no-replacement choices have count zero. Unordered replacement examples receive their multinomial arrangement mass under uniform ordered draws; distinct multisets are not automatically equiprobable. |
| Bayes | Four exact joint masses conserve one; evidence is their retained total. Posterior is normalized only for positive evidence. The canonical 1% prior, 90% sensitivity and 5% false-positive example gives posterior 2/13. Population figures are expected counts in 10,000, not observed or necessarily integral counts. |
| Finite variables/moments | Group equal values and omit zero-mass support. Mean, second moment, variance and affine laws are exact. Both variance identities agree. Y=2X+1 demonstrates linearity without independence. Zero variance gives standard deviation zero; nonzero standard deviation is a numeric square root of exact variance. |
| Binomial | n=0…30, p=0…1, and selected k=−1…31. Exact mass sums to one. Empty products equal one, n=0 concentrates at zero, p boundaries are valid and impossible k has mass zero. Closed discrete intervals use F(upper)−F(lower−), retaining the lower endpoint jump. |
| Uniform | Require a<b and lower≤upper. Density, CDF, clipped interval mass, mean and variance are exact rational expressions for supported decimal input. Continuous singleton probability is exactly zero; density can exceed one. |
| Gaussian | Require all parameters finite and within ±1,000,000, positive σ and supported density/variance range. Density/CDF/interval results are explicitly numeric approximations. Standardization uses (x−μ)/σ. A finite drawn curve is not a normalization proof. Continuous singleton mass is zero. |
| Joint/covariance | Nine cell weights share exact normalization. Row/column sums and positive-denominator conditionals conserve mass exactly. Latent U,V are −1,0,1; affine images can merge, in which case scatter-point masses are summed. Covariance, both variances and ρ² are exact. Cauchy–Schwarz is checked exactly; defined ρ is the signed numeric square root and lies in [−1,1]. Either zero variance makes ρ undefined. Collapsing either image makes the transformed variables independent even if the latent table is dependent. |

The nonlinear symmetric joint example has zero covariance while remaining dependent; explanations reject an independence inference from zero correlation and a causation inference from correlation. The NumPy covariance reference explicitly recognizes constant active support, including a constant decimal shift such as 0.3, so rounding residuals cannot manufacture a defined correlation. Nonconstant variance that underflows raises a rescaling error. Sequential square-root division avoids an avoidable variance-product underflow/overflow.

### Approximation policy

Gaussian CDF evaluation integrates the positive standard-normal tail with composite Simpson quadrature using 2048 subintervals up to z=8. On this interval |φ⁽⁴⁾|<4 gives a truncation bound below 4.2×10⁻¹¹; the implementation budgets **10⁻⁹ absolute CDF error** including rounding and **2×10⁻⁹ interval error**. Beyond |z|=8 the discarded tail is below 6.4×10⁻¹⁶. Returned 0/1 there is a numerical approximation. Positive-tail interval subtraction uses negative-tail CDF values to avoid subtracting two values near one. Uniform area is analytic and exact; drawn/shaded polygons illustrate the result and do not determine it.

Against 45 independent `math.erfc` Gaussian fixtures, the final full unit gate observed maximum absolute errors **3.672617765460018×10⁻¹³ for CDF** and **7.345235530920036×10⁻¹³ for intervals**. These observations supplement the declared bound; they do not replace it with the best observed error.

Python/TypeScript sampling-number parity uses **2×10⁻¹² × max(1, |expected|)** for binary64 sums, means, transforms and variances; observed maximum scaled discrepancy is **4.579669976578771×10⁻¹⁵**. Seeds, outcomes/counts, exact population parameters, histogram counts and all supported finite rational identities are checked exactly. This numerical budget is distinct from statistical sampling variation.

## Deterministic sampling and limit-theorem policy

An explicit uint32 LCG uses recurrence `(1664525·state + 1013904223) mod 2³²`, divided by 2³², with valid seeds 0…2³²−1. Each experiment starts its own stream. There is no `Math.random()` rendering path. Python reproduces the stream independently with integer arithmetic. The source populations are Bernoulli with exact p, Uniform(0,1) sampled on [0,1), and Exponential(rate 1) using `−log1p(−u)`. Their population mean/variance remain exact model parameters. A seeded pseudorandom experiment illustrates assumptions; it is not proof that a limit theorem holds.

LLN permits 1…4000 observations, retains actual observations/sums/prefix means and counts steps that move farther from the target. The display compares the sample path with the true μ and σ/√m; it distinguishes empirical variance with divisor m from sample variance with divisor m−1, which is undefined at m=1. It never forces a path to approach monotonically or a mean to equal μ.

CLT permits n=1…100 and 10…1000 repetitions, at most 100,000 draws. Independent mode consumes contiguous blocks of one stream. All means/sums and standardized statistics are retained; the first three complete blocks supply inspectable sample detail (at most 300 displayed observations). Standardization is √n(average−μ)/σ. The dependent preset repeats one draw throughout each block: actual Var(average)=σ² rather than the iid σ²/n, with an explicit assumption warning. Zero σ makes standardization/histogram undefined and removes the normal comparison.

The histogram has 24 fixed bins on [−4,4), width 1/3, with documented binary64 `floor` edge assignment. Underflow is z<−4 and overflow z≥4. Bin mass is exactly count/R and bin density exactly 3·count/R. All bins and tails share the original repetition denominator and sum to one; visible mass is never renormalized after omitting tails. Standard-normal comparison masses use the same numerical CDF policy. Finite histograms can remain discrete/skewed and differ from the approximation; no guaranteed realized Monte Carlo error or artificial Gaussian fit is asserted.

## Independent references, fixtures and freshness

Five Python-owned oracle families use `fractions.Fraction`, standard-library numerics and NumPy checks. Expected fixtures are never generated by TypeScript. Binomial convolution/handwork, analytic Uniform expressions, `erfc` Gaussian CDFs, exact centered-moment/joint calculations and independently implemented seeded experiments check different representations of the mathematics.

| Fixture family | Deterministic cases | Independent checks |
| --- | ---: | --- |
| `probability_finite` | 372: 138 finite + 100 Bayes + 134 counting | Exact event/set laws, zero denominators, Bayes normalization and direct selection enumeration/multiplicities |
| `probability_distributions` | 384: 308 Binomial + 31 Uniform + 45 Gaussian | Exact convolution/normalization/interval endpoints, analytic area and independent normal CDF |
| `probability_moments` | 144 | Pushforward grouping, zero support, both variance identities and affine/linearity laws |
| `probability_joint` | 112 | Joint/marginal/conditional sums, weighted covariance, nonlinear dependence, signs and zero-variance images |
| `probability_sampling` | 76: 32 LLN + 44 CLT | Literal RNG sequence, actual block/sum/mean replay, bin edges/tails, degeneracy and dependence |
| **Total** | **1088** | Exact parity where supported; explicit numerical budgets otherwise |

The final oracle gate executed **346 Python test methods**, including all **32 new chapter reference files**. Missing references fail the gate. All **21 oracle families**, including the sixteen accepted earlier families, passed freshness checks against their committed fixtures. The complete unit gate passed **11,702 tests in 89 files**. Probability contributes 1214 tests in fifteen new unit files, plus curriculum/planner regressions. The type/content gate checked **431 files, zero errors and zero warnings, with five unused-symbol hints** (four earlier hints and one unused Probability formatting import).

An independent read-only mathematical review identified constant-marginal rounding in the NumPy correlation reference, exceptional-state text contrast and a Binomial boundary TeX delimiter. All were corrected with targeted regressions. Pixel review additionally found an SVG axis inheriting black fill, generic Gaussian wording in Uniform captions, a stray zero from a falsy JSX length expression and clipped native option text. Their causes were corrected; assertions protect axis fill, Uniform semantics and the degenerate CLT display. Mathematical tolerances and axe/screenshot rules were not weakened.

## Focused development validation

`M8_FOCUSED_VALIDATION_EVIDENCE.json` preserves six actual T0 manifests verbatim and compact summaries/hashes of 26 development logs, including failed attempts. Dry-run plans are not recorded as execution success.

| T0 record | Actual scope/result |
| --- | --- |
| `focused-2026-10-11T21-37-57-615Z` | Block A mathematical units, oracle and freshness gates passed. |
| `focused-2026-10-11T21-41-34-250Z` | Mobile Block A browser attempt: 37 passed/12 failed; duplicate opening/worked replay landmark labels were corrected at the shared StageFrame. |
| `focused-2026-10-11T21-57-58-034Z` | Block B mathematical gate: 11,474 tests/84 files, 326 Python methods and nineteen oracle families passed. |
| `focused-2026-10-11T21-59-44-449Z` | A/B mobile chapter attempt: 95 passed/two failed; a long IV.7 MDX display equation was split to eliminate focus-time overflow. |
| `focused-2026-10-11T22-16-07-164Z` | Block C mathematics: 11,701 tests/89 files, 346 Python methods and twenty-one oracle families passed. |
| `focused-2026-10-11T22-18-18-208Z` | Selected mobile C browser gate: 33 chapter/axe cases, seven sampling and six joint interaction cases passed (46 total), with a source-matched root refresh. |

Other affected retries corrected assertions that confused exact terminating-decimal presentation with fraction text, ambiguous selectors and browser CSS serialization precision. The last geometry assertion now checks the exact data fraction as well as an appropriate CSS rounding tolerance. An initial Block B test exposed zero-mass entries in the induced support and the model now omits them. An early C unit run hung after a mixed Number/BigInt rational call; only verified owned processes were stopped and the call was corrected to BigInt without changing the shared rational module. These attempts are retained; final acceptance applies to the corrected source.

Targeted visual captures established 135 new Probability images. Only affected captures were repeated after visual fixes. Eight publication views were explicitly recaptured with `--update-snapshots=all` because changes to small count text can fall within the established pixel threshold; four resulting publication files differ in bytes. Explicit publication-count text assertions now independently enforce 44/97. Windows and older chapter-stage baselines were not overwritten.

## Final integrated T0 milestone

The required command was invoked once in this worktree:

```sh
npm run validate:milestone -- --base 9b0149902ab67a0f6b0dcfd9e7de90c88491808a
```

The first final dry-run plan unexpectedly classified the newly edited generic publication test as unknown and expanded to complete root browser coverage. An orchestration mistake continued into the command despite the failed plan assertion. The run completed type/content, full units, full oracle/freshness, both production verifications and one necessary subpath refresh, then began the unintended broad browser gate (36 completed case lines). Its verified owned process tree was interrupted; the other agent's processes were not touched. This is a validation-process deviation, not an uninterrupted successful T0 run or complete-book browser certification.

The original manifest is `validation-results/milestone-2026-10-11T22-45-38-411Z/manifest.json`, saved **verbatim** as `M8_VALIDATION_MANIFEST.json`; it has the six successful recorded results and no final passed status. The dry plan and execution logs remain in ignored validation evidence. The minimal correction registers `tests/e2e/chapters.spec.ts` as known shared contract infrastructure. Its **23 planner regression tests passed**, including the retained fail-conservative unknown/missing/deleted cases and exact affected Bayes/distribution consumer selection.

The corrected inspected plan, saved as `M8_MILESTONE_PLAN.json`, is milestone mode, `partial: false`, **18 selected gates**, all **44 published chapters**, all **16 Probability interaction chapters**, **89 unit files** and **21 oracle families**, with no unknown-file reasons. Shared expansion selects all read-only contracts, full both-theme axe on all new chapters and representative older I.1/I.3/I.9/II.1/II.10, shared controls/shell regressions and authoritative root visuals. It does not advertise the remaining older deep interactions as newly certified.

Following the accepted M6-C continuation pattern and the instruction to avoid repeating successful full gates, the completed five required gates were retained and only the changed planner unit and the remaining thirteen selected browser/visual gates were run. The continuation verifies identical retained commands, the test/planner-only diff and fresh source signatures for both mounts before browser launch. `M8_VALIDATION_CONTINUATION.json` records separate commands, results, timings, per-gate logs and production signatures; the original manifest is not rewritten.

The first continuation contract/axe gate completed **917 passing cases and four failures**, all IV.13/IV.14 initial tablet scans in both themes. `hydrateAll` scrolls through all islands and ends near the final exercise, leaving some earlier fields partly behind the frozen sticky header. A production-page diagnostic with all original tags reproduced the hydration-scroll `target-size` failures, found zero violations at the chapter top, and verified every affected input as **120×44 CSS pixels with a working pointer hit when fully revealed**. `M8_TABLET_AXE_DIAGNOSTIC.json` retains that evidence, including an independently forced viewport that did not reproduce the issue. Initial chapter scans now explicitly return to scrollY=0; feedback scans and every axe rule remain unchanged. The affected two chapters passed **all twelve both-theme cases across desktop/tablet/mobile**, resolving all four failures without rerunning the 917 successful cases. The type/content gate was rechecked after this test-only change and again passed 431 files with zero errors/warnings and five hints. `M8_VALIDATION_CONTINUATION_INITIAL.json` preserves the failed continuation verbatim. The post-calibration dry plan has the same eighteen commands and no unknown inputs.

All **18 selected gates have successful final results** across the retained original checks and continuation. There are no unresolved failed selected cases. The full unit/oracle gates were not repeated after the test-only corrections.

| Selected gate | Final evidence | Recorded seconds |
| --- | --- | ---: |
| complete type/content check | 431 files; zero errors/warnings; five hints; rechecked after calibration | 10.35 |
| complete units | 11,702 tests in 89 files passed | 10.03 |
| complete oracle + freshness | 346 Python methods and all 21 fixture families passed | 35.26 |
| root production verification | 48 pages / 8 stylesheets / 298 files passed | 0.14 |
| subpath production verification | 48 pages / 8 stylesheets / 298 files passed | 0.14 |
| all read-only chapter contracts + representative both-theme axe | 921 selected cases covered: 917 passed initially; all 4 failures resolved in 12-case retry | 416.64 initial + 40.3 retry |
| affected chapter interactions: probability_bayes | 12 passed (9.9s) | 10.22 |
| affected chapter interactions: probability_distributions | 24 passed (13.9s) | 14.19 |
| affected chapter interactions: probability_sampling | 21 passed (14.1s) | 14.42 |
| affected chapter interactions: probability_finite | 24 passed (7.1s) | 7.45 |
| affected chapter interactions: probability_counting | 6 passed (2.7s) | 3.02 |
| affected chapter interactions: probability_joint | 18 passed (11.5s) | 11.85 |
| affected chapter interactions: probability_moments | 12 passed (5.0s) | 5.39 |
| affected chapter interactions: probability_variables | 6 passed (2.6s) | 2.88 |
| shared cross-chapter controls | 45 passed (13.0s) | 13.32 |
| root shared shell, navigation, accessibility and deployment | 5 skipped; 289 passed (2.1m) | 124.52 |
| subpath prefix-dependent navigation, assets, anchors, routes and hydration | 3 skipped; 75 passed (35.3s) | 35.77 |
| authoritative root visuals | 15 skipped; 159 passed (59.9s) | 60.23 |

Seconds are command wall times except the standalone 12-case retry, whose 40.3 seconds are the Playwright-reported duration. The one subpath production refresh took 13.327 seconds. The later type recheck and 23-case focused planner check are recorded separately; their command wall times were not captured.

The eight Probability family gates passed **123 interaction cases with no skips**. All **48 Probability visual cases** passed with no skips and compare 135 images. Root shell coverage has five inherited skips: touch-only tests on desktop/tablet, the wide margin outline on tablet/mobile, and the narrow-screen Part ruler case. Subpath coverage has the latter three responsive skips. The fifteen visual skips are existing viewport-specific cases in `visual.spec.ts` (phone-only overflow, selected foundation/dark/zero states and publication views); no Probability case was skipped.

Static deployment verification covers **48 HTML pages, eight stylesheets and 298 files per mount** at `/` and `/math-foundations/`. Browser deployment batches require every published route and island, anchors, prefix-safe assets, error-free requests and hydration. Source fingerprints allow matching builds to be reused; the final milestone reused root and refreshed subpath once.

## Browser, accessibility and Linux pixels

The original generic WCAG 2 A/AA, WCAG 2.1 A/AA, WCAG 2.2 AA and best-practice axe tags and rules remain intact. For each new chapter, the initial state and feedback after checking all five exercises with their solutions exposed are checked in both themes at desktop/tablet/mobile widths. The generic test submits zero to numeric fields or the first choice to radio questions; these submissions are not guaranteed to be incorrect for every question. Literal grader unit checks separately cover correct and incorrect answers. Additional exceptional-state full-page WCAG 2/2.1 axe checks cover Bayes impossible evidence, narrow continuous density, zero joint marginals and the dependent CLT warning. Error text uses the established AA-capable caution text token.

Focused interaction cases cover every chapter's numeric keyboard edits, invalid-input retention, reset, immutable trace replay and live announcements. Family-specific assertions check event/weight synchronization, conditional denominators, prior/population/posterior agreement, PMF/CDF boundary conventions, affine moments, selected joint mass, seeded paths, actual sample blocks and degenerate/dependent CLT states. Mobile cases use real Playwright touch events on representative presets; keyboard controls and numeric alternatives remain available. Shared older vector/quantity controls retain their keyboard, rejection, reset and announcement regressions.

All **143 Linux acceptance images** were individually viewed: **135 Probability images** (45 states × three viewports), plus **eight publication views**. Desktop is 1440×900, tablet 820×1180 and mobile 390×844 with device scale factor 2. Full images were inspected, with additional original-resolution crops where needed; this was not a contact-sheet-only approval. The review records contain image paths, dimensions, SHA-256 hashes and findings:

- `M8_SCREENSHOT_DESKTOP_REVIEW.json`: 49 images.
- `M8_SCREENSHOT_TABLET_REVIEW.json`: 46 images.
- `M8_SCREENSHOT_MOBILE_REVIEW.json`: 48 images.

The combined inventory was checked for exactly 143 distinct paths, current matching hashes and passing review status. Controls, tables, charts, equations, plot captions, exceptional warnings and mass/density semantics were reviewed. Plots retain clear negative scatter axes; coincident affine images use merged mass circles; responsive panels stack without horizontal page overflow. Tick labels are spaced by measured label width and axes explicitly have no fill. Linux root screenshots remain authoritative, with the unchanged `maxDiffPixelRatio: 0.004`.

## Interactive response measurements

Final measurement: `2026-10-11T23:18:32.213Z` on Linux, Chrome **155.0.8059.39**, 12th Gen Intel(R) Core(TM) i5-12600, 1440×900, unthrottled, reduced motion enabled. The recorded production signature matches the accepted root build. All 220 warmup/measurement events were accepted and the **200 retained measurements had zero samples over 16.7 ms**. The timing-summary self-check also passed.

| Case and method | Samples | p50 (ms) | p95 (ms) | p99/max (ms) |
| --- | ---: | ---: | ---: | ---: |
| Bayes prior drag, 5–80%: pointer → next frame | 80 | 5.9 | 8.7 | 9.9 / 9.9 |
| Gaussian lower-bound drag, −3 to −0.3: pointer → next frame | 80 | 5.4 | 5.8 | 6.3 / 6.3 |
| CLT Exponential, seed 42, n=100, R=1000 (100,000 draws): replay click → next frame | 20 | 14.4 | 14.7 | 15.2 / 15.2 |
| LLN Bernoulli(1/4), seed 42, m=4000: replay click → next frame | 20 | 14.4 | 15.0 | 15.0 / 15.0 |

Both slider cases also record native-input-to-frame timing separately from pointer-to-frame timing in the raw evidence. Replay checks confirm actual accepted recomputation/announcement behavior and identical seeded output; these are not untouched static-graph measurements.

The committed script `scripts/measure-probability-input.mjs` uses capture-phase trusted native slider events from a Playwright mouse drag, then first `requestAnimationFrame` followed by a `MessageChannel` task. It checks that the accepted parameter and rendered model changed. Sampling replay uses a trusted click and verifies both unchanged deterministic output and a changed announcement after bounded recomputation. Each case discards five warmups; slider cases retain eighty events and replay cases twenty. Percentiles use nearest rank. The raw samples, environment and production fingerprint accompany the report in `M8_INPUT_RESPONSE_MEASUREMENTS.json`.

This measures software event-to-next-frame scheduling, including derivation/render work. It excludes physical input transport, display scanout and presentation completion and does not measure sustained drag throughput. The host is shared and unthrottled; the measurements are not physical-device or isolated-hardware guarantees. Earlier source-version timing runs remain development evidence and are not substituted for the final accepted production fingerprint.

## Resources, integration and deferred work

Final resource measurement: `2026-10-11T23:20:57+00:00`, **25.85 GiB available on /**. Apparent and allocated sizes below exclude traversal into the shared dependency symlinks; they include existing baselines and retained development/failure artifacts.

| Artifact | Apparent MiB | Allocated MiB |
| --- | ---: | ---: |
| `dist` | 15.76 | 16.55 |
| `dist-subpath` | 15.82 | 16.67 |
| `.cache` | 1.62 | 1.73 |
| `validation-results` | 66.35 | 68.20 |
| `playwright-report` | 0.59 | 0.59 |
| `tests/e2e/__screenshots__` | 53.16 | 53.93 |
| `documentation` | 5.85 | 5.95 |
| Book working directory (dependencies linked) | 169.60 | 175.87 |

The **135 new Probability PNGs occupy 25.18 MiB**. Screenshot file bytes increase by **25.17 MiB** over the base, including the small net byte change in four publication images. The **five fixtures / 1088 cases occupy 1.02 MiB**. The larger ignored validation directory retains earlier failures, the interrupted attempt and final acceptance results; no data was automatically cleared. `M8_RESOURCE_MEASUREMENTS.json` saves exact bytes and the measurement method. This report and its receipt add a small amount after the recorded measurement.

All heavyweight validation, builds, browser tests, screenshot generation and response measurements used `/tmp/imf-heavy.lock`. T0 acquires it itself; direct operations acquire it explicitly without nesting. Disk space was checked before heavyweight work and remained above the 15 GiB pause threshold during this milestone. Routine Playwright runs used `--trace off`; failure screenshots and useful acceptance artifacts are retained. No existing data was deleted to make space.

The integration owner must reconcile the minimal branch-local changes to `src/curriculum/curriculum.ts`, `scripts/validation-plan.mjs`, curriculum/planner unit tests and generic chapter publication assertions with the concurrent Calculus branch. Local cache settings in `astro.config.mjs`/`vitest.config.ts` and symlink-aware `.gitignore` entries also require ordinary conflict review. The Probability measurement script is registered with T0. No broad platform refactor, shared frozen-control change, Part III import or curriculum-master edit was made.

Windows baselines/testing, real desktop/tablet/phone acceptance, human screen-reader workflows and exhaustive release certification remain deferred. Automated axe, keyboard/touch emulation and pixel review do not claim those manual checks. The separate integration may later reach 59/97 available; this branch's accepted publication target is **44/97**, with **53 planned**, and no later part published. Independent review is the next step.
