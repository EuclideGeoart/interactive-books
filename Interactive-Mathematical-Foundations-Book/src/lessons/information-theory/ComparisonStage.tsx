import {useMemo,useState} from 'preact/hooks';
import {useLesson} from '../../ui/useLesson';
import {IdScope} from '../../ui/ids';
import {ParameterInput} from '../../ui/ParameterInput';
import StageFrame,{Table,Bars} from './StageFrame';
import {parameter} from './view';
import {CANONICAL,deriveComparisonLesson,type ComparisonChapter,type ComparisonState} from './comparison-lesson';
function Inner({chapter,worked}:{chapter:ComparisonChapter;worked:boolean}) {
  const derive=useMemo(()=>(s:ComparisonState)=>deriveComparisonLesson(chapter,s),[chapter]),lesson=useLesson(CANONICAL,derive),s=lesson.state,d=lesson.derived,[error,setError]=useState(''),[announcement,setAnnouncement]=useState('');
  const commit=(next:ComparisonState)=>{try{const v=derive(next);lesson.set(next);setError('');setAnnouncement(`${v.view.description}${announcement.endsWith('​')?'':'​'}`);}catch(e){setError((e as Error).message);}};
  return <StageFrame name={`${chapter}${worked?'-worked':''}`} view={d.view} reset={()=>commit(CANONICAL)} isCanonical={lesson.isCanonical} error={error} announcement={announcement}
    board={<><Table view={d.table} worked={worked}/><Bars items={d.bars} label={chapter==='cross'?`Actual cross-entropy contributions (${s.unit})`:`Actual signed KL contributions (${s.unit})`}/></>}
    controls={<><p class="prob-assumption">P is the fixed target (1/2,1/4,1/4). Edit Q’s nonnegative integer weights; Q is normalized openly. The one-hot option explicitly replaces P by an observed label.</p>
      <div class="info-weights">{s.weights.map((w,i)=><ParameterInput key={i} spec={parameter(`q${i}`,`Predicted class ${i+1} weight`,`w_{${i+1}}`,0,100,CANONICAL.weights[i]!)} value={w} grid={{kind:'lattice',step:1}} onCommit={v=>commit({...s,weights:s.weights.map((x,j)=>i===j?v:x)})}/>)}</div>
      <label class="info-select">Information unit<select aria-label="Information unit" value={s.unit} onChange={e=>commit({...s,unit:e.currentTarget.value as ComparisonState['unit']})}><option value="nats">Nats</option><option value="bits">Bits</option></select></label>
      {chapter==='cross'?<><label class="info-select">Target type<select aria-label="Target type" value={s.target} onChange={e=>commit({...s,target:e.currentTarget.value as ComparisonState['target']})}><option value="distribution">Distribution average</option><option value="one-hot">One observed true class</option></select></label><ParameterInput spec={parameter('target','True class index (0–2)','y',0,2,0)} value={s.targetIndex} grid={{kind:'lattice',step:1}} onCommit={targetIndex=>commit({...s,targetIndex})}/></>:<button type="button" data-action="direction" aria-pressed={s.reverse} onClick={()=>commit({...s,reverse:!s.reverse})}>{s.reverse?'Show P || Q':'Show Q || P'}</button>}
      <button type="button" data-preset="match" onClick={()=>commit({...s,weights:[2,1,1],target:'distribution'})}>Q equals P</button><button type="button" data-preset="zero" onClick={()=>commit({...s,weights:[0,1,1]})}>Zero predicted true-class mass</button><button type="button" data-preset="asymmetric" onClick={()=>commit({...s,weights:[1,1,6]})}>Unequal forward / reverse</button>
    </>}/>;
}
export default function ComparisonStage({chapter,worked=false}:{chapter:ComparisonChapter;worked?:boolean}) {return <IdScope name={`information-${chapter}${worked?'-worked':''}`}><Inner chapter={chapter} worked={worked}/></IdScope>;}
