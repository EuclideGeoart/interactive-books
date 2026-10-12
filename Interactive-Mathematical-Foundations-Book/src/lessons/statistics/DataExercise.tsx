import { exerciseIsland } from '../../ui/ExerciseForm';
import { DATA_EXERCISES } from './data-exercises';
export default exerciseIsland(Object.values(DATA_EXERCISES).flat());
