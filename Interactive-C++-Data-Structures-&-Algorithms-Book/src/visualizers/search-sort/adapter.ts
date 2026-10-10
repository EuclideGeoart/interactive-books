import type { LabAdapter } from '../../components/controls/lab-types';
import { drawSorting, inspectSorting, describeSorting } from '../sorting/presentation';
import { binaryTrace, linearTrace, fundamentalsTrace, elementaryTrace, compareElementary, searchSortScene, searchSortInvariants, type SearchSortState, type SearchSortEvent, type BinaryMode, type ElementaryAlgorithm } from './model';
export const searchSortChapters={
  'linear-search':['linear'], 'binary-search':['binary'],
  'sorting-fundamentals':['inspect','swap'], 'elementary-sorts':['bubble','selection','insertion'],
} as const;
export type SearchSortKey=keyof typeof searchSortChapters;
export const searchSortPresets:Record<string,number[]>={
  standard:[10,20,30,40,50], mixed:[4,2,5,1,3], empty:[], single:[40],
  sorted:[1,2,3,4,5], reverse:[5,4,3,2,1], equal:[2,2,2,2],
  duplicates:[1,2,2,2,3], stability:[2,2,1], nearly:[1,2,4,3,5],
  negative:[-9,-3,0,4,9], extremes:[-1000000,0,1000000], unsorted:[3,1,2],
};
export function searchSortInputs(inputs:FormData,key:SearchSortKey) {
  const preset=String(inputs.get('preset')??(key==='elementary-sorts'||key==='sorting-fundamentals'?'mixed':'standard'));
  let values:number[];
  if(preset==='custom') {
    const raw=String(inputs.get('values')??'').trim();
    const parts=raw?raw.split(',').map(x=>x.trim()):[];
    if(parts.some(x=>! /^-?\d+$/.test(x)))throw new Error('Use comma-separated integers, or leave custom input empty.');
    values=parts.map(Number);
  } else {if(!searchSortPresets[preset])throw new Error('Choose a listed input preset.');values=[...searchSortPresets[preset]!];}
  if(values.length>12||values.some(x=>!Number.isInteger(x)||Math.abs(x)>1000000))throw new Error('The visual lab accepts at most 12 integers within ±1000000.');
  const integer=(name:string,fallback:number)=>{const raw=String(inputs.get(name)??fallback);if(!/^-?\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw new Error(`${name} must be an integer.`);return Number(raw);};
  const mode=String(inputs.get('mode')??'normal');
  if(!['normal','unsorted','update','nonprogress','unstable-ties'].includes(mode))throw new Error('Choose a listed fault mode.');
  const direction=String(inputs.get('direction')??'ascending');
  if(!['ascending','descending'].includes(direction))throw new Error('Choose ascending or descending.');
  return {values,target:integer('target',40),descending:direction==='descending',left:integer('left',0),right:integer('right',Math.max(0,values.length-1)),mode};
}
export type SearchSortLabState=SearchSortState & { comparison?: ReturnType<typeof compareElementary> };
function scene(s:SearchSortLabState) {
  const result=searchSortScene(s);
  if(s.comparison) {
    result.facts.push(['Comparative lab','Completed normal runs on the SAME original input and direction; independent of playback position. Counters exclude validation/observation.']);
    for(const r of s.comparison)result.facts.push([`${r.algorithm} complete`,`${r.comparisons} comparisons; ${r.swaps} swaps; ${r.shifts} shifts; ${r.writes} array writes; ${r.passes} passes; equal order ${r.stable?'preserved':'changed'}; stability ${r.stability}; adaptive ${r.adaptive?'yes':'no'}`]);
  }
  return result;
}
function adapter(key:SearchSortKey):LabAdapter<SearchSortLabState,SearchSortEvent> {
  return {
    build(operation,inputs) {
      if(!(searchSortChapters[key] as readonly string[]).includes(operation))throw new Error('Choose an operation in this chapter.');
      const p=searchSortInputs(inputs,key);
      if(key==='linear-search')return linearTrace(p.values,p.target);
      if(key==='binary-search'){
        if(p.mode==='unstable-ties')throw new Error('Choose a binary search fault mode.');
        return binaryTrace(p.values,p.target,p.mode as BinaryMode);
      }
      if(key==='sorting-fundamentals')return fundamentalsTrace(p.values,p.descending,operation==='swap'?[p.left,p.right]:undefined);
      const trace=elementaryTrace(p.values,operation as ElementaryAlgorithm,p.descending,p.mode==='unstable-ties');
      const comparison=compareElementary(p.values,p.descending);
      const add=(s:SearchSortState):SearchSortLabState=>Object.freeze({...s,comparison});
      return {initial:add(trace.initial),steps:trace.steps.map(step=>({...step,state:add(step.state)}))};
    },
    draw:(s,id,view,selected)=>drawSorting(scene(s),id,view,selected),
    inspect:(s,selected)=>inspectSorting(scene(s),selected),describe:s=>describeSorting(scene(s)),
    invariants:searchSortInvariants,
    regions:op=>[op==='inspect'||op==='swap'?'explore':op],
    counters:s=>Object.entries(s.counts).map(([label,value])=>({label,value})),
  };
}
export const searchSortAdapters:Record<SearchSortKey,LabAdapter<SearchSortLabState,SearchSortEvent>>={
  'linear-search':adapter('linear-search'), 'binary-search':adapter('binary-search'),
  'sorting-fundamentals':adapter('sorting-fundamentals'), 'elementary-sorts':adapter('elementary-sorts'),
};
