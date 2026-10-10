import type { Trace, Invariant } from '../../engine/types';
import { teachingHash, validateKey } from '../hashing/hash';
import { valueInput } from '../open-addressing/model';
export interface ContractState { entries: {key:string;value:number}[]; bucketMinimum:number; maxLoad:number|null; hint:number|null; iterator:string; reference:string; saved:string|null; result:string; request:number }
export type ContractEvent={type:'LibraryCall'};
export type ContractOperation='insert'|'find'|'contains'|'erase'|'reserve'|'rehash'|'max-load';
export function contractState(keys=['cat','dog']):ContractState {
 if(keys.length>12)throw new Error('Use at most twelve starting keys.');
 const entries:{key:string;value:number}[]=[];
 keys.forEach((key,i)=>{validateKey(key);const old=entries.find(x=>x.key===key);if(old)old.value=i+1;else entries.push({key,value:i+1});});
 return {entries,bucketMinimum:entries.length,maxLoad:1,hint:null,iterator:entries.length?'Saved iterator: valid before operation':'No saved iterator',reference:entries.length?'Saved element reference: valid':'No saved reference',saved:entries[0]?.key??null,result:'',request:0};
}
export function contractTrace(op:ContractOperation,initial:ContractState,key='cat',value=9,request=16,hint=0.5):Trace<ContractState,ContractEvent>{
 if(!['insert','find','contains','erase','reserve','rehash','max-load'].includes(op))throw new Error('Choose a supported library call.');
 validateKey(key);valueInput(value);
 if(!Number.isInteger(request)||request<0||request>4096)throw new Error('Capacity request must be an integer from 0 to 4096.');
 if(!Number.isFinite(hint)||hint<=0||hint>8)throw new Error('Load hint must be greater than zero and at most eight.');
 const s=structuredClone(initial),t:Trace<ContractState,ContractEvent>={initial:structuredClone(initial),steps:[]};
 const index=s.entries.findIndex(x=>x.key===key);
 if(op==='insert'){
  if(index>=0){s.entries[index]!.value=value;s.result='Assigned existing mapped value; size unchanged';}
  else{s.entries.push({key,value});s.bucketMinimum=s.maxLoad?Math.max(s.bucketMinimum,Math.ceil(s.entries.length/s.maxLoad)):s.bucketMinimum;s.iterator=s.saved?'Insertion may invalidate iterator: reacquire before use':'No saved iterator';s.result='Inserted new key; exact bucket count and bucket placement unspecified';}
 }else if(op==='find'||op==='contains')s.result=index>=0?`Found ${key} = ${s.entries[index]!.value}`:'Key absent';
 else if(op==='erase'){
  if(index>=0)s.entries.splice(index,1);
  if(key===s.saved){s.iterator='Saved iterator invalidated by erase';s.reference='Saved reference invalidated by erase; never dereference';}
  s.result=index>=0?'Erased one element; handles to other elements remain valid':'Missing key; no elements erased';
 }else if(op==='reserve'||op==='rehash'){
  s.request=request;
  s.bucketMinimum=op==='rehash'?Math.max(request,s.maxLoad?Math.ceil(s.entries.length/s.maxLoad):0):s.maxLoad?Math.ceil(Math.max(request,s.entries.length)/s.maxLoad):0;
  s.iterator=s.saved?'Rehash operation: reacquire saved iterator before use':'No saved iterator';
  s.result=op==='reserve'?`reserve(${request}) requests room for elements via rehash(ceil(n / max_load_factor()))`:`rehash(${request}) requests at least ${request} buckets and enough for size / max_load_factor()`;
 }else{
  s.hint=hint;s.maxLoad=null;s.result=`Requested max_load_factor hint ${hint}; query the getter for the accepted value. No immediate rehash is promised.`;
 }
 const tag=op==='contains'?'find':op;
 t.steps.push({source:`um.${tag}`,event:{type:'LibraryCall'},title:s.result,explanation:`${s.result}. This is one public library call; implementation internals are not traced.`,state:s});return t;
}
export function contractInvariants(s:ContractState):Invariant[]{return [{name:'Unique keys',status:new Set(s.entries.map(x=>x.key)).size===s.entries.length?'pass':'fail',detail:'Equality defines membership, independent of hash collisions.'},{name:'No invented standard-library layout',status:'pass',detail:'Cards are an alphabetical display of values; they are not buckets, nodes or iteration order.'}];}
export const contractSnapshot=(s:ContractState)=>s.entries.map(x=>[x.key,x.value]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
export interface Point {x:number;y:number}
export function pointHash(p:Point){return (Math.imul(p.x,31)+p.y)>>>0;}
export function pointContract(a:Point,b:Point,broken=false){
 for(const p of [a,b])for(const value of [p.x,p.y])if(!Number.isInteger(value)||Math.abs(value)>999)throw new Error('Coordinates must be integers from −999 to 999.');
 const equal=a.x===b.x&&(broken||a.y===b.y),hashA=pointHash(a),hashB=pointHash(b);
 return {equal,hashA,hashB,valid:!equal||hashA===hashB};
}
// teachingHash is the explicitly supplied string functor, never std::hash.
export const suppliedHash=teachingHash;
