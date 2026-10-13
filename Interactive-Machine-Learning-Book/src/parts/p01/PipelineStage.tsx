import NumberField from '../../ui/NumberField';
import Inspector from '../../ui/Inspector';
import Formula from '../../ui/Formula';
import { IdScope } from '../../ui/ids';
import { PIPELINE_CANONICAL, pipelineTrace, pipelineUpdate } from './model/foundations';
import { editRegressionSample } from '../p02/linear-regression-lesson';
import { derivePipelineLesson, approx } from './lesson';
import { useExperiment, ExperimentStatus } from './experiment';
import './p01.css';

function Experiment() {
  const experiment=useExperiment(PIPELINE_CANONICAL,derivePipelineLesson),a=experiment.active,s=a.state,r=s.regression;
  const selected=a.numerical.rows.find(row=>row.id===s.sampleId)!;
  return <div data-p01 data-pipeline data-mode={s.mode} data-loss-scope={a.lossScope} data-weight={r.weight} data-bias={r.bias} data-mse={a.loss??'undefined'} data-frame-index={experiment.frames?experiment.index:0}>
    <header class="p01-heading"><h2>Follow an observation through the predictor</h2><button onClick={experiment.reset}>Reset experiment</button></header>
    <p class="p01-provenance">Five explicit hand-authored toy observations. Parameters are learned from targets; a new query has no supplied target.</p>
    <ol class="p01-pipeline">{a.nodes.map(node=><li key={node.label}><span>{node.label}</span><strong>{node.value}</strong><small>{node.detail}</small></li>)}</ol>
    <div class="p01-fields">
      <label class="p01-picker">Mode<select value={s.mode} onChange={e=>experiment.accept({...s,mode:e.currentTarget.value as typeof s.mode})}><option value="training">Training</option><option value="inference">Inference</option></select></label>
      {s.mode==='training'&&<label class="p01-picker">Selected observation<select value={s.sampleId} onChange={e=>experiment.accept({...s,sampleId:e.currentTarget.value})}>{r.samples.map(row=><option value={row.id}>{row.id}</option>)}</select></label>}
      <NumberField key={`${experiment.revision}:w`} label="Weight w" value={r.weight} min={-4} max={4} onCommit={weight=>experiment.accept({...s,regression:{...r,weight}})}/>
      <NumberField key={`${experiment.revision}:b`} label="Bias b" value={r.bias} min={-4} max={4} onCommit={bias=>experiment.accept({...s,regression:{...r,bias}})}/>
      <NumberField key={`${experiment.revision}:lr`} label="Learning rate η" value={r.learningRate} min={.001} max={1} step={.01} onCommit={learningRate=>experiment.accept({...s,regression:{...r,learningRate}})}/>
      {s.mode==='inference'?<NumberField key={`${experiment.revision}:query`} label="Query x" value={s.query} min={-5} max={5} onCommit={query=>experiment.accept({...s,query})}/>:<>
        <NumberField key={`${experiment.revision}:x`} label="Observed x" value={selected.x} min={-5} max={5} onCommit={x=>experiment.accept({...s,regression:editRegressionSample(r,s.sampleId,{x})})}/>
        <NumberField key={`${experiment.revision}:y`} label="Observed target" value={selected.y} min={-5} max={5} onCommit={y=>experiment.accept({...s,regression:editRegressionSample(r,s.sampleId,{y})})}/>
      </>}
    </div>
    <div class="p01-actions"><button disabled={s.mode==='inference'} onClick={()=>experiment.attempt(()=>experiment.accept(pipelineUpdate(s),'One batch update. '))}>Apply one update</button>
      <button onClick={()=>experiment.attempt(()=>experiment.replay(pipelineTrace(s)))}>Replay pipeline</button></div>
    {a.reason&&<p class="p01-caution">{a.reason}</p>}
    <Formula {...a.formula}/><Inspector rows={a.inspector}/>
    <dl class="p01-metrics"><div><dt>{a.metricLabels.prediction}</dt><dd data-value="prediction" data-number={a.prediction}>{approx(a.prediction)}</dd></div>
      <div><dt>{a.metricLabels.residual}</dt><dd data-value="residual" data-number={a.residual??'undefined'}>{approx(a.residual)}</dd></div>
      <div><dt>{a.metricLabels.loss}</dt><dd data-value="mse" data-number={a.loss??'undefined'}>{approx(a.loss)}</dd></div></dl>
    <div class="table-scroll" tabIndex={0} role="region" aria-label="Predictor observations, scrollable"><table><caption data-stored-batch-mse={a.numerical.mse}>Stored training observations · batch MSE {approx(a.numerical.mse)}. The inference query is separate.</caption>
      <thead><tr><th scope="col">ID</th><th scope="col">x</th><th scope="col">Target</th><th scope="col">Prediction</th><th scope="col">Residual</th></tr></thead>
      <tbody>{a.numerical.rows.map(row=><tr key={row.id} data-row-id={row.id} data-x={row.x} data-y={row.y} data-prediction={row.prediction} data-residual={row.residual}>
        <th scope="row">{row.id}</th><td>{String(row.x)}</td><td>{String(row.y)}</td><td>{approx(row.prediction)}</td><td>{approx(row.residual)}</td></tr>)}</tbody></table></div>
    <ExperimentStatus experiment={experiment}/>
  </div>;
}
export default function PipelineStage({scope}:{scope:string}) {return <IdScope name={scope}><Experiment/></IdScope>;}
