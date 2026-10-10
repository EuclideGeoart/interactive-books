import { beforeAll, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { compileGraphStructureFixture } from "../../scripts/graph-structure-fixture.mjs";
import {
  structureState,
  structureTrace,
  structureSnapshot,
  type StructureOperation,
} from "../../src/visualizers/graph-structure/model";
import { graphFrom } from "../../src/visualizers/graph/model";
let binary: string;
beforeAll(() => {
  binary = compileGraphStructureFixture();
}, 30000);
const fixtures: [number, [number, number, number?][]][] = [
  [0, []],
  [1, []],
  [1, [[0, 0]]],
  [
    5,
    [
      [0, 1],
      [0, 2],
      [1, 3],
      [1, 4],
    ],
  ],
  [
    6,
    [
      [0, 1],
      [1, 2],
      [3, 4],
    ],
  ],
  [
    4,
    [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ],
  ],
  [
    4,
    [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
    ],
  ],
  [
    4,
    [
      [0, 3, 0],
      [0, 1, -2],
      [1, 2, 1000000],
    ],
  ],
];
const groups: [number, string, StructureOperation[]][] = [
  [24, "Graph", ["inspect", "matrix"]],
  [25, "Representations", ["inspect", "matrix"]],
  [26, "BFS", ["bfs"]],
  [27, "DFS", ["dfs", "forest", "cycle"]],
  [28, "Directed", ["inspect", "matrix", "bfs"]],
  [31, "Components", ["components"]],
  [32, "Cycles", ["cycle"]],
];
const reached = new Set<string>();
function parity(
  chapter: number,
  op: StructureOperation,
  n: number,
  edges: [number, number, number?][],
  directed: boolean,
  start = 0,
) {
  const graph = graphFrom(
    Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)),
    edges,
    directed,
  );
  const trace = structureTrace(op, structureState(graph), {
    start,
    from: 0,
    to: n - 1,
    label: "NEW",
    weight: -2,
  });
  const semantic = trace.steps
    .filter((s) => s.source)
    .map((s) => {
      reached.add(`${chapter}:${s.source}`);
      return [s.source, structureSnapshot(s.state)];
    });
  const out = execFileSync(
    binary,
    [
      String(chapter),
      op,
      directed ? "1" : "0",
      String(n),
      String(start),
      ...graph.edges.flatMap((e) => [e.from, e.to, e.weight].map(String)),
    ],
    { encoding: "utf8" },
  );
  const native = out.trim()
    ? out
        .trim()
        .split("\n")
        .map((line) => {
          const at = line.indexOf("|");
          return [line.slice(0, at), JSON.parse(line.slice(at + 1))];
        })
    : [];
  expect(semantic).toEqual(native);
}
for (const [chapter, , ops] of groups)
  for (const op of ops)
    for (const [n, edges] of fixtures)
      for (const directed of chapter === 31 ? [false] : [false, true])
        for (const start of n > 1 ? [0, n - 1] : [0])
          it(`native chapter ${chapter} ${op} n=${n} edges=${JSON.stringify(edges)} directed=${directed} start=${start}`, () =>
            parity(chapter, op, n, edges, directed, start));
for (const op of ["add-vertex", "add-edge", "toggle"] as const)
  it(`native atomic ${op}`, () => parity(24, op, 3, [[0, 1]], false));
it("every tag in every shipped chapter header was exercised and compared", () => {
  const missing = groups.flatMap(([chapter, name]) =>
    [
      ...readFileSync(`cpp/chapter-${chapter}/${name}.hpp`, "utf8").matchAll(
        /@trace ([\w.-]+)/g,
      ),
    ]
      .map((m) => `${chapter}:${m[1]}`)
      .filter((tag) => !reached.has(tag)),
  );
  expect(missing).toEqual([]);
});

it("each canonical source tag names exactly one statement in its header", () => {
  for (const [chapter, name] of groups) {
    const tags = [
      ...readFileSync(`cpp/chapter-${chapter}/${name}.hpp`, "utf8").matchAll(
        /@trace ([\w.-]+)/g,
      ),
    ].map((m) => m[1]);
    expect(
      new Set(tags).size,
      `${chapter}: source tags must not alias statements`,
    ).toBe(tags.length);
  }
});
