# Book III Part VI implementation handoff — UNVALIDATED

Branch: `feature/book-iii-part-vi-pca`. Allocated linked worktree: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/book-iii-part-vi-pca`. Book root: `Interactive-Machine-Learning-Book`.

Initial read-only Git metadata showed clean HEAD `944594728554eca8777773f9d12b70e08613ba77`, the exact `book-iii-wave-b-freeze-20261014` delivery, canonical common Git directory `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books/.git`, the assigned branch and Linux-only D-volume lock. Accepted executable source remains `06529c0c52215555bcc1a53d80f2bd8dc977bbce`. The final commit SHA and clean status are supplied by Git in the accompanying delivery report; this file is included in that commit.

## Status and ownership

Implementation authoring only. **No executable validation ran:** no TS/Python tests, oracle, fixture generator/check, lightweight assertions, type/lint/compile/build, browser/Playwright, capture/screenshot, benchmark/profiling or validation runner. There are no claimed passing checks, collected test totals, screenshot outputs or acceptance decisions. Only source reads, mathematical reasoning, ordinary authoring and Git metadata/diff/staging/commit were performed. Git hooks are disabled for the author commit so a hook cannot accidentally execute a prohibited runner.

Writes are exclusively inside the eight owned P06 prefixes. Shared platform/shell/UI/styles/configuration, prior Parts, III-07, Books I/II, baselines, dependencies and owner evidence are untouched. No merge, push, deployment, history rewrite, worktree cleanup/reset or dependency install occurred.

The ponytail and frontend-design skills were read/applied for compact implementation and the existing experiment-sheet identity. Their execution/visual-verification duties were superseded by the explicit implementation-only user policy. Final independent disposition belongs to the owner after the single combined campaign.

## Chapters and interactions

| Chapter / relative route | Mode / root | Teaching and opening mechanism |
| --- | --- | --- |
| III-29 · `chapters/data-covariance/` | `covariance` · `[data-pca-lab="covariance"]` | Drag observations; inspect means, centered rows and products; compare sample/population normalization and n×d generalization. |
| III-30 · `chapters/pca-eigenvectors-variance/` | `eigenpairs` · `[data-pca-lab="eigenpairs"]` | Actual ordered covariance eigenpairs, principal lines and retained fraction; derive the variance maximum and expose sign/repeated-basis ambiguity and stable minor energy. |
| III-31 · `chapters/pca-projection-reconstruction/` | `reconstruction` · `[data-pca-lab="reconstruction"]` | k=0/1/2 scores, source-space shadows/residuals/SSE, both MSE conventions, projection identities and optimality; replay component counts. |

Each chapter opens with its client-loaded Stage, then teaches intuition, mechanics/derivation, literal worked calculations, actual imported `pca.py?raw`, counterexamples, numerical caveats, connections and five graded exercises with corrective feedback (15 total authored exercises). Exact curriculum titles and real Book II prerequisite IDs are preserved. Cross-chapter paths use the shared href helper; manifests are JSON and publication uses auto-discovery.

One PCAState (points, normalization, k) drives the numerical result. `useLesson`, the shared controls/Formula/Inspector/TraceStepper/IdScope, and generic detached immutable traces preserve the foundation architecture. Plot geometry, centered-product table, eigenpair table, scalar values, equations and speech project that result; the renderer does not keep separate numerical predictions.

The flagship supports every observation by pointer/touch/keyboard/numeric edits, bounded to ±5; 0.1 pointer snapping and 0.1/0.5 keyboard moves; point selection and reset; line/isotropic/constant/singleton presets; and replay k=0/1/2. Replay selects immutable full states, and edits fork from the displayed frame. It is not a fake iterative eigensolver trace. Invalid numeric edits preserve state and have visible corrective text; resets remount drafts.

Drag ownership tracks point ID, pointerId, capture node and epoch. Reset/replay/seek/other edits release capture, and stale move/up/cancel/lost-capture events cannot alter or finish a newer drag. The selector brings its chosen minimum-size hit target forward; pointer movement leaves paint order stable while captured. Overlapping data remain inspectable through the selector/table. Live announcements occur for completed drags or discrete edits.

The first Stage SVG has title and description, equal x/y scale, observations, mean, actual principal lines, reconstruction squares and residual segments. Label sizes depend on physical SVG width with an authored 14.1 CSS px minimum and at least 46 CSS px hit diameters. Shared table-scroll synchronization handles bounded named overflow wrappers; local fieldset/legend/inspector wrapping and mobile stacked inspector rows prevent wide content from forcing viewport growth. Styles use existing theme tokens. All physical/theme/layout claims still require owner rendering.

## Python, browser, oracle and fixture inventory

- Browser kernel: `src/parts/p06/model/pca.ts`; pure validated two-feature PCA, edit and component-trace functions.
- Browser lesson/geometry: `src/parts/p06/lesson.ts`; supported edit bounds, pointer mapping, width-scaled text/hits, state-derived geometry/formulas/inspector/speech.
- Stage/styles: `PCAStage.tsx`, `stage.css`; one coherent Part lab, chapter modes change teaching emphasis.
- Canonical Python+NumPy: `code/python/p06/pca.py`; callable validated request and actual JSON CLI. Terminal stdin uses the canonical cloud; pipes require complete JSON. Finite integral numeric k includes 1.0 and NumPy numeric integral values, with bool rejection.
- Independent oracle: `oracle/p06/independent.py`; exact Fraction covariance, NumPy centered-data SVD and symmetric eigh, actual canonical invocation, eigen/projection/reconstruction/error invariants and sign/subspace comparisons.
- Oracle manifest: self-test `test_pca.py`; golden check `check_fixtures.py --check`. Tests include literal cases, asymmetric SVD/eigh challenges, translation/scale/permutation, ambiguity, dimensions, exact k=2 identity, integral configuration, invalid/overflow/underflow and actual CLI.
- Deterministic data: `data/p06/clouds.json`; hand-authored tilted, line, isotropic, constant and singleton presets; no random generator or seed.
- Fixture specification and literals: `fixtures/p06/pca.fixtures.json`; ten explicit requests and independently hand-derived invariant expectations, including sample/population, all k, rank one, repeated spectrum, zero spread, singleton conventions and tiny positive minor eigenvalue. **No owner fixture generation is required.** The golden checker does not rewrite expectations.
- TS tests: `tests/unit/p06/pca.test.ts`, `parity.test.ts`, `lessons.test.ts`; mathematical invariants and boundaries, immutable replay, actual canonical Python subprocess parity, sign/projector/subspace handling, chapter MDX/KaTeX/SSR and real semantic prose-table authoring, state-derived geometry and edit equivalence. All unexecuted.
- Browser tests: `tests/e2e/p06/pca.spec.ts`; relative URLs for both root/subpath, all inherited viewport projects, both themes, literal opening results, active-model/DOM parity, actual SVG glyph/line/shadow geometry, paint, k/normalization, native pointer/touch/keyboard/numeric edits, reset/replay forks, invalid drafts, degenerate outputs, independent DOM residual aggregation, physical document/inner width, controls/inspectors/tables, label/hit sizes, genuine concurrent-touch streams and overlapping-selector hit testing. All unexecuted; no author snapshots/captures.

The owner’s added combined production captures remain owner-owned. Expected viewports are 1440×900, 820×1180 and 390×844 in light/dark at both mounts. The authored physical label check uses the owner’s 13.99 measured bound for a 14.1 source minimum. Responsive source is not visual acceptance.

## Numerical conventions and hand calculations

[NUMERICS.md](./NUMERICS.md) records the complete shape/arithmetic/ambiguity/tolerance contracts and independent literal derivations. Summary:

- X/Xc are n×2 row batches; μ/directions are 2×1 columns; covariance is 2×2; Vk is 2×k and scores n×k. Kernel is deliberately 2D and bounded to 128 rows, while prose honestly derives n×d mathematics.
- Sample q=n−1; population q=n. Empty data are rejected. One sample has mean/centered rows but undefined sample covariance/PCA outputs. One population observation has zero covariance, mean reconstruction and undefined ratios.
- Zero total variance gives null explained/retained ratios with reasons. Repeated spectra have a conventional basis, never a unique principal-axis claim. Signs are conventional and fixtures/oracles compare projectors or subspaces.
- Stable scaled leading eigenvalue/vector; minor eigenvalue from orthogonal centered score energy. No tolerance-based zeroing. Near repetition is a conditioning warning only. Zero vector norm after extreme scaling is rejected as unresolved direction.
- k=0 is mean-only reconstruction. k=2 explicitly applies the full-space identity by preserving input coordinates, while calculating scores; it is mathematically exact, not a fake error clamp. k=1 uses actual scores and adds μ.
- Residual source minus reconstruction; SSE is total squared vector error; MSE=SSE/n; per-entry MSE=SSE/(2n). Exact-arithmetic discarded-energy identity SSE=qΣdiscardedλ is tested with finite tolerances.
- Original tilted cloud sums centered products to (10,8,10), sample eigenvalues (6,2/3), population (4.5,.5), retained k=1 fraction .9, k=1 SSE=2/MSE=.5/entry-MSE=.25, k=0 SSE=20, k=2 SSE=0. Minor-diagonal fixture λ2=5×10⁻17 and SSE=2×10⁻16 requires relative-only bounds to rule out fake zero.
- Finite/dense/ID/configuration validation precedes shortcuts. Explicit nonfinite arithmetic is rejected; squared-component/variance-normalization underflow to zero is rejected. Binary64 centering/dots/ratios may still round, especially for extreme or poorly conditioned data. There is no arbitrary-precision or general eigensolver claim.

## Boundaries, limits and pending owner action

No standardization, whitening, arbitrary-dimensional numerical solver, sparse storage, imputation or frozen train/test transform is implemented. Prose explains units, rank ≤min(d,n−1), training-only fitting, downstream evaluation, sign ambiguity, truncating a repeated space and covariance conditioning. Retained variance is not accuracy or supervised importance. Repeated-basis reconstructions need not be unique; zero spread is not a meaningful fraction.

No shared addition is outstanding: [INTEGRATION_REQUESTS.md](./INTEGRATION_REQUESTS.md). The owner must review source, provisionally integrate with P05, and execute the one combined validation/capture campaign. Do not infer any gate passed from these authored files. Real hardware, browser behavior, responsive paint, accessibility tooling and numerical/fixture acceptance have not been observed by the author.

## Delivered-source boundary correction

After initial delivery a268a4ef5c0bbaad8cad47136852c02b1f93fe93, owner read-only review identified that np.number admitted complex types and that extended-precision k checks/conversion used different representations. The Part-local follow-up restricts Python to real scalar families int/float/np.integer/np.floating, still rejects bool, and normalizes k once through the finite binary64 boundary before integral/range checks and int conversion. Coordinates share the same real finite guard. Unexecuted regressions cover Python/NumPy complex coordinates and configuration (including zero imaginary part), singleton/k=0 early-return boundaries, extended-precision values just below one/above two/below zero, coordinate conversion consistency and huge-integer conversion overflow. No shared API, fixture expectation or browser source changed; no validation was executed. The latest exact clean HEAD is supplied in the follow-up report.

## Independent-oracle normalization correction

Owner source review identified that the independent oracle still truncated original extended-precision k values. The follow-up normalizes k once to a private binary64 scalar in the independent reference and uses that same scalar for discarded singular-value energy and verification projection shapes. Residual comparison now converts typed coordinates to binary64 before subtraction, matching the declared input interpretation while retaining independent Fraction/SVD/eigh mathematics. An unexecuted verify regression covers normalized configuration just below one/above two/below zero, the original cloud, and typed coordinates beyond exact binary64 integer spacing. Only independent.py, test_pca.py and this handoff changed. The owner reports combined attempt 2 was deliberately interrupted after seven gates for source corrections; that is not acceptance or author validation. No executable validation ran for this follow-up; latest exact clean HEAD is supplied in its report.

## Native SVG touch correction

The owner retained one real desktop root-browser failure at pca.spec.ts:164 (latest touch movement expected x=−1.5 but stayed −2) in owner/combined-attempt-2/BROWSER_ROOT.JSON and RUN.log; two later publication tests were interrupted and are not this failure. Owner native diagnostics using valid CDP packets reproduced cancellation of both pointers after the old-pointer move in desktop, desktop-touch and mobile. The owner reports a nonpassive handle-local touchstart preventDefault eliminated those cancellations in all three, preserved x=−2 on stale movement/release, and allowed latest movement to −1.5 then 0. Those are owner observations, not author validation or acceptance.

The smallest product correction adds onTouchStart preventDefault only to the circle handle, with a one-line rationale; pointerId/capture-owner guards are preserved and the root plane is not assigned touch-action:none. The unexecuted concurrent-touch regression now uses touchMove[second] for partial release and touchEnd[] for full release, asserts stale movement/release preserve state, verifies the original captured DOM node retains latest-pointer capture through small/large movements, checks no native pointercancel on the handle, and exercises native page scrolling from blank SVG space. Only PCAStage.tsx, pca.spec.ts and this handoff changed. No executable validation ran for this correction; owner revalidation remains required. Latest exact clean HEAD is supplied in the accompanying report.

## Native event casing correction

Owner combined attempt 3 retained two genuine desktop touch-capture failures and was deliberately interrupted after seven gates; no acceptance was granted. The bounded owner diagnostic identified that default desktop SVG circles lack the ontouchstart property. Installed Preact props.js:81–86 therefore registered JSX onTouchStart as the case-sensitive TouchStart event (listener map TouchStartfalse), so native touchstart remained unprevented and both pointers received pointercancel. Desktop-touch and mobile exposed the property and registered touchstartfalse, allowing the previous source to work; the owner also confirmed a direct native lowercase listener works in default desktop. These are owner findings, not author execution.

This follow-up replaces the handle prop with the typed JSX spread `{...{ ontouchstart: (event: TouchEvent) => event.preventDefault() }}` and a one-line native-casing rationale. Pointer ownership/capture guards, real existing tests, default desktop setup and outside-handle scrolling remain unchanged. No touch capability was enabled before navigation, no shared typings/library files or abstraction were added, and no root-plane blocking was introduced. Only PCAStage.tsx and this handoff changed. No checks were run by the author; corrected native binding still requires owner validation. Exact clean HEAD is supplied in the follow-up report.

## Exact changed paths versus accepted Wave B delivery

All paths are repository-relative, and all additions are P06-owned:

1. `Interactive-Machine-Learning-Book/code/python/p06/pca.py`
2. `Interactive-Machine-Learning-Book/data/p06/clouds.json`
3. `Interactive-Machine-Learning-Book/documentation/parts/p06/HANDOFF.md`
4. `Interactive-Machine-Learning-Book/documentation/parts/p06/INTEGRATION_REQUESTS.md`
5. `Interactive-Machine-Learning-Book/documentation/parts/p06/NUMERICS.md`
6. `Interactive-Machine-Learning-Book/fixtures/p06/pca.fixtures.json`
7. `Interactive-Machine-Learning-Book/oracle/p06/check_fixtures.py`
8. `Interactive-Machine-Learning-Book/oracle/p06/independent.py`
9. `Interactive-Machine-Learning-Book/oracle/p06/manifest.json`
10. `Interactive-Machine-Learning-Book/oracle/p06/test_pca.py`
11. `Interactive-Machine-Learning-Book/src/parts/p06/PCAStage.tsx`
12. `Interactive-Machine-Learning-Book/src/parts/p06/chapters/data-covariance.mdx`
13. `Interactive-Machine-Learning-Book/src/parts/p06/chapters/pca-eigenvectors-variance.mdx`
14. `Interactive-Machine-Learning-Book/src/parts/p06/chapters/pca-projection-reconstruction.mdx`
15. `Interactive-Machine-Learning-Book/src/parts/p06/lesson.ts`
16. `Interactive-Machine-Learning-Book/src/parts/p06/manifest.json`
17. `Interactive-Machine-Learning-Book/src/parts/p06/model/pca.ts`
18. `Interactive-Machine-Learning-Book/src/parts/p06/stage.css`
19. `Interactive-Machine-Learning-Book/tests/e2e/p06/pca.spec.ts`
20. `Interactive-Machine-Learning-Book/tests/unit/p06/lessons.test.ts`
21. `Interactive-Machine-Learning-Book/tests/unit/p06/parity.test.ts`
22. `Interactive-Machine-Learning-Book/tests/unit/p06/pca.test.ts`

Skipped execution and visual inspection under the overriding policy; risks remain until the owner’s combined numerical, production and real-browser campaign. No successful check or acceptance is claimed.

IMPLEMENTATION COMPLETE — UNVALIDATED — OWNER VALIDATION REQUIRED
