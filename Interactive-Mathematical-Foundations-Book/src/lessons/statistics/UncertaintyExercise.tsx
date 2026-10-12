import { exerciseIsland } from '../../ui/ExerciseForm';
import {UNCERTAINTY_EXERCISES} from './uncertainty-exercises';
export default exerciseIsland(Object.values(UNCERTAINTY_EXERCISES).flat());
