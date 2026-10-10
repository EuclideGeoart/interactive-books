# Part V — Graphs implementation review

Date: 2026-10-04. Scope: Chapters 24–36, with accepted Chapters 1–17 as the regression floor. The supplied workspace had no Git metadata, so no baseline commit or clean-worktree claim is made. Chapter 0 and Part VI were not implemented.

## 1. Chapters completed

| Chapter | Interactive mechanism |
| --- | --- |
| 24 — Graph fundamentals | Inspect neighbors; add a vertex/edge; toggle direction; weighted edges, self-loops, degree and explicit simple-graph policy. |
| 25 — Adjacency list vs matrix | One graph drives drawing, list and matrix simultaneously. Edge/cell selection synchronizes all views; matrix-row work is counted. |
| 26 — Breadth-first search | FIFO dequeue, discovery, separate distance/predecessor writes, enqueue, output and predecessor-tree overlay. |
| 27 — Depth-first search | Explicit continuation frames, discovery, edge exploration, descent, completion/backtracking and full forest option. |
| 28 — Directed graphs | Arrowheads, incoming/outgoing inspection, indegree/outdegree and directed reachability. |
| 29 — DAGs | Geometry, build, spreadsheet, package and task presets; source/sink fields; partial order and cycle checks. |
| 30 — Topological sort / Kahn | Initial counts, zero-indegree FIFO, pop/emit, individual edge retirement, new readiness and blocked residual work. |
| 31 — Connected components | Repeated BFS launches, component IDs, disconnected/isolated vertices and visible visited work. |
| 32 — Cycle detection | Undirected parent-edge exclusion and directed WHITE/GRAY/BLACK rules, including self-loops and directed diamonds. |
| 33 — Dijkstra | Checked nonnegative inputs, distance/predecessor arrays, finalization, visible duplicate/stale priority entries and exact relaxations. |
| 34 — Bellman–Ford | Negative edges, passes, early exit, extra reachable-negative-cycle detection and provisional result handling. |
| 35 — Minimum spanning trees | Kruskal sorted edge queue, accepted/rejected edges, weight total, size-based component merging and disconnected forests. |
| 36 — Union-Find | Make-set, find, union and connected; owned parent/size arrays, real self-root links and exact two-pass compression. |

Every chapter contains a hero and the thirteen standard sections: mental model through summary. All have interactive execution, synchronized canonical code, invariants, complexity exploration, mistakes/experiments, engineering context, exercises, completion tracking and cross-links.

## 2. Graph visualization architecture

`src/visualizers/graph/` supplies only graph types, input validation, presentation adapters, deterministic layout and drawing/inspection. It reuses SVG arrow definitions and escaping. Fixed vertex-ID slots keep positions stable through traversal, edge edits and compression. Directed reciprocal links are separate curves; self-loops leave/enter different boundary points. Weights have reserved labels and leader lines when needed. Edges end at object boundaries. No physics solver or general scene-graph framework was introduced.

Graph view and Storage view share one graph. Storage shows derived adjacency plus canonical algorithm arrays, not invented native byte offsets. Chapter 25 always displays all three representations. Panning remains inside the drawing; worklists and tables stay outside the graph scroll region.

## 3. Graph model architecture

A graph owns ordered vertex labels and an ordered edge vector with numeric endpoint IDs and integer weights. Edge identity is its input index. The UI supports up to eight vertices and rejects parallel ordered/unordered pairs according to direction; directed antiparallel edges and self-loops are supported. Neighbor order is edge input order. Seed order is ascending vertex ID.

Structure/traversal, DAG and weighted/DSU models own algorithm state. Immutable semantic snapshots feed the accepted generic playback controller. A graph vertex acquires no hierarchical parent from layout: a traversal predecessor and a DSU parent have explicitly different contracts.

## 4. Shared versus algorithm-specific state

The shared scene is a read-only projection: vertex field rows, current/discovered/visited IDs, edge overlays, worklists, output and result text. Models own distances, predecessors, colors, component IDs, indegrees, settled flags, priority candidates and DSU parent/size arrays. Rendered classes are derived; they are never the only record of an algorithm fact. Invariants remain family/chapter-specific. No graph event was added to the global memory reducer.

## 5. DAG/Kahn implementation

Edges mean prerequisite → dependent. Source/sink and incoming/outgoing fields make that direction inspectable. The geometry example is A/B → Line AB and Line AB/Circle C → Intersection P. Other presets establish the same contract in build, task, package and spreadsheet systems.

Kahn exposes counting, source seeding, pop, emit, inspect, decrement and newly-zero enqueue separately. At every state residual indegree equals counted incoming edges minus retired edges. Emission alone retires nothing. The ready queue and emitted-prefix invariants allow genuine intermediate states without premature updates.

FIFO ties are deterministic, not a uniqueness claim. Empty/single/disconnected DAGs work. Fewer than V emissions proves a cycle; residual work is described as cycle members **or downstream blocked vertices**. Production discussion distinguishes topological ordering from concurrent task completion and full sorting from cached/incremental recomputation.

## 6. Weighted graph decisions

Dijkstra rejects negative weights before replacing an experiment. Its native min-priority queue orders `(distance, vertex ID)`; the display shows dequeue order and retains duplicate/stale candidates. Candidate, distance, predecessor and predecessor-edge writes are separate statements.

Bellman–Ford uses optional finite distances, V−1 relaxation passes, early exit and an extra detection scan. It ignores unreachable negative cycles for the chosen source. On a reachable negative cycle it conservatively withholds the finite-path result and labels retained numbers provisional; it does not reconstruct a misleading path.

Kruskal sorts by `(weight, original edge index)`. Equal-weight alternatives can be mathematically valid; the tie rule chooses one reproducible forest. Self-loops/cycle-closing edges are rejected. Disconnected input produces a minimum spanning forest. It is explicitly distinguished from a shortest-path tree.

## 7. Union-Find implementation

The owner contains parent, root-size and label vectors. Roots point to themselves. Union attaches the smaller component, breaking equal-size ties by lower numeric root. Nonroot sizes remain historical. Both operands are validated before a union can partially compress one path.

Find first records the nonroot path, then writes only actual shortcuts. The default D → C → A example becomes D → A with one write. The graph derives each arrow from the current parent assignment; reverse playback restores the old chain. Make-set reserves growing storage before publication. The complexity explorer compares parent traversals before/after compression and explains O(α(n)) amortized sequence cost without claiming every find is one step.

## 8. Test totals

- **3,433 unit/native tests passed** across Chapters 1–17 and Part V, excluding concurrent hashing tests.
- **634 Part V tests** in seven files: 343 structure/traversal, 15 DAG/Kahn, 24 layout/presentation, 91 weighted/DSU and 161 cross-family oracle checks.
- Native graph parity covers every tagged snapshot, not only final results. Source-tag uniqueness is enforced in the structure family.
- Independent oracles include reachability/shortest-path closure, exhaustive small spanning forests, deterministic DAG subsets and mixed DSU partitions.
- Edge fixtures cover empty/single/disconnected graphs, self-loops, directed/undirected cycles, absent paths, equal weights, duplicate candidates, negative edges/cycles, multiple topological orders and multiple MSTs.

## 9. C++ validation

All **13 Part V assertion programs** pass C++20, `-Wall -Wextra -Werror -pedantic`, AddressSanitizer, UndefinedBehaviorSanitizer and leak detection. The accepted Chapters 1–17 and their integrated tree validation also pass. Concurrent Part IV programs passed an incidental native smoke run; that is not Part IV acceptance.

Canonical files are imported directly by the chapter code panels and cleaned source download routes. Chapters 24–28,31–36 have standalone headers. Chapter 29 explicitly links its `../chapter-30/Kahn.hpp` dependency and explains the directory layout. Optional distances and checked `long long` addition prevent overflow/sentinel arithmetic. Native fixtures compile the shipped headers, with no substitute native algorithm.

## 10. Browser validation

The dedicated graph suite passes **63/63 cases**: 21 cases at each of three viewport sizes. Coverage includes all chapter routes and source downloads, synchronized code, reverse snapshots, search/navigation, theme parity and state-preserving rejection. Dedicated regressions cover Kahn half-processed edges, stale Dijkstra candidates, reachable/unreachable negative cycles, DSU compression, selecting an edge that disappears on reverse, and matrix/adjacency/array keyboard focus. After extending the control-identity fix to adjacency-list edge buttons, a final **9/9-case focused recheck** passes the expanded focus regression, reverse-edge regression and Chapter 25 interaction/accessibility checks at every width.

The wider shared-book suite passes **385 cases with two intentional platform skips**. This includes Chapters 1–17 regressions and 78 graph cases through the established shared-control tests; concurrent Part IV cases are excluded. Coverage includes all operation buttons, source jumps, playback/pause/reset, established ownership/pointer behavior and the accepted list, queue, heap and tree chapters. The skips are the mobile-only sticky-playback case on desktop/tablet; its mobile case passes. The separate unchanged Chapters 2–17 visual suite passes **48/48 cases**.

Validation uses a frozen production build and the test-owned preview lifecycle in [`playwright.graphs.config.ts`](../playwright.graphs.config.ts). Reproduce the dedicated graph run from the repository root:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
ASTRO_TELEMETRY_DISABLED=1 npm run build
mkdir -p /tmp/dsa-part-v-validation
cp -a dist/. /tmp/dsa-part-v-validation/
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
  npx playwright test --config=playwright.graphs.config.ts tests/e2e/graphs.spec.ts
```

The Chrome override is environment-specific; omit it with a Playwright-managed Chromium installation. For native/semantic validation use `npx vitest run --exclude '**/hash*'` and `node scripts/check-graphs-cpp.mjs`. No Part IV implementation is required by the graph suites.

## 11. Accessibility

All thirteen chapter workspaces pass full axe scans of the chapter main content in light and dark themes at all three widths: **78 scans, zero violations**. Graph vertices and edges support keyboard selection; adjacency/matrix/array controls are native buttons. Selection opens the inspector and preserves the identity of the focused control across rerender/reparenting. Graph and table scroll regions are keyboard-focusable; long mobile source excerpts are focusable. Table captions, row/column headers, live status and unique region names expose model state. SVG text and controls reuse the established light/dark palette. Text descriptions remain available alongside complete canonical C++.

## 12. Responsive and visual review

Layouts are checked at **1440×1000, 1024×900 and 390×844**. The graph is contained and scrollable at narrow widths; the document does not overflow. Worklists/arrays remain outside graph panning. Mobile presets and custom graph fields occupy full-width rows. Long vertex labels wrap within node boundaries. Screenshot review covers light/dark graph workspaces and both representations. Dense layout tests check deterministic routes and that edges/weight labels avoid unrelated vertex interiors. Existing Chapter 1–17 screenshot baselines are not rewritten.

The graph visual suite passes **39/39 cases**, supplying **91 reference images** (entry and workspace at three widths, plus desktop dark workspaces). Dedicated tests also capture 24 finished-state images for representations, Kahn, Dijkstra and DSU. Reviewed examples: [Kahn desktop](../tests/e2e/bundle-visual.spec.ts-snapshots/30-topological-sort-lab-desktop-linux.png), [representations mobile](../tests/e2e/bundle-visual.spec.ts-snapshots/25-adjacency-list-matrix-lab-mobile-linux.png), [DSU dark](../tests/e2e/bundle-visual.spec.ts-snapshots/36-union-find-dark-desktop-linux.png).

## 13. Prerequisite additions

The ledger records only actual uses: nested adjacency vectors, deque/stack reuse, explicit continuation records, traversal color arrays, optional distances, numeric limits and checked addition, edge records, pairs/structured bindings, priority-queue comparator ordering, sorting, `iota`, root-size arrays, path compression, `reserve`, standard-container ownership and optional observers. Chapter 0 remains deferred.

## 14. Known limitations

- The interactive scenes and most standalone teaching headers are bounded to eight vertices and ±1,000,000 integer weights. Kahn's native runner has a larger explicit bound. These are documented educational bounds.
- No parallel pairs in the interactive graph policy. Native Kahn counts parallel edge records correctly.
- Preset/operation loads rebuild the declared starting experiment. They are not an unrestricted persistent graph editor or a history of DSU commands.
- Cycle detection reports existence, not a cycle witness. Bellman–Ford does not classify every vertex affected by a negative cycle.
- Kruskal's helper uses union by size without compression; its DSU cost is stated accordingly. Chapter 36 teaches compression separately.
- Dense graphs may cross edges; crossings do not create vertices. Selection, contained panning and text/storage views remain available.
- Snapshot, observer, queue-projection and validation costs are teaching overhead, distinguished from core algorithm bounds. Input duplicate validation is deliberately simple for the bounded examples.
- Browser automation uses installed Chrome; it is not a Safari/Firefox device certification.

## 15. Proposed shared abstraction changes

No promotion is required. A small shared auxiliary-panel/focus hook could later replace separate tree/graph mount logic; a generic focusable mobile source excerpt would benefit longer statements elsewhere. Both are future cross-Part integration candidates, not changes to accepted reducers or scene architecture.

## 16. Part IV integration considerations

Part IV files arrived in this same checkout during implementation. Their algorithms were not modified. Navigation, chapter registration and source routes preserve both Parts; graph models have no hashing imports. An overwritten download glob was reconciled additively, and the graph C++ runner is invoked by the existing validator. Final tests use a frozen production copy to avoid hot-reload interference from concurrent edits. Part IV still requires its own acceptance review.

## 17. Recommendation for Part VI

Part V establishes the graph boundary needed by later algorithms. Reconcile the two Part reports and retain the regression floor before starting the next Part. No Part VI implementation was begun. Stop at Chapter 36.
