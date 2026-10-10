# Chapter 05 implementation notes

Object ownership is external. Object embeds three fixed hooks (active/render/dirty); each hook has prev, next and an exact IntrusiveList owner pointer. A singleton's two null neighbor pointers never imply detachment. Lists and objects delete copy/move to keep borrowed identities stable. The external owner must outlive every list membership. List destruction iteratively clears its hooks; Object destruction asserts all hooks are detached. The native example declares objects before lists, enforcing safe reverse destruction order.

This deliberately uses a fixed HookKind and three-hook array rather than a generalized intrusive-container library. Membership ownership is not object ownership. The interactive independent-hooks scenario uses A/B/C in active, B/D in render and A/D in dirty, then unlinks the selected list head. Other hook chains remain unchanged. The UI's Remove detached object attempts to erase detached D; a separate native main case checks two distinct list instances selecting the same hook and rejects cross-list insert/erase.

Adapter: src/visualizers/intrusive-list/adapter.ts, export intrusiveAdapter, key intrusive. The chapter uses the shared source display, playback, diagram selection, node/arrow primitives, pointerInspector for live links, mental-model preview and pagination. State, all hook topology, invariant evaluation and routing remain chapter-owned. Logical identity order and sorted memory-address order each preserve positions throughout a trace. Prev and next use opposite outside rails; routes leave node boundaries so literal field labels and object captions remain readable.

Known-object insertion/removal and owner checks are O(1); traversal and clear are O(n). Traversal's values() helper has O(n) vector output storage. List link mutations allocate no nodes and destroy no external objects. The live counters demonstrate bounded rewiring, visit counts and zero objects destroyed. All browser examples are bounded to four external objects; no unbounded snapshot history is introduced.

Validation: 42 semantic tests and 108 canonical native parity cases passed. Native instrumentation compares executed tags, both endpoints of all three lists, every hook's prev/next/owner, traversal cursor and collected values after every tagged statement. Sanitizer-safe main covers empty/single/multiple membership, both traversal directions, head/tail/middle removal, clear/reinsert, exact-list membership guards, independent hooks and external owner ordering. C++20 warnings-as-errors, ASan/UBSan and leak checks passed with execution escalation after the sandbox's compiler-spawn limitation.

Prerequisites for parent's ledger: non-owning references, lifetime ordering and reverse local destruction, embedded hooks, membership tokens, enums/enum class, std::array, member access through references and pointers, nullptr and pointer identity, deleted copy/move, assert and NDEBUG limits, std::logic_error, noexcept cleanup, const observers, std::vector return values, conditional operator, iterative traversal, O(1) known-object rewiring versus O(n) lookup.

## Final focused browser and source validation

The combined Chapters 4–5 focused run passes 270 unit/native cases. A strict TypeScript/noUncheckedIndexedAccess check covering the chapter modules, unit tests, fixture imports and ownership browser tests passed. The focused ownership browser suite passes 15 checks across desktop 1440, tablet 1024 and touch/mobile 390. Tests exercise half-rewired deletion, reverse/reset, object preservation, independent-hook removal, singleton duplicate-insert rejection, source synchronization, keyboard inspection and both view geometries. SVG route sampling checks unrelated object rectangles and labels, including independent captions. No page overflow was observed.

Rendered screenshots were reviewed at /tmp/ownership-intrusive-{desktop,tablet,mobile}.png. Review moved the object column left for mobile and routed prev links directly from node boundaries to outside rails so neither literal field labels nor object captions are crossed. Link controls expose data-field, data-from and data-target. The initial preview and footer use the parent's StructurePreview/ChapterPagination contracts. Parent owns integrated build, shared regression, whole-book accessibility and visual consistency; no shared files were edited.

## Files created for Chapter 5

- cpp/chapter-05/IntrusiveList.hpp
- cpp/chapter-05/main.cpp
- cpp/chapter-05/parity.cpp
- src/visualizers/intrusive-list/model.ts
- src/visualizers/intrusive-list/adapter.ts
- src/components/visualizers/IntrusiveLab.astro
- src/content/chapters/05-intrusive-list.mdx
- src/pages/chapters/05-intrusive-list.astro
- tests/unit/intrusive.test.ts
- tests/unit/intrusive-native.test.ts
- documentation/CHAPTER_05_NOTES.md

Shared ownership test files (also listed in Chapter 4 notes): scripts/ownership-fixture.mjs and tests/e2e/ownership.spec.ts.

## Final review follow-up: shared markers and traversal scope

The adapter now reuses arrowDefinitions(id). It includes current among pointerInspector references only while values() is running, marks its current target in the SVG, and labels the selected hook explicitly. walk.return still has the in-scope null cursor; a following source:null IntrusiveScopeEnd removes the local reference. Visited objects and their counter remain as explicitly described traversal history. Native parity still compares all tagged cursor/value/topology snapshots exactly; only the semantic scope boundary is excluded, with dedicated scope tests verifying its behavior.

The latest combined focused run passes 272 tests; strict TypeScript validation passes. The primary agent's refreshed production build passes all 18 ownership browser checks, including scope exit at every viewport, within the complete 124-check browser regression. The integrated unit/native suite passes 738 tests. A prior stale-dist run was superseded by this production validation. Exact-file manifests above remain current; see MILESTONE_02_REVIEW.md for final cross-chapter evidence.
