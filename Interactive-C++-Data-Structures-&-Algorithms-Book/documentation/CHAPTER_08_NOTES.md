# Chapter 08 — Priority Queue

Implemented in the shared workspace on 2026-10-04. Primary retains architectural and shared integration ownership. No Chapter 1–5 files or shared infrastructure were edited by this worker.

## Contract and representation

- Slug: `08-priority-queue`; adapter key: `priority`; export: `priorityAdapter` from `src/visualizers/priority-queue/adapter.ts`.
- Canonical header: `cpp/chapter-08/PriorityQueue.hpp`; complete assertion-based example: `main.cpp` in the same directory.
- ADT comes first: insert, peek, extract, higher/lower-first selection, and explicit FIFO ties. The unsorted vector preserves arrival order; strict comparisons retain the earliest equal candidate. Erase preserves relative order. No sequence counter or counter-overflow policy is needed for this representation.
- Logical removal ranking is derived from the same entries; Arrival storage shows native vector order. Payload and priority are visibly distinct. No heap mechanics are taught before Chapter 9.
- Canonical copy/move/destruction are explicitly defaulted. Copies are independent. Moves leave valid sources with unspecified contents; examples do not assume emptiness. Peek/extract return by value; underflow throws before indexing. Integer entry append preserves the old queue if allocation fails.
- Inputs: at most eight entries (seven before insert), payload and priority integers −999…999. Canonical C++ is not capacity-limited by the browser teaching bound.

## Interactions and presentation

Shared `TraceLab`, `StructurePreview`, source tags, generic playback and design tokens are reused. Chapter-specific code owns the ordering, scan, SVG geometry, inspectors and work model. Reset, reverse, before/after, helper source, invariant panel, counters, empty/single/tie/custom presets and both directions are supported. No new framework, dependency, store, or shared reducer event was added.

The complexity explorer changes n and operation to compare unsorted, sorted and heap work. Counts name their units (priority comparisons, shifts, accesses, levels); they are not timings. Sorted storage places the removable item at the back. Vector insertion is explicitly amortized and capacity-dependent; a reallocation can cost O(n).

Break-It demonstrates three safe policy faults: blindly FIFO selection, newest-equal-first selection, and a reversed comparator. These remain separate from canonical traces and do not introduce unsafe C++ branches. Complete chapter content covers applications, fairness/starvation, pathfinding stale-entry strategies, exercises, progress completion and navigation.

## Verified facts

Worker validation:

- `npx vitest run tests/unit/priority-heap.test.ts tests/unit/priority-heap-native.test.ts`: **88 passed** (10 semantic tests plus 78 native parity cases across Chapters 8 and 9).
- Chapter 8 contributes **30 exact native cases**: three operations × two directions × five starting datasets, including empty, singleton, equal priorities, mixed priorities and extrema.
- `scripts/priority-heap-fixture.mjs` instruments a temporary copy of the shipped header, not a replacement implementation. Every tagged step matches storage, condition outcome, return result, comparison counter and scan locals. Nested helper tags execute before the caller's statement-completion tag.
- Semantic tests verify FIFO tie extraction in both directions, nonmutating Peek, guarded underflow, immutable scan snapshots, controlled policy faults, work quantities and invalid/bounded inputs.
- Both new mains compiled and ran with C++20, `-Wall -Wextra -Werror -pedantic`, ASan, UBSan, `-fno-omit-frame-pointer`, and `ASAN_OPTIONS=detect_leaks=1`.
- Latest worker Astro check: **130 files, zero errors/warnings/hints**.
- Focused browser coverage supplied in `tests/e2e/priority-heap.spec.ts`. Primary runs it against the isolated integrated build and owns final responsive, axe, screenshot and cross-chapter results. Browser success is not inferred from authoring a test file.

## Integration handoff

Primary registers adapter, chapter navigation/search metadata and canonical source endpoints; those shared files were not changed here. Primary supplied optional `viewLabels`/`diagramNote` on shared labs/previews and `part` on ChapterHero; this chapter uses those props. Source downloads should expose the canonical header and main, not the temporary instrumentation fixture.

## Ledger concepts actually used

`std::vector<Entry>` contiguous storage and invalidation, aggregate `Entry` initialization, integer payload versus priority, `std::size_t`, `std::ptrdiff_t` conversion for iterator offset, strict relational comparison and ternary direction choice, const observers, `push_back`/`erase`, `std::underflow_error`, RAII, explicitly defaulted copy/move/destructor, `noexcept`, defaulted equality, return by value. Main uses assertions, exceptions and `std::move`. Fixture-only `requires` expressions and instrumentation helpers are testing techniques, not canonical teaching prerequisites.

## Limits

No decrease-key, cancellation, persistent entry handles, arbitrary comparators, fairness/aging, concurrency, native allocation-failure injection or compiler-in-browser. Browser snapshots model completed tagged statements, not vector's individual internal moves. Native parity is bounded; the mains additionally exercise value semantics and reuse. Final global regression and cross-Part reconciliation belong to primary.

## Files created by this worker

- `cpp/chapter-08/PriorityQueue.hpp`
- `cpp/chapter-08/main.cpp`
- `src/visualizers/priority-queue/model.ts`
- `src/visualizers/priority-queue/adapter.ts`
- `src/components/visualizers/PriorityLab.astro`
- `src/components/visualizers/PriorityExplorer.astro`
- `src/components/visualizers/PriorityBreakIt.astro`
- `src/content/chapters/08-priority-queue.mdx`
- `src/pages/chapters/08-priority-queue.astro`
- `documentation/CHAPTER_08_NOTES.md`

Worker-owned validation shared only between Chapters 8 and 9:

- `scripts/priority-heap-fixture.mjs`
- `tests/unit/priority-heap.test.ts`
- `tests/unit/priority-heap-native.test.ts`
- `tests/e2e/priority-heap.spec.ts`
