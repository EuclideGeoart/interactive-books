# M7+M8 — Integrated Book II Calculus and Probability Acceptance

Date: 2026-10-12 (Europe/Berlin). Integration branch: `feature/book-ii-m7m8-integration`.
Working directory: `/work/interactive-books-m7m8-integration/Interactive-Mathematical-Foundations-Book`.

## Provenance and publication

- Common predecessor: `9b0149902ab67a0f6b0dcfd9e7de90c88491808a` (M6-C accepted baseline).
- M7 Part III Calculus: `a0171569b45fbda3cda91b46f10761661be1c0ca` (production source `60561e6`), independently accepted.
- M8 Part IV Probability: `75625f608cd7f8a148a775eddf88c7d1aadd1179` (production source `831306d`), independently accepted.
- Combined publication: Part I 9/9, Part II 19/19, Part III 15/15, Part IV 16/16 = **59/97 available, 38 planned**.
- The III.15 → IV.1 and IV.16 → V.1 navigation boundaries are tested explicitly.
- Neither original accepted agent branch was changed, nor was the canonical checkout or Book I.

## Conflict resolution

The branches overlapped in eight files. Both mathematical implementations and chapter assets were retained:

- `src/curriculum/curriculum.ts` merged automatically, publishing both parts.
- `scripts/validation-plan.mjs` was reconciled manually, retaining all five Calculus families, eight Probability families, model import dependency selection, screenshot ownership and fail-conservative unknown-file handling.
- `tests/unit/curriculum.test.ts` now enforces the integrated 59/38 count and reading-order boundaries.
- `tests/unit/validation-plan.test.ts` retains both agents' regressions, uses the real published Part IV catalog, and adds combined cross-part selection tests.
- Four publication snapshots (desktop/mobile contents and map) were regenerated *only for those views*, displaying 59/97. Targeted recapture: 4/4 passed.
- Existing M7/M8 mathematical models, test fixtures, oracles and branch-local visual baselines were not rewritten to resolve the merge.

## Combined Linux acceptance

Actual single milestone invocation (not two duplicate individual acceptance runs):

```sh
node scripts/validate.mjs milestone --base 9b0149902ab67a0f6b0dcfd9e7de90c88491808a
```

Result: **23 of 23 selected gates passed, no failed gate**. A successful subpath production refresh was recorded separately (24 zero-exit result entries). The saved manifest is `documentation/M7M8_VALIDATION_MANIFEST.json`, copied byte-for-byte from `validation-results/milestone-2026-10-12T10-09-18-742Z/manifest.json` after completion.

| Gate family | Outcome |
| --- | --- |
| Astro/type/content | passed |
| Full units | 12,810 passed in 105 files |
| Python independent oracle checkers and freshness | 370 tests passed; 26 oracle families fresh |
| Root and subpath production | 63 pages, 8 stylesheets, 338 files checked per mount |
| Read-only chapter contracts and representative both-theme accessibility | passed on combined 59-chapter curriculum |
| Calculus interaction families | autodiff, derivatives, limits, integration, multivariable passed |
| Probability interaction families | Bayes, distributions, sampling, finite, counting, joint, moments, variables passed |
| Shared controls, navigation, deployment and prefix-safe subpath | passed |
| Root authoritative visual regression (all four parts) | 204 passed, 15 pre-existing project-specific skips, no failures |

All selected gates were completed in the initial combined run; no failed gate was retried or hidden by expanding screenshot tolerances. The four publication screenshot updates were a separate explicitly scoped preparatory capture. No exhaustive browser suite was claimed.

## Resource and worktree boundaries

- About 25 GiB was free on `/` during final review.
- The integration checkout reuses the canonical Node package installations through individual symbolic links; only local `.vite`, `.vite-temp`, and `.astro` temporary directories reside in its `node_modules` overlay. This avoids writes into shared dependency caches and installs no second dependency tree.
- The Python `.venv` remains a symbolic link to the existing canonical environment.
- Heavy operations were run sequentially in this integration session; T0 itself invoked its configured `flock`. The Native Commander process sandbox isolates its `/tmp`, so the host-wide visibility of that lock was not independently asserted. The two other implementation agents had already stopped.
- No source cleanup, Codex/Claude database cleanup, repository push, deployment or promotion of `main` was performed.

## Remaining release work and next baseline

Windows-specific rendering, real tablets and phones, manual screen-reader acceptance, and exhaustive release certification remain deferred, as in M7 and M8.

This committed integration merge is the new common baseline for two subsequent **Sol** worktrees: Agent A owns Part V Statistics, Agent B owns Part VI Optimization and the *single combined final acceptance* for both. They should start from this merge commit, work in distinct worktrees, avoid redundant dependency installation, serialize heavyweight builds/browser tests, and stop discretionary writes when root space becomes low. Keep `main` and the accepted M7/M8 history unchanged until separately instructed.
