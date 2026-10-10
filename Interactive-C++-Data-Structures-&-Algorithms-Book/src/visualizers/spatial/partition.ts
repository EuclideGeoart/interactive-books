import type { Invariant } from '../../engine/types';
import { emptySpatialState, type Bounds, type SpatialKind, type SpatialState, type SpatialStatus, type SpatialTrace, type Vec } from './types';
import { containsBounds, containsPoint, distanceSquared, numberInput, overlaps, parsePoint, pointBounds, readPoints, readQuery, readQueryPoint } from './geometry';

type PartitionKind = 'spatial-hash' | 'quadtree' | 'octree' | 'kd-tree';
interface PointRecord { id: string; point: Vec; status: SpatialStatus }
interface Cell { x: number; y: number; bucket: number; ids: string[]; status: SpatialStatus }
interface TreeNode {
  id: string; parent: string | null; bounds: Bounds; depth: number; children: (string | null)[];
  ids: string[]; leaf: boolean; status: SpatialStatus; axis?: 'x' | 'y'; split?: number;
}
export interface PartitionSemantic {
  phase: 'ready' | 'building' | 'complete';
  activeCell: { x: number; y: number } | null;
  points: PointRecord[]; cells: Cell[]; buckets: string[][]; tree: TreeNode[]; pending: string[];
  capacity: number; maxDepth: number; cellSize: number; resultIds: string[];
  visits: number; tests: number; prunes: number; keyComparisons: number; planeTests: number;
  best: number | null; planeDistance: number | null; focus: string; message: string;
}
export interface PartitionState extends SpatialState { semantic: PartitionSemantic }
const option = (id: string, label: string) => ({ id, label });
export const partitionOperations = {
  'spatial-hash': [option('build', 'Build hash'), option('insert', 'Insert point'), option('remove', 'Remove point'), option('update', 'Move point'), option('range', 'Range / neighborhood query')],
  quadtree: [option('build', 'Build quadtree'), option('insert', 'Insert point'), option('range', 'Range query'), option('point', 'Point lookup')],
  octree: [option('build', 'Build octree'), option('insert', 'Insert 3D point'), option('range', 'Volume query'), option('point', 'Point lookup')],
  'kd-tree': [option('build', 'Balanced median build'), option('range', 'Range query'), option('point', 'Point lookup'), option('nearest', 'Nearest neighbor')],
};
const prefix = (kind: PartitionKind) => ({ 'spatial-hash': 'hash', quadtree: 'quad', octree: 'oct', 'kd-tree': 'kd' })[kind];
export function partitionRegions(kind: SpatialKind, _operation: string): string[] {
  if (!(kind in partitionOperations)) throw new Error('Not a partition chapter.');
  return [prefix(kind as PartitionKind)];
}
const key = (x: number, y: number) => `${x},${y}`;
const cellId = (c: Pick<Cell, 'x' | 'y'>) => `cell:${key(c.x, c.y)}`;
const bucket = (x: number, y: number) => ((31 * x + 17 * y) % 7 + 7) % 7;
const rootBounds = (dimension: 2 | 3): Bounds => ({ minX: -8, minY: -8, maxX: 8, maxY: 8, ...(dimension === 3 ? { minZ: -8, maxZ: 8 } : {}) });
const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function childSlot(b: Bounds, p: Vec, dimension: 2 | 3): number {
  return Number(p.x >= (b.minX + b.maxX) / 2) + 2 * Number(p.y >= (b.minY + b.maxY) / 2)
    + (dimension === 3 ? 4 * Number(p.z! >= (b.minZ! + b.maxZ!) / 2) : 0);
}
function childBounds(b: Bounds, slot: number, dimension: 2 | 3): Bounds {
  const x = (b.minX + b.maxX) / 2, y = (b.minY + b.maxY) / 2;
  const result: Bounds = { minX: slot & 1 ? x : b.minX, maxX: slot & 1 ? b.maxX : x, minY: slot & 2 ? y : b.minY, maxY: slot & 2 ? b.maxY : y };
  if (dimension === 3) { const z = (b.minZ! + b.maxZ!) / 2; result.minZ = slot & 4 ? z : b.minZ; result.maxZ = slot & 4 ? b.maxZ : z; }
  return result;
}
function project(kind: PartitionKind, operation: string, dimension: 2 | 3, d: PartitionSemantic, query: Bounds | null, queryPoint: Vec | null): PartitionState {
  const s: PartitionState = { ...emptySpatialState(kind, operation, dimension), semantic: d, query, queryPoint, cellSize: d.cellSize };
  s.objects = d.points.map(p => ({ id: p.id, label: p.id, point: { ...p.point }, bounds: pointBounds(p.point), status: p.status,
    detail: `Point ${p.id} (${Object.values(p.point).join(', ')}); ${d.pending.includes(p.id) ? 'pending placement' : 'stored once'}; ${p.status}` }));
  s.nodes = kind === 'spatial-hash' ? d.cells.map(c => ({ id: cellId(c), label: `[${key(c.x, c.y)}]`, parent: null, depth: 0, children: [], items: [...c.ids], status: c.status,
    bounds: { minX: c.x * d.cellSize, minY: c.y * d.cellSize, maxX: (c.x + 1) * d.cellSize, maxY: (c.y + 1) * d.cellSize },
    detail: `Cell (${key(c.x, c.y)}), bucket ${c.bucket}; full key distinguishes hash collisions. Half-open cell; closed query.` }))
    : d.tree.map(n => ({ id: n.id, label: kind === 'kd-tree' ? `${n.ids[0]}: ${n.axis}=${n.split}` : `${n.id} · d${n.depth}`, bounds: { ...n.bounds }, parent: n.parent, depth: n.depth,
      children: n.children.filter((id): id is string => id !== null), items: [...n.ids], status: n.status, ...(n.axis ? { axis: n.axis, split: n.split } : {}),
      detail: `${n.leaf ? 'Leaf' : 'Internal'}; items [${n.ids.join(', ')}]; children [${n.children.map(c => c ?? 'null').join(', ')}]; ${n.status}${dimension === 3 ? `; z=[${n.bounds.minZ}, ${n.bounds.maxZ}]` : ''}` }));
  if (d.activeCell) s.currentRegion = { minX: d.activeCell.x * d.cellSize, minY: d.activeCell.y * d.cellSize, maxX: (d.activeCell.x + 1) * d.cellSize, maxY: (d.activeCell.y + 1) * d.cellSize };
  s.resultIds = [...d.resultIds]; s.focus = d.focus; s.result = d.message;
  s.metrics = [{ label: kind === 'spatial-hash' ? 'Visited cells' : 'Visited nodes', value: d.visits }, { label: 'Point tests', value: d.tests }, { label: 'Pruned branches', value: d.prunes },
    { label: 'Cell-key comparisons', value: d.keyComparisons }, { label: 'Plane comparisons', value: d.planeTests }, { label: 'Tree depth', value: Math.max(0, ...d.tree.map(n => n.depth)) }];
  s.table = kind === 'spatial-hash' ? { caption: 'Actual cell membership and hash bucket chains', columns: ['Cell key', 'Bucket', 'Members', 'Other keys in bucket'], rows: d.cells.map(c => ({ id: cellId(c), status: c.status,
    values: [key(c.x, c.y), String(c.bucket), c.ids.join(', ') || 'empty', d.buckets[c.bucket]!.filter(k => k !== key(c.x, c.y)).join(' ; ') || 'none'] })) }
    : { caption: `Actual ${dimension}D tree; ${d.pending.length} points awaiting placement${d.best === null ? '' : `; best squared distance ${d.best}`}${d.planeDistance === null ? '' : `; plane squared distance ${d.planeDistance}`}`, columns: ['Node', 'Depth', 'Items', 'Children / split'], rows: s.nodes.map(n => ({ id: n.id, status: n.status,
      values: [n.id, String(n.depth), n.items.join(', ') || 'none', n.axis ? `${n.axis}=${n.split}; ${n.children.join(', ')}` : n.children.join(', ') || 'leaf'] })) };
  return s;
}

export function buildPartitionTrace(kind: SpatialKind, operation: string, inputs: FormData): SpatialTrace<PartitionState> {
  if (!(kind in partitionOperations)) throw new Error('Not a partition chapter.');
  const k = kind as PartitionKind, dimension = k === 'octree' ? 3 : 2;
  if (!partitionOperations[k].some(o => o.id === operation)) throw new Error(`Unknown ${kind} operation: ${operation}`);
  const points = readPoints(inputs, dimension).map(o => ({ id: o.id, point: { ...o.point! }, status: 'unvisited' as SpatialStatus }));
  const cellSize = numberInput(inputs, 'cellSize', 4, 1, 8), capacity = numberInput(inputs, 'capacity', 2, 1, 8), maxDepth = numberInput(inputs, 'maxDepth', 4, 0, 6);
  if (![cellSize, capacity, maxDepth].every(Number.isInteger)) throw new Error('cellSize, capacity and maxDepth must be integers.');
  const queryPoint = operation === 'point' || operation === 'nearest' ? readQueryPoint(inputs, dimension) : null;
  const query = operation === 'range' ? readQuery(inputs, dimension) : operation === 'point' ? pointBounds(queryPoint!) : null;
  const d: PartitionSemantic = { phase: 'ready', activeCell: null, points, cells: [], buckets: Array.from({ length: 7 }, () => []), tree: [], pending: points.map(p => p.id), cellSize, capacity, maxDepth, resultIds: [], visits: 0, tests: 0, prunes: 0, keyComparisons: 0, planeTests: 0, best: null, planeDistance: null, focus: '', message: 'Awaiting placement.' };
  const trace: SpatialTrace<PartitionState> = { initial: structuredClone(project(k, operation, dimension, d, query, queryPoint)), steps: [] };
  d.phase = 'building';
  const emit = (suffix: string, title: string, explanation: string) => {
    d.message = explanation;
    const tag = `${prefix(k)}.${suffix}`;
    trace.steps.push({ event: { type: tag }, source: tag, title, explanation, state: structuredClone(project(k, operation, dimension, d, query, queryPoint)) });
  };
  const point = (id: string) => d.points.find(p => p.id === id)!;
  const node = (id: string) => d.tree.find(n => n.id === id)!;
  const placed = (id: string) => { d.pending = d.pending.filter(p => p !== id); };
  const makeNode = (bounds: Bounds, parent: string | null, depth: number): TreeNode => {
    const n: TreeNode = { id: `n${d.tree.length}`, bounds, parent, depth, children: [], ids: [], leaf: true, status: 'unvisited' }; d.tree.push(n); return n;
  };
  const hashInsert = (id: string) => {
    const p = point(id), x = Math.floor(p.point.x / cellSize), y = Math.floor(p.point.y / cellSize), b = bucket(x, y);
    p.status = 'current'; d.focus = id;
    emit('map', 'Map coordinate to cell', `${id} → floor(x/${cellSize}), floor(y/${cellSize}) = (${key(x, y)}) → bucket ${b}.`);
    let c = d.cells.find(c => c.x === x && c.y === y);
    if (!c) { c = { x, y, bucket: b, ids: [], status: 'unvisited' }; d.cells.push(c); d.buckets[b]!.push(key(x, y)); }
    c.ids.push(id); c.status = 'current'; p.status = 'visited'; placed(id); d.focus = cellId(c);
    emit('store', 'Store under the full cell key', `${id} belongs to cell (${key(x, y)}). Bucket ${b} holds keys ${d.buckets[b]!.join(' ; ')}; equal bucket does not mean equal cell.`);
  };
  const hashRemove = (id: string) => {
    const p = point(id); if (!p) throw new Error(`Unknown target ${id}.`);
    const c = d.cells.find(c => c.ids.includes(id))!; c.ids = c.ids.filter(v => v !== id);
    if (!c.ids.length) { d.buckets[c.bucket] = d.buckets[c.bucket]!.filter(v => v !== key(c.x, c.y)); d.cells = d.cells.filter(v => v !== c); }
    d.points = d.points.filter(v => v.id !== id); d.focus = '';
    emit('remove', 'Remove old membership', `Erase ${id} from its actual cell; erase the cell record if empty.`);
  };
  const subdivideInsert = (id: string, n: TreeNode): void => {
    d.focus = n.id; n.status = 'current';
    emit('route', 'Route through the region', `Route ${id} in ${n.id}; midpoint equality chooses the high child on every axis.`);
    if (!n.leaf) {
      const slot = childSlot(n.bounds, point(id).point, dimension);
      if (!n.children[slot]) {
        const child = makeNode(childBounds(n.bounds, slot, dimension), n.id, n.depth + 1); n.children[slot] = child.id;
        emit('child', 'Allocate occupied octant', `Create child slot ${slot}; other empty octants keep null links.`);
      }
      subdivideInsert(id, node(n.children[slot]!)); return;
    }
    n.ids.push(id); placed(id); point(id).status = 'visited';
    emit('store', 'Store point in leaf', `${id} is stored once in ${n.id}; occupancy ${n.ids.length}, capacity ${capacity}.`);
    if (n.ids.length <= capacity) return;
    if (n.depth >= maxDepth) { emit('limit', 'Stop at maximum depth', 'Retain an overflow leaf: duplicate coordinates cannot force unbounded recursion.'); return; }
    n.leaf = false; n.children = Array.from({ length: 2 ** dimension }, () => null);
    const moving = [...n.ids]; d.pending.push(...moving); n.ids = [];
    if (dimension === 2) for (let slot = 0; slot < 4; ++slot) n.children[slot] = makeNode(childBounds(n.bounds, slot, dimension), n.id, n.depth + 1).id;
    emit('split', 'Split and detach redistribution batch', `${n.id} becomes internal; ${moving.join(', ')} await redistribution${dimension === 3 ? '; child slots start null' : '; four children now exist'}.`);
    for (const moved of moving) { d.focus = n.id; emit('redistribute', 'Redistribute one pending point', `Route ${moved} from the detached batch through the new children.`); subdivideInsert(moved, n); }
  };
  const kdBuild = (ids: string[], bounds: Bounds, parent: string | null, depth: number, side = 0): string | null => {
    if (!ids.length) return null;
    const axis = depth % 2 ? 'y' : 'x'; ids.sort((a, b) => point(a).point[axis] - point(b).point[axis] || compareId(a, b));
    const mid = Math.floor(ids.length / 2), id = ids[mid]!, n = makeNode(bounds, parent, depth);
    n.axis = axis; n.split = point(id).point[axis]; n.ids = [id]; n.children = [null, null]; n.leaf = false;
    // Attach immediately: the next snapshot has a reachable median, with unbuilt points pending.
    if (parent !== null) node(parent).children[side] = n.id;
    placed(id); point(id).status = 'visited'; d.focus = n.id;
    emit('median', 'Place alternating-axis median', `Sort by ${axis}, then ID; ${id} at ${n.split} is median ${mid}.`);
    const low = { ...bounds }, high = { ...bounds };
    if (axis === 'x') { low.maxX = n.split; high.minX = n.split; } else { low.maxY = n.split; high.minY = n.split; }
    n.children[0] = kdBuild(ids.slice(0, mid), low, n.id, depth + 1);
    n.children[1] = kdBuild(ids.slice(mid + 1), high, n.id, depth + 1, 1);
    return n.id;
  };
  if (k === 'spatial-hash') for (const p of [...points]) hashInsert(p.id);
  else if (k === 'kd-tree') kdBuild(d.pending.slice(), rootBounds(2), null, 0);
  else {
    const root = makeNode(rootBounds(dimension), null, 0); d.focus = root.id;
    emit('root', 'Create the root region', `Root is closed [-8,8] on ${dimension} axes.`);
    for (const p of points) subdivideInsert(p.id, root);
  }
  if (operation === 'insert' || operation === 'update') {
    const parsed = parsePoint(String(inputs.get('point') ?? (dimension === 3 ? '1,1,1' : '1,1')), dimension);
    if (points.length >= 12 && operation === 'insert') throw new Error('At most 12 points are supported.');
    const id = operation === 'update' ? String(inputs.get('target') ?? 'A') : Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).find(id => !point(id))!;
    if (operation === 'update') hashRemove(id);
    d.points.push({ id, point: { ...parsed }, status: 'unvisited' }); d.pending.push(id);
    if (k === 'spatial-hash') hashInsert(id); else subdivideInsert(id, d.tree[0]!);
  } else if (operation === 'remove') hashRemove(String(inputs.get('target') ?? 'A'));
  // A query's counts exclude construction. Previous still exposes every build snapshot.
  const resetQuery = () => { for (const p of d.points) p.status = 'unvisited'; for (const n of d.tree) n.status = 'unvisited'; for (const c of d.cells) c.status = 'unvisited'; d.focus = ''; emit('query', 'Start query', 'Reset traversal status; construction is complete. Query bounds are closed.'); };
  const testPoint = (id: string) => {
    const p = point(id); ++d.tests; p.status = 'candidate'; d.focus = id;
    emit('test', 'Test candidate point', `Test ${id} against the closed query; region membership alone is not acceptance.`);
    if (containsPoint(query!, p.point)) { if (!d.resultIds.includes(id)) d.resultIds.push(id); p.status = 'accepted'; emit('accept', 'Accept point once', `${id} is inside every query interval.`); }
    else p.status = 'visited';
  };
  const rangeNode = (n: TreeNode) => {
    ++d.visits; d.focus = n.id; n.status = 'current'; emit('visit', 'Visit region', `Compare ${n.id} bounds with the closed query.`);
    if (!overlaps(n.bounds, query!)) { ++d.prunes; n.status = 'pruned'; emit('prune', 'Prune disjoint region', `No point under ${n.id} can be inside the query.`); return; }
    for (const id of n.ids) testPoint(id);
    for (const id of n.children) if (id !== null) rangeNode(node(id));
    n.status = 'visited';
  };
  if (operation === 'range' || operation === 'point') {
    resetQuery();
    if (k === 'spatial-hash') {
      for (let x = Math.floor(query!.minX / cellSize); x <= Math.floor(query!.maxX / cellSize); ++x) for (let y = Math.floor(query!.minY / cellSize); y <= Math.floor(query!.maxY / cellSize); ++y) {
        ++d.visits; d.focus = ''; d.activeCell = { x, y }; emit('cell', 'Visit query cell', `Look for full key (${key(x, y)}) in bucket ${bucket(x, y)}.`);
        for (const candidateKey of d.buckets[bucket(x, y)]!) {
          ++d.keyComparisons; const c = d.cells.find(c => key(c.x, c.y) === candidateKey)!; d.focus = cellId(c); c.status = 'candidate';
          emit('key', 'Compare full cell key', `${candidateKey} ${candidateKey === key(x, y) ? 'matches' : 'collides with'} ${key(x, y)}.`);
          if (candidateKey === key(x, y)) { c.status = 'current'; for (const id of c.ids) testPoint(id); c.status = 'visited'; break; }
          c.status = 'visited';
        }
      }
    } else if (d.tree.length) rangeNode(d.tree[0]!);
  } else if (operation === 'nearest') {
    resetQuery();
    const nearest = (n: TreeNode): void => {
      ++d.visits; n.status = 'current'; d.focus = n.id; emit('nearVisit', 'Visit likely region', `Inspect median ${n.ids[0]} in ${n.id}.`);
      const p = point(n.ids[0]!); ++d.tests; p.status = 'candidate'; d.focus = p.id;
      const distance = distanceSquared(p.point, queryPoint!);
      emit('distance', 'Compare squared point distance', `${p.id}: d²=${distance}; incumbent d²=${d.best ?? '∞'}.`);
      if (d.best === null || distance < d.best || (distance === d.best && compareId(p.id, d.resultIds[0]!) < 0)) {
        for (const id of d.resultIds) point(id).status = 'visited'; d.best = distance; d.resultIds = [p.id]; p.status = 'accepted';
        emit('best', 'Update nearest point', `Best is ${p.id}, d²=${distance}; equal distances choose smallest ID.`);
      } else p.status = 'visited';
      const delta = queryPoint![n.axis!] - n.split!, near = delta < 0 ? 0 : 1, far = 1 - near;
      if (n.children[near]) nearest(node(n.children[near]!));
      if (n.children[far]) {
        ++d.planeTests; d.planeDistance = delta * delta; d.focus = n.id;
        emit('plane', 'Compare distance to splitting plane', `Plane d²=${d.planeDistance}, best d²=${d.best}. Visit opposite branch when plane d² ≤ best d², including ties.`);
        if (d.planeDistance <= d.best!) nearest(node(n.children[far]!));
        else { ++d.prunes; const other = node(n.children[far]!); other.status = 'pruned'; d.focus = other.id; emit('farPrune', 'Prune opposite branch', 'Every point across this plane is strictly farther than the incumbent.'); }
      }
      n.status = 'visited';
    };
    if (d.tree.length) nearest(d.tree[0]!);
  }
  d.resultIds.sort(compareId); d.focus = '';
  for (const p of d.points) if (p.status === 'current' || p.status === 'candidate') p.status = 'visited';
  for (const n of [...d.tree, ...d.cells]) if (n.status === 'current' || n.status === 'candidate') n.status = 'visited';
  d.phase = 'complete'; d.activeCell = null;
  emit('done', 'Operation complete', query || queryPoint ? `Results: ${d.resultIds.join(', ') || 'none'}${d.best === null ? '' : `; squared distance ${d.best}`}.` : `${d.points.length} points stored; all pending placement is complete.`);
  return trace;
}

export function partitionInvariants(state: SpatialState, settled: boolean): Invariant[] {
  const s = state as PartitionState, d = s.semantic;
  if (!d) return [{ name: 'Partition semantic state', status: 'fail', detail: 'Missing authoritative chapter state.' }];
  const checks: Invariant[] = [], check = (name: string, ok: boolean, detail: string, pending = false) => checks.push({ name, status: ok ? 'pass' : pending && (!settled || d.phase === 'ready') ? 'pending' : 'fail', detail });
  const points = new Map(d.points.map(p => [p.id, p])), nodes = new Map(d.tree.map(n => [n.id, n]));
  const stored = s.kind === 'spatial-hash' ? d.cells.flatMap(c => c.ids) : d.tree.flatMap(n => n.ids);
  const ownership = [...stored, ...d.pending];
  check('Each point has exactly one owner or pending slot', new Set(ownership).size === ownership.length && ownership.length === points.size && ownership.every(id => points.has(id)), 'Redistribution detaches a batch; each point remains in exactly one leaf/node/cell or pending slot.');
  check('Placement completes', d.pending.length === 0, `${d.pending.length} pending points.`, true);
  check('Coordinates are finite and bounded', d.points.every(p => [p.point.x, p.point.y, ...(s.dimension === 3 ? [p.point.z!] : [])].every(v => Number.isFinite(v) && v >= -8 && v <= 8)), 'Points stay in the closed root.');
  if (s.kind === 'spatial-hash') {
    check('Membership matches floor coordinates', d.cells.every(c => c.ids.every(id => { const p = points.get(id)?.point; return !!p && Math.floor(p.x / d.cellSize) === c.x && Math.floor(p.y / d.cellSize) === c.y; })), 'Negative coordinates use floor, never truncation.');
    check('Buckets retain full distinct cell keys', new Set(d.cells.map(c => key(c.x, c.y))).size === d.cells.length && d.cells.every(c => c.bucket === bucket(c.x, c.y) && d.buckets[c.bucket]?.filter(k => k === key(c.x, c.y)).length === 1) && d.buckets.flat().length === d.cells.length, 'A collision cannot merge unrelated cells.');
  } else {
    check('Tree is reachable with consistent parent links', d.tree.every((n, index) => index === 0 ? n.parent === null : n.parent !== null && nodes.get(n.parent)?.children.filter(id => id === n.id).length === 1) && d.tree.every(n => n.children.every(id => id === null || nodes.get(id)?.parent === n.id)), 'Every non-root node has one parent; links use stable semantic IDs.');
    check('Node bounds contain descendants', d.tree.every(n => n.ids.every(id => !!points.get(id) && containsPoint(n.bounds, points.get(id)!.point)) && n.children.every(id => id === null || !!nodes.get(id) && containsBounds(n.bounds, nodes.get(id)!.bounds))), 'Closed drawings can meet at split boundaries without duplicate ownership.');
    if (s.kind === 'kd-tree') {
      const descendants = (n: TreeNode): string[] => [...n.ids, ...n.children.flatMap(id => id && nodes.has(id) ? descendants(nodes.get(id)!) : [])];
      check('KD median split ordering', d.tree.every(n => n.ids.length === 1 && n.axis === (n.depth % 2 ? 'y' : 'x') && n.split === points.get(n.ids[0]!)?.point[n.axis] && n.children.every((id, side) => !id || descendants(nodes.get(id)!).every(p => { const a = points.get(p), b = points.get(n.ids[0]!); if (!a || !b) return false; const c = a.point[n.axis!] - b.point[n.axis!] || compareId(p, b.id); return side === 0 ? c < 0 : c > 0; }))), 'Each subtree obeys coordinate then ID total order; equality may appear on either geometric side.');
    } else {
      check('Point-only leaf storage', d.tree.every(n => n.leaf ? n.children.length === 0 : n.ids.length === 0 && n.children.length === 2 ** s.dimension), 'Internal nodes own child slots, leaves own point IDs.');
      check('Unique high-side subdivision routing', d.tree.every(n => n.children.every((id, slot) => {
        if (!id || !nodes.has(id)) return id === null;
        const child = nodes.get(id)!; const expected = childBounds(n.bounds, slot, s.dimension);
        if (JSON.stringify(child.bounds) !== JSON.stringify(expected) || child.depth !== n.depth + 1) return false;
        const all: string[] = []; const collect = (v: TreeNode) => { all.push(...v.ids); for (const c of v.children) if (c && nodes.has(c)) collect(nodes.get(c)!); }; collect(child);
        return all.every(p => points.has(p) && childSlot(n.bounds, points.get(p)!.point, s.dimension) === slot);
      })), 'Midpoint equality selects the high slot, even though drawn boxes touch.');
      check('Capacity except at maximum depth', d.tree.every(n => n.depth <= d.maxDepth && (!n.leaf || n.ids.length <= d.capacity || n.depth === d.maxDepth)), 'An overfull leaf before split is pending; max-depth overflow is legal.', true);
    }
  }
  check('Results are distinct live point IDs', new Set(d.resultIds).size === d.resultIds.length && d.resultIds.every(id => points.has(id)), 'Deduplicate by identity, not coordinate.');
  return checks;
}

// Small stable parity surface: real topology, membership, counters and query answer, not SVG coordinates.
export function partitionSnapshot(state: SpatialState) {
  const d = (state as PartitionState).semantic;
  return { points: d.points.map(p => [p.id, p.point.x, p.point.y, p.point.z ?? 0]), pending: d.pending, cells: d.cells.map(c => [c.x, c.y, c.bucket, c.ids]),
    nodes: d.tree.map(n => [n.id, n.parent, n.depth, n.ids, n.children, n.leaf, n.axis ?? '', n.split ?? null, [n.bounds.minX, n.bounds.minY, n.bounds.maxX, n.bounds.maxY, n.bounds.minZ ?? 0, n.bounds.maxZ ?? 0]]),
    result: d.resultIds, counts: [d.visits, d.tests, d.prunes, d.keyComparisons, d.planeTests], best: d.best, plane: d.planeDistance };
}
