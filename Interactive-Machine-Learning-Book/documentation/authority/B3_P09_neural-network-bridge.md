# /goal — Book III, Part IX: Bridge to Neural Networks

**Agent ID:** B3-P09 | **Branch:** `feature/book-iii-part-ix-neural-bridge` | **Chapters:** III-40–III-41

**Mission:** Finish Book III by explicitly reusing the learned linear-model mechanism and showing how nonlinear activations and function composition lead naturally to neural networks.

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
| **III-40 — From Linear Model to Artificial Neuron** | Inspect x, weights, dot product, bias, preactivation z, activation a and output; allow edits to each input and parameter. |
| **III-41 — Composition and Learned Representations** | Step through two small affine-plus-nonlinearity layers with exact intermediate shapes/values; show what nonlinearity adds beyond composition of affine maps. |

## Part-level flagship experience

A forward-pass mechanism explorer with a one-neuron and tiny two-layer numeric example: every edge and node displays forward values, weights, dimensions, z and activation; compare stacked linear-only maps with nonlinear composition.

## Required independent numerical oracles and failure cases

1. Hand-computed toy neurons and matrix multiplications for every intermediate layer, plus NumPy/TypeScript parity.
2. Verify that composition of affine maps collapses to a single affine map and that a nonlinear activation breaks this general equivalence.
3. Shape tests for single sample and batch, zero inputs, biases, incompatible dimensions and saturation.
4. Demonstrate model behavior without suggesting semantic understanding or pretending a tiny fixed-weight network has learned meaningful concepts.

## Exact scope boundaries

**No Book IV implementation.** Do not implement general backpropagation, PyTorch training, transformers, attention, tokens or LLM inference. End with clear handoff prerequisites for Book IV, which has its own project chat.

## Exit criteria for this Part

A. All assigned chapters are authored and available through **Part-local manifests** under the frozen foundation, with no unapproved shared-shell or central-index edits. Chapter contents, operations, equations, code, trace and visualization all agree.

B. Per-chapter deterministic datasets and mathematical counterexamples exist, including the cases named above. Python/NumPy canonical references, a separate independent oracle, and browser parity results are captured with tolerances.

C. Keyboard/touch operation and responsive layouts are checked at least at **1440px desktop, 820px tablet, 390px mobile** or the M1-approved reference viewports. No permanent overwhelming chapter sidebar; preserve Part-first navigation.

D. Fast checks pass; any scheduled heavy production/browser checks run through the single integrator-controlled slot. No unrelated screenshot baseline changes.

E. Commit only your Part-owned deliverables to your own branch. Return the final report and stop for independent review; **do not merge or deploy**.
