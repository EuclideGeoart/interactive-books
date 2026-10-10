import { expect, it } from "vitest";
import { graphFrom } from "../../src/visualizers/graph/model";
import {
  structureFault,
  standardGraph,
  structureState,
  structureTrace,
  structureInvariants,
  type StructureOperation,
} from "../../src/visualizers/graph-structure/model";
const run = (op: StructureOperation, g = standardGraph()) => {
  const t = structureTrace(op, structureState(g));
  return t.steps.at(-1)?.state ?? t.initial;
};
it("BFS FIFO gives unweighted shortest paths and differs from DFS on the same graph", () => {
  const bfs = run("bfs"),
    dfs = run("dfs");
  expect(bfs.output).toEqual([0, 1, 2, 3, 4]);
  expect(bfs.distance).toEqual([0, 1, 1, 2, 2]);
  expect(dfs.output).toEqual([0, 1, 3, 4, 2]);
  expect(bfs.scans).toBe(8);
  expect(dfs.scans).toBe(8);
});
it("discovery, distance, predecessor, and enqueue are distinct and immutable snapshots", () => {
  const trace = structureTrace("bfs", structureState(standardGraph()));
  const p = trace.steps.findIndex((s) => s.source === "bfs.predecessor");
  expect(trace.steps[p - 2]!.source).toBe("bfs.discover");
  expect(trace.steps[p - 1]!.source).toBe("bfs.distance");
  expect(trace.steps[p + 1]!.source).toBe("bfs.enqueue");
  expect(trace.initial.color).toEqual([0, 0, 0, 0, 0]);
  expect(trace.steps[0]!.state.queue).toEqual([]);
});
it("a DFS frame retains its next cursor and genuinely backtracks", () => {
  const t = structureTrace("dfs", structureState(standardGraph()));
  const deep = t.steps.find((s) => s.state.frames.length === 3)!;
  expect(deep.state.frames.map((f) => f.vertex)).toEqual([0, 1, 3]);
  expect(deep.state.frames[0]!.next).toBe(1);
  expect(t.steps.filter((s) => s.source === "dfs.backtrack")).toHaveLength(5);
});
it("components launch in ascending ID order, including an isolated vertex", () => {
  const s = run(
    "components",
    graphFrom(
      ["A", "B", "C", "D", "E", "F"],
      [
        [0, 1],
        [1, 2],
        [3, 4],
      ],
    ),
  );
  expect(s.component).toEqual([0, 0, 0, 1, 1, 2]);
  expect(s.launches).toBe(3);
});
it("parent edge and BLACK target do not create false cycles", () => {
  expect(run("cycle").cycle).toBe(false);
  const diamond = graphFrom(
    ["A", "B", "C", "D"],
    [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ],
    true,
  );
  expect(run("cycle", diamond).cycle).toBe(false);
  diamond.directed = false;
  expect(run("cycle", diamond).cycle).toBe(true);
});
it("cycles and self-loops are detected in both direction modes", () => {
  for (const directed of [false, true]) {
    expect(run("cycle", graphFrom(["A"], [[0, 0]], directed)).cycle).toBe(true);
    expect(
      run(
        "cycle",
        graphFrom(
          ["A", "B", "C"],
          [
            [0, 1],
            [1, 2],
            [2, 0],
          ],
          directed,
        ),
      ).cycle,
    ).toBe(true);
  }
});
it("matrix neighbor set matches adjacency with different legitimate ordering and zero-weight edges", () => {
  const g = graphFrom(
    ["A", "B", "C"],
    [
      [0, 2, 0],
      [0, 1],
    ],
  );
  expect(run("inspect", g).output).toEqual([2, 1]);
  expect(run("matrix", g).output).toEqual([1, 2]);
  expect(run("matrix", g).scans).toBe(3);
});
it("directed reachability never invents reverse edges", () => {
  const g = graphFrom(["A", "B"], [[1, 0]], true);
  expect(run("bfs", g).output).toEqual([0]);
});
it("all valid intermediate states pass applicable invariants", () => {
  for (const op of ["bfs", "dfs", "forest", "components", "cycle"] as const) {
    const t = structureTrace(op, structureState(standardGraph()));
    for (const [i, step] of t.steps.entries())
      expect(
        structureInvariants(step.state, i === t.steps.length - 1).filter(
          (x) => x.status === "fail",
        ),
      ).toEqual([]);
  }
});
it("invalid edits leave input unchanged and reversed arcs cannot silently merge", () => {
  const g = graphFrom(
      ["A", "B"],
      [
        [0, 1],
        [1, 0],
      ],
      true,
    ),
    initial = structureState(g);
  expect(() => structureTrace("toggle", initial)).toThrow();
  expect(initial.graph).toEqual(g);
  expect(() => structureTrace("add-vertex", initial, { label: "A" })).toThrow();
  expect(() =>
    structureTrace("add-edge", initial, { from: 0, to: 2 }),
  ).toThrow();
});
it("empty graphs and unreachable vertices have honest outputs", () => {
  for (const op of [
    "bfs",
    "dfs",
    "forest",
    "components",
    "cycle",
    "inspect",
    "matrix",
  ] as const)
    expect(run(op, graphFrom([], [])).output).toEqual([]);
  expect(run("bfs", graphFrom(["A", "B"], [])).distance).toEqual([0, -1]);
});
it("native frame depth cannot exceed vertex count even on cycles", () => {
  const g = graphFrom(
    ["A", "B", "C"],
    [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
  );
  const t = structureTrace("cycle", structureState(g));
  expect(Math.max(...t.steps.map((s) => s.state.frames.length))).toBe(3);
});

it("break-it experiments derive concrete differing results from canonical states", () => {
  for (const kind of [
    "bfs",
    "dfs",
    "components",
    "cycle",
    "representation",
  ] as const) {
    const fault = structureFault(kind);
    expect(fault.broken).not.toBe(fault.expected);
    expect(fault.detail.length).toBeGreaterThan(20);
  }
});
