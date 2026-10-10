import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { compileDagFixture } from "../../scripts/graph-dag-fixture.mjs";
import {
  dagGraph,
  dagPresets,
  dagSnapshot,
  dagInvariants,
  kahnTrace,
} from "../../src/visualizers/graph-dag/model";
import { graphFrom } from "../../src/visualizers/graph/model";
import { PlaybackController } from "../../src/engine/playback";
let binary: string;
beforeAll(() => {
  binary = compileDagFixture();
});
for (const name of dagPresets)
  it(`Kahn ${name}: every source-tagged native snapshot, invariants, replay`, () => {
    const graph = dagGraph(name),
      trace = kahnTrace(graph);
    const actual = execFileSync(
      binary,
      [
        String(graph.labels.length),
        ...graph.edges.flatMap((e) => [String(e.from), String(e.to)]),
      ],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .map((line) => {
        const [tag, json] = line.split("|");
        return [tag, JSON.parse(json!)];
      });
    expect(trace.steps.map((s) => [s.source, dagSnapshot(s.state)])).toEqual(
      actual,
    );
    for (const { state } of trace.steps)
      expect(
        dagInvariants(state)
          .slice(0, 3)
          .every((i) => i.status === "pass"),
      ).toBe(true);
    const end = trace.steps.at(-1)!.state;
    if (!end.cycle) {
      const order = new Map(end.output.map((v, i) => [v, i]));
      expect(
        graph.edges.every((e) => order.get(e.from)! < order.get(e.to)!),
      ).toBe(true);
    }
    const player = new PlaybackController(trace, () => {});
    player.seek(player.total);
    const snapshot = dagSnapshot(player.state);
    player.previous();
    player.next();
    expect(dagSnapshot(player.state)).toEqual(snapshot);
    player.reset();
    expect(player.state).toEqual(trace.initial);
    player.dispose();
  });
it("all Kahn tags are executed and resolve to canonical source", () => {
  const source = readFileSync("cpp/chapter-30/Kahn.hpp", "utf8");
  const tags = [...source.matchAll(/@trace ([\w.-]+)/g)].map((m) => m[1]);
  const seen = new Set(
    dagPresets.flatMap((p) =>
      kahnTrace(dagGraph(p)).steps.map((s) => s.source),
    ),
  );
  expect(tags.sort()).toEqual([...seen].sort());
});
it("emission does not retire outgoing edges before their decrement", () => {
  const steps = kahnTrace(dagGraph("diamond")).steps;
  const emitted = steps.find((s) => s.source === "kahn.emit")!.state;
  expect(emitted.output).toEqual([0]);
  expect(emitted.indegree).toEqual([0, 1, 1, 2]);
  expect(emitted.removed.every((v) => !v)).toBe(true);
  const first = steps.find((s) => s.source === "kahn.decrement")!.state;
  expect(first.indegree).toEqual([0, 0, 1, 2]);
  expect(first.removed).toEqual([true, false, false, false]);
});
it("residual blocked work is not falsely labelled as all cycle members", () => {
  const end = kahnTrace(dagGraph("cycle")).steps.at(-1)!.state;
  expect(end.cycle).toBe(true);
  expect(end.output).toEqual([0, 4]);
  expect(end.result).toContain("downstream");
});
it("deterministic ties are one valid partial-order linearization", () => {
  const a = kahnTrace(
    graphFrom(
      ["A", "B", "C"],
      [
        [0, 2],
        [1, 2],
      ],
      true,
    ),
  ).steps.at(-1)!.state;
  expect(a.output).toEqual([0, 1, 2]);
  expect(a.cycle).toBe(false);
});
