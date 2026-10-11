/**
 * III.10 — computational graphs and automatic differentiation. Every number on the graph view comes from `src/math/calculus/autodiff.ts`:
 * this file lays the evaluated graph out and turns its forward/tangent/adjoint passes into immutable trace frames.
 */
import { add as addR, fromDecimal, toNumber, type Rational } from '../../math/quantity/rational';
import { centralDifference, evaluate, forwardMode, GRAPHS, reverseMode, SYMBOL, type Graph, type Num } from '../../math/calculus/autodiff';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import type { ParamSpec } from '../../platform/params';
import { exactDesc, givenDesc, gtext, numericDesc, ratDesc, row, rtex, rtext, spec, undefinedDesc, type CalcFrame, type CalcTable } from './calculus-view';
import type { InspectorRowData } from '../../ui/Inspector';

export interface AutodiffState { graph: string; v1: number; v2: number; v3: number; mode: 'reverse' | 'forward'; seed: number; output: number }
export const AUTODIFF_CANONICAL: AutodiffState = { graph: 'shared-input', v1: 2, v2: 3, v3: 1, mode: 'reverse', seed: 0, output: 0 };
export const autodiffPresets = [
  { id: 'shared-input', label: 'z = (x + y)·x', state: AUTODIFF_CANONICAL },
  { id: 'sin-product', label: 'x·y + sin x', state: { ...AUTODIFF_CANONICAL, graph: 'sin-product', v1: 1, v2: 2 } },
  { id: 'scalar-loss', label: '3 inputs → 1 loss', state: { ...AUTODIFF_CANONICAL, graph: 'scalar-loss', v1: 1, v2: 2, v3: -1 } },
  { id: 'many-outputs', label: '1 input → 3 outputs', state: { ...AUTODIFF_CANONICAL, graph: 'many-outputs', v1: 1.5, mode: 'forward' } },
  { id: 'square', label: 'x·x: two edges', state: { ...AUTODIFF_CANONICAL, graph: 'square', v1: 3 } },
  { id: 'division-by-zero', label: 'x / (x − y) at x = y', state: { ...AUTODIFF_CANONICAL, graph: 'quotient', v1: 2, v2: 2 } },
] as const satisfies readonly { id: string; label: string; state: AutodiffState }[];
export const graphOf = (s: AutodiffState): Graph => GRAPHS[s.graph] ?? GRAPHS['shared-input']!;
export function autodiffSpecs(g: Graph): Record<string, ParamSpec> {
  return Object.fromEntries(['v1', 'v2', 'v3'].map((id, k) => [id, spec(id, 0, `input ${g.inputs[k] ?? id}`, g.inputs[k] ?? id, -4, 4, 0.5)]));
}
export const autodiffFields = (s: AutodiffState) => graphOf(s).inputs.map((_, k) => `v${k + 1}`);

/** Hand-written analytic gradients, independent of the graph engine: rows = outputs, columns = inputs. */
export const ANALYTIC: Readonly<Record<string, (v: readonly number[]) => (number | null)[][]>> = {
  'shared-input': ([x, y]) => [[2 * x! + y!, x!]],
  'sin-product': ([x, y]) => [[y! + Math.cos(x!), x!]],
  'scalar-loss': ([a, b, c]) => { const q = a! * b! + c!; return [[2 * q * b!, 2 * q * a!, 2 * q]]; },
  'many-outputs': ([t]) => [[2 * t!], [3 * t! * t!], [Math.cos(t!)]],
  quotient: ([x, y]) => (x === y ? [[null, null]] : [[-y! / (x! - y!) ** 2, x! / (x! - y!) ** 2]]),
  square: ([x]) => [[2 * x!]],
};

export interface DagNode { id: string; title: string; kind: 'input' | 'op' | 'output'; x: number; y: number }
/** An edge is a quadratic curve x1,y1 → x2,y2 with control point cx,cy; an edge that skips a column arches above the nodes it would cross. */
export interface DagEdge { key: string; from: string; to: string; index: number; local: string; x1: number; y1: number; x2: number; y2: number; cx: number; cy: number; parallel: number }
export interface DagFrame extends CalcFrame {
  phase: 'forward' | 'tangent' | 'adjoint' | 'summary';
  focus: string | null;
  /** Node id → displayed value text (only values computed by this step). */
  values: Readonly<Record<string, string>>;
  /** Node id → tangent (forward mode) or adjoint (reverse mode) text computed so far. */
  derivs: Readonly<Record<string, string>>;
  /** Edge key → contribution text when it has been computed. */
  contributions: Readonly<Record<string, string>>;
  active: readonly string[];
}
export const NODE_W = 120, NODE_H = 66;
/** Horizontal room between node columns: enough for an edge label such as “∂L/∂q = 2” plus its contribution line. */
const COLUMN_GAP = 88;
const txt = (v: Num) => (v.kind === 'undefined' ? 'undefined' : v.exact ? rtext(v.exact) : `≈${v.value.toFixed(4)}`);
const tex = (v: Num) => (v.kind === 'undefined' ? '\\text{undefined}' : v.exact ? rtex(v.exact) : `${v.value.toFixed(6)}`);
const describe = (g: Graph, id: string) => { const n = g.nodes.find(x => x.id === id)!; return n.op === 'input' ? `${id} (input)` : n.args.length === 2 ? `${id} = ${n.args[0]} ${SYMBOL[n.op]} ${n.args[1]}` : n.op === 'square' ? `${id} = ${n.args[0]}²` : `${id} = ${SYMBOL[n.op]}(${n.args[0]})`; };

export function layout(g: Graph): { nodes: DagNode[]; edges: Omit<DagEdge, 'local'>[]; width: number; height: number } {
  // Operations: longest path from the inputs. Inputs: as late as possible (one column before their first consumer), so a late-used input
  // does not have to arch over unrelated nodes. Inputs feeding the first operation column stay in column 0.
  const depth = new Map<string, number>();
  for (const n of g.nodes) depth.set(n.id, n.args.length ? Math.max(...n.args.map(a => depth.get(a)! + 1)) : 0);
  for (const n of g.nodes) if (n.op === 'input') {
    const consumers = g.nodes.filter(m => m.args.includes(n.id)).map(m => depth.get(m.id)!);
    if (consumers.length) depth.set(n.id, Math.min(...consumers) - 1);
  }
  const maxD = Math.max(...depth.values()), cols = Array.from({ length: maxD + 1 }, (_, d) => g.nodes.filter(n => depth.get(n.id) === d));
  const width = Math.max(560, 40 + NODE_W + maxD * (NODE_W + COLUMN_GAP));
  const skips = g.nodes.some(n => n.args.some(a => depth.get(n.id)! - depth.get(a)! > 1));
  const top = skips ? 96 : 24, rowsMax = Math.max(...cols.map(c => c.length)), height = top + 16 + rowsMax * (NODE_H + 44);
  const nodes = g.nodes.map(n => {
    const d = depth.get(n.id)!, col = cols[d]!, i = col.indexOf(n);
    const x = maxD === 0 ? width / 2 : 20 + NODE_W / 2 + d * ((width - 40 - NODE_W) / maxD), y = top + (height - top) / 2 + (i - (col.length - 1) / 2) * (NODE_H + 44) - 8;
    return { id: n.id, title: describe(g, n.id), kind: n.op === 'input' ? 'input' as const : g.outputs.includes(n.id) ? 'output' as const : 'op' as const, x, y };
  });
  const at = new Map(nodes.map(n => [n.id, n]));
  const edges = g.nodes.flatMap(n => n.args.map((a, k) => {
    const A = at.get(a)!, B = at.get(n.id)!, parallel = n.args.filter(b => b === a).length > 1 ? (k === 0 ? -1 : 1) : 0;
    const skip = depth.get(n.id)! - depth.get(a)! > 1;
    const x1 = skip ? A.x : A.x + NODE_W / 2, y1 = skip ? A.y - NODE_H / 2 : A.y + parallel * 14, x2 = skip ? B.x : B.x - NODE_W / 2, y2 = skip ? B.y - NODE_H / 2 : B.y + parallel * 14;
    const cx = (x1 + x2) / 2, cy = skip ? Math.min(y1, y2) - 150 : (y1 + y2) / 2 + parallel * 34;
    return { key: `${a}->${n.id}#${k}`, from: a, to: n.id, index: k, x1, y1, x2, y2, cx, cy, parallel };
  }));
  return { nodes, edges, width, height };
}

export interface AutodiffDerived {
  graph: Graph; nodes: DagNode[]; edges: DagEdge[]; width: number; height: number;
  frames: readonly TraceFrame<DagFrame>[]; rows: readonly InspectorRowData[]; formulas: readonly string[]; verdict: string; status: string; caution: boolean;
  table: CalcTable; description: string; metrics: Readonly<Record<string, number | string | boolean | null>>;
}

export function deriveAutodiff(s: AutodiffState): AutodiffDerived {
  const g = graphOf(s), vals = [s.v1, s.v2, s.v3].slice(0, g.inputs.length);
  const inputs: Record<string, Rational> = Object.fromEntries(g.inputs.map((id, k) => [id, fromDecimal(vals[k]!, 2)!]));
  const e = evaluate(g, inputs), out = g.outputs[Math.min(s.output, g.outputs.length - 1)]!, seed = g.inputs[Math.min(s.seed, g.inputs.length - 1)]!;
  const rev = reverseMode(g, e, out), fwd = forwardMode(g, e, seed);
  const L = layout(g);
  const edges: DagEdge[] = L.edges.map(x => ({ ...x, local: `∂${x.to}/∂${x.from} = ${txt(e.edges.find(y => y.from === x.from && y.to === x.to && y.index === x.index)!.local)}` }));
  const valueText = Object.fromEntries(e.order.map(id => [id, txt(e.values[id]!)]));
  // ---- trace frames: forward values, then the chosen derivative pass, then a summary.
  const frames: Omit<TraceFrame<DagFrame>, 'index'>[] = [];
  const known: Record<string, string> = {};
  for (const id of g.inputs) known[id] = valueText[id]!;
  frames.push({ state: { phase: 'forward', focus: null, values: { ...known }, derivs: {}, contributions: {}, active: [], semantic: { inputs }, title: 'Inputs',
    detail: `Set ${g.inputs.map(id => `${id} = ${valueText[id]}`).join(', ')}.`, formula: g.inputs.map(id => `${id}=${tex(e.values[id]!)}`).join(',\\quad ') } });
  for (const id of e.order.filter(x => !g.inputs.includes(x))) {
    known[id] = valueText[id]!;
    const into = edges.filter(x => x.to === id);
    frames.push({ state: { phase: 'forward', focus: id, values: { ...known }, derivs: {}, contributions: {}, active: into.map(x => x.key), semantic: { node: id, value: e.values[id] },
      title: `Forward: ${describe(g, id)}`, detail: `Evaluate ${describe(g, id)} from values already computed: ${valueText[id]}. Each incoming edge stores its local derivative.`,
      formula: `${id}=${tex(e.values[id]!)},\\qquad ${into.map(x => `\\frac{\\partial ${id}}{\\partial ${x.from}}=${tex(e.edges.find(y => y.from === x.from && y.to === id && y.index === x.index)!.local)}`).join(',\\ ')}` } });
  }
  const contributions: Record<string, string> = {}, derivs: Record<string, string> = {};
  if (s.mode === 'reverse') {
    derivs[out] = '1';
    for (const step of rev.steps) {
      const n = g.nodes.find(x => x.id === step.node)!;
      if (n.op === 'input' || n.op === 'const') continue;
      for (const c of step.contributions) { const key = `${c.from}->${c.to}#${c.index}`; contributions[key] = txt(c.amount); }
      const upto = rev.steps.indexOf(step);
      for (const id of g.nodes.map(x => x.id)) if (id === out || rev.steps.slice(0, upto + 1).some(st => st.contributions.some(c => c.from === id)))
        derivs[id] = txt(partialAdjoint(rev.steps, id, upto, out));
      frames.push({ state: { phase: 'adjoint', focus: step.node, values: { ...known }, derivs: { ...derivs }, contributions: { ...contributions }, active: step.contributions.map(c => `${c.from}->${c.to}#${c.index}`),
        semantic: { node: step.node, adjoint: step.adjoint, contributions: step.contributions }, title: `Backward through ${step.node}`,
        detail: `${step.node}̄ = ${txt(step.adjoint)}. Send ${step.contributions.map(c => `${txt(c.upstream)} × ${txt(c.local)} = ${txt(c.amount)} to ${c.from}`).join('; ')}. Contributions to the same node ADD.`,
        formula: step.contributions.map(c => `\\bar ${c.from}\\mathrel{+}=\\bar ${step.node}\\cdot\\frac{\\partial ${step.node}}{\\partial ${c.from}}=${tex(c.upstream)}\\cdot${tex(c.local)}=${tex(c.amount)}`).join(',\\quad ') } });
    }
  } else {
    for (const id of g.inputs) derivs[id] = id === seed ? '1' : '0';
    frames.push({ state: { phase: 'tangent', focus: seed, values: { ...known }, derivs: { ...derivs }, contributions: {}, active: [], semantic: { seed }, title: `Seed ${seed}̇ = 1`,
      detail: `Forward mode differentiates with respect to ONE input per pass: ${seed}̇ = 1 and every other input has tangent 0.`, formula: g.inputs.map(id => `\\dot ${id}=${id === seed ? 1 : 0}`).join(',\\ ') } });
    for (const step of fwd.steps) {
      derivs[step.node] = txt(step.tangent);
      for (const t of step.terms) contributions[`${t.from}->${step.node}#${t.index}`] = txt(t.term);
      frames.push({ state: { phase: 'tangent', focus: step.node, values: { ...known }, derivs: { ...derivs }, contributions: { ...contributions }, active: step.terms.map(t => `${t.from}->${step.node}#${t.index}`),
        semantic: { node: step.node, tangent: step.tangent, terms: step.terms }, title: `Tangent of ${step.node}`,
        detail: `${step.node}̇ = ${step.terms.map(t => `(∂${step.node}/∂${t.from})·${t.from}̇`).join(' + ')} = ${txt(step.tangent)}.`,
        formula: `\\dot ${step.node}=${step.terms.map(t => tex(t.term)).join('+')}=${tex(step.tangent)}` } });
    }
  }
  // ---- inspector and checks
  const analytic = ANALYTIC[g.id]?.(vals) ?? null, oi = g.outputs.indexOf(out);
  const rows: InspectorRowData[] = g.inputs.map((id, k) => row(`in-${id}`, id, `Input ${id}`, givenDesc(vals[k]!), 'x'));
  for (const o of g.outputs) rows.push(row(`out-${o}`, o, `Output ${o}`, e.values[o]!.kind === 'value' ? (e.values[o]!.exact ? ratDesc(e.values[o]!.exact!) : numericDesc(e.values[o]!.value)) : undefinedDesc((e.values[o] as { reason: string }).reason), 'primary'));
  const asDesc = (v: Num) => (v.kind === 'undefined' ? undefinedDesc(v.reason) : v.exact ? ratDesc(v.exact) : numericDesc(v.value));
  if (s.mode === 'reverse') g.inputs.forEach((id, k) => {
    rows.push(row(`grad-${id}`, `\\partial ${out}/\\partial ${id}`, `Reverse mode: adjoint of ${id}`, asDesc(rev.adjoints[id]!), 'derived'));
    const paths = e.edges.filter(x => x.from === id);
    if (paths.length > 1) rows.push(row(`paths-${id}`, `\\bar ${id}`, `Contributions reaching ${id}`, exactDesc(paths.map(x => { const c = rev.steps.find(st => st.node === x.to)!.contributions.find(c => c.from === id && c.index === x.index)!; return `${txt(c.amount)} via ${x.to}`; }).join(' + ')), 'derived', true));
    const a = analytic?.[oi]?.[k];
    rows.push(row(`analytic-${id}`, '\\text{check}', `Analytic formula for ∂${out}/∂${id}`, a === null || a === undefined ? undefinedDesc('No value: the function is undefined here.') : numericDesc(a), 'ink', true));
  });
  else g.outputs.forEach((o, j) => {
    rows.push(row(`tan-${o}`, `\\partial ${o}/\\partial ${seed}`, `Forward mode: tangent of ${o}`, asDesc(fwd.tangents[o]!), 'derived'));
    const a = analytic?.[j]?.[g.inputs.indexOf(seed)];
    rows.push(row(`analytic-${o}`, '\\text{check}', `Analytic formula for ∂${o}/∂${seed}`, a === null || a === undefined ? undefinedDesc('No value: the function is undefined here.') : numericDesc(a), 'ink', true));
  });
  const fd = centralDifference(g, inputs, out, s.mode === 'reverse' ? g.inputs[0]! : seed);
  rows.push(row('fd', '\\delta_h', `Central difference, h = 10⁻⁶ (numerical evidence)`, fd === null ? undefinedDesc('A shifted evaluation is undefined.') : numericDesc(fd), 'ink', true));
  const table: CalcTable = { caption: 'Cost of a full gradient/Jacobian: forward mode needs one pass per INPUT, reverse mode one pass per OUTPUT',
    head: ['graph', 'inputs n', 'outputs m', 'forward passes', 'reverse passes'], rows: [[g.label, `${g.inputs.length}`, `${g.outputs.length}`, `${g.inputs.length}`, `${g.outputs.length}`]] };
  const undefinedOut = e.values[out]!.kind === 'undefined';
  const status = undefinedOut ? 'undefined' : s.mode;
  const total = (id: string) => txt(rev.adjoints[id]!);
  const verdict = undefinedOut ? `${out} is undefined (${(e.values[out] as { reason: string }).reason}). Nothing downstream — and no derivative — is fabricated.`
    : s.mode === 'reverse' ? `One backward pass gives every ∂${out}/∂input: ${g.inputs.map(id => `∂${out}/∂${id} = ${total(id)}`).join(', ')}.${g.id === 'shared-input' ? ' x reaches z along two paths (through u and directly); their contributions add to 2x + y.' : ''}`
      : `One forward pass seeded at ${seed} gives ∂output/∂${seed} for every output: ${g.outputs.map(o => `${txt(fwd.tangents[o]!)}`).join(', ')}.`;
  frames.push({ state: { phase: 'summary', focus: null, values: { ...known }, derivs: { ...derivs }, contributions: { ...contributions }, active: [], semantic: { adjoints: rev.adjoints, tangents: fwd.tangents },
    title: 'Result', detail: verdict, formula: s.mode === 'reverse' ? g.inputs.map(id => `\\frac{\\partial ${out}}{\\partial ${id}}=${tex(rev.adjoints[id]!)}`).join(',\\quad ') : g.outputs.map(o => `\\frac{\\partial ${o}}{\\partial ${seed}}=${tex(fwd.tangents[o]!)}`).join(',\\quad ') } });
  const formulas = [
    g.tex,
    s.mode === 'reverse' ? `\\bar v=\\sum_{\\text{edges } v\\to w}\\bar w\\,\\frac{\\partial w}{\\partial v},\\qquad \\bar{${out}}=1` : `\\dot w=\\sum_{\\text{edges } v\\to w}\\frac{\\partial w}{\\partial v}\\,\\dot v,\\qquad \\dot{${seed}}=1`,
  ];
  const description = `Computational graph of ${g.label} with inputs ${g.inputs.map((id, k) => `${id} = ${gtext(vals[k]!)}`).join(', ')}. `
    + e.order.filter(x => !g.inputs.includes(x)).map(id => `${describe(g, id)} = ${valueText[id]}`).join('; ') + '. '
    + `Edges carry local derivatives: ${edges.map(x => x.local).join('; ')}. ${verdict}`;
  return { graph: g, nodes: L.nodes, edges, width: L.width, height: L.height, frames: traceFrom<DagFrame>(frames), rows, formulas, verdict, status, caution: undefinedOut, table, description,
    metrics: { graph: g.id, mode: s.mode, output: out, seed, ...Object.fromEntries(g.inputs.map(id => [`adj_${id}`, rev.adjoints[id]!.kind === 'value' ? (rev.adjoints[id] as { value: number }).value : null])),
      ...Object.fromEntries(g.outputs.map(o => [`tan_${o}`, fwd.tangents[o]!.kind === 'value' ? (fwd.tangents[o] as { value: number }).value : null])), fd } };
}
/** Adjoint of `id` accumulated up to and including reverse step `upto` (for the step-by-step view). */
function partialAdjoint(steps: ReturnType<typeof reverseMode>['steps'], id: string, upto: number, out: string): Num {
  let total: Num = { kind: 'value', value: id === out ? 1 : 0, exact: { num: id === out ? 1n : 0n, den: 1n } };
  for (const st of steps.slice(0, upto + 1)) for (const c of st.contributions) if (c.from === id) {
    if (total.kind === 'undefined' || c.amount.kind === 'undefined') { total = c.amount.kind === 'undefined' ? c.amount : total; continue; }
    total = total.exact && c.amount.exact ? { kind: 'value', value: toNumber(addR(total.exact, c.amount.exact)), exact: addR(total.exact, c.amount.exact) } : { kind: 'value', value: total.value + c.amount.value };
  }
  return total;
}
