# Milestone 2 — Chapters 2–5 implementation and integration review

Date: 2026-10-04. Status: implementation complete; ready for the user's milestone review.

The accepted Chapter 1 implementation and its original test suite remain the regression floor. The master plan remains authoritative, with the user's explicit deferral of Chapter 0. This bundle ends at Chapter 5. Nothing was deployed.

## 1. Chapters completed

| Chapter | Implemented learning model |
| --- | --- |
| 2 — Stack | LIFO before representation; fixed-array and owning linked implementations; push, pop, top, empty and clear; overflow/underflow; logical membership versus retained array values; exact linked destruction/freeing; interactive allocation, space and work comparison. |
| 3 — Doubly linked list | Front/back insertion; head/tail/value deletion; both traversals; empty/singleton/duplicate/custom presets; separate forward/backward rewiring; owning destruction; reciprocal and endpoint invariants; five controlled Break-It faults; model-based search/unlink complexity. |
| 4 — Memory pool | Correctly aligned union blocks; independent storage and object lifetimes; allocation, placement construction, explicit destruction and return; separate free-list assignments; saved local block inspection; physical slot grid versus free-list topology; reuse, exhaustion, invalid/double/live returns, dead-object read rejection and throwing-constructor cleanup. |
| 5 — Intrusive list | Externally owned objects; insertion, head/tail/middle removal, clear, reinsert and both traversals; visible survival after unlink; exact list-owner membership tokens; singleton and wrong-list guards; independent active/render/dirty hooks. |

Each chapter has a hero, interactive mental model, intuition, memory discussion, synchronized execution lab, complete downloadable C++ header/example, inspector, invariants, complexity explanation and controls/counters, common mistakes, edge cases, analogy, engineering discussion, exercises, summary, progress and adjacent-chapter navigation. Book search covers all five implemented chapters.

## 2. Architecture changes

The original ruling is preserved: the shared engine does not own topology, traversal, slot reuse, membership or chapter invariants. Decisions and alternatives are recorded in [MILESTONE_02_ARCHITECTURE.md](MILESTONE_02_ARCHITECTURE.md).

- `Trace`, `TraceStep` and `PlaybackController` now accept state/event type parameters, with Chapter 1's original types as defaults. Playback runtime behavior is unchanged; the original memory reducer is unchanged.
- A small `LabAdapter` connects chapter trace construction, drawing, description, inspection, invariants and source regions to a common lab shell. `TraceLab` shares controls and code synchronization; `InspectionDiagram` shares DOM selection, reference following, view switching and focus preservation.
- `StructurePreview` uses the same chapter adapter for the mental model. Shared hero, canonical-source and pagination components retain the established visual system.
- A chapter registry supports current navigation, cross-book search and chapter-specific progress. Source endpoints expose only canonical headers and examples, excluding native parity drivers. Paths support `BOOK_BASE`.

There is no new dependency, frontend framework, global store, universal node schema, event plug-in registry or visualization engine. Two subagents worked in distinct chapter file scopes; the primary agent alone integrated shared changes and reviewed the final bundle. The workspace has no Git metadata, so no branch, commit or PR is claimed.

## 3. Abstractions reused and cross-chapter review

| Reviewed area | Final decision and concrete reuse |
| --- | --- |
| Playback and snapshots | One controller serves all chapters. It selects snapshots and never interprets their contents. |
| Semantic memory events | Chapter 1, the linked stack and the doubly linked list reuse allocation, construction, pointer/reference assignment, visits, destruction, freeing and scope events where those meanings match. |
| SVG primitives | Node frames, named pointer fields, addresses, arrows and escaping are reused. Identical arrow-marker definitions were extracted after actual repetition in multiple chapters. |
| Inspection | The existing lifetime-aware pointer inspector handles singly/doubly linked nodes and intrusive hooks. Shared DOM handling follows nodes/links/references and preserves keyboard focus, including distinct links with the same target. |
| Source and controls | Canonical source parsing/highlighting is reused. Chapters 2–5 share loading, stepping, reverse/reset, timers, scrubbing, before/after, source jumps, mobile code echo and invariant presentation. |
| Layout and routing | Remain chapter-owned. Similar boxes do not imply interchangeable placement or arrow routing rules. |
| Lifetime and storage rendering | Owned heap-node tombstones reuse existing primitives. Array membership, reusable pool storage and externally owned intrusive objects retain distinct meanings and labels. |
| Accessibility | Existing semantic controls, text alternatives, theme tokens, focus styles and mobile inspector/dock conventions are reused. |

Chapter 1's accepted lab host and controlled-fault widget were not migrated solely to remove superficial duplication. They continue to share the engine, source tools, primitives and inspector. The new shared DOM helper has concrete lab and preview consumers; chapter fault widgets retain their small, local corruption controls.

## 4. Intentionally chapter-specific abstractions

- Stack array indices, raw integer values, capacity guards and comparison work model.
- Doubly linked reciprocal relationships, endpoint transitions, guarded broken walks, fixed node slots and bidirectional routes.
- Pool phase versus actual union-member lifetime, free-list topology, address validation cost, fixed physical slots, reuse and its storage inspector.
- Intrusive exact-owner tokens, all three independent hook sets, external lifetime contract, traversal cursor and object layout.

Small lab experiments retain snapshots. Stack/list complexity explorers count model work up to 1024 elements without retaining a full mutation history. Pool and intrusive experiments are explicitly bounded. This milestone supplies no evidence requiring checkpointed replay or a broader state framework.

## 5. Native C++ and semantic validation

All five canonical examples pass C++20 compilation with `-Wall -Wextra -Werror -pedantic`, AddressSanitizer, UndefinedBehaviorSanitizer and `ASAN_OPTIONS=detect_leaks=1` through `npm run test:cpp`.

The integrated Vitest suite passes **738 tests across 11 files**:

| Coverage | Passing cases |
| --- | ---: |
| Semantic, ownership, playback, reuse and counter checks | 186 |
| Chapter 1 native/source parity | 120 |
| Stack native/source parity | 60 |
| Doubly linked list native/source parity | 160 |
| Pool native/source parity | 104 |
| Intrusive native/source parity | 108 |
| Total | 738 |

Native fixtures instrument the shipped headers. They compare executed source-tag order and observable state at each tagged statement, including nested helpers, pool phase/lifetime metadata and all intrusive hooks. Semantic tests additionally cover lifetime substeps and untagged scope boundaries. They do not pretend that a JavaScript trace executes C++ in the browser.

Native edge cases include empty/singleton operations, missing/duplicate values, overflow/underflow, cleanup, independent traversal directions, membership rejection and safe owner destruction order. Pool validation includes `alignas(128)`, fixed exhaustion, foreign pointers, double return, live-object return rejection, address reuse and construction failure.

Integration review refined union-member activation and retained placement-new pointers; separated lifetime from bookkeeping; made local pool/traversal references disappear at scope exit; and corrected doubly linked value-search visit counters. These were validated before final acceptance review.

## 6. Frontend and browser validation

- Astro/TypeScript: **zero errors, warnings or hints** across 92 checked files.
- Production build: six pages (entry plus Chapters 1–5), canonical source endpoints and static assets generated successfully.
- A separate `BOOK_BASE=/book/` production build succeeded; generated chapter navigation, downloads and asset paths were inspected for correct prefixes.
- Playwright: **124 passed, 2 skipped** across 1440×1000, 1024×900 and 390×844 touch/mobile. The two skips are the unchanged Chapter 1 mobile-only dock test in the desktop/tablet projects.
- The original Chapter 1 suite and screenshot baselines pass without weakened assertions or rewritten baselines.
- Browser coverage includes every operation control, boundary presets, exact reverse state, reset, play/pause/speed/seek, source-line jumps, helper source, inspector and keyboard following, scope exit, both themes, progress isolation, cross-book search, navigation and canonical downloads. Parity driver URLs return 404.
- No page-level horizontal overflow or browser runtime errors were observed in the tested paths.
- SVG path sampling checks unrelated node rectangles and labels in both representations, including each small intermediate snapshot of multi-row doubly linked insertion, reordered free lists and independent intrusive hooks.

Browser validation used the installed `/opt/google/chrome/chrome`. The default Playwright browser executable was unavailable on this machine. Compiler/browser/listener subprocesses required the environment's execution escalation; the validations themselves completed successfully.

## 7. Accessibility validation

Automated axe checks for WCAG 2 A/AA and 2.1 AA pass for Chapters 1–5 in light and dark themes at all three widths. Browser interaction checks exercise keyboard-operable SVG nodes and links, source controls, visible inspector opening, focus retention, and mobile controls that remain in view with the diagram. Text representations and status/invariant descriptions provide alternatives to interpreting colors and arrows.

This preserves the accepted automated and keyboard interaction floor. It is not a claim of a complete assistive-technology audit; screen-reader application testing and Firefox/WebKit remain outside the verified matrix.

## 8. Visual review

Reviewed Chapters 1–5 together using rendered desktop, tablet and mobile captures, in light and dark themes. Typography, navy code surfaces, labels, controls, inspectors, counters and state colors remain consistent. Green denotes live values, amber denotes the active operation or temporary transition, and red marks invalid or ended heap-object states. Free pool storage stays neutral; destroyed-but-retained pool storage is not rendered as a released heap allocation. Unlinked intrusive objects visibly keep their values and live frames.

The pass covered chapter entries, default labs, linked destruction, half-rewired deletion, each pool lifetime boundary, physical free-list reordering, surviving intrusive objects, independent hooks, comparison/complexity panels and a broken backlink. Review corrected small node rendering, pointer routes near labels, pool state colors, intrusive mobile placement and a compressed mobile preset selector. Wide diagrams/code scroll inside their own panels to retain legible fields.

New regression baselines: **28 images** in `tests/e2e/bundle-visual.spec.ts-snapshots/` (entry/lab at three widths and dark desktop for each new chapter). Chapter 1's existing baselines were retained. Supplementary review evidence is in `tests/visual/bundle/`, reproducible with `scripts/capture-bundle.mjs` and `scripts/capture-states.mjs` against a running preview.

## 9. C++ prerequisite ledger

[CPP_PREREQUISITE_LEDGER.md](CPP_PREREQUISITE_LEDGER.md) records actual canonical/example usage: fixed arrays and indexing, value initialization, exceptions, result vectors, reciprocal pointer fields, assertions/invariants, template capacity, size/alignment and unions, active members, placement new, explicit destruction, `void*` and casts, forwarding, traits and exception cleanup, non-owning references, owner tokens, independent hooks and destruction order. It distinguishes implementation concepts from validation-only uses.

Chapter 0 remains unimplemented and should later be derived from this ledger after the broader curriculum is complete.

## 10. Known limitations

- Browser validation is Chromium on Linux, not Firefox/WebKit or a full screen-reader audit.
- Teaching addresses and memory-size examples are deterministic illustrations, not a running native allocator's addresses or portable ABI guarantees. Browser experiments use verified bounded traces, not an embedded C++ compiler.
- The fixed stack contains integers and has capacity five. Linked-stack labs allow five initial nodes; doubly linked labs allow six, with one additional insertion. Pool labs allow one to six slots; intrusive labs keep four external objects. Complexity demonstrations are bounded to 1024.
- The pool is fixed-capacity, type-specific and single-threaded. Public address guards are O(N); only the free-list splice is O(1). It is not a standard allocator interface and cannot detect stale borrowers after address reuse without generation information.
- Intrusive users must keep objects alive and immovable until every hook is detached. Debug assertions diagnose misuse but cannot replace the lifetime contract in release builds.
- Heap allocation failure and native address reuse are not injected into the linked visual labs. Pool exhaustion and construction failure are explicitly modeled and natively tested.
- Progress is browser-local. No deployment, account sync, Chapter 0 or Chapter 6+ implementation is included.

No known high-severity correctness, lifetime, pointer, visualization or responsive defect remains within the implemented and tested scope.

## 11. Recommended next bundle

After this milestone is reviewed, proceed with Chapters 6–9: Queue + Deque, Circular Buffer / Ring Buffer, Priority Queue, and Binary Heap. Carry the full Chapter 1–5 suite forward as the regression floor. Continue choosing representation and local invariants before promoting any new shared abstraction. Extend the prerequisite ledger as concepts are actually used. Do not start that bundle or Chapter 0 as part of this milestone.

## Reproduce the integrated checks

```sh
ASTRO_TELEMETRY_DISABLED=1 BOOK_TEST_PORT=4322 CI=1 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/google/chrome/chrome npm run validate
```

The final review used a production preview on port 4323 and the equivalent individual commands, allowing screenshot review between build and browser validation. Run the preview on a free port, and avoid concurrent Astro dev/check generation during final browser validation.
