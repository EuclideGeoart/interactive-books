import {exerciseIsland} from '../../ui/ExerciseForm';
import {EXERCISES,BLOCK_B_EXERCISES,BLOCK_C_EXERCISES} from './exercises';
export default exerciseIsland([...EXERCISES,...BLOCK_B_EXERCISES,...BLOCK_C_EXERCISES]);
