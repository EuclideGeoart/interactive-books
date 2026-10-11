# M6-C — Complete Part II Linear Algebra

Date: 2026-10-11. Branch: `feature/book-ii-m6c`. Accepted baseline: `da3f9f887d91f8172f10db35e4d5667fc3e2246a`.

II.14–II.19 are implemented and integrated. Part I has 9/9 available chapters, Part II has 19/19, and Book II has 28/97 available with 69 planned. I.3 retains the reference role; VI.4 retains the planned flagship role. II.19 is the flagship interaction of this milestone. Parts III–VIII remain planned. All milestone changes are inside `Interactive-Mathematical-Foundations-Book`; Book I was not modified.

Final validation status is recorded below. Work stops after M6-C for independent review and acceptance. No push, deployment or merge was performed.

## Implementation history

The checkout began clean at the accepted baseline. No separate clone or dependency tree was created.

| Commit | Coherent block |
| --- | --- |
| `d5a4bd6` | A: exact elimination, rank and inverse chapters |
| `85a0870` | B: real eigengeometry and exact least squares |
| `2a479b4` | C: checked SVD geometry and complete Part II publication |
| `dc536c8` | Responsive geometry refinements, T0 regressions, individually reviewed screenshots and numerical/performance evidence |

`dc536c8` is the production source revision submitted to the final milestone gate. The subsequent evidence commit contains this report, the saved original manifest, the continuation results and two test-only corrections described below. Its identity is final HEAD; the complete history is available with `git log --oneline da3f9f887d91f8172f10db35e4d5667fc3e2246a..HEAD`.

## Published experiences

Every chapter opens with a manipulable stage, follows intuition with definitions and derivations, includes an independently replayable worked example, embeds executable pedagogical Python and practical NumPy references, and supplies five graded exercises with corrective feedback and worked solutions. There are 30 new graded exercises and 12 executable reference files.

| Chapter and route | Interaction and exceptional states |
| --- | --- |
| II.14 — `/chapters/gaussian-elimination/` | Edit the augmented system; replay actual swaps, nonzero row scalings and row additions. Inspect pivots, skipped columns, echelon form, back substitution and full augmented RREF. Compare original equations with the transformed system; solutions are substituted into the original A and b. Includes fractional pivots, zero pivots requiring swaps, inconsistent, underdetermined and rectangular systems. |
| II.15 — `/chapters/rank-invertibility/` | Change columns and inspect the image of a bounded input square as a plane, line or point. Compare exact pivot count, rank, nullity and null-space basis with the original matrix and echelon trace. Covers zero/repeated columns, full row/column rank and exactly independent near-dependent inputs. The gold normalized arrow is explicitly a null INPUT direction. |
| II.16 — `/chapters/inverse-matrices/` | Move x, see Ax and exact reconstruction by A⁻¹, and derive the inverse from `[A | I]`. Both A⁻¹A and AA⁻¹ are calculated and checked. Singular maps expose an undefined inverse; the small 3×3 example uses the same row-operation foundation. The chapter recommends solving Ax=b directly in numerical software. |
| II.17 — `/chapters/eigenvalues-eigenvectors/` | Move a nonzero vector and compare its original line with Av; replay up to six applications of A. Derive the characteristic polynomial and inspect exact classifications and checked numerical eigenpairs. Presets cover stretch/reversal, zero eigenvalue, scalar, defective, radical and quarter-turn/no-real cases, plus the zero-vector non-example. |
| II.18 — `/chapters/orthogonal-least-squares/` | Move three observations and inspect the fitted line, vertical residual segments and exact squared objective. The data-space projection is displayed as its actual three components; it is not misrepresented in the observation plane. A separate 2D direction mode shows Gram–Schmidt, projection and residual geometry. Includes exact fits, nonunique minimizers, zero/dependent-vector failures and sensitive near-dependent fits. |
| II.19 — `/chapters/singular-value-decomposition/` | Four panes show the input, Vᵀ, Σ and U actions on a circle and selected vector. Every pane shares a scale that includes all intermediate vectors. The composed final curve overlays direct A action; the teal dashed segment shows the rank-one image and its connector shows the discarded component. Inspect U, Σ, Vᵀ, ordering, exact rank, conditioning, reconstruction/orthogonality errors, low-rank error and pseudoinverse recovery. Covers zero, rank one, repeated values, reflection, near singularity and one weak axis. |

Navigation, contents, map and previous/next reading order include all six chapters. II.13 leads to II.14, and II.19 leads to the planned III.1 boundary without publishing Calculus.

## Mathematical and architectural contracts

The architecture remains canonical state → pure derivation → geometry, quantities, formulas, semantic trace and accessible description. Preact components reuse the frozen platform and do not implement separate elimination, spectral or fitting algorithms. Existing `ParameterInput`, `DragPoint`, `CoordinatePlane`, `Inspector`, `FormulaScroll`, `TraceStepper`, scoped IDs and lesson-state hooks are reused. There was no broad platform refactor or dependency addition.

### Exact finite domain

The accepted rational, root, vector and matrix utilities remain authoritative. Exact elimination supports 1–4 rows and unknowns, with up to four right-hand sides; its private augmented representation permits eight columns. Pivot selection is deterministic: the first nonzero candidate row. Operations transform the entire augmented row and never scale a row by zero.

Rank counts coefficient pivots only. A contradiction in a right-hand side does not increase rank(A). Canonical RREF still reduces the entire augmented matrix, including right-hand-side pivots when inconsistent. Trace frames preserve actual mathematical states, including partially solved back-substitution values. Particular solutions and every null-space direction are verified in the original coefficient system. An inconsistent system has no fabricated particular solution.

Inverse construction supports square matrices through 3×3 and extracts the right block only after exact full-rank elimination of `[A | I]`. Both identity products are verified. Rectangular full row rank and full column rank are distinguished from an ordinary two-sided inverse.

Exact Gram–Schmidt accepts up to four finite-dimensional vectors, records every subtracted projection and reports zero/dependent inputs. Surviving nonzero directions span the actual column space. Least squares computes exact projection p, residual r=b−p, objective rᵀr and Aᵀr=0, then solves Ax=p to describe all minimizers as a particular solution plus ker(A). The normal-equation result is independently cross-checked. The near-dependence teaching cue does not change exact rank.

Opening controls accept values in [−4,4] with at most two decimal places; geometric dragging/arrow keys use a half-unit grid. Matrix modes include 2×2, 2×3, 3×2 and a small 3×3 example where appropriate. This is a bounded educational engine, not an arbitrary symbolic matrix package.

### Real eigengeometry

The 2×2 trace, determinant and characteristic discriminant are exact. Distinct real, scalar repeated, defective repeated and no-real classifications have no display epsilon. Eigenvectors must be nonzero; exact collinearity determines whether the learner's selected vector is an eigenvector. Positive, negative and zero eigenvalues preserve their stretch, reversal and collapse meaning.

Rational/radical eigenvalue expressions use the established root representation. Irrational direction vectors use visibly marked numerical companions. Unit eigenpair residuals must satisfy `256ε × max(1, ||A||F)`. The quarter-turn has no invented real direction. Scalar axes are labeled as a convenient choice; a defective matrix has one independent direction. Complex roots are introduced through the characteristic equation without a speculative complex-plane engine.

### Checked numerical SVD

The explorer supports real 2×2 matrices. Rank, singularity and repeated-value classification are exact rational decisions. A symmetric Jacobi angle from the exact Gram difference/off-diagonal chooses the right frame. The leading singular value is `||Av₁||`; the weaker positive value uses `|det A|/σ₁`, avoiding subtraction of almost equal Gram eigenvalues. Exactly repeated values use the same numerical value for both entries. The left frame uses a normalized leading image and an orthogonal completion with determinant orientation, retaining reflections.

All values must be finite, ordered and nonnegative, and every mathematically nonzero singular value must remain positive. The accepted numerical budget is `256 × Number.EPSILON = 5.684341886080802e−14` for:

- `||A−UΣVᵀ||F / max(1, ||A||F)`;
- `||UᵀU−I||F`;
- `||VᵀV−I||F`.

The budget allows roundoff in short binary64 products, trigonometry and normalization. It is independently validated; it never classifies exact rank. A failed check suppresses the faithful-geometry claim. The displayed factor entries are approximate companions, not rounded proofs of equality.

The rank-one approximation drops the weaker term. Its ideal Frobenius error is σ₂; the inspector separately measures the binary64 companion error, which may be a tiny positive residual even when ideal σ₂=0. Pseudoinverse construction inverts mathematically nonzero values only and handles zero values without division by zero. A condition budget above 10⁻⁸ warns about lost digits; recovery is withheld when `κ₂ × 256ε ≥ 10⁻⁴`, while the small singular value and exact rank remain intact.

Repeated singular directions and zero-axis completions are nonunique. A very thin ellipse can be visually indistinguishable from a segment at finite pixel resolution; exact rank and the positive weak singular value still report its mathematical class. Rectangular SVD is taught with correct full/thin dimensions and executable NumPy, rather than extending the 2D engine.

## Independent correctness evidence

Fixture generation is Python-owned and deliberate. TypeScript reads expected values and never writes them. The final oracle gate freshness-checks all fixture families, including the four added here.

| New family | Deterministic cases | Independent derivation/checks |
| --- | ---: | --- |
| Elimination, rank and inverse | 60 | Fraction elimination with a different largest-absolute pivot policy; canonical augmented RREF; independent minor-based rank; adjugate inverse; literal substitution and NumPy comparisons. |
| Eigenvalues | 57 | Exact Fraction characteristic polynomial/classification, 100-digit Decimal roots, NumPy eigenvalues and checked eigenpair residuals; explicit scalar, defective and no-real literals. |
| Least squares | 48 | Independent exact normal equations versus the browser's Gram–Schmidt projection; NumPy `lstsq`, residual orthogonality, projection/objective agreement and perturbation optimality. |
| SVD | 76 | Exact Fraction rank/repetition and 100-digit Decimal spectra; independent NumPy SVD, ordering, reconstruction, orthogonality, best rank-one Frobenius error and meaningful pseudoinverse/Penrose checks. |

Total: 241 new deterministic fixture cases. The Python gate executes all twelve embedded new reference files. NumPy numerical-rank policies are explicit and are not used to override exact rational rank. Very ill-conditioned recovery checks use the documented accuracy budget rather than asserting implausible inverse precision.

The collected maxima are saved in `M6C_NUMERICAL_CHECKS.json`. Scaled eigenpair residual is at most 2.282×10⁻¹⁶; SVD relative reconstruction is at most 2.965×10⁻¹⁶, U orthogonality 4.711×10⁻¹⁶ and V orthogonality 3.141×10⁻¹⁶. Scaled spectrum and rank-one error disagreements are at most 3.319×10⁻¹⁶ and 2.809×10⁻¹⁶. These describe the checked fixtures, not a universal accuracy guarantee for arbitrary matrices.

Focused new/regression unit coverage comprises 99 elimination/lesson cases, 68 eigen cases, 59 least-squares cases, 88 SVD cases, 31 exercise-grader cases and 19 validation-planner cases. The final full unit gate passed 10,468 tests in 74 files. The type/content gate checked 377 files with zero errors, zero warnings and four existing unused-symbol hints. All 282 Python test methods passed, followed by freshness checks for all 16 oracle families.

During development, focused plans and affected gates were used rather than exhaustive browser runs. The successful desktop focused manifest is `validation-results/focused-2026-10-11T19-31-39-289Z/manifest.json` (seven selected gates plus one root refresh). A direct affected A/B desktop run passed 34 tests with four touch-only skips; the selected mobile touch run passed all five applicable cases. Targeted visual capture runs covered the six new chapters across all three projects. Early focused failures exposed duplicate replay landmark labels, a missing chapter-contract heading and an overly broad numerical string assertion; these were corrected. Pixel inspection also corrected plot bounds and labels. Final validation below applies to the corrected source.

## T0 final integration

The planner discovers the new stage names and chapter kinds and registers elimination, eigenvalues, least_squares and svd unit/oracle/browser/visual families. Shared completion files reach all six chapters. The elimination foundation expands to II.14, II.15, II.16, II.18 and II.19. Model edits have targeted regression tests; shared exercise/planner/publication changes receive explicit shared coverage. Unknown or deleted files still fail conservatively. Known publication snapshots do not become permanent unknown-file fallbacks.

The required command was invoked once:

```sh
npm run validate:milestone -- --base da3f9f887d91f8172f10db35e4d5667fc3e2246a
```

Original manifest: `validation-results/milestone-2026-10-11T19-44-18-824Z/manifest.json`. A verbatim saved copy accompanies this report as `M6C_VALIDATION_MANIFEST.json`. `M6C_VALIDATION_CONTINUATION.json` records the failed-gate retry and the remaining selected gates separately; the original manifest is not rewritten to imply an uninterrupted successful run.

The inspected plan is milestone mode, `partial: false`, with 28 published chapters, all six new interaction chapters, 74 unit files, all 16 oracle families and 15 selected gates. `conservativeExpansion` and `sharedExpansion` are true because curriculum, planner and shared publication files changed; there are no unknown-file reasons. Browser selection includes all read-only chapter contracts, affected interactions, representative both-theme axe, shared controls/shell and authoritative root visuals. Subpath selection covers prefix-dependent navigation, routes, assets, anchors and hydration. Exhaustive release certification remains available and was not used as the ordinary milestone gate.

The original run passed seven selected gates and refreshed both production outputs, then stopped in the elimination interaction gate: 58 passed, four touch-only skips and four failures. Two rank-geometry assertions compared SVG float32 coordinate queries with binary64 expectations at a finer tolerance than their representation supported. They now compare with the correctly rounded float32 expectation; the exact state checks remain unchanged. Two tablet axe scans caught unrelated preset buttons partially under the frozen sticky header after invalid-input focus scrolled the page. The scan now restores the top-of-page viewport while preserving the invalid state and all axe rules. Failure screenshots remain in the original validation directory.

These were test-only corrections. Root and subpath build signatures were verified against unchanged production source before continuation. The failed elimination gate was repeated across all three projects, followed by the seven originally unrun selected gates. No successful full chapter-contract, unit or oracle gate was repeated, and the milestone command was not invoked again.

All 15 selected gates have successful final results across the original run and the targeted continuation. There are no remaining failed gates. The original failed attempt is retained as described above.

| Selected gate | Final result | Wall time (s) | Record |
| --- | --- | ---: | --- |
| complete type/content check | Passed: 377 files; 0 errors/warnings | 9.58 | Original |
| complete units | Passed: 10,468 tests / 74 files | 9.45 | Original |
| complete oracle + freshness | Passed: 282 methods / 16 fresh families | 32.93 | Original |
| root production verification | Passed | 0.10 | Original |
| subpath production verification | Passed | 0.10 | Original |
| all read-only chapter contracts + representative both-theme axe | Passed: 609 | 282.48 | Original |
| affected chapter interactions: eigenvalues | Passed: 22; 2 declared skips | 18.32 | Original |
| affected chapter interactions: elimination | Passed: 62; 4 declared skips | 45.95 | Continuation |
| affected chapter interactions: least_squares | Passed: 22; 2 declared skips | 21.11 | Continuation |
| affected chapter interactions: svd | Passed: 22; 2 declared skips | 36.98 | Continuation |
| affected chapter interactions: linear_algebra | Passed: 220; 14 declared skips | 175.04 | Continuation |
| shared cross-chapter controls | Passed: 45 | 12.97 | Continuation |
| root shared shell, navigation, accessibility and deployment | Passed: 283; 5 declared skips | 116.85 | Continuation |
| subpath prefix-dependent navigation, assets, anchors, routes and hydration | Passed: 69; 3 declared skips | 28.10 | Continuation |
| authoritative root visuals | Passed: 111; 15 declared skips | 39.30 | Continuation |

Final browser totals are 1,465 passed and 47 declared project-specific skips. These totals use the successful elimination retry and exclude the earlier failed attempt. All three viewport projects are included. The two source-matched production refreshes also passed: root in 10.80 s and subpath in 10.88 s. No additional build was needed for the test-only correction.

Final resource measurements: 20.47 GiB available on `/`. Apparent file sizes (`du -sb`): root output 11.70 MiB; subpath output 11.74 MiB; screenshot baselines 27.98 MiB; retained validation evidence 28.13 MiB; Book II working directory 381.74 MiB (including existing dependencies and ignored outputs). Filesystem allocation for that directory (`du -sk`) is 450.01 MiB; allocated sizes are larger because many small files occupy full blocks.

## Linux visual review and accessibility

Linux root remains authoritative. All 87 new chapter images and eight updated publication images were inspected individually, covering complete images rather than a contact-sheet approval. Desktop/tablet originals were viewed; every phone image was viewed in consecutive full-width crops covering its entire height. `M6C_SCREENSHOT_REVIEW.json` records all 95 paths, dimensions, SHA-256 hashes and review findings.

| Chapter | States reviewed on desktop, tablet and mobile | Images |
| --- | --- | ---: |
| II.14 | opening; inconsistency; skipped pivot | 9 |
| II.15 | opening; zero; dependent; exactly independent near dependence | 12 |
| II.16 | opening; singular; small 3×3 | 9 |
| II.17 | opening; rotation; defective; scalar; zero eigenvalue; radicals | 18 |
| II.18 | opening; rank deficient; Gram–Schmidt; dependent; zero vector; near dependence | 18 |
| II.19 | opening; rank one; zero; repeated; reflection; near singular; weak axis | 21 |

The eight publication images cover desktop home/light/dark, tablet home, mobile home, desktop/mobile contents and desktop/mobile map. Contents/map show 28/97. Existing snapshot thresholds and axe rules were unchanged; old chapter baselines were not refreshed indiscriminately.

Keyboard controls, rejected numeric input, reset, pointer state synchronization, semantic announcements, immutable replay, scrub/previous/next/play, exercises and model-to-SVG identity are checked in chapter-specific browser tests. Both-theme axe includes initial, exceptional and invalid states. Published chapter contracts check scoped IDs, MathML twins, heading structure, model-built plane descriptions, no page overflow, controls of at least 44×44 CSS pixels and reduced motion. Long mathematical formulas retain the existing focusable horizontal-scroll contract. SVD plots span the stage width in two columns on larger screens and one ordered column on phones; quantities wrap without hiding exact classification.

Coincident handles in degenerate configurations retain separate keyboard/numeric controls. This is automated accessibility evidence plus pixel review, not a claim that a person tested every screen-reader workflow.

## Pointer-to-next-frame timing

`M6C_DRAG_MEASUREMENTS.json` preserves the final experiment. It adapts the established real pointermove → next animation-frame/MessageChannel methodology: 80 half-grid pointer moves, five warm-up samples excluded, 76 samples per stage, unthrottled 1× desktop CPU. Linux, Intel Core i5-12600, Chrome 155.0.8059.39, 1440×900 viewport, reduced motion. Heavy work was serialized through `/tmp/imf-heavy.lock`.

| Opening stage | Median (ms) | p95 (ms) | Maximum (ms) | Samples >16.7 ms |
| --- | ---: | ---: | ---: | ---: |
| Rank | 5.3 | 7.1 | 7.3 | 0/76 |
| Inverse | 5.8 | 6.7 | 7.4 | 0/76 |
| Eigenvectors | 6.7 | 9.7 | 10.0 | 0/76 |
| Least squares | 9.1 | 13.7 | 17.9 | 1/76 |
| SVD | 9.0 | 10.1 | 11.2 | 0/76 |

II.14 uses coefficient fields rather than a geometric drag handle. These are synthetic scheduling measurements, including work up to the next-frame callback, not hardware scanout/input latency or physical touch-device results. The earlier M6-B browser version differs, so these numbers do not establish a controlled performance improvement. The single 17.9 ms least-squares outlier is retained.

## Resources and remaining limits

Root disk stayed above 20 GiB free during final validation, above the 10 GiB stop threshold. Allocated Book II space was about 448 MiB before final evidence; authoritative screenshot baselines occupied about 29 MiB. No browsers, dependencies, clones or extra checkouts were installed. Direct heavy operations used the lock; validation runners acquired it themselves. Routine Playwright runs used `--trace off`, with failure evidence retained. Final build sizes and disk measurements are recorded with the completed gate results.

The exact educational dimensions and input bounds are intentional. Spectral geometry is real 2×2; complex eigen-directions and arbitrary-dimensional interactive SVD are outside this milestone. Repeated eigenspaces/singular spaces and zero-axis completions are explicitly nonunique. Binary64 factors can reconstruct accurately while inverse recovery loses digits; warnings and withholding policies preserve the exact class. QR/SVD, numerical rank policies and normal-equation conditioning are taught without presenting this educational exact engine as a production solver.

Windows testing, physical desktop/tablet/phone testing and human screen-reader acceptance remain deferred. Exhaustive release/periodic certification was not run. Independent review and acceptance are the next step; Part III work is not begun.
