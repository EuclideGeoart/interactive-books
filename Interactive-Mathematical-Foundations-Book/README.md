# Interactive Mathematical Foundations — Book II

*For Computing & Machine Learning.* A visual-first, manipulation-driven mathematics book: **see it → manipulate it → understand the mechanism → derive the mathematics → implement/use it.**

**Status: M0 + M2 foundation delivered; WIN-0 Windows portability delivered.** The platform, curriculum structure, design system and test harness are in place, together with one clearly labelled **foundation demo** (a draggable vector). The **v1.1 curriculum amendment (97 chapters)** passed the full Windows validation in C1; native Linux validation and independent review of the Windows baselines are pending. **No curriculum chapter is written yet**; the reference chapter (I.3 *Vectors*) is milestone M3 and awaits the review gate.

Authority: [`documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md`](documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md) — **curriculum v1.1 (97 chapters)**. WIN-0 first relocated the original v1 plan byte-for-byte (original sha256 `c868e6ad…0612`); the explicitly approved v1.1 amendment subsequently changed its contents. See [`documentation/CURRICULUM_V1_1_AMENDMENT.md`](documentation/CURRICULUM_V1_1_AMENDMENT.md) for the reviewed change map.

| Read this | For |
| --- | --- |
| [`documentation/BOOK_II_REUSE_AUDIT.md`](documentation/BOOK_II_REUSE_AUDIT.md) | M0: what Book I offers, what was reused conceptually/directly, what was redesigned or excluded, risks |
| [`documentation/BOOK_II_DESIGN_DIRECTION.md`](documentation/BOOK_II_DESIGN_DIRECTION.md) | The visual identity, typography, layout, navigation and interaction philosophy |
| [`documentation/CHAPTER_AUTHORING.md`](documentation/CHAPTER_AUTHORING.md) | How to write a chapter on this platform |
| [`documentation/M0_M2_IMPLEMENTATION_REPORT.md`](documentation/M0_M2_IMPLEMENTATION_REPORT.md) | Evidence, test results, screenshots, limitations, REF-1 prerequisites |
| [`documentation/T0_SCALABLE_VALIDATION_REPORT.md`](documentation/T0_SCALABLE_VALIDATION_REPORT.md) | Focused, milestone and exhaustive validation commands, coverage and measured costs |

## Quick start

Requires Node ≥ 22.12 and npm. Python 3 is needed only for the oracle tests; NumPy is a cross-check and is installed into a local `.venv`. Native development/build/test commands run unchanged in Windows PowerShell, cmd, and POSIX shells (Git Bash is not required; in fact avoid it for `npm run serve`, since MSYS rewrites a bare `/` argument into a Windows path). The scoped validation runners below require Linux `flock`; Windows retains its native commands and independent baselines.

```sh
npm ci
npm run oracle:setup      # creates .venv with NumPy (only for the oracle cross-check)
npm run dev               # http://localhost:4321
```

### Validation during implementation

```sh
npm run validate:focused -- --dry-run  # inspect tracked + untracked change scope
npm run validate:focused              # execute that scope, with a saved manifest
npm run validate:milestone -- --base <milestone-start-commit>
```

The runners serialize heavyweight work using `/tmp/imf-heavy.lock`, reuse source-matched production output, disable traces and preserve failure screenshots. Chapter/project selectors are additive; shared or unknown changes expand conservatively. Use `validate:exhaustive` for release or requested full certification. `npm run validate` below remains the legacy exhaustive workflow, not the ordinary edit loop. See the [T0 report](documentation/T0_SCALABLE_VALIDATION_REPORT.md#8-commands-for-agents) for single-chapter math/browser/visual, both-mount production and sharded CI commands.

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

Browser tests use a *production* build served by `scripts/serve-dist.mjs` (a strict static server: real 404s, no SPA fallback, nothing outside the mount path). They use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, else `/opt/google/chrome/chrome` when it exists (Linux reference setup), else Playwright's bundled Chromium (`npx playwright install chromium` once, e.g. on Windows). Ports 4451 (root) and 4452 (sub-path).

**Screenshot baselines are per rendering platform.** The Linux/Chrome references are `tests/e2e/__screenshots__/<spec>/` (17 images) and are the authority on Linux (and any non-Windows platform). Windows has its own 17-image set in `tests/e2e/__screenshots__/win32/`, selected automatically by `playwright.config.ts`; see its README for review status. A platform's baselines are never compared with another's and the tolerance is the same on both (`maxDiffPixelRatio` 0.004). Refresh deliberately with `npx playwright test tests/e2e/visual.spec.ts --update-snapshots` (on Linux this rewrites the Linux set; on Windows only the `win32` set) and *look at the images*. `BOOK_BASELINE_PLATFORM=linux` forces the Linux set on any OS. Review captures at full resolution: `node scripts/capture-review.mjs <outDir>` (needs a running server).

### Deployment

```sh
npm run build                                   # origin root
BOOK_BASE=/some/path/ npm run build             # any sub-directory, POSIX shells (outDir defaults to dist/)
$env:BOOK_BASE='/some/path/'; npm run build     # the same in PowerShell
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

`src/curriculum/curriculum.ts` holds all eight Parts and 97 chapters (I: 9, II: 19, III: 15, IV: 16, V: 10, VI: 10, VII: 8, VIII: 10). `tests/unit/curriculum.test.ts` re-parses the v1.1 master plan and fails if a title, a number, a Part purpose or an exit condition drifts. Chapters are `planned` (plain text in the map, never a dead link) or `available` (a link, with an MDX file).

## Layout

```
documentation/  the authoritative, versioned master plan (edit only by explicit reviewed amendment), audit, design direction, authoring guide, reports, screenshots
src/            see the table above
code/python/    reference code shown on pages AND executed by the oracle tests
oracle/         independent Python oracle (stdlib + NumPy cross-check) and its tests
fixtures/       JSON written by the oracle, read by the TypeScript parity tests
tests/unit/     Vitest          tests/e2e/   Playwright
scripts/        static server, dist crawler, oracle runner/setup, sub-path build, drag-latency measurement, review-screenshot capture (all Node, cross-platform)
```

## Moving or importing this directory

Nothing depends on the absolute path. After moving or cloning: `npm ci`, and re-create the (non-relocatable) virtual environment with `rm -rf .venv && npm run oracle:setup` (PowerShell: `Remove-Item -Recurse -Force .venv; npm run oracle:setup`). `dist/`, `dist-subpath/` and `.astro/` are regenerated by the build.
