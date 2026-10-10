# Chapter 7 — Circular Buffer implementation notes

Worker scope and shared-integration ownership match `CHAPTER_06_NOTES.md`. No Chapters 1–5 or baseline snapshots/tests were modified by this worker.

## Implemented

- Route/slug `07-circular-buffer`, adapter key `ring`, exported `ringAdapter` in `src/visualizers/ring-buffer/adapter.ts`.
- Complete count-based `RingBuffer` and separate count-free `SentinelRing` in `cpp/chapter-07/RingBuffer.hpp`; executable boundary, repeated-wrap and ownership tests in `main.cpp`.
- Count-based synchronized enqueue, dequeue, front, back, empty, size and full. Enqueue exposes reject/overwrite policies; overwrite discards exactly the oldest value.
- Physical storage and logical queue views with stable physical-slot identity, distinct head/read and tail/next-write labels, raw int inspection and text representation. Equal-index markers occupy separate rows.
- Visible slot-4-to-slot-0 return route. Executed head/tail wraps receive an amber route plus explicit textual 4 → 0 labels. Indices, writes and count are separate native source steps.
- Presets for impending tail wrap, already-wrapped logical order, singleton at slot 4, empty and full with head equal to tail. Custom head 0…4, up to five values −999…999. Loads start fresh experiments.
- Interactive count versus sentinel arithmetic and complexity model: 5, 8, 32 or 1024 physical slots; usable capacity N or N−1; movable head and occupancy; full/empty formulas; constant dequeue work versus shifting. `SentinelRing` is separately complete and sanitizer-tested, not presented as the source of count-based lab traces.
- Five local Break-It cases: no modulo, wrong endpoint index, full mistaken for empty, silent unread overwrite and empty read. No native undefined behavior is executed.
- Complete chapter prose, exercises, fixed-memory engineering use cases and explicit transition from FIFO storage to priority ordering.

## Authority and invariants

Ring geometry, state and invariants are local. Generic playback has no knowledge of circular storage. Existing `LabAdapter`, `TraceLab`, `StructurePreview`, tokens, SVG arrow definitions and escaping are reused. The only requested shared presentation changes were optional `viewLabels?: { logical: string; memory: string }` and `diagramNote?: string` on both shells; primary implemented these and the ChapterHero part label.

The raw storage has five live ints. `head` is the next read; `tail` is the next write. Bounds and count limits always hold. `tail == (head + count) % 5` is required at operation boundaries and shown as pending between separate index/count statements. Overwrite first advances head and reduces count, then executes the common enqueue statements. Pop changes indices/count without erasing a payload.

Both containers own inline storage with safe value copy/move. The count-based class explicitly defaults special members; sentinel uses the rule of zero. Moving inline integer arrays does not empty the source. Capacity is a fixed nonzero constant; back uses `(tail + capacity - 1) % capacity`, avoiding unsigned subtraction underflow at tail zero. Guard rejection is unchanged; successful integer operations do not throw after mutation starts. Observer vector allocation is outside the O(1) enqueue/dequeue path.

## Validation performed by worker

- **41 combined Chapter 6/7 semantic tests passed.** Ring checks exact write/index/count boundaries, pending invariants, full rejection, oldest-only overwrite, underflow, immutable input and full reverse playback, continuing FIFO sequences, input bounds, and fault diagnoses.
- **252 ring native parity cases passed** (300 combined): seven operations, six payload presets, head offsets 0/2/4, both policies. Every tagged condition/statement matches all raw slots and head/tail/count; native observer return values are compared too. Displayed source-region tag coverage is checked for every run.
- Both Chapter 6/7 C++ mains independently compiled and ran with C++20, `-Wall -Wextra -Werror -pedantic`, ASan, UBSan, frame pointers and leak detection. Ring main tests rejection, overwrite, equal-index empty/full, singleton, copy/move, empty endpoint guards, and **1000 full reuse cycles each** for count and sentinel designs.
- Initial isolated production browser run passed both chapter interaction cases at **1440×1000, 1024×900, 390×844**, six cases total. Ring checks physical/logical selection identity, last-to-zero source highlighting, exact reverse, pending/restored invariants, rejection versus overwrite, head wrap, empty reads, sentinel controls and all fault/restore actions.
- Initial axe failures were solely noninteractive fault image nodes retaining `aria-pressed`. Fixed locally in both fault components; primary owns final rebuilt suite confirmation.
- Rendered captures at all three widths in light/dark produced **zero SVG text out-of-viewBox findings**. Ring desktop full/equal-index and mobile dark wrap captures were inspected. Narrow diagrams scroll inside their panel; explanatory text remains outside the SVG as well.
- Primary review identified a truncated mobile preset label. `RingLab.astro` now makes its first label a full row at widths ≤560px, using a scoped selector that overrides the shared mobile flex rule. Final rebuilt mobile check is delegated to primary's integrated browser run.
- Focused suite: `tests/e2e/queue-ring.spec.ts`; capture script: `scripts/capture-queue-ring.mjs`; native fixture: `scripts/queue-ring-fixture.mjs`. Worker targets port 4332, uses `/tmp/part-ii-a-e2e`, and does not rebuild shared `dist`.

## Limits and integration

This is a bounded, integer-only, single-threaded teaching implementation. It is not lock-free and does not prove hard real-time latency. No growable capacity, allocator failures, arbitrary object lifetime, atomics, release/acquire ordering, zero-copy spans or production audio/network integration is claimed. Count/sentinel controls are an arithmetic work model, not a second native-source playback trace. Logical membership shown between native statements follows the current fields; pending relation text identifies unfinished operations.

Primary owns adapter/chapter registration, source downloads for `RingBuffer.hpp` and `main.cpp`, check-cpp integration, ledger and consolidated final report. Shared styles/engine/source endpoint remain untouched by this worker. No architectural promotion beyond the requested presentation props was needed.

## Ledger concepts for primary

Actually used: modulo remainder with nonnegative indices; `std::size_t`; `std::array`; fixed nonzero capacity; modular logical/physical mapping; sentinel-slot versus explicit count representation; scoped enum policy; `const`/`noexcept`; exceptions before mutation; defaulted special members and rule-of-zero ownership; `std::vector` observer; range-for/for indexing; unsigned subtraction avoidance by adding capacity before subtracting. Validation-only: `assert`, templates for the callable exception check, `std::move`, repeated-cycle tests. Atomics and memory ordering are discussed as out of scope and are not implementation prerequisites used here.

## Files owned by Chapter 7

- `cpp/chapter-07/RingBuffer.hpp`
- `cpp/chapter-07/main.cpp`
- `src/visualizers/ring-buffer/model.ts`
- `src/visualizers/ring-buffer/adapter.ts`
- `src/visualizers/ring-buffer/faults.ts`
- `src/components/visualizers/RingLab.astro`
- `src/components/visualizers/RingEncoding.astro`
- `src/components/visualizers/RingBreakIt.astro`
- `src/content/chapters/07-circular-buffer.mdx`
- `src/pages/chapters/07-circular-buffer.astro`
- `documentation/CHAPTER_07_NOTES.md`

Cross-owned Chapter 6/7 validation files: `scripts/queue-ring-fixture.mjs`, `scripts/capture-queue-ring.mjs`, `tests/unit/queue-ring.test.ts`, `tests/unit/queue-ring-native.test.ts`, `tests/e2e/queue-ring.spec.ts`.
