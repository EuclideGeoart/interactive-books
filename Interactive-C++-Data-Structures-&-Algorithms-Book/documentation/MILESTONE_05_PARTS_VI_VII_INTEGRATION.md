# Milestone 05 — Parts VI/VII integration and Chapters 1–50 freeze

Date: 2026-10-04. Authority: the user's combined acceptance request and the
[master plan](INTERACTIVE_DSA_BOOK_MASTER_PLAN.md). This pass validates the current
shared root through Chapter 50, including the accepted Fit / Actual Size
refinement. It does not re-integrate or rewrite either Part.

**Status: accepted and frozen through Chapter 50.** All required checks pass.
The final complete browser run has **886 passes, two established skips, zero
failures and zero flaky results**. No production implementation or accepted
screenshot baseline was changed during this pass.

## 1. Canonical Chapters 1–50 state

| Part | Chapters | Canonical coverage |
| --- | --- | --- |
| I | 01–05 | Linear structures and memory |
| II | 06–09 | Queues and ordered access |
| III | 10–17 | Trees |
| IV | 18–23 | Hashing |
| V | 24–36 | Graphs |
| VI | 37–44 | Searching and sorting |
| VII | 45–50 | Algorithmic techniques |

The registry contains exactly 50 chapters in order, with seven implemented
navigation groups of 5/4/8/6/13/8/6 chapters. Each chapter has thirteen authored
sections: 650 searchable sections in total. There are 51 built pages including
the landing page. Chapter 44 and Chapter 45 connect in both directions; Chapter
50 has Chapter 49 as its sole adjacent chapter. Chapter 0, Part VIII and Part IX
remain planned and unimplemented.

All 282 application files under `src/`, all 106 files under `cpp/` and all 386
accepted screenshot baselines are preserved byte-for-byte from the current root
at the start of this pass. This acceptance changes no algorithm, layout,
canonical source, playback implementation or production registration.

Reconciliation is restricted to acceptance and documentation:

- The registry test now requires exactly Chapters 1–50, replacing the temporary
  allowance for an absent concurrent Part VI. An additional integration case
  checks the 44↔45 boundary, Chapter 50 endpoint, cross-Part search and independent
  persistent progress in Chapters 44, 45 and 50.
- The shared browser pause check uses Playwright's controlled clock. A one-step
  trace can otherwise finish between Play and Pause clicks, making the second
  click restart execution. The assertion now verifies an actual paused state,
  no advance while paused, one timed step at 4× speed, and reset. Production
  playback is unchanged.
- Part VII's visual checks also control the playback clock. Their accepted
  captures depend on whether one or two events ran before Pause, because source
  highlighting scrolls only when the executing line is outside the pane. The
  test now fixes that event count for each existing capture sequence instead of
  allowing machine load to choose it. No source scrolling or screenshot
  baseline is changed.
- Fit acceptance additionally compares SVG path routes and semantic text across
  size changes, activates Actual Size by keyboard, taps Fit on mobile and checks
  Fibonacci after its invocation tree collapses to the dependency view.
- The historical Part VI copy helper understands the stricter registry test and
  omits the Part-VII boundary and explicit Fibonacci cases only in its optional
  1–44 copy. Existing
  archived deliveries are untouched; the Chapters 1–50 freeze is authoritative
  for future work.
- The README and prerequisite ledger identify the combined scope and new floor.

Freeze artifacts are under [`validation/milestone-05`](validation/milestone-05/):
`checkpoint.tar.gz`, `checkpoint.sha256`, `frozen-source.json` and `integrity.json`.
The archive contains unchanged current-root source, configuration, canonical C++,
tests, accepted screenshot baselines, authoring documentation and this pass's
evidence. It performs no chapter filtering or checkpoint-only source edits.
Dependencies, generated builds, native binaries and historical delivery archives
are excluded and are not required to rebuild or test the checkpoint.
The archive was restored into a separate directory and every frozen source hash
verified. The adjacent `archive-verification.json` records that check and the
archive's SHA-256 checksum. `exit-codes.json` records the successful final
validation processes.

## 2. Combined test totals

| Check | Result | Evidence |
| --- | --- | --- |
| Strict Astro/TypeScript | 329 files; zero errors, warnings or hints | [check.log](validation/milestone-05/check.log) |
| All unit/native-parity tests | 5,887 passed in 43 files | [unit.log](validation/milestone-05/unit.log) |
| Focused acceptance-test verification | 15 passed across all three viewports | [focused.log](validation/milestone-05/focused.log) |
| Part VII deterministic-capture verification | 21 passed across all three viewports | [techniques-focused.log](validation/milestone-05/techniques-focused.log) |
| Complete current-root browser suite | 886 passed; two established skips; zero failures/flaky results; 12.6 minutes | [browser.log](validation/milestone-05/browser.log), [machine-readable results](validation/milestone-05/browser-result.json) |

The unit run includes Parts VI and VII together, retaining every accepted earlier
unit/native-parity suite. It combines independent outcome oracles with actual
canonical C++/TypeScript statement-state parity. Examples include exhaustive
small sorting domains, stable record identity, bounded subset enumeration,
greedy interval optimality, BFS minimum-coin oracles, memo/tabulation agreement,
call/return state, restored backtracking state and exact reverse snapshots.

No unit test, browser file or chapter is excluded from the combined pass. The
browser invocation uses no grep filter, retry setting or snapshot update.

## 3. C++ validation

All **50 canonical `main.cpp` programs** compiled and executed with C++20,
`-Wall -Wextra -Werror -pedantic`, `-fsanitize=address,undefined`, frame pointers
and `ASAN_OPTIONS=detect_leaks=1`. The integrated tree and hashing validation
programs also passed. No sanitizer diagnostic was emitted.
[Canonical C++ log](validation/milestone-05/cpp.log).

The prefixed deployment separately published **102 source files**, preserving
chapter directories and required relative includes. Every **downloaded example
01–50** compiled and ran with the same warnings, sanitizers and leak checks.
All 102 published files are byte-identical between the root and `/book/` builds;
their hashes are recorded in the
[build manifests](validation/milestone-05/build-manifests.json).
Teaching tags were absent from the published source; native fixtures were not
published. This checks the actual delivered files, including cross-chapter
header dependencies and Chapter 50's self-contained tabulation implementation.
[Downloaded C++ and deployment log](validation/milestone-05/deployment-prefix.log).

The recorded toolchain is Node.js 24.18.0, npm 11.16.0, g++ 16.0.1
(Ubuntu 16-20260315-1ubuntu1~24~ppa1, experimental build), and Google Chrome
154.0.8037.92. No dependency installation or library upgrade was needed.

## 4. Browser validation

The full suite runs from the **current shared-root test sources** against a
byte-for-byte copy of that root's production output. The copy prevents a
subsequent `/book/` build from changing files during the run; it has no omitted
chapters, rewritten registration, or alternate implementation.

The three projects are desktop **1440×1000**, tablet **1024×900**, and mobile
**390×844**. Coverage includes both themes, every chapter's operations, playback,
reverse/reset, scrub and speed controls, canonical source jumps/highlights,
logical/storage views, keyboard inspection, mobile controls, search, reading
progress, navigation, downloads, runtime errors and page containment. Existing
mutation-routing, ownership and invariant regressions remain enabled.

Desktop and tablet each pass 295 cases with one established skip; mobile passes
all 296 cases. The two established skips are the mobile-only sticky-playback test in desktop
and tablet projects. Its mobile instance remains required. Final counts and
process exit status are recorded in the machine-readable acceptance evidence.

The first combined run found two mobile source-pane scroll mismatches in the
Chapter 45 and 46 screenshots: **884 passed, two expected skips, two failures**.
Inspection confirmed identical diagrams, algorithm state and highlighted source
lines, with only the source viewport positioned differently after timed
playback. The controlled-clock correction above passed all 21 Part VII checks;
the complete suite was then rerun against the same production output and
unchanged reference images. The initial
[log](validation/milestone-05/browser-initial.log) and
[results](validation/milestone-05/browser-initial-result.json) are retained for
traceability.

## 5. Accessibility

Existing axe checks remain enabled across all Parts in light and dark themes.
Keyboard assertions cover selectable SVG nodes and edges, native diagram-size
buttons, row/field controls, inspector focus retention, canonical source panels,
navigation/search dialogs and mobile controls. Tables retain captions and
row/column headers; conceptual frame and table meanings are not conveyed solely
by color. The fit suite uses Enter to activate Actual Size, Space to activate
Fit on desktop/tablet, and genuine touch taps for Fit on mobile.

Passing these automated checks preserves the accepted accessibility floor. It
is not a claim of comprehensive assistive-technology certification or coverage
of every browser/operating-system combination.

## 6. Fit / Actual Size validation

Fit is the intentional default for heap/tree/graph panels, including heap sort,
recursive and divide-and-conquer views and Fibonacci's tree/dependency view.
The SVG viewBox fits within the panel width and bounded height, preserving the
complete picture. Actual Size restores the original detailed presentation and
contained scrolling where the native diagram exceeds the viewport.

The **84-case fit suite** covers Chapters 9–17, 24–36, 43, 45–47 and 49 in all
three layouts, plus a dense Fibonacci case at each size. It checks initial and
intermediate states in both representations, the full transformed viewBox,
absence of horizontal/vertical diagram scroll in Fit, focus retention and mode
persistence during playback. Size changes preserve semantic text, node markup
and SVG path routes. The dense Fibonacci case requires scrolling on both axes in
Actual Size, then verifies Fit again and the final collapsed dependency view.
Heap sort remains fitted after its active heap becomes empty.

The screenshot audit compares the current baselines against the accepted
pre-fit Part VI checkpoint: **91 of its 308 images differ**, exclusively in the
authorized heap/tree/graph/heap-sort scope; **217 remain identical**. Part VII
adds **78 images**, for **386 current baselines** in total. This acceptance does
not modify any of them or attempt to restore pre-fit images.
[Fit baseline audit](validation/milestone-05/fit-baseline-audit.json).

Dense fitted trees may have small labels. Actual Size and the full-size
inspector remain the intended detail paths. Independently scrollable tables,
call-stack lists and source code retain their established behavior.

## 7. Deployment checks

Both the root and `/book/` production builds succeed with **51 pages**.
[Root build](validation/milestone-05/build-root.log),
[prefixed build](validation/milestone-05/build-prefix.log).

The prefixed validator visits all 50 chapters at mobile width, verifies 650
sections, mounted labs, ordered adjacent navigation, all-chapter search,
base-prefixed internal links, source dependencies and clean downloads. It reports
**no global page overflow and no browser runtime errors**. All 102 source files
and 50 downloaded sanitizer programs pass in this deployment.
[Deployment evidence](validation/milestone-05/deployment-prefix.log).

Use the documented trailing slash in `BOOK_BASE=/book/`. No remote site was
published; this is static-build and local production-preview acceptance.

## 8. Launcher check

The real `open-book.sh` passes cold startup, `BOOK_PORT` override, readiness of
Chapters 1/23/36/44/50, the requested URL opening, and reuse of a running complete
book. An older server exposing earlier chapters is rejected. The check replaces
only `xdg-open` with a URL recorder, starts the actual Astro development server
and stops its own server process group. No launcher change was necessary in this
pass. [Launcher log](validation/milestone-05/launcher.log).

## 9. Prerequisite-ledger state

The [ledger](CPP_PREREQUISITE_LEDGER.md) now explicitly covers Chapters 1–50 and
identifies earlier scope notes as historical. Every actual Part I–VII row is
preserved. It distinguishes algorithm use, implementation details, observers,
snapshot overhead and validation-only mechanisms. Integration and diagram
fitting introduce no additional learner-facing C++ prerequisite.
The reconciliation explicitly records the existing `std::sort` /
`std::adjacent_find` denomination-validation pattern used by Chapters 48–50.

Part VI's identity records, half-open ranges, strict ordering, held storage,
merge/partition buffers, heap boundaries and stable counting/radix mechanics
remain separate from Part VII's retained recursive locals, mutable search
restoration, subproblem identity, optional unknown states and numeric unreachable
sentinels. **Chapter 0 remains deferred until after Part IX.**

## 10. Remaining limitations

Accepted domain bounds and teaching-model limitations remain unchanged. Native
addresses/ABI stack bytes are not fabricated, and browser traces do not compile
arbitrary user programs. Snapshot/history costs remain distinct from core
algorithm complexity. Tests cover the recorded Chrome environment, not every
browser. Dense fit views can require Actual Size for direct label reading. Two
non-mobile skips are intentional; no additional skip is introduced.

This workspace has no usable Git repository metadata. The canonical freeze is a
source archive with SHA-256 manifests and acceptance evidence, not a Git commit,
merge or tag. Historical Part III/IV delivery directories and Part VI/VII reviews
remain unchanged evidence of their own milestones.

## 11. Readiness for concurrent Part VIII + Part IX

Combined acceptance is green. This exact Chapters 1–50 checkpoint is the new
canonical regression floor for both future Parts. Preserve the existing
architecture ruling:

- Sorting record/range/buffer presentation stays Part-VI-owned.
- Recursion/frame/dependency presentation stays Part-VII-owned.
- Similar arrays or ranges do not justify merging semantic state models.
- Shared playback, inspection, source extraction, SVG primitives and diagram
  fitting already provide sufficient common infrastructure. No universal
  indexed-data model or recursion engine is introduced or required.

Concurrent implementation can use disjoint ownership: Part VIII Chapters 51–59
for engine/systems structures, and Part IX Chapters 60–66 for spatial structures.
One integrator should own shared registration, navigation, source publication,
validation and ledger reconciliation. Each worker should preserve this frozen
source/test/screenshot floor and avoid depending on the other Part's unfinished
APIs; reconcile demonstrated common needs after both implementations stabilize.

This is readiness guidance only. No Chapter 0, Part VIII or Part IX implementation
was started. This milestone stops at Chapter 50.

### Reproduce the frozen acceptance

```sh
sha256sum -c documentation/validation/milestone-05/checkpoint.sha256
mkdir -p /tmp/dsa-milestone05-review
tar -xzf documentation/validation/milestone-05/checkpoint.tar.gz -C /tmp/dsa-milestone05-review
cd /tmp/dsa-milestone05-review
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run check
npm test
npm run test:cpp
ASTRO_TELEMETRY_DISABLED=1 npm run build
BOOK_TEST_DIST=/tmp/dsa-milestone05-review/dist BOOK_TEST_PORT=4396 \
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/google/chrome/chrome npm run test:e2e
```

For prefixed deployment, build and serve in one terminal, then validate in another:

```sh
ASTRO_TELEMETRY_DISABLED=1 BOOK_BASE=/book/ \
  npm run build -- --outDir /tmp/dsa-milestone05-review-prefix
ASTRO_TELEMETRY_DISABLED=1 BOOK_BASE=/book/ \
  npm run preview -- --host 127.0.0.1 --port 4397 --outDir /tmp/dsa-milestone05-review-prefix
# Another terminal, from the restored checkout:
BOOK_DEPLOYMENT_URL=http://127.0.0.1:4397/book/ \
  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/google/chrome/chrome \
  node scripts/validate-book-deployment.mjs
ASTRO_TELEMETRY_DISABLED=1 node scripts/validate-book-launcher.mjs
```
