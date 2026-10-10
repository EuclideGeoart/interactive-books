# Part IX — Spatial Data Structures review

Scope: Chapters 60–66, implemented directly in `/work/Interactive C++ Data Structures & Algorithms Book`. Review date: 2026-10-04. Chapters 1–50 remain the accepted regression floor; concurrent Chapters 51–59 are preserved. Chapter 0 and later subjects remain deferred. No isolated delivery/import is required.

## 1. Chapters completed

| Chapter | Implementation and interactive operations |
| --- | --- |
| 60 — Spatial Hashing | Full cell keys and seven hash buckets; build, insert, remove, move and closed range/neighborhood query; cell-size explorer. |
| 61 — Quadtrees | Point insertion, four-way subdivision and redistribution, depth/capacity controls, exact point and range query with pruning. |
| 62 — Octrees | Real 3D coordinates and bounds, sparse occupied octants, volume/point queries, XY and XZ projections and memory-growth discussion. |
| 63 — KD-Trees | Alternating-axis median build, point/range query and nearest neighbor with near-first traversal, best-distance updates and opposite-branch plane tests. |
| 64 — R-Trees | Minimum-enlargement insertion, recursive deterministic splits, ancestor MBR repair, occupancy and overlapping-region query. |
| 65 — Bounding Volume Hierarchies | Longest-centroid-axis median build, overlap traversal, moved-leaf refit and full rebuild. |
| 66 — Broad-Phase Spatial Indexing | Full 2D/3D AABB grid coverage, canonical deduplicated candidate pairs, exact AABB filtering and qualitative workload comparison across Part IX. |

All seven chapters include the established hero and thirteen ordered learning sections, selectable mental model, operation lab, complexity explorer, downloadable standalone C++20 and exercises. Every operation reconstructs the selected starting scene; the interface does not retain a hidden mutable index between operations.

## 2. Visualization architecture

Existing `Trace`, `PlaybackController`, `LabAdapter`, `TraceLab`, `InspectionDiagram`, canonical source extraction and SVG primitives remain the shared infrastructure. `spatial/partition.ts` and `spatial/bounding.ts` own the algorithms and invariants. `types.ts` provides a focused presentation vocabulary; `geometry.ts` validates and evaluates bounded geometric primitives. `presentation.ts` projects semantic state into spatial coordinates and stable creation-order hierarchy/storage rows. There is no universal index engine, force layout, physics system, WebGL or geometry dependency.

XY and XZ projections display the same authoritative 3D state. IDs identify records rather than byte offsets. Object positions stay fixed unless the operation itself moves them. A hierarchy arrow follows the parent's actually published child list, preserving allocation, split, refit and rebuild half-states. Empty hash-query cells have an explicit current region without inventing a stored cell record.

Query blue, current amber, pruned dashed gray, accepted green and fault red have accompanying glyphs, text, inspection and a textual fallback. Candidate pairs remain distinct from accepted exact-AABB pairs. The [architecture ruling](PART_IX_ARCHITECTURE.md) records the implementation boundary.

## 3. Coordinates and bounds

Browser coordinates are finite and bounded to `[-8,8]`; custom inputs contain at most twelve objects. Chapter 60–63 callable examples keep the final count at most twelve; Chapters 64–66 callable examples allow sixteen. Geometry uses closed object/query AABBs: touching faces and zero extent are valid. Reversed bounds, non-finite coordinates, malformed tuples and invalid parameters are rejected. An empty index has no objects, rather than an inverted sentinel AABB.

Point grid ownership uses `floor`, including negative coordinates, and therefore half-open cells. Closed queries include the cell containing their maximum face. Quadtree/octree midpoint equality goes to the high child, giving one owner even though displayed closed region outlines touch. Six-value UI bounds use `minX,minY,minZ,maxX,maxY,maxZ`; C++ named aggregate fields are documented separately. The fixed picture may clip a boundary cell that continues past the world window; inspection exposes its complete bounds.

## 4. Spatial hash policy

The full integer `(cellX,cellY)` key maps to a normalized `(31*x + 17*y) mod 7` bucket. A bucket retains distinct full-key records, so bucket collisions never imply spatial proximity. Each point has one cell membership; pending placement and removal are explicit. Moves remove old membership before storing the new coordinate. Queries compare full keys before testing member points, including empty queried cells and maximum faces.

Point-only queries naturally visit a member once for its matching cell and return unique IDs. The chapter explains ID deduplication for a multi-cell box extension; Chapter 66 implements canonical pair deduplication. Complexity distinguishes geometric probes from the teaching implementation's linear metadata/ID scans and final sorting. No expected-O(1) lookup is falsely attributed to those scans.

## 5. Quadtree and octree policies

Both canonical trees index points with unique leaf ownership. A quadtree allocates four children at a split; an octree has eight slots but allocates only occupied children. Redistribution temporarily holds pending IDs and preserves ownership. Capacity is 1–8 and maximum depth is 0–6; overfull leaves at the depth limit are valid, including identical coordinates. Child bounds and all routing decisions remain semantic.

AABB storage is an explicitly described extension: retain spanning objects at their parent and descend only into a unique fully containing child. The current labs do not silently replace boxes by centers or duplicate boxes between children. Octree tests include identical XY/different-Z points and thin volume queries. Sparse allocation, uniform exponential growth and depth-limit degeneracy are taught separately.

## 6. KD-tree policy

Build sorts by the current coordinate then stable ID, takes the median and alternates X/Y by depth. Point and range queries follow the exact split policy. Nearest search descends the likely side, compares squared point distance, then compares squared split-plane distance with the best distance. It visits the far branch on equality so the smallest-ID tie winner cannot be lost. It is not an animated full DFS.

Balanced height does not guarantee every nearest query is logarithmic; worst-case traversal and the curse of dimensionality are explicit. Recursive sorting with constant-time point access gives `O(n log² n)` comparisons; the canonical comparator's linear ID lookup makes `O(n² log² n)` a conservative bound for the displayed implementation. Returned-result sorting and trace-copy overhead are distinguished from geometric counters.

## 7. R-tree policy

Insertion chooses minimum area enlargement, then old area, then numeric node ID. Overflow sorts entries by x-center with lexicographic ID ties and splits at `floor((M+1)/2)`. Recursive internal/root splits and ancestor unions have separate source events. Capacity is 2–6; occupancy minimum is `floor((M+1)/2)` outside root exceptions, all leaves have equal depth, and parent MBRs contain their children. Sibling rectangles can overlap. This is a teaching split, not an R*-tree implementation.

Capacity two permits unary internal chains: 8/12/16 sorted boxes produce 28/66/120 nodes at depths 6/10/14. Native/model regressions cover this case. The chapter states `O(n)` height and `O(n²)` worst-case node storage/full traversal for this setting; logarithmic-height and linear-storage arguments require fixed capacity at least three. Pending input-scene boxes in the visualization are identified separately from native stored leaf ownership.

## 8. BVH policy

The 2D builder selects the longest centroid extent (X on ties), sorts by centroid with ID ties and splits at the median. One object belongs to each leaf; internal nodes enclose their two children. Pending build groups own their objects until child references are published. Duplicate centers still split.

Refit changes the object, then its leaf, then ancestors without changing topology. Enclosure checks remain pending until propagation is complete. Rebuild changes the object and constructs new groups. Sorting at each level costs `O(n log² n)`; query worst case is linear. Ancestor repair is logarithmic, while this implementation's linear object/leaf lookup makes the full move operation `O(n)`. Ray traversal and SAH are conceptual extensions, not claimed implementations.

## 9. Broad-phase candidate semantics

The canonical grid enumerates all cells from `floor(min/cellSize)` through `floor(max/cellSize)` inclusively on every active axis. Cells use full integer keys. Each cell emits unordered pairs normalized by ID and a global set suppresses duplicate pairs. Filtering tests each unique candidate once. Every true AABB overlap must be present in the broad candidate set, while false positives are permitted. An exact AABB overlap still does not establish contact between the enclosed shapes.

The model supports actual 2D and 3D boxes. A 4,096-membership guard rejects oversized scenes explicitly; it never silently truncates cells or pairs. The highly overlapping 3D scene at cell size one intentionally exceeds that guard. The C++ map/set and linear ID-resolution costs are explained separately from the counts. Uniform, clustered, overlapping, duplicate and static/moving workload choices produce qualitative index advice; only the selected executable algorithm supplies numeric counts. Motion advice is not a simulated benchmark.

## 10. Independent oracles and source parity

Bounded brute-force scans independently verify point/range/nearest results and exhaustive AABB overlaps/pairs, including empty/singleton, touching, duplicate-coordinate, clustered, overlapping, fractional and degenerate inputs. Native partition validation runs 640 seeded scenes; native bounding validation runs another 140. Malformed inputs and ownership/occupancy/enclosure failures are checked independently.

Per-source-tag native comparisons cover actual cell membership, tree topology, bounds, parent/child publication, objects, results and counters, including mutation half-states. Presentation-only status/focus fields have separate projection tests rather than being misrepresented as native memory. All source tags resolve uniquely; immutable playback reverses exactly to earlier states. The pending R-tree scene/input distinction is documented in [the bounding implementation notes](PART_IX_BOUNDING_NOTES.md).

## 11. Test totals

- Full current-root Vitest: **6,262 tests passed in 51 files**. Part IX contributes **261**: 148 partition/oracle/native tests, 48 bounding model/input tests, 35 bounding native parity tests and 30 shared spatial integration tests.
- Astro/TypeScript: **397 files; zero errors, warnings or hints**.
- Production build: **67 pages**, comprising the index and Chapters 1–66, plus canonical source endpoints.
- Final browser evidence: **1,060 distinct current-root cases passed, two intentional viewport skips, zero uncovered cases**. Part IX's final focused suite passed **33**, and its chapter-entry/workspace suite passed **21**. The full broad run and reviewed focused reruns are reconciled in the [case manifest](validation/part-viii/browser-coverage.json); this is not a claim of one failure-free initial run.

Evidence: [unit log](validation/part-ix/unit-final.log), [type-check log](validation/part-ix/check-final.log), [build log](validation/part-ix/build-final.log). `source-validated.json` records source/test hashes for the validated build.

At the user's request, the Part IX implementer stopped work after its final 33-case spatial run and handed final validation to the Part VIII primary. The current acceptance record is [final type check](validation/part-viii/check-accepted.log), [final root build](validation/part-ix/build-accepted.log), [final source hashes](validation/part-viii/accepted-source.json), [spatial run](validation/part-ix/browser-spatial-accepted.log), [chapter-entry run](validation/part-viii/part-ix-bundle-final.log) and [shared/search rerun](validation/part-viii/shared-final.log). Implementation ownership and scope remain unchanged.

## 12. C++ validation

The full integrated C++ runner passed all **66 standalone examples**, warnings as errors (`-Wall -Wextra -Werror -pedantic`), C++20, AddressSanitizer, UndefinedBehaviorSanitizer and leak detection. Spatial validation additionally passed **780 seeded native scenes** (640 partition and 140 bounding) and the native trace parity tests above. Earlier Parts' integrated fixtures remain included. The concurrent Chapter 59 runner also passed controlled publication/slot-reuse schedules and its separate ThreadSanitizer test; this is bounded validation, not a proof of every concurrent execution.

Evidence: [full C++ log](validation/part-ix/cpp-final.log). Compilation and sanitizer programs ran sequentially outside the ptrace sandbox required by native compiler/LeakSanitizer execution.

## 13. Browser and accessibility

Final results passed: 33 spatial cases and 21 chapter-entry/workspace cases. Part IX checks cover all operations, exact reversal, active C++ statements, source jumps/downloads, playback/speed, navigation/search, invalid geometry, Enter/Space/touch inspection, both representations, Fit/Actual size, light/dark axe checks and console errors. Additional captures cover split/refit/plane/pair half-states, clustered scenes and true 3D boxes.

The original live-development run encountered reload/disconnection failures and an empty-pair test fixture; those are retained as diagnostics, not acceptance. The fixture now uses a clustered scene. Review also found that visited/pruned internal regions could disappear when focus moved; the projection now retains them, with a dedicated regression. Generated browser report JavaScript was moved outside the source scan before the clean type-check rerun. The combined run also exposed a shared search interaction: a populated native search input could consume Escape to clear itself while leaving the dialog open. A scoped key handler now closes the dialog and restores native focus; its dedicated regression passed at all three viewports within the 15-case focused rerun.

Build stages were preceded by host-process inspection after the user's serialization request, and this task's build/native/browser stages ran sequentially. Final browser tests use a frozen copy of production output; no live-reload server supplies acceptance results.

## 14. Responsive and visual review

Final visual samples were inspected at 1440×1000, 1024×900 and 390×844: the seven-chapter tablet overview sheet, desktop Octree overview, mobile Spatial Hash workspace, tablet Broad Phase workspace, mobile Octree hierarchy and desktop BVH pruning. The final 33-case run captured unobstructed geometry; the 21-case entry/workspace run also covers visible playback controls and desktop dark mode. Coordinate SVGs fit by default; hierarchy/table detail remains locally scrollable and full bounds remain in the inspector. All 1,369 original review/active-regression PNGs remain unchanged, with no deleted original baseline. Newly introduced Part VIII and Part IX baselines are tracked separately from that regression floor.

## 15. Prerequisites

The [C++ prerequisite ledger](CPP_PREREQUISITE_LEDGER.md) records only actual additions: small geometry structs, `std::isfinite`, negative-coordinate floor, AABB union/enclosure, squared-distance comparisons, active-dimensional arrays, stable integer indices versus vector reference invalidation, deterministic sorting/tuple ordering, recursion, parent indices, full-key maps, pair sets and const observer callbacks. No custom geometry dependency or Chapter 0 content was added.

## 16. Known limitations

These are bounded teaching implementations. They do not provide R-tree deletion/underflow repair, production split optimization, SAH, ray/primitive intersection, a 3D BVH lab, continuous collision detection, floating-point robustness for unbounded coordinates or persistent multi-operation scene editing. Octree and broad-phase models do perform real 3D geometry. Capacity/depth/membership guards are explicit, not hidden truncation. Production costs may differ from the simple inspectable metadata scans. Snapshot storage and rendering are not algorithm benchmarks. Native observers must obey the documented nonmutating/nonreentrant contract.

## 17. Concurrent Part VIII

Chapters 51–59, their models, native runners, routes, prerequisites and tests remain in the canonical shared tree. Registry/navigation/source-manifest changes were additive and re-read before editing. The integrated registry contains Chapters 1–66 in numeric order. The previous Chapters 1–50 checkpoint remains historical evidence; nothing was restored from it. Existing Part VIII screenshot references were preserved. Its owner completed visual acceptance and, at the user's request, became the sole final validator after this implementation was handed off. Final source and screenshot evidence is linked above and in the [preservation report](validation/part-viii/preservation.json).

## 18. Readiness for a Chapters 1–66 freeze

Ready for a freeze of the recorded Chapters 1–66 source state. Current-root unit/native/browser evidence is complete; root and `/book/` deployment modes and the launcher passed. Each deployment served 134 canonical source files and passed all 66 downloaded sanitizer programs. The latest prefix UI additionally passed populated-query Escape/focus, keyboard-toggle and responsive checks, with source bytes identical to the already validated programs. The final source/hash and reconciled case manifests identify the accepted state. Part IX stops at Chapter 66; no new chapter or subject is authorized by this review.
