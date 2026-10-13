import { useEffect, useRef, useState } from 'preact/hooks';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import NumberField from '../../ui/NumberField';
import TraceStepper from '../../ui/TraceStepper';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { traceFrom, type TraceFrame } from '../../platform/trace';
import { classificationStep, initialClassification, type ClassificationMode, type ClassificationState, type Metric } from './model/classification';
import { deriveClassificationLesson, metricText } from './classification-lesson';
import { approx } from './fit-lesson';
import './remainder.css';

function ClassificationExperiment({ mode }: { mode: ClassificationMode }) {
  const uid = useScopedId(), canonical = useRef(initialClassification()).current;
  const diagram = useRef<HTMLDivElement>(null), [width, setWidth] = useState(320);
  useEffect(() => { const node = diagram.current!; const measure = () => { const w = node.getBoundingClientRect().width; if (w > 0) setWidth(Math.min(560, w)); }; measure(); const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect(); }, []);
  const lesson = useLesson(canonical, s => deriveClassificationLesson(s, mode, width)), a = lesson.derived, s = lesson.state;
  const metrics: { name: string; metric: Metric }[] = a.counts && a.sweep ? [{ name: 'precision', metric: a.counts.precision }, { name: 'recall', metric: a.counts.recall }, { name: 'f1', metric: a.counts.f1 }, { name: 'auc', metric: a.sweep.auc }] : [];
  const [selected, select] = useState(0), [revision, revise] = useState(0), [reason, reject] = useState(''), [announcement, announce] = useState('');
  const [frames, setFrames] = useState<readonly TraceFrame<ClassificationState>[] | null>(null), [index, setIndex] = useState(0);
  function say(summary: string) { announce(old => summary + (old.endsWith('\u200b') ? '' : '\u200b')); }
  function accept(next: ClassificationState) { const derived = deriveClassificationLesson(next, mode); lesson.set(next); setFrames(null); setIndex(0); reject(''); say(derived.summary); }
  function attempt(action: () => void) { try { action(); } catch (e) { reject(e instanceof Error ? e.message : 'Change rejected. State preserved.'); } }
  function reset() { lesson.reset(); setFrames(null); setIndex(0); revise(revision + 1); select(0); reject(''); say(`Reset. ${deriveClassificationLesson(canonical, mode).summary}`); }
  function replay() {
    attempt(() => {
      let states: { state: ClassificationState; explanation: string }[];
      if (a.sweep && mode !== 'logistic') states = a.sweep.points.map(p => ({ state: { ...s, threshold: p.threshold }, explanation: p.threshold === null ? 'Above every score: all predictions negative.' : `Threshold ${p.threshold}; tied scores enter together.` }));
      else { let next = s; states = [{ state: next, explanation: 'Initial displayed state.' }]; for (let i = 1; i <= 3; i++) { next = classificationStep(next, mode); deriveClassificationLesson(next, mode); states.push({ state: next, explanation: `After ${i} simultaneous parameter updates.` }); } }
      const trace = traceFrom(states); trace.forEach(f => deriveClassificationLesson(f.state, mode));
      setFrames(trace); setIndex(0); lesson.set(trace[0]!.state); revise(revision + 1); reject(''); say(`Replay frame 1 of ${trace.length}. ${deriveClassificationLesson(trace[0]!.state, mode).summary}`);
    });
  }
  function seek(i: number) { const frame = frames?.[i]; if (!frame) return; lesson.set(frame.state); setIndex(i); revise(revision + 1); reject(''); say(`Replay frame ${i + 1} of ${frames!.length}. ${deriveClassificationLesson(frame.state, mode).summary}`); }
  const field = (label: string, value: number, update: (v: number) => void, min = -1000, max = 1000, step = .1) => <NumberField key={`${revision}-${label}`} label={label} value={value} min={min} max={max} step={step} onCommit={update} />;
  return <section class="p02-lab" data-classification-lab={mode} data-threshold={s.threshold === null ? 'above-all' : s.threshold} data-loss={a.binary?.loss ?? a.multi?.loss} data-frame-index={frames ? index : 0}>
    <header class="p02-heading"><div><p class="p02-kicker">Probability and threshold laboratory</p><h2>{a.title}</h2></div><button onClick={reset}>Reset experiment</button></header>
    <p class="p02-help" data-provenance>{a.provenance}</p>
    <div class="p02-layout"><div ref={diagram}>
      {a.binary && <><svg class="p02-plot" style={{ '--p02-plot-font': `${a.fontSize}px` }} viewBox="0 0 560 560" role="img" aria-labelledby={`${uid}-sigmoid-title ${uid}-sigmoid-desc`} data-sigmoid-plot>
        <title id={`${uid}-sigmoid-title`}>Active logistic probability curve and binary observations</title><desc id={`${uid}-sigmoid-desc`}>Horizontal axis x spans minus three to three. Vertical probability axis spans zero to one. Circles are labels; diamonds are predicted probabilities; dashed segments show their differences.</desc>
        <g class="p02-axes"><line x1="70" x2="490" y1="470" y2="470" /><line x1="70" x2="70" y1="90" y2="470" />{[-3, 0, 3].map(x => <text x={70 + (x + 3) * 70} y="505" text-anchor="middle">{x}</text>)}{[0, .5, 1].map(p => <text x="60" y={470 - 380 * p} text-anchor="end">{p}</text>)}<text x="490" y="535">x</text><text x="80" y="75">probability</text></g>
        <path class="p02-predictor" d={a.sigmoidPath} />
        {a.rows.map(r => <g data-logistic-point={r.id}><line class="p02-residual" x1={r.cx} x2={r.cx} y1={r.labelY} y2={r.cy} /><circle class="p02-observation" cx={r.cx} cy={r.labelY} r="6" /><path class="p02-prediction" d={r.diamond} /></g>)}
        {s.threshold !== null && <line class="p02-update" x1="70" x2="490" y1={a.thresholdY!} y2={a.thresholdY!} />}
      </svg><p class="p02-help">● Label · ◇ Probability · horizontal line is the decision threshold. Off-domain observations remain in the numeric table.</p></>}
      {a.counts && <>
        <ul class="p02-score-list" aria-label="Current scores and decisions">{a.rows.map(r => <li><span>{r.id}</span><meter min="0" max="1" value={r.score} aria-label={`Score ${r.id}: ${r.score}`} /><span>{approx(r.score)} → {r.prediction}</span></li>)}</ul>
        <p data-threshold-policy>Positive if score ≥ {a.thresholdLabel}. Equality joins the positive class.</p>
        <div class="p02-confusion" aria-label="Confusion counts; actual label compared with predicted label">{[['TP', a.counts.tp, 'Actual 1 / predicted 1'], ['FP', a.counts.fp, 'Actual 0 / predicted 1'], ['FN', a.counts.fn, 'Actual 1 / predicted 0'], ['TN', a.counts.tn, 'Actual 0 / predicted 0']].map(([key, value, label]) => <div>{key} · {label}<strong data-count={key} data-number={value}>{value}</strong></div>)}</div>
      </>}
      {mode === 'metrics' && <>
        <dl class="p02-scalars">{metrics.map(({ name, metric }) => <div><dt>{name}</dt><dd data-metric={name} data-number={metric.value ?? 'undefined'}>{metricText(metric)}</dd></div>)}</dl>
        {a.rocPoints.length ? <svg class="p02-plot" style={{ '--p02-plot-font': `${a.fontSize}px` }} viewBox="0 0 560 560" role="img" aria-labelledby={`${uid}-roc-title`} data-roc-plot><title id={`${uid}-roc-title`}>Exact ROC sweep; horizontal false positive rate, vertical true positive rate; ties move together.</title>
          <g class="p02-axes"><line x1="70" x2="490" y1="470" y2="470" /><line x1="70" x2="70" y1="50" y2="470" />{[0, .5, 1].map(v => <g><text x={70 + 420 * v} y="505" text-anchor="middle">{v}</text><text x="60" y={470 - 420 * v} text-anchor="end">{v}</text></g>)}<text x="490" y="535" text-anchor="end">FPR</text><text x="80" y="40">TPR</text></g>
          <line class="p02-residual" x1="70" x2="490" y1="470" y2="50" /><path class="p02-predictor" d={a.rocPath} />
          {a.rocPoints.map(p => <circle class="p02-prediction" cx={p.cx} cy={p.cy} r="5" data-roc-threshold={p.threshold === null ? 'above-all' : p.threshold} data-fpr={p.fpr.value} data-tpr={p.tpr.value} />)}
          {a.rocActive && <circle class="p02-observation" cx={a.rocActive.cx} cy={a.rocActive.cy} r="9" data-active-roc data-fpr={a.rocActive.fpr} data-tpr={a.rocActive.tpr} />}
        </svg> : <p data-roc-undefined>{a.sweep!.auc.reason}</p>}
      </>}
      {a.multi && <><h3>Class probabilities from the active weight matrix</h3>{a.multi.probabilities.map((r, i) => <div><p>s{i + 1}: actual {s.multiLabels[i]}, predicted {a.multi!.predicted[i]}; row sum {approx(a.probabilitySums[i]!)}</p><ul class="p02-score-list">{r.map((p, c) => <li><span>Class {c}</span><meter min="0" max="1" value={p} aria-label={`s${i + 1} class ${c} probability ${p}`} /><span>{approx(p)}</span></li>)}</ul></div>)}</>}
    </div><div class="p02-controls"><fieldset><legend>Change the active experiment</legend>
      {mode === 'softmax' ? <>
        <div class="p02-fields">{s.W.flatMap((row, j) => row.map((v, c) => field(`W row ${j + 1} class ${c}`, v, value => accept({ ...s, W: s.W.map((r, k) => k === j ? r.map((x, col) => col === c ? value : x) : r) }))))}</div>
        {field('Common logit shift', s.shift, value => accept({ ...s, shift: value }))}
        <label class="p02-picker">Selected multiclass row<select value={selected} onChange={e => select(Number(e.currentTarget.value))}>{s.multiX.map((_, i) => <option value={i}>s{i + 1}</option>)}</select></label>
        {field('Multiclass feature x', s.multiX[selected]![1]!, value => accept({ ...s, multiX: s.multiX.map((r, i) => i === selected ? [1, value] : r) }), -3, 3)}
        <label class="p02-picker">Class label<select value={s.multiLabels[selected]} onChange={e => attempt(() => accept({ ...s, multiLabels: s.multiLabels.map((y, i) => i === selected ? Number(e.currentTarget.value) : y) }))}>{[0, 1, 2].map(c => <option value={c}>{c}</option>)}</select></label>
      </> : <>
        {a.binary && <div class="p02-fields">{field('Intercept b', s.weights[0]!, value => accept({ ...s, weights: [value, s.weights[1]!] }))}{field('Weight w', s.weights[1]!, value => accept({ ...s, weights: [s.weights[0]!, value] }))}</div>}
        {s.threshold === null ? <div data-above-all-control><p>Active threshold: +∞ (above every score). Every prediction is negative, including a score of 1.</p><button onClick={() => accept({ ...s, threshold: .5 })}>Use finite threshold 0.5</button></div> : <>
          {field('Decision threshold', s.threshold, value => accept({ ...s, threshold: value }), 0, 1, .05)}
          <label class="p02-range">Threshold slider<input type="range" min="0" max="1" step="0.01" value={s.threshold} onInput={e => attempt(() => accept({ ...s, threshold: Number(e.currentTarget.value) }))} /></label>
          <button onClick={() => accept({ ...s, threshold: null })}>Predict no positives</button>
        </>}
        <label class="p02-picker">Selected example<select value={selected} onChange={e => select(Number(e.currentTarget.value))}>{a.rows.map((r, i) => <option value={i}>{r.id}</option>)}</select></label>
        {a.binary ? field('Example feature x', s.X[selected]![1]!, value => accept({ ...s, X: s.X.map((r, i) => i === selected ? [1, value] : r) }), -3, 3) : field('Example score', s.scores[selected]!, value => accept({ ...s, scores: s.scores.map((p, i) => i === selected ? value : p) }), 0, 1, .05)}
        <label class="p02-picker">Actual binary label<select value={a.rows[selected]!.label} onChange={e => attempt(() => accept(a.binary ? { ...s, labels: s.labels.map((y, i) => i === selected ? Number(e.currentTarget.value) : y) } : { ...s, scoreLabels: s.scoreLabels.map((y, i) => i === selected ? Number(e.currentTarget.value) : y) }))}><option value="0">0</option><option value="1">1</option></select></label>
        {!a.binary && <div class="p02-actions"><button onClick={() => accept({ ...s, scoreLabels: s.scoreLabels.map(() => 0) })}>No actual positives</button><button onClick={() => accept({ ...s, scoreLabels: [0, 0, 0, 0, 1] })}>One actual positive</button></div>}
      </>}
      {(a.binary || a.multi) && <>{field('Learning rate η', s.rate, value => accept({ ...s, rate: value }), .001, 1, .01)}<button onClick={() => attempt(() => accept(classificationStep(s, mode)))}>Apply one update</button></>}
      <button onClick={replay}>{a.binary || a.multi ? 'Replay 3 updates' : 'Replay threshold sweep'}</button>
      </fieldset><Inspector rows={a.inspector} />
      {a.binary && <p data-logistic-gradient>∇W = [{a.binary.gradient.map(approx).join(', ')}]ᵀ; next W = [{a.binary.next.map(approx).join(', ')}]ᵀ.</p>}
      {a.multi && <div class="table-scroll" data-scrollable="Softmax gradient and update, scrollable"><table><caption>Gradient and prospective weight matrix; update has not yet been applied</caption><thead><tr><th scope="col">Row</th><th scope="col">∇W</th><th scope="col">Next W</th></tr></thead><tbody>{a.multi.gradient.map((r, j) => <tr data-gradient-row={j} data-gradient={JSON.stringify(r)}><th scope="row">{j + 1}</th><td>[{r.map(approx).join(', ')}]</td><td>[{a.multi!.next[j]!.map(approx).join(', ')}]</td></tr>)}</tbody></table></div>}
      {frames && <TraceStepper frames={frames} index={index} onSeek={seek} />}
      <p data-current-frame>{frames ? `Frame ${index + 1} / ${frames.length}` : 'Live state'}</p>
      {reason && <p role="alert" data-rejection>{reason}</p>}<p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
    </div></div>
    {(a.binary || a.multi) && <dl class="p02-scalars"><div><dt>Mean {a.binary ? 'BCE' : 'cross entropy'}</dt><dd data-value="loss" data-number={a.binary?.loss ?? a.multi!.loss}>{approx(a.binary?.loss ?? a.multi!.loss)}</dd></div></dl>}
    {a.formulas.map(f => <Formula {...f} />)}
    {a.counts && <div class="table-scroll" data-scrollable="Scored examples and decisions, scrollable"><table><caption>One authoritative score per example; exact counts follow score ≥ threshold</caption><thead><tr><th scope="col">ID</th>{a.binary && <><th scope="col">x</th><th scope="col">Logit</th><th scope="col">BCE</th></>}<th scope="col">Score</th><th scope="col">Actual</th><th scope="col">Predicted</th><th scope="col">Cell</th></tr></thead><tbody>{a.rows.map(r => <tr data-score-row={r.id} data-score={r.score} data-label={r.label} data-prediction={r.prediction} data-logit={r.logit} data-loss={r.loss}><th scope="row">{r.id}</th>{a.binary && <><td>{String(r.x)}</td><td>{approx(r.logit!)}</td><td>{approx(r.loss!)}</td></>}<td>{a.binary ? approx(r.score) : String(r.score)}</td><td>{r.label}</td><td>{r.prediction}</td><td>{r.cell}</td></tr>)}</tbody></table></div>}
    {mode === 'metrics' && <div class="table-scroll" data-scrollable="Exact ROC threshold sweep, scrollable"><table><caption>Each distinct score enters once; tied examples enter together. The first threshold is above all scores.</caption><thead><tr><th scope="col">Threshold</th><th scope="col">TP</th><th scope="col">FP</th><th scope="col">TN</th><th scope="col">FN</th><th scope="col">TPR</th><th scope="col">FPR</th></tr></thead><tbody>{a.sweep!.points.map(p => <tr data-roc-row data-threshold={p.threshold === null ? 'above-all' : p.threshold}><th scope="row">{p.threshold === null ? '+∞ (above all)' : String(p.threshold)}</th><td>{p.tp}</td><td>{p.fp}</td><td>{p.tn}</td><td>{p.fn}</td><td>{metricText(p.tpr)}</td><td>{metricText(p.fpr)}</td></tr>)}</tbody></table></div>}
    {a.multi && <div class="table-scroll" data-scrollable="Active softmax batch, scrollable"><table><caption>Rows of Z, shifted Z, P and Y; labels are class indices, Y is one-hot</caption><thead><tr><th scope="col">ID</th><th scope="col">Logits</th><th scope="col">Shifted logits</th><th scope="col">Probabilities</th><th scope="col">Y</th><th scope="col">CE</th></tr></thead><tbody>{a.multi.logits.map((r, i) => <tr data-softmax-row={i} data-logits={JSON.stringify(r)} data-probabilities={JSON.stringify(a.multi!.probabilities[i])} data-loss={a.multi!.losses[i]}><th scope="row">s{i + 1}</th><td>[{r.map(approx).join(', ')}]</td><td>[{a.multi!.normalized[i]!.shifted.map(approx).join(', ')}]</td><td>[{a.multi!.probabilities[i]!.map(approx).join(', ')}]</td><td>[{a.multi!.oneHot[i]!.join(', ')}]</td><td>{approx(a.multi!.losses[i]!)}</td></tr>)}</tbody></table></div>}
  </section>;
}
export default function ClassificationStage({ scope, mode }: { scope: string; mode: ClassificationMode }) { return <IdScope name={scope}><ClassificationExperiment mode={mode} /></IdScope>; }
