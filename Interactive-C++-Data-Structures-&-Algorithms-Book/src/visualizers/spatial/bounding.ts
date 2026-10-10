import type { Invariant } from '../../engine/types';
import { emptySpatialState, type Bounds, type SpatialKind, type SpatialNode, type SpatialObject, type SpatialState, type SpatialTrace } from './types';
import { containsBounds, overlaps, unionBounds, validateBounds, readBoxes, readQuery, numberInput, parseBounds } from './geometry';

type Kind = 'r-tree' | 'bvh' | 'broad-phase';
interface Node { id: string; parent: string | null; bounds: Bounds; children: string[]; items: string[] }
interface Semantic {
  objects: SpatialObject[]; nodes: Node[]; root: string | null; capacity: number;
  cells: { key: string; coords: number[]; items: string[] }[];
  candidates: [string, string][]; exact: [string, string][]; results: string[];
  statuses: Record<string, SpatialNode['status']>; focus: string; phase: string; done: boolean;
  visits: number; tests: number; prunes: number; memberships: number; pairAttempts: number; updates: number;
  query: Bounds | null; cellSize: number; dimension: 2 | 3;
}
export interface BoundingState extends SpatialState { semantic: Semantic }
export const boundingOperations: Record<Kind, { id: string; label: string }[]> = {
  'r-tree': [{ id: 'build', label: 'Build R-tree' }, { id: 'insert', label: 'Insert box' }, { id: 'query', label: 'Range query' }],
  bvh: [{ id: 'build', label: 'Build BVH' }, { id: 'query', label: 'Overlap query' }, { id: 'refit', label: 'Move and refit' }, { id: 'rebuild', label: 'Move and rebuild' }],
  'broad-phase': [{ id: 'candidates', label: 'Generate candidates' }, { id: 'filter', label: 'Filter exact AABB overlaps' }],
};
export function boundingRegions(kind: string, operation: string): string[] {
  if (!(kind in boundingOperations) || !boundingOperations[kind as Kind].some(o => o.id === operation)) throw new Error('Unknown bounding operation.');
  return [kind === 'r-tree' ? 'rtree' : kind === 'bvh' ? 'bvh' : 'broad'];
}
const area = (b: Bounds) => (b.maxX - b.minX) * (b.maxY - b.minY);
const center = (b: Bounds, axis: number) => axis === 0 ? (b.minX + b.maxX) / 2 : axis === 1 ? (b.minY + b.maxY) / 2 : (b.minZ! + b.maxZ!) / 2;
const pair = (a: string, b: string): [string, string] => a < b ? [a, b] : [b, a];
const pairKey = (p: [string, string]) => p.join('|');
const boxText = (b: Bounds) => `[${b.minX},${b.minY}${b.minZ === undefined ? '' : `,${b.minZ}`}] → [${b.maxX},${b.maxY}${b.maxZ === undefined ? '' : `,${b.maxZ}`}]`;
function project(kind: Kind, operation: string, d: Semantic): BoundingState {
  const s: BoundingState = { ...emptySpatialState(kind, operation, d.dimension), semantic: d };
  const status = (id: string) => { const explicit = d.statuses[id] ?? 'unvisited'; return id === d.focus && !['accepted', 'pruned', 'fault'].includes(explicit) ? 'current' as const : explicit; };
  const indexed = new Set(d.nodes.flatMap(n => n.items));
  s.objects = d.objects.map(o => ({ ...o, status: status(o.id), detail: `${o.id}: ${boxText(o.bounds)}. ${kind === 'r-tree' ? indexed.has(o.id) ? 'Stored in a leaf.' : 'Pending scene input: not yet indexed in a leaf.' : 'Closed object AABB.'} Object identity is independent of coordinates.` }));
  const depth = (n: Node): number => n.parent === null ? 0 : 1 + depth(d.nodes.find(p => p.id === n.parent)!);
  s.nodes = d.nodes.map(n => ({ ...n, depth: depth(n), label: n.id, status: status(n.id), detail: `${n.children.length ? 'Internal bound' : 'Leaf'}; parent ${n.parent ?? 'none'}; children ${n.children.join(', ') || 'none'}; objects ${n.items.join(', ') || 'none'}; ${boxText(n.bounds)}` }));
  if (kind === 'broad-phase') s.nodes = d.cells.map(c => {
    const [x, y, z] = c.coords.map(v => v * d.cellSize);
    return { id: `cell:${c.key}`, label: c.key, parent: null, depth: 0, children: [], items: [...c.items],
      bounds: { minX: x!, minY: y!, maxX: x! + d.cellSize, maxY: y! + d.cellSize, ...(d.dimension === 3 ? { minZ: z!, maxZ: z! + d.cellSize } : {}) },
      status: status(`cell:${c.key}`), detail: `Exact integer cell (${c.key}); ${c.items.join(', ')}. Logical key, not a hash bucket.` };
  });
  s.query = d.query; s.focus = d.focus; s.resultIds = [...d.results]; s.candidatePairs = d.candidates.map(p => [...p]); s.exactPairs = d.exact.map(p => [...p]); s.cellSize = d.cellSize;
  s.result = kind === 'broad-phase' ? `${d.candidates.length} candidates; ${d.exact.length} exact AABB overlaps. Geometry contact is not tested.` : d.query ? `${d.results.length} overlapping objects: ${d.results.join(', ') || 'none'}` : `${d.objects.length} objects; ${d.nodes.length} hierarchy nodes. ${d.phase}`;
  s.metrics = [{ label: 'Visited hierarchy nodes', value: d.visits }, { label: 'AABB tests', value: d.tests }, { label: 'Pruned branches', value: d.prunes }, { label: 'Bounds recomputed', value: d.updates }, { label: 'Tree depth', value: Math.max(0, ...s.nodes.map(n => n.depth)) }];
  if (kind === 'broad-phase') s.metrics = [{ label: 'Occupied cells', value: d.cells.length }, { label: 'Cell memberships', value: d.memberships }, { label: 'Local pair attempts', value: d.pairAttempts }, { label: 'Unique candidate pairs', value: d.candidates.length }, { label: 'AABB tests', value: d.tests }];
  s.table = kind === 'broad-phase' ? { caption: 'Unique candidate pairs', columns: ['Pair', 'AABB overlap'], rows: d.candidates.map(p => ({ id: pairKey(p), values: [p.join(' / '), d.exact.some(e => pairKey(e) === pairKey(p)) ? 'yes; geometry untested' : 'not accepted'], status: d.exact.some(e => pairKey(e) === pairKey(p)) ? 'accepted' : 'candidate' })) } : { caption: 'Hierarchy storage', columns: ['Node', 'Parent', 'Children / objects', 'Bounds'], rows: s.nodes.map(n => ({ id: n.id, values: [n.id, n.parent ?? 'root', [...n.children, ...n.items].join(', '), boxText(n.bounds)], status: n.status })) };
  return s;
}

export function buildBoundingTrace(kind: SpatialKind, operation: string, inputs: FormData): SpatialTrace<BoundingState> {
  boundingRegions(kind, operation); const k = kind as Kind;
  const rawDimension = numberInput(inputs, 'dimension', 2, 2, 3);
  if (!Number.isInteger(rawDimension)) throw new Error('Dimension must be 2 or 3.');
  const dimension: 2 | 3 = k === 'broad-phase' ? rawDimension as 2 | 3 : 2;
  const objects = readBoxes(inputs, dimension);
  if (objects.length > 16) throw new Error('Use at most 16 boxes.');
  const capacity = numberInput(inputs, 'capacity', 2, 2, 6);
  if (!Number.isInteger(capacity)) throw new Error('Capacity must be an integer from 2 to 6.');
  const d: Semantic = { objects: structuredClone(objects), nodes: [], root: null, capacity, cells: [], candidates: [], exact: [], results: [], statuses: {}, focus: '', phase: 'initial', done: false, visits: 0, tests: 0, prunes: 0, memberships: 0, pairAttempts: 0, updates: 0, query: null, cellSize: numberInput(inputs, 'cellSize', 4, 1, 8), dimension };
  const trace: SpatialTrace<BoundingState> = { initial: structuredClone(project(k, operation, d)), steps: [] };
  const emit = (tag: string, title: string, explanation: string, focus = '') => {
    d.focus = focus;
    trace.steps.push({ event: { type: tag }, source: tag, title, explanation, state: structuredClone(project(k, operation, d)) });
  };
  const get = (id: string) => d.nodes.find(n => n.id === id)!;
  const object = (id: string) => d.objects.find(o => o.id === id)!;
  const boundsOf = (n: Node) => (n.children.length ? n.children.map(id => get(id).bounds) : n.items.map(id => object(id).bounds)).reduce(unionBounds);
  const node = (items: string[], children: string[], parent: string | null): Node => {
    const n: Node = { id: `N${d.nodes.length}`, parent, items, children, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
    d.nodes.push(n); n.bounds = boundsOf(n); children.forEach(id => { get(id).parent = n.id; }); return n;
  };
  const update = (n: Node, prefix: string) => { n.bounds = boundsOf(n); ++d.updates; emit(`${prefix}.bounds`, 'Recompute this bound', 'Union the current entries; ancestors may still be awaiting their own update.', n.id); };
  const insert = (id: string) => {
    d.phase = 'updating';
    if (d.root === null) { d.root = node([id], [], null).id; emit('rt.root', 'Create the root leaf', 'The root may hold fewer entries than the ordinary minimum.', d.root); }
    else {
      const descend = (n: Node): string | null => {
        if (n.children.length) {
          const choices = n.children.map(cid => ({ id: cid, growth: area(unionBounds(get(cid).bounds, object(id).bounds)) - area(get(cid).bounds), area: area(get(cid).bounds) })).sort((a, b) => a.growth - b.growth || a.area - b.area || Number(a.id.slice(1)) - Number(b.id.slice(1)));
          emit('rt.choose', 'Choose minimum enlargement', choices.map(c => `${c.id}: enlargement ${c.growth}, area ${c.area}`).join('; ') + '. Ties: area, then node ID.', choices[0]!.id);
          const sibling = descend(get(choices[0]!.id)); if (sibling) n.children.push(sibling);
        } else { n.items.push(id); emit('rt.append', 'Append the object entry', 'The leaf can temporarily overflow by one entry.', n.id); }
        update(n, 'rt');
        const entries = n.children.length ? n.children : n.items;
        if (entries.length <= capacity) return null;
        // ponytail: deterministic x-center median split; production R*-tree heuristics are outside this teaching policy.
        const internal = n.children.length > 0;
        entries.sort((a, b) => center(internal ? get(a).bounds : object(a).bounds, 0) - center(internal ? get(b).bounds : object(b).bounds, 0) || a.localeCompare(b, 'en'));
        const right = entries.splice(Math.floor(entries.length / 2));
        const sibling = node(internal ? [] : right, internal ? right : [], n.parent); n.bounds = boundsOf(n);
        emit('rt.split', 'Split the overflowing node', 'Sort by x-center then ID; divide at floor((M+1)/2). Both groups meet minimum occupancy.', n.id);
        return sibling.id;
      };
      const oldRoot = d.root; const sibling = descend(get(oldRoot));
      if (sibling) { d.root = node([], [oldRoot, sibling], null).id; emit('rt.grow', 'Grow a new root', 'Both old root and split sibling become children; height increases by one.', d.root); }
    }
    d.phase = 'stable';
  };
  const buildBVH = (ids: string[], parent: string | null): string | null => {
    if (!ids.length) return null;
    const n = node([...ids], [], parent); emit('bvh.node', 'Create a bounded group', 'The union already encloses every object assigned to this pending group.', n.id);
    if (ids.length > 1) {
      const extents = [0, 1].map(axis => Math.max(...ids.map(id => center(object(id).bounds, axis))) - Math.min(...ids.map(id => center(object(id).bounds, axis))));
      const axis = extents[1]! > extents[0]! ? 1 : 0;
      ids.sort((a, b) => center(object(a).bounds, axis) - center(object(b).bounds, axis) || a.localeCompare(b, 'en'));
      emit('bvh.partition', 'Partition at the centroid median', `Longest centroid extent chooses ${axis === 0 ? 'X' : 'Y'}; ties choose X, then object ID.`, n.id);
      const middle = Math.floor(ids.length / 2);
      const left = buildBVH(ids.slice(0, middle), n.id)!; const right = buildBVH(ids.slice(middle), n.id)!;
      n.items = []; n.children = [left, right]; update(n, 'bvh');
    }
    return n.id;
  };
  if (k === 'r-tree') {
    for (const o of objects) insert(o.id);
    if (operation === 'insert') {
      if (d.objects.length === 16) throw new Error('Insertion needs fewer than 16 initial boxes.');
      const bounds = parseBounds(String(inputs.get('object') ?? '1,1,3,3'), 2);
      const id = 'new'; d.objects.push({ id, label: id, bounds, status: 'unvisited', detail: 'Inserted AABB' }); insert(id);
    }
  } else if (k === 'bvh') {
    d.phase = 'building'; d.root = buildBVH(objects.map(o => o.id), null); d.phase = 'stable';
    if (operation === 'refit' || operation === 'rebuild') {
      const id = String(inputs.get('target') ?? 'A'); const target = d.objects.find(o => o.id === id);
      if (!target) throw new Error('Move target must identify an existing object.');
      const movedBounds = parseBounds(String(inputs.get('object') ?? '1,1,3,3'), 2);
      d.phase = 'updating'; target.bounds = movedBounds; emit('bvh.move', 'Move one object', 'Its leaf and ancestor bounds still describe the previous object position.', id);
      if (operation === 'refit') {
        let n: Node | undefined = d.nodes.find(v => v.items.includes(id));
        while (n) { update(n, 'bvh'); n = n.parent === null ? undefined : get(n.parent); }
      } else { d.nodes = []; d.root = null; d.phase = 'building'; emit('bvh.clear', 'Discard old grouping', 'Rebuild recomputes centroid partitions from the moved scene.'); d.root = buildBVH(d.objects.map(o => o.id), null); }
      d.phase = 'stable';
    }
  } else {
    d.phase = 'indexing';
    for (const o of d.objects) {
      const b = validateBounds(o.bounds, dimension); const lo = [b.minX, b.minY, ...(dimension === 3 ? [b.minZ!] : [])].map(v => Math.floor(v / d.cellSize));
      const hi = [b.maxX, b.maxY, ...(dimension === 3 ? [b.maxZ!] : [])].map(v => Math.floor(v / d.cellSize));
      const count = hi.reduce((n, v, i) => n * (v - lo[i]! + 1), 1);
      if (d.memberships + count > 4096) throw new Error('Scene exceeds 4096 cell memberships; increase cell size or reduce box sizes.');
      for (let x = lo[0]!; x <= hi[0]!; x++) for (let y = lo[1]!; y <= hi[1]!; y++) for (let z = dimension === 3 ? lo[2]! : 0; z <= (dimension === 3 ? hi[2]! : 0); z++) {
        const coords = dimension === 3 ? [x, y, z] : [x, y]; const key = coords.join(',');
        let c = d.cells.find(v => v.key === key); if (!c) { c = { key, coords, items: [] }; d.cells.push(c); } c.items.push(o.id); ++d.memberships;
      }
      d.statuses[o.id] = 'visited'; emit('broad.index', 'Index the complete closed AABB', `${o.id} enters ${count} cells, including floor(max / size); boundary contacts cannot be lost.`, o.id);
    }
    d.phase = 'pairing'; const seen = new Set<string>();
    for (const c of d.cells) {
      for (let i = 0; i < c.items.length; i++) for (let j = i + 1; j < c.items.length; j++) {
        ++d.pairAttempts; const p = pair(c.items[i]!, c.items[j]!); const key = pairKey(p);
        if (seen.has(key)) continue; seen.add(key); d.candidates.push(p); d.statuses[p[0]] = d.statuses[p[1]] = 'candidate';
        d.statuses[`cell:${c.key}`] = 'current'; emit('broad.pair', 'Publish a new canonical pair', `${p.join(' / ')} shares cell ${c.key}. Deduplication suppresses repeats across cells.`, `cell:${c.key}`); d.statuses[`cell:${c.key}`] = 'visited';
      }
    }
    if (operation === 'filter') for (const p of d.candidates) {
      ++d.tests; const hit = overlaps(object(p[0]).bounds, object(p[1]).bounds); if (hit) { d.exact.push(p); d.statuses[p[0]] = d.statuses[p[1]] = 'accepted'; }
      emit('broad.test', 'Test candidate AABBs', `${p.join(' / ')}: ${hit ? 'closed AABBs overlap' : 'cell co-location was a false positive'}. No geometry collision test is performed.`, p[0]);
    }
    d.phase = 'stable';
  }
  if (operation === 'query') {
    d.query = readQuery(inputs, dimension); d.phase = 'query';
    const visit = (id: string) => {
      const n = get(id); ++d.visits; ++d.tests; d.statuses[id] = 'current'; emit(k === 'r-tree' ? 'rt.visit' : 'bvh.visit', 'Test a hierarchy bound', 'An inclusive overlap admits the node; disjoint bounds prune the whole branch.', id);
      if (!overlaps(n.bounds, d.query!)) { ++d.prunes; d.statuses[id] = 'pruned'; emit(k === 'r-tree' ? 'rt.prune' : 'bvh.prune', 'Prune this branch', 'Every descendant is enclosed by this disjoint bound.', id); return; }
      d.statuses[id] = 'visited';
      for (const oid of n.items) {
        ++d.tests; d.statuses[oid] = 'candidate'; emit(k === 'r-tree' ? 'rt.test' : 'bvh.test', 'Test an object bound', 'Reaching a leaf does not itself accept its objects.', oid);
        if (overlaps(object(oid).bounds, d.query!)) { d.results.push(oid); d.statuses[oid] = 'accepted'; emit(k === 'r-tree' ? 'rt.accept' : 'bvh.accept', 'Accept an overlapping AABB', 'Touching boundaries count as overlap.', oid); } else d.statuses[oid] = 'visited';
      }
      n.children.forEach(visit);
    };
    if (d.root) visit(d.root);
  }
  d.phase = 'stable'; d.done = true; emit(k === 'r-tree' ? 'rt.done' : k === 'bvh' ? 'bvh.done' : 'broad.done', 'Operation complete', 'All pending structure updates are complete. Counts measure algorithmic work, not elapsed time.');
  return trace;
}

export function boundingInvariants(state: SpatialState, _settled: boolean): Invariant[] {
  const d = (state as BoundingState).semantic;
  const check = (name: string, ok: boolean, detail: string, pending = false): Invariant => ({ name, status: pending ? 'pending' : ok ? 'pass' : 'fail', detail });
  const stable = d.phase === 'stable' || d.phase === 'query';
  if (state.kind === 'broad-phase') {
    const keys = new Set(d.candidates.map(pairKey)); const byId = new Map(d.objects.map(o => [o.id, o]));
    const all: string[] = []; for (let i = 0; i < d.objects.length; i++) for (let j = i + 1; j < d.objects.length; j++) if (overlaps(d.objects[i]!.bounds, d.objects[j]!.bounds)) all.push(pairKey(pair(d.objects[i]!.id, d.objects[j]!.id)));
    return [check('Canonical distinct pairs', keys.size === d.candidates.length && d.candidates.every(p => p[0] < p[1] && byId.has(p[0]) && byId.has(p[1])), 'IDs determine pair identity; equal coordinates do not merge objects.'),
      check('All AABB overlaps are candidates', all.every(p => keys.has(p)), 'False positives are allowed; missing a true AABB overlap is a failure.', !d.done),
      check('Exact results pass AABB tests', d.exact.every(p => keys.has(pairKey(p)) && overlaps(byId.get(p[0])!.bounds, byId.get(p[1])!.bounds)) && (!d.done || state.operation !== 'filter' || d.exact.length === all.length), 'Exact refers to AABBs only; true geometry remains untested.')];
  }
  const nodes = new Map(d.nodes.map(n => [n.id, n])); const objects = new Map(d.objects.map(o => [o.id, o]));
  const enclose = d.nodes.every(n => [...n.children.map(id => nodes.get(id)?.bounds), ...n.items.map(id => objects.get(id)?.bounds)].every(b => b !== undefined && containsBounds(n.bounds, b)));
  const entries = d.nodes.flatMap(n => n.items); const refs = d.nodes.every(n => n.children.every(id => nodes.get(id)?.parent === n.id));
  const out = [check('Parent references agree', refs, 'Child IDs resolve to nodes whose parent is the containing node.', !stable), check('Bounds enclose every entry', enclose, 'Bottom-up propagation can temporarily leave stale ancestor bounds.', !stable), check('Every object occurs once', entries.length === d.objects.length && new Set(entries).size === entries.length, 'Pending build groups are not final leaves.', !stable)];
  if (state.kind === 'r-tree') {
    const min = Math.floor((d.capacity + 1) / 2);
    out.push(check('Occupancy and root exception', d.nodes.every(n => { const count = n.children.length || n.items.length; return count <= d.capacity && count >= (n.id === d.root ? (n.children.length ? 2 : 1) : min); }), 'Non-root minimum floor((M+1)/2); root leaf may hold one entry; empty tree has no root.', !stable));
    const depths = d.nodes.filter(n => !n.children.length).map(n => { let depth = 0; while (n.parent !== null) { n = nodes.get(n.parent)!; depth++; } return depth; });
    out.push(check('Leaves share a depth', new Set(depths).size <= 1, 'Splits propagate upward; a root split raises all leaf depths together.', !stable));
  } else out.push(check('Binary hierarchy', d.nodes.every(n => n.children.length === 2 && n.items.length === 0 || n.children.length === 0 && n.items.length === 1), 'Each completed internal node has two children; each leaf owns one object.', !stable));
  if (d.done && d.query) out.push(check('Query matches exhaustive AABB scan', d.results.length === d.objects.filter(o => overlaps(o.bounds, d.query!)).length && new Set(d.results).size === d.results.length && d.results.every(id => objects.has(id) && overlaps(objects.get(id)!.bounds, d.query!)), 'Result identity is independent of traversal order.'));
  return out;
}
