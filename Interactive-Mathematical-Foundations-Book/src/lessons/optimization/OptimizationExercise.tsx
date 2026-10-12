import { exerciseIsland } from '../../ui/ExerciseForm';
import { BLOCK_A_EXERCISES } from './block-a-exercises';
import { BLOCK_B_EXERCISES } from './block-b-exercises';
import { BLOCK_C_EXERCISES } from './block-c-exercises';
export default exerciseIsland([...Object.values(BLOCK_A_EXERCISES),...Object.values(BLOCK_B_EXERCISES),...Object.values(BLOCK_C_EXERCISES)].flat());
