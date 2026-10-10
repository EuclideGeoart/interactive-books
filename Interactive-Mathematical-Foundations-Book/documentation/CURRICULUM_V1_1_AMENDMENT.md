# Book II — Curriculum v1.1 Amendment

**Date:** 2026-10-10
**Status:** User-approved curriculum scope; synchronized source-data change; validated on Windows in C1 (see `C1_CURRICULUM_V1_1_CORRECTIVE_REPORT.md`); native Linux validation pending
**Authority:** [INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md](INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md), §4 and §§24–25
**Effect:** 94 → **97 chapters** across eight Parts. No Part reordered, no reference chapter renumbered, no change to mathematical conventions or visual identity.

## 1. Why this change

The original progression is sound, but it expects some learners to know algebra, exponential/logarithmic functions, and the computational mechanism of differentiation before introducing them explicitly. Three prerequisite chapters close these gaps without turning Book II into a full pure-mathematics survey.

**Implementation order is not reading order.** REF-1 **I.3 Vectors** remains first for platform validation (draggable geometry, formula/inspector consistency, exactness, oracle parity, accessibility and responsive design). The eventual reader starts at I.1 → I.2 → I.3. The Vectors chapter explains the basic square/root and angular intuitions it needs without requiring future I.4/I.6.

## 2. Chapter changes

| Part | Previous | v1.1 | Scope |
| --- | ---: | ---: | --- |
| I · Mathematical Language | 7 | **9** | Expand I.1 to powers/roots. Add **I.4 Algebraic expressions, equations and inequalities** and **I.6 Essential function families**. Original I.4→I.5, I.5→I.7, I.6→I.8, I.7→I.9. REF-1 stays I.3. |
| II · Linear Algebra | 19 | 19 | Clarify matrix shapes, matrix addition, affine maps, complex-eigenvalue boundary and SVD/pseudoinverse. |
| III · Calculus | 14 | **15** | Add **III.10 Computational graphs and automatic differentiation**. Former III.10–III.14 become III.11–III.15. |
| IV · Probability | 16 | 16 | Base rates and continuous probability density vs interval probability. |
| V · Statistics | 10 | 10 | Sampling bias and estimator variability. |
| VI · Optimization | 10 | 10 | Regularization penalties and gradient clipping within existing chapters. VI.4 stays flagship. |
| VII · Information Theory | 8 | 8 | Logarithms build on I.6; stable log-softmax and loss directly from logits. |
| VIII · Numerical Computing | 10 | 10 | Tensor shapes/broadcasting, FP16/BF16 and mixed-precision caveats. |
| **Total** | **94** | **97** | **Three new chapters** |

**Authoritative chapter counts:** **9 / 19 / 15 / 16 / 10 / 10 / 8 / 10**.

## 3. Scope boundaries

- I.4 teaches usable elementary algebra, not a pure-algebra course. I.6 covers functions and their domains before the Calculus/Probability Parts require them.
- III.10 introduces forward/reverse differentiation of a real computational graph and accumulating gradients through shared inputs, not neural-network training.
- Matrix multiplication remains distinct from affine translation. A real matrix need not have a real eigenvector.
- Mathematical and numerical representations stay separate, and no unstable formula or unexplained "repair" replaces the taught mathematics.
- Keep the already accepted mathematical interaction architecture, design direction, REF-1 contract and single-model/multiple-view discipline.

## 4. Synchronized files

- `documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md` — authoritative curriculum and updated milestone sequencing.
- `src/curriculum/curriculum.ts` — 97 chapters, reordered IDs, exit conditions.
- `tests/unit/curriculum.test.ts` — plan/data drift check, chapter counts and boundary.
- `tests/e2e/navigation.spec.ts` — 97-chapter navigation expectations.
- `README.md` — current curriculum status and location.
- This amendment document.

M0/M2 and WIN-0 reports retain their **historical** 94-chapter statements; those records describe older tested commits, not the new curriculum.

## 5. Acceptance gate

This is a scoped curriculum edit **pending full test and screenshot validation**, not a chapter implementation or automatic freeze.

1. Validate plan ↔ curriculum data agreement, unique continuous IDs, I.3/VI.4 flags and new 97-chapter counts.
2. Run TypeScript checks, unit + Python oracle suites, both production builds, static crawler, root and subpath browser tests.
3. Review affected navigation/layout captures. Update **only the applicable per-OS visual baselines** after independent inspection; keep Linux/Windows baselines separate.
4. Record actual results and commit. The post-WIN-0 **Linux** validation remains necessary before a two-OS regression freeze.
5. Next educational milestone is M3 / REF-1 **I.3 Vectors**, then Part I in reading order. No Part-wide production before REF-1 acceptance.
