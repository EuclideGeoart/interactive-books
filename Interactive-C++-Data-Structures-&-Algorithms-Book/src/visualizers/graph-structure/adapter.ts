import type { LabAdapter } from "../../components/controls/lab-types";
import { graphFrom, graphPresentation } from "../graph/model";
import type { GraphEvent } from "../graph/types";
import {
  structureState,
  structureTrace,
  structureScene,
  structureInvariants,
  type StructureOperation,
  type StructureState,
} from "./model";
export const structureChapters = {
  "graph-fundamentals": ["inspect", "add-vertex", "add-edge", "toggle"],
  "graph-representations": ["inspect", "matrix"],
  "graph-bfs": ["bfs"],
  "graph-dfs": ["dfs", "forest"],
  "graph-directed": ["inspect", "bfs"],
  "graph-components": ["components"],
  "graph-cycle": ["cycle"],
} as const;
export type StructureKey = keyof typeof structureChapters;
export function structureInputs(inputs: FormData, key: StructureKey) {
  const preset = String(
    inputs.get("preset") ??
      (key === "graph-components" ? "disconnected" : "standard"),
  );
  const directed =
    key === "graph-directed" ||
    String(inputs.get("directed") ?? "false") === "true";
  const definitions: Record<string, [string, string]> = {
    standard: ["A,B,C,D,E", "0,1;0,2;1,3;1,4"],
    disconnected: ["A,B,C,D,E,F", "0,1;1,2;3,4"],
    cycle: ["A,B,C,D", "0,1;1,2;2,0;2,3"],
    diamond: ["A,B,C,D", "0,1;0,2;1,3;2,3"],
    empty: ["", ""],
    single: ["A", ""],
    loop: ["A", "0,0"],
    dense: ["A,B,C,D", "0,1;0,2;0,3;1,2;1,3;2,3"],
  };
  const definition =
    preset === "custom"
      ? [String(inputs.get("labels") ?? ""), String(inputs.get("edges") ?? "")]
      : definitions[preset];
  if (!definition) throw new Error("Choose a listed preset.");
  const labels = definition[0]!.trim()
    ? definition[0]!.split(",").map((x) => x.trim())
    : [];
  const tuples: [number, number, number?][] = definition[1]!.trim()
    ? definition[1]!.split(";").map((entry) => {
        const parts = entry
          .trim()
          .split(",")
          .map((x) => x.trim());
        if (
          parts.length < 2 ||
          parts.length > 3 ||
          parts.some((x) => !/^-?\d+$/.test(x))
        )
          throw new Error(
            "Edges use numeric IDs: 0,1;0,2,5 (optional weight).",
          );
        return [
          Number(parts[0]),
          Number(parts[1]),
          parts[2] === undefined ? 1 : Number(parts[2]),
        ];
      })
    : [];
  const integer = (name: string, fallback: number) => {
    const raw = String(inputs.get(name) ?? fallback).trim();
    if (!/^-?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)))
      throw new Error(`${name} must be a safe integer.`);
    return Number(raw);
  };
  return {
    graph: graphFrom(labels, tuples, directed),
    options: {
      start: integer("start", 0),
      from: integer("from", 2),
      to: integer("to", 3),
      label: String(inputs.get("label") ?? "F").trim(),
      weight: integer("weight", 1),
    },
  };
}
function adapter(key: StructureKey): LabAdapter<StructureState, GraphEvent> {
  return {
    build(operation, inputs) {
      if (!(structureChapters[key] as readonly string[]).includes(operation))
        throw new Error("Choose an operation shown in this chapter.");
      const { graph, options } = structureInputs(inputs, key);
      return structureTrace(
        operation as StructureOperation,
        structureState(
          graph,
          operation as StructureOperation,
          key === "graph-representations",
        ),
        options,
      );
    },
    ...graphPresentation(structureScene),
    invariants: structureInvariants,
    regions(operation) {
      return [
        operation === "matrix"
          ? "inspect"
          : operation === "forest" || operation === "cycle"
            ? "dfs"
            : ["add-vertex", "add-edge", "toggle"].includes(operation)
              ? "edit"
              : operation,
      ];
    },
    counters: (s) => [
      { label: "Vertices", value: s.graph.labels.length },
      { label: "Edges", value: s.graph.edges.length },
      { label: "Adjacency / cell reads", value: s.scans },
      { label: "Output vertices", value: s.output.length },
      { label: "Search launches", value: s.launches },
    ],
  };
}
export const graphStructureAdapters = Object.fromEntries(
  Object.keys(structureChapters).map((key) => [
    key,
    adapter(key as StructureKey),
  ]),
) as Record<StructureKey, LabAdapter<StructureState, GraphEvent>>;
