import { binaryTrace, elementaryTrace, finalState, fundamentalsTrace, linearTrace } from '../search-sort/model';
import { countingTrace, heapSortTrace, mergeTrace, quickTrace, radixTrace } from '../sort-advanced/model';

export interface WorkCounts { comparisons:number; swaps:number; shifts:number; writes:number; bufferWrites:number; passes:number; maxDepth:number; digitReads:number; maximumScans:number }
export interface WorkRow { name:string; counts:WorkCounts; detail:string }
export type InputShape = 'scrambled'|'sorted'|'reverse'|'equal'|'nearly';
const zero: WorkCounts = {comparisons:0,swaps:0,shifts:0,writes:0,bufferWrites:0,passes:0,maxDepth:0,digitReads:0,maximumScans:0};

// Invert Lomuto's final pivot swap so each recursive child receives another
// balanced last-pivot arrangement. This is a constructed teaching input.
export function balancedLastPivot(values:number[]):number[] {
  if(values.length<2) return [...values];
  const mid=Math.floor(values.length/2), left=balancedLastPivot(values.slice(0,mid)), right=balancedLastPivot(values.slice(mid+1));
  return [...left,...(right.length ? [right.at(-1)!,...right.slice(0,-1)] : []),values[mid]!];
}
export function teachingInput(n:number, shape:InputShape, maxKey=99):number[] {
  if(!Number.isInteger(n)||n<0||n>16) throw new Error('Choose 0–16 records.');
  const a=Array.from({length:n},(_,i)=>Math.floor(i*maxKey/Math.max(1,n-1)));
  if(shape==='reverse') return a.reverse();
  if(shape==='equal') return a.map(()=>Math.floor(maxKey/2));
  if(shape==='nearly') { if(n>2) [a[1],a[2]]=[a[2]!,a[1]!]; return a; }
  if(shape==='scrambled') return balancedLastPivot(a);
  return a;
}
export function measureWork(chapter:string,n:number,shape:InputShape,targetPosition='missing',maxKey=9):{input:number[];rows:WorkRow[]} {
  const input=teachingInput(n,chapter==='38'?'sorted':shape,chapter==='44'?maxKey:99);
  const rows:WorkRow[]=[];
  if(chapter==='37'||chapter==='38') {
    const index=targetPosition==='first'?0:targetPosition==='middle'?Math.floor(n/2):n-1;
    const target=targetPosition==='missing'||!n?-1:input[index]!;
    const first=finalState(linearTrace(input,target));
    rows.push({name:'Linear search',counts:{...zero,...first.counts},detail:`target ${target}; first-match index ${first.result}; at most n equality comparisons.`});
    if(chapter==='38') {
      const binary=finalState(binaryTrace(input,target));
      rows.push({name:'Binary search',counts:{...zero,...binary.counts},detail:`target ${target}; any-match index ${binary.result}; equality plus ordering comparisons counted separately; validation excluded.`});
    }
  } else if(chapter==='39') {
    const s=finalState(fundamentalsTrace(input));
    rows.push({name:'Pair inspector',counts:{...zero,...s.counts},detail:`${s.inversions} inversions in ${s.checked} pairs; the inspector enumerates all n(n−1)/2 pairs and does not sort.`});
  } else if(chapter==='40') {
    for(const kind of ['bubble','selection','insertion'] as const) {
      const s=finalState(elementaryTrace(input,kind));
      rows.push({name:kind,counts:{...zero,...s.counts},detail:kind==='selection'?'Unstable · in-place · fixed comparison count; few swaps do not mean few comparisons.':`${kind==='bubble'?'Early-exit bubble':'Insertion'}: stable · in-place · benefits from existing order.`});
    }
  } else {
    const jobs = chapter==='41'?[['Merge sort',()=>mergeTrace(input)]] as const
      : chapter==='42'?[['Quick · balanced partitions',()=>quickTrace(balancedLastPivot([...input].sort((a,b)=>a-b)))],['Quick · sorted last pivots',()=>quickTrace([...input].sort((a,b)=>a-b))]] as const
      : chapter==='43'?[['Heap sort',()=>heapSortTrace(input)]] as const
      : [['Counting sort',()=>countingTrace(input,maxKey)],['LSD radix sort',()=>radixTrace(input)]] as const;
    for(const [name,run] of jobs) {
      const trace=run(), state=trace.steps.at(-1)?.state??trace.initial;
      const detail=chapter==='42'?'Same key multiset, canonical last-element Lomuto pivot; depth counts active calls including base cases.':chapter==='44'?`Nonnegative domain 0…${maxKey}; counting allocates ${maxKey+1} buckets, radix uses base 10. Counts include histogram/prefix/output writes; radix maximum scans are reported separately from sorting comparisons.`:chapter==='41'?'Temporary writes and copy-back array writes are distinct; O(n) auxiliary buffer plus recursion.':'Bottom-up heap build followed by shrinking-prefix extraction; O(1) algorithm workspace.';
      rows.push({name,counts:{...zero,...state.counters},detail});
    }
  }
  return {input,rows};
}
