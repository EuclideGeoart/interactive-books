import { useLayoutEffect,useMemo,useRef,useState } from 'preact/hooks';
import NumberField from '../../ui/NumberField';
import Inspector from '../../ui/Inspector';
import Formula from '../../ui/Formula';
import { IdScope,useScopedId } from '../../ui/ids';
import { assignCapacity,capacityCandidates,CAPACITY_CANONICAL,capacityTrace,presetCapacitySplit } from './model/capacity';
import { deriveCapacityLesson,approx } from './lesson';
import MembershipBoard,{partitionIndex} from './MembershipBoard';
import { useExperiment,ExperimentStatus } from './experiment';
import './p01.css';
function Experiment() {
  const svg=useRef<SVGSVGElement>(null),[width,setWidth]=useState(320);
  useLayoutEffect(()=>{const node=svg.current!;const measure=()=>{const value=node.getBoundingClientRect().width;if(value>0)setWidth(value);};measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[]);
  const derive=useMemo(()=>(state:typeof CAPACITY_CANONICAL)=>deriveCapacityLesson(state,width),[width]);
  const experiment=useExperiment(CAPACITY_CANONICAL,derive),a=experiment.active,s=a.state;
  const [selected,setSelected]=useState('p1'),[reveal,setReveal]=useState(false),[compareLeak,setCompareLeak]=useState(false);
  const titleId=useScopedId(),descId=useScopedId(),clipId=useScopedId();
  const row=a.rows.find(row=>row.id===selected)??a.rows[0]!;
  function accept(next:typeof s,prefix?:string){experiment.accept(next,prefix);setReveal(false);}
  return <div data-p01 data-capacity data-degree={s.degree} data-seed={s.seed} data-split-seed={s.splitSeed??42} data-source={s.source??'interleaved'}
    data-training-ids={JSON.stringify(a.trainingIds)} data-coefficients={JSON.stringify(a.coefficients)} data-baseline={a.baselineMean??'undefined'} data-frame-index={experiment.frames?experiment.index:0}>
    <header class="p01-heading"><h2>One experiment: memberships × capacity × noise</h2><button onClick={()=>{experiment.reset();setSelected('p1');setReveal(false);setCompareLeak(false);}}>Reset experiment</button></header>
    <p class="p01-provenance" data-provenance>{a.provenance} Synthetic observations; not empirical evidence of model quality.</p>
    <div class="p01-fields">
      <NumberField key={`${experiment.revision}:degree`} label="Polynomial degree" value={s.degree} min={0} max={8} step={1} onCommit={degree=>accept({...s,degree})}/>
      <NumberField key={`${experiment.revision}:noise`} label="Noise amplitude" value={s.noise} min={0} max={2} onCommit={noise=>accept({...s,noise})}/>
      <NumberField key={`${experiment.revision}:seed`} label="Noise seed" value={s.seed} min={0} max={4294967295} step={1} onCommit={seed=>accept({...s,seed})}/>
      <NumberField key={`${experiment.revision}:split`} label="Split seed" value={s.splitSeed??42} min={0} max={4294967295} step={1} onCommit={seed=>accept(presetCapacitySplit(s,'seeded',seed))}/>
      <label class="p01-picker">Selected ID<select value={row.id} onChange={e=>setSelected(e.currentTarget.value)}>{a.rows.map(row=><option>{row.id}</option>)}</select></label>
      <NumberField key={`${experiment.revision}:partition:${row.id}`} label="Partition index (0 train, 1 validation, 2 test)" value={['train','validation','test'].indexOf(row.partition)} min={0} max={2} step={1} onCommit={value=>accept(assignCapacity(s,row.id,partitionIndex(value)))}/>
    </div>
    <div class="p01-actions"><button onClick={()=>accept(presetCapacitySplit(s,'interleaved'))}>Interleaved memberships</button>
      <button onClick={()=>accept(presetCapacitySplit(s,'seeded'))}>Seeded memberships</button><button onClick={()=>accept(presetCapacitySplit(s,'distribution-shift'))}>Deliberate distribution shift</button>
      <button onClick={()=>experiment.attempt(()=>{const selection=capacityCandidates(s);if(selection.selectedDegree===null)throw new RangeError(selection.reason!);accept({...s,degree:selection.selectedDegree},'Selected smallest validation MSE among degrees 0–8. ');})}>Choose degree by validation</button>
      <button onClick={()=>{experiment.replay(capacityTrace(s));setReveal(false);}}>Replay degrees 0, 2, 8</button></div>
    <MembershipBoard resetKey={experiment.revision} rows={a.rows} onSelect={setSelected} onAssign={(id,p)=>accept(assignCapacity(s,id,p),`Moved ${id} to ${p}. `)}/>
    {a.reason&&<p data-fit-reason class="p01-caution">{a.reason}</p>}
    <dl class="p01-metrics">{a.errors.map(error=><div><dt>{error.partition} polynomial MSE</dt>
      <dd data-value={`${error.partition}-mse`} data-number={error.partition==='test'&&!reveal?'hidden':error.mse??'undefined'}>{error.partition==='test'&&!reveal?'Reveal after choosing':approx(error.mse)}</dd>
      <dt>{error.partition} training-mean baseline MSE</dt><dd data-value={`${error.partition}-baseline-mse`} data-number={error.partition==='test'&&!reveal?'hidden':error.baselineMSE??'undefined'}>{error.partition==='test'&&!reveal?'Reveal after choosing':approx(error.baselineMSE)}</dd>
      <dd><p class="p01-help">{error.count} samples. {error.reason??'Evaluation uses this partition’s actual rows.'}</p></dd></div>)}</dl>
    <button onClick={()=>setReveal(true)} disabled={reveal}>Reveal test evaluation</button>
    <p class="p01-help">Training and validation residuals stay inspectable. Test outcomes are hidden until you reveal them; repeated reveal-and-edit turns the test into another validation set. Any edit hides test outcomes again.</p>
    <svg ref={svg} data-capacity-plane viewBox={a.plot.viewBox} role="img" aria-labelledby={`${titleId} ${descId}`}>
      <title id={titleId}>Polynomial fit, signal, baseline and active partition observations</title><desc id={descId}>Squares are training observations, circles validation, triangles test. Solid curve: fitted polynomial; dashed: known toy signal; dotted: training mean. Segments show training and validation residuals. Test targets and residuals appear after reveal.</desc>
      <defs><clipPath id={clipId}><rect {...a.plot.clip}/></clipPath></defs>
      <g class="p01-axes">{a.plot.axes.map(axis=><line {...axis}/>)}</g><g class="p01-ticks" font-size={a.plot.fontSize}>{[...a.plot.ticks,...a.plot.yTicks,...a.plot.labels].map(tick=><text x={tick.x} y={tick.y} text-anchor="middle">{tick.text}</text>)}</g>
      <g clip-path={`url(#${clipId})`}><path class="p01-truth" d={a.plot.paths.truth}/><path class="p01-baseline" d={a.plot.paths.baseline}/><path class="p01-fit" data-fit-path d={a.plot.paths.fit}/>
        {a.plot.points.filter(p=>p.partition!=='test'||reveal).map(point=><g><title>{point.name}</title>
          {point.residualLine&&<line class="p01-residual" {...point.residualLine}/>}
          {point.glyph?<path class="p01-observation" data-point-id={point.id} data-cx={point.cx} data-cy={point.cy} d={point.glyph}/>:<circle class="p01-observation" data-point-id={point.id} cx={point.cx} cy={point.cy} r={point.r}/>}</g>)}
      </g>
    </svg>
    <p class="p01-help">■ Train · ● Validation · ▲ Test (after reveal). Solid fit · dashed known signal · dotted baseline. The axes use different scales. The plot clips y outside the fixed range [−3,4]; the table retains every value.</p>
    <Formula {...a.formula}/><Inspector rows={a.inspector}/>
    <p data-coefficient-text>Coefficients θ₀…θ{String(s.degree)}: {a.coefficients?a.coefficients.map(approx).join(', '):'Undefined; see fit reason.'}. Training mean {approx(a.baselineMean)}.</p>
    <div class="table-scroll" tabIndex={0} role="region" aria-label="Capacity predictions, residuals and baselines, scrollable"><table><caption>Every fit uses only current training IDs. Observations retain their original identities.</caption>
      <thead><tr><th scope="col">ID</th><th scope="col">Partition</th><th scope="col">x</th><th scope="col">Target</th><th scope="col">Prediction</th><th scope="col">Residual</th><th scope="col">Squared error</th><th scope="col">Baseline</th></tr></thead>
      <tbody>{a.rows.map(row=>{const visible=row.partition!=='test'||reveal;return <tr key={row.id} data-row-id={row.id} data-partition={row.partition} data-x={row.x}
        data-y={visible?row.y:'hidden'} data-prediction={visible?row.prediction??'undefined':'hidden'} data-residual={visible?row.residual??'undefined':'hidden'} data-squared-error={visible?row.squaredError??'undefined':'hidden'}>
        <th scope="row">{row.id}</th><td>{row.partition}</td><td>{String(row.x)}</td><td>{visible?String(row.y):'Hidden'}</td><td>{visible?approx(row.prediction):'Hidden'}</td><td>{visible?approx(row.residual):'Hidden'}</td><td>{visible?approx(row.squaredError):'Hidden'}</td><td>{approx(row.baseline)}</td></tr>;})}</tbody></table></div>
    <label><input type="checkbox" checked={compareLeak} onChange={e=>setCompareLeak(e.currentTarget.checked)}/>Compare a deliberately leaked whole-target baseline</label>
    {compareLeak&&<div data-leak-comparison><p class="p01-caution">{a.leakage.reason} Honest mean {approx(a.baselineMean)}; leaked mean {approx(a.leakage.wholeMean)}.</p>
      {a.leakage.errors.filter(error=>error.partition!=='test'||reveal).map(error=><p>{error.partition}: honest MSE {approx(error.honestMSE)}; invalid leaked MSE <span data-leaked-partition={error.partition} data-number={error.leakedMSE??'undefined'}>{approx(error.leakedMSE)}</span>.</p>)}</div>}
    <ExperimentStatus experiment={{...experiment,seek:i=>{experiment.seek(i);setReveal(false);}}}/>
  </div>;
}
export default function CapacityStage({scope}:{scope:string}) {return <IdScope name={scope}><Experiment/></IdScope>;}
