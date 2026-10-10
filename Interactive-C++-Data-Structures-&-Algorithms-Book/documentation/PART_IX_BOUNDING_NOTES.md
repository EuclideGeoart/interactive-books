# Chapters 64–66 handoff

Implemented directly in the canonical shared checkout. No shared registries, navigation, source manifests, general C++ runner, types, geometry, presentation, or other agents' files were edited. Primary owns integration and browser/responsive review.

## Owned files and adapter contract

- `src/visualizers/spatial/bounding.ts`: `buildBoundingTrace(kind, operation, inputs)`, `boundingInvariants(state, settled)`, `boundingRegions(kind, operation)`, `boundingOperations`; `BoundingState extends SpatialState` adds authoritative `semantic` state. Immutable snapshots project nodes, objects, tables, metrics and statuses. Focus projects as `current` except explicit accepted/pruned/fault.
- `cpp/chapter-64/RTree.hpp`, `cpp/chapter-65/BVH.hpp`, `cpp/chapter-66/BroadPhase.hpp`, and each chapter's `main.cpp`: standalone C++20 namespaces `chapter64`, `chapter65`, `chapter66`.
- MDX and matching BookLayout routes: `64-r-trees`, `65-bounding-volume-hierarchies`, `66-broad-phase-spatial-indexing`. Each has Hero plus all 13 ordered Sections, shared SpatialPreview/Lab/Explorer, and CanonicalSource.
- `tests/unit/spatial-bounding.test.ts`, `tests/unit/spatial-bounding-native.test.ts`, `cpp/validation/spatial-bounding.cpp`, `scripts/check-spatial-bounding-cpp.mjs`.

| Kind | Operation IDs | Header | Source region |
|---|---|---|---|
| r-tree | build, insert, query | RTree.hpp | rtree |
| bvh | build, query, refit, rebuild | BVH.hpp | bvh |
| broad-phase | candidates, filter | BroadPhase.hpp | broad |

Regions carry both `@region` documentation and existing-engine `@begin`/`@end` markers. Every emitted tag resolves uniquely to an executable C++ statement, including completion tags. Broad `filter` is the useful explorer default because it exposes both candidates and exact AABB results.

## Routine algorithm decisions resolved locally

**R-tree:** recursive minimum area-enlargement insertion; ties by old area then numeric node ID. Overflow sorts entries by x-center then lexicographic ID (`N` labels for child nodes), and splits at floor((M+1)/2). Ancestor unions and recursive internal/root splits are explicit events. Occupancy minimum is floor((M+1)/2), maximum M; root leaf may hold one entry, internal root needs two, empty tree has no root. Siblings may overlap. This is a deterministic teaching R-tree, not R*-tree optimization.

Capacity is integer 2–6. Important caveat: M=2 permits unary internal chains. Ascending sequences of 8/12/16 boxes produce 28/66/120 nodes at depths 6/10/14, with full-domain query visits equal to those node counts. Model and native regression tests verify all three sizes; the model test injects the 16-object fixture through its input loader without widening the shared 12-object form limit. M=2 has O(n) height and O(n(h+1)) node storage/full-query work, hence O(n²) worst case; logarithmic height and linear storage arguments apply for fixed M>=3. The chapter and a dedicated regression test make this explicit. C++ insertion costs O(h M log M) plus amortized vector growth; query costs O(v M+k).

The R-tree lab retains all input-scene objects during construction, including not-yet-indexed ones. Inspectors explicitly label pending scene input versus stored leaf entries. Native RTree owns only objects passed to insert so far. Per-tag parity compares the shared algorithmic state and supplies pending native scene objects from the fixed test fixture; it does not claim byte-for-byte equality of different input ownership or UI state.

**BVH:** 2D AABBs, one object per leaf, longest centroid-extent axis (X on ties), sorted centroid median (ID ties). Duplicate centers still split. Refit changes the object, then leaf, then ancestors, preserving topology. Rebuild changes the object, clears the old grouping and rebuilds. During build, a pending group owns its object list until children are published. During mutations, enclosure checks remain pending until propagation completes. Hierarchy edges must use actual parent.children links, not infer publication from a child's parent field.

Builder sorting costs O(n log² n). Query worst case O(n), height O(log n). Refit's ancestor work is O(log n), but this teaching implementation scans for object/leaf, so full move cost is O(n). No SAH or ray/primitive intersection implementation is claimed; ray traversal and production builders are discussed conceptually.

**Broad phase:** real 2D/3D full AABB grid coverage, inclusive floor(min/size)..floor(max/size), including maximum faces and negative cells. Canonical lexicographic object-ID pairs are deduplicated globally, then exact AABB filtering enumerates each unique pair once. Exact AABB overlap never claims true shape collision. Cells use full integer keys, not hash bucket identities. C++ uses ordered map/set; TypeScript uses simple bounded arrays plus a pair set. Counts are mechanical and complexity prose distinguishes their lookup costs.

Guard: at most 4,096 total cell memberships, cell size 1–8. Oversize scenes throw explicitly without dropping objects or pairs. 3D overlap at size1 is rejected; size2/4/8 work. Trace records one snapshot after each object's complete grid insertion, one per newly published pair, one per exact test, and completion; duplicate attempts still count. Native ID lookup during filtering is a linear scan, documented O(Cn), although AABB test count is exactly C.

All labs use shared finite coordinates [-8,8], closed inclusive overlap, valid zero extents, and custom parsing (up to 12 initial objects). Insert adds ID `new`; refit/rebuild default target A and box 1,1,3,3. Canonical callable examples permit at most 16 objects. Observers must be nonthrowing and nonreentrant, and must copy state to retain it. No external geometry dependency.

## Validation

- `vitest run tests/unit/spatial-bounding*.test.ts`: **83 tests pass** (48 model/input/source tests, 35 native tests).
- Independent exhaustive overlap/pair oracles cover empty, singleton, boundaries, duplicate coordinates, clustered, overlapping and sorted scenes; all sampled immutable snapshots run chapter-specific invariants.
- Native per-tag parity checks every hierarchy node's bounds/parent/children/items, root, scene object bounds, results and counters across all operations; R-tree capacities 2–6. It includes split half-states, unpublished child/sibling links, moved-object/stale-bound refit steps, and rebuild clearing.
- Broad native per-tag parity checks every cell's coordinates/members, canonical candidate/exact lists, object bounds and counters in 2D and 3D. Presentation-only status/focus/table/phase fields are intentionally outside native parity; projection focus and pending-input details have separate tests.
- Native validation additionally checks **140 seeded scenes**, independent queries and pair oracles, recursive reachability/occupancy/equal R-tree leaf depth, BVH ownership/enclosure, refit/rebuild and invalid guards. All three standalone mains run.
- `node scripts/check-spatial-bounding-cpp.mjs`: C++20, `-Wall -Wextra -Werror -pedantic`, **ASan + UBSan + leak detection pass under escalation**. The ptrace sandbox prevents LeakSanitizer; outside that wrapper all enabled sanitizers pass. Runner defaults to leak detection and honors explicit ASAN_OPTIONS for constrained environments.
- Native tests require permission to spawn the compiler; sandboxed Vitest workers returned EPERM, escalated runs passed. No workaround or skipped native tests was committed.
- No bounding TypeScript diagnostics were found. Full-project check/build, shared integration, browser keyboard/accessibility and 1440/1024/390 screenshots remain primary-owned; do not infer those results from these domain tests.

## Prerequisite additions for primary's ledger

Actual usage: small AABB structs, finite-number validation (`std::isfinite`), floor with negative coordinates, `std::array` for active-dimensional grid coordinates, `std::vector` ownership and index stability versus reference invalidation, deterministic `std::sort` and tuple/pair ordering, recursive traversal/build, parent indices, union/enclosure, `std::map` exact keys, `std::set` deduplication, const observer callbacks and `std::function`. No custom hash, external geometry library, atomics, or new Chapter 0 material.

## Known scope limits

R-tree deletion/underflow and production split heuristics; BVH SAH, leaf lookup acceleration, rays and 3D BVH lab; detailed narrow-phase geometry and continuous/swept collision detection are outside the requested canonical operations. Broad mode is truly 3D. Workload comparison across all six indexes is qualitative, with actual counts only for the selected executable model. No wall-clock performance claims, geometry-engine dependency, or changes beyond Chapter 66.
