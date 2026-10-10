import { foundationAdapter, treeInputs } from '../binary-tree/adapter';
import {
  binaryState,
  binaryTrace,
  traversalOperations,
  type BinaryOperation,
} from '../binary-tree/model';
const complete = foundationAdapter(traversalOperations, false);
export const traversalAdapter = {
  ...complete,
  build(operation: string, inputs: FormData) {
    const shape = String(inputs.get('shape') ?? 'complete');
    if (shape !== 'complete' && shape !== 'bst')
      throw new Error('Choose complete shape or BST insertion order.');
    if (!(traversalOperations as readonly string[]).includes(operation))
      throw new Error('Choose a traversal shown in this chapter.');
    const { state, value } = treeInputs(inputs, false);
    const initial =
      shape === 'bst'
        ? binaryState(
            state.nodes.map((n) => n.value),
            true,
            state.letters,
          )
        : state;
    return binaryTrace(operation as BinaryOperation, initial, value);
  },
};
