import type { TreeScene, TreeViewNode } from './types';

export interface TreeBox {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}
export interface TreeLayout {
  boxes: Map<string, TreeBox>;
  width: number;
  height: number;
  hierarchy: Set<string>;
}
export const TREE_NODE_HEIGHT = 96;
const GAP = 28,
  LEVEL = 178,
  TOP = 64,
  MARGIN = 36;
export const treeNodeWidth = (node: TreeViewNode): number =>
  Math.max(
    144,
    node.label.length * 12 + 32,
    (node.badge?.length ?? 0) * 7 + 24,
    node.address.length * 7 + 24,
  );
export const treeEdgeKey = (from: string, field: string): string =>
  `${from}\u0000${field}`;

/** Ordered subtree widths, with vacant binary slots retained. No graph solver. */
export function layoutTree(
  scene: TreeScene,
  view: 'logical' | 'memory' = 'logical',
): TreeLayout {
  const boxes = new Map<string, TreeBox>();
  const hierarchy = new Set<string>();
  if (!scene.nodes.length) return { boxes, hierarchy, width: 520, height: 200 };
  if (view === 'memory') {
    // Separate allocation rows are deliberately unrelated to structural adjacency.
    let maxWidth = 0;
    [...scene.nodes]
      .sort((a, b) => a.address.localeCompare(b.address))
      .forEach((node, i) => {
        const width = treeNodeWidth(node);
        maxWidth = Math.max(maxWidth, width);
        boxes.set(node.address, {
          x: 66,
          y: TOP + i * LEVEL,
          width,
          height: TREE_NODE_HEIGHT,
          depth: i,
        });
      });
    return {
      boxes,
      hierarchy,
      width: Math.max(520, maxWidth + 260 + scene.nodes.length * 12),
      height: TOP + scene.nodes.length * LEVEL,
    };
  }
  const nodes = new Map(scene.nodes.map((node) => [node.address, node]));
  const seen = new Set<string>();
  type Branch = {
    node: TreeViewNode;
    width: number;
    children: (Branch | null)[];
  };
  function measure(address: string): Branch | null {
    const node = nodes.get(address);
    if (!node || seen.has(address)) return null;
    seen.add(address);
    const links =
      node.lifetime === 'live'
        ? node.links.filter((link) => link.structural)
        : [];
    const children = links.map((link) => {
      const child = link.target ? measure(link.target) : null;
      if (child) hierarchy.add(treeEdgeKey(address, link.name));
      return child;
    });
    const occupied = children.some(Boolean);
    const childWidth = occupied
      ? children.reduce((sum, child) => sum + (child?.width ?? 56), 0) +
        Math.max(0, children.length - 1) * GAP
      : 0;
    return {
      node,
      children: occupied ? children : [],
      width: Math.max(treeNodeWidth(node), childWidth),
    };
  }
  const forest: Branch[] = [];
  const root = scene.root ? measure(scene.root) : null;
  if (root) forest.push(root);
  // Detached nodes and lifetime tombstones remain inspectable during rewiring.
  for (const node of scene.nodes) {
    const branch = measure(node.address);
    if (branch) forest.push(branch);
  }
  let maxBottom = TOP + TREE_NODE_HEIGHT;
  function place(branch: Branch, left: number, depth: number): void {
    const width = treeNodeWidth(branch.node),
      y = TOP + depth * LEVEL;
    boxes.set(branch.node.address, {
      x: left + (branch.width - width) / 2,
      y,
      width,
      height: TREE_NODE_HEIGHT,
      depth,
    });
    maxBottom = Math.max(maxBottom, y + TREE_NODE_HEIGHT);
    const total =
      branch.children.reduce((sum, child) => sum + (child?.width ?? 56), 0) +
      Math.max(0, branch.children.length - 1) * GAP;
    let next = left + (branch.width - total) / 2;
    for (const child of branch.children) {
      if (child) place(child, next, depth + 1);
      next += (child?.width ?? 56) + GAP;
    }
  }
  let cursor = MARGIN;
  for (const branch of forest) {
    place(branch, cursor, 0);
    cursor += branch.width + GAP * 2;
  }
  return {
    boxes,
    hierarchy,
    width: Math.max(520, cursor + MARGIN + scene.nodes.length * 12),
    height: maxBottom + 88,
  };
}

/** Routes stay in the clear inter-level channels, including temporary cycles. */
export function treeLinkPath(
  layout: TreeLayout,
  from: string,
  target: string,
  field: string,
  index = 0,
): string {
  const a = layout.boxes.get(from),
    b = layout.boxes.get(target);
  if (!a || !b) return '';
  const ax = a.x + a.width / 2,
    bx = b.x + b.width / 2;
  if (
    layout.hierarchy.has(treeEdgeKey(from, field)) &&
    b.depth === a.depth + 1
  ) {
    return `M${ax} ${a.y + a.height} C${ax} ${a.y + a.height + 40} ${bx} ${b.y - 40} ${bx} ${b.y - 4}`;
  }
  // Actual parent pointers can use the same free channel in the reverse direction.
  if (a.depth === b.depth + 1 && b.x <= a.x + a.width && b.x + b.width >= a.x) {
    return `M${ax + 12} ${a.y} C${ax + 12} ${a.y - 38} ${bx + 12} ${b.y + b.height + 38} ${bx + 12} ${b.y + b.height + 4}`;
  }
  const outer =
    layout.width - 20 - (index % Math.max(1, layout.boxes.size)) * 10;
  return `M${ax} ${a.y + a.height} V${a.y + a.height + 34} H${outer} V${b.y - 28} H${bx} V${b.y - 4}`;
}
