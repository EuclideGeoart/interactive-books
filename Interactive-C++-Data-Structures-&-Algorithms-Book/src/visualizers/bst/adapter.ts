import { foundationAdapter } from '../binary-tree/adapter';
import { bstOperations } from '../binary-tree/model';
export const bstAdapter = foundationAdapter(bstOperations, true);
