# Part III numerical and rendering contract

## APIs and representations

All source is owned by p03. Model functions are pure; they create new results and do not sort or edit caller-owned arrays. Numerical quantities are binary64 in both runtimes. Python common.number returns a normalized float for quantities and an int for bounded integer fields. Booleans, strings, containers, nonfinite quantities and conversion overflow are rejected. Seed/count/k/dimension contracts remain integers.

| Module | Public entry points | State and output |
| --- | --- | --- |
| model/distance.ts | distance(a,b,metric='L2',p=2,scales?), metricPower, finite, bounded, compareIds, pointVector | Equal-length 1–32 component vectors; finite quantities; positive supplied scales; L1/L2/Lp, p in [1,8]. An omitted entire scale vector defaults to units. Python uses a private omitted-argument sentinel; explicit None is invalid, matching TypeScript null. Null, undefined or holey supplied components are invalid. |
| model/neighbors.ts | NEIGHBOR_CANONICAL, deriveNeighbors, neighborPreset, neighborTrace | 1–32 unique-ID rows with two coordinates, A/B categories and numerical targets. Query is 2×1; X n×2; distances/targets n×1. Integer k in [1,64]. |
| model/metrics.ts | METRIC_CANONICAL, deriveMetrics, summarizeDistances, metricTrace | Two-point metric/scales plus 24 rows, dimension 1–32, uint32 seed, cube/line distribution and raw/per-coordinate normalization. |
| model/bayes.ts | BAYES_CANONICAL, deriveBayes, bayesPreset, editBayesClass, bayesTrace | Ordered A/B classes, binary two-feature query, boolean evidence mask, nonnegative alpha/prior weights, integer counts and positive counts. Query/prior/posterior columns 2×1; likelihood ledger 2×2. |
| lesson.ts | deriveNeighborLesson, deriveMetricLesson, deriveBayesLesson, moveQuery, pointerQuery, QUERY_UI, PLANE, approx | One derived numerical object supplies every plot coordinate, table, formula, inspector and spoken numeric result. |
| stages | NeighborStage, MetricStage, BayesStage | Required stable scope:string. Use a different scope for every island on the same page. Accepted IdScope/useScopedId generate SVG title/desc/clip/help IDs. |

Canonical code files nearest_neighbors.py, distance_metrics.py and naive_bayes.py expose derive and trace and run directly with python -B. common.py supplies strict quantities, from-scratch NumPy norm and the shared integer LCG. Mathematical vectors are columns; X batches put observations in rows. There is no learned weight matrix or intercept in these Part III mechanisms.

## Distance, ordering and aggregation

The norm is (sum |(a_j-b_j)/s_j|^r)^(1/r), with r=1 for L1, 2 for L2 and the supplied p for Lp. Scaling by the largest absolute normalized difference before powers avoids overflow from an unnecessary square. A nonfinite difference, scale division or final norm throws an informative RangeError/ValueError.

Nearest rows sort by computed distance, then UTF-16 code-unit ID order; Python encodes IDs as UTF-16BE with surrogate preservation. No locale comparison or distance epsilon is used. Duplicate coordinates retain separate identities. Votes count A/B, with A on an exact count tie. Regression averages the same selected numerical targets; a largest-target rescaling avoids an unnecessary overflowing target sum.

k>n preserves the requested k and complete ranking, returns no selected IDs, and gives null predictions plus an explicit reason. It never clamps k or repeats a row. Empty or oversized data, sparse/missing observation positions, non-record or incomplete rows, empty/duplicate IDs, invalid category/quantity and noninteger k are rejected. Every observation must provide its own id/x/y/category/target fields; Array.from visits every index, including holes, before a result or trace can be returned. Malformed records raise an indexed RangeError/ValueError instead of incidental property-access errors. Initial query selects s4/s2/s3, votes A:2/B:1, and regression mean6. Right query (1.5,0) selects s4/s5/s6 and mean10.

Python converts accepted integer-spelled coordinate/target quantities to binary64 before subtraction and duplicate comparisons. Thus 2^53+1 versus 2^53 and 10^100+1 versus 10^100 have distance0 after representation conversion, matching JavaScript. Wide finite floating norms remain supported by the API.

## Seeded experiment and stable summary

The accepted generator is t_next=(1664525*t+1013904223) mod2^32, u=t/2^32. Each of24 rows draws32 coordinates, maps to2u−1 and retains its prefix for the selected dimension. The line distribution keeps only coordinate1. Simulation scales are all1; the upper metres/seconds pair has separate reference scales. Per-coordinate normalization divides each norm by d^(1/r).

Reported SD divides by n; it summarizes the displayed finite sample, not an unbiased population estimator. Mean/SD calculations rescale by the actual maximum first. Relative spread and CV are computed at the unit scale before restoring absolute units. All-zero undefined relative metrics occur only when actual max==0. Normalized values and squared deviations are summed before their respective division by n, preserving constant-input mean and exactly zero SD even at the largest finite magnitude. Final summary quantities must be finite; any overflow raises an informative RangeError. No epsilon zeroes distinct observations.

meanUnderflow/sdUnderflow distinguish a positive result rounded to0 from actual zero observations. [0,1e−200] has mean=SD=5e−201 and CV1. Equal smallest subnormals have a nonzero mean and SD0/CV0. [0,smallest] has underflowed absolute mean/SD but defined CV1/relative spread2. The exact Fraction summary oracle detects square-root ties exactly when variance is a perfect rational square, so Decimal approximation cannot incorrectly round a half-subnormal upward.

The prose derives E[squared L2 distance]=d/3 and variance4d/45 under independent uniform-coordinate assumptions. The simulated draws are deterministic pseudorandom values, not proof of empirical independence. The line counterexample prevents a universal dimensional concentration claim.

## Bernoulli Bayes support and exact decisions

For class count n, positive count m and alpha, present probability is (m+alpha)/(n+2alpha); absence is (n−m+alpha)/(n+2alpha). Only observed features contribute factors. Counts/positive counts are integers ≤1e6; prior weights and alpha are nonnegative ≤1e6. Priors normalize chosen weights separately from counts. Every required query, evidence and positive-count position is validated by index, including sparse tuples, before deriving values or creating replay.

A zero prior excludes a class. An observed denominator0 with positive prior is an unavailable estimate. Numerator0 at positive denominator is structural zero support. No positive prior distribution, an unavailable required estimate, or all-impossible evidence yields null posterior/prediction plus the respective reason. A zero-prior class's unavailable feature estimates cannot contribute mass. Unobserved factors are omitted, including otherwise unavailable estimates.

Representable likelihood ratios are formed before logarithms so equal ratios have the same numeric log. A positive ratio underflowing to0 instead uses log(numerator)−log(denominator), retaining a finite log. Null logs stand for mathematical −infinity/undefined with reason; never serialize NaN or infinity.

Numeric posterior normalization is actual log-sum-exp: subtract maximum finite log score, exponentiate and divide by the positive shifted sum. Raw scores/evidence may underflow0 while the posterior remains defined. Row/feature underflow flags identify this case.

Decision ordering compares exact rational expressions from the ACCEPTED BINARY64 INPUTS. The common normalized-prior denominator cancels, so compare weight_c × product of observed count-likelihood ratios. TypeScript privately decodes float64 bits into reduced BigInt fractions and compares cross-products. Python privately uses Fraction.from_float(float(value)) and exact count arithmetic. No BigInt or Fraction object enters stored state or immutable traces; these temporaries are never derived output or serialized fields. This is only a two-class/two-feature helper, not a new shared rational platform.

On a proved positive exact tie, both numeric log scores use the same finite representation before log-sum-exp, giving posterior[.5,.5] and A. For a non-tie, prediction uses exact scoreOrder (-1/0/1/null), even if approximate numeric posteriors coincide. tiedPosterior means a proved exact model-score tie, never an epsilon or equality of rounded display text. roundedPosteriorTie separately reports coincident numeric posterior values for a non-tie.

Fixtures include distinct-count 1/9 likelihood ties; count7 products 1×6 vs2×3; prior-weighted and alpha1 smoothed ties; and an alpha=smallest-subnormal non-tie whose displayed values both round. The independent oracle also interprets inputs as Fraction.from_float(float(value)); explicitly generated exact Fraction coordinates are retained. The exact educational posterior135/263,128/263 is proved using integer weights3,2, while the canonical0.6/0.4 input weights are their binary64 approximations.

Counts originally summarize data/p03/bernoulli-toy.json. The empirical A joint frequency1/6 differs from marginal product1/9. Conditional independence is the MODEL assumption. Edited count provenance is marked, rather than claimed to be the original records.

## Immutable replay and input identity

traceFrom produces deep detached frozen plain-data states: neighbor trace4 frames; metric trace5; Bayes trace4. Seek replaces the entire displayed state. Editing begins there, cancels replay and preserves current other fields. Reset restores canonical. There are no autoplay timers.

The Part-local wrapper delegates mathematical state to accepted useLesson and navigation to TraceStepper. Control revision changes only on reset/replay/seek/replacement, retaining focused NumberField identity on ordinary numeric commits. A separate synchronous drag epoch invalidates pending speech/capture on every successful non-pointer mutation. Pointer updates are silent until release/cancel; the already-derived result supplies speech. Stale held speech cannot overwrite a later committed numeric result.

UI pair/sample coordinates are [−3,3], scales[.1,10], counts[0,20], weights/alpha[0,10]. The adapters reject unsupported states before changing the view. k/seed/dimension/p use model bounds. Arrow steps .1/.5 preserve existing fine precision; pointer movement explicitly snaps to .1 and stops at±3. Invalid drafts remain visibly rejected with the previous valid state retained.

## Projection and accessibility

Query planes have viewBox0 0 640 640, origin(320,320), equal numerical scale80: cx=320+80x, cy=320−80y. Points, selected links, query diamond and96-segment radial contour are computed in lesson.ts. Contours are illustrative polygonal projections and clipped at the plot boundary; the exact ranking/table decides membership. The metrics distance strip has its own viewBox0 0 640 220 and normalized min/max positions; vertical offsets only separate overlapping dots.

At measured widthW, fontSize=max(16,14*640/W) and hitRadius=max(11,23*640/W), giving ≥14 physical CSSpx text and ≥46px query hit diameter. Stroke widths do not scale. Meaningful axes use the accepted muted contrast role; categories use squares/triangles, selection uses filling/links, and IDs/values remain available without color. Only handles use touch-action:none. Fieldsets have min-inline-size0; legends wrap. Long tables are bounded scroll regions, and inspector values preserve readable width while wrapping long text.

SVG numerical attributes are checked independently at1e−9 absolute SVG units. Painted getBoundingClientRect centers are checked in CSS pixels at.02 absolute tolerance for browser layout quantization; this does not weaken numerical fixtures.

## Independent evidence and tolerances

Independent norms use high-precision Decimal powered sums from exact represented inputs; neighbor selection exhaustively enumerates small subsets with rational target averaging. The seed oracle uses a closed-form modular geometric sum rather than a stepwise LCG translation. Bayes posterior expectation uses exact mass multiplication/division instead of NumPy log normalization.

Arithmetic parity tolerance is 2e−12+1e−12×abs(expected), covering norm/log library and reduction rounding. Decision IDs/classes/tie/undefined flags are exact. Tiny mean/SD regressions use equality to exact representable outputs; broad absolute tolerance cannot hide their underflow. No tolerance increase was made for the peer reproducers.

Oracle manifest selfTests: independent.py, test_instance_methods.py. goldenChecks: generate_fixtures.py with --check. Independent committed fixtures contain complete before/after and full-state traces,45 numerical cases plus7 summary boundaries, and reject missing/stale bytes. Counts should be read from the actual handoff inventory for the final source.

No full type/production/browser/visual acceptance was run by this agent. The owner must allocate and execute those gates.
