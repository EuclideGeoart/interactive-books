# /goal — Book III, Part II: Regression and Classification

**Agent ID:** B3-P02 | **Branch:** `feature/book-iii-part-ii-regression-classification` | **Chapters:** III-08–III-16 (III-07 frozen reference, read-only)

**Mission:** Extend the approved III-07 regression reference into correct least-squares, iterative optimization, feature models, regularization, binary and multiclass classification—without forking the reference implementation.

## Mandatory shared charter — read before acting

**Start gate:** Do not start until Astra Ultra/integration owner gives you (a) the accepted **Book III M0/M1 + III-07 Linear Regression** freeze SHA, (b) the actual Book III subdirectory, (c) frozen chapter/trace/fixture/manifest contracts, and (d) an allocated D:-based linked worktree and branch. Refuse to implement against the pre-foundation `325f7bdf` commit or to assume that Book III already exists. Read the frozen contracts and current repository `AGENTS.md`/contributor guidelines before writing.

**Canonical repository:** `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books` (Windows: `D:\coding-projects\interactive-books`). Your Linux worktree must live on **the same D: NTFS volume**, under `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books-worktrees/`. It must be a `git worktree`, not a separate clone. Do not reuse Book I/II audit worktrees. Confirm `git rev-parse --git-common-dir` points to the canonical `.git`, initial HEAD equals the integrator's freeze SHA, and your worktree starts clean.

**Ownership:** You own only your assigned Part's chapter-specific prose, mathematical kernels, deterministic local fixtures, Python/NumPy references, unit/parity/oracle tests, Part-local visuals, and Part-local documentation. Use the directory layout actually frozen by M1. Do not invent or rename platform directories. Treat the global chapter index, landing page/Part navigation, shared trace player, shared inspectors, styles, package files, top-level `.gitignore`, other Parts, Book I and Book II as **read-only**. Provide proposed changes to shared contracts as a clearly scoped integration request; the integrator owns registration and shared-framework changes. Use Part-local declarative manifests or M1's approved auto-discovery contract, not competing central-index edits.

**Education and computation:** Preserve Book III's Part-first navigation and distinctive ML visual identity. At every major interactive, show the authoritative numeric state, its equation, input provenance, update/decision, output, and relevant vector/tensor shapes. SVG/Canvas is only a projection of numeric state. Provide complete learner-facing chapters, not title-only scaffolds. Include prerequisite links to actual Book II published content via the M1-approved stable anchor resolver; no invented destination URLs. Use deterministic small datasets, seed-controlled experiments, meaningful counterexamples, and transparent assumptions. Explain objective/loss separately from evaluation metrics. Match Book II column-vector math conventions and explicitly document any batch row-matrix convention.

**Canonical code:** Teach the from-scratch mathematics in **Python + NumPy**. TypeScript/browser computations must agree on committed deterministic golden traces. Confirm correctness against a **mathematically independent oracle** (analytic formula, exhaustive enumeration, finite differences, robust linear algebra, or suitable scikit-learn comparison depending on the chapter), not only Python↔TypeScript agreement. Framework/library wrappers come only after the mechanism is visible. No network requirement for core learning; no runtime hosted-model calls.

**Tests and build coordination:** Use the **actual** `package.json` scripts/runner and baseline policy delivered by M1/M2—do not fabricate commands or reported test counts. Run light checks in your own worktree; coordinate ALL expensive compiles, Python-wide test sweeps, Astro production builds, and Playwright/browser/screenshot tests through the integrator's one-at-a-time heavy-validation slot. On Linux, when a heavy run is authorized, wrap the exact validated command with `flock /tmp/interactive-books-heavy-gate.lock -c '...exact command...'`; the integrator must also coordinate any Windows jobs because Linux `flock` does not lock Windows processes. Do not regenerate unrelated screenshot baselines, invoke `--update-snapshots`, install Linux dependencies into Windows `node_modules`/`.venv`, or edit platform-specific browser baselines without approved reasons.

**Security/change boundary:** No changes to canonical `main`, no automatic merge, push, Cloudflare deployment, force push, `git clean`, `git reset --hard`, history rewriting, old `/work/interactive-books` files, or agent histories/memory/sessions/databases. Preserve commit history and test evidence. Never delete an old worktree without integrator approval.

**Deliverable and stop rule:** Return a dedicated Part completion report containing chapter checklist, conceptual/algorithmic design, equations, UI trace inventory, exact files changed, commit SHAs, clean status, precise validation commands and result counts, independent oracle proofs (and tolerances), parity and shape checks, responsive/accessibility results, edge-case coverage, performance observations, baseline changes (expected to be none outside your Part), known limitations and scoped integration requests. Classify **BLOCK / CORRECTION REQUIRED / ACCEPT WITH LIMITATIONS / ACCEPT / FREEZE** as a recommendation; only the independent integrator decides acceptance. **Stop** on foundation-contract drift, shared-file collisions, mathematical/oracle failures, unexplained visual-state divergence or unapproved source/baseline changes. Do not self-declare frozen.

## Owned chapter deliverables

| Chapter | Mechanism and flagship interaction |
|---|---|
| **III-08 — Least Squares and the Closed-Form Best Fit** | Show the least-squares slope/intercept derivation and optimum; clearly handle zero x-variance and contrast closed-form and optimization. |
| **III-09 — Gradient Descent for Linear Regression** | Step through gradients, learning rate and loss surface; stable convergence, oscillation and divergence. Build on frozen III-07 code. |
| **III-10 — Multiple Linear Regression** | Editable design matrix X, coefficient vector W and output XW; include bias/intercept and input/output shape inspector; solve robustly. |
| **III-11 — Polynomial Features** | Map x→[x,x²,...], fit capacity and show train vs held-out error; stress model is linear in parameters. |
| **III-12 — Regularization** | Contrast L2/Ridge and L1 with explicit penalty terms; show intercept-treatment and shrinkage, not decorative weight bars. |
| **III-13 — Logistic Regression** | Logits, sigmoid, likelihood and stable binary cross-entropy from logits; trace parameter gradient and update. |
| **III-14 — Decision Thresholds and Confusion Matrix** | Move threshold; show per-example label flip and exact TP/FP/TN/FN counts. |
| **III-15 — Precision, Recall, F1 and ROC** | Expose metric formulas, zero-denominator policy and ROC threshold sweep, including imbalanced examples. |
| **III-16 — Multiclass Classification and Softmax Regression** | Inspect logits, shifted softmax, class probabilities, cross-entropy and gradients; tensor shapes visible. |

## Part-level flagship experience

Two coordinated experiments: (1) fit/optimization/regularization laboratory linked to frozen III-07; (2) live classification probability and threshold laboratory, where confusion counts and metrics derive from exactly the same labeled examples and predicted scores.

## Required independent numerical oracles and failure cases

1. Univariate closed-form least-squares vs independent formula; multivariate solution vs `numpy.linalg.lstsq` (do not teach inverse-of-normal-equation as numerically reliable).
2. Analytical regression/logistic/softmax gradients checked by centered finite differences at non-pathological values.
3. Numerically stable binary cross-entropy/log-sum-exp/softmax under large magnitude logits; row probabilities sum to one.
4. Deterministic confusion matrix and precision/recall/F1/ROC counts checked against hand-computed fixtures; explicit undefined-metric handling.
5. Separate Python oracle, TypeScript parity and library comparison where installed and deterministic.

## Exact scope boundaries

**III-07 is FROZEN and read-only.** If it lacks an essential extension point, produce a minimal compatibility request to the integrator—do not rewrite the reference or the shared numerical contract. Distinguish least-squares objective from GD solver, and training loss from evaluation metrics.

## Exit criteria for this Part

A. All assigned chapters are authored and available through **Part-local manifests** under the frozen foundation, with no unapproved shared-shell or central-index edits. Chapter contents, operations, equations, code, trace and visualization all agree.

B. Per-chapter deterministic datasets and mathematical counterexamples exist, including the cases named above. Python/NumPy canonical references, a separate independent oracle, and browser parity results are captured with tolerances.

C. Keyboard/touch operation and responsive layouts are checked at least at **1440px desktop, 820px tablet, 390px mobile** or the M1-approved reference viewports. No permanent overwhelming chapter sidebar; preserve Part-first navigation.

D. Fast checks pass; any scheduled heavy production/browser checks run through the single integrator-controlled slot. No unrelated screenshot baseline changes.

E. Commit only your Part-owned deliverables to your own branch. Return the final report and stop for independent review; **do not merge or deploy**.
