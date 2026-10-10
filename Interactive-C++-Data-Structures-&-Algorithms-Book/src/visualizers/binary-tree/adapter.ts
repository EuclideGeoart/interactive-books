import type { LabAdapter } from '../../components/controls/lab-types';
import { drawTree, inspectTree, describeTree } from '../tree/diagram';
import {
  binaryState,
  binaryTrace,
  binaryScene,
  binaryInvariants,
  binaryMetrics,
  type BinaryState,
  type BinaryEvent,
  type BinaryOperation,
  validTreeValue,
} from './model';

export function treeInputs(inputs: FormData, ordered: boolean) {
  const preset = String(inputs.get('preset') ?? 'standard');
  const presets: Record<string, string> = {
    empty: '',
    single: ordered ? '50' : '65',
    standard: ordered ? '50,25,75,10,35,60,90,62' : '65,66,67,68,69',
    skewed: '10,20,30,40,50,60',
    duplicates: '50,25,75,25,50',
    successor: '50,25,75,60,90,55,57',
  };
  const raw =
    preset === 'custom' ? String(inputs.get('values') ?? '') : presets[preset];
  if (
    raw === undefined ||
    (raw.trim() && raw.split(',').some((v) => !/^-?\d+$/.test(v.trim())))
  )
    throw new Error('Enter comma-separated integers, such as 50,25,75.');
  const values = raw.trim() ? raw.split(',').map(Number) : [];
  const text = String(inputs.get('value') ?? (ordered ? '62' : '70')).trim();
  if (!/^-?\d+$/.test(text) || !validTreeValue(Number(text)))
    throw new Error('Value must be an integer from −999 to 999.');
  return {
    state: binaryState(
      values,
      ordered,
      !ordered && preset !== 'custom' && preset !== 'skewed',
    ),
    value: Number(text),
  };
}
export function foundationAdapter(
  operations: readonly BinaryOperation[],
  ordered: boolean,
): LabAdapter<BinaryState, BinaryEvent> {
  return {
    build(operation, inputs) {
      if (!operations.includes(operation as BinaryOperation))
        throw new Error('Choose an operation shown in this chapter.');
      const { state, value } = treeInputs(inputs, ordered);
      return binaryTrace(operation as BinaryOperation, state, value);
    },
    draw: (s, id, view, selected) =>
      drawTree(binaryScene(s), id, view, selected),
    inspect: (s, selected) => inspectTree(binaryScene(s), selected),
    describe: (s) => describeTree(binaryScene(s)),
    invariants: binaryInvariants,
    regions: (operation) => [
      ['preorder', 'inorder', 'postorder'].includes(operation)
        ? 'dfs'
        : operation,
    ],
    counters: (s) => [
      { label: 'Condition evaluations', value: s.comparisons },
      { label: 'Assignments', value: s.writes },
      {
        label: 'Live nodes',
        value: s.nodes.filter((n) => n.lifetime === 'live').length,
      },
      { label: 'Height (edges)', value: binaryMetrics(s).treeHeight },
    ],
  };
}
export const binaryTreeAdapter = foundationAdapter(['append', 'clear'], false);
