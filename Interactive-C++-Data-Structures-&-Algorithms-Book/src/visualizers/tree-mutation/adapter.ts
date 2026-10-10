import { foundationAdapter } from '../binary-tree/adapter';
export const treeMutationAdapter = foundationAdapter(
  ['insert', 'erase', 'clear'],
  true,
);
