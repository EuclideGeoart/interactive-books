# Chapters 2–5 — architecture decisions

Date: 2026-10-04. Baseline: accepted Milestone 1, inspected in the existing workspace. This directory has no Git metadata; there is no branch or commit to report. The user's bundled milestone and explicit architectural ruling govern scope. Chapter 0 is deferred until the wider curriculum is complete.

## Playback carries snapshots, not structure semantics

Evidence: `src/engine/playback.ts` only indexes `trace.initial` and `trace.steps`, advances a timer, and invokes a callback. Its original `MemoryState` annotation was stronger than its actual dependency. `src/engine/memory.ts` intentionally requires live objects for pointer assignments and reserves `Allocate` for previously unseen addresses. Those rules correctly represent the Chapter 1 heap allocation model but cannot represent an array's index or a pool's free storage.

Alternatives considered:

- Add array indices, pool slot states, free-list rules and intrusive ownership to the shared memory reducer. This would couple structure-specific rules and make Chapter 1 semantics harder to audit.
- Duplicate playback controllers for new chapters. This would duplicate timer, seek, reverse and reduced-motion-independent stepping behavior.
- Parameterize `Trace`, `TraceStep` and `PlaybackController` over state/event types, retaining the original default types. Each chapter then uses its own state and reducer where the shared memory events do not apply.

Ruling: use the third option. This is a compile-time typing change; playback runtime behavior remains unchanged. Generic memory events are reused only when their existing semantics match. No universal event registry, topology engine, global store, or frontend framework is introduced.

Validation: preserve all Chapter 1 playback/memory/native parity tests. New chapter tests exercise actual reverse snapshots and source-tag order. Revisit only if measured trace sizes require checkpointed replay; this milestone uses bounded small experiments.

## Shared lab is presentation glue

Evidence: Chapter 1's `src/scripts/lab.ts` owns both list-specific loading/invariants and generic playback/source controls. The new stack has two concrete representations, and the authorized doubly linked list needs identical interaction controls with different semantics.

Ruling: `TraceLab.astro`, `trace-lab.ts` and the small `LabAdapter` type share form submission, playback, source highlighting, SVG selection, inspector placement and invariant presentation. The adapter owns trace construction, drawing, inspection, description, invariants and source regions. It is not a node schema or visualization framework. Existing Chapter 1 continues to use its accepted model and UI during implementation; final reuse review will assess any justified small consolidation.

`PlaybackController` is not allowed to infer topology, ownership, list direction, slot order, membership or object lifetime. SVG node geometry and `pointerInspector` remain available independently of the lab shell.

## Ownership and lifetime requirements

The pool must treat the backing slots as persistent storage. Free-list metadata and a live user object are different occupants. Reserving storage does not construct a user object. Destruction does not return storage. A new object can reuse the same teaching address. These are chapter-owned semantics; a freed heap-node tombstone must not be reinterpreted as a pool slot in the generic reducer.

The intrusive list uses an explicit membership mechanism. A sole member may have null prev/next, so those fields alone cannot prove detachment. External owners retain objects after unlink. An owner/list pointer or equally correct token guards double membership; the final implementation and tests must verify the selected mechanism.

## Baseline verification before integration

- Astro: 0 errors, warnings, hints.
- Vitest: 158 passing tests, including the 120 existing native/source parity cases.
- Chapter 1 native: C++20, warnings as errors, AddressSanitizer, UndefinedBehaviorSanitizer, leak detection.
- Browser: 43 passing, 2 intentionally inapplicable mobile-only cases skipped on desktop/tablet, using `/opt/google/chrome/chrome` because the expected Playwright browser installation was absent.
- Existing Chapter 1 screenshot baselines pass before navigation changes.

Final cross-chapter reuse, source parity, lifetime, SVG routing, accessibility and visual review findings are recorded in [the consolidated milestone report](MILESTONE_02_REVIEW.md). The primary review confirms the boundaries above; the original memory reducer remains unchanged.

## Diagram interaction reuse

The completed stack and pool adapters provide concrete second uses for SVG selection, focus restoration, link endpoint emphasis, view switching, text fallback and inspector presentation. `InspectionDiagram` extracts those DOM behaviors from the new lab glue so `StructurePreview` can present the same starting state before the execution section. Neither class can traverse or mutate a chapter model. Unique diagram IDs scope SVG markers. Pointer focus restoration includes source and label, because doubly linked structures can have two distinct links targeting the same object.

## Pool lifetime review

The native pool uses a union containing `T` and a free-list pointer, with external metadata. The union is sufficient for both size and alignment. Placement construction explicitly names the object member; returning storage placement-constructs the pointer member. The pointer returned by constructing `T` is retained and used for destruction. These choices follow the language's rules for [union member activation](https://eel.is/c++draft/class.union) and [object lifetime](https://eel.is/c++draft/basic.life).

Review identified an early trace that described a bookkeeping boolean assignment as ending the free-list pointer lifetime. That was corrected: the relevant bookkeeping and placement expression are presented at a single completed statement boundary. Throwing construction is represented as a failed new-expression, with cleanup restoring free-list membership. Native parity checks must distinguish lifetime from phase metadata between adjacent statements.

The pool's checked address lookup scans known slots using equality. Its public operations therefore include O(N) validation even though the actual free-list splice is O(1). The UI and prose must not describe the entire checked implementation as constant-time or categorically faster than new/delete.
