import { useState } from 'preact/hooks';
import NumberField from '../../ui/NumberField';
import Inspector from '../../ui/Inspector';
import { IdScope } from '../../ui/ids';
import { FEATURE_CANONICAL, FEATURE_COLUMNS, featureTargetKind, type FeatureState } from './model/foundations';
import { deriveFeatureLesson } from './lesson';
import { useExperiment, ExperimentStatus } from './experiment';
import './p01.css';
function Experiment() {
  const experiment=useExperiment(FEATURE_CANONICAL,deriveFeatureLesson),a=experiment.active,s=a.state;
  const [selected,setSelected]=useState('r1'),[column,setColumn]=useState(0);
  const row=a.rows.find(r=>r.id===selected)??a.rows[0]!,j=Math.min(column,s.featureCount-1),metadata=FEATURE_COLUMNS[j]!;
  function edit(value:number) {const next={...s,samples:s.samples.map(r=>r.id===row.id?{...r,values:r.values.map((v,k)=>k===j?value:v)}:r)};const derived=deriveFeatureLesson(next),changed=derived.rows.find(r=>r.id===row.id)!;experiment.accept(next,`Row ${changed.id}, ${derived.columns[j]!.name} ${changed.values[j]} ${derived.columns[j]!.unit}. `);}
  function target(target:number|string) {const next={...s,samples:s.samples.map(r=>r.id===row.id?{...r,target}:r)};const derived=deriveFeatureLesson(next),changed=derived.rows.find(r=>r.id===row.id)!;experiment.accept(next,`Row ${changed.id}, target ${changed.target}. `);}
  return <div data-p01 data-features data-n={s.sampleCount} data-d={s.featureCount} data-target-kind={s.targetKind}>
    <header class="p01-heading"><h2>Inspect the row and column contract</h2><button onClick={()=>{experiment.reset();setSelected('r1');setColumn(0);}}>Reset experiment</button></header>
    <p class="p01-provenance">Six hand-authored study records; illustrative scores and categories, not measured learning outcomes. Switching target type loads that type’s preset targets.</p>
    <div class="p01-fields">
      <NumberField key={`${experiment.revision}:n`} label="Sample count n" value={s.sampleCount} min={1} max={6} step={1} onCommit={sampleCount=>experiment.accept({...s,sampleCount})}/>
      <NumberField key={`${experiment.revision}:d`} label="Feature count d" value={s.featureCount} min={1} max={3} step={1} onCommit={featureCount=>experiment.accept({...s,featureCount})}/>
      <label class="p01-picker">Target meaning<select value={s.targetKind} onChange={e=>experiment.accept(featureTargetKind(s,e.currentTarget.value as FeatureState['targetKind']))}>
        <option value="quantity">Quantity · score</option><option value="category">Category · ready/practice</option><option value="none">No observed target</option></select></label>
      <label class="p01-picker">Selected row<select value={row.id} onChange={e=>setSelected(e.currentTarget.value)}>{a.rows.map(r=><option value={r.id}>{r.id}</option>)}</select></label>
      <label class="p01-picker">Selected feature<select value={j} onChange={e=>setColumn(Number(e.currentTarget.value))}>{a.columns.map((c,k)=><option value={k}>{c.name} · {c.unit}</option>)}</select></label>
      <NumberField key={`${experiment.revision}:${row.id}:${j}`} label={`${metadata.name} (${metadata.unit})`} value={row.values[j]!} min={0} max={metadata.max} step={metadata.integer?1:.1} onCommit={edit}/>
      {s.targetKind==='quantity'&&<NumberField key={`${experiment.revision}:${row.id}:target`} label="Target score" value={row.target as number} min={0} max={20} onCommit={target}/>}
      {s.targetKind==='category'&&<label class="p01-picker">Target category<select value={row.target as string} onChange={e=>target(e.currentTarget.value)}><option>ready</option><option>practice</option></select></label>}
    </div>
    <Inspector rows={a.inspector}/>
    {a.targetReason&&<p class="p01-caution">{a.targetReason}</p>}
    <div class="table-scroll" tabIndex={0} role="region" aria-label="Editable feature and target matrix, scrollable"><table><caption>X has sample rows and feature columns. Values shown here are exact input numbers.</caption>
      <thead><tr><th scope="col">Sample ID</th>{a.columns.map(c=><th scope="col">{c.name}<br/>{c.unit} · {c.integer?'integer':'real'}</th>)}<th scope="col">Target · {s.targetKind}</th></tr></thead>
      <tbody>{a.rows.map(r=><tr data-row-id={r.id} key={r.id}><th scope="row"><button onClick={()=>setSelected(r.id)} aria-pressed={row.id===r.id}>{r.id}</button></th>
        {a.X[a.rows.indexOf(r)]!.map((v,k)=><td data-feature-index={k} data-number={v}>{String(v)}</td>)}<td>{r.target===null?'Absent':String(r.target)}</td></tr>)}</tbody></table></div>
    <p class="p01-help">Changing n or d selects stored rows or columns without fabricating targets or deleting hidden values. Count features accept integers. Weight shapes describe a compatible predictor, not a fitted model.</p>
    <ExperimentStatus experiment={experiment}/>
  </div>;
}
export default function FeatureStage({scope}:{scope:string}) {return <IdScope name={scope}><Experiment/></IdScope>;}
