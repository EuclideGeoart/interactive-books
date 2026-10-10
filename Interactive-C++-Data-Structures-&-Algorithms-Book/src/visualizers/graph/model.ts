import type { Graph, GraphScene } from "./types";
import { drawGraph, inspectGraph, describeGraph } from "./diagram";

export function neighbors(
  graph: Graph,
  vertex: number,
): { vertex: number; edge: number; weight: number }[] {
  return graph.edges.flatMap((e, edge) =>
    e.from === vertex
      ? [{ vertex: e.to, edge, weight: e.weight }]
      : !graph.directed && e.to === vertex
        ? [{ vertex: e.from, edge, weight: e.weight }]
        : [],
  );
}
export function validateGraph(graph: Graph): void {
  if (
    graph.labels.length > 8 ||
    new Set(graph.labels).size !== graph.labels.length ||
    graph.labels.some((l) => !l.trim() || l.length > 24)
  )
    throw new Error(
      "Use up to eight distinct vertex labels, each 1–24 characters.",
    );
  const pairs = new Set<string>();
  for (const edge of graph.edges) {
    if (
      ![edge.from, edge.to].every(
        (v) => Number.isInteger(v) && v >= 0 && v < graph.labels.length,
      )
    )
      throw new Error("Every endpoint must name an existing vertex.");
    if (!Number.isSafeInteger(edge.weight) || Math.abs(edge.weight) > 1_000_000)
      throw new Error("Weights must be integers from −1,000,000 to 1,000,000.");
    const key = graph.directed
      ? `${edge.from}:${edge.to}`
      : [edge.from, edge.to].sort((a, b) => a - b).join(":");
    if (pairs.has(key))
      throw new Error(
        "Parallel edges are not supported; choose another pair. Self-loops are allowed.",
      );
    pairs.add(key);
  }
}
export function graphFrom(
  labels: string[],
  edges: [number, number, number?][],
  directed = false,
): Graph {
  const graph = {
    labels: [...labels],
    edges: edges.map(([from, to, weight = 1]) => ({ from, to, weight })),
    directed,
  };
  validateGraph(graph);
  return graph;
}
export function graphPresentation<S>(project: (state: S) => GraphScene) {
  return {
    draw: (
      state: S,
      id: string,
      view: "logical" | "memory",
      selected: string | null,
    ) => drawGraph(project(state), id, view, selected),
    inspect: (state: S, selected: string | null) =>
      inspectGraph(project(state), selected),
    describe: (state: S) => describeGraph(project(state)),
  };
}
