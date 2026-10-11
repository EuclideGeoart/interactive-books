/**
 * III.10 stage: an interactive computational graph. The learner edits inputs, chooses forward or reverse mode and steps through the semantic
 * trace; the graph view draws ONLY what the selected immutable frame contains (values, tangents/adjoints, per-edge contributions).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { ParameterInput } from '../../ui/ParameterInput';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { TraceStepper } from '../../ui/TraceStepper';
import { cursorAt, type TraceCursor, type TraceFrame } from '../../platform/trace';
import { TableView } from './CalculusStage';
import { AUTODIFF_CANONICAL, autodiffFields, autodiffPresets, autodiffSpecs, deriveAutodiff, graphOf, NODE_H, NODE_W, type AutodiffDerived, type AutodiffState, type DagFrame } from './autodiff-lesson';
import './calculus.css';

function GraphView({ d, frame, descId, label = 'Computational graph, scrollable' }: { d: AutodiffDerived; frame: DagFrame; descId: string; label?: string }) {
  // Derivative read-out in plain notation (combining accents render unreliably in monospace fonts).
  const wrt = (id: string) => (frame.phase === 'tangent' ? `∂${id}/∂${d.metrics.seed}` : `∂${d.metrics.output}/∂${id}`);
  return <div class="dag-wrap" role="region" aria-label={label} tabIndex={0}>
    <svg class="dag" viewBox={`0 0 ${d.width} ${d.height}`} style={{ minWidth: `${d.width}px`, maxWidth: `${Math.round(d.width * 1.25)}px` }} role="img" aria-labelledby={descId} data-dag data-phase={frame.phase} data-focus={frame.focus ?? ''}>
      {d.edges.map(e => {
        // Quadratic edge: the label sits at the curve midpoint; the arrowhead follows the tangent at the end.
        const active = frame.active.includes(e.key), mx = (e.x1 + 2 * e.cx + e.x2) / 4, my = (e.y1 + 2 * e.cy + e.y2) / 4;
        const tx = e.x2 - e.cx, ty = e.y2 - e.cy, len = Math.hypot(tx, ty) || 1, ux = tx / len, uy = ty / len, head = 10;
        const c = frame.contributions[e.key];
        return <g key={e.key} data-edge={e.key} data-local={e.local} data-contribution={c ?? ''} aria-hidden="true">
          <path class={`edge${active ? ' is-active' : ''}`} d={`M${e.x1} ${e.y1} Q${e.cx} ${e.cy} ${e.x2 - ux * head} ${e.y2 - uy * head}`} />
          <path class={`edge-head${active ? ' is-active' : ''}`} d={`M${e.x2} ${e.y2} L${e.x2 - ux * head - uy * 5} ${e.y2 - uy * head + ux * 5} L${e.x2 - ux * head + uy * 5} ${e.y2 - uy * head - ux * 5} Z`} />
          <text class="edge-label" x={mx} y={my - 7} text-anchor="middle">{e.local}</text>
          {c !== undefined && <text class="edge-label is-contribution" x={mx} y={my + 15} text-anchor="middle">{d.metrics.mode === 'reverse' ? `sends ${c}` : `adds ${c}`}</text>}
        </g>;
      })}
      {d.nodes.map(n => {
        const v = frame.values[n.id], dv = frame.derivs[n.id], active = frame.focus === n.id;
        return <g key={n.id} class={`node kind-${n.kind}${active ? ' is-active' : ''}${v !== undefined ? ' is-done' : ''}`} data-node={n.id} data-value={v ?? ''} data-deriv={dv ?? ''} aria-hidden="true">
          <rect x={n.x - NODE_W / 2} y={n.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={8} />
          <text class="node-op" x={n.x} y={n.y - 12} text-anchor="middle">{n.title}</text>
          <text class="node-value" x={n.x} y={n.y + 8} text-anchor="middle">{v !== undefined ? `value ${v}` : 'not yet computed'}</text>
          {dv !== undefined && <text class="node-adjoint" x={n.x} y={n.y + 25} text-anchor="middle">{`${wrt(n.id)} = ${dv}`}</text>}
        </g>;
      })}
    </svg>
  </div>;
}

function Inner() {
  const lesson = useLesson(AUTODIFF_CANONICAL, deriveAutodiff), { state, derived: d } = lesson;
  const id = useScopedId(), desc = useScopedId(), radio = useScopedId();
  const [hydrated, setHydrated] = useState(false), [announcement, setAnnouncement] = useState('');
  // The cursor belongs to ONE derivation. A new state has new frames (possibly fewer): until the learner moves, show its completed result.
  const [held, setHeld] = useState<{ d: AutodiffDerived; cursor: TraceCursor } | null>(null);
  const cursor = held && held.d === d ? held.cursor : cursorAt(d.frames.length, d.frames.length - 1);
  const setCursor = (next: TraceCursor) => setHeld({ d, cursor: next });
  useEffect(() => setHydrated(true), []);
  const commit = (next: AutodiffState) => { lesson.set(next); setAnnouncement(old => `${deriveAutodiff(next).verdict}${old.endsWith('​') ? '' : '​'}`); };
  const g = graphOf(state), specs = useMemo(() => autodiffSpecs(g), [g]);
  const frame = d.frames[cursor.index]!;
  return <section class="stage stage-full calculus-stage autodiff-stage" aria-labelledby={id} data-stage="calculus-autodiff" data-hydrated={hydrated}
    data-state={JSON.stringify(state)} data-status={d.status} data-metrics={JSON.stringify(d.metrics)}>
    <header class="stage-head"><h2 id={id}>Differentiate a computation, one edge at a time</h2>
      <button type="button" class="button quiet" data-action="reset" disabled={lesson.isCanonical} onClick={() => commit(AUTODIFF_CANONICAL)}>Reset</button></header>
    <div class="presets" role="group" aria-label="Choose a computational graph">{autodiffPresets.map(p => <button key={p.id} type="button" data-preset={p.id}
      aria-pressed={Object.entries(p.state).every(([k, v]) => state[k as keyof AutodiffState] === v)} onClick={() => commit(p.state)}>{p.label}</button>)}</div>
    <SegmentedControl legend="Differentiation mode" name={`${radio}-mode`} options={[{ id: 'reverse', label: 'reverse (adjoints)' }, { id: 'forward', label: 'forward (tangents)' }]}
      value={state.mode} onChange={mode => commit({ ...state, mode: mode as AutodiffState['mode'] })} />
    {state.mode === 'forward' && g.inputs.length > 1 && <SegmentedControl legend="Seed input (one forward pass each)" name={`${radio}-seed`} options={g.inputs.map((x, k) => ({ id: String(k), label: x }))}
      value={String(state.seed)} onChange={k => commit({ ...state, seed: Number(k) })} />}
    {state.mode === 'reverse' && g.outputs.length > 1 && <SegmentedControl legend="Output to differentiate (one reverse pass each)" name={`${radio}-output`} options={g.outputs.map((x, k) => ({ id: String(k), label: x }))}
      value={String(state.output)} onChange={k => commit({ ...state, output: Number(k) })} />}
    <GraphView d={d} frame={frame.state} descId={desc} />
    <p id={desc} class="sr-only">{d.description}</p>
    <TraceStepper label="Graph trace" frames={d.frames as readonly TraceFrame<DagFrame>[]} cursor={cursor} onCursor={setCursor} autoplay describeFrame={f => f.state.title}
      renderFrame={f => <><h3>{f.state.title}</h3><p>{f.state.detail}</p><FormulaScroll tex={f.state.formula} label="Graph trace: equation of this step, scrollable" /></>} />
    <p class="verdict" data-verdict data-agree={d.caution ? 'false' : 'true'}>{d.caution && <span class="verdict-cue">Exceptional case: </span>}{d.verdict}</p>
    <div class="stage-grid">
      <Inspector rows={d.rows} label="Mathematical quantities" legend="Exact values use =; binary64 approximations use ≈. Derivatives come from the graph; the analytic and finite-difference rows are independent checks." />
      <div class="formula-panel" role="group" aria-label="Live formulas">{d.formulas.map((tex, i) => <FormulaScroll key={i} tex={tex} label={`Rule ${i + 1}, scrollable`} />)}</div>
    </div>
    <TableView table={d.table} label="Forward versus reverse cost" />
    <div class="stage-controls">{autodiffFields(state).map(field => <ParameterInput key={`${state.graph}-${field}`} spec={specs[field]!} value={state[field as 'v1']}
      grid={{ kind: 'free' }} onCommit={value => commit({ ...state, [field]: value })} />)}</div>
    <p class="sr-only" role="status" aria-live="polite" data-announcement>{announcement}</p>
  </section>;
}
function Worked() {
  const id = useScopedId(), desc = useScopedId(), [hydrated, setHydrated] = useState(false);
  const d = useMemo(() => deriveAutodiff(AUTODIFF_CANONICAL), []);
  const [cursor, setCursor] = useState<TraceCursor>(cursorAt(d.frames.length));
  useEffect(() => setHydrated(true), []);
  return <section class="stage stage-full calculus-stage" data-stage="calculus-worked-autodiff" data-hydrated={hydrated} aria-labelledby={id}>
    <header class="stage-head"><h3 id={id}>Replay z = (x + y)·x at x = 2, y = 3</h3></header>
    <GraphView d={d} frame={d.frames[cursor.index]!.state} descId={desc} label="Worked computational graph, scrollable" /><p id={desc} class="sr-only">{d.description}</p>
    <TraceStepper label="Worked derivation trace" frames={d.frames} cursor={cursor} onCursor={setCursor} autoplay describeFrame={f => f.state.title}
      renderFrame={f => <><h3>{f.state.title}</h3><p>{f.state.detail}</p><FormulaScroll tex={f.state.formula} label="Worked derivation trace: equation of this step, scrollable" /></>} />
  </section>;
}
export default function AutodiffStage({ worked = false }: { worked?: boolean }) {
  return worked ? <IdScope name="calculus-worked-autodiff"><Worked /></IdScope> : <IdScope name="calculus-autodiff"><Inner /></IdScope>;
}
