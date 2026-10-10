// Graph-domain presentation only. Algorithm state and invariants stay in chapters.
export interface GraphEdge {
  from: number;
  to: number;
  weight: number;
}
export interface Graph {
  labels: string[];
  edges: GraphEdge[];
  directed: boolean;
}
export interface GraphScene {
  graph: Graph;
  fields: Record<string, string | number | boolean>[];
  active: number | null;
  visited: number[];
  discovered: number[];
  edgeStates: Record<number, "active" | "accepted" | "rejected" | "tree">;
  auxiliary: { label: string; entries: string[] }[];
  output: string[];
  result: string;
  positions?: { x: number; y: number }[];
  showRepresentations?: boolean;
  weighted?: boolean;
}
export interface GraphEvent {
  type: string;
}
