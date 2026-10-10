# WIN-0 — Native Windows Portability & M2 Freeze Corrections

**Baseline:** `3247b96` · **Host:** Windows 10 Pro 10.0.19045, Windows PowerShell 5.1, Node 22.14.0, Python 3.13.3, NumPy 2.5.3, Playwright 1.63.0 (bundled Chromium 1243), Intel i5-12600 · **Final commit:** `79cfadc` (`fix(book-ii): WIN-0 native Windows portability and M2 freeze corrections`, on `3247b96`). A file cannot contain its own hash, so this line was recorded by a docs-only commit that follows it.
**Scope:** portability and the M2 freeze corrections only. No REF-1, no curriculum / mathematical-convention / visual-identity change, no Book I change, no test weakened or deleted, no Linux baseline rewritten.

## 1. Result in one table

| Check (all run natively in PowerShell, no Git Bash) | Result |
| --- | --- |
| `npm run check` (astro check, 73 files) | **0 errors, 0 warnings, 0 hints** |
| `npm test` (Vitest) | **421 passed / 421** in 11 files (was 411; +10 new trace tests) |
| `npm run test:oracle` (independent Python oracle, `.venv` with NumPy 2.5.3) | **16 tests OK**; fixture fresh, NumPy cross-check on |
| `npm run build`, `npm run build:subpath` | both complete, 4 pages each |
| `npm run check:dist` (static crawler) | root: 4 pages, 91 files OK · sub-path `/math-foundations/`: 4 pages, 91 files OK |
| `npm run test:e2e` (root, 3 viewports, a11y/axe, keyboard, touch, screenshots) | **270 passed, 0 failed, 18 skipped** (288) |
| `npm run test:e2e:subpath` | **253 passed, 0 failed, 5 skipped** (258; the 30 visual tests are excluded by that config by design) |
| `npm run validate` end to end | **exit 0, 3 min 40 s** |
| Screenshot determinism (visual spec repeated, no update) | 34 / 34 passed (`--repeat-each=2`) |
| **Linux re-run** | **NOT RUN.** See §8. |

**The skips are not Windows-specific.** Every one is a viewport-conditional `test.skip(...)` already in the suite ("desktop only", "phone only", "ruler shown from 800 px", "margin outline from 1180 px", "covered by desktop and mobile").

## 2. Master-plan relocation

The user's pending Windows-side move (`documentaion/` → `documentation/`) was preserved, not recreated. Verified: the git blob of the committed `documentaion/INTERACTIVE_MATH_FOUNDATIONS_MASTER_PLAN.md` is `edd9b5f9…` and `git hash-object` of the relocated file is identical; sha256 `c868e6ad73de2b61e49badbbab6727badd130d1d143f37417bd4fbf495ce0612`, equal to the hash recorded since the first commit. `documentaion/` no longer exists.
Updated: `tests/unit/curriculum.test.ts` (the drift test now reads the new path), `README.md` (Book II) and the repository root `README.md`, `BOOK_II_REUSE_AUDIT.md`, `BOOK_II_DESIGN_DIRECTION.md`, and `M0_M2_IMPLEMENTATION_REPORT.md` (the old typo statements are marked superseded rather than silently rewritten). The only remaining occurrences of the misspelling are those explanatory notes.

## 3. Native Windows support

| Was (Unix-only) | Now |
| --- | --- |
| `build:subpath`: `BOOK_BASE=/math-foundations/ astro build …` | `node scripts/build-subpath.mjs` (sets the variable in the child process; honours an existing `BOOK_BASE`) |
| `oracle:setup`: `sh scripts/setup-oracle.sh` (`python3`, `.venv/bin/*`) | `node scripts/setup-oracle.mjs` (the `.sh` is removed). Finds Python via `py -3` / `python` / `python3` on Windows, `python3` / `python` elsewhere |
| `run-oracle.mjs`: `.venv/bin/python`, bare `python3` | uses `.venv\Scripts\python.exe` on Windows, `.venv/bin/python` elsewhere; shared helper `scripts/python-env.mjs`; runs Python with `-X utf8` |
| `oracle/vector2_oracle.py --write` used text-mode `write_text` (writes **CRLF** on Windows) | writes with `newline="\n"`. Verified: a Windows `--write` reproduces the committed fixture byte-for-byte (no diff) |
| Playwright config assumed `/opt/google/chrome/chrome` | unchanged on Linux; elsewhere (Windows) falls back to Playwright's bundled Chromium |

Linux behaviour is unchanged by construction (same executables, same paths, same environment variable). `package.json` also gains `measure:drag`.
A portability trap found along the way: under **Git Bash**, `node scripts/serve-dist.mjs dist / 4451` receives the mount `C:/Program Files/Git/` (MSYS rewrites a bare `/`). PowerShell, cmd and Playwright's `webServer` are unaffected; the README now says to use PowerShell/cmd on Windows.

## 4. Line endings

`Interactive-Mathematical-Foundations-Book/.gitattributes`, scoped to Book II only: `* text=auto eol=lf` plus explicit `binary` for images and fonts. The index was already all-LF (`git ls-files --eol`), so the policy only protects future checkouts (including `core.autocrlf=true`). Why it matters here: the curriculum test splits the master plan on `\n`, the plan's sha256 is a recorded invariant, and the oracle fixture is compared with Python's output. Book I and the repository root are untouched; nothing was renormalised; the commit contains no unrelated file.

## 5. Semantic trace correction

**Defect:** `traceFrom()` froze the frame container and the `frames` array only; `frame.state` / `frame.event` stayed shared and mutable, so a caller mutating its original object (or any consumer editing a stored state) would rewrite history.
**Fix** (`src/platform/trace.ts`): each frame is deep-copied and deep-frozen. Supported data: primitives, arrays, plain objects, to any depth, with shared references and cycles preserved. Data that `Object.freeze` cannot actually protect (Map, Set, Date, typed arrays, functions, symbols, class instances) is **rejected with a `TypeError`** instead of being left silently mutable. The only current consumer (`vector-lesson.ts` work frames) is plain data and is unaffected (all existing tests green).
**Tests added** (`tests/unit/trace.test.ts`, 8 new cases; the existing two are unchanged): mutating the original state *and* event objects after the call (nested objects, arrays, pushes) leaves stored frames unchanged; no aliasing at any depth; every nested object/array is frozen; mutation attempts on stored states throw (`TypeError`: assignment, `push`, index set, `delete`, adding a key) and leave the value intact; frames given the same input object get independent copies; shared references and cycles survive; unsupported types are rejected; `-0`, `NaN`, `Infinity`, `null`, `undefined`, non-ASCII strings survive exactly.
One of my first test drafts was wrong (it assumed `traceFrom` could separate frames the caller had already aliased before the call, which is impossible); it was replaced by the guarantee that actually holds, not removed to get green.

## 6. Browser baselines

**Strategy.** Baselines are per rendering platform. `playwright.config.ts` keeps the Linux path template exactly as it was (`__screenshots__/<spec>/<project>-<name>.png`, the 17 existing files, byte-untouched) and on `win32` selects `__screenshots__/win32/<spec>/…` instead. Same tolerance on both (`maxDiffPixelRatio` 0.004), nothing loosened, no cross-platform comparison. `BOOK_BASELINE_PLATFORM=linux` forces the Linux set. The Windows set (17 PNGs) was generated only after the measurements below, and has a README stating plainly: **GENERATED, NOT YET INDEPENDENTLY REVIEWED**. That sign-off is the reviewer's, not mine.

**Measured: Windows against the Linux references** (before generating anything): 10 of 17 comparisons pass at 0.4 %; 7 fail at 1–2 %:

| Project | Test | Pixels differing (ratio) |
| --- | --- | --- |
| desktop | zero vector | 3864 (0.01) |
| tablet | stage canonical | 3594 (0.01) |
| mobile | stage canonical | 2722 (0.01) |
| mobile | stage edited (−4, 3) | 2480 (0.01) |
| mobile | contents fold | 3862 (0.02) |
| mobile | book map dialog | 5475 (0.02) |
| mobile | equation overflow | 226 (0.01) |

Inspected diffs and actual/expected pairs: the differences are text-edge rasterisation and fallback-glyph metrics (`→`, `⚠`, `½` are outside the self-hosted fonts, so Windows and Linux use different system fallbacks; "Next →" is a pixel or two wider). Two items were not that:

1. **A test-harness artefact, fixed.** In the mobile stage captures the fixed, off-screen skip link (`top:-80px`) was painted inside the tall element clip on Windows. It is not focused (probed: `activeElement` is `BODY`, link at `top:-80`). `settle()` in `visual.spec.ts` already neutralises the sticky top bar for the same reason; it now also sets `.skip-link{visibility:hidden}`. The Linux reference I inspected (`mobile-stage-edited.png`) contains no skip link, and a hidden off-screen element cannot alter the others (the diff for that capture fell from 6719 px to 2480 px). The Linux run itself is unverified (§8).
2. **A real layout difference, NOT resolved — needs a Linux look.** In the Linux reference `desktop-stage-zero.png` the "⚠ zero vector: no direction" label sits ~120 px right of the origin and is **clipped at the plane's right edge** ("no directior"). The code (`VectorStage.tsx:104`) anchors it `middle` at the origin, 36 px above, and Windows renders exactly that (centred, fully visible). Either the accepted Linux reference records a Linux-only rendering defect or it is stale. I did not touch it, and I did not "fix" the code to either picture. Suggested next step: open the Linux page at the zero state in the reference Chrome and inspect `[data-part="zero-note"]`.

## 7. Drag latency (representative, Windows desktop)

`npm run measure:drag` (new `scripts/measure-drag-latency.mjs`): real `page.mouse` drag, ≈240 pointer moves tracing circles, each move a distinct pixel; metric = pointermove (capture) → end of the next animation frame. Chromium 1243, i5-12600, 1440×900. CPU throttling is a *rough stand-in* for slower phones, **not** a device measurement.

| Snap | CPU | Moves | p50 ms | p95 ms | max ms | Moves > 16.7 ms |
| --- | --- | --- | --- | --- | --- | --- |
| whole | 1× | 237 | 0.3 | 8.9 | 10.6 | 0 |
| whole | 4× | 237 | 1.1 | 42.1 | 52.1 | 48 |
| whole | 6× | 237 | 1.7 | 70.8 | 89.6 | 48 |
| free | 1× | 237 | 7.2 | 9.5 | 12.1 | 0 |
| free | 4× | 237 | 34.8 | 41.0 | 59.3 | 237 |
| free | 6× | 237 | 53.1 | 70.8 | 86.6 | 237 |

Reading: on typical desktop hardware free-mode drag is within one frame (p95 9.5 ms, no move over 16.7 ms), which meets plan §20 there. Under 4× throttling **every** free-drag move misses a 60 Hz frame (~35 ms ≈ 2 frames; ~53 ms at 6×). The cost is the per-pixel formula re-render predicted in the M2 report. This is a measured, unresolved limitation of free mode on slow devices; no optimisation was attempted (out of scope). Not measured: touch input, real phones, Linux, other browsers.

## 8. Unresolved limitations and honest gaps

* **Linux was not re-run.** No Node in the available WSL distro and none installed; downloading one needs approval I did not seek. Linux-relevant changes are small and mechanical (Playwright config path logic, the `settle()` skip-link rule, the `-X utf8`/`newline` Python edits, `.venv/bin/python` selection). The first was reasoned (Linux path template is textually unchanged for non-`win32`); the second was checked indirectly (the inspected Linux image contains no skip link; the Windows run against the Linux set no longer shows it). **A Linux `npm run validate` is the first thing the reviewer should run.**
* The Windows baselines are unreviewed (README in that directory).
* The §6.2 Linux zero-vector label observation is open.
* Free-mode drag latency under CPU throttling (§7).
* Only Chromium was exercised (the suite's only browser); no Firefox/WebKit, no real touch hardware (touch is Playwright emulation, as before).
* Python 3.13 / NumPy 2.5.3 on Windows were used for the oracle; the previous reference was the Linux environment.
* Interpreters other than the above (e.g. macOS) were not tried; macOS would use the Linux baseline set by default and has not been validated.

## 9. Source changes and commit

Modified: `README.md` (both), `package.json`, `playwright.config.ts`, `scripts/run-oracle.mjs`, `oracle/vector2_oracle.py`, `src/platform/trace.ts`, `tests/e2e/visual.spec.ts`, `tests/unit/curriculum.test.ts`, `tests/unit/trace.test.ts`, three documents (references only). Added: `.gitattributes`, `scripts/{python-env,setup-oracle,build-subpath,measure-drag-latency}.mjs`, `tests/e2e/__screenshots__/win32/` (17 PNGs + README), this report. Moved: the master plan (byte-identical). Removed: `scripts/setup-oracle.sh`. Not touched: Book I, `src/styles`, `src/math`, `src/curriculum`, all Linux baselines, fixtures, `package-lock.json`.

**Final commit:** recorded in the repository history as the commit whose subject begins `fix(book-ii): WIN-0` (its hash is not embedded here because a file cannot contain its own commit hash; `git log --oneline -3` shows it, and a following docs-only commit records it as in M0/M2).

**Stopping for independent review.** Reviewer checklist: (1) Linux `npm run validate`; (2) open the 17 `win32` images against their Linux counterparts and sign off the README line; (3) resolve §6.2; (4) decide whether free-mode latency needs work before REF-1.
