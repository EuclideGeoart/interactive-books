import { traceFrom } from '../../platform/trace';
import { dbscan, hierarchical, cutHierarchy, inspectLloyd, lloydTrace, initialize, editLloyd, vector, integer, finite, type LloydState, type Point, type Vec, type Linkage } from './model/clustering';
export type Mode = 'lloyd' | 'failures' | 'alternatives';
export interface LabState { readonly lloyd: LloydState; readonly seed: number; readonly epsilon: number; readonly minPoints: number; readonly linkage: Linkage; readonly mergeCount: number }
const rows = (values: readonly Vec[]): readonly Point[] => values.map((x, i) => ({ id: `s${i + 1}`, x }));
export function initialLab(mode: Mode): LabState {
  const points = mode === 'alternatives' ? rows([[0,0],[.1,0],[.2,0],[.3,0],[.6,0],[2,0]]) : rows([[-3,0],[-1,0],[1,0],[3,0]]);
  return { lloyd: { points, centers: [[-3,0],[1,0]], scales: [1,1], phase: 'ready', labels: null, iteration: 0, stopped: false }, seed: 7, epsilon: .31, minPoints: 4, linkage: 'single', mergeCount: 1 };
}
export function scenario(s: LabState, kind: string): LabState {
  let points = s.lloyd.points, centers = s.lloyd.centers;
  if (kind === 'vertical' || kind === 'horizontal') { points = rows([[-2,-1],[-2,1],[2,-1],[2,1]]); centers = kind === 'vertical' ? [[-2,0],[2,0]] : [[0,-1],[0,1]]; }
  else if (kind === 'empty') { points = rows([[-1,0],[1,0]]); centers = [[0,0],[0,0]]; }
  else if (kind === 'coincident') { points = rows([[1,1],[1,1],[1,1]]); centers = [[1,1],[1,1],[1,1]]; }
  else if (kind === 'density') { points = initialLab('alternatives').lloyd.points; centers = [[0,0],[2,0]]; }
  else if (kind === 'border') { points = rows([[-1.5,0],[-1.5,.1],[-1.5,-.1],[-.9,0],[1.5,0],[1.5,.1],[1.5,-.1],[.9,0],[0,0]]); centers = [[-1.5,0],[1.5,0]]; }
  else throw new RangeError('Unknown scenario.');
  return { ...s, lloyd: editLloyd(s.lloyd, { points, centers, scales: [1,1] }), mergeCount: 0, minPoints: Math.min(4, points.length), epsilon: kind === 'border' ? 1 : .31 };
}
export function reseed(s: LabState, k = s.lloyd.centers.length): LabState {
  return { ...s, lloyd: editLloyd(s.lloyd, { centers: initialize(s.lloyd.points, k, s.seed) }) };
}
export function editCoordinate(s: LabState, kind: 'point' | 'center', index: number, x: Vec): LabState {
  vector(x, 'Edited coordinate'); if (x.some(v => v < -5 || v > 5)) throw new RangeError('Editable coordinates must be in −5…5.');
  integer(index, 0, (kind === 'point' ? s.lloyd.points : s.lloyd.centers).length - 1, 'Edited index');
  const patch = kind === 'point' ? { points: s.lloyd.points.map((p, i) => i === index ? { ...p, x } : p) } : { centers: s.lloyd.centers.map((c, i) => i === index ? x : c) };
  return { ...s, lloyd: editLloyd(s.lloyd, patch) };
}
export function pointerCoordinate(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Vec {
  finite(clientX, 'Pointer x'); finite(clientY, 'Pointer y');
  for (const value of [rect.left, rect.top, rect.width, rect.height]) finite(value, 'Physical plot bounds');
  if (!(rect.width > 0 && rect.height > 0)) throw new RangeError('Plot needs a physical viewport.');
  const snap = (v: number) => Math.max(-5, Math.min(5, Math.round(v * 10) / 10)) + 0;
  return [snap((560 * (clientX - rect.left) / rect.width - 280) / 42), snap((280 - 560 * (clientY - rect.top) / rect.height) / 42)];
}
export function deriveLab(s: LabState, width = 560) {
  integer(s.seed, 0, 0xffffffff, 'Seed'); integer(s.mergeCount, 0, s.lloyd.points.length - 1, 'Merge count');
  s.lloyd.points.forEach(p => { if (p.x.some(v => v < -5 || v > 5)) throw new RangeError('Plot coordinates must be in −5…5.'); });
  s.lloyd.centers.forEach(c => { if (c.some(v => v < -5 || v > 5)) throw new RangeError('Plot centroids must be in −5…5.'); });
  if (s.lloyd.scales.some(v => v < .1 || v > 10)) throw new RangeError('Sheet scales must be in 0.1…10.');
  const lloyd = inspectLloyd(s.lloyd), hierarchy = hierarchical(s.lloyd.points, s.linkage, s.lloyd.scales);
  const density = dbscan(s.lloyd.points, s.epsilon, s.minPoints, s.lloyd.scales), groups = cutHierarchy(s.lloyd.points, hierarchy.merges, s.mergeCount);
  const positions = new Map<number, { x: number; y: number }>();
  s.lloyd.points.forEach((_, i) => positions.set(i, { x: 45 + i * 470 / Math.max(1, s.lloyd.points.length - 1), y: 245 }));
  const maxHeight = Math.max(1, ...hierarchy.merges.map(m => m.height));
  const branches = hierarchy.merges.map((m, i) => {
    const left = positions.get(m.left.id)!, right = positions.get(m.right.id)!, y = 245 - 185 * m.height / maxHeight, x = (left.x + right.x) / 2;
    positions.set(m.group.id, { x, y });
    return { ...m, active: i < s.mergeCount, path: `M${left.x},${left.y}V${y}H${right.x}V${right.y}`, labelX: x, labelY: y - 7 };
  });
  const px = (v: Vec) => ({ cx: 280 + 42 * v[0], cy: 280 - 42 * v[1] });
  return { state: s, lloyd, hierarchy, density, groups, branches, leaves: s.lloyd.points.map((p, i) => ({ id: p.id, ...positions.get(i)! })),
    points: s.lloyd.points.map((p, i) => ({ ...p, ...px(p.x), cluster: lloyd.labels[i]!, densityLabel: density.labels[i]!, kind: density.kinds[i]! })),
    centers: s.lloyd.centers.map((x, i) => ({ x, index: i, ...px(x) })),
    fontSize: Math.max(16, 14.2 * 560 / Math.max(1, width)), hitRadius: Math.max(22, 22 * 560 / Math.max(1, width)),
    speech: `Phase ${s.lloyd.phase}; WCSS approximately ${shown(lloyd.objective)}; assignments ${lloyd.labels.join(', ')}; ${density.count} density clusters.`,
    formulas: [{ label: 'Scaled squared distance and minimum-distance assignment', tex: 'd_{ij}^2=\\sum_{r=1}^2((x_{ir}-c_{jr})/s_r)^2,\\quad a_i=\\operatorname*{arg\\,min}_j d_{ij}^2' },
      { label: 'Mean update and within-cluster sum of squares', tex: '\\mu_j=\\frac{1}{|C_j|}\\sum_{i\\in C_j}x_i,\\quad J=\\sum_i d_{i,a_i}^2' }],
    inspector: [{ label: 'X · samples in rows', value: `${s.lloyd.points.length} × 2`, detail: 'Each mathematical feature vector is a 2 × 1 column.' },
      { label: 'Centroids / squared distances / assignments', value: `${s.lloyd.centers.length} × 2 / ${s.lloyd.points.length} × ${s.lloyd.centers.length} / ${s.lloyd.points.length} × 1` },
      { label: 'Held-assignment WCSS', value: `≈ ${shown(lloyd.objective)}`, detail: s.lloyd.labels === null ? 'Nearest-label preview; press Assign to commit.' : 'Uses displayed committed labels, including after a mean update.' },
      { label: 'Next nearest-assignment WCSS', value: `≈ ${shown(lloyd.nearestObjective)}`, detail: 'Allows labels to change; same current centroids.' },
      { label: 'Mean update · current → proposed WCSS', value: `≈ ${shown(lloyd.objective)} → ≈ ${shown(lloyd.proposedObjective)}`, detail: 'Held assignments; empty centroids retained. Inspect before applying Update means.' },
      { label: 'Phase and stop', value: `${s.lloyd.phase} · ${s.lloyd.iteration} mean updates`, detail: s.lloyd.stopped ? 'Centroids exactly unchanged at binary64 precision; no global guarantee.' : 'Not stopped; replay is capped at 40 half-steps.' },
      { label: 'Empty-cluster policy', value: 'Retain previous centroid', detail: 'Empty mean is undefined. Retained coordinates are a policy, not a computed empty mean.' },
      { label: 'Input provenance / initialization', value: `Hand-authored observations / seed ${s.seed}`, detail: 'Seed affects partial Fisher–Yates observation selection only. Current centroids may be edited.' }] };
}
export const shown = (v: number) => String(Number(v.toPrecision(6)) + 0);
export function alternativeTrace(s: LabState) {
  return traceFrom(Array.from({ length: s.lloyd.points.length }, (_, mergeCount) => ({ state: { ...s, mergeCount }, explanation: `${mergeCount} actual ${s.linkage}-linkage merges; ${s.lloyd.points.length - mergeCount} groups remain.` })));
}
export function labTrace(s: LabState, mode: Mode) {
  return mode === 'alternatives' ? alternativeTrace(s) : traceFrom(lloydTrace(s.lloyd).map(f => ({ state: { ...s, lloyd: f.state }, explanation: f.explanation })));
}
