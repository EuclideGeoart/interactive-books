# Book I Part-First UX Modernization — Review Report

Date: 2026-10-13, Europe/Berlin.

Book I now opens with ten learning Parts and subject-specific SVG thumbnails, leads into a complete contents map, and provides contextual chapter navigation with a restrained reading outline. The implementation is ready for independent review. One pre-existing Chapter 03 desktop lesson screenshot mismatch remains documented and unchanged.

## Worktree and commits

- Exclusive worktree: `/work/interactive-books-book-i-ux`.
- Book directory: `/work/interactive-books-book-i-ux/Interactive-C++-Data-Structures-&-Algorithms-Book`.
- Branch: `feature/book-i-ux-part-first-navigation`.
- Exact starting revision: `e19d1f1bacee6b731f2f9ccdcab3d1a8341612c2`.
- Implementation: `b95e6323bd2412420e5a75b9e465b7307f2218a4` — `feat(book): introduce Part-first navigation and reading shell`.
- Baselines and evidence: `77eb2e78d3afe7ca08f43db2ca3ea4977c9319d8` — `test(book): refresh chapter-shell baselines and preserve UX evidence`.
- Final HEAD is the documentation commit containing this report, with the evidence commit above as its parent. Its exact full SHA is supplied in the final delivery. A committed report cannot include its own commit hash; resolve the final report revision with `git log -1 --format=%H -- documentation/BOOK_I_PART_FIRST_UX_MODERNIZATION_REPORT.md`.

The final delivery verifies a clean branch. Application sources have no changes after the implementation commit; subsequent commits contain screenshots, evidence and this report. No push, deployment, merge, worktree removal, Book II edit or canonical source edit was performed.

## Homepage and contents

`/` is now a dedicated editorial homepage. It introduces visual models, C++ source, exact execution, memory, invariants, cost and exercises, then offers Start with C++ Foundations and Explore all chapters.

Ten responsive cards show each Part's numeral, name, chapter range, count and description. The user-requested thumbnail refinement uses lightweight, static SVG motifs for C++ syntax, linked nodes, a ring buffer, a tree, hash buckets, a graph, sorting bars, recursion, storage handles and spatial bounds. They use Book I's existing palette, monospace role and arrow primitives. They are decorative wayfinding images with `aria-hidden="true"`, and create no lesson state, inspection target or animation framework. Foundations has a restrained green emphasis; every other Part remains directly selectable.

`/contents/` lists all 67 published chapters in their original order, with ten navigable Part anchors, semantic headings and lists, and a homepage link. The existing global search remains available here; no second search engine or optional chapter filter was added.

All new links use Astro's configured base. The complete experience was tested at `/` and at the real production prefix `/books/cpp/`.

## Authoritative Part registry

`src/content/parts.ts` owns the published boundaries and associates existing chapter objects from the unchanged `src/content/book.ts` registry.

| Part | Name | Chapters | Count | Contents anchor |
|---|---|---|---:|---|
| 0 | C++ Foundations | 00 | 1 | `part-0` |
| I | Linear Structures | 01–05 | 5 | `part-i` |
| II | Queues & Ordered Access | 06–09 | 4 | `part-ii` |
| III | Trees | 10–17 | 8 | `part-iii` |
| IV | Hashing | 18–23 | 6 | `part-iv` |
| V | Graphs | 24–36 | 13 | `part-v` |
| VI | Searching & Sorting | 37–44 | 8 | `part-vi` |
| VII | Algorithmic Techniques | 45–50 | 6 | `part-vii` |
| VIII | Engine & Systems | 51–59 | 9 | `part-viii` |
| IX | Spatial Structures | 60–66 | 7 | `part-ix` |

The registry drives homepage cards, the contents map, the Part ruler, breadcrumbs, current-Part chapters and default hero Part labels. The older default labeling that incorrectly put Graphs and some later chapters in Part I was corrected in the shared hero components. Explicit chapter-authored hero labels remain supported; no MDX was edited.

Pure tests prove exactly one Part per chapter, numbers 00–66 without gaps or duplicate IDs/slugs, original reading order, distinct anchors, every canonical chapter page and every chapter's section/exercise IDs. They also reject chapter-range definitions in the navigation/header components.

## Chapter shell and script compatibility

`SiteLayout.astro` supplies the shared branding, homepage access, compact Part ruler, contents link, search, theme control, footer and PWA registration. `BookLayout.astro` supplies chapter breadcrumbs, the current-Part dialog, the existing outline and progress controls.

The full-book sidebar is replaced by a dialog containing only the current Part's chapters and a link to the full map. The selected chapter has `aria-current="page"`; the Part ruler and breadcrumb identify the current Part. The same dialog works with mouse, touch and keyboard at all tested widths. Escape closes it, focus returns to the opener, and Tab/Shift+Tab stay within the modal.

The chapter outline remains sticky on wide screens and becomes a native collapsible outline on mobile. Its anchors and observer highlighting are preserved, including highlighting in the dialog's section links. Reset progress is reachable on mobile as well as desktop.

The existing lesson widths are preserved: approximately 1102 px at 1440, 746 px at 1024 and 356 px at 390. The new shell does not change lab grids, playback controls, diagram layouts, source panes or execution models. `book.css` is unchanged; shell and landing styles are scoped in separate files. Each chapter retains exactly one existing `#top` anchor.

`src/scripts/book.ts` now guards optional Part navigation and initializes chapter progress only when a chapter number and sections exist. Landing and contents pages cannot divide by zero, dereference absent completion controls or create phantom chapter progress. Shared theme/search behavior continues everywhere.

Storage identities remain `cpp-book:theme` and `cpp-book:chapter-00` through `cpp-book:chapter-66`. Seeded existing completion, per-chapter separation, completion, reset, reload persistence and passage through homepage/contents were tested. Ctrl/Cmd+K, populated-query Escape handling, focus restoration and chapter/section search results work on all surfaces.

All adjacent links were checked across all 67 generated chapters. Chapter 00 remains `/chapters/00-cpp-foundations/`, links forward to 01, and 01 links back to 00. Cross-Part transitions remain intact. Chapter 66 links back to 65 and displays End of the book without a fabricated next chapter. Source download routes are unchanged.

## Protected content and engines

[Protected source hashes](book-i-ux-evidence/protected-sources.json) record and verify **402 unchanged files** against the exact starting revision:

| Protected area | Files unchanged |
|---|---:|
| Chapter MDX and all exercises | 67 |
| C++ headers, programs and validation sources | 142 |
| Engine | 4 |
| Visualizer models/adapters/presentation | 99 |
| Shared lab controls | 1 |
| Visualizer components | 70 |
| Other interactive scripts | 19 |

The original chapter registry, search content/index generator, section IDs, computation code, diagram styles and PWA manifest/registration script are also unchanged. Book II was inspected only as a read-only organizational reference; none of its components, styles or dependencies were imported.

## PWA and offline results

The worker cache version is `interactive-cpp-book-v2-part-first`. It now precaches three distinct pages: homepage, contents and canonical Chapter 00, plus their discovered build dependencies and the existing bounded core assets. It does not precache all 67 chapters.

The manifest already uses relative start, scope and icon URLs and required no change. Existing navigation/source network-first behavior, asset caching and the understandable offline fallback remain intact. Activation retires the old book cache; an actual browser check seeds the v1 homepage cache and verifies that the offline homepage subsequently contains the new ten cards.

Root and prefixed production checks passed for manifest/icon validity, browser installability diagnostics, worker scope, offline homepage and contents, cached Chapter 00, a visited Chapter 01, saved C++ source access and the unvisited-page fallback. Unit checks independently verify the worker's scope-relative precaching and v1 cleanup at both `/` and `/books/cpp/`, while preserving unrelated caches.

## Validation evidence

Final application source: `b95e6323bd2412420e5a75b9e465b7307f2218a4`. Both production outputs were generated from these exact application bytes before the commit; no application edits followed them.

| Check | Result | Evidence |
|---|---|---|
| Astro check | 0 errors, 0 warnings, 0 hints | [Log](book-i-ux-evidence/logs/book-i-ux-final-check.log) |
| Registry/PWA + existing foundations/engine/doubly/intrusive units | 133 passed in 6 files | [Log](book-i-ux-evidence/logs/book-i-ux-final-unit.log) |
| Root production build | Passed; 67 canonical chapter HTML routes, homepage and contents | [Log](book-i-ux-evidence/logs/book-i-ux-final-build.log) |
| Root focused browser acceptance | 112 passed, 2 existing desktop/tablet skips for the mobile-only playback check; no failures/flakiness | [Summary](book-i-ux-evidence/production-summary.json), [log](book-i-ux-evidence/logs/book-i-ux-production.log) |
| Actual `/books/cpp/` production build | Passed | [Log](book-i-ux-evidence/logs/book-i-ux-prefix-build.log) |
| Prefixed UX/PWA acceptance | 27 passed, no failures/skips/flakiness | [Summary](book-i-ux-evidence/prefix-summary.json), [log](book-i-ux-evidence/logs/book-i-ux-prefix.log) |
| Intentional chapter-entry captures | 198 recorded with the unchanged 0.005 screenshot threshold | [Summary](book-i-ux-evidence/shell-baselines-summary.json), [log](book-i-ux-evidence/logs/book-i-ux-shell-baselines.log) |
| Unchanged representative lesson snapshots and doubly-linked mutations/routing | 32 passed; 1 pre-existing Chapter 03 desktop mismatch | [Summary](book-i-ux-evidence/lesson-regression-summary.json), [log](book-i-ux-evidence/logs/book-i-ux-lesson-regression.log) |
| Relevant C++20 programs: 00, 01, 03, 05 | All passed warnings-as-errors, ASan, UBSan and leak checks | [Log](book-i-ux-evidence/logs/book-i-ux-cpp.log) |

Browser viewports were desktop 1440×1000, tablet 1024×900 and mobile 390×844, using the existing installed Chromium and touch emulation. New surfaces and representative chapters were checked in light and dark themes with Axe WCAG 2 A/AA and 2.1 AA tags. Checks cover all ten thumbnails and links, all 67 routes/titles/section counts/adjacent links/Part labels, current chapter/Part, keyboard dialogs, search shortcuts, progress/theme persistence, source downloads, overflow and runtime errors.

Existing browser checks also exercised C++ Foundations' pointer, lifetime, copy/move, alignment, contracts, iterator and container experiments; all singly-linked operations, destruction/free states, exact reverse, playback/speed/scrubbing, inspector keyboard behavior, invalid input, Break-It, complexity and exercise answers; and hashing inspection in both views. Doubly-linked half-rewiring, exact reverse, guarded walks and routing checks passed at all three widths.

### Changed files and test adaptation

Implementation files are `src/content/parts.ts`, `src/pages/index.astro`, new `src/pages/contents.astro`, new `src/layouts/SiteLayout.astro`, `src/layouts/BookLayout.astro`, `BookNav.astro`, `ChapterPagination.astro`, `ChapterHero.astro`, `Hero.astro`, new `PartThumbnail.astro`, `src/scripts/book.ts`, new `src/styles/shell.css`, new `src/styles/landing.css` and `public/sw.js`.

New tests are `tests/unit/parts.test.ts`, `tests/unit/pwa-shell.test.ts` and `tests/e2e/part-first.spec.ts`. Existing tests adapted to the intentional architecture are `book.spec.ts`, `foundations.spec.ts`, `pwa.spec.ts`, `part-ii-integration.spec.ts`, `hashing-integration.spec.ts` and `parts-iv-v-integration.spec.ts`. The old homepage-as-Chapter-00 assumption now targets the canonical Chapter 00 URL. Full-map assertions moved to contents; current chapter assertions open the contextual dialog.

`book.spec.ts` and `bundle-visual.spec.ts` now separate chapter-entry and operation-workspace captures so accepting a shell update cannot silently accept a lesson diff. No genuine behavioral test was deleted, broadly skipped, or weakened, and no screenshot threshold, accessibility rule or computation assertion changed.

## Visual review and baselines

All **38 saved captures were individually inspected** for hierarchy, wrapping, overlap, overflow, palette, thumbnails, current chapter/Part and dialog layout. [Review inventory and hashes](book-i-ux-evidence/reviewed-screenshots.json).

| Surface, both themes | Desktop | Tablet | Mobile |
|---|---|---|---|
| Homepage with all thumbnails | [Light](book-i-ux-evidence/screenshots/desktop/home-light.png) · [Dark](book-i-ux-evidence/screenshots/desktop/home-dark.png) | [Light](book-i-ux-evidence/screenshots/tablet/home-light.png) · [Dark](book-i-ux-evidence/screenshots/tablet/home-dark.png) | [Light](book-i-ux-evidence/screenshots/mobile/home-light.png) · [Dark](book-i-ux-evidence/screenshots/mobile/home-dark.png) |
| Complete contents map | [Light](book-i-ux-evidence/screenshots/desktop/contents-light.png) · [Dark](book-i-ux-evidence/screenshots/desktop/contents-dark.png) | [Light](book-i-ux-evidence/screenshots/tablet/contents-light.png) · [Dark](book-i-ux-evidence/screenshots/tablet/contents-dark.png) | [Light](book-i-ux-evidence/screenshots/mobile/contents-light.png) · [Dark](book-i-ux-evidence/screenshots/mobile/contents-dark.png) |
| Chapter 00 | [Light](book-i-ux-evidence/screenshots/desktop/foundations-light.png) · [Dark](book-i-ux-evidence/screenshots/desktop/foundations-dark.png) | [Light](book-i-ux-evidence/screenshots/tablet/foundations-light.png) · [Dark](book-i-ux-evidence/screenshots/tablet/foundations-dark.png) | [Light](book-i-ux-evidence/screenshots/mobile/foundations-light.png) · [Dark](book-i-ux-evidence/screenshots/mobile/foundations-dark.png) |
| Chapter 01, representative interactive chapter | [Light](book-i-ux-evidence/screenshots/desktop/interactive-light.png) · [Dark](book-i-ux-evidence/screenshots/desktop/interactive-dark.png) | [Light](book-i-ux-evidence/screenshots/tablet/interactive-light.png) · [Dark](book-i-ux-evidence/screenshots/tablet/interactive-dark.png) | [Light](book-i-ux-evidence/screenshots/mobile/interactive-light.png) · [Dark](book-i-ux-evidence/screenshots/mobile/interactive-dark.png) |
| Large Graphs Part in the map | [Light](book-i-ux-evidence/screenshots/desktop/graphs-map-light.png) · [Dark](book-i-ux-evidence/screenshots/desktop/graphs-map-dark.png) | [Light](book-i-ux-evidence/screenshots/tablet/graphs-map-light.png) · [Dark](book-i-ux-evidence/screenshots/tablet/graphs-map-dark.png) | [Light](book-i-ux-evidence/screenshots/mobile/graphs-map-light.png) · [Dark](book-i-ux-evidence/screenshots/mobile/graphs-map-dark.png) |
| Graphs chapter shell | [Light](book-i-ux-evidence/screenshots/desktop/graphs-chapter-light.png) · [Dark](book-i-ux-evidence/screenshots/desktop/graphs-chapter-dark.png) | [Light](book-i-ux-evidence/screenshots/tablet/graphs-chapter-light.png) · [Dark](book-i-ux-evidence/screenshots/tablet/graphs-chapter-dark.png) | [Light](book-i-ux-evidence/screenshots/mobile/graphs-chapter-light.png) · [Dark](book-i-ux-evidence/screenshots/mobile/graphs-chapter-dark.png) |

Mobile contextual navigation: [light](book-i-ux-evidence/screenshots/mobile/chapter-navigation-light.png), [dark](book-i-ux-evidence/screenshots/mobile/chapter-navigation-dark.png).

Exactly **198 existing overview baselines** were refreshed: the three Chapter 01 `chapter-overview` files plus Chapters 02–66's 65×3 overview files. Their header, navigation, Part metadata and outline are intentionally changed. Chapter 00 previously used review captures rather than these overview baselines. Every operation-workspace, diagram and other lesson baseline remains byte-identical to the starting revision. Every changed baseline is listed in the appendix and the [machine-readable inventory](book-i-ux-evidence/updated-baselines.txt).

### Pre-existing Chapter 03 exception

The desktop `03-doubly-linked-list-lab-desktop-linux.png` baseline differs from the current accepted scene/field presentation. A temporary control used `BookLayout.astro` and `book.ts` extracted from the exact starting revision, with the unchanged Chapter 03 MDX and model. The original shell failed the same desktop lesson baseline, while its tablet and mobile checks passed. [Control log](book-i-ux-evidence/logs/book-i-ux-baseline-control.log), [expected](book-i-ux-evidence/baseline-control/03-doubly-linked-list-lab-expected.png), [actual](book-i-ux-evidence/baseline-control/03-doubly-linked-list-lab-actual.png), [diff](book-i-ux-evidence/baseline-control/03-doubly-linked-list-lab-diff.png).

The temporary control files were removed. This milestone preserves that baseline instead of changing lesson rendering or accepting an unrelated scene update. Its normal production regression still reports the mismatch; it is not skipped. The reviewer can address it separately under the established bidirectional-node convention.

## Resource use and reproduction

Preflight verified the requested branch, exact HEAD, clean state, existing package links/local caches and installed browser. Node was v24.18.0 and npm 11.16.0. No dependency, browser or Python environment was installed.

Every direct build, type check, Playwright run and C++ check checked `df -h /`, enforced the 15 GiB minimum and acquired `/tmp/imf-heavy.lock`. No Book II T0 runner was used. Free space stayed above the limit: roughly 20 GiB as rounded by `df -h`, with 19.2 GiB available at final evidence collection. Below-limit work was never attempted.

Final relevant operation measurements from `/usr/bin/time -v`:

| Operation | Wall time | Peak measured RSS |
|---|---:|---:|
| Astro check | 9.25 s | 866.9 MiB |
| Root production build | 6.99 s | 788.3 MiB |
| Prefixed production build | 7.24 s | 770.5 MiB |
| Root focused acceptance | 91.74 s | 691.9 MiB |
| Prefixed acceptance | 42.36 s | 561.7 MiB |
| Shell-baseline capture | 63.66 s | 390.2 MiB |
| Relevant C++ checks | 2.17 s | 212.1 MiB |
| Unchanged lesson regression | 14.00 s | 321.8 MiB |

These are GNU time's recorded process measurements, not aggregate simultaneous browser memory. Each production output is about 59 MiB; committed review evidence is about 6 MiB. Earlier bounded development passes found and corrected dialog focus, mobile screenshot crop alignment, duplicate top-anchor handling and default Part labeling. Builds were repeated only for concrete fixes and the user-requested thumbnail refinement; the final root and prefixed outputs match the delivered application source.

From the book directory, check free disk and acquire the shared lock before heavyweight commands. Main reproduction commands are:

```sh
npm test -- --maxWorkers=2 tests/unit/parts.test.ts tests/unit/pwa-shell.test.ts tests/unit/foundations.test.ts tests/unit/engine.test.ts tests/unit/doubly.test.ts tests/unit/intrusive.test.ts
flock /tmp/imf-heavy.lock npm run check
flock /tmp/imf-heavy.lock npm run build
BOOK_TEST_PORT=4378 BOOK_TEST_DIST="$PWD/dist" flock /tmp/imf-heavy.lock npm run test:e2e -- tests/e2e/part-first.spec.ts tests/e2e/book.spec.ts tests/e2e/foundations.spec.ts tests/e2e/pwa.spec.ts tests/e2e/part-ii-integration.spec.ts tests/e2e/parts-iv-v-integration.spec.ts tests/e2e/hashing-integration.spec.ts --grep-invert 'visual regression' --workers=3
BOOK_BASE=/books/cpp/ flock /tmp/imf-heavy.lock npm run build -- --outDir /tmp/book-i-ux-prefixed-dist
BOOK_BASE=/books/cpp/ BOOK_TEST_BASE=/books/cpp/ BOOK_TEST_PORT=4380 BOOK_TEST_DIST=/tmp/book-i-ux-prefixed-dist flock /tmp/imf-heavy.lock npm run test:e2e -- tests/e2e/part-first.spec.ts tests/e2e/pwa.spec.ts --workers=3
BOOK_TEST_PORT=4378 BOOK_TEST_DIST="$PWD/dist" flock /tmp/imf-heavy.lock npm run test:e2e -- tests/e2e/book.spec.ts tests/e2e/bundle-visual.spec.ts --grep 'chapter entry visual regression|visual regression: chapter entry$' --workers=3
```

For the relevant C++ check, compile and run `cpp/chapter-00/main.cpp`, `chapter-01/main.cpp`, `chapter-03/main.cpp` and `chapter-05/main.cpp` to temporary binaries with `-std=c++20 -Wall -Wextra -Werror -pedantic -pthread -g -fsanitize=address,undefined -fno-omit-frame-pointer`, using `ASAN_OPTIONS=detect_leaks=1`. These exact flags and programs were exercised.

## Limits and manual follow-up

The navigation milestone does not rerun the entire heavyweight algorithm/native-parity corpus or every lesson snapshot. Those source areas and their test requirements are preserved; the bounded checks above cover the shell and representative interactions. Firefox, Safari, real iOS/Android installation and a human screen-reader session were not available in this installed-browser workflow. Manual independent review should include those platforms if they are release requirements, and the pre-existing Chapter 03 baseline exception.

Stop state: implementation and validation complete, feature branch retained for independent review. No publication or merge is authorized or performed.

## Appendix — every intentionally updated baseline

Paths are relative to the Book I directory. Only overview images appear here.

```text
tests/e2e/book.spec.ts-snapshots/chapter-overview-desktop-linux.png
tests/e2e/book.spec.ts-snapshots/chapter-overview-mobile-linux.png
tests/e2e/book.spec.ts-snapshots/chapter-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/02-stack-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/02-stack-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/02-stack-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/03-doubly-linked-list-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/03-doubly-linked-list-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/03-doubly-linked-list-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/04-memory-pool-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/04-memory-pool-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/04-memory-pool-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/05-intrusive-list-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/05-intrusive-list-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/05-intrusive-list-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/06-queue-deque-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/06-queue-deque-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/06-queue-deque-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/07-circular-buffer-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/07-circular-buffer-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/07-circular-buffer-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/08-priority-queue-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/08-priority-queue-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/08-priority-queue-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/09-binary-heap-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/09-binary-heap-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/09-binary-heap-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/10-binary-trees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/10-binary-trees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/10-binary-trees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/11-binary-search-trees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/11-binary-search-trees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/11-binary-search-trees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/12-tree-traversal-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/12-tree-traversal-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/12-tree-traversal-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/13-tree-mutation-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/13-tree-mutation-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/13-tree-mutation-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/14-avl-trees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/14-avl-trees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/14-avl-trees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/15-red-black-trees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/15-red-black-trees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/15-red-black-trees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/16-b-trees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/16-b-trees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/16-b-trees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/17-tries-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/17-tries-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/17-tries-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/18-hashing-fundamentals-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/18-hashing-fundamentals-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/18-hashing-fundamentals-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/19-hash-tables-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/19-hash-tables-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/19-hash-tables-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/20-separate-chaining-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/20-separate-chaining-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/20-separate-chaining-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/21-open-addressing-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/21-open-addressing-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/21-open-addressing-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/22-robin-hood-hashing-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/22-robin-hood-hashing-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/22-robin-hood-hashing-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/23-unordered-map-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/23-unordered-map-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/23-unordered-map-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/24-graph-fundamentals-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/24-graph-fundamentals-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/24-graph-fundamentals-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/25-adjacency-list-matrix-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/25-adjacency-list-matrix-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/25-adjacency-list-matrix-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/26-breadth-first-search-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/26-breadth-first-search-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/26-breadth-first-search-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/27-depth-first-search-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/27-depth-first-search-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/27-depth-first-search-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/28-directed-graphs-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/28-directed-graphs-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/28-directed-graphs-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/29-dags-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/29-dags-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/29-dags-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/30-topological-sort-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/30-topological-sort-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/30-topological-sort-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/31-connected-components-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/31-connected-components-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/31-connected-components-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/32-cycle-detection-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/32-cycle-detection-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/32-cycle-detection-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/33-dijkstra-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/33-dijkstra-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/33-dijkstra-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/34-bellman-ford-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/34-bellman-ford-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/34-bellman-ford-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/35-minimum-spanning-trees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/35-minimum-spanning-trees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/35-minimum-spanning-trees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/36-union-find-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/36-union-find-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/36-union-find-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/37-linear-search-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/37-linear-search-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/37-linear-search-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/38-binary-search-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/38-binary-search-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/38-binary-search-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/39-sorting-fundamentals-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/39-sorting-fundamentals-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/39-sorting-fundamentals-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/40-elementary-sorts-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/40-elementary-sorts-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/40-elementary-sorts-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/41-merge-sort-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/41-merge-sort-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/41-merge-sort-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/42-quick-sort-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/42-quick-sort-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/42-quick-sort-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/43-heap-sort-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/43-heap-sort-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/43-heap-sort-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/44-counting-radix-sort-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/44-counting-radix-sort-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/44-counting-radix-sort-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/45-recursion-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/45-recursion-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/45-recursion-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/46-backtracking-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/46-backtracking-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/46-backtracking-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/47-divide-and-conquer-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/47-divide-and-conquer-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/47-divide-and-conquer-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/48-greedy-algorithms-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/48-greedy-algorithms-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/48-greedy-algorithms-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/49-dynamic-programming-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/49-dynamic-programming-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/49-dynamic-programming-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/50-memoization-tabulation-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/50-memoization-tabulation-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/50-memoization-tabulation-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/51-free-lists-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/51-free-lists-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/51-free-lists-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/52-arena-allocators-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/52-arena-allocators-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/52-arena-allocators-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/53-object-pools-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/53-object-pools-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/53-object-pools-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/54-sparse-sets-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/54-sparse-sets-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/54-sparse-sets-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/55-generational-handles-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/55-generational-handles-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/55-generational-handles-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/56-ecs-storage-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/56-ecs-storage-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/56-ecs-storage-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/57-dirty-work-lists-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/57-dirty-work-lists-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/57-dirty-work-lists-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/58-command-buffers-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/58-command-buffers-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/58-command-buffers-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/59-lock-free-introduction-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/59-lock-free-introduction-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/59-lock-free-introduction-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/60-spatial-hashing-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/60-spatial-hashing-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/60-spatial-hashing-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/61-quadtrees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/61-quadtrees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/61-quadtrees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/62-octrees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/62-octrees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/62-octrees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/63-kd-trees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/63-kd-trees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/63-kd-trees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/64-r-trees-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/64-r-trees-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/64-r-trees-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/65-bounding-volume-hierarchies-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/65-bounding-volume-hierarchies-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/65-bounding-volume-hierarchies-overview-tablet-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/66-broad-phase-spatial-indexing-overview-desktop-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/66-broad-phase-spatial-indexing-overview-mobile-linux.png
tests/e2e/bundle-visual.spec.ts-snapshots/66-broad-phase-spatial-indexing-overview-tablet-linux.png
```
