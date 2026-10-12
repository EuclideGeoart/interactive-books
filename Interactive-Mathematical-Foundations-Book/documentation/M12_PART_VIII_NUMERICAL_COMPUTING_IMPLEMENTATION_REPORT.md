# M12 — Part VIII Numerical Computing implementation

Phase 1 is complete and **READY FOR INTEGRATION**. This is focused implementation evidence. No branch-local `validate:milestone` or `validate:exhaustive` was run; the single combined M11+M12 acceptance remains the integration owner's next phase after Agent A supplies its committed, clean handoff.

## Revisions and scope

- Common accepted baseline: `5c97622e5ef16b0f2a1d83d8adb906db7df04bbd`.
- Implementation worktree: `/work/interactive-books-part-viii`; book: `Interactive-Mathematical-Foundations-Book`.
- Branch: `feature/book-ii-part-viii-numerical-computing`.
- Block A: `3b2d0917723d3b953f3c42207c8e582d08015192`.
- Block B: `ef8c26a4dcc01d30c1ace3f6e2ff64bbc72cc9f5`.
- Complete implementation source and reviewed Block C evidence: **`615cc9b9b25c32f7e87d3aa4917015e7df90d5e9`**. The following report commit adds this document only; it does not change executable source or fixtures.

The starting branch, clean worktree and exact baseline were checked before implementation. The branch now publishes **89/97 chapters**, with all eight Part VII chapters still planned. It supplies exactly **10 interactive MDX chapters, 50 graded exercises and 20 runnable Python references**. Every chapter has an opening explorer, definitions, mechanics, derivation, worked replay, pedagogical/NumPy code, exploration, counterexamples, numerical limitations, ML/engineering connections, five exercises and a summary. Authoritative curriculum titles and roles are unchanged.

No Part VII development files, Book I files, accepted earlier mathematical models or master plan were edited. No push, deployment, main merge, repository clone, dependency installation, browser download, new virtual environment or worktree removal occurred.

## Chapter routes and models

| Chapter | Root route | Authoritative computation |
|---|---|---|
| VIII.1 Floating-point representation | `/chapters/floating-point-representation/` | Exact direct conversion, bit fields, neighbors and ULP spacing |
| VIII.2 Rounding and representation error | `/chapters/rounding-representation-error/` | Intended decimal rational, stored approximation and rounded addition |
| VIII.3 Error propagation and conditioning | `/chapters/error-propagation-conditioning/` | Exact square/shifted-reciprocal sensitivity and answer-error decomposition |
| VIII.4 Catastrophic cancellation | `/chapters/catastrophic-cancellation/` | Naive subtraction, rationalized form and exact radical enclosure |
| VIII.5 Overflow and underflow | `/chapters/overflow-underflow/` | Format boundaries, gradual underflow, exact-zero versus rounded-zero classification |
| VIII.6 Stable algorithms | `/chapters/stable-algorithms/` | Scaled norm, small-input functions, compensation, shifted softmax/LSE, bounded loss scaling |
| VIII.7 Numerical linear algebra realities | `/chapters/numerical-linear-algebra/` | Pivoted 2×2 solve, materialized inverse, exact intended/stored systems, residual/forward error |
| VIII.8 Sparse matrices and sparse structure | `/chapters/sparse-matrices-structure/` | Exact COO aggregation, canonical CSR traversal and sparse multiplication |
| VIII.9 Vectorized computation | `/chapters/vectorized-computation/` | Trailing-axis broadcasting, source indices, exact values and axis sums |
| VIII.10 Reproducibility, random seeds, and nondeterminism | `/chapters/reproducibility-random-seeds/` | Fixed seeded stream/state replay, specified binary64 associations and comparison budget |

All authoritative computations are in `src/math/numerical-computing/{floating,error,algorithms,solver,sparse,tensors,reproducibility}.ts`. The three lesson adapters and stage families in `src/lessons/numerical-computing/` derive inspectors, formulas, bit/grid scenes, tables, error measurements, immutable semantic traces and accessible descriptions from one state and one pure model. `NumericalStage` reuses accepted lesson state, ID scopes, inspectors, parameter/segmented controls, trace playback and labelled keyboard-scrollable tables. Formatting occurs in the adapter; the rendering layer does not independently calculate numerical answers.

Accepted exact rational operations, matrix models and explicit seeded utilities are reused. Part VII softmax is connected conceptually in the prose; no unmerged Part VII module is imported.

## Numerical policies

- Binary64, binary32, FP16 and BF16 have their own exponent widths, fraction widths, biases, subnormal spacings and range limits. FP16/BF16 operations are explicitly software emulation. Exact rational conversion rounds directly to the requested format with **round-to-nearest, ties-to-even**, preserving signed zero and handling carry, overflow, subnormal boundaries, infinities and NaN. There is no conversion through an intermediate floating format when claiming direct rounding.
- Stored bits and displayed decimal formatting remain distinct. Intended-decimal representation error and actual evaluation error are exposed separately. Rounded addition is not presented as exact real arithmetic.
- Conditioning belongs to the mathematical problem; stability belongs to the operation sequence. The sensitivity model separately measures intended input perturbation, represented input effects, evaluation roundoff and the error of the computed answer. Poles and zero-reference relative errors have explicit classifications.
- Cancellation uses integer-square-root rational bounds with 220 fractional binary bits. The true result and signed error are enclosures, with their midpoint labelled as a display approximation. Both naive and stable paths show actual binary64 intermediates, including loss of the `x+1` increment. The stable rearrangement is bounded to `0≤x≤1e300` and does not claim to repair arbitrary conditioning or overflow.
- The norm and small-input functions have independent live rational bounds. Forty-eight series terms have stated remainder bounds. Neumaier summation shows each correction. Softmax/LSE exposes shifted logits, exponentials, their sum, probabilities and finite log-probabilities even when a probability underflows. No arbitrary live softmax result is assigned a fabricated exact reference; committed cases are checked independently with Decimal.
- Loss scaling demonstrates a single software FP16/BF16 storage boundary and binary64 unscale, with both an underflow improvement and a scaling-overflow counterexample. It is not a claim about arbitrary mixed-precision workloads.
- The solver separates exact intended rank from represented-input rank. A relative pivot diagnostic tolerance warns without redefining exact rank. The counterexample has computed residual zero but exact intended residual `1e-16` and forward error `1e-4`. Pivoting, rounded singularity, rank deficiency and inconsistent systems are explicit. Non-finite inverse/solver answers retain exceptional classifications rather than passing a finite-error comparison.
- Sparse duplicates are summed exactly and only exact aggregated zeros are removed. A near-zero diagnostic retains nonzeros. CSR pointers include empty rows; the vector length and all zero-based coordinates are validated. Sparse products traverse actual CSR nonzeros, with the accepted dense multiplication as a separate cross-check. Byte costs explicitly describe hypothetical packed Float64/int32 arrays, not rational-object memory or guaranteed speedups.
- Shapes have at most four axes of size 0–4, with at most 64 elements per input/output. Scalars, batches, incompatible trailing dimensions, compatible-but-bounded-out results, negative reduction axes and empty sums are distinct. Indices and integer-valued computations are exact. Computational vectorization is distinguished from geometric vectors and wall-clock performance.
- The RNG is the accepted fixed LCG32 specification, not an unseeded rendering source. Literal states and replay compare exactly; state `378494188` resumes the suffix after two draws from seed 42. The arithmetic variation is deterministic and exposes both associations' actual intermediates and exact intended reference. Finite comparisons use an explicitly chosen absolute/relative budget; overflowing budgets and non-finite operands cannot give a false positive. A seed alone makes no cross-RNG/version/hardware/parallel-execution promise.

## Independent oracle and fixture evidence

| Family | Method independent of browser model | Committed cases | Python self-tests |
|---|---|---:|---:|
| `numerical_floating` | Fraction ordered-code binary search for rounding; Decimal450 radical references; exact sensitivity calculations | 245 | 5 |
| `numerical_algorithms` | Decimal1000 small-function references/Decimal200 other elementary functions; Fraction summation/scaling; independent rational row reduction and inverse-column solves | 46 | 7 |
| `numerical_structure` | Fraction coordinate dictionaries, Cartesian index dictionaries, arbitrary-precision modular integers, native specified float associations; NumPy cross-checks | 36 | 5 |
| Total | Byte-for-byte freshness checks | **327** | **17** |

Each chapter's pedagogical and NumPy references executes through the oracle self-tests: all 20 are runnable in the reused canonical Python environment. The primary structure fixture bytes use the standard library and do not depend on NumPy availability. NumPy random samples are explicitly seeded or restored from a recorded same-generator state before drawing.

Bits, special-value signs, classifications, discrete structures and rational quantities compare exactly. All finite FP16/BF16 encodings were exhaustively round-tripped, including both zeros. Fixture cases also include halfway ties, underflow/normal transitions, overflow thresholds, NaN and infinities. Elementary binary64 references retain a four-actual-value-ULP allowance; the algorithms fixture run observed a worst case of two ULPs. No existing mathematical, accessibility or screenshot budget was relaxed.

## Focused checks and real correction history

The committed raw logs and per-block JSON evidence are the authority; counts from overlapping runs are not added as if they were distinct tests.

- Block A's focused eight-file unit run passed 442 tests; its later immutable bit-edit lesson run passed 26 tests. Five oracle self-tests and 245 fresh fixtures passed. The initial browser run retained four input-timing failures alongside 44 passes. A shared synchronous draft-reset correction was followed by all 12 affected input checks passing. Existing successful exercise and both-theme accessibility checks were retained. Final captures and the explicit mobile bit/format touch check passed.
- Block B's focused nine-file run passed 279 tests, including the FP16/BF16 round-trip, lessons, grading, parity, curriculum/content and planner. Seven oracle self-tests and 46 fresh cases passed. The first oracle correction replaced Python 3.12 builtin `sum` with an explicit naive left fold; a too-coarse Decimal reference was increased to 1000 digits for tiny series errors. Special-value parity was corrected to strict signed-zero/NaN/infinity checks. Browser/visual selection passed all 36 checks. Real range/reference presentation fixes received 12 targeted accessibility/visual checks and six forced fresh captures, without repeating the successful solver checks.
- Block C's focused eight-file run passed 283 tests, with five oracle self-tests and 36 fresh cases. One subsequently added ownership assertion assumed numeric order in a filename-ordered catalog; its original failure log is preserved, and all three corrected ownership tests passed. The focused browser/visual selection passed **37/39**, with the two desktop/tablet touch-only cases explicitly skipped. Mobile touch, actual DOM values, invalid input retention, main/worked keyboard replay, both-theme axe, all 15 exercises and nine visual tests passed. No visual defect required recapture after review.
- The last Astro check examined 581 files with **zero errors, zero warnings and five existing hints**. `git diff --check` passed before each block commit.

Evidence files: `documentation/M12_BLOCK_{A,B,C}_EVIDENCE.json`, the adjacent `M12_*.log` files, and `documentation/M12_SCREENSHOT_INVENTORY.json`. The inventory records dimensions, SHA-256 and individual review notes for **93 Linux images**: 30 Block A, 30 Block B and 33 Block C across desktop/tablet/mobile. It covers negative zero, subnormals, NaN, near-halfway rounding, poles, cancellation, underflow, overflow, loss-scaling failure, ill/rounded/exact singular matrices, duplicate cancellation, empty rows/axes, incompatible/batched shapes and recorded replay/budget variation. Tables and formulas retain labelled keyboard scrolling where their exact data exceeds a narrow viewport.

T0 registers all three numerical families, their kinds, numerical units, independent oracle families, browser interactions and exact chapter screenshot mappings. Dependency closure includes literal sibling Python imports, including helper users in oracle families. Shared lesson/exercise/validation tests retain every actual family owner. Unknown/deleted inputs still expand conservatively; the focused ownership checks verify the new structure consumers and screenshots without accidental full-root expansion.

## Resources and integration handoff

The existing individual-package overlay and canonical `.venv` were reused, with independent `.cache/astro` and `.cache/vite`. Heavy root builds and direct browser/capture jobs acquired `/tmp/imf-heavy.lock`; disk was checked first. The final root build produced 93 pages (89 chapters plus shell pages) in 19.14 seconds. Build output is approximately 29 MiB, local caches 2.2 MiB, authoritative numerical models 52 KiB, lesson code 100 KiB and three numerical fixture files about 200 KiB combined. The root filesystem remained approximately **20 GiB free**; no cleanup of any other agent's outputs was performed.

The branch is ready to be used as the integration starting point. Keep it intact, merge Agent A's committed clean Part VII branch into a new `feature/book-ii-m11m12-integration` worktree, reconcile shared ownership/publication tests and replace only publication-sensitive shared screenshots for 97/97. Then inspect the full dry-run plan and execute the user-specified one combined milestone command against the accepted baseline. No standalone M12 certification has been substituted for that obligation.

Windows baselines, physical devices, human screen-reader review and exhaustive release certification remain unperformed. The reviewed desktop/tablet/mobile captures and touch events are Linux/emulated evidence. Algorithms, matrices, shapes and simulation sizes are deliberately bounded; these lessons do not supply a general LAPACK/tensor engine, hardware FP16/BF16 execution or arbitrary platform-bit-identical reproducibility.
