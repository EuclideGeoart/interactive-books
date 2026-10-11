import { exerciseIsland } from '../../ui/ExerciseForm';
import { MATRIX_EXERCISES } from './matrix-exercises';

export default exerciseIsland(Object.values(MATRIX_EXERCISES).flat());
