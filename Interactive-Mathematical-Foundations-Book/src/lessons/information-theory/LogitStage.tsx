import {useMemo,useState} from 'preact/hooks';
import {useLesson} from '../../ui/useLesson';
import {IdScope} from '../../ui/ids';
import {ParameterInput} from '../../ui/ParameterInput';
import StageFrame,{Table,Bars} from './StageFrame';
import {parameter} from './view';
import {CANONICAL,deriveLogitLesson,type LogitChapter,type LogitState} from './logit-lesson';
function Inner({chapter,worked}:{chapter:LogitChapter;worked:boolean}) {
  const derive=useMemo(()=>(s:LogitState)=>deriveLogitLesson(chapter,s),[chapter]),lesson=useLesson(CANONICAL,derive),s=lesson.state,d=lesson.derived,[error,setError]=useState(''),[announcement,setAnnouncement]=useState('');
  const commit=(next:LogitState)=>{try{const v=derive(next);lesson.set(next);setError('');setAnnouncement(`${v.view.description}${announcement.endsWith('​')?'':'​'}`);}catch(e){setError((e as Error).message);}};
  return <StageFrame name={`${chapter}${worked?'-worked':''}`} view={d.view} reset={()=>commit(CANONICAL)} isCanonical={lesson.isCanonical} error={error} announcement={announcement}
    board={<><Table view={d.table}/>{!!d.bars.length&&<Bars items={d.bars} label="Stable output probabilities"/>}<p class="prob-assumption">Logits are scores, not probabilities. Input +∞ and NaN are rejected; an explicit −∞ excludes a class. All −∞ has no normalizable mass. Finite logits can still have numerical underflow.</p></>}
    controls={<><div class="info-weights">{s.logits.map((z,i)=>Number.isFinite(z)&&Math.abs(z)<=1000?<ParameterInput key={i} spec={parameter(`z${i}`,`Class ${i+1} logit`,`z_{${i+1}}`,-1000,1000,CANONICAL.logits[i]??0,.5,2)} value={z} grid={{kind:'free'}} onCommit={v=>commit({...s,logits:s.logits.map((x,j)=>i===j?v:x)})}/>:<p key={i}>Class {i+1} uses the explicit boundary preset shown in the table.</p>)}</div>
      <ParameterInput spec={parameter('shift','Common finite shift','c',-1000,1000,0,10,2)} value={s.shift} grid={{kind:'free'}} onCommit={shift=>commit({...s,shift})}/>
      {!!s.logits.length&&<ParameterInput spec={parameter('selected','Selected class index','y',0,s.logits.length-1,0)} value={s.selected} grid={{kind:'lattice',step:1}} onCommit={selected=>commit({...s,selected})}/>}
      <button type="button" data-preset="extreme" onClick={()=>commit({...s,logits:[1000,0,-1000],shift:0,selected:2})}>Overflow + tiny probability</button><button type="button" data-preset="low" onClick={()=>commit({...s,logits:[-1000,-1001,-1002],shift:0,selected:0})}>Naive denominator underflows</button><button type="button" data-preset="equal" onClick={()=>commit({...s,logits:[0,0,0],shift:0,selected:0})}>Equal logits</button>
      {chapter==='stability'&&<><button type="button" data-preset="excluded" onClick={()=>commit({...s,logits:[0,-Infinity,1],shift:0,selected:1})}>One excluded class</button><button type="button" data-preset="all-negative" onClick={()=>commit({...s,logits:[-Infinity,-Infinity],shift:0,selected:0})}>All −∞</button><button type="button" data-preset="positive-infinity" onClick={()=>commit({...s,logits:[Infinity,0],shift:0,selected:0})}>Reject +∞</button><button type="button" data-preset="nan" onClick={()=>commit({...s,logits:[NaN,0],shift:0,selected:0})}>Reject NaN</button><button type="button" data-preset="empty" onClick={()=>commit({...s,logits:[],shift:0,selected:0})}>Empty vector</button><button type="button" data-preset="huge" onClick={()=>commit({...s,logits:[1e308,1e308],shift:0,selected:0})}>Huge equal finite logits</button></>}
    </>}/>;
}
export default function LogitStage({chapter,worked=false}:{chapter:LogitChapter;worked?:boolean}) {return <IdScope name={`information-${chapter}${worked?'-worked':''}`}><Inner chapter={chapter} worked={worked}/></IdScope>;}
