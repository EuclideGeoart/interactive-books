import { useEffect, useRef, useState } from 'preact/hooks';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import NumberField from '../../ui/NumberField';
import TraceStepper from '../../ui/TraceStepper';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { fitStep, initialFit, type FitMode, type FitState } from './model/fit';
import { deriveFitLesson, approx } from './fit-lesson';
import './remainder.css';

function FitExperiment({ mode }: { mode: FitMode }) {
  const uid = useScopedId();
  const canonical = useRef(initialFit(mode)).current;
  const diagram = useRef<HTMLDivElement>(null), [width, setWidth] = useState(320);
  useEffect(() => { const node = diagram.current!; const measure = () => { const w = node.getBoundingClientRect().width; if (w > 0) setWidth(Math.min(560, w)); }; measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect(); }, []);
  const lesson = useLesson(canonical, state => deriveFitLesson(state, mode, width));
  const a = lesson.derived, s = lesson.state;
  const [selected, select] = useState(0), [revision, revise] = useState(0), [reason, reject] = useState(''), [announcement, announce] = useState('');
  const [frames, setFrames] = useState<readonly TraceFrame<FitState>[] | null>(null), [index, setIndex] = useState(0);
  function say(summary: string) { announce(old => summary + (old.endsWith('\u200b') ? '' : '\u200b')); }
  function accept(next: FitState) { const derived = deriveFitLesson(next, mode); lesson.set(next); setFrames(null); setIndex(0); reject(''); say(derived.summary); }
  function attempt(action: () => void) { try { action(); } catch (e) { reject(e instanceof Error ? e.message : 'Change rejected. State preserved.'); } }
  function reset() { lesson.reset(); setFrames(null); setIndex(0); revise(revision + 1); select(0); reject(''); say(`Reset. ${deriveFitLesson(canonical, mode).summary}`); }
  function replay() {
    attempt(() => {
      let next = s; const states = [{ state: next, explanation: 'Initial displayed state.' }];
      for (let i = 1; i <= 4; i++) { next = fitStep(next, mode); deriveFitLesson(next, mode); states.push({ state: next, explanation: `After ${i} simultaneous gradient updates.` }); }
      const trace = traceFrom(states); setFrames(trace); setIndex(0); revise(revision + 1); reject(''); say(`Replay frame 1 of 5. ${a.summary}`);
    });
  }
  function seek(i: number) { const frame = frames?.[i]; if (!frame) return; lesson.set(frame.state); setIndex(i); revise(revision + 1); reject(''); say(`Replay frame ${i + 1} of ${frames!.length}. ${deriveFitLesson(frame.state, mode).summary}`); }
  function sample(key: 'x' | 'y', value: number) { accept({ ...s, samples: s.samples.map((r, i) => i === selected ? { ...r, [key]: value } : r) }); }
  const field = (label: string, value: number, update: (v: number) => void, min = -1e6, max = 1e6, step = .1) => <NumberField key={`${revision}-${label}`} label={label} value={value} min={min} max={max} step={step} onCommit={update} />;
  const plot = a.plot;
  return <section class="p02-lab" data-fit-lab={mode} data-mse={a.mse} data-coefficients={JSON.stringify(a.coefficients)} data-frame-index={frames ? index : 0}>
    <header class="p02-heading"><div><p class="p02-kicker">Fit and optimization laboratory</p><h2>{a.title}</h2></div><button onClick={reset}>Reset experiment</button></header>
    <p data-provenance class="p02-help">{a.provenance}</p>
    <div class="p02-layout"><div ref={diagram}>
      <svg class="p02-plot" style={{ '--p02-plot-font': `${a.fontSize}px` }} viewBox="0 0 560 560" role="img" aria-labelledby={`${uid}-plot-title ${uid}-plot-desc`} data-fit-plot data-scale={plot.scale} data-origin={plot.origin}>
        <title id={`${uid}-plot-title`}>{mode === 'multiple' ? 'Observed and predicted target by sample index' : 'Observed and predicted targets on equal coordinate scales'}</title>
        <desc id={`${uid}-plot-desc`}>Circles are training observations; squares are held-out observations; diamonds are predictions. Dashed vertical residuals join each observation to its prediction. Numeric values are in the following table.</desc>
        <g class="p02-axes"><line x1="60" x2="500" y1="280" y2="280" /><line x1="280" x2="280" y1="60" y2="500" />
          {plot.ticks.map(t => <g><text x={t.x} y="310" text-anchor="middle">{t.text}</text><text x="265" y={t.y - 8} text-anchor="end">{t.text}</text></g>)}
          <text x="510" y="270" text-anchor="end">{mode === 'multiple' ? 'index' : 'x'}</text><text x="290" y="45">y</text></g>
        {plot.path && <path class="p02-predictor" data-fit-curve d={plot.path} />}
        {plot.points.map(p => <g data-fit-point={p.id} data-x={p.x} data-y={p.y} data-prediction={p.prediction} data-cx={p.cx} data-cy={p.cy} data-py={p.py}>
          <line class="p02-residual" x1={p.cx} x2={p.cx} y1={p.cy} y2={p.py} />
          {p.held ? <rect class="p02-held" x={p.cx - 6} y={p.cy - 6} width="12" height="12" /> : <circle class="p02-observation" cx={p.cx} cy={p.cy} r="6" />}
          <path class="p02-prediction" d={`M${p.cx},${p.py - 7}l7,7l-7,7l-7,-7Z`} />
        </g>)}
      </svg>
      <p class="p02-help">● Training observation · ◇ Prediction · dashed residual{a.poly ? ' · □ Held-out observation' : ''}. Axis domain adjusts to the data; x/y units share one scale.</p>
      {a.surface && <><h3>Active loss surface in parameter space</h3><svg class="p02-plot" style={{ '--p02-plot-font': `${a.fontSize}px` }} viewBox="0 0 560 560" role="img" aria-labelledby={`${uid}-surface-title`} aria-describedby={`${uid}-surface-desc`} data-loss-surface data-scale={a.surface.scale}>
        <title id={`${uid}-surface-title`}>MSE contours at optimum plus 0.2, 1 and 4; current and next weight and bias.</title>
        <desc id={`${uid}-surface-desc`}>A filled blue circle marks current parameters, a filled green square marks the prospective next parameters, and a hollow rust circle marks the optimum. The update segment joins current to next. Names and weight/bias coordinates are listed below the plot; points at identical coordinates overlap.</desc>
        <g class="p02-axes"><line x1="60" x2="500" y1="280" y2="280" /><line x1="280" x2="280" y1="60" y2="500" /><text x="490" y="270">w</text><text x="290" y="45">b</text>
          {a.surface.ticks.map(t => <text x={t.x} y="310" text-anchor="middle">{t.text}</text>)}</g>
        {a.surface.contours.map(d => <path class="p02-contour" d={d} />)}
        <line class="p02-update" x1={a.surface.points[0]!.cx} y1={a.surface.points[0]!.cy} x2={a.surface.points[1]!.cx} y2={a.surface.points[1]!.cy} />
        {a.surface.points.map(p => <g data-parameter-point={p.id} data-weight={p.x} data-bias={p.y}><title>{p.id}: weight {approx(p.x)}, bias {approx(p.y)}</title>{p.id === 'next' ? <rect class="p02-next" x={p.cx - 7} y={p.cy - 7} width="14" height="14" /> : <circle class={p.id === 'optimum' ? 'p02-prediction' : 'p02-observation'} cx={p.cx} cy={p.cy} r="7" />}</g>)}
      </svg><ul class="p02-parameter-legend" aria-label="Loss-surface parameter coordinates">{a.surface.points.map(p => <li data-parameter-legend={p.id} data-weight={p.x} data-bias={p.y}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">{p.id === 'next' ? <rect class="p02-next" x="3" y="3" width="14" height="14" /> : <circle class={p.id === 'optimum' ? 'p02-prediction' : 'p02-observation'} cx="10" cy="10" r="7" />}</svg>
        <span><strong>{p.id === 'current' ? 'Current' : p.id === 'next' ? 'Next' : 'Optimum'}</strong> · w {approx(p.x)}, b {approx(p.y)}</span>
      </li>)}</ul><p class="p02-help">Points at identical coordinates overlap.</p></>}
      {a.gd && <p data-behavior>{a.gd.behavior}; λmax {approx(a.gd.lambdaMax)}, stable rate strictly below {approx(a.gd.criticalRate)}. This describes excited curvature modes; an exact optimum stays fixed.</p>}
    </div><div class="p02-controls">
      <fieldset><legend>Change the active {mode === 'multiple' ? 'design and coefficient column' : 'experiment'}</legend>
        {mode === 'multiple' ? <>
          <p class="p02-help">The intercept column is fixed at 1. All other design cells, targets and coefficients are editable.</p>
          <div class="table-scroll" data-scrollable="Editable design matrix, scrollable"><table><caption>Four sample rows of X and target column y</caption><thead><tr><th scope="col">ID / bias</th><th scope="col">x₁</th><th scope="col">x₂</th><th scope="col">y</th></tr></thead><tbody>{s.X.map((r, i) => <tr><th scope="row">s{i + 1} / 1</th>{r.slice(1).map((v, j) => <td>{field(`X row ${i + 1} feature ${j + 1}`, v, value => accept({ ...s, X: s.X.map((row, k) => k === i ? row.map((x, c) => c === j + 1 ? value : x) : row) }))}</td>)}<td>{field(`Target row ${i + 1}`, s.targets[i]!, value => accept({ ...s, targets: s.targets.map((x, k) => k === i ? value : x) }))}</td></tr>)}</tbody></table></div>
          <div class="p02-fields">{s.weights.map((v, j) => field(j === 0 ? 'Intercept w0' : `Coefficient w${j}`, v, value => accept({ ...s, weights: s.weights.map((x, k) => k === j ? value : x) })))}</div>
          <button onClick={() => attempt(() => accept(fitStep(s, mode)))}>Solve minimum norm</button>
          <button onClick={() => accept({ ...s, X: s.X.map(r => [1, r[1]!, r[1]!]) })}>Duplicate feature column</button>
          <p data-rank>Rank {a.multi!.rank} / {s.weights.length}. {a.multi!.rank < s.weights.length ? 'Coefficients are not unique; the solve returns the minimum norm column.' : 'All coefficient directions are identified.'}</p>
          <p>Singular values: {a.multi!.singularValues.map(approx).join(', ')}. Cutoff: {approx(a.multi!.cutoff)}.</p>
        </> : <>
          {(mode === 'least-squares' || mode === 'descent') && <div class="p02-fields">{field('Weight w', s.weight, v => accept({ ...s, weight: v }))}{field('Bias b', s.bias, v => accept({ ...s, bias: v }))}</div>}
          {mode === 'descent' && <>
            {field('Learning rate η', s.learningRate, v => accept({ ...s, learningRate: v }), .001, 1, .01)}
            <label class="p02-range">Learning rate slider<input type="range" min="0.001" max="1" step="0.001" value={s.learningRate} onInput={e => attempt(() => accept({ ...s, learningRate: Number(e.currentTarget.value) }))} /></label>
            <div class="p02-actions"><button onClick={() => attempt(() => accept(fitStep(s, mode)))}>Apply one update</button><button onClick={replay}>Replay 4 updates</button>
              {[.1, .4, .75].map(rate => <button onClick={() => { accept({ ...canonical, learningRate: rate }); select(0); revise(revision + 1); }}>Rate {rate}</button>)}</div><p class="p02-help">Rate presets restore the original observations and coefficients for a common starting point.</p>
          </>}
          {mode === 'least-squares' && <><button onClick={() => attempt(() => accept(fitStep(s, mode)))}>Apply closed-form fit</button><button onClick={() => accept({ ...s, samples: s.samples.map(r => ({ ...r, x: 2 })) })}>Set constant x</button><p data-optimum>{a.optimum!.reason} Best w {approx(a.optimum!.weight)}, b {approx(a.optimum!.bias)}. Sxx {approx(a.optimum!.sxx)}, Sxy {approx(a.optimum!.sxy)}.</p></>}
          {mode === 'polynomial' && <>{field('Polynomial degree', s.degree, v => accept({ ...s, degree: v }), 1, 5, 1)}<label class="p02-range">Degree slider<input type="range" min="1" max="5" step="1" value={s.degree} onInput={e => accept({ ...s, degree: Number(e.currentTarget.value) })} /></label><p class="p02-help">The fit recomputes from training rows only. Held-out targets remain fixed.</p></>}
          {mode === 'regularization' && <>
            <label class="p02-picker">Penalty<select value={s.penalty} onChange={e => accept({ ...s, penalty: e.currentTarget.value as 'l1' | 'l2' })}><option value="l2">L2 / Ridge</option><option value="l1">L1 / Lasso</option></select></label>
            {field('Penalty strength λ', s.lambda, v => accept({ ...s, lambda: v }), 0, 10, .1)}
            <label class="p02-check"><input type="checkbox" checked={s.penalizeIntercept} onChange={e => accept({ ...s, penalizeIntercept: e.currentTarget.checked })} />Penalize the intercept</label>
            <p data-convergence>{a.reg!.converged ? 'Fit satisfies the KKT tolerance ≤ 1e−8.' : 'Iteration limit reached; approximate fit, KKT tolerance not met.'}</p>
          </>}
          <label class="p02-picker">Selected observation<select value={selected} onChange={e => select(Number(e.currentTarget.value))}>{s.samples.map((r, i) => <option value={i}>{r.id}</option>)}</select></label>
          <div class="p02-fields">{field('Observation x', s.samples[selected]!.x, v => sample('x', v), mode === 'polynomial' ? -1 : -5, mode === 'polynomial' ? 1 : 5)}{field('Observation target', s.samples[selected]!.y, v => sample('y', v), -5, 5)}</div>
        </>}
      </fieldset>
      <Inspector rows={a.inspector} />
      <p data-coefficient-column>W = [{a.coefficients.map(approx).join(', ')}]ᵀ</p>
      {frames && <TraceStepper frames={frames} index={index} onSeek={seek} />}
      <p data-current-frame>{frames ? `Frame ${index + 1} / ${frames.length}` : 'Live state'}</p>
      {reason && <p role="alert" data-rejection>{reason}</p>}
      <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
    </div></div>
    <dl class="p02-scalars">{a.scalars.map(r => <div><dt>{r.label}</dt><dd data-value={r.key} data-number={r.value}>{approx(r.value)}</dd></div>)}</dl>
    {a.formulas.map(f => <Formula {...f} />)}
    <div class="table-scroll" data-scrollable="Active fit rows, scrollable"><table><caption>Exact inputs; approximate computed results from the active state</caption><thead><tr><th scope="col">ID</th><th scope="col">{mode === 'multiple' ? 'Index' : 'x'}</th><th scope="col">Design row</th><th scope="col">Target</th><th scope="col">Prediction</th><th scope="col">Residual</th></tr></thead><tbody>{a.rows.map(r => <tr data-fit-row={r.id} data-x={r.x} data-y={r.y} data-prediction={r.prediction} data-residual={r.residual}><th scope="row">{r.id}</th><td>{String(r.x)}</td><td>[{r.features.map(String).join(', ')}]</td><td>{String(r.y)}</td><td>{approx(r.prediction)}</td><td>{approx(r.residual)}</td></tr>)}</tbody></table></div>
    {a.poly && <div class="table-scroll" data-scrollable="Held-out evaluation, scrollable"><table><caption>Held-out targets and predictions; excluded from coefficient fitting</caption><thead><tr><th scope="col">ID</th><th scope="col">x</th><th scope="col">Target</th><th scope="col">Prediction</th></tr></thead><tbody>{plot.points.filter(p => p.held).map(p => <tr data-held-row={p.id} data-prediction={p.prediction}><th scope="row">{p.id}</th><td>{String(p.x)}</td><td>{String(p.y)}</td><td>{approx(p.prediction)}</td></tr>)}</tbody></table></div>}
    {a.reg && <div class="table-scroll" data-scrollable="Penalty comparison, scrollable"><table><caption>Same observations, lambda and intercept policy for both penalties</caption><thead><tr><th scope="col">Penalty</th><th scope="col">b</th><th scope="col">w</th><th scope="col">Data MSE</th><th scope="col">Penalty</th><th scope="col">Objective</th></tr></thead><tbody>{a.comparisons.map(r => <tr><th scope="row">{r.kind.toUpperCase()}</th><td>{approx(r.weights[0]!)}</td><td>{approx(r.weights[1]!)}</td><td>{approx(r.mse)}</td><td>{approx(r.penalty)}</td><td>{approx(r.objective)}</td></tr>)}</tbody></table></div>}
  </section>;
}
export default function FitStage({ scope, mode }: { scope: string; mode: FitMode }) { return <IdScope name={scope}><FitExperiment mode={mode} /></IdScope>; }
