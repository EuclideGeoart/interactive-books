# Part II — Queues & ordered access

Date: 2026-10-04. Status: **implementation and validation complete; ready for milestone review**.

This report covers Chapters 6–9 only. Chapter 0 and Part III are outside this milestone. The master plan and accepted Milestone 2 remain the architecture authority. No deployment, commit, or pull request is claimed; this workspace has no usable Git metadata.

## Chapters implemented

| Chapter | Completed learning experience |
| --- | --- |
| 6 — Queue + Deque | FIFO and both-end policies; enqueue/dequeue and all deque endpoints; observers; empty/full/singleton/custom inputs; exact naive-array shifts; raw storage versus membership; interactive policy, complexity, memory and application comparison; four controlled faults. Complete `ArrayDeque` and restricted `Queue` facade. Linked queue/deque tradeoffs build on Chapter 3 without duplicating its engine. |
| 7 — Circular Buffer | Count-based fixed storage; logical queue versus physical slots; persistent slot selection; read/write/count inspection; explicit last-to-zero head and tail movement; full rejection versus oldest overwrite; sentinel/count encoding explorer; five controlled faults. Complete count-based `RingBuffer` and sentinel-slot `SentinelRing`. |
| 8 — Priority Queue | ADT before implementation; insert/peek/extract; higher/lower direction; FIFO ties; removal ranking versus actual arrival storage; native scan/erase source trace; unsorted/sorted/heap work comparison; three policy faults. Complete stable unsorted-vector implementation. |
| 9 — Binary Heap | Simultaneous tree and array; coupled selection and swaps; exact zero-based formulas; insert/sift-up, peek, root extraction, move-last/pop/sift-down, bottom-up build; max/min modes; live and pending heap invariants; three algorithm faults; logarithmic-height explorer. Complete owning vector implementation. |

All four retain the 13-section chapter rhythm, complete downloadable C++ source and runnable examples, engineering discussion, exercises, summary, progress, search and adjacent navigation. The story explicitly connects FIFO → exposed deque endpoints → circular indexing → priority-based removal → efficient heap repair. The highest implemented chapter is 9.

## Architecture review

The existing `Trace<S, E>`, `PlaybackController`, `LabAdapter`, `TraceLab`, `InspectionDiagram`, source-region parser, canonical-source component and chapter shell serve Part II. No operation rules or topology have been added to the shared memory reducer or playback engine. Each new chapter owns its storage state, trace construction, ordering rules, invariants and SVG geometry.

The shared changes are limited to registering four adapters and chapters, grouping Part II navigation, extending canonical downloads/native validation through Chapter 9, and presentation props. `ChapterHero` accepts a part label. `TraceLab` and `StructurePreview` accept view labels and a diagram note: the ring's logical/physical distinction and the priority queue's removal/arrival distinction provide concrete reasons for these labels. Existing defaults retain the earlier chapter presentation.

The heap uses one array as its authoritative data. Tree nodes and array cells derive values, edges and highlights from the same snapshot. Their DOM selection keys distinguish the two representations so keyboard focus stays on the selected representation while both highlight the same index. No independent tree state or synchronization service exists.

Queue shifts, ring read/write arithmetic, priority selection, heap comparisons/swaps and controlled corruption remain chapter-specific. Similar cell rectangles do not yet justify a universal array/tree rendering model. Existing SVG styles, escaping and arrow primitives are reused; no dependency, application store, framework, Canvas renderer or general event registry was added.

## Integration review findings

- Fixed draft priority/heap snapshot aliasing: each recorded state now owns its data independently of later mutations. Focused tests preserve append, pre-swap, swap, local-variable and counter boundaries, and native fixtures compare every tagged statement.
- Made heap tree/array DOM selection identities distinct without changing the shared selection helper or duplicating model state.
- Source-region contract tests verify that every emitted C++ tag appears exactly once in the regions presented for each operation, across modes and boundary presets.
- Canonical fixed-array containers retain live integers outside logical membership. Their inspectors distinguish raw storage from queue contents. Ring overwrite/rejection are explicit policies.
- Vector-backed complexity explanations distinguish repair work and amortized insertion from occasional linear allocation work. Priority ties are FIFO in Chapter 8; equal heap values are not promised stable task identity in Chapter 9.
- Removed button-only ARIA attributes from noninteractive queue/ring fault diagrams. Made generated comparison-table scroll regions keyboard focusable after mobile axe identified a scrollable priority table without keyboard access. The same local markup correction covers both other Part II comparison panels.
- Expanded the mobile ring preset selector to retain the full head/tail preset label; active heap swap endpoints retain amber fill alongside invariant and keyboard-focus markings.

## Validation record

- Astro/TypeScript: **zero errors, warnings or hints across 130 checked files**.
- Production: **10 pages** (entry plus Chapters 1–9), 9 canonical headers and 9 runnable examples. Both the ordinary `dist/` build and an isolated production build succeed.
- Subdirectory build: `BOOK_BASE=/book/` succeeds. All generated root-relative `href`/`src` references carry `/book/`; all nine chapter routes and source pairs exist. Parity drivers are excluded from published downloads.
- Vitest: **1,333 tests across 16 files pass**. The accepted 738-test baseline remains intact. New tests cover deterministic and reverse snapshots, source-region coverage, bounds, ordering, policies, fault diagnoses, counter accuracy and native statement parity.

| Test group | Passing cases |
| --- | ---: |
| Existing Chapters 1–5 semantic/native tests | 738 |
| Queue/ring semantics | 41 |
| Queue/ring native parity | 300 |
| Priority/heap semantics | 10 |
| Priority/heap native parity | 78 |
| Part II shared lab/source contracts | 166 |
| Total | 1,333 |

The new native fixtures instrument the actual shipped headers. Queue/ring checks cover raw storage, endpoint/count state, loop cursor, returned observer values and source-tag order. Priority/heap checks additionally cover branch outcomes, results, comparisons, swaps and in-scope local indices across nested helpers. They do not compare against a separately maintained native algorithm. Snapshot regression tests explicitly cover pre-append, pre-swap, post-swap, move-last duplication and exact reverse restoration.

All nine canonical examples pass **C++20, `-Wall -Wextra -Werror -pedantic`, ASan, UBSan, frame pointers and `ASAN_OPTIONS=detect_leaks=1`**. New native cases cover full/empty preservation, both singleton endpoints, duplicate/extreme integers, copy/move/assignment, stable priority ties, both comparison directions, 1,000 reuse cycles each for count and sentinel rings, and repeated heap build/extract through size 100. These integer containers rely on standard value ownership and have no new manual-allocation lifetime path.

Final integrated Playwright result: **196 passed, 2 skipped** across all three viewports. The two skips are unchanged Chapter 1 mobile-only cases on desktop/tablet. All existing and new screenshot assertions pass. Coverage includes every operation control, guarded invalid input, reverse/reset/play/pause/speed/seek, source jumps and helper regions, invariant state, slot selection, both heap representations, comparison/fault controls, both themes, independent progress, cross-book search, chapter navigation and downloads. No runtime errors or page-level horizontal overflow remain in the tested paths.

The preceding run isolated one mobile table keyboard-access defect. After correcting it, the full suite passed; a separate direct keyboard check also confirmed that focusing the priority comparison region and pressing ArrowRight scrolls its contents.

Browser validation uses the installed `/opt/google/chrome/chrome`. Compiler, browser and local-listener subprocesses require execution escalation in this environment. The missing default Playwright browser was not installed as an extra dependency.

## Accessibility and responsive review

The validation matrix is **1440×1000 desktop, 1024×900 tablet, and 390×844 touch/mobile**. Automated axe checks target WCAG 2 A/AA and 2.1 AA in light and dark themes. Keyboard interaction covers SVG nodes, representation changes, heap tree/array focus preservation, inspector expansion, source jumps, playback controls, native dialogs and comparison scroll regions. Text fallbacks, labeled controls, status symbols and explanatory invariant text supplement color. Existing reduced-motion styling is retained.

The new comparison tables can receive keyboard focus when horizontally scrollable. SVG and code overflow is confined to labeled panels. The mobile playback dock and exact executing-line echo stay available with the diagrams; the ring preset selector uses a full row so its head/tail explanation remains readable.

This preserves the existing automated and keyboard floor. It is not a full screen-reader audit; Firefox/WebKit and assistive-technology application testing remain outside the verified matrix.

## Visual consistency pass

The primary reviewed rendered entry pages, labs, both themes, mobile controls, ring wrap states, simultaneous heap swaps and comparison/fault panels. They use the accepted navy headers/code, neutral reading surfaces, green data, blue references, amber execution and red invariant cues. Heap activity remains visible on a violating node, and keyboard focus remains distinct there.

No global horizontal overflow was observed in the tested routes. SVG label-bound checks cover ring presets in both views and full queue storage. Existing Chapters 1–5 arrow-routing checks remain active. Wide arrays and trees deliberately scroll inside their panel instead of shrinking labels into illegibility. Source scrolling follows each executing tag, including nested heap helpers.

- **28 new regression images** for Chapters 6–9 live under `tests/e2e/bundle-visual.spec.ts-snapshots/`. This implementation did not rewrite earlier-chapter baselines.
- **66 review captures** live under `tests/visual/part-ii/`, reproduced by `scripts/capture-part-ii.mjs` against the running preview (`BOOK_TEST_PORT=4332` by default).
- Representative captures: [mobile ring wrap](../tests/visual/part-ii/ring-wrap-390.png), [desktop heap swap](../tests/visual/part-ii/heap-swap-1440.png), [mobile queue comparison](../tests/visual/part-ii/06-queue-deque-390-complexity.png), [tablet priority queue in dark mode](../tests/visual/part-ii/08-priority-queue-1024-dark.png).

## Concurrent workspace changes

The initial file manifest detected edits to Chapter 3's `diagram.ts`, MDX content and `linear-chapters.spec.ts` during this session, outside the Part II worker scopes. The corresponding tablet/mobile lab baselines were subsequently updated by that concurrent work. Those changes were preserved, not reverted or authored as part of Part II. The final regression includes their current workspace state.

An early browser attempt encountered shared trace-output interference and intermediate Chapter 3 screenshot differences. Final runs use isolated `/tmp/part-ii-site` production output and separate browser-artifact directories so another `dist/` build cannot replace the site under test. Existing Chapter 1–5 assertions, screenshot tolerances and semantic/C++ tests were not weakened by this implementation. The shared engine files are unchanged from the initial manifest.

## Concurrent Part III integration

Part II assumes only the accepted Chapters 1–5 baseline. The later integration pass should reconcile the chapter registry, navigation grouping, adapter registrations, source-download range and native-test chapter list with Part III. Optional presentation props are backward compatible. The shared engine has no new semantic dependency for Part III to adopt. No Chapter 10+ route or implementation is included here.

## Prerequisite ledger

`CPP_PREREQUISITE_LEDGER.md` now records actual Chapters 6–9 use: policy composition, fixed arrays and logical membership, modulo indexing, count/sentinel encoding, explicit overflow policy, vector/entry value semantics, strict priority comparisons, iterator difference types, guarded array/tree formulas, swaps and bottom-up construction. It explicitly avoids inventing a comparison-functor prerequisite for the runtime boolean comparisons used here. Chapter 0 remains deferred.

## Known limitations

- Teaching traces use integers and bounded visual inputs: five queue/ring slots, eight priority entries, and fifteen heap entries. Native vector implementations are not limited to the displayed bounds. Complexity explorers use arithmetic work models, not timing benchmarks.
- Chapter 6 deliberately traces a naive shifting array to motivate Chapter 7. Linked-storage alternatives are taught comparatively using existing Chapter 3 material. Sentinel-ring source is native-tested; the synchronized ring lab traces the count-based design.
- These are single-threaded examples. No lock-free behavior, hard real-time guarantee, allocator failure simulation, arbitrary payload/comparator API, stable heap task identity or decrease-key handles are claimed.
- The browser models canonical C++ execution rather than compiling user C++. Standard-library erase internals are one completed statement; heap swaps are one atomic semantic step across both drawings.
- Part III reconciliation and the later prerequisite-derived Chapter 0 remain outside this milestone.

## Recommended next step

The primary completed the cross-chapter architecture, Chapters 1–9 regression and visual consistency reviews. No high-severity known correctness, UI, lifetime or accessibility issue remains within the verified scope. Both High-reasoning workers completed their disjoint chapter assignments; the primary reviewed and integrated their work, corrected cross-chapter issues and ran final validation.

Review Part II as one integrated milestone, especially full-overwrite ring traces, stable priority ties, and heap build/extract in both directions. After acceptance, reconcile the narrow shared registration/navigation changes with the isolated Part III work in a separate integration pass. This session stops at Chapter 9.
