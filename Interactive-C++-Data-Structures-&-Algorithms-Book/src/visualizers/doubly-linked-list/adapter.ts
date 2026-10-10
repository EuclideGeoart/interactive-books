import type { LabAdapter } from '../../components/controls/lab-types';
import type { MemoryState, TraceEvent } from '../../engine/types';
import { pointerInspector } from '../../components/memory/inspector';
import { doublyState,doublyTrace,doublyOperations,doublyInvariants,describeDoubly,type DoublyOperation } from './model';
import { drawDoubly } from './diagram';
export const doublyAdapter: LabAdapter<MemoryState,TraceEvent> = {
  build(operation,inputs) {
    if(!doublyOperations.includes(operation as DoublyOperation)) throw new Error('Choose a list operation.');
    const preset=String(inputs.get('preset') ?? 'standard');
    const raw=preset === 'custom' ? String(inputs.get('values') ?? '') : ({standard:'10,20,30',empty:'',single:'10',duplicates:'10,20,20,30'} as Record<string,string>)[preset];
    if(raw === undefined || (raw.trim() && raw.split(',').some(v=> !/^-?\d+$/.test(v.trim())))) throw new Error('Enter comma-separated integers, for example 10,20,30.');
    const value=String(inputs.get('value') ?? '20');
    if(!/^-?\d+$/.test(value.trim())) throw new Error('Value must be an integer from −999 to 999.');
    return doublyTrace(operation as DoublyOperation,doublyState(raw.trim() ? raw.split(',').map(Number) : []),Number(value));
  },
  draw:drawDoubly,inspect:pointerInspector,describe:describeDoubly,invariants:doublyInvariants,
  regions:operation => [operation,...(['delete-head','delete-tail','delete-middle','clear'].includes(operation) ? ['unlink'] : [])],
  counters:state=>[{label:'Pointer assignments',value:state.writes},{label:'Value comparisons',value:state.comparisons},{label:'Visited nodes',value:state.visited.length}],
};
