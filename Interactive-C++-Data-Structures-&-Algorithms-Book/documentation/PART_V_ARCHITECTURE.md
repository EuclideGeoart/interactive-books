# Part V architecture decisions

Date: 2026-10-04. Baseline: integrated Chapters 1–17 supplied as a filesystem checkout without Git metadata. No original commit identity is claimed. Primary has user-assigned architectural ownership and resolves this gate locally.

## Graph boundary

Evidence: `LabAdapter` delegates drawing, inspection, descriptions, invariants and source regions. `PlaybackController` accepts typed opaque snapshots. `InspectionDiagram` already supports keyboard selection, source/target following and focus restoration. The tree presentation projection demonstrates a domain boundary without changing the generic reducer.

Ruling: reuse those book contracts. Add a graph-specific `GraphScene` presentation projection and deterministic renderer. Keep algorithm state, events, traces and invariants in graph chapter families. A universal scene graph would expand the global API unnecessarily; independent renderers per algorithm would duplicate routing and accessible inspection. Neither is justified.

Vertices have integer IDs indexing labels. Edge identity is its stable input index. Graphs admit self-loops but reject parallel edges for an ordered pair (directed) or unordered pair (undirected); antiparallel directed edges are distinct. Neighbor iteration follows input order, seed vertices follow ascending ID. The UI is bounded to eight vertices and integer weights of magnitude at most one million. This is an educational input limit, not a complexity claim about native algorithms. Graph nodes do not acquire hierarchy parents from layout. Predecessor arrays and DSU parent arrays have explicitly different meanings.

Graph view uses fixed positions independent of algorithm state. Storage view derives adjacency rows from the same graph. Both expose algorithm arrays and worklists. Chapter 25 shows graph, adjacency list and matrix together; selections are projections, not separate graph states. The renderer reuses escaping and arrow definitions, with graph-owned geometry and routing. No force simulation or new package is required.

## Scope and ownership

Primary owns shared graph types/rendering, DAGs/Kahn (29–30), graph mounts, navigation, source routes, full verification and final report. Agent A owns 24–28,31–32; agent B owns 33–36. At most two High-reasoning subagents are active. Part IV is optional and untouched. Chapter 0 and Part VI remain unimplemented. Any proposed global promotion is documented for later integration, not applied speculatively.

## DAG and Kahn semantics

Dependency edges point prerequisite → dependent. Kahn snapshots separate initial indegree computation, queue seeding, pop, emit, edge retirement, indegree decrement and zero enqueue. An edge is counted as removed only at its decrement statement: emitting a vertex alone does not remove all its edges. Thus residual indegrees can be checked at every half-processed state. FIFO ties use ascending initial IDs and input-order successors; the resulting order is deterministic but is not claimed unique. Residual vertices after failure may be cycle members or downstream blocked vertices.

The DAG chapter reuses the Kahn mechanism as an acyclicity check and illustrates prerequisite closure and incremental invalidation conceptually. It does not claim all production engines perform full sorting for each update. Authored geometry/build/spreadsheet/task/package scenarios and a deliberate cyclic input make the property testable.

## Final review and promotion decision

All thirteen chapters use the graph presentation projection with the existing generic playback/inspection contracts. Graph family models own visited/discovery/color, distances/predecessors, indegrees, component IDs and DSU parent/size state. CSS only displays those values. Canonical C++ source tags are unique within each displayed header/region, including separate seed statements in BFS/DFS/components. Native fixtures compare every tagged state, and independent mathematical oracles cover correctness separately from parity.

The layout is a fixed convex perimeter, with deterministic reciprocal curves and explicit root/self-loop routes. Layout tests exhaust dense directed scenes through eight vertices and check that neither edge paths nor weight labels enter unrelated vertex boxes. Label lanes reserve space; dense fallback labels have a leader to their edge. Topology may change while ID positions remain stable. The memory/storage view exposes adjacency and arrays rather than inventing native pointers or byte offsets for ID-based graphs.

Review found and fixed source-tag aliasing, stale edge selection after reverse mutation, lost keyboard focus during panel reparenting, ambiguity between controls for the same vertex, duplicate accessibility-region names, and nonfocusable scrolling mobile source text. These fixes remain graph-owned. The old book reducers, PlaybackController and InspectionDiagram are unchanged.

No new global semantic event, graph invariant engine, layout framework, dependency or rendering registry is promoted. A future small generic auxiliary-panel/focus hook could replace the tree and graph mount-specific panel relocation only after both consumers are reconciled. A generic focusable mobile code excerpt is another candidate; Part V sets it locally so existing chapter screenshots remain unchanged. Neither proposal is required to run Part V.

Part IV appeared in this same filesystem during implementation despite the isolated-session expectation. Chapter registry, navigation and canonical source registration were reconciled additively; graph algorithms never import Part IV. The graph C++ runner is separate and invoked by the existing validation entrypoint. Graph and Chapters 1–17 tests have an independent run excluding the concurrent hashing tests. The integration report distinguishes incidental Part IV smoke results from its own acceptance decision.
