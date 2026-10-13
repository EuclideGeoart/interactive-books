import { useState } from 'preact/hooks';
import NumberField from '../../ui/NumberField';
import Inspector from '../../ui/Inspector';
import { IdScope } from '../../ui/ids';
import { assignSplit,seedSplit,shiftSplit,SPLIT_CANONICAL,splitTrace } from './model/splits';
import { deriveSplitLesson,approx } from './lesson';
import MembershipBoard,{partitionIndex} from './MembershipBoard';
import { useExperiment,ExperimentStatus } from './experiment';
import './p01.css';
function Experiment() {
  const experiment=useExperiment(SPLIT_CANONICAL,deriveSplitLesson),a=experiment.active,s=a.state;
  const [selected,setSelected]=useState('g1-a'), row=a.rows.find(row=>row.id===selected)??a.rows[0]!;
  return <div data-p01 data-split data-seed={s.seed} data-source={s.source} data-baseline={a.baselineMean??'undefined'} data-frame-index={experiment.frames?experiment.index:0}>
    <header class="p01-heading"><h2>Keep identities while changing assignments</h2><button onClick={()=>{experiment.reset();setSelected('g1-a');}}>Reset experiment</button></header>
    <p class="p01-provenance">{a.provenance} Source: {s.source}; split seed {s.seed}. Seeded defaults split independent units roughly 60/20/20, with integer rounding shown by counts.</p>
    <div class="p01-fields">
      <NumberField key={`${experiment.revision}:seed`} label="Split seed" value={s.seed} min={0} max={4294967295} step={1} onCommit={seed=>experiment.accept(seedSplit(s.samples,seed,s.keepGroups))}/>
      <label><input type="checkbox" checked={s.keepGroups} onChange={e=>experiment.accept(seedSplit(s.samples,s.seed,e.currentTarget.checked))}/>Keep groups together (repartitions)</label>
      <label class="p01-picker">Selected ID<select value={row.id} onChange={e=>setSelected(e.currentTarget.value)}>{a.rows.map(row=><option>{row.id}</option>)}</select></label>
      <NumberField key={`${experiment.revision}:partition:${row.id}`} label="Partition index (0 train, 1 validation, 2 test)" value={['train','validation','test'].indexOf(row.partition)} min={0} max={2} step={1} onCommit={value=>experiment.accept(assignSplit(s,row.id,partitionIndex(value)))}/>
    </div>
    <div class="p01-actions"><button onClick={()=>experiment.accept(seedSplit(s.samples,s.seed,s.keepGroups))}>Repartition with displayed seed</button><button onClick={()=>experiment.accept(shiftSplit(s))}>Deliberate distribution shift</button><button onClick={()=>experiment.replay(splitTrace(s))}>Replay seeds</button></div>
    <MembershipBoard resetKey={experiment.revision} rows={a.rows} onSelect={setSelected} onAssign={(id,p)=>experiment.accept(assignSplit(s,id,p),`Moved ${id} to ${p}. `)}/>
    <p data-leakage class={a.groupLeaks.length||a.duplicateLeaks.length?'p01-caution':''}>Group leakage: {a.groupLeaks.join(', ')||'none'}. Duplicate signatures across partitions: {a.duplicateLeaks.join(', ')||'none'}.</p>
    <Inspector rows={a.inspector}/>
    <dl class="p01-metrics">{a.subsets.map(subset=><div><dt>{subset.partition} baseline MSE</dt><dd data-value={`${subset.partition}-mse`} data-number={subset.mse??'undefined'}>{approx(subset.mse)}</dd><dd><p class="p01-help">{subset.reason??`Outside training x range: ${subset.outOfRange.join(', ')||'none'}.`}</p></dd></div>)}</dl>
    <div class="table-scroll" tabIndex={0} role="region" aria-label="Partitioned observations, scrollable"><table><caption>Same rows, training-only mean {approx(a.baselineMean)}. IDs and groups never change during repartitioning.</caption>
      <thead><tr><th scope="col">ID</th><th scope="col">Group</th><th scope="col">x</th><th scope="col">y</th><th scope="col">Partition</th><th scope="col">Baseline</th><th scope="col">Residual</th></tr></thead><tbody>{a.tableRows.map(row=><tr key={row.id} data-row-id={row.id} data-x={row.x} data-y={row.y} data-partition={row.partition}><th scope="row">{row.id}</th><td>{row.group}</td><td>{row.x}</td><td>{row.y}</td><td>{row.partition}</td><td>{approx(row.prediction)}</td><td>{approx(row.residual)}</td></tr>)}</tbody></table></div>
    <h3>A separate preprocessing leakage counterexample</h3>
    <p class="p01-help">Seed {a.leakage.seed} selects an integer translation of this hand-authored three-row experiment. The two training rows have x = {a.leakage.trainX.join(', ')} and y = −1, 1. Held-out x = {a.leakage.validationX}, y = {a.leakage.validationTarget}. A fixed predictor uses centered x with weight 1 and bias 0.</p>
    <dl class="p01-metrics"><div><dt>Training-only feature mean</dt><dd>{approx(a.leakage.trainingMean)}</dd><dt>Honest held-out MSE</dt><dd data-value="honest-preprocessing-mse" data-number={a.leakage.honestMSE}>{approx(a.leakage.honestMSE)}</dd></div>
      <div><dt>Whole-dataset feature mean · invalid</dt><dd>{approx(a.leakage.wholeMean)}</dd><dt>Leaked held-out MSE</dt><dd data-value="leaked-preprocessing-mse" data-number={a.leakage.leakedMSE}>{approx(a.leakage.leakedMSE)}</dd></div>
      <div><dt>Target-leak baseline MSE · invalid</dt><dd>{approx(a.leakage.targetCentering.honestMSE)} → {approx(a.leakage.targetCentering.leakedMSE)}</dd></div></dl>
    <p class="p01-caution">{a.leakage.reason}</p>
    <ExperimentStatus experiment={experiment}/>
  </div>;
}
export default function SplitStage({scope}:{scope:string}) {return <IdScope name={scope}><Experiment/></IdScope>;}
