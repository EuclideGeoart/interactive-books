import type { LabAdapter } from '../../components/controls/lab-types';
import { escapeHtml, referenceArrow } from '../../components/visualizers/primitives';
import { hashCell, hashInspector, hashSvg } from '../hashing/presentation';
import { teachingHash } from '../hashing/hash';
import { openState, openTrace, openInvariants, type OpenState, type HashEvent, type OpenOperation } from './model';
const keys = (raw: FormDataEntryValue | null) => String(raw ?? '').split(',').map(x=>x.trim()).filter(Boolean);
export const openAddressingAdapter: LabAdapter<OpenState,HashEvent> = {
  build(op,inputs) {return openTrace(op as OpenOperation,openState(keys(inputs.get('keys') ?? 'a,i,q'),Number(inputs.get('capacity')??8),keys(inputs.get('erased'))),String(inputs.get('key')??'q'),Number(inputs.get('value')??9),Number(inputs.get('requested')??16));},
  draw(s,id,view,selected) {
    const width=Math.max(660,Math.max(s.slots.length,s.staging.length)*196+40);
    const strip=`<div class="hash-state-strip">${view==='memory'?'Contiguous Slot storage · index order, not byte offsets':'Linear probes · indices remain fixed during mutation'}</div>`;
    let content='';
    s.slots.forEach((slot,i)=>{content+=hashCell({id:String(i),index:`slot ${i}`,x:20+i*196,y:70,status:slot.status,selected:selected===String(i),active:s.active===i,lines:slot.status==='occupied'?[`${slot.key} = ${slot.value}`,`home ${teachingHash(slot.key)%s.slots.length}`]:[slot.status==='tombstone'?'Continue lookup':'Stops lookup']});});
    if(s.active!==null)content+=referenceArrow(`M${110+s.active*196} 35 V57`,id,true);
    const probes=`<div class="hash-result">${escapeHtml(`Probes: ${s.path.join(' → ') || 'none'} · remembered tombstone: ${s.remembered??'none'}`)}</div>`;
    if(s.staging.length){content+='<text x="20" y="242" class="hash-index">Replacement table · not committed yet</text>';s.staging.forEach((slot,i)=>{content+=hashCell({id:`new-${i}`,index:`new slot ${i}`,x:20+i*196,y:280,status:slot.status,selected:selected===`new-${i}`,active:s.stagingActive===i,lines:slot.status==='occupied'?[`${slot.key} = ${slot.value}`,`home ${teachingHash(slot.key)%s.staging.length}`]:['EMPTY']});});}
    return strip+hashSvg(id,width,s.staging.length?410:190,content)+probes;
  },
  inspect(s,selected){const staging=selected?.startsWith('new-'),i=Number(staging?selected!.slice(4):selected??0),slots=staging?s.staging:s.slots,slot=slots[i];if(!slot)return hashInspector('Select a slot',[]);return hashInspector(`${staging?'Replacement ':''}Slot ${i}`,[['Status',slot.status],['Key',slot.status==='occupied'?slot.key:'—'],['Value',slot.status==='occupied'?slot.value:'—'],['Hash',slot.status==='occupied'?teachingHash(slot.key):'—'],['Home',slot.status==='occupied'?teachingHash(slot.key)%slots.length:'—'],['Lookup behavior',slot.status==='empty'?'Stop':slot.status==='tombstone'?'Continue':'Compare key']]);},
  describe:s=>`${s.slots.map((x,i)=>`${i}: ${x.status==='occupied'?`${x.key}=${x.value}`:x.status}`).join(' | ')}. ${s.result}`,
  invariants:openInvariants,
  regions:op=>op==='erase'?['find','erase']:op==='contains'?['find']:[op],
  counters:s=>[{label:'Actual slot inspections',value:s.probes},{label:'Writes',value:s.writes},{label:'Size',value:s.slots.filter(x=>x.status==='occupied').length},{label:'Capacity',value:s.slots.length},{label:'Load factor',value:Number((s.slots.filter(x=>x.status==='occupied').length/s.slots.length).toFixed(3))},{label:'Tombstones',value:s.slots.filter(x=>x.status==='tombstone').length}],
};
