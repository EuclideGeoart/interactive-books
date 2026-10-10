# Chapter 04 implementation notes

The pool owns an array of unions, each holding either T or a free-list pointer. Union alignment and size satisfy both members; native coverage uses alignas(128). Copy/move are deleted. Fixed capacity and single-threaded use are intentional. Public pointer validation scans by equality, never pointer subtraction on foreign pointers. O(N) validation cost is taught separately from O(1) free-list rewiring.

States explicitly separate free, reserved, live and destroyed storage. Object pointers and active-link flags track the actual union member independently of metadata, exposing temporary statement boundaries. destroy.object combines the explicit destructor and observer-pointer clearing on one annotated line; its following phase write remains a separate step. Returning storage placement-constructs the pointer union member before publishing head. Construction failure leaves no live object; create catches and returns storage. Destruction cleans up remaining live objects; pointers cannot outlive the pool. Raw addresses do not reject stale borrowers after address reuse (no generation token).

Chapter adapter is src/visualizers/allocator/adapter.ts, export poolAdapter, key pool. No generic reducer changes. Shared source rendering, playback, and SVG primitives are reused; pool storage inspection is deliberately local because ordinary object inspection would misrepresent inactive union members. Fixed deterministic slots are preserved across playback. The logical view and memory view preserve the physical slot map; links encode free order in either view.

Validation at this stage: 15 semantic tests and 96 canonical native parity cases passed; C++20 warnings-as-errors with ASan/UBSan/leak detection passed. Sandbox g++ spawn returned EPERM; the identical tests passed with execution escalation. Native fixture instruments the shipped header, comparing tag order and head/phase/alive/next/value for every slot at each statement boundary. Browser checks are recorded after shared integration. No existing Chapter 1 files/tests or shared files changed.

Prerequisites for parent's ledger: std::size_t, std::array, unions and active members, sizeof/alignof, over-alignment, void pointers, pointer equality, placement new, explicit destructor calls, forwarding references/std::forward, variadic templates, try/catch/rethrow, std::bad_alloc, std::logic_error, std::invalid_argument, noexcept destructors, deleted copy/move, object lifetime versus storage lifetime, stable borrowed addresses and RAII cleanup.

## Final focused validation and visual review

After the union-lifetime review, placement new explicitly targets std::addressof(blocks_[i].object). The inspection flag and placement expression share one annotated line; the flag itself is not described as ending the pointer-member lifetime. Constructor failure deactivates link inspection after attempted storage reuse and restores it only when pointer-member placement construction succeeds. Foreign-pointer rejection has its own canonical validate.foreign tag and visible error snapshot.

Final focused count: 16 pool semantic tests + 104 native parity cases, alongside Chapter 5's 150 cases (270 combined). Focused strict TypeScript/noUncheckedIndexedAccess check passed for all four model/adapter modules and their tests. C++20 -Wall -Wextra -Werror -pedantic with ASan/UBSan/leak detection passed after the lifetime changes.

The focused ownership Playwright suite passed 15 checks across 1440×1000, 1024×900 and 390×844 in installed Chrome. It covers step/reverse equality, code-line jumps, the foreign guard, nonphysical free order, keyboard following, the distinct physical grid, intrusive ownership, independent hooks and path sampling against unrelated rectangles/text. Page horizontal overflow was absent. Reviewed generated screenshots at /tmp/ownership-pool-{desktop,tablet,mobile}.png. Free slots are neutral (not heap-freed red), reserved/destroyed storage is amber, and object fields only appear while alive. Logical view keeps fixed slots with routed free-list links; Memory view uses a physical-slot grid. Reorder free list yields 1 → 0 → 2 → 3 and demonstrates topology independent of placement. At mobile width the diagram intentionally scrolls horizontally rather than shrinking field text.

Shared integration, full Chapter 1 regression, production build, and cross-chapter accessibility/consistency are parent-owned; no shared files or existing tests were modified here. Boundary: this is a bounded single-threaded teaching pool with O(N) address guards, not a standard allocator or stale-generation detector.

## Files created for Chapter 4 and shared ownership validation

- cpp/chapter-04/Pool.hpp
- cpp/chapter-04/main.cpp
- cpp/chapter-04/parity.cpp
- src/visualizers/allocator/model.ts
- src/visualizers/allocator/adapter.ts
- src/components/visualizers/PoolLab.astro
- src/content/chapters/04-memory-pool.mdx
- src/pages/chapters/04-memory-pool.astro
- tests/unit/pool.test.ts
- tests/unit/pool-native.test.ts
- scripts/ownership-fixture.mjs
- tests/e2e/ownership.spec.ts
- documentation/CHAPTER_04_NOTES.md

## Final review follow-up: shared markers and local pointer scopes

Both ownership adapters now import the parent's arrowDefinitions(id); no duplicate marker definitions or shared routing abstraction remains. Pool allocate/deallocate expose their saved block reference in the SVG and inspector only after the native local declaration and until the function returns. A source:null PoolScopeEnd event clears the reference before another function executes. The returned storage survives independently. Native instrumentation now observes the actual in-scope C++ block value and compares it at every tagged statement; tests filter only the additional untagged scope boundary, whose behavior has a dedicated semantic test.

Latest focused validation: 272 combined unit/native cases pass (17 pool semantic, 104 pool native, 43 intrusive semantic, 108 intrusive native). Strict TypeScript/noUncheckedIndexedAccess passes for adapters, models, fixtures and owned tests. The shared-marker migration's focused desktop routing browser check passed.

The new browser scope cases passed at all three viewports after the primary agent rebuilt production. They also verify that the saved block remains at 0x1000 when freeList advances to 0x1080. The primary integration run passes 738 unit/native tests and 124 browser checks, including all 18 ownership browser checks. A prior stale-dist run was superseded by this production validation. See MILESTONE_02_REVIEW.md for final cross-chapter evidence.
