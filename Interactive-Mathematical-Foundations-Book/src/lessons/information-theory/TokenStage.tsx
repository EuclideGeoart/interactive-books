import {useState} from 'preact/hooks';
import {useLesson} from '../../ui/useLesson';
import {IdScope} from '../../ui/ids';
import {ParameterInput} from '../../ui/ParameterInput';
import {VOCABULARY,type TokenPosition} from '../../math/information-theory/tokens';
import StageFrame,{Table,Bars} from './StageFrame';
import {parameter} from './view';
import {CANONICAL,deriveTokenLesson,type TokenState} from './token-lesson';
function Inner({worked}:{worked:boolean}) {
  const lesson=useLesson(CANONICAL,deriveTokenLesson),s=lesson.state,d=lesson.derived,p=s.positions[s.selected]!,[error,setError]=useState(''),[announcement,setAnnouncement]=useState('');
  const commit=(next:TokenState)=>{try{const v=deriveTokenLesson(next);lesson.set(next);setError('');setAnnouncement(`${v.view.description}${announcement.endsWith('​')?'':'​'}`);}catch(e){setError((e as Error).message);}};
  const changePosition=(next:TokenPosition)=>commit({...s,positions:s.positions.map((x,i)=>i===s.selected?next:x)});
  return <StageFrame name={`tokens${worked?'-worked':''}`} view={d.view} reset={()=>commit(CANONICAL)} isCanonical={lesson.isCanonical} error={error} announcement={announcement}
    board={<><div class="info-position" role="group" aria-label="Selected sequence position">{s.positions.map((_,i)=><button key={i} type="button" data-position={i} aria-pressed={s.selected===i} onClick={()=>commit({...s,selected:i})}>Position {i+1}</button>)}</div><Table view={d.table} worked={worked}/><Bars items={d.bars} label="This position’s actual vocabulary probabilities"/><Table view={d.sequence} worked={worked}/><p class="prob-assumption">Vocabulary: the, cat, sat, &lt;eos&gt;. These are explicit toy labels and supplied scores; no tokenizer or transformer is running. The mean denominator counts only unmasked positions.</p></>}
    controls={<><div class="info-weights">{p.logits.map((z,i)=><ParameterInput key={`${s.selected}-${i}`} spec={parameter(`z${i}`,`${VOCABULARY[i]} logit`,`z_{${i+1}}`,-1000,1000,CANONICAL.positions[s.selected]!.logits[i]!,.5,2)} value={z} grid={{kind:'free'}} onCommit={v=>changePosition({...p,logits:p.logits.map((x,j)=>j===i?v:x)})}/>)}</div>
      <label class="info-select">Target token<select aria-label="Target token" value={String(p.target)} onChange={e=>changePosition({...p,target:Number(e.currentTarget.value)})}>{VOCABULARY.map((token,i)=><option key={token} value={String(i)}>{token}</option>)}</select></label>
      <label class="info-mask"><input type="checkbox" aria-label="Ignore selected position" checked={p.ignored} onChange={e=>changePosition({...p,ignored:e.currentTarget.checked})}/>Ignore selected position</label>
      <button type="button" data-preset="underflow" onClick={()=>changePosition({...p,logits:[1000,0,-1000,-1000],target:3,ignored:false})}>Tiny target probability, finite loss</button><button type="button" data-preset="all-masked" onClick={()=>commit({...s,positions:s.positions.map(x=>({...x,ignored:true}))})}>Mask every position</button><button type="button" data-preset="unmask" onClick={()=>commit({...s,positions:s.positions.map(x=>({...x,ignored:false}))})}>Include every position</button>
    </>}/>;
}
export default function TokenStage({worked=false}:{worked?:boolean}) {return <IdScope name={`information-tokens${worked?'-worked':''}`}><Inner worked={worked}/></IdScope>;}
