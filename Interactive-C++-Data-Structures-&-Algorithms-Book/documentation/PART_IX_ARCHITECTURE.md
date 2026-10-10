# Part IX spatial architecture

Decision recorded 2026-10-04 in the canonical shared checkout. This checkout has no Git metadata; no branch/HEAD is available. Scope: Chapters 60–66; preserve Chapters 1–50 and concurrent Part VIII. Chapter 0 and further subjects remain deferred.

The primary resolves the architecture locally under the requested Astra architect role. Existing `Trace`, `LabAdapter`, `TraceLab`, `InspectionDiagram`, SVG primitives and diagram fitting provide the playback and presentation boundary. Part VII's state types demonstrate that algorithms need not impersonate pointer lists to reuse these facilities.

## Ruling

Use a focused spatial presentation vocabulary (`types.ts`) and small coordinate helpers (`geometry.ts`). Models own actual cells, tree nodes, insertion decisions, query traversal, counters and invariant checks. Immutable snapshots drive both spatial and hierarchy/storage views. Rendering only projects model coordinates; it cannot determine query results, insertion paths or topology. Reject a universal spatial index/invariant engine and a force/physics/WebGL layout because neither is needed for this bounded curriculum.

Use finite coordinates from −8 through 8 in the labs. Canonical examples document their bounds. Closed object/query AABBs include touching faces and zero-extent boxes; reversed boxes and non-finite coordinates are errors. No object means an empty index, not an inverted sentinel box. Grid mapping uses `floor`, including negative coordinates. A closed maximum face occupies the cell containing that face, conservatively preserving touching pairs. Point subdivision ties go to the high side, giving one owner even though displayed region closures touch. Octree semantics are genuinely 3D; the renderer explicitly labels its projection and exposes z bounds in inspection.

Spatial statuses are unvisited, current, visited, pruned, candidate, accepted and fault. Query/reference is blue; current is amber; accepted is green; pruned is dashed gray; red is reserved for faults. Text badges, line styles, inspection and a textual fallback supplement color. Candidate pairs and exact AABB overlaps are distinct from actual shape contact.

Actual coordinates determine object positions and remain stable throughout a trace. Hierarchy/storage rows use stable node identity rather than recomputing a compact layout at every event. Fit is the default, Actual size supports detailed local scrolling, and table/inspector content provides readable values at narrow widths.

The partition and bounding models stay separate. Each supplies its own operations, source regions and invariants to the shared adapter. C++ headers remain standalone without external geometry dependencies. Source tags identify the corresponding canonical statements. Bounded brute-force oracles, native checks, browser interaction, light/dark accessibility, and 1440/1024/390 visual review establish acceptance; operation counts never purport to measure rendering or wall-clock speed.

Revisit the vocabulary only if a requested operation cannot be represented faithfully. Revisit numeric bounds before supporting unbounded coordinates or production geometry. These are educational indexes, not a geometry engine.
