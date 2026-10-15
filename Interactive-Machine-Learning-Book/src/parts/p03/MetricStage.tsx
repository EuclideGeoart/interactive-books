import { useMemo,useState } from 'preact/hooks';
import NumberField from '../../ui/NumberField';
import Inspector from '../../ui/Inspector';
import Formula from '../../ui/Formula';
import { IdScope,useScopedId } from '../../ui/ids';
import { METRIC_CANONICAL,metricTrace } from './model/metrics';
import { deriveMetricLesson,approx,QUERY_UI } from './lesson';
import { useExperiment,ExperimentStatus } from './experiment';
import QueryPlane from './QueryPlane';
import './p03.css';
function Experiment() {
  const [width,setWidth]=useState(320),uid=useScopedId();
  const derive=useMemo(()=>((state:typeof METRIC_CANONICAL)=>deriveMetricLesson(state,width)),[width]);
  const experiment=useExperiment(METRIC_CANONICAL,derive),a=experiment.active,s=a.state;
  return <div data-p03 data-metrics data-query-x={s.query.x} data-query-y={s.query.y} data-pair-distance={a.pairDistance} data-dimension={s.dimension}
    data-seed={s.seed} data-distribution={s.distribution} data-normalization={s.normalization} data-frame-index={experiment.frames?experiment.index:0}>
    <header class="p03-heading"><h2>A metric chooses which differences matter</h2><button onClick={experiment.reset}>Reset experiment</button></header>
    <div class="p03-fields">
      <label class="p03-picker">Metric<select value={s.metric} onChange={e=>experiment.accept({...s,metric:e.currentTarget.value as typeof s.metric})}>
        <option value="L1">L1 · Manhattan</option><option value="L2">L2 · Euclidean</option><option value="Lp">Lp · Minkowski</option></select></label>
      <NumberField key={experiment.revision+':p'} label="Minkowski power p (Lp only)" value={s.p} min={1} max={8} step={.5} onCommit={p=>experiment.accept({...s,p})}/>
      <NumberField key={experiment.revision+':qx'} label="Query x (metres)" value={s.query.x} {...QUERY_UI} onCommit={x=>experiment.accept({...s,query:{...s.query,x}})}/>
      <NumberField key={experiment.revision+':qy'} label="Query y (seconds)" value={s.query.y} {...QUERY_UI} onCommit={y=>experiment.accept({...s,query:{...s.query,y}})}/>
      <NumberField key={experiment.revision+':px'} label="Point x (metres)" value={s.point.x} {...QUERY_UI} onCommit={x=>experiment.accept({...s,point:{...s.point,x}})}/>
      <NumberField key={experiment.revision+':py'} label="Point y (seconds)" value={s.point.y} {...QUERY_UI} onCommit={y=>experiment.accept({...s,point:{...s.point,y}})}/>
      <NumberField key={experiment.revision+':sx'} label="x reference scale (metres)" value={s.scales[0]} min={.1} max={10} onCommit={v=>experiment.accept({...s,scales:[v,s.scales[1]]})}/>
      <NumberField key={experiment.revision+':sy'} label="y reference scale (seconds)" value={s.scales[1]} min={.1} max={10} onCommit={v=>experiment.accept({...s,scales:[s.scales[0],v]})}/>
    </div>
    <QueryPlane plot={a.plot} revision={experiment.dragRevision} epoch={experiment.dragEpoch} onWidth={setWidth}
      title="Scaled metric geometry in two feature coordinates" description={a.speech+' Hollow diamond: query q; square: comparison point z. Dashed contour is scaled distance one. Pair axes have metres and seconds; the lower batch has dimensionless coordinates.'}
      onMove={(query,speak)=>experiment.accept({...s,query},speak)} onAnnounce={experiment.announce} onError={experiment.attempt}/>
    <p class="p03-help">Dashed contour: scaled distance 1. Dotted segment: q to z. Coordinates have different units; dividing by their reference scales makes the displayed distance dimensionless.</p>
    <Formula {...a.formula}/>
    <fieldset><legend>Seeded dimension experiment · dimensionless coordinates, origin query</legend>
      <div class="p03-fields">
        <NumberField key={experiment.revision+':seed'} label="Simulation seed" value={s.seed} min={0} max={4294967295} step={1} onCommit={seed=>experiment.accept({...s,seed})}/>
        <NumberField key={experiment.revision+':dimension'} label="Dimension d" value={s.dimension} min={1} max={32} step={1} onCommit={dimension=>experiment.accept({...s,dimension})}/>
        <label class="p03-picker">Distribution<select value={s.distribution} onChange={e=>experiment.accept({...s,distribution:e.currentTarget.value as typeof s.distribution})}>
          <option value="cube">Uniform-coordinate cube model</option><option value="line">One-dimensional line embedded in d coordinates</option></select></label>
        <label class="p03-picker">Distance normalization<select value={s.normalization} onChange={e=>experiment.accept({...s,normalization:e.currentTarget.value as typeof s.normalization})}>
          <option value="raw">Raw Lp norm</option><option value="per-coordinate">Lp norm / d^(1/r)</option></select></label>
      </div>
      <button onClick={()=>experiment.attempt(()=>experiment.replay(metricTrace(s)))}>Replay dimensions</button>
    </fieldset>
    <p data-provenance>{a.provenance}. Two-point reference scales affect the upper diagram only; this simulation uses unit scales.</p>
    <svg data-distance-strip viewBox={a.strip.viewBox} role="img" aria-labelledby={uid+'-title '+uid+'-desc'}>
      <title id={uid+'-title'}>Observed distance spread in the seeded sample</title>
      <desc id={uid+'-desc'}>Each dot is one of 24 rows; horizontal position is its distance to the origin. Vertical offsets separate overlapping dots and do not encode another quantity. Vertical line is the sample mean.</desc>
      <line class="p03-axes" {...a.strip.axis}/><line class="p03-mean-line" {...a.strip.mean}/>
      {a.strip.points.map(point=><circle class="p03-distance-dot" cx={point.cx} cy={point.cy} r={point.r} data-distance-id={point.id} data-distance={point.distance}/>)}
      <g class="p03-ticks" font-size={a.strip.fontSize}>{a.strip.labels.map(label=><text x={label.x} y={label.y} text-anchor={label.anchor}>{label.text}</text>)}</g>
    </svg>
    <dl class="p03-metrics">{a.scalars.map(value=><div><dt>{value.label}</dt><dd data-value={value.key} data-number={value.number??'undefined'}>{value.text}</dd></div>)}</dl>
    <p class="p03-help">Compare dimensions with the same seed, metric and distribution. An observed reduction in relative spread depends on those choices. Adding zero coordinates to the embedded line changes no raw distance.</p>
    <Inspector rows={a.inspector}/>
    <div class="table-scroll" tabIndex={0} role="region" aria-label="Seeded features and distances, scrollable"><table>
      <caption>All 24 active rows; deterministic coordinate prefixes. Sample vectors are columns; the batch stores one sample per row.</caption>
      <thead><tr><th scope="col">ID</th><th scope="col">Feature row</th><th scope="col">Raw distance</th><th scope="col">Displayed distance</th></tr></thead>
      <tbody>{a.rows.map(row=><tr key={row.id} data-dimension-row={row.id} data-features={JSON.stringify(row.features)} data-raw-distance={row.raw} data-distance={row.distance}>
        <th scope="row">{row.id}</th><td>{row.features.map(String).join(', ')}</td><td>{approx(row.raw)}</td><td>{approx(row.distance)}</td></tr>)}</tbody>
    </table></div>
    <ExperimentStatus experiment={experiment}/>
  </div>;
}
export default function MetricStage({scope}:{scope:string}) {return <IdScope name={scope}><Experiment/></IdScope>;}
