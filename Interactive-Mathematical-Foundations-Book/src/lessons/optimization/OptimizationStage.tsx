import { useEffect, useState, useMemo, useRef } from 'preact/hooks';
import { IdScope, useScopedId } from '../../ui/ids';
import { useLesson } from '../../ui/useLesson';
import { ParameterInput } from '../../ui/ParameterInput';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { TraceStepper } from '../../ui/TraceStepper';
import { cursorAt } from '../../platform/trace';
import { SceneView, TableView } from '../calculus/CalculusStage';
import { CANONICALS, TITLES, SPECS, presetsFor, fieldsFor, deriveOptimization, optimizationTrace, type Chapter, type OptimizationState } from './optimization-lesson';
import './optimization.css';

function Inner({chapter,worked=false}:{chapter:Chapter;worked?:boolean}) {
  const canonical=CANONICALS[chapter], lesson=useLesson(canonical,optimizationTrace), state=lesson.state;
  const latest=useRef(state);latest.current=state;
  const [index,setIndex]=useState(0),[announcement,setAnnouncement]=useState(''),[hydrated,setHydrated]=useState(false);
  const uid=useScopedId(),hint=useScopedId();
  useEffect(()=>setHydrated(true),[]);
  const view=useMemo(()=>deriveOptimization(state,chapter,index,lesson.derived),[state,chapter,index,lesson.derived]),cursor=cursorAt(view.frames.length,index);
  const commit=(next:OptimizationState)=>{lesson.set(next);setIndex(0);setAnnouncement(deriveOptimization(next,chapter).verdict);};
  const move=(fields:Readonly<Record<string,number>>)=>{latest.current={...latest.current,...fields};lesson.set(latest.current);setIndex(0);};
  const fields=fieldsFor(state,chapter);
  return <section class="stage stage-full calculus-stage optimization-stage" data-stage={`optimization-${worked?'worked-':''}${chapter}`} data-hydrated={hydrated} data-state={JSON.stringify(state)} data-metrics={JSON.stringify(view.metrics)} aria-labelledby={uid}>
    <header class="stage-head"><h2 id={uid}>{worked?'Worked example: ':''}{TITLES[chapter]}</h2><button type="button" class="button quiet" data-action="reset" disabled={lesson.isCanonical&&index===0} onClick={()=>commit(canonical)}>Reset</button></header>
    {!worked&&<div class="presets" role="group" aria-label="Choose an optimization example">{presetsFor(chapter).map(p=><button type="button" key={p.id} data-preset={p.id} aria-pressed={Object.entries(p.state).every(([key,value])=>state[key as keyof OptimizationState]===value)} onClick={()=>commit(p.state)}>{p.label}</button>)}</div>}
    <div class="stage-grid"><div class="calc-scenes multiple">{view.scenes.map(s=><SceneView key={s.id} s={worked?{...s,handles:[]}:s} hint={hint} specs={SPECS} onMove={move} onCommit={()=>setAnnouncement(deriveOptimization(latest.current,chapter).verdict)} />)}</div><Inspector rows={view.rows} label="Evaluated optimization quantities" legend="≈ binary64 calculation · = analytic classification. Replay selects the same evaluated step in every view." /></div>
    <p class="verdict" data-verdict>{view.verdict}</p>
    <div class="formula-panel" role="group" aria-label="Evaluated optimizer formulas">{view.formulas.map((tex,i)=><FormulaScroll key={i} tex={tex} label={`${worked?'Worked example':'Explorer'}: ${TITLES[chapter]}, formula ${i+1}`} />)}</div>
    {view.table&&<TableView table={view.table} label={`${worked?'Worked example':'Explorer'}: ${TITLES[chapter]} step table`} />}
    {view.batchTable&&<TableView table={view.batchTable} label={`${worked?'Worked example':'Explorer'} selected example calculations`} />}
    <TraceStepper label={`${worked?'Worked example':'Explorer'} optimization replay`} frames={view.frames} cursor={cursor} onCursor={c=>setIndex(c.index)} autoplay describeFrame={f=>f.state.title} renderFrame={f=><><h3>{f.state.title}</h3><p data-trace-detail>{f.state.detail}</p><FormulaScroll tex={f.state.formula} label={`${worked?'Worked example':'Explorer'}: ${TITLES[chapter]}, selected step equation`} /></>} />
    {!worked&&<div class="stage-controls">{fields.map(field=><ParameterInput key={field} spec={SPECS[field as keyof typeof SPECS]} value={state[field as keyof OptimizationState] as number} grid={{kind:'free'}} onCommit={value=>commit({...state,[field]:value})} />)}</div>}
    <span id={hint} hidden>{view.hint}</span><p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
  </section>;
}
export default function OptimizationStage(props:{chapter:Chapter;worked?:boolean}) {return <IdScope name={`optimization-${props.chapter}${props.worked?'-worked':''}`}><Inner {...props} /></IdScope>;}
