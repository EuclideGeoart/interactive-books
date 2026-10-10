# Part VI — Searching & Sorting review

Date: 2026-10-04. Scope: **Chapters 37–44**, extending the accepted Chapters 1–36 floor. Authority: [master plan](INTERACTIVE_DSA_BOOK_MASTER_PLAN.md) and the user's Part VI request. Two High-reasoning implementation agents worked on disjoint chapter families; the primary owned architecture, integration, shared rendering and acceptance.

**Acceptance status: complete for Chapters 37–44.** Strict checks, 5,745 unit/native tests, 760 whole-book browser cases (two established skips), canonical/downloaded sanitizer validation, root and `/book/` builds, launcher checks and visual review are complete. The final presentation refinement additionally passed 111 focused browser cases.

Concurrent Part VII work and the separately user-requested diagram autofit/actual-size work appeared in this same file-based checkout during implementation. Both were preserved. This review accepts only an isolated Chapters 1–44 checkpoint; it does not depend on or accept Chapters 45–50 or the subsequent shared autofit changes. No Chapter 0 or Part VIII implementation was performed.

The exact checkpoint is saved in [checkpoint.tar.gz](validation/part-vi/checkpoint.tar.gz), with an [archive checksum](validation/part-vi/checkpoint.sha256), [760 source/test hashes](validation/part-vi/frozen-source.json), and [baseline integrity audit](validation/part-vi/integrity.json). Restore commands are in the root README. The archive contains source, configuration and required regression images; dependencies and build outputs are regenerated.

## 1. Completed chapters

Each chapter has all thirteen authored learning sections, a canonical header and executable example, an interactive trace, source synchronization, invariants, actual operation counts and exercises.

| Chapter | Delivered interaction |
| --- | --- |
| 37 — Linear search | Inspect, equality, advance, first-match return and exhaustion; unsorted/empty/single/duplicate/custom inputs; exact equality count. |
| 38 — Binary search | Validated ascending domain, `[low, high)`, safe midpoint, separate equality/ordering comparisons and discarded halves; any-match duplicates; bounded wrong-update/nonprogress/unsorted experiments. |
| 39 — Sorting fundamentals | Ascending/descending inversion inspection, explicit record swap, sortedness and duplicate identity order; stable/in-place/adaptive/comparison-sort vocabulary. |
| 40 — Bubble / selection / insertion | Bubble passes, finalized suffix and early exit; minimum scan and placement; held insertion record, separate shifts and final fill; same-input comparison across all three algorithms. |
| 41 — Merge sort | Recursive ranges, live heads, individual temporary-buffer emissions and separate copy-back; left-on-equality stable merge. |
| 42 — Quick sort | Exact last-element Lomuto partition with i/j/pivot motion, each comparison/swap, pivot placement and smaller child ranges; guarded bounds/pivot/nonprogress faults. |
| 43 — Heap sort | Bottom-up max-heap construction, root/end swap, explicit shrink and sift-down; simultaneous tree/array views and a persistent finalized suffix. |
| 44 — Counting / radix | Frequencies, cumulative ends, reserved output slots, stable reverse placement and copy-back; base-10 LSD passes, padded digits and a genuinely incorrect unstable-pass counterexample. |

The isolated registry has exactly 44 chapters and 572 searchable sections. Chapter 36 leads to 37; Chapter 44 is the checkpoint endpoint.

## 2. Searching/sorting interaction architecture

[The architecture ruling](PART_VI_ARCHITECTURE.md) keeps semantic state and invariants domain-owned. Search/elementary models and advanced models produce deterministic immutable snapshots through the existing `Trace<S,E>` contract. Playback indexes these snapshots; reverse/reset never attempt inverse mutations.

Adapters project state into a sorting-only `SortingScene`: record rows, cursor indices, half-open ranges, active/finalized/fault/discarded cells, explicit facts and optional heap size. The renderer performs no comparisons, partition decisions or invariant inference. Record identities travel with keys; an index names a current storage slot.

Source tags identify the canonical executed statements. Optional native observers capture actual state after those statements. Validation compares tag order and full modeled state, rather than checking only that a tag exists in the header.

## 3. Reuse from previous Parts

Reused unchanged: `PlaybackController`, `TraceLab`, `LabAdapter`, `InspectionDiagram`, source extraction/highlighting, book sections/navigation shell, search/progress infrastructure, theme tokens and SVG escaping/arrow primitives.

Chapter 9 supplies parent-index geometry, the guarded child arithmetic, strict better-child choice, swap/advance mechanics, and an independent native build oracle. Its private owning heap removes extracted records, whereas heap sort must retain them in the array's finalized suffix. Chapter 43 therefore adapts the small sift-down routine to an explicit active bound. Chapters 6–9 were not redesigned or edited.

## 4. Sorting-specific infrastructure

- `src/visualizers/sorting/{types,presentation,complexity}.ts`: presentation contract, indexed/heap projections and actual-work explorer.
- `src/scripts/sorting-interactions.ts`: row keyboard navigation, focus/active-cell reveal, fixed visible row names while panning, and auxiliary facts outside horizontal scrolling.
- `src/components/visualizers/SortingComplexity.astro` and `src/styles/sorting.css`: scoped interface and styling.
- Family adapters/mounts keep parsing, operations, source regions and algorithm rules local.

Arrow/Home/End navigation stays within an indexed row; Enter/Space use the existing inspector. Empty cells, held records and separately allocated buffers are explicit. Logical/storage views preserve actual storage order. No fictitious C++ addresses or ABI offsets are claimed.

## 5. Stability and in-place policy

| Algorithm | Stability policy | Core auxiliary-space policy |
| --- | --- | --- |
| Bubble | Stable only with strict adjacent inversion swaps; equality-swap fault is demonstrated | O(1), with early exit |
| Selection | No stability guarantee; `[2A,2B,1C]` exposes reversal | O(1) |
| Insertion | Strict shifts retain equal-key order | O(1) held record |
| Merge | Left head wins equality | O(n) buffer plus O(log n) call stack |
| Quick | Last-element Lomuto with `<=`; unstable | O(1) partition workspace; average O(log n), worst O(n) stack |
| Heap | Long swaps can reorder equal records | O(1) algorithm workspace |
| Counting / LSD radix | Reverse traversal into decremented cumulative ends is stable | O(n+k) / O(n+base) |

These claims describe the algorithms operating on their working arrays. The observable canonical wrappers own copied input and diagnostic state; browser snapshot history adds further memory. The prose explicitly separates those allocations from an in-place algorithm claim.

Binary search similarly distinguishes its O(log n) query loop from the example's O(n) sortedness-validation wrapper. Linear search promises the first match; binary search promises any match.

## 6. Complexity instrumentation

Counters measure executed key comparisons, swap calls, shifts, array writes, temporary/count-array writes, passes, maximum active recursive calls, digit reads and maximum-finding scans as applicable. Bounds/loop predicates, input validation, invariant checking, observers, rendering and snapshot copies are excluded. A swap counts two array-slot writes, including Lomuto self-swaps. Merge output writes and copy-back writes are distinct.

The explorer executes the actual trace builders on 0–16 records. It compares all elementary algorithms on the same input, constructs balanced last-pivot Lomuto inputs and contrasts them with sorted pathological inputs, and varies counting domain size. Radix maximum scans remain separate from its zero pairwise sorting-comparison count. These are operation models, never wall-clock benchmarks.

## 7. Unit, oracle and source-parity validation

**5,745 tests passed in 40 files**, retaining all 4,074 accepted baseline tests. [Full unit/native log](validation/part-vi/unit.log).

Part VI adds 1,671 tests: 505 search/elementary tests, 70 advanced tests, 1,089 cross-family exhaustive oracle cases and seven shared presentation/complexity tests. Independent numeric/stable-sort oracles cover every array of length 0–4 over a duplicate-rich alphabet; additional seeded corpora, extrema and maximum-size cases cover larger inputs. Search checks use independent first-index/membership contracts. Heap construction compares against actual Chapter 9 native execution.

Native parity checks source-tag sequence, identities, buffers, counts, indices, phases, conditions, recursive ranges and counters. Every canonical trace tag is exercised. Corrupted-state tests verify that pivot ownership/bounds and merge-prefix validation examine actual state rather than trusting a fault label. Empty, singleton, sorted, reversed, all-equal, duplicate, supported negative/extreme and invalid-domain inputs are covered.

Final strict Astro/TypeScript checking reports **305 files, zero errors, zero warnings and zero hints**. [Strict check](validation/part-vi/check.log).

## 8. Canonical and downloaded C++

All **44 canonical examples** compile and execute with C++20, `-Wall -Wextra -Werror -pedantic`, ASan, UBSan, frame pointers and leak detection. The established integrated tree and hashing programs also pass. [Native log](validation/part-vi/cpp.log).

The `/book/` deployment separately publishes **90 source files** and compiles/runs all **44 downloaded examples** under the same warning/sanitizer floor. Relative includes are checked. Chapters 37–40 explicitly link their required `chapter-39/SortState.hpp`; Chapters 41–44 are standalone header/main pairs. Fixtures are not published, and teaching tags are removed from downloads. [Downloaded-source validation](validation/part-vi/deployment-prefix.log).

## 9. Browser, accessibility and deployment validation

The final Part VI domain run passed **39/39 browser cases** across all three viewport projects. It covers source scrolling, exact reverse/reset, keyboard row inspection, search contracts, held insertion shifts, merge output, Lomuto faults, heap shrink, stable/unstable radix, invalid-input preservation, navigation, search, progress, both themes and axe scans. [Final Part VI browser log](validation/part-vi/browser-final-ui.log).

The full 1–44 browser/visual regression passed **760 cases with the two established skips**, retaining the 649-case accepted browser floor and adding 111 cases. [Full browser log](validation/part-vi/browser.log). The skips are the mobile-only playback test in the desktop and tablet projects. After the final panning-label improvement, another **72/72 shared playback/accessibility and visual cases** passed on the final production output, bringing the focused final-UI verification to **111/111**. [Final shared/visual log](validation/part-vi/browser-final-generic.log). The final change is restricted to sorting presentation and interaction; the full regression retained the production output from before that final label adjustment to avoid changing files during a run.

Execution note: Playwright wrote `status: passed` and an empty failed-test list for all three runs. The long full-suite shell session and the 72-case follow-up session returned signal status 143 after their completed reports; their test outcomes are preserved in [browser-result.json](validation/part-vi/browser-result.json) and [browser-final-generic-result.json](validation/part-vi/browser-final-generic-result.json). The 39-case final domain session exited zero. No test failures or incomplete cases were reported.

Root and `/book/` builds each produce **45 pages**. The prefixed validator visits all 44 mounted chapters and 572 sections, verifies navigation/search and internal base paths, and reports no global overflow or page runtime errors. The real launcher passes startup, `BOOK_PORT`, Chapters 1/23/36/44 readiness, URL opening, server reuse and rejection of an older 1–36 server. [Root build](validation/part-vi/build-root-final.log), [final prefixed build](validation/part-vi/build-prefix-final.log), [launcher](validation/part-vi/launcher.log). A final `/book/` pass also revisits all 44 chapters and exercises forward/reverse/view switching in all eight updated labs. [Final prefixed UI validation](validation/part-vi/deployment-prefix-final-ui.log).

## 10. Visual review

The established navy/neutral book style is retained. Amber marks current comparison/write, blue marks cursors, green/check marks finalized positions, and red/error text marks faults. Equal-key records retain identity letters. Heap tree geometry remains stable when the active prefix shrinks; array slots remain fixed through shifts, buffer copies and partitions.

Added **56 new chapter screenshot baselines**; all **252 accepted reference images remain unchanged in the acceptance checkpoint**. The separately authorized autofit task is updating earlier images in the shared root; those changes are preserved and excluded from this acceptance comparison. Additional evidence covers **96 mutation × view × theme × width combinations**, with keyboard focus and page containment assertions. [Capture manifest](../tests/visual/sorting/manifest.json), [capture log](validation/part-vi/visual-capture.log).

Inspection found and corrected a clipped insertion-hole label and cramped inspector fields. The final presentation also retains row names during horizontal panning and wraps them to the visible width; active records remain reachable without shrinking their text. Narrow diagrams intentionally scroll horizontally. Source panes and long work-count tables are keyboard-scrollable.

## 11. Prerequisite ledger

[CPP_PREREQUISITE_LEDGER.md](CPP_PREREQUISITE_LEDGER.md) records actual use: indexed result sentinels, half-open intervals and safe midpoint arithmetic, identity records, strict ordering helpers, shifts/held values, recursive lambda self-calls, optional buffer occupancy, signed 32-bit keys, cumulative counts, stable reverse placement, digit extraction and guarded divisor multiplication. Reused vector/swap/observer concepts are identified separately from new use. Validation-only oracles remain distinguished from learner API prerequisites.

Existing Parts I–V entries and concurrent Part VII entries are preserved. Chapter 0 remains deferred.

## 12. Known limitations

- Search/elementary visual labs accept at most 12 records; their native/model teaching bound is 64. Advanced labs/native examples accept at most 32. The complexity explorer uses 0–16.
- Search/elementary keys are bounded to ±1,000,000. Comparison-based advanced sorts support signed 32-bit keys. Counting accepts keys 0…maxKey with maxKey ≤ 99; radix accepts nonnegative signed 32-bit keys.
- Binary lower/upper bounds, randomized or three-way quicksort, production benchmark timing, checkpointed huge traces and arbitrary user comparators are not implemented.
- The canonical wrappers are inspectable teaching implementations with diagnostics, not drop-in production sorting APIs. Bad experiments remain bounded and never execute native undefined behavior.
- This acceptance excludes concurrent Part VII code. The shared root may contain later chapters; use the documented frozen checkpoint to reproduce this exact 1–44 review.

## 13. Proposed shared abstractions

Keep the new row renderer sorting-owned. Two actual families justify shared record/range/buffer presentation, but their invariants and algorithms do not justify a universal indexed-data engine. No global memory events, generic recursion engine or consolidated heap owner was introduced.

A future integration review may compare sorting range-stack display with Part VII call-frame display, and compare pinned row labels/focus reveal with other domains. Promote only a smaller pure helper after equivalent semantics and multiple real consumers are demonstrated. Do not merge state models because both contain arrays.

## 14. Part VII integration considerations

Concurrent edits added Chapters 45–50, navigation and source-publication entries to the shared checkout. The user also authorized the other agent to add diagram autofit with an actual-size option; its shared imports and screenshot updates are intentionally retained. None of this work was removed or depended upon for Part VI acceptance. The original freeze made checkpoint-only adjustments to copied registries, navigation, runner and boundary tests. The saved archive preserves the exact review state; a fresh run of the freeze script instead captures the latest shared UI. The integrity audit verifies all 77 earlier C++ files, 122 earlier visualizer/engine files and 252 accepted screenshots in the checkpoint are unchanged.

Before accepting a combined 1–50 book, run a separate integration review over both Parts, reconcile the live registry/launcher/deployment endpoint, and verify all old and new visual baselines together. Retain distinct sorted-range and call-frame semantics. Potential common abstractions are proposals, not prerequisites or dependencies.

## 15. Recommendation for Part VIII

Part VI is complete and ready for the subsequent integration gate. Do not begin Part VIII from this task. First accept Part VII independently, then validate the combined baseline. For Part VIII, reuse the established ownership/lifetime primitives from Chapters 4–5 and keep allocator, handle, sparse-set and ECS identity contracts explicit. Sorting snapshots should not become an allocator or systems-state engine.
