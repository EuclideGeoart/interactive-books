import ChoiceExercise from '../../ui/ChoiceExercise';
import { EXERCISES } from './exercises';
import './p03.css';
export default function PartExercises({chapter}:{chapter:string}) {
  const questions=EXERCISES[chapter];
  if(!questions)throw new RangeError('Unknown Part III exercise chapter.');
  return <div data-p03-exercises>{questions.map(question=><ChoiceExercise key={question.id} {...question}/>)}</div>;
}
