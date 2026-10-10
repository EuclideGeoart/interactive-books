import type { LabAdapter } from '../../components/controls/lab-types';
import { escapeHtml, referenceArrow } from '../../components/visualizers/primitives';
import { hashCell, hashInspector, hashSvg } from '../hashing/presentation';
import { teachingHash } from '../hashing/hash';
import type { HashEvent } from '../open-addressing/model';
import { robinState, robinTrace, robinInvariants, robinMetrics, type RobinState, type RobinOperation } from './model';
export const robinHoodAdapter: LabAdapter<RobinState,HashEvent>={
 build(op,inputs){const keys=String(inputs.get('keys')??'a,b,i').split(',').map(x=>x.trim()).filter(Boolean);return robinTrace(op as RobinOperation,robinState(keys,Number(inputs.get('capacity')??8)),String(inputs.get('key')??'q'),Number(inputs.get('value')??9),Number(inputs.get('requested')??16));},
 draw(s,id,view,selected){
  const width=Math.max(700,Math.max(s.slots.length,s.staging.length)*196+40),m=robinMetrics(s);
  const strip=`<div class="hash-state-strip"><span>${view==='memory'?'Slot storage · no pointer stability or byte-offset promise':'Robin Hood · exact distances, no tombstones'}</span><span>${escapeHtml(s.incoming?`${s.staging.length?'REPLACEMENT INCOMING':'INCOMING'} ${s.incoming.key} = ${s.incoming.value} · home ${teachingHash(s.incoming.key)%(s.staging.length||s.slots.length)} · distance ${s.incoming.distance}`:'INCOMING: none')}</span></div>`;
  let out='';
  s.slots.forEach((slot,i)=>{out+=hashCell({id:String(i),index:`slot ${i}`,x:20+i*196,y:105,status:slot.occupied?'occupied':'empty',selected:selected===String(i),active:s.active===i,lines:slot.occupied?[`${slot.key} = ${slot.value}`,`home ${teachingHash(slot.key)%s.slots.length} · d ${slot.distance}`]:['EMPTY']});});
  if(s.active!==null)out+=referenceArrow(`M${110+s.active*196} 66 V92`,id,true);
  const metrics=`<div class="hash-result">${escapeHtml(`Distance distribution: ${Object.entries(m.distribution).map(([d,n])=>`d${d}: ${n}`).join(' · ')||'empty'}; maximum ${m.max}; average ${m.average.toFixed(2)}`)}</div>`;
  if(s.staging.length){out+='<text x="20" y="275" class="hash-index">Replacement · recompute home and distance before commit</text>';s.staging.forEach((slot,i)=>{out+=hashCell({id:`new-${i}`,index:`new slot ${i}`,x:20+i*196,y:310,status:slot.occupied?'occupied':'empty',selected:selected===`new-${i}`,active:s.stagingActive===i,lines:slot.occupied?[`${slot.key} = ${slot.value}`,`home ${teachingHash(slot.key)%s.staging.length} · d ${slot.distance}`]:['EMPTY']});});}
  return strip+hashSvg(id,width,s.staging.length?440:230,out)+metrics;
 },
 inspect(s,selected){const staged=selected?.startsWith('new-'),i=Number(staged?selected!.slice(4):selected??0),slots=staged?s.staging:s.slots,x=slots[i];if(!x)return hashInspector('Select a slot',[]);return hashInspector(`Slot ${i}`,[['State',x.occupied?'occupied':'empty'],['Key',x.occupied?x.key:'—'],['Value',x.occupied?x.value:'—'],['Hash',x.occupied?teachingHash(x.key):'—'],['Home',x.occupied?teachingHash(x.key)%slots.length:'—'],['Stored distance',x.occupied?x.distance:'—'],['Incoming',s.incoming?`${s.incoming.key}, distance ${s.incoming.distance}`:'none']]);},
 describe:s=>`${s.slots.map((x,i)=>`${i}: ${x.occupied?`${x.key}=${x.value}, distance ${x.distance}`:'empty'}`).join(' | ')}. Incoming ${s.incoming?.key??'none'}. ${s.result}`,
 invariants:robinInvariants,
 regions:op=>op==='rehash'?['find','insert','rehash']:op==='insert'||op==='erase'?['find',op]:op==='contains'?['find']:[op],
 counters:s=>[{label:'Actual slot inspections',value:s.probes},{label:'Swaps',value:s.swaps},{label:'Backward shifts',value:s.shifts},{label:'Maximum distance',value:robinMetrics(s).max},{label:'Average distance',value:Number(robinMetrics(s).average.toFixed(2))},{label:'Load factor',value:Number((s.slots.filter(x=>x.occupied).length/s.slots.length).toFixed(3))}],
};
