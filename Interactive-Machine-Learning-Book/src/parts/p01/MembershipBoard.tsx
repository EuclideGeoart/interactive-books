import { useLayoutEffect,useRef } from 'preact/hooks';
import { useScopedId } from '../../ui/ids';
import { PARTITIONS,splitDrop,type Partition } from './model/splits';

export function partitionIndex(value:number):Partition {
  if(!Number.isInteger(value)||value<0||value>2)throw new RangeError('Partition index must be integer 0 (train), 1 (validation), or 2 (test).');
  return PARTITIONS[value]!;
}
export function keyboardPartition(current:Partition,key:string):Partition {
  const index=PARTITIONS.indexOf(current),next=index+(key==='ArrowRight'?1:key==='ArrowLeft'?-1:0);
  return PARTITIONS[Math.max(0,Math.min(2,next))]!;
}
interface Row {readonly id:string;readonly partition:Partition;readonly group?:string}
export default function MembershipBoard({rows,onAssign,onSelect,resetKey}:{rows:readonly Row[];onAssign(id:string,partition:Partition):void;onSelect?(id:string):void;resetKey:number}) {
  const root=useRef<HTMLDivElement>(null),drag=useRef<{id:string;pointer:number}|null>(null),helpId=useScopedId(),focusAfterMove=useRef<string|null>(null);
  useLayoutEffect(()=>{const id=focusAfterMove.current;focusAfterMove.current=null;drag.current=null;if(id){const handle=[...root.current!.querySelectorAll<HTMLButtonElement>('[data-sample-id]')].find(node=>node.dataset.sampleId===id);handle?.focus({preventScroll:true});}},[rows,resetKey]);
  function destination(x:number,y:number) {
    const zones=[...root.current!.querySelectorAll<HTMLElement>('[data-partition-zone]')].map(node=>{
      const box=node.getBoundingClientRect();
      return {partition:node.dataset.partitionZone as Partition,left:box.left,right:box.right,top:box.top,bottom:box.bottom};
    });
    return splitDrop(x,y,zones);
  }
  return <><p class="p01-help" id={helpId}>Drag an ID handle to a partition, or focus its handle and press Left/Right. The destination menu gives the same operation. Only handles capture touch gestures.</p>
    <div class="p01-partitions" ref={root}>{PARTITIONS.map(partition=><section class="p01-partition" data-partition-zone={partition} aria-label={`${partition} destination`}>
      <h3>{partition} · {rows.filter(row=>row.partition===partition).length}</h3>
      {rows.filter(row=>row.partition===partition).map(row=><div class="p01-membership" key={row.id}>
        <button class="p01-drag" data-sample-id={row.id} data-partition={row.partition} aria-label={`Assign ${row.id}, currently ${row.partition}`} aria-describedby={helpId}
          onKeyDown={e=>{
            if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=keyboardPartition(row.partition,e.key);if(next!==row.partition){focusAfterMove.current=row.id;onAssign(row.id,next);}}
          }}
          onClick={()=>onSelect?.(row.id)}
          onPointerDown={e=>{drag.current={id:row.id,pointer:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.focus();}}
          onPointerUp={e=>{
            const started=drag.current;drag.current=null;
            if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
            if(started?.pointer===e.pointerId){const next=destination(e.clientX,e.clientY);if(next&&next!==row.partition)onAssign(started.id,next);}
          }}
          onPointerCancel={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}>{row.id}</button>
        <label>Move {row.id}<select aria-label={`Destination for ${row.id}`} value={row.partition} onChange={e=>onAssign(row.id,e.currentTarget.value as Partition)}>{PARTITIONS.map(p=><option value={p}>{p}</option>)}</select></label>
        {row.group&&row.group!==row.id&&<small>Group {row.group}</small>}
      </div>)}
      {!rows.some(row=>row.partition===partition)&&<p>Empty partition.</p>}
    </section>)}</div></>;
}
