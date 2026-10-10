// Part VI presentation only. Algorithm state, trace construction and invariants
// remain with each chapter family; no indexed-data engine is introduced.
export interface SortItem { key: number; id: number }
export interface SortRow {
  id: string;
  label: string;
  items: (SortItem | null)[];
  active?: number[];
  finalized?: number[];
  fault?: number[];
  muted?: number[];
  cursors?: { label: string; index: number }[];
  ranges?: { label: string; low: number; high: number }[]; // half-open
  padDigits?: number; // decimal display width for radix passes
  activeDigit?: number; // zero-based from the units column
  labels?: string[]; // optional index labels, e.g. count keys
}
export interface SortingScene {
  title: string;
  rows: SortRow[];
  facts: [string, string][];
  message: string;
  // Optional simultaneous heap tree; indices refer to the first row.
  heapSize?: number;
}
