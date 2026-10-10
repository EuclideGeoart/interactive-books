# Part IX partition handoff (Chapters 60–63)

Source names: `cpp/chapter-60/SpatialHash.hpp`, `61/Quadtree.hpp`, `62/Octree.hpp`, `63/KDTree.hpp`, each with standalone `main.cpp`.

Adapter API in `src/visualizers/spatial/partition.ts`: `buildPartitionTrace(kind, operation, inputs)`, `partitionInvariants(state, settled)`, `partitionRegions(kind, operation)`, `partitionOperations`.

Operation IDs: spatial-hash build/insert/remove/update/range; quadtree and octree build/insert/range/point; kd-tree build/range/point/nearest. Shared SpatialLab/SpatialPreview/SpatialExplorer take `{kind}`. Page slugs follow assignment.

Policies: bounded finite coordinates [-8,8]; closed queries/root; floor grid coordinates; 7 deterministic hash buckets with full cell-key comparisons; quadtree point-only with four allocated children, octree point-only with sparse occupied octants; high-side subdivision ties; max-depth overflow allowed; KD alternating x/y, median sorted by coordinate then ID, nearest equal-distance tie smallest ID, visit opposite side on equal plane distance. AABB storage extensions are prose policies, not supported insertion types.

Canonical region markers use the repository's `@begin`/`@end` parser (with `@region` descriptions), exact `@trace` markers. Primary owns shared integration and browser verification. Further test results and limits added at completion.
