import type { Trace, Invariant } from '../../engine/types';
import { teachingHash, validateKey } from '../hashing/hash';
import { capacityInput, valueInput, type HashEvent } from '../open-addressing/model';
export interface RobinSlot { occupied: boolean; key: string; value: number; distance: number }
export interface RobinState { slots: RobinSlot[]; staging: RobinSlot[]; incoming: RobinSlot | null; repairing: boolean; stagingActive: number | null; active: number | null; probes: number; writes: number; swaps: number; shifts: number; result: string; path: number[] }
export type RobinOperation = 'insert' | 'find' | 'contains' | 'erase' | 'rehash';
const blank = (): RobinSlot => ({occupied:false,key:'',value:0,distance:0});
export function robinState(keys = ['a','b','i'], capacity = 8): RobinState {
  capacityInput(capacity);
  if (keys.length > capacity) throw new Error('Starting entries must fit in the table.');
  let s: RobinState = {slots:Array.from({length:capacity},blank),staging:[],incoming:null,repairing:false,stagingActive:null,active:null,probes:0,writes:0,swaps:0,shifts:0,result:'',path:[]};
  keys.forEach((key,i)=>{s = robinTrace('insert',s,key,i+1).steps.at(-1)!.state;});
  return {...s,incoming:null,active:null,probes:0,writes:0,swaps:0,shifts:0,result:'',path:[]};
}
export function robinTrace(op: RobinOperation, initial: RobinState, key = 'q', value = 9, requested = 16): Trace<RobinState,HashEvent> {
  if (!['insert','find','contains','erase','rehash'].includes(op)) throw new Error('Choose a supported operation.');
  if(op !== 'rehash') validateKey(key);
  valueInput(value);
  const s = structuredClone(initial);
  Object.assign(s,{staging:[],incoming:null,repairing:false,stagingActive:null,active:null,probes:0,writes:0,swaps:0,shifts:0,result:'',path:[]});
  const t: Trace<RobinState,HashEvent> = {initial:structuredClone(s),steps:[]};
  const emit = (source:string,type:HashEvent['type'],title:string) => {
    if(type === 'Probe'){s.probes++;s.path.push(s.active!);}
    if(type === 'Write')s.writes++;
    t.steps.push({source,event:{type},title,explanation:title,state:structuredClone(s)});
  };
  const finish = (source:string,title:string) => {s.result=title;emit(source,'Return',title);};
  const n=s.slots.length, home=teachingHash(key)%n;
  if(op === 'rehash') {
    capacityInput(requested);
    if(requested < s.slots.filter(x=>x.occupied).length)throw new Error('New capacity must hold all live entries.');
    s.staging=Array.from({length:requested},blank);
    emit('rh.rehash.allocate','Rehash','Allocate a replacement; original entries stay intact until commit');
    for(const slot of s.slots)if(slot.occupied){
      const child=robinTrace('insert',{...s,slots:structuredClone(s.staging),staging:[]},slot.key,slot.value);
      const baseProbes=s.probes,baseWrites=s.writes,baseSwaps=s.swaps;
      for(const step of child.steps){
        s.staging=structuredClone(step.state.slots);s.stagingActive=step.state.active;s.incoming=structuredClone(step.state.incoming);
        s.probes=baseProbes+step.state.probes;s.writes=baseWrites+step.state.writes;s.swaps=baseSwaps+step.state.swaps;
        t.steps.push({...step,title:`Replacement: ${step.title}`,explanation:`Replacement: ${step.explanation}`,state:structuredClone(s)});
      }
      emit('rh.rehash.remap','Rehash',`Reinsert ${slot.key}, recomputing home and every displaced distance`);
    }
    s.slots=s.staging;s.staging=[];s.stagingActive=null;s.incoming=null;s.result='Rehashed';
    emit('rh.rehash.commit','Rehash','Commit replacement table; reacquire stored indices');return t;
  }
  emit('rh.find.home','Hash',`hash(${key}) = ${teachingHash(key)}; home = ${home}`);
  let found:number|null=null, stopped=false;
  for(let d=0;d<n;d++){
    const i=(home+d)%n,slot=s.slots[i]!;s.active=i;
    emit('rh.find.probe','Probe',`Query distance ${d}; inspect slot ${i}${slot.occupied?` resident ${slot.key}, distance ${slot.distance}`:': EMPTY'}`);
    if(!slot.occupied||slot.distance<d){finish('rh.find.stop','Absent: EMPTY or resident distance smaller than query distance');stopped=true;break;}
    if(slot.key===key){found=i;finish('rh.find.found',`Found ${key} = ${slot.value}`);stopped=true;break;}
  }
  if(!stopped)finish('rh.find.full','Absent after one full table traversal');
  if(op==='insert'){
    s.result='';
    if(found!==null){s.slots[found]!.value=value;emit('rh.insert.update','Write',`Update ${key}`);finish('rh.insert.updated','Updated existing key');return t;}
    if(s.slots.every(x=>x.occupied)){finish('rh.insert.full','Table full; no swap or mutation. Rehash to grow.');return t;}
    s.incoming={occupied:true,key,value,distance:0};s.active=home;
    emit('rh.insert.incoming','Remember',`Incoming ${key}, home ${home}, distance 0`);
    let i=home;
    for(;;){
      s.active=i;const resident=s.slots[i]!;
      emit('rh.insert.probe','Probe',`Inspect insertion slot ${i}: ${resident.occupied?resident.key:'EMPTY'}`);
      if(!resident.occupied){s.slots[i]={...s.incoming!};s.incoming=null;emit('rh.insert.place','Write',`Store incoming in slot ${i}`);finish('rh.insert.done','Inserted');break;}
      const steal=s.incoming!.distance>resident.distance;
      emit('rh.insert.compare','Remember',`Incoming ${s.incoming!.key} d=${s.incoming!.distance} ${steal?'>':'≤'} resident ${resident.key} d=${resident.distance}`);
      if(steal){[s.incoming,s.slots[i]]=[resident,s.incoming!];s.swaps++;emit('rh.insert.swap','Write',`${s.slots[i]!.key} takes slot ${i}; displaced ${s.incoming!.key} is now incoming`);}
      s.incoming!.distance++;i=(i+1)%n;s.active=i;
      emit('rh.insert.advance','Remember',`Incoming ${s.incoming!.key} continues to ${i}, distance ${s.incoming!.distance}`);
    }
  } else if(op==='erase'){
    if(found===null){finish('rh.erase.missing','Key absent; nothing erased');return t;}
    let hole=found;s.slots[hole]=blank();s.repairing=true;
    emit('rh.erase.hole','Write',`Erase ${key}; hole at ${hole}. This policy has no tombstones.`);
    let next=(hole+1)%n;
    for(let shifted=0;shifted+1<n;shifted++){
      s.active=next;const slot=s.slots[next]!;
      emit('rh.erase.inspect','Probe',`Inspect successor ${next}: ${slot.occupied?`distance ${slot.distance}`:'EMPTY'}`);
      if(!slot.occupied||slot.distance===0)break;
      s.slots[hole]={...slot,distance:slot.distance-1};s.slots[next]=blank();s.shifts++;
      emit('rh.erase.shift','Write',`Move ${slot.key} from ${next} to hole ${hole}; distance decreases to ${slot.distance-1}`);
      hole=next;next=(next+1)%n;s.active=next;
      emit('rh.erase.advance','Remember',`Hole is now ${hole}; next inspection is ${next}`);
    }
    s.repairing=false;finish('rh.erase.done','Erased; probe chain repaired');
  }
  return t;
}
export function robinInvariants(s:RobinState,settled=true):Invariant[]{
  const n=s.slots.length, live=s.slots.filter(x=>x.occupied);
  const exact=s.slots.every((x,i)=>!x.occupied||x.distance===(i+n-teachingHash(x.key)%n)%n);
  const reachable=s.slots.every((x,index)=>{
    if(!x.occupied)return true;
    for(let d=0;d<n;d++){
      const i=(teachingHash(x.key)+d)%n, r=s.slots[i]!;
      if(!r.occupied||r.distance<d)return false;
      if(i===index)return true;
    }return false;
  });
  return [['Distance equals (index − home + capacity) % capacity',exact],['Every key is reachable under early-stop lookup',reachable],['Unique keys in table and incoming record',new Set([...live,...(s.incoming?[s.incoming]:[])].map(x=>x.key)).size===live.length+(s.incoming?1:0)]].map(([name,ok])=>({name:String(name),status:ok?'pass':name==='Every key is reachable under early-stop lookup'&&s.repairing&&!settled?'pending':'fail',detail:ok?'Holds in this snapshot.':'A deletion hole must finish shifting before lookup is safe.'}));
}
export const robinSnapshot=(s:RobinState)=>[s.slots.map(x=>[x.occupied,x.key,x.value,x.distance]),s.staging.map(x=>[x.occupied,x.key,x.value,x.distance])];
export function robinMetrics(s:RobinState){const ds=s.slots.filter(x=>x.occupied).map(x=>x.distance);return {max:Math.max(0,...ds),average:ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:0,distribution:ds.reduce<Record<number,number>>((out,d)=>{out[d]=(out[d]??0)+1;return out;},{})};}
