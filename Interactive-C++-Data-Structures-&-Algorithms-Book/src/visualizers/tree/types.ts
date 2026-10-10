import type { Lifetime } from '../../engine/types';

// A tree-local presentation projection, never a reducer or a graph data model.
// Adapters expose only actual live fields and links of their canonical C++ type.
export interface TreeViewNode {
  address: string;
  lifetime: Lifetime;
  label: string;
  fields: { name: string; value: string | number | boolean }[];
  links: { name: string; target: string | null; structural: boolean }[];
  tone?: 'red' | 'black';
  badge?: string;
}
export interface TreeScene {
  nodes: TreeViewNode[];
  root: string | null;
  references: Record<string, string | null>;
  active: string | null;
  visited: string[];
  auxiliary: { label: string; entries: string[] }[];
  output: string[];
  result: string;
}
