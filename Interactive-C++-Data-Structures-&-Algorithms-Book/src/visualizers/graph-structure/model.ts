import type { Invariant, Trace } from "../../engine/types";
import { graphFrom, validateGraph } from "../graph/model";
import type { Graph, GraphEvent, GraphScene } from "../graph/types";
export type StructureOperation =
  | "inspect"
  | "matrix"
  | "add-vertex"
  | "add-edge"
  | "toggle"
  | "bfs"
  | "dfs"
  | "forest"
  | "components"
  | "cycle";
export interface StructureState {
  graph: Graph;
  distance: number[];
  pred: number[];
  color: number[];
  component: number[];
  output: number[];
  queue: number[];
  frames: { vertex: number; next: number; parent_edge: number }[];
  active: number;
  edge: number;
  scans: number;
  launches: number;
  cycle: boolean;
  operation: StructureOperation;
  showRepresentations: boolean;
}
export function structureState(
  graph: Graph,
  operation: StructureOperation = "inspect",
  showRepresentations = false,
): StructureState {
  validateGraph(graph);
  const n = graph.labels.length;
  return {
    graph: structuredClone(graph),
    distance: Array(n).fill(-1),
    pred: Array(n).fill(-1),
    color: Array(n).fill(0),
    component: Array(n).fill(-1),
    output: [],
    queue: [],
    frames: [],
    active: -1,
    edge: -1,
    scans: 0,
    launches: 0,
    cycle: false,
    operation,
    showRepresentations,
  };
}
export const standardGraph = () =>
  graphFrom(
    ["A", "B", "C", "D", "E"],
    [
      [0, 1],
      [0, 2],
      [1, 3],
      [1, 4],
    ],
  );
const explanations: Record<string, string> = {
  "bfs.discover":
    "Mark the vertex discovered before enqueueing, so another incoming edge cannot schedule it twice.",
  "bfs.distance":
    "The source has distance zero. A newly discovered neighbor is one edge farther than the current vertex.",
  "bfs.predecessor":
    "Record the edge used for first discovery. These predecessor edges form the BFS tree.",
  "bfs.enqueue":
    "Append at the back of the FIFO queue; all older waiting vertices stay ahead.",
  "bfs.dequeue":
    "Remove the oldest waiting vertex from the front, making it current.",
  "bfs.visit":
    "Process the dequeued vertex. Discovered waiting vertices are distinct from processed vertices.",
  "bfs.inspect":
    "Inspect the next outgoing adjacency entry in edge insertion order, even if its neighbor is already discovered.",
  "bfs.finish": "All outgoing entries of this vertex have now been inspected.",
  "dfs.launch":
    "Start at the requested source, or the next unseen vertex in ascending ID order for a forest.",
  "dfs.discover":
    "Mark GRAY and append to discovery order. A gray vertex is active or about to receive its frame.",
  "dfs.push":
    "Push a continuation frame: vertex, next adjacency index, and parent edge. The caller remains below it.",
  "dfs.resume":
    "Resume the top frame. Its saved next index remembers where exploration continues.",
  "dfs.inspect":
    "Advance the frame cursor before descending so this edge is not retried after backtracking.",
  "dfs.predecessor": "Save the discovering vertex before entering the child.",
  "dfs.parent":
    "Ignore exactly the undirected parent edge: returning along the same edge does not create a cycle.",
  "dfs.finish":
    "All outgoing entries are done. Mark BLACK before popping the frame.",
  "dfs.backtrack":
    "Pop the completed frame. The suspended predecessor can now resume.",
  "dfs.cycle":
    "Directed: an edge reaches GRAY on the active path. Undirected: a seen neighbor was reached by a non-parent edge. Either rule includes a self-loop.",
  "components.launch":
    "The next unassigned vertex starts a new component. Seed order is ascending vertex ID.",
  "components.assign":
    "Assign the current component ID at discovery, before enqueueing.",
  "components.enqueue":
    "Append this newly assigned vertex to the component’s FIFO frontier.",
  "components.dequeue": "Take the oldest waiting vertex in this component.",
  "components.visit": "Record the processed vertex in traversal output.",
  "components.inspect":
    "Inspect the next undirected adjacency entry, counting actual neighbor work.",
  "components.predecessor":
    "Record the edge that connected this vertex to the component search.",
  "components.finish": "This vertex’s adjacency entries are exhausted.",
  "inspect.select":
    "Select a source row; all representations still derive from the same graph.",
  "inspect.edge":
    "Read one actual adjacency entry. Isolated vertices require no entry reads.",
  "inspect.cell": "Read one matrix cell, including cells that contain no edge.",
  "inspect.neighbor":
    "Append a present neighbor. Matrix order follows vertex IDs; adjacency order follows edge insertion.",
  "edit.commit":
    "Validate the complete proposed graph first, then commit atomically. No partial edit survives an invalid input.",
};
export function structureTrace(
  operation: StructureOperation,
  initial: StructureState,
  options: {
    start?: number;
    from?: number;
    to?: number;
    label?: string;
    weight?: number;
  } = {},
): Trace<StructureState, GraphEvent> {
  let s = structureState(initial.graph, operation, initial.showRepresentations);
  const trace: Trace<StructureState, GraphEvent> = {
    initial: structuredClone(s),
    steps: [],
  };
  const emit = (tag: string) =>
    trace.steps.push({
      event: { type: tag.split(".").at(-1)! },
      source: tag,
      title: tag.replace(".", " · "),
      explanation:
        explanations[tag] ??
        explanations[
          tag.replace(".seed-", ".").replace(".matrix-neighbor", ".neighbor")
        ] ??
        "The traversal is complete; no work remains in its frontier.",
      state: structuredClone(s),
    });
  if (["add-vertex", "add-edge", "toggle"].includes(operation)) {
    const candidate = structuredClone(s.graph);
    if (operation === "add-vertex") candidate.labels.push(options.label ?? "F");
    if (operation === "add-edge")
      candidate.edges.push({
        from: options.from ?? 0,
        to: options.to ?? 1,
        weight: options.weight ?? 1,
      });
    if (operation === "toggle") candidate.directed = !candidate.directed;
    validateGraph(candidate);
    s = structureState(candidate, operation, s.showRepresentations);
    emit("edit.commit");
    return trace;
  }
  if (operation === "components" && s.graph.directed)
    throw new Error("Connected components requires an undirected graph.");
  const n = s.graph.labels.length,
    start = options.start ?? 0;
  if (!n && operation !== "components") return trace;
  if (n && (!Number.isInteger(start) || start < 0 || start >= n))
    throw new Error("Start vertex must name an existing vertex.");
  // Build adjacency once in O(V + E); do not rescan all edges per vertex.
  const a: { vertex: number; edge: number; weight: number }[][] = Array.from(
    { length: n },
    () => [],
  );
  s.graph.edges.forEach((e, edge) => {
    a[e.from]!.push({ vertex: e.to, edge, weight: e.weight });
    if (!s.graph.directed && e.from !== e.to)
      a[e.to]!.push({ vertex: e.from, edge, weight: e.weight });
  });
  if (operation === "inspect" || operation === "matrix") {
    s.active = start;
    emit("inspect.select");
    if (operation === "matrix") {
      const present = new Set(a[start]!.map((x) => x.vertex));
      for (let v = 0; v < n; v++) {
        s.scans++;
        emit("inspect.cell");
        if (present.has(v)) {
          s.output.push(v);
          emit("inspect.matrix-neighbor");
        }
      }
    } else
      for (const neighbor of a[start]!) {
        s.edge = neighbor.edge;
        s.scans++;
        emit("inspect.edge");
        s.output.push(neighbor.vertex);
        emit("inspect.neighbor");
      }
  } else if (operation === "bfs") {
    s.color[start] = 1;
    emit("bfs.seed-discover");
    s.distance[start] = 0;
    emit("bfs.seed-distance");
    s.queue.push(start);
    emit("bfs.seed-enqueue");
    while (s.queue.length) {
      s.active = s.queue.shift()!;
      emit("bfs.dequeue");
      const u = s.active;
      s.output.push(u);
      emit("bfs.visit");
      for (const neighbor of a[u]!) {
        s.edge = neighbor.edge;
        s.scans++;
        emit("bfs.inspect");
        const v = neighbor.vertex;
        if (s.color[v] === 0) {
          s.color[v] = 1;
          emit("bfs.discover");
          s.distance[v] = s.distance[u]! + 1;
          emit("bfs.distance");
          s.pred[v] = u;
          emit("bfs.predecessor");
          s.queue.push(v);
          emit("bfs.enqueue");
        }
      }
      s.color[u] = 2;
      emit("bfs.finish");
    }
    s.active = -1;
    s.edge = -1;
    emit("bfs.done");
  } else if (operation === "components") {
    for (let seed = 0; seed < n; seed++) {
      if (s.component[seed] !== -1) continue;
      const id = s.launches;
      s.launches++;
      s.active = seed;
      emit("components.launch");
      s.component[seed] = id;
      s.color[seed] = 1;
      emit("components.seed-assign");
      s.queue.push(seed);
      emit("components.seed-enqueue");
      while (s.queue.length) {
        s.active = s.queue.shift()!;
        emit("components.dequeue");
        const u = s.active;
        s.output.push(u);
        emit("components.visit");
        for (const neighbor of a[u]!) {
          s.edge = neighbor.edge;
          s.scans++;
          emit("components.inspect");
          const v = neighbor.vertex;
          if (s.component[v] === -1) {
            s.component[v] = id;
            s.color[v] = 1;
            emit("components.assign");
            s.pred[v] = u;
            emit("components.predecessor");
            s.queue.push(v);
            emit("components.enqueue");
          }
        }
        s.color[u] = 2;
        emit("components.finish");
      }
    }
    s.active = -1;
    s.edge = -1;
    emit("components.done");
  } else if (["dfs", "forest", "cycle"].includes(operation)) {
    const forest = operation !== "dfs",
      detect = operation === "cycle";
    for (let seed = 0; seed < n; seed++) {
      const root = forest ? seed : start;
      if (s.color[root] !== 0) continue;
      s.launches++;
      s.active = root;
      emit("dfs.launch");
      s.color[root] = 1;
      s.output.push(root);
      emit("dfs.seed-discover");
      s.frames.push({ vertex: root, next: 0, parent_edge: -1 });
      emit("dfs.seed-push");
      while (s.frames.length) {
        s.active = s.frames.at(-1)!.vertex;
        emit("dfs.resume");
        const u = s.active,
          frame = s.frames.at(-1)!;
        if (frame.next === a[u]!.length) {
          s.color[u] = 2;
          emit("dfs.finish");
          s.frames.pop();
          emit("dfs.backtrack");
          continue;
        }
        const neighbor = a[u]![frame.next]!;
        frame.next++;
        s.edge = neighbor.edge;
        s.scans++;
        emit("dfs.inspect");
        const v = neighbor.vertex;
        if (!s.graph.directed && neighbor.edge === frame.parent_edge) {
          s.edge = -1;
          emit("dfs.parent");
          continue;
        }
        if (s.color[v] === 0) {
          s.pred[v] = u;
          emit("dfs.predecessor");
          s.color[v] = 1;
          s.output.push(v);
          emit("dfs.discover");
          s.frames.push({ vertex: v, next: 0, parent_edge: neighbor.edge });
          emit("dfs.push");
        } else if (detect && (s.graph.directed ? s.color[v] === 1 : true)) {
          s.cycle = true;
          emit("dfs.cycle");
        }
      }
      if (!forest) break;
    }
    s.active = -1;
    s.edge = -1;
    emit("dfs.done");
  } else throw new Error("Unknown graph structure operation.");
  return trace;
}
export function structureSnapshot(s: StructureState) {
  return [
    s.graph.labels,
    s.graph.edges.map((e) => [e.from, e.to, e.weight]),
    s.graph.directed,
    s.distance,
    s.pred,
    s.color,
    s.component,
    s.output,
    s.queue,
    s.frames.map((f) => [f.vertex, f.next, f.parent_edge]),
    s.active,
    s.edge,
    s.scans,
    s.launches,
    s.cycle,
  ];
}
export function structureScene(s: StructureState): GraphScene {
  const label = (v: number) => (v < 0 ? "—" : s.graph.labels[v]!);
  const edgeStates: GraphScene["edgeStates"] = {};
  s.graph.edges.forEach((e, i) => {
    if (
      s.pred[e.to] === e.from ||
      (!s.graph.directed && s.pred[e.from] === e.to)
    )
      edgeStates[i] = "tree";
  });
  if (s.edge >= 0) edgeStates[s.edge] = "active";
  return {
    graph: s.graph,
    fields: s.graph.labels.map((_, v) => {
      const fields: Record<string, string | number | boolean> = {};
      if (
        ["bfs", "dfs", "forest", "cycle", "components"].includes(s.operation)
      ) {
        fields.color = ["WHITE", "GRAY", "BLACK"][s.color[v]!]!;
        fields.predecessor = label(s.pred[v]!);
        if (s.operation === "bfs")
          fields.distance = s.distance[v] === -1 ? "∞" : s.distance[v]!;
        if (s.operation === "components")
          fields.component = s.component[v] === -1 ? "—" : s.component[v]!;
      } else {
        if (s.graph.directed) {
          fields.indegree = s.graph.edges.filter((e) => e.to === v).length;
          fields.outdegree = s.graph.edges.filter((e) => e.from === v).length;
        } else
          fields.degree = s.graph.edges.reduce(
            (n, e) => n + Number(e.from === v) + Number(e.to === v),
            0,
          );
      }
      return fields;
    }),
    active: s.active < 0 ? null : s.active,
    visited: [...s.output],
    discovered: s.color.flatMap((c, v) =>
      c === 1 && !s.output.includes(v) ? [v] : [],
    ),
    edgeStates,
    auxiliary: ["bfs", "components"].includes(s.operation)
      ? [
          { label: "FIFO queue (front → back)", entries: s.queue.map(label) },
          {
            label: "Discovered, waiting for processing",
            entries: s.color.flatMap((c, v) =>
              c === 1 && !s.output.includes(v) ? [label(v)] : [],
            ),
          },
        ]
      : ["dfs", "forest", "cycle"].includes(s.operation)
        ? [
            {
              label: "DFS frames (bottom → top): vertex / next / parent edge",
              entries: s.frames.map(
                (f) => `${label(f.vertex)} / ${f.next} / ${f.parent_edge}`,
              ),
            },
          ]
        : [],
    output: s.output.map(label),
    result:
      s.operation === "cycle"
        ? `Cycle found: ${s.cycle ? "yes" : s.active === -1 && s.output.length === s.graph.labels.length ? "no" : "not yet — search unfinished"}`
        : s.operation === "components"
          ? `Components launched: ${s.launches}`
          : `${s.output.length} output vertices; ${s.scans} adjacency/cell reads`,
    showRepresentations: s.showRepresentations,
    weighted:
      s.operation === "add-edge" || s.graph.edges.some((e) => e.weight !== 1),
  };
}
export function structureInvariants(
  s: StructureState,
  settled: boolean,
): Invariant[] {
  const unique =
    new Set(s.output).size === s.output.length &&
    new Set(s.queue).size === s.queue.length;
  const queue = s.queue.every((v) => s.color[v] === 1 && !s.output.includes(v));
  const pred = s.pred.every(
    (p, v) =>
      p < 0 ||
      s.graph.edges.some(
        (e) =>
          (e.from === p && e.to === v) ||
          (!s.graph.directed && e.to === p && e.from === v),
      ),
  );
  const distances =
    s.operation !== "bfs" ||
    s.pred.every((p, v) => p < 0 || s.distance[v] === s.distance[p]! + 1);
  const frames = s.frames.every((f) => {
    const count = s.graph.edges.filter(
      (e) => e.from === f.vertex || (!s.graph.directed && e.to === f.vertex),
    ).length;
    return Number.isInteger(f.next) && f.next >= 0 && f.next <= count;
  });
  const componentComplete =
    s.component.every((id) => id >= 0) &&
    new Set(s.component).size === s.launches &&
    s.graph.edges.every((e) => s.component[e.from] === s.component[e.to]);
  return [
    ...(s.operation === "components"
      ? [
          {
            name: "Complete component partition",
            status: !settled
              ? ("pending" as const)
              : componentComplete
                ? ("pass" as const)
                : ("fail" as const),
            detail:
              "At completion every vertex is assigned, every edge stays within a component, and distinct IDs equal launch count.",
          },
        ]
      : []),
    ...(["dfs", "forest", "cycle"].includes(s.operation)
      ? [
          {
            name: "Frame cursor bounds",
            status: frames ? ("pass" as const) : ("fail" as const),
            detail:
              "Each continuation cursor lies within its actual adjacency row, including the exhausted position.",
          },
        ]
      : []),
    {
      name: "Unique scheduling and output",
      status: unique && queue ? "pass" : "fail",
      detail:
        "No vertex is queued twice; queued vertices are discovered but unprocessed.",
    },
    {
      name: "Predecessor edges exist",
      status: pred ? "pass" : "fail",
      detail: "Each predecessor names a real edge in the correct direction.",
    },
    {
      name: "BFS distance relation",
      status: distances ? "pass" : "fail",
      detail:
        "Each assigned predecessor is exactly one edge closer to the source; discovery and assignment are separate steps.",
    },
    {
      name: "Frontier exhausted",
      status: settled
        ? s.queue.length === 0 && s.frames.length === 0
          ? "pass"
          : "fail"
        : "pending",
      detail:
        "A completed traversal has no queue entries or continuation frames.",
    },
  ];
}

export type StructureFault =
  "bfs" | "dfs" | "components" | "cycle" | "representation";
export function structureFault(kind: StructureFault): {
  expected: string;
  broken: string;
  detail: string;
} {
  const run = (op: StructureOperation, g: Graph) => {
    const trace = structureTrace(op, structureState(g));
    return trace.steps.at(-1)?.state ?? trace.initial;
  };
  if (kind === "bfs") {
    const state = run("bfs", standardGraph()),
      expected = state.distance[3]!;
    state.distance[3] = 1;
    const failed = structureInvariants(state, true)
      .filter((i) => i.status === "fail")
      .map((i) => i.name);
    return {
      expected: `distance[D] = ${expected}`,
      broken: `distance[D] = ${state.distance[3]}`,
      detail: `${failed.join(", ")}. A predecessor B at distance 1 requires D at distance 2.`,
    };
  }
  if (kind === "dfs") {
    const trace = structureTrace("dfs", structureState(standardGraph()));
    const state = structuredClone(
      trace.steps.find((step) => step.state.frames.length === 3)!.state,
    );
    const expected = state.frames[1]!.next;
    state.frames[1]!.next = 0;
    return {
      expected: `B resumes at adjacency index ${expected} (E)`,
      broken: `B resumes at index ${state.frames[1]!.next} (A)`,
      detail:
        "Resetting the saved cursor reexamines exhausted edges instead of resuming the continuation. A discovery guard prevents duplicates but cannot restore the promised linear scan count.",
    };
  }
  if (kind === "components") {
    const graph = graphFrom(
      ["A", "B", "C", "D", "E", "F"],
      [
        [0, 1],
        [1, 2],
        [3, 4],
      ],
    );
    const full = run("components", graph),
      single = run("bfs", graph);
    return {
      expected: `${full.launches} components, ${full.output.length} labeled vertices`,
      broken: `Only ${single.output.length} vertices reached from A; ${graph.labels.length - single.output.length} omitted`,
      detail:
        "A single-source BFS cannot label every component. The outer seed loop covers D, E, and isolated F.",
    };
  }
  if (kind === "cycle") {
    const graph = graphFrom(["A", "B"], [[0, 1]]),
      trace = structureTrace("cycle", structureState(graph));
    const inspected = trace.steps.find(
      (step) => step.source === "dfs.inspect" && step.state.active === 1,
    )!.state;
    const parent = inspected.frames.at(-1)!.parent_edge === inspected.edge;
    return {
      expected: `Cycle = ${run("cycle", graph).cycle}`,
      broken: `Visited-neighbor-only rule = ${inspected.color[0] !== 0}`,
      detail: `Edge ${inspected.edge} is the parent edge: ${parent}. Returning along that same undirected edge is not a cycle. Directed detection instead requires a GRAY target; BLACK is insufficient.`,
    };
  }
  const graph = graphFrom(["A", "B"], [[0, 1, 0]], true);
  const expected = graph.edges.some((e) => e.from === 1 && e.to === 0),
    broken = graph.edges.some((e) => e.from === 0 && e.to === 1);
  return {
    expected: `matrix[B][A] = ${Number(expected)}`,
    broken: `Mirrored matrix[B][A] = ${Number(broken)}`,
    detail:
      "Symmetrizing a directed matrix invents B→A. The real A→B edge has weight zero and remains present.",
  };
}
