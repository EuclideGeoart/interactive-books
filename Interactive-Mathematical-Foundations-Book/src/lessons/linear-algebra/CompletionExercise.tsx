import { exerciseIsland } from '../../ui/ExerciseForm';
import { COMPLETION_EXERCISES } from './completion-exercises';
export default exerciseIsland(Object.values(COMPLETION_EXERCISES).flat());
