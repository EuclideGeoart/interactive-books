import { useEffect, useRef, useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import NumberField from '../../ui/NumberField';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import TraceStepper from '../../ui/TraceStepper';
import type { TraceFrame } from '../../platform/trace';
import { componentTrace, type PCAState } from './model/pca';
import { deriveLab, editLabPoint, initialLab, movePoint, pointerPoint, preset, shown, PLANE, type Mode } from './lesson';
import './stage.css';

function Experiment({ mode }: { mode: Mode }) {
  const uid = useScopedId(), titleId = `${uid}-title`, descId = `${uid}-desc`, helpId = `${uid}-help`, clipId = `${uid}-clip`;
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(320);
  const [canonical] = useState(initialLab);
  const lesson = useLesson(canonical, s => deriveLab(s, width));
  const active = lesson.derived, result = active.numerical;
  const latest = useRef(active); latest.current = active;
  // Keep selector-chosen hit areas in front: minimum touch targets can overlap in a narrow plot.
  const [selectedId, select] = useState('a'), [frontId, setFront] = useState('a');
  const selected = active.state.points.find(p => p.id === selectedId) ?? active.state.points[0]!;
  const [frames, setFrames] = useState<readonly TraceFrame<PCAState>[] | null>(null), [index, setIndex] = useState(0);
  const [revision, revise] = useState(0), [reason, reject] = useState(''), [announcement, announce] = useState('');
  const epoch = useRef(0);
  const drag = useRef<{ id: string; pointerId: number; node: SVGCircleElement; epoch: number; speech: string | null } | null>(null);
  useEffect(() => {
    const node = svg.current!;
    const measure = () => { const value = node.getBoundingClientRect().width; if (value > 0) setWidth(value); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  function speak(message: string) { announce(previous => message + (previous.endsWith('\u200b') ? '' : '\u200b')); }
  function invalidate() {
    epoch.current++; const held = drag.current; drag.current = null;
    if (held?.node.hasPointerCapture(held.pointerId)) held.node.releasePointerCapture(held.pointerId);
  }
  function accept(next: PCAState, verbal = true) {
    const value = deriveLab(next, width); latest.current = value; lesson.set(next); setFrames(null); setIndex(0); reject('');
    if (verbal) { invalidate(); speak('Changed. ' + value.speech); }
    return value;
  }
  function attempt(action: () => void) { try { action(); } catch (error) { reject(error instanceof Error ? error.message : 'Change rejected. Previous state preserved.'); } }
  function reset() { invalidate(); accept(canonical); select('a'); setFront('a'); revise(v => v + 1); speak('Reset. ' + latest.current.speech); }
  function replay() {
    attempt(() => {
      const trace = componentTrace(latest.current.state);
      trace.forEach(frame => deriveLab(frame.state, width));
      invalidate(); latest.current = deriveLab(trace[0]!.state, width); lesson.set(trace[0]!.state);
      setFrames(trace); setIndex(0); revise(v => v + 1); reject(''); speak('Replay frame 1. ' + latest.current.speech);
    });
  }
  function seek(i: number) {
    const frame = frames?.[i]; if (!frame) return;
    invalidate(); const value = deriveLab(frame.state, width); latest.current = value; lesson.set(frame.state);
    setIndex(i); revise(v => v + 1); reject(''); speak(`Replay frame ${i + 1}. ${value.speech}`);
  }
  function finish(pointerId: number, target: SVGCircleElement) {
    const held = drag.current;
    if (!held || held.pointerId !== pointerId || held.node !== target) return;
    drag.current = null;
    if (held.node.hasPointerCapture(pointerId)) held.node.releasePointerCapture(pointerId);
    if (held.epoch === epoch.current && held.speech) speak('Drag finished. ' + held.speech);
  }
  const scalar = (name: string, label: string, value: number | null, undefinedReason = 'Undefined: zero total variance.') =>
    <div><dt>{label}</dt><dd data-scalar={name} data-number={value === null ? undefined : value}>{value === null ? undefinedReason : shown(value)}</dd></div>;
  const heading = mode === 'covariance' ? 'Center the cloud; inspect every product' : mode === 'eigenpairs' ? 'Spread chooses a line, not an arrow' : 'Keep components; measure what is lost';
  return <div class="p06-lab" data-pca-lab={mode} data-k={active.state.k} data-frame-index={frames ? index : 0}
    data-normalization={active.state.normalization} data-status={result.status} data-state={JSON.stringify(active.state)}>
    <header class="p06-heading"><div><p>Part VI · inspectable two-feature PCA</p><h2>{heading}</h2></div>
      <button type="button" onClick={reset}>Reset experiment</button></header>
    <p data-provenance>Hand-authored synthetic observations; no random draws or seed. Edits change the displayed cloud. Fit and reconstruction use these same rows.</p>
    <div class="p06-view">
      <figure class="p06-plot"><svg ref={svg} data-pca-plane viewBox="0 0 640 640" role="group" aria-labelledby={`${titleId} ${descId}`}
        data-origin={PLANE.origin} data-scale={PLANE.scale}>
        <title id={titleId}>PCA data, principal lines and reconstruction plane</title>
        <desc id={descId}>Filled circles are observations. The plus is the mean. Solid and dashed principal lines pass through the mean; hollow squares are reconstructions, connected by residual segments. Equal units on both axes. Drag a point or focus its handle and use arrow keys.</desc>
        <defs><clipPath id={clipId}><rect x="64" y="64" width="512" height="512" /></clipPath></defs>
        <g class="p06-axes" aria-hidden="true">
          <line x1="64" y1="320" x2="576" y2="320" /><line x1="320" y1="64" x2="320" y2="576" />
          {active.ticks.map(t => <g key={t.value}><text x={t.cx} y={320 + active.fontSize + 8} text-anchor="middle" font-size={active.fontSize}>{t.value}</text>
            {t.value !== 0 && <text x="304" y={t.cy + active.fontSize / 3} text-anchor="end" font-size={active.fontSize}>{t.value}</text>}</g>)}
          <text x="563" y="306" font-size={active.fontSize}>x</text><text x="334" y="84" font-size={active.fontSize}>y</text>
        </g>
        <g clip-path={`url(#${clipId})`} aria-hidden="true">
          {active.axes.map(axis => <line key={axis.index} class={`p06-principal axis-${axis.index}`} data-principal-axis={axis.index}
            data-vector={JSON.stringify(axis.v)} data-eigenvalue={axis.eigenvalue} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} />)}
          {active.points.map(p => p.shadow && p.residualLine && <g key={p.id}>
            <line class="p06-residual" data-residual={p.id} {...p.residualLine} />
            <rect class="p06-shadow" data-shadow={p.id} x={p.shadow.cx - 6} y={p.shadow.cy - 6} width="12" height="12" />
          </g>)}
          <path class="p06-mean" data-mean d={`M ${active.meanMark.cx - 9} ${active.meanMark.cy} h 18 M ${active.meanMark.cx} ${active.meanMark.cy - 9} v 18`} />
        </g>
        {[...active.points.filter(p => p.id !== frontId), ...active.points.filter(p => p.id === frontId)].map(p => <g key={p.id}>
          <circle class="p06-point" aria-hidden="true" cx={p.cx} cy={p.cy} r="7" />
          <text class="p06-point-label" aria-hidden="true" x={p.label.x} y={p.label.y} font-size={active.fontSize}>{p.id}</text>
          {/* Native lowercase casing is required when the SVG ontouchstart property is absent. */}
          <circle class="p06-handle" data-point-handle={p.id} data-x={p.x[0]} data-y={p.x[1]} cx={p.cx} cy={p.cy} r={active.hitRadius}
            tabindex={0} role="button" aria-label={p.name} aria-pressed={selected.id === p.id} aria-describedby={helpId}
            {...{ ontouchstart: (event: TouchEvent) => event.preventDefault() }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); invalidate(); select(p.id); setFront(p.id); }
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
                event.preventDefault(); select(p.id); attempt(() => accept(movePoint(latest.current.state, p.id, event.key, event.shiftKey)));
              }
            }}
            onPointerDown={event => {
              event.preventDefault(); invalidate(); select(p.id); event.currentTarget.focus();
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { id: p.id, pointerId: event.pointerId, node: event.currentTarget, epoch: epoch.current, speech: null };
            }}
            onPointerMove={event => {
              if (!drag.current || drag.current.id !== p.id || drag.current.pointerId !== event.pointerId || drag.current.node !== event.currentTarget || drag.current.epoch !== epoch.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              attempt(() => {
                const next = pointerPoint(event.clientX, event.clientY, svg.current!.getBoundingClientRect());
                const value = accept(editLabPoint(latest.current.state, p.id, next), false);
                if (drag.current) drag.current.speech = `Point ${p.id}: x ${shown(next.x)}, y ${shown(next.y)}. ${value.speech}`;
              });
            }} onPointerUp={event => finish(event.pointerId, event.currentTarget)} onPointerCancel={event => finish(event.pointerId, event.currentTarget)} onLostPointerCapture={event => finish(event.pointerId, event.currentTarget)} />
        </g>)}
      </svg><figcaption>● Observation · + Mean · □ Reconstruction · residual segment · solid PC1 / dashed PC2. Lines have arbitrary signs. Repeated-eigenvalue lines show one conventional basis.</figcaption>
      <p id={helpId}>Drag any point; arrows move 0.1, Shift + arrow 0.5. Pointer edits snap to 0.1 and stop at ±5. Numeric entries retain finer precision. Overlapping points remain available in the point selector; its chosen handle is brought to the front. Scroll the page outside the handles.</p></figure>
      <div class="p06-side">
        <fieldset><legend>Covariance and retained space</legend>
          <label>Covariance normalization<select value={active.state.normalization} onChange={event => attempt(() => accept({ ...latest.current.state, normalization: event.currentTarget.value as PCAState['normalization'] }))}>
            <option value="sample">Sample · divide by n−1</option><option value="population">Population · divide by n</option></select></label>
          <label>Retained components k<select value={active.state.k} onChange={event => attempt(() => accept({ ...latest.current.state, k: Number(event.currentTarget.value) }))}>
            {[0, 1, 2].map(k => <option value={k}>{k} components</option>)}</select></label>
        </fieldset>
        <fieldset><legend>Observation editor</legend><label>Selected point<select value={selected.id} onChange={event => { invalidate(); select(event.currentTarget.value); setFront(event.currentTarget.value); }}>
          {active.state.points.map(p => <option value={p.id}>{p.id}</option>)}</select></label>
          <NumberField key={`${revision}:${selected.id}:x`} label="Point x" value={selected.x[0]} min={-5} max={5} step={.1} onCommit={x => accept(editLabPoint(latest.current.state, selected.id, { x }))} />
          <NumberField key={`${revision}:${selected.id}:y`} label="Point y" value={selected.x[1]} min={-5} max={5} step={.1} onCommit={y => accept(editLabPoint(latest.current.state, selected.id, { y }))} />
        </fieldset>
        <div class="p06-actions">{(['tilted', 'line', 'isotropic', 'constant', 'singleton'] as const).map(name =>
          <button type="button" onClick={() => attempt(() => { invalidate(); accept(preset(latest.current.state, name)); revise(v => v + 1); select('a'); setFront('a'); })}>{`Use ${name} cloud`}</button>)}
          <button type="button" onClick={replay}>Replay k = 0, 1, 2</button></div>
        <p class="p06-ambiguity" data-ambiguity>{active.ambiguity}</p>
        {reason && <p role="alert" data-rejection>{reason}</p>}
        <p data-current-frame>Frame {frames ? index + 1 : 1} / {frames?.length ?? 1}. Edits begin at the displayed frame.</p>
        {frames && <TraceStepper frames={frames} index={index} onSeek={seek} />}
        <Inspector rows={active.inspector} />
      </div>
    </div>
    <dl class="p06-scalars">{result.status === 'defined' ? <>
      {scalar('lambda1', 'λ1', result.eigenvalues[0])}{scalar('lambda2', 'λ2', result.eigenvalues[1])}
      {scalar('retained', 'Retained variance fraction', result.retained)}{scalar('sse', 'Reconstruction SSE', result.sse)}
      {scalar('mse', 'Per-observation MSE · SSE/n', result.mse)}{scalar('entry-mse', 'Per-entry MSE · SSE/(2n)', result.entryMse)}
    </> : scalar('sse', 'Covariance / PCA / reconstruction', null, result.reason)}</dl>
    <div class="p06-equations">{active.formulas.map(f => <Formula key={f.label} {...f} />)}</div>
    {result.status === 'defined' && <>
      <div class="table-scroll" data-scrollable="PCA covariance and eigenpairs, scrollable" tabindex={0} role="region" aria-label="PCA covariance and eigenpairs, scrollable">
        <table><caption>Covariance C (2 × 2), ordered directions (2 × 1), and variance ratios</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Interpretation</th></tr></thead>
          <tbody><tr><th scope="row">C row 1</th><td data-covariance="0">[{result.covariance[0].map(shown).join(', ')}]</td><td>Variance x; covariance x,y</td></tr>
            <tr><th scope="row">C row 2</th><td data-covariance="1">[{result.covariance[1].map(shown).join(', ')}]</td><td>Covariance y,x; variance y</td></tr>
            {result.axes.map((v, i) => <tr key={i} data-eigenpair={i}><th scope="row">PC{i + 1}</th><td>[{v.map(shown).join(', ')}]</td>
              <td>λ ≈ {shown(result.eigenvalues[i]!)}; fraction {result.ratios === null ? 'undefined (zero spread)' : shown(result.ratios[i]!)}</td></tr>)}</tbody></table>
      </div>
    </>}
    <div class="table-scroll" data-scrollable="PCA observation products and reconstruction, scrollable" tabindex={0} role="region" aria-label="PCA observation products and reconstruction, scrollable">
      <table><caption>Actual row-batch values; products accumulate into C; residual = observation − reconstruction</caption>
        <thead><tr><th scope="col">ID</th><th scope="col">x,y</th><th scope="col">Centered</th><th scope="col">dx²; dx·dy; dy²</th><th scope="col">Scores (k)</th><th scope="col">Reconstruction</th><th scope="col">Residual</th><th scope="col">Squared error</th></tr></thead>
        <tbody>{active.points.map((p, i) => <tr key={p.id} data-source-row={p.id} data-x={JSON.stringify(p.x)} data-centered={JSON.stringify(result.centered[i])}
          data-scores={p.row ? JSON.stringify(p.row.scores) : undefined} data-reconstruction={p.row ? JSON.stringify(p.row.reconstructed) : undefined}
          data-residual-vector={p.row ? JSON.stringify(p.row.residual) : undefined} data-squared-error={p.row?.squaredError}>
          <th scope="row">{p.id}</th><td>[{p.x.map(shown).join(', ')}]</td><td>[{result.centered[i]!.map(shown).join(', ')}]</td>
          <td>{result.products[i]!.map(shown).join('; ')}</td>
          <td>{p.row ? `[${p.row.scores.map(shown).join(', ')}]` : 'Undefined'}</td><td>{p.row ? `[${p.row.reconstructed.map(shown).join(', ')}]` : 'Undefined'}</td>
          <td>{p.row ? `[${p.row.residual.map(shown).join(', ')}]` : 'Undefined'}</td><td>{p.row ? shown(p.row.squaredError) : 'Undefined'}</td>
        </tr>)}</tbody></table>
    </div>
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
  </div>;
}
export default function PCAStage({ scope, mode }: { scope: string; mode: Mode }) { return <IdScope name={scope}><Experiment mode={mode} /></IdScope>; }
