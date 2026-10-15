import { useEffect,useRef } from 'preact/hooks';
import { useScopedId } from '../../ui/ids';
import { moveQuery,pointerQuery,deriveNeighborLesson,deriveMetricLesson } from './lesson';
import type { Point } from './model/neighbors';
type Plot=ReturnType<typeof deriveNeighborLesson>['plot']|ReturnType<typeof deriveMetricLesson>['plot'];
interface Props {
  plot:Plot;title:string;description:string;revision:number;epoch:{readonly current:number};onWidth(width:number):void;
  onMove(point:Point,speak:boolean):{speech:string};onAnnounce(message:string):void;onError(action:()=>void):void;
}
export default function QueryPlane({plot,title,description,revision,epoch,onWidth,onMove,onAnnounce,onError}:Props) {
  const svg=useRef<SVGSVGElement>(null),handle=useRef<SVGCircleElement>(null);
  const drag=useRef<{pointer:number;epoch:number;speech:string|null}|null>(null);
  const uid=useScopedId(),titleId=uid+'-title',descId=uid+'-desc',clipId=uid+'-clip',helpId=uid+'-help';
  useEffect(()=>{
    const node=svg.current!;const measure=()=>{const width=node.getBoundingClientRect().width;if(width>0)onWidth(width);};
    measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const held=drag.current;
    if(held&&held.epoch!==epoch.current){
      if(handle.current?.hasPointerCapture(held.pointer))handle.current.releasePointerCapture(held.pointer);
      drag.current=null;
    }
  },[revision]);
  function finish(pointer:number){
    if(handle.current?.hasPointerCapture(pointer))handle.current.releasePointerCapture(pointer);
    if(drag.current?.epoch===epoch.current&&drag.current.speech)onAnnounce('Drag finished. '+drag.current.speech);
    drag.current=null;
  }
  return <>
    <svg ref={svg} data-query-plane viewBox={plot.viewBox} role="group" aria-labelledby={titleId+' '+descId}
      data-origin={plot.origin} data-scale={plot.scale}>
      <title id={titleId}>{title}</title><desc id={descId}>{description}</desc>
      <defs><clipPath id={clipId}><rect {...plot.clip}/></clipPath></defs>
      <g class="p03-axes" aria-hidden="true">{plot.axes.map(line=><line {...line}/>)}</g>
      <g class="p03-ticks" aria-hidden="true" font-size={plot.fontSize}>{[...plot.ticks,...plot.labels].map(tick=><text x={tick.x} y={tick.y} text-anchor={tick.anchor}>{tick.text}</text>)}</g>
      <g clip-path={'url(#'+clipId+')'} aria-hidden="true">
        <path class="p03-contour" data-distance-contour d={plot.contour}/>
        {plot.points.filter(p=>p.selected).map(point=><line class="p03-neighbor-link" {...point.line}/>)}
        {plot.points.map(point=><g><path class={'p03-sample '+(point.selected?'is-selected':'')} data-sample-id={point.id} data-selected={String(point.selected)}
          data-cx={point.cx} data-cy={point.cy} d={point.glyph}><title>{point.name}</title></path>
          <text class="p03-point-label" font-size={plot.fontSize} x={point.label.x} y={point.label.y}>{point.label.text}</text></g>)}
      </g>
      <path class="p03-query" aria-hidden="true" d={plot.query.diamond}/>
      <circle ref={handle} class="p03-handle" data-query-handle data-query-x={plot.query.x} data-query-y={plot.query.y}
        cx={plot.query.cx} cy={plot.query.cy} r={plot.query.hitRadius} tabIndex={0} role="button" aria-label={plot.query.name} aria-describedby={helpId}
        onKeyDown={event=>{
          if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
            event.preventDefault();drag.current=null;onError(()=>{onMove(moveQuery(plot.query,event.key,event.shiftKey),true);});
          }
        }}
        onPointerDown={event=>{
          event.preventDefault();event.currentTarget.focus();drag.current={pointer:event.pointerId,epoch:epoch.current,speech:null};
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event=>{
          if(!drag.current||drag.current.epoch!==epoch.current||!event.currentTarget.hasPointerCapture(event.pointerId))return;
          const bounds=svg.current!.getBoundingClientRect();
          onError(()=>{
            const active=onMove(pointerQuery(event.clientX,event.clientY,bounds),false);
            if(drag.current)drag.current.speech=active.speech;
          });
        }}
        onPointerUp={event=>finish(event.pointerId)} onPointerCancel={event=>finish(event.pointerId)}/>
    </svg>
    <p class="p03-help" id={helpId}>Drag the hollow query diamond or focus it and use arrow keys: 0.1 per key, Shift for 0.5. Pointer movement snaps to a 0.1 lattice and stops at ±3. Numeric entries retain finer precision. Only the handle captures touch gestures; the page can scroll elsewhere.</p>
  </>;
}
