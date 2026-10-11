import { exerciseIsland } from '../../ui/ExerciseForm';
import { CALCULUS_EXERCISES } from './exercises';
export default exerciseIsland(Object.values(CALCULUS_EXERCISES).flat());
