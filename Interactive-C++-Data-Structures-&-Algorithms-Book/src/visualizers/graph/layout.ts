import type { GraphScene } from "./types";
export interface Point {
  x: number;
  y: number;
}
export interface EdgeRoute {
  path: string;
  label: Point;
  samples: Point[];
  leader?: Point;
}
export interface GraphLayout {
  positions: Point[];
  routes: EdgeRoute[];
  width: number;
  height: number;
}
export const nodeWidth = 112,
  nodeHeight = 58;
// Fixed identity slots: adding a vertex or rewiring a parent never shifts another.
const slots: Point[] = [
  { x: 150, y: 105 },
  { x: 360, y: 55 },
  { x: 570, y: 105 },
  { x: 660, y: 265 },
  { x: 570, y: 425 },
  { x: 360, y: 475 },
  { x: 150, y: 425 },
  { x: 60, y: 265 },
];
function boundary(p: Point, towards: Point): Point {
  const dx = towards.x - p.x,
    dy = towards.y - p.y;
  const scale =
    1 /
    Math.max(
      Math.abs(dx) / (nodeWidth / 2 + 3),
      Math.abs(dy) / (nodeHeight / 2 + 3),
    );
  return { x: p.x + dx * scale, y: p.y + dy * scale };
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function layoutGraph(
  scene: Pick<GraphScene, "graph" | "positions">,
): GraphLayout {
  const positions = scene.graph.labels.map((_, i) => ({
    ...(scene.positions?.[i] ?? slots[i % slots.length]!),
  }));
  const routes: EdgeRoute[] = scene.graph.edges.map((edge) => {
    const a = positions[edge.from]!,
      b = positions[edge.to]!;
    if (edge.from === edge.to) {
      // Self-loop leaves and enters distinct points along the top boundary.
      const start = { x: a.x - 22, y: a.y - 32 },
        end = { x: a.x + 22, y: a.y - 32 };
      const c1 = { x: a.x - 75, y: a.y - 100 },
        c2 = { x: a.x + 75, y: a.y - 100 };
      // Top slot uses the bottom side, preserving the drawing bounds.
      const flip = a.y < 110;
      if (flip) for (const p of [start, end, c1, c2]) p.y = 2 * a.y - p.y;
      const samples = Array.from({ length: 41 }, (_, i) => {
        const t = i / 40,
          q = 1 - t;
        return {
          x:
            q ** 3 * start.x +
            3 * q * q * t * c1.x +
            3 * q * t * t * c2.x +
            t ** 3 * end.x,
          y:
            q ** 3 * start.y +
            3 * q * q * t * c1.y +
            3 * q * t * t * c2.y +
            t ** 3 * end.y,
        };
      });
      return {
        path: `M${start.x} ${start.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`,
        samples,
        label: { ...samples[20]! },
      };
    }
    const length = distance(a, b),
      opposite =
        scene.graph.directed &&
        scene.graph.edges.some((e) => e.from === edge.to && e.to === edge.from);
    const bend = opposite ? 32 : 0;
    const control = {
      x: (a.x + b.x) / 2 - ((b.y - a.y) / length) * bend,
      y: (a.y + b.y) / 2 + ((b.x - a.x) / length) * bend,
    };
    const start = boundary(a, control),
      end = boundary(b, control);
    const samples = Array.from({ length: 41 }, (_, i) => {
      const t = i / 40,
        q = 1 - t;
      return {
        x: q * q * start.x + 2 * q * t * control.x + t * t * end.x,
        y: q * q * start.y + 2 * q * t * control.y + t * t * end.y,
      };
    });
    return {
      path: `M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`,
      samples,
      label: { ...samples[20]! },
    };
  });
  const occupied: Point[] = [];
  const height = Math.max(240, ...positions.map((p) => p.y + 94));
  for (const route of routes) {
    const clear = (p: Point) =>
      p.x >= 34 &&
      p.x <= 696 &&
      p.y >= 18 &&
      p.y <= height - 18 &&
      positions.every(
        (n) => Math.abs(n.x - p.x) > 90 || Math.abs(n.y - p.y) > 46,
      ) &&
      occupied.every(
        (l) => Math.abs(l.x - p.x) > 65 || Math.abs(l.y - p.y) > 25,
      );
    const candidates = [20, 13, 27, 9, 31, 16, 24].flatMap((i) => {
      const a = route.samples[i - 1]!,
        b = route.samples[i + 1]!,
        point = route.samples[i]!;
      const length = distance(a, b) || 1;
      return [-16, 16, -30, 30, -44, 44, -58, 58].map((offset) => ({
        x: point.x - ((b.y - a.y) / length) * offset,
        y: point.y + ((b.x - a.x) / length) * offset,
      }));
    });
    // Very dense weighted inputs may exhaust the nearby label lanes. Reserve
    // an unoccupied interior cell and draw a leader to its actual edge.
    const fallback: Point[] = [];
    for (let y = 24; y < height - 18; y += 28)
      for (let x = 38; x < 696; x += 68) fallback.push({ x, y });
    fallback.sort(
      (a, b) =>
        distance(a, route.samples[20]!) - distance(b, route.samples[20]!),
    );
    route.label =
      candidates.find(clear) ??
      fallback.find(clear) ??
      candidates.find((p) =>
        positions.every(
          (n) => Math.abs(n.x - p.x) > 90 || Math.abs(n.y - p.y) > 46,
        ),
      )!;
    const anchor = route.samples.reduce((best, p) =>
      distance(p, route.label) < distance(best, route.label) ? p : best,
    );
    if (distance(anchor, route.label) > 28) route.leader = anchor;
    occupied.push(route.label);
  }
  return {
    positions,
    routes,
    width: 730,
    height: Math.max(240, ...positions.map((p) => p.y + 94)),
  };
}
