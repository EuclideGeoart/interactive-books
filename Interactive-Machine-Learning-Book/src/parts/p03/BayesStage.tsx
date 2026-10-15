import NumberField from '../../ui/NumberField';
import Inspector from '../../ui/Inspector';
import Formula from '../../ui/Formula';
import { IdScope } from '../../ui/ids';
import { BAYES_CANONICAL,bayesPreset,bayesTrace,editBayesClass } from './model/bayes';
import { deriveBayesLesson } from './lesson';
import { useExperiment,ExperimentStatus } from './experiment';
import './p03.css';
function Experiment() {
  const experiment=useExperiment(BAYES_CANONICAL,deriveBayesLesson),a=experiment.active,s=a.state;
  return <div data-p03 data-bayes data-alpha={s.alpha} data-exact-tie={String(a.tiedPosterior)} data-score-order={a.scoreOrder??'undefined'} data-prediction={a.prediction??'undefined'} data-frame-index={experiment.frames?experiment.index:0}
    data-observed={JSON.stringify(s.observed)} data-query={JSON.stringify(s.query)}>
    <header class="p03-heading"><h2>Prior × conditional evidence → posterior</h2><button onClick={experiment.reset}>Reset experiment</button></header>
    <p data-provenance>{a.provenance}. Counts summarize categorical training observations; prior weights are chosen separately and normalized.</p>
    <div class="p03-fields">
      <NumberField key={experiment.revision+':alpha'} label="Smoothing alpha" value={s.alpha} min={0} max={10} step={.1} onCommit={alpha=>experiment.accept({...s,alpha})}/>
      {([0,1] as const).map(j=><NumberField key={experiment.revision+':query'+j} label={'Feature '+(j+1)+' outcome (0 absent, 1 present)'} value={s.query[j]} min={0} max={1} step={1}
        onCommit={value=>experiment.accept({...s,query:j===0?[value,s.query[1]]:[s.query[0],value]})}/>)}
    </div>
    {([0,1] as const).map(j=><label class="p03-checkbox"><input type="checkbox" checked={s.observed[j]}
      onChange={e=>experiment.accept({...s,observed:j===0?[e.currentTarget.checked,s.observed[1]]:[s.observed[0],e.currentTarget.checked]})}/>
      Observe feature {j+1}; unchecking omits its likelihood factor</label>)}
    <div class="p03-class-controls">{s.classes.map(c=><fieldset><legend>Class {c.id} sufficient counts and prior</legend><div class="p03-fields">
      <NumberField key={experiment.revision+':prior'+c.id} label={'Class '+c.id+' prior weight'} value={c.priorWeight} min={0} max={10} step={.1}
        onCommit={priorWeight=>experiment.accept(editBayesClass(s,c.id,{priorWeight}))}/>
      <NumberField key={experiment.revision+':count'+c.id} label={'Class '+c.id+' observations'} value={c.count} min={0} max={20} step={1}
        onCommit={count=>experiment.accept(editBayesClass(s,c.id,{count}))}/>
      {([0,1] as const).map(j=><NumberField key={experiment.revision+':positive'+c.id+j} label={'Class '+c.id+' feature '+(j+1)+' positive count'} value={c.positive[j]} min={0} max={c.count} step={1}
        onCommit={value=>experiment.accept(editBayesClass(s,c.id,{positive:j===0?[value,c.positive[1]]:[c.positive[0],value]}))}/>)}
    </div></fieldset>)}</div>
    <div class="p03-actions">
      <button onClick={()=>experiment.replace(bayesPreset('zero-prior'),'Loaded zero prior. ')}>Zero class A prior</button>
      <button onClick={()=>experiment.replace(bayesPreset('impossible'),'Loaded impossible evidence. ')}>All-impossible evidence</button>
      <button onClick={()=>experiment.replace(bayesPreset('empty-class'),'Loaded missing estimate. ')}>Empty class without smoothing</button>
      <button onClick={()=>experiment.replace(bayesPreset('exact-tie'),'Loaded exact likelihood-product tie. ')}>Exact-score tie</button>
      <button onClick={()=>experiment.replace(bayesPreset('tiny'),'Loaded tiny positive likelihoods. ')}>Tiny positive likelihoods</button>
      <button onClick={()=>experiment.attempt(()=>experiment.replay(bayesTrace(s)))}>Replay evidence ledger</button>
    </div>
    <Formula {...a.formula}/>
    {a.reason&&<p class="p03-caution" data-undefined-reason>{a.reason}</p>}
    {a.evidenceUnderflow&&<p class="p03-caution" data-underflow>Positive raw scores and evidence rounded to zero by underflow. Finite log scores retain a defined normalized posterior.</p>}
    <dl class="p03-metrics">{a.scalars.map(value=><div><dt>{value.label}</dt><dd data-value={value.key} data-number={value.number??'undefined'}>{value.text}</dd></div>)}</dl>
    <div class="table-scroll" tabIndex={0} role="region" aria-label="Bayes likelihood and posterior ledger, scrollable"><table>
      <caption>Observed-feature factors only. −∞ denotes zero probability; Undefined marks an unavailable estimate or posterior, with the reason shown.</caption>
      <thead><tr><th scope="col">Class</th><th scope="col">Prior</th><th scope="col">Log prior</th><th scope="col">Feature 1 likelihood</th><th scope="col">Feature 2 likelihood</th>
        <th scope="col">Raw score</th><th scope="col">Log score</th><th scope="col">exp(ℓ − m)</th><th scope="col">Posterior</th></tr></thead>
      <tbody>{a.rows.map(row=><tr key={row.id} data-class-id={row.id} data-prior={row.prior??'undefined'} data-score={row.score??'undefined'}
        data-log-score={row.logScore??'undefined'} data-shifted={row.shifted??'undefined'} data-posterior={row.posterior??'undefined'}>
        <th scope="row">{row.id}</th><td>{row.text.prior}</td><td>{row.text.logPrior}</td>
        {row.features.map(f=><td data-feature-index={f.index} data-likelihood={f.likelihood??'undefined'} data-log-likelihood={f.logLikelihood??'undefined'} data-observed={String(f.observed)}>
          {f.text.likelihood}<br/>{f.text.count}<br/>log {f.text.logLikelihood}<br/>{f.observed?'Used':'Omitted'}{f.reason&&<p class="p03-help">{f.reason}</p>}</td>)}
        <td>{row.text.score}</td><td>{row.text.logScore}{row.reason&&<p class="p03-help">{row.reason}</p>}</td>
        <td>{row.text.shifted}</td><td data-value={'posterior-'+row.id} data-number={row.posterior??'undefined'}>{row.text.posterior}
          {row.posterior!==null&&<progress aria-label={'Class '+row.id+' posterior probability'} max={1} value={row.posterior}/>}</td>
      </tr>)}</tbody>
    </table></div>
    <p data-decision>Prediction: {a.prediction??'Undefined'}. {a.decisionExplanation}</p>
    <p class="p03-help">For each binary feature, smoothing adds alpha to its present count and alpha to its absent count. Displayed posteriors are approximate and can coincide for unequal model scores. Conditional independence is an assumption of this model; correlated empirical features remain possible.</p>
    <Inspector rows={a.inspector}/>
    <ExperimentStatus experiment={experiment}/>
  </div>;
}
export default function BayesStage({scope}:{scope:string}) {return <IdScope name={scope}><Experiment/></IdScope>;}
