import { useEffect, useRef, useState } from 'preact/hooks';
import { IdScope, useScopedId } from '../../ui/ids';
import NumberField from '../../ui/NumberField';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import TraceStepper from '../../ui/TraceStepper';
import type { TraceFrame } from '../../platform/trace';
import type { SVMState, Kernel } from './model/svm';
import { deriveLab, initialLab, preset, PRESETS, editPoint, movePoint, pointerPoint, tradeoffTrace, shown, type Mode } from './lesson';
import './stage.css';

function Experiment({ mode }: { mode: Mode }) {
  const uid = useScopedId(), plot = useRef<SVGSVGElement>(null), epoch = useRef(0);
  const [canonical] = useState(() => initialLab(mode));
  const [active, setActive] = useState(() => deriveLab(canonical));
  const latest = useRef(active); latest.current = active;
  const [width, setWidth] = useState(320), [selectedId, select] = useState('a'), [frontId, front] = useState('a');
  const [frames, setFrames] = useState<readonly TraceFrame<SVMState>[] | null>(null), [index, setIndex] = useState(0);
  const [revision, revise] = useState(0), [error, reject] = useState(''), [speech, announce] = useState('');
  const drag = useRef<{ id: string; pointer: number; node: SVGCircleElement; epoch: number; speech: string | null } | null>(null);
  const selected = active.state.points.find(p => p.id === selectedId) ?? active.state.points[0]!;
  const r = active.numerical;
  function speak(message: string) { announce(old => message + (old.endsWith('\u200b') ? '' : '\u200b')); }
  function cancelDrag() {
    epoch.current++; const held = drag.current; drag.current = null;
    if (held?.node.hasPointerCapture(held.pointer)) held.node.releasePointerCapture(held.pointer);
  }
  function commit(next: SVMState, verbal = true) {
    const derived = deriveLab(next, width); latest.current = derived; setActive(derived); setFrames(null); setIndex(0); reject('');
    if (verbal) { cancelDrag(); speak('Changed. ' + derived.speech); }
    return derived;
  }
  function attempt(action: () => void) { try { action(); } catch (reason) { reject(reason instanceof Error ? reason.message : 'Change rejected; previous state preserved.'); } }
  useEffect(() => {
    const svg = plot.current!;
    const measure = () => {
      const value = svg.getBoundingClientRect().width;
      if (value > 0) { setWidth(value); const derived = deriveLab(latest.current.state, value); latest.current = derived; setActive(derived); }
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(svg); return () => observer.disconnect();
  }, []);
  function replay() {
    attempt(() => {
      const trace = tradeoffTrace(latest.current.state); cancelDrag();
      const value = deriveLab(trace[0]!.state, width); latest.current = value; setActive(value);
      setFrames(trace); setIndex(0); revise(v => v + 1); reject(''); speak('Replay frame 1. ' + value.speech);
    });
  }
  function seek(i: number) {
    const frame = frames?.[i]; if (!frame) return;
    attempt(() => { const value = deriveLab(frame.state, width); cancelDrag(); latest.current = value; setActive(value); setIndex(i); revise(v => v + 1); reject(''); speak(`Replay frame ${i + 1}. ${value.speech}`); });
  }
  function finish(pointer: number, node: SVGCircleElement) {
    const held = drag.current; if (!held || held.pointer !== pointer || held.node !== node) return;
    drag.current = null; if (node.hasPointerCapture(pointer)) node.releasePointerCapture(pointer);
    if (held.epoch === epoch.current && held.speech) speak('Drag finished. ' + held.speech);
  }
  function changeKernel(change: Partial<Kernel>) { commit({ ...latest.current.state, kernel: { ...latest.current.state.kernel, ...change } }); }
  return <div class="p07-lab" data-svm-lab={mode} data-state={JSON.stringify(active.state)} data-result={JSON.stringify(r)} data-status={r.status} data-frame-index={frames ? index : 0}>
    <header class="p07-heading"><div><p>Part VII · margin laboratory</p><h2>{mode === 'hard' ? 'Solve the widest separating gap' : mode === 'soft' ? 'Pay for violations; inspect the compromise' : 'Fit similarities; trace the actual decision'}</h2></div>
      <button type="button" onClick={() => attempt(() => { cancelDrag(); commit(canonical); select('a'); front('a'); revise(v => v + 1); speak('Reset. ' + latest.current.speech); })}>Reset experiment</button></header>
    <p data-provenance>Hand-authored synthetic labeled observations; no seed or random draws. Edits change the fitted data. The same numerical result drives the plot, equations, ledger and diagnostics.</p>
    <div class="p07-view"><figure class="p07-plot">
      <svg ref={plot} viewBox="0 0 480 480" data-svm-plane data-origin="240" data-scale="32" role="group" aria-labelledby={`${uid}-title ${uid}-desc`}>
        <title id={`${uid}-title`}>Solved SVM decision and labeled observations</title>
        <desc id={`${uid}-desc`}>Plus marks are positive labels, minus marks negative. A ring means a nonzero dual support coefficient. Solid boundary is f=0; dashed contours are f=−1 and f=1. These are feature-space margins for nonlinear kernels, not input-space distances. Arrow keys and the numeric editor move points.</desc>
        <defs><clipPath id={`${uid}-clip`}><rect x="48" y="48" width="384" height="384" /></clipPath></defs>
        <g clip-path={`url(#${uid}-clip)`} aria-hidden="true">
          {active.surface?.cells.map((cell, i) => <rect key={i} class={`p07-region sign-${cell.sign}`} x={cell.x} y={cell.y} width={active.surface!.cellSize} height={active.surface!.cellSize} />)}
          {[...active.lines, ...(active.surface?.segments ?? [])].map((line, i) => <line key={i} data-level={line.level} class={line.level === 0 ? 'p07-boundary' : 'p07-margin'} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}
        </g>
        <g class="p07-axes" aria-hidden="true"><line x1="48" y1="240" x2="432" y2="240" /><line x1="240" y1="48" x2="240" y2="432" />
          {[-4, 0, 4].map(value => <g key={value}><text x={240 + 32 * value} y={240 + active.fontSize + 8} text-anchor="middle" font-size={active.fontSize}>{value}</text>{value !== 0 && <text x="228" y={240 - 32 * value + active.fontSize / 3} text-anchor="end" font-size={active.fontSize}>{value}</text>}</g>)}
          <text x="420" y="225" font-size={active.fontSize}>x₁</text><text x="253" y="70" font-size={active.fontSize}>x₂</text></g>
        {[...active.points.filter(p => p.id !== frontId), ...active.points.filter(p => p.id === frontId)].map(p => <g key={p.id}>
          {p.row?.support && <circle data-support={p.id} class="p07-support" cx={p.cx} cy={p.cy} r="13" aria-hidden="true" />}
          <circle class={p.y > 0 ? 'p07-positive' : 'p07-negative'} cx={p.cx} cy={p.cy} r="8" aria-hidden="true" />
          <path class="p07-sign" d={`M ${p.cx - 4} ${p.cy} h 8${p.y > 0 ? ` M ${p.cx} ${p.cy - 4} v 8` : ''}`} aria-hidden="true" />
          <text class="p07-label" x={p.cx + 12} y={p.cy - 12} font-size={active.fontSize} aria-hidden="true">{p.id}</text>
          <circle class="p07-handle" data-point-handle={p.id} cx={p.cx} cy={p.cy} r={active.hitRadius} data-x={p.x[0]} data-y={p.x[1]} tabindex={0} role="button" aria-label={p.name} aria-pressed={selected.id === p.id} aria-describedby={`${uid}-help`}
            {...{ ontouchstart: (event: TouchEvent) => event.preventDefault() }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cancelDrag(); select(p.id); front(p.id); }
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); select(p.id); attempt(() => commit(movePoint(latest.current.state, p.id, event.key, event.shiftKey))); }
            }}
            onPointerDown={event => {
              event.preventDefault(); cancelDrag(); select(p.id); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { id: p.id, pointer: event.pointerId, node: event.currentTarget, epoch: epoch.current, speech: null };
            }}
            onPointerMove={event => {
              const held = drag.current;
              if (!held || held.id !== p.id || held.pointer !== event.pointerId || held.node !== event.currentTarget || held.epoch !== epoch.current || !held.node.hasPointerCapture(event.pointerId)) return;
              attempt(() => { const coords = pointerPoint(event.clientX, event.clientY, plot.current!.getBoundingClientRect()); const value = commit(editPoint(latest.current.state, p.id, coords), false); if (drag.current) drag.current.speech = `Point ${p.id}: ${shown(coords.x)}, ${shown(coords.y)}. ${value.speech}`; });
            }} onPointerUp={event => finish(event.pointerId, event.currentTarget)} onPointerCancel={event => finish(event.pointerId, event.currentTarget)} onLostPointerCapture={event => finish(event.pointerId, event.currentTarget)} />
        </g>)}
      </svg><figcaption>+ Positive / − Negative · ring: α &gt; 10⁻⁹ · solid f=0 · dashed f=±1. No boundary is drawn for infeasible or failed fits. Nonlinear contours interpolate a 32×32 mesh; training decisions use the actual kernel sum.</figcaption>
      <p id={`${uid}-help`}>Drag a handle; arrows move 0.1, Shift + arrow 0.5. Pointer edits snap to 0.1 within ±5. Numeric entries keep finer precision. Select coincident points to bring their handles forward. Scroll outside handles.</p>
    </figure><div class="p07-side">
      {mode !== 'hard' && <fieldset><legend>Sum-hinge tradeoff</legend><NumberField key={`${revision}:C`} label="Penalty C" value={active.state.C} min={.01} max={20} step={.25} onCommit={C => commit({ ...latest.current.state, C })} /></fieldset>}
      {mode === 'kernel' && <fieldset><legend>Valid PSD kernel family</legend><label>Kernel<select value={active.state.kernel.kind} onChange={event => attempt(() => changeKernel({ kind: event.currentTarget.value as Kernel['kind'] }))}><option value="linear">Linear</option><option value="polynomial">Polynomial</option><option value="rbf">RBF</option></select></label>
        <NumberField key={`${revision}:gamma`} label="Kernel gamma" value={active.state.kernel.gamma} min={.05} max={2} step={.05} onCommit={gamma => changeKernel({ gamma })} />
        {active.state.kernel.kind === 'polynomial' && <><NumberField key={`${revision}:degree`} label="Polynomial degree" value={active.state.kernel.degree} min={1} max={4} step={1} onCommit={degree => changeKernel({ degree })} /><NumberField key={`${revision}:coef0`} label="Polynomial offset" value={active.state.kernel.coef0} min={0} max={2} step={.1} onCommit={coef0 => changeKernel({ coef0 })} /></>}
      </fieldset>}
      <fieldset><legend>Observation editor</legend><label>Selected point<select value={selected.id} onChange={event => { cancelDrag(); select(event.currentTarget.value); front(event.currentTarget.value); }}>{active.points.map(p => <option value={p.id}>{p.id} · label {p.y}</option>)}</select></label>
        <NumberField key={`${revision}:${selected.id}:x`} label="Point x" value={selected.x[0]} min={-5} max={5} step={.1} onCommit={x => commit(editPoint(latest.current.state, selected.id, { x }))} />
        <NumberField key={`${revision}:${selected.id}:y`} label="Point y" value={selected.x[1]} min={-5} max={5} step={.1} onCommit={y => commit(editPoint(latest.current.state, selected.id, { y }))} />
        <label>Class label<select value={selected.y} onChange={event => attempt(() => commit(editPoint(latest.current.state, selected.id, { label: Number(event.currentTarget.value) })))}><option value={-1}>Negative · −1</option><option value={1}>Positive · +1</option></select></label>
      </fieldset>
      <div class="p07-actions">{PRESETS.map(name => <button type="button" onClick={() => attempt(() => { cancelDrag(); commit(preset(latest.current.state, name)); select('a'); front('a'); revise(v => v + 1); })}>Use {name} data</button>)}{mode === 'kernel' && <button type="button" onClick={() => attempt(() => { cancelDrag(); commit(preset(latest.current.state, 'diagnosticFailure')); select('A'); front('A'); revise(v => v + 1); })}>Show diagnostic failure</button>}<button type="button" onClick={replay}>{mode === 'hard' ? 'Replay feasibility cases' : 'Replay C tradeoff'}</button></div>
      <p class="p07-status" data-diagnostic>{r.reason}</p>{error && <p role="alert" data-rejection>{error}</p>}
      <p data-current-frame>Frame {frames ? index + 1 : 1} / {frames?.length ?? 1}. Editing starts from this displayed frame.</p>
      {frames && <TraceStepper frames={frames} index={index} onSeek={seek} />}<Inspector rows={active.inspector} />
    </div></div>
    <div class="p07-equations">{active.formulas.map(f => <Formula key={f.label} {...f} />)}</div>
    <div class="table-scroll" tabindex={0} role="region" aria-label="Observation margin ledger, scrollable" data-scrollable="Observation margin ledger"><table><caption>Every training decision and constraint from the active fit</caption><thead><tr><th>ID / label</th><th>f(x)</th><th>Decision</th><th>y f(x)</th><th>ξ = hinge</th><th>Signed distance</th><th>α</th><th>Support / on margin</th></tr></thead><tbody>{active.points.map(p => <tr key={p.id} data-row={p.id}><th>{p.id} / {p.y}</th><td>{shown(p.row?.score ?? null)}</td><td>{p.row?.decision === 0 ? 'Tie' : p.row?.decision ?? 'Unavailable'}</td><td>{shown(p.row?.margin ?? null)}</td><td>{shown(p.row?.slack ?? null)}</td><td>{shown(p.row?.signedDistance ?? null)}</td><td>{shown(p.row?.alpha ?? null)}</td><td>{p.row ? `${p.row.support ? 'Yes' : 'No'} / ${p.row.onMargin ? 'Yes' : 'No'}` : 'Unavailable'}</td></tr>)}</tbody></table></div>
    {mode === 'kernel' && <div class="table-scroll" tabindex={0} role="region" aria-label="Kernel Gram matrix, scrollable" data-scrollable="Kernel Gram matrix"><table data-gram><caption>Gram K · {active.points.length} × {active.points.length}; entries are similarities, not probabilities</caption><thead><tr><th>Row / column</th>{active.points.map(p => <th>{p.id}</th>)}</tr></thead><tbody>{r.gram.map((row, i) => <tr><th>{active.points[i]!.id}</th>{row.map(value => <td data-number={value}>{shown(value)}</td>)}</tr>)}</tbody></table></div>}
    <p data-summary>{active.speech}</p><p class="sr-only" role="status" aria-live="polite">{speech}</p>
  </div>;
}
export default function SVMStage({ scope, mode }: { scope: string; mode: Mode }) { return <IdScope name={scope}><Experiment mode={mode} /></IdScope>; }
