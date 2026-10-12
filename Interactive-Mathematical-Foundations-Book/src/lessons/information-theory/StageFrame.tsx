import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { cursorAt } from '../../platform/trace';
import { Inspector } from '../../ui/Inspector';
import { FormulaScroll } from '../../ui/FormulaScroll';
import { TraceStepper } from '../../ui/TraceStepper';
import { useScopedId } from '../../ui/ids';
import type { ProbabilityView, TableView, BarView } from './view';
import '../probability/probability.css';
import './information-theory.css';
export function Table({view}:{view:TableView}) {
  return <div class="prob-table-wrap" role="region" aria-label={view.caption} tabIndex={0}><table class="prob-table info-table"><caption>{view.caption}</caption><thead><tr>{view.columns.map(c=><th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{view.rows.map((row,i)=><tr key={i} data-pipeline-row={i}>{row.map((v,j)=>j===0?<th scope="row" key={j}>{v}</th>:<td key={j}>{v}</td>)}</tr>)}</tbody></table></div>;
}
export function Bars({items,label}:{items:readonly BarView[];label:string}) {
  return <figure class="info-bars"><figcaption>{label}</figcaption><ol>{items.map((item,i)=><li key={i}><span>{item.label}: <strong>{item.text}</strong></span><div class="prob-track" aria-hidden="true"><span data-contribution={i} data-value={item.value} style={{width:`${item.width}%`}} /></div></li>)}</ol><p class="prob-axis-caption">Bar length = absolute contribution on a shared scale; sign and infinities appear in the labels.</p></figure>;
}
export default function StageFrame({name,view,controls,board,reset,isCanonical,announcement,error}: {
  name:string;view:ProbabilityView;controls:ComponentChildren;board:ComponentChildren;reset():void;isCanonical:boolean;announcement:string;error?:string;
}) {
  const uid=useScopedId(),[hydrated,setHydrated]=useState(false),[cursor,setCursor]=useState(cursorAt(view.trace.length));
  useEffect(()=>setHydrated(true),[]); useEffect(()=>setCursor(cursorAt(view.trace.length)),[view.trace]);
  const title=`${name.endsWith('-worked')?'Worked example: ':''}${view.title}`;
  return <section class="stage stage-full probability-stage information-stage" data-stage={`information-${name}`} data-hydrated={hydrated} aria-labelledby={`${uid}-title`}>
    <header class="stage-head"><h2 id={`${uid}-title`}>{title}</h2><button type="button" class="button quiet" data-action="reset" disabled={isCanonical} onClick={reset}>Reset</button></header>
    <div class="stage-body"><div class="prob-board">{board}<p class="prob-description" data-description>{view.description}</p></div><Inspector rows={view.rows} label={`${title}: inspector`} legend="= exact rational or mathematical boundary · ≈ approximate binary64 evaluation" /></div>
    <div class="prob-controls">{controls}</div>{error&&<p role="alert" class="prob-error">{error}</p>}
    <p data-verdict class="prob-verdict">{view.verdict}</p>
    <div class="prob-formulas">{view.formulas.map((tex,i)=><FormulaScroll key={i} tex={tex} label={`${title}: equation ${i+1}`} />)}</div>
    <TraceStepper label={`${title}: mathematical replay`} frames={view.trace} cursor={cursorAt(view.trace.length,cursor.index)} onCursor={setCursor} autoplay describeFrame={f=>f.state.title} renderFrame={f=><><p class="trace-label">{f.state.title}</p><p data-trace-detail>{f.state.detail}</p><FormulaScroll tex={f.state.formula} label={`${title}: selected replay equation`} /></>} />
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{announcement}</p>
  </section>;
}
