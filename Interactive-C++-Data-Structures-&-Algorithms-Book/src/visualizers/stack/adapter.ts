import type { LabAdapter } from '../../components/controls/lab-types';
import { stackState, stackTrace, stackOperations, stackInvariants, describeStack, type StackState, type StackEvent, type StackOperation } from './model';
import { drawStack, inspectStack } from './diagram';

export const stackAdapter: LabAdapter<StackState, StackEvent> = {
  build(operation, inputs) {
    if (!stackOperations.includes(operation as StackOperation)) throw new Error('Choose a stack operation.');
    const implementation = inputs.get('implementation') ?? 'array';
    if (implementation !== 'array' && implementation !== 'linked') throw new Error('Choose array or linked storage.');
    const preset = String(inputs.get('preset') ?? 'standard');
    const raw = preset === 'custom' ? String(inputs.get('values') ?? '') : ({ empty: '', single: '10', standard: '10,20,30', full: '10,20,30,40,50' } as Record<string, string>)[preset];
    if (raw === undefined || (raw.trim() && raw.split(',').some(v => !/^-?\d+$/.test(v.trim())))) throw new Error('Enter comma-separated integers, for example 10,20,30.');
    const valueText = String(inputs.get('value') ?? '5');
    if (!/^-?\d+$/.test(valueText.trim())) throw new Error('Value must be an integer from −999 to 999.');
    return stackTrace(operation as StackOperation, stackState(implementation, raw.trim() ? raw.split(',').map(Number) : []), Number(valueText));
  },
  draw: drawStack,
  inspect: inspectStack,
  describe: describeStack,
  invariants: stackInvariants,
  regions(operation, inputs) {
    const implementation = inputs.get('implementation') === 'linked' ? 'linked' : 'array';
    return [`${implementation}-${operation}`, ...(['pop', 'top'].includes(operation) ? [`${implementation}-empty`] : [])];
  },
  counters: state => [{ label: 'Assignments', value: state.writes }, { label: 'Live nodes', value: state.objects.filter(n => n.lifetime === 'live').length }, { label: 'Capacity (array)', value: state.implementation === 'array' ? 5 : 0 }],
};
