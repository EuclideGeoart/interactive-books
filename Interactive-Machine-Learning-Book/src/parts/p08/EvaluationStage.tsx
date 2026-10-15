import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import NumberField from '../../ui/NumberField';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import TraceStepper from '../../ui/TraceStepper';
import type { TraceFrame } from '../../platform/trace';
import { initial, workflowTrace, type State } from './model/evaluation';
import { derive, headings, preset, shown, type Mode } from './lesson';
import './stage.css';
function Table({ name, children }: { name: string; children: ComponentChildren }) {
  return <div class="table-scroll" data-scrollable={`${name}, scrollable`} tabindex={0} role="region" aria-label={`${name}, scrollable`}>{children}</div>;
}
function Experiment({ mode }: { mode: Mode }) {
  const uid = useScopedId(), plot = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(320), [canonical] = useState(initial);
  const lesson = useLesson(canonical, s => derive(s, width)), active = lesson.derived, n = active.numerical, s = active.state;
  const latest = useRef(active); latest.current = active;
  const [frames, setFrames] = useState<readonly TraceFrame<State>[] | null>(null), [index, setIndex] = useState(0);
  const [revision, revise] = useState(0), [reason, reject] = useState(''), [announcement, announce] = useState('');
  const [foldIndex, setFoldIndex] = useState(0), [selectedId, selectId] = useState('a1'), [probId, selectProb] = useState('m7');
  const selected = s.rows.find(r => r.id === selectedId) ?? s.rows[0]!, probability = s.probabilities.find(r => r.id === probId) ?? s.probabilities[0]!;
  const chosen = n.candidates.find(c => c.power === n.selected.power && c.penalty === n.selected.penalty)!;
  const foldScore = chosen.folds[Math.min(foldIndex, chosen.folds.length - 1)]!;
  useEffect(() => {
    const node = plot.current; if (!node) return;
    const measure = () => { const v = node.getBoundingClientRect().width; if (v > 0) setWidth(v); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  function speak(message: string) { announce(previous => message + (previous.endsWith('\u200b') ? '' : '\u200b')); }
  function accept(next: State) {
    const value = derive(next, width); latest.current = value; lesson.set(next); setFrames(null); setIndex(0); reject(''); speak(value.speech);
  }
  function attempt(action: () => void) { try { action(); } catch (error) { reject(error instanceof Error ? error.message : 'Change rejected; previous state preserved.'); } }
  function reset() { accept(canonical); selectId('a1'); selectProb('m7'); setFoldIndex(0); revise(v => v + 1); }
  function replay() {
    attempt(() => {
      const trace = workflowTrace(latest.current.state);
      trace.forEach(f => derive(f.state, width)); latest.current = derive(trace[0]!.state, width); lesson.set(trace[0]!.state); setFrames(trace); setIndex(0); revise(v => v + 1); reject(''); speak(trace[0]!.explanation!);
    });
  }
  function seek(i: number) {
    const frame = frames?.[i]; if (!frame) return;
    const value = derive(frame.state, width); latest.current = value; lesson.set(frame.state); setIndex(i); revise(v => v + 1); reject(''); speak(frame.explanation! + ' ' + value.speech);
  }
  function editRow(change: Partial<{ x: [number | null]; y: number }>) { accept({ ...latest.current.state, rows: latest.current.state.rows.map(r => r.id === selected.id ? { ...r, ...change } : r) }); }
  function editProbability(change: Partial<{ y: number; p: number }>) { accept({ ...latest.current.state, probabilities: latest.current.state.probabilities.map(r => r.id === probability.id ? { ...r, ...change } : r) }); }
  const scalar = (name: string, label: string, v: number | null, detail?: string) => <div><dt>{label}</dt><dd data-scalar={name} data-number={v === null ? undefined : v}>{v === null ? detail ?? 'Undefined: zero denominator' : shown(v)}</dd></div>;
  const modelRows = (model: typeof n.final) => [
    { label: 'Transform fit IDs', value: model.preprocessing.fitIds.join(', ') },
    { label: 'Impute / center / scale', value: [model.preprocessing.impute, model.preprocessing.center, model.preprocessing.scale].map(shown).join(' / ') },
    { label: 'Model fit IDs', value: model.trainIds.join(', ') },
    { label: 'Intercept / slope', value: `${shown(model.intercept)} / ${shown(model.slope)}` },
    { label: 'Training MSE / objective', value: `${shown(model.trainingMse)} / ${shown(model.objective)}`, detail: 'Objective adds λw²; validation uses MSE alone.' },
  ];
  return <div class="p08-lab" data-evaluation-lab={mode} data-state={JSON.stringify(s)} data-numerical={JSON.stringify(n)} data-phase={s.phase}>
    <header class="p08-heading"><div><p>Part VIII · experimental workflow sheet</p><h2>{headings[mode]}</h2></div><button type="button" onClick={reset}>Reset experiment</button></header>
    <p data-provenance>{n.provenance.data} Data version {n.provenance.dataVersion}. Edits are recorded in the displayed state. Probability rows are a separate hand-authored forecast example.</p>
    <div class="p08-controls">
      <fieldset><legend>Split and workflow</legend>
        <NumberField key={`${revision}:seed`} label="Split seed" value={s.seed} min={0} max={4294967295} step={1} onCommit={seed => accept({ ...latest.current.state, seed })} />
        <label>Development folds<select value={s.folds} onChange={event => attempt(() => { accept({ ...latest.current.state, folds: Number(event.currentTarget.value) }); setFoldIndex(0); })}>{[2, 3, 4].map(k => <option value={k}>{k} group-disjoint folds</option>)}</select></label>
        <label>Inspect fold<select value={Math.min(foldIndex, s.folds - 1)} onChange={event => setFoldIndex(Number(event.currentTarget.value))}>{n.board.folds.map((_, i) => <option value={i}>Fold {i + 1}</option>)}</select></label>
        <button type="button" onClick={replay}>Replay split to final test</button>
        <button type="button" onClick={() => attempt(() => accept({ ...latest.current.state, phase: 4 }))}>Reveal final test</button>
      </fieldset>
      {mode === 'metrics' ? <fieldset><legend>Forecast and decision editor</legend>
        <NumberField key={`${revision}:threshold`} label="Decision threshold" value={s.threshold} min={0} max={1} step={.05} onCommit={threshold => accept({ ...latest.current.state, threshold })} />
        <label>Probability row<select value={probability.id} onChange={event => selectProb(event.currentTarget.value)}>{s.probabilities.map(r => <option value={r.id}>{r.id}</option>)}</select></label>
        <NumberField key={`${revision}:${probability.id}`} label="Probability p" value={probability.p} min={0} max={1} step={.05} onCommit={p => editProbability({ p })} />
        <label>Observed label<select value={probability.y} onChange={event => attempt(() => editProbability({ y: Number(event.currentTarget.value) }))}><option value="0">0 · negative</option><option value="1">1 · positive</option></select></label>
      </fieldset> : <fieldset><legend>Regression row editor</legend>
        <label>Selected row<select value={selected.id} onChange={event => selectId(event.currentTarget.value)}>{s.rows.map(r => <option value={r.id}>{r.id} · group {r.group}</option>)}</select></label>
        {selected.x[0] !== null && <NumberField key={`${revision}:${selected.id}:x`} label="Feature x" value={selected.x[0]} min={-20} max={20} step={.5} onCommit={x => editRow({ x: [x] })} />}
        <button type="button" onClick={() => attempt(() => editRow({ x: [selected.x[0] === null ? 0 : null] }))}>{selected.x[0] === null ? 'Restore observed feature' : 'Mark feature missing'}</button>
        <NumberField key={`${revision}:${selected.id}:y`} label="Target y" value={selected.y} min={-30} max={30} step={.5} onCommit={y => editRow({ y })} />
      </fieldset>}
      {mode === 'reliability' && <fieldset><legend>Binary64 counterexamples</legend>
        <NumberField key={`${revision}:t`} label="Cancellation t" value={s.t} min={1} max={1e12} step={1e7} onCommit={t => accept({ ...latest.current.state, t })} />
        <NumberField key={`${revision}:delta`} label="Input separation delta" value={s.delta} min={1e-12} max={.1} step={1e-8} onCommit={delta => accept({ ...latest.current.state, delta })} />
      </fieldset>}
    </div>
    <div class="p08-actions">{(['original', 'constant', 'shifted', 'all-negative'] as const).map(name => <button type="button" onClick={() => attempt(() => { accept(preset(name)); revise(v => v + 1); })}>Use {name} data</button>)}</div>
    {reason && <p role="alert" data-rejection>{reason}</p>}
    {frames && <TraceStepper frames={frames} index={index} onSeek={seek} />}
    <p data-current-frame>Workflow phase {s.phase + 1} / 5. Replay preserves immutable states; edits fork the displayed frame. Revealing the test is the final step: do not tune after seeing it.</p>
    <Inspector rows={active.inspector} />
    <figure class="p08-plot p08-workflow"><svg ref={plot} data-workflow-board viewBox="0 0 640 130" role="img" aria-labelledby={`${uid}-workflow-title`}><title id={`${uid}-workflow-title`}>Experimental workflow, active phase {s.phase + 1} of five</title><path class="p08-axis" d="M70 60H570" />{[0, 1, 2, 3, 4].map(phase => <g><circle class={phase === s.phase ? "p08-training-dot" : "p08-validation-dot"} data-workflow-phase={phase} data-active={phase === s.phase} cx={70 + 125 * phase} cy="60" r="24" /><text x={70 + 125 * phase} y="118" text-anchor="middle" font-size={active.fontSize}>{phase + 1}</text></g>)}</svg><figcaption>1 Split → 2 Fold fits → 3 Select → 4 Development refit → 5 Final test. Active phase {s.phase + 1}; replay exposes each step.</figcaption></figure>
    <Table name="Group allocation and exact memberships"><table><caption>Locked group split; no stratification is claimed</caption><thead><tr><th>Role</th><th>IDs</th></tr></thead><tbody>
      <tr><th>Development</th><td data-membership="development">{n.board.development.join(', ')}</td></tr><tr><th>Untouched test</th><td data-membership="test">{n.board.test.join(', ')}</td></tr>
      {n.board.folds.map((f, i) => <tr data-fold={i}><th>Fold {i + 1}</th><td>Train: {f.train.join(', ')}<br />Validation: {f.validation.join(', ')}</td></tr>)}
    </tbody></table></Table>
    {(mode === 'folds' || mode === 'curves' || mode === 'reliability') && <>
      <Formula label="Training objective and selection metric" tex={'J(w,b)=\\frac1n\\sum_i(b+w\\phi_i-y_i)^2+\\lambda w^2,\\quad \\mathrm{CV}=\\frac1K\\sum_k\\mathrm{MSE}_k'} />
      <Table name="Tuning grid and per-fold scores"><table><caption>Actual fitted candidates; exact ties retain first row; chosen p={n.selected.power}, λ={n.selected.penalty}</caption><thead><tr><th>Power / λ</th><th>Training MSE / objective per fold</th><th>Validation MSE per fold</th><th>CV mean</th></tr></thead><tbody>
        {n.candidates.map(c => <tr data-candidate={`${c.power}:${c.penalty}`} data-selected={c === chosen} data-cv={c.meanValidation}><th>{c.power} / {c.penalty}</th><td>{c.folds.map(f => `${shown(f.model.trainingMse)} / ${shown(f.model.objective)}`).join('; ')}</td><td>{c.folds.map(f => shown(f.validation.mse)).join('; ')}</td><td>{shown(c.meanValidation)}</td></tr>)}
      </tbody></table></Table>
      <h3>Selected candidate · fold {Math.min(foldIndex, s.folds - 1) + 1}</h3><Inspector rows={modelRows(foldScore.model)} />
      <Table name="Fold predictions"><table><caption>Validation rows transformed with the inspected training fit</caption><thead><tr><th>ID</th><th>Filled / z / φ</th><th>Target / prediction</th><th>Squared error</th></tr></thead><tbody>{foldScore.validation.rows.map(r => <tr data-validation-row={r.id}><th>{r.id}</th><td>{[r.filled, r.z, r.feature].map(shown).join(' / ')}</td><td>{shown(r.target)} / {shown(r.prediction)}</td><td>{shown(r.squaredError)}</td></tr>)}</tbody></table></Table>
    </>}
    {mode === 'curves' && <>
      <figure class="p08-plot"><svg ref={plot} viewBox="0 0 640 300" role="img" aria-labelledby={`${uid}-curve-title ${uid}-curve-desc`}><title id={`${uid}-curve-title`}>Real fitted learning curves</title><desc id={`${uid}-curve-desc`}>Solid training MSE and dashed validation MSE. Numeric values and exact nested memberships are in the table. X is training row count; Y is MSE.</desc>
        <path class="p08-axis" d="M90 50V245H550" /><polyline class="p08-training" points={active.curvePoints.map(c => `${c.x},${c.trainingY}`).join(' ')} /><polyline class="p08-validation" points={active.curvePoints.map(c => `${c.x},${c.validationY}`).join(' ')} />
        {active.curvePoints.map(c => <g><circle class="p08-training-dot" data-curve-training={c.n} data-mse={c.model.trainingMse} cx={c.x} cy={c.trainingY} r="6" /><rect class="p08-validation-dot" data-curve-validation={c.n} data-mse={c.validation.mse} x={c.x - 6} y={c.validationY - 6} width="12" height="12" /><text x={c.x} y="280" text-anchor="middle" font-size={active.fontSize}>{c.n}</text></g>)}
      </svg><figcaption>● Solid: training MSE · □ Dashed: validation MSE · horizontal: training row count · vertical: MSE (0 to {shown(active.max)}). Every point refits the selected p={n.selected.power}, λ={n.selected.penalty}. No test rows enter a curve.</figcaption></figure>
      <Table name="Nested training sizes"><table><caption>Fold 1 validation fixed at {n.board.folds[0]!.validation.join(', ')}. These descriptive curves reuse tuning validation; they are not an unbiased final test.</caption><thead><tr><th>n / exact training IDs</th><th>Training MSE / objective</th><th>Validation MSE</th><th>Fit impute / center / scale</th></tr></thead><tbody>{n.curves.map(c => <tr data-curve-size={c.n}><th>{c.n} / {c.ids.join(', ')}</th><td>{shown(c.model.trainingMse)} / {shown(c.model.objective)}</td><td>{shown(c.validation.mse)}</td><td>{[c.model.preprocessing.impute, c.model.preprocessing.center, c.model.preprocessing.scale].map(shown).join(' / ')}</td></tr>)}</tbody></table></Table>
    </>}
    {mode === 'metrics' && <>
      <Formula label="Threshold and Brier definitions" tex={'\\hat y_i=\\mathbf1[p_i\\ge\\tau],\\quad \\mathrm{Brier}=\\frac1n\\sum_i(p_i-y_i)^2'} />
      <dl class="p08-scalars">{scalar('tp', 'TP', n.metrics.tp)}{scalar('fp', 'FP', n.metrics.fp)}{scalar('tn', 'TN', n.metrics.tn)}{scalar('fn', 'FN', n.metrics.fn)}
        {scalar('accuracy', 'Accuracy', n.metrics.accuracy)}{scalar('balanced', 'Balanced accuracy', n.metrics.balancedAccuracy)}{scalar('precision', 'Precision', n.metrics.precision)}{scalar('recall', 'Recall', n.metrics.recall)}{scalar('f1', 'F1', n.metrics.f1)}{scalar('brier', 'Brier probability MSE', n.metrics.brier)}{scalar('log-loss', 'Mean natural-log loss', n.metrics.logLoss, n.metrics.logReason ?? undefined)}</dl>
      <Table name="Forecast decisions"><table><caption>Hand-authored forecasts; equality is positive</caption><thead><tr><th>ID</th><th>y</th><th>p</th><th>p ≥ threshold</th><th>(p−y)²</th></tr></thead><tbody>{n.metrics.rows.map(r => <tr><th>{r.id}</th><td>{r.y}</td><td>{shown(r.p)}</td><td>{r.positive ? 'positive' : 'negative'}</td><td>{shown(r.squaredError)}</td></tr>)}</tbody></table></Table>
      <Table name="Precision recall tradeoff"><table><caption>Every observed probability cutoff, plus 0 and 1. Undefined precision is not plotted as zero.</caption><thead><tr><th>Threshold</th><th>TP / FP / TN / FN</th><th>Precision</th><th>Recall</th></tr></thead><tbody>{n.tradeoff.map(r => <tr data-pr-threshold={r.threshold}><th>{shown(r.threshold)}</th><td>{[r.tp, r.fp, r.tn, r.fn].join(' / ')}</td><td>{shown(r.precision)}</td><td>{shown(r.recall)}</td></tr>)}</tbody></table></Table>
      <figure class="p08-plot"><svg ref={plot} viewBox="0 0 640 300" role="img" aria-labelledby={`${uid}-bins-title`}><title id={`${uid}-bins-title`}>Reliability bins: mean forecast versus observed positive fraction</title><path class="p08-axis" d="M90 50V245H550" /><path class="p08-validation" d="M90 245L550 65" />{active.reliabilityPoints.map(b => <circle class="p08-training-dot" data-reliability-bin={b.low} data-mean={b.meanProbability} data-frequency={b.frequency} cx={b.x} cy={b.y} r="7" />)}<text x="90" y="280" font-size={active.fontSize}>0</text><text x="550" y="280" text-anchor="end" font-size={active.fontSize}>1</text></svg><figcaption>Horizontal: mean probability; vertical: positive fraction. The dashed diagonal indicates empirical agreement, with little evidence in tiny bins.</figcaption></figure>
      <Table name="Fixed reliability bins"><table><caption>Five fixed bins [0,.2), [.2,.4), [.4,.6), [.6,.8), [.8,1]. Empty bins undefined.</caption><thead><tr><th>Bin</th><th>IDs / count</th><th>Mean p</th><th>Positive fraction</th></tr></thead><tbody>{n.metrics.bins.map(b => <tr data-bin={b.low}><th>[{b.low},{b.high}{b.high === 1 ? ']' : ')'}</th><td>{b.ids.join(', ')} / {b.count}</td><td>{shown(b.meanProbability)}</td><td>{shown(b.frequency)}</td></tr>)}</tbody></table></Table>
    </>}
    {mode === 'pipeline' && <>
      <Formula label="Fitted preprocessing order" tex={'x\\to\\mathrm{impute}_{T}(x)\\to z=\\frac{x-\\mu_T}{s_T}\\to\\phi=z^p\\to b+w\\phi'} />
      <p>Comparison fixes power 1 and λ=1, training IDs {n.board.folds[0]!.train.join(', ')}, held-out validation IDs {n.board.folds[0]!.validation.join(', ')}. Only the transform fit membership changes. Leaked fitting reads held-out features, never held-out labels; even this is contamination. The difference may be positive or negative.</p>
      <div class="p08-pair"><section><h3>Proper: fit on training</h3><Inspector rows={modelRows(n.leakage.proper)} /></section><section><h3>Leaked: fit before splitting</h3><Inspector rows={modelRows(n.leakage.leaked)} /></section></div>
      <dl class="p08-scalars">{scalar('proper-mse', 'Proper held-out MSE', n.leakage.properScore.mse)}{scalar('leaked-mse', 'Leaked held-out MSE', n.leakage.leakedScore.mse)}{scalar('leakage-difference', 'Leaked − proper MSE', n.leakage.difference)}</dl>
      <Table name="Paired held-out transformations"><table><caption>Fold 1 only: same rows, seed and model convention; transform fit differs</caption><thead><tr><th>ID / target</th><th>Proper filled / z / prediction / error²</th><th>Leaked filled / z / prediction / error²</th></tr></thead><tbody>{n.leakage.properScore.rows.map((r, i) => { const l = n.leakage.leakedScore.rows[i]!; return <tr data-leakage-row={r.id}><th>{r.id} / {shown(r.target)}</th><td>{[r.filled, r.z, r.prediction, r.squaredError].map(shown).join(' / ')}</td><td>{[l.filled, l.z, l.prediction, l.squaredError].map(shown).join(' / ')}</td></tr>; })}</tbody></table></Table>
    </>}
    {mode === 'reliability' && <>
      <Formula label="Stable rationalization of the cancellation example" tex={'\\sqrt{t^2+1}-t=\\frac1{\\sqrt{t^2+1}+t}'} />
      <dl class="p08-scalars">{scalar('left', '(10¹⁶−10¹⁶)+1', n.numerics.left)}{scalar('right', '10¹⁶+(−10¹⁶+1)', n.numerics.right)}{scalar('fragile', 'Fragile root subtraction', n.numerics.fragile)}{scalar('stable', 'Stable rationalized expression', n.numerics.stable)}{scalar('difference', 'Represented (1+δ)−1', n.numerics.difference)}{scalar('reciprocal', '1 / represented difference', n.numerics.reciprocal)}{scalar('nominal', '1 / nominal δ', n.numerics.nominalReciprocal)}{scalar('condition', 'Subtraction condition estimate', n.numerics.condition)}</dl>
      <p>Stable rearrangement fixes cancellation in the first problem. It cannot remove sensitivity of 1/(a−b) when a and b nearly agree: relative input errors can be amplified by (|a|+|b|)/|a−b|. Nominal δ and represented spacing differ. A seed does not fix arithmetic order or missing environment provenance.</p>
      <details><summary>Complete experiment provenance and parameters</summary><div data-experiment-record tabindex={0} role="region" aria-label="Complete experiment provenance JSON, scrollable"><pre>{JSON.stringify({ state: s, provenance: n.provenance, board: n.board, selected: n.selected, developmentFit: n.final }, null, 2)}</pre></div></details>
    </>}
    {s.phase === 4 && <section data-final-test><h3>Final development refit and untouched test evaluation</h3><Inspector rows={modelRows(n.final)} /><p data-final-mse data-number={n.test.mse}>Test MSE: {shown(n.test.mse)}. Exact test IDs: {n.test.ids.join(', ')}.</p>
      <Table name="Final test predictions"><table><caption>One final evaluation; all transform state comes from development rows</caption><thead><tr><th>ID</th><th>Target</th><th>Prediction</th><th>Error²</th></tr></thead><tbody>{n.test.rows.map(r => <tr data-test-row={r.id}><th>{r.id}</th><td>{shown(r.target)}</td><td>{shown(r.prediction)}</td><td>{shown(r.squaredError)}</td></tr>)}</tbody></table></Table></section>}
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
  </div>;
}
export default function EvaluationStage({ scope, mode }: { scope: string; mode: Mode }) { return <IdScope name={scope}><Experiment mode={mode} /></IdScope>; }
