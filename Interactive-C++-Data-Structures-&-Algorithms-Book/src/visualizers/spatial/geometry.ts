import type { Bounds, SpatialObject, Vec } from './types';

// Closed query/object bounds include touching faces. Grid membership uses floor.
// These teaching scenes bound coordinates so distance/area arithmetic stays finite.
export function coordinate(n: number): number {
  if (!Number.isFinite(n) || Math.abs(n) > 8) throw new Error('Coordinates must be finite numbers from −8 to 8.');
  return n;
}
export function validateBounds(b: Bounds, dimension: 2 | 3 = b.minZ === undefined ? 2 : 3): Bounds {
  [b.minX, b.minY, b.maxX, b.maxY].forEach(coordinate);
  if (b.minX > b.maxX || b.minY > b.maxY) throw new Error('Minimum coordinates must not exceed maximum coordinates.');
  if (dimension === 3) {
    coordinate(b.minZ!); coordinate(b.maxZ!);
    if (b.minZ! > b.maxZ!) throw new Error('Minimum z must not exceed maximum z.');
  }
  return b;
}
export function overlaps(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
    && (a.minZ ?? 0) <= (b.maxZ ?? 0) && (a.maxZ ?? 0) >= (b.minZ ?? 0);
}
export function containsPoint(b: Bounds, p: Vec): boolean {
  return p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY
    && (p.z ?? 0) >= (b.minZ ?? 0) && (p.z ?? 0) <= (b.maxZ ?? 0);
}
export function containsBounds(a: Bounds, b: Bounds): boolean {
  return containsPoint(a, { x: b.minX, y: b.minY, z: b.minZ }) && containsPoint(a, { x: b.maxX, y: b.maxY, z: b.maxZ });
}
export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
    ...((a.minZ !== undefined || b.minZ !== undefined) ? { minZ: Math.min(a.minZ ?? 0, b.minZ ?? 0), maxZ: Math.max(a.maxZ ?? 0, b.maxZ ?? 0) } : {}) };
}
export function pointBounds(p: Vec): Bounds {
  return { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y, ...(p.z !== undefined ? { minZ: p.z, maxZ: p.z } : {}) };
}
export function distanceSquared(a: Vec, b: Vec): number { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.z ?? 0) - (b.z ?? 0)) ** 2; }
export function numberInput(inputs: FormData, key: string, fallback: number, min: number, max: number): number {
  const raw = inputs.get(key), n = raw === null ? fallback : String(raw).trim() === '' ? NaN : Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${key} must be a number from ${min} to ${max}.`);
  return n;
}
function tuple(raw: string, size: number): number[] {
  const parts = raw.split(',');
  if (parts.length !== size || parts.some(p => p.trim() === '')) throw new Error(`Use ${size} comma-separated coordinates per entry.`);
  return parts.map(p => coordinate(Number(p.trim())));
}
export function parsePoint(raw: string, dimension: 2 | 3): Vec {
  const v = tuple(raw, dimension);
  return { x: v[0]!, y: v[1]!, ...(dimension === 3 ? { z: v[2]! } : {}) };
}
export function parseBounds(raw: string, dimension: 2 | 3): Bounds {
  const v = tuple(raw, dimension * 2);
  return validateBounds(dimension === 2 ? { minX: v[0]!, minY: v[1]!, maxX: v[2]!, maxY: v[3]! }
    : { minX: v[0]!, minY: v[1]!, minZ: v[2]!, maxX: v[3]!, maxY: v[4]!, maxZ: v[5]! }, dimension);
}
function entries(raw: string): string[] {
  if (!raw.trim()) return [];
  const result = raw.split(';');
  if (result.length > 12) throw new Error('Use at most 12 objects so every trace remains inspectable.');
  return result;
}
const scenes = ['uniform', 'clustered', 'overlap', 'sorted', 'empty', 'single', 'duplicates', 'boundary', 'custom'];
function sceneName(inputs: FormData): string {
  const scene = String(inputs.get('scene') ?? 'uniform');
  if (!scenes.includes(scene)) throw new Error('Choose one of the available scenes.');
  return scene;
}
export function readPoints(inputs: FormData, dimension: 2 | 3 = 2): SpatialObject[] {
  const scene = sceneName(inputs);
  const fixtures: Record<string, number[][]> = {
    uniform: [[-6,-5,-6],[-2,-4,2],[3,-5,5],[6,-1,-3],[-5,3,4],[-1,1,-2],[2,5,1],[6,6,6]],
    clustered: [[1,1,1],[1.2,1.1,1.3],[1.4,1.3,1.2],[1.1,1.5,1.1],[1.6,1.4,1.5],[-6,-6,-6],[6,5,5],[5,-6,3]],
    overlap: [[0,0,0],[0,0,0],[0,0,0],[1,1,1],[-1,-1,-1],[2,2,2]],
    sorted: [[-6,-6,-6],[-4,-4,-4],[-2,-2,-2],[0,0,0],[2,2,2],[4,4,4],[6,6,6]],
    empty: [], single: [[0,0,0]], duplicates: [[0,0,0],[0,0,0],[0,0,0],[2,2,2]],
    boundary: [[-8,-8,-8],[0,0,0],[8,8,8],[-2,3,3],[3,-2,-2],[-0.1,-0.1,-0.1]],
  };
  const points = scene === 'custom' ? entries(String(inputs.get('points') ?? '')).map(s => parsePoint(s, dimension))
    : fixtures[scene]!.map(v => ({ x: v[0]!, y: v[1]!, ...(dimension === 3 ? { z: v[2]! } : {}) }));
  return points.map((p, i) => ({ id: String.fromCharCode(65 + i), label: String.fromCharCode(65 + i), point: p, bounds: pointBounds(p), status: 'unvisited', detail: `Point (${p.x}, ${p.y}${dimension === 3 ? `, ${p.z}` : ''})` }));
}
export function readBoxes(inputs: FormData, dimension: 2 | 3 = 2): SpatialObject[] {
  const scene = sceneName(inputs);
  if (scene === 'custom') return entries(String(inputs.get('boxes') ?? '')).map((s,i) => ({ id: String.fromCharCode(65+i), label: String.fromCharCode(65+i), bounds: parseBounds(s, dimension), status: 'unvisited', detail: 'Closed object AABB; touching boundaries overlap.' }));
  const points = readPoints(inputs, dimension);
  return points.map((o,i) => {
    const p = o.point!, radius = scene === 'overlap' ? 4 : scene === 'clustered' ? 0.45 : 0.8;
    const bounds: Bounds = { minX: Math.max(-8,p.x-radius), minY: Math.max(-8,p.y-radius), maxX: Math.min(8,p.x+radius), maxY: Math.min(8,p.y+radius),
      ...(dimension === 3 ? { minZ: Math.max(-8,p.z!-radius), maxZ: Math.min(8,p.z!+radius) } : {}) };
    return { id:o.id, label:o.label, bounds, status:'unvisited', detail:`Object ${i+1}; closed AABB, not the exact shape.` };
  });
}
export function readQuery(inputs: FormData, dimension: 2 | 3 = 2): Bounds {
  return parseBounds(String(inputs.get('query') ?? (dimension === 3 ? '-2,-2,-2,3,3,3' : '-2,-2,3,3')), dimension);
}
export function readQueryPoint(inputs: FormData, dimension: 2 | 3 = 2): Vec {
  return parsePoint(String(inputs.get('queryPoint') ?? (dimension === 3 ? '1,1,1' : '1,1')), dimension);
}
