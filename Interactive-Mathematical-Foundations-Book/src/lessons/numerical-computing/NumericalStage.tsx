import { useEffect,useLayoutEffect,useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import { useScopedId } from '../../ui/ids';
import { ParameterInput } from '../../ui/ParameterInput';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { TraceStepper } from '../../ui/TraceStepper';
import { cursorAt } from '../../platform/trace';
import { TableView } from '../calculus/CalculusStage';
import type { LessonConfig } from './view';
import './numerical.css';
function ExactInput({label,hint,value,onCommit}:{label:string;hint:string;value:string;onCommit:(text:string)=>string|null}) {
 const id=useScopedId(),[draft,setDraft]=useState(value),[error,setError]=useState<string|null>(null);
 useLayoutEffect(()=>{setDraft(value);setError(null);},[value]);
 const submit=()=>{const result=onCommit(draft);setError(result);};
 return <div class="param"><label for={id} class="param-label">{label}</label><div class="exact-entry"><input id={id} type="text" autocomplete="off" spellcheck={false} value={draft} aria-invalid={error?'true':undefined} aria-describedby={`${id}-hint${error?` ${id}-error`:''}`} onInput={e=>setDraft(e.currentTarget.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();submit();}if(e.key==='Escape'){setDraft(value);setError(null);}}} onChange={submit} /><button type="button" class="button" onClick={submit}>Apply</button></div><p class="param-hint" id={`${id}-hint`}>{hint}</p>{error&&<p id={`${id}-error`} class="param-error" role="alert">{error}</p>}</div>;
}
export function NumericalStage<S extends object>({chapter,worked=false,config}:{chapter:string;worked?:boolean;config:LessonConfig<S>}) {
 const lesson=useLesson(config.initial,config.derive),view=lesson.derived,state=lesson.state,uid=useScopedId();
 const [index,setIndex]=useState(0),[hydrated,setHydrated]=useState(false),[announcement,setAnnouncement]=useState(''),[error,setError]=useState<string|null>(null);useEffect(()=>setHydrated(true),[]);
 const commit=(next:S):string|null=>{try{const checked=config.derive(next);setError(null);lesson.set(next);setIndex(0);setAnnouncement(checked.description);return null;}catch(e){const message=e instanceof Error?e.message:'Invalid numerical input.';setError(message);return message;}};
 return <section class="stage stage-full numerical-stage" data-stage={`numerical-${worked?'worked-':''}${chapter}`} data-hydrated={hydrated} data-state={JSON.stringify(state)} data-metrics={JSON.stringify(view.metrics)} aria-labelledby={uid}>
  <header class="stage-head"><h2 id={uid}>{worked?'Worked example: ':''}{config.title}</h2><button type="button" class="button quiet" data-action="reset" disabled={lesson.isCanonical&&index===0} onClick={()=>commit(config.initial)}>Reset</button></header>
  {!worked&&<><div class="presets" role="group" aria-label="Choose a numerical example">{config.presets.map(p=><button type="button" data-preset={p.id} aria-pressed={JSON.stringify(state)===JSON.stringify(p.state)} onClick={()=>commit(p.state)}>{p.label}</button>)}</div>{config.choices?.map(c=><SegmentedControl key={String(c.key)} legend={c.label} name={`${uid}-${String(c.key)}`} options={c.options} value={String(state[c.key])} onChange={value=>commit({...state,[c.key]:value,...('bits' in state&&String(c.key)==='format'?{bits:''}:{})})} />)}</>}
  {error&&<p class="param-error" role="alert">{error}</p>}
  {view.bits&&<div class="bit-board" role="group" aria-label="Stored sign, exponent and significand bits">{view.bits.map(group=><div class={`bit-group bit-${group.group}`}><h3>{group.name}</h3><div class="bit-digits">{[...group.digits].map((bit,i)=>config.flip&&!worked?<button type="button" data-bit={group.offset+i} aria-label={`Flip ${group.group} bit ${i}; currently ${bit}`} onClick={()=>commit(config.flip!(state,group.offset+i,view))}>{bit}</button>:<span data-bit-value={group.offset+i}>{bit}</span>)}</div></div>)}</div>}
  {view.grid&&<div class="sparse-grid" role="group" aria-label="Dense matrix with zero-based row and column indices">{view.grid.map(c=><button type="button" data-cell={`${c.row},${c.col}`} data-nonzero={c.nonzero} aria-label={`Row ${c.row}, column ${c.col}, value ${c.value}${worked?'':'. Toggle structural zero and one.'}`} disabled={worked} onClick={()=>commit(config.toggle!(state,c.row,c.col))}><span>[{c.row},{c.col}]</span><strong>{c.value}</strong></button>)}</div>}
  <p class="verdict" data-verdict>{view.description}</p>
  <Inspector rows={view.rows} label="Evaluated numerical quantities" legend="= exact rationals or classifications · ≈ a formatted numerical display. Exceptional values retain their stated meaning." />
  <div class="formula-panel">{view.formulas.map((tex,i)=><FormulaScroll key={i} tex={tex} label={`${worked?'Worked':'Explorer'} ${config.title}, equation ${i+1}`} />)}</div>
  {view.tables.map((t,i)=><TableView key={i} table={t} label={`${worked?'Worked':'Explorer'} ${config.title}, table ${i+1}`} />)}
  <TraceStepper label={`${worked?'Worked':'Explorer'} ${config.title} replay`} frames={view.frames} cursor={cursorAt(view.frames.length,index)} onCursor={c=>setIndex(c.index)} autoplay describeFrame={f=>f.state.title} renderFrame={f=><><h3>{f.state.title}</h3><p data-trace-detail>{f.state.detail}</p><FormulaScroll tex={f.state.formula} label={`${worked?'Worked':'Explorer'} ${config.title}, selected intermediate equation`} />{f.state.table&&<TableView table={f.state.table} label={`${worked?'Worked':'Explorer'} ${config.title}, selected intermediate values`} />}</>} />
  {!worked&&<div class="stage-controls">{config.texts.map(c=><div data-param={String(c.key)}><ExactInput label={c.label} hint={c.hint} value={String(state[c.key])} onCommit={value=>commit({...state,[c.key]:value,...('bits' in state&&String(c.key)==='text'?{bits:''}:{})})} /></div>)}{config.numbers?.map(c=><ParameterInput key={String(c.key)} spec={c.spec} value={state[c.key] as number} grid={{kind:'free'}} onCommit={value=>commit({...state,[c.key]:value})} />)}</div>}
  <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
 </section>;
}
