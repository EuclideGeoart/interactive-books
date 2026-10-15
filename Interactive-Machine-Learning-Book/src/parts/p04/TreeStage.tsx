import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TraceFrame } from '../../platform/trace';
import NumberField from '../../ui/NumberField';
import Formula from '../../ui/Formula';
import Inspector from '../../ui/Inspector';
import TraceStepper from '../../ui/TraceStepper';
import { useLesson } from '../../ui/useLesson';
import { IdScope, useScopedId } from '../../ui/ids';
import { deriveLab, initialLab, isEnsemble, isRegression, lessonTrace, shown, type LabState, type Mode } from './lesson';
import { integer, type Tree } from './model/tree';
import './stage.css';

export default function TreeStage({ scope, mode }: { scope: string; mode: Mode }) {
  return <IdScope name={scope}><Experiment mode={mode} /></IdScope>;
}
function Value({ value, reason, name }: { value: number | null; reason?: string | null; name?: string }) {
  return <span data-scalar={name} data-number={value ?? undefined} data-reason={value === null ? reason ?? 'No prediction.' : undefined}>
    {value === null ? `Undefined: ${reason ?? 'No prediction.'}` : shown(value)}
  </span>;
}
function TreeList({ tree, queryLeaf }: { tree: Tree; queryLeaf: string | null }) {
  return <li data-tree-node={tree.id} data-query-leaf={tree.id === queryLeaf}><div class="p04-node">
    <strong>{tree.id} · depth {tree.depth}</strong>
    <span>n {tree.stats.n} · {tree.stats.counts ? `counts [${tree.stats.counts.join(', ')}]` : `mean ≈ ${shown(tree.stats.mean)} · SSE ≈ ${shown(tree.stats.risk)}`}</span>
    <span>{tree.split ? `x${tree.split.feature + 1} ≤ ${shown(tree.split.threshold)} → left; otherwise right` : `Leaf prediction: ${shown(tree.stats.value)}`}</span>
    {tree.id === queryLeaf && <span>Query terminates here.</span>}<small>{tree.reason}</small>
  </div>{tree.left && tree.right && <ul><TreeList tree={tree.left} queryLeaf={queryLeaf} /><TreeList tree={tree.right} queryLeaf={queryLeaf} /></ul>}</li>;
}
function Experiment({ mode }: { mode: Mode }) {
  const canonical = useMemo(() => initialLab(mode), [mode]);
  const [width, setWidth] = useState(560), plotRef = useRef<SVGSVGElement>(null);
  const derive = useCallback((s: LabState) => deriveLab(s, mode, width), [mode, width]);
  const lesson = useLesson(canonical, derive), s = lesson.state, a = lesson.derived;
  const [frames, setFrames] = useState<readonly TraceFrame<LabState>[]>([]);
  const [frameIndex, setFrameIndex] = useState(0), [revision, setRevision] = useState(0), [rowIndex, setRowIndex] = useState(0);
  const titleId = useScopedId(), descId = useScopedId();
  useEffect(() => {
    const plot = plotRef.current; if (!plot) return;
    const measure = () => { const next = plot.getBoundingClientRect().width; if (next > 0) setWidth(next); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(plot); return () => observer.disconnect();
  }, []);
  function edit(patch: Partial<LabState>) {
    const next = { ...s, ...patch }; deriveLab(next, mode, width);
    lesson.set(next); setFrames([]); setFrameIndex(0);
  }
  function changeData(rows: LabState['rows']) {
    edit({ rows, nodeId: 'root', treeIndex: 0 }); setRowIndex(0); setRevision(v => v + 1);
  }
  function reset() { lesson.reset(); setFrames([]); setFrameIndex(0); setRowIndex(0); setRevision(v => v + 1); }
  function seek(index: number) { lesson.set(frames[index]!.state); setFrameIndex(index); setRevision(v => v + 1); }
  function replay() {
    const next = lessonTrace(s, mode); setFrames(next); setFrameIndex(0); lesson.set(next[0]!.state); setRevision(v => v + 1);
  }
  const numeric = (label: string, value: number, min: number, max: number, update: (v: number) => void, step = .1) =>
    <NumberField key={`${revision}-${label}`} label={label} value={value} min={min} max={max} step={step} onCommit={update} />;
  const integerField = (label: string, value: number, min: number, max: number, key: keyof LabState) =>
    numeric(label, value, min, max, v => { integer(v, min, max, label); edit({ [key]: v, nodeId: 'root', ...(key === 'treeCount' ? { treeIndex: 0 } : {}) }); }, 1);
  const activeRowIndex = Math.min(rowIndex, s.rows.length - 1), row = s.rows[activeRowIndex];
  const updateRow = (patch: Partial<LabState['rows'][number]>) => { if (row) edit({ rows: s.rows.map((r, i) => i === activeRowIndex ? { ...r, ...patch } : r), nodeId: 'root' }); };
  const manual = !isEnsemble(mode) && mode !== 'boosting';
  const boundary = manual ? { feature: s.feature, pixel: a.plot.thresholdPixel, threshold: s.threshold } : a.best ? { feature: a.best.feature,
    pixel: a.best.feature === 0 ? 65 + (a.best.threshold - a.plot.xmin) * a.plot.sx : 440 - (a.best.threshold - a.plot.ymin) * a.plot.sy, threshold: a.best.threshold } : null;
  const replayLabel = isEnsemble(mode) ? 'Replay 0–3 trees' : mode === 'boosting' ? 'Replay 0–3 stages' : mode === 'regression' ? 'Replay pruning strengths' : 'Replay depth 0–3';
  return <section class="p04-lab" data-tree-lab={mode} data-frame-index={frames.length ? frameIndex : 'live'} data-ready="true" aria-label="Trees and ensemble experiment">
    <header class="p04-heading"><span class="eyebrow">TREE / ENSEMBLE SHEET</span><h2>{mode === 'splits' ? 'Inspect a legal split' : mode === 'impurity' ? 'Weight the children' : mode === 'regression' ? 'Grow, then prune' : mode === 'bagging' ? 'Trace every bootstrap draw' : mode === 'forest' ? 'Resample features at each split' : 'Fit the next squared-error gradient'}</h2>
      <p data-provenance="hand-authored">Hand-authored data · two features · exact row IDs and input values. Computed outputs marked ≈ use six significant digits; tables retain the underlying numbers.</p></header>
    <div class="p04-controls">
      <fieldset><legend>Fit configuration</legend>
        {!isRegression(mode) && <label class="p04-select"><span>Impurity criterion</span><select value={s.criterion} onChange={e => edit({ criterion: e.currentTarget.value as LabState['criterion'], nodeId: 'root' })}><option value="gini">Gini</option><option value="entropy">Entropy (bits)</option></select></label>}
        {integerField('Maximum depth', s.depth, 0, 5, 'depth')}
        {integerField('Minimum leaf count', s.minLeaf, 1, 32, 'minLeaf')}
        {mode === 'regression' && numeric('Pruning strength α', s.alpha, 0, 10, alpha => edit({ alpha, nodeId: 'root' }))}
        {isEnsemble(mode) && <>{integerField('Ensemble seed', s.seed, 0, 4294967295, 'seed')}{integerField('Tree count', s.treeCount, 0, 6, 'treeCount')}</>}
        {mode === 'forest' && integerField('Features per split', s.mtry, 1, 2, 'mtry')}
        {mode === 'boosting' && <>{numeric('Learning rate η', s.rate, .01, 1, rate => edit({ rate }))}{integerField('Boosting stages', s.stages, 0, 6, 'stages')}</>}
      </fieldset>
      <fieldset><legend>Source observations and edge cases</legend>
        {row && <><label class="p04-select"><span>Observation ID</span><select value={activeRowIndex} onChange={e => { setRowIndex(Number(e.currentTarget.value)); setRevision(v => v + 1); }}>{s.rows.map((r, i) => <option value={i}>{r.id}</option>)}</select></label>
          {numeric('Observation feature 1', row.x[0]!, -10, 10, v => updateRow({ x: [v, row.x[1]!] }))}
          {numeric('Observation feature 2', row.x[1]!, -10, 10, v => updateRow({ x: [row.x[0]!, v] }))}
          {isRegression(mode) ? numeric('Observation target', row.y, -10, 10, y => updateRow({ y }))
            : <label class="p04-select"><span>Observation label</span><select value={row.y} onChange={e => updateRow({ y: Number(e.currentTarget.value) })}><option value="0">0</option><option value="1">1</option></select></label>}</>}
        {!row && <p>No source rows. Leaf values, query and evaluation are explicitly undefined.</p>}
        <div class="p04-actions"><button onClick={() => changeData(s.rows.map(r => ({ ...r, y: 0 })))} disabled={!s.rows.length}>{isRegression(mode) ? 'Set constant targets' : 'Set pure class 0'}</button>
          <button onClick={() => changeData(s.rows.map(r => ({ ...r, x: [2, 2] })))} disabled={!s.rows.length}>Set constant features</button>
          <button onClick={() => changeData(s.rows.filter((_, i) => i !== activeRowIndex))} disabled={!row}>Remove selected row</button><button onClick={() => changeData(s.rows.slice(0, 1))} disabled={!s.rows.length}>Keep one source row</button><button onClick={() => changeData([])}>Use empty data</button></div>
      </fieldset>
      <fieldset><legend>{manual ? 'Candidate microscope and query' : 'Inspect fitted tree and query'}</legend>
        {isEnsemble(mode) && a.ensemble!.trees.length > 0 && <label class="p04-select"><span>Bootstrap tree</span><select value={a.selectedTreeIndex} onChange={e => edit({ treeIndex: Number(e.currentTarget.value), nodeId: 'root' })}>{a.ensemble!.trees.map((t, i) => <option value={i}>{t.id}</option>)}</select></label>}
        {a.allNodes.length > 0 && <label class="p04-select"><span>Inspect node</span><select value={a.selectedNode!.id} onChange={e => edit({ nodeId: e.currentTarget.value })}>{a.allNodes.map(n => <option value={n.id}>{n.id} · n {n.stats.n}{n.split ? ' · branch' : ' · leaf'}</option>)}</select></label>}
        {manual && <><label class="p04-select"><span>Inspection feature</span><select value={s.feature} onChange={e => edit({ feature: Number(e.currentTarget.value) })}><option value="0">x1</option><option value="1">x2</option></select></label>
          {numeric('Inspection threshold', s.threshold, -10, 10, threshold => edit({ threshold }))}
          <label class="p04-slider"><span>Threshold slider</span><input key={`slider-${revision}`} aria-label="Threshold slider" type="range" min="-10" max="10" step=".1" value={s.threshold} onInput={e => edit({ threshold: Number(e.currentTarget.value) })} /></label>
          <button disabled={!a.best} onClick={() => { if (a.best) edit({ feature: a.best.feature, threshold: a.best.threshold }); }}>Inspect trained split</button></>}
        {numeric('Query feature 1', s.probe[0], -10, 10, v => edit({ probe: [v, s.probe[1]] }))}
        {numeric('Query feature 2', s.probe[1], -10, 10, v => edit({ probe: [s.probe[0], v] }))}
      </fieldset>
    </div>
    <div class="p04-actions"><button onClick={reset}>Reset experiment</button><button onClick={replay}>{replayLabel}</button>
      {mode === 'boosting' && <button disabled={s.stages >= 6} onClick={() => edit({ stages: s.stages + 1, nodeId: 'root' })}>Fit one more stage</button>}</div>
    {frames.length > 0 && <TraceStepper frames={frames} index={frameIndex} onSeek={seek} />}
    <div class="p04-live" role="status" aria-live="polite" data-announcement>
      {s.rows.length} source rows. Query prediction: <Value name="query" value={a.query} reason={a.queryReason} />.
      {a.ensemble ? ` ${a.ensemble.trees.length} actual trees; ${a.ensemble.eligible} OOB-eligible source rows.` : a.boosted ? ` ${a.boosted.stages.length} fitted residual stages.` : ` ${a.allNodes.filter(n => !n.split).length} terminal leaves.`}
    </div>
    <div class="p04-view">
      <figure class="p04-plot">
        <svg ref={plotRef} viewBox="0 0 560 520" role="img" aria-labelledby={`${titleId} ${descId}`} data-plot data-scale-x={a.plot.sx} data-scale-y={a.plot.sy} data-x-min={a.plot.xmin} data-y-min={a.plot.ymin}>
          <title id={titleId}>{a.plot.regression ? 'Target and actual prediction by source row index' : 'Source feature plane and inspected branch threshold'}</title>
          <desc id={descId}>{a.plot.regression ? 'Filled blue circles are targets; hollow rust diamonds are actual predictions; purple vertical segments are residuals. Horizontal positions are row indices, not feature distances.' : 'Class zero is a filled blue circle, class one a filled blue square. A green cross marks the query. The green dashed line is the inspected threshold; it is not the entire fitted tree. Source IDs and coordinates are listed below.'} {s.rows.length === 0 ? 'No observations; no query prediction.' : 'Coincident coordinates may overlap; the numeric table preserves every row.'}</desc>
          <path class="p04-axis" d="M65,45V440H505" />
          <g style={{ fontSize: `${a.fontSize}px` }} class="p04-axes">
            <text x="285" y="505" text-anchor="middle">{a.plot.regression ? 'Source row index' : 'Feature x1'}</text>
          </g>
          {!a.plot.regression && boundary && <line class="p04-boundary" data-threshold-line data-feature={boundary.feature} data-threshold={boundary.threshold}
            x1={boundary.feature === 0 ? boundary.pixel : 65} x2={boundary.feature === 0 ? boundary.pixel : 505}
            y1={boundary.feature === 0 ? 45 : boundary.pixel} y2={boundary.feature === 0 ? 440 : boundary.pixel} />}
          {a.plot.points.map(p => <g data-plot-point={p.id} data-x={p.x[0]} data-y={p.y} data-prediction={p.prediction ?? undefined}>
            <title>{p.id}: x [{p.x.join(', ')}]; target {p.y}; prediction {shown(p.prediction)}</title>
            {a.plot.regression && p.predictionY !== null && <><line class="p04-residual" x1={p.cx} x2={p.cx} y1={p.cy} y2={p.predictionY} />
              <path data-prediction-glyph class="p04-prediction" d={`M${p.cx},${p.predictionY - 7}l7,7l-7,7l-7,-7Z`} /></>}
            {a.plot.regression || p.y === 0 ? <circle data-observation-glyph class="p04-class0" cx={p.cx} cy={p.cy} r="6" />
              : <rect data-observation-glyph class="p04-class1" x={p.cx - 6} y={p.cy - 6} width="12" height="12" />}
          </g>)}
          {!a.plot.regression && <path data-query-glyph class="p04-query" d={`M${a.plot.queryX - 7},${a.plot.queryY}h14M${a.plot.queryX},${a.plot.queryY - 7}v14`} />}
        </svg>
        <figcaption>{a.plot.regression ? 'Targets ●, predictions ◇, residual segments. The x axis enumerates source rows; it does not interpolate a function between samples.' : 'Class 0 ● · class 1 ■ · query +. Axes have separate stated scales; the threshold line describes one branch.'} X range ≈ [{shown(a.plot.xmin)}, {shown(a.plot.xmax)}]; vertical {a.plot.regression ? 'target / prediction' : 'feature x2'} range ≈ [{shown(a.plot.ymin)}, {shown(a.plot.ymax)}]. Labels are approximate. Input coordinates and row identities remain exact in the source table.</figcaption>
      </figure>
      <div class="p04-equations">{a.formulas.map(f => <Formula tex={f.tex} label={f.label} />)}<Inspector rows={a.inspector} />
        <p>Query result ≈ <Value name="query-inspector" value={a.query} reason={a.queryReason} />; {isEnsemble(mode) ? 'hard tree votes; class 0 wins a tie.' : mode === 'boosting' ? 'baseline plus the learning-rate-scaled sum of residual trees.' : 'follow the actual recursive branches to a terminal leaf.'}</p>
        <p data-evaluation> {a.ensemble ? 'OOB accuracy' : a.boosted ? 'Half MSE' : isRegression(mode) ? 'Training MSE' : 'Training error'} ≈ <Value name="evaluation" value={a.metric.value} reason={a.metric.reason} /></p>
        {a.pruning && <p data-pruning>Retained leaves <Value name="leaves" value={a.pruning.leaves} /> · normalized risk ≈ <Value name="risk" value={a.pruning.risk} reason={a.pruning.reason} /> · cost ≈ <Value name="cost" value={a.pruning.objective} reason={a.pruning.reason} />. Cost ties within eight binary64 epsilons at their scale prefer fewer leaves.</p>}
      </div>
    </div>
    {manual && <section aria-label="Inspected split"><h3>Inspection on {a.selectedNode?.id ?? 'no fitted node'}</h3><p>The inspection controls evaluate a proposed partition. The fitted tree always selects its best legal positive-gain candidate independently.</p>
      <p data-inspected-left>Left IDs: {a.inspected.leftIds.join(', ') || 'none'} · n {a.inspected.left.n}</p><p data-inspected-right>Right IDs: {a.inspected.rightIds.join(', ') || 'none'} · n {a.inspected.right.n}</p>
      <p data-inspected-legality>{a.inspected.legal ? 'Legal partition.' : `Illegal partition: ${a.inspected.reason}`}</p>
      <div class="p04-table" tabIndex={0} role="region" aria-label="Inspection impurity table"><table><caption>Approximate impurities; SSE/n for regression, bits for entropy.</caption><thead><tr><th scope="col">Node</th><th scope="col">Count</th><th scope="col">Class counts / mean</th><th scope="col">Impurity</th><th scope="col">Risk = n·impurity</th></tr></thead><tbody>
        {([['parent', a.inspected.parent], ['left', a.inspected.left], ['right', a.inspected.right]] as const).map(([key, st]) => { const v = st as typeof a.inspected.parent; return <tr data-inspected-stats={key}><th scope="row">{key as string}</th><td>{v.n}</td><td>{v.counts ? `[${v.counts.join(', ')}]` : shown(v.mean)}</td><td>≈ <Value name={`${key}-impurity`} value={v.impurity} /></td><td>≈ <Value value={v.risk} /></td></tr>; })}</tbody></table></div>
      <p>Weighted child impurity ≈ <Value name="weighted" value={a.inspected.weighted} reason="No parent rows." /> · legal gain ≈ <Value name="gain" value={a.inspected.gain} reason={a.inspected.reason} /></p>
    </section>}
    {a.selectedNode && <section aria-label="Legal candidate ranking"><h3>Legal candidates at {a.selectedNode.id}</h3><p data-considered-features>Considered feature indices (zero based): [{a.selectedNode.features.join(', ')}]. Exact computed-gain ties choose lower feature index, then lower threshold. Training stops at nonpositive gain.</p>
      <div class="p04-table" tabIndex={0} role="region" aria-label="Candidate split table"><table><caption>Only partitions meeting minimum leaf count are candidates. All row IDs include bootstrap draw identities where relevant.</caption><thead><tr><th scope="col">Feature</th><th scope="col">Threshold</th><th scope="col">Left IDs / n</th><th scope="col">Right IDs / n</th><th scope="col">Weighted impurity</th><th scope="col">Gain</th><th scope="col">Chosen</th></tr></thead><tbody>
        {a.selectedNode.candidates.map(c => <tr data-candidate data-feature={c.feature} data-threshold={c.threshold} data-left-ids={JSON.stringify(c.leftIds)} data-right-ids={JSON.stringify(c.rightIds)} data-gain={c.gain} data-weighted={c.weighted}>
          <td>x{c.feature + 1}</td><td>{String(c.threshold)}</td><td>{c.leftIds.join(', ')} / {c.left.n}</td><td>{c.rightIds.join(', ')} / {c.right.n}</td><td>≈ {shown(c.weighted)}</td><td>≈ {shown(c.gain)}</td><td>{a.best?.feature === c.feature && a.best.threshold === c.threshold ? 'yes' : 'no'}</td></tr>)}</tbody></table></div>
      {!a.selectedNode.candidates.length && <p>No candidates were evaluated here: {a.selectedNode.reason}</p>}
    </section>}
    <section><h3>Actual recursive tree</h3>{a.activeTree ? <ul class="p04-tree"><TreeList tree={a.activeTree} queryLeaf={a.queryLeaf} /></ul> : <p>No fitted stage tree. A boosting baseline has a mean prediction; an empty ensemble has none.</p>}
      <div class="p04-table" tabIndex={0} role="region" aria-label="Tree node identities"><table><caption>Row multiplicities affect every node count. Feature subsets are recorded at each eligible split, in preorder.</caption><thead><tr><th scope="col">Node</th><th scope="col">Rows</th><th scope="col">Source IDs with multiplicity</th><th scope="col">Features</th><th scope="col">Leaf / branch</th></tr></thead><tbody>{a.allNodes.map(n => <tr data-node-row={n.id} data-features={JSON.stringify(n.features)} data-row-ids={JSON.stringify(n.rowIds)}><th scope="row">{n.id}</th><td>{n.rowIds.join(', ') || 'none'}</td><td>{n.sourceIds.join(', ') || 'none'}</td><td>[{n.features.join(', ')}]</td><td>{n.split ? `x${n.split.feature + 1} ≤ ${n.split.threshold}` : shown(n.stats.value)}</td></tr>)}</tbody></table></div>
    </section>
    {a.ensemble && <section><h3>Sampling ledger and actual aggregation</h3><p>{a.ensemble.streamPolicy} Seeds identify stream states before their next output. These are deterministic pseudorandom resamples, not a proof of statistical independence.</p>
      <div class="p04-table" tabIndex={0} role="region" aria-label="Tree seed and draw segments"><table><caption>Half-open output offsets are reserved before fitting; unused feature draws stay reserved.</caption><thead><tr><th scope="col">Tree</th><th scope="col">Bootstrap seed</th><th scope="col">Bootstrap segment</th><th scope="col">Feature seed</th><th scope="col">Feature segment</th></tr></thead><tbody>{a.ensemble.trees.map(t => <tr data-seed-row={t.id}><th scope="row">{t.id}</th><td>{t.bootstrapSeed}</td><td>[{t.bootstrapStart}, {t.featureStart})</td><td>{t.featureSeed}</td><td>[{t.featureStart}, {t.featureStart + t.featureBudget})</td></tr>)}</tbody></table></div>
      {a.sample && <><p data-bootstrap-summary>{a.sample.draws.length} draws · {a.sample.uniqueIds.length} unique source IDs: {a.sample.uniqueIds.join(', ') || 'none'} · OOB IDs: {a.sample.oobIds.join(', ') || 'none'}.</p>
        <div class="p04-table" tabIndex={0} role="region" aria-label="Bootstrap draws"><table><caption>Each draw has a unique training-row ID; repeated source IDs are repeated observations.</caption><thead><tr><th scope="col">Draw</th><th scope="col">Training ID</th><th scope="col">Source index</th><th scope="col">Source ID</th></tr></thead><tbody>{a.sample.draws.map(d => <tr data-bootstrap-draw={d.draw} data-source-id={d.sourceId} data-index={d.index}><td>{d.draw}</td><td>draw{d.draw}</td><td>{d.index}</td><td>{d.sourceId}</td></tr>)}</tbody></table></div>
        <div class="p04-table" tabIndex={0} role="region" aria-label="Source multiplicities"><table><caption>Zero multiplicity is OOB for this selected tree.</caption><thead><tr><th scope="col">Source</th><th scope="col">Multiplicity</th><th scope="col">OOB</th></tr></thead><tbody>{a.sample.counts.map(c => <tr data-multiplicity={c.id} data-count={c.count}><th scope="row">{c.id}</th><td>{c.count}</td><td>{c.count === 0 ? 'yes' : 'no'}</td></tr>)}</tbody></table></div></>}
      <div class="p04-table" tabIndex={0} role="region" aria-label="Tree query votes"><table><caption>Actual query predictions from each fitted tree; class-zero majority tie policy.</caption><thead><tr><th scope="col">Tree</th><th scope="col">Prediction</th><th scope="col">Leaf</th></tr></thead><tbody>{a.treeVotes.map(v => <tr data-query-vote={v.id} data-value={v.value ?? undefined}><th scope="row">{v.id}</th><td><Value value={v.value} reason={v.reason} /></td><td>{v.leaf}</td></tr>)}</tbody></table></div>
      <div class="p04-table" tabIndex={0} role="region" aria-label="OOB predictions"><table><caption>OOB accuracy averages source rows with at least one eligible prediction; it is undefined when that set is empty.</caption><thead><tr><th scope="col">Source</th><th scope="col">Excluding trees</th><th scope="col">Votes</th><th scope="col">OOB prediction</th></tr></thead><tbody>{a.ensemble.oob.map(p => <tr data-oob-row={p.id} data-trees={JSON.stringify(p.treeIds)} data-votes={JSON.stringify(p.values)} data-value={p.value ?? undefined}><th scope="row">{p.id}</th><td>{p.treeIds.join(', ') || 'none'}</td><td>{p.values.join(', ') || 'none'}</td><td><Value value={p.value} reason={p.reason} /></td></tr>)}</tbody></table></div>
    </section>}
    {a.boosted && <section><h3>Sequential squared-error stages</h3><p>Initial baseline ≈ <Value name="baseline" value={a.boosted.baseline} reason="Empty targets: no mean." />. Every stage fits a new tree to y − F before that stage. Only squared-error regression is implemented here.</p>
      <div class="p04-table" tabIndex={0} role="region" aria-label="Stage objectives"><table><caption>Training objective is half MSE; evaluation MSE is twice this number.</caption><thead><tr><th scope="col">Stage</th><th scope="col">Before objective</th><th scope="col">After objective</th></tr></thead><tbody>{a.boosted.stages.map(stage => <tr data-stage-row={stage.stage} data-before={stage.lossBefore} data-after={stage.lossAfter}><th scope="row">{stage.stage}</th><td>≈ {shown(stage.lossBefore)}</td><td>≈ {shown(stage.lossAfter)}</td></tr>)}</tbody></table></div>
      <div class="p04-table" tabIndex={0} role="region" aria-label="Residual fitting ledger"><table><caption>Each current prediction uses all previous stages. The displayed recursive tree is the last residual tree.</caption><thead><tr><th scope="col">Stage / source</th><th scope="col">y</th><th scope="col">F before</th><th scope="col">r = y − F</th><th scope="col">h(x)</th><th scope="col">F after</th></tr></thead><tbody>{a.boosted.stages.flatMap(stage => s.rows.map((r, i) => <tr data-residual-row={`${stage.stage}-${r.id}`} data-before={stage.before[i]} data-residual={stage.residuals[i]} data-fitted={stage.fitted[i]} data-after={stage.after[i]}><th scope="row">{stage.stage} / {r.id}</th><td>{r.y}</td><td>≈ {shown(stage.before[i]!)}</td><td>≈ {shown(stage.residuals[i]!)}</td><td>≈ {shown(stage.fitted[i]!)}</td><td>≈ {shown(stage.after[i]!)}</td></tr>))}</tbody></table></div>
    </section>}
    <div class="p04-table" tabIndex={0} role="region" aria-label="Source predictions"><table><caption>Exact inputs; actual model outputs and prediction-minus-target residuals are approximate displays.</caption><thead><tr><th scope="col">ID</th><th scope="col">x1</th><th scope="col">x2</th><th scope="col">Target</th><th scope="col">Prediction</th><th scope="col">Residual</th></tr></thead><tbody>{a.predictionRows.map(r => <tr data-source-row={r.id} data-x={JSON.stringify(r.x)} data-target={r.y} data-prediction={r.prediction ?? undefined} data-residual={r.residual ?? undefined}><th scope="row">{r.id}</th><td>{String(r.x[0])}</td><td>{String(r.x[1])}</td><td>{String(r.y)}</td><td><Value value={r.prediction} /></td><td><Value value={r.residual} /></td></tr>)}</tbody></table></div>
    <p class="p04-note">Limits: 32 rows, 1–4 kernel features (the sheet uses 2), depth ≤ 5, at most 6 trees or stages. Empty-node impurity/risk is conventionally 0; its prediction and empty normalized evaluation are undefined. The sheet bounds features, targets and queries to −10…10. Edits use the selected replay frame, exit replay and leave saved history unchanged.</p>
  </section>;
}
