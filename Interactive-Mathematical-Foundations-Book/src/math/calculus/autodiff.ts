/**
 * Automatic differentiation on a small directed acyclic graph of elementary operations (III.10).
 *
 * Every derivative this module reports is computed FROM THE GRAPH: a deterministic topological order, the value of each node, the local
 * partial derivative carried by each edge, then either
 *   - forward mode: one tangent pass per seeded input (tangent of a node = Σ local · tangent of argument), or
 *   - reverse mode: one adjoint pass per output (adjoint of an argument += adjoint of node · local), accumulating every path.
 * An argument used twice by one node (x·x) produces two edges and two contributions. Values are exact rationals while every operation on the
 * path is rational; transcendental operations switch to binary64 and say so. A division by zero or log of a nonpositive number makes the node
 * — and everything downstream — undefined, never a fabricated number.
 *
 * Vocabulary is fixed; nothing is parsed or executed from text.
 */
import { add, div, int, isZero, mul, neg, sign, sub, toNumber, ZERO, ONE, type Rational } from '../quantity/rational';

export type Op = 'input' | 'const' | 'add' | 'sub' | 'mul' | 'div' | 'neg' | 'square' | 'sin' | 'cos' | 'exp' | 'log';
export interface GraphNode { readonly id: string; readonly op: Op; readonly args: readonly string[]; readonly constant?: Rational }
export interface Graph { readonly id: string; readonly label: string; readonly tex: string; readonly nodes: readonly GraphNode[]; readonly inputs: readonly string[]; readonly outputs: readonly string[] }
export type Num = { readonly kind: 'value'; readonly value: number; readonly exact?: Rational } | { readonly kind: 'undefined'; readonly reason: string };
const ex = (r: Rational): Num => ({ kind: 'value', value: toNumber(r), exact: r });
const nm = (v: number): Num => (Number.isFinite(v) ? { kind: 'value', value: v } : { kind: 'undefined', reason: 'The binary64 result is not finite.' });
const undef = (reason: string): Num => ({ kind: 'undefined', reason });

export const ARITY: Record<Op, number> = { input: 0, const: 0, add: 2, sub: 2, mul: 2, div: 2, neg: 1, square: 1, sin: 1, cos: 1, exp: 1, log: 1 };
export const SYMBOL: Record<Op, string> = { input: 'input', const: 'const', add: '+', sub: '−', mul: '×', div: '÷', neg: '−', square: '( )²', sin: 'sin', cos: 'cos', exp: 'exp', log: 'log' };

/** Kahn's algorithm with ties broken by declaration order: deterministic. Throws on cycles, unknown ids or wrong arity (graph bugs). */
export function topologicalOrder(g: Graph): string[] {
  const ids = new Set(g.nodes.map(n => n.id));
  for (const n of g.nodes) {
    if (n.args.length !== ARITY[n.op]) throw new Error(`${n.id}: ${n.op} takes ${ARITY[n.op]} arguments`);
    for (const a of n.args) if (!ids.has(a)) throw new Error(`${n.id}: unknown argument ${a}`);
  }
  const indegree = new Map(g.nodes.map(n => [n.id, new Set(n.args).size]));
  const order: string[] = [];
  const ready = () => g.nodes.find(n => indegree.get(n.id) === 0 && !order.includes(n.id));
  for (let next = ready(); next; next = ready()) {
    order.push(next.id);
    for (const m of g.nodes) if (m.args.includes(next.id)) indegree.set(m.id, indegree.get(m.id)! - 1);
  }
  if (order.length !== g.nodes.length) throw new Error('The graph has a cycle');
  return order;
}

function apply(op: Op, a: readonly Num[], constant?: Rational): Num {
  if (op === 'const') return ex(constant!);
  const bad = a.find(v => v.kind === 'undefined');
  if (bad) return undef(`An argument is undefined (${(bad as { reason: string }).reason})`);
  const v = a as readonly { kind: 'value'; value: number; exact?: Rational }[];
  const allExact = v.every(x => x.exact);
  const e = (k: number) => v[k]!.exact!;
  switch (op) {
    case 'add': return allExact ? ex(add(e(0), e(1))) : nm(v[0]!.value + v[1]!.value);
    case 'sub': return allExact ? ex(sub(e(0), e(1))) : nm(v[0]!.value - v[1]!.value);
    case 'mul': return allExact ? ex(mul(e(0), e(1))) : nm(v[0]!.value * v[1]!.value);
    case 'div':
      if (v[1]!.exact ? isZero(e(1)) : v[1]!.value === 0) return undef('Division by zero.');
      return allExact ? ex(div(e(0), e(1))) : nm(v[0]!.value / v[1]!.value);
    case 'neg': return allExact ? ex(neg(e(0))) : nm(-v[0]!.value);
    case 'square': return allExact ? ex(mul(e(0), e(0))) : nm(v[0]!.value * v[0]!.value);
    case 'sin': return v[0]!.exact && isZero(e(0)) ? ex(ZERO) : nm(Math.sin(v[0]!.value));
    case 'cos': return v[0]!.exact && isZero(e(0)) ? ex(ONE) : nm(Math.cos(v[0]!.value));
    case 'exp': return v[0]!.exact && isZero(e(0)) ? ex(ONE) : nm(Math.exp(v[0]!.value));
    case 'log':
      if (v[0]!.exact ? sign(e(0)) <= 0 : v[0]!.value <= 0) return undef('log is defined only for positive arguments.');
      return v[0]!.exact && e(0).num === 1n && e(0).den === 1n ? ex(ZERO) : nm(Math.log(v[0]!.value));
    default: throw new Error(op);
  }
}
/** ∂(node)/∂(argument k), evaluated at the current values. */
function local(op: Op, a: readonly Num[], k: number, out: Num): Num {
  if (out.kind === 'undefined') return undef('The node value is undefined, so its local derivative is too.');
  const v = a as readonly { kind: 'value'; value: number; exact?: Rational }[];
  const x = (i: number) => v[i]!;
  const exOr = (r: () => Rational, f: () => number, ok: boolean) => (ok ? ex(r()) : nm(f()));
  switch (op) {
    case 'add': return ex(ONE);
    case 'sub': return ex(k === 0 ? ONE : int(-1));
    case 'mul': return x(1 - k).exact ? ex(x(1 - k).exact!) : nm(x(1 - k).value);
    case 'div': {
      const ok = !!(x(0).exact && x(1).exact);
      return k === 0 ? exOr(() => div(ONE, x(1).exact!), () => 1 / x(1).value, ok)
        : exOr(() => neg(div(x(0).exact!, mul(x(1).exact!, x(1).exact!))), () => -x(0).value / (x(1).value * x(1).value), ok);
    }
    case 'neg': return ex(int(-1));
    case 'square': return x(0).exact ? ex(mul(int(2), x(0).exact!)) : nm(2 * x(0).value);
    case 'sin': return x(0).exact && isZero(x(0).exact!) ? ex(ONE) : nm(Math.cos(x(0).value));
    case 'cos': return x(0).exact && isZero(x(0).exact!) ? ex(ZERO) : nm(-Math.sin(x(0).value));
    case 'exp': return out;
    case 'log': return x(0).exact ? ex(div(ONE, x(0).exact!)) : nm(1 / x(0).value);
    default: throw new Error(op);
  }
}
const addNum = (a: Num, b: Num): Num => a.kind === 'undefined' ? a : b.kind === 'undefined' ? b : a.exact && b.exact ? ex(add(a.exact, b.exact)) : nm(a.value + b.value);
/** An exact zero times any finite value is an exact zero (an unreached path contributes exactly nothing). */
const mulNum = (a: Num, b: Num): Num => a.kind === 'undefined' ? a : b.kind === 'undefined' ? b : (a.exact && isZero(a.exact)) || (b.exact && isZero(b.exact)) ? ex(ZERO)
  : a.exact && b.exact ? ex(mul(a.exact, b.exact)) : nm(a.value * b.value);

export interface Edge { readonly from: string; readonly to: string; readonly index: number; readonly local: Num }
export interface Evaluation { readonly order: readonly string[]; readonly values: Readonly<Record<string, Num>>; readonly edges: readonly Edge[] }
export function evaluate(g: Graph, inputs: Readonly<Record<string, Rational>>): Evaluation {
  const order = topologicalOrder(g), byId = new Map(g.nodes.map(n => [n.id, n])), values: Record<string, Num> = {}, edges: Edge[] = [];
  for (const id of order) {
    const n = byId.get(id)!;
    if (n.op === 'input') { if (!(id in inputs)) throw new Error(`missing input ${id}`); values[id] = ex(inputs[id]!); continue; }
    const args = n.args.map(a => values[a]!);
    values[id] = apply(n.op, args, n.constant);
    n.args.forEach((a, k) => edges.push({ from: a, to: id, index: k, local: local(n.op, args, k, values[id]!) }));
  }
  return { order, values, edges };
}

/** Forward mode: tangents ṅ = ∂n/∂(seed) for every node, in topological order. One pass per input. */
export function forwardMode(g: Graph, e: Evaluation, seed: string): { tangents: Readonly<Record<string, Num>>; steps: readonly { node: string; terms: readonly { from: string; index: number; term: Num }[]; tangent: Num }[] } {
  const t: Record<string, Num> = {}, steps: { node: string; terms: { from: string; index: number; term: Num }[]; tangent: Num }[] = [];
  for (const id of e.order) {
    const n = g.nodes.find(x => x.id === id)!;
    if (n.op === 'input') { t[id] = ex(id === seed ? ONE : ZERO); continue; }
    if (n.op === 'const') { t[id] = ex(ZERO); continue; }
    const terms = e.edges.filter(x => x.to === id).map(x => ({ from: x.from, index: x.index, term: mulNum(x.local, t[x.from]!) }));
    t[id] = terms.reduce((s, x) => addNum(s, x.term), ex(ZERO));
    steps.push({ node: id, terms, tangent: t[id]! });
  }
  return { tangents: t, steps };
}

export interface Contribution { readonly from: string; readonly to: string; readonly index: number; readonly local: Num; readonly upstream: Num; readonly amount: Num }
/** Reverse mode: adjoints n̄ = ∂(output)/∂n, visiting nodes in reverse topological order and ACCUMULATING over every outgoing edge. */
export function reverseMode(g: Graph, e: Evaluation, output: string): { adjoints: Readonly<Record<string, Num>>; steps: readonly { node: string; adjoint: Num; contributions: readonly Contribution[] }[] } {
  const adj: Record<string, Num> = Object.fromEntries(g.nodes.map(n => [n.id, ex(ZERO)]));
  adj[output] = ex(ONE);
  const steps: { node: string; adjoint: Num; contributions: Contribution[] }[] = [];
  for (const id of [...e.order].reverse()) {
    const contributions = e.edges.filter(x => x.to === id).map(x => ({ from: x.from, to: id, index: x.index, local: x.local, upstream: adj[id]!, amount: mulNum(adj[id]!, x.local) }));
    for (const c of contributions) adj[c.from] = addNum(adj[c.from]!, c.amount);
    steps.push({ node: id, adjoint: adj[id]!, contributions });
  }
  return { adjoints: adj, steps };
}

/** Central finite difference of one output with respect to one input, in binary64, as an INDEPENDENT numerical check (h documented). Null where f is undefined. */
export function centralDifference(g: Graph, inputs: Readonly<Record<string, Rational>>, output: string, wrt: string, h = 1e-6): number | null {
  const shift = (d: number) => {
    const vals: Record<string, Num> = {};
    for (const id of topologicalOrder(g)) {
      const n = g.nodes.find(x => x.id === id)!;
      vals[id] = n.op === 'input' ? nm(toNumber(inputs[id]!) + (id === wrt ? d : 0)) : apply(n.op, n.args.map(a => vals[a]!), n.constant);
    }
    const v = vals[output]!; return v.kind === 'value' ? v.value : null;
  };
  // A difference quotient across a point where the function is undefined measures nothing about a derivative there.
  if (evaluate(g, inputs).values[output]!.kind === 'undefined') return null;
  const p = shift(h), m = shift(-h);
  return p === null || m === null ? null : (p - m) / (2 * h);
}

const n = (id: string, op: Op, ...args: string[]): GraphNode => ({ id, op, args });
/** The graphs of III.10. */
export const GRAPHS: Readonly<Record<string, Graph>> = {
  'shared-input': { id: 'shared-input', label: 'z = (x + y)·x', tex: 'z=(x+y)\\,x', inputs: ['x', 'y'], outputs: ['z'], nodes: [n('x', 'input'), n('y', 'input'), n('u', 'add', 'x', 'y'), n('z', 'mul', 'u', 'x')] },
  'sin-product': { id: 'sin-product', label: 'f = x·y + sin x', tex: 'f=x\\,y+\\sin x', inputs: ['x', 'y'], outputs: ['f'], nodes: [n('x', 'input'), n('y', 'input'), n('a', 'mul', 'x', 'y'), n('b', 'sin', 'x'), n('f', 'add', 'a', 'b')] },
  'scalar-loss': { id: 'scalar-loss', label: 'L = (a·b + c)²', tex: 'L=(a\\,b+c)^2', inputs: ['a', 'b', 'c'], outputs: ['L'], nodes: [n('a', 'input'), n('b', 'input'), n('c', 'input'), n('p', 'mul', 'a', 'b'), n('q', 'add', 'p', 'c'), n('L', 'square', 'q')] },
  'many-outputs': { id: 'many-outputs', label: 't ↦ (t², t³, sin t)', tex: 't\\mapsto(t^2,\\ t^3,\\ \\sin t)', inputs: ['t'], outputs: ['s', 'c', 'w'], nodes: [n('t', 'input'), n('s', 'square', 't'), n('c', 'mul', 's', 't'), n('w', 'sin', 't')] },
  quotient: { id: 'quotient', label: 'r = x / (x − y)', tex: 'r=\\frac{x}{x-y}', inputs: ['x', 'y'], outputs: ['r'], nodes: [n('x', 'input'), n('y', 'input'), n('d', 'sub', 'x', 'y'), n('r', 'div', 'x', 'd')] },
  square: { id: 'square', label: 'q = x·x (one node, two edges)', tex: 'q=x\\cdot x', inputs: ['x'], outputs: ['q'], nodes: [n('x', 'input'), n('q', 'mul', 'x', 'x')] },
};
