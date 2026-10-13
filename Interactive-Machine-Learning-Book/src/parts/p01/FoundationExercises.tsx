import ChoiceExercise from '../../ui/ChoiceExercise';
import { EXERCISES } from './exercises';
export default function FoundationExercises({chapter}:{chapter:string}) {
  const exercises=EXERCISES[chapter];if(!exercises)throw new RangeError('Unknown P01 exercise chapter.');
  return <div>{exercises.map((exercise,index)=><ChoiceExercise key={index} id={`${chapter.toLowerCase().replace('-','')}-q${index+1}`} prompt={exercise.prompt} choices={[...exercise.choices]}/>)}</div>;
}
