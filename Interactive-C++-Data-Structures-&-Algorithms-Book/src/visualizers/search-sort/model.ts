import type { Invariant, Trace, TraceStep } from '../../engine/types';
import type { SortItem, SortingScene } from '../sorting/types';

export type ElementaryAlgorithm = 'bubble' | 'selection' | 'insertion';
export type BinaryMode = 'normal' | 'unsorted' | 'update' | 'nonprogress';
export interface Counts { comparisons: number; swaps: number; shifts: number; writes: number; passes: number }
export interface SearchSortState {
  a: SortItem[]; original: SortItem[]; held: SortItem | null;
  algorithm: 'linear' | 'binary' | 'fundamentals' | ElementaryAlgorithm;
  fault: string; target: number; i: number; j: number; low: number; high: number;
  mid: number; minimum: number; boundary: number; result: number; checked: number; inversions: number;
  descending: boolean; condition: boolean; done: boolean; changed: boolean;
  pairs: [number, number][]; counts: Counts; tag: string;
}
export interface SearchSortEvent { type: string }
export type SearchSortTrace = Trace<SearchSortState, SearchSortEvent>;
export function initialState(values: readonly number[], algorithm: SearchSortState['algorithm'], descending = false): SearchSortState {
  if (values.length > 64 || values.some(v => !Number.isInteger(v) || Math.abs(v) > 1000000))
    throw new Error('Use at most 64 integer keys between −1000000 and 1000000.');
  const a = values.map((key, id) => ({key, id}));
  return {a, original: a.map(x => ({...x})), held: null, algorithm, fault: '', target: 0,
    i: -1, j: -1, low: 0, high: a.length, mid: -1, minimum: -1, boundary: 0,
    result: -1, checked: 0, inversions: 0, descending, condition: false, done: false,
    changed: false, pairs: [], counts: {comparisons:0, swaps:0, shifts:0, writes:0, passes:0}, tag: ''};
}
const before = (a: number,b: number,descending: boolean) => descending ? a>b : a<b;
export const ordered = (a: readonly SortItem[], descending = false) => a.every((x,i) => i===0 || !before(x.key,a[i-1]!.key,descending));
export const stable = (a: readonly SortItem[]) => a.every((x,i) => a.slice(i+1).every(y => x.key!==y.key || x.id<y.id));
function immutable<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(immutable); Object.freeze(value); }
  return value;
}
function recorder(s: SearchSortState) {
  const initial = immutable(structuredClone(s));
  const steps: TraceStep<SearchSortState,SearchSortEvent>[] = [];
  const emit = (tag: string, explanation: string) => {
    s.tag=tag;
    steps.push({source: tag, event: {type: tag.split('.')[1]!}, title: tag.replace('.', ' · '), explanation, state: immutable(structuredClone(s))});
  };
  return {emit, trace: {initial, steps}};
}
export function linearTrace(values: readonly number[], target=40): SearchSortTrace {
  if (!Number.isInteger(target) || Math.abs(target)>1000000) throw new Error('Target must be an integer between −1000000 and 1000000.');
  const s=initialState(values,'linear'); s.target=target;
  const {emit,trace}=recorder(s);
  s.i=0; emit('linear.start','Start at index 0. An empty input performs no key comparison.');
  while(s.i<s.high) {
    s.j=s.i; emit('linear.inspect',`Inspect index ${s.i}; every earlier key was unequal to ${target}.`);
    ++s.counts.comparisons; s.condition=s.a[s.i]!.key===target;
    emit('linear.compare',`${s.a[s.i]!.key} == ${target} is ${s.condition}. Count one equality comparison.`);
    if(s.condition) {s.result=s.i; emit('linear.found',`Return the first match at index ${s.i}. Later duplicates are not visited.`); break;}
    ++s.i; emit('linear.advance',`Advance to index ${s.i}${s.i===s.high ? ', the one-past-end boundary' : ''}.`);
  }
  s.done=true; emit('linear.finish',s.result<0?'No match: the inspected prefix is the whole input.':`Found first match at index ${s.result}.`);
  return trace;
}
export function binaryTrace(values: readonly number[], target=40, mode: BinaryMode='normal'): SearchSortTrace {
  if (!['normal','unsorted','update','nonprogress'].includes(mode)) throw new Error('Choose a listed binary fault mode.');
  if (!Number.isInteger(target) || Math.abs(target)>1000000) throw new Error('Target must be an integer between −1000000 and 1000000.');
  const s=initialState(values,'binary'); s.target=target;
  const {emit,trace}=recorder(s);
  s.condition=ordered(s.a); emit('binary.validate',`Ascending domain check: ${s.condition ? 'valid' : 'FAILED'}. Validation work is excluded from search comparison counts.`);
  if(!s.condition) { s.fault='unsorted-domain';s.done=true; emit('binary.unsorted','Stop safely: order does not justify discarding either half. No search ran.'); return trace; }
  while(s.low<s.high) {
    const oldLow=s.low, oldHigh=s.high;
    s.mid=s.low+Math.floor((s.high-s.low)/2); emit('binary.mid',`mid = ${s.low} + (${s.high} − ${s.low}) / 2 = ${s.mid} (integer division).`);
    ++s.counts.comparisons; s.condition=s.a[s.mid]!.key===target;
    emit('binary.equal',`${s.a[s.mid]!.key} == ${target} is ${s.condition}.`);
    if(s.condition) {s.result=s.mid;emit('binary.found',`Found index ${s.mid}. This is ANY match, not necessarily the first duplicate.`);break;}
    ++s.counts.comparisons; s.condition=s.a[s.mid]!.key<target;
    emit('binary.less',`${s.a[s.mid]!.key} < ${target} is ${s.condition}. This second key comparison selects a half.`);
    if(s.condition) {s.low=mode==='nonprogress'?s.mid:mode==='update'?Math.min(s.high,s.mid+2):s.mid+1;emit('binary.low',`Set low = ${s.low}; high remains ${s.high}. Correct update excludes only mid and smaller keys.`);}
    else {s.high=mode==='nonprogress'?s.mid+1:mode==='update'?Math.max(s.low,s.mid-1):s.mid;emit('binary.high',`Set high = ${s.high}; low remains ${s.low}. high is exclusive.`);}
    if(s.high-s.low>=oldHigh-oldLow) {s.fault='nonprogress';s.done=true;emit('binary.nonprogress','Stop: the interval failed to shrink. Repeating it could loop forever.');return trace;}
    if(s.low!==(s.condition?s.mid+1:oldLow)||s.high!==(s.condition?oldHigh:s.mid)) {s.fault='invalid-update';s.done=true;emit('binary.update','Stop: this update differs from the proven half-open rule. It can discard an untested candidate or retain mid.');return trace;}
  }
  s.done=true;emit('binary.finish',s.result<0?'Empty candidate interval: target is absent.':`Return any matching index ${s.result}.`);return trace;
}
export function fundamentalsTrace(values: readonly number[], descending=false, swap?: readonly [number,number]): SearchSortTrace {
  const s=initialState(values,'fundamentals',descending);const {emit,trace}=recorder(s);
  if(swap) {
    const [left,right]=swap;
    if(!Number.isInteger(left)||!Number.isInteger(right)||left<0||right<0||left>=s.high||right>=s.high) throw new Error('Both swap indices must name existing items.');
    s.i=left;s.j=right;if(left!==right){++s.counts.swaps;s.counts.writes+=2;}
    [s.a[left],s.a[right]]=[s.a[right]!,s.a[left]!];emit('explore.swap',`Swap complete records at ${left} and ${right}. Their original identities travel with their keys.`);
  }
  for(let i=0;i<s.high;++i) for(let j=i+1;j<s.high;++j) {
    s.i=i;s.j=j;++s.checked;++s.counts.comparisons;s.condition=before(s.a[j]!.key,s.a[i]!.key,descending);
    emit('explore.compare',`Pair (${i}, ${j}): ${s.a[i]!.key}, ${s.a[j]!.key} ${s.condition?'is':'is not'} a strict ${descending?'descending':'ascending'} inversion.`);
    if(s.condition){++s.inversions;s.pairs.push([i,j]);emit('explore.inversion',`Record inversion (${i}, ${j}); ${s.inversions} found so far.`);}
  }
  s.done=true;emit('explore.finish',`${s.inversions} inversions across ${s.checked} pairs. ${s.inversions===0?'Sorted.':'Not sorted.'} Equal-key order ${stable(s.a)?'preserved':'changed'}.`);return trace;
}
export function elementaryTrace(values: readonly number[], algorithm: ElementaryAlgorithm='bubble', descending=false, unstableTies=false): SearchSortTrace {
  if(!['bubble','selection','insertion'].includes(algorithm)) throw new Error('Choose bubble, selection, or insertion.');
  const s=initialState(values,algorithm,descending);
  s.boundary=algorithm==='bubble'?s.high:algorithm==='insertion'?Math.min(1,s.high):0;
  const {emit,trace}=recorder(s);
  if(algorithm==='bubble') {
    while(s.boundary>1) {
      ++s.counts.passes;s.changed=false;s.i=0;emit('bubble.pass',`Pass ${s.counts.passes}: compare adjacent pairs before boundary ${s.boundary}.`);
      for(let i=0;i+1<s.boundary;++i) {
        s.i=i;s.j=i+1;++s.counts.comparisons;
        s.condition=before(s.a[i+1]!.key,s.a[i]!.key,descending)||(unstableTies&&s.a[i+1]!.key===s.a[i]!.key);
        emit('bubble.compare',`Adjacent keys ${s.a[i]!.key}, ${s.a[i+1]!.key}: ${s.condition?'swap':'keep'}${unstableTies?' (fault mode also swaps ties)':''}.`);
        if(s.condition) {++s.counts.swaps;s.counts.writes+=2;s.changed=true;[s.a[i],s.a[i+1]]=[s.a[i+1]!,s.a[i]!];emit('bubble.swap','Swap two records: two array writes, preserving each record’s identity.');}
      }
      --s.boundary;emit('bubble.finalize',`Index ${s.boundary} joins the finalized suffix; future passes never touch it.`);
      if(!s.changed){s.boundary=0;emit('bubble.early','No swap in this pass proves the remaining range sorted. Finalize all indices and stop.');break;}
    }
    s.boundary=0;s.done=true;if(unstableTies&&!stable(s.a))s.fault='unstable-ties';s.condition=ordered(s.a,descending);
    emit('bubble.finish',s.fault?'Keys are sorted, but equal-key order was reversed: stability FAILED.':'Sorted with stable strict adjacent swaps.');
  } else if(algorithm==='selection') {
    for(let i=0;i+1<s.high;++i) {
      s.i=i;s.minimum=i;++s.counts.passes;emit('selection.pass',`Start placement ${i}; candidate minimum is index ${i}.`);
      for(let j=i+1;j<s.high;++j) {
        s.j=j;++s.counts.comparisons;s.condition=before(s.a[j]!.key,s.a[s.minimum]!.key,descending);
        emit('selection.compare',`Compare scan index ${j} with candidate ${s.minimum}: replace candidate = ${s.condition}.`);
        if(s.condition){s.minimum=j;emit('selection.minimum',`Candidate becomes ${j}; no array write has occurred.`);}
      }
      if(s.minimum!==i){++s.counts.swaps;s.counts.writes+=2;[s.a[i],s.a[s.minimum]]=[s.a[s.minimum]!,s.a[i]!];emit('selection.swap',`Place candidate at ${i} with one distant swap. Equal keys can cross.`);}
      s.boundary=i+1;emit('selection.finalize',`Prefix [0, ${s.boundary}) is finalized.`);
    }
    s.boundary=s.high;s.done=true;emit('selection.finish','Sorted. Selection sort does not promise stable duplicate order.');
  } else {
    for(let i=1;i<s.high;++i) {
      s.i=i;s.j=i;++s.counts.passes;s.held={...s.a[i]!};emit('insertion.hold',`Copy item ${i} into held storage. Index ${i} is a logical hole; its physical array value remains visible.`);
      while(s.j>0) {
        ++s.counts.comparisons;s.condition=before(s.held.key,s.a[s.j-1]!.key,descending);
        emit('insertion.compare',`Held key ${s.held.key} belongs before index ${s.j-1}: ${s.condition}. Equal keys are never shifted past each other.`);
        if(!s.condition)break;
        ++s.counts.shifts;++s.counts.writes;s.a[s.j]={...s.a[s.j-1]!};emit('insertion.shift',`Copy index ${s.j-1} to ${s.j}. The next statement moves j; physical storage temporarily contains a duplicate copy.`);
        --s.j;emit('insertion.advance',`Move the insertion cursor to ${s.j}.`);
      }
      ++s.counts.writes;s.a[s.j]={...s.held};emit('insertion.insert',`Write the held record at ${s.j}. This insertion is separate from every shift.`);
      s.held=null;s.boundary=i+1;emit('insertion.finalize',`Release held storage. Prefix [0, ${s.boundary}) is sorted, but later insertions may move it.`);
    }
    s.done=true;emit('insertion.finish','Sorted by stable insertion. The held record is no longer needed.');
  }
  return trace;
}
export function finalState(trace: SearchSortTrace): SearchSortState { return trace.steps.at(-1)?.state ?? trace.initial; }
export function compareElementary(values: readonly number[], descending=false) {
  return immutable((['bubble','selection','insertion'] as const).map(algorithm => {
    const s=finalState(elementaryTrace(values,algorithm,descending));
    return {algorithm, ...s.counts, stable:stable(s.a), stability:algorithm==='selection'?'not guaranteed':'guaranteed', adaptive:algorithm!=='selection', output:s.a};
  }));
}
// Compact native parity format includes every algorithm field; tag is the separate source key.
export function searchSortSnapshot(s: SearchSortState): unknown[] {
  const items=(a:SortItem[])=>a.map(x=>[x.key,x.id]);
  return [items(s.a),items(s.original),s.held?[s.held.key,s.held.id]:null,s.algorithm,s.fault,
    s.target,s.i,s.j,s.low,s.high,s.mid,s.minimum,s.boundary,s.result,s.checked,s.inversions,
    s.descending,s.condition,s.done,s.changed,s.pairs,[s.counts.comparisons,s.counts.swaps,s.counts.shifts,s.counts.writes,s.counts.passes]];
}
const indices=(n:number)=>Array.from({length:n},(_,i)=>i);
function hole(s:SearchSortState) { return s.held ? s.j-(s.tag==='insertion.shift'?1:0) : -1; }
function liveItems(s:SearchSortState) {return s.held?[...s.a.filter((_,i)=>i!==hole(s)),s.held]:s.a;}
export function searchSortInvariants(s: SearchSortState): Invariant[] {
  const rule=(name:string,good:boolean,detail:string,pending=false):Invariant=>({name,status:pending?'pending':good?'pass':'fail',detail});
  const n=s.a.length;
  const live=liveItems(s);
  const rules=[rule('Records conserved',live.length===s.original.length && s.original.every(x=>live.filter(y=>y.id===x.id&&y.key===x.key).length===1),'Each original record occurs once in the logical sequence plus held storage; the marked hole is excluded.')];
  if(s.algorithm==='linear') {
    rules.push(rule('Rejected prefix contains no target',s.a.slice(0,Math.max(0,s.i)).every(x=>x.key!==s.target),'Indices before i were rejected by equality.'));
    rules.push(rule('First-match result',s.result<0?(!s.done||!s.a.some(x=>x.key===s.target)):s.result===s.a.findIndex(x=>x.key===s.target),'A result must be the earliest matching index.'));
  } else if(s.algorithm==='binary') {
    rules.push(rule('Ascending search domain',ordered(s.a),'A monotonic domain is required before any half may be discarded.'));
    rules.push(rule('Half-open bounds',0<=s.low&&s.low<=s.high&&s.high<=n,`0 ≤ low (${s.low}) ≤ high (${s.high}) ≤ n (${n}).`));
    const outside=s.a.slice(0,s.low).every(x=>x.key<s.target)&&s.a.slice(s.high).every(x=>x.key>s.target);
    rules.push(rule('Discarded ranges cannot contain target',outside,'Every discarded left key is smaller, every discarded right key is larger.'));
    rules.push(rule('Progress and update contract',!['nonprogress','invalid-update'].includes(s.fault),'Correct branches use low = mid + 1 or high = mid; bounded fault guards stop invalid updates.'));
    rules.push(rule('Any-match result',s.result<0?(!s.done||!!s.fault||!s.a.some(x=>x.key===s.target)):s.a[s.result]?.key===s.target,'Duplicates permit any matching index.'));
  } else if(s.algorithm==='fundamentals') {
    rules.push(rule('Recorded inversions are strict',s.pairs.length===s.inversions&&s.pairs.every(([i,j])=>i<j&&before(s.a[j]!.key,s.a[i]!.key,s.descending)),'Equal keys contribute no inversion.'));
    rules.push(rule('Complete count agrees with sortedness',!s.done||(s.inversions===0)===ordered(s.a,s.descending),'Zero inversions characterizes sortedness.',!s.done));
  } else {
    if(s.algorithm==='bubble') rules.push(rule('Finalized suffix is in its final positions',s.a.slice(s.boundary).every((x,k)=>x.key===[...s.original].sort((a,b)=>s.descending?b.key-a.key:a.key-b.key)[s.boundary+k]?.key),`Indices [${s.boundary}, ${n}) will not move again.`));
    if(s.algorithm==='selection') rules.push(rule('Finalized prefix contains the smallest remaining placements',s.a.slice(0,s.boundary).every((x,k)=>x.key===[...s.original].sort((a,b)=>s.descending?b.key-a.key:a.key-b.key)[k]?.key),`Indices [0, ${s.boundary}) are final under the selected direction.`));
    if(s.algorithm==='insertion') rules.push(rule('Insertion prefix remains ordered',ordered(s.a.slice(0,s.held?s.i+1:s.boundary).filter((_,i)=>i!==hole(s)),s.descending),'Exclude the logical hole during shifting. A sorted prefix can still move later.'));
    rules.push(rule('Sorted at completion',ordered(s.a,s.descending),'Completion promises monotonic keys.',!s.done));
    if(s.algorithm!=='selection')rules.push(rule('Stable equal-key order',stable(s.a),'Strict comparisons preserve original identity order.',!s.done));
  }
  return rules;
}
export function searchSortScene(s:SearchSortState):SortingScene {
  const all=indices(s.a.length), search=s.algorithm==='linear'||s.algorithm==='binary';
  const active=s.algorithm==='binary'?[s.mid]:s.algorithm==='linear'?[s.j]:s.algorithm==='insertion'?[s.j,s.j-1]:[s.i,s.j,s.minimum];
  const row:SortingScene['rows'][number]={id:'array',label:'Indexed records',items:s.a,active:active.filter(i=>i>=0&&i<s.a.length)};
  if(s.algorithm==='binary') {row.cursors=[{label:'low',index:s.low},{label:'mid',index:s.mid},{label:'high (exclusive)',index:s.high}].filter(x=>x.index>=0);row.ranges=[{label:'candidate interval',low:s.low,high:s.high}];row.muted=all.filter(i=>i<s.low||i>=s.high);}
  else if(s.algorithm==='linear'){row.cursors=[{label:'inspect',index:s.i}].filter(x=>x.index>=0);row.muted=all.filter(i=>i<s.i);}
  else if(s.algorithm==='bubble'){row.finalized=all.filter(i=>i>=s.boundary);row.ranges=[{label:'active pass',low:0,high:s.boundary}];}
  else if(s.algorithm==='selection'){row.finalized=all.filter(i=>i<s.boundary);row.cursors=[{label:'candidate',index:s.minimum}].filter(x=>x.index>=0);}
  else if(s.algorithm==='insertion'){row.finalized=s.done?all:[];row.ranges=[{label:'sorted prefix (may move)',low:0,high:s.boundary}];row.cursors=s.held?[{label:'insertion j',index:s.j},{label:'logical hole',index:hole(s)}]:[];row.muted=s.held?[hole(s)]:[];row.labels=all.map(i=>i===hole(s)?`${i} · hole`:String(i));}
  if(s.fault)row.fault=s.fault==='unsorted-domain'?all:active.filter(i=>i>=0&&i<s.a.length);
  const facts:[string,string][]=[['Algorithm',s.algorithm],['Direction',s.descending?'descending':'ascending'],['Comparisons',String(s.counts.comparisons)],['Swaps / shifts / writes',`${s.counts.swaps} / ${s.counts.shifts} / ${s.counts.writes}`],['Passes',String(s.counts.passes)]];
  if(search)facts.push(['Target',String(s.target)],['Match policy',s.algorithm==='linear'?'first match':'any match'],['Result',s.result<0?(s.done&&!s.fault?'not found':'pending'):String(s.result)]);
  if(s.algorithm==='binary')facts.push(['low / high / mid',`${s.low} / ${s.high} / ${s.mid}`],['Candidate count',String(s.high-s.low)]);
  if(s.algorithm==='fundamentals') facts.push(['Pairs inspected',String(s.checked)],['Inversions found',String(s.inversions)],['Inversion pairs',s.pairs.map(([i,j])=>`(${i},${j})`).join(' ')||'none yet'],['Sorted now',String(ordered(s.a,s.descending))]);
  if(!search)facts.push(['Equal-key order now',s.held?'held record / hole in flight':stable(s.a)?'preserved':'changed'],['Stability guarantee',s.algorithm==='selection'?'none':s.algorithm==='fundamentals'?'arbitrary swaps can break stability':'strict comparison required']);
  if(s.algorithm==='insertion')facts.push(['Held',s.held?`${s.held.key}, original ID ${s.held.id}`:'none'],['Logical hole',String(hole(s))]);
  if(s.algorithm==='bubble')facts.push(['Finalized suffix',`[${s.boundary}, ${s.a.length})`],['Swap in this pass',String(s.changed)]);
  if(s.algorithm==='selection')facts.push(['Candidate minimum',String(s.minimum)],['Finalized prefix',`[0, ${s.boundary})`]);
  facts.push(['Last comparison',String(s.condition)],['Status',s.fault|| (s.done?'complete':'in progress')]);
  const rows=[row];if(s.algorithm==='insertion')rows.push({id:'held',label:'Held local record',items:[s.held]});
  return {title:search?'Follow the candidate search':'Follow keys and identities',rows,facts,message:s.fault?`Stopped safely: ${s.fault}`:s.tag||'Input ready; identities are original indices.'};
}
