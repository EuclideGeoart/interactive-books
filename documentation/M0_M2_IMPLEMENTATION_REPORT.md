# M0 + M2 Implementation Report

**Milestone:** M0 (reuse audit) + M2 (minimal mathematics platform) · **Stops at the M0 + M2 review gate.** Nothing here implements, or claims to implement, REF-1 (I.3 *Vectors*) or any Part.
**Authority:** `documentaion/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md` — unmodified (sha256 `c868e6ad73de2b61e49badbbab6727badd130d1d143f37417bd4fbf495ce0612`, committed as the repository's first commit `85e8eab`). The directory name `documentaion` is as supplied; new documents are in `documentation/`.

*Reports are evidence, not acceptance (plan §18.4). Every claim below names the command or file that supports it so the reviewer can re-verify it.*

---

## 1. What was delivered

| Deliverable | Where |
| --- | --- |
| Reuse audit (M0) | [`BOOK_II_REUSE_AUDIT.md`](BOOK_II_REUSE_AUDIT.md) |
| Design direction | [`BOOK_II_DESIGN_DIRECTION.md`](BOOK_II_DESIGN_DIRECTION.md) (incl. §10 *as built*) |
| Authoring pattern | [`CHAPTER_AUTHORING.md`](CHAPTER_AUTHORING.md), root `README.md` |
| Working application | an independent Astro 5 / MDX / Preact / KaTeX / TypeScript static site: original landing page, book map with all eight Parts and 94 chapters, chapter shell, **foundation demo** at `/foundation/` |
| Platform primitives | coordinate plane, world↔screen viewport, draggable point, inspector, exact/approximate display, parameter inputs, formula rendering, semantic trace stepper, equation-overflow handling |
| Validation | Vitest, an independent Python oracle with a JSON fixture, Playwright (3 viewports, axe, screenshots), a static dist crawler, root **and** sub-directory deployment |
| Evidence | this report; 12 review screenshots in `documentation/screenshots/`; 17 regression baselines in `tests/e2e/__screenshots__/` |

The foundation demo is labelled in the UI as *"Foundation demo"* (dashed caution chip, a "not Chapter I.3" callout, and a pager that offers I.3 only as *planned*). A unit test (`curriculum.test.ts`, "M2 scope guard") fails if I.3 is ever marked available before M3.

## 2. Evidence: how to reproduce

```sh
npm ci && npm run oracle:setup
npm run validate          # ≈ 3 min
```

Final run of that command on this checkout: **exit 0**.

| Check | Result |
| --- | --- |
| `astro check` (TypeScript over `.ts/.tsx/.astro` **and tests**) | 73 files · 0 errors · 0 warnings · 0 hints |
| Vitest | 11 files · **413 tests passed** |
| Python oracle (`unittest`) | **16 tests OK**; fixture freshness check OK (also OK on a system Python without NumPy → the committed JSON is NumPy-independent) |
| Production builds | `dist/` (root) and `dist-subpath/` (`/math-foundations/`) both build |
| `scripts/check-dist.mjs` | root: 4 pages / 91 files OK · sub-path: 4 pages / 91 files OK |
| Playwright, root build | **270 passed**, 18 skipped by design (viewport-conditional tests), 0 failed |
| Playwright, sub-path build | **253 passed**, 5 skipped by design (visual specs are root-only), 0 failed |

The 96 distinct browser cases run at **1440 × 900, 820 × 1180 and 390 × 844** (mobile: touch, DPR 2). Breakdown by spec file (distinct cases, from `playwright test --list`): stage interaction & geometry **33**, accessibility **24** (axe in light/dark × every page and state, plus keyboard, targets, motion, colour, maths), navigation **14**, smoke **8**, deployment **7**, visual **10** (producing 17 baselines, because some run only at one viewport).

### Relocation was verified, not assumed
Copied the tree (without `.venv`, build output, `.git`) to an unrelated absolute path, then: `vitest` 411 ✓ (the two build-failure-plugin tests were added afterwards), fresh `.venv` + oracle 16 ✓, both builds ✓, crawler ✓, 62 browser tests incl. screenshot baselines ✓.

### Files changed (milestone commit `9e9498d`: 129 files, +22,641 lines; `git show --stat 9e9498d` for the list)

| Area | Files |
| --- | --- |
| `src/shell/` (shell components, emblems, `href`) | 17 |
| `src/ui/` (plane, drag point, inspector, controls, formula, trace stepper) | 11 |
| `src/platform/` (viewport, numeric formatting, exact/approx, params, trace, overflow, tex) | 7 |
| `src/math/` (vector model, exactness, KaTeX macros, math-error build plugin) | 4 |
| `src/lessons/`, `src/curriculum/`, `src/pages/`, `src/styles/`, `src/scripts/`, `src/content/` + `content.config.ts` | 2 · 2 · 5 · 6 · 1 · 2 |
| `tests/unit/` (11 files) · `tests/e2e/` (6 specs + helpers + 17 baselines) | 11 · 24 |
| `oracle/` · `fixtures/` · `code/python/` | 3 · 1 · 2 |
| `scripts/` (strict static server, dist crawler, oracle runner/setup, review capture) | 5 |
| `documentation/` (audit, design, authoring, this report) + 12 review screenshots | 4 + 12 |
| repository root (configs, `package.json`/lock, `README.md`, `.gitignore`) · `public/` | 9 · 1 |

The master plan (first commit `85e8eab`) is unchanged.

## 3. Architecture

Governing rule: **`Mathematical state → derived quantities → {geometry, inspector, formulas, spoken text, work frames}`** — no view recomputes a quantity.

| Layer (plan §6.1) | Files | Notes |
| --- | --- | --- |
| C — domain mathematics | `src/math/vector2/{vector2,exact}.ts`, `src/math/katex-macros.mjs` | Pure. 151 lines |
| B — generic infrastructure | `src/platform/{geometry/viewport,numeric/format,numeric/quantity,params,trace,overflow,tex}.ts`; `src/ui/` (11 files) | Knows no domain. 1,137 lines |
| D — chapter composition | `src/lessons/foundation/{vector-lesson.ts,VectorStage.tsx}`, `src/content/chapters/foundation-demo.mdx` | Lesson-owned views of the one derived object |
| A — shell | `src/shell/` (17), `src/pages/`, `src/scripts/shell.ts`, `src/styles/` | Part ruler, book map, chapter layout, theme |
| Curriculum as data | `src/curriculum/{curriculum,queries}.ts` | 8 Parts, 94 chapters; drift-tested against the plan |

Source is ≈ 3.3 k lines (+ ≈ 2.1 k lines of tests) against Book I's 13.6 k lines of `src`.

### Direct reuse vs redesign (summary; full tables in the audit)
* **Reused conceptually:** semantic immutable trace and "select, don't undo"; one-model-feeds-views; executable-oracle parity; layered validation; base-path discipline and a deployment crawl; native `<dialog>`; graceful degradation; inspector as a first-class surface.
* **Reused directly:** *configuration shapes only*, adapted by hand — `tsconfig`, Vitest config, Playwright project matrix and axe pattern, `.gitignore`. **No Book I source file was copied, imported or linked.**
* **Redesigned:** shell, landing (Book I has none), navigation data model (Book I hard-codes part ranges), routing (67 hand-written wrappers → data + one route), search scope, controls, visual language, snapshot policy (Book I: 1,800 PNGs / 256 MB; here 17 PNGs / 1.5 MB), and the rendering strategy for interactives.
* **Excluded:** every DSA model/primitive/script/style, the C++ pipeline, the PWA.

### The single deviation from Book I's stack, and its evidence
Preact islands instead of string-`innerHTML` rendering. Book I's `DiagramView.render()` / `InspectionDiagram.render()` replace the diagram DOM on every update and re-focus by selector; that cannot support a **dragged** element (pointer capture, hover and focus live on one node). Preact is the only runtime framework added; every component renders on the server. KaTeX (88 kB gz) ships only in the stage's island chunk; the contents page loads about 3 kB of script (2.35 kB shell + 0.76 kB overflow helper).

### Exact vs approximate (plan §3.8–3.9, §10)
`platform/numeric/quantity.ts` (generic) decides *presentation*; `math/vector2/exact.ts` (domain) decides *whether an exact form exists*. One family only: integer vectors → `n` or `a√b` (b square-free), BigInt arithmetic, attempted while `x²+y² ≤ 10¹²`. Anything else is "numeric only" (`≈`). `…` after an approximation appears only when the exact value is known irrational. Negative zero never reaches the screen; a non-zero value is never displayed as `0` (it switches to scientific notation). Non-finite results are reported as such.

### Numerical policies, each with a test
* Zero vector is decided **from the components** (`x === 0 && y === 0`), never from `magnitude === 0`: `(1e-200, 1e-200)` has `x²` underflowing to 0 but a correct magnitude and direction.
* `Math.hypot` for the magnitude; `x²`, `y²`, `x²+y²` kept as separate derived values (the textbook intermediate **can** overflow/underflow where the magnitude does not).
* `−0` is canonicalised, so the direction of `(−1, ±0)` is `+π`.
* Direction of the zero vector is `null` → *undefined*, with the reason shown and spoken.
* Test tolerances are documented numbers (in ulps, with rationale and the **observed** maxima: magnitude 2, x²+y² 1, angle 1, degrees 3), not hidden epsilons.

### An oracle finding worth teaching
While generating fixtures the independent oracle showed that `np.linalg.norm([1e-200, 1e-200])` returns **0.0** (it squares before summing) whereas `np.hypot` is correct. The browser uses `Math.hypot`. The demo page carries this as a "Numerical consideration" callout; `oracle/test_vector2_oracle.py::NumpyCaveat` pins it.

## 4. Independent validation

| Layer (plan §12) | Evidence |
| --- | --- |
| 1 Content/schema | `content.test.ts`: frontmatter, `kind: chapter` ⇄ `available` bijection, every MDX formula rendered in **strict** KaTeX, referenced files exist; **`curriculum.test.ts` re-parses the master plan** (7·19·14·16·10·10·8·10 = 94 chapters; titles, Part purposes, exit conditions, REFERENCE/FLAGSHIP markers); **a malformed formula fails the build** (custom plugin, mutation-verified — see defect 10) |
| 2–3 Model + oracle | `vector2.test.ts` (hand-worked values, quadrants, axes, branch cut, extremes, exactness); `vector2.parity.test.ts` runs **285 fixture cases** written by `oracle/vector2_oracle.py` using a *different* algorithm (80-digit correctly-rounded `decimal` sqrt; prime-factorisation for the square-free part; NumPy cross-check). The oracle's own tests use **literals from the plan** (`3.605551275463989`, `0.5880026035475675`), never self-computed values |
| 4 Properties | 3,000 seeded vectors: `‖v‖ ≥ 0`, `‖v‖² ≈ x²+y²`, `‖αv‖ ≈ |α|‖v‖`, direction preserved/reversed under scaling, rotation invariance; exact-form invariants over every integer pair in [−15,15]² |
| 5 Formula/visual sync | unit: the world-space scene *is* the model; e2e `expectInSync` (handle pixel vs an independent formula; inspector rows; formula `data-tex`) and **`drawn geometry equals the model`** (legs, arrow tail/tip, dimension lines, and the angle-arc end angle = `atan2` of the arc's own pixels, for 7 states incl. all quadrants, axis, and the zero vector) |
| 6 Interaction | pointer drag, grab off-centre, snap/clamp, quadrant crossing, drag through the undefined origin, keyboard (arrows, Shift, clamp, announce, focus kept), numeric entry (typographic minus, invalid input rejected with a message, Escape, stale error cleared), reset, trace stepper (immutable frames; going back restores exactly), CDP **touch drag** |
| 7 Responsive | the whole suite at 3 viewports; no page overflow; long values in free mode at **every** trace frame (regression, mutation-checked); the plane is inside the first viewport |
| 8 Accessibility | axe (WCAG 2.0–2.2 A/AA + best-practice) on every page and unusual stage state in **light and dark**; Tab order; dialog focus handling; visible focus; 44 px targets; non-colour cues; MathML twins for every formula; plane text alternative; live region speaks commits, not frames |
| 9 Screenshots | 17 curated baselines; identical across repeated runs |
| 10 Deployment | root **and** sub-path: crawl of every internal URL, no 4xx (fonts, `_astro`), no foreign origin, base-path discipline, deep links, 404 recovery; a self-check proves the sub-path run is really at `/math-foundations/` (a root-relative URL 404s there) |

**Mutation checks performed** (a test that cannot fail proves nothing): the layout regression test was run against the old CSS and failed with the exact symptom; the first version of it *passed* against the bug (it only looked at the last trace frame), which is why it now checks every frame. `check-dist` was run against a deliberately broken copy and reported the base-path, dead-link and external-URL bugs.

### Defects found *by this validation* (all fixed; each has a test)
1. Stage grid `auto` track widened by a long equation → **Reset button pushed off-screen on a phone** (visible only after a free-mode drag and one trace step).
2. SVG border rescaled the drawing by ~0.5% → legs ≈ 1.4 px off the model (and pointer mapping off by ≤ 1 px).
3. `touch-action: none` ignored on an SVG `<g>`: a real touch drag was cancelled after one step.
4. Contents button had **no accessible name** on phones.
5. Chrome turned sub-pixel equation overflow into an unlabelled tab stop; duplicate scroll-region names; a non-focusable scrolling dialog body.
6. Scientific-notation components squared produced invalid LaTeX (`10^{-7}^{2}`), caught by a 3,000-state strict-KaTeX sweep.
7. Plane started **below the fold** at 1440 × 900 (design fix: compact two-column header).
8. A degree-sign "attached unit" patch silently did not apply, and its unit-test expectation *also* did not, so both agreed with the old behaviour; the e2e inspector check exposed it. (Lesson recorded: assert the *intended* literal, and prefer an end-to-end check on user-visible text.)
9. Type-checking the tests exposed duplicate `playwright-core` versions (fixed with an npm `overrides`).
10. **A malformed formula did not fail the build.** My own claim ("a bad formula fails the build") was wrong: `rehype-katex` ignores `throwOnError` for control flow, records a vfile *warning* and ships KaTeX's red error span; `astro build` exited 0. The pipeline would still have caught it (unit sweep, crawler, e2e) but the build itself did not. Fixed with `src/math/rehype-fail-on-math-error.mjs` (a rehype plugin that throws on those messages, naming file, line and KaTeX reason); mutation-verified (build exits 1 on a deliberately broken formula) and unit-tested.

## 5. Screenshots

Full-resolution inspection was used to design and correct the UI (§10 of the design doc lists what it changed). Review captures (`node scripts/capture-review.mjs`, 1× DPR) in [`screenshots/`](screenshots/):

| | Desktop 1440 | Tablet 820 | Mobile 390 |
| --- | --- | --- | --- |
| Landing | [light](screenshots/landing-desktop.png) · [dark](screenshots/landing-desktop-dark.png) | — | [light](screenshots/landing-mobile.png) |
| Foundation demo (full page) | [light](screenshots/foundation-desktop.png) | [light](screenshots/foundation-tablet.png) | [light](screenshots/foundation-mobile.png) |
| Stage only | [light](screenshots/stage-desktop.png) | — | [light](screenshots/stage-mobile.png) |
| Contents page | [light](screenshots/contents-desktop.png) | — | [light](screenshots/contents-mobile.png) |
| Book-map dialog | [open](screenshots/map-desktop.png) | — | [open](screenshots/map-mobile.png) |

Regression baselines (what the tests compare against): `tests/e2e/__screenshots__/visual.spec.ts/` — home fold (3 sizes + dark), stage canonical (3), stage edited v = (−4, 3) (desktop + mobile), zero vector, third-quadrant plane, dark stage, contents, map (desktop + mobile), long-equation overflow (mobile). *A pixel match against a first baseline is not evidence of correctness; the baselines were reviewed by eye and the mathematics is checked elsewhere.*

## 6. Book I integrity

Book I was **not modified**. At audit time its `.git/` was an empty directory (no history to consult), so I fingerprinted every file outside `node_modules/` **before reading anything** (5,787 files: relative path, size, mtime; SHA-256 `0a20ed18bc6c955aa349e7dc…`) and repeated it at the end: **identical** (same 5,787 files, same hash; nothing newer than the baseline). Book I was only read; its `npm`, `astro` and `playwright` were never run (they would write `dist/`, `.astro/`, `test-results/`). During the milestone the user moved Book I into `/work/interactive-books/…` and created a repository there; a rename preserves mtimes, so the check remains valid, and the (empty) `.git/` directory's disappearance is part of that reorganisation, not something a file-level fingerprint covers.

## 7. Known limitations (honest list)

* **Chromium only.** All browser evidence is Chrome 154 (desktop viewport emulation and CDP touch). WebKit/Gecko, real devices and real screen readers (NVDA, VoiceOver, TalkBack) were **not** tested; axe and keyboard walk-throughs are not a substitute. The CSS assumes evergreen 2024+ browsers (`light-dark()`, container queries, `<dialog>`, `text-wrap`).
* Screenshot baselines are Linux/Chrome-specific.
* **Trace:** frame type and a pure cursor with Previous/Next/Reset/scrubber only. **No Play / Pause / Speed** (plan §2.4 lists them); deferred to the first chapter that needs autoplay (I.6, II.1). Named `TraceStepper` (not "TracePlayer") so it does not claim the full contract.
* **Exactness** is integer vectors only, `x²+y² ≤ 10¹²`; angles are numeric.
* **Search:** the map filters *structure* (titles, Parts). No full-text search, no progress persistence, no Fit / Actual-size control, no PWA/offline.
* **Free-mode drags round to 6 decimals** (`snapToGrid`) purely to remove representation noise; this is an interaction policy, stated in code and tests.
* The foundation page overlaps REF-1 in subject (a vector endpoint) by necessity; it is labelled and kept minimal. `vector2.ts` is foundation-level and **REF-1 will own and extend it**.
* The landing-page hero is the same stage in its `hero` variant.
* All font subsets are emitted into `dist/` (2.9 MB total) though only Latin loads; KaTeX CSS references three formats per font.
* `404.html` on a sub-path is served by the hosting rules, not by this project (GitHub Pages only serves a root `404.html`).
* **The "available" and "current" states are implemented but have never rendered.** Only *planned* content exists, so no test exercises: the link branch of the book map and of the chapter pager, the `src/pages/chapters/[slug].astro` route (it generates zero pages today), `aria-current` on the Part ruler, or the chapter label derived from the curriculum (the demo belongs to no Part). A fixture chapter was deliberately **not** invented to cover them; they will be exercised for the first time when I.3 is published (see §8, item 1).
* **Drag latency was not measured.** In free mode each pointer frame re-renders three or four formula strings (KaTeX output is cached by string, and free drags produce mostly new strings). Plan §20 expects "within one animation frame on typical hardware"; that is unverified, and a low-end phone is the case to measure.
* No CI configuration is included (the repository has no remote).
* The `documentaion/` directory-name typo is preserved on purpose.

## 8. REF-1 (M3) — what is proven and what remains

| Plan requirement | Status after M2 |
| --- | --- |
| §15.3 hero interaction `v = (3,2)` with all live values | ✔ implemented in the *demo* stage and tested; M3 must re-host it in the chapter |
| §15.4 edge cases (0,0), axes, quadrants, −0, tiny, large | ✔ model, oracle fixtures and browser tests |
| §15.5 exactness policy (`√13`, `5`, `√2`) | ✔ |
| §15.6 `atan2`, no fabricated zero-vector direction, SVG conversion isolated | ✔ (`viewport.ts` is the only y-flip) |
| §15.7 Python mechanics + NumPy examples, with the "why this order" explanation | ✔ code + execution; **prose is M3** |
| §15.8 oracle tests (components, norm, angle, zero policy, `‖v‖²`, `‖αv‖`) | ✔ model-level; M3 re-targets browser parity if desired |
| §15.9 Playwright list (initial, drag, keyboard, numeric entry, reset, zero, quadrants, mobile) | ✔ for the demo stage; **M3 must repeat them on the real chapter page** |
| §15.10 synchronisation | ✔ incl. DOM geometry; M3 extends to chapter-specific views |
| §15.11 accessibility list | ✔ (name, value, numeric alternative, target size, non-colour cues, reduced motion) |
| §15.12 "interaction architecture clean enough to reuse" | **for the reviewer to judge**; `CHAPTER_AUTHORING.md` documents the pattern |

**Remaining REF-1 prerequisites (none are platform blockers; all are chapter work or decisions):**
1. Author the chapter (`kind: chapter`, `curriculumId: I.3`) following the 14-layer contract; flip I.3 to `available` (and update the M2 scope-guard test, which exists to be deleted at that moment). **First verification after the flip:** the map link, the pager link, the `/chapters/<slug>/` route and `aria-current` on the Part ruler, none of which has rendered yet (§7).
2. Decide the fate of `/foundation/` and the landing hero: keep as the platform showcase, or fold into I.3.
3. Exercises pattern (predict-before-run, manipulate-and-explain) — not built; needs one real example.
4. Common-mistakes / counterexample interactions (e.g. `atan` vs `atan2`) — the "quadrant-aware" teaching moment has no widget yet.
5. Code ↔ visualisation synchronisation (Book I's `@trace`-region idea) is deferred; M2 only guarantees *displayed code = executed file*.
6. Cross-browser and real-assistive-technology pass before freezing the regression floor (§15.12, M4).
7. Optional: a minimal `TracePlayer` (play/pause/speed) only if I.3 needs autoplay; it does not.

## 9. Questions for the reviewer
1. Are the platform primitives the right *size*? (Nothing generalised beyond what two views needed: `viewport`, `quantity`, `params`, `trace`, `Inspector`, `DragPoint`, `ParameterInput`.)
2. Is Preact (islands only) acceptable as the single framework deviation from Book I?
3. Should the foundation demo remain a permanent platform showcase after M3?
4. Is the "dimension line" annotation vocabulary the right convention for component guides in later chapters (it will recur for projections, residuals, rise/run)?

## 10. Git

Repository initialised in this directory (no remote). History: `85e8eab` the unmodified master plan → **`9e9498d1addaf26dd5cb23474e269bbfe36f3849`** the M0 + M2 milestone → a docs-only follow-up commit recording this hash and the corrections above. The final HEAD hash and working-tree status are in the hand-off message (a document cannot contain the hash of the commit that contains it).

**Importing into the shared `interactive-books` repository (history preserved).** Do **not** `mv` this directory into that repository and `git add` it: that records an *embedded repository* (a gitlink), not the files, and loses the history there. Run a subtree-style merge from the repository's *current* location (the relative path below assumes this directory has not been moved yet), review it, and only then retire the old directory:

```sh
cd /work/interactive-books
git remote add book2 ../Interactive-Mathematical-Foundations-Book && git fetch book2
git merge -s ours --no-commit --allow-unrelated-histories book2/main
git read-tree --prefix=Interactive-Mathematical-Foundations-Book/ -u book2/main
git commit -m "feat(book-ii): import Interactive Mathematical Foundations with history"
```

Afterwards, inside the imported book: `npm ci` and `rm -rf .venv && npm run oracle:setup` (a virtual environment is not relocatable). The shared `.gitignore` already whitelists this directory name and ignores `dist/`, `.astro/`, `.venv/`, `test-results/` and `playwright-report/`; this project's own `.gitignore` additionally ignores `dist-subpath/`.
