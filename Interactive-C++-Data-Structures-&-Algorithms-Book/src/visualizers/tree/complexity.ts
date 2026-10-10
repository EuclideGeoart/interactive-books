export type TreeKind =
  'binary' | 'bst' | 'traversal' | 'mutation' | 'avl' | 'rb' | 'btree' | 'trie';
export function binarySearchPath(
  size: number,
  shape: 'balanced' | 'skewed',
): number[] {
  const path: number[] = [];
  let low = 1,
    high = size;
  while (low <= high) {
    const node = shape === 'balanced' ? Math.floor((low + high) / 2) : low;
    path.push(node);
    low = node + 1;
  }
  return path;
}
export function avlHeightBound(size: number): number {
  // Minimum nodes at edge-height h: N(h)=1+N(h-1)+N(h-2).
  let older = 0,
    previous = 1,
    height = 0;
  while (1 + older + previous <= size) {
    const next = 1 + older + previous;
    older = previous;
    previous = next;
    height++;
  }
  return size ? height : -1;
}
export function pageLevels(
  size: number,
  fanout: number,
): { levels: number; capacities: number[] } {
  let total = 0,
    pages = 1;
  const capacities: number[] = [];
  while (total < size) {
    total += pages * (fanout - 1);
    capacities.push(total);
    pages *= fanout;
  }
  return { levels: capacities.length, capacities };
}
