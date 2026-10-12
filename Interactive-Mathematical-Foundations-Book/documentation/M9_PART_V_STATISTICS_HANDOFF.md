# M9 Part V Statistics — implementation handoff

Date: 2026-10-12 (Europe/Berlin). Agent A has completed Statistics and stopped implementation work. **This is a focused implementation handoff. Agent B owns the single combined Statistics + Optimization milestone acceptance.**

## Provenance and branch scope

- Worktree: `/work/interactive-books-part-v`.
- Book: `/work/interactive-books-part-v/Interactive-Mathematical-Foundations-Book`.
- Branch: `feature/book-ii-part-v-statistics`.
- Accepted common baseline: `cdf2ebd5428d80999dcf52f93a8e3c0eee0ac167`.
- Block A commit: `54506335d68c7c430648429e57e7829f5013bb2b`.
- Block B commit: `dd6067bc1245162d1005265993943b570dbf2482`.
- **Exact completed implementation commit: `ab61994765d45f3463f48d81dc932866b325372a`.** This documentation is committed afterward; its commit can be identified with `git log -1 --format=%H -- documentation/M9_PART_V_STATISTICS_HANDOFF.md` from the book directory.

The checkout started clean at the required branch and HEAD. Node packages remain individually linked to the canonical installation; `.vite`, `.vite-temp`, and `.astro` in this checkout's overlay are local directories. `.venv` remains a link to the existing Python environment. No dependency installation, browser download, other worktree/source edit, push, merge or deployment was performed. The master plan and accepted Probability/Calculus/linear-algebra implementations were not edited.

Publication is exactly **69/97 available, 28 planned**. V.1–V.10 are available; all ten Part VI chapters remain planned, including VI.4's flagship role. Authoritative titles, roles and reading order are preserved.

## Delivered chapters

| ID | Route | Authoritative title |
| --- | --- | --- |
| V.1 | `/chapters/data-summaries/` | Data summaries: mean, median, mode |
| V.2 | `/chapters/data-spread/` | Spread: variance, standard deviation, robust interpretation |
| V.3 | `/chapters/population-sampling/` | Population, sample, and sampling variability |
| V.4 | `/chapters/estimators-estimation/` | Estimators and estimation |
| V.5 | `/chapters/confidence-intervals/` | Confidence intervals through repeated sampling |
| V.6 | `/chapters/covariance-matrices/` | Covariance matrices and multivariate spread |
| V.7 | `/chapters/regression-fundamentals/` | Regression fundamentals |
| V.8 | `/chapters/likelihood/` | Likelihood |
| V.9 | `/chapters/maximum-likelihood/` | Maximum Likelihood Estimation |
| V.10 | `/chapters/maximum-a-posteriori/` | Maximum A Posteriori estimation |

There are exactly **10 Statistics MDX chapters, 50 graded exercises (five each), and 20 runnable Python references (pedagogical + NumPy for each)**. Every chapter opens with an interaction, includes the fourteen conceptual authoring layers, an independent worked stage, definitions and derivations, exceptions, numerical policies, engineering/ML connections, feedback/solutions and the existing reading-order navigation.

Mathematical authority lives in `src/math/statistics/{data,intervals,scatter,likelihood}.ts`. Pure lesson adapters, four stage components, three exercise collections and the shared frame live in `src/lessons/statistics/`. Components render derived output. Semantic traces use the accepted detached, deeply frozen `traceFrom` infrastructure with previous/next/direct selection, playback and reset.

## Mathematical and numerical policies

- **Data summaries and spread:** supported nonempty datasets contain 1–24 observations in [−20,20] with at most two decimal places. Exact rational ordering, mean, median, frequency ties, squared deviations, population variance, usual sample variance and unscaled median absolute deviation are retained. All-distinct observations report no repeated value/no uniquely determined mode; tied repeated maxima remain multiple modes. For n=1, population variance is zero and usual sample variance is undefined. Square-root companions and rendering coordinates are binary64.
- **Sampling and estimation:** the fixed finite population is [0,1,2,3,6,7,8,9], with independently derived mean 9/2 and variance 41/4. Uniform iid sampling uses replacement; biased sampling excludes the lower half. The latter has mean bias 3 regardless of n. Explicit uint32 LCG seeds replay actual samples. n is 1–32 and repetitions 1–64. The estimator is sample mean plus a declared shift. Exact finite-run variance divides by R so empirical MSE = empirical variance + squared empirical signed bias; theoretical properties remain separate. No observations are adjusted toward a claimed expectation.
- **Confidence intervals:** the stated model is iid Normal(μ,σ²), fixed μ=2, known positive σ in [0.5,5]. Sample sizes 1–64 and repetitions 1–80 are bounded. Every observation consumes two LCG uniforms through Box–Muller, with 1−u positive and the sine partner discarded. Explicit binary64 critical values are 1.6448536269514722, 1.959963984540054 and 2.5758293035489004 for 90%, 95%, 99%. Samples and endpoints are approximate. Independent Python `NormalDist` supplies critical values and analytic coverage; the accepted browser CDF has interval-probability error ≤2e−9. This normal/known-σ procedure is valid at n=1; no estimated-σ or asymptotic approximation is substituted. Actual containment counts are unforced and are not posterior probabilities for a fixed parameter.
- **Covariance:** up to 12 observed pairs in [−8,8], with at most two decimals, carry integer weights 0–9 with positive total. Covariance normalizes by total weight and describes the weighted empirical distribution. Centered outer products give exact symmetry, determinant, PSD and rank. Accepted `eigen2` supplies checked numerical eigenpairs. Zero spread is a point, singular spread a line; repeated eigenvalues leave orientation nonunique. Ellipse radii are √λ and have no automatic confidence/coverage interpretation.
- **Regression:** equal-weight simple least squares includes an intercept. Actual centered data determine exact coefficients, fitted values, signed residuals and RSS. Both residual sum and x–residual inner product are verified as exactly zero. Identical x coordinates leave slope/intercept nonidentifiable; fitted values at observed x remain determined, and no unique extrapolation line is drawn. Constant y makes correlation undefined. Fit, predictive uncertainty and causation remain separate.
- **Likelihood/MLE:** ordered binary observations have length 0–32; candidate probabilities have two decimal places in [0,1]. Products are exact fractions, without a binomial count coefficient. Natural log/log1p skip absent factors; zero likelihood has extended log −∞ and gap +∞ with explicit UI reasons. Empty likelihood is 1 and log 0, with every parameter an optimizer. For nonempty data, the exact MLE k/n includes 0/1 boundaries and is never reparsed through the rounded input control.
- **Beta–Bernoulli MAP:** proper prior shapes are half-integers 0.5–5. Posterior shapes are α+k and β+n−k. Normalization uses log Gamma recurrence from Γ(1)=1, Γ(1/2)=√π; Python independently uses `math.lgamma`. Only a>1,b>1 uses the interior mode formula. Uniform posteriors have every parameter as a mode; one-sided or two-sided divergent endpoint limits are explicitly described under a limiting boundary-mode convention, without claiming endpoint probability atoms. Combined exponents avoid 0×∞/NaN. Density plots use a 0.005 grid, omit divergent endpoint values and do not renormalize the sampled curve. Posterior mean, MAP, MLE, prior, likelihood, unnormalized posterior and evidence have distinct labels.

Numerical fixture policy is absolute/relative **2e−12 × max(1, |expected|)** for binary64 companions, except analytic normal coverage's explicit **2e−9** bound. Exact fractions, counts, null/undefined policies, mode classifications and seeded finite observations match exactly. Worst measured scaled binary64 errors were **7.971401316808624e−14** for uncertainty parity and **4.2657998683832386e−14** for likelihood parity.

## Independent verification and actual focused evidence

Python owns `statistics_data`, `statistics_uncertainty`, and `statistics_likelihood` fixture generation. Every family implements deterministic `--check` freshness. Independent methods include pairwise finite-data variance/covariance, literal LCG outcomes, exhaustive 64 two-draw combinations, normal analytic coverage, separate 2×2 normal equations, log(exact product), `math.lgamma` and an exact polynomial integral of the Beta(5,4) density.

The three oracle invocations passed **4 + 5 + 5 = 14 self-tests**, executed all 20 references and confirmed all three fixture files fresh. Literal cases include the first seed-42 sample [2,0,6,1], population mean 9/2, canonical covariance determinant 4/25, regression coefficients (1,7/10) with RSS 1/5, likelihood 108/3125, MAP 4/7, evidence 3/140, and posterior density 35/16 at θ=1/2.

| Focused run | Actual result |
| --- | --- |
| Block A TS/supporting checks | 128 supporting checks passed; the repaired model/lesson/20-exercise file separately passed 7 checks. Exact parity includes 2 tests. |
| Block B TS/supporting checks | 136 checks initially passed; two old planner expectations failed because new Statistics consumers legitimately reuse CDF/eigenvalue models. Corrected planner file: 40/40 passed. Seven uncertainty model/parity checks passed. |
| Block C TS/supporting checks | 150/150 passed in six files: likelihood, parity, updated Data exercises, content, curriculum and planner. |
| Final `astro check` | 0 errors, 0 warnings, 5 existing unrelated hints; 531 files checked. |
| Block A browser/visual | Initial 24 passes; repaired sampling selector and explicit new-baseline capture: 15/15 passed. This covers all 27 interaction/axe cases and 12 visual cases across three projects. |
| Block B browser/visual | Initial 42 passes and three failed test expectations of fraction text where exact terminating decimals were rendered. Repaired test and reproducible mobile interval label-overlap fix: targeted 18/18 passed. All 36 interaction/axe cases and nine visual cases are covered. |
| Block C browser/visual | 45/45 passed: 36 interaction/axe cases plus nine visual cases. |
| Read-only chapter contracts | A: 144 passed (72 Statistics plus 72 incidental IV.1–IV.4 matches from the initial unanchored grep); B: 54 passed; C: 54 passed. Later greps use ID boundaries. |
| Root build for targeted canaries | Final source-matched build succeeded: 73 pages. Root source fingerprint: `cb41961250ee839c792b1b5c1548de054cbee326e8082b67b2abb759347150b2`. |

Browser checks covered numeric/pointer/keyboard synchronization, invalid-state rejection, reset, actual samples and containment/endpoints, exact predictions/residuals, empty/nonunique/boundary states, immutable replay, corrective exercise feedback, full-page both-theme axe canaries, mobile overflow, controls/hit targets, MathML, IDs, descriptions, reduced motion and navigation.

Saved local evidence is under the ignored `validation-results/statistics/` directory: block-specific `*-units.log`, `*-oracle.log`, `*-browser.log`, repaired logs, contract logs, `final-types.log`, build logs and T0 dry-run manifests. These are focused implementation results, not a combined milestone report. Initial test failures and their repairs are disclosed above; no acceptance criterion or screenshot tolerance was relaxed.

All heavyweight direct builds and Playwright captures used `/tmp/imf-heavy.lock`. No T0 invocation was wrapped in another flock. Every browser run used `--trace off`. Root disk space was checked before heavy work and remained approximately 24 GiB available.

## Reviewed Linux screenshots

`tests/e2e/__screenshots__/visual-statistics.spec.ts/` contains **54 new baselines**: desktop, tablet and mobile, covering all ten routes and eight meaningful exceptional states:

- `v-data-summaries` / `-multiple`;
- `v-data-spread` / `-single`;
- `v-population-sampling` (canonical only);
- `v-estimators-estimation` (canonical only);
- `v-confidence-intervals` / `-small`;
- `v-covariance-matrices` / `-repeated`;
- `v-regression-fundamentals` / `-degenerate`;
- `v-likelihood` / `-impossible`;
- `v-maximum-likelihood` / `-empty`;
- `v-maximum-a-posteriori` / `-two-boundaries`.

There are 18 distinct states × three projects. All were reviewed in per-block contact sheets; full-size canonical data, repeated covariance, small-n confidence and divergent MAP captures were inspected as well. The observed mobile confidence row-label overlap was repaired once, then only affected interval snapshots were recaptured. No accepted earlier-Part or Windows baseline was overwritten. Contact sheets reside in ignored local evidence as `block-{a,b,c}-screenshot-review.png`.

## Shared integration touchpoints for Agent B

1. **`src/curriculum/curriculum.ts`:** retain these ten Part V routes and your Part VI changes. The combined publication should become 79/97 available, 18 planned if all ten Optimization chapters are available.
2. **`tests/unit/curriculum.test.ts`:** reconcile the branch-local 69/28 assertion and Part VI-planned guard with combined publication; preserve exact titles/roles and the independent master-plan drift checks.
3. **`scripts/validation-plan.mjs`:** retain four Statistics ownership families, Statistics MDX-stage discovery, interval-kind handling, ID-scoped browser/visual selectors, all owners of shared Statistics unit/oracle/browser files, `v-<slug>` screenshot ownership and Statistics-only shared visual-spec selection. Merge your Optimization registration alongside these entries.
4. **`tests/unit/validation-plan.test.ts`:** retain new Statistics regressions and legitimate transitive consumers: the Probability CDF model now reaches V.5, `eigen2` reaches V.6–V.7, and Probability's `MassBars` module reaches V.8–V.10. Publication counts in planner tests now follow the actual catalog.
5. **Publication shell snapshots:** existing contents/map baselines still show the accepted M7/M8 59-chapter publication. Refresh the four shared publication views after merging both branches, using the final combined count. Agent A did not rewrite these earlier shared baselines with an intermediate 69 count.

Planner tests prove data edits select V.1–V.4; interval edits V.5; scatter edits V.6–V.7; likelihood edits V.8–V.10. These model scopes select their actual units/oracles/browser/visual consumers and no unrelated Probability or Optimization chapter. Deleted/unknown inputs still expand conservatively. The shared curriculum/planner changes broaden whole-change T0 dry runs; those manifests were inspected and direct source-matched targeted commands were used instead of launching a complete-book sweep.

## Remaining acceptance and limits

**Not executed by Agent A:** `validate:milestone`, `validate:exhaustive`, a final complete-book browser/axe/production certification, root/subpath complete static/deployment verification, or combined Part V + Part VI acceptance. Agent B must perform the single combined milestone after integration. The focused axe runs are canaries, not every chapter/exercise/theme combination.

Supported datasets, simulation sizes and half-integer priors are intentional teaching bounds. The optional additional Gaussian-mean MLE example was omitted. Simulation illustrates ideal sampling laws; it does not prove independence, coverage or unbiasedness. Linux Chrome emulation is not Windows, physical-phone/tablet or manual screen-reader certification. General priors, arbitrary regression models and unrestricted symbolic evaluation remain outside scope.

At handoff, `/` reports approximately **24 GiB free**. This book checkout uses approximately **146 MiB** without following shared dependency links; its local Node overlay is about 1.6 MiB, root dist 23 MiB, Statistics baselines 11 MiB, and focused evidence/contact sheets 4.3 MiB. No cache/database/history/worktree cleanup was used to create headroom.

The three coherent implementation blocks are committed. This handoff is the final documentation commit; the branch is left clean. **Agent A stops here without final acceptance.**
