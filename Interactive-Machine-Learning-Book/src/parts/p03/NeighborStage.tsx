import { useMemo,useState } from 'preact/hooks';
import NumberField from '../../ui/NumberField';
import Inspector from '../../ui/Inspector';
import Formula from '../../ui/Formula';
import { IdScope } from '../../ui/ids';
import { NEIGHBOR_CANONICAL,neighborPreset,neighborTrace } from './model/neighbors';
import { deriveNeighborLesson,QUERY_UI } from './lesson';
import { useExperiment,ExperimentStatus } from './experiment';
import QueryPlane from './QueryPlane';
import './p03.css';
function Experiment() {
  const [width,setWidth]=useState(320);
  const derive=useMemo(()=>((state:typeof NEIGHBOR_CANONICAL)=>deriveNeighborLesson(state,width)),[width]);
  const experiment=useExperiment(NEIGHBOR_CANONICAL,derive),a=experiment.active,s=a.state;
  return <div data-p03 data-neighbors data-query-x={s.query.x} data-query-y={s.query.y} data-k={s.k} data-metric={s.metric}
    data-selected-ids={JSON.stringify(a.selectedIds)} data-classification={a.classification??'undefined'} data-regression={a.regression??'undefined'} data-frame-index={experiment.frames?experiment.index:0}>
    <header class="p03-heading"><h2>Query → distances → neighbors → prediction</h2><button onClick={experiment.reset}>Reset experiment</button></header>
    <p data-provenance>{s.provenance}. Synthetic examples with dimensionless feature coordinates; targets are separate numerical outcomes.</p>
    <div class="p03-fields">
      <NumberField key={experiment.revision+':x'} label="Query x" value={s.query.x} {...QUERY_UI} onCommit={x=>experiment.accept({...s,query:{...s.query,x}})}/>
      <NumberField key={experiment.revision+':y'} label="Query y" value={s.query.y} {...QUERY_UI} onCommit={y=>experiment.accept({...s,query:{...s.query,y}})}/>
      <NumberField key={experiment.revision+':k'} label="Neighbor count k" value={s.k} min={1} max={64} step={1} onCommit={k=>experiment.accept({...s,k})}/>
      <label class="p03-picker">Metric<select value={s.metric} onChange={e=>experiment.accept({...s,metric:e.currentTarget.value as typeof s.metric})}>
        <option value="L1">L1 · Manhattan</option><option value="L2">L2 · Euclidean</option><option value="Lp">Lp · Minkowski</option></select></label>
      <NumberField key={experiment.revision+':p'} label="Minkowski power p (Lp only)" value={s.p} min={1} max={8} step={.5} onCommit={p=>experiment.accept({...s,p})}/>
      <NumberField key={experiment.revision+':scale-x'} label="Feature x reference scale" value={s.scales[0]} min={.1} max={10} onCommit={v=>experiment.accept({...s,scales:[v,s.scales[1]]})}/>
      <NumberField key={experiment.revision+':scale-y'} label="Feature y reference scale" value={s.scales[1]} min={.1} max={10} onCommit={v=>experiment.accept({...s,scales:[s.scales[0],v]})}/>
    </div>
    <div class="p03-actions">
      <button onClick={()=>experiment.replace(neighborPreset('duplicates'),'Loaded conflicting duplicate. ')}>Conflicting duplicates</button>
      <button onClick={()=>experiment.replace(neighborPreset('ties'),'Loaded distance and vote tie. ')}>Distance and vote ties</button>
      <button onClick={()=>experiment.attempt(()=>experiment.replay(neighborTrace(s)))}>Replay query path</button>
    </div>
    <QueryPlane plot={a.plot} revision={experiment.dragRevision} epoch={experiment.dragEpoch} onWidth={setWidth}
      title="k-nearest neighbor query landscape"
      description={a.speech+' Hollow diamond: query. Squares: A; triangles: B. Filled markers and dotted links identify selected neighbors. Dashed contour reaches the kth distance.'}
      onMove={(query,speak)=>experiment.accept({...s,query},speak)} onAnnounce={experiment.announce} onError={experiment.attempt}/>
    <p class="p03-help">□ A · △ B · ◇ Query. Filled markers and dotted links identify selected neighbors. Equal x/y drawing scale; clipped contour portions remain defined by the distance table.</p>
    <dl class="p03-metrics">{a.scalars.map(value=><div><dt>{value.label}</dt><dd data-value={value.key} data-number={value.number??'undefined'}>{value.text}</dd></div>)}</dl>
    <p data-votes>Votes: A {a.votes[0]!.count} · B {a.votes[1]!.count}. {a.voteExplanation}</p>
    {a.reason&&<p class="p03-caution" data-undefined-reason>{a.reason}</p>}
    {a.boundaryTie&&<p class="p03-caution" data-boundary-tie>Equal distances straddle the kth position. ID ordering selects which tied row enters; all rows remain visible.</p>}
    {a.duplicateIds.length>0&&<p class="p03-caution" data-duplicates>Coincident observations: {a.duplicateIds.join(', ')}. Their distinct IDs remain separate votes and regression values.</p>}
    <Formula {...a.formula}/><Inspector rows={a.inspector}/>
    <div class="table-scroll" tabIndex={0} role="region" aria-label="Neighbor distance ranking, scrollable"><table>
      <caption>One active query; increasing distance, then UTF-16 ID order. Given coordinates and targets retain full decimal text.</caption>
      <thead><tr><th scope="col">Rank</th><th scope="col">ID</th><th scope="col">x</th><th scope="col">y</th><th scope="col">Distance</th><th scope="col">Selected</th><th scope="col">Class</th><th scope="col">Target</th></tr></thead>
      <tbody>{a.tableRows.map(row=><tr key={row.id} data-row-id={row.id} data-rank={row.rank} data-distance={row.distance} data-selected={String(row.selected)}
        data-x={row.x} data-y={row.y} data-category={row.category} data-target={row.target}>
        <td>{row.rank}</td><th scope="row">{row.id}</th><td>{row.text.x}</td><td>{row.text.y}</td><td>{row.text.distance}</td>
        <td>{row.selected?'Yes':'No'}</td><td>{row.category}</td><td>{row.text.target}</td></tr>)}</tbody>
    </table></div>
    <ExperimentStatus experiment={experiment}/>
  </div>;
}
export default function NeighborStage({scope}:{scope:string}) {return <IdScope name={scope}><Experiment/></IdScope>;}
