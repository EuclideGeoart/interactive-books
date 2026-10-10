# Book II — Reuse Audit of the Interactive C++ DSA Book (M0)

**Status:** M0 deliverable · **Scope:** read-only audit of Book I, followed by the reuse decisions that shaped M2
**Authority:** `documentation/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md` (§2.5 "small shared platform, domain-owned mathematics", §17 Phase M0)

> The master plan was supplied in a directory spelled `documentaion/` (sic) and was relocated to `documentation/` in WIN-0. Its contents are byte-identical (sha256 `c868e6ad…0612`).

---

## 0. Method, and what this audit does *not* claim

**Book I location (discovered, not assumed):** `/work/Interactive-C++-Data-Structures-&-Algorithms-Book/` at audit time. During this milestone the user moved it, unchanged, into the shared repository `/work/interactive-books/Interactive-C++-Data-Structures-&-Algorithms-Book/`; the integrity check below was repeated at the new location.

**How it was audited.** I read the *implementation*, not just its documents:

| Read in full | Skimmed / sampled |
| --- | --- |
| `src/engine/*` (types, playback, memory, source), `src/content/{book,search}.ts`, `content.config.ts`, `src/layouts/BookLayout.astro`, all of `src/components/book/*`, `src/components/{code,controls,memory}/*`, `components/visualizers/{primitives.ts,TraceLab.astro,Diagram.astro}`, `src/scripts/{book,lab,trace-lab,diagrams,inspection-diagram,diagram-fit,chapter-labs,register-sw}.ts`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `package.json`, `AGENTS.md`, `public/{sw.js,manifest.webmanifest}` | the ~70 `components/visualizers/*` lab wrappers, the ~10 k lines under `src/visualizers/*` (DSA models), `tests/e2e/book.spec.ts` (first ~250 lines), `tests/unit/{reuse,native-parity}.test.ts`, `scripts/{validate-book-deployment,linear-fixture}.mjs`, the first 60 lines of `src/styles/book.css`, `documentation/IMPLEMENTATION.md`, `README.md` |

**Not done:** Book I was never built, run, or served for this audit (that would write `dist/`, `.astro/`, `test-results/` into it). Claims about runtime behaviour are inferred from source. I did not review chapter prose.

**Book I was not modified.** At audit time Book I's `.git/` was an *empty directory* (not a usable repository), so `git status` could not prove non-modification. Instead, before reading anything, I recorded a fingerprint of every file outside `node_modules/` (relative path, size, mtime — 5,787 files, SHA-256 `0a20ed18…`) and re-checked it at the end: identical. (A rename preserves mtimes, so the check is valid after the user's move. The empty `.git/` directory is no longer present; that was the user's reorganisation and is not covered by a file-level fingerprint.) See `M0_M2_IMPLEMENTATION_REPORT.md` §Book I integrity.

### Measured facts about Book I (all from `find`/`grep`/`wc` on the tree)

| Fact | Value |
| --- | --- |
| `src/**/*.ts` + `*.astro` lines | 13,650 — of which **10,165 (74 %) are `src/visualizers/*` DSA models** |
| Chapters / hand-written route wrappers in `src/pages/chapters/` | 67 / 67 (each 3–5 lines) |
| Unit-test files / e2e spec files | 52 / 25 |
| Committed snapshot PNGs | 816 under `tests/e2e/`, 983 under `tests/visual/`; `tests/` is **256 MB** |
| Files hard-coding part boundaries as numeric ranges | `BookNav.astro` (8 range tests, 10 near-identical link blocks), `ChapterHero.astro` |
| `innerHTML =` assignments in `src/scripts/*.ts` | 17 |
| Math renderer (KaTeX/MathJax/MathML) | **none** |
| Landing page | **none** — `src/pages/index.astro` renders Chapter 00 |
| `prefers-reduced-motion` handling | 1 CSS file; 0 TypeScript files (`PlaybackController` ignores it) |

These numbers matter because they show where Book I's *genuinely reusable* mass is: very small. Its value is in **ideas and validation habits**, not in portable code.

---

## A. Reuse conceptually (re-implement for Book II)

| # | Book I mechanism (evidence) | Why it is worth keeping | Book II form |
| --- | --- | --- | --- |
| A1 | **Semantic immutable trace; time never mutates the model; Previous = select an earlier snapshot** (`engine/playback.ts`, `engine/types.ts`, `IMPLEMENTATION.md` §Data flow) | Exactly the contract of master plan §2.4/§6.4. Avoids "numerically undo a mutation". | `platform/trace.ts`: `TraceFrame<S,E>` + a **pure** `TraceCursor` (seek/next/previous/reset, clamped). No timers. Autoplay/speed deferred — see D-Trace in the design doc. |
| A2 | **One model → views** (`LabAdapter.build/draw/inspect/describe/invariants`) | The same principle as plan §6.2. The adapter seam is what let 60+ chapters share a lab shell. | Lesson state → `derive()` → views, enforced by one `useLesson` hook; formulas, inspector and geometry all consume the *same* derived object (no per-view recomputation). |
| A3 | **Native parity**: C++ header instrumented → executed → compared with the browser trace (`scripts/linear-fixture.mjs`, `tests/unit/native-parity.test.ts`) | The strongest idea in Book I: the *authority* is executable code, not a hand transliteration. | Python oracle emits a JSON fixture; TypeScript tests consume it. Independence rules in design doc §7. |
| A4 | **Layered validation** (unit → e2e at 1440/1024/390 → axe in light *and* dark → screenshots → whole-site deployment crawl) | Matches plan §12 almost one-to-one. | Same layers, with a smaller, curated baseline (see risk R7). |
| A5 | **Deployment crawl with base-path escape check**, adjacent-nav assertion, runtime-error capture (`scripts/validate-book-deployment.mjs`) | Catches the classic "works at `/`, breaks at `/book/`" bug. | `scripts/check-dist.mjs` + e2e run against both a root and a subpath build, **failing on any 4xx response** (fonts and `_astro` assets included). |
| A6 | **Base-path discipline** (`BOOK_BASE` env → Astro `base`; `import.meta.env.BASE_URL` for every internal link) | Required by the brief. | Same, centralised in one `href()` helper so no component concatenates paths by hand. |
| A7 | **Theme boot script** before first paint, `try/catch`-wrapped storage | Prevents theme flash; survives blocked storage. | Re-written; tokens are CSS custom properties (design doc §3). |
| A8 | **Native `<dialog>` for nav/search**, Escape handled explicitly, focus returned to opener | Accessible by construction; no focus-trap library. | Used for the book map (contents). |
| A9 | **Graceful degradation**: `<noscript>`, textual fallback for each diagram (`<details class="text-fallback">`) | Plan §11 and "static-friendly" math. | Every stage server-renders its canonical state and a prose description; math is pre-rendered at build. |
| A10 | **Inspector as a first-class surface** (`components/memory/inspector.ts`) | Plan §6.6. | `Inspector` of typed `Quantity` rows (symbol, name, exact, approx, validity). The pointer-field content is DSA-specific; only the *idea* carries over. |
| A11 | **Source-region tagging** (`@begin/@end/@trace`) linking code lines to trace events (`engine/source.ts`) | Will be needed for code↔visualisation sync in later chapters. | **Deferred.** M2 instead guarantees "displayed code is the executed file" (the demo's Python snippet is imported `?raw` from a file the oracle test runs). |

## B. Reuse directly (domain-independent *configuration*; adapted by hand)

An honest finding: after reading the whole platform layer, **no Book I source file qualifies for verbatim reuse.** Everything that looks generic either (a) carries DSA defaults, (b) hard-codes DSA chapter structure, or (c) is built on the string-HTML rendering approach rejected in R1. What *can* be reused directly is scaffolding:

| Item | Reuse | Note |
| --- | --- | --- |
| `tsconfig.json` (`astro/tsconfigs/strict` + `noUncheckedIndexedAccess`) | adapted | Adds `jsxImportSource: preact`. |
| `vitest.config.ts` shape (`include: tests/unit/**`) | adapted | |
| `playwright.config.ts` shape: `desktop/tablet/mobile` projects, `reducedMotion`, env-driven port/base, optional `executablePath` | adapted | Book I's `webServer` runs `astro preview`; Book II serves `dist/` with a strict static server so base paths and 404s behave like real hosting. |
| axe invocation (`wcag2a, wcag2aa, wcag21aa`, loop over themes) | adapted | |
| `.gitignore` entries | adapted | |
| `escapeHtml`, `storage` try/catch wrapper, `PlaybackController` seek-clamp logic | **not copied** | Each is ≤ 20 lines; JSX escapes for us; the cursor is re-expressed as pure functions. Copying would import naming and generics defaults (`MemoryState`) for no gain. |

**No code is shared, imported, symlinked or vendored between the repositories.** (Plan §2.5 / brief: no premature cross-repository package.)

## C. Redesign (same technical purpose, different design or UX)

| Area | Book I | Problem for Book II | Book II |
| --- | --- | --- | --- |
| **Shell** | Fixed 248 px left sidebar + topbar + right-hand outline (`BookLayout.astro`) | Reads as a documentation site; permanent chrome competes with the mathematics | Slim top bar with a **Part ruler** (I–VIII as positions on a line) + a "book map" dialog; in-chapter outline in the margin only on wide screens |
| **Landing** | None (home = Chapter 00) | Book II must present eight Parts and sell the premise | Original landing page with a live manipulable vector |
| **Navigation data** | 10 hard-coded `<details>` blocks and numeric ranges in `BookNav.astro`; same ranges again in `ChapterHero.astro`; outline arrays hard-coded in `BookLayout.astro` | Four places to edit for one curriculum change; impossible to cross-check against the plan | One `curriculum` module, validated against the master plan by a unit test |
| **Routing** | 67 hand-written `pages/chapters/*.astro` wrappers | Pure boilerplate; easy to forget a chapter | Dynamic route from a content collection; curriculum ↔ content consistency tested |
| **Search** | Regex over raw MDX `<Section …>` at build time (`content/search.ts`) | Silently drops any section not written in that exact syntax | M2: filter over the curriculum structure only (titles, Parts, status). Full-text search is deferred and should index *rendered* headings |
| **Rendering of interactives** | `innerHTML = drawX(state)` into a container, then restore focus by re-querying `data-*` selectors (`DiagramView.render`, `InspectionDiagram.render`) | See R1: destroys the element under a captured pointer; fine for click-to-step, wrong for drag | Declarative Preact islands; the dragged element persists across frames |
| **Controls** | `<form>` + `FormData` + `data-*` hooks per lab | Stringly-typed; no domain/step/format declaration (plan §6.5) | `ParamSpec` (symbol, unit, domain, default, step, format, invalid policy) + `ParameterInput` |
| **Visual language** | Navy/green/amber, system sans, uppercase mono "eyebrow" labels, node-and-pointer vocabulary | Strongly DSA/engineering-doc; brief demands independence | Design doc: ink/paper, semantic hue per mathematical *role*, serif text with KaTeX, instrument-style numerals |
| **Code surface** | Shiki tokens emitted per line for synchronised stepping | Needed later; heavy for M2 | Shiki via Astro `<Code>`, dual light/dark themes through CSS variables; synchronisation deferred (A11) |
| **Fit / Actual size** | Global `MutationObserver` + a hard-coded list of SVG class names (`diagram-fit.ts`) | Coupled to DSA diagram classes | Not needed yet. The plane sizes itself to its container and keeps an equal-scale aspect |
| **Progress / completion** | `IntersectionObserver` + `localStorage` + "mark complete" | Not requested for M2 | Only "current section" highlighting in the outline |
| **PWA / service worker** | Hand-written `sw.js` that parses built JS/CSS with regexes to find dependencies | Brittle; offline is outside M2 | **Excluded** for M2 (see D) |

## D. Exclude

* All DSA semantics: `engine/memory.ts`, `engine/types.ts` (`MemoryState`, pointer `TraceEvent`s), `components/memory/*`, node/pointer/arrow SVG primitives (`dataNode`, `pointerField`, `referenceArrow`, `arrowDefinitions`).
* `src/visualizers/*` (10,165 lines of list/tree/hash/graph/sorting/allocator/spatial models), the ~70 lab wrappers, per-domain `*-labs.ts` scripts and the 11 per-domain stylesheets.
* The C++ pipeline: `cpp/`, `.cpp-build/`, every `check-*-cpp.mjs`, `*-fixture.mjs`, `native-fixture.mjs`, the compile-and-run steps in the deployment validator, `CanonicalSource`/`FullSource` download components, `engine/source.ts` (kept as an idea, A11).
* "Break-It", complexity explorers, bidirectional-node `AGENTS.md` rule, `open-book.sh`.
* Service worker / manifest / offline page / PWA icons.
* Book I's committed snapshot corpus and its per-milestone `part-*-delivery/`, `documentation/validation/` archives.

---

## R. Architectural risks

### Risks inherited from Book I that Book II must *not* reproduce

* **R1 — Re-rendering by string replacement breaks drag.** `DiagramView.render()` and `InspectionDiagram.render()` replace the diagram's `innerHTML` on every update and then try to restore focus by rebuilding a CSS selector from `data-node` / `data-target` / `aria-label`. That is tolerable for click-to-select and per-step playback (the DSA labs never track a moving pointer). A Book II handle is *dragged*: pointer capture, hover and focus all live on one DOM node, which this strategy destroys on every frame (17 `innerHTML` assignments in `src/scripts`). **This is the evidence behind the one deviation from Book I's stack: Preact islands** (3 kB, server-renderable, keyed reconciliation). Preact is the only runtime framework dependency; every component renders on the server so the canonical state is in the HTML before JS runs.
* **R2 — Curriculum structure duplicated in code.** Part ranges live in two components, and the deployment validator re-derives chapter lists by regex-parsing `book.ts` source text. For Book II the curriculum is *data*, validated against the master plan (94 chapters: 7+19+14+16+10+10+8+10) by a test that parses the plan.
* **R3 — Global listeners keyed on `data-*` attributes** (`scripts/book.ts` wires theme, nav, progress, search for the whole page, assuming certain elements exist). Adding a page without e.g. `[data-complete]` throws at import. Book II scripts are per-feature, null-safe, and idempotent.
* **R4 — No math rendering.** Book I never needed it. Book II's formulas must be pre-rendered at build and also rendered live; the same KaTeX version and macro table must serve both or inline math would drift from live math.
* **R5 — Runtime motion ignores user preference.** `PlaybackController` advances on a 1100 ms timer regardless of `prefers-reduced-motion` (it is user-initiated, so defensible, but plan §11.4 asks for more care). Book II's trace cursor is timer-free, so there is nothing to disable.
* **R6 — Selector-list coupling** (`diagram-fit.ts` enumerates DSA SVG classes). New generic features must not require editing a central list.
* **R7 — Snapshot sprawl.** 1,800 committed PNGs / 256 MB makes every change a review burden and cements incidental pixels. Book II keeps a *small, curated* baseline (landing, shell, one stage in canonical and edited state, dark mode, mobile) and relies on mathematical tests for correctness.
* **R8 — Verification depends on a repository that is not a repository.** Book I has no usable git history; "unchanged" can only be shown by content/mtime fingerprint.

### Risks specific to Book II's new design (accepted knowingly)

* **R9 — Preact is a second authoring dialect** next to Astro components. Mitigation: islands only for stateful stages; everything else is Astro/MDX. No other framework is allowed in.
* **R10 — KaTeX ships to the client** (≈ 262 kB / 78 kB gz) *only* on pages with a live formula, as a separate island chunk. Static prose math is rendered at build and ships no JS. If this becomes a problem a custom renderer for a restricted macro set is possible, but not before measurement.
* **R11 — Exactness creep.** The pressure to "just add a bit of symbolic simplification" is real. M2 supports exactly one family: integer vectors → `n` or `a√b` (b square-free) via BigInt. Anything else is `numeric only`. This is a hard boundary (plan §10, §16).
* **R12 — Python/TypeScript are deliberately two implementations.** Independence can quietly erode (the oracle starts to "mirror" the TS code). Mitigation: the oracle uses a different algorithm (prime-factorisation for square-free parts, `fractions`/`math.isqrt` for exactness, NumPy as a cross-check), its own self-test uses *literals copied from the plan*, and the fixture file is checked for freshness.
* **R13 — Screenshot platform variance.** Baselines are Linux/Chrome-specific. Fonts are self-hosted to remove the largest source of drift, but the baseline is only valid on this class of machine; this is documented rather than hidden.
* **R14 — Toolchain pinning.** `npm view astro` currently reports a *7.x* major; Book I runs 5.18. Book II pins the Astro 5 / MDX 4 / `@astrojs/preact` 4 / Preact 10 / KaTeX 0.16 family (all proven together in a build spike before design work began, at both `/` and a `/sub/` base). Upgrading is a separate, deliberate task.

---

## Summary of the reuse boundary

* **Concepts adopted:** semantic traces and "select, don't undo"; one model feeding every view; executable-oracle parity; layered validation; base-path discipline and deployment crawl; native dialogs; graceful degradation; inspector as a learning surface.
* **Code adopted:** none verbatim. Configuration shapes (tsconfig, vitest, playwright projects, axe pattern, .gitignore) were adapted by hand.
* **Deliberately different:** shell, landing, navigation data model, routing, search scope, rendering strategy for interactives, controls, visual language, and the snapshot policy.
* **Excluded:** every DSA model, primitive, script, style, C++ tool, and the PWA machinery.
