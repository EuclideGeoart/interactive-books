import { useEffect, useRef, useState } from 'preact/hooks';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import NumberField from '../../ui/NumberField';
import TraceStepper from '../../ui/TraceStepper';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import type { TraceFrame } from '../../platform/trace';
import { CANONICAL_REGRESSION, regressionStep, regressionTrace, type RegressionState } from './model/linear-regression';
import { deriveRegressionLesson, editRegressionSample, moveRegressionSample, regressionPointer, REGRESSION_UI } from './linear-regression-lesson';
import './linear-regression.css';

function RegressionExperiment() {
  const uid = useScopedId();
  const titleId = `${uid}-title`, descriptionId = `${uid}-description`, clipId = `${uid}-clip`, helpId = `${uid}-help`;
  const svg = useRef<SVGSVGElement>(null);
  const [plotWidth, setPlotWidth] = useState(320);
  const lesson = useLesson(CANONICAL_REGRESSION, state => deriveRegressionLesson(state, plotWidth));
  const active = lesson.derived;
  const [selectedId, select] = useState('s1');
  const selected = active.rows.find(row => row.id === selectedId) ?? active.rows[0]!;
  const [frames, setFrames] = useState<readonly TraceFrame<RegressionState>[] | null>(null);
  const [index, setIndex] = useState(0);
  const [updates, setUpdates] = useState(0);
  const [traceOrigin, setTraceOrigin] = useState(0);
  const [controlRevision, reviseControls] = useState(0);
  const [reason, reject] = useState('');
  const [announcement, announce] = useState('');
  const dragResult = useRef<{ value: ReturnType<typeof deriveRegressionLesson>; sampleId: string } | null>(null);

  useEffect(() => {
    const element = svg.current!;
    const measure = () => { const width = element.getBoundingClientRect().width; if (width > 0) setPlotWidth(width); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function announceResult(value: ReturnType<typeof deriveRegressionLesson>, sampleId = selected.id, prefix = '') {
    const sample = value.points.find(point => point.id === sampleId)!;
    const message = `${prefix}${sample.speech} ${value.speech}`;
    announce(previous => message + (previous.endsWith('\u200b') ? '' : '\u200b'));
  }
  function accept(state: RegressionState, update = false, speak = true, sampleId = selected.id) {
    const value = deriveRegressionLesson(state, plotWidth);
    if (speak) dragResult.current = null;
    const changed = state.weight !== active.state.weight || state.bias !== active.state.bias ||
      state.learningRate !== active.state.learningRate || state.samples.some((sample, i) =>
        sample.x !== active.state.samples[i]!.x || sample.y !== active.state.samples[i]!.y);
    if (!changed && !update) { reject(''); return value; }
    lesson.set(state);
    setFrames(null);
    setIndex(0);
    setUpdates(update ? updates + 1 : 0);
    reject('');
    if (speak && (changed || update)) announceResult(value, sampleId, update ? 'Update applied. ' : 'Change applied. ');
    return value;
  }
  function attempt(action: () => void) {
    try { action(); }
    catch (error) { reject(error instanceof Error ? error.message : 'This change cannot be represented. State preserved.'); }
  }
  function reset() {
    dragResult.current = null;
    lesson.reset(); setFrames(null); setIndex(0); setUpdates(0); select('s1'); reject('');
    reviseControls(controlRevision + 1);
    announceResult(deriveRegressionLesson(CANONICAL_REGRESSION, plotWidth), 's1', 'Reset. ');
  }
  function replay() {
    attempt(() => {
      const trace = regressionTrace(active.state, 3);
      for (const frame of trace) deriveRegressionLesson(frame.state, plotWidth);
      dragResult.current = null;
      setFrames(trace); setIndex(0); setTraceOrigin(updates); lesson.set(trace[0]!.state); reject('');
      reviseControls(controlRevision + 1);
      announceResult(active, selected.id, 'Replay frame 1 of 4. ');
    });
  }
  function seek(next: number) {
    const frame = frames?.[next];
    if (!frame) return;
    dragResult.current = null;
    lesson.set(frame.state); setIndex(next); setUpdates(traceOrigin + next); reject('');
    reviseControls(controlRevision + 1);
    announceResult(deriveRegressionLesson(frame.state, plotWidth), selected.id, `Replay frame ${next + 1} of ${frames!.length}. `);
  }

  return <div data-regression data-weight={active.state.weight} data-bias={active.state.bias}
    data-learning-rate={active.state.learningRate} data-mse={active.mse} data-frame-index={frames ? index : 0} data-updates={updates}>
    <header class="regression-heading"><div><p class="regression-kicker">III-07 · Inspect one update</p>
      <h2>Observations → predictions → residuals</h2></div><button type="button" onClick={reset}>Reset experiment</button></header>
    <p class="regression-provenance" data-provenance>{active.provenance}. Synthetic values, not measured data.</p>
    <div class="regression-layout">
      <div class="regression-diagram">
        <svg ref={svg} data-plane viewBox={active.plot.viewBox} role="group" aria-labelledby={`${titleId} ${descriptionId}`}
          data-origin={active.plot.origin} data-scale={active.plot.scale} data-domain-min={active.plot.min} data-domain-max={active.plot.max}>
          <title id={titleId}>Affine regression coordinate plane</title>
          <desc id={descriptionId}>Filled circles are observations, hollow diamonds are predictions, and dashed vertical segments are residuals. Both axes use the same scale. Focus a sample and use arrow keys, or drag its handle.</desc>
          <defs><clipPath id={clipId}><rect {...active.plot.clip} /></clipPath></defs>
          <g class="regression-axes" aria-hidden="true">
            {active.plot.axes.map(axis => <line {...axis} />)}
            {active.plot.ticks.map(tick => <g key={tick.key}><line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
              <text x={tick.labelX} y={tick.labelY} text-anchor={tick.anchor} font-size={active.plot.fontSize}>{tick.text}</text></g>)}
            {active.plot.labels.map(label => <text x={label.x} y={label.y} text-anchor={label.anchor} font-size={active.plot.fontSize}>{label.text}</text>)}
          </g>
          <g clip-path={`url(#${clipId})`} aria-hidden="true">
            <line class="regression-predictor" data-prediction-line x1={active.plot.line.x1} y1={active.plot.line.y1}
              x2={active.plot.line.x2} y2={active.plot.line.y2} data-x1={active.plot.line.from.x} data-y1={active.plot.line.from.y}
              data-x2={active.plot.line.to.x} data-y2={active.plot.line.to.y} />
            {active.points.map(point => <g key={point.id}>
              <line class="regression-residual" {...point.residual} />
              <path class="regression-prediction" d={point.diamond} />
            </g>)}
          </g>
          {active.points.map(point => <g key={point.id}>
            {point.id === selected.id && <circle key="selection" class="regression-selected" aria-hidden="true" cx={point.cx} cy={point.cy} r={point.selectedRadius} />}
            <circle key="observation" class="regression-observation" aria-hidden="true" cx={point.cx} cy={point.cy} r={point.markRadius} />
            <text key="label" class="regression-sample-label" aria-hidden="true" x={point.label.x} y={point.label.y} font-size={active.plot.fontSize}>{point.label.text}</text>
            <circle key="handle" class="regression-handle" data-sample-id={point.id} data-x={point.x} data-y={point.y}
              cx={point.cx} cy={point.cy} r={point.hitRadius} tabindex={0} role="button" aria-label={point.name}
              aria-pressed={point.id === selected.id} aria-describedby={helpId}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(point.id); }
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
                  event.preventDefault(); select(point.id);
                  attempt(() => accept(moveRegressionSample(active.state, point.id, event.key, event.shiftKey), false, true, point.id));
                }
              }}
              onPointerDown={event => {
                event.preventDefault(); select(point.id); event.currentTarget.focus();
                dragResult.current = null;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={event => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                const bounds = svg.current!.getBoundingClientRect();
                attempt(() => { dragResult.current = { sampleId: point.id,
                  value: accept(editRegressionSample(active.state, point.id, regressionPointer(event.clientX, event.clientY, bounds)), false, false, point.id) }; });
              }}
              onPointerUp={event => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                if (dragResult.current) announceResult(dragResult.current.value, dragResult.current.sampleId, 'Drag finished. ');
                dragResult.current = null;
              }}
              onPointerCancel={event => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                if (dragResult.current) announceResult(dragResult.current.value, dragResult.current.sampleId, 'Drag ended. ');
                dragResult.current = null;
              }} />
          </g>)}
        </svg>
        <p class="regression-legend"><span>● Observation</span><span>◇ Prediction</span><span>┆ Vertical residual</span></p>
        <p class="regression-help" id={helpId}>Select any sample. Drag or use arrow keys in steps of 0.1; Shift + arrow moves 0.5. Dragging stops at ±5. Equal x/y scale; off-plane predictions are clipped and remain in the table.</p>
      </div>
    <dl class="regression-scalars">{active.scalars.map(value => <div key={value.key}><dt>{value.label}</dt>
      <dd data-value={value.key} data-number={value.number}>{value.text}</dd></div>)}</dl>
      <div class="regression-controls">
        <fieldset><legend>Predictor parameters</legend><div class="regression-fields">
          <NumberField key={`${controlRevision}:weight`} label="Weight w" value={active.state.weight} {...REGRESSION_UI.weight}
            onCommit={weight => accept({ ...active.state, weight })} />
          <NumberField key={`${controlRevision}:bias`} label="Bias b" value={active.state.bias} {...REGRESSION_UI.bias}
            onCommit={bias => accept({ ...active.state, bias })} />
          <NumberField key={`${controlRevision}:rate`} label="Learning rate η" value={active.state.learningRate} {...REGRESSION_UI.learningRate} step={0.01}
            onCommit={learningRate => accept({ ...active.state, learningRate })} />
        </div></fieldset>
        <fieldset><legend>Observation editor</legend><label class="regression-sample-picker">Selected sample
          <select value={selected.id} onChange={event => select(event.currentTarget.value)}>
            {active.rows.map(row => <option value={row.id}>{row.id}</option>)}
          </select></label><div class="regression-fields">
          <NumberField key={`${controlRevision}:${selected.id}:x`} label="Sample x" value={selected.x} {...REGRESSION_UI.sample}
            onCommit={x => accept(editRegressionSample(active.state, selected.id, { x }))} />
          <NumberField key={`${controlRevision}:${selected.id}:y`} label="Sample y" value={selected.y} {...REGRESSION_UI.sample}
            onCommit={y => accept(editRegressionSample(active.state, selected.id, { y }))} />
        </div></fieldset>
        <div class="regression-actions"><button type="button" onClick={() => attempt(() => {
          accept(regressionStep(active.state), true); reviseControls(controlRevision + 1);
        })}>Apply one update</button><button type="button" onClick={replay}>Replay 3 updates</button></div>
        <p class="regression-help">An update can increase loss. Values outside the shown ranges are rejected, with the previous valid state preserved.</p>
        {reason && <p class="regression-rejection" data-rejection role="alert">{reason}</p>}
        <p class="regression-frame" data-current-frame>Frame {frames ? index + 1 : 1} / {frames?.length ?? 1} · {updates} applied updates since edit or reset.</p>
        {frames && <TraceStepper frames={frames} index={index} onSeek={seek} />}
        <Inspector rows={active.inspector} />
      </div>
    </div>
    <div class="regression-equations">{active.formulas.map(formula => <Formula key={formula.label} {...formula} />)}</div>
    <div class="table-scroll" tabindex={0} role="region" aria-label="Predictions and signed residuals, scrollable">
      <table><caption>Active state · residual = prediction − target; squared error = residual²</caption>
        <thead><tr><th scope="col">Sample</th><th scope="col">x</th><th scope="col">Target y</th><th scope="col">Prediction</th><th scope="col">Residual</th><th scope="col">Squared error</th></tr></thead>
        <tbody>{active.rows.map(row => <tr key={row.id} data-row-id={row.id} data-x={row.x} data-y={row.y}
          data-prediction={row.prediction} data-residual={row.residual} data-squared-error={row.squaredError}>
          <th scope="row">{row.id}</th><td>{row.text.x}</td><td>{row.text.y}</td><td>{row.text.prediction}</td><td>{row.text.residual}</td><td>{row.text.squaredError}</td>
        </tr>)}</tbody></table>
    </div>
    <p class="sr-only" data-announcement role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </div>;
}

export default function RegressionStage({ scope }: { scope: string }) {
  return <IdScope name={scope}><RegressionExperiment /></IdScope>;
}
