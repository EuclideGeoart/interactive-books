# Chapter 6 — Queue + Deque implementation notes

Worker scope: Chapter 6 and Chapter 7 only. Primary owns integration and architectural authority. No Chapter 1–5 implementation, shared engine/component/script/style, ledger, registry, source endpoint, baseline test, or snapshot was edited by this worker.

## Implemented

- Route/slug `06-queue-deque`, adapter key `queue`, exported `queueAdapter` in `src/visualizers/queue/adapter.ts`.
- Complete owning `ArrayDeque` and restricted `Queue` facade in `cpp/chapter-06/QueueDeque.hpp`, with executable boundary/ownership tests in `main.cpp`.
- Enqueue/pushBack, dequeue/popFront, deque-only pushFront/popBack, front, back, empty, size; empty, singleton, full, custom presets; FIFO and underflow.
- A deliberately naive contiguous array makes every front-operation shift visible. The logical interval and raw retained int slots have distinct views; loop cursor and shift counts are shown. The queue facade delegates directly to the displayed deque operation.
- Interactive Queue vs Deque policy comparison, memory/application comparison, endpoint work model and quadratic drain-shift count. Bounds: 0–1024 model members; sufficient insertion capacity assumed. The actual trace lab has five slots and −999…999 integer inputs.
- Four local Break-It diagnoses: wrong-end FIFO removal, reversed shift direction, missing singleton count update, and empty read. These model faults never execute invalid native C++.
- Full chapter rhythm, ownership and exception discussion, linked head/tail queue and doubly linked deque tradeoffs (building on Chapter 3), engineering examples and exercises. Chapter 7 explicitly follows from avoiding array shifts.

## Authority and semantics

The shared playback controller only indexes immutable snapshots. Queue-specific state, geometry and invariants remain local. No framework, dependency, store, reducer extension or shared topology abstraction was introduced.

`ArrayDeque` owns five live integers; removal changes membership without erasing objects. It has explicit defaulted copy/move/destruction. `Queue` uses value ownership and the rule of zero. Moving these inline integer containers leaves independent valid source/destination value states. Guards throw before changes; built-in int mutations cannot throw afterward. These guarantees are specific to the int implementation.

Native instrumentation in `scripts/queue-ring-fixture.mjs` reads the actual shipped header, preserving each tagged condition and statement. Queue checks compare tag order, all raw slots, count, loop cursor and native return values. Source-region checks ensure every executed tag is in the adapter's displayed source. Scope exit removes the loop cursor without claiming an executing C++ statement.

## Validation performed by worker

- `npx vitest run tests/unit/queue-ring.test.ts`: **41 semantic tests passed**, shared with Chapter 7.
- `npx vitest run tests/unit/queue-ring-native.test.ts`: **300 native parity tests passed** in total: **48 queue/deque**, 252 ring. Compiler subprocesses used the required environment escalation.
- Chapter 6 main compiled and ran successfully with `g++ -std=c++20 -Wall -Wextra -Werror -pedantic -fsanitize=address,undefined -fno-omit-frame-pointer -g`; runtime `ASAN_OPTIONS=detect_leaks=1`.
- Main checks empty observers/removals, singleton transitions through both ends, duplicate/extreme payloads, full rejection with unchanged raw storage, shifts, copy/move and FIFO queue draining.
- Initial focused browser run on primary's isolated production preview port 4332: queue and ring interaction cases **all passed at 1440, 1024, 390px** (six combined cases). Tests cover exact shift state, source highlight, reverse/reset, inspector selection, empty/full/singleton boundaries, invalid inputs, policy comparison and each fault/restore.
- Initial whole-page axe checks found retained `aria-pressed` on noninteractive Break-It image nodes. Fixed both local fault components by removing button-only attributes and misleading inspection text; primary's final rebuilt browser suite owns final confirmation.
- `scripts/capture-queue-ring.mjs` captured both labs at 1440, 1024, 390px in light/dark themes under `/tmp/part-ii-a-captures`; every captured SVG had zero text bounding boxes outside its viewBox. Desktop and mobile captures were inspected. Internal SVG horizontal scrolling preserves text size on narrow screens.
- `tests/e2e/queue-ring.spec.ts` adds focused interactions, axe checks in both themes, global width checks, SVG text bounds and all ring preset/view boundary combinations. Final rebuilt run is coordinated by primary; the worker did not build or overwrite `dist`.

## Integration and limits

Primary registers `queueAdapter`, the chapter, and downloadable `QueueDeque.hpp`/`main.cpp`; it owns the integrated check-cpp runner, search/navigation and ledger. Components use the agreed optional `diagramNote` prop and ChapterHero `part` prop.

The executable trace intentionally teaches the naive five-slot array. The linked implementation tradeoff reuses Chapter 3's explanation rather than adding a second linked-list engine. Queue policy comparison is an ADT/work model, not a second persistent container. The visual lab starts fresh per Load operation; native main and semantic tests additionally exercise continuing sequences. No native compiler runs in the browser. Concurrency, arbitrary element lifetimes, allocation timing and standard-library container performance are outside the verified scope.

## Ledger concepts for primary

Actually used in canonical implementation: `std::array`, `std::size_t`, inline ownership, default member initialization, defaulted copy/move/destructor, rule of zero, composition/container facade, `const` and `noexcept` observers, capacity constants, checked exceptions, array bounds, forward/backward `while` loops, pre-increment/decrement, and a `std::vector` observer with an iterator range. Validation-only: `assert`, generic callable exception helper, initializer-list range loops and `std::move`.

## Files owned by Chapter 6

- `cpp/chapter-06/QueueDeque.hpp`
- `cpp/chapter-06/main.cpp`
- `src/visualizers/queue/model.ts`
- `src/visualizers/queue/adapter.ts`
- `src/visualizers/queue/faults.ts`
- `src/components/visualizers/QueueLab.astro`
- `src/components/visualizers/QueueComparison.astro`
- `src/components/visualizers/QueueBreakIt.astro`
- `src/content/chapters/06-queue-deque.mdx`
- `src/pages/chapters/06-queue-deque.astro`
- `documentation/CHAPTER_06_NOTES.md`

Cross-owned Chapter 6/7 validation files: `scripts/queue-ring-fixture.mjs`, `scripts/capture-queue-ring.mjs`, `tests/unit/queue-ring.test.ts`, `tests/unit/queue-ring-native.test.ts`, `tests/e2e/queue-ring.spec.ts`.
