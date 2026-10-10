import type { LabAdapter } from '../../components/controls/lab-types';
import { escapeHtml } from '../../components/visualizers/primitives';
import { hashCell,hashInspector,hashSvg } from '../hashing/presentation';
import { contractState,contractTrace,contractInvariants,suppliedHash,type ContractState,type ContractEvent,type ContractOperation } from './model';
export const unorderedMapAdapter:LabAdapter<ContractState,ContractEvent>={
 build(op,inputs){return contractTrace(op as ContractOperation,contractState(String(inputs.get('keys')??'cat,dog').split(',').map(x=>x.trim()).filter(Boolean)),String(inputs.get('key')??'cat'),Number(inputs.get('value')??9),Number(inputs.get('requested')??16),Number(inputs.get('hint')??0.5));},
 draw(s,id,view,selected){
  const entries=[...s.entries].sort((a,b)=>a.key.localeCompare(b.key));
  const strip=`<div class="hash-state-strip">${view==='memory'?'Reference guarantees · native storage layout is unspecified':'Membership cards · alphabetical UI order, not iteration or bucket order'}</div>`;
  let out='';
  if(!entries.length)out+=hashCell({id:'empty',index:'Membership',x:20,y:75,status:'empty',selected:selected==='empty',lines:['size = 0','No stored elements']});
  entries.forEach((x,i)=>{out+=hashCell({id:x.key,index:`key ${x.key}`,x:20+i*196,y:75,status:'value',selected:selected===x.key,lines:[`${x.key} = ${x.value}`,`custom hash ${suppliedHash(x.key)}`]});});
  const lines=[`size ${s.entries.length} · bucket count ${s.bucketMinimum?`≥ ${s.bucketMinimum}`:'unspecified'} (no exact count)`,`load_factor = size / bucket_count${s.bucketMinimum?`; ≤ ${s.entries.length} / ${s.bucketMinimum}`:''}`,`max_load_factor ${s.maxLoad??`accepted value unknown; requested hint ${s.hint}`}`,s.iterator,s.reference];
  const contract=`<div class="hash-result">${lines.map(line=>`<p>${escapeHtml(line)}</p>`).join('')}</div>`;
  return strip+hashSvg(id,Math.max(440,entries.length*196+40),200,out)+contract;
 },
 inspect(s,selected){const x=s.entries.find(x=>x.key===(selected??s.saved));return hashInspector(x?`Element ${x.key}`:'Container contract',[['Key',x?.key??'—'],['Mapped value',x?.value??'—'],['Supplied teaching hash',x?suppliedHash(x.key):'—'],['Native bucket','Unspecified in this model'],['Saved handle target',s.saved??'none'],['Iterator',s.iterator],['Reference',s.reference]]);},
 describe:s=>`Membership (UI order only): ${[...s.entries].sort((a,b)=>a.key.localeCompare(b.key)).map(x=>`${x.key}=${x.value}`).join(', ')||'empty'}. ${s.iterator}. ${s.reference}. ${s.result}`,
 invariants:contractInvariants,regions:op=>[op==='contains'?'find':op],counters:s=>[{label:'Size',value:s.entries.length},{label:'Known bucket lower bound',value:s.bucketMinimum}],
};
