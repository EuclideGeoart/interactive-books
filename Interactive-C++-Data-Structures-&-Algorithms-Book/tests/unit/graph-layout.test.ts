import { expect, it } from "vitest";
import {
  layoutGraph,
  nodeWidth,
  nodeHeight,
} from "../../src/visualizers/graph/layout";
import {
  graphFrom,
  neighbors,
  validateGraph,
} from "../../src/visualizers/graph/model";
import {
  dagGraph,
  dagPresets,
  dagScene,
  kahnTrace,
} from "../../src/visualizers/graph-dag/model";
import { drawGraph, inspectGraph } from "../../src/visualizers/graph/diagram";
import type { GraphScene } from "../../src/visualizers/graph/types";
const scene = (n: number): GraphScene => ({
  graph: graphFrom(
    Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)),
    Array.from({ length: n }, (_, u) =>
      Array.from(
        { length: n },
        (_, v) => [u, v, 1] as [number, number, number],
      ),
    ).flat(),
    true,
  ),
  fields: [],
  active: null,
  visited: [],
  discovered: [],
  edgeStates: {},
  auxiliary: [],
  output: [],
  result: "",
  weighted: true,
});
for (let n = 1; n <= 8; n++)
  it(`deterministic ${n}-vertex dense routing avoids unrelated node interiors`, () => {
    const s = scene(n),
      layout = layoutGraph(s);
    expect(layout).toEqual(layoutGraph(s));
    s.graph.edges.forEach((edge, i) => {
      expect(layout.routes[i]!.path).not.toMatch(/NaN|Infinity/);
      for (const node of layout.positions) {
        const label = layout.routes[i]!.label;
        expect(
          Math.abs(node.x - label.x) >= nodeWidth / 2 + 31 ||
            Math.abs(node.y - label.y) >= nodeHeight / 2 + 12,
        ).toBe(true);
      }
      for (const point of layout.routes[i]!.samples)
        for (let v = 0; v < n; v++) {
          if (v === edge.from || v === edge.to) continue;
          const node = layout.positions[v]!;
          expect(
            Math.abs(point.x - node.x) >= nodeWidth / 2 ||
              Math.abs(point.y - node.y) >= nodeHeight / 2,
          ).toBe(true);
        }
    });
  });
for (const name of dagPresets)
  it(`DAG ${name} layout stable at every semantic state`, () => {
    const trace = kahnTrace(dagGraph(name)),
      positions = layoutGraph(dagScene(trace.initial)).positions;
    for (const step of trace.steps)
      expect(layoutGraph(dagScene(step.state)).positions).toEqual(positions);
  });
it("adding a vertex preserves existing identity positions", () => {
  expect(layoutGraph(scene(5)).positions.slice(0, 4)).toEqual(
    layoutGraph(scene(4)).positions,
  );
});
it("representations derive from one graph and synchronize edge selection", () => {
  const s = scene(2);
  s.showRepresentations = true;
  const html = drawGraph(s, "test", "logical", "cell:0:1");
  expect(html).toContain("Adjacency matrix");
  expect(html).toContain("Adjacency list");
  expect(html).toContain('data-inspect="e:1"');
  expect(html).toContain("graph-corresponding");
  expect(inspectGraph(s, "cell:0:1")).toContain("A → B");
});
it("undirected loop degree is two but neighbor iteration yields the loop once", () => {
  const s = scene(1);
  s.graph.directed = false;
  expect(neighbors(s.graph, 0)).toHaveLength(1);
  expect(inspectGraph(s, "v:0")).toContain("2 (loop counts twice)");
});
it("graph input boundary rejects malformed labels, endpoints, duplicates and unsafe weights", () => {
  for (const graph of [
    { labels: ["A", "A"], edges: [], directed: false },
    { labels: ["A"], edges: [{ from: 0, to: 1, weight: 1 }], directed: false },
    {
      labels: ["A", "B"],
      edges: [
        { from: 0, to: 1, weight: 1 },
        { from: 1, to: 0, weight: 1 },
      ],
      directed: false,
    },
    {
      labels: ["A"],
      edges: [{ from: 0, to: 0, weight: Infinity }],
      directed: true,
    },
  ])
    expect(() => validateGraph(graph)).toThrow();
  expect(() => validateGraph(scene(2).graph)).not.toThrow();
});
it("vertex labels and inspector values are escaped", () => {
  const s = scene(1);
  s.graph.labels[0] = "<script>";
  s.fields = [{ note: "<img>" }];
  const html = drawGraph(s, "safe", "memory", null);
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("&lt;img&gt;");
});
