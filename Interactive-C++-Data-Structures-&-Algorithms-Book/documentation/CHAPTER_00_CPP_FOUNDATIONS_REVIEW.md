# Chapter 0 — C++ Foundations for DSA: implementation review

## 1. Section map

The live route is `/chapters/00-cpp-foundations/`; the home page opens the same chapter. Fourteen book sections contain 28 numbered mini-lessons. The sequence is reading C++; storage and lifetime; pointers and owning slots; classes and construction; RAII/allocation/copy/move; contracts; contiguous storage and views; operators/callables/templates; iterators/integers/floating point; recursion/atomics/standard containers; cost/invariants/validation; canonical source; exercises; and summary. Every substantial mini-lesson links to chapters where its syntax or mechanics actually appears.

## 2. Prerequisite-ledger coverage

The final [Chapter 0 closeout table](CPP_PREREQUISITE_LEDGER.md#chapter-0-closeout--prerequisite-to-lesson-mapping) maps the Chapters 1–66 inventory to lessons 0.1–0.28. Required canonical mechanics are taught directly in 0.1–0.22. Later-chapter-specific mechanisms are introduced to reading depth in 0.23–0.25, with forward links. Validation-only concepts are distinguished in 0.28. No prior chapter was renumbered or broadly edited to add reverse links.

## 3. Interactive labs

Ten focused controls cover pointer/null/reference state, owning pointer slots, object lifetime, array/vector capacity and reallocation, copy/move ownership, alignment and placement lifetime, guard versus assert, iterator invalidation, index arithmetic, and optional absence. Each lab has a text state, keyboard-operable buttons, a visual diagram, a reset, and a highlighted line from the canonical C++ header. Invalid dereferences, stale iterators and broken invariants are represented as guarded states; the browser executes no undefined C++.

## 4. Canonical C++ structure

`cpp/chapter-00/CppFoundations.hpp` contains complete C++20 functions and types with source regions for the interactive examples. `cpp/chapter-00/main.cpp` exercises ownership, allocation, deep copy/move, vector growth, alignment, templates, equality, guarded mutation, optional results, integer arithmetic, finite input and an atomic/thread preview. The chapter displays this header through the existing canonical-source component. Both files are available from `/source/chapter-00/`; download output removes authoring trace tags. The shown compile command includes `-pthread` for `std::jthread`.

## 5. Architecture reuse

Chapter 0 uses the existing MDX `Section`, `ChapterHero`, `ChapterPagination`, `SourceCode`, `CanonicalSource`, book layout, theme, progress, global search and source extraction. Its `FoundationsLab` and pure state model are chapter-owned because language mechanics are separate experiments rather than one data-structure operation trace. CSS uses the existing navy, neutral, blue, green, amber and red tokens. No package or runtime dependency was added.

## 6. Intentionally deferred topics

Recursion depth and strategies remain in Chapter 45; atomic correctness and SPSC publication remain in Chapter 59; hash policies, rotations, graph algorithms and spatial indexing remain in their own chapters. Chapter 0 gives standard-container orientation without reproducing those implementations. Test-only integer address probes, injected allocation faults, semaphores and oracle/trace fixtures remain in 0.28 or their chapter validation notes. The chapter does not attempt a generic beginner C++ course, mathematical foundations or ML content.

## 7. Unit/native tests

The Chapter 0 unit file checks pointer/null behavior, owning slot replacement, legal lifetime phases, copy/move state, vector reallocation, alignment, optional presence, index math, guard/assert branches, source tags, 28 lesson IDs and real forward links. The complete unit run passed **6,272 tests in 52 files** after compiler subprocesses were allowed. `astro check` reports **0 errors, 0 warnings**. The isolated static build generated **68 pages** (home plus 67 chapter routes) and all Chapter 0 source downloads.

## 8. C++ sanitizer validation

The Chapter 0 native program compiled under C++20 with `-Wall -Wextra -Werror -pedantic -pthread` and ran with AddressSanitizer and UndefinedBehaviorSanitizer. The first LeakSanitizer attempt could not initialize under the sandbox's process tracing (`LeakSanitizer has encountered a fatal error; does not work under ptrace`). The same sanitized binary then completed successfully with `ASAN_OPTIONS=detect_leaks=1` outside that tracing restriction. A clean sanitizer run is not claimed as a concurrency proof.

## 9. Browser/accessibility validation

The focused Chapter 0 Playwright suite passed at 1440×1000, 1024×900 and 390×844. It exercised the home and chapter routes, all ten labs, a keyboard action, a mobile tap, source-line highlighting, global search, theme switching, progress persistence, Chapter 0 → 1 and Chapter 1 → 0 pagination, and both downloadable source files. Axe reported no main-content violations in light or dark mode. The suite also checked JavaScript errors and global horizontal overflow.

## 10. Responsive/visual review

The hero, chapter navigation and first reading section were visually inspected in both themes at all three widths: [1440 light](../artifacts/chapter-00/1440-light.png), [1440 dark](../artifacts/chapter-00/1440-dark.png), [1024 light](../artifacts/chapter-00/1024-light.png), [1024 dark](../artifacts/chapter-00/1024-dark.png), [390 light](../artifacts/chapter-00/390-light.png), [390 dark](../artifacts/chapter-00/390-dark.png). The pointer lab and [container table](../artifacts/chapter-00/390-container-table.png) were inspected at mobile width. The table scrolls horizontally with a visible swipe hint and a keyboard-focusable region. Focus styles and state text supplement color; the code region is keyboard scrollable. These diagrams do not use a large SVG canvas, so Fit/Actual Size controls are unnecessary.

## 11. Navigation/search/progress integration

The chapter registry starts with `00` and retains `01`–`66` in order. Part 0 is a real sidebar group. The default home route, adjacent pagination and search index include Chapter 0. Its 14 sections contribute to device-local reading progress; Chapter 1 now links backward to Chapter 0. The source route includes the Chapter 0 header and driver. The deployment validator accounts for Chapter 0's 14 sections while preserving the 13-section checks for Chapters 1–66. A separate `/book` base-path build passed checks for Home → Chapter 0, Chapter 0 ↔ Chapter 1, and both emitted Chapter 0 source files.

## 12. Known limitations

Illustrative addresses, vector growth factor and resource names in the diagrams are explicitly labeled as models; C++ does not prescribe their exact values. The pointer explorer does not dereference null, the iterator lab does not use a stale C++ handle, and the concurrency preview does not run an exhaustive scheduler search. LeakSanitizer required execution outside the sandbox's process tracing. The full existing browser regression result is recorded below.

## 13. Suggested selective reverse links for final editorial pass

Add a single “C++ prerequisite” link from Chapter 1 to lessons 0.2–0.8, Chapter 4 to 0.2/0.9/0.19, Chapter 16 to 0.12/0.20, Chapter 23 to 0.17/0.18/0.20, Chapter 53 to 0.9/0.19, Chapter 59 to 0.24, and Chapter 60 to 0.21/0.22 when the later whole-book editorial pass begins. No broad reverse-link sweep was made during this implementation.

## Whole-book browser regression

The final Playwright run against the isolated production build completed with **1,063 passed, 2 skipped, 0 failed** across the 1440×1000, 1024×900 and 390×844 projects. One existing mobile-only test was skipped in the desktop and tablet projects. The run included Chapter 0's route, ten labs, source synchronization, downloads, light/dark accessibility checks, navigation, search and progress; existing Chapters 1–66 regressions remained green. The first full run was interrupted by a Codex app restart after 298 completed checks; the complete result above is from the restarted, frozen-build run.
