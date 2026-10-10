import type { Trace, Invariant } from "../../engine/types";
import type { Graph, GraphScene } from "../graph/types";
import { graphFrom, validateGraph, graphPresentation } from "../graph/model";
export interface DagState {
  graph: Graph;
  indegree: number[];
  counted: boolean[];
  removed: boolean[];
  queue: number[];
  output: number[];
  current: number;
  edge: number;
  phase: "counting" | "running" | "done";
  cycle: boolean;
  scans: number;
  pops: number;
  writes: number;
  result: string;
}
export interface DagEvent {
  type: string;
}
export const dagPresets = [
  "geometry",
  "build",
  "spreadsheet",
  "packages",
  "tasks",
  "diamond",
  "cycle",
  "self-loop",
  "disconnected",
  "single",
  "empty",
] as const;
export function dagGraph(preset: string): Graph {
  switch (preset) {
    case "geometry":
      return graphFrom(
        ["A", "B", "Line AB", "Circle C", "Intersection P"],
        [
          [0, 2],
          [1, 2],
          [2, 4],
          [3, 4],
        ],
        true,
      );
    case "build":
      return graphFrom(
        ["Config", "Header", "Compile A", "Compile B", "Link", "Package"],
        [
          [0, 2],
          [1, 2],
          [1, 3],
          [2, 4],
          [3, 4],
          [4, 5],
        ],
        true,
      );
    case "spreadsheet":
      return graphFrom(
        ["Price", "Count", "Subtotal", "Tax rate", "Tax", "Total"],
        [
          [0, 2],
          [1, 2],
          [2, 4],
          [3, 4],
          [2, 5],
          [4, 5],
        ],
        true,
      );
    case "packages":
      return graphFrom(
        ["Core", "Parser", "Geometry", "Editor", "App"],
        [
          [0, 1],
          [0, 2],
          [1, 3],
          [2, 3],
          [3, 4],
        ],
        true,
      );
    case "tasks":
      return graphFrom(
        ["Design", "Materials", "Assemble", "Inspect", "Ship"],
        [
          [0, 2],
          [1, 2],
          [2, 3],
          [3, 4],
        ],
        true,
      );
    case "diamond":
      return graphFrom(
        ["A", "B", "C", "D"],
        [
          [0, 1],
          [0, 2],
          [1, 3],
          [2, 3],
        ],
        true,
      );
    case "cycle":
      return graphFrom(
        ["A", "B", "C", "D", "E"],
        [
          [0, 1],
          [1, 2],
          [2, 1],
          [2, 3],
        ],
        true,
      );
    case "self-loop":
      return graphFrom(["A"], [[0, 0]], true);
    case "disconnected":
      return graphFrom(
        ["A", "B", "C", "D", "E", "F"],
        [
          [0, 1],
          [1, 2],
          [3, 4],
        ],
        true,
      );
    case "single":
      return graphFrom(["A"], [], true);
    case "empty":
      return graphFrom([], [], true);
    default:
      throw new Error("Choose a dependency example from the list.");
  }
}
export function dagInitial(graph: Graph): DagState {
  validateGraph(graph);
  if (!graph.directed) throw new Error("Kahn requires a directed graph.");
  return {
    graph: structuredClone(graph),
    indegree: graph.labels.map(() => 0),
    counted: graph.edges.map(() => false),
    removed: graph.edges.map(() => false),
    queue: [],
    output: [],
    current: -1,
    edge: -1,
    phase: "counting",
    cycle: false,
    scans: 0,
    pops: 0,
    writes: 0,
    result: "Count incoming dependencies before choosing ready work.",
  };
}
export function kahnTrace(graph: Graph): Trace<DagState, DagEvent> {
  const s = dagInitial(graph),
    trace: Trace<DagState, DagEvent> = {
      initial: structuredClone(s),
      steps: [],
    };
  const emit = (
    type: string,
    source: string,
    title: string,
    explanation: string,
  ) =>
    trace.steps.push({
      event: { type },
      source,
      title,
      explanation,
      state: structuredClone(s),
    });
  graph.edges.forEach((e, i) => {
    s.edge = i;
    s.counted[i] = true;
    s.indegree[e.to]!++;
    s.scans++;
    s.writes++;
    emit(
      "CountIndegree",
      "kahn.count",
      `Count ${graph.labels[e.to]}'s incoming edge`,
      "Each directed edge contributes one incoming dependency to its target.",
    );
  });
  s.phase = "running";
  s.edge = -1;
  emit(
    "SeedQueue",
    "kahn.ready",
    "Indegrees are ready",
    "All initial incoming edges have been counted. Scan vertex IDs in ascending order.",
  );
  for (let v = 0; v < graph.labels.length; v++)
    if (s.indegree[v] === 0) {
      s.queue.push(v);
      emit(
        "Enqueue",
        "kahn.seed",
        `${graph.labels[v]} is a source`,
        "Enqueue each zero-indegree vertex; several may be ready simultaneously.",
      );
    }
  while (s.queue.length) {
    s.current = s.queue.shift()!;
    s.pops++;
    s.edge = -1;
    emit(
      "Dequeue",
      "kahn.pop",
      `Pop ${graph.labels[s.current]}`,
      "FIFO chooses the earliest ready vertex. It is no longer in the queue and has not yet been emitted.",
    );
    s.output.push(s.current);
    emit(
      "EmitVertex",
      "kahn.emit",
      `Emit ${graph.labels[s.current]}`,
      "Append to the topological order. Successor indegrees still include this vertex’s not-yet-retired edges.",
    );
    graph.edges.forEach((e, i) => {
      if (e.from !== s.current) return;
      s.edge = i;
      s.scans++;
      emit(
        "InspectEdge",
        "kahn.inspect",
        `${graph.labels[e.from]} → ${graph.labels[e.to]}`,
        "Inspect this outgoing dependency before changing its target indegree.",
      );
      s.removed[i] = true;
      s.indegree[e.to]!--;
      s.writes++;
      emit(
        "UpdateIndegree",
        "kahn.decrement",
        `Retire edge; indegree[${graph.labels[e.to]}] = ${s.indegree[e.to]}`,
        "This one dependency is satisfied. Other incoming edges remain counted until their own retirement.",
      );
      if (s.indegree[e.to] === 0) {
        s.queue.push(e.to);
        emit(
          "Enqueue",
          "kahn.enqueue",
          `${graph.labels[e.to]} becomes ready`,
          "All incoming dependencies are now retired. Append to the FIFO queue.",
        );
      }
    });
  }
  s.current = -1;
  s.edge = -1;
  s.phase = "done";
  s.cycle = s.output.length !== graph.labels.length;
  s.result = s.cycle
    ? `Cycle exists: emitted ${s.output.length} of ${graph.labels.length}. Residual vertices include a cycle and may include downstream blocked work.`
    : `DAG: emitted all ${graph.labels.length} vertices. This is one valid topological order; ties need not be unique.`;
  emit(
    "CheckCycle",
    "kahn.finish",
    s.cycle
      ? "Queue empty, work remains"
      : "Every prerequisite precedes its dependent",
    s.result,
  );
  return trace;
}
export function dagSnapshot(s: DagState): unknown[] {
  return [
    s.indegree,
    s.counted.map(Number),
    s.removed.map(Number),
    s.queue,
    s.output,
    s.current,
    s.edge,
    s.phase,
    Number(s.cycle),
    s.scans,
    s.pops,
    s.writes,
  ];
}
export function dagInvariants(s: DagState): Invariant[] {
  const counts = s.graph.labels.map((_, v) =>
    s.graph.edges.reduce(
      (n, e, i) => n + Number(e.to === v && s.counted[i] && !s.removed[i]),
      0,
    ),
  );
  const valid = counts.every((n, v) => n === s.indegree[v]);
  const ready =
    s.queue.every((v) => s.indegree[v] === 0 && !s.output.includes(v)) &&
    new Set(s.queue).size === s.queue.length;
  const emitted =
    new Set(s.output).size === s.output.length &&
    s.output.every((v) => s.indegree[v] === 0) &&
    s.graph.edges.every(
      (e) =>
        !s.output.includes(e.to) ||
        (s.output.includes(e.from) &&
          s.output.indexOf(e.from) < s.output.indexOf(e.to)),
    );
  return [
    {
      name: "Residual indegrees",
      status: valid ? "pass" : "fail",
      detail:
        "Each count equals counted incoming edges minus retired incoming edges, even halfway through a vertex.",
    },
    {
      name: "Ready queue",
      status: ready ? "pass" : "fail",
      detail:
        "Queued IDs are distinct, un-emitted and have zero residual indegree.",
    },
    {
      name: "Output is a valid prefix",
      status: emitted ? "pass" : "fail",
      detail:
        "No duplicate output; every emitted vertex had all prerequisites satisfied.",
    },
    {
      name: "Directed acyclic graph",
      status: s.phase !== "done" ? "pending" : s.cycle ? "fail" : "pass",
      detail:
        s.phase !== "done"
          ? "The full acyclicity decision is made when the ready queue is exhausted."
          : s.result,
    },
  ];
}
export function dagScene(s: DagState): GraphScene {
  const label = (v: number) => s.graph.labels[v]!;
  return {
    graph: s.graph,
    fields: s.indegree.map((n, v) => ({
      indegree: n,
      emitted: s.output.includes(v),
      source: !s.graph.edges.some((e) => e.to === v),
      sink: !s.graph.edges.some((e) => e.from === v),
    })),
    active: s.current < 0 ? null : s.current,
    visited: s.output,
    discovered: s.queue,
    edgeStates: Object.fromEntries(
      s.graph.edges.flatMap<[number, "active" | "accepted"]>((_, i) =>
        i === s.edge ? [[i, "active"]] : s.removed[i] ? [[i, "accepted"]] : [],
      ),
    ),
    auxiliary: [
      {
        label: "Zero-indegree queue · front → back",
        entries: s.queue.map(label),
      },
      {
        label: "Residual blocked vertices",
        entries: s.graph.labels.filter(
          (_, v) => s.phase === "done" && !s.output.includes(v),
        ),
      },
    ],
    output: s.output.map(label),
    result: s.result,
    // All presets use these fixed ID slots throughout their trace.
  };
}
export const dagAdapter = {
  ...graphPresentation(dagScene),
  build(_operation: string, inputs: FormData) {
    return kahnTrace(dagGraph(String(inputs.get("preset") ?? "geometry")));
  },
  invariants: dagInvariants,
  regions: () => ["kahn"],
  counters: (s: DagState) => [
    { label: "Edges inspected", value: s.scans },
    { label: "Queue pops", value: s.pops },
    { label: "Indegree writes", value: s.writes },
  ],
};
