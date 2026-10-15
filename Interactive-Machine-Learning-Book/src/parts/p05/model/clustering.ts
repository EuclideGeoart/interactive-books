import { seeded } from '../../../platform/seed';
import { traceFrom } from '../../../platform/trace';
export type Vec = readonly [number, number];
export interface Point { readonly id: string; readonly x: Vec }
export interface LloydState {
  readonly points: readonly Point[]; readonly centers: readonly Vec[]; readonly scales: Vec;
  readonly labels: readonly number[] | null; readonly phase: 'ready' | 'assign' | 'update';
  readonly iteration: number; readonly stopped: boolean;
}
export function finite(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${name} must be finite; previous state preserved.`);
  return value;
}
export function integer(value: number, lo: number, hi: number, name: string): void {
  finite(value, name); if (!Number.isInteger(value) || value < lo || value > hi) throw new RangeError(`${name} must be an integer in ${lo}…${hi}.`);
}
export function vector(v: Vec, name: string): void {
  if (!Array.isArray(v) || v.length !== 2) throw new RangeError(`${name} needs a dense two-feature row.`);
  for (let j = 0; j < 2; j++) finite(v[j]!, name);
}
export function validatePoints(points: readonly Point[]): void {
  if (!Array.isArray(points) || points.length < 1 || points.length > 32) throw new RangeError('Use 1–32 observations. Empty data have no clustering objective.');
  const ids = new Set<string>();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p || typeof p.id !== 'string' || !p.id.trim() || ids.has(p.id)) throw new RangeError('Observation IDs must be unique nonempty strings.');
    ids.add(p.id); vector(p.x, 'Observation');
  }
}
export function validateScales(scales: Vec): void {
  vector(scales, 'Reference scales'); if (scales.some(s => s <= 0)) throw new RangeError('Reference scales must be positive.');
}
export function squaredDistance(a: Vec, b: Vec, scales: Vec = [1, 1]): number {
  vector(a, 'First vector'); vector(b, 'Second vector'); validateScales(scales);
  let sum = 0;
  for (let j = 0; j < 2; j++) {
    const difference = finite(a[j]! - b[j]!, 'Coordinate difference');
    const delta = finite(difference / scales[j]!, 'Scaled difference');
    const square = finite(delta * delta, 'Squared difference');
    if (difference !== 0 && (delta === 0 || square === 0)) throw new RangeError('Distance underflow: rescale coordinates or reference scales so distinct points remain distinguishable.');
    sum = finite(sum + square, 'Squared distance');
  }
  return sum;
}
export function validateLloyd(s: LloydState): void {
  validatePoints(s.points); validateScales(s.scales);
  if (!Array.isArray(s.centers)) throw new RangeError('Centroids must be a dense array.');
  integer(s.centers.length, 1, s.points.length, 'k');
  for (let j = 0; j < s.centers.length; j++) vector(s.centers[j]!, 'Centroid');
  if (!['ready', 'assign', 'update'].includes(s.phase) || typeof s.stopped !== 'boolean') throw new RangeError('Invalid Lloyd phase or stop flag.');
  integer(s.iteration, 0, 1000, 'Iteration');
  if (s.phase === 'ready' ? s.labels !== null || s.stopped || s.iteration !== 0 : !Array.isArray(s.labels) || s.labels.length !== s.points.length) throw new RangeError('Assignments must match the current phase and row count.');
  if (s.labels) for (let i = 0; i < s.labels.length; i++) integer(s.labels[i]!, 0, s.centers.length - 1, 'Assignment');
  if (s.stopped && s.phase !== 'update') throw new RangeError('A stop is reported only after a mean update.');
}
export function inspectLloyd(s: LloydState) {
  validateLloyd(s);
  const distances = s.points.map(p => s.centers.map(c => squaredDistance(p.x, c, s.scales)));
  const nearest = distances.map(row => { let best = 0; for (let j = 1; j < row.length; j++) if (row[j]! < row[best]!) best = j; return best; });
  const labels = s.labels ?? nearest;
  const clusters = s.centers.map((c, j) => {
    const members = s.points.filter((_, i) => labels[i] === j);
    const sums: Vec = [members.reduce((sum, p) => finite(sum + p.x[0], 'Cluster sum'), 0), members.reduce((sum, p) => finite(sum + p.x[1], 'Cluster sum'), 0)];
    const mean: Vec = members.length ? [finite(sums[0] / members.length, 'Mean'), finite(sums[1] / members.length, 'Mean')] : c;
    return { index: j, ids: members.map(p => p.id), count: members.length, sums, mean, empty: !members.length };
  });
  const objective = distances.reduce((sum, row, i) => finite(sum + row[labels[i]!]!, 'WCSS'), 0);
  const nearestObjective = distances.reduce((sum, row, i) => finite(sum + row[nearest[i]!]!, 'Nearest WCSS'), 0);
  const proposedObjective = s.points.reduce((sum, p, i) => finite(sum + squaredDistance(p.x, clusters[labels[i]!]!.mean, s.scales), "Proposed mean WCSS"), 0);
  return { state: s, distances, nearest, labels, clusters, objective, nearestObjective, proposedObjective,
    ties: distances.map((row, i) => row.filter(d => d === row[nearest[i]!]).length > 1) };
}
export function editLloyd(s: LloydState, patch: Partial<Pick<LloydState, 'points' | 'centers' | 'scales'>>): LloydState {
  const next: LloydState = { ...s, ...patch, labels: null, phase: 'ready', iteration: 0, stopped: false };
  inspectLloyd(next); return next;
}
export function lloydStep(s: LloydState): LloydState {
  const a = inspectLloyd(s); if (s.stopped) return s;
  if (s.phase !== 'assign') return { ...s, labels: a.nearest, phase: 'assign' };
  const centers = a.clusters.map(c => c.mean);
  const stopped = centers.every((c, j) => c.every((v, d) => v === s.centers[j]![d]));
  const next: LloydState = { ...s, centers, phase: 'update', iteration: s.iteration + 1, stopped };
  inspectLloyd(next); return next;
}
export function lloydTrace(s: LloydState, halfSteps = 40) {
  integer(halfSteps, 1, 100, 'Replay half-steps');
  const states: LloydState[] = [s]; inspectLloyd(s);
  for (let i = 0; i < halfSteps && !states.at(-1)!.stopped; i++) states.push(lloydStep(states.at(-1)!));
  return traceFrom(states.map(state => ({ state, explanation: `${state.phase}: ${state.iteration} mean updates; ${state.stopped ? 'centroids unchanged at binary64 precision' : 'bounded replay; no global optimum guarantee'}.` })));
}
export function initialize(points: readonly Point[], k: number, seed: number): readonly Vec[] {
  validatePoints(points); integer(k, 1, points.length, 'k'); const draw = seeded(seed);
  const order = points.map((_, i) => i);
  for (let i = 0; i < k; i++) { const j = i + Math.floor(draw() * (points.length - i)); [order[i], order[j]] = [order[j]!, order[i]!]; }
  return order.slice(0, k).map(i => [...points[i]!.x] as [number, number]);
}
export function samePartition(a: readonly number[], b: readonly number[]): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) throw new RangeError('Partitions need equal row counts.');
  for (let i = 0; i < a.length; i++) { integer(a[i]!, 0, 31, 'Cluster label'); integer(b[i]!, 0, 31, 'Cluster label'); }
  for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) if ((a[i] === a[j]) !== (b[i] === b[j])) return false;
  return true;
}
export type Linkage = 'single' | 'complete' | 'average';
export interface Group { readonly id: number; readonly members: readonly number[] }
export interface Merge { readonly left: Group; readonly right: Group; readonly group: Group; readonly height: number }
export function hierarchical(points: readonly Point[], linkage: Linkage, scales: Vec = [1, 1]) {
  validatePoints(points); validateScales(scales); if (!['single', 'complete', 'average'].includes(linkage)) throw new RangeError('Choose single, complete or average linkage.');
  const distances = points.map(p => points.map(q => Math.sqrt(squaredDistance(p.x, q.x, scales))));
  let groups: Group[] = points.map((_, i) => ({ id: i, members: [i] })); const merges: Merge[] = [];
  while (groups.length > 1) {
    const candidates = [];
    for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const pair = groups[i]!.members.flatMap(a => groups[j]!.members.map(b => distances[a]![b]!));
      const height = linkage === 'single' ? Math.min(...pair) : linkage === 'complete' ? Math.max(...pair) : finite(pair.reduce((s, d) => finite(s + d, 'Linkage sum'), 0) / pair.length, 'Average linkage');
      candidates.push({ i, j, height });
    }
    // Ascending persistent group IDs enumerate pairs; strict improvement keeps the first exact tie.
    let best = candidates[0]!; for (const c of candidates) if (c.height < best.height) best = c;
    const left = groups[best.i]!, right = groups[best.j]!, group = { id: points.length + merges.length, members: [...left.members, ...right.members].sort((a, b) => a - b) };
    merges.push({ left, right, group, height: best.height });
    groups = [...groups.filter(g => g.id !== left.id && g.id !== right.id), group].sort((a, b) => a.id - b.id);
  }
  return { distances, merges };
}
export function cutHierarchy(points: readonly Point[], merges: readonly Merge[], count: number): readonly Group[] {
  validatePoints(points); integer(count, 0, points.length - 1, 'Merge count');
  let groups: Group[] = points.map((_, i) => ({ id: i, members: [i] }));
  for (const m of merges.slice(0, count)) groups = [...groups.filter(g => g.id !== m.left.id && g.id !== m.right.id), m.group].sort((a, b) => a.id - b.id);
  return groups;
}
export function dbscan(points: readonly Point[], epsilon: number, minPoints: number, scales: Vec = [1, 1]) {
  validatePoints(points); validateScales(scales); finite(epsilon, 'Epsilon'); if (epsilon < 0) throw new RangeError('Epsilon must be nonnegative.'); integer(minPoints, 1, points.length, 'Minimum points');
  const limit = finite(epsilon * epsilon, 'Squared epsilon');
  const distances = points.map(p => points.map(q => squaredDistance(p.x, q.x, scales)));
  const neighborhoods = distances.map(row => row.flatMap((d, i) => d <= limit ? [i] : []));
  const core = neighborhoods.map(ns => ns.length >= minPoints), labels = points.map(() => -1), visited = points.map(() => false);
  let count = 0;
  for (let i = 0; i < points.length; i++) {
    if (visited[i]) continue; visited[i] = true;
    if (!core[i]) continue;
    labels[i] = count; const queue = [...neighborhoods[i]!], queued = new Set(queue);
    for (let q = 0; q < queue.length; q++) {
      const j = queue[q]!;
      if (!visited[j]) { visited[j] = true; if (core[j]) for (const v of neighborhoods[j]!) if (!queued.has(v)) { queue.push(v); queued.add(v); } }
      // Earlier noise can become border; an existing cluster is never stolen.
      if (labels[j] === -1) labels[j] = count;
    }
    count++;
  }
  return { distances, neighborhoods, core, labels, count, kinds: labels.map((label, i) => core[i] ? 'core' : label < 0 ? 'noise' : 'border') };
}
