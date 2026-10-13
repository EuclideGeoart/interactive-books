import { IdScope } from '../../ui/ids';
import Inspector from '../../ui/Inspector';
import { TASK_CANONICAL,TASKS,type LearningTask } from './model/foundations';
import { deriveTaskLesson } from './lesson';
import { useExperiment,ExperimentStatus } from './experiment';
import './p01.css';
function Experiment() {
  const experiment=useExperiment(TASK_CANONICAL,deriveTaskLesson),a=experiment.active,s=a.state;
  return <div data-p01 data-task data-scenario={s.scenario} data-choice={s.choice} data-correct={String(a.correct)}>
    <header class="p01-heading"><h2>Decide what the target means</h2><button onClick={experiment.reset}>Reset experiment</button></header>
    <p class="p01-provenance">Six explicit hand-authored scenarios. This decision sheet fits no regressor, classifier or clustering model.</p>
    <div class="p01-fields"><label class="p01-picker">Problem<select value={s.scenario} onChange={e=>experiment.accept({...s,scenario:e.currentTarget.value})}>{TASKS.map(t=><option value={t.id}>{t.name}</option>)}</select></label>
      <label class="p01-picker">Learning task<select value={s.choice} onChange={e=>experiment.accept({...s,choice:e.currentTarget.value as LearningTask})}><option value="regression">Regression</option><option value="classification">Classification</option><option value="unsupervised">Unsupervised exploration</option></select></label></div>
    <p>{a.scenario.goal}</p><p data-decision>{a.correct?'Correct for this goal.':'Reconsider this goal.'} {a.reason}</p>
    <Inspector rows={a.inspector}/>
    <div class="table-scroll" tabIndex={0} role="region" aria-label="Problem observations, scrollable"><table><caption>Inspect features, recorded targets and whether the goal uses them.</caption>
      <thead><tr><th scope="col">Row</th><th scope="col">Feature 1</th><th scope="col">Feature 2</th><th scope="col">Recorded target</th><th scope="col">Used by goal?</th></tr></thead>
      <tbody>{a.scenario.features.map((values,i)=><tr><th scope="row">{i+1}</th><td>{values[0]}</td><td>{values[1]}</td><td>{a.scenario.targets?String(a.scenario.targets[i]):'Absent'}</td><td>{a.usesTarget?'Yes':'No'}</td></tr>)}</tbody></table></div>
    <p class="p01-help">Identical numeric codes can denote categories or measurements. Choose from the goal and semantics; storage dtype alone cannot decide.</p>
    <ExperimentStatus experiment={experiment}/>
  </div>;
}
export default function TaskStage({scope}:{scope:string}) {return <IdScope name={scope}><Experiment/></IdScope>;}
