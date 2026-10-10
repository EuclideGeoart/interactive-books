# Interactive Mathematical Foundations — Book II

*For Computing & Machine Learning.* A visual-first, manipulation-driven mathematics book: **see it → manipulate it → understand the mechanism → derive the mathematics → implement/use it.**

**Status: M0 + M2 foundation.** The platform, curriculum structure, design system and test harness are in place, together with one clearly labelled **foundation demo** (a draggable vector). **No curriculum chapter is written yet**; the reference chapter (I.3 *Vectors*) is milestone M3 and awaits the review gate.

Authority: [`documentaion/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md`](documentaion/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md) (the directory name is spelled that way in the tree as supplied; it is left untouched).

| Read this | For |
| --- | --- |
| [`documentation/BOOK_II_REUSE_AUDIT.md`](documentation/BOOK_II_REUSE_AUDIT.md) | M0: what Book I offers, what was reused conceptually/directly, what was redesigned or excluded, risks |
| [`documentation/BOOK_II_DESIGN_DIRECTION.md`](documentation/BOOK_II_DESIGN_DIRECTION.md) | The visual identity, typography, layout, navigation and interaction philosophy |
| [`documentation/CHAPTER_AUTHORING.md`](documentation/CHAPTER_AUTHORING.md) | How to write a chapter on this platform |
| [`documentation/M0_M2_IMPLEMENTATION_REPORT.md`](documentation/M0_M2_IMPLEMENTATION_REPORT.md) | Evidence, test results, screenshots, limitations, REF-1 prerequisites |

## Quick start

Requires Node ≥ 22.12 and npm. Python 3 is needed only for the oracle tests; NumPy is a cross-check and is installed into a local `.venv`.

```sh
npm ci
npm run oracle:setup      # creates .venv with NumPy (only for the oracle cross-check)
npm run dev               # http://localhost:4321
```

### Everything, as a reviewer would run it

```sh
npm run validate
```

which is exactly:

| Step | Command | What it proves |
| --- | --- | --- |
| types | `npm run check` | `astro check`: TypeScript over `.ts`, `.tsx`, `.astro` **and the tests** |
| unit | `npm test` | Vitest: mathematical primitives, numeric formatting, viewport transform, curriculum ⇄ master-plan drift, MDX formulas, Python-oracle parity |
| oracle | `npm run test:oracle` | The independent Python oracle's own self-tests (literal values from the plan) and a freshness check of `fixtures/vector2.fixtures.json` |
| build | `npm run build` and `npm run build:subpath` | Static output at the origin root (`dist/`) and under `/math-foundations/` (`dist-subpath/`) |
| crawl | `npm run check:dist` | Every URL under the base path and resolving; fragments exist; fonts and CSS `url()`s resolve; no raw TeX or KaTeX error nodes |
| browser | `npm run test:e2e` and `npm run test:e2e:subpath` | Playwright at 1440 / 820 / 390 px: interaction, keyboard, touch, accessibility (axe), responsive layout, deployment, screenshots |

Browser tests use a *production* build served by `scripts/serve-dist.mjs` (a strict static server: real 404s, no SPA fallback, nothing outside the mount path). They find Chrome via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` or `/opt/google/chrome/chrome`; no browser download is performed. Ports 4451 (root) and 4452 (sub-path).

**Screenshot baselines** live in `tests/e2e/__screenshots__/` (17 images, ~1.5 MB). They are Linux/Chrome specific; fonts are self-hosted so they are deterministic on a given machine class. Refresh deliberately with `npx playwright test tests/e2e/visual.spec.ts --update-snapshots` and *look at the images*. Review captures at full resolution: `node scripts/capture-review.mjs <outDir>` (needs a running server).

### Deployment

```sh
npm run build                                   # origin root
BOOK_BASE=/some/path/ npm run build             # any sub-directory (outDir defaults to dist/)
npm run build:subpath                           # the tested sub-path build: /math-foundations/
```

The output is plain static files. There is no backend, no service worker, and no request to any other origin. Internal links all go through `src/shell/href.ts`, the only place the base path is applied. A host that serves a custom `404.html` only at its root (GitHub Pages) will not serve the 404 page for a deep sub-path; that is a hosting limitation, not a link error.

## Architecture in one page

```
Mathematical state ──► derived quantities ──► geometry · inspector · formulas · spoken text · work frames
   (one object)          (pure functions)        (views never recompute; they only map)
```

| Layer (master plan §6.1) | Where | Knows about |
| --- | --- | --- |
| **C — domain mathematics** | `src/math/` (`vector2/`), `src/lessons/` (lesson-owned inspector rows, formulas, scene, trace) | vectors, exactness. Pure TypeScript, no DOM |
| **B — generic infrastructure** | `src/platform/` (viewport, numeric formatting, exact/approx values, params, trace, overflow) and `src/ui/` (plane, drag point, inspector, parameter input, trace stepper, formula) | nothing about any domain |
| **A — shell** | `src/shell/`, `src/pages/`, `src/scripts/shell.ts`, `src/styles/` | the book: Parts, chapters, navigation, theme |
| **D — chapter composition** | `src/content/chapters/*.mdx` + a lesson island such as `src/lessons/foundation/VectorStage.tsx` | prose + one interactive stage |

Only the interactive stages are Preact islands (everything is also rendered on the server, so the canonical state is in the HTML before JavaScript runs). All other pages are static Astro/MDX. Mathematics in prose is rendered at build time with KaTeX (`remark-math` + `rehype-katex`); live formulas use the same KaTeX version and the single macro table `src/math/katex-macros.mjs`.

### Conventions (master plan §3)

`+x` right, `+y` up (screen flip lives only in `platform/geometry/viewport.ts`) · column vectors · matrices act from the left, `v′ = Av`, and `B(Av) = (BA)v` · radians canonical · `=` exact, `≈` approximate, never `=` for a rounded value · undefined states are shown as undefined, never invented.

### The curriculum is data

`src/curriculum/curriculum.ts` holds all eight Parts and 94 chapters. `tests/unit/curriculum.test.ts` re-parses the master plan and fails if a title, a number, a Part purpose or an exit condition drifts. Chapters are `planned` (plain text in the map, never a dead link) or `available` (a link, with an MDX file).

## Layout

```
documentaion/   the authoritative master plan, exactly as supplied (do not edit)
documentation/  audit, design direction, authoring guide, implementation report, screenshots
src/            see the table above
code/python/    reference code shown on pages AND executed by the oracle tests
oracle/         independent Python oracle (stdlib + NumPy cross-check) and its tests
fixtures/       JSON written by the oracle, read by the TypeScript parity tests
tests/unit/     Vitest          tests/e2e/   Playwright
scripts/        static server, dist crawler, oracle runner/setup, review-screenshot capture
```

## Moving or importing this directory

Nothing depends on the absolute path. After moving or cloning: `npm ci`, and re-create the (non-relocatable) virtual environment with `rm -rf .venv && npm run oracle:setup`. `dist/`, `dist-subpath/` and `.astro/` are regenerated by the build.
