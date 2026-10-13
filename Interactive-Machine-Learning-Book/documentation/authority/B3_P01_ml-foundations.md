# /goal — Book III, Part I: ML Foundations

**Agent ID:** B3-P01 | **Branch:** `feature/book-iii-part-i-foundations` | **Chapters:** III-01–III-06

**Mission:** Establish the complete machine-learning pipeline before sophisticated algorithms. Teach what is learned, which information is observed, why splits/generalization matter, and which quantities actually change.

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
| **III-01 — What Machine Learning Actually Learns** | Editable parameterized predictor; trace input → feature representation → prediction → error → chosen parameter, distinguishing training from inference. |
| **III-02 — Samples, Features, Labels and Targets** | Inspectable tiny X/y table; highlight sample, feature, target, row/column meaning, types/units, and array shapes. |
| **III-03 — Learning Problems** | Classify problems as supervised/unsupervised and regression/classification through small data tasks; show when a target exists. |
| **III-04 — Training, Validation, Testing and Generalization** | Seeded drag-and-assign splitting experiment; teach held-out evaluation, duplicate/group leakage and distribution mismatch without hidden shuffling. |
| **III-05 — Parameters, Hyperparameters, Loss and Optimization** | One full prediction→loss→parameter-update loop; exact distinction between trainable parameters, externally chosen hyperparameters and loss. |
| **III-06 — Underfitting, Overfitting, Bias, Variance and Baselines** | Adjust polynomial capacity/noise and see training vs validation error; teach generalization, feature scaling, data leakage and baseline comparison. |

## Part-level flagship experience

A unified, inspectable supervised-learning pipeline: user changes data split/model complexity, observes train/validation curves, individual residuals, baseline performance, leakage warnings and numeric parameter traces. Do not create an independently authoritative regression engine; reuse the M1/III-07 reference interfaces.

## Required independent numerical oracles and failure cases

1. Partition invariant: no unintended overlapping train/validation/test sample IDs; preserve groups when group split is demonstrated.
2. Explicit small fixture for loss and baseline mean prediction, compared with a separately implemented arithmetic oracle.
3. Exact reproducibility under identical seed, including data ordering and model selection.
4. Demonstrate a seeded counterexample where fitting preprocessing on the whole dataset leaks validation information.

## Exact scope boundaries

Part I may introduce bias/variance qualitatively and with precise toy experiments; detailed cross-validation/calibration and pipelines belong to Part VIII. Do not add a second learning pipeline to the shared platform.

## Exit criteria for this Part

A. All assigned chapters are authored and available through **Part-local manifests** under the frozen foundation, with no unapproved shared-shell or central-index edits. Chapter contents, operations, equations, code, trace and visualization all agree.

B. Per-chapter deterministic datasets and mathematical counterexamples exist, including the cases named above. Python/NumPy canonical references, a separate independent oracle, and browser parity results are captured with tolerances.

C. Keyboard/touch operation and responsive layouts are checked at least at **1440px desktop, 820px tablet, 390px mobile** or the M1-approved reference viewports. No permanent overwhelming chapter sidebar; preserve Part-first navigation.

D. Fast checks pass; any scheduled heavy production/browser checks run through the single integrator-controlled slot. No unrelated screenshot baseline changes.

E. Commit only your Part-owned deliverables to your own branch. Return the final report and stop for independent review; **do not merge or deploy**.
