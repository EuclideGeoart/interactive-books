# Chapter 03 — Doubly linked list implementation notes

## Delivered teaching contract

The chapter visibly extends Chapter 1 with prev, tail and reciprocal-link invariants. It retains individual objects, generic lifetime events and the actual pointer inspector/node primitives. The lab includes push front/back, delete head/tail/first matching value, forward/backward traversal, clear, custom lists, empty/single/duplicate cases, source jumping, reverse/reset, both representations and live invariants.

Middle deletion exposes each assignment separately. At unlink.forward the forward walk is [10,30] while backward is [30,20,10]; at unlink.backward the remaining chain agrees. The removed node remains live until delete. A sole-node deletion clears head then tail in two distinct statements before deletion. Called helper regions and native execution order remain visible.

Break-It runs safe model-only corruptions: omitted successor backlink followed by freeing, stale head.prev, stale tail.next, lost tail and clearing only head after deleting the sole node. Walks are bounded and stop before reading invalid storage. The broken diagram supports keyboard and pointer inspection and a restore action. Broken state never feeds native C++.

The complexity explorer walks an index-linked model (1–1024 nodes) and compares search from either endpoint with two structural unlink assignments. It distinguishes O(n) finding by value from O(1) known-node unlink, and retains no playback snapshots.

All 13 MDX sections are authored, including complete canonical code, native example, checked ownership, allocation exceptions, precise intermediate invariants, systems trade-offs, edge cases, analogy, exercises, completion and base-aware pagination. StructurePreview renders the actual adapter initial state before mental-model prose.

## Ownership and architecture

- `src/visualizers/doubly-linked-list/adapter.ts` exports `doublyAdapter`, registry key `doubly`.
- `DoublyLinkedList.hpp` is a complete owner with private Node and private unlink, deleted copy/move, iterative destructor/clear, native validity diagnostic, forward/backward result vectors and first-match erase semantics. Endpoint deletion on an empty list is a no-op; absent erase returns false.
- No public arbitrary-pointer erase API is introduced. The private helper receives owned endpoints or nodes found by the list's own traversal.
- `valid()` assumes pointers are valid allocations; it is not a safe diagnostic for arbitrary corrupt native memory. A cycle guard prevents infinite traversal on forward cycles. The browser's corruption diagnostics are independently lifetime-aware.
- Topology, reciprocal-link invariants, bounded traversal, helper/caller scopes and geometry remain chapter-owned. No generic reducer/topology expansion or broad abstraction was introduced.
- The SVG uses shared dataNode with prev/next fields, referenceArrow and pointerInspector. A compact three-column grid preserves fixed address slots. Nodes use prev | data | next, with explicit nullptr endpoints and centered head/tail markers. Adjacent links take short paths with distinct entry/exit heights; longer prev/next paths use upper/lower lanes and cross-row links use outer gutters. Intrinsic min-width preserves readable labels within a horizontal scroll region, especially on touch/mobile. Empty/freed slots are not silently moved.
- Parent supplies and owns all shared lab, preview, book, source and navigation components.

## Native parity and verification

`tests/unit/doubly-native.test.ts` has 160 native cases: eight operations × five starting-list patterns × four targets. The temporary instrumentation is generated from the actual canonical header by `scripts/linear-fixture.mjs`. A fixture-only allocation registry records every live and deleted node so native comparisons include detached objects and every prev/next field, head/tail, both halves of rewiring and nested unlink-before-caller tag order. It does not merely compare expected TS output or final reachable values. All tagged events must appear in visible source regions.

`tests/unit/doubly.test.ts` verifies operation boundaries, exact reverse playback, half-rewired directional disagreement, single-node endpoint order, lifetime/dangling references, all five corruption cases, fixed geometry slots, bounded input, actual search visits, and complexity direction counts.

Executed validation:

- 160 actual C++ parity tests plus 43 semantic checks passed.
- `cpp/chapter-03/main.cpp` compiled under C++20, Wall/Wextra/Werror/pedantic and passed address/undefined sanitizers plus leak detection. Covers empty operations, single-node endpoint removal, head/middle/tail value deletion, duplicates, missing targets, forward/reverse values, clear of 1024 nodes and destructor cleanup.
- Focused browser cases passed at 1440, 1024 and 390 touch/mobile: separate rewiring, reverse, source synchronization, lifetime transitions, keyboard inspector, all corruptions, restore, counters and runtime-error checks.
- Browser SVG route sampling checks every link against unrelated node rectangles AND their field/address/reference text in logical and memory views, using six starting nodes plus insertion. All widths passed.
- Production build succeeded. The final collected Astro check reported zero errors, warnings or hints across 90 files.
- Screenshots captured to `/tmp/linear-doubly-{width}-{mental,lab}.png`, plus `/tmp/linear-doubly-dark.png`. The initial over-wide viewBox was replaced after review; actual desktop and touch/mobile renders now retain legible node fields and addresses.

Parent runs the consolidated Chapter 1 regression/accessibility floor and cross-chapter consistency review; none of its existing files/tests were changed here.

## Prerequisite suggestions for the parent ledger

Actually used: structs with multiple pointer fields; member access through pointers; nullable endpoints; chained member access; local borrowed cursors; object identity independent of equal values; reciprocal-link invariants; private helper preconditions; branching for endpoint cases; class ownership; deleted copy/move; iterative destructor cleanup; const/noexcept; std::vector traversal results; assert/static_assert/type traits; reversed comparisons with std::reverse; cycle detection in a diagnostic. Explain that pointer assignment does not end object lifetime and that null prev/next alone do not prove nonmembership.

## Deliberate limits

Six starting nodes plus one insertion per trace; the comparison model is bounded at 1024 without snapshots. Addresses are deterministic teaching labels, not actual C++ addresses. Allocation failure injection and concurrency are out of scope. Memory view reserves fixed address-sorted positions, so gaps may appear; links, not screen position, define order. On narrow screens the diagram intentionally scrolls horizontally to preserve readable text. No undefined native corruption is executed. No shared framework/store, deployment, Chapter 0 or Chapter 6+ work was performed.

## Files created within Chapter 3 scope

- `cpp/chapter-03/DoublyLinkedList.hpp`
- `cpp/chapter-03/main.cpp`
- `src/visualizers/doubly-linked-list/model.ts`
- `src/visualizers/doubly-linked-list/diagram.ts`
- `src/visualizers/doubly-linked-list/adapter.ts`
- `src/components/visualizers/DoublyLab.astro`
- `src/components/visualizers/DoublyBreakIt.astro`
- `src/components/visualizers/DoublyComplexity.astro`
- `src/content/chapters/03-doubly-linked-list.mdx`
- `src/pages/chapters/03-doubly-linked-list.astro`
- `tests/unit/doubly.test.ts`
- `tests/unit/doubly-native.test.ts`
- `documentation/CHAPTER_03_NOTES.md`

Also shares the Chapter 2 manifest's linear native fixture and focused browser test files.

## Final handoff verification

All 307 focused chapter tests passed before the final counter refinement (87 semantic and 220 actual native parity cases); both canonical examples passed ASan/UBSan and leak detection. All 12 focused browser checks passed at 1440/1024/390 against an isolated server serving the existing production build. An intervening development-server run had two desktop state resets during concurrent HMR; the unchanged tests passed against the static build. No test was relaxed. Final collected Astro check: zero errors/warnings/hints. Parent owns the final consolidated production and regression run.

The doubly diagram now calls the parent's shared `arrowDefinitions(id)` helper in place of identical inline marker definitions; geometry and algorithms remain local. Stack inherits it through the Chapter 1 drawing function.

## User-requested visualization convention (2026-10-04)

The prev | data | next layout, directional entry points and explicit nullptr boundaries are now repository instructions in AGENTS.md and the visualization section of IMPLEMENTATION.md. Chapter 3 is the reference for future bidirectional diagrams. Canonical C++ and trace semantics are unchanged. Validation: 50 focused unit tests, 9 focused browser/routing cases, strict TypeScript for changed modules, production build, and the complete Chapter 1–5 browser regression (124 passed, 2 intentional skips). Revised Chapter 3 baselines were visually reviewed at all three widths; unaffected chapter baselines were retained. A later whole-workspace check encountered two errors in concurrent Chapter 9 work, outside this change.

Final counter refinement: erase emits Visit at `erase.compare`, after the non-null guard and when data is actually examined. Cursor assignment alone does not count a visit. Focused assertions verify missing target 99 visits all three nodes and middle target 20 visits two, including the adapter counter and source tag.
