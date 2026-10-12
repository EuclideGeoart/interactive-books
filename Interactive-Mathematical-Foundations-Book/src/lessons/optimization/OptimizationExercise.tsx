import { exerciseIsland } from '../../ui/ExerciseForm';
import { BLOCK_A_EXERCISES } from './block-a-exercises';
import { BLOCK_B_EXERCISES } from './block-b-exercises';
export default exerciseIsland([...Object.values(BLOCK_A_EXERCISES),...Object.values(BLOCK_B_EXERCISES)].flat());
