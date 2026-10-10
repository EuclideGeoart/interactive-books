# Implementation and authoring

This supplements the master plan; it does not replace it.

## Data flow

1. `cpp/chapter-01/SinglyLinkedList.hpp` defines the canonical C++.
2. `src/visualizers/linked-list/model.ts` translates an operation and initial state into semantic events.
3. `src/engine/memory.ts` applies each event to a fresh state. Lifetime is explicit: allocated → live → destroyed → freed.
4. `src/engine/playback.ts` indexes those snapshots. Its timer only advances an index; animation never mutates the model.
5. `src/scripts/lab.ts` presents that same snapshot to the diagram, inspector, counters, invariants, source highlight, and mobile control caption.

Previous and Reset select earlier states; they do not attempt inverse mutations. Replaying identical inputs gives identical addresses, events, and states. Local pointers can remain dangling after `delete` until `EndScope`; their address remains visible but fields are unavailable.

## Reuse boundaries

| Area | Responsibility |
| --- | --- |
| `src/engine/types.ts`, `memory.ts` | Lifetime-aware objects, arbitrary named pointer fields, reference assignments, comparisons, visits, return results, and semantic snapshots. |
| `src/engine/playback.ts` | Chapter-independent playback, speed, seek, pause, reset, cleanup. |
| `src/engine/source.ts` | Canonical source regions and line-to-event mapping. |
| `src/components/visualizers/primitives.ts` | Data-node frames, selectable pointer fields, reference arrows, address labels, text escaping. Field schema is supplied independently of object lifetime. |
| `src/components/memory/inspector.ts` | Arbitrary pointer fields, live/dead storage, and local references; no traversal logic. |
| `src/visualizers/linked-list/` | Singly linked algorithms, forward topology, invariants, and diagram layout/routing. |
| `src/components/book/`, `src/layouts/` | Book/chapter shell, section rhythm, navigation, and prose callouts. |
| `src/content/chapters/` | Authored MDX prose, teaching examples, explanations, challenges. |

Nodes keep fixed slots through a trace. Logical order is defined by arrows, not by screen position. Memory view sorts illustrative addresses; it does not change the topology. Allocated and freed storage stays visible during that experiment. Re-loading starts an independent experiment; the UI does not silently commit half-finished traces.

The snapshot lab is deliberately capped at six starting nodes (plus one insertion). Snapshot storage scales with objects × events. The 8–1024-node complexity explorer instead walks the same node representation with a counter and no snapshot history. If a later chapter needs large replayable traces, introduce checkpointed replay based on measured needs.

## C++ synchronization

The header has non-executable `@begin`/`@end` region markers and stable `@trace` tags. The renderer extracts and highlights canonical text at build time with Shiki. Downloads remove teaching annotations while preserving canonical line numbers. There is no hand-maintained second implementation in the page.

A native fixture generator instruments the tagged statements and conditions in a temporary copy of the **actual header**. Vitest compiles it and compares:

- executed source-tag order;
- the entire reachable value chain after every tagged statement;
- insertion, deletion, search, clear, missing targets, duplicates, and empty/single-node inputs.

Substeps of a new-expression and delete-expression share their C++ line. The parity check collapses adjacent events on that line to compare against the native statement boundary. Generic memory tests separately verify that construction, lifetime end, freeing, and local dangling references have the required states. The native example runs with address, undefined-behavior, and leak sanitizers.

The browser does not compile user C++. Its deterministic model illustrates the canonical successful allocation path. Native addresses, allocator reuse policy, allocation failure injection, ABI padding, and elapsed CPU timing are not simulated.

## Invariants

Singly linked invariants are chapter-owned, not baked into the generic event reducer. The checker follows a bounded chain and identifies cycles and invalid lifetimes without dereferencing dead storage.

- A completed operation must leave every live object reachable.
- Temporary detached live objects are amber while an insertion/deletion is in progress.
- Structural links into dead storage always fail.
- Saved local dangling pointers are explicitly reported and never inspected as objects.
- `EndScope` removes local references but does not delete owned nodes.

Break-It experiments use a separate model and restore action. They never feed corrupt state into an ordinary C++ operation or execute native undefined behavior.

## Design and accessibility

`src/styles/book.css` owns role-based color, type, spacing, and responsive rules. Deep navy identifies the chapter and code surfaces; neutral surfaces support reading. Green marks live data, blue marks pointers, amber marks execution/temporary state, and red marks invalid state. Symbols and explanatory text accompany status colors.

The diagram uses separate SVG nodes, fields, arrows, labels, and addresses. Nodes and links support pointer, touch, Enter, and Space. Selecting a link identifies its endpoints; following a field selects its target. The inspector expands on selection on mobile. Graph, tree and heap diagrams fit their complete viewBox inside the panel by default, with no horizontal or vertical diagram scrolling. The shared Fit diagram / Actual size controls restore native scale for dense labels; selection also exposes full-size inspector text. Node coordinates, topology and trace semantics remain chapter-owned and unchanged. Other diagrams and tables retain their own contained scrolling. Mobile playback stays in view and repeats the actual highlighted source line.

Navigation/search use native dialogs with focus containment and Escape. Controls have labels and focus styles. Reduced-motion preferences disable the brief hero reading cue and pointer emphasis; semantic stepping remains unchanged. Search and progress need no service. Local-storage failures do not prevent reading or interaction.

## Bidirectional node visualization rule

User-approved convention, 2026-10-04; also recorded in the repository's `AGENTS.md` for future agents.

Draw a bidirectional node as **`[prev | data | next]`**. The centered value separates the two directional fields. The previous link leaves left and enters the predecessor's right boundary; the next link leaves right and enters the successor's left boundary. Separate incoming and outgoing link heights so a return arrow cannot be mistaken for the other field's outgoing pointer. Head/tail markers point to the node frame above its central area, with distinct markers when both identify a singleton.

For null-terminated lists, write `nullptr` explicitly in head's prev field and tail's next field. Both are null for a singleton; both external references are null when empty. Circular/sentinel structures must depict their actual links instead of inheriting null endpoints. Likewise, intermediate or deliberately broken states must show their actual pointer values.

Use short links between adjacent nodes and outside lanes for longer connections. Arrows must avoid unrelated nodes and labels in both logical and memory representations. Positions remain stable during a trace. Field order is a diagram convention, not a physical C++ member-offset guarantee.

Chapter 3's `drawDoubly` is the reference. It reuses `dataNode(..., ['prev', 'next'], 1)` to place data between pointer fields; the default remains compatible with existing one-way diagrams. Apply the same convention when creating or revising other bidirectional views, including selected intrusive hooks, while retaining chapter-specific ownership, invariants and routing. Verify desktop/tablet/mobile rendering, null boundaries, half-rewired states, keyboard inspection and route geometry before accepting new baselines.

## Add the next chapter

1. Preserve the master plan's learning order and implement the next authorized chapter only.
2. Write and compile its canonical native source; specify ownership, error behavior, and edge cases first.
3. Reuse existing semantic events; extend the discriminated union only for an operation with new semantics.
4. Keep its topology, invariants, trace builder, and layout under its own `src/visualizers/` directory.
5. Reuse the node/field/arrow/address primitives, inspector, source presentation, and playback controller.
6. Compose the MDX chapter with `Section`, code, and interactive components. Add an available route only when it is real.
7. Add differential native tests and browser cases for new ownership/pointer mechanics. Inspect 1440/1024/390 screenshots and dark mode before accepting new baselines.

Doubly linked lists pass `['prev', 'next']` and data index `1` to the node primitive and reuse the inspector; they still need their own backlink invariants, operation trace, and routing. Allocators can reuse lifetime state, references, field inspection, and address labels; contiguous block geometry and placement-construction semantics must be implemented when that chapter is authorized.

## Chapters 2–5 extension

`Trace<S, E>`, `TraceStep<S, E>` and `PlaybackController<S, E>` now accept chapter-owned state and event types. Their defaults retain the original `MemoryState`/`TraceEvent` contract. Playback still only selects immutable snapshots; no topology or operation rules entered the controller or the memory reducer.

The additional chapter directories are `stack`, `doubly-linked-list`, `allocator`, and `intrusive-list`. Each supplies its own model and a small presentation adapter. `TraceLab.astro` and `trace-lab.ts` bind the adapter to common controls and canonical source regions. `InspectionDiagram` binds SVG selection, views, keyboard focus and inspector rendering; `StructurePreview` uses it for the chapter's initial mental model. None of those presentation modules interprets an address, follows a link or decides membership.

- The array stack stores a numeric logical index and retained int values. Linked stack reuses Chapter 1 memory events, invariants and geometry.
- Doubly linked ownership uses the same live-object representation and generic events, with chapter-specific reciprocal invariants and bidirectional routing.
- Pool state tracks persistent slots, active occupants, reserved storage, actual object lifetime, phase metadata and free-list topology separately. It does not reinterpret the heap reducer's `Free` event.
- Intrusive state separates stable externally owned objects from hook membership. Its inspector adapts live link fields to the existing pointer inspector and adds membership tokens.

`CanonicalSource.astro` renders tested native sources with Shiki. The source endpoint publishes only each canonical header and `main.cpp`; parity harnesses remain test implementation details. New native fixtures instrument the shipped headers to compare executed source tags and statement-boundary storage/topology against semantic snapshots.

The book shell receives chapter number/title, stores progress under distinct chapter keys, and searches all available MDX sections. Search uses a build-time index; runtime diagram state is not embedded into authored prose. `ChapterPagination` respects `BOOK_BASE`. Chapter 0 remains planned for after the broader curriculum; `CPP_PREREQUISITE_LEDGER.md` records current usage.

See `MILESTONE_02_ARCHITECTURE.md` for the source-grounded rulings and the consolidated milestone report for final validation and visual review.

## Part IV — hashing

Chapters 18–23 keep the generic playback and semantic event infrastructure unchanged. `src/visualizers/hashing/hash.ts` defines the same bounded teaching-key hash as `cpp/chapter-18/TeachingHash.hpp`; chapter models own mapping, chaining, probing, rehashing, and their invariants. Chapter 19 deliberately reuses Chapter 20's chained map as its concrete implementation.

`hashing/presentation.ts` contains only selectable cell frames, inspector rows and SVG wrappers using the existing primitives. Chaining owns next-link geometry. Open addressing and Robin Hood own their indexed slot projections and replacement tables. `hash-labs.ts` mounts existing `TraceLab`/`InspectionDiagram`, retains native source synchronization, and adds arrow/Home/End focus navigation plus scrolling within hashing diagrams. The public `std::unordered_map` view models guarantees and lower bounds, never a vendor's internal slots or bucket-growth sequence.

Do not confuse a freed chain node with an open-addressing tombstone. Do not reuse the tombstone policy for Robin Hood backward shifts. Any later shared indexed-container abstraction must demonstrate equivalent semantics with Chapters 6–9; matching rectangles alone do not justify one. Architecture rulings and final acceptance evidence are in `PART_IV_ARCHITECTURE.md` and `PART_IV_REVIEW.md`.

Probe metadata and public-contract summaries sit outside the diagram scrollport, so horizontal scrolling retains the incoming record, probe path and handle guidance. This is a hashing mount behavior, not a new playback responsibility.

## Part IX — spatial indexes

Chapters 60–66 reuse `TraceLab`, immutable playback, source tags, inspection and SVG primitives. `src/visualizers/spatial/partition.ts` owns hash/quadtree/octree/KD semantics; `bounding.ts` owns R-tree/BVH/broad-phase semantics. `types.ts` describes their presentation vocabulary, while `geometry.ts` supplies bounded predicates and input parsing. Invariants, ownership and traversal remain structure-owned.

`presentation.ts` projects fixed world coordinates and stable creation-order hierarchy rows. A parent-child arrow exists only when the parent's actual child list publishes it, including split/build half-states. 3D scenes have XY and XZ projections with full bounds in inspection. Closed query/object bounds include touching faces and zero extent. Point cells use floor and subdivision equality goes high; those distinct ownership rules are explicit in each chapter.

`SpatialLab`, `SpatialPreview`, `SpatialExplorer` and `spatial-labs.ts` bind those models to existing controls. Coordinate SVGs fit by default and support Actual size. Long tables/hierarchies keep contained scrolling, readable text and keyboard inspection. Current, visited, pruned, candidate and accepted states use text/glyphs as well as color. Counters measure algorithm events; snapshot copying and browser rendering are not performance claims.

Standalone C++20 sources live in `cpp/chapter-60` through `cpp/chapter-66`. The spatial native runners join `scripts/check-cpp.mjs`; source downloads strip trace markers. Oracle, per-statement native parity, unit and browser evidence is consolidated in [the Part IX review](PART_IX_REVIEW.md). Preserve Chapters 1–50 and concurrent Part VIII when updating shared registries or source manifests. Inspect host processes before any build; run builds sequentially and use a frozen production output for browser regression.
