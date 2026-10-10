import { expect, it } from "vitest";
import { graphFrom } from "../../src/visualizers/graph/model";
import type { Graph } from "../../src/visualizers/graph/types";
import {
  structureState,
  structureTrace,
} from "../../src/visualizers/graph-structure/model";
import { kahnTrace } from "../../src/visualizers/graph-dag/model";
import {
  weightedTrace,
  unionFindState,
  unionFindTrace,
  weightedInvariants,
} from "../../src/visualizers/graph-weighted/model";
const end = <S>(t: { initial: S; steps: { state: S }[] }) =>
  t.steps.at(-1)?.state ?? t.initial;
function allPairs(g: Graph) {
  const n = g.labels.length,
    d = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)),
    );
  for (const e of g.edges) {
    d[e.from]![e.to] = Math.min(d[e.from]![e.to]!, e.weight);
    if (!g.directed) d[e.to]![e.from] = Math.min(d[e.to]![e.from]!, e.weight);
  }
  for (let k = 0; k < n; k++)
    for (let u = 0; u < n; u++)
      for (let v = 0; v < n; v++)
        d[u]![v] = Math.min(d[u]![v]!, d[u]![k]! + d[k]![v]!);
  return d;
}
// Exhaust all 4-vertex DAG subsets, then add return edges to make cycle cases.
for (let mask = 0; mask < 64; mask++)
  it(`independent closure oracle for DAG/BFS/DFS subset ${mask}`, () => {
    const pairs: [number, number, number?][] = [];
    let bit = 0;
    for (let u = 0; u < 4; u++)
      for (let v = u + 1; v < 4; v++) {
        if (mask & (1 << bit)) pairs.push([u, v]);
        bit++;
      }
    for (const back of [false, true]) {
      const g = graphFrom(
          ["A", "B", "C", "D"],
          back ? [...pairs, [3, 0]] : pairs,
          true,
        ),
        d = allPairs(g);
      const reachable = d[0]!.flatMap((n, i) =>
        Number.isFinite(n) ? [i] : [],
      );
      const bfs = end(structureTrace("bfs", structureState(g)));
      expect(bfs.distance).toEqual(d[0]!.map((n) => (n === Infinity ? -1 : n)));
      expect(
        [...end(structureTrace("dfs", structureState(g))).output].sort(),
      ).toEqual(reachable);
      const cycle = back && d[0]![3] !== Infinity;
      expect(end(kahnTrace(g)).cycle).toBe(cycle);
      expect(end(structureTrace("cycle", structureState(g))).cycle).toBe(cycle);
    }
  });
for (let seed = 1; seed <= 32; seed++)
  it(`weighted shortest-path oracle fixture ${seed}`, () => {
    const edges: [number, number, number?][] = [];
    let state = seed;
    for (let u = 0; u < 4; u++)
      for (let v = 0; v < 4; v++) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        if (state % 4 === 0) edges.push([u, v, (state >>> 8) % 9]);
      }
    const graph = graphFrom(["A", "B", "C", "D"], edges, true),
      d = allPairs(graph);
    for (let source = 0; source < 4; source++)
      expect(end(weightedTrace("dijkstra", graph, source)).distance).toEqual(
        d[source]!.map((v) => (v === Infinity ? null : v)),
      );
    const negative = graphFrom(
        graph.labels,
        edges.map(([u, v, w]) => [u, v, w! - 4]),
        true,
      ),
      nd = allPairs(negative);
    for (let source = 0; source < 4; source++) {
      const result = end(weightedTrace("bellman-ford", negative, source)),
        hasCycle = nd.some(
          (row, k) => row[k]! < 0 && nd[source]![k] !== Infinity,
        );
      expect(result.negative).toBe(hasCycle);
      if (!hasCycle)
        expect(result.distance).toEqual(
          nd[source]!.map((v) => (v === Infinity ? null : v)),
        );
    }
  });
function forestWeight(
  g: Graph,
  mask: number,
): { weight: number; components: number; acyclic: boolean } {
  const p = g.labels.map((_, i) => i);
  const find = (v: number): number => (p[v] === v ? v : find(p[v]!));
  let weight = 0,
    components = p.length,
    acyclic = true;
  g.edges.forEach((e, i) => {
    if (!(mask & (1 << i))) return;
    const u = find(e.from),
      v = find(e.to);
    if (u === v) acyclic = false;
    else {
      p[v] = u;
      components--;
    }
    weight += e.weight;
  });
  return { weight, components, acyclic };
}
for (let mask = 0; mask < 64; mask++)
  it(`Kruskal minimum forest matches exhaustive edge subsets ${mask}`, () => {
    const tuples: [number, number, number?][] = [];
    let bit = 0;
    for (let u = 0; u < 4; u++)
      for (let v = u + 1; v < 4; v++) {
        if (mask & (1 << bit)) tuples.push([u, v, ((u + v) % 3) - 1]);
        bit++;
      }
    const g = graphFrom(["A", "B", "C", "D"], tuples),
      target = forestWeight(g, (1 << tuples.length) - 1).components;
    let best = Infinity;
    for (let set = 0; set < 1 << tuples.length; set++) {
      const f = forestWeight(g, set);
      if (f.acyclic && f.components === target) best = Math.min(best, f.weight);
    }
    const result = end(weightedTrace("kruskal", g));
    expect(result.total).toBe(best);
    expect(result.components).toBe(target);
    const components = end(structureTrace("components", structureState(g)));
    expect(components.launches).toBe(target);
    const cycle = end(structureTrace("cycle", structureState(g)));
    expect(cycle.cycle).toBe(g.edges.length > 4 - target);
  });
it("DSU mixed unions/compression preserve an independent partition", () => {
  let state = unionFindState(["A", "B", "C", "D", "E", "F", "G", "H"], []);
  const sets = Array.from({ length: 8 }, (_, i) => i);
  for (let step = 0; step < 40; step++) {
    const a = (step * 7 + 1) % 8,
      b = (step * 3 + 5) % 8;
    const from = sets[b]!,
      to = sets[a]!;
    for (let i = 0; i < 8; i++) if (sets[i] === from) sets[i] = to;
    state = end(unionFindTrace("union", state, a, b));
    expect(
      weightedInvariants(state, true).every((r) => r.status === "pass"),
    ).toBe(true);
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++)
        expect(end(unionFindTrace("connected", state, i, j)).answer).toBe(
          Number(sets[i] === sets[j]),
        );
  }
});
