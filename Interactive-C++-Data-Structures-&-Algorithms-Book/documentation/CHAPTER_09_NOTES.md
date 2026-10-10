# Chapter 09 — Binary Heap

Implemented in the shared workspace on 2026-10-04. Primary retains architectural and shared integration ownership. No Chapter 1–5 files or shared infrastructure were edited by this worker.

## Contract and representation

- Slug: `09-binary-heap`; adapter key: `heap`; export: `heapAdapter` from `src/visualizers/binary-heap/adapter.ts`.
- Canonical header: `cpp/chapter-09/BinaryHeap.hpp`; complete assertion-based example: `main.cpp` in the same directory.
- One vector is the complete conceptual state. Tree and array are simultaneous renderings of its indices. There is no independently mutable tree state. Max/min modes use a strict integer comparator. Equal integers may stop sifting; no stable task identity is promised.
- Insert appends, then sifts up. Peek guards empty before reading root. Extract saves the root, copies last to root, pops the final element, then sifts down when nonempty. Both copies of the last value remain visible between assignment and pop. Singleton extraction performs safe self-assignment and skips sift-down afterward.
- Build accepts any input order, moves it into an initially empty destination, and repairs internal nodes backward from size/2−1. It is O(n), with the aggregate argument explained in content.
- Exact indices: root has no parent; parent(i)=floor((i−1)/2) only for i>0; left=2i+1; right=2i+2. Existing-child checks use size. Native sift-down tests i<size/2 before computing children, avoiding overflow from arbitrary indices.
- Copy/move/destruction explicitly defaulted. No cached topology or pointer repair is needed. Copies are independent; moved-from contents are unspecified but valid. Allocation failure is possible before integer-only nonthrowing repair.
- Teaching inputs: at most fifteen integers (fourteen before insertion), −999…999. Insert/peek/extract require initially valid heap order; Build accepts arbitrary order. The native implementation is not restricted to the visual bound.

## Interactions and presentation

Shared `TraceLab`, `StructurePreview`, source tags and generic playback are reused. Domain model, SVG geometry, invariants, inspectors and complexity/fault experiments stay local. Swaps have one semantic snapshot and update both representations simultaneously. DOM keys distinguish `tree:i` and `array:i`; normalized selection highlights the same index in both views while shared keyboard focus restoration retains the originating view. Inspector relationships can select parents/children and show current execution locals i/parent/child/right.

Execution-local scope is represented at tagged boundaries: parent clears before the next sift-up condition; child/right clear before the next sift-down condition; helper locals disappear before returning to the caller. Build restores its outer loop index after nested sift-down. Native parity checks these details, not only final array order.

Heap order is pending during legitimate repair and checked at completion. Violating edges and child labels use red/dashed cues and `!`. Active swap endpoints have amber fill, so a red invariant stroke does not hide activity. Local SVG rules retain selected/keyboard-focus borders on violated cells too.

The logarithmic-height explorer shows per-level population for n=0…1024. Empty has height −1 by explicit convention. Costs distinguish swaps, value comparisons, repair levels and allocation. Vector-backed insertion is O(log n) with spare capacity and amortized O(log n); individual reallocation may cost O(n).

Break-It safely demonstrates wrong parent formula, early sift-up termination and wrong child selection. The wrong-parent example inserts 65 into `[90,80,60,70,50,40]`: erroneous parent(6)=3 sees 70 and stops, leaving the real parent 60 below 65. Simulated faulty snapshots remain separate from canonical C++. A stale independent tree after an array-only swap is structurally impossible here.

## Verified facts

Worker validation:

- `npx vitest run tests/unit/priority-heap.test.ts tests/unit/priority-heap-native.test.ts`: **88 passed** (10 semantic tests and 78 native parity cases across Chapters 8 and 9).
- Chapter 9 contributes **48 native cases**: four operations × two directions × six datasets, including empty, singleton, duplicates, extrema and a fourteen-element boundary input.
- Temporary instrumentation reads the actual shipped header. Exact equality covers every tagged statement's storage, branch outcome, return value, value-comparison and swap counters, and in-scope local indices. Nested sift tags precede the caller completion tag.
- Semantic tests assert immutable pre-append/pre-swap/after-swap storage, locals and counters; exact reverse/reset; move-last duplication; singleton extraction; duplicate termination; both-view selection; all faults; exact heights; input guards; and build plus complete extraction against an independent sorted oracle for every size 0…15 in both directions.
- Native main also tests repeated build/extract for sizes 0…100, both directions, copy/move/assignment, duplicate values, empty exceptions, singleton and insertion invariants.
- Both new mains passed C++20 with warnings-as-errors, ASan, UBSan, frame pointers and leak detection.
- Latest worker Astro check: **130 files, zero errors/warnings/hints**. Unit-only recheck after active/focus styling: **10 passed**.
- `tests/e2e/priority-heap.spec.ts` supplies focused browser tests for synchronized swaps, both-view keyboard focus, exact reverse, source highlighting, move-last, singleton/empty, min order, Build, invalid input, faults, height explorer, completion and global overflow. Primary owns actual integrated browser/axe/responsive/visual execution and the final report.

## Integration handoff

Primary registers adapters, chapter metadata, source endpoints and shared optional label props. This chapter supplies the new `part`, `viewLabels`, and `diagramNote` values. No generic playback topology, global store, framework or shared CSS change is required. All local SVG styling uses shared tokens.

## Ledger concepts actually used

`std::vector<int>`, contiguous indexing, `std::size_t` and guarded unsigned arithmetic, integer division, complete-tree/array mapping, comparator predicate and ternary max/min direction, `std::swap`, `std::move`, `push_back`/`pop_back`/`back`, const view observers, `std::underflow_error`, explicitly defaulted copy/move/destructor, RAII, `noexcept`, pass/return by value, local scope and nested calls. Native main additionally uses sorting, reverse, assertions and repeated invariant checks. Fixture-only `requires` and tracing helpers are not canonical prerequisites.

## Limits

Integer-only heap; no arbitrary payload comparator, stable sequence tie-breaker, decrease-key handles, arbitrary erase, concurrent access or hard real-time allocation guarantee. No native allocation-failure injection. This is a heap data structure, not a simulation of allocator heap memory. Browser teaching indices are exact, while addresses and separate node allocations are intentionally absent. Final global regression and cross-Part integration belong to primary.

## Files created by this worker

- `cpp/chapter-09/BinaryHeap.hpp`
- `cpp/chapter-09/main.cpp`
- `src/visualizers/binary-heap/model.ts`
- `src/visualizers/binary-heap/adapter.ts`
- `src/components/visualizers/HeapLab.astro`
- `src/components/visualizers/HeapExplorer.astro`
- `src/components/visualizers/HeapBreakIt.astro`
- `src/content/chapters/09-binary-heap.mdx`
- `src/pages/chapters/09-binary-heap.astro`
- `documentation/CHAPTER_09_NOTES.md`

The four worker-owned combined validation files are listed in Chapter 8's notes. Total worker file footprint: **24 new files**. No baseline tests, existing snapshots, shared integration files, prerequisite ledger or final milestone report were edited by this worker.
