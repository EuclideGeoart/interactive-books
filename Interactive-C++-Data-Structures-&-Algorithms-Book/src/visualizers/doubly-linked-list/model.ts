import { applyEvent, liveObject } from '../../engine/memory';
import type { MemoryState, Trace, TraceEvent, Invariant } from '../../engine/types';
import { addressFor, validValue } from '../linked-list/model';
export const doublyOperations = ['push-front','push-back','delete-head','delete-tail','delete-middle','forward','backward','clear'] as const;
export type DoublyOperation = typeof doublyOperations[number];
export function doublyState(values = [10,20,30]): MemoryState {
  if (values.length > 6 || values.some(v => !validValue(v))) throw new Error('Use up to six integers from −999 to 999.');
  return { objects: values.map((data,i) => ({address:addressFor(i),data,lifetime:'live',pointers:{prev:i ? addressFor(i-1) : null,next:i+1 < values.length ? addressFor(i+1) : null}})), references:{head:values.length ? addressFor(0) : null,tail:values.length ? addressFor(values.length-1) : null},visited:[],writes:0,comparisons:0,result:'' };
}
export function walkDoubly(state: MemoryState, direction: 'next' | 'prev' = 'next') {
  const objects = new Map(state.objects.map(n => [n.address,n]));
  const addresses: string[] = [], values: number[] = [];
  let pointer = state.references[direction === 'next' ? 'head' : 'tail'] ?? null;
  let error = '';
  while (pointer) {
    if (addresses.includes(pointer)) { error = 'cycle'; break; }
    const node = objects.get(pointer);
    if (!node || node.lifetime !== 'live') { error = 'ended or invalid object'; break; }
    addresses.push(pointer); values.push(node.data!); pointer = node.pointers[direction] ?? null;
  }
  return {addresses,values,error};
}
export function describeDoubly(state: MemoryState) {
  const forward = walkDoubly(state), backward = walkDoubly(state,'prev');
  return `head → [${forward.values.join(' → ')}] → nullptr${forward.error ? ` (${forward.error})` : ''}; tail → [${backward.values.join(' → ')}] → nullptr${backward.error ? ` (${backward.error})` : ''}`;
}
export function doublyInvariants(state: MemoryState, settled: boolean): Invariant[] {
  const live = state.objects.filter(n => n.lifetime === 'live');
  const lookup = (p: string | null | undefined) => live.find(n => n.address === p);
  const head = state.references.head ?? null, tail = state.references.tail ?? null;
  const forward = walkDoubly(state), backward = walkDoubly(state,'prev');
  const rule = (name: string, ok: boolean, detail: string, transient = true): Invariant => ({name,status:ok ? 'pass' : transient && !settled ? 'pending' : 'fail',detail});
  return [
    rule('head == nullptr ⇔ tail == nullptr', (head === null) === (tail === null), 'Both owning endpoints agree about the empty state.'),
    rule('head->prev == nullptr', !head || lookup(head)?.pointers.prev === null, 'The first node has no predecessor.'),
    rule('tail->next == nullptr', !tail || lookup(tail)?.pointers.next === null, 'The last node has no successor.'),
    rule('Structural references target live objects', [head,tail,...live.flatMap(n => Object.values(n.pointers))].every(p => p === null || !!lookup(p)), 'A structural link into ended storage is always invalid.',false),
    rule('next->prev returns to its source', live.every(n => !n.pointers.next || lookup(n.pointers.next)?.pointers.prev === n.address), 'Forward assignment happens before its matching backlink. Detached nodes may retain old links during unlink.'),
    rule('prev->next returns to its source', live.every(n => !n.pointers.prev || lookup(n.pointers.prev)?.pointers.next === n.address), 'The two writes are separate; a half-rewired state is pending until the operation finishes.'),
    rule('Both traversals terminate', !forward.error && !backward.error, `Forward: ${forward.error || 'terminates'}. Backward: ${backward.error || 'terminates'}.`,false),
    rule('All live nodes are owned in both directions', live.length === forward.addresses.length && live.length === backward.addresses.length && forward.addresses.join(',') === [...backward.addresses].reverse().join(','), 'At the function boundary, forward and reversed backward walks must contain every live node exactly once.'),
  ];
}
export function doublyTrace(operation: DoublyOperation, initial: MemoryState, value = 20): Trace {
  if (!validValue(value)) throw new Error('Value must be an integer from −999 to 999.');
  let state = structuredClone(initial); state.visited=[]; state.comparisons=0; state.writes=0; state.result='';
  const trace: Trace = {initial:structuredClone(state),steps:[]};
  function emit(event: TraceEvent, source: string | null, title: string, explanation = title) {
    state = applyEvent(state,event); trace.steps.push({event,source,title,explanation,state});
  }
  const ref = (name: string,target: string | null,source: string) => {
    emit({type:'AssignReference',name,target},source,`${name} → ${target ?? 'nullptr'}`);
  };
  const link = (address: string,field: string,target: string | null,source: string) => emit({type:'AssignPointer',address,field,target},source,`${field} → ${target ?? 'nullptr'}`,`Only ${address}.${field} changes. The opposite direction is a separate assignment.`);
  const test = (result: boolean,source: string,valueComparison=false) => {emit({type:'Compare',result,valueComparison},source,`Condition is ${result}`);return result;};
  const ret = (result: string,source: string) => emit({type:'Return',result},source,result);
  const field = (address: string,name: string) => liveObject(state,address).pointers[name] ?? null;
  const boundary = (source: string,title: string) => emit({type:'InvariantCheck'},source,title);
  function leaveHelper() {
    state = structuredClone(state); delete state.references.curr;
    trace.steps.push({event:{type:'EndScope'},source:null,title:'Return from unlink',explanation:'The helper parameter leaves scope. The caller resumes at its call statement.',state});
  }
  function unlink(curr: string | null) {
    // A function parameter is bound on entry, before its first condition.
    state=structuredClone(state); state.references.curr=curr;
    if (test(curr === null,'unlink.empty')) { ret('Empty list; unchanged','unlink.return'); leaveHelper(); return; }
    const previous = field(curr!,'prev'), next = field(curr!,'next');
    if (test(previous !== null,'unlink.has-prev')) link(previous!,'next',next,'unlink.forward');
    else ref('head',next,'unlink.head');
    if (test(next !== null,'unlink.has-next')) link(next!,'prev',previous,'unlink.backward');
    else ref('tail',previous,'unlink.tail');
    emit({type:'Destroy',address:curr!},'unlink.delete','End Node lifetime','The endpoints bypass this node in both directions. curr is now dangling.');
    emit({type:'Free',address:curr!},'unlink.delete','Release Node storage','Freed storage keeps an illustrative slot, but no fields can be read.');
    leaveHelper();
  }
  if (operation === 'push-front' || operation === 'push-back') {
    const front = operation === 'push-front', p = front ? 'front' : 'back';
    const endpoint = state.references[front ? 'head' : 'tail'] ?? null, address=addressFor(state.objects.length);
    emit({type:'Allocate',address},`${p}.allocate`,'Allocate Node storage');
    emit({type:'Construct',address,value,fields:{prev:null,next:null}},`${p}.allocate`,'Construct Node');
    ref('newNode',address,`${p}.allocate`);
    link(address,front ? 'next' : 'prev',endpoint,`${p}.${front ? 'next' : 'prev'}`);
    if (test(endpoint !== null,`${p}.nonempty`)) link(endpoint!,front ? 'prev' : 'next',address,`${p}.${front ? 'backlink' : 'forward'}`);
    else ref(front ? 'tail' : 'head',address,`${p}.${front ? 'tail' : 'head'}`);
    ref(front ? 'head' : 'tail',address,`${p}.${front ? 'head' : 'tail'}`);
  } else if (operation === 'delete-head' || operation === 'delete-tail') {
    unlink(state.references[operation === 'delete-head' ? 'head' : 'tail'] ?? null);
    boundary(operation === 'delete-head' ? 'pop-front.call' : 'pop-back.call','Return to the caller');
  } else if (operation === 'delete-middle') {
    let curr = state.references.head ?? null; ref('curr',curr,'erase.start'); let found=false;
    while (test(curr !== null,'erase.condition')) {
      emit({type:'Visit',address:curr!},'erase.compare','Examine the current node','Read this node’s data for the value comparison; its links do not change.');
      if (test(liveObject(state,curr!).data === value,'erase.compare',true)) {
        unlink(curr);
        // The outer erase cursor still exists after the helper returns (and now dangles).
        state = structuredClone(state); state.references.curr=curr;
        boundary('erase.call','unlink returns to erase'); ret('true: deleted first matching value','erase.found'); found=true; break;
      }
      curr=field(curr!,'next'); ref('curr',curr,'erase.advance');
    }
    if (!found) ret('false: value not found; unchanged','erase.missing');
  } else if (operation === 'forward' || operation === 'backward') {
    const values: number[]=[]; boundary(`${operation}.result`,'Create an empty result vector');
    let curr=state.references[operation === 'forward' ? 'head' : 'tail'] ?? null; ref('curr',curr,`${operation}.start`);
    while (test(curr !== null,`${operation}.condition`)) {
      values.push(liveObject(state,curr!).data!);
      emit({type:'Visit',address:curr!},`${operation}.visit`,'Append current value',`Result so far: [${values.join(', ')}]`);
      curr=field(curr!,operation === 'forward' ? 'next' : 'prev'); ref('curr',curr,`${operation}.advance`);
    }
    ret(`[${values.join(', ')}]`,`${operation}.return`);
  } else while (test(state.references.head !== null,'clear.condition')) {
    unlink(state.references.head ?? null); boundary('clear.call','One node removed; return to clear');
  }
  state=structuredClone(state); state.references={head:state.references.head ?? null,tail:state.references.tail ?? null};
  trace.steps.push({event:{type:'EndScope'},source:null,title:'Leave the operation',explanation:'Local references leave scope; owned live nodes remain.',state});
  emit({type:'InvariantCheck'},null,'Operation complete',state.result || describeDoubly(state));
  return trace;
}
export type DoublyBreak = 'backlink' | 'head-prev' | 'tail-next' | 'lost-tail' | 'single';
export function brokenDoubly(mode: DoublyBreak): MemoryState {
  const state = doublyState(mode === 'single' ? [10] : [10,20,30]);
  const [a,b,c]=state.objects;
  if (mode === 'backlink') { a!.pointers.next=c!.address; b!.lifetime='freed'; delete b!.data; b!.pointers={}; }
  if (mode === 'head-prev') a!.pointers.prev=c!.address;
  if (mode === 'tail-next') c!.pointers.next=a!.address;
  if (mode === 'lost-tail') state.references.tail=null;
  if (mode === 'single') {state.references.head=null; a!.lifetime='freed'; delete a!.data; a!.pointers={};}
  return state;
}
// Counter-only search model for the complexity explorer; no full replay history.
export function measureDoubly(size: number, target: number, backward: boolean) {
  if (!Number.isInteger(size) || size < 1 || size > 1024 || !Number.isInteger(target) || target < 0 || target >= size) throw new Error('Use a bounded size and valid target index.');
  const nodes=Array.from({length:size},(_,i)=>({next:i+1<size ? i+1 : null,prev:i ? i-1 : null}));
  let curr: number | null=backward ? size-1 : 0,visits=0;
  while(curr !== null) {visits++; if(curr === target) break; curr=nodes[curr]![backward ? 'prev' : 'next'];}
  return {visits,rewires:2};
}
